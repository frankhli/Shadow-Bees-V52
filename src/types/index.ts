// ============================================
// Shadow-Bees V52 - TypeScript 类型定义
// ============================================

export type ThemeType = 'cyan' | 'violet' | 'amber';
export type PricingMode = 'scalper' | 'dynamic' | 'clearance';
export type TimeMode = 'realtime' | 'history' | 'sandbox';
export type Platform = 'xianyu' | 'xiaohongshu' | 'wechat';
export type UserRole = 'owner' | 'manager' | 'staff';

// 订单状态流转：已成交 → 待入住 → 已入住 → 已离店 → 可开票
export type OrderStatus = 
  | 'paid'            // 已成交（已付款）
  | 'pending'         // 待确认
  | 'checked_in'      // 已入住
  | 'checked_out'     // 已离店
  | 'invoiced'        // 已开票
  | 'refunded'        // 已退款
  | 'refund_pending'  // 退款待处理
  | 'cancelled';      // 已取消

// 酒店
export interface Hotel {
  id: string;
  name: string;
  type: 'city' | 'suburb' | 'tourist';
  tier: 'economy' | 'comfort' | 'premium'; // 酒店档次
  theme: ThemeType;
  location: {
    city: string;
    address: string;
    coordinates: { lat: number; lng: number };
    distanceToEvent: number;
    monitoringRadius: number;
  };
  roomTypes: RoomType[];
  defaultMode: PricingMode;
  eventTypes: string[];
  flexibleInventoryRate: number;
  priceRange: {
    normal: [number, number];
    peak: [number, number];
  };
  scriptStrategy: string;
}

export interface RoomType {
  id: string;
  name: string;
  floorPrice: number;      // 底价（手动维护，需权限）
  ceilingPrice: number;    // 天花板价
  currentPrice: number;    // 当前售价（AI建议应用到这里）
  totalInventory: number;
  otaAllocation: number;
  flexibleAllocation: number;
}

// 竞品
export interface CompetitorRoomType {
  id: string;
  name: string;
  price: number;
  inventory: number;
  status: 'soldout' | 'tight' | 'normal' | 'available';
}

export interface Competitor {
  id: string;
  name: string;
  brand: string;
  logoUrl: string;
  distance: number;
  rating: number;
  currentPrice: number;  // 默认显示的价格（通常是标准房）
  inventory: number;
  status: 'soldout' | 'tight' | 'normal' | 'available';
  platform: string;
  roomTypes?: CompetitorRoomType[];  // 各房型价格（可选，用于房型映射）
  
  // ===== 未来预测数据（7/14/30天） =====
  futurePrices?: Record<string, {  // '2024-02-13' -> { price, inventory, status }
    price: number;
    inventory: number;
    status: 'soldout' | 'tight' | 'normal' | 'available';
  }>;
}

// 事件
export interface Event {
  id: string;
  name: string;
  type: string;
  intensity: 'low' | 'medium' | 'high';
  date: string;
  description: string;
}

// 定价
export interface Pricing {
  basePrice: number;
  roomBasePrices: {
    [roomTypeId: string]: number;
  };
  competitorAvg: number;
  adjustments: {
    location: number;
    quality: number;
  };
  platformPrices: Record<Platform, {
    price: number;
    coefficient: number;
    riskDeposit: number;
  }>;
  floorPrice: number;
  ceilingPrice: number;
  mode: PricingMode;
  deviation: number;
}

// 统一库存池 - OTA和非标渠道共用
export interface Inventory {
  // 总库存（所有房型）
  total: number;
  sold: number;
  available: number;
  
  // OTA渠道
  otaPool: {
    total: number;
    sold: number;
    available: number;
  };
  
  // 非标渠道（灵活库存）
  flexiblePool: {
    total: number;
    sold: number;
    available: number;
    preoccupied: number;
    // 酒店设置的最大投放数量（可动态调整）
    maxAllocation: number;
    platforms: Record<Platform, {
      allocated: number;
      sold: number;
      available: number;
    }>;
  };
  
