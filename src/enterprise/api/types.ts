/**
 * API类型定义
 * 
 * 设计原则：
 * 1. 所有API返回统一的ApiResponse格式
 * 2. 支持分页、筛选、排序
 * 3. 错误处理统一
 * 4. 类型安全
 */

// 通用API响应格式
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  timestamp: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 排序参数
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// ==================== 酒店相关类型 ====================

export interface Hotel {
  id: string;
  name: string;
  brand: string;
  city: string;
  region?: string;
  address: string;
  district?: string;
  starRating: number;
  roomCount: number;
  status: 'active' | 'inactive' | 'suspended';
  managerName: string;
  managerPhone: string;
  contactPhone?: string;
  pmsSystem?: string;
  pmsConnected: boolean;
  pmsHotelId?: string;
  lastSyncAt?: string;
  createdAt: string;
  metrics?: HotelMetrics;
  permissions?: string[];
  realtimeStatus?: 'online' | 'offline' | 'busy';
  // 扩展字段用于数据洞察
  revenue?: number;
  orders?: number;
  occupancyRate?: number;
  adr?: number;
  revpar?: number;
  healthStatus?: 'healthy' | 'warning' | 'critical';
  // AI相关字段
  aiAdoptionRate?: number;
  aiPricingLift?: number;
  aiContentLift?: number;
  aiServiceLift?: number;
  laborHoursSaved?: number;
  contentCount?: number;
}

export interface HotelMetrics {
  hotelId: string;
  date: string;
  revenue: number;
  todayRevenue?: number;
  orders: number;
  todayOrders?: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  availableRooms: number;
  soldRooms: number;
}

export interface HotelDetail extends Hotel {
  roomTypes: RoomType[];
  channels: Channel[];
  accounts: Account[];
}

// ==================== 房型相关类型 ====================

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  code: string;
  basePrice: number;
  floorPrice: number;
  ceilingPrice: number;
  roomCount: number;
  area?: number;
  bedType?: string;
  maxGuests: number;
  amenities: string[];
  images: string[];
  status: 'active' | 'inactive';
}

// ==================== 定价相关类型 ====================

export interface PricingInfo {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  currentPrice: number;
  suggestedPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  currency: string;
  lastUpdated: string;
  updatedBy?: string;
}

export interface PricingCalendar {
  roomTypeId: string;
  date: string;
  price: number;
  originalPrice?: number;
  status: 'available' | 'sold_out' | 'closed';
  minStay?: number;
  maxStay?: number;
  restrictions?: string[];
}

export interface UpdatePricingRequest {
  hotelId: string;
  roomTypeId: string;
  date: string;
  price: number;
  reason?: string;
}

export interface BatchUpdatePricingRequest {
  hotelIds: string[];
  roomTypeIds?: string[];
  dateRange: { start: string; end: string };
  adjustment: {
    type: 'fixed' | 'percentage' | 'ai_suggest';
    value: number;
  };
  reason: string;
}

export interface BatchUpdatePricingResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalHotels: number;
  processedHotels: number;
  failedHotels: number;
  results: {
    hotelId: string;
    success: boolean;
    message?: string;
  }[];
}

// ==================== 库存相关类型 ====================

export interface InventoryInfo {
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  totalRooms: number;
  availableRooms: number;
  soldRooms: number;
  reservedRooms: number;
  blockedRooms: number;
  status: 'available' | 'limited' | 'sold_out';
}

// 库存日历数据（用于前端展示）
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

export interface UpdateInventoryRequest {
  hotelId: string;
  roomTypeId: string;
  date: string;
  availableRooms: number;
  reason?: string;
}

export interface BatchUpdateInventoryRequest {
  hotelIds: string[];
  roomTypeIds?: string[];
  dateRange: { start: string; end: string };
  adjustment: {
    type: 'set' | 'add' | 'close' | 'open';
    value: number;
  };
  reason: string;
}

// ==================== 订单相关类型 ====================

export type OrderStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'refunded';
export type OrderSource = 'direct' | 'ota' | 'wechat' | 'phone' | 'walk_in' | 'corporate';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export interface Order {
  id: string;
  hotelId: string;
  orderNo: string;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  roomTypeId: string;
  roomTypeName: string;
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomCount: number;
  guestCount: number;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  remarks?: string;
  otaOrderNo?: string;
  channelName?: string;
  cancelReason?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface OrderDetail extends Order {
  roomType: RoomType;
  hotel: Hotel;
  timeline: OrderTimeline[];
  payments: Payment[];
}

export interface OrderTimeline {
  id: string;
  orderId: string;
  action: string;
  description?: string;
  operatorId?: string;
  operatorName?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  paidAt?: string;
}

export interface UpdateOrderRequest {
  orderId: string;
  status?: OrderStatus;
  roomNumber?: string;
  remarks?: string;
}

// ==================== 内容相关类型 ====================

export interface ContentItem {
  id: string;
  hotelId: string;
  type: 'image' | 'video' | 'text' | 'promotion';
  title: string;
  content: string;
  images: string[];
  status: 'draft' | 'published' | 'archived';
  platforms: string[];
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: ContentMetrics;
}

export interface ContentMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  conversions: number;
}

