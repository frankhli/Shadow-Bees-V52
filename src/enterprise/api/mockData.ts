/**
 * Mock数据层
 * 
 * 原则：所有mock数据集中在这里，API层调用这些数据
 * 未来替换时，只需修改API层，不需要改动这里的数据结构
 */

import type {
  Hotel,
  HotelMetrics,
  RoomType,
  Order,
  OrderStatus,
  Channel,
  ChannelPerformance,
  Account,
  ContentItem,
  AIInsight,
  ChatMessage,
  Ticket,
  DashboardTrend,
  PricingSuggestion,
  PricingStrategy,
  PlatformRule,
  LegalCompliance,
  RiskEvent,
  RiskPrediction,
  RiskKnowledge,
  SLAStats,
  AIEffectiveness,
  AgentPerformance,
  ChannelStats,
  TimeSeriesData,
  PrivateContent,
  OperationTask,
  FollowUpRecord,
  CompetitorIntel,
  NonStandardOrder,
  WechatGroup,
  VideoChannel,
} from './types';

// ==================== 竞品定价相关类型和函数（前置定义）====================
export type Tier = 'economy' | 'comfort' | 'premium';
export type RoomCategory = 'budget' | 'standard' | 'suite';

export interface CompetitorHotel {
  id: string;
  name: string;
  brand: string;
  tier: Tier;
  distance: number;
  prices: Record<RoomCategory, { price: number; change: number }>;
  occupancyRate: number;
  reviewScore: number;
  status: 'available' | 'normal' | 'tight';
}

// 生成同档次竞品数据
export function generateCompetitorsByTier(tier: Tier, city: string, seed: string = ''): CompetitorHotel[] {
  const brands: Record<Tier, string[]> = {
    economy: ['7天连锁', '如家酒店', '汉庭酒店', '锦江之星'],
    comfort: ['全季酒店', '桔子酒店', '亚朵轻居', '星程酒店'],
    premium: ['亚朵酒店', '美居酒店', '开元名庭', '美豪丽致'],
  };
  
  const basePrices: Record<Tier, number> = {
    economy: 150,
    comfort: 280,
    premium: 450,
  };
  
  const rand = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  return brands[tier].map((brand, idx) => {
    const basePrice = basePrices[tier] + ((rand + idx * 13) % 40 - 20);
    return {
      id: `comp-${tier}-${idx}-${seed}`,
      name: `${brand}·${city}店`,
      brand,
      tier,
      distance: 0.5 + ((rand + idx * 7) % 30) / 10,
      prices: {
        budget: { price: Math.round(basePrice * 0.75), change: ((rand + idx) % 20 - 10) },
        standard: { price: Math.round(basePrice), change: ((rand + idx * 2) % 20 - 10) },
        suite: { price: Math.round(basePrice * 1.4), change: ((rand + idx * 3) % 20 - 10) },
      },
      occupancyRate: 50 + ((rand + idx * 5) % 45),
      reviewScore: 3.5 + ((rand + idx * 2) % 15) / 10,
      status: ((rand + idx) % 10) > 7 ? 'tight' : ((rand + idx) % 10) > 4 ? 'normal' : 'available',
    };
  });
}

// 获取某酒店的同档次竞品价格区间
export function getCompetitorPriceRange(
  hotelId: string, 
  hotelTier: Tier, 
  city: string,
  roomCategory: RoomCategory
): { min: number; max: number; avg: number } {
  const competitors = generateCompetitorsByTier(hotelTier, city, hotelId);
  const prices = competitors.map(c => c.prices[roomCategory].price);
  
  if (prices.length === 0) {
    return { min: 0, max: 0, avg: 0 };
  }
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
  };
}

// ==================== 酒店数据 ====================
// 四川地区经济型酒店（华美会主要服务区域）

export const MOCK_HOTELS: Hotel[] = [
  {
    id: 'hotel-001',
    name: '如家酒店·成都春熙路店',
    brand: '如家',
    city: '成都',
    address: '成都市锦江区春熙路东段88号',
    starRating: 2,
    roomCount: 85,
    status: 'active',
    managerName: '张经理',
    managerPhone: '13800138001',
    pmsSystem: 'Opera',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-01-15T00:00:00Z',
    occupancyRate: 0.78,
  },
  {
    id: 'hotel-002',
    name: '汉庭酒店·成都火车北站店',
    brand: '汉庭',
    city: '成都',
    address: '成都市金牛区北站东二路15号',
    starRating: 2,
    roomCount: 92,
    status: 'active',
    managerName: '李经理',
    managerPhone: '13800138002',
    pmsSystem: 'PMS',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-02-20T00:00:00Z',
    occupancyRate: 0.82,
  },
  {
    id: 'hotel-003',
    name: '7天酒店·绵阳火车站店',
    brand: '7天',
    city: '绵阳',
    address: '绵阳市涪城区临园路东段68号',
    starRating: 2,
    roomCount: 76,
    status: 'active',
    managerName: '王经理',
    managerPhone: '13800138003',
    pmsSystem: 'Opera',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-03-10T00:00:00Z',
    occupancyRate: 0.72,
  },
  {
    id: 'hotel-004',
    name: '锦江之星·德阳文庙店',
    brand: '锦江之星',
    city: '德阳',
    address: '德阳市旌阳区长江东路108号',
    starRating: 2,
    roomCount: 68,
    status: 'active',
    managerName: '陈经理',
    managerPhone: '13800138004',
    pmsSystem: 'PMS',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-04-05T00:00:00Z',
    occupancyRate: 0.68,
  },
  {
    id: 'hotel-005',
    name: '速8酒店·南充火车站店',
    brand: '速8',
    city: '南充',
    address: '南充市顺庆区铁欣路25号',
    starRating: 2,
    roomCount: 58,
    status: 'active',
    managerName: '刘经理',
    managerPhone: '13800138005',
    pmsSystem: 'Opera',
    pmsConnected: false,
    createdAt: '2023-05-12T00:00:00Z',
    occupancyRate: 0.65,
  },
  {
    id: 'hotel-006',
    name: '格林豪泰·泸州江阳店',
    brand: '格林豪泰',
    city: '泸州',
    address: '泸州市江阳区江阳中路45号',
    starRating: 2,
    roomCount: 82,
    status: 'active',
    managerName: '赵经理',
    managerPhone: '13800138006',
    pmsSystem: 'PMS',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-06-18T00:00:00Z',
    occupancyRate: 0.70,
  },
  {
    id: 'hotel-007',
    name: '尚客优·宜宾翠屏店',
    brand: '尚客优',
    city: '宜宾',
    address: '宜宾市翠屏区人民路156号',
    starRating: 2,
    roomCount: 64,
    status: 'active',
    managerName: '孙经理',
    managerPhone: '13800138007',
    pmsSystem: 'Opera',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-07-22T00:00:00Z',
    occupancyRate: 0.75,
  },
  {
    id: 'hotel-008',
    name: '全季酒店·自贡汇东店',
    brand: '全季',
    city: '自贡',
    address: '自贡市自流井区丹桂大街88号',
    starRating: 3,
    roomCount: 95,
    status: 'active',
    managerName: '周经理',
    managerPhone: '13800138008',
    pmsSystem: 'PMS',
    pmsConnected: true,
    lastSyncAt: new Date().toISOString(),
    createdAt: '2023-08-30T00:00:00Z',
    occupancyRate: 0.73,
  },
];

// ==================== 酒店指标数据（带勾稽关系）====================
// 使用伪随机生成器，确保同一日期生成相同数据，保证数据一致性

// 基于字符串生成哈希值（用于伪随机）
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return Math.abs(hash);
}

// 基于哈希值生成0-1之间的伪随机数
function pseudoRandom(seed: string): number {
  const hash = hashString(seed);
  return (hash % 10000) / 10000;
}

// 基于基准值和波动范围生成指标
function generateMetric(baseValue: number, variance: number, seed: string): number {
  const random = pseudoRandom(seed);
  const fluctuation = (random - 0.5) * 2 * variance; // -variance 到 +variance
  return baseValue * (1 + fluctuation);
}

// 酒店基准数据（四川经济型酒店，ADR 120-250元）
const HOTEL_BASE_METRICS: Record<string, { baseOccupancy: number; baseADR: number; variance: number }> = {
  'hotel-001': { baseOccupancy: 0.78, baseADR: 168, variance: 0.12 }, // 如家成都春熙路
  'hotel-002': { baseOccupancy: 0.82, baseADR: 155, variance: 0.10 }, // 汉庭成都北站
  'hotel-003': { baseOccupancy: 0.72, baseADR: 138, variance: 0.15 }, // 7天绵阳
  'hotel-004': { baseOccupancy: 0.68, baseADR: 128, variance: 0.18 }, // 锦江之星德阳
  'hotel-005': { baseOccupancy: 0.65, baseADR: 118, variance: 0.20 }, // 速8南充
  'hotel-006': { baseOccupancy: 0.70, baseADR: 148, variance: 0.15 }, // 格林豪泰泸州
  'hotel-007': { baseOccupancy: 0.75, baseADR: 135, variance: 0.14 }, // 尚客优宜宾
  'hotel-008': { baseOccupancy: 0.73, baseADR: 198, variance: 0.12 }, // 全季自贡（中高端）
};

export function generateHotelMetrics(hotelId: string, date: string): HotelMetrics {
  const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
  const totalRooms = hotel?.roomCount || 100;
  
  // 获取酒店基准数据
  const baseMetrics = HOTEL_BASE_METRICS[hotelId] || { baseOccupancy: 0.65, baseADR: 500, variance: 0.2 };
  
  // 使用日期+酒店ID作为种子，确保同一天同一酒店生成相同数据
  const seed = `${hotelId}-${date}`;
  
  // 根据星期几调整入住率（周末较高）
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendBoost = isWeekend ? 0.1 : 0;
  
  // 生成入住率（基于基准值+波动+周末效应）
  const occupancyRate = Math.min(0.95, Math.max(0.3, 
    generateMetric(baseMetrics.baseOccupancy + weekendBoost, baseMetrics.variance, `${seed}-occ`)
  ));
  
  // 根据入住率计算已售房间数
  const soldRooms = Math.floor(totalRooms * occupancyRate);
  const availableRooms = totalRooms - soldRooms;
  
  // 生成ADR（平均房价），入住率高时ADR可能略高
  const demandFactor = 1 + (occupancyRate - 0.5) * 0.2; // 入住率高时房价略高
  const adr = Math.floor(generateMetric(baseMetrics.baseADR * demandFactor, 0.1, `${seed}-adr`));
  
  // 营收 = ADR × 已售房间数
  const revenue = adr * soldRooms;
  
  // RevPAR = ADR × 入住率
  const revpar = Math.round(adr * occupancyRate);
  
  // 订单数（每单平均1.3-1.7间房，周末订单数更多）
  const roomsPerOrder = isWeekend ? 1.3 : 1.6;
  const orders = Math.ceil(soldRooms / roomsPerOrder);
  
  return {
    hotelId,
    date,
    revenue,
    orders,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    adr,
    revpar,
    availableRooms,
    soldRooms,
  };
}

// ==================== AI效果指标数据 ====================
// 生成AI相关指标数据

export interface HotelAIMetrics {
  hotelId: string;
  date: string;
  // AI增收
  aiPricingLift: number;      // AI定价增收
  aiContentLift: number;      // AI内容增收
  aiServiceLift: number;      // AI客服增收
  // AI采纳
  aiAdoptionRate: number;     // AI采纳率(0-100)
  pricingAdoptionRate: number; // 定价采纳率
  contentAdoptionRate: number; // 内容采纳率
  serviceAdoptionRate: number; // 客服采纳率
  // 内容
  contentCount: number;       // AI生成内容数
  contentOrders: number;      // 内容带来订单数
  // 客服
  aiResolutionRate: number;   // AI解决率
  aiHandledTickets: number;   // AI处理工单数
  // 人效
  laborHoursSaved: number;    // 节省工时
}

