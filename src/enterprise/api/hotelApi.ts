/**
 * 酒店相关API
 * 
 * 所有方法返回Promise，模拟真实API调用
 * 后续替换为真实fetch/axios调用即可
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Hotel,
  HotelDetail,
  HotelMetrics,
  PaginationParams,
  FilterParams,
} from './types';
import { MOCK_HOTELS, generateHotelMetrics } from './mockData';

// 模拟网络延迟
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取酒店列表
 */
export async function getHotels(
  params?: PaginationParams & FilterParams
): Promise<ApiResponse<PaginatedResponse<Hotel>>> {
  await delay();
  
  let list = [...MOCK_HOTELS];
  
  // 筛选
  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    list = list.filter(h => 
      h.name.toLowerCase().includes(keyword) ||
      h.city.toLowerCase().includes(keyword)
    );
  }
  
  if (params?.status) {
    list = list.filter(h => h.status === params.status);
  }
  
  // 分页
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取酒店详情
 */
export async function getHotelDetail(hotelId: string): Promise<ApiResponse<HotelDetail>> {
  await delay();
  
  const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
  if (!hotel) {
    return {
      success: false,
      data: null as any,
      message: '酒店不存在',
      code: 'HOTEL_NOT_FOUND',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 动态导入以避免循环依赖
  const { getRoomTypesForHotel } = await import('./mockData');
  const { MOCK_CHANNELS, MOCK_ACCOUNTS } = await import('./mockData');
  
  const detail: HotelDetail = {
    ...hotel,
    roomTypes: getRoomTypesForHotel(hotelId),
    channels: MOCK_CHANNELS.filter(() => Math.random() > 0.3), // 随机分配渠道
    accounts: MOCK_ACCOUNTS.filter(a => a.hotelId === hotelId),
  };
  
  return {
    success: true,
    data: detail,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取酒店指标（带勾稽关系）
 */
export async function getHotelMetrics(
  hotelId: string,
  date?: string
): Promise<ApiResponse<HotelMetrics>> {
  await delay();
  
  const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
  if (!hotel) {
    return {
      success: false,
      data: null as any,
      message: '酒店不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const metricsDate = date || new Date().toISOString().split('T')[0];
  const metrics = generateHotelMetrics(hotelId, metricsDate);
  
  return {
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取多个酒店的指标
 */
export async function getBatchHotelMetrics(
  hotelIds: string[],
  date?: string
): Promise<ApiResponse<Record<string, HotelMetrics>>> {
  await delay();
  
  const metricsDate = date || new Date().toISOString().split('T')[0];
  const result: Record<string, HotelMetrics> = {};
  
  hotelIds.forEach(id => {
    result[id] = generateHotelMetrics(id, metricsDate);
  });
  
  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 同步酒店数据到PMS
 */
export async function syncHotelToPMS(hotelId: string): Promise<ApiResponse<{ synced: boolean }>> {
  await delay(1000); // 同步需要更长时间
  
  const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
  if (!hotel) {
    return {
      success: false,
      data: { synced: false },
      message: '酒店不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 模拟同步成功（90%成功率）
  const synced = Math.random() > 0.1;
  
  return {
    success: synced,
    data: { synced },
    message: synced ? '同步成功' : '同步失败，请稍后重试',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新酒店信息
 */
export async function updateHotel(
  hotelId: string,
  updates: Partial<Hotel>
): Promise<ApiResponse<Hotel>> {
  await delay();
  
  const hotelIndex = MOCK_HOTELS.findIndex(h => h.id === hotelId);
  if (hotelIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '酒店不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 实际项目中这里应该更新数据库
  // 目前只是返回模拟数据
  const updated = { ...MOCK_HOTELS[hotelIndex], ...updates };
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}
