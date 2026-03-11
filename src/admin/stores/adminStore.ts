/**
 * Admin Store - SaaS运营后台状态管理
 * 与酒店端数据模型对齐
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAdminTicketSync } from '@/services/ticketSync';
import { getAdminRefundSync } from '@/services/refundSync';
import { getAdminSync, isContentMessage } from '@/services/unifiedSync';
import type { 
  PricingAlgorithmTemplate, 
  HotelPricingProfile, 
  PricingSuggestion 
} from '@/types';
import { defaultPricingTemplates } from '../data/defaultPricingTemplates';
// 共享集团数据 - 与 group 端统一
import {
  sharedGroup,
  sharedRegions,
  sharedHotels,
  sharedStrategyRules,
  sharedCustomerProfile,
  type SharedHotel,
} from '@/shared/groupData';

// ============================================
// 类型定义 - 与酒店端对齐
// ============================================

export type CustomerStatus = 'trial' | 'active' | 'suspended' | 'expired';
export type CustomerTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type CustomerType = 'single' | 'group'; // 单体酒店 vs 集团客户
export type Platform = 'xianyu' | 'xiaohongshu' | 'wechat';
export type HotelType = 'city' | 'suburb' | 'tourist';
export type PricingMode = 'scalper' | 'dynamic' | 'clearance';

// 房型定义 - 与酒店端对齐
export interface RoomType {
  id: string;
  name: string;
  floorPrice: number;
  ceilingPrice: number;
  currentPrice: number;
  totalInventory: number;
  otaAllocation: number;
  flexibleAllocation: number;
}

// 渠道投放数据
export interface PlatformMetrics {
  platform: Platform;
  contentCount: number;      // 发布内容数
  impressions: number;       // 曝光量
  clicks: number;           // 点击量
  inquiries: number;        // 咨询量
  conversions: number;      // 转化订单数
  revenue: number;          // 渠道收入
  conversionRate: number;   // 转化率
}

// 库存池状态
export interface InventoryPool {
  ota: {
    total: number;
    sold: number;
    available: number;
    sellThroughRate: number;  // 售罄率
  };
  flexible: {
    total: number;
    sold: number;
    available: number;
    maxAllocation: number;    // 投放上限
    platforms: Record<Platform, {
      allocated: number;
      sold: number;
      available: number;
    }>;
  };
}

// 培训数据
export interface TrainingData {
  completed: boolean;
  completedAt?: string;
  score?: number;
}

// AI功能采用数据
export interface AIFeatureAdoption {
  content: boolean;      // 内容创作功能
  service: boolean;      // AI客服功能
  pricing: boolean;      // 智能定价功能
}

// 酒店数据 - 与酒店端关联
export interface HotelData {
  id: string;                    // 与酒店端 hotel.id 对应
  name: string;
  type: HotelType;
  tier: 'economy' | 'comfort' | 'premium';
  city: string;
  theme: 'cyan' | 'violet' | 'amber';
  roomTypes: RoomType[];
  inventory: InventoryPool;
  platformMetrics: PlatformMetrics[];
  todayRevenue: number;
  todayOrders: number;
  occupancyRate: number;
  currentMode: PricingMode;
  competitorAvgPrice: number;
  alertCount: number;
  // 客户成功维度
  training: TrainingData;
  aiAdoption: AIFeatureAdoption;
  lastLoginAt: string;
}

// 策略规则类型
export type StrategyRuleType = 'min_price' | 'max_discount' | 'inventory_reserve' | 'channel_priority';

// 策略规则
export interface GroupStrategyRule {
  id: string;
  customerId: string;
  name: string;                  // 规则名称
  ruleType: StrategyRuleType;
  hotelIds: string[];            // 适用门店
  conditions: {                  // 触发条件
    dateRange?: { start: string; end: string };
    occupancyRange?: { min: number; max: number };
    dayOfWeek?: number[];        // 0-6, 周日到周六
  };
  action: {                      // 执行动作
    type: string;
    value: number | string;
  };
  priority: number;              // 优先级 1-100
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

// 集团档案（仅集团客户有）
export interface GroupProfile {
  groupId: string;               // 集团唯一ID
  name: string;                  // 集团名称
  contactPerson: string;         // 集团对接人
  contactTitle?: string;         // 对接人职位
  contactPhone: string;
  contactEmail: string;
  regionCount: number;           // 区域数量
  totalRoomCount: number;        // 总房间数
  contractValue: number;         // 合同金额
  renewalDate: string;           // 续约日期
  decisionChain: {               // 决策链
    name: string;
    role: string;
    contact: string;
  }[];
  regions?: {                    // 区域信息（可选）
    id: string;
    name: string;
    manager: string;
    hotelIds: string[];
  }[];
  strategyRules?: GroupStrategyRule[]; // 策略规则
}

// 客户（酒店集团/单店）
export interface Customer {
  id: string;
  tenantId: string;              // SaaS租户ID
  type: CustomerType;            // 客户类型：单体/集团
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  tier: CustomerTier;
  status: CustomerStatus;
  hotelIds: string[];            // 关联的酒店ID列表
  hotels: HotelData[];           // 酒店详细数据
  totalRevenue: number;          // 累计GMV
  monthlyRevenue: number;        // 月GMV
  totalOrders: number;
  createdAt: string;
  expireAt: string;
  salesRep: string;
  notes?: string;
  // 集团客户特有
  groupProfile?: GroupProfile;
  // 客户成功维度
  healthScore?: number;          // 客户健康度评分（0-100）
  lastContactAt?: string;        // 最后联系时间
  nextContactAt?: string;        // 下次联系时间（续约前）
}

// 内容审核项
export interface ContentItem {
  id: string;
  hotelId: string;
  hotelName: string;
  platform: Platform;
  title: string;
  content?: string;
  price: number;
  author: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'takedown';
  aiScore?: number;           // AI内容评分 0-100
  createdAt: string;
  reviewedAt?: string;
  
  // === 私域内容扩展字段（新增）===
  contentType?: 'image' | 'video' | 'text';
  subtype?: 'moments' | 'group' | 'private' | 'channels';
  
  // 群运营脚本
  groupScript?: {
    title: string;
    content: string;
    atAll: boolean;
    type: 'welcome' | 'announcement' | 'flashsale' | 'interaction' | 'daily';
  };
  
  // 私聊话术
  privateScript?: {
    title: string;
    content: string;
    type: 'welcome' | 'booking' | 'reminder' | 'followup' | 'rebooking';
  };
  
  // 视频脚本
  videoScript?: {
    totalDuration: number;
    scenes: {
      id: number;
      startTime: number;
      endTime: number;
      shot: string;
      subtitle: string;
    }[];
    materials: {
      type: 'photo' | 'video' | 'screenshot';
      description: string;
      count: number;
    }[];
    bgmRecommendation: string;
    shootingTips: string[];
  };
  
  // 配图
  images?: string[];
  
  // === 后发监控字段 ===
  // 实时数据（兼容 Hotel 端的 performance 字段名）
  stats?: {
    impressions: number;      // 曝光量（公域）
    clicks: number;           // 点击量（公域）
    inquiries: number;        // 咨询量（公域）
    conversions: number;      // 转化订单数（公域）
    ctr?: number;             // 点击率（公域）
    conversionRate?: number;  // 转化率（公域）
    // === 私域专属指标（新增）===
    touches?: number;         // 触达客户数（私域）
    replies?: number;         // 回复数（私域）
    privateConversions?: number; // 私域成交数（私域）
    updateTime?: string;      // 数据更新时间（可选，兼容 Hotel 端）
  };
  
  // 兼容 Hotel 端的字段名（用于数据转换）
  performance?: {
    impressions: number;
    clicks: number;
    inquiries: number;
    conversions: number;
    touches?: number;
    replies?: number;
    privateConversions?: number;
  };
  
  // 异常标记
  anomalies?: {
    type: 'exposure_spike' | 'exposure_drop' | 'complaint' | 'price_abnormal' | 'sensitive_word';
    level: 'high' | 'medium' | 'low';
    message: string;
    detectedAt: string;
  }[];
  
  // 投诉/举报
  reports?: {
    id: string;
    type: 'spam' | 'misleading' | 'inappropriate' | 'copyright' | 'other';
    description: string;
    reporter: string;
    createdAt: string;
    status: 'pending' | 'processed';
  }[];
  
  // 下架记录
  takedown?: {
    reason: string;
    operator: string;
    time: string;
    appealStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  };
}

// 工单
export type TicketType = 'tech' | 'business' | 'consult';
export type TicketStatus = 'open' | 'processing' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  sender: 'hotel' | 'admin';
  senderName: string;
  content: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  hotelId: string;
  hotelName: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  source: 'hotel' | 'admin' | 'group' | 'manual';
  tags: string[];
  messages: TicketMessage[];
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  // 评价字段
  rating?: number;                          // 整体满意度 1-5星
  responseSpeed?: 'fast' | 'normal' | 'slow';  // 响应速度
  resolutionEffect?: 'full' | 'partial' | 'none';  // 解决效果
  ratingTags?: string[];                    // 评价标签
  feedback?: string;                        // 文字反馈
  // 催促（催单）
  urgentCount?: number;                     // 催促次数
  lastUrgentAt?: string;                    // 最后催促时间
  // 已读回执
  readByAdminAt?: string;                   // 运营首次查看时间
  lastReadAt?: string;                      // 最后查看时间
  // 联系方式
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  // 集团工单标记（Phase 2 新增）
  customerId?: string;           // 关联的客户ID
  customerType?: 'single' | 'group'; // 客户类型
  isGroupLevel?: boolean;        // 是否为集团级工单（影响多个门店）
  affectedHotelIds?: string[];   // 受影响的门店ID列表
}

// 平台级统计数据
export interface PlatformStats {
  totalRevenue: number;
  mrr: number;
  arr: number;
  totalCustomers: number;
  activeCustomers: number;
  trialCustomers: number;
  totalHotels: number;
  activeHotels: number;
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  
  // 非标渠道聚合数据
  platformBreakdown: Record<Platform, {
    contentCount: number;
    revenue: number;
    orders: number;
    conversionRate: number;
  }>;
  
  // 渠道占比
  channelDistribution: {
    ota: number;        // OTA渠道占比
    flexible: number;   // 非标渠道占比
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  hotelId?: string;
  createdAt: string;
  read: boolean;
}

// ============================================
// Mock 数据生成 - 基于酒店端3家酒店
// ============================================

const mockHotels: HotelData[] = [
  {
    id: 'sanlitun',
    name: '三里屯潮流酒店',
    type: 'city',
    tier: 'comfort',
    city: '北京',
    theme: 'cyan',
    roomTypes: [
      { id: 'budget-no-window', name: '经济特价房(无窗)', floorPrice: 150, ceilingPrice: 280, currentPrice: 215, totalInventory: 15, otaAllocation: 12, flexibleAllocation: 3 },
      { id: 'standard-room', name: '舒适标准房', floorPrice: 260, ceilingPrice: 420, currentPrice: 340, totalInventory: 35, otaAllocation: 28, flexibleAllocation: 7 },
      { id: 'luxury-suite', name: '行政豪华套房', floorPrice: 450, ceilingPrice: 680, currentPrice: 565, totalInventory: 8, otaAllocation: 6, flexibleAllocation: 2 },
    ],
    inventory: {
      ota: { total: 46, sold: 32, available: 14, sellThroughRate: 69.6 },
      flexible: {
        total: 12,
        sold: 8,
        available: 4,
        maxAllocation: 12,
        platforms: {
          xianyu: { allocated: 5, sold: 4, available: 1 },
          xiaohongshu: { allocated: 4, sold: 2, available: 2 },
          wechat: { allocated: 3, sold: 2, available: 1 },
        },
      },
    },
    platformMetrics: [
      { platform: 'xianyu', contentCount: 12, impressions: 15420, clicks: 892, inquiries: 156, conversions: 18, revenue: 6120, conversionRate: 2.02 },
      { platform: 'xiaohongshu', contentCount: 8, impressions: 23100, clicks: 1456, inquiries: 234, conversions: 12, revenue: 7560, conversionRate: 0.82 },
      { platform: 'wechat', contentCount: 6, impressions: 8930, clicks: 445, inquiries: 67, conversions: 8, revenue: 5480, conversionRate: 1.80 },
    ],
    todayRevenue: 9520,
    todayOrders: 12,
    occupancyRate: 78,
    currentMode: 'dynamic',
    competitorAvgPrice: 365,
    alertCount: 2,
    training: { completed: true, completedAt: '2025-12-15T10:00:00Z', score: 92 },
    aiAdoption: { content: true, service: true, pricing: true },
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
  },
  {
    id: 'chongli',
    name: '崇礼星空酒店',
    type: 'suburb',
    tier: 'comfort',
    city: '张家口',
    theme: 'violet',
    roomTypes: [
      { id: 'dorm-bed', name: '雪场青旅床位', floorPrice: 80, ceilingPrice: 150, currentPrice: 115, totalInventory: 30, otaAllocation: 24, flexibleAllocation: 6 },
      { id: 'mountain-view', name: '雪山标准间', floorPrice: 240, ceilingPrice: 420, currentPrice: 330, totalInventory: 25, otaAllocation: 20, flexibleAllocation: 5 },
      { id: 'star-suite', name: '星空观景套房', floorPrice: 480, ceilingPrice: 780, currentPrice: 630, totalInventory: 6, otaAllocation: 4, flexibleAllocation: 2 },
    ],
    inventory: {
      ota: { total: 48, sold: 36, available: 12, sellThroughRate: 75.0 },
      flexible: {
        total: 13,
        sold: 10,
        available: 3,
        maxAllocation: 10,
        platforms: {
          xianyu: { allocated: 4, sold: 4, available: 0 },
          xiaohongshu: { allocated: 3, sold: 3, available: 0 },
          wechat: { allocated: 3, sold: 3, available: 0 },
        },
      },
    },
    platformMetrics: [
      { platform: 'xianyu', contentCount: 15, impressions: 22100, clicks: 1234, inquiries: 245, conversions: 22, revenue: 10890, conversionRate: 1.78 },
      { platform: 'xiaohongshu', contentCount: 10, impressions: 18650, clicks: 987, inquiries: 178, conversions: 15, revenue: 9450, conversionRate: 1.52 },
      { platform: 'wechat', contentCount: 8, impressions: 12400, clicks: 620, inquiries: 98, conversions: 10, revenue: 6300, conversionRate: 1.61 },
    ],
    todayRevenue: 12840,
    todayOrders: 18,
    occupancyRate: 85,
    currentMode: 'scalper',
    competitorAvgPrice: 420,
    alertCount: 1,
    training: { completed: true, completedAt: '2025-11-20T14:30:00Z', score: 88 },
    aiAdoption: { content: true, service: false, pricing: true },
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2天前
  },
  {
    id: 'dali',
    name: '大理洱海酒店',
    type: 'tourist',
    tier: 'comfort',
    city: '大理',
    theme: 'amber',
    roomTypes: [
      { id: 'courtyard-budget', name: '庭院经济房(背街)', floorPrice: 160, ceilingPrice: 280, currentPrice: 220, totalInventory: 15, otaAllocation: 12, flexibleAllocation: 3 },
      { id: 'lake-view-standard', name: '湖景标准房', floorPrice: 280, ceilingPrice: 480, currentPrice: 380, totalInventory: 25, otaAllocation: 20, flexibleAllocation: 5 },
      { id: 'erhai-premium-suite', name: '洱海全景豪华套房', floorPrice: 520, ceilingPrice: 850, currentPrice: 685, totalInventory: 6, otaAllocation: 4, flexibleAllocation: 2 },
    ],
    inventory: {
      ota: { total: 36, sold: 22, available: 14, sellThroughRate: 61.1 },
      flexible: {
        total: 10,
        sold: 5,
        available: 5,
        maxAllocation: 8,
        platforms: {
          xianyu: { allocated: 3, sold: 2, available: 1 },
          xiaohongshu: { allocated: 3, sold: 2, available: 1 },
          wechat: { allocated: 2, sold: 1, available: 1 },
        },
      },
    },
    platformMetrics: [
      { platform: 'xianyu', contentCount: 9, impressions: 18900, clicks: 945, inquiries: 156, conversions: 14, revenue: 9590, conversionRate: 1.48 },
      { platform: 'xiaohongshu', contentCount: 12, impressions: 28400, clicks: 1567, inquiries: 289, conversions: 18, revenue: 12330, conversionRate: 1.15 },
      { platform: 'wechat', contentCount: 7, impressions: 15600, clicks: 780, inquiries: 124, conversions: 9, revenue: 6165, conversionRate: 1.15 },
    ],
    todayRevenue: 11280,
    todayOrders: 15,
    occupancyRate: 72,
    currentMode: 'clearance',
    competitorAvgPrice: 395,
    alertCount: 0,
    training: { completed: false },
    aiAdoption: { content: true, service: false, pricing: false },
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), // 8天前
  },
];

// ============================================
// 共享集团数据转换 - 与 group 端统一
// ============================================

/** 将 SharedHotel 转换为 HotelData (管理端格式) */
function convertSharedHotelToHotelData(shared: SharedHotel): HotelData {
  return {
    id: shared.id,
    name: shared.name,
    type: shared.type,
    tier: shared.tier,
    city: shared.city,
    theme: shared.theme,
    roomTypes: [
      { 
        id: 'standard', 
        name: '标准房', 
        floorPrice: shared.pricing.floorPrice, 
        ceilingPrice: shared.pricing.ceilingPrice, 
        currentPrice: shared.pricing.currentPrice, 
        totalInventory: Math.floor(shared.roomCount * 0.7), 
        otaAllocation: Math.floor(shared.roomCount * 0.6), 
        flexibleAllocation: Math.floor(shared.roomCount * 0.1) 
      },
    ],
    inventory: {
      ota: { 
        total: shared.inventory.occupiedTonight + shared.inventory.availableTonight, 
        sold: shared.inventory.occupiedTonight, 
        available: shared.inventory.availableTonight, 
        sellThroughRate: shared.inventory.occupancyRate 
      },
      flexible: { 
        total: Math.floor(shared.roomCount * 0.1), 
        sold: Math.floor(shared.roomCount * 0.1 * 0.6), 
        available: Math.floor(shared.roomCount * 0.1 * 0.4), 
        maxAllocation: Math.floor(shared.roomCount * 0.1), 
        platforms: { 
          xianyu: { allocated: 2, sold: 1, available: 1 }, 
          xiaohongshu: { allocated: 2, sold: 1, available: 1 }, 
          wechat: { allocated: 1, sold: 1, available: 0 } 
        } 
      },
    },
    platformMetrics: shared.platformMetrics,
    todayRevenue: shared.todayRevenue,
    todayOrders: shared.todayOrders,
    occupancyRate: shared.occupancyRate,
    currentMode: shared.pricing.currentMode,
    competitorAvgPrice: shared.pricing.currentPrice + 50,
    alertCount: shared.alertCount,
    training: shared.training,
    aiAdoption: shared.aiAdoption,
    lastLoginAt: shared.lastLoginAt,
  };
}