export function generateHotelAIMetrics(hotelId: string, date: string): HotelAIMetrics {
  const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
  const baseMetrics = HOTEL_BASE_METRICS[hotelId] || { baseOccupancy: 0.65, baseADR: 500, variance: 0.2 };
  
  // 使用日期+酒店ID作为种子
  const seed = `${hotelId}-${date}`;
  
  // 基础营收（用于计算AI增收比例）
  const baseRevenue = (baseMetrics.baseADR * (hotel?.roomCount || 100)) * baseMetrics.baseOccupancy;
  
  // AI采纳率（40%-85%，不同酒店有差异）
  const aiAdoptionRate = Math.round(generateMetric(65, 0.25, `${seed}-adoption`));
  
  // 各模块采纳率（基于总采纳率分配）
  const pricingAdoptionRate = Math.round(Math.min(90, aiAdoptionRate * (0.8 + pseudoRandom(`${seed}-p`) * 0.4)));
  const contentAdoptionRate = Math.round(Math.min(90, aiAdoptionRate * (0.7 + pseudoRandom(`${seed}-c`) * 0.5)));
  const serviceAdoptionRate = Math.round(Math.min(90, aiAdoptionRate * (0.9 + pseudoRandom(`${seed}-s`) * 0.2)));
  
  // AI定价增收（营收的3%-8%）
  const pricingLiftRate = 0.03 + pseudoRandom(`${seed}-pl`) * 0.05;
  const aiPricingLift = Math.round(baseRevenue * pricingLiftRate);
  
  // AI内容增收（内容带来订单的GMV，营收的2%-5%）
  const contentLiftRate = 0.02 + pseudoRandom(`${seed}-cl`) * 0.03;
  const aiContentLift = Math.round(baseRevenue * contentLiftRate);
  
  // AI客服增收（节省的人力成本）
  const aiHandledTickets = Math.round(generateMetric(25, 0.3, `${seed}-tickets`));
  const aiServiceLift = aiHandledTickets * 15; // 每单节省15元人工成本
  
  // AI生成内容数
  const contentCount = Math.round(generateMetric(8, 0.4, `${seed}-content`));
  const contentOrders = Math.round(contentCount * (2 + pseudoRandom(`${seed}-co`) * 3)); // 每篇内容带来2-5单
  
  // AI解决率（60%-92%）
  const aiResolutionRate = Math.round(generateMetric(78, 0.18, `${seed}-resolution`));
  
  // 节省工时（基于内容数和工单数计算）
  const contentHours = contentCount * 0.5; // 每篇内容节省0.5小时
  const ticketHours = aiHandledTickets * 0.3; // 每单工单节省0.3小时
  const laborHoursSaved = Math.round((contentHours + ticketHours) * 10) / 10;
  
  return {
    hotelId,
    date,
    aiPricingLift,
    aiContentLift,
    aiServiceLift,
    aiAdoptionRate: Math.min(100, Math.max(0, aiAdoptionRate)),
    pricingAdoptionRate: Math.min(100, Math.max(0, pricingAdoptionRate)),
    contentAdoptionRate: Math.min(100, Math.max(0, contentAdoptionRate)),
    serviceAdoptionRate: Math.min(100, Math.max(0, serviceAdoptionRate)),
    contentCount,
    contentOrders,
    aiResolutionRate: Math.min(100, Math.max(0, aiResolutionRate)),
    aiHandledTickets,
    laborHoursSaved,
  };
}

// ==================== 房型数据 ====================

export const MOCK_ROOM_TYPES: Record<string, RoomType[]> = {
  'hotel-001': [
    {
      id: 'rt-001-1',
      hotelId: 'hotel-001',
      name: '豪华大床房',
      code: 'DLK',
      basePrice: 888,
      floorPrice: 688,
      ceilingPrice: 1288,
      roomCount: 150,
      area: 35,
      bedType: '1张特大床',
      maxGuests: 2,
      amenities: ['wifi', 'breakfast', 'gym', 'pool'],
      images: [],
      status: 'active',
    },
    {
      id: 'rt-001-2',
      hotelId: 'hotel-001',
      name: '行政套房',
      code: 'ES',
      basePrice: 1588,
      floorPrice: 1288,
      ceilingPrice: 2288,
      roomCount: 50,
      area: 55,
      bedType: '1张特大床',
      maxGuests: 2,
      amenities: ['wifi', 'breakfast', 'lounge', 'gym', 'pool'],
      images: [],
      status: 'active',
    },
    {
      id: 'rt-001-3',
      hotelId: 'hotel-001',
      name: '标准双床房',
      code: 'ST',
      basePrice: 688,
      floorPrice: 588,
      ceilingPrice: 988,
      roomCount: 200,
      area: 30,
      bedType: '2张单人床',
      maxGuests: 2,
      amenities: ['wifi', 'breakfast'],
      images: [],
      status: 'active',
    },
  ],
  'hotel-002': [
    {
      id: 'rt-002-1',
      hotelId: 'hotel-002',
      name: '外滩景观房',
      code: 'BV',
      basePrice: 1888,
      floorPrice: 1588,
      ceilingPrice: 2888,
      roomCount: 100,
      area: 45,
      bedType: '1张特大床',
      maxGuests: 2,
      amenities: ['wifi', 'breakfast', 'lounge', 'spa'],
      images: [],
      status: 'active',
    },
    {
      id: 'rt-002-2',
      hotelId: 'hotel-002',
      name: '豪华客房',
      code: 'DLX',
      basePrice: 1288,
      floorPrice: 988,
      ceilingPrice: 1888,
      roomCount: 300,
      area: 38,
      bedType: '1张大床或2张单人床',
      maxGuests: 2,
      amenities: ['wifi', 'breakfast', 'gym'],
      images: [],
      status: 'active',
    },
  ],
};

// 默认房型（用于没有定义的酒店）
export const DEFAULT_ROOM_TYPES: RoomType[] = [
  {
    id: 'rt-default-1',
    hotelId: '',
    name: '标准大床房',
    code: 'STK',
    basePrice: 588,
    floorPrice: 488,
    ceilingPrice: 888,
    roomCount: 100,
    area: 28,
    bedType: '1张大床',
    maxGuests: 2,
    amenities: ['wifi', 'breakfast'],
    images: [],
    status: 'active',
  },
  {
    id: 'rt-default-2',
    hotelId: '',
    name: '标准双床房',
    code: 'STT',
    basePrice: 588,
    floorPrice: 488,
    ceilingPrice: 888,
    roomCount: 80,
    area: 28,
    bedType: '2张单人床',
    maxGuests: 2,
    amenities: ['wifi', 'breakfast'],
    images: [],
    status: 'active',
  },
  {
    id: 'rt-default-3',
    hotelId: '',
    name: '豪华套房',
    code: 'JS',
    basePrice: 1288,
    floorPrice: 988,
    ceilingPrice: 1888,
    roomCount: 20,
    area: 60,
    bedType: '1张特大床',
    maxGuests: 2,
    amenities: ['wifi', 'breakfast', 'lounge'],
    images: [],
    status: 'active',
  },
];

export function getRoomTypesForHotel(hotelId: string): RoomType[] {
  const specificTypes = MOCK_ROOM_TYPES[hotelId];
  if (specificTypes) {
    return specificTypes;
  }
  // 返回默认房型，并设置hotelId
  return DEFAULT_ROOM_TYPES.map(rt => ({ ...rt, hotelId, id: `${rt.id}-${hotelId}` }));
}

// ==================== 订单数据 ====================

const ORDER_STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled'] as const;
const ORDER_SOURCES = ['ota', 'direct', 'wechat', 'phone'] as const;

export function generateMockOrders(hotelId: string, count: number = 20): Order[] {
  const roomTypes = getRoomTypesForHotel(hotelId);
  const orders: Order[] = [];
  
  for (let i = 0; i < count; i++) {
    const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
    const nights = Math.floor(Math.random() * 5) + 1;
    const roomCount = Math.random() > 0.7 ? 2 : 1;
    const pricePerNight = roomType.basePrice + Math.floor(Math.random() * 200 - 100);
    const totalAmount = pricePerNight * nights * roomCount;
    
    // 随机日期（未来30天内）
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * 30));
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + nights);
    
    orders.push({
      id: `order-${hotelId}-${i}`,
      hotelId,
      orderNo: `BK${Date.now()}${i}`,
      source: ORDER_SOURCES[Math.floor(Math.random() * ORDER_SOURCES.length)],
      status: ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)] as any,
      paymentStatus: Math.random() > 0.2 ? 'paid' : 'unpaid',
      guestName: ['张', '李', '王', '刘', '陈'][Math.floor(Math.random() * 5)] + '先生/女士',
      guestPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      roomNumber: Math.random() > 0.5 ? `${Math.floor(Math.random() * 20 + 1)}${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}` : undefined,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      nights,
      roomCount,
      guestCount: roomCount * 2,
      totalAmount,
      paidAmount: totalAmount,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      remarks: Math.random() > 0.8 ? '需要提前入住' : undefined,
      channelName: ['携程', '美团', '飞猪', '直客'][Math.floor(Math.random() * 4)],
    });
  }
  
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==================== 渠道数据 ====================

export const MOCK_CHANNELS: Channel[] = [
  { id: 'ch-001', name: '携程', code: 'ctrip', type: 'ota', status: 'active', commissionRate: 0.15, settlementCycle: '月结', connected: true },
  { id: 'ch-002', name: '美团', code: 'meituan', type: 'ota', status: 'active', commissionRate: 0.12, settlementCycle: '周结', connected: true },
  { id: 'ch-003', name: '飞猪', code: 'fliggy', type: 'ota', status: 'active', commissionRate: 0.10, settlementCycle: '月结', connected: true },
  { id: 'ch-004', name: 'Booking.com', code: 'booking', type: 'ota', status: 'active', commissionRate: 0.15, settlementCycle: '月结', connected: true },
  { id: 'ch-005', name: 'Expedia', code: 'expedia', type: 'ota', status: 'active', commissionRate: 0.18, settlementCycle: '月结', connected: false },
  { id: 'ch-006', name: '官方微信', code: 'wechat', type: 'direct', status: 'active', commissionRate: 0, settlementCycle: '实时', connected: true },
  { id: 'ch-007', name: '官方APP', code: 'app', type: 'direct', status: 'active', commissionRate: 0, settlementCycle: '实时', connected: true },
  { id: 'ch-008', name: '企业协议', code: 'corporate', type: 'corporate', status: 'active', commissionRate: 0.05, settlementCycle: '月结', connected: true },
];

export function generateChannelPerformance(channelId: string, days: number = 30): ChannelPerformance[] {
  const channel = MOCK_CHANNELS.find(c => c.id === channelId);
  const performances: ChannelPerformance[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const orders = Math.floor(Math.random() * 50 + 10);
    const avgOrderValue = Math.floor(Math.random() * 500 + 500);
    const revenue = orders * avgOrderValue;
    const roomNights = Math.floor(orders * 1.5);
    const commission = revenue * (channel?.commissionRate || 0.1);
    
    performances.push({
      channelId,
      channelName: channel?.name || '未知渠道',
      date: date.toISOString().split('T')[0],
      revenue,
      orders,
      roomNights,
      commission,
      conversionRate: Math.round((Math.random() * 0.05 + 0.02) * 100) / 100,
      avgOrderValue,
    });
  }
  
  return performances.reverse();
}

// ==================== 账号数据 ====================

export const MOCK_ACCOUNTS: Account[] = [
  // 闲鱼账号
  { id: 'acc-001', hotelId: 'hotel-001', platform: '闲鱼', username: '北京酒店代订小王', status: 'active', loginMethod: 'qr', lastLoginAt: new Date().toISOString(), assignedTo: '运营专员A', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'acc-002', hotelId: 'hotel-001', platform: '闲鱼', username: '成都春熙路酒店特惠', status: 'active', loginMethod: 'qr', lastLoginAt: new Date(Date.now() - 86400000).toISOString(), assignedTo: '运营专员A', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'acc-003', hotelId: 'hotel-002', platform: '闲鱼', username: '上海外滩酒店代订', status: 'active', loginMethod: 'qr', lastLoginAt: new Date().toISOString(), assignedTo: '运营专员B', createdAt: '2023-01-01T00:00:00Z' },
  // 小红书账号
  { id: 'acc-004', hotelId: 'hotel-001', platform: '小红书', username: '北京酒店探店达人', status: 'active', loginMethod: 'password', lastLoginAt: new Date().toISOString(), assignedTo: '运营专员A', createdAt: '2023-02-15T00:00:00Z' },
  { id: 'acc-005', hotelId: 'hotel-002', platform: '小红书', username: '上海外滩住宿推荐', status: 'inactive', loginMethod: 'password', lastLoginAt: new Date(Date.now() - 7 * 86400000).toISOString(), assignedTo: '运营专员B', createdAt: '2023-02-15T00:00:00Z' },
  // 微信账号
  { id: 'acc-006', hotelId: 'hotel-001', platform: '微信', username: 'bjhotel-001', status: 'active', loginMethod: 'qr', lastLoginAt: new Date().toISOString(), assignedTo: '运营专员A', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'acc-007', hotelId: 'hotel-002', platform: '微信', username: 'sh_waitan_hotel', status: 'active', loginMethod: 'qr', lastLoginAt: new Date().toISOString(), assignedTo: '运营专员B', createdAt: '2023-03-01T00:00:00Z' },
  // 抖音账号
  { id: 'acc-008', hotelId: 'hotel-001', platform: '抖音', username: '北京酒店短视频', status: 'active', loginMethod: 'password', lastLoginAt: new Date(Date.now() - 2 * 86400000).toISOString(), assignedTo: '运营专员A', createdAt: '2023-04-01T00:00:00Z' },
  // 未分配账号
  { id: 'acc-009', hotelId: 'unassigned', platform: '闲鱼', username: '备用账号_01', status: 'inactive', loginMethod: 'qr', lastLoginAt: new Date().toISOString(), createdAt: '2023-05-01T00:00:00Z' },
  { id: 'acc-010', hotelId: 'unassigned', platform: '小红书', username: '备用账号_02', status: 'inactive', loginMethod: 'password', lastLoginAt: new Date().toISOString(), createdAt: '2023-05-01T00:00:00Z' },
];

