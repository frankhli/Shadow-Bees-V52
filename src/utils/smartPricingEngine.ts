/**
 * Shadow-Bees V52 - 全自动智能定价引擎（按房型）
 * 
 * 核心特性：
 * 1. 按房型分别定价（经济房/标准房/套房）
 * 2. 黄牛模式考虑竞品库存（竞品售罄才能大幅溢价）
 * 3. 尾货模式按房型库存分别降价
 * 4. 锚定约束（不得低于低一档，不得高于高一档）
 */

import type { Event, PricingMode, RoomType } from '@/types';
import type { DailyCompetitorData } from './competitorDataGenerator';

export type RoomTypeKey = 'budget' | 'standard' | 'suite';

export interface RoomTypePricingParams {
  roomType: RoomTypeKey;
  roomTypeName: string;
  competitorAvg: number;
  competitorMin: number;
  competitorMax: number;
  competitorStatus: 'soldout' | 'tight' | 'normal' | 'available';
  competitorSoldoutCount: number;
  competitorTightCount: number;
  competitorTotalCount: number;
  selfInventory: number;
  selfTotalInventory: number;
  floorPrice: number;
  ceilingPrice: number;
  anchorLowPrice: number;  // 低一档最高价（锚定底价）
  anchorHighPrice: number; // 高一档最低价（锚定天花板）
  mode: PricingMode;
  events: Event[];
}

export interface RoomTypePricingResult {
  suggestedPrice: number;
  mode: PricingMode;
  factors: {
    basePrice: number;
    competitorDeviation: number;
    inventoryFactor: number;
    eventFactor: number;
    modeFactor: number;
    finalAdjustment: number;
  };
  reasoning: string;
}

// ============================================
// 判断房型类别
// ============================================

export function getRoomTypeCategory(roomTypeName: string): RoomTypeKey {
  const name = roomTypeName.toLowerCase();
  if (name.includes('经济') || name.includes('特价') || name.includes('无窗') || name.includes('青旅') || name.includes('床位') || name.includes(' dorm')) {
    return 'budget';
  }
  if (name.includes('豪华') || name.includes('套房') || name.includes('观景') || name.includes('全景') || name.includes('suite')) {
    return 'suite';
  }
  return 'standard';
}

// ============================================
// 自动判定定价模式（基于整体市场）
// ============================================

export interface ModeDecisionFactors {
  overallCompetitorStatus: 'soldout' | 'tight' | 'normal' | 'available';
  overallInventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout';
  recentTransactionVelocity: number;
  hasHighImpactEvent: boolean;
}

export function determinePricingMode(factors: ModeDecisionFactors): PricingMode {
  const { overallCompetitorStatus, overallInventoryStatus, hasHighImpactEvent } = factors;
  
  // 黄牛模式：竞品售罄或紧张，且有高影响事件或我方库存紧张
  if (
    overallCompetitorStatus === 'soldout' ||
    (overallCompetitorStatus === 'tight' && (hasHighImpactEvent || overallInventoryStatus === 'tight'))
  ) {
    return 'scalper';
  }
  
  // 尾货模式：整体库存充足且去化慢
  if (
    overallInventoryStatus === 'abundant' ||
    (overallInventoryStatus === 'normal' && !hasHighImpactEvent)
  ) {
    return 'clearance';
  }
  
  // 默认动态模式
  return 'dynamic';
}

// ============================================
// 计算事件因子
// ============================================

function calculateEventFactor(events: Event[]): number {
  if (!events || events.length === 0) return 1.0;
  let factor = 1.0;
  events.forEach(e => {
    switch (e.intensity) {
      case 'high': factor += 0.25; break;
      case 'medium': factor += 0.12; break;
      case 'low': factor += 0.05; break;
    }
  });
  return Math.min(factor, 1.5);
}

// ============================================
// 按房型分别计算智能价格
// ============================================