  // 各房型库存
  byRoomType: Record<string, {
    total: number;
    sold: number;
    available: number;
    // OTA渠道
    otaAllocation: number;  // OTA分配量
    otaSold: number;
    otaAvailable: number;
    // 非标渠道（灵活库存）
    flexibleAllocation: number;  // 灵活池总量
    flexibleSold: number;
    flexibleAvailable: number;
    // 各房型非标渠道投放上限（可调整，不超过flexibleAllocation）
    maxAllocation: number;
  }>;
  
  // ===== 全年库存日历（365天） =====
  // 记录格式: '2024-02-15' -> DailyInventory
  calendar?: Record<string, DailyInventory>;
}

// 单日库存详情
export interface DailyInventory {
  date: string;           // 日期 (YYYY-MM-DD)
  
  // 各房型当日库存
  byRoomType: Record<string, {
    total: number;           // 物理总房数
    available: number;       // 可售房数
    
    // 占用明细
    occupied: {
      checkedIn: number;     // 在住（昨晚入住，今天还在）
      arriving: number;      // 今日预抵
      dayUse: number;        // 钟点房
      maintenance: number;   // 维修房
    };
    
    // 渠道配额（按日可调）
    channelAllocation: {
      ota: number;           // OTA渠道可售配额
      flexible: number;      // 灵活渠道可售配额
    };
    
    // 当日动态定价
    dynamicPrice: {
      basePrice: number;     // 基础价格
      suggestedPrice: number; // 建议价格（基于库存紧张度）
      priceFactor: number;   // 价格系数（1.0=正常，>1.0=溢价）
    };
  }>;
  
  // 当日汇总
  summary: {
    totalRooms: number;      // 总房数
    totalAvailable: number;  // 总可售
    occupancyRate: number;   // 预计入住率
    inventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout'; // 库存状态
  };
}

// 交易/订单 - 带完整状态流转
export interface Transaction {
  id: string;
  hotelId: string;
  roomType: string;
  platform: Platform;
  price: number;
  timestamp: string;
  orderNo: string;
  
  // 关联来源：这个交易来自哪个发布内容
  sourceContentId?: string;
  
  // 订单状态
  status: OrderStatus;
  checkInDate?: string;
  checkOutDate?: string;
  stayNights?: number;  // 连住晚数
  guestName?: string;
  guestPhone?: string;  // 客人手机号
  
  // 财务信息（酒店端展示用，管理端不同步）
  financials: {
    gross: number;      // 成交金额
    serviceFee: number; // 平台服务费
    net: number;        // 酒店实收
  };
  
  // 退款信息
  refund?: {
    amount: number;
    reason: string;
    timestamp: string;
  };
  
  // 更详细的退款信息（新结构）
  refundInfo?: {
    amount: number;
    reason: string;
    timestamp: string;
    partial: boolean;  // 是否部分退款
  };
  
  // 退款申请原因（用户申请退款时的原因）
  refundReason?: string;
  // 退款拒绝原因（酒店拒绝退款时的原因）
  refundRejectReason?: string;
  
  // 实时模拟标记：标识该订单是否由实时推演模式生成
  isRealtimeGenerated?: boolean;
  
  // 开票信息
  invoice?: {
    issued: boolean;
    amount: number;
    timestamp?: string;
  };
}

// 视频分镜
export interface VideoScene {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  shot: string;
  subtitle: string;
  bgm?: string;
  tips?: string;
}

// 拍摄素材需求
export interface ShotMaterial {
  type: 'photo' | 'video' | 'screenshot';
  description: string;
  count: number;
  tips: string;
}

// 完整的视频脚本
export interface VideoScript {
  totalDuration: number;
  scenes: VideoScene[];
  materials: ShotMaterial[];
  bgmRecommendation: string;
  shootingTips: string[];
  editingTips: string[];
}

// 群运营脚本
export interface GroupScript {
  title: string;
  content: string;
  atAll: boolean;
  type: 'welcome' | 'announcement' | 'flashsale' | 'interaction' | 'daily';
}

