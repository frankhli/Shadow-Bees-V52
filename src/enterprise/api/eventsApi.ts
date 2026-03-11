/**
 * 事件情报相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  EventIntel,
  CompetitorIntel,
  PaginationParams,
} from './types';
import { MOCK_EVENTS, MOCK_COMPETITORS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取事件情报列表
 */
export async function getEventIntels(
  params?: PaginationParams & { 
    type?: string; 
    impact?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<PaginatedResponse<EventIntel>>> {
  await delay();
  
  let list = [...MOCK_EVENTS];
  
  if (params?.type) {
    list = list.filter(e => e.type === params.type);
  }
  
  if (params?.impact) {
    list = list.filter(e => e.impact === params.impact);
  }
  
  if (params?.status) {
    list = list.filter(e => e.status === params.status);
  }
  
  if (params?.startDate) {
    list = list.filter(e => e.startDate && e.startDate >= params.startDate!);
  }
  
  if (params?.endDate) {
    list = list.filter(e => e.endDate && e.endDate <= params.endDate!);
  }
  
  // 按影响力和时间排序
  const impactWeight = { high: 3, medium: 2, low: 1 };
  list.sort((a, b) => {
    if (impactWeight[a.impact as keyof typeof impactWeight] !== impactWeight[b.impact as keyof typeof impactWeight]) {
      return impactWeight[b.impact as keyof typeof impactWeight] - impactWeight[a.impact as keyof typeof impactWeight];
    }
    const bTime = b.startDate ? new Date(b.startDate).getTime() : new Date(b.date).getTime();
    const aTime = a.startDate ? new Date(a.startDate).getTime() : new Date(a.date).getTime();
    return bTime - aTime;
  });
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize) as EventIntel[],
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取事件详情
 */
export async function getEventDetail(eventId: string): Promise<ApiResponse<EventIntel>> {
  await delay();
  
  const event = MOCK_EVENTS.find(e => e.id === eventId);
  
  if (!event) {
    return {
      success: false,
      data: null as any,
      message: '事件不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: event as EventIntel,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取影响酒店的事件
 */
export async function getEventsForHotel(
  hotelId: string,
  params?: { startDate?: string; endDate?: string }
): Promise<ApiResponse<EventIntel[]>> {
  await delay();
  
  let list = MOCK_EVENTS.filter(e => 
    e.affectedHotels?.includes(hotelId) || e.affectedRegion
  );
  
  if (params?.startDate) {
    list = list.filter(e => e.endDate && e.endDate >= params.startDate!);
  }
  
  if (params?.endDate) {
    list = list.filter(e => e.startDate && e.startDate <= params.endDate!);
  }
  
  // 按时间排序
  list.sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : new Date(a.date).getTime();
    const bTime = b.startDate ? new Date(b.startDate).getTime() : new Date(b.date).getTime();
    return aTime - bTime;
  });
  
  return {
    success: true,
    data: list as EventIntel[],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取事件统计
 */
export async function getEventStats(): Promise<ApiResponse<{
  total: number;
  active: number;
  upcoming: number;
  highImpact: number;
  byType: Record<string, number>;
}>> {
  await delay();
  
  const now = new Date().toISOString().split('T')[0];
  
  const byType: Record<string, number> = {};
  MOCK_EVENTS.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });
  
  return {
    success: true,
    data: {
      total: MOCK_EVENTS.length,
      active: MOCK_EVENTS.filter(e => e.status === 'ongoing').length,
      upcoming: MOCK_EVENTS.filter(e => e.startDate && e.startDate > now).length,
      highImpact: MOCK_EVENTS.filter(e => e.impact === 'high').length,
      byType,
    },
    timestamp: new Date().toISOString(),
  };
}

// ==================== 竞品监控 ====================

/**
 * 获取竞品情报列表
 */
export async function getCompetitorIntels(
  params?: PaginationParams & { 
    tier?: string; 
    hotelId?: string;
  }
): Promise<ApiResponse<PaginatedResponse<CompetitorIntel>>> {
  await delay();
  
  let list = [...MOCK_COMPETITORS];
  
  if (params?.tier) {
    list = list.filter(c => c.tier === params.tier);
  }
  
  if (params?.hotelId) {
    list = list.filter(c => c.competitorOf === params.hotelId);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 按层级生成竞品分析（只返回与酒店同档次的竞品）
 */
export async function generateCompetitorsByTier(
  hotelId: string
): Promise<ApiResponse<Record<string, CompetitorIntel[]>>> {
  await delay(800);
  
  // 根据酒店ID获取酒店信息（简化判断：假设都是经济型）
  // 实际应根据酒店真实档次返回对应竞品
  const hotelTier = hotelId.startsWith('hotel') ? 'low' : 'medium'; // 简化判断
  
  // 只返回同档次竞品
  const sameTierCompetitors = MOCK_COMPETITORS.filter(c => c.tier === hotelTier);
  
  // 按层级分组（只包含同档次）
  const byTier: Record<string, CompetitorIntel[]> = {
    same: sameTierCompetitors,
  };
  
  return {
    success: true,
    data: byTier,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取竞品价格趋势
 */
export async function getCompetitorPriceTrends(
  competitorId: string,
  days: number = 7
): Promise<ApiResponse<{
  dates: string[];
  prices: number[];
}>> {
  await delay();
  
  const competitor = MOCK_COMPETITORS.find(c => c.id === competitorId);
  
  if (!competitor) {
    return {
      success: false,
      data: null as any,
      message: '竞品不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 生成模拟价格趋势
  const dates: string[] = [];
  const prices: number[] = [];
  const basePrice = competitor.priceRange?.min || 500;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
    
    // 随机波动
    const fluctuation = (Math.random() - 0.5) * 0.2;
    prices.push(Math.round(basePrice * (1 + fluctuation)));
  }
  
  return {
    success: true,
    data: { dates, prices },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取竞品对比分析
 */
export async function getCompetitorComparison(
  _hotelId?: string
): Promise<ApiResponse<{
  myHotel: { name: string; price: number; score: number };
  competitors: { name: string; price: number; score: number; diff: number }[];
}>> {
  await delay();
  
  // 模拟当前酒店数据
  const myHotel = { name: '我的酒店', price: 580, score: 4.5 };
  
  // 对比竞品
  const competitors = MOCK_COMPETITORS.slice(0, 5).map(c => ({
    name: c.name,
    price: c.priceRange?.min || 500,
    score: c.rating || 4.0,
    diff: (c.priceRange?.min || 500) - myHotel.price,
  }));
  
  return {
    success: true,
    data: { myHotel, competitors },
    timestamp: new Date().toISOString(),
  };
}
