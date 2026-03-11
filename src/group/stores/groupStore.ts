/**
 * Shadow-Bees V52 - 集团视角状态管理
 * 数据来源于酒店端（单体）的聚合
 * 核心价值：证明AI带来的商业价值（ROI）
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateMockData } from './mockData';
import type { Platform } from '@/types';
import { sharedGroup } from '@/shared/groupData';
import type { Ticket } from '@/admin/stores/adminStore';
import { getGroupTicketSync } from '@/services/ticketSync';

// ============================================
// 类型定义（与酒店端对齐的聚合类型）
// ============================================

export interface Group {
  id: string;
  name: string;
  logo?: string;
  hotelCount: number;
  regionCount: number;
}

export interface GroupUser {
  id: string;
  name: string;
  role: 'group_admin' | 'region_manager' | 'hotel_manager' | 'operator';
  avatar?: string;
  permissions: string[];
}

/**
 * 集团视角的门店数据 - 聚合自酒店端
 */
export interface HotelInGroup {
  id: string;
  name: string;
  region: string;
  brand?: string;
  manager: string;
  roomCount: number;
  status: 'active' | 'inactive' | 'warning' | 'critical';
  
  // === 核心经营指标（聚合自酒店端 transactions）===
  gmv: number;                    // 总交易额
  revpar: number;                 // 每间可售房收入
  occupancy: number;              // 入住率
  adr: number;                    // 已售房均价
  nonStandardRatio: number;       // 非标渠道占比
  
  // === 内容指标（聚合自酒店端 contents）===
  contentCount: number;           // 内容发布数
  contentScore: number;           // 内容质量分
  contentPerformance: {
    totalImpressions: number;     // 总曝光（公域）
    totalClicks: number;          // 总点击（公域）
    totalInquiries: number;       // 总咨询（公域）
    totalConversions: number;     // 总转化（公域订单）
    avgCTR: number;               // 平均点击率（公域）
    avgConversionRate: number;    // 平均转化率（公域）
    // === 私域专属指标（新增）===
    privateDomain: {
      totalTouches: number;       // 总触达客户数
      totalReplies: number;       // 总回复数
      totalPrivateConversions: number; // 私域成交数
      bySubtype: {               // 按私域子类型统计
        subtype: 'moments' | 'group' | 'private' | 'channels';
        count: number;
        touches: number;
        conversions: number;
      }[];
    };
    byPlatform: {
      platform: Platform;
      impressions: number;
      clicks: number;
      conversions: number;
      // 私域指标（仅 wechat 平台有效）
      touches?: number;
      replies?: number;
      privateConversions?: number;
    }[];
  };
  
  // === 客服指标（聚合自酒店端 systemUsage）===
  serviceScore: number;
  aiResolutionRate: number;       // AI客服解决率
  
  // === 健康度（计算值）===
  healthScore: number;
  healthLevel: 'healthy' | 'warning' | 'critical';
  
  // === 定价维度（聚合自酒店端 pricing）===
  pricing: {
    currentMode: 'scalper' | 'dynamic' | 'clearance';
    floorPrice: number;
    ceilingPrice: number;
    currentPrice: number;
    aiSuggestionPrice?: number;
    priceAdoptionRate: number;    // AI定价采纳率
    lastPriceChangeAt?: string;
  };
  
  // === 库存维度（聚合自酒店端 inventory）===
  inventory: {
    totalRooms: number;
    availableTonight: number;
    occupiedTonight: number;
    maintenanceRooms: number;
    occupancyRate: number;
    status: 'abundant' | 'normal' | 'tight' | 'soldout';
    tightRoomTypes?: string[];
  };
  
  // === 订单维度（聚合自酒店端 transactions）===
  orders: {
    totalCount: number;
    byPlatform: Record<Platform, number>;
    avgOrderValue: number;
    cancellationRate: number;
    refundRate: number;
    tonightOrders: number;
  };
  
  // === 竞品维度（聚合自酒店端 competitors）===
  competitor: {
    avgMarketPrice: number;
    priceDifference: number;
    competitorCount: number;
    rankInArea: number;
  };
  
  // === 系统使用维度（聚合自酒店端 auditLogs/system）===
  systemUsage: {
    lastLoginAt: string;
    loginFrequency: number;
    featureUsage: {
      aiContent: number;          // AI内容使用次数
      aiService: number;          // AI客服使用次数
      aiPricing: number;          // AI定价使用次数
    };
    dataCompleteness: number;
  };
  
  // === AI价值维度（计算值 - 核心）===
  aiValue: {
    pricingLift: number;          // AI定价带来的增收
    contentLift: number;          // AI内容带来的增收
    serviceLift: number;          // AI客服带来的增收
    totalLift: number;            // AI总增收
    laborHoursSaved: number;      // 节省人工工时
    laborCostSaved: number;       // 节省人工成本
    roi: number;                  // 投资回报率
  };
  
  // === 培训维度 ===
  training: {
    completed: boolean;
    completedAt?: string;
    score?: number;
  };
}

export interface RegionData {
  id: string;
  name: string;
  manager: string;
  hotelCount: number;
  gmv: number;
  revpar: number;
  occupancy: number;
  score: number;
  aiAdoptionRate: number;         // 区域AI采纳率
}

export interface ChannelData {
  platform: Platform;
  gmv: number;
  orderCount: number;
  ratio: number;
  change: number;
  // 内容效果
  contentCount: number;
  // === 公域指标 ===
  impressions: number;        // 曝光（公域）
  clicks: number;             // 点击（公域）
  conversions: number;        // 转化（公域）
  // === 私域专属指标（新增）===
  privateMetrics?: {
    touches: number;          // 触达客户数
    replies: number;          // 回复数
    privateConversions: number; // 私域成交数
    replyRate: number;        // 回复率
  };
  // 私域子类型分布
  subtypeDistribution?: {
    moments: number;          // 朋友圈
    group: number;            // 微信群
    private: number;          // 私聊
    channels: number;         // 视频号
  };
}

export interface GroupAnomaly {
  id: string;
  hotelId: string;
  hotelName: string;
  type: 'pricing' | 'inventory' | 'content' | 'service' | 'finance';
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'resolved';
  assignee?: string;
  // AI建议
  aiSuggestion?: string;
  estimatedImpact?: number;       // 预计影响金额
}

