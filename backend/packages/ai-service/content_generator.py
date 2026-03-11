"""
内容生成器
基于 GPT-4 生成营销文案
"""

import os
import httpx
from typing import List, Dict, Any, Optional
from models import (
    ContentGenerateRequest, ContentGenerateResponse, 
    ContentVariation, ReviewResult,
    Platform, ContentStyle
)
from config import Settings


class ContentGenerator:
    """内容生成器"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.api_key = settings.openai_api_key or settings.dashscope_api_key
        self.base_url = settings.openai_base_url
        self.model = settings.openai_model
    
    async def generate(self, request: ContentGenerateRequest) -> ContentGenerateResponse:
        """
        生成营销文案
        """
        # 构建提示词
        prompt = self._build_prompt(request)
        
        # 调用 LLM
        try:
            content = await self._call_llm(prompt)
            
            # 解析结果
            title, text, hashtags = self._parse_content(content, request.platform)
            
            # 生成不同长度的版本
            variations = self._create_variations(text, request.max_length)
            
            # 图片建议
            image_prompt = self._generate_image_prompt(request)
            
            return ContentGenerateResponse(
                title=title,
                text=text,
                hashtags=hashtags[:8],  # 最多8个标签
                image_prompt=image_prompt,
                image_suggestions=self._get_image_suggestions(request),
                variations=variations,
                best_post_time=self._suggest_post_time(request.platform),
                target_audience=self._get_target_audience(request.platform),
                model_used=self.model
            )
            
        except Exception as e:
            # 失败时返回默认内容
            return self._fallback_content(request)
    
    def _build_prompt(self, request: ContentGenerateRequest) -> str:
        """构建生成提示词"""
        
        # 平台特定要求
        platform_requirements = {
            Platform.xiaohongshu: "小红书风格：语气亲切，多用emoji，标题吸引人，带#标签",
            Platform.xianyu: "闲鱼风格：简洁直接，强调性价比，适合快速交易",
            Platform.wechat: "微信朋友圈风格：真实分享，像朋友推荐",
            Platform.douyin: "抖音风格：简短有力，开头抓人，适合视频配文",
        }
        
        # 风格要求
        style_requirements = {
            ContentStyle.urgent: "紧迫型：强调限时、稀缺，促使用户立即行动",
            ContentStyle.engaging: "吸引型：分享体验、攻略，引发兴趣",
            ContentStyle.professional: "专业型：突出设施、服务、商务属性",
            ContentStyle.lifestyle: "生活方式型：强调氛围、品味、生活态度",
        }
        
        # 价格信息
        price_info = ""
        if request.current_price:
            if request.original_price and request.original_price > request.current_price:
                discount = int((1 - request.current_price / request.original_price) * 100)
                price_info = f"原价{request.original_price}元，现价{request.current_price}元（省{discount}%）"
            else:
                price_info = f"价格：{request.current_price}元"
        
        # 亮点
        highlights = "、".join(request.highlights) if request.highlights else "地理位置优越"
        nearby = "、".join(request.nearby_attractions) if request.nearby_attractions else "热门商圈"
        
        prompt = f"""请为以下酒店生成一篇{platform_requirements[request.platform]}的营销文案。

酒店信息：
- 名称：{request.hotel_name}
- 城市：{request.city}
- 亮点：{highlights}
- 周边：{nearby}
{price_info}

风格要求：{style_requirements[request.style]}
字数要求：{request.max_length}字以内

请按以下格式输出：
【标题】（吸引人的标题，15字以内）
【正文】（文案正文）
【标签】（5-8个相关标签，带#号）
"""
        return prompt
    
    async def _call_llm(self, prompt: str) -> str:
        """调用大模型 API"""
        
        # 这里简化实现，实际应该调用 OpenAI API
        # 如果用户没有 API Key，返回模拟数据
        
        if not self.api_key or self.api_key == "sk-your-openai-key":
            # 返回模拟内容
            return self._mock_llm_response(prompt)
        
        # 实际 API 调用
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 800,
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def _mock_llm_response(self, prompt: str) -> str:
        """模拟 LLM 响应（用于测试）"""
        return """【标题】三里屯宝藏酒店｜人均150住出500的感觉！

【正文】姐妹们！发现一家超宝藏的酒店！🎉

📍位置绝绝子
就在三里屯太古里旁边，步行5分钟到酒吧街，出门就是网红打卡点！

🏨房间超舒适
我们住的舒适标准房，25平空间刚好，大床超软，一觉睡到天亮～

💰价格真香
平时350就能住，周末也就400出头，这地段这价格真的太值了！

🍜周边美食
楼下就是各种网红餐厅，早餐推荐去XX，咖啡推荐XX！

来北京的姐妹一定要住这里！性价比天花板！👍

