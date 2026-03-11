/**
 * Shadow-Bees V52 - 共享集团数据源
 * 统一 admin 端和 group 端的数据
 */

import type { Platform } from '@/types';

// ============================================
// 集团基础信息 (与 groupStore 保持一致)
// ============================================

export const sharedGroup = {
  id: 'group_001',
  name: '希遇酒店集团',
  logo: '',
  hotelCount: 10,
  regionCount: 4,
};

// ============================================
// 区域数据 (与 groupStore 保持一致)
// ============================================

export const sharedRegions = [
  { id: 'region_001', name: '华北区', manager: '张伟', hotelCount: 3, gmv: 1250000, revpar: 380, occupancy: 82, score: 88, aiAdoptionRate: 75 },
  { id: 'region_002', name: '华东区', manager: '赵敏', hotelCount: 3, gmv: 1580000, revpar: 420, occupancy: 88, score: 92, aiAdoptionRate: 85 },
  { id: 'region_003', name: '华南区', manager: '李强', hotelCount: 2, gmv: 980000, revpar: 390, occupancy: 85, score: 85, aiAdoptionRate: 70 },
  { id: 'region_004', name: '华西区', manager: '王磊', hotelCount: 2, gmv: 720000, revpar: 350, occupancy: 78, score: 80, aiAdoptionRate: 65 },
];

// ============================================
// 门店数据 (10家门店，与 groupStore 保持一致)
// ============================================

export interface SharedHotel {
  id: string;
  name: string;
  region: string;
  brand: string;
  manager: string;
  roomCount: number;
  status: 'active' | 'inactive' | 'warning' | 'critical';
  gmv: number;
  revpar: number;
  occupancy: number;
  adr: number;
  nonStandardRatio: number;
  healthScore: number;
  healthLevel: 'healthy' | 'warning' | 'critical';
  // 管理端需要的字段
  city: string;
  type: 'city' | 'suburb' | 'tourist';
  tier: 'economy' | 'comfort' | 'premium';
  theme: 'cyan' | 'violet' | 'amber';
  todayRevenue: number;
  todayOrders: number;
  occupancyRate: number;
  alertCount: number;
  lastLoginAt: string;
  // 定价
  pricing: {
    currentMode: 'scalper' | 'dynamic' | 'clearance';
    floorPrice: number;
    ceilingPrice: number;
    currentPrice: number;
    aiSuggestionPrice?: number;
    priceAdoptionRate: number;
  };
  // 库存
  inventory: {
    totalRooms: number;
    availableTonight: number;
    occupiedTonight: number;
    maintenanceRooms: number;
    occupancyRate: number;
    status: 'abundant' | 'normal' | 'tight' | 'soldout';
  };
  // 渠道指标
  platformMetrics: {
    platform: Platform;
    contentCount: number;
    impressions: number;
    clicks: number;
    inquiries: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }[];
  // AI 使用
  aiAdoption: {
    content: boolean;
    service: boolean;
    pricing: boolean;
  };
  // 培训
  training: {
    completed: boolean;
    completedAt?: string;
    score?: number;
  };
}