export interface PricingStrategy {
  id: string;
  name: string;
  type: 'holiday' | 'event' | 'daily';
  startDate: string;
  endDate: string;
  scope: 'all' | string[];
  rules: {
    baseIncrease: number;
    maxPremium: number;
    minOccupancy: number;
    channelDiscount?: Record<string, number>;
  };
  status: 'draft' | 'pending' | 'active' | 'expired';
  executionStatus: {
    total: number;
    confirmed: number;
    executed: number;
  };
  // 效果追踪
  baselineMetrics?: {
    avgRevpar: number;
    avgOccupancy: number;
  };
  actualMetrics?: {
    avgRevpar: number;
    avgOccupancy: number;
    lift: number;
  };
}

export interface ContentCampaign {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  targetHotels: string[];
  contentRequirements: {
    platform: Platform;
    count: number;
    templateId?: string;
  }[];
  status: 'planning' | 'active' | 'completed';
  progress: number;
  // 效果数据
  totalImpressions: number;
  totalConversions: number;
  roi: number;
}

export type TimeRange = 'today' | 'week' | 'month' | 'year';

export interface SystemHealthMetrics {
  overallScore: number;
  dimensions: {
    dataCompleteness: number;
    usageActivity: number;
    aiAdoption: number;
    trainingCompletion: number;
  };
  atRiskHotels: string[];
  activeHotels: string[];
}

export interface SupportTicket {
  id: string;
  hotelId: string;
  hotelName: string;
  type: 'bug' | 'feature' | 'training' | 'consultation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  status: 'open' | 'processing' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

export interface AIQuotaUsage {
  totalContentLimit: number;
  totalContentUsed: number;
  totalServiceLimit: number;
  totalServiceUsed: number;
  hotelUsage: {
    hotelId: string;
    hotelName: string;
    contentUsed: number;
    serviceUsed: number;
  }[];
}

/**
 * AI价值汇总（集团级）
 */
export interface AIValueSummary {
  // 增收
  pricingLift: number;            // AI定价增收
  contentLift: number;            // AI内容引流增收
  serviceLift: number;            // AI客服转化增收
  totalLift: number;              // 总增收
  
  // 降本
  laborHoursSaved: number;        // 节省工时
  laborCostSaved: number;         // 节省人工成本
  
  // ROI
  totalInvestment: number;        // 总投入（系统费用）
  netBenefit: number;             // 净收益
  roi: number;                    // ROI百分比
  paybackPeriod: number;          // 回本周期（月）
  
  // 趋势
  monthlyTrend: {
    month: string;
    lift: number;
    investment: number;
  }[];
  
  // 门店排名
  topPerformers: {
    hotelId: string;
    hotelName: string;
    aiValue: number;
    roi: number;
  }[];
}

// ============================================
// Mock 基础数据
// ============================================

const mockGroup: Group = {
  id: sharedGroup.id,
  name: sharedGroup.name,
  logo: sharedGroup.logo,
  hotelCount: sharedGroup.hotelCount,
  regionCount: sharedGroup.regionCount,
};

const mockUser: GroupUser = {
  id: 'user_001',
  name: '张总',
  role: 'group_admin',
  permissions: ['all'],
};

// ============================================
// AI价值计算（核心逻辑）
// ============================================

/**
 * 计算单店AI价值
 */
function calculateAIValue(hotel: HotelInGroup, days: number = 30): HotelInGroup['aiValue'] {
  
  // AI定价增收：假设AI定价比人工定价高5-15%
  const pricingLiftRate = 0.05 + Math.random() * 0.10;
  const pricingLift = Math.round(hotel.gmv * pricingLiftRate * 0.3); // 30%的GMV受定价影响
  
  // AI内容增收：假设AI内容带来的订单占20-40%
  const contentLiftRate = 0.20 + Math.random() * 0.20;
  const contentLift = Math.round(hotel.gmv * contentLiftRate * 0.3);
  
  // AI客服增收：假设AI客服提升转化率5-10%
  const serviceLiftRate = 0.05 + Math.random() * 0.05;
  const serviceLift = Math.round(hotel.gmv * serviceLiftRate * 0.2);
  
  const totalLift = pricingLift + contentLift + serviceLift;
  
  // 节省人工成本
  const hourlyRate = 50; // 元/小时
  const contentHoursSaved = hotel.contentCount * 0.5; // 每篇内容节省0.5小时
  const serviceHoursSaved = hotel.orders.totalCount * 0.2; // 每个订单节省0.2小时客服
  const pricingHoursSaved = days * 0.5; // 每天节省0.5小时定价调整
  const laborHoursSaved = Math.round(contentHoursSaved + serviceHoursSaved + pricingHoursSaved);
  const laborCostSaved = Math.round(laborHoursSaved * hourlyRate);
  
  // ROI计算（假设月订阅费5000/店）
  const monthlyFee = 5000;
  const roi = Math.round(((totalLift + laborCostSaved) / monthlyFee) * 100);
  
  return {
    pricingLift,
    contentLift,
    serviceLift,
    totalLift,
    laborHoursSaved,
    laborCostSaved,
    roi,
  };
}

/**
 * 生成集团级AI价值汇总
 */
function generateAIValueSummary(hotels: HotelInGroup[], days: number = 30, timeRange: TimeRange = 'month'): AIValueSummary {
  const totalLift = hotels.reduce((sum, h) => sum + h.aiValue.totalLift, 0);
  const laborCostSaved = hotels.reduce((sum, h) => sum + h.aiValue.laborCostSaved, 0);
  // 投入成本按时间范围比例计算（月费5000，日均约167）
  const dailyFeePerHotel = 5000 / 30;
  const totalInvestment = Math.round(hotels.length * dailyFeePerHotel * days);
  const netBenefit = totalLift + laborCostSaved - totalInvestment;
  const roi = Math.round((netBenefit / totalInvestment) * 100);
  
  // 根据时间范围生成不同的趋势数据
  let monthlyTrend: { month: string; lift: number; investment: number }[] = [];
  
  if (timeRange === 'today') {
    // 今日：显示24小时趋势（每4小时一个点）
    monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const hour = i * 4;
      const baseLift = totalLift / 6;
      const variation = (Math.random() - 0.5) * 0.4;
      return {
        month: `${hour}:00`,
        lift: Math.round(baseLift * (1 + variation)),
        investment: Math.round(totalInvestment / 6),
      };
    });
  } else if (timeRange === 'week') {
    // 本周：显示7天趋势
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    monthlyTrend = weekdays.map((day) => {
      const baseLift = totalLift / 7;
      const variation = (Math.random() - 0.5) * 0.3;
      return {
        month: day,
        lift: Math.round(baseLift * (1 + variation)),
        investment: Math.round(totalInvestment / 7),
      };
    });
  } else if (timeRange === 'month') {
    // 本月：显示4周趋势
    monthlyTrend = Array.from({ length: 4 }, (_, i) => {
      const baseLift = totalLift / 4;
      const variation = (Math.random() - 0.5) * 0.2;
      return {
        month: `第${i + 1}周`,
        lift: Math.round(baseLift * (1 + variation)),
        investment: Math.round(totalInvestment / 4),
      };
    });
  } else {
    // 本年：显示12个月趋势
    monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(2025, i, 1).toLocaleString('zh-CN', { month: 'short' });
      const baseLift = totalLift / 12;
      const variation = (Math.random() - 0.5) * 0.3;
      return {
        month,
        lift: Math.round(baseLift * (1 + variation)),
        investment: Math.round(totalInvestment / 12),
      };
    });
  }
  
  // 门店排名
  const topPerformers = [...hotels]
    .sort((a, b) => b.aiValue.totalLift - a.aiValue.totalLift)
    .slice(0, 5)
    .map(h => ({
      hotelId: h.id,
      hotelName: h.name,
      aiValue: h.aiValue.totalLift,
      roi: h.aiValue.roi,
    }));
  
  return {
    pricingLift: hotels.reduce((sum, h) => sum + h.aiValue.pricingLift, 0),
    contentLift: hotels.reduce((sum, h) => sum + h.aiValue.contentLift, 0),
    serviceLift: hotels.reduce((sum, h) => sum + h.aiValue.serviceLift, 0),
    totalLift,
    laborHoursSaved: hotels.reduce((sum, h) => sum + h.aiValue.laborHoursSaved, 0),
    laborCostSaved,
    totalInvestment,
    netBenefit,
    roi,
    paybackPeriod: Math.max(1, Math.round(totalInvestment / (totalLift / 12))),
    monthlyTrend,
    topPerformers,
  };
}