export function calculateSmartPriceByRoomType(
  params: RoomTypePricingParams
): RoomTypePricingResult {
  const {
    roomTypeName,
    competitorAvg,
    competitorSoldoutCount,
    competitorTightCount,
    competitorTotalCount,
    selfInventory,
    selfTotalInventory,
    floorPrice,
    ceilingPrice,
    anchorLowPrice,
    anchorHighPrice,
    mode,
    events,
  } = params;
  
  // 基准价使用竞品均价
  let basePrice = competitorAvg > 0 ? competitorAvg : Math.round((floorPrice + ceilingPrice) / 2);
  
  // 计算各因子
  const eventFactor = calculateEventFactor(events);
  
  // 库存因子（按房型分别计算）
  const inventoryRatio = selfTotalInventory > 0 ? selfInventory / selfTotalInventory : 1;
  let inventoryFactor = 1.0;
  if (inventoryRatio > 0.7) inventoryFactor = 0.92; // 库存多，降8%
  else if (inventoryRatio < 0.15) inventoryFactor = 1.15; // 库存少，涨15%
  
  // 模式系数（核心逻辑）
  let modeFactor = 1.0;
  let reasoning = '';
  
  switch (mode) {
    case 'clearance': {
      // 尾货模式：比竞品低，库存越多降越多
      const clearanceRates = [0.88, 0.90, 0.92]; // 降12%, 10%, 8%
      if (inventoryRatio > 0.7) modeFactor = clearanceRates[0];
      else if (inventoryRatio > 0.4) modeFactor = clearanceRates[1];
      else modeFactor = clearanceRates[2];
      
      reasoning = `${roomTypeName}尾货清仓：竞品均价¥${competitorAvg}，我方库存${selfInventory}间（${Math.round(inventoryRatio * 100)}%），降价${Math.round((1 - modeFactor) * 100)}%快速出货`;
      break;
    }
      
    case 'scalper': {
      // 黄牛模式：关键！要考虑竞品库存
      const soldoutRatio = competitorTotalCount > 0 ? competitorSoldoutCount / competitorTotalCount : 0;
      const tightRatio = competitorTotalCount > 0 ? competitorTightCount / competitorTotalCount : 0;
      
      if (soldoutRatio >= 0.5) {
        // 超过一半竞品售罄，大幅溢价
        modeFactor = 1.35;
        reasoning = `${roomTypeName}黄牛模式：${Math.round(soldoutRatio * 100)}%竞品售罄，大幅溢价35%`;
      } else if (soldoutRatio >= 0.3 || tightRatio >= 0.5) {
        // 部分售罄或紧张，适度溢价
        modeFactor = 1.2;
        reasoning = `${roomTypeName}黄牛模式：竞品紧张，适度溢价20%`;
      } else if (selfInventory <= 2) {
        // 我方库存极少，小幅溢价
        modeFactor = 1.1;
        reasoning = `${roomTypeName}黄牛模式：我方仅剩${selfInventory}间，小幅溢价10%`;
      } else {
        // 竞品还有房，不能乱加价，回退到动态模式
        modeFactor = 1.05;
        reasoning = `${roomTypeName}动态模式：竞品仍有库存，不宜大幅溢价，仅涨5%`;
      }
      break;
    }
      
    case 'dynamic':
    default: {
      // 动态模式：随行就市，根据库存微调
      modeFactor = 0.98 + Math.random() * 0.04; // 98%-102%
      if (inventoryRatio > 0.6) modeFactor *= 0.95; // 库存多再降5%
      else if (inventoryRatio < 0.2) modeFactor *= 1.05; // 库存少涨5%
      
      reasoning = `${roomTypeName}动态定价：随行就市，库存${Math.round(inventoryRatio * 100)}%，价格微调`;
      break;
    }
  }
  
  // 计算初始价格
  let finalPrice = Math.round(basePrice * modeFactor * eventFactor * inventoryFactor);
  
  // ============================================
  // 锚定约束（关键！）
  // ============================================
  
  // 1. 不得低于低一档最高价 × 1.2（品牌溢价）
  const minAnchorPrice = Math.round(anchorLowPrice * 1.2);
  if (finalPrice < minAnchorPrice && mode !== 'clearance') {
    finalPrice = minAnchorPrice;
    reasoning += `，已锚定不低于低一档（¥${minAnchorPrice}）`;
  }
  
  // 2. 不得高于高一档最低价 × 0.9（性价比锚定）
  const maxAnchorPrice = Math.round(anchorHighPrice * 0.9);
  if (finalPrice > maxAnchorPrice && anchorHighPrice > 0) {
    finalPrice = maxAnchorPrice;
    reasoning += `，已锚定不高于高一档（¥${maxAnchorPrice}）`;
  }
  
  // 3. 绝对边界（底价和天花板）
  finalPrice = Math.max(floorPrice, Math.min(ceilingPrice, finalPrice));
  
  // 计算偏离度
  const competitorDeviation = competitorAvg > 0 
    ? ((finalPrice - competitorAvg) / competitorAvg * 100)
    : 0;
  
  return {
    suggestedPrice: finalPrice,
    mode,
    factors: {
      basePrice,
      competitorDeviation,
      inventoryFactor,
      eventFactor,
      modeFactor,
      finalAdjustment: finalPrice / basePrice,
    },
    reasoning,
  };
}

// ============================================
// 完整的定价计算（所有房型）
// ============================================

