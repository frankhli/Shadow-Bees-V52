/**
 * 客户管理 API
 * 
 * B端客户 = 系统中的酒店（与酒店选择器一致）
 * C端客户 = 住客/会员
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  Hotel,
} from './types';
import { getHotels } from './hotelApi';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== B端客户类型 ====================

export type HotelPartnerStatus = 'active' | 'pending' | 'suspended' | 'terminated';
export type HotelPartnerTier = 'strategic' | 'core' | 'standard' | 'trial';
export type SettlementCycle = 'monthly' | 'quarterly' | 'yearly';

export interface HotelPartner {
  id: string;
  name: string;
  brand: string;
  city: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  status: HotelPartnerStatus;
  tier: HotelPartnerTier;
  joinDate: string;
  contractEndDate: string;
  roomCount: number;
  settlementCycle: SettlementCycle;
  commissionRate: number;
  monthlyRevenue: number;
  totalOrders: number;
  rating: number;
  tags: string[];
  lastActiveDate: string;
  accountManager?: string;
}

// ==================== C端客户类型 ====================

export type CustomerTier = 'vip' | 'gold' | 'silver' | 'regular';
export type CustomerStatus = 'active' | 'inactive' | 'lost';
export type CustomerSource = 'ota' | 'wechat' | 'xianyu' | 'xhs' | 'direct' | 'referral';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier: CustomerTier;
  status: CustomerStatus;
  source: CustomerSource;
  tags: string[];
  totalOrders: number;
  totalSpent: number;
  lastStayDate?: string;
  preferredHotelId?: string;
  preferredHotelName?: string;
  allVisitedHotels: string[];
  note?: string;
  createdAt: string;
}

// ==================== Mock C端客户数据 ====================

let MOCK_CUSTOMERS: Customer[] = [];

const generateMockCustomers = (hotels: Hotel[]): Customer[] => {
  const hotelIds = hotels.map(h => h.id);
  const hotelNames = hotels.map(h => h.name);
  
  const tiers: CustomerTier[] = ['vip', 'gold', 'silver', 'regular'];
  const statuses: CustomerStatus[] = ['active', 'active', 'active', 'inactive', 'lost'];
  const sources: CustomerSource[] = ['ota', 'wechat', 'xianyu', 'xhs', 'direct', 'referral'];
  const tags = ['常旅客', '商务客', '家庭游', '情侣', '学生党', '演唱会'];
  
  return Array.from({ length: 50 }, (_, i) => {
    const tier = tiers[i % tiers.length];
    const orderMultiplier = tier === 'vip' ? 5 : tier === 'gold' ? 3 : tier === 'silver' ? 2 : 1;
    const preferredHotelIdx = i % hotelIds.length;
    
    return {
      id: `cust-${i}`,
      name: `客户${i + 1}`,
      phone: `138****${String(i).padStart(4, '0').slice(-4)}`,
      email: i % 3 === 0 ? `customer${i}@email.com` : undefined,
      tier,
      status: statuses[i % statuses.length],
      source: sources[i % statuses.length],
      tags: tags.slice(i % tags.length, i % tags.length + Math.floor(Math.random() * 3) + 1),
      totalOrders: Math.floor(Math.random() * 10 * orderMultiplier) + 1,
      totalSpent: Math.floor(Math.random() * 5000 * orderMultiplier) + 500,
      lastStayDate: i % 5 !== 0 ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      preferredHotelId: hotelIds[preferredHotelIdx],
      preferredHotelName: hotelNames[preferredHotelIdx],
      allVisitedHotels: [hotelNames[preferredHotelIdx], hotelNames[(i + 1) % hotelNames.length]].filter(Boolean),
      note: i % 7 === 0 ? 'VIP客户，需要特别关注' : undefined,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
};

// ==================== API 实现 ====================

/**
 * 获取B端客户列表（酒店客户）
 * 从系统酒店数据转换，与酒店选择器保持一致
 */