// ============================================
// Store 定义
// ============================================

interface GroupStore {
  // 基础数据
  currentGroup: Group | null;
  currentUser: GroupUser | null;
  hotels: HotelInGroup[];
  regions: RegionData[];
  channels: ChannelData[];
  anomalies: GroupAnomaly[];
  strategies: PricingStrategy[];
  campaigns: ContentCampaign[];
  systemHealth: SystemHealthMetrics;
  supportTickets: SupportTicket[];
  aiQuotaUsage: AIQuotaUsage;
  aiValueSummary: AIValueSummary;  // 新增：AI价值汇总
  
  // 集团提交的工单（同步给管理端）
  groupTickets: Ticket[];
  
  // 状态
  selectedTimeRange: TimeRange;
  selectedHotels: string[];
  isLoading: boolean;
  lastUpdated: number;
  
  // Actions
  setTimeRange: (range: TimeRange) => void;
  selectHotels: (hotelIds: string[]) => void;
  toggleHotelSelection: (hotelId: string) => void;
  getHotelById: (id: string) => HotelInGroup | undefined;
  getAnomaliesByHotel: (hotelId: string) => GroupAnomaly[];
  getAnomaliesByType: (type: GroupAnomaly['type']) => GroupAnomaly[];
  updateAnomalyStatus: (id: string, status: GroupAnomaly['status']) => void;
  getTicketsByHotel: (hotelId: string) => SupportTicket[];
  getTicketsByStatus: (status: SupportTicket['status']) => SupportTicket[];
  updateTicketStatus: (id: string, status: SupportTicket['status']) => void;
  getSystemHealthScore: () => number;
  getAtRiskHotels: () => HotelInGroup[];
  getTrainingCompletionRate: () => number;
  refreshData: () => void;
  
  // 工单 Actions（集团↔管理端）
  submitTicket: (data: {
    title: string;
    description: string;
    type: Ticket['type'];
    priority: Ticket['priority'];
    hotelId?: string;
  }) => void;
  receiveTicketUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  addTicketMessage: (ticketId: string, message: Ticket['messages'][0]) => void;
  resolveTicket: (ticketId: string, data: {
    rating: number;
    responseSpeed: 'fast' | 'normal' | 'slow';
    resolutionEffect: 'full' | 'partial' | 'none';
    ratingTags: string[];
    feedback: string;
  }) => void;
  urgeTicket: (ticketId: string) => { success: boolean; message: string };
  
  // 计算属性
  totalGMV: number;
  totalRevpar: number;
  avgOccupancy: number;
  avgNonStandardRatio: number;
  healthyHotelsCount: number;
  warningHotelsCount: number;
  criticalHotelsCount: number;
  totalContentUsed: number;
  totalServiceUsed: number;
  contentQuotaRemaining: number;
  serviceQuotaRemaining: number;
  openTicketsCount: number;
  timeRangeLabel: string;
  timeRangeDays: number;
  // AI价值计算
  totalAIValue: number;             // AI总增收
  totalLaborSaved: number;          // 总节省人工成本
  groupROI: number;                 // 集团整体ROI
  
  // === 财务合规（新增）===
  financeStats: {
    invoiceStats: {
      totalCount: number;
      totalAmount: number;
      pendingCount: number;
      pendingAmount: number;
      abnormalCount: number;
      byType: { type: 'vat' | 'normal' | 'electronic'; count: number; amount: number }[];
    };
    taxCompliance: {
      vatRate: number;
      lastDeclarationDate: string;
      nextDeclarationDate: string;
      status: 'compliant' | 'warning' | 'overdue';
      riskItems: string[];
    };
    auditLogs: {
      id: string;
      timestamp: string;
      hotelId: string;
      hotelName: string;
      operation: string;
      operator: string;
      amount?: number;
      status: 'normal' | 'warning' | 'critical';
    }[];
  };
  