// 私聊话术
export interface PrivateChatScript {
  title: string;
  content: string;
  type: 'welcome' | 'booking' | 'reminder' | 'followup' | 'rebooking';
}

// 内容发布
export interface ContentItem {
  id: string;
  platform: Platform;
  title: string;
  content: string;
  price: number;
  status: 'draft' | 'pending_review' | 'published' | 'paused' | 'expired';
  performance: {
    impressions: number;  // 公域：曝光量
    clicks: number;       // 公域：点击量
    inquiries: number;    // 公域：咨询数
    conversions: number;  // 公域：成交数
    // === 私域专属指标（新增）===
    touches?: number;           // 私域：触达客户数
    replies?: number;           // 私域：回复数
    privateConversions?: number; // 私域：私域成交数
  };
  createdAt: string;
  publishedAt?: string;
  // 私域内容扩展字段
  contentType?: 'image' | 'video' | 'text';
  subtype?: 'moments' | 'group' | 'private' | 'channels';
  videoScript?: VideoScript;
  groupScript?: GroupScript;
  privateScript?: PrivateChatScript;
  images?: string[];
  // === 新增：发布方式标记 ===
  publishMethod?: 'auto' | 'manual'; // auto: ContentFactory直接发布, manual: PrivateDomain手动发布
}

// 用户
export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: {
    canChangeFloorPrice: boolean;
    canChangePrice: boolean;
    canSwitchHotel: boolean;
    canSwitchTimeMode: boolean;
    canInitHotel: boolean;
    canApprove: boolean;
    canViewAudit: boolean;
    canViewFinance: boolean;
  };
}

// 预警
export interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  timestamp: string;
  requiresAction: boolean;
}

// 审计日志
export interface AuditLog {
  id: string;
  time: string;
  user: string;
  userRole: UserRole;
  action: string;
  detail: string;
  level: 'critical' | 'warning' | 'normal';
  metadata?: Record<string, any>;
}

// ============================================
// 工单系统类型定义
// ============================================

export type TicketType = 'tech' | 'business' | 'consult';
export type TicketStatus = 'open' | 'processing' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// 工单消息
export interface TicketMessage {
  id: string;
  sender: 'hotel' | 'admin';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

// 工单
export interface Ticket {
  id: string;
  hotelId: string;           // 关联酒店
  hotelName: string;         // 冗余存储酒店名称
  
  // 工单内容
  title: string;
  description: string;
  type: TicketType;          // 类型：技术/业务/咨询
  tags: string[];            // 标签
  
  // 状态
  status: TicketStatus;
  priority: TicketPriority;
  
  // 对话记录
  messages: TicketMessage[];
  
  // 处理人
  assignedTo?: string;       // 分配给哪位运营
  assignedToName?: string;
  
  // 时间
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  
  // 评价（解决后）
  rating?: number;           // 1-5星 整体满意度
  responseSpeed?: 'fast' | 'normal' | 'slow';  // 响应速度
  resolutionEffect?: 'full' | 'partial' | 'none';  // 解决效果
  ratingTags?: string[];     // 评价标签
  feedback?: string;         // 文字反馈
  
  // 催促（催单）
  urgentCount?: number;      // 催促次数
  lastUrgentAt?: string;     // 最后催促时间
  
  // 已读回执
  readByAdminAt?: string;    // 运营首次查看时间
  lastReadAt?: string;       // 最后查看时间
  
  // 预计响应时间（SLA）
  expectedResponseAt?: string;  // 预计响应时间
  slaDeadline?: string;      // SLA截止时间（默认24h）
  
  // 附件
  attachments?: {            // 工单附件
    id: string;
    name: string;
    url: string;
    type: 'image' | 'document' | 'other';
    uploadedAt: string;
  }[];
  
  // 客户类型与来源
  source: 'hotel' | 'admin' | 'group' | 'manual'; // 工单来源：酒店/管理端/集团/手动创建
  customerType?: 'single' | 'group';              // 客户类型：单酒店客户/集团客户
  isGroupLevel?: boolean;                         // 是否为集团级工单（影响多个酒店）
  affectedHotelIds?: string[];                     // 受影响的酒店ID列表（集团工单时使用）
  
