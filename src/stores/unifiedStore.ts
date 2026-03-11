/**
 * Shadow-Bees V52 - 统一状态管理（重构版）
 * 完整数据联动 + 权限控制 + 审计日志
 */

import { create } from 'zustand';
import type { 
  Hotel, RoomType, Competitor, Pricing, Inventory, 
  Transaction, ContentItem, Alert, User, ThemeType, PricingMode, Platform,
  OrderStatus, AuditLog, DailyInventory
} from '@/types';
import { hotels, eventsMap } from '@/data/hotels';
import { 
  generateDailyCompetitorData, 
  calculateCompetitorStats,
  generateHotelsByTier
} from '@/utils/competitorDataGenerator';
import { type Snapshot, type SandboxVariables, defaultSandboxVariables, snapshots } from '@/data/snapshots';
import { generateId } from '@/utils/helpers';
import { 
  suggestFloorPriceAdjustment
} from '@/utils/smartPricingEngine';
import type { DailyCompetitorData } from '@/utils/competitorDataGenerator';
import { generatePresetOrders, generateTestOrders } from '@/utils/orderDataGenerator';
import { getHotelTicketSync } from '@/services/ticketSync';
import { getHotelRefundSync } from '@/services/refundSync';
import { getHotelInventorySync } from '@/services/inventorySync';
import { getHotelSync } from '@/services/unifiedSync';
import { channelManager } from '@/shared/channel';

export interface CompetitorAPIConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  refreshInterval: number;
}

export type TimeMode = 'realtime' | 'history' | 'sandbox';

// ============================================
// 状态定义
// ============================================

interface UnifiedState {
  currentHotel: Hotel;
  currentRoomType: RoomType;
  currentTheme: ThemeType;
  currentMode: PricingMode;
  timeMode: TimeMode;
  
  // 酒店列表（原始+临时）
  tempHotels: Hotel[];
  
  competitors: Competitor[];
  events: import('@/types').Event[];
  pricing: Pricing;
  inventory: Inventory;
  transactions: Transaction[];
  contents: ContentItem[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  
  yesterdayStats: {
    revenue: number;
    roomsSold: number;
  };
  
  // ===== 预设对比数据（用于实时推演模式的对比基准）=====
  presetStats: {
    // 今日基准数据（用于对比今日表现）
    today: {
      revenue: number;      // 预设今日目标GMV
      orders: number;       // 预设今日目标订单数
      checkins: number;     // 预设今日入住数
    };
    // 本周基准数据（用于对比本周表现，包含今日）
    thisWeek: {
      revenue: number;
      orders: number;
      avgPrice: number;
      checkins: number;     // 本周累计入住
    };
    // 本月基准数据（用于对比本月表现，包含本周）
    thisMonth: {
      revenue: number;
      orders: number;
      contentCount: number;
      checkins: number;     // 本月累计入住
    };
  };
  
  pendingPriceApproval: {
    id: string;
    requestedBy: string;
    currentPrice: number;
    requestedPrice: number;
    reason: string;
    timestamp: string;
  } | null;
  
  user: User;
  
  // 自动确认订单设置（开启后新订单自动确认，无需人工干预）
  autoConfirmOrders: boolean;
  
  isLoading: boolean;
  loadingText: string;
  currentTime: string;
  
  realtimeSimulation: {
    isRunning: boolean;
    lastTransactionTime: number;
  };
  historyPlayback: {
    currentSnapshot: Snapshot | null;
    playbackPosition: number;
    isPlaying: boolean;
    appliedEvents: Set<string>;
  };
  sandboxState: {
    frozenBaseState: {
      pricing: Pricing;
      inventory: Inventory;
      competitors: Competitor[];
    } | null;
    variables: SandboxVariables;
    simulatedResult: {
      pricing: Pricing;
      inventory: Inventory;
      competitors: Competitor[];
      metrics?: {
        expectedVolume: number;
        expectedRevenue: number;
        revenueChange: string;
        inventoryPressure: string;
        recommendedStrategy: string;
      };
    } | null;
  };
  
  // ===== 按房型的竞品数据（核心）=====
  competitorDataByRoomType: DailyCompetitorData | null;
  
  // ===== 按房型的定价（核心）=====
  pricingByRoomType: Record<string, {
    suggestedPrice: number;
    mode: PricingMode;
    competitorAvg: number;
    reasoning: string;
  }>;
  
  // ===== 智能定价系统 =====
  smartPricing: {
    enabled: boolean; // 是否启用自动定价
    autoApply: boolean; // 是否自动应用建议价（true=自动，false=手动确认）
    lastAutoModeChange: number; // 上次自动切换模式时间
    autoModeChangeCount: number; // 今日自动切换次数
    competitorAPIConfig: CompetitorAPIConfig;
    lastPricingUpdate: number; // 上次调价时间
    todayPricingUpdateCount: number; // 今日调价次数
    floorPriceSuggestion: {
      show: boolean;
      roomTypeId: string;
      suggestedPrice: number;
      reason: string;
      trend: 'up' | 'down';
    } | null;
  };
  
  // Actions
  setLoading: (loading: boolean, text?: string) => void;
  updateCurrentTime: () => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  generateSmartAlerts: () => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'time' | 'user' | 'userRole'>) => void;
  
  switchTimeMode: (mode: TimeMode) => void;
  startRealtimeSimulation: () => void;
  stopRealtimeSimulation: () => void;
  generateRealtimeTransaction: () => void;
  generateRealtimeContent: (targetPlatform?: Platform) => void;
  applyRandomFluctuations: () => void;
  loadSnapshot: (snapshotId: string) => void;
  seekHistory: (position: number) => void;
  playHistory: () => void;
  pauseHistory: () => void;
  applyEventEffect: (event: any) => void;
  updateSandboxVariable: (key: keyof SandboxVariables, value: any) => void;
  calculateSandboxResult: () => void;
  
  switchHotel: (hotelId: string) => Promise<void>;
  switchRoomType: (roomTypeId: string) => Promise<void>;
  switchUser: (user: User) => void;
  updateUserPermissions: (userId: string, permissions: Partial<User['permissions']>) => void;
  
  updateBasePrice: (price: number, reason?: string) => void;
  updateCurrentPrice: (price: number, reason?: string) => void;
  requestPriceChange: (requestedPrice: number, reason: string) => void;
  approvePriceChange: () => void;
  rejectPriceChange: () => void;
  
  addTransaction: (transaction: Transaction) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  processRefund: (orderId: string, amount: number, reason: string) => void;
  
  // 订单管理（确认/取消/退款）
  confirmOrder: (orderId: string) => boolean;
  cancelOrder: (orderId: string) => boolean;
  requestRefundFromUser: (orderId: string, reason: string) => boolean;
  approveRefund: (orderId: string) => boolean;
  rejectRefund: (orderId: string, reason: string) => boolean;
  
  addContent: (content: ContentItem) => void;
  publishContent: (contentId: string) => void;
  
  initInventory: () => void;
  
  // 酒店初始化
  initHotel: (hotel: Hotel) => void;
  
  // 渠道配额管理
  updateFlexibleAllocation: (roomTypeId: string, maxAllocation: number) => void;
  checkAndPromptInventoryReplenish: () => void;
  
  // 库存调拨：在OTA池和灵活池之间动态调整（按房型）
  transferInventory: (from: 'ota' | 'flexible', to: 'ota' | 'flexible', amount: number, roomTypeId?: string) => void;
  
  // ===== 全年库存日历管理 =====
  // 订单占房（跨日期占用库存）
  occupyInventory: (order: {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    platform: Platform;
  }) => boolean;
  
  // 释放库存（取消订单时）
  releaseInventory: (order: {
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    platform: Platform;
  }) => void;
  
  // 按日期调拨渠道配额
  transferDailyAllocation: (date: string, roomTypeId: string, from: 'ota' | 'flexible', to: 'ota' | 'flexible', amount: number) => void;
  
  // 设置维修房
  setMaintenance: (date: string, roomTypeId: string, count: number) => void;
  
  // 更新动态价格
  updateDynamicPrice: (date: string, roomTypeId: string, price: number) => void;
  
  // 获取指定日期库存
  getDailyInventory: (date: string) => DailyInventory | undefined;
  
  // 同步交易数据到日历（用于历史回放和初始化）
  syncTransactionsToCalendar: () => void;
  
  // ===== 智能定价 Actions =====
  enableSmartPricing: (enabled: boolean) => void;
  setAutoApply: (autoApply: boolean) => void; // 设置是否自动应用建议价
  
  // ===== 订单自动确认设置 =====
  setAutoConfirmOrders: (enabled: boolean) => void;
  updateCompetitorAPIConfig: (config: Partial<CompetitorAPIConfig>) => void;
  runSmartPricing: () => void; // 执行一次智能定价
  dismissFloorPriceSuggestion: () => void;
  applyFloorPriceSuggestion: () => void;
  