  // === 库存日历（新增）===
  inventoryCalendar: {
    // 30天库存数据（按门店聚合）
    dailyInventory: {
      date: string;
      totalRooms: number;
      occupied: number;
      available: number;
      maintenance: number;
      occupancyRate: number;
      status: 'soldout' | 'tight' | 'normal' | 'abundant';
      byHotel: {
        hotelId: string;
        hotelName: string;
        total: number;
        occupied: number;
        available: number;
      }[];
    }[];
    // 库存预警
    inventoryAlerts: {
      id: string;
      type: 'soldout' | 'low' | 'maintenance';
      hotelId: string;
      hotelName: string;
      date: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
    }[];
  };
  
  // === 市场情报（新增）===
  marketIntelligence: {
    // 竞品监控
    competitors: {
      id: string;
      name: string;
      distance: number;
      price: number;
      priceChange: number;
      rating: number;
      occupancy: number;
      lastUpdated: string;
    }[];
    // 市场趋势
    marketTrends: {
      date: string;
      marketRevpar: number;
      marketOccupancy: number;
      ourRevpar: number;
      ourOccupancy: number;
    }[];
    // 定价建议
    pricingSuggestions: {
      type: 'aggressive' | 'conservative' | 'dynamic';
      price: number;
      lift: number;
      risk: 'high' | 'medium' | 'low';
      reason: string;
    }[];
    // 市场热度
    marketHeat: {
      level: 'high' | 'medium' | 'low';
      change: number;
      demandIndex: number;
    };
  };
}

// 生成策略数据
const mockStrategies: PricingStrategy[] = [
  {
    id: 'strategy_001',
    name: '春节假期统一定价策略',
    type: 'holiday',
    startDate: '2026-02-08',
    endDate: '2026-02-17',
    scope: 'all',
    rules: {
      baseIncrease: 30,
      maxPremium: 50,
      minOccupancy: 70,
      channelDiscount: { xianyu: 5, wechat: 5 },
    },
    status: 'active',
    executionStatus: { total: 10, confirmed: 8, executed: 7 },
    baselineMetrics: { avgRevpar: 320, avgOccupancy: 65 },
    actualMetrics: { avgRevpar: 420, avgOccupancy: 82, lift: 31 },
  },
];

// 生成战役数据
const mockCampaigns: ContentCampaign[] = [
  {
    id: 'campaign_001',
    name: '春节营销战役',
    theme: '春节团圆，温馨住宿',
    startDate: '2026-01-15',
    endDate: '2026-02-28',
    targetHotels: ['hotel_001', 'hotel_002', 'hotel_003', 'hotel_004'],
    contentRequirements: [
      { platform: 'xiaohongshu', count: 8 },
      { platform: 'wechat', count: 4 },
      { platform: 'xianyu', count: 6 },
    ],
    status: 'active',
    progress: 65,
    totalImpressions: 125000,
    totalConversions: 180,
    roi: 320,
  },
];

// 生成工单数据
const mockTickets: SupportTicket[] = [
  {
    id: 'TICKET-001',
    hotelId: 'hotel_003',
    hotelName: '望京科技店',
    type: 'training',
    priority: 'medium',
    title: '店长培训未完成',
    description: '刘强店长尚未完成AI客服功能培训，影响使用效果',
    status: 'open',
    createdAt: '2026-02-10T10:00:00Z',
    assignedTo: '运营支持-小王',
  },
  {
    id: 'TICKET-002',
    hotelId: 'hotel_001',
    hotelName: '三里屯精品店',
    type: 'feature',
    priority: 'low',
    title: '希望增加自定义报表',
    description: '希望能在数据总览中添加自定义指标卡片',
    status: 'processing',
    createdAt: '2026-02-15T14:30:00Z',
    assignedTo: '产品-李明',
  },
];

// 生成异常数据
const generateAnomalies = (hotels: HotelInGroup[]): GroupAnomaly[] => {
  const anomalies: GroupAnomaly[] = [];
  
  hotels.forEach((h, i) => {
    if (h.healthLevel !== 'healthy') {
      anomalies.push({
        id: `ano_${String(i + 1).padStart(3, '0')}`,
        hotelId: h.id,
        hotelName: h.name,
        type: h.healthLevel === 'critical' ? 'pricing' : 'content',
        level: h.healthLevel === 'critical' ? 'critical' : 'warning',
        title: h.healthLevel === 'critical' ? '定价偏离市场价' : '内容违规被限流',
        description: h.healthLevel === 'critical'
          ? `当前售价比竞品高${Math.abs(h.competitor.priceDifference)}元，建议调整`
          : `近7天发布的内容中有${Math.floor(Math.random() * 3) + 1}篇被判定违规`,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        status: 'pending',
        aiSuggestion: h.healthLevel === 'critical' 
          ? `建议降价至¥${h.competitor.avgMarketPrice}，预计可提升入住率15%`
          : '建议使用AI内容助手重新生成，避免敏感词',
        estimatedImpact: h.healthLevel === 'critical' ? 5000 : 2000,
      });
    }
  });
  
  return anomalies;
};

// 生成区域数据
const generateRegions = (hotels: HotelInGroup[]): RegionData[] => {
  const regionMap = new Map<string, { hotels: HotelInGroup[]; manager: string }>();
  
  hotels.forEach(h => {
    if (!regionMap.has(h.region)) {
      regionMap.set(h.region, { hotels: [], manager: '' });
    }
    regionMap.get(h.region)!.hotels.push(h);
  });
  
  regionMap.get('华北区')!.manager = '张伟';
  regionMap.get('华东区')!.manager = '赵敏';
  regionMap.get('华南区')!.manager = '李强';
  regionMap.get('华西区')!.manager = '王磊';
  
  return Array.from(regionMap.entries()).map(([name, data], index) => ({
    id: `region_${String(index + 1).padStart(3, '0')}`,
    name,
    manager: data.manager,
    hotelCount: data.hotels.length,
    gmv: data.hotels.reduce((s, h) => s + h.gmv, 0),
    revpar: Math.round(data.hotels.reduce((s, h) => s + h.revpar, 0) / data.hotels.length),
    occupancy: Math.round(data.hotels.reduce((s, h) => s + h.occupancy, 0) / data.hotels.length),
    score: Math.round(data.hotels.reduce((s, h) => s + h.healthScore, 0) / data.hotels.length),
    aiAdoptionRate: Math.round(data.hotels.reduce((s, h) => s + h.pricing.priceAdoptionRate, 0) / data.hotels.length),
  }));
};