export const sharedHotels: SharedHotel[] = [
  // 华北区
  {
    id: 'hotel_001',
    name: '北京三里屯店',
    region: '华北区',
    brand: '希遇精选',
    manager: '李明',
    roomCount: 45,
    status: 'active',
    gmv: 520000,
    revpar: 420,
    occupancy: 88,
    adr: 480,
    nonStandardRatio: 25,
    healthScore: 92,
    healthLevel: 'healthy',
    city: '北京',
    type: 'city',
    tier: 'premium',
    theme: 'violet',
    todayRevenue: 15840,
    todayOrders: 28,
    occupancyRate: 88,
    alertCount: 0,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 380, ceilingPrice: 680, currentPrice: 480, aiSuggestionPrice: 520, priceAdoptionRate: 85 },
    inventory: { totalRooms: 45, availableTonight: 5, occupiedTonight: 38, maintenanceRooms: 2, occupancyRate: 88, status: 'tight' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 15, impressions: 25000, clicks: 1250, inquiries: 180, conversions: 22, revenue: 10560, conversionRate: 1.76 },
      { platform: 'wechat', contentCount: 12, impressions: 18000, clicks: 900, inquiries: 120, conversions: 14, revenue: 6720, conversionRate: 1.56 },
      { platform: 'xianyu', contentCount: 8, impressions: 12000, clicks: 480, inquiries: 72, conversions: 8, revenue: 3840, conversionRate: 1.67 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-08-15T10:00:00Z', score: 95 },
  },
  {
    id: 'hotel_002',
    name: '北京望京科技店',
    region: '华北区',
    brand: '希遇商务',
    manager: '王芳',
    roomCount: 60,
    status: 'active',
    gmv: 480000,
    revpar: 380,
    occupancy: 85,
    adr: 450,
    nonStandardRatio: 30,
    healthScore: 88,
    healthLevel: 'healthy',
    city: '北京',
    type: 'city',
    tier: 'comfort',
    theme: 'cyan',
    todayRevenue: 13500,
    todayOrders: 22,
    occupancyRate: 85,
    alertCount: 1,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 320, ceilingPrice: 580, currentPrice: 420, aiSuggestionPrice: 450, priceAdoptionRate: 80 },
    inventory: { totalRooms: 60, availableTonight: 9, occupiedTonight: 48, maintenanceRooms: 3, occupancyRate: 85, status: 'normal' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 12, impressions: 20000, clicks: 1000, inquiries: 150, conversions: 18, revenue: 8100, conversionRate: 1.80 },
      { platform: 'wechat', contentCount: 10, impressions: 15000, clicks: 750, inquiries: 100, conversions: 10, revenue: 4500, conversionRate: 1.33 },
      { platform: 'xianyu', contentCount: 6, impressions: 10000, clicks: 400, inquiries: 60, conversions: 6, revenue: 2700, conversionRate: 1.50 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-08-20T14:00:00Z', score: 88 },
  },
  {
    id: 'hotel_003',
    name: '崇礼滑雪店',
    region: '华北区',
    brand: '希遇度假',
    manager: '张伟',
    roomCount: 35,
    status: 'warning',
    gmv: 250000,
    revpar: 320,
    occupancy: 72,
    adr: 450,
    nonStandardRatio: 35,
    healthScore: 72,
    healthLevel: 'warning',
    city: '张家口',
    type: 'tourist',
    tier: 'comfort',
    theme: 'amber',
    todayRevenue: 8400,
    todayOrders: 14,
    occupancyRate: 72,
    alertCount: 2,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    pricing: { currentMode: 'clearance', floorPrice: 280, ceilingPrice: 680, currentPrice: 380, aiSuggestionPrice: 420, priceAdoptionRate: 60 },
    inventory: { totalRooms: 35, availableTonight: 10, occupiedTonight: 23, maintenanceRooms: 2, occupancyRate: 72, status: 'abundant' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 8, impressions: 15000, clicks: 600, inquiries: 80, conversions: 8, revenue: 3600, conversionRate: 1.33 },
      { platform: 'wechat', contentCount: 6, impressions: 10000, clicks: 400, inquiries: 50, conversions: 5, revenue: 2250, conversionRate: 1.25 },
      { platform: 'xianyu', contentCount: 4, impressions: 6000, clicks: 180, inquiries: 30, conversions: 3, revenue: 1350, conversionRate: 1.67 },
    ],
    aiAdoption: { content: true, service: false, pricing: false },
    training: { completed: false },
  },
  // 华东区
  {
    id: 'hotel_004',
    name: '上海外滩店',
    region: '华东区',
    brand: '希遇精选',
    manager: '陈静',
    roomCount: 55,
    status: 'active',
    gmv: 680000,
    revpar: 520,
    occupancy: 92,
    adr: 580,
    nonStandardRatio: 20,
    healthScore: 95,
    healthLevel: 'healthy',
    city: '上海',
    type: 'city',
    tier: 'premium',
    theme: 'violet',
    todayRevenue: 20800,
    todayOrders: 32,
    occupancyRate: 92,
    alertCount: 0,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 480, ceilingPrice: 880, currentPrice: 580, aiSuggestionPrice: 620, priceAdoptionRate: 90 },
    inventory: { totalRooms: 55, availableTonight: 4, occupiedTonight: 50, maintenanceRooms: 1, occupancyRate: 92, status: 'tight' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 20, impressions: 35000, clicks: 1750, inquiries: 280, conversions: 35, revenue: 20300, conversionRate: 2.00 },
      { platform: 'wechat', contentCount: 15, impressions: 25000, clicks: 1250, inquiries: 180, conversions: 22, revenue: 12760, conversionRate: 1.76 },
      { platform: 'xianyu', contentCount: 10, impressions: 15000, clicks: 600, inquiries: 90, conversions: 10, revenue: 5800, conversionRate: 1.67 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-07-10T09:00:00Z', score: 98 },
  },
  {
    id: 'hotel_005',
    name: '杭州西湖店',
    region: '华东区',
    brand: '希遇精选',
    manager: '林娜',
    roomCount: 40,
    status: 'active',
    gmv: 520000,
    revpar: 450,
    occupancy: 88,
    adr: 520,
    nonStandardRatio: 22,
    healthScore: 90,
    healthLevel: 'healthy',
    city: '杭州',
    type: 'city',
    tier: 'premium',
    theme: 'cyan',
    todayRevenue: 16640,
    todayOrders: 26,
    occupancyRate: 88,
    alertCount: 0,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 380, ceilingPrice: 680, currentPrice: 480, aiSuggestionPrice: 520, priceAdoptionRate: 88 },
    inventory: { totalRooms: 40, availableTonight: 5, occupiedTonight: 33, maintenanceRooms: 2, occupancyRate: 88, status: 'tight' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 18, impressions: 30000, clicks: 1500, inquiries: 240, conversions: 28, revenue: 14560, conversionRate: 1.87 },
      { platform: 'wechat', contentCount: 12, impressions: 20000, clicks: 1000, inquiries: 150, conversions: 18, revenue: 9360, conversionRate: 1.80 },
      { platform: 'xianyu', contentCount: 8, impressions: 12000, clicks: 480, inquiries: 72, conversions: 8, revenue: 4160, conversionRate: 1.67 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-07-15T11:00:00Z', score: 92 },
  },
  {
    id: 'hotel_006',
    name: '苏州园林店',
    region: '华东区',
    brand: '希遇文化',
    manager: '周文',
    roomCount: 30,
    status: 'active',
    gmv: 380000,
    revpar: 380,
    occupancy: 84,
    adr: 460,
    nonStandardRatio: 28,
    healthScore: 86,
    healthLevel: 'healthy',
    city: '苏州',
    type: 'tourist',
    tier: 'comfort',
    theme: 'amber',
    todayRevenue: 11040,
    todayOrders: 18,
    occupancyRate: 84,
    alertCount: 1,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 320, ceilingPrice: 580, currentPrice: 420, aiSuggestionPrice: 460, priceAdoptionRate: 82 },
    inventory: { totalRooms: 30, availableTonight: 5, occupiedTonight: 24, maintenanceRooms: 1, occupancyRate: 84, status: 'normal' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 15, impressions: 25000, clicks: 1000, inquiries: 150, conversions: 16, revenue: 7360, conversionRate: 1.60 },
      { platform: 'wechat', contentCount: 10, impressions: 15000, clicks: 600, inquiries: 90, conversions: 10, revenue: 4600, conversionRate: 1.67 },
      { platform: 'xianyu', contentCount: 6, impressions: 8000, clicks: 240, inquiries: 40, conversions: 4, revenue: 1840, conversionRate: 1.67 },
    ],
    aiAdoption: { content: true, service: true, pricing: false },
    training: { completed: true, completedAt: '2025-08-01T10:00:00Z', score: 85 },
  },
  // 华南区
  {
    id: 'hotel_007',
    name: '深圳湾店',
    region: '华南区',
    brand: '希遇商务',
    manager: '黄强',
    roomCount: 50,
    status: 'active',
    gmv: 580000,
    revpar: 420,
    occupancy: 90,
    adr: 480,
    nonStandardRatio: 25,
    healthScore: 90,
    healthLevel: 'healthy',
    city: '深圳',
    type: 'city',
    tier: 'comfort',
    theme: 'cyan',
    todayRevenue: 19200,
    todayOrders: 30,
    occupancyRate: 90,
    alertCount: 0,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 380, ceilingPrice: 680, currentPrice: 480, aiSuggestionPrice: 520, priceAdoptionRate: 85 },
    inventory: { totalRooms: 50, availableTonight: 5, occupiedTonight: 43, maintenanceRooms: 2, occupancyRate: 90, status: 'tight' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 14, impressions: 22000, clicks: 1100, inquiries: 165, conversions: 20, revenue: 9600, conversionRate: 1.82 },
      { platform: 'wechat', contentCount: 12, impressions: 18000, clicks: 900, inquiries: 120, conversions: 15, revenue: 7200, conversionRate: 1.67 },
      { platform: 'xianyu', contentCount: 8, impressions: 10000, clicks: 400, inquiries: 60, conversions: 7, revenue: 3360, conversionRate: 1.75 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-08-10T14:00:00Z', score: 90 },
  },
  {
    id: 'hotel_008',
    name: '广州天河店',
    region: '华南区',
    brand: '希遇商务',
    manager: '吴丽',
    roomCount: 45,
    status: 'warning',
    gmv: 400000,
    revpar: 350,
    occupancy: 78,
    adr: 450,
    nonStandardRatio: 32,
    healthScore: 78,
    healthLevel: 'warning',
    city: '广州',
    type: 'city',
    tier: 'comfort',
    theme: 'cyan',
    todayRevenue: 12600,
    todayOrders: 20,
    occupancyRate: 78,
    alertCount: 2,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 320, ceilingPrice: 580, currentPrice: 400, aiSuggestionPrice: 440, priceAdoptionRate: 70 },
    inventory: { totalRooms: 45, availableTonight: 10, occupiedTonight: 33, maintenanceRooms: 2, occupancyRate: 78, status: 'normal' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 10, impressions: 16000, clicks: 640, inquiries: 96, conversions: 10, revenue: 4500, conversionRate: 1.56 },
      { platform: 'wechat', contentCount: 8, impressions: 12000, clicks: 480, inquiries: 64, conversions: 8, revenue: 3600, conversionRate: 1.67 },
      { platform: 'xianyu', contentCount: 5, impressions: 7000, clicks: 210, inquiries: 35, conversions: 4, revenue: 1800, conversionRate: 1.90 },
    ],
    aiAdoption: { content: true, service: false, pricing: false },
    training: { completed: true, completedAt: '2025-08-05T09:00:00Z', score: 78 },
  },
  // 华西区
  {
    id: 'hotel_009',
    name: '成都春熙路店',
    region: '华西区',
    brand: '希遇精选',
    manager: '郑华',
    roomCount: 42,
    status: 'active',
    gmv: 420000,
    revpar: 380,
    occupancy: 82,
    adr: 470,
    nonStandardRatio: 30,
    healthScore: 85,
    healthLevel: 'healthy',
    city: '成都',
    type: 'city',
    tier: 'comfort',
    theme: 'amber',
    todayRevenue: 13440,
    todayOrders: 22,
    occupancyRate: 82,
    alertCount: 1,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    pricing: { currentMode: 'dynamic', floorPrice: 320, ceilingPrice: 580, currentPrice: 420, aiSuggestionPrice: 460, priceAdoptionRate: 75 },
    inventory: { totalRooms: 42, availableTonight: 8, occupiedTonight: 32, maintenanceRooms: 2, occupancyRate: 82, status: 'normal' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 12, impressions: 20000, clicks: 800, inquiries: 120, conversions: 14, revenue: 6580, conversionRate: 1.75 },
      { platform: 'wechat', contentCount: 10, impressions: 15000, clicks: 600, inquiries: 85, conversions: 10, revenue: 4700, conversionRate: 1.67 },
      { platform: 'xianyu', contentCount: 6, impressions: 8000, clicks: 240, inquiries: 40, conversions: 5, revenue: 2350, conversionRate: 2.08 },
    ],
    aiAdoption: { content: true, service: true, pricing: true },
    training: { completed: true, completedAt: '2025-08-12T10:00:00Z', score: 88 },
  },
  {
    id: 'hotel_010',
    name: '西安古城墙店',
    region: '华西区',
    brand: '希遇文化',
    manager: '马超',
    roomCount: 38,
    status: 'inactive',
    gmv: 300000,
    revpar: 320,
    occupancy: 72,
    adr: 450,
    nonStandardRatio: 38,
    healthScore: 72,
    healthLevel: 'critical',
    city: '西安',
    type: 'tourist',
    tier: 'economy',
    theme: 'amber',
    todayRevenue: 9120,
    todayOrders: 14,
    occupancyRate: 72,
    alertCount: 3,
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    pricing: { currentMode: 'clearance', floorPrice: 280, ceilingPrice: 520, currentPrice: 360, aiSuggestionPrice: 400, priceAdoptionRate: 55 },
    inventory: { totalRooms: 38, availableTonight: 11, occupiedTonight: 24, maintenanceRooms: 3, occupancyRate: 72, status: 'abundant' },
    platformMetrics: [
      { platform: 'xiaohongshu', contentCount: 8, impressions: 12000, clicks: 360, inquiries: 50, conversions: 5, revenue: 2250, conversionRate: 1.39 },
      { platform: 'wechat', contentCount: 6, impressions: 8000, clicks: 240, inquiries: 35, conversions: 4, revenue: 1800, conversionRate: 1.67 },
      { platform: 'xianyu', contentCount: 4, impressions: 5000, clicks: 125, inquiries: 20, conversions: 2, revenue: 900, conversionRate: 1.60 },
    ],
    aiAdoption: { content: false, service: false, pricing: false },
    training: { completed: false },
  },
];