  // ===== 工单系统 Actions =====
  tickets: import('@/types').Ticket[];
  unreadTicketCount: number;
  addTicket: (ticket: Omit<import('@/types').Ticket, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTicket: (id: string, updates: Partial<import('@/types').Ticket>) => void;
  addTicketMessage: (ticketId: string, message: Omit<import('@/types').TicketMessage, 'id' | 'timestamp'>) => void;
  markTicketAsRead: (ticketId: string) => void;
  assignTicket: (ticketId: string, assignee: string, assigneeName: string) => void;
  resolveTicket: (ticketId: string, data?: {
    rating?: number;
    responseSpeed?: 'fast' | 'normal' | 'slow';
    resolutionEffect?: 'full' | 'partial' | 'none';
    ratingTags?: string[];
    feedback?: string;
  }) => void;
  urgeTicket: (ticketId: string) => { success: boolean; message: string };
  
  // ===== 退款系统 Actions =====
  refunds: import('@/types').Refund[];
  requestRefund: (orderId: string, data: {
    amount: number;
    reason: import('@/types').RefundReason;
    reasonDetail: string;
    customerName: string;
    customerPhone?: string;
  }) => void;
  updateRefund: (refundId: string, updates: Partial<import('@/types').Refund>) => void;
  syncRefundFromAdmin: (refund: import('@/types').Refund) => void;
}

// ============================================
// 初始数据生成
// ============================================

const initialHotel = hotels[0];
const initialRoomType = initialHotel.roomTypes[0];

// 生成默认发布内容 - 每个平台保底3-5个
const generateDefaultContents = (): ContentItem[] => {
  const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
  const roomTypes = ['舒适标准房', '经济特价房', '行政豪华套房'];
  
  const contents: ContentItem[] = [];
  let idCounter = 1;
  
  platforms.forEach((platform) => {
    // 每个平台生成4个基础内容
    const count = 3 + Math.floor(Math.random() * 3); // 3-5个
    for (let i = 0; i < count; i++) {
      const roomType = roomTypes[i % roomTypes.length];
      const basePrice = roomType === '经济特价房' ? 200 : roomType === '舒适标准房' ? 320 : 550;
      const price = basePrice + Math.floor(Math.random() * 50) - 25;
      
      const templates = [
        `【限时特惠】${roomType}，性价比之选`,
        `🏨 ${roomType}，出差首选`,
        `✨ ${roomType}，尊享体验`,
        `【周末特惠】${roomType}，家庭优选`,
        `🔥 限时抢购！${roomType}特价`,
      ];
      
      const title = templates[i % templates.length];
      
      contents.push({
        id: `CNT${String(idCounter++).padStart(3, '0')}`,
        platform,
        title,
        content: `${title}，现价¥${price}，立即预订享受优惠！`,
        price,
        status: 'published',
        performance: {
          impressions: 1000 + Math.floor(Math.random() * 5000),
          clicks: 50 + Math.floor(Math.random() * 300),
          inquiries: 10 + Math.floor(Math.random() * 50),
          conversions: Math.floor(Math.random() * 5), // 0-4个转化
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });
  
  return contents;
};

// 生成默认交易数据（使用订单生成器）
// V3: 根据当前酒店房型生成测试订单，确保多酒店兼容性
const generateDefaultTransactions = (contents: ContentItem[], hotel: Hotel): Transaction[] => {
  // 使用新的订单生成器生成预设订单
  const roomTypes = hotel.roomTypes.map(r => ({ 
    floorPrice: r.floorPrice, 
    ceilingPrice: r.ceilingPrice 
  }));
  
  const orders = generatePresetOrders(hotel.id, roomTypes);
  
  // 添加测试订单（包含退款待处理等状态）- 使用当前酒店实际房型
  const testOrders = generateTestOrders(hotel.id, 320, hotel.roomTypes); 
  
  // 合并订单（测试订单在前，方便查看）
  const allOrders = [...testOrders, ...orders];
  
  // 为每个订单关联一个同平台的发布内容ID
  const contentIdsByPlatform: Record<string, string[]> = {
    xianyu: [],
    xiaohongshu: [],
    wechat: [],
  };
  contents.forEach(c => {
    if (contentIdsByPlatform[c.platform]) {
      contentIdsByPlatform[c.platform].push(c.id);
    }
  });
  
  return allOrders.map(order => {
    const platformContentIds = contentIdsByPlatform[order.platform] || [];
    if (platformContentIds.length > 0) {
      return {
        ...order,
        sourceContentId: platformContentIds[Math.floor(Math.random() * platformContentIds.length)],
      };
    }
    return order;
  });
};

// 确定性哈希函数 - 基于日期和房型ID生成固定值
const getFixedHashForDate = (dateStr: string, roomId: string): number => {
  const str = dateStr + roomId;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 生成全年库存日历（365天）- 使用确定性算法，确保数据固定
const generateYearlyInventory = (hotel: Hotel): Record<string, DailyInventory> => {
  const calendar: Record<string, DailyInventory> = {};
  const today = new Date();
  
  // 生成从今天起365天的库存
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const byRoomType: DailyInventory['byRoomType'] = {};
    let totalRooms = 0;
    let totalAvailable = 0;
    
    hotel.roomTypes.forEach(room => {
      // 使用确定性哈希生成维修房（5%概率 -> hash % 100 < 5）
      const hash = getFixedHashForDate(dateStr, room.id);
      const maintenanceRooms = hash % 100 < 5 ? (hash % 2) + 1 : 0;
      const effectiveTotal = room.totalInventory - maintenanceRooms;
      
      // 使用确定性哈希生成入住率（20%-70%固定范围）
      const baseOccupancy = 0.2 + (hash % 50) / 100; // 20% - 70%
      const occupiedRooms = Math.floor(effectiveTotal * baseOccupancy);
      
      // 区分在住和预抵（根据日期远近）
      const checkedIn = i === 0 ? Math.floor(occupiedRooms * 0.6) : 0; // 今天有在住
      const arriving = Math.floor(occupiedRooms * 0.4); // 今日预抵
      
      byRoomType[room.id] = {
        total: room.totalInventory,
        available: effectiveTotal - occupiedRooms,
        occupied: {
          checkedIn,
          arriving,
          dayUse: 0,
          maintenance: maintenanceRooms,
        },
        channelAllocation: {
          ota: room.otaAllocation,
          flexible: room.flexibleAllocation,
        },
        dynamicPrice: {
          basePrice: room.floorPrice,
          suggestedPrice: room.floorPrice + Math.floor((1 - baseOccupancy) * 100),
          priceFactor: 1 + (1 - baseOccupancy) * 0.5,
        },
      };
      
      totalRooms += room.totalInventory;
      totalAvailable += effectiveTotal - occupiedRooms;
    });
    
    const occupancyRate = Math.round(((totalRooms - totalAvailable) / totalRooms) * 100);
    
    calendar[dateStr] = {
      date: dateStr,
      byRoomType,
      summary: {
        totalRooms,
        totalAvailable,
        occupancyRate,
        inventoryStatus: totalAvailable === 0 ? 'soldout' : 
                         totalAvailable < totalRooms * 0.1 ? 'tight' :
                         totalAvailable < totalRooms * 0.3 ? 'normal' : 'abundant',
      },
    };
  }
  
  return calendar;
};

// 计算初始库存
const calculateInitialInventory = (hotel: Hotel): Inventory => {
  const total = hotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
  const otaTotal = hotel.roomTypes.reduce((sum, r) => sum + r.otaAllocation, 0);
  const flexibleTotal = hotel.roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
  
  const byRoomType: Record<string, any> = {};
  hotel.roomTypes.forEach(room => {
    const sold = Math.floor(room.totalInventory * 0.3); // 默认30%已售
    const otaSold = Math.floor(sold * 0.7);
    const flexibleSold = Math.floor(sold * 0.3);
    
    byRoomType[room.id] = {
      total: room.totalInventory,
      sold,
      available: room.totalInventory - sold,
      // OTA渠道
      otaAllocation: room.otaAllocation,
      otaSold,
      otaAvailable: room.otaAllocation - otaSold,
      // 非标渠道
      flexibleAllocation: room.flexibleAllocation,
      flexibleSold,
      flexibleAvailable: room.flexibleAllocation - flexibleSold,
      maxAllocation: room.flexibleAllocation, // 默认为灵活库存分配量
    };
  });
  
  return {
    total,
    sold: Math.floor(total * 0.3),
    available: Math.floor(total * 0.7),
    otaPool: {
      total: otaTotal,
      sold: Math.floor(otaTotal * 0.3),
      available: Math.floor(otaTotal * 0.7),
    },
    flexiblePool: {
      total: flexibleTotal,
      sold: Math.floor(flexibleTotal * 0.3),
      available: Math.floor(flexibleTotal * 0.7),
      preoccupied: 0,
      maxAllocation: flexibleTotal, // 默认全部开放
      platforms: {
        xianyu: { allocated: Math.floor(flexibleTotal * 0.4), sold: 0, available: Math.floor(flexibleTotal * 0.4) },
        xiaohongshu: { allocated: Math.floor(flexibleTotal * 0.3), sold: 0, available: Math.floor(flexibleTotal * 0.3) },
        wechat: { allocated: Math.floor(flexibleTotal * 0.3), sold: 0, available: Math.floor(flexibleTotal * 0.3) },
      },
    },
    byRoomType,
    calendar: generateYearlyInventory(hotel), // 生成全年库存日历
  };
};

const defaultContents = generateDefaultContents();
const defaultTransactions = generateDefaultTransactions(defaultContents, initialHotel);

// ============================================
// 示例用户（用于权限切换演示）
// ============================================
export const demoUsers: User[] = [
  {
    id: 'owner-001',
    name: '张老板',
    role: 'owner',
    avatar: '👨‍💼',
    permissions: {
      canChangeFloorPrice: true,
      canChangePrice: true,
      canSwitchHotel: true,
      canSwitchTimeMode: true,
      canInitHotel: true,
      canApprove: true,
      canViewAudit: true,
      canViewFinance: true,
    },
  },
  {
    id: 'manager-001',
    name: '李经理',
    role: 'manager',
    avatar: '👩‍💼',
    permissions: {
      canChangeFloorPrice: false,  // 经理不能修改底价
      canChangePrice: true,        // 可以调价（有限额）
      canSwitchHotel: true,
      canSwitchTimeMode: false,
      canInitHotel: false,
      canApprove: true,            // 可以审批员工的申请
      canViewAudit: true,
      canViewFinance: true,
    },
  },
  {
    id: 'staff-001',
    name: '小王',
    role: 'staff',
    avatar: '👨‍💻',
    permissions: {
      canChangeFloorPrice: false,
      canChangePrice: false,       // 员工不能修改底价
      canSwitchHotel: false,
      canSwitchTimeMode: false,
      canInitHotel: false,
      canApprove: false,           // 不能审批
      canViewAudit: false,
      canViewFinance: false,
    },
  },
];

const initialUser = demoUsers[0];

// ============================================
// Store 创建
// ============================================

export const useUnifiedStore = create<UnifiedState>((set, get) => ({
  // 初始状态
  currentHotel: initialHotel,
  currentRoomType: initialRoomType,
  currentTheme: initialHotel.theme,
  currentMode: initialHotel.defaultMode,
  timeMode: 'realtime',
  
  // 临时酒店列表（初始化添加，刷新后丢失）
  tempHotels: [],
  
  competitors: generateDailyCompetitorData(
    initialHotel.id,
    new Date().toISOString().split('T')[0],
    eventsMap[initialHotel.id]
  ),
  events: eventsMap[initialHotel.id],
  pricing: (() => {
    const today = new Date().toISOString().split('T')[0];
    const initialCompetitors = generateDailyCompetitorData(initialHotel.id, today, eventsMap[initialHotel.id]);
    const stats = calculateCompetitorStats(initialCompetitors);
    
    // 初始化各房型基准价
    const roomBasePrices: { [roomTypeId: string]: number } = {};
    initialHotel.roomTypes.forEach(room => {
      roomBasePrices[room.id] = Math.round((room.floorPrice + room.ceilingPrice) / 2);
    });
    
    return {
      basePrice: roomBasePrices[initialRoomType.id] || Math.round(stats.avg * 0.95),
      roomBasePrices,
      competitorAvg: stats.avg,
      adjustments: { location: 0.04, quality: 0.03 },
      platformPrices: {
        xianyu: { price: Math.round(stats.avg * 1.03), coefficient: 1.08, riskDeposit: 0.15 },
        xiaohongshu: { price: Math.round(stats.avg * 0.95), coefficient: 1.0, riskDeposit: 0.20 },
        wechat: { price: Math.round(stats.avg * 0.90), coefficient: 0.95, riskDeposit: 0.08 },
      },
      floorPrice: initialRoomType.floorPrice,
      ceilingPrice: initialRoomType.ceilingPrice,
      mode: 'dynamic',
      deviation: -5,
    };
  })(),
  inventory: calculateInitialInventory(initialHotel),
  transactions: defaultTransactions,
  contents: defaultContents,
  alerts: [],
  auditLogs: [],
  
  // 自动确认订单设置（默认关闭，需人工确认）
  autoConfirmOrders: false,
  
  yesterdayStats: {
    revenue: 2240,  // 8间 × 均价280元，不超过灵活库存上限12间
    roomsSold: 8,
  },
  
  // 预设对比数据（本月 > 本周 > 今日的层次关系）
  presetStats: (() => {
    // 基于酒店灵活库存和平均价格生成合理的预设数据
    const totalFlexible = initialHotel.roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
    const avgPrice = initialHotel.roomTypes.reduce((sum, r) => sum + r.floorPrice, 0) / initialHotel.roomTypes.length;
    
    // 今日数据：基于灵活库存的50%-70%售出
    const todayOrders = Math.floor(totalFlexible * 0.6);
    const todayRevenue = Math.floor(todayOrders * avgPrice);
    const todayCheckins = Math.floor(todayOrders * 0.8); // 80%今日成交今日入住，其余是提前预订
    
    // 本周数据（7天）：累积效应，本周 = 今日 × 4（考虑周末高峰）
    const weekOrders = Math.floor(todayOrders * 4.5);
    const weekRevenue = Math.floor(weekOrders * avgPrice);
    const weekCheckins = Math.floor(weekOrders * 0.85);
    
    // 本月数据（30天）：累积效应，本月 = 本周 × 3.5
    const monthOrders = Math.floor(weekOrders * 3.8);
    const monthRevenue = Math.floor(monthOrders * avgPrice);
    const monthCheckins = Math.floor(monthOrders * 0.9);
    const monthContentCount = Math.floor(monthOrders * 0.4); // 假设每2.5单对应1条内容
    
    return {
      today: {
        revenue: todayRevenue,
        orders: todayOrders,
        checkins: todayCheckins,
      },
      thisWeek: {
        revenue: weekRevenue,
        orders: weekOrders,
        avgPrice: Math.round(avgPrice),
        checkins: weekCheckins,
      },
      thisMonth: {
        revenue: monthRevenue,
        orders: monthOrders,
        contentCount: monthContentCount,
        checkins: monthCheckins,
      },
    };
  })(),
  
  pendingPriceApproval: null,
  
  user: initialUser,
  
  isLoading: false,
  loadingText: '',
  currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  
  realtimeSimulation: {
    isRunning: false,
    lastTransactionTime: Date.now(),
  },
  historyPlayback: {
    currentSnapshot: null,
    playbackPosition: 0,
    isPlaying: false,
    appliedEvents: new Set(),
  },
  sandboxState: {
    frozenBaseState: null,
    variables: { ...defaultSandboxVariables },
    simulatedResult: null,
  },
  
  // ===== 按房型的竞品数据初始化 =====
  competitorDataByRoomType: null,
  
  // ===== 按房型的定价初始化 =====
  pricingByRoomType: {},
  
  // ===== 智能定价系统初始状态 =====
  smartPricing: {
    enabled: true, // 默认启用自动定价
    autoApply: false, // 默认手动确认（老板自己点应用）
    lastAutoModeChange: 0,
    autoModeChangeCount: 0,
    competitorAPIConfig: {
      enabled: false, // 默认使用模拟数据
      refreshInterval: 300, // 5分钟刷新一次
    },
    lastPricingUpdate: 0,
    todayPricingUpdateCount: 0,
    floorPriceSuggestion: null,
  },
  
  // ===== 工单系统初始状态 =====
  tickets: [
    // 测试工单 1: 已解决 + 已评价（5星好评）
    {
      id: 'TKT-TEST-001',
      hotelId: 'sanlitun',
      hotelName: '三里屯潮流酒店',
      title: '价格同步到闲鱼失败',
      description: '昨晚修改了房价，但今天早上看闲鱼上还是旧价格，麻烦帮忙看看是什么原因。',
      type: 'tech',
      status: 'resolved',
      priority: 'high',
      source: 'hotel',
      tags: ['价格同步', '闲鱼'],
      messages: [
        {
          id: 'MSG-001',
          sender: 'admin',
          senderName: '运营小李',
          content: '您好，已收到您的反馈。我检查了系统日志，发现是闲鱼接口令牌过期导致的。已重新授权，请稍后刷新查看。',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: 'MSG-002',
          sender: 'hotel',
          senderName: '张经理',
          content: '已刷新，价格已经同步过来了，谢谢！',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
        },
        {
          id: 'MSG-003',
          sender: 'admin',
          senderName: '运营小李',
          content: '不客气，有问题随时联系。',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
        },
      ],
      assignedTo: '李明',
      assignedToName: '运营小李',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      // 客户评价
      rating: 5,
      responseSpeed: 'fast',
      resolutionEffect: 'full',
      ratingTags: ['响应及时', '专业高效', '解决问题'],
      feedback: '处理速度很快，问题解决得也很彻底，感谢运营同学！',
      contactName: '张经理',
      contactPhone: '13800138001',
      contactEmail: 'zhang@sanlitun.com',
    },
    // 测试工单 2: 已解决 + 未评价 → 待评价
    {
      id: 'TKT-TEST-002',
      hotelId: 'sanlitun',
      hotelName: '三里屯潮流酒店',
      title: '申请调整灵活库存上限',
      description: '春节假期快到了，预计入住率会提升，希望能增加灵活池的投放量到15间。',
      type: 'business',
      status: 'resolved',
      priority: 'medium',
      source: 'hotel',
      tags: ['库存调整', '节假日'],
      messages: [
        {
          id: 'MSG-101',
          sender: 'admin',
          senderName: '运营小王',
          content: '您好，已收到您的申请。考虑到春节期间的需求增长，我们已将您的灵活池上限调整为15间。',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: 'MSG-102',
          sender: 'hotel',
          senderName: '李前台',
          content: '好的，谢谢！',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        },
      ],
      assignedTo: '王芳',
      assignedToName: '运营小王',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      // 未评价 - 等待酒店评价
      contactName: '李前台',
      contactPhone: '13800138002',
    },
    // 测试工单 3: 处理中 → 正常对话
    {
      id: 'TKT-TEST-003',
      hotelId: 'sanlitun',
      hotelName: '三里屯潮流酒店',
      title: '小红书内容发布审核咨询',
      description: '我们昨天发了一篇笔记，想了解一下审核进度，大概什么时候能出结果？',
      type: 'consult',
      status: 'processing',
      priority: 'low',
      source: 'hotel',
      tags: ['内容审核', '小红书'],
      messages: [
        {
          id: 'MSG-201',
          sender: 'admin',
          senderName: '运营小张',
          content: '您好，我帮您查了一下，您的笔记目前正在审核中，预计2小时内会有结果。如需加急处理请告诉我。',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ],
      assignedTo: '张伟',
      assignedToName: '运营小张',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      contactName: '王店长',
      contactEmail: 'wang@sanlitun.com',
    },
    // 测试工单 4: 待处理 → 刚提交
    {
      id: 'TKT-TEST-004',
      hotelId: 'sanlitun',
      hotelName: '三里屯潮流酒店',
      title: '系统登录时提示账号异常',
      description: '今天早上登录系统时提示"账号异常，请联系管理员"，昨天还好好的。',
      type: 'tech',
      status: 'open',
      priority: 'high',
      source: 'hotel',
      tags: ['登录问题'],
      messages: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      contactName: '刘财务',
      contactPhone: '13800138003',
    },
  ],
  unreadTicketCount: 3,
  
  // ===== 退款系统初始状态 =====
  refunds: [],
  
  // ============================================
  // 基础 Actions
  // ============================================
  
  setLoading: (loading, text = '') => set({ isLoading: loading, loadingText: text }),
  
  updateCurrentTime: () => set({ currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }) }),
  
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 10) })),
  
  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  
  addAuditLog: (log) => {
    const { user } = get();
    const newLog: AuditLog = {
      ...log,
      id: generateId('AUD'),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      user: user.name,
      userRole: user.role,
    };
    set((state) => ({ auditLogs: [newLog, ...state.auditLogs].slice(0, 100) }));
  },
  
  // ============================================
  // 智能预警生成
  // ============================================
  
  generateSmartAlerts: () => {
    const { inventory, currentHotel, alerts } = get();
    
    const newAlerts: Alert[] = [];
    const now = new Date().toISOString();
    
    // 计算各池数据
    const { otaPool, flexiblePool } = inventory;
    
    // OTA池售出率
    const otaSoldRate = otaPool.total > 0 ? (otaPool.sold / otaPool.total) * 100 : 0;
    const otaAvailable = otaPool.available;
    
    // 灵活池售出率（相对于投放上限，而不是总灵活库存）
    const totalMaxAllocation = currentHotel.roomTypes.reduce(
      (sum, room) => sum + (inventory.byRoomType[room.id]?.maxAllocation || room.flexibleAllocation), 
      0
    );
    const flexibleSoldRate = totalMaxAllocation > 0 ? (flexiblePool.sold / totalMaxAllocation) * 100 : 0;
    const flexibleCanIncrease = flexiblePool.total - totalMaxAllocation; // 还可增加的投放量
    
    // 总体已售率（基于实际可售量 = OTA + 灵活投放上限）
    const effectiveTotal = otaPool.total + totalMaxAllocation;
    const totalSold = otaPool.sold + flexiblePool.sold;
    const overallSoldRate = effectiveTotal > 0 ? (totalSold / effectiveTotal) * 100 : 0;
    
    // ========== 智能预警逻辑 ==========
    
    // Critical 场景1: 库存完全售罄（OTA和灵活池都卖完）
    if (otaAvailable === 0 && flexiblePool.available === 0 && effectiveTotal > 0) {
      newAlerts.push({
        id: `alert-sold-out-${Date.now()}`,
        level: 'critical',
        type: 'inventory',
        message: `🚨 全部库存已售罄！今日无法再接受新订单`,
        timestamp: now,
        requiresAction: true,
      });
    }
    // Critical 场景2: OTA库存为0但还有灵活库存（需要立即调整）
    else if (otaAvailable === 0 && flexiblePool.available > 5) {
      newAlerts.push({
        id: `alert-ota-empty-${Date.now()}`,
        level: 'critical',
        type: 'inventory',
        message: `🚨 OTA渠道已断货！建议立即调拨灵活库存`,
        timestamp: now,
        requiresAction: true,
      });
    }
    // 场景1: 灵活池已用完，但OTA池还有大量库存 → 建议增加投放
    else if (flexibleSoldRate >= 95 && otaAvailable > 5 && flexibleCanIncrease > 0) {
      newAlerts.push({
        id: `alert-increase-allocation-${Date.now()}`,
        level: 'warning',
        type: 'inventory',
        message: `非标渠道已售罄 🔥 OTA剩余${otaAvailable}间，建议增加灵活投放上限`,
        timestamp: now,
        requiresAction: true,
      });
    }
    // 场景2: 两池都售罄或接近售罄 → 库存紧张
    else if (otaAvailable <= 3 && flexiblePool.sold >= totalMaxAllocation * 0.9) {
      newAlerts.push({
        id: `alert-inv-low-${Date.now()}`,
        level: 'info',
        type: 'inventory',
        message: `库存紧张 ⚠️ OTA剩${otaAvailable}间，非标渠道已用${Math.round(flexibleSoldRate)}%`,
        timestamp: now,
        requiresAction: false,
      });
    }
    // 场景3: 两池都有大量空置 → 真正的库存积压
    else if (otaSoldRate < 30 && flexibleSoldRate < 30 && otaAvailable > 10) {
      newAlerts.push({
        id: `alert-inv-high-${Date.now()}`,
        level: 'warning',
        type: 'inventory',
        message: `库存积压 📉 OTA空置${Math.round(100 - otaSoldRate)}%，建议加强营销`,
        timestamp: now,
        requiresAction: false,
      });
    }
    // 场景4: OTA销售良好，灵活池未满 → 正常状态
    else if (otaSoldRate > 40 && flexibleSoldRate < 80) {
      newAlerts.push({
        id: `alert-status-good-${Date.now()}`,
        level: 'info',
        type: 'status',
        message: `销售状态良好 👍 OTA已售${Math.round(otaSoldRate)}%，非标渠道还有空间`,
        timestamp: now,
        requiresAction: false,
      });
    }
    // 场景5: 灵活池售罄，OTA也快售罄 → 火爆状态
    else if (flexibleSoldRate >= 90 && otaAvailable <= 5) {
      newAlerts.push({
        id: `alert-hot-${Date.now()}`,
        level: 'info',
        type: 'status',
        message: `销售火爆 🔥 整体已售${Math.round(overallSoldRate)}%，考虑涨价`,
        timestamp: now,
        requiresAction: false,
      });
    }
    // 默认状态
    else {
      newAlerts.push({
        id: `alert-status-${Date.now()}`,
        level: 'info',
        type: 'status',
        message: `销售平稳 😐 OTA已售${Math.round(otaSoldRate)}%，非标已售${Math.round(flexibleSoldRate)}%`,
        timestamp: now,
        requiresAction: false,
      });
    }
    
    // 合并预警
    const existingTypes = new Set(newAlerts.map(a => a.type));
    const filteredOld = alerts.filter(a => !existingTypes.has(a.type) && !a.requiresAction);
    set({ alerts: [...filteredOld, ...newAlerts].slice(0, 5) });
  },
  
  // ============================================
  // 时间态切换
  // ============================================
  
  switchTimeMode: (mode) => {
    const { syncTransactionsToCalendar, generateSmartAlerts } = get();
    get().stopRealtimeSimulation();
    set({ timeMode: mode });
    
    if (mode === 'realtime') {
      // 切回实时模式：刷新数据
      set({ realtimeSimulation: { isRunning: true, lastTransactionTime: Date.now() } });
      // 强制刷新日历和预警
      setTimeout(() => {
        syncTransactionsToCalendar();
        generateSmartAlerts();
        get().startRealtimeSimulation();
      }, 100);
    } else if (mode === 'sandbox') {
      // 切换到沙盘模式时自动冻结当前状态
      const { pricing, inventory, competitors, sandboxState } = get();
      if (!sandboxState.frozenBaseState) {
        set({
          sandboxState: {
            ...sandboxState,
            frozenBaseState: {
              pricing: { ...pricing },
              inventory: { ...inventory },
              competitors: [...competitors],
            },
          },
        });
        // 立即计算一次模拟结果
        setTimeout(() => get().calculateSandboxResult(), 0);
      }
    }
    
    get().addAuditLog({
      action: '切换时间态',
      detail: `切换到${mode === 'realtime' ? '实时推演' : mode === 'history' ? '历史回放' : '沙盘模拟'}模式`,
      level: 'normal',
    });
  },
  
  startRealtimeSimulation: () => {
    // 先更新状态为运行中
    set((state) => ({ 
      realtimeSimulation: { 
        ...state.realtimeSimulation, 
        isRunning: true,
        lastTransactionTime: Date.now()
      } 
    }));
    
    // 智能发布检查计数器
    let checkCounter = 0;
    
    const interval = setInterval(() => {
      const { timeMode, contents, transactions } = get();
      if (timeMode !== 'realtime') {
        clearInterval(interval);
        return;
      }
      
      checkCounter++;
      
      // 每30秒检查一次转化率（每2个周期检查一次）
      if (checkCounter % 2 === 0) {
        const platformStats: Record<string, { published: number; deals: number }> = {
          xianyu: { published: 0, deals: 0 },
          xiaohongshu: { published: 0, deals: 0 },
          wechat: { published: 0, deals: 0 },
        };
        
        // 统计各平台发布数
        contents.forEach(c => {
          if (c.status === 'published' && platformStats[c.platform]) {
            platformStats[c.platform].published++;
          }
        });
        
        // 统计各平台成交数
        transactions.forEach(t => {
          if (platformStats[t.platform]) {
            platformStats[t.platform].deals++;
          }
        });
        
        // 转化率低的平台自动补量
        (['xianyu', 'xiaohongshu', 'wechat'] as const).forEach(platform => {
          const stat = platformStats[platform];
          const conversionRate = stat.published > 0 ? stat.deals / stat.published : 0;
          
          // 转化率<10%或发布<3个，补量到至少5个
          if (conversionRate < 0.1 || stat.published < 3) {
            const needPublish = Math.max(2, 5 - stat.published); // 至少补2个，或补到5个
            for (let i = 0; i < needPublish; i++) {
              setTimeout(() => get().generateRealtimeContent(platform), i * 500);
            }
          }
        });
      }
      
      // 每15秒检查一次，有内容且有库存时30%概率成交
      // 限制条件保留：
      // 1. 必须有发布内容
      // 2. 必须有可用库存
      // 3. 不能超过房型配额上限
      // 4. 不能超过平台配额上限
      // 平均约50秒一单，符合真实酒店成交节奏
      if (Math.random() > 0.7) {
        get().generateRealtimeTransaction();
      }
      
      // 每30秒执行一次智能定价（如果启用）
      if (checkCounter % 2 === 0 && get().smartPricing.enabled) {
        get().runSmartPricing();
      }
    }, 15000);
    (window as any).__realtimeInterval = interval;
  },
  
  // ============================================
  // 历史回放功能
  // ============================================
  
  loadSnapshot: (snapshotId) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;
    
    // 重置到快照初始状态
    set({
      historyPlayback: {
        currentSnapshot: snapshot,
        playbackPosition: 0,
        isPlaying: false,
        appliedEvents: new Set(),
      },
      // 应用初始定价状态
      pricing: {
        ...get().pricing,
        basePrice: snapshot.initialState.pricing.basePrice,
        competitorAvg: snapshot.initialState.pricing.competitorAvg,
        mode: snapshot.initialState.pricing.mode,
      },
      // 应用初始库存状态
      inventory: {
        ...get().inventory,
        otaPool: {
          ...get().inventory.otaPool,
          available: snapshot.initialState.inventory.otaAvailable,
        },
        flexiblePool: {
          ...get().inventory.flexiblePool,
          available: snapshot.initialState.inventory.flexibleAvailable,
        },
      },
      // 清空当前交易记录
      transactions: [],
    });
    
    get().addAuditLog({
      action: '加载历史快照',
      detail: `加载场景：${snapshot.name}`,
      level: 'normal',
    });
    
    // 同步日历到初始状态
    setTimeout(() => get().syncTransactionsToCalendar(), 0);
  },
  
  playHistory: () => {
    const { historyPlayback } = get();
    if (!historyPlayback.currentSnapshot) return;
    
    set({ 
      historyPlayback: { 
        ...historyPlayback, 
        isPlaying: true 
      } 
    });
    
    // 自动播放时间轴
    const playInterval = setInterval(() => {
      const { historyPlayback, timeMode } = get();
      if (timeMode !== 'history' || !historyPlayback.isPlaying) {
        clearInterval(playInterval);
        return;
      }
      
      const { currentSnapshot, appliedEvents } = historyPlayback;
      if (!currentSnapshot) return;
      
      // 找到下一个未应用的事件
      const nextEvent = currentSnapshot.timeline.find(e => !appliedEvents.has(e.time));
      
      if (nextEvent) {
        // 应用事件
        get().applyEventEffect(nextEvent);
        
        // 更新进度
        const eventIndex = currentSnapshot.timeline.findIndex(e => e.time === nextEvent.time);
        const newPosition = (eventIndex / currentSnapshot.timeline.length) * 100;
        
        set({
          historyPlayback: {
            ...historyPlayback,
            playbackPosition: newPosition,
            appliedEvents: new Set([...appliedEvents, nextEvent.time]),
          },
        });
      } else {
        // 所有事件已播放完毕
        clearInterval(playInterval);
        set({
          historyPlayback: { ...historyPlayback, isPlaying: false },
        });
      }
    }, 2000); // 每2秒播放一个事件
    
    (window as any).__historyInterval = playInterval;
  },
  
  pauseHistory: () => {
    const { historyPlayback } = get();
    set({ historyPlayback: { ...historyPlayback, isPlaying: false } });
    
    if ((window as any).__historyInterval) {
      clearInterval((window as any).__historyInterval);
    }
  },
  
  seekHistory: (position) => {
    const { historyPlayback } = get();
    if (!historyPlayback.currentSnapshot) return;
    
    const { currentSnapshot } = historyPlayback;
    const targetIndex = Math.floor((position / 100) * currentSnapshot.timeline.length);
    
    // 重置并重新应用到目标位置
    const eventsToApply = currentSnapshot.timeline.slice(0, targetIndex);
    const appliedEventTimes = new Set(eventsToApply.map(e => e.time));
    
    // 重新加载快照
    get().loadSnapshot(currentSnapshot.id);
    
    // 应用事件到目标位置
    eventsToApply.forEach(event => {
      get().applyEventEffect(event);
    });
    
    // 同步日历
    get().syncTransactionsToCalendar();
    
    set({
      historyPlayback: {
        ...get().historyPlayback,
        playbackPosition: position,
        appliedEvents: appliedEventTimes,
        isPlaying: false,
      },
    });
  },
  
  applyEventEffect: (event) => {
    const { addTransaction, addAlert, historyPlayback } = get();
    
    // 生成基于快照日期的事件时间戳
    const generateEventTimestamp = (eventTime: string) => {
      if (!historyPlayback.currentSnapshot) return new Date().toISOString();
      const snapshotDate = new Date(historyPlayback.currentSnapshot.timestamp);
      const [hours, minutes] = eventTime.split(':').map(Number);
      snapshotDate.setHours(hours, minutes, 0, 0);
      return snapshotDate.toISOString();
    };
    
    switch (event.type) {
      case 'transaction': {
        // 创建交易记录，使用快照日期
        const transaction: Transaction = {
          id: generateId('TXN'),
          hotelId: get().currentHotel.id,
          roomType: event.data.roomType || '标准房',
          platform: event.data.platform,
          price: event.data.price,
          timestamp: generateEventTimestamp(event.time),
          orderNo: generateId('ORD'),
          status: 'paid',
          financials: {
            gross: event.data.price,
            serviceFee: Math.round(event.data.price * 0.06 * 100) / 100,
            net: Math.round(event.data.price * 0.94 * 100) / 100,
          },
        };
        addTransaction(transaction);
        break;
      }
      
      case 'price_change': {
        // 应用价格变化
        set((state) => ({
          pricing: {
            ...state.pricing,
            basePrice: event.data.newBasePrice || state.pricing.basePrice,
            competitorAvg: event.data.competitorAvg || state.pricing.competitorAvg,
            mode: event.data.mode || state.pricing.mode,
          },
        }));
        
        // 添加价格变动预警
        addAlert({
          id: `alert-price-${Date.now()}`,
          level: 'info',
          type: 'price',
          message: event.description,
          timestamp: new Date().toISOString(),
          requiresAction: false,
        });
        break;
      }
      
      case 'inventory_change': {
        // 应用库存变化
        set((state) => ({
          inventory: {
            ...state.inventory,
            otaPool: {
              ...state.inventory.otaPool,
              available: event.data.otaAvailable ?? state.inventory.otaPool.available,
            },
            flexiblePool: {
              ...state.inventory.flexiblePool,
              available: event.data.flexibleAvailable ?? state.inventory.flexiblePool.available,
            },
          },
        }));
        
        // 添加库存预警
        if (event.data.flexibleAvailable === 0 || event.data.otaAvailable === 0) {
          addAlert({
            id: `alert-inv-${Date.now()}`,
            level: 'warning',
            type: 'inventory',
            message: event.description,
            timestamp: new Date().toISOString(),
            requiresAction: false,
          });
        }
        break;
      }
      
      case 'event_trigger': {
        // 添加事件预警
        addAlert({
          id: `alert-event-${Date.now()}`,
          level: event.data.intensity === 'high' ? 'critical' : 'warning',
          type: 'event',
          message: event.description,
          timestamp: new Date().toISOString(),
          requiresAction: event.data.intensity === 'high',
        });
        break;
      }
    }
  },
  
  applyRandomFluctuations: () => {
    const { historyPlayback } = get();
    if (!historyPlayback.currentSnapshot) return;
    
    // 随机打乱时间轴顺序
    const shuffledTimeline = [...historyPlayback.currentSnapshot.timeline]
      .sort(() => Math.random() - 0.5);
    
    set({
      historyPlayback: {
        ...historyPlayback,
        currentSnapshot: {
          ...historyPlayback.currentSnapshot,
          timeline: shuffledTimeline,
        },
        appliedEvents: new Set(),
        playbackPosition: 0,
        isPlaying: false,
      },
    });
    
    // 重新加载
    get().loadSnapshot(historyPlayback.currentSnapshot.id);
  },
  
  // ============================================
  // 沙盘模拟功能
  // ============================================
  
  updateSandboxVariable: (key, value) => {
    set((state) => ({
      sandboxState: {
        ...state.sandboxState,
        variables: {
          ...state.sandboxState.variables,
          [key]: value,
        },
      },
    }));
    
    // 自动计算模拟结果
    get().calculateSandboxResult();
  },
  
  calculateSandboxResult: () => {
    const { sandboxState, pricing, inventory, competitors } = get();
    const { variables } = sandboxState;
    
    // 冻结基准状态（如果还没有）
    if (!sandboxState.frozenBaseState) {
      set({
        sandboxState: {
          ...sandboxState,
          frozenBaseState: {
            pricing: { ...pricing },
            inventory: { ...inventory },
            competitors: [...competitors],
          },
        },
      });
      return;
    }
    
    const base = sandboxState.frozenBaseState;
    
    // 计算模拟定价
    const demandFactor = variables.demandMultiplier;
    const competitorFactor = 1 + (variables.competitorPriceAdjustment / 100);
    const eventFactor = variables.eventIntensity === 'high' ? 1.3 : 
                       variables.eventIntensity === 'medium' ? 1.15 :
                       variables.eventIntensity === 'low' ? 1.05 : 1;
    
    const simulatedBasePrice = Math.round(
      base.pricing.basePrice * demandFactor * competitorFactor * eventFactor
    );
    
    // 计算预期成交量
    const baseDemand = 10; // 基础需求
    const volumeChange = (variables.demandMultiplier - 1) * baseDemand;
    const priceElasticity = -0.5; // 价格弹性
    const priceChange = (simulatedBasePrice - base.pricing.basePrice) / base.pricing.basePrice;
    const expectedVolume = Math.max(0, Math.round(baseDemand + volumeChange + priceChange * baseDemand * priceElasticity));
    
    // 计算预期收益
    const expectedRevenue = simulatedBasePrice * expectedVolume;
    const baseRevenue = base.pricing.basePrice * baseDemand;
    const revenueChange = ((expectedRevenue - baseRevenue) / baseRevenue * 100).toFixed(1);
    
    // 计算库存压力
    const adjustedInventory = base.inventory.flexiblePool.available + variables.inventoryAdjustment;
    const inventoryPressure = adjustedInventory > 0 ? (expectedVolume / adjustedInventory * 100).toFixed(0) : '100';
    
    // 推荐策略
    let recommendedStrategy = '';
    if (variables.demandMultiplier > 1.3) {
      recommendedStrategy = variables.eventIntensity !== 'none' ? '切换至黄牛模式，最大化收益' : '动态定价，跟随需求上涨';
    } else if (variables.demandMultiplier < 0.7) {
      recommendedStrategy = '切换至清仓模式，快速去化库存';
    } else if (variables.competitorPriceAdjustment < -10) {
      recommendedStrategy = '竞品降价，考虑跟降或增加增值服务';
    } else {
      recommendedStrategy = '维持当前模式，保持价格稳定';
    }
    
    set({
      sandboxState: {
        ...sandboxState,
        simulatedResult: {
          pricing: {
            ...base.pricing,
            basePrice: simulatedBasePrice,
          },
          inventory: {
            ...base.inventory,
            flexiblePool: {
              ...base.inventory.flexiblePool,
              available: adjustedInventory,
            },
          },
          competitors: base.competitors,
          metrics: {
            expectedVolume,
            expectedRevenue,
            revenueChange,
            inventoryPressure,
            recommendedStrategy,
          },
        },
      },
    });
  },
  
  stopRealtimeSimulation: () => {
    if ((window as any).__realtimeInterval) {
      clearInterval((window as any).__realtimeInterval);
    }
    set((state) => ({ realtimeSimulation: { ...state.realtimeSimulation, isRunning: false } }));
  },
  
  generateRealtimeTransaction: () => {
    const { currentHotel, pricing, inventory, contents, addTransaction, generateSmartAlerts, checkAndPromptInventoryReplenish } = get();
    
    // 1. 检查总库存
    if (inventory.available <= 0) {
      return; // 库存不足不生成交易
    }
    
    const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    // 找到该平台的已发布内容作为来源
    const platformContents = contents.filter(c => c.platform === platform && c.status === 'published');
    if (platformContents.length === 0) {
      return; // 没有发布内容，不生成交易
    }
    
    // 随机选择一个发布内容作为来源
    const sourceContent = platformContents[Math.floor(Math.random() * platformContents.length)];
    const roomType = currentHotel.roomTypes.find(r => r.name === sourceContent.title.match(/舒适标准房|经济特价房|行政豪华套房/)?.[0]) 
      || currentHotel.roomTypes[Math.floor(Math.random() * currentHotel.roomTypes.length)];
    
    // 2. 检查该房型的非标渠道配额限制
    const roomInv = inventory.byRoomType[roomType.id];
    if (!roomInv) return;
    
    // 计算该房型当前非标渠道已售数量
    const roomFlexibleSold = roomInv.flexibleSold;
    const maxAllocation = roomInv.maxAllocation;
    
    // 如果该房型非标渠道已达投放上限，检查是否需要提示补库存
    if (roomFlexibleSold >= maxAllocation) {
      // 检查该房型是否还有库存剩余
      if (roomInv.available > 0) {
        checkAndPromptInventoryReplenish();
      }
      return; // 该房型非标渠道配额已满，不生成交易
    }
    
    // 3. 检查该平台的具体配额
    const { flexiblePool } = inventory;
    const platformInventory = flexiblePool.platforms[platform];
    if (platformInventory.available <= 0) {
      return; // 该平台配额已满
    }
    
    const basePrice = pricing.basePrice * (1 + Math.random() * 0.2);
    const price = Math.round(basePrice * pricing.platformPrices[platform].coefficient);
    
    // 模拟真实预订行为：提前天数 + 入住时长
    const advanceBookingDays = [0,0,1,1,1,2,2,3,3,7][Math.floor(Math.random() * 10)];
    const stayNights = 1 + Math.floor(Math.random() * 3); // 住1-3晚
    
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + advanceBookingDays);
    
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkInDate.getDate() + stayNights);
    