// ============================================
// 生成财务合规数据（新增）
// ============================================
const generateFinanceStats = (hotels: HotelInGroup[]) => {
  // 基于酒店GMV计算发票统计
  const totalGMV = hotels.reduce((sum, h) => sum + h.gmv, 0);
  const totalCount = Math.floor(totalGMV / 3000); // 平均每单3000元
  const totalAmount = totalGMV;
  const pendingCount = Math.floor(totalCount * 0.02); // 2%待开
  const pendingAmount = Math.floor(totalAmount * 0.025);
  const abnormalCount = Math.floor(Math.random() * 5);

  return {
    invoiceStats: {
      totalCount,
      totalAmount,
      pendingCount,
      pendingAmount,
      abnormalCount,
      byType: [
        { type: 'vat' as const, count: Math.floor(totalCount * 0.35), amount: Math.floor(totalAmount * 0.55) },
        { type: 'normal' as const, count: Math.floor(totalCount * 0.35), amount: Math.floor(totalAmount * 0.30) },
        { type: 'electronic' as const, count: Math.floor(totalCount * 0.30), amount: Math.floor(totalAmount * 0.15) },
      ],
    },
    taxCompliance: {
      vatRate: 6,
      lastDeclarationDate: '2026-01-15',
      nextDeclarationDate: '2026-02-15',
      status: 'compliant' as const,
      riskItems: [],
    },
    auditLogs: hotels.flatMap((h) => [
      {
        id: `audit_${h.id}_1`,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString().slice(0, 19).replace('T', ' '),
        hotelId: h.id,
        hotelName: h.name,
        operation: '价格调整',
        operator: h.manager,
        amount: Math.floor(Math.random() * 5000) + 1000,
        status: 'normal' as const,
      },
      {
        id: `audit_${h.id}_2`,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString().slice(0, 19).replace('T', ' '),
        hotelId: h.id,
        hotelName: h.name,
        operation: '订单取消',
        operator: '系统',
        amount: Math.floor(Math.random() * 2000) + 500,
        status: Math.random() > 0.8 ? 'warning' as const : 'normal' as const,
      },
    ]).slice(0, 10), // 只保留前10条
  };
};

// 生成库存日历数据（新增）
const generateInventoryCalendar = (hotels: HotelInGroup[]) => {
  const dailyInventory = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 聚合所有酒店的库存
    const byHotel = hotels.map(h => {
      const baseOccupancy = h.occupancy / 100;
      const dailyVariation = (Math.random() - 0.5) * 0.2; // ±10%波动
      const occupancyRate = Math.max(0.1, Math.min(0.95, baseOccupancy + dailyVariation));
      const occupied = Math.floor(h.roomCount * occupancyRate);
      
      return {
        hotelId: h.id,
        hotelName: h.name,
        total: h.roomCount,
        occupied,
        available: h.roomCount - occupied - h.inventory.maintenanceRooms,
      };
    });
    
    const totalRooms = byHotel.reduce((sum, h) => sum + h.total, 0);
    const occupied = byHotel.reduce((sum, h) => sum + h.occupied, 0);
    const maintenance = hotels.reduce((sum, h) => sum + h.inventory.maintenanceRooms, 0);
    const available = totalRooms - occupied - maintenance;
    const occupancyRate = Math.round((occupied / totalRooms) * 100);
    
    let status: 'soldout' | 'tight' | 'normal' | 'abundant';
    if (available <= 0) status = 'soldout';
    else if (available < hotels.length * 10) status = 'tight';
    else if (available > hotels.length * 30) status = 'abundant';
    else status = 'normal';
    
    dailyInventory.push({
      date: dateStr,
      totalRooms,
      occupied,
      available,
      maintenance,
      occupancyRate,
      status,
      byHotel,
    });
  }
  
  // 生成库存预警
  const inventoryAlerts: { id: string; type: 'soldout' | 'low'; hotelId: string; hotelName: string; date: string; severity: 'high' | 'medium'; message: string; }[] = [];
  dailyInventory.forEach(day => {
    if (day.available < 20) {
      const hotel = day.byHotel.find(h => h.available < 5);
      if (hotel) {
        inventoryAlerts.push({
          id: `inv_${day.date}_${hotel.hotelId}`,
          type: day.available <= 0 ? 'soldout' as const : 'low' as const,
          hotelId: hotel.hotelId,
          hotelName: hotel.hotelName,
          date: day.date,
          severity: day.available <= 0 ? 'high' as const : 'medium' as const,
          message: day.available <= 0 ? '该日期已满房' : `仅剩${hotel.available}间房`,
        });
      }
    }
  });
  
  return { dailyInventory, inventoryAlerts: inventoryAlerts.slice(0, 5) };
};

