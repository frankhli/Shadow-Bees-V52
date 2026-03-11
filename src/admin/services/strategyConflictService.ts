/**
 * 策略冲突检测服务 - Phase 3 核心功能
 * 检测集团策略与平台算法建议的偏离
 */

import type { Customer, HotelData } from '../stores/adminStore';
import type { PricingSuggestion } from '@/types';

// 策略冲突类型
export type ConflictType = 
  | 'price_deviation'      // 价格偏离
  | 'inventory_block'      // 库存阻断
  | 'channel_priority'     // 渠道优先级冲突
  | 'discount_override';   // 折扣覆盖

// 冲突严重程度
export type ConflictSeverity = 'critical' | 'warning' | 'info';

// 策略冲突定义
export interface StrategyConflict {
  id: string;
  customerId: string;
  customerName: string;
  hotelId: string;
  hotelName: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  // 集团策略值
  groupStrategy: {
    type: string;
    value: number | string;
    rule: string;
  };
  // 平台建议值
  platformSuggestion: {
    type: string;
    value: number | string;
    reason: string;
  };
  // 偏离度 (0-100)
  deviation: number;
  // 预估影响
  impact: {
    revenueRisk: number;    // 收入风险金额
    occupancyRisk: number;  // 入住率风险
  };
  createdAt: string;
  status: 'active' | 'resolved' | 'ignored';
  resolvedAt?: string;
  resolvedBy?: string;
}

// 集团策略规则
export interface GroupStrategyRule {
  id: string;
  customerId: string;
  ruleType: 'min_price' | 'max_discount' | 'inventory_reserve' | 'channel_priority';
  hotelIds: string[];       // 适用门店
  conditions: {             // 触发条件
    dateRange?: { start: string; end: string };
    occupancyRange?: { min: number; max: number };
    dayOfWeek?: number[];   // 0-6
  };
  action: {                 // 执行动作
    type: string;
    value: number | string;
  };
  priority: number;         // 优先级 1-100
  enabled: boolean;
  createdAt: string;
}

// 偏离度阈值配置
const DEVIATION_THRESHOLDS = {
  price: { critical: 30, warning: 15 },      // 价格偏离百分比
  inventory: { critical: 50, warning: 25 },   // 库存偏离百分比
  discount: { critical: 20, warning: 10 },    // 折扣差异百分比
};

/**
 * 检测价格策略冲突
 */
