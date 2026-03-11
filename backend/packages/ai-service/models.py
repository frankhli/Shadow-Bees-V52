"""
Pydantic 模型定义
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ==========================================
# 通用模型
# ==========================================
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    version: str
    features: Dict[str, bool]


# ==========================================
# 定价相关
# ==========================================
class PricingRequest(BaseModel):
    """定价请求"""
    hotel_id: str = Field(..., description="酒店ID")
    room_type_id: str = Field(..., description="房型ID")
    base_price: float = Field(..., description="底价", gt=0)
    current_price: Optional[float] = Field(None, description="当前价格")
    
    # 库存情况
    inventory_level: int = Field(..., description="剩余库存", ge=0)
    total_inventory: int = Field(..., description="总库存", ge=0)
    
    # 时间因素
    date: str = Field(..., description="日期 YYYY-MM-DD")
    is_weekend: bool = Field(False, description="是否周末")
    is_holiday: bool = Field(False, description="是否节假日")
    days_until_checkin: int = Field(7, description="距离入住天数", ge=0)
    
    # 外部因素
    competitor_avg_price: Optional[float] = Field(None, description="竞品均价")
    events: List[Dict[str, Any]] = Field(default=[], description="周边事件")
    
    # 历史数据
    avg_occupancy_7d: Optional[float] = Field(None, description="7天平均入住率")
    booking_velocity: Optional[float] = Field(None, description="预订速度")


class PricingFactor(BaseModel):
    """定价因子"""
    name: str
    impact: float = Field(..., description="影响系数")
    reason: str


class PricingResponse(BaseModel):
    """定价响应"""
    suggested_price: float = Field(..., description="建议价格")
    min_price: float = Field(..., description="最低建议价格")
    max_price: float = Field(..., description="最高建议价格")
    confidence: float = Field(..., description="置信度 0-1", ge=0, le=1)
    
    # 可解释性
    factors: List[PricingFactor] = Field(default=[], description="定价因子")
    reason_summary: str = Field(..., description="定价理由摘要")
    
    # 性能
    latency_ms: int = Field(0, description="响应延迟毫秒")
    model_used: str = Field("rule-based", description="使用的模型")


# ==========================================
# 内容生成相关
# ==========================================
class Platform(str, Enum):
    xiaohongshu = "xiaohongshu"
    xianyu = "xianyu"
    wechat = "wechat"
    douyin = "douyin"


class ContentStyle(str, Enum):
    urgent = "urgent"         # 紧迫型（尾房清仓）
    engaging = "engaging"     # 吸引型（攻略分享）
    professional = "professional"  # 专业型（商务出差）
    lifestyle = "lifestyle"   # 生活方式型


class ContentGenerateRequest(BaseModel):
    """内容生成请求"""
    hotel_id: str
    room_type_id: Optional[str] = None
    platform: Platform
    style: ContentStyle = ContentStyle.engaging
    
    # 酒店信息
    hotel_name: str
    city: str
    highlights: List[str] = Field(default=[], description="酒店亮点")
    nearby_attractions: List[str] = Field(default=[], description="周边景点")
    
    # 价格信息（可选）
    original_price: Optional[float] = None
    current_price: Optional[float] = None
    discount_percent: Optional[int] = None
    
    # 限制
    max_length: int = Field(300, ge=50, le=1000)
    require_hashtags: bool = True
    require_emojis: bool = True


class ContentVariation(BaseModel):
    """内容变体（不同长度/风格）"""
    type: str = Field(..., description="short | medium | long")
    text: str
    char_count: int


class ContentGenerateResponse(BaseModel):
    """内容生成响应"""
    title: str = Field(..., description="标题")
    text: str = Field(..., description="正文")
    hashtags: List[str] = Field(default=[], description="标签")
    
    # 图片建议
    image_prompt: Optional[str] = Field(None, description="AI绘图提示词")
    image_suggestions: List[str] = Field(default=[], description="图片建议")
    
    # 多版本
    variations: List[ContentVariation] = Field(default=[], description="不同长度版本")
    
    # 元数据
    best_post_time: Optional[str] = Field(None, description="最佳发布时间")
    target_audience: Optional[str] = Field(None, description="目标受众")
    
    # 性能
    latency_ms: int = Field(0)
    model_used: str = Field("gpt-4")


# ==========================================
# 审核相关
# ==========================================
class ReviewResult(BaseModel):
    """审核结果"""
    approved: bool
    risk_level: str = Field(..., description="low | medium | high")
    violations: List[str] = Field(default=[])
    suggestions: List[str] = Field(default=[])
    confidence: float = Field(..., ge=0, le=1)
