/**
 * 结算中心 API
 * 
 * 基于非标渠道订单的结算管理：
 * 1. 酒店应付视角：应付华美会的佣金（订单金额10%）
 * 2. 平台分账视角：与 Shadow Bees 分账（1:1，各5%）
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
} from './types';
import { MOCK_NON_STANDARD_ORDERS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 结算状态类型
export type SettlementStatus = 'pending' | 'settled' | 'invoiced';
export type InvoiceStatus = 'not_applied' | 'applied' | 'issued';
export type ChannelType = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';

// 结算明细
export interface SettlementItem {
  id: string;
  orderId: string;
  orderNo: string;
  channel: ChannelType;
  hotelId: string;
  hotelName: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomTypeName: string;
  
  // 金额相关
  orderAmount: number;
  channelFee: number;
  platformFee: number;
  
  // 分账相关
  huameihuiCommission: number;
  shadowBeesShare: number;
  huameihuiNet: number;
  hotelNet: number;
  
  // 结算状态
  status: SettlementStatus;
  invoiceStatus: InvoiceStatus;
  settledAt?: string;
  invoiceNo?: string;
  
  createdAt: string;
  period: string;
}

// 结算统计数据
export interface SettlementStats {
  totalOrders: number;
  totalAmount: number;
  totalCommission: number;
  totalShadowBeesShare: number;
  totalHuameihuiNet: number;
  totalHotelNet: number;
  pendingCount: number;
  pendingCommission: number;
}

// 月度统计数据
export interface MonthlyStat {
  period: string;
  orderAmount: number;
  commission: number;
  shadowBeesShare: number;
  huameihuiNet: number;
}

// 从非标订单生成结算数据
const generateSettlementFromOrders = (hotelId?: string): SettlementItem[] => {
  let orders = [...MOCK_NON_STANDARD_ORDERS];
  
  if (hotelId) {
    orders = orders.filter(o => o.hotelId === hotelId);
  }
  
  const channels: ChannelType[] = ['xianyu', 'xiaohongshu', 'wechat', 'douyin'];
  const statuses: SettlementStatus[] = ['pending', 'pending', 'settled', 'settled', 'invoiced'];
  
  return orders.map((order, i) => {
    const channel = channels[i % channels.length];
    const status = statuses[i % statuses.length];
    
    // 分账计算
    const orderAmount = order.totalAmount;
    const huameihuiCommission = Math.round(orderAmount * 0.1);
    const shadowBeesShare = Math.round(huameihuiCommission * 0.5);
    const huameihuiNet = huameihuiCommission - shadowBeesShare;
    const hotelNet = orderAmount - huameihuiCommission;
    
    const date = new Date(order.createdAt);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    return {
      id: `SET-${order.id}`,
      orderId: order.id,
      orderNo: order.orderNo,
      channel,
      hotelId: order.hotelId,
      hotelName: order.hotelName,
      guestName: order.guestName,
      checkInDate: order.checkInDate,
      checkOutDate: order.checkOutDate,
      nights: order.nights,
      roomTypeName: order.roomTypeName,
      orderAmount,
      channelFee: order.channelFee,
      platformFee: order.platformFee,
      huameihuiCommission,
      shadowBeesShare,
      huameihuiNet,
      hotelNet,
      status,
      invoiceStatus: status === 'invoiced' ? 'issued' : status === 'settled' ? 'applied' : 'not_applied',
      settledAt: status !== 'pending' ? new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() : undefined,
      invoiceNo: status === 'invoiced' ? `INV-${Date.now()}-${i}` : undefined,
      createdAt: order.createdAt,
      period,
    };
  });
};

/**
 * 获取结算列表
 */
export async function getSettlements(
  params?: PaginationParams & FilterParams & { hotelId?: string; period?: string; status?: SettlementStatus }
): Promise<ApiResponse<PaginatedResponse<SettlementItem>>> {
  await delay();
  
  let list = generateSettlementFromOrders(params?.hotelId);
  
  // 周期筛选
  if (params?.period && params.period !== 'all') {
    list = list.filter(item => item.period === params.period);
  }
  
  // 状态筛选
  if (params?.status && params.status !== 'all' as any) {
    list = list.filter(item => item.status === params.status);
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
 * 获取结算统计数据
 */
export async function getSettlementStats(hotelId?: string): Promise<ApiResponse<SettlementStats>> {
  await delay();
  
  const list = generateSettlementFromOrders(hotelId);
  
  const totalOrders = list.length;
  const totalAmount = list.reduce((sum, item) => sum + item.orderAmount, 0);
  const totalCommission = list.reduce((sum, item) => sum + item.huameihuiCommission, 0);
  const totalShadowBeesShare = list.reduce((sum, item) => sum + item.shadowBeesShare, 0);
  const totalHuameihuiNet = list.reduce((sum, item) => sum + item.huameihuiNet, 0);
  const totalHotelNet = list.reduce((sum, item) => sum + item.hotelNet, 0);
  
  const pendingCount = list.filter(item => item.status === 'pending').length;
  const pendingCommission = list
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + item.huameihuiCommission, 0);
  
  return {
    success: true,
    data: {
      totalOrders,
      totalAmount,
      totalCommission,
      totalShadowBeesShare,
      totalHuameihuiNet,
      totalHotelNet,
      pendingCount,
      pendingCommission,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取月度结算统计
 */
export async function getMonthlySettlementStats(hotelId?: string): Promise<ApiResponse<MonthlyStat[]>> {
  await delay();
  
  const list = generateSettlementFromOrders(hotelId);
  
  const stats: Record<string, MonthlyStat> = {};
  
  list.forEach(item => {
    if (!stats[item.period]) {
      stats[item.period] = {
        period: item.period,
        orderAmount: 0,
        commission: 0,
        shadowBeesShare: 0,
        huameihuiNet: 0,
      };
    }
    stats[item.period].orderAmount += item.orderAmount;
    stats[item.period].commission += item.huameihuiCommission;
    stats[item.period].shadowBeesShare += item.shadowBeesShare;
    stats[item.period].huameihuiNet += item.huameihuiNet;
  });
  
  const sortedStats = Object.values(stats)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-6);
  
  return {
    success: true,
    data: sortedStats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 申请开票
 */
export async function applyInvoice(settlementIds: string[]): Promise<ApiResponse<{ invoiceNo: string }>> {
  await delay(800);
  
  if (settlementIds.length === 0) {
    return {
      success: false,
      data: null as any,
      message: '请选择需要开票的结算单',
      timestamp: new Date().toISOString(),
    };
  }
  
  const invoiceNo = `INV-${Date.now()}`;
  
  return {
    success: true,
    data: { invoiceNo },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 确认结算
 */
export async function confirmSettlement(settlementIds: string[]): Promise<ApiResponse<{ settledAt: string }>> {
  await delay(800);
  
  if (settlementIds.length === 0) {
    return {
      success: false,
      data: null as any,
      message: '请选择需要结算的订单',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: { settledAt: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 导出结算数据
 */
export async function exportSettlements(
  _params?: { hotelId?: string; period?: string; status?: string }
): Promise<ApiResponse<{ downloadUrl: string; filename: string }>> {
  await delay(1500);
  
  const filename = `结算数据_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  return {
    success: true,
    data: {
      downloadUrl: `data:text/csv;charset=utf-8,结算数据导出`,
      filename,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取可筛选的周期列表
 */
export async function getAvailablePeriods(): Promise<ApiResponse<string[]>> {
  await delay();
  
  const periods: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  
  return {
    success: true,
    data: periods,
    timestamp: new Date().toISOString(),
  };
}