/** 从共享数据生成集团酒店数据 */
const mockHotelsGroup: HotelData[] = sharedHotels.map(convertSharedHotelToHotelData);



const mockCustomers: Customer[] = [
  {
    id: 'CUST-001',
    tenantId: 'tenant-sanlitun',
    type: 'single',
    companyName: '三里屯潮流酒店',
    contactName: '张老板',
    contactPhone: '13800138001',
    contactEmail: 'zhang@sanlitun-hotel.com',
    tier: 'professional',
    status: 'active',
    hotelIds: ['sanlitun'],
    hotels: [mockHotels[0]],
    totalRevenue: 285000,
    monthlyRevenue: 28500,
    totalOrders: 48, // 与 generateHotelOrders 对齐
    createdAt: '2024-01-15',
    expireAt: '2026-12-31',
    salesRep: '李明',
    notes: '北京核心商圈酒店，非标渠道投放活跃',
    healthScore: 85,
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'CUST-002',
    tenantId: 'tenant-chongli',
    type: 'single',
    companyName: '崇礼星空酒店',
    contactName: '王经理',
    contactPhone: '13900139002',
    contactEmail: 'wang@chongli-ski.com',
    tier: 'enterprise',
    status: 'active',
    hotelIds: ['chongli'],
    hotels: [mockHotels[1]],
    totalRevenue: 168000,
    monthlyRevenue: 16800,
    totalOrders: 48, // 与 generateHotelOrders 对齐
    createdAt: '2024-03-20',
    expireAt: '2026-03-15',  // 调整为未来60天内，使续约日历有数据
    salesRep: '赵强',
    notes: '滑雪场周边，冬季旺季模式',
    healthScore: 78,
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'CUST-003',
    tenantId: 'tenant-dali',
    type: 'single',
    companyName: '大理洱海酒店',
    contactName: '陈女士',
    contactPhone: '13700137003',
    contactEmail: 'chen@dali-erhai.com',
    tier: 'professional',
    status: 'active',
    hotelIds: ['dali'],
    hotels: [mockHotels[2]],
    totalRevenue: 192000,
    monthlyRevenue: 19200,
    totalOrders: 48, // 与 generateHotelOrders 对齐
    createdAt: '2024-02-10',
    expireAt: '2026-09-30',
    salesRep: '李明',
    notes: '洱海边民宿，小红书渠道表现优异',
    healthScore: 72,
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  // 新增：集团客户示例 - 使用与 group 端统一的共享数据
  {
    id: 'CUST-G001',
    tenantId: `tenant-${sharedGroup.id}`,
    type: 'group',
    companyName: sharedGroup.name,  // '希遇酒店集团'
    contactName: sharedCustomerProfile.contactName,
    contactPhone: sharedCustomerProfile.contactPhone,
    contactEmail: sharedCustomerProfile.contactEmail,
    tier: 'enterprise',
    status: 'active',
    hotelIds: sharedHotels.map(h => h.id),
    hotels: mockHotelsGroup,  // 10家门店
    totalRevenue: sharedHotels.reduce((sum, h) => sum + h.gmv, 0),
    monthlyRevenue: Math.round(sharedHotels.reduce((sum, h) => sum + h.gmv, 0) / 12),
    totalOrders: Math.round(sharedHotels.reduce((sum, h) => sum + h.gmv, 0) / 500),
    createdAt: '2023-06-01',
    expireAt: '2026-02-28',  // 调整为未来60天内，使续约日历有数据
    salesRep: sharedCustomerProfile.salesRep,
    notes: sharedCustomerProfile.notes,
    healthScore: sharedCustomerProfile.healthScore,
    lastContactAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    nextContactAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30天后续约
    groupProfile: {
      groupId: sharedGroup.id,  // 'group_001'
      name: sharedGroup.name,
      contactPerson: sharedCustomerProfile.contactName,
      contactTitle: '集团CEO',
      contactPhone: sharedCustomerProfile.contactPhone,
      contactEmail: sharedCustomerProfile.contactEmail,
      regionCount: sharedRegions.length,  // 4个区域
      totalRoomCount: sharedHotels.reduce((sum, h) => sum + h.roomCount, 0),
      contractValue: sharedCustomerProfile.contractValue,
      renewalDate: sharedCustomerProfile.renewalDate,
      decisionChain: sharedCustomerProfile.decisionChain,
      regions: sharedRegions.map(r => ({
        id: r.id,
        name: r.name,
        manager: r.manager,
        hotelIds: sharedHotels.filter(h => h.region === r.name).map(h => h.id),
      })),
      strategyRules: sharedStrategyRules.map(rule => ({
        ...rule,
        customerId: 'CUST-G001',
      })),
    },
  },
];

// ============================================
// 内容数据生成器 - 与酒店端对齐
// ============================================

// 为指定酒店生成内容数据
const generateContentItemsForHotel = (hotel: HotelData, count: number = 12): ContentItem[] => {
  const platforms: ('xianyu' | 'xiaohongshu' | 'wechat')[] = ['xianyu', 'xiaohongshu', 'wechat'];
  const contents: ContentItem[] = [];
  
  // 每个平台的内容模板
  const templates: Record<string, string[]> = {
    xianyu: [
      `【限时特惠】${hotel.name}舒适房，性价比之选`,
      `🏨 ${hotel.name}，出差首选`,
      `【周末特惠】${hotel.name}，家庭优选`,
      `🔥 限时抢购！${hotel.name}特价`,
    ],
    xiaohongshu: [
      `🏔️ ${hotel.name}住宿攻略｜实测分享`,
      `🌅 ${hotel.name}｜这家酒店无敌了`,
      `✨ ${hotel.name}打卡｜超出片`,
      `📸 ${hotel.name}｜旅行必住`,
    ],
    wechat: [
      `🔥 ${hotel.name}｜微信专属价`,
      `🎵 ${hotel.name}｜朋友圈同款`,
      `💫 ${hotel.name}｜沉浸式体验`,
      `✨ ${hotel.name}｜宝藏酒店`,
    ],
  };
  
  let contentId = 1;
  
  // 为每个平台生成内容
  platforms.forEach((platform) => {
    const platformTemplates = templates[platform];
    const platformCount = Math.floor(count / 3); // 每个平台平均分配
    
    for (let i = 0; i < platformCount; i++) {
      const template = platformTemplates[i % platformTemplates.length];
      const basePrice = hotel.roomTypes[0]?.currentPrice || 300;
      const price = basePrice + Math.floor(Math.random() * 100) - 50;
      
      // 生成合理的统计数据
      const impressions = 5000 + Math.floor(Math.random() * 15000);
      const clicks = Math.floor(impressions * (0.03 + Math.random() * 0.05));
      const inquiries = Math.floor(clicks * (0.1 + Math.random() * 0.15));
      const conversions = Math.floor(inquiries * (0.15 + Math.random() * 0.25));
      
      contents.push({
        id: `CNT-${hotel.id}-${String(contentId++).padStart(3, '0')}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        platform,
        title: template,
        price,
        author: hotel.id === 'sanlitun' ? '张老板' : hotel.id === 'chongli' ? '王经理' : '陈女士',
        status: 'approved',
        aiScore: 70 + Math.floor(Math.random() * 25),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        reviewedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        stats: {
          impressions,
          clicks,
          inquiries,
          conversions,
          ctr: parseFloat(((clicks / impressions) * 100).toFixed(2)),
          conversionRate: parseFloat(((conversions / clicks) * 100).toFixed(2)),
          updateTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
  });
  
  return contents;
};

// 基于 mockHotels 生成所有内容 - 每家酒店12条内容，与酒店端对齐
const mockContentItems: ContentItem[] = mockHotels.flatMap(hotel => 
  generateContentItemsForHotel(hotel, 12)
);


const mockTickets: Ticket[] = [
  {
    id: 'TKT-001',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    title: '闲鱼渠道库存同步失败',
    description: '从今早开始无法同步库存到闲鱼平台',
    type: 'tech',
    status: 'resolved',
    priority: 'high',
    source: 'hotel',
    tags: ['渠道', '闲鱼', '库存同步'],
    messages: [
      {
        id: 'MSG-001',
        sender: 'admin',
        senderName: '运营小李',
        content: '您好，已收到您的反馈。我们检查了系统日志，发现是闲鱼接口令牌过期导致的。已重新授权，请确认同步是否恢复正常。',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'MSG-002',
        sender: 'hotel',
        senderName: '张经理',
        content: '已验证，同步恢复正常了，谢谢！',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      }
    ],
    assignedTo: '李明',
    assignedToName: '运营小李',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    // 客户评价
    rating: 5,
    responseSpeed: 'fast',
    resolutionEffect: 'full',
    ratingTags: ['响应及时', '专业高效', '解决问题'],
    feedback: '处理速度很快，问题解决得也很彻底，感谢！',
    contactName: '张经理',
    contactPhone: '13800138001',
    contactEmail: 'zhang@sanlitun.com',
  },
  {
    id: 'TKT-002',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    title: '申请调整灵活库存上限',
    description: '滑雪旺季即将到来，希望增加灵活池投放量',
    type: 'business',
    status: 'processing',
    priority: 'medium',
    source: 'hotel',
    tags: ['库存', '投放策略'],
    messages: [
      {
        id: 'MSG-001',
        sender: 'admin',
        senderName: '运营小李',
        content: '您好，已收到您的申请，我们正在评估库存情况，预计今天下班前给您答复。',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      }
    ],
    assignedTo: '李明',
    assignedToName: '运营小李',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    contactName: '王店长',
    contactPhone: '13800138002',
  },
  {
    id: 'TKT-003',
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    title: '小红书内容审核咨询',
    description: '想了解如何优化内容提高转化率',
    type: 'consult',
    status: 'open',
    priority: 'low',
    source: 'hotel',
    tags: ['内容', '咨询'],
    messages: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    contactName: '李运营',
    contactEmail: 'li@dali.com',
  },
  // 集团工单（新增）- 使用与 group 端统一的共享数据
  {
    id: 'TKT-G001',
    hotelId: sharedHotels[4].id,  // 'hotel_005' 杭州西湖店
    hotelName: sharedHotels[4].name,
    title: '集团统一价格策略调整申请',
    description: '华东区申请调整集团最低限价策略，以适应春节旺季市场变化',
    type: 'business',
    status: 'open',
    priority: 'high',
    source: 'hotel',
    tags: ['集团策略', '价格调整'],
    messages: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    contactName: sharedHotels[4].manager,
    contactPhone: '13500135002',
    contactEmail: 'wang@xiyu-group.com',
    // 集团工单标记
    customerId: 'CUST-G001',
    customerType: 'group',
    isGroupLevel: true,
    affectedHotelIds: sharedHotels.slice(0, 3).map(h => h.id),
  },
  {
    id: 'TKT-G002',
    hotelId: sharedHotels[6].id,  // 'hotel_007' 深圳湾店
    hotelName: sharedHotels[6].name,
    title: '集团库存策略执行异常',
    description: '库存保留策略与平台建议产生冲突，需要运营协助处理',
    type: 'tech',
    status: 'processing',
    priority: 'urgent',
    source: 'manual',
    tags: ['集团策略', '库存', '冲突'],
    messages: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    assignedTo: '李明',
    assignedToName: '运营小李',
    contactName: sharedHotels[6].manager,
    contactPhone: '13500135003',
    contactEmail: 'huang@xiyu-group.com',
    // 集团工单标记
    customerId: 'CUST-G001',
    customerType: 'group',
    isGroupLevel: true,
    affectedHotelIds: [sharedHotels[6].id],
  },
];

const mockPlatformStats: PlatformStats = {
  totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalRevenue, 0),
  mrr: mockCustomers.reduce((sum, c) => sum + c.monthlyRevenue, 0),
  arr: mockCustomers.reduce((sum, c) => sum + c.monthlyRevenue, 0) * 12,
  totalCustomers: mockCustomers.length,
  activeCustomers: mockCustomers.filter(c => c.status === 'active').length,
  trialCustomers: 0,
  totalHotels: mockHotels.length,
  activeHotels: 3,
  totalOrders: mockCustomers.reduce((sum, c) => sum + c.totalOrders, 0),
  todayOrders: mockHotels.reduce((sum, h) => sum + h.todayOrders, 0),
  todayRevenue: mockHotels.reduce((sum, h) => sum + h.todayRevenue, 0),
  platformBreakdown: {
    xianyu: {
      contentCount: 36,
      revenue: 21000,
      orders: 48,
      conversionRate: 1.76,
    },
    xiaohongshu: {
      contentCount: 30,
      revenue: 18000,
      orders: 48,
      conversionRate: 1.16,
    },
    wechat: {
      contentCount: 21,
      revenue: 12000,
      orders: 48,
      conversionRate: 1.52,
    },
  },
  channelDistribution: {
    ota: 65,
    flexible: 35,
  },
};

const mockNotifications: Notification[] = [
  {
    id: 'NOTIF-001',
    type: 'warning',
    title: '库存预警',
    message: '崇礼星空酒店灵活池库存已售罄',
    hotelId: 'chongli',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: 'NOTIF-002',
    type: 'success',
    title: '内容转化',
    message: '大理洱海酒店小红书内容转化率突破1.5%',
    hotelId: 'dali',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
  },
  {
    id: 'NOTIF-003',
    type: 'info',
    title: '新工单',
    message: '三里屯潮流酒店提交技术支持申请',
    hotelId: 'sanlitun',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true,
  },
];

// ============================================
// 财务合规中心类型定义
// ============================================

// OTA渠道对账
export type OTAChannel = 'ctrip' | 'meituan' | 'fliggy';
export type ReconciliationStatus = 'matched' | 'pending' | 'exception';
export type DifferenceType = 'amount_mismatch' | 'status_mismatch' | 'missing_order' | null;

export interface OTAOrder {
  id: string;
  channel: OTAChannel;
  externalOrderId: string;      // OTA平台订单号
  hotelId: string;
  hotelName: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  otaAmount: number;            // OTA平台金额
  systemAmount: number;         // 系统金额
  status: ReconciliationStatus;
  differenceType: DifferenceType;
  differenceAmount?: number;    // 差异金额
  otaStatus: string;            // OTA订单状态
  systemStatus: string;         // 系统订单状态
  createdAt: string;
  reconciledAt?: string;
  notes?: string;
}

// 发票管理
export type InvoiceStatus = 'pending' | 'issued' | 'mailed' | 'completed';
export type InvoiceType = 'electronic' | 'paper';

export interface Invoice {
  id: string;
  hotelId: string;
  hotelName: string;
  applicantName: string;
  applicantPhone: string;
  title: string;                // 发票抬头
  taxNumber: string;            // 税号
  amount: number;
  type: InvoiceType;
  status: InvoiceStatus;
  email?: string;               // 电子发票接收邮箱
  address?: string;             // 邮寄地址
  appliedAt: string;
  issuedAt?: string;
  mailedAt?: string;
  invoiceUrl?: string;          // 电子发票下载链接
  trackingNumber?: string;      // 快递单号
  remarks?: string;
}

// 退款审核
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
export type RefundReason = 'customer_cancel' | 'hotel_issue' | 'duplicate_order' | 'price_adjustment' | 'other';

export interface Refund {
  id: string;
  orderId: string;
  hotelId: string;
  hotelName: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  reason: RefundReason;
  reasonDetail: string;
  status: RefundStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  reviewNotes?: string;
  completedAt?: string;
  attachments?: string[];       // 附件图片
}

// 统一订单数据
export type OrderStatus = 'paid' | 'pending' | 'checked_in' | 'checked_out' | 'refunded' | 'disputed';
export type OrderPlatform = 'ota' | 'xianyu' | 'xiaohongshu' | 'wechat';

export interface Order {
  id: string;
  hotelId: string;
  hotelName: string;
  platform: OrderPlatform;
  roomType: string;
  guestName: string;
  guestPhone?: string;
  price: number;
  status: OrderStatus;
  createdAt: string;
  checkInDate: string;
  checkOutDate: string;
  hasComplaint?: boolean;
  refundAmount?: number;
  refundReason?: string;
  source: 'system' | 'ota'; // 区分系统订单和 OTA 对账订单
  otaOrderId?: string;      // OTA 订单号（如果是 OTA 订单）
  // 同步元数据
  syncedAt?: number;        // 同步时间戳
  syncedFrom?: string;      // 同步来源酒店ID
  isRealtimeGenerated?: boolean; // 是否实时推演生成
}

// 客户商务订单（客户与SaaS平台之间的订单）
export type CustomerOrderType = 'subscription' | 'renewal' | 'upgrade' | 'addon' | 'refund';
export type CustomerOrderStatus = 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'overdue';
export type PaymentMethod = 'bank_transfer' | 'alipay' | 'wechat_pay' | 'corporate';

export interface CustomerOrder {
  id: string;                    // 订单号
  customerId: string;            // 客户ID
  customerName: string;          // 客户名称
  type: CustomerOrderType;       // 订单类型
  status: CustomerOrderStatus;   // 订单状态
  amount: number;                // 订单金额
  paidAmount: number;            // 已支付金额
  periodStart?: string;          // 服务开始时间
  periodEnd?: string;            // 服务结束时间
  description: string;           // 订单描述
  items: {                       // 订单明细
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  paymentMethod?: PaymentMethod; // 支付方式
  paymentTime?: string;          // 支付时间
  invoiceId?: string;            // 关联发票ID
  invoiceStatus?: 'pending' | 'issued' | 'mailed' | 'completed';
  contractNo?: string;           // 合同编号
  salesRep: string;              // 销售负责人
  notes?: string;                // 备注
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
  dueDate?: string;              // 账期/到期日（用于催款）
  isOverdue: boolean;            // 是否逾期
  overdueDays: number;           // 逾期天数
}

// 财务统计
export interface FinanceStats {
  // 应收/已收/待收
  receivableThisMonth: number;   // 本月应收
  receivedThisMonth: number;     // 本月已收
  pendingReceipt: number;        // 本月待收
  // 发票
  invoiceAmountThisMonth: number; // 本月发票金额
  pendingInvoiceCount: number;    // 待开票数量
  // 退款
  pendingRefundAmount: number;    // 待处理退款金额
  pendingRefundCount: number;     // 待处理退款笔数
  // 对账
  reconciliationStats: {
    total: number;
    matched: number;
    pending: number;
    exception: number;
  };
}

// ============================================
// 系统设置类型定义
// ============================================

export type UserRole = 'super' | 'admin' | 'finance' | 'support';
export type OperationType = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'export' | 'approve' | 'reject';

// 系统用户
export interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'disabled';
  lastLoginAt: string;
  lastLoginIp: string;
  createdAt: string;
  avatar?: string;
}

// 权限配置
export interface PermissionConfig {
  module: string;
  actions: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    export: boolean;
  };
}

// 角色权限矩阵
export const rolePermissions: Record<UserRole, PermissionConfig[]> = {
  super: [
    { module: 'dashboard', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'customers', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'content', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'support', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'finance', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'system', actions: { view: true, create: true, update: true, delete: true, export: true } },
  ],
  admin: [
    { module: 'dashboard', actions: { view: true, create: true, update: true, delete: false, export: true } },
    { module: 'customers', actions: { view: true, create: true, update: true, delete: false, export: true } },
    { module: 'content', actions: { view: true, create: true, update: true, delete: true, export: true } },
    { module: 'support', actions: { view: true, create: true, update: true, delete: false, export: true } },
    { module: 'finance', actions: { view: true, create: false, update: false, delete: false, export: true } },
    { module: 'system', actions: { view: true, create: false, update: false, delete: false, export: false } },
  ],
  finance: [
    { module: 'dashboard', actions: { view: true, create: false, update: false, delete: false, export: true } },
    { module: 'customers', actions: { view: true, create: false, update: false, delete: false, export: true } },
    { module: 'content', actions: { view: false, create: false, update: false, delete: false, export: false } },
    { module: 'support', actions: { view: false, create: false, update: false, delete: false, export: false } },
    { module: 'finance', actions: { view: true, create: true, update: true, delete: false, export: true } },
    { module: 'system', actions: { view: false, create: false, update: false, delete: false, export: false } },
  ],
  support: [
    { module: 'dashboard', actions: { view: true, create: false, update: false, delete: false, export: false } },
    { module: 'customers', actions: { view: true, create: false, update: true, delete: false, export: false } },
    { module: 'content', actions: { view: true, create: true, update: true, delete: false, export: false } },
    { module: 'support', actions: { view: true, create: true, update: true, delete: false, export: true } },
    { module: 'finance', actions: { view: false, create: false, update: false, delete: false, export: false } },
    { module: 'system', actions: { view: false, create: false, update: false, delete: false, export: false } },
  ],
};

// 操作日志
export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  operation: OperationType;
  module: string;
  description: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

// 通知设置
export interface NotificationSettings {
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  types: {
    ticket: boolean;
    contentAnomaly: boolean;
    finance: boolean;
    system: boolean;
  };
  recipients: string[]; // 用户ID列表
}

// 系统基础配置
export interface SystemConfig {
  platformName: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  language: string;
}

// 模块mock数据
const mockSystemUsers: SystemUser[] = [
  {
    id: 'USER-001',
    username: 'admin',
    name: '系统管理员',
    email: 'admin@shadowbees.com',
    phone: '13800138000',
    role: 'super',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastLoginIp: '192.168.1.100',
    createdAt: '2024-01-01',
  },
  {
    id: 'USER-002',
    username: 'op01',
    name: '运营小李',
    email: 'op01@shadowbees.com',
    phone: '13800138001',
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    lastLoginIp: '192.168.1.101',
    createdAt: '2024-02-15',
  },
  {
    id: 'USER-003',
    username: 'finance01',
    name: '财务小张',
    email: 'finance01@shadowbees.com',
    phone: '13800138002',
    role: 'finance',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastLoginIp: '192.168.1.102',
    createdAt: '2024-03-01',
  },
  {
    id: 'USER-004',
    username: 'support01',
    name: '客服小王',
    email: 'support01@shadowbees.com',
    phone: '13800138003',
    role: 'support',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastLoginIp: '192.168.1.103',
    createdAt: '2024-03-15',
  },
  {
    id: 'USER-005',
    username: 'support02',
    name: '客服小陈',
    email: 'support02@shadowbees.com',
    phone: '13800138004',
    role: 'support',
    status: 'disabled',
    lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastLoginIp: '192.168.1.104',
    createdAt: '2024-04-01',
  },
];

const mockOperationLogs: OperationLog[] = [
  {
    id: 'LOG-001',
    userId: 'USER-001',
    username: '系统管理员',
    operation: 'login',
    module: 'system',
    description: '用户登录系统',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'LOG-002',
    userId: 'USER-002',
    username: '运营小李',
    operation: 'update',
    module: 'content',
    description: '更新内容审核状态: CNT-001',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'LOG-003',
    userId: 'USER-003',
    username: '财务小张',
    operation: 'approve',
    module: 'finance',
    description: '审批退款申请: REF-001',
    ip: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'LOG-004',
    userId: 'USER-004',
    username: '客服小王',
    operation: 'create',
    module: 'support',
    description: '创建工单: TKT-004',
    ip: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'LOG-005',
    userId: 'USER-002',
    username: '运营小李',
    operation: 'export',
    module: 'customers',
    description: '导出客户数据',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'LOG-006',
    userId: 'USER-001',
    username: '系统管理员',
    operation: 'delete',
    module: 'system',
    description: '删除用户: USER-006',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'LOG-007',
    userId: 'USER-004',
    username: '客服小王',
    operation: 'update',
    module: 'support',
    description: '更新工单状态: TKT-002',
    ip: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'LOG-008',
    userId: 'USER-003',
    username: '财务小张',
    operation: 'export',
    module: 'finance',
    description: '导出发票数据',
    ip: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'LOG-009',
    userId: 'USER-002',
    username: '运营小李',
    operation: 'create',
    module: 'content',
    description: '创建内容: CNT-006',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'LOG-010',
    userId: 'USER-001',
    username: '系统管理员',
    operation: 'logout',
    module: 'system',
    description: '用户登出系统',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

const defaultSystemConfig: SystemConfig = {
  platformName: 'ShadowBees PMS',
  logoUrl: '/logo.png',
  contactPhone: '400-888-8888',
  contactEmail: 'support@shadowbees.com',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
};

const defaultNotificationSettings: NotificationSettings = {
  channels: {
    inApp: true,
    email: true,
    sms: false,
  },
  types: {
    ticket: true,
    contentAnomaly: true,
    finance: true,
    system: true,
  },
  recipients: ['USER-001', 'USER-002'],
};

// ============================================
// 统一订单数据生成
// ============================================
// 订单生成器 - 与酒店端对齐（历史+实时模式）
// ============================================

// 为单个酒店生成历史订单数据（与酒店端 generatePresetOrders 对齐）
function generateHotelOrders(hotel: HotelData, count: number): Order[] {
  const orders: Order[] = [];
  const platforms: OrderPlatform[] = ['xianyu', 'xiaohongshu', 'wechat', 'ota'];
  const statuses: OrderStatus[] = ['paid', 'pending', 'checked_in', 'checked_out', 'refunded'];
  
  // 生成过去30天的历史订单
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < count; i++) {
    const room = hotel.roomTypes[Math.floor(Math.random() * hotel.roomTypes.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // 在过去30天内随机分布
    const createdAt = new Date(thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo));
    
    const order: Order = {
      id: `ORD-${hotel.id}-${String(i + 1).padStart(4, '0')}`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      platform,
      roomType: room.name,
      guestName: `客户${Math.floor(Math.random() * 10000)}`,
      guestPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      price: room.currentPrice + Math.floor(Math.random() * 100) - 50,
      status,
      createdAt: createdAt.toISOString(),
      checkInDate: new Date(createdAt.getTime() + Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      checkOutDate: new Date(createdAt.getTime() + (Math.floor(Math.random() * 14 + 1) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      source: platform === 'ota' ? 'ota' : 'system',
    };
    
    // 部分退款订单（约10%）
    if (status === 'refunded' && Math.random() > 0.3) {
      order.refundAmount = Math.floor(order.price * (0.5 + Math.random() * 0.5));
      order.refundReason = ['客户取消', '酒店原因', '重复下单', '价格调整'][Math.floor(Math.random() * 4)];
    }
    
    // 部分投诉订单（约5%）
    if (Math.random() > 0.95) {
      order.hasComplaint = true;
    }
    
    orders.push(order);
  }
  
  return orders;
}

// 生成3家酒店的历史订单 - 每家约48单（与酒店端对齐），总共约144单
const mockOrders: Order[] = [
  ...generateHotelOrders(mockHotels[0], 48), // 三里屯
  ...generateHotelOrders(mockHotels[1], 48), // 崇礼
  ...generateHotelOrders(mockHotels[2], 48), // 大理
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

// ============================================
// Mock 财务数据
// ============================================

const mockOTAOrders: OTAOrder[] = [
  {
    id: 'OTA-001',
    channel: 'ctrip',
    externalOrderId: 'CTR-20260213-001',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    guestName: '张三',
    checkInDate: '2026-02-15',
    checkOutDate: '2026-02-17',
    roomType: '舒适标准房',
    otaAmount: 680,
    systemAmount: 680,
    status: 'matched',
    differenceType: null,
    otaStatus: 'confirmed',
    systemStatus: 'confirmed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    reconciledAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'OTA-002',
    channel: 'meituan',
    externalOrderId: 'MT-20260213-002',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    guestName: '李四',
    checkInDate: '2026-02-20',
    checkOutDate: '2026-02-22',
    roomType: '雪山标准间',
    otaAmount: 660,
    systemAmount: 630,
    status: 'exception',
    differenceType: 'amount_mismatch',
    differenceAmount: 30,
    otaStatus: 'confirmed',
    systemStatus: 'confirmed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    notes: '美团平台价格未同步调价',
  },
  {
    id: 'OTA-003',
    channel: 'fliggy',
    externalOrderId: 'FL-20260212-003',
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    guestName: '王五',
    checkInDate: '2026-02-18',
    checkOutDate: '2026-02-20',
    roomType: '湖景标准房',
    otaAmount: 760,
    systemAmount: 760,
    status: 'pending',
    differenceType: null,
    otaStatus: 'confirmed',
    systemStatus: 'confirmed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'OTA-004',
    channel: 'ctrip',
    externalOrderId: 'CTR-20260212-004',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    guestName: '赵六',
    checkInDate: '2026-02-16',
    checkOutDate: '2026-02-18',
    roomType: '行政豪华套房',
    otaAmount: 1130,
    systemAmount: 0,
    status: 'exception',
    differenceType: 'missing_order',
    differenceAmount: 1130,
    otaStatus: 'confirmed',
    systemStatus: 'not_found',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    notes: '系统未找到对应订单，需要人工核查',
  },
  {
    id: 'OTA-005',
    channel: 'meituan',
    externalOrderId: 'MT-20260211-005',
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    guestName: '孙七',
    checkInDate: '2026-02-19',
    checkOutDate: '2026-02-21',
    roomType: '洱海全景豪华套房',
    otaAmount: 1370,
    systemAmount: 1370,
    status: 'matched',
    differenceType: null,
    otaStatus: 'confirmed',
    systemStatus: 'confirmed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    reconciledAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'OTA-006',
    channel: 'fliggy',
    externalOrderId: 'FL-20260211-006',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    guestName: '周八',
    checkInDate: '2026-02-21',
    checkOutDate: '2026-02-23',
    roomType: '星空观景套房',
    otaAmount: 1260,
    systemAmount: 1260,
    status: 'exception',
    differenceType: 'status_mismatch',
    otaStatus: 'cancelled',
    systemStatus: 'confirmed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    notes: '飞猪已取消但系统仍显示确认状态',
  },
];

// 客户商务订单 Mock 数据
const mockCustomerOrders: CustomerOrder[] = [
  {
    id: 'CO-2026-001',
    customerId: 'CUST-001',
    customerName: '三里屯潮流酒店',
    type: 'subscription',
    status: 'completed',
    amount: 28800,
    paidAmount: 28800,
    periodStart: '2024-01-15',
    periodEnd: '2025-01-14',
    description: '专业版套餐年费',
    items: [
      { name: '专业版SaaS服务', quantity: 1, unitPrice: 24000, totalPrice: 24000 },
      { name: '内容发布额度包', quantity: 1, unitPrice: 4800, totalPrice: 4800 },
    ],
    paymentMethod: 'bank_transfer',
    paymentTime: '2024-01-15T09:30:00Z',
    invoiceId: 'INV-2026-001',
    invoiceStatus: 'completed',
    contractNo: 'CT-2024-001',
    salesRep: '李明',
    notes: '首年合作，赠送1个月试用期',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
    dueDate: '2024-01-20',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-002',
    customerId: 'CUST-002',
    customerName: '崇礼星空酒店',
    type: 'subscription',
    status: 'completed',
    amount: 58800,
    paidAmount: 58800,
    periodStart: '2024-03-20',
    periodEnd: '2025-03-19',
    description: '企业版套餐年费',
    items: [
      { name: '企业版SaaS服务', quantity: 1, unitPrice: 48000, totalPrice: 48000 },
      { name: '专属客服支持', quantity: 1, unitPrice: 6000, totalPrice: 6000 },
      { name: '定制报表功能', quantity: 1, unitPrice: 4800, totalPrice: 4800 },
    ],
    paymentMethod: 'corporate',
    paymentTime: '2024-03-18T14:20:00Z',
    invoiceId: 'INV-2026-002',
    invoiceStatus: 'completed',
    contractNo: 'CT-2024-002',
    salesRep: '赵强',
    createdAt: '2024-03-15T11:00:00Z',
    updatedAt: '2024-03-18T14:20:00Z',
    dueDate: '2024-03-25',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-003',
    customerId: 'CUST-003',
    customerName: '大理洱海酒店',
    type: 'renewal',
    status: 'paid',
    amount: 28800,
    paidAmount: 28800,
    periodStart: '2025-01-15',
    periodEnd: '2026-01-14',
    description: '专业版套餐续费',
    items: [
      { name: '专业版SaaS服务-续费', quantity: 1, unitPrice: 28800, totalPrice: 28800 },
    ],
    paymentMethod: 'alipay',
    paymentTime: '2025-01-10T16:45:00Z',
    invoiceId: 'INV-2026-003',
    invoiceStatus: 'issued',
    contractNo: 'CT-2024-003',
    salesRep: '李明',
    notes: '老客户续费，享受9折优惠',
    createdAt: '2025-01-05T09:00:00Z',
    updatedAt: '2025-01-10T16:45:00Z',
    dueDate: '2025-01-15',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-004',
    customerId: 'CUST-004',
    customerName: '深圳湾海景酒店',
    type: 'subscription',
    status: 'overdue',
    amount: 12800,
    paidAmount: 0,
    periodStart: '2025-02-01',
    periodEnd: '2025-08-01',
    description: '入门版套餐半年费',
    items: [
      { name: '入门版SaaS服务', quantity: 1, unitPrice: 12800, totalPrice: 12800 },
    ],
    salesRep: '王芳',
    notes: '新客户，需跟进付款',
    createdAt: '2025-01-20T10:30:00Z',
    updatedAt: '2025-01-20T10:30:00Z',
    dueDate: '2025-02-05',
    isOverdue: true,
    overdueDays: 10,
  },
  {
    id: 'CO-2026-005',
    customerId: 'CUST-001',
    customerName: '三里屯潮流酒店',
    type: 'upgrade',
    status: 'completed',
    amount: 15600,
    paidAmount: 15600,
    description: '升级至企业版（补差价）',
    items: [
      { name: '升级差价-专业版至企业版', quantity: 1, unitPrice: 15600, totalPrice: 15600 },
    ],
    paymentMethod: 'bank_transfer',
    paymentTime: '2024-06-15T11:20:00Z',
    invoiceId: 'INV-2026-005',
    invoiceStatus: 'completed',
    salesRep: '李明',
    notes: '客户主动升级，GMV增长迅速',
    createdAt: '2024-06-10T09:00:00Z',
    updatedAt: '2024-06-15T11:20:00Z',
    dueDate: '2024-06-20',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-006',
    customerId: 'CUST-005',
    customerName: '成都宽窄巷子客栈',
    type: 'addon',
    status: 'pending',
    amount: 6000,
    paidAmount: 0,
    description: '增加内容发布额度包',
    items: [
      { name: '内容发布额度-年度包', quantity: 2, unitPrice: 3000, totalPrice: 6000 },
    ],
    salesRep: '张伟',
    notes: '客户咨询中，待确认',
    createdAt: '2025-02-01T14:00:00Z',
    updatedAt: '2025-02-01T14:00:00Z',
    dueDate: '2025-02-15',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-007',
    customerId: 'CUST-002',
    customerName: '崇礼星空酒店',
    type: 'renewal',
    status: 'pending',
    amount: 58800,
    paidAmount: 0,
    periodStart: '2025-03-20',
    periodEnd: '2026-03-19',
    description: '企业版套餐续费',
    items: [
      { name: '企业版SaaS服务-续费', quantity: 1, unitPrice: 52800, totalPrice: 52800 },
      { name: '专属客服支持', quantity: 1, unitPrice: 6000, totalPrice: 6000 },
    ],
    salesRep: '赵强',
    notes: '即将到期，需提前联系续约',
    createdAt: '2025-02-10T10:00:00Z',
    updatedAt: '2025-02-10T10:00:00Z',
    dueDate: '2025-03-10',
    isOverdue: false,
    overdueDays: 0,
  },
  {
    id: 'CO-2026-008',
    customerId: 'CUST-003',
    customerName: '大理洱海酒店',
    type: 'refund',
    status: 'completed',
    amount: -2400,
    paidAmount: -2400,
    description: '内容发布额度包退款',
    items: [
      { name: '内容发布额度包-退款', quantity: 1, unitPrice: -2400, totalPrice: -2400 },
    ],
    paymentMethod: 'alipay',
    paymentTime: '2024-12-20T10:00:00Z',
    salesRep: '李明',
    notes: '客户购买错误，已退款',
    createdAt: '2024-12-18T09:00:00Z',
    updatedAt: '2024-12-20T10:00:00Z',
    isOverdue: false,
    overdueDays: 0,
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 'INV-2026-001',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    applicantName: '张老板',
    applicantPhone: '13800138001',
    title: '三里屯潮流酒店管理有限公司',
    taxNumber: '91110105MA00XXXX01',
    amount: 9588,
    type: 'electronic',
    status: 'issued',
    email: 'finance@sanlitun-hotel.com',
    appliedAt: '2026-02-10T09:30:00.000Z',
    issuedAt: '2026-02-10T14:20:00.000Z',
    invoiceUrl: 'https://example.com/invoice/001.pdf',
    remarks: '2026年1月服务费',
  },
  {
    id: 'INV-2026-002',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    applicantName: '王经理',
    applicantPhone: '13900139002',
    title: '崇礼星空酒店有限公司',
    taxNumber: '91130733MA00XXXX02',
    amount: 23988,
    type: 'electronic',
    status: 'mailed',
    email: 'wang@chongli-ski.com',
    appliedAt: '2026-02-08T10:15:00.000Z',
    issuedAt: '2026-02-08T16:00:00.000Z',
    mailedAt: '2026-02-09T09:00:00.000Z',
    invoiceUrl: 'https://example.com/invoice/002.pdf',
    trackingNumber: 'SF1234567890',
    remarks: '2026年Q1服务费',
  },
  {
    id: 'INV-2026-003',
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    applicantName: '陈女士',
    applicantPhone: '13700137003',
    title: '大理洱海酒店',
    taxNumber: '91532901MA00XXXX03',
    amount: 9588,
    type: 'paper',
    status: 'pending',
    address: '云南省大理市洱海东路88号',
    appliedAt: '2026-02-13T08:45:00.000Z',
    remarks: '需要纸质专票',
  },
  {
    id: 'INV-2026-004',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    applicantName: '张老板',
    applicantPhone: '13800138001',
    title: '三里屯潮流酒店管理有限公司',
    taxNumber: '91110105MA00XXXX01',
    amount: 2850,
    type: 'electronic',
    status: 'pending',
    email: 'finance@sanlitun-hotel.com',
    appliedAt: '2026-02-13T15:20:00.000Z',
  },
  {
    id: 'INV-2026-005',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    applicantName: '王经理',
    applicantPhone: '13900139002',
    title: '崇礼星空酒店有限公司',
    taxNumber: '91130733MA00XXXX02',
    amount: 7200,
    type: 'electronic',
    status: 'completed',
    email: 'wang@chongli-ski.com',
    appliedAt: '2026-02-05T11:00:00.000Z',
    issuedAt: '2026-02-05T15:30:00.000Z',
    mailedAt: '2026-02-05T16:00:00.000Z',
    invoiceUrl: 'https://example.com/invoice/005.pdf',
    remarks: '已发送至邮箱',
  },
];

const mockRefunds: Refund[] = [
  {
    id: 'REF-2026-001',
    orderId: 'ORD-20260210-001',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    customerName: '李明',
    customerPhone: '13800138010',
    amount: 680,
    reason: 'customer_cancel',
    reasonDetail: '客户行程变更，提前48小时取消',
    status: 'pending',
    appliedAt: '2026-02-13T10:30:00.000Z',
  },
  {
    id: 'REF-2026-002',
    orderId: 'ORD-20260209-002',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    customerName: '张伟',
    customerPhone: '13900139020',
    amount: 1260,
    reason: 'hotel_issue',
    reasonDetail: '因管道维修导致房间无法正常入住',
    status: 'approved',
    appliedAt: '2026-02-12T14:00:00.000Z',
    reviewedAt: '2026-02-12T16:30:00.000Z',
    reviewer: '财务小王',
    reviewNotes: '情况属实，全额退款',
  },
  {
    id: 'REF-2026-003',
    orderId: 'ORD-20260211-003',
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    customerName: '王芳',
    customerPhone: '13700137030',
    amount: 760,
    reason: 'duplicate_order',
    reasonDetail: '客户重复下单',
    status: 'completed',
    appliedAt: '2026-02-11T09:00:00.000Z',
    reviewedAt: '2026-02-11T11:00:00.000Z',
    reviewer: '财务小李',
    reviewNotes: '确认重复下单，已退款',
    completedAt: '2026-02-11T15:00:00.000Z',
  },
  {
    id: 'REF-2026-004',
    orderId: 'ORD-20260212-004',
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    customerName: '刘强',
    customerPhone: '13800138040',
    amount: 1130,
    reason: 'price_adjustment',
    reasonDetail: '价格调整，退还差价',
    status: 'rejected',
    appliedAt: '2026-02-12T16:00:00.000Z',
    reviewedAt: '2026-02-13T09:00:00.000Z',
    reviewer: '财务小王',
    reviewNotes: '已过价格保护期，不予退款',
  },
  {
    id: 'REF-2026-005',
    orderId: 'ORD-20260213-005',
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    customerName: '陈静',
    customerPhone: '13900139050',
    amount: 630,
    reason: 'other',
    reasonDetail: '客户对房间不满意，要求退款',
    status: 'processing',
    appliedAt: '2026-02-13T08:00:00.000Z',
    reviewedAt: '2026-02-13T10:00:00.000Z',
    reviewer: '财务小李',
    reviewNotes: '已与酒店协商，同意部分退款',
  },
];

const mockFinanceStats: FinanceStats = {
  receivableThisMonth: 856000,
  receivedThisMonth: 642000,
  pendingReceipt: 214000,
  invoiceAmountThisMonth: 524000,
  pendingInvoiceCount: 2,
  pendingRefundAmount: 1940,
  pendingRefundCount: 1,
  reconciliationStats: {
    total: 156,
    matched: 142,
    pending: 10,
    exception: 4,
  },
};

// ============================================
// Store 定义
// ============================================

import type { HealthScore } from '../utils/healthScore';
import { calculateAllHealthScores } from '../utils/healthScore';
import type { Anomaly } from '../utils/anomalyDetector';
import { detectAllAnomalies } from '../utils/anomalyDetector';

interface AdminState {
  // 数据
  customers: Customer[];
  hotels: HotelData[];
  contentItems: ContentItem[];
  tickets: Ticket[];
  notifications: Notification[];
  platformStats: PlatformStats;
  
  // 统一异常数据（新增）- 健康度和异常中心使用同一数据源
  anomalies: Anomaly[];
  
  // 客户健康度（新增）
  healthScores: Record<string, HealthScore>;
  
  // 选中状态
  selectedCustomer: Customer | null;
  selectedHotel: HotelData | null;
  selectedContent: ContentItem | null;
  selectedTicket: Ticket | null;
  
  // UI状态
  unreadCount: number;
  dateRange: { start: Date; end: Date };
  selectedTimeRange: 'today' | 'week' | 'month' | 'custom';
  
  // ===== 预设历史数据（与酒店端对齐：today/week/month）=====
  presetStats: {
    today: { revenue: number; orders: number; contentCount: number };
    thisWeek: { revenue: number; orders: number; contentCount: number };
    thisMonth: { revenue: number; orders: number; contentCount: number };
  };
  
  // ===== 实时推演数据累加（来自酒店端：today/week/month）=====
  realtimeMetrics: {
    today: { gmv: number; orders: number; lastUpdate: number };
    thisWeek: { gmv: number; orders: number; lastUpdate: number };
    thisMonth: { gmv: number; orders: number; lastUpdate: number };
  };
  
  // 管理员
  adminUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  
  // 系统设置
  systemUsers: SystemUser[];
  operationLogs: OperationLog[];
  systemConfig: SystemConfig;
  notificationSettings: NotificationSettings;
  selectedSystemUser: SystemUser | null;
  
  // 统一订单数据（新增）
  orders: Order[];
  selectedOrder: Order | null;
  
  // 财务合规中心
  otaOrders: OTAOrder[];
  invoices: Invoice[];
  refunds: Refund[];
  financeStats: FinanceStats;
  selectedOTAOrder: OTAOrder | null;
  selectedInvoice: Invoice | null;
  selectedRefund: Refund | null;
  
  // 客户商务订单（新增）
  customerOrders: CustomerOrder[];
  selectedCustomerOrder: CustomerOrder | null;
  
  // 定价算法模板系统（新增）
  pricingTemplates: PricingAlgorithmTemplate[];      // 算法模板库
  pricingProfiles: HotelPricingProfile[];            // 酒店定价画像
  pricingSuggestions: PricingSuggestion[];           // 定价建议历史
  selectedTemplate: PricingAlgorithmTemplate | null; // 当前选中模板
  
  // 策略规则（新增）
  strategyRules: GroupStrategyRule[];
  selectedStrategyRule: GroupStrategyRule | null;
  
  // Actions
  setCustomers: (customers: Customer[]) => void;
  
  // 策略规则 Actions（新增）
  addStrategyRule: (customerId: string, rule: Omit<GroupStrategyRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStrategyRule: (customerId: string, ruleId: string, updates: Partial<GroupStrategyRule>) => void;
  deleteStrategyRule: (customerId: string, ruleId: string) => void;
  toggleStrategyRule: (customerId: string, ruleId: string) => void;
  selectStrategyRule: (rule: GroupStrategyRule | null) => void;
  
  // 登录/退出/切换用户
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  selectCustomer: (customer: Customer | null) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  
  // 健康度 Actions（新增）
  calculateHealthScores: () => void;
  getHotelHealthScore: (hotelId: string) => HealthScore | undefined;
  
  // 异常 Actions（新增）
  refreshAnomalies: () => void;
  updateAnomalyStatus: (id: string, status: Anomaly['status']) => void;
  assignAnomaly: (id: string, userId: string, userName: string) => void;
  
  selectHotel: (hotel: HotelData | null) => void;
  updateHotel: (id: string, updates: Partial<HotelData>) => void;
  
  setContentItems: (items: ContentItem[]) => void;
  selectContent: (item: ContentItem | null) => void;
  updateContentStatus: (id: string, status: ContentItem['status']) => void;
  updateContent: (id: string, updates: Partial<ContentItem>) => void;
  
  setTickets: (tickets: Ticket[]) => void;
  selectTicket: (ticket: Ticket | null) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  receiveGroupTicket: (ticket: Ticket) => void; // 接收集团提交的工单
  
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  setDateRange: (range: { start: Date; end: Date }) => void;
  setSelectedTimeRange: (range: 'today' | 'week' | 'month' | 'custom') => void;
  
  // 实时推演数据接收（来自酒店端，统一：today/week/month）
  addRealtimeMetrics: (metrics: { gmv: number; orders: number; timeRange: 'today' | 'week' | 'month'; hotelId?: string }) => void;
  
  // 根据时间范围获取平台统计数据（历史+实时，与酒店端统一）
  getPlatformStatsByTimeRange: (range: 'today' | 'week' | 'month' | 'custom', dateRange?: { start: Date; end: Date }) => PlatformStats;
  
  // 系统设置 Actions
  setSystemUsers: (users: SystemUser[]) => void;
  selectSystemUser: (user: SystemUser | null) => void;
  addSystemUser: (user: Omit<SystemUser, 'id' | 'createdAt' | 'lastLoginAt' | 'lastLoginIp'>) => void;
  updateSystemUser: (id: string, updates: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => void;
  
  addOperationLog: (log: Omit<OperationLog, 'id' | 'createdAt'>) => void;
  setOperationLogs: (logs: OperationLog[]) => void;
  
  updateSystemConfig: (config: Partial<SystemConfig>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  
  // 统一订单 Actions（新增）
  setOrders: (orders: Order[]) => void;
  selectOrder: (order: Order | null) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  
  // 财务合规 Actions
  setOTAOrders: (orders: OTAOrder[]) => void;
  selectOTAOrder: (order: OTAOrder | null) => void;
  updateOTAOrder: (id: string, updates: Partial<OTAOrder>) => void;
  reconcileOrder: (id: string, notes?: string) => void;
  
  setInvoices: (invoices: Invoice[]) => void;
  selectInvoice: (invoice: Invoice | null) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus, data?: Partial<Invoice>) => void;
  issueInvoice: (id: string, invoiceUrl?: string) => void;
  mailInvoice: (id: string, trackingNumber?: string) => void;
  
  setRefunds: (refunds: Refund[]) => void;
  selectRefund: (refund: Refund | null) => void;
  // 退款由酒店端处理，管理端仅接收同步
  syncRefundFromHotel: (refund: Refund) => void;
  
  // 客户商务订单 Actions（新增）
  setCustomerOrders: (orders: CustomerOrder[]) => void;
  selectCustomerOrder: (order: CustomerOrder | null) => void;
  addCustomerOrder: (order: Omit<CustomerOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomerOrder: (id: string, updates: Partial<CustomerOrder>) => void;
  updateCustomerOrderStatus: (id: string, status: CustomerOrderStatus) => void;
  markCustomerOrderPaid: (id: string, paymentMethod: PaymentMethod, paidAmount: number) => void;
  markCustomerOrderOverdue: (id: string) => void;
  
  // 定价算法模板 Actions（新增）
  setPricingTemplates: (templates: PricingAlgorithmTemplate[]) => void;
  addPricingTemplate: (template: PricingAlgorithmTemplate) => void;
  updatePricingTemplate: (id: string, updates: Partial<PricingAlgorithmTemplate>) => void;
  deletePricingTemplate: (id: string) => void;
  selectPricingTemplate: (template: PricingAlgorithmTemplate | null) => void;
  
  setPricingProfiles: (profiles: HotelPricingProfile[]) => void;
  updatePricingProfile: (hotelId: string, updates: Partial<HotelPricingProfile>) => void;
  
  setPricingSuggestions: (suggestions: PricingSuggestion[]) => void;
  addPricingSuggestion: (suggestion: PricingSuggestion) => void;
  updatePricingSuggestion: (id: string, updates: Partial<PricingSuggestion>) => void;
  
  // 根据酒店标签匹配最佳算法模板
  matchTemplateForHotel: (hotelTags: any) => PricingAlgorithmTemplate | null;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // 初始数据
      customers: mockCustomers,
      hotels: mockHotels,
      contentItems: mockContentItems,
      tickets: mockTickets,
      notifications: mockNotifications,
      platformStats: mockPlatformStats,
      
      // 统一异常数据（初始检测）
      anomalies: detectAllAnomalies(mockHotels, mockContentItems, mockTickets, mockOTAOrders),
      
      // 客户健康度（初始计算）
      healthScores: calculateAllHealthScores(mockHotels, mockContentItems, mockTickets),
      
      selectedCustomer: null,
      selectedHotel: null,
      selectedContent: null,
      selectedTicket: null,
      
      unreadCount: mockNotifications.filter(n => !n.read).length,
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      selectedTimeRange: 'today',
      
      // ===== 预设历史数据（与酒店端对齐）=====
      // 基于实际订单数据生成统计数据，确保数据一致性
      presetStats: (() => {
        // 从 mockOrders 计算实际的历史订单数量（过去30天）
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const thisMonthOrders = mockOrders.filter(o => new Date(o.createdAt).getTime() > thirtyDaysAgo).length;
        const thisMonthRevenue = mockOrders
          .filter(o => new Date(o.createdAt).getTime() > thirtyDaysAgo && o.status !== 'refunded')
          .reduce((sum, o) => sum + o.price, 0);
        
        // 计算今日订单（基于 mockHotels 的 todayOrders）
        const todayOrders = mockHotels.reduce((sum, h) => sum + h.todayOrders, 0);
        const todayRevenue = mockHotels.reduce((sum, h) => sum + h.todayRevenue, 0);
        
        // 内容数量
        const baseContent = mockPlatformStats.platformBreakdown.xiaohongshu.contentCount 
          + mockPlatformStats.platformBreakdown.wechat.contentCount 
          + mockPlatformStats.platformBreakdown.xianyu.contentCount;
        
        return {
          today: {
            revenue: todayRevenue,
            orders: todayOrders,
            contentCount: Math.floor(baseContent * 0.1), // 今日发布的内容
          },
          thisWeek: {
            revenue: Math.floor(thisMonthRevenue * 0.25), // 本周约占本月25%
            orders: Math.floor(thisMonthOrders * 0.25),
            contentCount: Math.floor(baseContent * 0.3),
          },
          thisMonth: {
            revenue: thisMonthRevenue,
            orders: thisMonthOrders, // 与实际订单数量对齐（约144单）
            contentCount: baseContent,
          },
          // 注：与酒店端统一，不设置 thisYear
        };
      })(),
      
      // ===== 实时推演数据累加（初始为0，与酒店端统一：today/week/month）=====
      realtimeMetrics: {
        today: { gmv: 0, orders: 0, lastUpdate: 0 },
        thisWeek: { gmv: 0, orders: 0, lastUpdate: 0 },
        thisMonth: { gmv: 0, orders: 0, lastUpdate: 0 },
      },
      
      adminUser: {
        id: 'ADMIN-001',
        name: '系统管理员',
        email: 'admin@shadowbees.com',
        role: 'super' as UserRole,
      },
      
      // 统一订单初始数据
      orders: mockOrders,
      selectedOrder: null,
      
      // 财务初始数据
      otaOrders: mockOTAOrders,
      invoices: mockInvoices,
      refunds: mockRefunds,
      financeStats: mockFinanceStats,
      selectedOTAOrder: null,
      selectedInvoice: null,
      selectedRefund: null,
      
      // 客户商务订单初始数据（新增）
      customerOrders: mockCustomerOrders,
      selectedCustomerOrder: null,
      
      // 定价算法模板初始数据（新增）
      pricingTemplates: defaultPricingTemplates,
      pricingProfiles: [],
      pricingSuggestions: [],
      selectedTemplate: null,
      
      // 策略规则初始数据（新增）
      strategyRules: mockCustomers.find(c => c.type === 'group')?.groupProfile?.strategyRules || [],
      selectedStrategyRule: null,
      
      // 系统设置初始数据
      systemUsers: mockSystemUsers,
      operationLogs: mockOperationLogs,
      systemConfig: defaultSystemConfig,
      notificationSettings: defaultNotificationSettings,
      selectedSystemUser: null,
      
      // Actions
      setCustomers: (customers) => set({ customers }),
      
      // 异常 Actions
      refreshAnomalies: () => {
        const { hotels, contentItems, tickets, otaOrders } = get();
        const anomalies = detectAllAnomalies(hotels, contentItems, tickets, otaOrders);
        set({ anomalies });
      },
      updateAnomalyStatus: (id, status) => {
        const { anomalies } = get();
        const updated = anomalies.map(a => {
          if (a.id !== id) return a;
          return {
            ...a,
            status,
            updatedAt: new Date().toISOString(),
            resolvedAt: status === 'resolved' ? new Date().toISOString() : a.resolvedAt,
          };
        });
        set({ anomalies: updated });
      },
      assignAnomaly: (id, userId, userName) => {
        const { anomalies } = get();
        const updated = anomalies.map(a => {
          if (a.id !== id) return a;
          return {
            ...a,
            assignedTo: userId,
            assignedToName: userName,
            status: 'processing' as const,
            updatedAt: new Date().toISOString(),
          };
        });
        set({ anomalies: updated });
      },
      
      // 登录/退出/切换用户
      login: (username, password) => {
        // Mock 登录验证 - 匹配系统用户
        const user = mockSystemUsers.find(
          (u) => u.username === username && u.status === 'active'
        );
        // 密码规则：用户名 + '123'
        if (user && password === `${username}123`) {
          set({
            adminUser: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
          return { success: true };
        }
        return { success: false, message: '用户名或密码错误' };
      },
      
      logout: () => {
        set({ adminUser: null });
      },
      
      switchUser: (userId) => {
        const user = mockSystemUsers.find((u) => u.id === userId && u.status === 'active');
        if (user) {
          set({
            adminUser: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
        }
      },
      selectCustomer: (customer) => set({ selectedCustomer: customer }),
      updateCustomer: (id, updates) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      
      // 健康度 Actions（新增）
      calculateHealthScores: () => set((state) => ({
        healthScores: calculateAllHealthScores(state.hotels, state.contentItems, state.tickets),
      })),
      getHotelHealthScore: (hotelId: string) => {
        return get().healthScores[hotelId];
      },
      
      selectHotel: (hotel) => set({ selectedHotel: hotel }),
      updateHotel: (id, updates) =>
        set((state) => ({
          hotels: state.hotels.map((h) =>
            h.id === id ? { ...h, ...updates } : h
          ),
        })),
      
      setContentItems: (contentItems) => set({ contentItems }),
      selectContent: (item) => set({ selectedContent: item }),
      updateContentStatus: (id, status) =>
        set((state) => ({
          contentItems: state.contentItems.map((item) =>
            item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item
          ),
        })),
      updateContent: (id, updates) =>
        set((state) => ({
          contentItems: state.contentItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),
      
      setTickets: (tickets) => set({ tickets }),
      selectTicket: (ticket) => set({ selectedTicket: ticket }),
      updateTicket: (id, updates) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
        
        // 广播给酒店端和集团端
        const syncService = getAdminTicketSync();
        syncService.broadcast({
          type: 'TICKET_UPDATED',
          ticketId: id,
          updates,
          timestamp: Date.now(),
        });
      },
      
      // 接收集团提交的工单
      receiveGroupTicket: (ticket) => {
        set((state) => ({
          tickets: [ticket, ...state.tickets],
        }));
        
        // 添加通知提醒
        const notification: Notification = {
          id: `notif-${Date.now()}`,
          type: 'warning',
          title: '收到集团工单',
          message: `集团提交了新工单: ${ticket.title}`,
          hotelId: ticket.hotelId,
          createdAt: new Date().toISOString(),
          read: false,
        };
        
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },
      
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),
      
      markNotificationRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.read) return state;
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: state.unreadCount - 1,
          };
        }),
      
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      
      setDateRange: (dateRange) => set({ dateRange }),
      setSelectedTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
      
      // 实时推演数据接收（来自酒店端，统一：today/week/month）
      addRealtimeMetrics: (metrics) => {
        const { realtimeMetrics, orders, hotels } = get();
        const now = Date.now();
        
        // 根据时间范围累加数据（与酒店端统一，只处理 today/week/month）
        set({
          realtimeMetrics: {
            today: {
              gmv: realtimeMetrics.today.gmv + (metrics.timeRange === 'today' ? metrics.gmv : 0),
              orders: realtimeMetrics.today.orders + (metrics.timeRange === 'today' ? metrics.orders : 0),
              lastUpdate: now,
            },
            thisWeek: {
              gmv: realtimeMetrics.thisWeek.gmv + (['today', 'week'].includes(metrics.timeRange) ? metrics.gmv : 0),
              orders: realtimeMetrics.thisWeek.orders + (['today', 'week'].includes(metrics.timeRange) ? metrics.orders : 0),
              lastUpdate: now,
            },
            thisMonth: {
              gmv: realtimeMetrics.thisMonth.gmv + (['today', 'week', 'month'].includes(metrics.timeRange) ? metrics.gmv : 0),
              orders: realtimeMetrics.thisMonth.orders + (['today', 'week', 'month'].includes(metrics.timeRange) ? metrics.orders : 0),
              lastUpdate: now,
            },
          },
        });
        
        // ===== 添加实时订单到订单列表（历史+实时逻辑）=====
        if (metrics.orders > 0 && metrics.hotelId) {
          const hotel = hotels.find(h => h.id === metrics.hotelId);
          if (hotel) {
            const room = hotel.roomTypes[Math.floor(Math.random() * hotel.roomTypes.length)];
            const platforms: OrderPlatform[] = ['xianyu', 'xiaohongshu', 'wechat'];
            const platform = platforms[Math.floor(Math.random() * platforms.length)];
            
            const newOrder: Order = {
              id: `ORD-RT-${Date.now()}`,
              hotelId: hotel.id,
              hotelName: hotel.name,
              platform,
              roomType: room?.name || '标准房',
              guestName: `实时客户${Math.floor(Math.random() * 1000)}`,
              guestPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
              price: metrics.gmv / metrics.orders,
              status: 'paid',
              createdAt: new Date().toISOString(),
              checkInDate: new Date(Date.now() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              checkOutDate: new Date(Date.now() + Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              source: 'system',
              isRealtimeGenerated: true, // 标记为实时生成
            };
            
            set({ orders: [newOrder, ...orders] });
          }
        }
      },
      
      // 根据时间范围获取平台统计数据（历史+实时）
      getPlatformStatsByTimeRange: (range, dateRange) => {
        const { presetStats, realtimeMetrics, platformStats, orders } = get();
        
        // 自定义日期范围处理
        if (range === 'custom' && dateRange) {
          const filteredOrders = orders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= dateRange.start && orderDate <= dateRange.end;
          });
          const customRevenue = filteredOrders
            .filter(o => o.status !== 'refunded')
            .reduce((sum, o) => sum + o.price, 0);
          
          return {
            ...platformStats,
            todayRevenue: customRevenue,
            todayOrders: filteredOrders.length,
            totalRevenue: customRevenue,
            mrr: Math.floor(customRevenue / 30),
          };
        }
        
        let preset;
        let realtime;
        
        switch (range) {
          case 'today':
            preset = presetStats.today;
            realtime = realtimeMetrics.today;
            break;
          case 'week':
            preset = presetStats.thisWeek;
            realtime = realtimeMetrics.thisWeek;
            break;
          case 'month':
            preset = presetStats.thisMonth;
            realtime = realtimeMetrics.thisMonth;
            break;
          default:
            preset = presetStats.today;
            realtime = realtimeMetrics.today;
        }
        
        // 返回历史数据 + 实时推演数据的合并结果
        return {
          ...platformStats,
          todayRevenue: preset.revenue + realtime.gmv,
          todayOrders: preset.orders + realtime.orders,
          totalRevenue: presetStats.thisMonth.revenue + realtimeMetrics.thisMonth.gmv,
          mrr: Math.floor((presetStats.thisMonth.revenue + realtimeMetrics.thisMonth.gmv) / 30),
        };
      },
      
      // 系统设置 Actions
      setSystemUsers: (users) => set({ systemUsers: users }),
      selectSystemUser: (user) => set({ selectedSystemUser: user }),
      addSystemUser: (user) =>
        set((state) => ({
          systemUsers: [
            ...state.systemUsers,
            {
              ...user,
              id: `USER-${String(state.systemUsers.length + 1).padStart(3, '0')}`,
              createdAt: new Date().toISOString().split('T')[0],
              lastLoginAt: '-',
              lastLoginIp: '-',
            },
          ],
        })),
      updateSystemUser: (id, updates) =>
        set((state) => ({
          systemUsers: state.systemUsers.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        })),
      deleteSystemUser: (id) =>
        set((state) => ({
          systemUsers: state.systemUsers.filter((u) => u.id !== id),
        })),
      
      addOperationLog: (log) =>
        set((state) => ({
          operationLogs: [
            {
              ...log,
              id: `LOG-${String(state.operationLogs.length + 1).padStart(3, '0')}`,
              createdAt: new Date().toISOString(),
            },
            ...state.operationLogs,
          ],
        })),
      setOperationLogs: (logs) => set({ operationLogs: logs }),
      
      updateSystemConfig: (config) =>
        set((state) => ({
          systemConfig: { ...state.systemConfig, ...config },
        })),
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        })),
      
      // 统一订单 Actions
      setOrders: (orders) => set({ orders }),
      selectOrder: (selectedOrder) => set({ selectedOrder }),
      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        })),
      
      // 财务合规 Actions
      setOTAOrders: (otaOrders) => set({ otaOrders }),
      selectOTAOrder: (selectedOTAOrder) => set({ selectedOTAOrder }),
      updateOTAOrder: (id, updates) =>
        set((state) => ({
          otaOrders: state.otaOrders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        })),
      reconcileOrder: (id, notes) =>
        set((state) => ({
          otaOrders: state.otaOrders.map((o) =>
            o.id === id
              ? { ...o, status: 'matched' as ReconciliationStatus, reconciledAt: new Date().toISOString(), notes }
              : o
          ),
        })),
      
      setInvoices: (invoices) => set({ invoices }),
      selectInvoice: (selectedInvoice) => set({ selectedInvoice }),
      updateInvoiceStatus: (id, status, data) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...data, status } : inv
          ),
        })),
      issueInvoice: (id, invoiceUrl) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? { ...inv, status: 'issued' as InvoiceStatus, issuedAt: new Date().toISOString(), invoiceUrl }
              : inv
          ),
        })),
      mailInvoice: (id, trackingNumber) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? { ...inv, status: 'mailed' as InvoiceStatus, mailedAt: new Date().toISOString(), trackingNumber }
              : inv
          ),
        })),
      
      setRefunds: (refunds) => set({ refunds }),
      selectRefund: (selectedRefund) => set({ selectedRefund }),
      approveRefund: (id: string, notes?: string) => {
        const refund = get().refunds.find((r) => r.id === id);
        if (!refund) return;

        set((state) => ({
          refunds: state.refunds.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'approved' as RefundStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewer: state.adminUser?.name || '系统',
                  reviewNotes: notes,
                }
              : r
          ),
        }));

        // 广播给酒店端
        const syncService = getAdminRefundSync();
        syncService.broadcast({
          type: 'REFUND_APPROVED',
          refundId: id,
          orderId: refund.orderId,
        } as any);
      },
      rejectRefund: (id: string, notes?: string) => {
        const refund = get().refunds.find((r) => r.id === id);
        if (!refund) return;

        set((state) => ({
          refunds: state.refunds.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'rejected' as RefundStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewer: state.adminUser?.name || '系统',
                  reviewNotes: notes,
                }
              : r
          ),
        }));

        // 广播给酒店端
        const syncService = getAdminRefundSync();
        syncService.broadcast({
          type: 'REFUND_REJECTED',
          refundId: id,
          orderId: refund.orderId,
          reason: notes || '退款申请未通过审核',
        } as any);
      },
      completeRefund: (id: string) =>
        set((state) => ({
          refunds: state.refunds.map((r) =>
            r.id === id
              ? { ...r, status: 'completed' as RefundStatus, completedAt: new Date().toISOString() }
              : r
          ),
        })),
      
      // 退款同步（从酒店端接收）
      syncRefundFromHotel: (refund) =>
        set((state) => {
          const exists = state.refunds.find((r) => r.id === refund.id);
          if (exists) {
            return {
              refunds: state.refunds.map((r) =>
                r.id === refund.id ? { ...refund, syncedAt: Date.now() } : r
              ),
            };
          }
          return {
            refunds: [{ ...refund, syncedAt: Date.now() }, ...state.refunds],
          };
        }),
      
      // 客户商务订单 Actions（新增）
      setCustomerOrders: (orders) => set({ customerOrders: orders }),
      selectCustomerOrder: (order) => set({ selectedCustomerOrder: order }),
      addCustomerOrder: (order) =>
        set((state) => ({
          customerOrders: [
            {
              ...order,
              id: `CO-${new Date().getFullYear()}-${String(state.customerOrders.length + 1).padStart(3, '0')}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isOverdue: false,
              overdueDays: 0,
            },
            ...state.customerOrders,
          ],
        })),
      updateCustomerOrder: (id, updates) =>
        set((state) => ({
          customerOrders: state.customerOrders.map((o) =>
            o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o
          ),
        })),
      updateCustomerOrderStatus: (id, status) =>
        set((state) => ({
          customerOrders: state.customerOrders.map((o) =>
            o.id === id
              ? { ...o, status, updatedAt: new Date().toISOString() }
              : o
          ),
        })),
      markCustomerOrderPaid: (id, paymentMethod, paidAmount) =>
        set((state) => ({
          customerOrders: state.customerOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: 'completed' as CustomerOrderStatus,
                  paymentMethod,
                  paidAmount,
                  paymentTime: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  isOverdue: false,
                  overdueDays: 0,
                }
              : o
          ),
        })),
      markCustomerOrderOverdue: (id) =>
        set((state) => {
          const order = state.customerOrders.find((o) => o.id === id);
          if (!order || !order.dueDate) return state;
          const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(order.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
          return {
            customerOrders: state.customerOrders.map((o) =>
              o.id === id
                ? { ...o, status: 'overdue' as CustomerOrderStatus, isOverdue: true, overdueDays, updatedAt: new Date().toISOString() }
                : o
            ),
          };
        }),
      
      // 定价算法模板 Actions（新增）
      setPricingTemplates: (templates) => set({ pricingTemplates: templates }),
      addPricingTemplate: (template) =>
        set((state) => ({
          pricingTemplates: [template, ...state.pricingTemplates],
        })),
      updatePricingTemplate: (id, updates) =>
        set((state) => ({
          pricingTemplates: state.pricingTemplates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deletePricingTemplate: (id) =>
        set((state) => ({
          pricingTemplates: state.pricingTemplates.filter((t) => t.id !== id),
        })),
      selectPricingTemplate: (template) => set({ selectedTemplate: template }),
      
      setPricingProfiles: (profiles) => set({ pricingProfiles: profiles }),
      updatePricingProfile: (hotelId, updates) =>
        set((state) => ({
          pricingProfiles: state.pricingProfiles.map((p) =>
            p.hotelId === hotelId ? { ...p, ...updates } : p
          ),
        })),
      
      setPricingSuggestions: (suggestions) => set({ pricingSuggestions: suggestions }),
      addPricingSuggestion: (suggestion) =>
        set((state) => ({
          pricingSuggestions: [suggestion, ...state.pricingSuggestions],
        })),
      updatePricingSuggestion: (id, updates) =>
        set((state) => ({
          pricingSuggestions: state.pricingSuggestions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      
      // 根据酒店标签匹配最佳算法模板
      matchTemplateForHotel: (hotelTags) => {
        const { pricingTemplates } = get();
        // 简单的标签匹配逻辑
        return pricingTemplates.find((template) => {
          if (!template.applicableTags) return false;
          // 匹配地理位置
          if (template.applicableTags.location?.areaType && 
              template.applicableTags.location.areaType !== hotelTags.location?.areaType) {
            return false;
          }
          // 匹配酒店类型
          if (template.applicableTags.property?.type && 
              template.applicableTags.property.type !== hotelTags.property?.type) {
            return false;
          }
          // 匹配档次
          if (template.applicableTags.property?.tier && 
              template.applicableTags.property.tier !== hotelTags.property?.tier) {
            return false;
          }
          return true;
        }) || null;
      },
      
      // 策略规则 Actions（新增）
      selectStrategyRule: (rule) => set({ selectedStrategyRule: rule }),
      addStrategyRule: (customerId, rule) =>
        set((state) => {
          const newRule: GroupStrategyRule = {
            ...rule,
            id: `rule-${Date.now()}`,
            customerId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            strategyRules: [...state.strategyRules, newRule],
            customers: state.customers.map((c) =>
              c.id === customerId
                ? {
                    ...c,
                    groupProfile: c.groupProfile
                      ? {
                          ...c.groupProfile,
                          strategyRules: [...(c.groupProfile.strategyRules || []), newRule],
                        }
                      : undefined,
                  }
                : c
            ),
          };
        }),
      updateStrategyRule: (customerId, ruleId, updates) =>
        set((state) => ({
          strategyRules: state.strategyRules.map((r) =>
            r.id === ruleId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
          customers: state.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  groupProfile: c.groupProfile
                    ? {
                        ...c.groupProfile,
                        strategyRules: c.groupProfile.strategyRules?.map((r) =>
                          r.id === ruleId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
                        ),
                      }
                    : undefined,
                }
              : c
          ),
        })),
      deleteStrategyRule: (customerId, ruleId) =>
        set((state) => ({
          strategyRules: state.strategyRules.filter((r) => r.id !== ruleId),
          customers: state.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  groupProfile: c.groupProfile
                    ? {
                        ...c.groupProfile,
                        strategyRules: c.groupProfile.strategyRules?.filter((r) => r.id !== ruleId),
                      }
                    : undefined,
                }
              : c
          ),
        })),
      toggleStrategyRule: (customerId, ruleId) =>
        set((state) => {
          const rule = state.strategyRules.find((r) => r.id === ruleId);
          if (!rule) return state;
          const updatedRule = { ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() };
          return {
            strategyRules: state.strategyRules.map((r) =>
              r.id === ruleId ? updatedRule : r
            ),
            customers: state.customers.map((c) =>
              c.id === customerId
                ? {
                    ...c,
                    groupProfile: c.groupProfile
                      ? {
                          ...c.groupProfile,
                          strategyRules: c.groupProfile.strategyRules?.map((r) =>
                            r.id === ruleId ? updatedRule : r
                          ),
                        }
                      : undefined,
                  }
                : c
            ),
          };
        }),
    }),
    {
      name: 'admin-store-v3', // 升级版本，强制刷新数据以包含 type 字段
      version: 3,
      migrate: (persistedState: any, version) => {
        // 如果版本低于3，清除旧数据重新初始化
        if (version < 3) {
          return undefined; // 返回 undefined 会使用初始状态
        }
        return persistedState;
      },
      // 只持久化用户相关数据，业务数据每次都从 mock 重新加载
      partialize: (state) => ({
        adminUser: state.adminUser,
        notificationSettings: state.notificationSettings,
        systemConfig: state.systemConfig,
      }),
    }
  )
);