export async function getHotelPartners(
  params?: PaginationParams & { status?: string; tier?: string }
): Promise<ApiResponse<PaginatedResponse<HotelPartner>>> {
  await delay();
  
  // 从 hotelApi 获取酒店列表
  const hotelsRes = await getHotels({ page: 1, pageSize: 100 });
  
  if (!hotelsRes.success) {
    return {
      success: false,
      data: null as any,
      message: '获取酒店数据失败',
      timestamp: new Date().toISOString(),
    };
  }
  
  const hotels = hotelsRes.data.list;
  
  // 将酒店数据转换为B端客户格式
  const tiers: HotelPartnerTier[] = ['strategic', 'core', 'standard', 'trial'];
  const statuses: HotelPartnerStatus[] = ['active', 'active', 'active', 'active', 'active', 'pending', 'pending', 'suspended'];
  
  let list: HotelPartner[] = hotels.map((hotel: Hotel, i: number) => {
    const tier = tiers[i % tiers.length];
    const status = statuses[i % statuses.length] as HotelPartnerStatus;
    const multiplier = tier === 'strategic' ? 3 : tier === 'core' ? 2 : 1;
    
    return {
      id: hotel.id,
      name: hotel.name,
      brand: hotel.brand || '华美会',
      city: hotel.city || '未知城市',
      address: hotel.address || `${hotel.city || ''}市XX路XX号`,
      contactName: hotel.managerName || `张经理${i}`,
      contactPhone: hotel.managerPhone || `138****${String(i).padStart(4, '0').slice(-4)}`,
      contactEmail: `manager${i}@hotel.com`,
      status: status,
      tier: tier,
      joinDate: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contractEndDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      roomCount: hotel.roomCount || 100,
      settlementCycle: ['monthly', 'monthly', 'monthly', 'quarterly'][i % 4] as SettlementCycle,
      commissionRate: [8, 10, 12, 15][i % 4],
      monthlyRevenue: Math.floor(Math.random() * 50000 * multiplier) + 10000,
      totalOrders: Math.floor(Math.random() * 100 * multiplier) + 20,
      rating: [4.8, 4.5, 4.2, 3.9][i % 4],
      tags: ['高星酒店', '商圈核心', '网红店', '商务首选'].slice(0, Math.floor(Math.random() * 3) + 1),
      lastActiveDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      accountManager: ['王经理', '李经理', '赵经理'][i % 3],
    };
  });
  
  // 应用筛选
  if (params?.status) {
    list = list.filter(p => p.status === params.status);
  }
  if (params?.tier) {
    list = list.filter(p => p.tier === params.tier);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
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
 * 获取C端客户列表（住客）
 */
export async function getCustomers(
  params?: PaginationParams & { 
    hotelIds?: string[]; 
    tier?: string; 
    status?: string;
    keyword?: string;
  }
): Promise<ApiResponse<PaginatedResponse<Customer>>> {
  await delay();
  
  // 确保C端客户数据已生成
  if (MOCK_CUSTOMERS.length === 0) {
    const hotelsRes = await getHotels({ page: 1, pageSize: 100 });
    const hotels = hotelsRes.success ? hotelsRes.data.list : [];
    MOCK_CUSTOMERS = generateMockCustomers(hotels);
  }
  
  let list = [...MOCK_CUSTOMERS];
  
  // 按酒店筛选
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(c => 
      params.hotelIds?.includes(c.preferredHotelId || '') ||
      c.allVisitedHotels.some(h => params.hotelIds?.includes(h))
    );
  }
  
  // 按等级筛选
  if (params?.tier) {
    list = list.filter(c => c.tier === params.tier);
  }
  
  // 按状态筛选
  if (params?.status) {
    list = list.filter(c => c.status === params.status);
  }
  
  // 按关键词搜索
  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    list = list.filter(c => 
      c.name.toLowerCase().includes(keyword) ||
      c.phone.includes(keyword)
    );
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
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
 * 获取客户统计
 */
export async function getCustomerStats(): Promise<ApiResponse<{
  bCustomerTotal: number;
  bCustomerActive: number;
  cCustomerTotal: number;
  cCustomerActive: number;
  cCustomerVIP: number;
}>> {
  await delay();
  
  const bRes = await getHotelPartners();
  
  if (MOCK_CUSTOMERS.length === 0) {
    const hotelsRes = await getHotels({ page: 1, pageSize: 100 });
    const hotels = hotelsRes.success ? hotelsRes.data.list : [];
    MOCK_CUSTOMERS = generateMockCustomers(hotels);
  }
  
  return {
    success: true,
    data: {
      bCustomerTotal: bRes.success ? bRes.data.total : 0,
      bCustomerActive: bRes.success ? bRes.data.list.filter(p => p.status === 'active').length : 0,
      cCustomerTotal: MOCK_CUSTOMERS.length,
      cCustomerActive: MOCK_CUSTOMERS.filter(c => c.status === 'active').length,
      cCustomerVIP: MOCK_CUSTOMERS.filter(c => c.tier === 'vip').length,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新B端客户信息
 */
export async function updateHotelPartner(
  _partnerId: string,
  updates: Partial<HotelPartner>
): Promise<ApiResponse<HotelPartner>> {
  await delay(300);
  
  // 实际项目中这里会更新后端数据
  // 现在只是返回成功响应
  return {
    success: true,
    data: updates as HotelPartner,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新C端客户信息
 */
export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>
): Promise<ApiResponse<Customer>> {
  await delay(300);
  
  const index = MOCK_CUSTOMERS.findIndex(c => c.id === customerId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '客户不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_CUSTOMERS[index] = {
    ...MOCK_CUSTOMERS[index],
    ...updates,
  };
  
  return {
    success: true,
    data: MOCK_CUSTOMERS[index],
    timestamp: new Date().toISOString(),
  };
}