// ============================================
// 策略规则
// ============================================

export const sharedStrategyRules = [
  {
    id: 'rule-001',
    customerId: 'group_001',
    name: '集团最低限价策略',
    ruleType: 'min_price' as const,
    hotelIds: sharedHotels.map(h => h.id),
    conditions: { occupancyRange: { min: 0, max: 100 } },
    action: { type: 'min_price_limit' as const, value: 280 },
    priority: 90,
    enabled: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    description: '集团所有门店标准间不得低于280元',
  },
  {
    id: 'rule-002',
    customerId: 'group_001',
    name: '节假日折扣限制',
    ruleType: 'max_discount' as const,
    hotelIds: sharedHotels.map(h => h.id),
    conditions: { dateRange: { start: '2024-01-01', end: '2024-12-31' } },
    action: { type: 'max_discount_limit' as const, value: 15 },
    priority: 85,
    enabled: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
    description: '节假日期间折扣不得超过15%',
  },
  {
    id: 'rule-003',
    customerId: 'group_001',
    name: 'OTA库存保留',
    ruleType: 'inventory_reserve' as const,
    hotelIds: sharedHotels.slice(0, 5).map(h => h.id),
    conditions: { occupancyRange: { min: 0, max: 70 } },
    action: { type: 'inventory_reserve' as const, value: 30 },
    priority: 80,
    enabled: true,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    description: '低入住率时保留30%库存给OTA',
  },
];