// ==================== 内容数据 ====================

// 共享的酒店列表
const MOCK_HOTEL_LIST = [
  { id: 'hotel-001', name: '成都春熙路亚朵' },
  { id: 'hotel-002', name: '成都北站亚朵' },
  { id: 'hotel-003', name: '绵阳亚朵' },
  { id: 'hotel-004', name: '德阳亚朵' },
  { id: 'hotel-005', name: '南充亚朵' },
  { id: 'hotel-006', name: '泸州亚朵' },
  { id: 'hotel-007', name: '宜宾亚朵' },
  { id: 'hotel-008', name: '自贡亚朵' },
];

// 全局内容ID计数器（确保内容和交易使用相同的ID序列）
let globalContentIdCounter = 1;

// 获取下一个内容ID
export function getNextContentId(): string {
  return `content-${String(globalContentIdCounter++).padStart(3, '0')}`;
}

// 重置计数器（用于重新生成数据）
export function resetContentIdCounter(): void {
  globalContentIdCounter = 1;
}

// 生成更多样化的内容数据
function generateMockContents(): ContentItem[] {
  const contents: ContentItem[] = [];
  const hotels = MOCK_HOTEL_LIST;
  
  const platformList = [
    { platform: 'xianyu', platformName: '闲鱼' },
    { platform: 'xiaohongshu', platformName: '小红书' },
    { platform: 'wechat', platformName: '微信' },
    { platform: 'douyin', platformName: '抖音' },
  ];
  
  const templates = [
    { title: '春季特惠 - 豪华房8折起', content: '即日起至4月底，预订豪华房享8折优惠，含双早' },
    { title: '周末家庭套餐', content: '两大一小家庭套餐，含住宿+早餐+儿童乐园' },
    { title: '商务出行首选', content: '交通便利，紧邻地铁站，商务出行最佳选择' },
    { title: '城市夜景实拍', content: '从酒店客房俯瞰城市夜景，璀璨灯火尽收眼底' },
    { title: '美食之旅', content: '周边美食推荐，本地特色餐厅一网打尽' },
    { title: '演唱会住宿推荐', content: '距离演唱会场馆仅5分钟车程，预订从速' },
    { title: '亲子游必住', content: '儿童设施齐全，亲子房温馨舒适' },
    { title: '情侣约会圣地', content: '浪漫氛围，精致客房，约会首选' },
  ];
  
  // 重置计数器确保ID从1开始
  resetContentIdCounter();
  
  // 为每个酒店生成内容
  hotels.forEach(hotel => {
    // 每个酒店生成3-5条内容
    const count = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const platformInfo = platformList[Math.floor(Math.random() * platformList.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const isPublished = Math.random() > 0.3; // 70%已发布
      
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      const publishedAt = isPublished 
        ? new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      
      const views = Math.floor(Math.random() * 50000) + 5000;
      const likes = Math.floor(views * (0.02 + Math.random() * 0.03));
      const comments = Math.floor(likes * (0.1 + Math.random() * 0.2));
      const conversions = Math.floor(views * (0.001 + Math.random() * 0.002));
      
      contents.push({
        id: getNextContentId(),
        hotelId: hotel.id,
        type: Math.random() > 0.5 ? 'image' : 'text',
        title: `${hotel.name} - ${template.title}`,
        content: template.content,
        images: [],
        status: isPublished ? 'published' : 'draft',
        platforms: [platformInfo.platform],
        publishedAt,
        createdAt,
        updatedAt: createdAt,
        metrics: isPublished ? {
          views,
          likes,
          shares: Math.floor(likes * 0.3),
          comments,
          conversions,
        } : undefined,
      });
    }
  });
  
  return contents;
}

// 生成内容数据
export const MOCK_CONTENTS: ContentItem[] = generateMockContents();

// 基于实际内容生成交易数据（确保sourceContentId匹配）
export function generateTransactionsFromContents(
  contents: ContentItem[], 
  hotelIds: string[]
): ContentTransaction[] {
  const transactions: ContentTransaction[] = [];
  const roomTypes = ['标准大床房', '豪华双床房', '行政套房', '家庭房'];
  const guestNames = ['张先生', '李女士', '王小姐', '刘先生', '陈女士', '赵先生'];
  
  // 按酒店分组内容
  const hotelContents: Record<string, ContentItem[]> = {};
  hotelIds.forEach(hid => hotelContents[hid] = []);
  contents.forEach(c => {
    if (c.hotelId && hotelContents[c.hotelId]) {
      hotelContents[c.hotelId].push(c);
    }
  });
  
  // 为每个酒店生成交易
  hotelIds.forEach(hotelId => {
    const contentList = hotelContents[hotelId];
    if (contentList.length === 0) return;
    
    // 随机生成5-15条交易
    const count = Math.floor(Math.random() * 11) + 5;
    
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 30); // 最近30天内
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
      
      const price = Math.floor(Math.random() * 400) + 300; // 300-700元
      // 随机选择一个该酒店的内容
      const sourceContent = contentList[Math.floor(Math.random() * contentList.length)];
      
      transactions.push({
        id: `txn-${hotelId}-${i}-${Date.now()}`,
        contentId: sourceContent.id,
        platform: sourceContent.platforms?.[0] as any,
        price,
        timestamp: date.toISOString(),
        sourceContentId: sourceContent.id,
        hotelId,
        guestName: guestNames[Math.floor(Math.random() * guestNames.length)],
        roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)],
      });
    }
  });
  
  // 按时间倒序
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// 导出基于实际内容生成的交易数据
export const MOCK_CONTENT_TRANSACTIONS: ContentTransaction[] = generateTransactionsFromContents(
  MOCK_CONTENTS,
  ['hotel-001', 'hotel-002', 'hotel-003', 'hotel-004', 'hotel-005', 'hotel-006', 'hotel-007', 'hotel-008']
);

// ==================== AI洞察数据（基于竞品分析的定价建议）====================

// 基于竞品数据生成AI洞察
function generateAIInsightWithCompetitor(hotelId: string, _hotelName: string, baseADR: number, city: string): AIInsight {
  const compRange = getCompetitorPriceRange(hotelId, 'economy', city, 'standard');
  const competitorAvg = compRange.avg || baseADR * 0.95;
  const priceDiff = baseADR - competitorAvg;
  const priceDiffPercent = ((priceDiff / competitorAvg) * 100).toFixed(1);
  
  // 根据与竞品的价差决定洞察类型
  let type: 'pricing' | 'competitor' | 'demand' = 'pricing';
  let title = '';
  let description = '';
  let recommendation = '';
  let impact: 'high' | 'medium' | 'low' = 'medium';
  
  if (Math.abs(priceDiff) > 30) {
    type = 'competitor';
    impact = 'high';
    if (priceDiff > 0) {
      title = '定价高于竞品，建议关注转化率';
      description = `我们当前ADR ¥${baseADR}，高于竞品均价¥${competitorAvg}约${priceDiffPercent}%，可能影响订单转化`;
      recommendation = `建议监控转化率，如订单量下降可考虑降价至¥${Math.round(competitorAvg * 1.05)}与竞品保持同步`;
    } else {
      title = '定价低于竞品，存在提价空间';
      description = `我们当前ADR ¥${baseADR}，低于竞品均价¥${competitorAvg}约${Math.abs(Number(priceDiffPercent))}%，可能损失收益`;
      recommendation = `建议适度提价至¥${Math.round(competitorAvg * 0.95)}，与竞品对齐同时提升收益`;
    }
  } else {
    type = 'pricing';
    impact = 'medium';
    title = '与竞品价格持平，建议差异化营销';
    description = `我们当前ADR ¥${baseADR}与竞品均价¥${competitorAvg}基本持平，价格竞争力稳定`;
    recommendation = '建议通过服务升级、会员权益等非价格因素提升竞争力';
  }
  
  return {
    id: `ai-${hotelId}`,
    hotelId,
    type,
    title,
    description,
    recommendation,
    confidence: 0.75 + Math.random() * 0.15,
    impact,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// 四川8家酒店的AI洞察（基于竞品价格分析）
export const MOCK_AI_INSIGHTS: AIInsight[] = [
  // 成都春熙路如家 - 竞品分析
  generateAIInsightWithCompetitor('hotel-001', '如家酒店·成都春熙路店', 168, '成都'),
  // 成都北站汉庭
  generateAIInsightWithCompetitor('hotel-002', '汉庭酒店·成都火车北站店', 155, '成都'),
  // 绵阳7天
  generateAIInsightWithCompetitor('hotel-003', '7天酒店·绵阳火车站店', 138, '绵阳'),
  // 德阳锦江之星
  generateAIInsightWithCompetitor('hotel-004', '锦江之星·德阳文庙店', 128, '德阳'),
  // 南充速8
  generateAIInsightWithCompetitor('hotel-005', '速8酒店·南充火车站店', 118, '南充'),
  // 泸州格林豪泰
  generateAIInsightWithCompetitor('hotel-006', '格林豪泰·泸州龙马潭店', 148, '泸州'),
  // 宜宾尚客优
  generateAIInsightWithCompetitor('hotel-007', '尚客优酒店·宜宾翠屏山店', 135, '宜宾'),
  // 自贡全季（中高端）
  generateAIInsightWithCompetitor('hotel-008', '全季酒店·自贡华商店', 198, '自贡'),
];

// ==================== 工单数据 ====================

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'ticket-001',
    hotelId: 'hotel-001',
    type: 'ota_issue',
    title: '携程房价同步失败',
    description: '今日修改的价格在携程端未显示，已尝试重新同步',
    status: 'in_progress',
    priority: 'high',
    createdBy: '运营专员A',
    assignedTo: '技术支持',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [
      {
        id: 'cmt-001',
        ticketId: 'ticket-001',
        content: '已联系携程技术支持，正在排查',
        authorId: 'tech-001',
        authorName: '技术支持',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      },
    ],
  },
  {
    id: 'ticket-002',
    hotelId: 'hotel-002',
    orderId: 'order-hotel-002-5',
    type: 'guest_complaint',
    title: '客人投诉房间清洁问题',
    description: '客人反馈房间卫生间有异味，要求换房',
    status: 'open',
    priority: 'urgent',
    createdBy: '前台',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    comments: [],
  },
  {
    id: 'ticket-003',
    hotelId: 'hotel-003',
    type: 'system_bug',
    title: 'PMS系统无法登录',
    description: '前台反馈Opera系统提示账号过期',
    status: 'resolved',
    priority: 'high',
    createdBy: '酒店经理',
    assignedTo: '系统管理员',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000).toISOString(),
    comments: [
      {
        id: 'cmt-002',
        ticketId: 'ticket-003',
        content: '已为酒店重置账号密码',
        authorId: 'admin-001',
        authorName: '系统管理员',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  },
];

// ==================== 仪表盘趋势数据（带勾稽关系）====================

export function generateDashboardTrends(days: number = 30): DashboardTrend[] {
  const trends: DashboardTrend[] = [];
  let baseRevenue = 500000;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // 模拟营收波动（-10%到+10%）
    const revenueChange = (Math.random() - 0.5) * 0.2;
    baseRevenue = Math.round(baseRevenue * (1 + revenueChange));
    
    // 入住率（30%-95%）
    const occupancyRate = Math.round((Math.random() * 0.65 + 0.3) * 100) / 100;
    
    // ADR基于营收和入住率推算（假设1000间房）
    const adr = Math.round(baseRevenue / (1000 * occupancyRate));
    
    // RevPAR = ADR × 入住率
    const revpar = Math.round(adr * occupancyRate);
    
    // 订单数（基于营收和ADR）
    const orders = Math.round(baseRevenue / (adr * 1.5));
    
    trends.push({
      date: date.toISOString().split('T')[0],
      revenue: baseRevenue,
      orders,
      occupancyRate,
      adr,
      revpar,
    });
  }
  
  return trends;
}

// ==================== 库存数据生成器 ====================

export interface InventoryData {
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  total: number;
  available: number;
  sold: number;
  blocked: number;
  price: number;
  status: 'open' | 'close' | 'limit';
}

export function generateInventoryData(
  hotelId: string,
  startDate: string,
  days: number = 30
): InventoryData[] {
  const roomTypes = getRoomTypesForHotel(hotelId);
  const inventory: InventoryData[] = [];
  
  const start = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 周末价格上浮
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const weekendMultiplier = isWeekend ? 1.2 : 1;
    
    roomTypes.forEach(rt => {
      // 随机销售情况
      const soldRatio = Math.random();
      const sold = Math.floor(rt.roomCount * soldRatio * 0.8);
      const blocked = Math.random() > 0.9 ? Math.floor(rt.roomCount * 0.1) : 0;
      const available = rt.roomCount - sold - blocked;
      
      inventory.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        date: dateStr,
        total: rt.roomCount,
        available: Math.max(0, available),
        sold,
        blocked,
        price: Math.round(rt.basePrice * weekendMultiplier),
        status: available <= 5 ? 'limit' : available === 0 ? 'close' : 'open',
      });
    });
  }
  
  return inventory;
}