export default useAdminStore;

// ============================================
// 工单同步订阅（酒店端 → 管理端）
// 在应用初始化时调用，如 App.tsx 或 Support 页面
// ============================================

import type { SyncMessage } from '@/services/ticketSync';

export function initTicketSyncSubscription() {
  if (typeof window === 'undefined') return () => {};
  
  import('@/services/ticketSync').then(({ getAdminTicketSync }) => {
    const ticketSync = getAdminTicketSync();
    
    ticketSync.subscribe((message: SyncMessage) => {
      const store = useAdminStore.getState();
      
      switch (message.type) {
        case 'TICKET_CREATED': {
          const newTicket = message.ticket;
          // 检查是否已存在（避免重复）
          const exists = store.tickets.some((t) => t.id === newTicket.id);
          if (!exists) {
            store.setTickets([newTicket, ...store.tickets]);
            // 添加通知
            store.addNotification({
              id: `notif-ticket-${newTicket.id}`,
              type: 'warning',
              title: '新工单',
              message: `${newTicket.hotelName} 提交了工单：${newTicket.title}`,
              hotelId: newTicket.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
          break;
        }
        
        case 'TICKET_MESSAGE': {
          const { ticketId, message: msg } = message;
          const ticket = store.tickets.find((t) => t.id === ticketId);
          if (ticket && msg.sender === 'hotel') {
            // 更新工单消息
            store.updateTicket(ticketId, {
              messages: [...ticket.messages, msg],
              updatedAt: new Date().toISOString(),
            });
            // 添加通知
            store.addNotification({
              id: `notif-msg-${msg.id}`,
              type: 'info',
              title: '新消息',
              message: `${ticket.hotelName} 回复了工单：${ticket.title}`,
              hotelId: ticket.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
          break;
        }
        
        case 'TICKET_RESOLVED': {
          const { ticketId, data } = message;
          const ticket = store.tickets.find((t) => t.id === ticketId);
          if (ticket) {
            store.updateTicket(ticketId, {
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rating: data.rating,
              responseSpeed: data.responseSpeed,
              resolutionEffect: data.resolutionEffect,
              ratingTags: data.ratingTags,
              feedback: data.feedback,
            });
          }
          break;
        }
        
        case 'TICKET_URGENT': {
          const { ticketId, urgentCount } = message;
          const ticket = store.tickets.find((t) => t.id === ticketId);
          if (ticket) {
            store.updateTicket(ticketId, {
              urgentCount,
              lastUrgentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              // 第3次催促自动提升优先级
              priority: urgentCount >= 3 ? 'urgent' : ticket.priority,
            });
            // 添加紧急通知
            store.addNotification({
              id: `notif-urgent-${ticketId}-${Date.now()}`,
              type: 'error',
              title: urgentCount >= 3 ? '🔥 工单多次催促' : '工单催促',
              message: `${ticket.hotelName} 第${urgentCount}次催促工单：${ticket.title}`,
              hotelId: ticket.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
          break;
        }
      }
    });
    
    console.log('[AdminStore] Ticket sync subscription initialized');
  });
  
  return () => {};
}

// ============================================
// 内容同步订阅（酒店端 → 管理端）
// 接收酒店发布的私域和公域内容
// ============================================

export function initContentSyncSubscription() {
  if (typeof window === 'undefined') return () => {};
  
  const unifiedSync = getAdminSync();
  
  unifiedSync.subscribe((message) => {
    if (!isContentMessage(message)) return;
    
    const store = useAdminStore.getState();
    
    switch (message.type) {
      case 'CONTENT_PUBLISHED': {
        const { content, hotelId, hotelName } = message;
        
        // 转换 performance -> stats（字段名映射）
        const hotelPerformance = (content as any).performance;
        const convertedStats = hotelPerformance ? {
          impressions: hotelPerformance.impressions || 0,
          clicks: hotelPerformance.clicks || 0,
          inquiries: hotelPerformance.inquiries || 0,
          conversions: hotelPerformance.conversions || 0,
          touches: hotelPerformance.touches,
          replies: hotelPerformance.replies,
          privateConversions: hotelPerformance.privateConversions,
          updateTime: new Date().toISOString(),
        } : undefined;
        
        // 转换为管理端 ContentItem 格式
        const contentItem: ContentItem = {
          ...content,
          hotelId,
          hotelName,
          author: hotelName, // 使用酒店名作为作者
          status: 'approved', // 私域内容自动通过，公域内容可能需要审核
          createdAt: content.createdAt || new Date().toISOString(),
          // 转换数据字段
          stats: convertedStats,
          performance: hotelPerformance, // 保留原始字段
          // 保留私域扩展字段
          contentType: content.contentType,
          subtype: content.subtype,
          groupScript: content.groupScript,
          privateScript: content.privateScript,
          videoScript: content.videoScript,
          images: content.images,
        };
        
        // 检查是否已存在
        const exists = store.contentItems.some((item) => item.id === content.id);
        if (!exists) {
          store.setContentItems([contentItem, ...store.contentItems]);
          
          // 添加通知（私域内容）
          if (content.platform === 'wechat') {
            store.addNotification({
              id: `notif-content-${content.id}`,
              type: 'info',
              title: '私域内容发布',
              message: `${hotelName} 发布了微信内容：${content.title}`,
              hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }
        break;
      }
      
      case 'CONTENT_STATS_UPDATED': {
        const { contentId, stats } = message;
        const content = store.contentItems.find((item) => item.id === contentId);
        
        if (content) {
          store.updateContent(contentId, {
            stats: {
              impressions: stats.impressions,
              clicks: stats.clicks,
              inquiries: 0, // 管理端可能没有咨询数据
              conversions: stats.conversions,
              ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
              conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
              updateTime: new Date().toISOString(),
            },
          });
        }
        break;
      }
    }
  }, isContentMessage);
  
  console.log('[AdminStore] Content sync subscription initialized');
  
  return () => {};
}