export interface FullPricingParams {
  competitorData: DailyCompetitorData;
  roomTypes: RoomType[];
  inventoryByRoomType: Record<string, { available: number; total: number }>;
  events: Event[];
  recentTransactionVelocity: number;
}

export interface FullPricingResult {
  byRoomType: Record<RoomTypeKey, RoomTypePricingResult>;
  overallMode: PricingMode;
}

export function calculateFullPricing(params: FullPricingParams): FullPricingResult {
  const { competitorData, roomTypes, inventoryByRoomType, events, recentTransactionVelocity } = params;
  
  // 1. 先判定整体市场模式
  const stats = competitorData.byRoomType;
  
  // 计算整体竞品状态
  const totalCompetitors = stats.standard.competitors.length;
  const totalSoldout = stats.standard.soldoutCount + stats.budget.soldoutCount + stats.suite.soldoutCount;
  const totalTight = stats.standard.tightCount + stats.budget.tightCount + stats.suite.tightCount;
  
  let overallCompetitorStatus: 'soldout' | 'tight' | 'normal' | 'available' = 'available';
  if (totalSoldout >= totalCompetitors * 0.5) overallCompetitorStatus = 'soldout';
  else if (totalSoldout + totalTight >= totalCompetitors * 0.6) overallCompetitorStatus = 'tight';
  else if (totalSoldout + totalTight >= totalCompetitors * 0.3) overallCompetitorStatus = 'normal';
  
  // 计算整体库存状态
  const totalInventory = Object.values(inventoryByRoomType).reduce((sum, r) => sum + r.total, 0);
  const totalAvailable = Object.values(inventoryByRoomType).reduce((sum, r) => sum + r.available, 0);
  const overallInventoryRatio = totalInventory > 0 ? totalAvailable / totalInventory : 1;
  
  let overallInventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout' = 'normal';
  if (totalAvailable === 0) overallInventoryStatus = 'soldout';
  else if (overallInventoryRatio < 0.15) overallInventoryStatus = 'tight';
  else if (overallInventoryRatio > 0.7) overallInventoryStatus = 'abundant';
  
  // 事件影响
  const hasHighImpactEvent = events.some(e => e.intensity === 'high');
  
  // 判定整体模式
  const overallMode = determinePricingMode({
    overallCompetitorStatus,
    overallInventoryStatus,
    recentTransactionVelocity,
    hasHighImpactEvent,
  });
  
  // 2. 按房型分别计算价格
  const byRoomType: Record<RoomTypeKey, RoomTypePricingResult> = {} as any;
  
  // 获取锚定价格
  const anchorLowPrice = stats.budget.maxPrice; // 低一档最高价（经济房最高）
  const anchorHighPrice = stats.suite.minPrice > 0 ? stats.suite.minPrice : stats.standard.maxPrice * 1.5; // 高一档最低价
  
  roomTypes.forEach(roomType => {
    const category = getRoomTypeCategory(roomType.name);
    const roomStats = stats[category];
    const roomInventory = inventoryByRoomType[roomType.id] || { available: 0, total: 1 };
    
    // 如果该房型没有竞品数据，使用同档次数据
    const effectiveCompetitorAvg = roomStats.avgPrice > 0 
      ? roomStats.avgPrice 
      : stats.standard.avgPrice * (category === 'budget' ? 0.7 : category === 'suite' ? 1.5 : 1);
    
    const result = calculateSmartPriceByRoomType({
      roomType: category,
      roomTypeName: roomType.name,
      competitorAvg: effectiveCompetitorAvg,
      competitorMin: roomStats.minPrice,
      competitorMax: roomStats.maxPrice,
      competitorStatus: roomStats.soldoutCount > roomStats.competitors.length * 0.5 ? 'soldout' 
        : roomStats.tightCount > roomStats.competitors.length * 0.3 ? 'tight' : 'normal',
      competitorSoldoutCount: roomStats.soldoutCount,
      competitorTightCount: roomStats.tightCount,
      competitorTotalCount: roomStats.competitors.length,
      selfInventory: roomInventory.available,
      selfTotalInventory: roomInventory.total,
      floorPrice: roomType.floorPrice,
      ceilingPrice: roomType.ceilingPrice,
      anchorLowPrice,
      anchorHighPrice,
      mode: overallMode,
      events,
    });
    
    byRoomType[category] = result;
  });
  
  return {
    byRoomType,
    overallMode,
  };
}

// ============================================
// 底价智能建议
// ============================================

export interface FloorPriceSuggestion {
  shouldAdjust: boolean;
  roomTypeId?: string;
  roomTypeName?: string;
  currentFloorPrice: number;
  suggestedFloorPrice: number;
  reason: string;
  trend: 'up' | 'down';
}