// ==================== 市场情报共享数据 ====================
// 用于 CompetitorIntel, EventsIntel, UniversalPricing 数据联动

export interface MarketEvent {
  id: string;
  name: string;
  title?: string; // 兼容eventsApi
  type: 'concert' | 'sports' | 'exhibition' | 'festival' | 'business' | 'transport' | 'social';
  date: string;
  startDate?: string; // 兼容eventsApi
  endDate?: string;
  location: string;
  city: string;
  distance: number; // 米
  intensity: 'high' | 'medium' | 'low';
  expectedAttendance: number;
  description: string;
  impact: string;
  priceMultiplier: number;
  status?: 'upcoming' | 'ongoing' | 'ended'; // 兼容eventsApi
  affectedHotels?: string[];
  affectedRegion?: string; // 兼容eventsApi
}

// 共享事件数据（与市场情报一致）
export const MOCK_EVENTS: MarketEvent[] = [
  {
    id: 'evt-001', name: '周杰伦演唱会', title: '周杰伦演唱会', type: 'concert', date: '2025-04-15', startDate: '2025-04-15', location: '工人体育场', city: '北京',
    distance: 1500, intensity: 'high', expectedAttendance: 50000,
    description: '周杰伦嘉年华世界巡回演唱会，预计带来大量客流', impact: '+30%需求激增', priceMultiplier: 2.5,
    status: 'upcoming', affectedRegion: '北京',
    affectedHotels: ['hotel-001', 'hotel-002'],
  },
  {
    id: 'evt-002', name: '地铁站施工', title: '地铁站施工', type: 'transport', date: '2025-04-10', startDate: '2025-04-10', location: '成都春熙路站', city: '北京',
    distance: 800, intensity: 'medium', expectedAttendance: 0,
    description: '周边交通受影响，可能影响入住体验', impact: '-5%预期入住', priceMultiplier: 0.95,
    status: 'ongoing', affectedRegion: '北京',
    affectedHotels: ['hotel-001'],
  },
  {
    id: 'evt-003', name: '五一黄金周', title: '五一黄金周', type: 'festival', date: '2025-05-01', startDate: '2025-05-01', endDate: '2025-05-05', location: '全国', city: '全国',
    distance: 0, intensity: 'high', expectedAttendance: 300000000,
    description: '劳动节假期，全国旅游需求激增', impact: '+20%旅游需求', priceMultiplier: 1.8,
    status: 'upcoming', affectedRegion: '全国',
    affectedHotels: ['hotel-001', 'hotel-002', 'hotel-003', 'hotel-004', 'hotel-005', 'hotel-006'],
  },
  {
    id: 'evt-004', name: '商场开业', title: '商场开业', type: 'social', date: '2025-04-20', startDate: '2025-04-20', location: '万达广场', city: '北京',
    distance: 2500, intensity: 'medium', expectedAttendance: 50000,
    description: '大型商场开业，周边人流增加', impact: '+10%潜在客源', priceMultiplier: 1.2,
    status: 'upcoming', affectedRegion: '北京',
    affectedHotels: ['hotel-001', 'hotel-002'],
  },
  {
    id: 'evt-005', name: '马拉松比赛', title: '马拉松比赛', type: 'sports', date: '2025-04-25', startDate: '2025-04-25', location: '天安门广场', city: '北京',
    distance: 3000, intensity: 'medium', expectedAttendance: 30000,
    description: '北京国际马拉松，周边道路封闭', impact: '+15%住宿需求', priceMultiplier: 1.4,
    status: 'upcoming', affectedRegion: '北京',
    affectedHotels: ['hotel-001', 'hotel-002'],
  },
  {
    id: 'evt-006', name: '广交会', title: '广交会', type: 'exhibition', date: '2025-04-15', startDate: '2025-04-15', endDate: '2025-04-19', location: '琶洲会展中心', city: '广州',
    distance: 5000, intensity: 'high', expectedAttendance: 200000,
    description: '中国进出口商品交易会，商务客流激增', impact: '+40%商务需求', priceMultiplier: 2.0,
    status: 'upcoming', affectedRegion: '广州',
    affectedHotels: ['hotel-004', 'hotel-005'],
  },
  {
    id: 'evt-007', name: '端午假期', title: '端午假期', type: 'festival', date: '2025-05-31', startDate: '2025-05-31', endDate: '2025-06-02', location: '全国', city: '全国',
    distance: 0, intensity: 'medium', expectedAttendance: 100000000,
    description: '传统节日，短途旅游需求增加', impact: '+15%旅游需求', priceMultiplier: 1.4,
    status: 'upcoming', affectedRegion: '全国',
    affectedHotels: ['hotel-001', 'hotel-002', 'hotel-003', 'hotel-004', 'hotel-005', 'hotel-006'],
  },
];

// 根据酒店获取相关事件
export function getEventsForHotel(hotelId: string, city: string): MarketEvent[] {
  return MOCK_EVENTS.filter(e => e.city === '全国' || e.city === city).map(e => ({
    ...e,
    // 添加一些随机性使不同酒店看到的事件距离不同
    distance: e.city === '全国' ? 0 : e.distance + (hotelId.charCodeAt(hotelId.length - 1) % 1000),
  }));
}

// 生成完整的Mock订单数据（包含各种状态，支持今日实况测试）
function generateTodayOrders(): Order[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  
  const orders: Order[] = [];
  // 酒店ID列表用于生成订单
  const roomTypes = ['标准大床房', '豪华双床房', '行政套房', '家庭房'];
  const sources: Order['source'][] = ['ota', 'wechat', 'direct', 'phone'];
  
  // ========== 1. 今日新单（今日0点至今创建）==========
  
  // 1.1 今日待确认订单（新创建的待处理订单）
  const todayPendingConfigs = [
    { hotelId: 'hotel-001', hour: Math.max(0, currentHour - 2), amount: 899 },
    { hotelId: 'hotel-002', hour: Math.max(0, currentHour - 4), amount: 1299 },
  ];
  
  todayPendingConfigs.forEach((config, idx) => {
    if (config.hour < currentHour || (config.hour === currentHour && idx < 2)) {
      const createdAt = `${today}T${String(config.hour).padStart(2, '0')}:${String(10 + idx * 15).padStart(2, '0')}:00Z`;
      orders.push({
        id: `today-pending-${idx}`,
        hotelId: config.hotelId,
        orderNo: `BK${Date.now()}${idx}`,
        source: sources[idx % sources.length],
        status: 'pending' as OrderStatus,
        paymentStatus: 'unpaid',
        guestName: ['张', '李', '王', '刘'][idx] + '先生',
        guestPhone: `138${String(10000000 + idx * 11111111).padStart(8, '0')}`,
        roomTypeId: 'rt-001',
        roomTypeName: roomTypes[idx % roomTypes.length],
        checkInDate: today,
        checkOutDate: today,
        nights: 1,
        roomCount: 1,
        guestCount: 2,
        totalAmount: config.amount,
        paidAmount: 0,
        discountAmount: 0,
        currency: 'CNY',
        createdAt,
        updatedAt: createdAt,
        channelName: ['携程', '美团', '直客'][idx % 3],
      } as Order);
    }
  });
  
  // 1.2 今日已确认订单（今日创建且已确认）
  const todayConfirmedConfigs = [
    { id: 'today-001', hotelId: 'hotel-001', hour: Math.max(0, currentHour - 6), amount: 1040 },
    { id: 'today-002', hotelId: 'hotel-002', hour: Math.max(0, currentHour - 3), amount: 1580 },
    { id: 'today-003', hotelId: 'hotel-001', hour: Math.max(0, currentHour - 1), amount: 899 },
  ];
  
  todayConfirmedConfigs.forEach((config, idx) => {
    if (config.hour < currentHour) {
      const createdAt = `${today}T${String(config.hour).padStart(2, '0')}:${String(20 + idx * 10).padStart(2, '0')}:00Z`;
      orders.push({
        id: config.id,
        hotelId: config.hotelId,
        orderNo: `ORD${config.id.slice(-6)}`,
        source: sources[idx % sources.length],
        status: 'confirmed' as OrderStatus,
        paymentStatus: 'paid',
        guestName: ['赵', '钱', '孙'][idx] + '女士',
        guestPhone: `139${String(20000000 + idx * 11111111).padStart(8, '0')}`,
        roomTypeId: 'rt-001',
        roomTypeName: roomTypes[idx % roomTypes.length],
        roomNumber: `${Math.floor(Math.random() * 20 + 1)}${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}`,
        checkInDate: today,
        checkOutDate: today,
        nights: 1,
        roomCount: 1,
        guestCount: 2,
        totalAmount: config.amount,
        paidAmount: config.amount,
        discountAmount: 0,
        currency: 'CNY',
        createdAt,
        updatedAt: createdAt,
        channelName: ['携程', '美团', '飞猪'][idx % 3],
      } as Order);
    }
  });
  
  // 1.3 今日退款订单（今日创建且已退款）
  orders.push({
    id: 'today-refund-001',
    hotelId: 'hotel-003',
    orderNo: `RF${Date.now()}`,
    source: 'ota',
    status: 'refunded' as OrderStatus,
    paymentStatus: 'refunded',
    guestName: '周先生',
    guestPhone: '13800138099',
    roomTypeId: 'rt-001',
    roomTypeName: '标准大床房',
    checkInDate: today,
    checkOutDate: today,
    nights: 1,
    roomCount: 1,
    guestCount: 2,
    totalAmount: 699,
    paidAmount: 0,
    discountAmount: 0,
    currency: 'CNY',
    createdAt: `${today}T09:30:00Z`,
    updatedAt: `${today}T10:15:00Z`,
    cancelReason: '客人行程变更',
    channelName: '携程',
  } as Order);
  
  // 添加更多今日退款订单（不同酒店，确保选中任意酒店都能看到）
  const refundConfigs = [
    { id: 'today-refund-002', hotelId: 'hotel-001', time: '11:20', amount: 899 },
    { id: 'today-refund-003', hotelId: 'hotel-002', time: '14:45', amount: 1299 },
  ];
  
  refundConfigs.forEach((config, idx) => {
    orders.push({
      id: config.id,
      hotelId: config.hotelId,
      orderNo: `RF${Date.now()}${idx}`,
      source: 'ota',
      status: 'refunded' as OrderStatus,
      paymentStatus: 'refunded',
      guestName: ['钱', '孙'][idx] + '女士',
      guestPhone: `138${String(99000000 + idx * 111111).padStart(8, '0')}`,
      roomTypeId: 'rt-001',
      roomTypeName: '标准大床房',
      checkInDate: today,
      checkOutDate: today,
      nights: 1,
      roomCount: 1,
      guestCount: 2,
      totalAmount: config.amount,
      paidAmount: 0,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: `${today}T${config.time}:00Z`,
      updatedAt: `${today}T${config.time}:00Z`,
      cancelReason: '行程变更',
      channelName: '美团',
    } as Order);
  });
  
  // ========== 2. 历史订单但今日需处理 ==========
  
  // 2.1 今日入住（历史创建，今日到店，待办理入住）
  const todayCheckinConfigs = [
    { id: 'checkin-001', hotelId: 'hotel-001', createdDay: -2, amount: 1200 },
    { id: 'checkin-002', hotelId: 'hotel-002', createdDay: -5, amount: 1800 },
    { id: 'checkin-003', hotelId: 'hotel-004', createdDay: -1, amount: 999 },
  ];
  
  todayCheckinConfigs.forEach((config, idx) => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() + config.createdDay);
    orders.push({
      id: config.id,
      hotelId: config.hotelId,
      orderNo: `BK${100000 + idx}`,
      source: sources[idx % sources.length],
      status: 'confirmed' as OrderStatus,
      paymentStatus: 'paid',
      guestName: ['吴', '郑', '陈'][idx] + '先生',
      guestPhone: `137${String(30000000 + idx * 11111111).padStart(8, '0')}`,
      roomTypeId: 'rt-001',
      roomTypeName: roomTypes[idx % roomTypes.length],
      checkInDate: today, // 今日入住
      checkOutDate: today,
      nights: 1,
      roomCount: 1,
      guestCount: 2,
      totalAmount: config.amount,
      paidAmount: config.amount,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      channelName: ['携程', '直客'][idx % 2],
    } as Order);
  });
  
  // 2.2 在住（历史创建，已入住，未退房）
  const checkedInConfigs = [
    { id: 'checked-001', hotelId: 'hotel-001', checkinDay: -2, nights: 3, amount: 2400 },
    { id: 'checked-002', hotelId: 'hotel-002', checkinDay: -1, nights: 2, amount: 1600 },
    { id: 'checked-003', hotelId: 'hotel-003', checkinDay: -3, nights: 5, amount: 4500 },
    { id: 'checked-004', hotelId: 'hotel-001', checkinDay: -1, nights: 3, amount: 2100 },
  ];
  
  checkedInConfigs.forEach((config, idx) => {
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + config.checkinDay);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + config.nights);
    
    orders.push({
      id: config.id,
      hotelId: config.hotelId,
      orderNo: `BK${200000 + idx}`,
      source: sources[idx % sources.length],
      status: 'checked_in' as OrderStatus,
      paymentStatus: 'paid',
      guestName: ['冯', '褚', '卫', '蒋'][idx] + '女士',
      guestPhone: `136${String(40000000 + idx * 11111111).padStart(8, '0')}`,
      roomTypeId: 'rt-001',
      roomTypeName: roomTypes[idx % roomTypes.length],
      roomNumber: `${Math.floor(Math.random() * 20 + 1)}${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}`,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      nights: config.nights,
      roomCount: 1,
      guestCount: 2,
      totalAmount: config.amount,
      paidAmount: config.amount,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: new Date(checkInDate.getTime() - 86400000 * 2).toISOString(),
      updatedAt: checkInDate.toISOString(),
      channelName: ['携程', '美团', '直客', '企业'][idx % 4],
    } as Order);
  });
  
  // 2.3 今日离店（历史创建，今日退房）
  const todayCheckoutConfigs = [
    { id: 'checkout-001', hotelId: 'hotel-002', checkinDay: -2, amount: 2200 },
    { id: 'checkout-002', hotelId: 'hotel-003', checkinDay: -1, amount: 1100 },
  ];
  
  todayCheckoutConfigs.forEach((config, idx) => {
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + config.checkinDay);
    
    orders.push({
      id: config.id,
      hotelId: config.hotelId,
      orderNo: `BK${300000 + idx}`,
      source: sources[idx % sources.length],
      status: idx === 0 ? 'checked_out' as OrderStatus : 'checked_in' as OrderStatus, // 一个已退房，一个在住待退房
      paymentStatus: 'paid',
      guestName: ['沈', '韩'][idx] + '先生',
      guestPhone: `135${String(50000000 + idx * 11111111).padStart(8, '0')}`,
      roomTypeId: 'rt-001',
      roomTypeName: roomTypes[idx % roomTypes.length],
      roomNumber: `${Math.floor(Math.random() * 20 + 1)}${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}`,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: today, // 今日离店
      nights: Math.abs(config.checkinDay),
      roomCount: 1,
      guestCount: 2,
      totalAmount: config.amount,
      paidAmount: config.amount,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: new Date(checkInDate.getTime() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      channelName: ['携程', '美团'][idx % 2],
    } as Order);
  });
  
  // 2.4 待开票（已退房未开票）
  const pendingInvoiceConfigs = [
    { id: 'invoice-001', hotelId: 'hotel-001', checkoutDay: -1, amount: 1500 },
    { id: 'invoice-002', hotelId: 'hotel-002', checkoutDay: -2, amount: 2300 },
    { id: 'invoice-003', hotelId: 'hotel-004', checkoutDay: -1, amount: 1800 },
  ];
  
  pendingInvoiceConfigs.forEach((config, idx) => {
    const checkoutDate = new Date();
    checkoutDate.setDate(checkoutDate.getDate() + config.checkoutDay);
    
    orders.push({
      id: config.id,
      hotelId: config.hotelId,
      orderNo: `BK${400000 + idx}`,
      source: sources[idx % sources.length],
      status: 'checked_out' as OrderStatus,
      paymentStatus: 'paid',
      guestName: ['杨', '朱', '秦'][idx] + '女士',
      guestPhone: `134${String(60000000 + idx * 11111111).padStart(8, '0')}`,
      roomTypeId: 'rt-001',
      roomTypeName: roomTypes[idx % roomTypes.length],
      roomNumber: `${Math.floor(Math.random() * 20 + 1)}${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}`,
      checkInDate: new Date(checkoutDate.getTime() - 86400000 * 2).toISOString().split('T')[0],
      checkOutDate: checkoutDate.toISOString().split('T')[0],
      nights: 2,
      roomCount: 1,
      guestCount: 2,
      totalAmount: config.amount,
      paidAmount: config.amount,
      discountAmount: 0,
      currency: 'CNY',
      createdAt: new Date(checkoutDate.getTime() - 86400000 * 5).toISOString(),
      updatedAt: checkoutDate.toISOString(),
      channelName: ['携程', '美团', '直客'][idx % 3],
    } as Order);
  });
  
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==================== 订单相关 Mock 数据 ====================