  // 联系方式（用于客服跟进）
  contactName?: string;      // 联系人姓名
  contactPhone?: string;     // 联系人手机号
  contactEmail?: string;     // 联系人邮箱
}

// ============================================
// 定价建议系统
// ============================================

export type PricingSuggestionType = 'floor_too_high' | 'floor_too_low' | 'price_deviation' | 'break_floor_risk';
export type PricingSuggestionAction = 'pending' | 'accept' | 'ignore' | 'partial' | 'auto_enabled';
export type PricingSuggestionResult = 'pending' | 'success' | 'stale' | 'break_floor' | 'cancelled';

export interface PricingSuggestion {
  id: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  type: PricingSuggestionType;
  
  // AI建议
  aiSuggestedPrice: number;
  aiSuggestedFloorPrice?: number;  // 建议调整后的底价
  currentPrice: number;
  currentFloorPrice: number;
  marketFairPrice?: number;        // 市场可接受价
  competitorAvgPrice?: number;     // 竞品均价
  
  // 酒店响应
  hotelActualPrice?: number;       // 酒店最终定的价（追踪用）
  hotelAction: PricingSuggestionAction;
  hotelActionAt?: string;
  hotelComment?: string;           // 酒店备注
  
  // 成交结果追踪（管理端记录）
  outcome24h?: PricingSuggestionResult;
  outcome48h?: PricingSuggestionResult;
  finalOutcome?: PricingSuggestionResult;
  actualTransactionPrice?: number; // 实际成交价
  timeToSold?: number;             // 定价后到成交的小时数
  revenueAchieved?: number;        // 实际收益
  
  // 关联因素（用于算法优化）
  contentScore?: number;           // 内容质量分
  competitorPriceAtDecision?: number;  // 决策时竞品价格
  eventIntensity?: number;         // 事件热度
  
  createdAt: string;
  updatedAt: string;
}

// 酒店定价画像（管理端分析用）
export interface HotelPricingProfile {
  hotelId: string;
  hotelName: string;
  
  // 配合度
  totalSuggestions: number;        // 总建议数
  acceptedCount: number;           // 接受数
  ignoredCount: number;            // 忽略数
  autoPricingEnabled: boolean;     // 是否开启自动定价
  
  // 效果对比（AI vs 自主）
  aiPricingAvgRevenue: number;     // AI定价平均收益
  selfPricingAvgRevenue: number;   // 自主定价平均收益
  aiPricingStaleRate: number;      // AI定价滞销率
  selfPricingStaleRate: number;    // 自主定价滞销率
  
  // 价格弹性
  priceElasticity: number;         // 弹性系数
  
  // 品牌韧性
  avgPremiumOverCompetitor: number;  // 均价比竞品高多少%
  premiumConversionRate: number;     // 高价时的转化率
  
  // 标签
  pricingStyle: 'auto' | 'expert' | 'stubborn' | 'learning' | 'mixed';
  lastUpdated: string;
}

// ============================================
// 增强的算法模板配置系统（含天气、会员等维度）
// ============================================

// 酒店标签体系（完整版）
export interface HotelTagSystem {
  // 地理位置标签
  location: {
    cityTier?: 'tier1' | 'tier2' | 'tier3' | 'tier4';
    areaType?: 'cbd' | 'scenic' | 'suburb' | 'airport' | 'station';
    distanceToMetro?: number;
    distanceToScenic?: number;
    distanceToCBD?: number;
    viewType?: 'sea' | 'mountain' | 'river' | 'city' | 'none';
  };
  
  // 酒店属性标签
  property: {
    tier?: 'economy' | 'comfort' | 'premium' | 'luxury';
    type?: 'business' | 'resort' | 'boutique' | 'chain' | 'hostel';
    facilities?: string[];
    rating?: number;
    reviewCount?: number;
  };
  