    const checkInDateStr = checkInDate.toISOString().split('T')[0];
    const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
    
    // 生成 mock 客人信息
    const guestNames = ['张先生', '李女士', '王先生', '陈女士', '刘先生', '赵女士', '孙先生', '周女士'];
    const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
    const guestPhone = `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
    
    const transaction: Transaction = {
      id: generateId('TXN'),
      hotelId: currentHotel.id,
      roomType: roomType.name,
      platform,
      price,
      timestamp: new Date().toISOString(),
      orderNo: generateId('ORD'),
      sourceContentId: sourceContent.id, // 关联到发布内容
      status: 'paid',
      checkInDate: checkInDateStr,
      checkOutDate: checkOutDateStr,
      stayNights,
      guestName,
      guestPhone,
      isRealtimeGenerated: true, // 标记为实时模拟生成的订单
      financials: {
        gross: price,
        serviceFee: 0,
        net: price,
      },
    };
    
    addTransaction(transaction);
    generateSmartAlerts();
    
    // 通过 BroadcastChannel 同步到管理端（实时推演模式）
    // 计算入住率
    const occupancyRate = inventory.total > 0 
      ? Math.round((inventory.sold / inventory.total) * 100) 
      : 0;
    
    // 发送实时数据到管理端
    console.log('[UnifiedStore] Sending REALTIME_METRICS:', { hotelId: currentHotel.id, price });
    channelManager.send('REALTIME_METRICS', {
      hotelId: currentHotel.id,
      hotelName: currentHotel.name,
      metrics: {
        gmv: price,
        orders: 1,
        occupancy: occupancyRate,
        timestamp: Date.now(),
      },
    }, {
      hotelId: currentHotel.id,
    });
  },
  
  // 自动生成内容（模拟自动发布）
  generateRealtimeContent: (targetPlatform?: Platform) => {
    const { currentHotel, pricing, addContent } = get();
    
    const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
    const platform = targetPlatform || platforms[Math.floor(Math.random() * platforms.length)];
    const roomType = currentHotel.roomTypes[Math.floor(Math.random() * currentHotel.roomTypes.length)];
    
    const platformPrice = pricing.platformPrices[platform];
    const price = Math.round(pricing.basePrice * platformPrice.coefficient * (0.9 + Math.random() * 0.2));
    
    const templates = [
      `【限时特惠】${roomType.name}，性价比之选`,
      `🏨 ${roomType.name}，商务出行首选`,
      `✨ ${currentHotel.name}${roomType.name}，尊享体验`,
      `【周末特惠】${roomType.name}，家庭出游优选`,
      `🔥 限时抢购！${roomType.name}特价`,
      `💎 ${roomType.name}，品质之选`,
      `🌟 ${currentHotel.name}精选${roomType.name}`,
      `【新店特惠】${roomType.name}体验价`,
    ];
    
    const title = templates[Math.floor(Math.random() * templates.length)];
    
    const content: ContentItem = {
      id: generateId('CNT'),
      platform,
      title,
      content: `${title}，原价¥${Math.round(price * 1.2)}，现价¥${price}，立即预订享受优惠！`,
      price,
      status: 'published',
      performance: {
        impressions: Math.floor(Math.random() * 1000),
        clicks: Math.floor(Math.random() * 100),
        inquiries: Math.floor(Math.random() * 20),
        conversions: 0, // 初始为0，由实际交易关联
      },
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    
    addContent(content);
  },
  
  // ============================================
  // 酒店/房型/用户切换
  // ============================================
  
  switchHotel: async (hotelId) => {
    const { setLoading, addAuditLog, initInventory } = get();
    setLoading(true, '正在加载新酒店数据...');
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const hotel = hotels.find((h) => h.id === hotelId);
    if (hotel) {
      // 根据酒店灵活库存计算合理的昨日数据
      const totalFlexible = hotel.roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
      const avgPrice = hotel.roomTypes.reduce((sum, r) => sum + r.floorPrice, 0) / hotel.roomTypes.length;
      // 昨日售出：灵活库存的50%-80%，不超过灵活库存上限
      const yesterdayRooms = Math.max(1, Math.floor(totalFlexible * (0.5 + Math.random() * 0.3)));
      const yesterdayRevenue = Math.floor(yesterdayRooms * avgPrice);
      
      // 生成动态竞品数据（使用统一数据源）
      const today = new Date().toISOString().split('T')[0];
      const hotelEvents = eventsMap[hotelId] || [];
      const initialRoomType = hotel.roomTypes[0];
      
      // 使用 generateHotelsByTier 获取统一的竞品数据
      const hotelsByTier = generateHotelsByTier(hotelId, today, hotelEvents);
      const ourTier = hotel.tier;
      const tierHotels = hotelsByTier[ourTier];
      const roomCategory = initialRoomType.name.toLowerCase().includes('经济') ? 'budget' : 
                          initialRoomType.name.toLowerCase().includes('套房') ? 'suite' : 'standard';
      const prices = tierHotels
        .map(h => h.prices[roomCategory]?.price)
        .filter((p): p is number => p !== undefined);
      const competitorAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      
      // 兼容旧的竞品数据格式
      const newCompetitors = generateDailyCompetitorData(hotelId, today, hotelEvents, initialRoomType);
      
      // 生成新酒店的预设对比数据
      const newTotalFlexible = hotel.roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
      const newAvgPrice = hotel.roomTypes.reduce((sum, r) => sum + r.floorPrice, 0) / hotel.roomTypes.length;
      const newTodayOrders = Math.floor(newTotalFlexible * 0.6);
      const newTodayRevenue = Math.floor(newTodayOrders * newAvgPrice);
      const newTodayCheckins = Math.floor(newTodayOrders * 0.8);
      const newWeekOrders = Math.floor(newTodayOrders * 4.5);
      const newWeekRevenue = Math.floor(newWeekOrders * newAvgPrice);
      const newWeekCheckins = Math.floor(newWeekOrders * 0.85);
      const newMonthOrders = Math.floor(newWeekOrders * 3.8);
      const newMonthRevenue = Math.floor(newMonthOrders * newAvgPrice);
      const newMonthCheckins = Math.floor(newMonthOrders * 0.9);
      const newMonthContentCount = Math.floor(newMonthOrders * 0.4);
      
      set({
        currentHotel: hotel,
        currentTheme: hotel.theme,
        currentMode: hotel.defaultMode,
        currentRoomType: initialRoomType,
        competitors: newCompetitors,
        events: hotelEvents,
        yesterdayStats: {
          revenue: yesterdayRevenue,
          roomsSold: yesterdayRooms,
        },
        presetStats: {
          today: {
            revenue: newTodayRevenue,
            orders: newTodayOrders,
            checkins: newTodayCheckins,
          },
          thisWeek: {
            revenue: newWeekRevenue,
            orders: newWeekOrders,
            avgPrice: Math.round(newAvgPrice),
            checkins: newWeekCheckins,
          },
          thisMonth: {
            revenue: newMonthRevenue,
            orders: newMonthOrders,
            contentCount: newMonthContentCount,
            checkins: newMonthCheckins,
          },
        },
        pricing: {
          ...get().pricing,
          competitorAvg,
          basePrice: Math.round(competitorAvg * 0.95),
          floorPrice: initialRoomType.floorPrice,
          ceilingPrice: initialRoomType.ceilingPrice,
        },
      });
      initInventory();
      
      addAuditLog({
        action: '切换酒店',
        detail: `切换到${hotel.name}，昨日售出${yesterdayRooms}间，竞品均价¥${competitorAvg}`,
        level: 'normal',
      });
    }
    setLoading(false);
  },
  
  switchRoomType: async (roomTypeId) => {
    const { currentHotel, addAuditLog, events } = get();
    const roomType = currentHotel.roomTypes.find(r => r.id === roomTypeId);
    if (roomType) {
      // 重新生成竞品数据（使用统一数据源）
      const today = new Date().toISOString().split('T')[0];
      
      // 使用 generateHotelsByTier 获取统一的竞品数据
      const hotelsByTier = generateHotelsByTier(currentHotel.id, today, events);
      const ourTier = currentHotel.tier;
      const tierHotels = hotelsByTier[ourTier];
      const roomCategory = roomType.name.toLowerCase().includes('经济') ? 'budget' : 
                          roomType.name.toLowerCase().includes('套房') ? 'suite' : 'standard';
      const prices = tierHotels
        .map(h => h.prices[roomCategory]?.price)
        .filter((p): p is number => p !== undefined);
      const competitorAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      
      // 兼容旧的竞品数据格式
      const newCompetitors = generateDailyCompetitorData(
        currentHotel.id,
        today,
        events,
        roomType
      );
      
      set({ 
        currentRoomType: roomType,
        competitors: newCompetitors,
        pricing: {
          ...get().pricing,
          competitorAvg,
          basePrice: Math.round(competitorAvg * 0.95),
        }
      });
      
      addAuditLog({
        action: '切换房型',
        detail: `切换到${roomType.name}，底价¥${roomType.floorPrice}，竞品均价¥${competitorAvg}`,
        level: 'normal',
      });
    }
  },
  
  switchUser: (user) => {
    set({ user });
    get().addAuditLog({
      action: '用户切换',
      detail: `切换到：${user.name}（${user.role === 'owner' ? '业主' : user.role === 'manager' ? '店长' : '员工'}）`,
      level: 'normal',
    });
  },
  
  updateUserPermissions: (userId, newPermissions) => {
    const targetUser = demoUsers.find(u => u.id === userId);
    if (!targetUser) return;
    
    targetUser.permissions = { ...targetUser.permissions, ...newPermissions };
    
    get().addAuditLog({
      action: '权限修改',
      detail: `修改了 ${targetUser.name} 的权限`,
      level: 'warning',
    });
  },
  
  // ============================================
  // 定价与审批（带权限控制）
  // ============================================
  
  updateBasePrice: (price, reason = '手动调整') => {
    const { pricing, currentRoomType, currentHotel, user, addAuditLog } = get();
    
    // 权限检查
    if (!user.permissions.canChangePrice) {
      addAuditLog({
        action: '定价调整',
        detail: `尝试调整价格到¥${price}，但被权限阻止`,
        level: 'warning',
      });
      return;
    }
    
    if (!currentRoomType) return;
    
    const oldPrice = pricing.roomBasePrices[currentRoomType.id] || currentRoomType.floorPrice;
    
    // 更新 roomBasePrices
    const newRoomBasePrices = {
      ...pricing.roomBasePrices,
      [currentRoomType.id]: price
    };
    
    // 不可变更新：创建新的房型对象
    const updatedRoomType = { ...currentRoomType, floorPrice: price };
    
    // 同步更新 pricing 、当前房型和酒店配置
    set({ 
      pricing: { ...pricing, basePrice: price, roomBasePrices: newRoomBasePrices },
      currentRoomType: updatedRoomType,
      currentHotel: {
        ...currentHotel,
        roomTypes: currentHotel.roomTypes.map(rt => 
          rt.id === currentRoomType.id ? updatedRoomType : rt
        )
      }
    });
    
    // ===== 广播改价事件到管理端定价洞察 =====
    const syncService = getHotelSync();
    syncService.broadcast({
      type: 'PRICE_CHANGED',
      hotelId: currentHotel.id,
      roomTypeId: currentRoomType.id,
      oldPrice,
      newPrice: price,
      reason,
      userId: user.id,
      userRole: user.role,
      timestamp: Date.now(),
    } as any);
    
    addAuditLog({
      action: '定价调整',
      detail: `${currentRoomType.name}价格从¥${oldPrice}调整到¥${price}，原因：${reason}`,
      level: 'normal',
      metadata: { roomType: currentRoomType.name, oldPrice, newPrice: price, reason },
    });
    
    get().generateSmartAlerts();
  },
  
  // 更新当前售价（AI建议应用到这里，不改变底价）
  updateCurrentPrice: (price, reason = 'AI智能定价') => {
    const { pricing, currentRoomType, currentHotel, user, addAuditLog } = get();
    
    if (!currentRoomType) return;
    
    const oldPrice = currentRoomType.currentPrice;
    const floorPrice = currentRoomType.floorPrice;
    const ceilingPrice = currentRoomType.ceilingPrice;
    
    // 确保价格在底价和天花板之间
    const constrainedPrice = Math.max(floorPrice, Math.min(ceilingPrice, price));
    
    // 不可变更新：创建新的房型对象
    const updatedRoomType = { ...currentRoomType, currentPrice: constrainedPrice };
    
    // 同步更新 pricing、当前房型、以及 roomBasePrices
    set({ 
      pricing: { 
        ...pricing, 
        basePrice: constrainedPrice,
        roomBasePrices: {
          ...pricing.roomBasePrices,
          [currentRoomType.id]: constrainedPrice
        }
      },
      currentRoomType: updatedRoomType,
      currentHotel: {
        ...currentHotel,
        roomTypes: currentHotel.roomTypes.map(rt => 
          rt.id === currentRoomType.id ? updatedRoomType : rt
        )
      }
    });
    
    // ===== 广播改价事件到管理端定价洞察 =====
    const syncService = getHotelSync();
    syncService.broadcast({
      type: 'PRICE_CHANGED',
      hotelId: currentHotel.id,
      roomTypeId: currentRoomType.id,
      oldPrice,
      newPrice: constrainedPrice,
      reason,
      userId: user?.id,
      userRole: user?.role,
      timestamp: Date.now(),
    } as any);
    
    addAuditLog({
      action: 'AI定价调整',
      detail: `${currentRoomType.name}当前售价从¥${oldPrice}调整到¥${constrainedPrice}，原因：${reason}`,
      level: 'normal',
      metadata: { roomType: currentRoomType.name, oldPrice, newPrice: constrainedPrice, reason },
    });
    
    get().generateSmartAlerts();
  },
  
  requestPriceChange: (requestedPrice, reason) => {
    const { pricing, user, currentRoomType, addAuditLog } = get();
    const floorPrice = currentRoomType?.floorPrice || pricing.floorPrice;
    
    // 如果低于底价，需要审批
    if (requestedPrice < floorPrice) {
      // 检查是否有审批权限（自己不能审批自己）
      if (user.role === 'staff') {
        set({
          pendingPriceApproval: {
            id: generateId('APR'),
            requestedBy: user.name,
            currentPrice: pricing.basePrice,
            requestedPrice,
            reason,
            timestamp: new Date().toISOString(),
          },
        });
        
        addAuditLog({
          action: '底价突破申请',
          detail: `申请将价格从¥${pricing.basePrice}调整到¥${requestedPrice}（低于底价¥${floorPrice}）`,
          level: 'warning',
        });
      } else if (user.permissions.canChangeFloorPrice) {
        // 有权限直接调整
        get().updateBasePrice(requestedPrice, reason);
      }
    } else {
      // 不低于底价，直接调整
      get().updateBasePrice(requestedPrice, reason);
    }
  },
  
  approvePriceChange: () => {
    const { pendingPriceApproval, user, addAuditLog } = get();
    if (!pendingPriceApproval) return;
    
    // 权限检查：只有业主/店长能审批
    if (!user.permissions.canApprove) {
      addAuditLog({
        action: '审批拒绝',
        detail: `${user.name}尝试审批价格调整，但权限不足`,
        level: 'critical',
      });
      return;
    }
    
    // 不能自己审批自己
    if (pendingPriceApproval.requestedBy === user.name) {
      addAuditLog({
        action: '审批拒绝',
        detail: `不能审批自己的价格调整申请`,
        level: 'warning',
      });
      return;
    }
    
    get().updateBasePrice(pendingPriceApproval.requestedPrice, '审批通过：' + pendingPriceApproval.reason);
    set({ pendingPriceApproval: null });
    
    addAuditLog({
      action: '审批通过',
      detail: `价格调整申请已通过：¥${pendingPriceApproval.currentPrice} → ¥${pendingPriceApproval.requestedPrice}`,
      level: 'normal',
    });
  },
  
  rejectPriceChange: () => {
    const { pendingPriceApproval, user, addAuditLog } = get();
    if (!pendingPriceApproval) return;
    
    if (!user.permissions.canApprove) return;
    
    set({ pendingPriceApproval: null });
    addAuditLog({
      action: '审批拒绝',
      detail: `价格调整申请已拒绝，维持原价¥${pendingPriceApproval.currentPrice}`,
      level: 'normal',
    });
  },
  
  // ============================================
  // 交易与库存（统一池子管理）
  // ============================================
  
  addTransaction: (transaction) => {
    const { inventory, currentHotel, occupyInventory, contents, autoConfirmOrders } = get();
    
    // 根据自动确认设置决定订单初始状态
    const finalStatus = autoConfirmOrders ? 'paid' : (transaction.status || 'pending');
    const newTransaction = { ...transaction, status: finalStatus };
    
    // 更新交易列表
    set((state) => ({
      transactions: [newTransaction, ...state.transactions].slice(0, 50),
    }));
    
    // ===== 广播到管理端数据仓库 =====
    try {
      const syncService = getHotelSync();
      syncService.broadcast({
        type: 'ORDER_CREATED',
        order: newTransaction,
        hotelId: currentHotel.id,
        hotelName: currentHotel.name,
        timestamp: Date.now(),
      } as any);
      console.log('[Hotel] Order broadcasted:', newTransaction.id, newTransaction.guestName, newTransaction.guestPhone);
    } catch (e) {
      console.error('[Hotel] Failed to broadcast order:', e);
    }
    
    // ===== 内容转化率联动：更新关联内容的转化数 =====
    if (newTransaction.sourceContentId) {
      const contentIndex = contents.findIndex(c => c.id === newTransaction.sourceContentId);
      if (contentIndex !== -1) {
        // 找到关联内容，更新转化数
        set((state) => ({
          contents: state.contents.map(c => 
            c.id === newTransaction.sourceContentId
              ? { 
                  ...c, 
                  performance: {
                    ...c.performance,
                    conversions: (c.performance?.conversions || 0) + 1
                  }
                }
              : c
          ),
        }));
      }
    }
    
    const roomType = currentHotel.roomTypes.find(r => r.name === newTransaction.roomType);
    if (!roomType) return;
    
    // 如果订单状态不是已确认/已入住/已离店等状态，不扣减库存（等待人工确认）
    if (finalStatus === 'pending' || finalStatus === 'refund_pending') {
      // 待确认或退款待处理状态，不扣减库存
      return;
    }
    
    const roomInv = inventory.byRoomType[roomType.id];
    if (!roomInv) return;
    
    const platform = newTransaction.platform as Platform;
    const isFlexiblePlatform = ['xianyu', 'xiaohongshu', 'wechat'].includes(platform);
    
    // 更新库存数据
    if (isFlexiblePlatform) {
      // 非标渠道销售：更新灵活池
      const newFlexibleSold = roomInv.flexibleSold + 1;
      const newFlexibleAvailable = Math.max(0, roomInv.flexibleAvailable - 1);
      const newSold = roomInv.sold + 1;
      const newAvailable = Math.max(0, roomInv.available - 1);
      
      const platformInv = inventory.flexiblePool.platforms[platform];
      
      set({
        inventory: {
          ...inventory,
          sold: inventory.sold + 1,
          available: Math.max(0, inventory.available - 1),
          flexiblePool: {
            ...inventory.flexiblePool,
            sold: inventory.flexiblePool.sold + 1,
            available: Math.max(0, inventory.flexiblePool.available - 1),
            platforms: {
              ...inventory.flexiblePool.platforms,
              [platform]: {
                ...platformInv,
                sold: platformInv.sold + 1,
                available: Math.max(0, platformInv.available - 1),
              },
            },
          },
          byRoomType: {
            ...inventory.byRoomType,
            [roomType.id]: {
              ...roomInv,
              sold: newSold,
              available: newAvailable,
              flexibleSold: newFlexibleSold,
              flexibleAvailable: newFlexibleAvailable,
            },
          },
        },
      });
    } else {
      // OTA渠道销售：更新OTA池
      const newOtaSold = (roomInv.otaSold || 0) + 1;
      const newOtaAvailable = Math.max(0, (roomInv.otaAvailable || roomInv.otaAllocation) - 1);
      const newSold = roomInv.sold + 1;
      const newAvailable = Math.max(0, roomInv.available - 1);
      
      set({
        inventory: {
          ...inventory,
          sold: inventory.sold + 1,
          available: Math.max(0, inventory.available - 1),
          otaPool: {
            ...inventory.otaPool,
            sold: inventory.otaPool.sold + 1,
            available: Math.max(0, inventory.otaPool.available - 1),
          },
          byRoomType: {
            ...inventory.byRoomType,
            [roomType.id]: {
              ...roomInv,
              sold: newSold,
              available: newAvailable,
              otaSold: newOtaSold,
              otaAvailable: newOtaAvailable,
            },
          },
        },
      });
    }
    
    // 同步更新日历库存（如果有入住/离店日期）
    if (newTransaction.checkInDate && newTransaction.checkOutDate) {
      occupyInventory({
        roomTypeId: roomType.id,
        checkInDate: newTransaction.checkInDate,
        checkOutDate: newTransaction.checkOutDate,
        platform: platform,
      });
    }
    
    // 如果开启了自动确认，记录审计日志
    if (autoConfirmOrders && finalStatus === 'paid') {
      get().addAuditLog({
        action: '自动确认订单',
        detail: `订单${newTransaction.id}已自动确认并扣除库存`,
        level: 'normal',
      });
    }
  },
  
  updateOrderStatus: (orderId, status) => {
    const { transactions, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order) return;
    
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { ...t, status } : t
      ),
    }));
    
    const statusLabels: Record<string, string> = {
      paid: '已成交',
      pending: '待入住',
      checked_in: '已入住',
      checked_out: '已离店',
      invoiced: '已开票',
      refunded: '已退款',
    };
    
    addAuditLog({
      action: '订单状态变更',
      detail: `订单${orderId}状态变更为${statusLabels[status] || status}`,
      level: 'normal',
    });
  },
  
  processRefund: (orderId, amount, reason) => {
    const { transactions, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order) return;
    
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId 
          ? { 
              ...t, 
              status: 'refunded',
              refund: { amount, reason, timestamp: new Date().toISOString() }
            } 
          : t
      ),
    }));
    
    addAuditLog({
      action: '订单退款',
      detail: `订单${orderId}退款¥${amount}，原因：${reason}`,
      level: 'warning',
    });
  },
  
  // ============================================
  // 订单管理（确认/取消/退款）
  // ============================================
  
  // 确认订单（自动扣库存）
  confirmOrder: (orderId) => {
    const { transactions, currentHotel, occupyInventory, addAlert, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order || order.status !== 'pending') return false;
    
    const roomType = currentHotel.roomTypes.find(r => r.name === order.roomType);
    if (!roomType) return false;
    
    // 如果没有入住日期，使用默认日期
    const checkInDate = order.checkInDate || new Date().toISOString().split('T')[0];
    const checkOutDate = order.checkOutDate || checkInDate;
    
    // 尝试占用库存
    const success = occupyInventory({
      roomTypeId: roomType.id,
      checkInDate,
      checkOutDate,
      platform: order.platform,
    });
    
    if (!success) {
      addAlert({
        id: `confirm-fail-${orderId}`,
        level: 'warning',
        type: 'inventory',
        message: `订单${orderId}确认失败：库存不足`,
        timestamp: new Date().toISOString(),
        requiresAction: true,
      });
      return false;
    }
    
    // 更新订单状态
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { ...t, status: 'paid' } : t
      ),
    }));
    
    addAuditLog({
      action: '确认订单',
      detail: `订单${orderId}已确认，占用库存：${order.roomType} ${order.checkInDate} 至 ${order.checkOutDate}`,
      level: 'normal',
    });
    
    return true;
  },
  
  // 取消订单（释放库存）
  cancelOrder: (orderId) => {
    const { transactions, currentHotel, releaseInventory, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order || (order.status !== 'pending' && order.status !== 'paid')) return false;
    
    const roomType = currentHotel.roomTypes.find(r => r.name === order.roomType);
    if (roomType && order.checkInDate && order.checkOutDate) {
      // 释放库存
      releaseInventory({
        roomTypeId: roomType.id,
        checkInDate: order.checkInDate,
        checkOutDate: order.checkOutDate,
        platform: order.platform,
      });
    }
    
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { ...t, status: 'cancelled' } : t
      ),
    }));
    
    addAuditLog({
      action: '取消订单',
      detail: `订单${orderId}已取消，释放库存`,
      level: 'warning',
    });
    
    return true;
  },
  
  // 用户申请退款（从平台同步过来）
  requestRefundFromUser: (orderId, reason) => {
    const { transactions, addAlert, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order || (order.status !== 'paid' && order.status !== 'checked_in')) return false;
    
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { ...t, status: 'refund_pending', refundReason: reason } : t
      ),
    }));
    
    addAlert({
      id: `refund-request-${orderId}`,
      level: 'warning',
      type: 'finance',
      message: `订单${orderId}收到退款申请，请处理`,
      timestamp: new Date().toISOString(),
      requiresAction: true,
    });
    
    addAuditLog({
      action: '退款申请',
      detail: `订单${orderId}收到用户退款申请：${reason}`,
      level: 'warning',
    });
    
    return true;
  },
  
  // 酒店同意退款
  approveRefund: (orderId) => {
    const { transactions, refunds, currentHotel, releaseInventory, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order || order.status !== 'refund_pending') return false;
    
    const roomType = currentHotel.roomTypes.find(r => r.name === order.roomType);
    if (roomType && order.checkInDate && order.checkOutDate) {
      // 释放库存
      releaseInventory({
        roomTypeId: roomType.id,
        checkInDate: order.checkInDate,
        checkOutDate: order.checkOutDate,
        platform: order.platform,
      });
    }
    
    // 更新订单状态
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { 
          ...t, 
          status: 'refunded',
          refund: { 
            amount: t.price, 
            reason: t.refundReason || '用户申请退款',
            timestamp: new Date().toISOString()
          }
        } : t
      ),
    }));
    
    // 查找并更新对应的退款记录
    const refund = refunds.find(r => r.orderId === orderId && r.status === 'pending');
    if (refund) {
      const updatedRefund = {
        ...refund,
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
        reviewer: '酒店',
      };
      
      set((state) => ({
        refunds: state.refunds.map(r => 
          r.id === refund.id ? updatedRefund : r
        ),
      }));
      
      // 广播到管理端
      const syncService = getHotelRefundSync();
      syncService.broadcast({
        type: 'REFUND_STATUS_UPDATED',
        refund: updatedRefund,
      } as any);
    }
    
    addAuditLog({
      action: '同意退款',
      detail: `订单${orderId}退款已批准，释放库存`,
      level: 'warning',
    });
    
    return true;
  },
  
  // 酒店拒绝退款
  rejectRefund: (orderId, reason) => {
    const { transactions, refunds, addAuditLog } = get();
    const order = transactions.find(t => t.id === orderId);
    if (!order || order.status !== 'refund_pending') return false;
    
    // 恢复到之前的状态（通常是 paid 或 checked_in）
    const previousStatus = order.checkInDate && new Date(order.checkInDate) <= new Date() 
      ? 'checked_in' 
      : 'paid';
    
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === orderId ? { 
          ...t, 
          status: previousStatus,
          refundRejectReason: reason 
        } : t
      ),
    }));
    
    // 查找并更新对应的退款记录
    const refund = refunds.find(r => r.orderId === orderId && r.status === 'pending');
    if (refund) {
      const updatedRefund = {
        ...refund,
        status: 'rejected' as const,
        reviewedAt: new Date().toISOString(),
        reviewer: '酒店',
        reviewNotes: reason,
      };
      
      set((state) => ({
        refunds: state.refunds.map(r => 
          r.id === refund.id ? updatedRefund : r
        ),
      }));
      
      // 广播到管理端
      const syncService = getHotelRefundSync();
      syncService.broadcast({
        type: 'REFUND_STATUS_UPDATED',
        refund: updatedRefund,
      } as any);
    }
    
    addAuditLog({
      action: '拒绝退款',
      detail: `订单${orderId}退款申请被拒绝：${reason}`,
      level: 'warning',
    });
    
    return true;
  },
  
  // ============================================
  // 内容发布
  // ============================================
  
  addContent: (content) => {
    set((state) => ({
      contents: [content, ...state.contents],
    }));
    
    // ===== 广播到管理端内容监控 =====
    // 注意：私域内容（wechat）在草稿状态时不广播，需在 PrivateDomain 手动发布后同步
    const shouldBroadcast = content.platform !== 'wechat' || content.status === 'published';
    
    const { currentHotel } = get();
    if (currentHotel && shouldBroadcast) {
      const syncService = getHotelSync();
      syncService.broadcast({
        type: 'CONTENT_PUBLISHED',
        content,
        hotelId: currentHotel.id,
        hotelName: currentHotel.name,
      } as Omit<import('@/services/unifiedSync').ContentSyncMessage, 'source' | 'timestamp'>);
    }
  },
  
  publishContent: (contentId) => {
    const { currentHotel, contents } = get();
    const content = contents.find(c => c.id === contentId);
    
    set((state) => ({
      contents: state.contents.map(c => 
        c.id === contentId 
          ? { ...c, status: 'published', publishedAt: new Date().toISOString() }
          : c
      ),
    }));
    
    // ===== 广播到管理端内容监控 =====
    if (content) {
      const syncService = getHotelSync();
      
      // 获取完整的内容详情（包括私域扩展字段）
      const fullContent = get().contents.find(c => c.id === contentId);
      
      syncService.broadcast({
        type: 'CONTENT_PUBLISHED',
        content: (fullContent || { ...content, status: 'published' }) as ContentItem,
        hotelId: currentHotel.id,
        hotelName: currentHotel.name,
      } as Omit<import('@/services/unifiedSync').ContentSyncMessage, 'source' | 'timestamp'>);
    }
    
    get().addAuditLog({
      action: '发布内容',
      detail: `内容${contentId}已发布`,
      level: 'normal',
    });
  },
  
  // ============================================
  // 库存初始化
  // ============================================
  
  initInventory: () => {
    const { currentHotel } = get();
    set({ inventory: calculateInitialInventory(currentHotel) });
    // 同步现有交易到日历
    setTimeout(() => get().syncTransactionsToCalendar(), 0);
  },
  
  // ============================================
  // 酒店初始化
  // ============================================
  
  initHotel: (hotel) => {
    set((state) => ({
      tempHotels: [...state.tempHotels, hotel],
    }));
    get().addAuditLog({
      action: '酒店初始化',
      detail: `新增酒店：${hotel.name}（临时添加，刷新后丢失）`,
      level: 'normal',
    });
  },
  
  // ============================================
  // 渠道配额管理
  // ============================================
  
  updateFlexibleAllocation: (roomTypeId: string, maxAllocation: number) => {
    const { inventory, currentHotel, addAuditLog } = get();
    
    const roomType = currentHotel.roomTypes.find(r => r.id === roomTypeId);
    if (!roomType) return;
    
    // 限制不能大于该房型的灵活库存分配量
    const flexibleAllocation = roomType.flexibleAllocation;
    const validAllocation = Math.min(Math.max(0, maxAllocation), flexibleAllocation);
    
    set({
      inventory: {
        ...inventory,
        byRoomType: {
          ...inventory.byRoomType,
          [roomTypeId]: {
            ...inventory.byRoomType[roomTypeId],
            maxAllocation: validAllocation,
          },
        },
      },
    });
    
    addAuditLog({
      action: '调整渠道配额',
      detail: `${roomType.name}的非标渠道投放量调整为${validAllocation}间（上限${flexibleAllocation}间）`,
      level: 'normal',
    });
  },
  
  checkAndPromptInventoryReplenish: () => {
    const { inventory, currentHotel, alerts, addAlert } = get();
    
    // 检查各房型非标渠道是否已售完但还有库存剩余
    const roomsNeedReplenish: string[] = [];
    
    currentHotel.roomTypes.forEach(room => {
      const roomInv = inventory.byRoomType[room.id];
      if (!roomInv) return;
      
      // 如果该房型非标渠道已售完（达到投放上限）但房型还有库存剩余
      const flexibleUsed = roomInv.flexibleSold;
      if (flexibleUsed >= roomInv.maxAllocation && roomInv.available > 0) {
        roomsNeedReplenish.push(room.name);
      }
    });
    
    if (roomsNeedReplenish.length > 0) {
      // 检查是否已存在相同的提示
      const existingAlert = alerts.find(a => 
        a.type === 'inventory' && a.message.includes('非标渠道')
      );
      
      if (!existingAlert) {
        addAlert({
          id: `alert-replenish-${Date.now()}`,
          level: 'info',
          type: 'inventory',
          message: `${roomsNeedReplenish.join('、')}的非标渠道已售完，但仍有库存可用。建议增加投放量。`,
          timestamp: new Date().toISOString(),
          requiresAction: true,
        });
      }
    }
  },
  
  // ============================================
  // 库存调拨：在OTA和灵活池之间动态调整（按房型）
  // ============================================
  
  transferInventory: (from, to, amount, roomTypeId) => {
    const { inventory, currentHotel, addAuditLog } = get();
    
    if (from === to || amount <= 0) return;
    
    // 如果没有指定房型，默认处理第一个可操作的房型
    const targetRoomId = roomTypeId || currentHotel.roomTypes[0]?.id;
    if (!targetRoomId) return;
    
    const roomInv = inventory.byRoomType[targetRoomId];
    const roomType = currentHotel.roomTypes.find(r => r.id === targetRoomId);
    if (!roomInv || !roomType) return;
    
    const roomName = roomType.name;
    
    if (from === 'ota' && to === 'flexible') {
      // 从OTA调拨到灵活池（按房型）
      const maxCanTransfer = roomInv.otaAvailable;
      const actualTransfer = Math.min(amount, maxCanTransfer);
      
      if (actualTransfer <= 0) return;
      
      // 更新该房型的库存分配
      const newRoomInv = {
        ...roomInv,
        otaAllocation: roomInv.otaAllocation - actualTransfer,
        otaAvailable: roomInv.otaAvailable - actualTransfer,
        flexibleAllocation: roomInv.flexibleAllocation + actualTransfer,
        flexibleAvailable: roomInv.flexibleAvailable + actualTransfer,
        // 调拨后maxAllocation也要相应增加，否则新的灵活库存无法使用
        maxAllocation: roomInv.maxAllocation + actualTransfer,
      };
      
      // 重新计算总池
      const newByRoomType = {
        ...inventory.byRoomType,
        [targetRoomId]: newRoomInv,
      };
      
      const newOtaTotal = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.otaAllocation, 0);
      const newFlexibleTotal = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.flexibleAllocation, 0);
      const newOtaAvailable = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.otaAvailable, 0);
      const newFlexibleAvailable = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.flexibleAvailable, 0);
      
      set({
        inventory: {
          ...inventory,
          otaPool: {
            ...inventory.otaPool,
            total: newOtaTotal,
            available: newOtaAvailable,
          },
          flexiblePool: {
            ...inventory.flexiblePool,
            total: newFlexibleTotal,
            available: newFlexibleAvailable,
            maxAllocation: Object.values(newByRoomType).reduce((sum, r: any) => sum + r.maxAllocation, 0),
          },
          byRoomType: newByRoomType,
        },
      });
      
      addAuditLog({
        action: '库存调拨',
        detail: `${roomName}：从OTA调拨${actualTransfer}间到非标渠道（OTA:${roomInv.otaAllocation}→${newRoomInv.otaAllocation}, 灵活:${roomInv.flexibleAllocation}→${newRoomInv.flexibleAllocation}）`,
        level: 'normal',
      });
    } else if (from === 'flexible' && to === 'ota') {
      // 从灵活池调拨到OTA（按房型）
      const maxCanTransfer = roomInv.flexibleAvailable;
      const actualTransfer = Math.min(amount, maxCanTransfer);
      
      if (actualTransfer <= 0) return;
      
      // 更新该房型的库存分配
      const newRoomInv = {
        ...roomInv,
        flexibleAllocation: roomInv.flexibleAllocation - actualTransfer,
        flexibleAvailable: roomInv.flexibleAvailable - actualTransfer,
        maxAllocation: Math.max(0, roomInv.maxAllocation - actualTransfer),
        otaAllocation: roomInv.otaAllocation + actualTransfer,
        otaAvailable: roomInv.otaAvailable + actualTransfer,
      };
      
      // 重新计算总池
      const newByRoomType = {
        ...inventory.byRoomType,
        [targetRoomId]: newRoomInv,
      };
      
      const newOtaTotal = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.otaAllocation, 0);
      const newFlexibleTotal = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.flexibleAllocation, 0);
      const newOtaAvailable = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.otaAvailable, 0);
      const newFlexibleAvailable = Object.values(newByRoomType).reduce((sum, r: any) => sum + r.flexibleAvailable, 0);
      
      set({
        inventory: {
          ...inventory,
          otaPool: {
            ...inventory.otaPool,
            total: newOtaTotal,
            available: newOtaAvailable,
          },
          flexiblePool: {
            ...inventory.flexiblePool,
            total: newFlexibleTotal,
            available: newFlexibleAvailable,
            maxAllocation: Object.values(newByRoomType).reduce((sum, r: any) => sum + r.maxAllocation, 0),
          },
          byRoomType: newByRoomType,
        },
      });
      
      addAuditLog({
        action: '库存调拨',
        detail: `${roomName}：从非标渠道调拨${actualTransfer}间到OTA（灵活:${roomInv.flexibleAllocation}→${newRoomInv.flexibleAllocation}, OTA:${roomInv.otaAllocation}→${newRoomInv.otaAllocation}）`,
        level: 'normal',
      });
    }
  },
  
  // ============================================
  // 全年库存日历管理
  // ============================================
  
  // 获取指定日期库存
  getDailyInventory: (date) => {
    const { inventory } = get();
    return inventory.calendar?.[date];
  },
  
  // 订单占房（跨日期占用库存）
  occupyInventory: (order) => {
    const { inventory, addAuditLog } = get();
    const { roomTypeId, checkInDate, checkOutDate, platform } = order;
    
    if (!inventory.calendar) return false;
    
    // 检查每一天是否有足够库存
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const dates: string[] = [];
    
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      
      const dailyInv = inventory.calendar[dateStr];
      if (!dailyInv) return false;
      
      const roomInv = dailyInv.byRoomType[roomTypeId];
      if (!roomInv) {
        console.log(`[occupyInventory] Room type ${roomTypeId} not found for date ${dateStr}`);
        return false;
      }
      
      // 检查是否有可用房（简化：不检查渠道配额，只检查总可用房）
      if (roomInv.available <= 0) {
        console.log(`[occupyInventory] No available rooms for ${roomTypeId} on ${dateStr}`);
        return false;
      }
    }
    
    // 占用每一天的库存
    const newCalendar = { ...inventory.calendar };
    dates.forEach((dateStr, index) => {
      const dailyInv = newCalendar[dateStr];
      const roomInv = dailyInv.byRoomType[roomTypeId];
      
      // 更新占用状态
      if (index === 0) {
        // 入住首日：arriving +1
        roomInv.occupied.arriving += 1;
      } else {
        // 续住：checkedIn +1
        roomInv.occupied.checkedIn += 1;
      }
      
      // 更新可用房数
      roomInv.available -= 1;
      
      // 更新渠道配额
      if (platform === 'xianyu' || platform === 'xiaohongshu' || platform === 'wechat') {
        roomInv.channelAllocation.flexible -= 1;
      } else {
        roomInv.channelAllocation.ota -= 1;
      }
      
      // 更新当日汇总
      dailyInv.summary.totalAvailable -= 1;
      dailyInv.summary.occupancyRate = Math.round(
        ((dailyInv.summary.totalRooms - dailyInv.summary.totalAvailable) / dailyInv.summary.totalRooms) * 100
      );
    });
    
    set({
      inventory: {
        ...inventory,
        calendar: newCalendar,
      },
    });
    
    addAuditLog({
      action: '库存占用',
      detail: `房型${roomTypeId} 从${checkInDate}到${checkOutDate}共${dates.length}晚，渠道${platform}`,
      level: 'normal',
    });
    
    // 广播库存变化到管理端
    const { currentHotel } = get();
    const inventorySync = getHotelInventorySync();
    dates.forEach((dateStr) => {
      const dailyInv = newCalendar[dateStr];
      inventorySync.broadcastRoomOccupied(currentHotel.id, roomTypeId, dateStr, `order-${Date.now()}`);
      inventorySync.broadcastDailyInventoryUpdate(currentHotel.id, dateStr, dailyInv);
    });
    
    return true;
  },
  
  // 释放库存（取消订单时）
  releaseInventory: (order) => {
    const { inventory, addAuditLog } = get();
    const { roomTypeId, checkInDate, checkOutDate, platform } = order;
    
    if (!inventory.calendar) return;
    
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const dates: string[] = [];
    
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const newCalendar = { ...inventory.calendar };
    dates.forEach((dateStr, index) => {
      const dailyInv = newCalendar[dateStr];
      if (!dailyInv) return;
      
      const roomInv = dailyInv.byRoomType[roomTypeId];
      if (!roomInv) return;
      
      // 释放占用
      if (index === 0) {
        roomInv.occupied.arriving = Math.max(0, roomInv.occupied.arriving - 1);
      } else {
        roomInv.occupied.checkedIn = Math.max(0, roomInv.occupied.checkedIn - 1);
      }
      
      // 恢复可用房数
      roomInv.available += 1;
      
      // 恢复渠道配额
      if (platform === 'xianyu' || platform === 'xiaohongshu' || platform === 'wechat') {
        roomInv.channelAllocation.flexible += 1;
      } else {
        roomInv.channelAllocation.ota += 1;
      }
      
      // 更新当日汇总
      dailyInv.summary.totalAvailable += 1;
      dailyInv.summary.occupancyRate = Math.round(
        ((dailyInv.summary.totalRooms - dailyInv.summary.totalAvailable) / dailyInv.summary.totalRooms) * 100
      );
    });
    
    set({
      inventory: {
        ...inventory,
        calendar: newCalendar,
      },
    });
    
    addAuditLog({
      action: '库存释放',
      detail: `房型${roomTypeId} 从${checkInDate}到${checkOutDate}共${dates.length}晚已释放`,
      level: 'normal',
    });
    
    // 广播库存变化到管理端
    const { currentHotel } = get();
    const inventorySync = getHotelInventorySync();
    dates.forEach((dateStr) => {
      const dailyInv = newCalendar[dateStr];
      inventorySync.broadcastRoomReleased(currentHotel.id, roomTypeId, dateStr, `order-${Date.now()}`);
      inventorySync.broadcastDailyInventoryUpdate(currentHotel.id, dateStr, dailyInv);
    });
  },
  
  // 按日期调拨渠道配额
  transferDailyAllocation: (date, roomTypeId, from, to, amount) => {
    const { inventory, addAuditLog, currentHotel } = get();
    if (!inventory.calendar) return;
    
    const dailyInv = inventory.calendar[date];
    if (!dailyInv) return;
    
    const roomInv = dailyInv.byRoomType[roomTypeId];
    if (!roomInv) return;
    
    const roomType = currentHotel.roomTypes.find(r => r.id === roomTypeId);
    const roomName = roomType?.name || roomTypeId;
    
    if (from === 'ota' && to === 'flexible') {
      const actualTransfer = Math.min(amount, roomInv.channelAllocation.ota);
      if (actualTransfer <= 0) return;
      
      const newRoomInv = {
        ...roomInv,
        channelAllocation: {
          ...roomInv.channelAllocation,
          ota: roomInv.channelAllocation.ota - actualTransfer,
          flexible: roomInv.channelAllocation.flexible + actualTransfer,
        },
      };
      
      set({
        inventory: {
          ...inventory,
          calendar: {
            ...inventory.calendar,
            [date]: {
              ...dailyInv,
              byRoomType: {
                ...dailyInv.byRoomType,
                [roomTypeId]: newRoomInv,
              },
            },
          },
        },
      });
      
      addAuditLog({
        action: '按日调拨',
        detail: `${roomName} ${date}：OTA→灵活 ${actualTransfer}间`,
        level: 'normal',
      });
    } else if (from === 'flexible' && to === 'ota') {
      const actualTransfer = Math.min(amount, roomInv.channelAllocation.flexible);
      if (actualTransfer <= 0) return;
      
      const newRoomInv = {
        ...roomInv,
        channelAllocation: {
          ...roomInv.channelAllocation,
          ota: roomInv.channelAllocation.ota + actualTransfer,
          flexible: roomInv.channelAllocation.flexible - actualTransfer,
        },
      };
      
      set({
        inventory: {
          ...inventory,
          calendar: {
            ...inventory.calendar,
            [date]: {
              ...dailyInv,
              byRoomType: {
                ...dailyInv.byRoomType,
                [roomTypeId]: newRoomInv,
              },
            },
          },
        },
      });
      
      addAuditLog({
        action: '按日调拨',
        detail: `${roomName} ${date}：灵活→OTA ${actualTransfer}间`,
        level: 'normal',
      });
    }
  },
  
  // 设置维修房
  setMaintenance: (date, roomTypeId, count) => {
    const { inventory, addAuditLog, currentHotel } = get();
    if (!inventory.calendar) return;
    
    const dailyInv = inventory.calendar[date];
    if (!dailyInv) return;
    
    const roomInv = dailyInv.byRoomType[roomTypeId];
    if (!roomInv) return;
    
    const roomType = currentHotel.roomTypes.find(r => r.id === roomTypeId);
    const roomName = roomType?.name || roomTypeId;
    
    const oldMaintenance = roomInv.occupied.maintenance;
    const newMaintenance = Math.max(0, Math.min(count, roomInv.total));
    const diff = newMaintenance - oldMaintenance;
    
    const newRoomInv = {
      ...roomInv,
      available: roomInv.available - diff,
      occupied: {
        ...roomInv.occupied,
        maintenance: newMaintenance,
      },
    };
    
    set({
      inventory: {
        ...inventory,
        calendar: {
          ...inventory.calendar,
          [date]: {
            ...dailyInv,
            byRoomType: {
              ...dailyInv.byRoomType,
              [roomTypeId]: newRoomInv,
            },
            summary: {
              ...dailyInv.summary,
              totalAvailable: dailyInv.summary.totalAvailable - diff,
            },
          },
        },
      },
    });
    
    addAuditLog({
      action: '设置维修房',
      detail: `${roomName} ${date}：维修房${oldMaintenance}→${newMaintenance}间`,
      level: 'normal',
    });
  },
  
  // 更新动态价格
  updateDynamicPrice: (date, roomTypeId, price) => {
    const { inventory, addAuditLog, currentHotel } = get();
    if (!inventory.calendar) return;
    
    const dailyInv = inventory.calendar[date];
    if (!dailyInv) return;
    
    const roomInv = dailyInv.byRoomType[roomTypeId];
    if (!roomInv) return;
    
    const roomType = currentHotel.roomTypes.find(r => r.id === roomTypeId);
    const roomName = roomType?.name || roomTypeId;
    
    const oldPrice = roomInv.dynamicPrice.suggestedPrice;
    
    set({
      inventory: {
        ...inventory,
        calendar: {
          ...inventory.calendar,
          [date]: {
            ...dailyInv,
            byRoomType: {
              ...dailyInv.byRoomType,
              [roomTypeId]: {
                ...roomInv,
                dynamicPrice: {
                  ...roomInv.dynamicPrice,
                  suggestedPrice: price,
                  priceFactor: price / roomInv.dynamicPrice.basePrice,
                },
              },
            },
          },
        },
      },
    });
    
    addAuditLog({
      action: '调整价格',
      detail: `${roomName} ${date}：¥${oldPrice}→¥${price}`,
      level: 'normal',
    });
  },
  
  // ============================================
  // 同步交易数据到日历
  // ============================================
  
  syncTransactionsToCalendar: () => {
    const { transactions, currentHotel, inventory, occupyInventory } = get();
    if (!inventory.calendar) return;
    
    // 重置日历占用状态（保留总房数和维修房设置）
    const newCalendar = { ...inventory.calendar };
    
    Object.keys(newCalendar).forEach(dateStr => {
      const dailyInv = newCalendar[dateStr];
      currentHotel.roomTypes.forEach(room => {
        const roomInv = dailyInv.byRoomType[room.id];
        if (roomInv) {
          // 重置占用，但保留维修房
          const maintenance = roomInv.occupied.maintenance;
          roomInv.occupied = {
            checkedIn: 0,
            arriving: 0,
            dayUse: 0,
            maintenance,
          };
          // 重置渠道配额到初始值
          roomInv.channelAllocation = {
            ota: room.otaAllocation,
            flexible: room.flexibleAllocation,
          };
          // 重新计算可售
          roomInv.available = roomInv.total - maintenance;
        }
      });
      // 更新汇总
      dailyInv.summary.totalAvailable = currentHotel.roomTypes.reduce(
        (sum, r) => sum + (dailyInv.byRoomType[r.id]?.available || 0), 0
      );
      dailyInv.summary.occupancyRate = Math.round(
        ((dailyInv.summary.totalRooms - dailyInv.summary.totalAvailable) / dailyInv.summary.totalRooms) * 100
      );
    });
    
    set({
      inventory: {
        ...inventory,
        calendar: newCalendar,
      },
    });
    
    // 重新应用所有有效交易（待确认及以上状态都预占库存）
    // pending: 用户已下单，酒店待确认，预占库存
    // paid/checked_in/checked_out/invoiced: 已确认，占用库存
    // refunded/cancelled: 不占用库存
    transactions.forEach(t => {
      if (t.checkInDate && t.checkOutDate && 
          t.status !== 'refunded' && t.status !== 'cancelled') {
        const roomType = currentHotel.roomTypes.find(r => r.name === t.roomType);
        if (roomType) {
          occupyInventory({
            roomTypeId: roomType.id,
            checkInDate: t.checkInDate,
            checkOutDate: t.checkOutDate,
            platform: t.platform,
          });
        }
      }
    });
  },
  
  // ============================================
  // 智能定价系统（全自动）
  // ============================================
  
  enableSmartPricing: (enabled) => {
    set((state) => ({
      smartPricing: {
        ...state.smartPricing,
        enabled,
      },
    }));
    
    get().addAuditLog({
      action: enabled ? '启用智能定价' : '关闭智能定价',
      detail: enabled ? '系统自动根据竞品和库存调整定价' : '手动定价模式',
      level: 'normal',
    });
    
    // 如果启用，立即执行一次
    if (enabled) {
      setTimeout(() => get().runSmartPricing(), 0);
    }
  },
  
  setAutoApply: (autoApply) => {
    set((state) => ({
      smartPricing: {
        ...state.smartPricing,
        autoApply,
      },
    }));
    
    get().addAuditLog({
      action: autoApply ? '开启自动应用建议' : '切换手动确认模式',
      detail: autoApply 
        ? '系统将自动应用AI建议价，无需手动确认' 
        : '系统只提供建议，需要手动点击应用',
      level: 'normal',
    });
  },
  
  // ============================================
  // 订单自动确认设置
  // ============================================
  
  setAutoConfirmOrders: (enabled) => {
    set({ autoConfirmOrders: enabled });
    
    get().addAuditLog({
      action: enabled ? '启用自动确认订单' : '关闭自动确认订单',
      detail: enabled 
        ? '新订单将自动确认并扣除库存，无需人工干预' 
        : '新订单需要人工确认后方可生效',
      level: 'normal',
    });
  },
  
  updateCompetitorAPIConfig: (config) => {
    set((state) => ({
      smartPricing: {
        ...state.smartPricing,
        competitorAPIConfig: {
          ...state.smartPricing.competitorAPIConfig,
          ...config,
        },
      },
    }));
  },
  
  runSmartPricing: () => {
    const { 
      smartPricing,
      currentHotel,
      currentRoomType, 
      inventory, 
      competitors, 
      events, 
      pricing,
      transactions,
      updateCurrentPrice,
      addAuditLog
    } = get();
    
    if (!smartPricing.enabled || !currentRoomType) return;
    
    // 检查今日调价次数
    const today = new Date().toDateString();
    const lastUpdateDate = new Date(smartPricing.lastPricingUpdate).toDateString();
    let todayUpdateCount = lastUpdateDate === today ? smartPricing.todayPricingUpdateCount : 0;
    
    if (todayUpdateCount >= 20) {
      console.log('今日调价次数已达上限');
      return;
    }
    
    // 检查调价间隔（最短5分钟）
    const minutesSinceLastUpdate = (Date.now() - smartPricing.lastPricingUpdate) / (1000 * 60);
    if (minutesSinceLastUpdate < 5 && smartPricing.lastPricingUpdate > 0) {
      console.log('调价间隔太短，跳过');
      return;
    }
    
    // 1. 分析竞品状态（使用统一数据源）
    const todayStr = new Date().toISOString().split('T')[0];
    const hotelsByTier = generateHotelsByTier(currentHotel.id, todayStr, events);
    const ourTier = currentHotel.tier;
    const tierHotels = hotelsByTier[ourTier];
    const roomCategory = currentRoomType.name.toLowerCase().includes('经济') ? 'budget' : 
                        currentRoomType.name.toLowerCase().includes('套房') ? 'suite' : 'standard';
    const prices = tierHotels
      .map(h => h.prices[roomCategory]?.price)
      .filter((p): p is number => p !== undefined);
    const competitorAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    
    // 兼容旧的竞品状态判断逻辑
    const competitorData = competitors.map(c => ({
      id: c.id,
      price: c.currentPrice,
      inventory: c.inventory,
      status: c.status,
    }));
    
    // 判定竞品整体状态
    const soldoutCompetitors = competitorData.filter(c => c.status === 'soldout').length;
    const tightCompetitors = competitorData.filter(c => c.status === 'tight').length;
    let competitorStatus: 'soldout' | 'tight' | 'normal' | 'available' = 'normal';
    if (soldoutCompetitors >= 1) {
      competitorStatus = 'soldout';
    } else if (tightCompetitors >= 2) {
      competitorStatus = 'tight';
    } else if (tightCompetitors === 0 && soldoutCompetitors === 0) {
      competitorStatus = 'available';
    }
    
    // 2. 分析自身库存
    const roomInv = inventory.byRoomType[currentRoomType.id];
    const selfInventory = roomInv?.available || 0;
    const selfTotal = roomInv?.total || 1;
    
    let selfInventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout' = 'normal';
    const selfInventoryRatio = selfInventory / selfTotal;
    if (selfInventory === 0) {
      selfInventoryStatus = 'soldout';
    } else if (selfInventoryRatio < 0.15) {
      selfInventoryStatus = 'tight';
    } else if (selfInventoryRatio > 0.7) {
      selfInventoryStatus = 'abundant';
    }
    
    // 3. 分析事件影响
    const todayEvents = events.filter(e => e.date === todayStr);
    // 4. 计算最近30分钟成交速度
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const recentTransactions = transactions.filter(t => 
      new Date(t.timestamp).getTime() > thirtyMinutesAgo
    ).length;
    
    // 5. 自动判定定价模式
    let newMode: PricingMode = 'dynamic';
    if (competitorStatus === 'soldout' || (competitorStatus === 'tight' && selfInventoryStatus === 'tight')) {
      newMode = 'scalper';
    } else if (selfInventoryStatus === 'abundant') {
      newMode = 'clearance';
    }
    
    // 如果模式发生变化，记录日志
    if (newMode !== pricing.mode) {
      const modeNames: Record<PricingMode, string> = { clearance: '尾货', dynamic: '动态', scalper: '黄牛' };
      addAuditLog({
        action: '自动切换定价模式',
        detail: `由${modeNames[pricing.mode]}模式切换为${modeNames[newMode]}模式（竞品${competitorStatus}，库存${selfInventoryStatus}）`,
        level: 'normal',
      });
      
      set((state) => ({
        pricing: {
          ...state.pricing,
          mode: newMode,
        },
        smartPricing: {
          ...state.smartPricing,
          lastAutoModeChange: Date.now(),
          autoModeChangeCount: state.smartPricing.autoModeChangeCount + 1,
        },
      }));
    }
    
    // 6. 计算智能价格（简化版）
    let modeFactor = 1.0;
    if (newMode === 'clearance') modeFactor = 0.88;
    else if (newMode === 'scalper') modeFactor = competitorStatus === 'soldout' ? 1.35 : 1.15;
    
    const eventFactor = todayEvents.reduce((factor, e) => {
      if (e.intensity === 'high') return factor + 0.25;
      if (e.intensity === 'medium') return factor + 0.12;
      return factor + 0.05;
    }, 1.0);
    
    const inventoryRatio = selfInventory / selfTotal;
    let inventoryFactor = 1.0;
    if (inventoryRatio > 0.7) inventoryFactor = 0.92;
    else if (inventoryRatio < 0.15) inventoryFactor = 1.15;
    
    const suggestedPrice = Math.round(competitorAvg * modeFactor * eventFactor * inventoryFactor);
    const finalPrice = Math.max(currentRoomType.floorPrice, Math.min(currentRoomType.ceilingPrice, suggestedPrice));
    
    const pricingResult = {
      suggestedPrice: finalPrice,
      mode: newMode,
      factors: {
        basePrice: competitorAvg,
        competitorDeviation: 0,
        inventoryFactor,
        eventFactor,
        modeFactor,
        finalAdjustment: 0,
      },
      reasoning: `${newMode}模式定价：竞品均价¥${competitorAvg}，建议价格¥${finalPrice}`,
    };
    
    // 7. 检查价格变化幅度
    const priceChangePercent = Math.abs((pricingResult.suggestedPrice - pricing.basePrice) / pricing.basePrice * 100);
    
    // 如果价格变化超过15%，需要特殊处理（这里直接应用，实际可以加入审批逻辑）
    if (priceChangePercent > 15) {
      addAuditLog({
        action: '价格大幅调整预警',
        detail: `建议价格¥${pricingResult.suggestedPrice}较当前¥${pricing.basePrice}变化${priceChangePercent.toFixed(1)}%`,
        level: 'warning',
      });
    }
    
    // 8. 应用新价格（根据 autoApply 设置）
    if (pricingResult.suggestedPrice !== pricing.basePrice) {
      if (smartPricing.autoApply) {
        // 自动模式：直接应用建议价到当前售价
        updateCurrentPrice(pricingResult.suggestedPrice, pricingResult.reasoning);
      }
      
      // 更新调价统计（两种模式都记录）
      set((state) => ({
        smartPricing: {
          ...state.smartPricing,
          lastPricingUpdate: Date.now(),
          todayPricingUpdateCount: todayUpdateCount + 1,
        },
      }));
    }
    
    // 9. 检查底价建议
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const hourlyTransactions = transactions.filter(t => 
      new Date(t.timestamp).getTime() > oneHourAgo
    );
    const hourlyBreakFloor = hourlyTransactions.filter(t => 
      t.price < currentRoomType.floorPrice
    ).length;
    const avgPrice = hourlyTransactions.length > 0
      ? Math.round(hourlyTransactions.reduce((sum, t) => sum + t.price, 0) / hourlyTransactions.length)
      : pricing.basePrice;
    
    const floorSuggestion = suggestFloorPriceAdjustment(
      currentRoomType,
      selfInventory,
      recentTransactions,
      hourlyBreakFloor,
      avgPrice,
      competitorAvg
    );
    
    if (floorSuggestion.shouldAdjust) {
      set((state) => ({
        smartPricing: {
          ...state.smartPricing,
          floorPriceSuggestion: {
            show: true,
            roomTypeId: currentRoomType.id,
            suggestedPrice: floorSuggestion.suggestedFloorPrice,
            reason: floorSuggestion.reason,
            trend: floorSuggestion.trend,
          },
        },
      }));
    }
  },
  
  dismissFloorPriceSuggestion: () => {
    set((state) => ({
      smartPricing: {
        ...state.smartPricing,
        floorPriceSuggestion: null,
      },
    }));
  },
  
  applyFloorPriceSuggestion: () => {
    const { smartPricing, currentRoomType, addAuditLog } = get();
    if (!smartPricing.floorPriceSuggestion || !currentRoomType) return;
    
    const newFloorPrice = smartPricing.floorPriceSuggestion.suggestedPrice;
    const oldFloorPrice = currentRoomType.floorPrice;
    
    // 更新房型底价
    currentRoomType.floorPrice = newFloorPrice;
    
    addAuditLog({
      action: '调整底价',
      detail: `根据系统建议，${currentRoomType.name}底价从¥${oldFloorPrice}调整为¥${newFloorPrice}`,
      level: 'normal',
    });
    
    set((state) => ({
      smartPricing: {
        ...state.smartPricing,
        floorPriceSuggestion: null,
      },
    }));
  },
  
  // ===== 工单系统 Actions =====
  addTicket: (ticketData) => {
    const newTicket: import('@/types').Ticket = {
      ...ticketData,
      id: `TKT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    
    set((state) => ({
      tickets: [newTicket, ...state.tickets],
    }));
    