export const MOCK_ORDERS: Order[] = generateTodayOrders();

// ==================== 内容转化交易数据 ====================
// 用于发布管理页面的成交统计

export interface ContentTransaction {
  id: string;
  contentId: string;
  platform: 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
  price: number;
  timestamp: string;
  sourceContentId?: string;
  hotelId: string;
  guestName?: string;
  roomType?: string;
}

// ==================== 合规相关 Mock 数据 ====================

export const MOCK_PLATFORM_RULES: PlatformRule[] = [
  {
    id: 'rule-001',
    platform: '携程',
    category: '价格管理',
    title: '价格一致性规则',
    description: '酒店在各渠道的价格必须保持一致，不得低于直销渠道价格',
    status: 'active',
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-06-15',
  },
  {
    id: 'rule-002',
    platform: '美团',
    category: '库存管理',
    title: '超售限制',
    description: '酒店不得超售超过总房量的5%',
    status: 'active',
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-03-20',
  },
  {
    id: 'rule-003',
    platform: '飞猪',
    category: '订单处理',
    title: '订单确认时效',
    description: '新订单必须在30分钟内确认',
    status: 'active',
    effectiveDate: '2024-02-01',
    lastUpdated: '2024-05-10',
  },
];

export const MOCK_LEGAL_COMPLIANCE: LegalCompliance[] = [
  {
    id: 'law-001',
    law: '《中华人民共和国价格法》',
    article: '第十四条',
    title: '禁止价格欺诈',
    description: '经营者不得利用虚假的或者使人误解的价格手段，诱骗消费者或者其他经营者与其进行交易',
    category: '价格合规',
    applicableTo: ['所有酒店'],
    lastUpdated: '2024-01-01',
  },
  {
    id: 'law-002',
    law: '《中华人民共和国消费者权益保护法》',
    article: '第二十六条',
    title: '明示义务',
    description: '经营者应当向消费者提供有关商品或者服务的真实信息，不得作引人误解的虚假宣传',
    category: '消费者权益',
    applicableTo: ['所有酒店'],
    lastUpdated: '2024-01-01',
  },
];

export const MOCK_RISK_EVENTS: RiskEvent[] = [
  {
    id: 'risk-001',
    hotelId: 'hotel-001',
    title: '价格异常波动',
    description: '今日价格较昨日上涨超过50%，可能存在设置错误',
    type: 'pricing_anomaly',
    level: 'high',
    status: 'pending',
    detectedAt: '2026-03-08T08:00:00Z',
    suggestion: '请核实价格设置是否正确',
  },
  {
    id: 'risk-002',
    hotelId: 'hotel-002',
    title: '库存即将售罄',
    description: '本周六库存仅剩5间，建议关注',
    type: 'inventory_warning',
    level: 'medium',
    status: 'resolved',
    detectedAt: '2026-03-07T10:00:00Z',
    resolvedAt: '2026-03-07T12:00:00Z',
    suggestion: '已提醒酒店关注',
  },
];

// ==================== 风险预警相关 Mock 数据 ====================

export const MOCK_PREDICTIONS: RiskPrediction[] = [
  {
    id: 'pred-001',
    hotelId: 'hotel-001',
    title: '预计下周入住率下降',
    description: '根据历史数据和市场趋势，预计下周入住率将下降15%',
    type: 'occupancy',
    level: 'medium',
    status: 'pending',
    predictedAt: '2026-03-08T00:00:00Z',
    expectedAt: '2026-03-15T00:00:00Z',
    confidence: 78,
  },
  {
    id: 'pred-002',
    hotelId: 'hotel-002',
    title: '竞争对手降价预警',
    description: '监测到周边3家竞品酒店明日将下调价格10-15%',
    type: 'competitor',
    level: 'high',
    status: 'confirmed',
    predictedAt: '2026-03-07T18:00:00Z',
    confidence: 85,
  },
];

export const MOCK_KNOWLEDGE: RiskKnowledge[] = [
  {
    id: 'know-001',
    title: '如何应对突发公共卫生事件',
    description: '当发生突发公共卫生事件时，酒店应立即启动应急预案...',
    category: '应急管理',
    tags: ['公共卫生', '应急预案', '安全'],
    solution: '1. 立即上报 2. 启动应急预案 3. 配合相关部门',
    relatedCases: 5,
    createdAt: '2024-01-15',
  },
  {
    id: 'know-002',
    title: '价格异常处理流程',
    description: '当系统检测到价格异常时，应按以下流程处理...',
    category: '价格管理',
    tags: ['价格', '异常处理'],
    solution: '1. 核实价格 2. 确认是否为促销 3. 修正或确认',
    relatedCases: 12,
    createdAt: '2024-02-20',
  },
];

// ==================== AI客服相关 Mock 数据 ====================

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    channel: 'wechat_mini',
    channelName: '微信小程序',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-001',
    guestName: '张先生',
    content: '请问有免费停车吗？',
    timestamp: new Date('2026-03-08T09:00:00Z'),
    status: 'ai_handled',
    priority: 'low',
    hasOrder: false,
    aiSuggestion: '我们酒店提供免费停车位，车位充足，无需预约。',
  },
  {
    id: 'msg-002',
    channel: 'douyin',
    channelName: '抖音',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-002',
    guestName: '李女士',
    content: '我想投诉房间卫生问题，床单看起来没有更换',
    timestamp: new Date('2026-03-08T08:30:00Z'),
    status: 'unread',
    priority: 'high',
    hasOrder: true,
    orderId: 'ORD-20260308001',
    aiSuggestion: '非常抱歉给您带来不好的体验，我立即为您安排前台处理，同时可以为您更换房间。',
  },
  {
    id: 'msg-003',
    channel: 'wechat_official',
    channelName: '微信公众号',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-003',
    guestName: '王先生',
    content: '预订了今晚的房间，可以延迟入住吗？',
    timestamp: new Date('2026-03-08T10:15:00Z'),
    status: 'replied',
    priority: 'medium',
    hasOrder: true,
    orderId: 'ORD-20260308002',
    aiSuggestion: '可以的，我们可以为您保留房间至晚上10点，需要延迟更长时间请提前告知。',
  },
  {
    id: 'msg-004',
    channel: 'xiaohongshu',
    channelName: '小红书',
    hotelId: 'hotel-003',
    hotelName: '广州珠江新城酒店',
    guestId: 'guest-004',
    guestName: '赵女士',
    content: '早餐是几点开始？有中西式选择吗？',
    timestamp: new Date('2026-03-08T07:45:00Z'),
    status: 'ai_handled',
    priority: 'low',
    hasOrder: false,
    aiSuggestion: '早餐时间是早上6:30-10:00，位于酒店2楼餐厅，提供中西式自助早餐。',
  },
  {
    id: 'msg-005',
    channel: 'wechat_mini',
    channelName: '微信小程序',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-005',
    guestName: '陈先生',
    content: '房间空调坏了，需要维修',
    timestamp: new Date('2026-03-08T06:20:00Z'),
    status: 'human_handled',
    priority: 'high',
    hasOrder: true,
    orderId: 'ORD-20260308003',
    assignedTo: '客服小李',
    aiSuggestion: '抱歉给您带来不便，我已经通知工程部，维修师傅将在15分钟内上门。',
  },
  {
    id: 'msg-006',
    channel: 'app',
    channelName: 'App',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-006',
    guestName: '刘女士',
    content: '酒店附近有地铁站吗？怎么去外滩方便？',
    timestamp: new Date('2026-03-08T11:00:00Z'),
    status: 'read',
    priority: 'low',
    hasOrder: false,
    aiSuggestion: '距离酒店500米有地铁2号线成都北站站，到外滩仅需2站路，约10分钟。',
  },
  {
    id: 'msg-007',
    channel: 'phone',
    channelName: '电话',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-007',
    guestName: '周先生',
    content: '我要开发票，公司名称是XXX科技有限公司',
    timestamp: new Date('2026-03-08T09:45:00Z'),
    status: 'unread',
    priority: 'medium',
    hasOrder: true,
    orderId: 'ORD-20260308004',
    aiSuggestion: '好的，请提供您的邮箱地址，电子发票将在退房后24小时内发送至您的邮箱。',
  },
  {
    id: 'msg-008',
    channel: 'wechat_mini',
    channelName: '微信小程序',
    hotelId: 'hotel-003',
    hotelName: '广州珠江新城酒店',
    guestId: 'guest-008',
    guestName: '孙女士',
    content: '请问可以带宠物入住吗？',
    timestamp: new Date('2026-03-08T12:30:00Z'),
    status: 'unread',
    priority: 'medium',
    hasOrder: false,
    aiSuggestion: '抱歉，酒店暂时不允许携带宠物入住，但我们可以为您推荐附近接受宠物的酒店。',
  },
];

