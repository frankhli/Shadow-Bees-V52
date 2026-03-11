"""
定价引擎
MVP 阶段使用规则引擎，后续可接入 LSTM 模型
"""

import random
from typing import List, Dict, Any
from models import PricingRequest, PricingResponse, PricingFactor
from config import Settings


class PricingEngine:
    """定价引擎"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    async def calculate(self, request: PricingRequest) -> PricingResponse:
        """
        计算建议价格
        
        MVP 规则引擎逻辑：
        1. 基础价格
        2. 根据多个因子调整
        3. 确保在底价和天花板价之间
        """
        base_price = request.base_price
        factors: List[PricingFactor] = []
        
        # 因子1：库存紧张度
        inventory_ratio = request.inventory_level / max(request.total_inventory, 1)
        if inventory_ratio < 0.2:  # 库存紧张
            scarcity_factor = 1.3
            factors.append(PricingFactor(
                name="库存紧张",
                impact=scarcity_factor,
                reason=f"仅剩 {request.inventory_level} 间房，建议涨价"
            ))
        elif inventory_ratio < 0.5:
            scarcity_factor = 1.15
            factors.append(PricingFactor(
                name="库存偏紧",
                impact=scarcity_factor,
                reason=f"库存 {request.inventory_level}，可适度涨价"
            ))
        else:
            scarcity_factor = 1.0
        
        # 因子2：时间紧迫度
        urgency_factor = 1.0
        if request.days_until_checkin <= 1:
            urgency_factor = 0.85  # 临期降价促销
            factors.append(PricingFactor(
                name="临期促销",
                impact=urgency_factor,
                reason="明日入住，建议降价促销"
            ))
        elif request.days_until_checkin >= 14:
            urgency_factor = 1.1  # 远期预订，价格可以高一些
            factors.append(PricingFactor(
                name="远期预订",
                impact=urgency_factor,
                reason="提前两周预订，可维持高价"
            ))
        
        # 因子3：周末/节假日
        time_factor = 1.0
        if request.is_holiday:
            time_factor = 1.4
            factors.append(PricingFactor(
                name="节假日溢价",
                impact=time_factor,
                reason="节假日需求旺盛"
            ))
        elif request.is_weekend:
            time_factor = 1.2
            factors.append(PricingFactor(
                name="周末溢价",
                impact=time_factor,
                reason="周末需求较高"
            ))
        
        # 因子4：竞品价格
        competitor_factor = 1.0
        if request.competitor_avg_price:
            ratio = request.competitor_avg_price / base_price
            if ratio > 1.2:  # 竞品价格远高于我们
                competitor_factor = 1.1
                factors.append(PricingFactor(
                    name="竞品溢价空间",
                    impact=competitor_factor,
                    reason=f"竞品均价 {request.competitor_avg_price}，我们有涨价空间"
                ))
            elif ratio < 0.8:  # 竞品价格远低于我们
                competitor_factor = 0.95
                factors.append(PricingFactor(
                    name="竞品压力",
                    impact=competitor_factor,
                    reason=f"竞品均价较低，需适度降价"
                ))
        
        # 因子5：预订速度
        velocity_factor = 1.0
        if request.booking_velocity:
            if request.booking_velocity > 10:  # 预订很快
                velocity_factor = 1.15
                factors.append(PricingFactor(
                    name="热销",
                    impact=velocity_factor,
                    reason="预订速度快，可涨价"
                ))
            elif request.booking_velocity < 2:  # 预订很慢
                velocity_factor = 0.9
                factors.append(PricingFactor(
                    name="滞销",
                    impact=velocity_factor,
                    reason="预订速度慢，建议促销"
                ))
        
        # 计算建议价格
        suggested_price = base_price * scarcity_factor * urgency_factor * time_factor * competitor_factor * velocity_factor
        
        # 确保在合理范围内（底价 0.8x - 天花板 1.5x）
        min_price = base_price * 0.8
        max_price = base_price * 1.5
        suggested_price = max(min_price, min(suggested_price, max_price))
        
        # 取整到十位
        suggested_price = round(suggested_price / 10) * 10
        
        # 生成理由摘要
        if factors:
            top_factors = sorted(factors, key=lambda f: abs(f.impact - 1), reverse=True)[:2]
            reason_summary = "。".join([f.reason for f in top_factors])
        else:
            reason_summary = "市场平稳，建议维持当前价格"
        
        return PricingResponse(
            suggested_price=suggested_price,
            min_price=round(min_price),
            max_price=round(max_price),
            confidence=0.75 if factors else 0.5,
            factors=factors,
            reason_summary=reason_summary,
            model_used="rule-based-v1"
        )
    
    async def analyze_factors(self, hotel_id: str, room_type_id: str) -> Dict[str, Any]:
        """
        深度分析定价因子
        返回竞品分析、事件影响、历史趋势等
        """
        # MVP 阶段返回模拟数据
        # 实际应该从数据库获取竞品价格、事件信息等
        
        return {
            "hotel_id": hotel_id,
            "room_type_id": room_type_id,
            "competitors": [
                {"name": "竞品酒店A", "price": 380, "distance": 0.5},
                {"name": "竞品酒店B", "price": 420, "distance": 0.8},
            ],
            "avg_competitor_price": 400,
            "price_position": "偏低",  # 偏低 | 持平 | 偏高
            "nearby_events": [
                {"name": "演唱会", "date": "2024-03-15", "impact": "high"},
            ],
            "historical_trend": {
                "7d_avg_price": 360,
                "30d_avg_price": 350,
                "trend": "up"  # up | down | stable
            },
            "recommendation": {
                "action": "increase",  # increase | decrease | hold
                "target_price": 400,
                "urgency": "medium"
            }
        }