// ============================================
// 客户成功相关数据
// ============================================

export const sharedCustomerProfile = {
  contactName: '张总',
  contactPhone: '13800138001',
  contactEmail: 'ceo@xiyu-group.com',
  contactTitle: '集团CEO',
  decisionChain: [
    { name: '张总', role: '集团CEO', contact: '13800138001' },
    { name: '李总监', role: '运营总监', contact: '13900139001' },
    { name: '王经理', role: '技术经理', contact: '13700137001' },
  ],
  contractValue: 360000,
  renewalDate: '2026-06-01',
  salesRep: '赵强',
  notes: '全国性连锁酒店集团，重视数字化转型，对AI功能接受度高',
  healthScore: 88,
};

// ============================================
// 工单数据
// ============================================

export const sharedTickets = [
  {
    id: 'TKT-G001',
    customerId: 'group_001',
    customerType: 'group',
    isGroupLevel: true,
    affectedHotelIds: sharedHotels.slice(0, 3).map(h => h.id),
    title: '集团报表数据异常',
    description: '发现集团维度的GMV统计数据与实际不符，需核查',
    priority: 'high',
    status: 'open',
    assignedTo: '技术支持-李工',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'TKT-G002',
    customerId: 'group_001',
    customerType: 'group',
    isGroupLevel: true,
    affectedHotelIds: ['hotel_003'],
    title: '崇礼滑雪店培训需求',
    description: '新店长上任，需要系统培训',
    priority: 'medium',
    status: 'processing',
    assignedTo: '客户成功-小王',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'TKT-003',
    customerId: 'group_001',
    hotelId: 'hotel_010',
    title: '西安古城墙店流量下降',
    description: '近一周订单量下降30%，需要运营介入分析',
    priority: 'urgent',
    status: 'open',
    assignedTo: '运营支持-小张',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

// ============================================
// 辅助函数
// ============================================

export function getSharedHotelById(id: string) {
  return sharedHotels.find(h => h.id === id);
}

export function getSharedHotelsByRegion(region: string) {
  return sharedHotels.filter(h => h.region === region);
}

export function getSharedHotelsByStatus(status: SharedHotel['status']) {
  return sharedHotels.filter(h => h.status === status);
}

export function getSharedStats() {
  const totalGMV = sharedHotels.reduce((sum, h) => sum + h.gmv, 0);
  const avgOccupancy = sharedHotels.reduce((sum, h) => sum + h.occupancy, 0) / sharedHotels.length;
  const avgHealthScore = sharedHotels.reduce((sum, h) => sum + h.healthScore, 0) / sharedHotels.length;
  
  return {
    hotelCount: sharedHotels.length,
    regionCount: sharedRegions.length,
    totalGMV,
    avgOccupancy: Math.round(avgOccupancy),
    avgHealthScore: Math.round(avgHealthScore),
    activeHotels: sharedHotels.filter(h => h.status === 'active').length,
    warningHotels: sharedHotels.filter(h => h.status === 'warning').length,
    criticalHotels: sharedHotels.filter(h => h.status === 'critical').length,
  };
}