【标签】#北京酒店 #三里屯 #性价比酒店 #北京旅游 #酒店推荐 #周末去哪儿 #宝藏酒店 #旅行攻略"""
    
    def _parse_content(self, content: str, platform: Platform) -> tuple:
        """解析生成的内容"""
        lines = content.strip().split('\n')
        
        title = ""
        text_lines = []
        hashtags = []
        
        section = None
        for line in lines:
            line = line.strip()
            if line.startswith('【标题】'):
                title = line.replace('【标题】', '').strip()
                section = 'title'
            elif line.startswith('【正文】'):
                section = 'body'
            elif line.startswith('【标签】'):
                tag_text = line.replace('【标签】', '').strip()
                hashtags = [t.strip('# ') for t in tag_text.split() if t.strip()]
                section = 'tags'
            elif section == 'body' and line:
                text_lines.append(line)
        
        text = '\n'.join(text_lines)
        
        # 如果没有解析到标题，生成一个默认的
        if not title:
            title = "超值酒店推荐"
        
        return title, text, hashtags
    
    def _create_variations(self, text: str, max_length: int) -> List[ContentVariation]:
        """创建不同长度的版本"""
        variations = []
        
        # 短版本（取前50字）
        short_text = text[:80] + "..." if len(text) > 80 else text
        variations.append(ContentVariation(
            type="short",
            text=short_text,
            char_count=len(short_text)
        ))
        
        # 中版本（原文）
        variations.append(ContentVariation(
            type="medium",
            text=text,
            char_count=len(text)
        ))
        
        return variations
    
    def _generate_image_prompt(self, request: ContentGenerateRequest) -> str:
        """生成AI绘图提示词"""
        return f"Modern hotel room in {request.city}, cozy bedroom with city view, warm lighting, professional photography, 4k, highly detailed"
    
    def _get_image_suggestions(self, request: ContentGenerateRequest) -> List[str]:
        """图片拍摄建议"""
        return [
            "房间全景（窗户+床）",
            "卫生间特写（干净整洁）",
            "周边地标夜景",
            "早餐/美食照片",
        ]
    
    def _suggest_post_time(self, platform: Platform) -> str:
        """建议发布时间"""
        best_times = {
            Platform.xiaohongshu: "晚上 8-10 点",
            Platform.xianyu: "中午 12 点或晚上 8 点",
            Platform.wechat: "早上 8-9 点或晚上 6-8 点",
            Platform.douyin: "晚上 7-9 点",
        }
        return best_times.get(platform, "晚上 8 点")
    
    def _get_target_audience(self, platform: Platform) -> str:
        """目标受众"""
        audiences = {
            Platform.xiaohongshu: "年轻女性，喜欢旅行和探店",
            Platform.xianyu: "价格敏感型用户，寻找性价比",
            Platform.wechat: "朋友圈好友，信任度高",
            Platform.douyin: "年轻人，喜欢短视频内容",
        }
        return audiences.get(platform, "一般旅行者")
    
    def _fallback_content(self, request: ContentGenerateRequest) -> ContentGenerateResponse:
        """失败时的默认内容"""
        return ContentGenerateResponse(
            title=f"{request.hotel_name} - 超值推荐",
            text=f"位于{request.city}的{request.hotel_name}，地理位置优越，服务贴心，是您出行的理想选择。",
            hashtags=["酒店推荐", request.city, "旅行"],
            model_used="fallback"
        )
    
    async def review(self, content: str, platform: str) -> ReviewResult:
        """
        审核内容
        检查违禁词、敏感信息等
        """
        # MVP 阶段使用简单规则
        # 实际应该用 GPT 或专业审核 API
        
        violations = []
        risk_level = "low"
        
        # 简单关键词检查
        forbidden_words = ["最", "第一", "国家级", "最便宜", "最好"]
        for word in forbidden_words:
            if word in content:
                violations.append(f"包含极限词：{word}")
        
        # 敏感信息检查（手机号、身份证号等）
        import re
        if re.search(r'\d{11}', content):  # 手机号
            violations.append("可能包含手机号")
        
        if violations:
            risk_level = "medium"
        
        return ReviewResult(
            approved=len(violations) == 0,
            risk_level=risk_level,
            violations=violations,
            suggestions=["避免使用极限词", "注意保护隐私信息"] if violations else [],
            confidence=0.8
        )
    
    async def enhance(self, content: str, style: str) -> Dict[str, Any]:
        """
        优化已有文案
        """
        # 这里应该调用 LLM 进行改写
        # 简化实现
        
        enhancements = {
            "urgent": content + "\n\n⚡️ 限时优惠，先到先得！",
            "engaging": content + "\n\n💬 评论区告诉我你的想法！",
            "professional": content.replace("！", "。").replace("~", ""),
        }
        
        return {
            "original": content,
            "enhanced": enhancements.get(style, content),
            "style": style,
            "changes": ["调整语气", "优化表达"]
        }
    
    async def suggest_reply(self, customer_message: str, hotel_context: dict = None, history: list = None) -> Dict[str, Any]:
        """
        建议客服回复
        """
        # 分析客户意图
        intent = self._analyze_intent(customer_message)
        
        # 根据意图生成回复
        replies = {
            "price_inquiry": "您好！我们目前的房价是XXX元起，具体根据房型有所不同。您需要什么时间的房间呢？",
            "availability": "您好！我们有空房，请问您需要什么时间入住？",
            "location": "您好！我们酒店位于XXX，距离地铁站步行5分钟，非常方便！",
            "facilities": "您好！我们提供免费WiFi、早餐、停车位，房间内有空调、电视、独立卫浴。",
            "default": "您好！感谢您的咨询，请问有什么可以帮您的？",
        }
        
        return {
            "intent": intent,
            "suggested_reply": replies.get(intent, replies["default"]),
            "confidence": 0.75,
            "alternatives": list(replies.values())[:3]
        }
    
    def _analyze_intent(self, message: str) -> str:
        """分析客户意图"""
        message = message.lower()
        
        if any(word in message for word in ["价格", "多少钱", "怎么卖", "贵不贵"]):
            return "price_inquiry"
        elif any(word in message for word in ["有房吗", "有空房", "能订吗", "还有房间"]):
            return "availability"
        elif any(word in message for word in ["位置", "在哪里", "地址", "怎么去"]):
            return "location"
        elif any(word in message for word in ["设施", "早餐", "wifi", "停车", "有网吗"]):
            return "facilities"
        else:
            return "default"