  // 客群标签
  customer: {
    primaryType?: 'business' | 'leisure' | 'student' | 'family';
    priceSensitivity?: 'high' | 'medium' | 'low';
    bookingLeadTime?: 'early' | 'normal' | 'lastminute';
  };
  
  // 会员体系标签
  membership?: {
    loyaltyProgram?: boolean;
    tierLevels?: number;
    repeatCustomerRate?: number;
    avgLtv?: number;
  };
}

// 天气因子配置
export interface WeatherFactorConfig {
  enabled: boolean;
  // 天气类型 → 价格调整系数
  weatherImpacts: {
    sunny: { factor: number; label: string };
    cloudy: { factor: number; label: string };
    rainy: { factor: number; label: string };
    snowy: { factor: number; label: string };
    foggy: { factor: number; label: string };
  };
  // 特殊天气组合
  specialConditions: {
    heavyRainScenic: { factor: number; label: string };
    snowMountain: { factor: number; label: string };
    typhoon: { factor: number; label: string };
    aqiPoor: { threshold: number; factor: number; label: string };
  };
  // 适用酒店类型（景区酒店对天气敏感，商务酒店不敏感）
  applicableHotelTypes: ('resort' | 'scenic' | 'business' | 'chain' | 'all')[];
}

// 会员定价策略
export interface MembershipPricingStrategy {
  enabled: boolean;
  // 会员等级折扣
  tierDiscounts: {
    regular: { discount: number; label: string };
    silver: { discount: number; label: string };
    gold: { discount: number; label: string };
    platinum: { discount: number; label: string };
  };
  // 复购客户优惠
  repeatCustomerBonus: {
    enabled: boolean;
    minPreviousStays: number;
    discount: number;
  };
  // 会员专属价（对外展示高价，会员看到低价）
  memberOnlyPricing: {
    enabled: boolean;
    publicPricePremium: number;
  };
}

// 完整的算法模板配置
export interface PricingAlgorithmTemplate {
  id: string;
  name: string;
  description?: string;
  
  // 适用条件
  applicableTags: Partial<HotelTagSystem>;
  
  // 基础策略
  baseStrategy: 'scalper' | 'dynamic' | 'clearance';
  
  // 事件响应策略
  eventResponse: {
    eventTypes: Record<string, {
      intensityFactor: { low: number; medium: number; high: number };
      timeWindow?: { before: number; during: number; after: number };
      durationFactor?: number;
    }>;
    stackingRule: 'additive' | 'multiplicative' | 'max_only';
    maxStackingFactor: number;
  };
  
  // 库存响应策略
  inventoryResponse: {
    thresholds: Record<string, { priceFactor: number; urgencyMessage?: string }>;
    priceUpdateInterval: number;
  };
  
  // 渠道差异化策略
  platformStrategy: Record<string, {
    baseDiscount: number;
    highlight?: string;
    contentBonus?: number;
    flashSaleEnabled?: boolean;
    priceMatch?: string;
  }>;
  
  // 内容联动策略
  contentLinkage: {
    qualityTiers: Record<string, { score: number; priceBonus: number }>;
    heatFactor: Record<string, number>;
  };
  
  // 天气因子（新增）
  weatherFactor?: WeatherFactorConfig;
  
  // 会员定价（新增）
  membershipStrategy?: MembershipPricingStrategy;
  
  // 学习优化参数
  learningParams: {
    historicalPerformance: {
      avgRevenuePerRoom: number;
      occupancyRate: number;
      priceElasticity: number;
      competitorWinRate: number;
    };
    autoTuneRules: Record<string, string>;
  };
}

// ============================================
// 退款系统类型定义
// ============================================

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
export type RefundReason = 'customer_cancel' | 'hotel_issue' | 'duplicate_order' | 'price_adjustment' | 'other';

// 退款申请
export interface Refund {
  id: string;
  orderId: string;
  hotelId: string;
  hotelName: string;
  customerName: string;
  customerPhone?: string;
  amount: number;           // 退款金額
  reason: RefundReason;     // 退款原因类型
  reasonDetail: string;     // 详细说明
  status: RefundStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  reviewNotes?: string;
  completedAt?: string;
}