export const MOCK_HANDOFFS: any[] = [
  {
    id: 'handoff-001',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-003',
    guestName: '客户C',
    channel: '微信公众号',
    reason: 'user_request',
    originalMessage: '客户要求退款，超出AI处理范围',
    status: 'pending',
    priority: 'high',
    createdAt: new Date('2026-03-08T10:00:00Z'),
    slaDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后
    tags: ['退款', '人工'],
  },
  {
    id: 'handoff-002',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-004',
    guestName: '客户D',
    channel: '小红书',
    reason: 'complaint',
    originalMessage: '投诉服务态度',
    status: 'processing',
    priority: 'urgent',
    createdAt: new Date('2026-03-08T09:30:00Z'),
    assignedAt: new Date('2026-03-08T09:35:00Z'),
    assignedTo: 'agent-001',
    assignedToName: '客服小王',
    slaDeadline: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后
    tags: ['投诉', '服务'],
  },
  {
    id: 'handoff-003',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-005',
    guestName: '客户E',
    channel: '微信小程序',
    reason: 'complex_issue',
    originalMessage: '需要协调多个部门处理',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date('2026-03-08T11:00:00Z'),
    slaDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
    tags: ['协调', '复杂'],
  },
  {
    id: 'handoff-004',
    hotelId: 'hotel-003',
    hotelName: '广州珠江新城酒店',
    guestId: 'guest-006',
    guestName: 'VIP客户F',
    channel: '抖音',
    reason: 'vip_customer',
    originalMessage: 'VIP客户需要专属服务',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date('2026-03-08T10:30:00Z'),
    slaDeadline: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后
    tags: ['VIP', '专属'],
  },
  {
    id: 'handoff-005',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-007',
    guestName: '客户G',
    channel: '微信公众号',
    reason: 'ai_confidence_low',
    originalMessage: 'AI无法理解客户需求',
    status: 'completed',
    priority: 'low',
    createdAt: new Date('2026-03-08T08:00:00Z'),
    assignedAt: new Date('2026-03-08T08:05:00Z'),
    completedAt: new Date('2026-03-08T08:30:00Z'),
    assignedTo: 'agent-002',
    assignedToName: '客服小李',
    slaDeadline: new Date('2026-03-08T09:00:00Z'),
    tags: ['AI转接'],
  },
];

export const MOCK_SESSIONS: any[] = [
  {
    id: 'session-001',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-005',
    guestName: '客户E',
    guestPhone: '13800138001',
    channel: '微信',
    status: 'active',
    aiAccuracy: 85,
    savedTime: 12,
    pendingSuggestions: 2,
    lastActivity: new Date('2026-03-08T08:05:00Z'),
    messages: [
      {
        id: 'msg-010',
        type: 'guest',
        content: '房间空调坏了',
        senderName: '客户E',
        platform: '微信',
        status: 'completed',
        timestamp: new Date('2026-03-08T08:00:00Z'),
      },
      {
        id: 'msg-011',
        type: 'ai_suggestion',
        content: '非常抱歉，我们马上安排维修人员',
        confidence: 90,
        status: 'pending',
        timestamp: new Date('2026-03-08T08:01:00Z'),
      },
    ],
  },
  {
    id: 'session-002',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    guestId: 'guest-006',
    guestName: '客户F',
    guestPhone: '13900139002',
    channel: '抖音',
    status: 'active',
    aiAccuracy: 78,
    savedTime: 8,
    pendingSuggestions: 1,
    lastActivity: new Date('2026-03-08T09:10:00Z'),
    messages: [
      {
        id: 'msg-020',
        type: 'guest',
        content: '可以延迟退房吗？',
        senderName: '客户F',
        platform: '抖音',
        status: 'completed',
        timestamp: new Date('2026-03-08T09:00:00Z'),
      },
    ],
  },
  {
    id: 'session-003',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    guestId: 'guest-007',
    guestName: '客户G',
    channel: '微信公众号',
    status: 'pending',
    aiAccuracy: 65,
    savedTime: 5,
    pendingSuggestions: 0,
    lastActivity: new Date('2026-03-08T10:15:00Z'),
    messages: [
      {
        id: 'msg-030',
        type: 'guest',
        content: '早餐时间到几点？',
        senderName: '客户G',
        platform: '微信公众号',
        status: 'completed',
        timestamp: new Date('2026-03-08T10:00:00Z'),
      },
    ],
    aiSuggestions: [
      { content: '早餐时间是早上7点到10点', confidence: 95 },
    ],
    startedAt: new Date('2026-03-08T10:00:00Z'),
    lastActivityAt: new Date('2026-03-08T10:02:00Z'),
  },
];

export const MOCK_SLA_STATS: SLAStats = {
  totalRequests: 2847,
  slaComplianceRate: 94,
  withinSLA: 47,
  breachedSLA: 3,
  avgResponseTime: 2,
  avgResolutionTime: 18,
};

export const MOCK_AI_EFFECTIVENESS: AIEffectiveness = {
  totalSuggestions: 100,
  acceptedSuggestions: 75,
  editedSuggestions: 15,
  rejectedSuggestions: 10,
  acceptRate: 75,
  avgConfidence: 82,
};

export const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [
  { agentId: 'agent-001', agentName: '客服小王', handledRequests: 45, avgResponseTime: 1.5, satisfaction: 4.8, aiAdoptionRate: 85, onlineHours: 7.5 },
  { agentId: 'agent-002', agentName: '客服小李', handledRequests: 38, avgResponseTime: 2.1, satisfaction: 4.6, aiAdoptionRate: 78, onlineHours: 8.0 },
  { agentId: 'agent-003', agentName: '客服小张', handledRequests: 52, avgResponseTime: 1.2, satisfaction: 4.9, aiAdoptionRate: 92, onlineHours: 7.0 },
];

export const MOCK_CHANNEL_STATS: ChannelStats[] = [
  { channel: '微信小程序', totalMessages: 120, aiHandled: 96, humanHandled: 24, avgResponseTime: 1.8, conversionRate: 12.5 },
  { channel: '抖音', totalMessages: 85, aiHandled: 68, humanHandled: 17, avgResponseTime: 2.2, conversionRate: 8.3 },
  { channel: '小红书', totalMessages: 64, aiHandled: 48, humanHandled: 16, avgResponseTime: 2.5, conversionRate: 15.2 },
  { channel: '微信公众号', totalMessages: 92, aiHandled: 78, humanHandled: 14, avgResponseTime: 1.5, conversionRate: 10.1 },
];

export const MOCK_TIME_SERIES: TimeSeriesData[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toISOString().split('T')[0],
    totalMessages: 50 + Math.floor(Math.random() * 50),
    aiHandled: 35 + Math.floor(Math.random() * 30),
    humanHandled: 10 + Math.floor(Math.random() * 20),
    slaBreaches: Math.floor(Math.random() * 3),
  };
});

// ==================== 话术库相关 Mock 数据 ====================

export const MOCK_SCRIPTS: any[] = [
  {
    id: 'script-001',
    category: 'greeting',
    scene: '前台接待',
    title: '标准入住问候',
    content: '您好，欢迎光临！请问您有预订吗？请出示您的身份证件。',
    tags: ['入住', '问候', '标准'],
    usageCount: 128,
    status: 'active',
    scope: 'group',
    hotelIds: [],
    hotelNames: [],
    channels: ['微信', '电话', '前台'],
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
  },
  {
    id: 'script-002',
    category: 'complaint',
    scene: '客户投诉',
    title: '投诉致歉标准话术',
    content: '非常抱歉给您带来不好的体验，我们会立即处理。请问能详细描述一下情况吗？',
    tags: ['投诉', '致歉', '处理'],
    usageCount: 56,
    status: 'active',
    scope: 'group',
    hotelIds: [],
    hotelNames: [],
    channels: ['微信', '电话', '抖音', '小红书'],
    createdAt: '2024-02-15',
    updatedAt: '2024-05-20',
  },
  {
    id: 'script-003',
    category: 'pricing',
    scene: '价格咨询',
    title: '房价说明话术',
    content: '我们的房价根据季节和供需情况会有所浮动，目前的价格是优惠后的价格。',
    tags: ['价格', '咨询'],
    usageCount: 89,
    status: 'active',
    scope: 'specific',
    hotelIds: ['hotel-001'],
    hotelNames: ['如家酒店·成都春熙路店'],
    channels: ['微信', '电话'],
    createdAt: '2024-03-01',
    updatedAt: '2024-06-15',
  },
  {
    id: 'script-004',
    category: 'facility',
    scene: '设施咨询',
    title: '健身房开放时间',
    content: '我们的健身房24小时开放，位于酒店3楼，房客可以凭房卡免费使用。',
    tags: ['设施', '健身房'],
    usageCount: 45,
    status: 'active',
    scope: 'specific',
    hotelIds: ['hotel-001', 'hotel-002'],
    hotelNames: ['如家酒店·成都春熙路店', '汉庭酒店·成都火车北站店'],
    channels: ['微信', '前台'],
    createdAt: '2024-04-01',
    updatedAt: '2024-06-20',
  },
  // 新增话术，覆盖更多酒店
  {
    id: 'script-005',
    category: 'booking',
    scene: '预订咨询',
    title: '延迟入住说明',
    content: '您好，我们可以为您保留房间至晚上8点，如需更晚入住请提前告知我们。',
    tags: ['预订', '延迟入住'],
    usageCount: 67,
    status: 'active',
    scope: 'specific',
    hotelIds: ['hotel-003', 'hotel-004', 'hotel-005'],
    hotelNames: ['7天酒店·绵阳火车站店', '锦江之星·德阳文庙店', '速8酒店·南充火车站店'],
    channels: ['微信', '电话', '抖音'],
    createdAt: '2024-05-01',
    updatedAt: '2024-06-25',
  },
  {
    id: 'script-006',
    category: 'complaint',
    scene: '投诉处理',
    title: '噪音投诉处理',
    content: '非常抱歉给您带来困扰，我们会立即联系相关客人并安排您换到安静的房间。',
    tags: ['投诉', '噪音'],
    usageCount: 34,
    status: 'active',
    scope: 'specific',
    hotelIds: ['hotel-006', 'hotel-007', 'hotel-008'],
    hotelNames: ['格林豪泰·泸州江阳店', '尚客优·宜宾翠屏店', '全季酒店·自贡汇东店'],
    channels: ['微信', '电话', '小红书'],
    createdAt: '2024-05-15',
    updatedAt: '2024-06-28',
  },
];

// ==================== 定价策略相关 Mock 数据 ====================

export const MOCK_STRATEGIES: PricingStrategy[] = [
  {
    id: 'strategy-001',
    name: '五一黄金周促销',
    type: 'holiday',
    description: '针对五一假期的价格调整策略',
    status: 'active',
    conditions: {
      dateRange: { start: '2026-05-01', end: '2026-05-05' },
    },
    actions: {
      adjustmentType: 'percentage',
      adjustmentValue: 30,
      minPrice: 400,
    },
    affectedHotels: ['hotel-001', 'hotel-002', 'hotel-003'],
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'strategy-002',
    name: '低库存自动调价',
    type: 'inventory',
    description: '当库存低于10%时自动提价',
    status: 'active',
    conditions: {
      occupancyThreshold: 90,
    },
    actions: {
      adjustmentType: 'percentage',
      adjustmentValue: 15,
    },
    affectedHotels: ['hotel-001', 'hotel-002'],
    createdAt: '2026-01-15',
    updatedAt: '2026-03-01',
  },
];