// ==================== 渠道相关类型 ====================

export interface Channel {
  id: string;
  name: string;
  code: string;
  type: 'ota' | 'direct' | 'corporate';
  status: 'active' | 'inactive';
  commissionRate: number;
  settlementCycle: string;
  contractEndDate?: string;
  connected: boolean;
}

export interface ChannelPerformance {
  channelId: string;
  channelName: string;
  date: string;
  revenue: number;
  orders: number;
  roomNights: number;
  commission: number;
  conversionRate: number;
  avgOrderValue: number;
}

// ==================== 账号相关类型 ====================

export interface Account {
  id: string;
  hotelId: string;  // 'unassigned' 表示未分配
  platform: string;
  username: string;
  status: 'active' | 'inactive' | 'suspended';
  loginMethod: 'password' | 'qr' | 'sso';
  lastLoginAt?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

// ==================== AI相关类型 ====================

export interface AIInsight {
  id: string;
  hotelId: string;
  type: 'pricing' | 'demand' | 'competitor' | 'inventory';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  channel: string;           // 渠道ID
  channelName: string;       // 渠道名称
  hotelId: string;           // 酒店ID
  hotelName: string;         // 酒店名称
  guestId: string;           // 客户ID
  guestName: string;         // 客户姓名
  guestAvatar?: string;      // 客户头像
  content: string;           // 消息内容
  timestamp: Date;           // 消息时间
  status: 'unread' | 'read' | 'replied' | 'ai_handled' | 'human_handled';
  priority: 'high' | 'medium' | 'low';
  hasOrder: boolean;         // 是否有订单
  orderId?: string;          // 订单ID
  aiSuggestion?: string;     // AI建议
  assignedTo?: string;       // 分配给
}

// ==================== 工单相关类型 ====================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TicketType = 'ota_issue' | 'guest_complaint' | 'system_bug' | 'other';

export interface Ticket {
  id: string;
  hotelId: string;
  orderId?: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  comments: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ==================== 仪表盘相关类型 ====================

export interface DashboardSummary {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  availableRooms: number;
  soldRooms: number;
  comparedToYesterday: {
    revenue: number;
    orders: number;
    occupancyRate: number;
  };
}

export interface DashboardTrend {
  date: string;
  revenue: number;
  orders: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

// ==================== 批量操作相关类型 ====================

export interface BatchJob {
  id: string;
  type: 'pricing' | 'inventory' | 'content' | 'account';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  results: BatchJobResult[];
}

export interface BatchJobResult {
  itemId: string;
  success: boolean;
  message?: string;
  data?: any;
}

// ==================== 审计日志相关类型 ====================

export type AuditOperationType = 'create' | 'update' | 'delete' | 'view' | 'export' | 'login';
export type AuditResourceType = 'price' | 'inventory' | 'order' | 'account' | 'content' | 'settings';
export type AuditRiskLevel = 'low' | 'medium' | 'high';

export interface AuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  operation: AuditOperationType;
  resource: AuditResourceType;
  resourceId: string;
  resourceName?: string;
  hotelId: string;
  hotelName: string;
  details: string;
  ip: string;
  userAgent?: string;
  riskLevel: AuditRiskLevel;
  status: 'success' | 'failed';
}

export interface GetAuditLogsParams extends PaginationParams {
  hotelIds?: string[];
  operatorIds?: string[];
  operations?: AuditOperationType[];
  resources?: AuditResourceType[];
  resourceTypes?: AuditResourceType[];
  startDate?: string;
  endDate?: string;
  riskLevels?: AuditRiskLevel[];
  keyword?: string;
}

export interface AuditStats {
  total: number;
  totalRecords: number;
  todayRecords: number;
  todayCount: number;
  highRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  success: number;
  failed: number;
  operationCounts: Record<AuditOperationType, number>;
}

export interface ExportAuditLogsParams {
  hotelIds?: string[];
  startDate?: string;
  endDate?: string;
  format: 'csv' | 'excel';
}

// ==================== 筛选参数 ====================

export interface FilterParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: any;
}

// ==================== 批量任务相关类型 ====================

export interface BatchJobResult {
  jobId: string;
  hotelId: string;
  hotelName: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  details?: Record<string, any>;
}

// ==================== 合规相关类型 ====================

export interface PlatformRule {
  id: string;
  platform: string;
  category: string;
  title: string;
  description: string;
  status: 'active' | 'inactive';
  effectiveDate: string;
  lastUpdated: string;
}

export interface LegalCompliance {
  id: string;
  law: string;
  article: string;
  title: string;
  description: string;
  category: string;
  applicableTo: string[];
  lastUpdated: string;
}

export interface RiskEvent {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  type: string;
  level: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'resolved';
  detectedAt: string;
  resolvedAt?: string;
  updatedAt?: string;
  suggestion?: string;
}

// ==================== 风险预警相关类型 ====================

export interface RiskPrediction {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  type: string;
  level: 'high' | 'medium' | 'low';
  status: 'pending' | 'confirmed' | 'dismissed';
  predictedAt: string;
  expectedAt?: string;
  confidence: number;
}

export interface RiskKnowledge {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  solution?: string;
  relatedCases?: number;
  createdAt: string;
}

export interface RiskAlert {
  id: string;
  hotelId: string;
  type: string;
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  detectedAt: string;
  suggestion?: string;
  relatedEventId?: string;
}

// 通知渠道类型
export type NotificationChannel = 'app' | 'sms' | 'email' | 'dingtalk' | 'phone';

// 风险等级类型
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

// 升级规则
export interface EscalationRule {
  level: number;
  afterMinutes: number;
  to: string[];
  message: string;
  channels: NotificationChannel[];
}

// 通知规则配置
export interface NotificationRule {
  riskLevel: RiskLevel;
  channels: NotificationChannel[];
  immediate: boolean;
  delay: number;
  repeatInterval?: number;
  escalationRules: EscalationRule[];
}

// 通知规则配置请求
export interface SaveNotificationRulesRequest {
  rules: Record<RiskLevel, NotificationRule>;
}

// ==================== AI客服相关类型 ====================

export type HandoffStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type HandoffReason = 'ai_confidence_low' | 'user_request' | 'complaint' | 'complex_issue' | 'vip_customer';

export interface HandoffRequest {
  id: string;
  guestName: string;
  guestPhone?: string;
  hotelId: string;
  hotelName: string;
  channel: string;
  reason: HandoffReason;
  status: HandoffStatus;
  originalMessage: string;
  aiSuggestion?: string;
  assignedTo?: string;
  assignedToName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  slaDeadline: Date;
  tags: string[];
}

export interface CollabSession {
  id: string;
  guestName: string;
  guestPhone?: string;
  hotelId: string;
  hotelName: string;
  channel: string;
  messages: any[];
  aiAccuracy: number;
  savedTime: number;
  status: 'active' | 'completed' | 'pending';
  pendingSuggestions: number;
  lastActivity: Date;
}

export interface SLAStats {
  totalRequests: number;
  slaComplianceRate: number;
  withinSLA: number;
  breachedSLA: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

export interface AIEffectiveness {
  totalSuggestions: number;
  acceptedSuggestions: number;
  editedSuggestions: number;
  rejectedSuggestions: number;
  acceptRate: number;
  avgConfidence: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  handledRequests: number;
  avgResponseTime: number;
  satisfaction: number;
  aiAdoptionRate: number;
  onlineHours: number;
}

export interface ChannelStats {
  channel: string;
  totalMessages: number;
  aiHandled: number;
  humanHandled: number;
  avgResponseTime: number;
  conversionRate: number;
}

export interface TimeSeriesData {
  date: string;
  totalMessages: number;
  aiHandled: number;
  humanHandled: number;
  slaBreaches: number;
}

// ==================== 话术库相关类型 ====================

export interface Script {
  id: string;
  category: string;
  scene: string;
  title: string;
  content: string;
  tags: string[];
  usageCount?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ScriptCategory {
  id: string;
  name: string;
  description?: string;
  scriptCount: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== 定价策略相关类型 ====================

export interface PricingStrategy {
  id: string;
  name: string;
  type: 'holiday' | 'event' | 'competitor' | 'inventory';
  description: string;
  status: 'active' | 'inactive' | 'expired';
  conditions: {
    dateRange?: { start: string; end: string };
    occupancyThreshold?: number;
    competitorPriceDiff?: number;
  };
  actions: {
    adjustmentType: 'fixed' | 'percentage';
    adjustmentValue: number;
    minPrice?: number;
    maxPrice?: number;
  };
  affectedHotels: string[];
  createdAt: string;
  updatedAt: string;
}

export type SuggestionType = 'holiday' | 'event' | 'daily' | 'competitor_response';
export type SuggestionStatus = 'draft' | 'pending' | 'hotel_confirmed' | 'hotel_rejected' | 'hotel_modified' | 'executed' | 'expired';
export type EngagementLevel = 'hands_off' | 'notify' | 'confirm' | 'negotiate' | 'diy';

export interface PricingSuggestion {
  id: string;
  name: string;
  type: SuggestionType;
  hotelId: string;
  hotelName: string;
  engagementLevel: EngagementLevel;
  
  // 时间
  startDate: string;
  endDate: string;
  createdAt: string;
  
  // 定价规则
  rules: {
    basePrice: number;
    suggestedPrice: number;
    increasePercent: number;
    maxPremium: number;
    reasoning: string;
  };
  
  // 预期效果
  expectedImpact: {
    revenueIncrease: number;
    occupancyImpact: number;
    confidence: number;
  };
  
  // 状态
  status: SuggestionStatus;
  
  // 酒店反馈（如果有）
  hotelFeedback?: {
    action: 'confirm' | 'reject' | 'modify';
    message?: string;
    modifiedRules?: Partial<PricingSuggestion['rules']>;
    respondedAt?: string;
  };
  
  // 执行记录
  execution?: {
    executedAt: string;
    executedBy: 'ai' | 'hotel_manager' | 'huamei_operator';
    actualImpact?: number;
  };
}

// ==================== 私域运营相关类型 ====================

export interface PrivateContent {
  id: string;
  hotelId: string;
  platform: string;
  type: string;
  title: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    touches?: number;        // 触达客户数（私域）
    replies?: number;        // 回复数（私域）
    conversions?: number;    // 成交数（私域）
  };
  performance?: {
    touches?: number;        // 触达客户数
    replies?: number;        // 回复数
    conversions?: number;    // 成交数
    privateConversions?: number; // 私域成交数
  };
  // 群运营脚本
  groupScript?: {
    title: string;
    content: string;
    atAll: boolean;
    type: 'welcome' | 'flashsale' | 'interaction' | 'announcement';
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
    scenes: Array<{
      id: number;
      startTime: number;
      endTime: number;
      duration: number;
      shot: string;
      subtitle: string;
      bgm?: string;
      tips?: string;
    }>;
    materials: Array<{
      type: 'photo' | 'video' | 'screenshot';
      description: string;
      count: number;
      tips: string;
    }>;
    bgmRecommendation: string;
    shootingTips: string[];
    editingTips: string[];
  };
}

export interface OperationTask {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt?: string;
}

export interface FollowUpRecord {
  id: string;
  hotelId: string;
  customerId: string;
  customerName: string;
  type: string;
  content: string;
  result?: string;
  nextFollowUpDate?: string;
  createdBy: string;
  createdAt: string;
}

// ==================== 微信群管理相关类型 ====================

export interface WechatGroup {
  id: string;
  hotelId: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  ownerName: string;
  status: 'active' | 'inactive' | 'full';
  createdAt: string;
  lastActivityAt: string;
  tags: string[];
  description?: string;
  qrCodeUrl?: string;
  dailyMessages?: number;
  conversionRate?: number;
}

// ==================== 视频号相关类型 ====================

export interface VideoChannel {
  id: string;
  hotelId: string;
  name: string;
  followerCount: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  monthlyNewVideos: number;
  monthlyViews: number;
  status: 'active' | 'inactive';
  createdAt: string;
  recentVideos: VideoPost[];
}

export interface VideoPost {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
  status: 'published' | 'draft' | 'reviewing';
}

// ==================== 事件情报相关类型 ====================

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  impact: 'high' | 'medium' | 'low';
  status: 'upcoming' | 'active' | 'ended';
  startDate: string;
  endDate: string;
  affectedRegion?: string;
  affectedHotels?: string[];
}

export interface EventIntel extends MarketEvent {
  recommendedActions?: string[];
}

export interface CompetitorIntel {
  id: string;
  name: string;
  tier: 'high' | 'medium' | 'low';
  competitorOf?: string;
  priceRange?: { min: number; max: number };
  rating?: number;
  distance?: number;
}

// ==================== 非标订单相关类型 ====================

export type NonStandardChannel = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
export type NonStandardOrderStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PMSStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface NonStandardOrder {
  id: string;
  orderNo: string;
  channel: NonStandardChannel;
  channelOrderId: string;
  hotelId: string;
  hotelName: string;
  roomTypeId?: string;
  roomTypeName: string;
  roomCount: number;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  channelFee: number;
  platformFee: number;
  netAmount: number;
  status: NonStandardOrderStatus;
  pmsStatus: PMSStatus;
  pmsOrderId?: string;
  createdAt: string;
  syncedAt?: string;
  guestNotes?: string;
  operatorNotes?: string;
}
