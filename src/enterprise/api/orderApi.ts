/**
 * 订单相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  OrderStatus,
  PaginationParams,
  FilterParams,
  NonStandardOrder,
} from './types';
import { MOCK_ORDERS, MOCK_NON_STANDARD_ORDERS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取订单列表
 */
export async function getOrders(
  params?: PaginationParams & FilterParams & { hotelId?: string; status?: OrderStatus }
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  await delay();
  
  let list = [...MOCK_ORDERS];
  
  if (params?.hotelId) {
    list = list.filter(o => o.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(o => o.status === params.status);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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
 * 获取订单详情
 */
export async function getOrderDetail(orderId: string): Promise<ApiResponse<Order>> {
  await delay();
  
  const order = MOCK_ORDERS.find(o => o.id === orderId);
  
  if (!order) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: order,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 确认订单
 */
export async function confirmOrder(orderId: string): Promise<ApiResponse<Order>> {
  await delay(500);
  
  const orderIndex = MOCK_ORDERS.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ORDERS[orderIndex] = {
    ...MOCK_ORDERS[orderIndex],
    status: 'confirmed' as OrderStatus,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_ORDERS[orderIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<ApiResponse<Order>> {
  await delay(500);
  
  const orderIndex = MOCK_ORDERS.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ORDERS[orderIndex] = {
    ...MOCK_ORDERS[orderIndex],
    status: 'cancelled' as OrderStatus,
    cancelReason: reason,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_ORDERS[orderIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 办理入住
 */
export async function checkInOrder(orderId: string, roomNumber: string): Promise<ApiResponse<Order>> {
  await delay(500);
  
  const orderIndex = MOCK_ORDERS.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ORDERS[orderIndex] = {
    ...MOCK_ORDERS[orderIndex],
    status: 'checked_in' as OrderStatus,
    roomNumber,
    checkInTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_ORDERS[orderIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 办理退房
 */
export async function checkOutOrder(orderId: string): Promise<ApiResponse<Order>> {
  await delay(500);
  
  const orderIndex = MOCK_ORDERS.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ORDERS[orderIndex] = {
    ...MOCK_ORDERS[orderIndex],
    status: 'checked_out' as OrderStatus,
    checkOutTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_ORDERS[orderIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取订单统计
 */
export async function getOrderStats(hotelId?: string): Promise<ApiResponse<{
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  todayRevenue: number;
}>> {
  await delay();
  
  let list = [...MOCK_ORDERS];
  if (hotelId) {
    list = list.filter(o => o.hotelId === hotelId);
  }
  
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = list.filter(o => o.createdAt.startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  
  return {
    success: true,
    data: {
      total: list.length,
      pending: list.filter(o => o.status === 'pending').length,
      confirmed: list.filter(o => o.status === 'confirmed').length,
      checkedIn: list.filter(o => o.status === 'checked_in').length,
      checkedOut: list.filter(o => o.status === 'checked_out').length,
      cancelled: list.filter(o => o.status === 'cancelled').length,
      todayRevenue,
    },
    timestamp: new Date().toISOString(),
  };
}

// ==================== 非标渠道订单 API ====================

/**
 * 获取非标渠道订单列表
 */
export async function getNonStandardOrders(
  params?: PaginationParams & FilterParams & { hotelId?: string; channel?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<NonStandardOrder>>> {
  await delay();
  
  let list = [...MOCK_NON_STANDARD_ORDERS];
  
  if (params?.hotelId) {
    list = list.filter(o => o.hotelId === params.hotelId);
  }
  
  if (params?.channel) {
    list = list.filter(o => o.channel === params.channel);
  }
  
  if (params?.status) {
    list = list.filter(o => o.status === params.status);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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
 * 获取非标渠道订单详情
 */
export async function getNonStandardOrderDetail(orderId: string): Promise<ApiResponse<NonStandardOrder>> {
  await delay();
  
  const order = MOCK_NON_STANDARD_ORDERS.find(o => o.id === orderId);
  
  if (!order) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: order,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 同步非标订单到PMS
 */
export async function syncOrderToPMS(orderId: string): Promise<ApiResponse<NonStandardOrder>> {
  await delay(1000);
  
  const orderIndex = MOCK_NON_STANDARD_ORDERS.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '订单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 模拟同步过程
  MOCK_NON_STANDARD_ORDERS[orderIndex] = {
    ...MOCK_NON_STANDARD_ORDERS[orderIndex],
    pmsStatus: 'syncing',
  };
  
  // 模拟同步成功
  await delay(500);
  
  MOCK_NON_STANDARD_ORDERS[orderIndex] = {
    ...MOCK_NON_STANDARD_ORDERS[orderIndex],
    pmsStatus: 'synced',
    pmsOrderId: `PMS${Date.now()}`,
    syncedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_NON_STANDARD_ORDERS[orderIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取非标订单统计
 */
export async function getNonStandardOrderStats(hotelId?: string): Promise<ApiResponse<{
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  pmsPending: number;
  pmsSynced: number;
  pmsFailed: number;
  totalRevenue: number;
  totalNetAmount: number;
}>> {
  await delay();
  
  let list = [...MOCK_NON_STANDARD_ORDERS];
  if (hotelId) {
    list = list.filter(o => o.hotelId === hotelId);
  }
  
  const totalRevenue = list.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalNetAmount = list.reduce((sum, o) => sum + o.netAmount, 0);
  
  return {
    success: true,
    data: {
      total: list.length,
      pending: list.filter(o => o.status === 'pending').length,
      confirmed: list.filter(o => o.status === 'confirmed').length,
      checkedIn: list.filter(o => o.status === 'checked_in').length,
      checkedOut: list.filter(o => o.status === 'checked_out').length,
      cancelled: list.filter(o => o.status === 'cancelled').length,
      pmsPending: list.filter(o => o.pmsStatus === 'pending').length,
      pmsSynced: list.filter(o => o.pmsStatus === 'synced').length,
      pmsFailed: list.filter(o => o.pmsStatus === 'failed').length,
      totalRevenue,
      totalNetAmount,
    },
    timestamp: new Date().toISOString(),
  };
}