// 生成市场情报数据（新增）
const generateMarketIntelligence = (hotels: HotelInGroup[]) => {
  // 基于第一家酒店的竞品数据生成
  const baseHotel = hotels[0];
  const basePrice = baseHotel.pricing.currentPrice;
  
  const competitors = [
    { id: 'comp_1', name: '汉庭酒店', distance: 0.8, basePriceRatio: 0.9 },
    { id: 'comp_2', name: '如家精选', distance: 1.2, basePriceRatio: 1.0 },
    { id: 'comp_3', name: '全季酒店', distance: 1.5, basePriceRatio: 1.2 },
    { id: 'comp_4', name: '亚朵酒店', distance: 2.1, basePriceRatio: 1.4 },
    { id: 'comp_5', name: '7天优品', distance: 0.5, basePriceRatio: 0.7 },
  ].map(c => ({
    id: c.id,
    name: c.name,
    distance: c.distance,
    price: Math.round(basePrice * c.basePriceRatio),
    priceChange: Math.floor(Math.random() * 30) - 10,
    rating: Number((3.8 + Math.random() * 1.0).toFixed(1)),
    occupancy: Math.floor(65 + Math.random() * 25),
    lastUpdated: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  }));
  
  // 生成7天市场趋势
  const marketTrends = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const ourRevpar = Math.round(hotels.reduce((sum, h) => sum + h.revpar, 0) / hotels.length * (0.9 + Math.random() * 0.2));
    const marketRevpar = Math.round(ourRevpar * (0.95 + Math.random() * 0.1));
    marketTrends.push({
      date: date.toISOString().slice(5, 10),
      marketRevpar,
      marketOccupancy: Math.floor(70 + Math.random() * 15),
      ourRevpar,
      ourOccupancy: Math.floor(hotels.reduce((sum, h) => sum + h.occupancy, 0) / hotels.length),
    });
  }
  
  // 定价建议
  const avgMarketPrice = Math.round(competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length);
  // const ourPrice = basePrice; // 保留用于未来扩展
  
  const pricingSuggestions = [
    {
      type: 'aggressive' as const,
      price: Math.round(avgMarketPrice * 1.1),
      lift: 15,
      risk: 'medium' as const,
      reason: '高于市场均价，适合高需求日期',
    },
    {
      type: 'conservative' as const,
      price: Math.round(avgMarketPrice * 0.95),
      lift: 5,
      risk: 'low' as const,
      reason: '略低于市场，保证入住率',
    },
    {
      type: 'dynamic' as const,
      price: avgMarketPrice,
      lift: 10,
      risk: 'low' as const,
      reason: '跟随市场均价，自动调整',
    },
  ];
  
  // 市场热度
  const marketHeat = {
    level: (Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    change: Math.floor(Math.random() * 20) - 5,
    demandIndex: Math.floor(80 + Math.random() * 30),
  };
  
  return { competitors, marketTrends, pricingSuggestions, marketHeat };
};

