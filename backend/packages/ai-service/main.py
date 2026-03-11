"""
Shadow-Bees AI Service
基于 FastAPI 的 AI 能力服务

提供：
- 智能定价建议
- 内容文案生成
- 内容审核
- 客服回复建议
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import (
    PricingRequest, PricingResponse,
    ContentGenerateRequest, ContentGenerateResponse,
    HealthResponse
)
from pricing_engine import PricingEngine
from content_generator import ContentGenerator


# 全局服务实例
pricing_engine: PricingEngine = None
content_generator: ContentGenerator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global pricing_engine, content_generator
    
    # 启动时初始化
    settings = get_settings()
    pricing_engine = PricingEngine(settings)
    content_generator = ContentGenerator(settings)
    
    print("🤖 AI Service initialized")
    yield
    
    # 关闭时清理
    print("🤖 AI Service shutting down")


app = FastAPI(
    title="Shadow-Bees AI Service",
    description="AI-powered pricing and content generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse(
        status="ok",
        service="ai-service",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
        version="1.0.0",
        features={
            "pricing": get_settings().enable_pricing_ai,
            "content_generation": get_settings().enable_content_generation,
            "content_review": get_settings().enable_content_review,
        }
    )


@app.get("/health/ready")
async def readiness_check():
    """就绪检查"""
    return {
        "status": "ready",
        "checks": {
            "pricing_engine": pricing_engine is not None,
            "content_generator": content_generator is not None,
        }
    }


@app.get("/health/live")
async def liveness_check():
    """存活检查"""
    return {
        "status": "alive",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


# ==========================================
# 定价服务
# ==========================================
@app.post("/pricing/calculate", response_model=PricingResponse)
async def calculate_pricing(request: PricingRequest):
    """
    计算建议价格
    
    MVP 阶段使用规则引擎，后续可接入 LSTM 模型
    """
    start_time = time.time()
    
    try:
        result = await pricing_engine.calculate(request)
        result.latency_ms = int((time.time() - start_time) * 1000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")


@app.post("/pricing/analyze")
async def analyze_pricing_factors(hotel_id: str, room_type_id: str):
    """
    分析定价影响因素
    返回：竞品分析、事件影响、历史趋势等
    """
    return await pricing_engine.analyze_factors(hotel_id, room_type_id)


# ==========================================
# 内容生成服务
# ==========================================
@app.post("/content/generate", response_model=ContentGenerateResponse)
async def generate_content(request: ContentGenerateRequest):
    """
    生成营销文案
    
    支持平台：xiaohongshu, xianyu, wechat, douyin
    """
    start_time = time.time()
    
    try:
        result = await content_generator.generate(request)
        result.latency_ms = int((time.time() - start_time) * 1000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")


@app.post("/content/review")
async def review_content(content: str, platform: str):
    """
    审核内容合规性
    
    检查：违禁词、敏感信息、平台规则
    """
    return await content_generator.review(content, platform)


@app.post("/content/enhance")
async def enhance_content(content: str, style: str = "engaging"):
    """
    优化已有文案
    
    style: engaging(吸引) | professional(专业) | urgent(紧迫)
    """
    return await content_generator.enhance(content, style)


# ==========================================
# 客服辅助
# ==========================================
@app.post("/chat/suggest-reply")
async def suggest_chat_reply(
    customer_message: str,
    hotel_context: dict = None,
    history: list = None
):
    """
    建议客服回复
    
    基于客户问题和酒店信息生成回复建议
    """
    return await content_generator.suggest_reply(
        customer_message, 
        hotel_context, 
        history
    )


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level=settings.log_level
    )