// 基于竞品价格生成定价建议
function generatePricingSuggestionWithCompetitor(
  hotelId: string,
  hotelName: string,
  baseADR: number,
  city: string
): PricingSuggestion {
  // 获取竞品价格区间（经济型酒店对标经济型竞品）
  const compRange = getCompetitorPriceRange(hotelId, 'economy', city, 'standard');
  const competitorAvg = compRange.avg || baseADR * 0.95;
  
  // AI定价逻辑：基于竞品均价，考虑自身位置溢价/折价
  const myPosition = baseADR > competitorAvg ? 'higher' : baseADR < competitorAvg * 0.9 ? 'lower' : 'similar';
  
  // 建议价格：对标竞品均价，根据酒店品牌微调
  let suggestedPrice = Math.round(competitorAvg * (baseADR / competitorAvg));
  // 确保价格在合理区间（不低于成本价，不超出市场太多）
  suggestedPrice = Math.max(Math.round(baseADR * 0.85), Math.min(Math.round(baseADR * 1.3), suggestedPrice));
  
  const increasePercent = Number(((suggestedPrice - baseADR) / baseADR * 100).toFixed(1));
  const revenueImpact = Math.round((suggestedPrice - baseADR) * 50); // 假设50间房受影响
  
  // 生成reasoning
  let reasoning = '';
  if (myPosition === 'higher') {
    reasoning = `竞品均价¥${competitorAvg}，我们当前定价¥${baseADR}处于高位，建议${increasePercent > 0 ? '维持溢价' : '适度下调'}保持竞争力`;
  } else if (myPosition === 'lower') {
    reasoning = `竞品均价¥${competitorAvg}，我们定价偏低，建议提价至¥${suggestedPrice}以提升收益`;
  } else {
    reasoning = `竞品均价¥${competitorAvg}，与我们定价相近，建议微调至¥${suggestedPrice}优化收益`;
  }
  
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 1);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 2);
  
  return {
    id: `suggestion-${hotelId}`,
    name: `${hotelName} - 竞品对标调价`,
    type: 'competitor_response',
    hotelId,
    hotelName,
    engagementLevel: 'confirm',
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    createdAt: today.toISOString(),
    rules: {
      basePrice: baseADR,
      suggestedPrice,
      increasePercent,
      maxPremium: Math.round(baseADR * 0.2),
      reasoning,
    },
    expectedImpact: {
      revenueIncrease: revenueImpact,
      occupancyImpact: increasePercent > 0 ? -3 : 5,
      confidence: 78 + Math.floor(Math.random() * 12),
    },
    status: 'pending',
  };
}

// 四川8家经济酒店定价建议（基于竞品价格）
export const MOCK_SUGGESTIONS: PricingSuggestion[] = [
  // 如家成都春熙路 - 基准ADR ¥168，竞品参考调价
  generatePricingSuggestionWithCompetitor('hotel-001', '如家酒店·成都春熙路店', 168, '成都'),
  // 汉庭成都北站 - 基准ADR ¥155
  generatePricingSuggestionWithCompetitor('hotel-002', '汉庭酒店·成都火车北站店', 155, '成都'),
  // 7天绵阳 - 基准ADR ¥138
  generatePricingSuggestionWithCompetitor('hotel-003', '7天酒店·绵阳火车站店', 138, '绵阳'),
  // 锦江之星德阳 - 基准ADR ¥128
  generatePricingSuggestionWithCompetitor('hotel-004', '锦江之星·德阳文庙店', 128, '德阳'),
  // 速8南充 - 基准ADR ¥118
  generatePricingSuggestionWithCompetitor('hotel-005', '速8酒店·南充火车站店', 118, '南充'),
  // 格林豪泰泸州 - 基准ADR ¥148
  generatePricingSuggestionWithCompetitor('hotel-006', '格林豪泰·泸州龙马潭店', 148, '泸州'),
  // 尚客优宜宾 - 基准ADR ¥135
  generatePricingSuggestionWithCompetitor('hotel-007', '尚客优酒店·宜宾翠屏山店', 135, '宜宾'),
  // 全季自贡 - 中高端，基准ADR ¥198
  generatePricingSuggestionWithCompetitor('hotel-008', '全季酒店·自贡华商店', 198, '自贡'),
];

// ==================== 私域运营相关 Mock 数据 ====================

export const MOCK_PRIVATE_CONTENTS: PrivateContent[] = [
  // 朋友圈内容
  {
    id: 'pc-001',
    hotelId: 'hotel-001',
    platform: '微信朋友圈',
    type: '图文',
    title: '周末特惠活动',
    content: '🎉 本周末入住享8折优惠！\n\n预订从速，名额有限！\n☎️ 咨询热线：400-888-8888',
    status: 'published',
    publishedAt: '2026-03-08T09:00:00Z',
    metrics: { views: 156, likes: 23, comments: 5, touches: 156, replies: 5, conversions: 2 },
    performance: { touches: 156, replies: 5, conversions: 2, privateConversions: 2 },
  },
  {
    id: 'pc-002',
    hotelId: 'hotel-001',
    platform: '微信朋友圈',
    type: '图文',
    title: '☀️ 早安问候',
    content: '☀️ 早安！北京今天晴 18°C\n\n🏨 今日房源充足\n提前预订享早鸟价\n\n💰 今日房价：\n• 大床房 ¥329（原价¥399）\n• 双床房 ¥359（原价¥429）\n\n📍 成都春熙路步行5分钟',
    status: 'published',
    publishedAt: '2026-03-08T08:00:00Z',
    metrics: { views: 238, likes: 45, comments: 12, touches: 238, replies: 12, conversions: 3 },
    performance: { touches: 238, replies: 12, conversions: 3, privateConversions: 3 },
  },
  {
    id: 'pc-004',
    hotelId: 'hotel-001',
    platform: '微信朋友圈',
    type: '晒单',
    title: '💚 客人好评展示',
    content: '💚 收到客人的好评，开心一整天\n\n"房间很干净，位置也方便，\n下次来看演唱会还住这里！"\n\n感谢每一位选择我们的朋友🙏',
    status: 'published',
    publishedAt: '2026-03-06T15:30:00Z',
    metrics: { views: 189, likes: 34, comments: 8, touches: 189, replies: 8, conversions: 1 },
    performance: { touches: 189, replies: 8, conversions: 1, privateConversions: 1 },
  },
  // 微信群内容
  {
    id: 'pc-003',
    hotelId: 'hotel-002',
    platform: '微信群',
    type: '闪购',
    title: '⚡️ 群内专属闪购',
    content: '⚡️ 【群内专属闪购】⚡️\n\n🕘 今晚还剩最后3间！\n\n📅 日期：今晚入住\n🛏️ 房型：豪华大床房\n💰 群内专享：¥299\n📱 携程价：¥459\n\n手慢无！回复【预订】锁定',
    status: 'published',
    publishedAt: '2026-03-07T20:00:00Z',
    metrics: { views: 45, likes: 8, comments: 15, touches: 45, replies: 15, conversions: 5 },
    performance: { touches: 45, replies: 15, conversions: 5, privateConversions: 5 },
    groupScript: {
      title: '今晚闪购',
      content: '⚡️ 【群内专属闪购】\n🛏️ 豪华大床房 ¥299\n📱 携程价¥459\n回复【预订】锁定',
      atAll: true,
      type: 'flashsale',
    },
  },
  {
    id: 'pc-007',
    hotelId: 'hotel-001',
    platform: '微信群',
    type: '欢迎语',
    title: '🎉 新人入群欢迎',
    content: '欢迎新朋友加入我们的小群！\n\n🎁 群内专属福利：\n• 每周三闪购活动\n• 新品房型优先体验\n• 专属客服答疑\n\n有问题随时@管理员哦~',
    status: 'published',
    publishedAt: '2026-03-08T10:00:00Z',
    metrics: { views: 120, likes: 15, comments: 8, touches: 120, replies: 8, conversions: 0 },
    performance: { touches: 120, replies: 8, conversions: 0, privateConversions: 0 },
    groupScript: {
      title: '新人欢迎',
      content: '🎉 欢迎加入我们的小群！\n群内每周三有闪购活动\n有问题随时@管理员',
      atAll: false,
      type: 'welcome',
    },
  },
  {
    id: 'pc-008',
    hotelId: 'hotel-002',
    platform: '微信群',
    type: '互动',
    title: '🎡 周末有奖互动',
    content: '🎡 周末有奖互动来啦！\n\n问题：我们酒店距离春熙路步行多久？\n\n🎁 回答有奖：\n答对的前10位获得升房券一张！\n\n快来参与吧~',
    status: 'published',
    publishedAt: '2026-03-07T14:00:00Z',
    metrics: { views: 89, likes: 20, comments: 25, touches: 89, replies: 25, conversions: 1 },
    performance: { touches: 89, replies: 25, conversions: 1, privateConversions: 1 },
    groupScript: {
      title: '有奖互动',
      content: '🎡 周末有奖互动！答对问题赢升房券\n问：距离春熙路步行多久？',
      atAll: false,
      type: 'interaction',
    },
  },
  // 私聊话术内容
  {
    id: 'pc-005',
    hotelId: 'hotel-002',
    platform: '私聊话术',
    type: '回访',
    title: '入住后回访话术',
    content: 'Hi，昨晚休息得怎么样？\n\n希望我们的房间和服务让您满意\n\n🎁 感谢您的支持：\n下次入住报暗号【老朋友】\n享专属回头客价',
    status: 'draft',
    publishedAt: '',
    metrics: { views: 0, likes: 0, comments: 0 },
    privateScript: {
      title: '入住回访',
      content: 'Hi，昨晚休息得怎么样？希望我们的房间和服务让您满意～\n下次入住报暗号【老朋友】享专属回头客价！',
      type: 'followup',
    },
  },
  {
    id: 'pc-009',
    hotelId: 'hotel-001',
    platform: '私聊话术',
    type: '欢迎',
    title: '新好友添加自动回复',
    content: '您好！欢迎关注我们~\n\n🎁 新人专属福利：\n• 首次入住享9折优惠\n• 免费升级房型\n• 延迟退房至14:00\n\n直接回复【预订】可快速下单哦~',
    status: 'published',
    publishedAt: '2026-03-08T08:00:00Z',
    metrics: { views: 56, likes: 0, comments: 0, touches: 56, replies: 12, conversions: 4 },
    performance: { touches: 56, replies: 12, conversions: 4, privateConversions: 4 },
    privateScript: {
      title: '新好友欢迎',
      content: '您好！欢迎关注我们~🎁 新人首次入住享9折，回复【预订】可快速下单~',
      type: 'welcome',
    },
  },
  {
    id: 'pc-010',
    hotelId: 'hotel-002',
    platform: '私聊话术',
    type: '复购',
    title: '老客户复购邀约',
    content: '张先生您好！\n\n看到您上次入住是3个月前了，最近有出行计划吗？\n\n🎁 专属老客户福利：\n任意房型立减50元，有效期7天\n\n需要我帮您查查房态吗？',
    status: 'published',
    publishedAt: '2026-03-06T16:00:00Z',
    metrics: { views: 23, likes: 0, comments: 0, touches: 23, replies: 8, conversions: 2 },
    performance: { touches: 23, replies: 8, conversions: 2, privateConversions: 2 },
    privateScript: {
      title: '老客户复购',
      content: '张先生您好！看到您上次入住是3个月前了～\n🎁 老客户专屟：任意房型立减50元，有效期7天\n需要查房态吗？',
      type: 'rebooking',
    },
  },
  // 视频号内容
  {
    id: 'pc-006',
    hotelId: 'hotel-001',
    platform: '微信视频号',
    type: '视频号',
    title: '📹 酒店环境展示',
    content: '新拍摄的大堂和房间视频，快来看看吧！\n\n#酒店推荐 #北京住宿 #成都春熙路',
    status: 'scheduled',
    publishedAt: '2026-03-09T10:00:00Z',
    metrics: { views: 0, likes: 0, comments: 0 },
    videoScript: {
      totalDuration: 45,
      scenes: [
        { id: 1, startTime: 0, endTime: 8, duration: 8, shot: '酒店外观+大堂', subtitle: '今天带大家看看这家酒店', bgm: '活力背景音乐', tips: '稳定器慢推' },
        { id: 2, startTime: 8, endTime: 25, duration: 17, shot: '房间全景+details', subtitle: '房间干净整洁，设施齐全', bgm: '继续', tips: '展现床品和浴室' },
        { id: 3, startTime: 25, endTime: 45, duration: 20, shot: '窗外景观+周边', subtitle: '位置超棒，步行5分钟到春熙路', bgm: '高潮', tips: '重点拍摄地理位置优势' },
      ],
      materials: [
        { type: 'video', description: '酒店外观', count: 2, tips: '稳定器慢推' },
        { type: 'video', description: '房间展示', count: 3, tips: '全景+细节特写' },
        { type: 'photo', description: '周边景观', count: 2, tips: '窗外拍摄' },
      ],
      bgmRecommendation: '小红书热门BGM《好心情》《星星点灯》',
      shootingTips: ['u4f7fu7528稳定器拍摄', '光线充足时拍摄', '展现房间最大亮点'],
      editingTips: ['添加流行滤镜', '配乐合适BGM', '添加地理标签'],
    },
  },
  {
    id: 'pc-011',
    hotelId: 'hotel-002',
    platform: '微信视频号',
    type: '视频号',
    title: '🌟 Room Tour来啦',
    content: '一分钟带你看完我们的精品大床房！设施齐全，位置超棒~',
    status: 'published',
    publishedAt: '2026-03-05T19:00:00Z',
    metrics: { views: 892, likes: 156, comments: 45, touches: 892, replies: 12, conversions: 8 },
    performance: { touches: 892, replies: 12, conversions: 8, privateConversions: 6 },
    videoScript: {
      totalDuration: 60,
      scenes: [
        { id: 1, startTime: 0, endTime: 5, duration: 5, shot: '门卡刷卡进门', subtitle: '刷卡进门', bgm: '时尚节奏', tips: '第一视角拍摄' },
        { id: 2, startTime: 5, endTime: 20, duration: 15, shot: '房间全景', subtitle: '这是我们的精品大床房', bgm: '继续', tips: '360度展示' },
        { id: 3, startTime: 20, endTime: 40, duration: 20, shot: '床品+家具+设施', subtitle: '床品很舒适，设施齐全', bgm: '轻松欣快', tips: '特写重要设施' },
        { id: 4, startTime: 40, endTime: 60, duration: 20, shot: '浴室+窗外景观', subtitle: '浴室干湿分离，景观很棒', bgm: '收尾', tips: '展现最大亮点' },
      ],
      materials: [
        { type: 'video', description: '入门镜头', count: 1, tips: '第一视角' },
        { type: 'video', description: '房间全景', count: 2, tips: '稳定器环绕' },
        { type: 'video', description: '细节特写', count: 3, tips: '床品、浴室、视野' },
      ],
      bgmRecommendation: '抖音热门BGM《好心情》《浪漫下罪》',
      shootingTips: ['第一视角更有代入感', '展现最有特色的角落', '光线要明亮'],
      editingTips: ['快节奏剪辑', '添加音乐和字幕', '结尾放预订信息'],
    },
  },
];