// 生成渠道数据
const generateChannels = (hotels: HotelInGroup[]): ChannelData[] => {
  const platforms: Platform[] = ['xiaohongshu', 'wechat', 'xianyu'];
  
  return platforms.map((platform, index) => {
    const ratio = index === 0 ? 0.35 : index === 1 ? 0.30 : 0.35;
    const gmv = Math.round(hotels.reduce((s, h) => s + h.gmv, 0) * ratio);
    const contentCount = hotels.reduce((s, h) => {
      const platformData = h.contentPerformance?.byPlatform?.find(p => p.platform === platform);
      return s + (platformData?.conversions || 0);
    }, 0);
    const impressions = hotels.reduce((s, h) => {
      const platformData = h.contentPerformance?.byPlatform?.find(p => p.platform === platform);
      return s + (platformData?.impressions || 0);
    }, 0);
    const clicks = hotels.reduce((s, h) => {
      const platformData = h.contentPerformance?.byPlatform?.find(p => p.platform === platform);
      return s + (platformData?.clicks || 0);
    }, 0);
    const conversions = hotels.reduce((s, h) => {
      const platformData = h.contentPerformance?.byPlatform?.find(p => p.platform === platform);
      return s + (platformData?.conversions || 0);
    }, 0);
    
    // === 私域专属数据（仅微信）===
    const isWechat = platform === 'wechat';
    const privateMetrics = isWechat ? {
      touches: Math.floor(Math.random() * 500) + 200,      // 触达客户数
      replies: Math.floor(Math.random() * 100) + 50,       // 回复数
      privateConversions: Math.floor(Math.random() * 30) + 10, // 私域成交
      replyRate: Number((Math.random() * 20 + 10).toFixed(1)), // 回复率 10-30%
    } : undefined;
    
    const subtypeDistribution = isWechat ? {
      moments: Math.floor(Math.random() * 20) + 10,   // 朋友圈
      group: Math.floor(Math.random() * 15) + 5,      // 微信群
      private: Math.floor(Math.random() * 30) + 20,   // 私聊
      channels: Math.floor(Math.random() * 10) + 5,   // 视频号
    } : undefined;
    
    return {
      platform,
      gmv,
      orderCount: Math.floor(gmv / 500),
      ratio: Math.round(ratio * 100),
      change: Number((Math.random() * 20 - 5).toFixed(1)),
      contentCount,
      impressions,
      clicks,
      conversions,
      // 私域指标（仅微信有效）
      privateMetrics,
      subtypeDistribution,
    };
  });
};

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => {
      // 初始数据生成（使用 month 作为默认时间范围）
      const timeRange: TimeRange = 'month';
      const days = 30; // month 的默认天数
      const { hotels: baseHotels, systemHealth, aiQuotaUsage } = generateMockData(timeRange);
      
      // 计算AI价值
      const hotelsWithAIValue = baseHotels.map(h => ({
        ...h,
        aiValue: calculateAIValue(h, days),
      }));
      
      const aiValueSummary = generateAIValueSummary(hotelsWithAIValue, days, timeRange);
      const anomalies = generateAnomalies(hotelsWithAIValue);
      const regions = generateRegions(hotelsWithAIValue);
      const channels = generateChannels(hotelsWithAIValue);
      
      // 新增：财务、库存、市场数据
      const financeStats = generateFinanceStats(hotelsWithAIValue);
      const inventoryCalendar = generateInventoryCalendar(hotelsWithAIValue);
      const marketIntelligence = generateMarketIntelligence(hotelsWithAIValue);
      
      return {
        // 数据
        currentGroup: mockGroup,
        currentUser: mockUser,
        hotels: hotelsWithAIValue,
        regions,
        channels,
        anomalies,
        strategies: mockStrategies,
        campaigns: mockCampaigns,
        systemHealth,
        supportTickets: mockTickets,
        aiQuotaUsage,
        aiValueSummary,
        
        // 集团提交的工单（包含示例数据）
        groupTickets: [
          {
            id: 'GT-001',
            hotelId: '',
            hotelName: '集团总部',
            title: '系统使用培训申请',
            description: '我们集团旗下新开了3家门店，希望安排系统使用培训，包括定价策略、内容发布、客服设置等模块。',
            type: 'consult',
            status: 'processing',
            priority: 'medium',
            source: 'manual',
            tags: ['group', 'training'],
            messages: [
              {
                id: 'msg-001',
                sender: 'hotel',
                senderName: '集团管理员',
                content: '系统使用培训申请\n我们集团旗下新开了3家门店，希望安排系统使用培训。',
                timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
              },
              {
                id: 'msg-002',
                sender: 'admin',
                senderName: '运营专员-小李',
                content: '收到您的培训申请，我们可以安排在下周三下午2点进行线上培训，您看是否方便？培训时长约2小时。',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
              }
            ],
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            assignedToName: '运营专员-小李',
            customerType: 'group',
            isGroupLevel: true,
          },
          {
            id: 'GT-002',
            hotelId: 'hotel-1',
            hotelName: '海景花园酒店',
            title: '定价策略异常反馈',
            description: '最近发现系统推荐的定价策略在某些节假日异常偏低，可能导致收益损失，请帮忙检查算法设置。',
            type: 'tech',
            status: 'open',
            priority: 'high',
            source: 'manual',
            tags: ['group', 'pricing'],
            messages: [],
            createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
            customerType: 'group',
            isGroupLevel: true,
          },
          {
            id: 'GT-003',
            hotelId: '',
            hotelName: '集团总部',
            title: '财务报表导出功能咨询',
            description: '想了解一下财务报表导出功能的详细使用方法，以及是否支持自定义字段和定时自动导出。',
            type: 'business',
            status: 'resolved',
            priority: 'low',
            source: 'manual',
            tags: ['group', 'finance'],
            messages: [
              {
                id: 'msg-003',
                sender: 'hotel',
                senderName: '集团管理员',
                content: '想了解一下财务报表导出功能...',
                timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
              },
              {
                id: 'msg-004',
                sender: 'admin',
                senderName: '运营专员-小王',
                content: '财务报表导出功能支持多种格式（Excel/PDF），也支持自定义字段选择。定时导出功能目前正在开发中，预计下月上线。',
                timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
              },
              {
                id: 'msg-005',
                sender: 'hotel',
                senderName: '集团管理员',
                content: '好的，感谢解答！',
                timestamp: new Date(Date.now() - 86400000 * 4 + 3600000).toISOString(),
              }
            ],
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            assignedToName: '运营专员-小王',
            customerType: 'group',
            isGroupLevel: true,
          },
        ] as Ticket[],
        
        // 新增数据
        financeStats,
        inventoryCalendar,
        marketIntelligence,
        
        // 状态
        selectedTimeRange: timeRange,
        selectedHotels: hotelsWithAIValue.map(h => h.id),
        isLoading: false,
        lastUpdated: Date.now(),
        
        // Actions
        setTimeRange: (range) => {
          const days = { today: 1, week: 7, month: 30, year: 365 }[range];
          const { hotels: newHotels, systemHealth: newHealth, aiQuotaUsage: newQuota } = generateMockData(range);
          const newHotelsWithAIValue = newHotels.map(h => ({
            ...h,
            aiValue: calculateAIValue(h, days),
          }));
          
          set({ 
            selectedTimeRange: range,
            hotels: newHotelsWithAIValue,
            systemHealth: newHealth,
            aiQuotaUsage: newQuota,
            aiValueSummary: generateAIValueSummary(newHotelsWithAIValue, days, range),
            anomalies: generateAnomalies(newHotelsWithAIValue),
            regions: generateRegions(newHotelsWithAIValue),
            channels: generateChannels(newHotelsWithAIValue),
            // 新增：更新时间范围时重新计算财务、库存、市场数据
            financeStats: generateFinanceStats(newHotelsWithAIValue),
            inventoryCalendar: generateInventoryCalendar(newHotelsWithAIValue),
            marketIntelligence: generateMarketIntelligence(newHotelsWithAIValue),
            lastUpdated: Date.now(),
          });
        },
        
        selectHotels: (hotelIds) => set({ selectedHotels: hotelIds }),
        
        toggleHotelSelection: (hotelId) => set((state) => ({
          selectedHotels: state.selectedHotels.includes(hotelId)
            ? state.selectedHotels.filter(id => id !== hotelId)
            : [...state.selectedHotels, hotelId],
        })),
        
        getHotelById: (id) => get().hotels.find(h => h.id === id),
        
        getAnomaliesByHotel: (hotelId) => 
          get().anomalies.filter(a => a.hotelId === hotelId),
        
        getAnomaliesByType: (type) => 
          get().anomalies.filter(a => a.type === type),
        
        updateAnomalyStatus: (id, status) => set((state) => ({
          anomalies: state.anomalies.map(a => 
            a.id === id ? { ...a, status } : a
          ),
        })),
        
        getTicketsByHotel: (hotelId) =>
          get().supportTickets.filter(t => t.hotelId === hotelId),
        
        getTicketsByStatus: (status) =>
          get().supportTickets.filter(t => t.status === status),
        
        updateTicketStatus: (id, status) => set((state) => ({
          supportTickets: state.supportTickets.map(t =>
            t.id === id ? { ...t, status } : t
          ),
        })),
        
        getSystemHealthScore: () => get().systemHealth.overallScore,
        
        getAtRiskHotels: () => {
          const atRiskIds = get().systemHealth.atRiskHotels;
          return get().hotels.filter(h => atRiskIds.includes(h.id));
        },
        
        getTrainingCompletionRate: () => {
          const hotels = get().hotels;
          const completed = hotels.filter(h => h.training.completed).length;
          return Math.round((completed / hotels.length) * 100);
        },
        
        refreshData: () => {
          const range = get().selectedTimeRange;
          const days = { today: 1, week: 7, month: 30, year: 365 }[range];
          const { hotels: newHotels, systemHealth: newHealth, aiQuotaUsage: newQuota } = generateMockData(range);
          const newHotelsWithAIValue = newHotels.map(h => ({
            ...h,
            aiValue: calculateAIValue(h, days),
          }));
          
          set({
            hotels: newHotelsWithAIValue,
            systemHealth: newHealth,
            aiQuotaUsage: newQuota,
            aiValueSummary: generateAIValueSummary(newHotelsWithAIValue, days, range),
            anomalies: generateAnomalies(newHotelsWithAIValue),
            regions: generateRegions(newHotelsWithAIValue),
            channels: generateChannels(newHotelsWithAIValue),
            lastUpdated: Date.now(),
          });
        },
        
        // 提交工单给管理端
        submitTicket: (data) => {
          const newTicket: Ticket = {
            id: `GT-${Date.now()}`,
            hotelId: data.hotelId || '',
            hotelName: data.hotelId 
              ? get().hotels.find(h => h.id === data.hotelId)?.name || '未知门店'
              : '集团总部',
            title: data.title,
            description: data.description,
            type: data.type,
            status: 'open',
            priority: data.priority,
            source: 'manual',
            tags: ['group'],
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customerType: 'group',
            isGroupLevel: true,
          };
          
          set((state) => ({
            groupTickets: [newTicket, ...state.groupTickets],
          }));
          
          // 通过 BroadcastChannel 发送给管理端
          const sync = getGroupTicketSync();
          sync.broadcast({
            type: 'TICKET_CREATED',
            ticket: newTicket,
            timestamp: Date.now(),
          });
        },
        
        // 接收管理端的工单更新
        receiveTicketUpdate: (ticketId, updates) => {
          set((state) => ({
            groupTickets: state.groupTickets.map(t =>
              t.id === ticketId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
            ),
          }));
        },
        
        // 添加消息到工单
        addTicketMessage: (ticketId, message) => {
          set((state) => ({
            groupTickets: state.groupTickets.map(t =>
              t.id === ticketId 
                ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() } 
                : t
            ),
          }));
        },
        
        // 评价工单（解决并评价）
        resolveTicket: (ticketId, data) => {
          set((state) => ({
            groupTickets: state.groupTickets.map(t =>
              t.id === ticketId 
                ? { 
                    ...t, 
                    status: 'resolved',
                    rating: data.rating,
                    responseSpeed: data.responseSpeed,
                    resolutionEffect: data.resolutionEffect,
                    ratingTags: data.ratingTags,
                    feedback: data.feedback,
                    resolvedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  } 
                : t
            ),
          }));
        },
        
        // 催单
        urgeTicket: (ticketId) => {
          const ticket = get().groupTickets.find(t => t.id === ticketId);
          if (!ticket) return { success: false, message: '工单不存在' };
          
          const currentCount = ticket.urgentCount || 0;
          if (currentCount >= 3) {
            return { success: false, message: '已多次催促，请耐心等待' };
          }
          
          set((state) => ({
            groupTickets: state.groupTickets.map(t =>
              t.id === ticketId 
                ? { ...t, urgentCount: currentCount + 1, lastUrgentAt: new Date().toISOString() } 
                : t
            ),
          }));
          
          // 广播催单给管理端
          const sync = getGroupTicketSync();
          sync.broadcast({
            type: 'TICKET_URGENT',
            ticketId,
            urgentCount: currentCount + 1,
            timestamp: Date.now(),
          });
          
          return { success: true, message: `已催促第${currentCount + 1}次，平台将优先处理` };
        },
        
        // 计算属性
        get totalGMV() {
          return get().hotels.reduce((sum, h) => sum + h.gmv, 0);
        },
        
        get totalRevpar() {
          const hotels = get().hotels;
          return Math.round(hotels.reduce((sum, h) => sum + h.revpar, 0) / hotels.length);
        },
        
        get avgOccupancy() {
          const hotels = get().hotels;
          return Math.round(hotels.reduce((sum, h) => sum + h.occupancy, 0) / hotels.length);
        },
        
        get avgNonStandardRatio() {
          const hotels = get().hotels;
          return Math.round(hotels.reduce((sum, h) => sum + h.nonStandardRatio, 0) / hotels.length);
        },
        
        get healthyHotelsCount() {
          return get().hotels.filter(h => h.healthLevel === 'healthy').length;
        },
        
        get warningHotelsCount() {
          return get().hotels.filter(h => h.healthLevel === 'warning').length;
        },
        
        get criticalHotelsCount() {
          return get().hotels.filter(h => h.healthLevel === 'critical').length;
        },
        
        get totalContentUsed() {
          return get().aiQuotaUsage.totalContentUsed;
        },
        
        get totalServiceUsed() {
          return get().aiQuotaUsage.totalServiceUsed;
        },
        
        get contentQuotaRemaining() {
          const quota = get().aiQuotaUsage;
          return quota.totalContentLimit - quota.totalContentUsed;
        },
        
        get serviceQuotaRemaining() {
          const quota = get().aiQuotaUsage;
          return quota.totalServiceLimit - quota.totalServiceUsed;
        },
        
        get openTicketsCount() {
          return get().supportTickets.filter(t => t.status === 'open' || t.status === 'processing').length;
        },
        
        get timeRangeLabel() {
          const labels: Record<TimeRange, string> = {
            today: '今日',
            week: '本周',
            month: '本月',
            year: '本年',
          };
          return labels[get().selectedTimeRange];
        },
        
        get timeRangeDays() {
          const days: Record<TimeRange, number> = {
            today: 1,
            week: 7,
            month: 30,
            year: 365,
          };
          return days[get().selectedTimeRange];
        },
        
        // AI价值计算属性
        get totalAIValue() {
          return get().hotels.reduce((sum, h) => sum + h.aiValue.totalLift, 0);
        },
        
        get totalLaborSaved() {
          return get().hotels.reduce((sum, h) => sum + h.aiValue.laborCostSaved, 0);
        },
        
        get groupROI() {
          return get().aiValueSummary.roi;
        },
      };
    },
    {
      name: 'group-store',
      partialize: (state) => ({
        selectedTimeRange: state.selectedTimeRange,
        selectedHotels: state.selectedHotels,
      }),
      onRehydrateStorage: () => (state) => {
        // 持久化恢复后，根据保存的时间范围重新生成数据
        if (state) {
          const range = state.selectedTimeRange;
          const days = { today: 1, week: 7, month: 30, year: 365 }[range];
          const { hotels: newHotels, systemHealth: newHealth, aiQuotaUsage: newQuota } = generateMockData(range);
          const newHotelsWithAIValue = newHotels.map(h => ({
            ...h,
            aiValue: calculateAIValue(h, days),
          }));
          
          state.hotels = newHotelsWithAIValue;
          state.systemHealth = newHealth;
          state.aiQuotaUsage = newQuota;
          state.aiValueSummary = generateAIValueSummary(newHotelsWithAIValue, days, range);
          state.anomalies = generateAnomalies(newHotelsWithAIValue);
          state.regions = generateRegions(newHotelsWithAIValue);
          state.channels = generateChannels(newHotelsWithAIValue);
          state.lastUpdated = Date.now();
        }
      },
    }
  )
);
