/**
 * 定价相关API
 */

import type {
  ApiResponse,
  PricingInfo,
  PricingCalendar,
  UpdatePricingRequest,
  BatchUpdatePricingRequest,
  BatchUpdatePricingResponse,
  AIInsight,
} from './types';
import { getRoomTypesForHotel, MOCK_AI_INSIGHTS, getCompetitorPriceRange } from './mockData';

// 重新导出 RoomCategory 类型
export type { RoomCategory } from './mockData';

// 重新导出 getCompetitorPriceRange 函数
export { getCompetitorPriceRange };

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 内存中的定价数据（模拟数据库）
const pricingCache: Map<string, PricingInfo> = new Map();
const calendarCache: Map<string, PricingCalendar> = new Map();

/**
 * 获取酒店定价信息
 */
export async function getHotelPricing(
  hotelId: string
): Promise<ApiResponse<PricingInfo[]>> {
  await delay();
  
  const roomTypes = getRoomTypesForHotel(hotelId);
  
  const pricing: PricingInfo[] = roomTypes.map(rt => {
    // 检查缓存
    const cacheKey = `${hotelId}-${rt.id}`;
    const cached = pricingCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // 生成新的定价信息
    const currentPrice = rt.basePrice + Math.floor(Math.random() * 100 - 50);
    const suggestedPrice = Math.max(
      rt.floorPrice,
      Math.min(rt.ceilingPrice, currentPrice + Math.floor(Math.random() * 100 - 30))
    );
    
    const info: PricingInfo = {
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      basePrice: rt.basePrice,
      currentPrice,
      suggestedPrice,
      floorPrice: rt.floorPrice,
      ceilingPrice: rt.ceilingPrice,
      currency: 'CNY',
      lastUpdated: new Date().toISOString(),
    };
    
    pricingCache.set(cacheKey, info);
    return info;
  });
  
  return {
    success: true,
    data: pricing,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取定价日历
 */
export async function getPricingCalendar(
  hotelId: string,
  roomTypeId?: string,
  startDate?: string,
  days: number = 30
): Promise<ApiResponse<PricingCalendar[]>> {
  await delay();
  
  const roomTypes = roomTypeId 
    ? getRoomTypesForHotel(hotelId).filter(rt => rt.id === roomTypeId)
    : getRoomTypesForHotel(hotelId);
  
  const start = startDate ? new Date(startDate) : new Date();
  const calendars: PricingCalendar[] = [];
  
  roomTypes.forEach(rt => {
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 周末价格上浮
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const basePrice = rt.basePrice * (isWeekend ? 1.2 : 1);
      
      // 检查缓存
      const cacheKey = `${hotelId}-${rt.id}-${dateStr}`;
      let calendar = calendarCache.get(cacheKey);
      
      if (!calendar) {
        // 模拟一些售罄日期
        const status = Math.random() > 0.9 ? 'sold_out' : 'available';
        
        calendar = {
          roomTypeId: rt.id,
          date: dateStr,
          price: Math.round(basePrice + (Math.random() * 200 - 100)),
          originalPrice: Math.round(basePrice * 1.2),
          status,
          minStay: Math.random() > 0.8 ? 2 : 1,
          restrictions: status === 'sold_out' ? ['no_arrival'] : undefined,
        };
        
        calendarCache.set(cacheKey, calendar);
      }
      
      calendars.push(calendar);
    }
  });
  
  return {
    success: true,
    data: calendars,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新定价
 */
export async function updatePricing(
  request: UpdatePricingRequest
): Promise<ApiResponse<PricingInfo>> {
  await delay(500);
  
  const { hotelId, roomTypeId, date, price } = request;
  const cacheKey = `${hotelId}-${roomTypeId}`;
  
  const existing = pricingCache.get(cacheKey);
  if (!existing) {
    return {
      success: false,
      data: null as any,
      message: '定价信息不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const updated: PricingInfo = {
    ...existing,
    currentPrice: price,
    lastUpdated: new Date().toISOString(),
    updatedBy: '当前用户',
  };
  
  pricingCache.set(cacheKey, updated);
  
  // 同时更新日历缓存
  const calendarKey = `${hotelId}-${roomTypeId}-${date}`;
  const calendar = calendarCache.get(calendarKey);
  if (calendar) {
    calendarCache.set(calendarKey, { ...calendar, price });
  }
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// 智能定价助手配置 API（Mock + 接口定义）
// ============================================

export type PricingMode = 'clearance' | 'dynamic' | 'scalper';

// 服务模式：酒店与华美会的协作方式
export type ServiceMode = 'full_trust' | 'assist' | 'self_operated';

export const SERVICE_MODE_CONFIG: Record<ServiceMode, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  badgeColor: string;
  icon: string;
}> = {
  full_trust: {
    label: '全权托管',
    description: 'AI自动执行定价策略，无需确认',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    icon: 'Shield',
  },
  assist: {
    label: '辅助决策',
    description: '接收AI建议，确认后生效',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: 'CheckCircle',
  },
  self_operated: {
    label: '完全自主',
    description: '自行定价，华美会仅提供数据',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-gray-100 text-gray-700',
    icon: 'Edit3',
  },
};

export interface PricingConfig {
  hotelId: string;
  enabled: boolean;
  mode: PricingMode;
  autoApply: boolean;
  lastUpdate: number;
  todayUpdateCount: number;
  maxUpdatesPerDay: number;
  // 扩展字段
  rules?: {
    minPriceRatio: number;  // 最低价格比例（相对竞品）
    maxPriceRatio: number;  // 最高价格比例
    adjustInterval: number; // 调整间隔（分钟）
  };
}

export interface AISuggestionRequest {
  hotelId: string;
  roomTypeId: string;
  currentPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  mode: PricingMode;
}

export interface AISuggestionResponse {
  suggestedPrice: number;
  anchorPrice: number;
  anchorDescription: string;
  competitorMin: number;
  competitorMax: number;
  competitorAvg: number;
  priceDiff: number;
  percentChange: string;
  confidence: number;
  reasoning: string;
}

// 内存中的配置存储（模拟数据库）
const configCache: Map<string, PricingConfig> = new Map();

// 服务模式缓存（模拟数据库）
const serviceModeCache: Map<string, ServiceMode> = new Map();

// 待确认建议数量缓存（模拟）
const pendingSuggestionsCache: Map<string, number> = new Map();

/**
 * 获取酒店服务模式
 * GET /api/v1/pricing/service-mode/{hotelId}
 */
export async function getServiceMode(
  hotelId: string
): Promise<ApiResponse<{ mode: ServiceMode; pendingSuggestions: number }>> {
  await delay(200);
  
  // 检查缓存
  let mode = serviceModeCache.get(hotelId);
  let pendingCount = pendingSuggestionsCache.get(hotelId);
  
  if (!mode) {
    // 根据酒店ID模拟不同的服务模式（循环分配）
    const modes: ServiceMode[] = ['full_trust', 'assist', 'self_operated'];
    const index = hotelId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % modes.length;
    mode = modes[index];
    serviceModeCache.set(hotelId, mode);
  }
  
  if (pendingCount === undefined) {
    // 辅助决策模式默认有1-3个待确认建议
    pendingCount = mode === 'assist' ? Math.floor(Math.random() * 3) + 1 : 0;
    pendingSuggestionsCache.set(hotelId, pendingCount);
  }
  
  return {
    success: true,
    data: { mode, pendingSuggestions: pendingCount },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取定价策略配置
 * GET /api/v1/pricing/config/{hotelId}
 */
export async function getPricingConfig(
  hotelId: string
): Promise<ApiResponse<PricingConfig>> {
  await delay(200);
  
  // 检查缓存
  let config = configCache.get(hotelId);
  
  if (!config) {
    // 返回默认配置
    config = {
      hotelId,
      enabled: false,
      mode: 'dynamic',
      autoApply: false,
      lastUpdate: Date.now(),
      todayUpdateCount: 0,
      maxUpdatesPerDay: 20,
      rules: {
        minPriceRatio: 0.85,
        maxPriceRatio: 1.15,
        adjustInterval: 5,
      },
    };
    configCache.set(hotelId, config);
  }
  
  return {
    success: true,
    data: config,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新定价策略配置
 * POST /api/v1/pricing/config
 */
export async function updatePricingConfig(
  config: Partial<PricingConfig> & { hotelId: string }
): Promise<ApiResponse<PricingConfig>> {
  await delay(300);
  
  const existing = configCache.get(config.hotelId);
  
  const updated: PricingConfig = {
    ...existing,
    ...config,
    lastUpdate: Date.now(),
  } as PricingConfig;
  
  configCache.set(config.hotelId, updated);
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 切换定价助手开关
 * POST /api/v1/pricing/config/{hotelId}/toggle
 */
export async function togglePricingAssistant(
  hotelId: string,
  enabled: boolean
): Promise<ApiResponse<PricingConfig>> {
  return updatePricingConfig({ hotelId, enabled });
}

/**
 * 切换自动/手动模式
 * POST /api/v1/pricing/config/{hotelId}/auto-apply
 */
export async function toggleAutoApply(
  hotelId: string,
  autoApply: boolean
): Promise<ApiResponse<PricingConfig>> {
  return updatePricingConfig({ hotelId, autoApply });
}

/**
 * 切换定价模式
 * POST /api/v1/pricing/config/{hotelId}/mode
 */
export async function changePricingMode(
  hotelId: string,
  mode: PricingMode
): Promise<ApiResponse<PricingConfig>> {
  return updatePricingConfig({ hotelId, mode });
}

/**
 * 获取 AI 定价建议
 * POST /api/v1/pricing/suggestion
 * 
 * 计算逻辑：
 * - clearance: 锚定竞品最低价 × 0.95
 * - dynamic: 锚定竞品中间价
 * - scalper: 锚定竞品最高价 × 1.1
 */
export async function getAISuggestion(
  request: AISuggestionRequest
): Promise<ApiResponse<AISuggestionResponse>> {
  await delay(500);
  
  const { currentPrice, floorPrice, ceilingPrice, mode } = request;
  
  // 获取竞品价格（模拟）
  const competitorMin = Math.round(currentPrice * 0.85);
  const competitorMax = Math.round(currentPrice * 1.15);
  const competitorAvg = Math.round((competitorMin + competitorMax) / 2);
  
  // 根据模式计算锚定价格
  let anchorPrice: number;
  let anchorDescription: string;
  let reasoning: string;
  
  switch (mode) {
    case 'clearance':
      anchorPrice = Math.round(competitorMin * 0.95);
      anchorDescription = '锚定最低价 × 0.95';
      reasoning = '尾货模式：确保价格低于竞品，快速出货';
      break;
    case 'scalper':
      anchorPrice = Math.round(competitorMax * 1.1);
      anchorDescription = '锚定最高价 × 1.1';
      reasoning = '黄牛模式：高于市场均价，追求溢价';
      break;
    case 'dynamic':
    default:
      anchorPrice = Math.round((competitorMin + competitorMax) / 2);
      anchorDescription = '锚定中间价';
      reasoning = '动态模式：跟随市场中间价，平衡收益';
      break;
  }
  
  // 约束在底价和天花板之间
  const suggestedPrice = Math.max(floorPrice, Math.min(ceilingPrice, anchorPrice));
  const priceDiff = suggestedPrice - currentPrice;
  const percentChange = ((priceDiff / currentPrice) * 100).toFixed(1);
  
  // 计算置信度（基于数据质量）
  const confidence = Math.round(70 + Math.random() * 25);
  
  return {
    success: true,
    data: {
      suggestedPrice,
      anchorPrice,
      anchorDescription,
      competitorMin,
      competitorMax,
      competitorAvg,
      priceDiff,
      percentChange,
      confidence,
      reasoning,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 应用 AI 建议价格
 * POST /api/v1/pricing/apply-suggestion
 */
export async function applyAISuggestion(
  hotelId: string,
  roomTypeId: string,
  suggestedPrice: number
): Promise<ApiResponse<{ applied: boolean; newPrice: number }>> {
  await delay(400);
  
  // 更新价格缓存
  const cacheKey = `${hotelId}-${roomTypeId}`;
  const existing = pricingCache.get(cacheKey);
  
  if (existing) {
    pricingCache.set(cacheKey, {
      ...existing,
      currentPrice: suggestedPrice,
      lastUpdated: new Date().toISOString(),
    });
  }
  
  // 更新配置中的今日调价次数
  const config = configCache.get(hotelId);
  if (config) {
    config.todayUpdateCount += 1;
    config.lastUpdate = Date.now();
  }
  
  return {
    success: true,
    data: {
      applied: true,
      newPrice: suggestedPrice,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量更新定价
 */
export async function batchUpdatePricing(
  request: BatchUpdatePricingRequest
): Promise<ApiResponse<BatchUpdatePricingResponse>> {
  await delay(1500); // 批量操作需要更长时间
  
  const { hotelIds, adjustment } = request;
  
  const jobId = `job-${Date.now()}`;
  const results: { hotelId: string; success: boolean; message?: string }[] = [];
  let failedCount = 0;
  
  hotelIds.forEach(hotelId => {
    // 模拟90%成功率
    const success = Math.random() > 0.1;
    
    if (success) {
      // 更新缓存中的价格
      const roomTypes = getRoomTypesForHotel(hotelId);
      roomTypes.forEach(rt => {
        const cacheKey = `${hotelId}-${rt.id}`;
        const existing = pricingCache.get(cacheKey);
        if (existing) {
          let newPrice = existing.currentPrice;
          if (adjustment.type === 'fixed') {
            newPrice = adjustment.value;
          } else if (adjustment.type === 'percentage') {
            newPrice = Math.round(existing.currentPrice * (1 + adjustment.value / 100));
          } else if (adjustment.type === 'ai_suggest') {
            newPrice = existing.suggestedPrice;
          }
          
          pricingCache.set(cacheKey, {
            ...existing,
            currentPrice: Math.max(existing.floorPrice, Math.min(existing.ceilingPrice, newPrice)),
            lastUpdated: new Date().toISOString(),
          });
        }
      });
    } else {
      failedCount++;
    }
    
    results.push({
      hotelId,
      success,
      message: success ? undefined : '网络超时，请重试',
    });
  });
  
  return {
    success: true,
    data: {
      jobId,
      status: 'completed',
      totalHotels: hotelIds.length,
      processedHotels: hotelIds.length - failedCount,
      failedHotels: failedCount,
      results,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取AI定价建议
 */
export async function getAIPricingSuggestions(
  hotelId: string
): Promise<ApiResponse<AIInsight[]>> {
  await delay(800);
  
  const suggestions = MOCK_AI_INSIGHTS.filter(
    ai => ai.hotelId === hotelId && ai.type === 'pricing'
  );
  
  return {
    success: true,
    data: suggestions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 应用AI定价建议
 */
export async function applyAIPricing(
  hotelId: string,
  roomTypeId: string,
  suggestedPrice: number
): Promise<ApiResponse<PricingInfo>> {
  await delay(500);
  
  const cacheKey = `${hotelId}-${roomTypeId}`;
  const existing = pricingCache.get(cacheKey);
  
  if (!existing) {
    return {
      success: false,
      data: null as any,
      message: '定价信息不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const updated: PricingInfo = {
    ...existing,
    currentPrice: suggestedPrice,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'AI系统',
  };
  
  pricingCache.set(cacheKey, updated);
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}