export function suggestFloorPriceAdjustment(
  roomType: RoomType,
  currentInventory: number,
  recentTransactions: number,
  recentBreakFloorTransactions: number,
  avgTransactionPrice: number,
  competitorAvgPrice: number
): FloorPriceSuggestion {
  // 情况1：库存积压，卖不动（检查是否底价定太高导致没竞争力）
  if (currentInventory > 5 && recentTransactions === 0) {
    const marketFairPrice = Math.round(competitorAvgPrice * 0.8); // 市场可接受价
    
    // 如果底价高于市场价，说明底价定太高，建议下调底价
    if (roomType.floorPrice > marketFairPrice) {
      const suggestedPrice = Math.max(marketFairPrice, Math.round(roomType.floorPrice * 0.85));
      return {
        shouldAdjust: true,
        roomTypeId: roomType.id,
        roomTypeName: roomType.name,
        currentFloorPrice: roomType.floorPrice,
        suggestedFloorPrice: suggestedPrice,
        reason: `${roomType.name}库存${currentInventory}间积压，30分钟无成交。当前底价¥${roomType.floorPrice}高于市场可接受价¥${marketFairPrice}，建议下调底价至¥${suggestedPrice}以提升竞争力`,
        trend: 'down',
      };
    }
    
    // 底价合理，只是定价策略问题，不调整底价
    return {
      shouldAdjust: false,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      currentFloorPrice: roomType.floorPrice,
      suggestedFloorPrice: roomType.floorPrice,
      reason: `${roomType.name}库存${currentInventory}间积压，但底价¥${roomType.floorPrice}合理（低于市场价¥${marketFairPrice}），建议通过【快速出货】模式下调灵活渠道价促销`,
      trend: 'down',
    };
  }
  
  // 情况2：卖太快，可能定低了
  if (currentInventory < 2 && recentTransactions >= 2) {
    const suggestedPrice = Math.min(
      Math.round(competitorAvgPrice * 0.9),
      Math.round(roomType.floorPrice * 1.15)
    );
    return {
      shouldAdjust: true,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      currentFloorPrice: roomType.floorPrice,
      suggestedFloorPrice: suggestedPrice,
      reason: `${roomType.name}仅剩${currentInventory}间且成交火爆，竞品均价¥${competitorAvgPrice}，建议上调底价至¥${suggestedPrice}`,
      trend: 'up',
    };
  }
  
  // 情况3：频繁破底价成交
  if (recentBreakFloorTransactions >= 3) {
    const suggestedPrice = Math.round(avgTransactionPrice * 0.95);
    return {
      shouldAdjust: true,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      currentFloorPrice: roomType.floorPrice,
      suggestedFloorPrice: suggestedPrice,
      reason: `${roomType.name}最近${recentBreakFloorTransactions}单破底价成交，建议下调底价至¥${suggestedPrice}匹配市场`,
      trend: 'down',
    };
  }
  
  return {
    shouldAdjust: false,
    currentFloorPrice: roomType.floorPrice,
    suggestedFloorPrice: roomType.floorPrice,
    reason: `${roomType.name}底价设置合理`,
    trend: 'up',
  };
}

// ============================================
// 调价频率控制
// ============================================

export interface PricingUpdateRule {
  minInterval: number;
  maxDailyUpdates: number;
  maxPriceChangePercent: number;
}

export const defaultPricingUpdateRule: PricingUpdateRule = {
  minInterval: 5,
  maxDailyUpdates: 20,
  maxPriceChangePercent: 15,
};

export function canUpdatePrice(
  lastUpdateTime: number,
  todayUpdateCount: number,
  currentPrice: number,
  newPrice: number,
  rules: PricingUpdateRule = defaultPricingUpdateRule
): { allowed: boolean; reason?: string } {
  const minutesSinceLastUpdate = (Date.now() - lastUpdateTime) / (1000 * 60);
  if (minutesSinceLastUpdate < rules.minInterval) {
    return {
      allowed: false,
      reason: `调价太频繁，请${Math.ceil(rules.minInterval - minutesSinceLastUpdate)}分钟后再试`,
    };
  }
  
  if (todayUpdateCount >= rules.maxDailyUpdates) {
    return {
      allowed: false,
      reason: `今日调价次数已达上限(${rules.maxDailyUpdates}次)`,
    };
  }
  
  const changePercent = Math.abs((newPrice - currentPrice) / currentPrice * 100);
  if (changePercent > rules.maxPriceChangePercent) {
    return {
      allowed: false,
      reason: `调价幅度过大(${changePercent.toFixed(1)}%)，单次最多${rules.maxPriceChangePercent}%`,
    };
  }
  
  return { allowed: true };
}