function detectPriceConflicts(
  hotel: HotelData,
  customer: Customer,
  suggestions: PricingSuggestion[]
): StrategyConflict[] {
  const conflicts: StrategyConflict[] = [];
  
  // 获取该酒店的定价建议
  const hotelSuggestions = suggestions.filter(s => s.hotelId === hotel.id);
  
  for (const suggestion of hotelSuggestions) {
    // 检查集团最低价格策略
    const groupMinPrice = getGroupMinPrice(customer, hotel);
    if (groupMinPrice && suggestion.aiSuggestedPrice < groupMinPrice) {
      const deviation = Math.round(((groupMinPrice - suggestion.aiSuggestedPrice) / groupMinPrice) * 100);
      
      conflicts.push({
        id: `conflict-${hotel.id}-${suggestion.id}`,
        customerId: customer.id,
        customerName: customer.companyName,
        hotelId: hotel.id,
        hotelName: hotel.name,
        type: 'price_deviation',
        severity: deviation > DEVIATION_THRESHOLDS.price.critical ? 'critical' : 
                  deviation > DEVIATION_THRESHOLDS.price.warning ? 'warning' : 'info',
        title: '价格策略冲突',
        description: `平台建议价格 ¥${suggestion.aiSuggestedPrice} 低于集团最低价格限制 ¥${groupMinPrice}`,
        groupStrategy: {
          type: 'min_price',
          value: groupMinPrice,
          rule: '集团最低限价策略',
        },
        platformSuggestion: {
          type: 'dynamic_pricing',
          value: suggestion.aiSuggestedPrice,
          reason: suggestion.type || '基于市场供需和竞争分析',
        },
        deviation,
        impact: {
          revenueRisk: Math.round((groupMinPrice - suggestion.aiSuggestedPrice) * 30), // 假设30间夜影响
          occupancyRisk: Math.round(deviation * 0.5),
        },
        createdAt: new Date().toISOString(),
        status: 'active',
      });
    }
    
    // 检查集团折扣限制
    const groupMaxDiscount = getGroupMaxDiscount(customer);
    if (groupMaxDiscount) {
      const floorPrice = hotel.roomTypes?.[0]?.floorPrice || 100;
      const discountPercent = ((suggestion.aiSuggestedPrice - floorPrice) / floorPrice) * 100;
      
      if (Math.abs(discountPercent) > groupMaxDiscount) {
        const deviation = Math.round(Math.abs(discountPercent));
        conflicts.push({
          id: `conflict-discount-${hotel.id}-${suggestion.id}`,
          customerId: customer.id,
          customerName: customer.companyName,
          hotelId: hotel.id,
          hotelName: hotel.name,
          type: 'discount_override',
          severity: deviation > DEVIATION_THRESHOLDS.discount.critical ? 'critical' : 'warning',
          title: '折扣限制冲突',
          description: `建议折扣 ${discountPercent.toFixed(1)}% 超出集团最大折扣限制 ${groupMaxDiscount}%`,
          groupStrategy: {
            type: 'max_discount',
            value: groupMaxDiscount,
            rule: '集团折扣保护策略',
          },
          platformSuggestion: {
            type: 'discount_pricing',
            value: `${discountPercent.toFixed(1)}%`,
            reason: suggestion.type || '基于库存压力和需求预测',
          },
          deviation,
          impact: {
            revenueRisk: Math.round(suggestion.aiSuggestedPrice * 0.1),
            occupancyRisk: Math.round(deviation * 0.3),
          },
          createdAt: new Date().toISOString(),
          status: 'active',
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * 检测库存策略冲突
 */
function detectInventoryConflicts(
  hotel: HotelData,
  customer: Customer,
  platformRecommendations: { minFlexibleInventory: number; reason: string }[]
): StrategyConflict[] {
  const conflicts: StrategyConflict[] = [];
  
  // 检查集团库存保留策略
  const groupReserveRatio = getGroupInventoryReserve(customer);
  if (groupReserveRatio && hotel.inventory) {
    const totalInventory = hotel.inventory.ota.total + hotel.inventory.flexible.total;
    const reservedInventory = Math.round(totalInventory * (groupReserveRatio / 100));
    const minRecommended = platformRecommendations[0]?.minFlexibleInventory || 0;
    
    if (minRecommended > reservedInventory) {
      const deviation = Math.round(((minRecommended - reservedInventory) / totalInventory) * 100);
      
      conflicts.push({
        id: `conflict-inventory-${hotel.id}`,
        customerId: customer.id,
        customerName: customer.companyName,
        hotelId: hotel.id,
        hotelName: hotel.name,
        type: 'inventory_block',
        severity: deviation > DEVIATION_THRESHOLDS.inventory.critical ? 'critical' : 'warning',
        title: '库存分配冲突',
        description: `平台建议灵活库存 ${minRecommended} 间超过集团保留限制 ${reservedInventory} 间`,
        groupStrategy: {
          type: 'inventory_reserve',
          value: `${groupReserveRatio}%`,
          rule: '集团库存保护策略',
        },
        platformSuggestion: {
          type: 'flexible_inventory',
          value: minRecommended,
          reason: platformRecommendations[0]?.reason || '基于非标渠道投放需求',
        },
        deviation,
        impact: {
          revenueRisk: Math.round((minRecommended - reservedInventory) * (hotel.roomTypes?.[0]?.floorPrice || 100)),
          occupancyRisk: Math.round(deviation * 0.4),
        },
        createdAt: new Date().toISOString(),
        status: 'active',
      });
    }
  }
  
  return conflicts;
}

/**
 * 获取集团最低价格（模拟从策略配置读取）
 */
function getGroupMinPrice(customer: Customer, hotel: HotelData): number | null {
  // 从 groupProfile 或策略配置中读取
  // 从 groupProfile 或策略配置中读取
  return customer.groupProfile ? (hotel.roomTypes?.[0]?.floorPrice || 100) * 0.8 : null;
}

/**
 * 获取集团最大折扣
 */
function getGroupMaxDiscount(customer: Customer): number | null {
  // 集团客户默认最大折扣 20%
  return customer.type === 'group' ? 20 : null;
}

/**
 * 获取集团库存保留比例
 */
function getGroupInventoryReserve(customer: Customer): number | null {
  // 集团客户默认保留 30% 库存
  return customer.type === 'group' ? 30 : null;
}

/**
 * 批量检测所有冲突
 */
export function detectAllConflicts(
  customers: Customer[],
  suggestions: PricingSuggestion[]
): StrategyConflict[] {
  const conflicts: StrategyConflict[] = [];
  
  for (const customer of customers) {
    if (customer.type !== 'group') continue; // 只检测集团客户
    
    for (const hotel of customer.hotels) {
      // 价格冲突
      const priceConflicts = detectPriceConflicts(hotel, customer, suggestions);
      conflicts.push(...priceConflicts);
      
      // 库存冲突（模拟平台推荐）
      const mockRecommendations = [{
        minFlexibleInventory: Math.round(hotel.inventory.flexible.total * 0.5),
        reason: '基于历史数据和需求预测',
      }];
      const inventoryConflicts = detectInventoryConflicts(hotel, customer, mockRecommendations);
      conflicts.push(...inventoryConflicts);
    }
  }
  
  return conflicts.sort((a, b) => b.deviation - a.deviation);
}

/**
 * 获取冲突统计
 */
export function getConflictStats(conflicts: StrategyConflict[]) {
  const active = conflicts.filter(c => c.status === 'active');
  
  return {
    total: conflicts.length,
    active: active.length,
    resolved: conflicts.filter(c => c.status === 'resolved').length,
    critical: active.filter(c => c.severity === 'critical').length,
    warning: active.filter(c => c.severity === 'warning').length,
    info: active.filter(c => c.severity === 'info').length,
    byType: {
      price: active.filter(c => c.type === 'price_deviation').length,
      inventory: active.filter(c => c.type === 'inventory_block').length,
      discount: active.filter(c => c.type === 'discount_override').length,
    },
    totalRevenueRisk: active.reduce((sum, c) => sum + c.impact.revenueRisk, 0),
  };
}

/**
 * 解决冲突
 */
export function resolveConflict(
  conflict: StrategyConflict,
  _resolution: 'follow_group' | 'follow_platform' | 'custom',
  resolvedBy: string,
  _customValue?: number
): StrategyConflict {
  return {
    ...conflict,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  };
}

/**
 * 生成冲突解决建议
 */
export function generateConflictRecommendations(conflict: StrategyConflict): string[] {
  const recommendations: string[] = [];
  
  switch (conflict.type) {
    case 'price_deviation':
      recommendations.push(
        `建议采用折中价格：¥${Math.round((Number(conflict.groupStrategy.value) + Number(conflict.platformSuggestion.value)) / 2)}`,
        '或者与集团运营团队沟通调整最低限价策略',
        '如果库存压力较大，可申请临时突破限价'
      );
      break;
    case 'discount_override':
      recommendations.push(
        '限制折扣力度，采用其他营销手段（如增值服务）',
        '申请集团折扣额度豁免（需审批）',
        '调整库存分配策略，减少促销房型数量'
      );
      break;
    case 'inventory_block':
      recommendations.push(
        '优先保障OTA渠道库存，逐步增加灵活库存',
        '与集团协商临时降低保留库存比例',
        '启动跨店调货机制'
      );
      break;
  }
  
  return recommendations;
}