export const MOCK_TASKS: OperationTask[] = [
  {
    id: 'task-001',
    hotelId: 'hotel-001',
    title: '回复客户评论',
    description: '回复携程上3条新评论',
    type: 'review_reply',
    priority: 'high',
    status: 'pending',
    dueDate: '2026-03-09',
  },
  {
    id: 'task-002',
    hotelId: 'hotel-002',
    title: '更新房型图片',
    description: '上传新装修的套房照片',
    type: 'content_update',
    priority: 'medium',
    status: 'in_progress',
    dueDate: '2026-03-10',
  },
];

export const MOCK_FOLLOW_UPS: FollowUpRecord[] = [
  {
    id: 'fu-001',
    hotelId: 'hotel-001',
    customerId: 'cust-001',
    customerName: 'VIP客户A',
    type: '生日祝福',
    content: '致电祝客户生日快乐，赠送房券',
    result: '客户表示感谢，预订下周入住',
    createdBy: '运营小张',
    createdAt: '2026-03-08T10:00:00Z',
  },
];

// ==================== 微信群管理相关 Mock 数据 ====================

export const MOCK_WECHAT_GROUPS: WechatGroup[] = [
  {
    id: 'wg-001',
    hotelId: 'hotel-001',
    name: '北京希遇酒店VIP群',
    memberCount: 286,
    maxMembers: 500,
    ownerName: '小希管家',
    status: 'active',
    createdAt: '2025-06-15T10:00:00Z',
    lastActivityAt: '2026-03-09T08:30:00Z',
    tags: ['VIP', '老客户', '高价值'],
    description: '专属VIP客户群，享受优先预订和专属优惠',
    dailyMessages: 45,
    conversionRate: 12.5,
  },
  {
    id: 'wg-002',
    hotelId: 'hotel-001',
    name: '北京酒店旅行搭子群',
    memberCount: 412,
    maxMembers: 500,
    ownerName: '小希管家',
    status: 'active',
    createdAt: '2025-08-20T14:00:00Z',
    lastActivityAt: '2026-03-09T09:15:00Z',
    tags: ['旅行', '搭子', '活跃'],
    description: '结伴出行，分享旅行经验和攻略',
    dailyMessages: 120,
    conversionRate: 8.3,
  },
  {
    id: 'wg-003',
    hotelId: 'hotel-001',
    name: '北京酒店闪购特惠群',
    memberCount: 498,
    maxMembers: 500,
    ownerName: '运营小李',
    status: 'full',
    createdAt: '2025-09-01T09:00:00Z',
    lastActivityAt: '2026-03-08T20:00:00Z',
    tags: ['闪购', '促销', '活跃'],
    description: '每日闪购优惠信息，限量秒杀',
    dailyMessages: 200,
    conversionRate: 15.2,
  },
  {
    id: 'wg-004',
    hotelId: 'hotel-002',
    name: '成都春熙路住宿交流群',
    memberCount: 156,
    maxMembers: 500,
    ownerName: '成都小管',
    status: 'active',
    createdAt: '2025-11-10T11:00:00Z',
    lastActivityAt: '2026-03-09T07:45:00Z',
    tags: ['成都', '旅游', '交流'],
    description: '成都旅游住宿交流，推荐周边美食和景点',
    dailyMessages: 35,
    conversionRate: 6.8,
  },
  {
    id: 'wg-005',
    hotelId: 'hotel-002',
    name: '演唱会住宿专属群',
    memberCount: 328,
    maxMembers: 500,
    ownerName: '演唱会小助理',
    status: 'active',
    createdAt: '2025-12-01T16:00:00Z',
    lastActivityAt: '2026-03-08T22:30:00Z',
    tags: ['演唱会', '工体', '高峰期'],
    description: '演唱会期间专属住宿安排，交通攻略',
    dailyMessages: 85,
    conversionRate: 22.1,
  },
];

// ==================== 视频号相关 Mock 数据 ====================

export const MOCK_VIDEO_CHANNELS: VideoChannel[] = [
  {
    id: 'vc-001',
    hotelId: 'hotel-001',
    name: '北京希遇酒店官方号',
    followerCount: 12580,
    totalVideos: 156,
    totalViews: 892000,
    totalLikes: 45600,
    monthlyNewVideos: 8,
    monthlyViews: 125000,
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    recentVideos: [
      {
        id: 'vv-001',
        title: '🏨一分钟带你看完精品大床房',
        duration: 60,
        views: 15234,
        likes: 892,
        comments: 156,
        shares: 89,
        publishedAt: '2026-03-05T19:00:00Z',
        status: 'published',
      },
      {
        id: 'vv-002',
        title: '☀️北京酒店早餐吃什么？',
        duration: 45,
        views: 23156,
        likes: 1456,
        comments: 234,
        shares: 178,
        publishedAt: '2026-03-03T08:00:00Z',
        status: 'published',
      },
      {
        id: 'vv-003',
        title: '🎡周末特惠房展示',
        duration: 30,
        views: 8923,
        likes: 567,
        comments: 89,
        shares: 45,
        publishedAt: '2026-03-01T14:00:00Z',
        status: 'published',
      },
    ],
  },
  {
    id: 'vc-002',
    hotelId: 'hotel-002',
    name: '成都春熙路酒店',
    followerCount: 8920,
    totalVideos: 98,
    totalViews: 456000,
    totalLikes: 28900,
    monthlyNewVideos: 5,
    monthlyViews: 78000,
    status: 'active',
    createdAt: '2024-03-20T14:00:00Z',
    recentVideos: [
      {
        id: 'vv-004',
        title: '🌟成都春熙路必住酒店推荐',
        duration: 90,
        views: 34567,
        likes: 2234,
        comments: 456,
        shares: 234,
        publishedAt: '2026-03-06T20:00:00Z',
        status: 'published',
      },
      {
        id: 'vv-005',
        title: '📹酒店大堂和房间全景展示',
        duration: 75,
        views: 18765,
        likes: 1234,
        comments: 234,
        shares: 123,
        publishedAt: '2026-03-04T16:00:00Z',
        status: 'published',
      },
    ],
  },
];

// ==================== 竞品情报相关 Mock 数据 ====================

export const MOCK_COMPETITORS: CompetitorIntel[] = [
  {
    id: 'comp-001',
    name: '如家精选酒店（成都春熙路店）',
    tier: 'medium',
    competitorOf: 'hotel-001',
    priceRange: { min: 450, max: 650 },
    rating: 4.3,
    distance: 0.8,
  },
  {
    id: 'comp-002',
    name: '汉庭酒店（国贸店）',
    tier: 'low',
    competitorOf: 'hotel-002',
    priceRange: { min: 380, max: 520 },
    rating: 4.1,
    distance: 1.2,
  },
  {
    id: 'comp-003',
    name: '希尔顿欢朋酒店',
    tier: 'high',
    competitorOf: 'hotel-002',
    priceRange: { min: 750, max: 950 },
    rating: 4.7,
    distance: 1.5,
  },
];

// ==================== 非标订单相关 Mock 数据 ====================

export const MOCK_NON_STANDARD_ORDERS: NonStandardOrder[] = [
  {
    id: 'ns-order-001',
    orderNo: 'XY20240308001',
    channel: 'xianyu',
    channelOrderId: 'XY987654321',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    roomTypeName: '标准大床房',
    roomCount: 1,
    guestName: '闲鱼买家A',
    guestPhone: '13800138010',
    checkInDate: '2026-03-15',
    checkOutDate: '2026-03-17',
    nights: 2,
    totalAmount: 960,
    channelFee: 48,
    platformFee: 28,
    netAmount: 884,
    status: 'confirmed',
    pmsStatus: 'synced',
    pmsOrderId: 'PMS20240315001',
    createdAt: '2026-03-08T14:30:00Z',
    syncedAt: '2026-03-08T14:35:00Z',
    guestNotes: '希望安排高楼层',
  },
  {
    id: 'ns-order-002',
    orderNo: 'XHS20240308002',
    channel: 'xiaohongshu',
    channelOrderId: 'XHS123456789',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    roomTypeName: '豪华双床房',
    roomCount: 1,
    guestName: '小红书用户B',
    guestPhone: '13800138011',
    checkInDate: '2026-03-20',
    checkOutDate: '2026-03-22',
    nights: 2,
    totalAmount: 1300,
    channelFee: 65,
    platformFee: 39,
    netAmount: 1196,
    status: 'pending',
    pmsStatus: 'pending',
    createdAt: '2026-03-08T16:00:00Z',
  },
  {
    id: 'ns-order-003',
    orderNo: 'WX20240308003',
    channel: 'wechat',
    channelOrderId: 'WX456789123',
    hotelId: 'hotel-001',
    hotelName: '如家酒店·成都春熙路店',
    roomTypeName: '商务套房',
    roomCount: 2,
    guestName: '微信客户C',
    guestPhone: '13800138012',
    checkInDate: '2026-03-12',
    checkOutDate: '2026-03-14',
    nights: 2,
    totalAmount: 1680,
    channelFee: 0,
    platformFee: 50,
    netAmount: 1630,
    status: 'checked_in',
    pmsStatus: 'synced',
    pmsOrderId: 'PMS20240312001',
    createdAt: '2026-03-05T10:00:00Z',
    syncedAt: '2026-03-05T10:05:00Z',
  },
  {
    id: 'ns-order-004',
    orderNo: 'DY20240308004',
    channel: 'douyin',
    channelOrderId: 'DY789123456',
    hotelId: 'hotel-003',
    hotelName: '上海外滩店',
    roomTypeName: '江景大床房',
    roomCount: 1,
    guestName: '抖音用户D',
    guestPhone: '13800138013',
    checkInDate: '2026-03-25',
    checkOutDate: '2026-03-28',
    nights: 3,
    totalAmount: 2250,
    channelFee: 112,
    platformFee: 67,
    netAmount: 2071,
    status: 'confirmed',
    pmsStatus: 'syncing',
    createdAt: '2026-03-08T09:15:00Z',
  },
  {
    id: 'ns-order-005',
    orderNo: 'XY20240308005',
    channel: 'xianyu',
    channelOrderId: 'XY321654987',
    hotelId: 'hotel-002',
    hotelName: '汉庭酒店·成都火车北站店',
    roomTypeName: '标准大床房',
    roomCount: 1,
    guestName: '闲鱼买家E',
    guestPhone: '13800138014',
    checkInDate: '2026-03-10',
    checkOutDate: '2026-03-11',
    nights: 1,
    totalAmount: 520,
    channelFee: 26,
    platformFee: 15,
    netAmount: 479,
    status: 'checked_out',
    pmsStatus: 'synced',
    pmsOrderId: 'PMS20240310001',
    createdAt: '2026-03-01T08:30:00Z',
    syncedAt: '2026-03-01T08:35:00Z',
  },
  {
    id: 'ns-order-006',
    orderNo: 'XHS20240308006',
    channel: 'xiaohongshu',
    channelOrderId: 'XHS654987321',
    hotelId: 'hotel-004',
    hotelName: '广州天河店',
    roomTypeName: '豪华套房',
    roomCount: 1,
    guestName: '小红书用户F',
    guestPhone: '13800138015',
    checkInDate: '2026-03-18',
    checkOutDate: '2026-03-20',
    nights: 2,
    totalAmount: 1160,
    channelFee: 58,
    platformFee: 34,
    netAmount: 1068,
    status: 'cancelled',
    pmsStatus: 'failed',
    createdAt: '2026-03-06T14:00:00Z',
    operatorNotes: '客户因行程变更取消',
  },
];