    // 广播给管理端
    const syncService = getHotelTicketSync();
    syncService.broadcast({
      type: 'TICKET_CREATED',
      ticket: newTicket,
    });
    
    // 添加审计日志
    get().addAuditLog({
      action: '提交工单',
      detail: `提交工单：${ticketData.title}`,
      level: 'normal',
    });
  },
  
  updateTicket: (id, updates) => {
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === id
          ? { ...ticket, ...updates, updatedAt: new Date().toISOString() }
          : ticket
      ),
    }));
  },
  
  addTicketMessage: (ticketId, messageData) => {
    const newMessage: import('@/types').TicketMessage = {
      ...messageData,
      id: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              messages: [...ticket.messages, newMessage],
              updatedAt: new Date().toISOString(),
              status: messageData.sender === 'admin' ? 'processing' : ticket.status,
            }
          : ticket
      ),
    }));
    
    // 广播给管理端（酒店发送的消息）
    if (messageData.sender === 'hotel') {
      const syncService = getHotelTicketSync();
      syncService.broadcast({
        type: 'TICKET_MESSAGE',
        ticketId,
        message: newMessage,
        timestamp: Date.now(),
      });
    }
  },
  
  markTicketAsRead: (_ticketId) => {
    // 标记为已读逻辑
    set((state) => ({
      unreadTicketCount: Math.max(0, state.unreadTicketCount - 1),
    }));
  },
  
  assignTicket: (ticketId, assignee, assigneeName) => {
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              assignedTo: assignee,
              assignedToName: assigneeName,
              status: 'processing',
              updatedAt: new Date().toISOString(),
            }
          : ticket
      ),
    }));
  },
  
  resolveTicket: (ticketId, data) => {
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              rating: data?.rating,
              responseSpeed: data?.responseSpeed,
              resolutionEffect: data?.resolutionEffect,
              ratingTags: data?.ratingTags,
              feedback: data?.feedback,
            }
          : ticket
      ),
    }));
    
    // 广播给管理端
    const syncService = getHotelTicketSync();
    syncService.broadcast({
      type: 'TICKET_RESOLVED',
      ticketId,
      data: data || {},
      timestamp: Date.now(),
    });
    
    get().addAuditLog({
      action: '解决工单',
      detail: `工单 ${ticketId} 已标记为已解决`,
      level: 'normal',
    });
  },
  
  urgeTicket: (ticketId) => {
    const { tickets, addAuditLog } = get();
    const ticket = tickets.find((t) => t.id === ticketId);
    
    if (!ticket) {
      return { success: false, message: '工单不存在' };
    }
    
    // 只有待处理或处理中的工单可以催单
    if (ticket.status !== 'open' && ticket.status !== 'processing') {
      return { success: false, message: '该工单已解决或已关闭' };
    }
    
    const now = Date.now();
    const lastUrgent = ticket.lastUrgentAt ? new Date(ticket.lastUrgentAt).getTime() : 0;
    const hoursSinceLastUrgent = (now - lastUrgent) / (1000 * 60 * 60);
    const currentCount = ticket.urgentCount || 0;
    
    // 限制：12小时内只能催一次，最多催3次
    if (currentCount >= 3) {
      return { success: false, message: '已多次催促，平台将优先处理' };
    }
    
    if (hoursSinceLastUrgent < 12 && currentCount > 0) {
      const waitHours = Math.ceil(12 - hoursSinceLastUrgent);
      return { success: false, message: `${waitHours}小时后可再次催促` };
    }
    
    const newCount = currentCount + 1;
    const nowISO = new Date().toISOString();
    
    // 更新本地状态
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              urgentCount: newCount,
              lastUrgentAt: nowISO,
              updatedAt: nowISO,
              // 第3次催促时自动提升优先级
              priority: newCount >= 3 ? 'urgent' : t.priority,
            }
          : t
      ),
    }));
    
    // 广播给管理端
    const syncService = getHotelTicketSync();
    syncService.broadcast({
      type: 'TICKET_URGENT',
      ticketId,
      urgentCount: newCount,
      timestamp: now,
    });
    
    addAuditLog({
      action: '催促工单',
      detail: `工单 ${ticketId} 第${newCount}次催促`,
      level: 'warning',
    });
    
    return { 
      success: true, 
      message: newCount >= 3 ? '已多次催促，平台将优先处理' : '催促成功，平台将尽快处理'
    };
  },
  
  // ===== 退款系统 Actions =====
  requestRefund: (orderId, data) => {
    const { currentHotel, refunds, addAuditLog } = get();
    const order = get().transactions.find(t => t.id === orderId);
    if (!order) return;
    
    const newRefund: import('@/types').Refund = {
      id: `REF-${Date.now()}`,
      orderId,
      hotelId: currentHotel.id,
      hotelName: currentHotel.name,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      amount: data.amount,
      reason: data.reason,
      reasonDetail: data.reasonDetail,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };
    
    set({ refunds: [newRefund, ...refunds] });
    
    // 广播给管理端
    const syncService = getHotelRefundSync();
    syncService.broadcast({
      type: 'REFUND_REQUESTED',
      refund: newRefund,
    } as any);
    
    addAuditLog({
      action: '申请退款',
      detail: `订单 ${orderId} 申请退款 ¥${data.amount}，原因：${data.reasonDetail}`,
      level: 'warning',
    });
  },
  
  updateRefund: (refundId, updates) => {
    set((state) => ({
      refunds: state.refunds.map((refund) =>
        refund.id === refundId
          ? { ...refund, ...updates }
          : refund
      ),
    }));
  },
  
  syncRefundFromAdmin: (refund) => {
    const { refunds, updateOrderStatus, addAuditLog } = get();
    
    // 更新或添加退款记录
    const existingIndex = refunds.findIndex(r => r.id === refund.id);
    let updatedRefunds;
    if (existingIndex >= 0) {
      updatedRefunds = refunds.map((r, i) => i === existingIndex ? refund : r);
    } else {
      updatedRefunds = [refund, ...refunds];
    }
    set({ refunds: updatedRefunds });
    
    // 如果退款已完成，同步更新订单状态
    if (refund.status === 'completed' && refund.orderId) {
      updateOrderStatus(refund.orderId, 'refunded');
      addAuditLog({
        action: '退款完成',
        detail: `订单 ${refund.orderId} 退款 ¥${refund.amount} 已完成`,
        level: 'warning',
      });
    }
  },
}));
