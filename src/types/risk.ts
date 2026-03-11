/**
 * Shadow-Bees V52 - 风控系统类型定义
 * 内容安全、账号风控、合规检查
 */

// ============ 敏感词相关 ============

export type Platform = 'xiaohongshu' | 'xianyu' | 'wechat';

export interface SensitiveWord {
  id: string;
  word: string;           // 敏感词
  replacement: string;    // 建议替换为
  platform: Platform;     // 适用平台
  severity: 'high' | 'medium' | 'low';  // 严重程度
  category: 'contact' | 'price' | 'absolute' | 'others';  // 类别
  isActive: boolean;
  createdAt: string;
}

export interface SensitiveWordCheckResult {
  hasViolation: boolean;
  violations: {
    word: string;
    position: [number, number];  // 起始位置
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
  }[];
  processedContent: string;  // 自动处理后的内容
}

// ============ 内容相似度 ============

export interface SimilarityCheckResult {
  similarity: number;  // 0-1
  threshold: number;   // 阈值，默认0.8
  isViolation: boolean;
  similarContents: {
    contentId: string;
    title: string;
    similarity: number;
    createdAt: string;
  }[];
}

// ============ 广告法合规 ============

export interface AdLawCheckResult {
  score: number;  // 0-100 合规分数
  violations: {
    rule: string;
    violation: string;
    suggestion: string;
  }[];
  compliant: {
    passed: number;
    total: number;
  };
  isCompliant: boolean;
}

// ============ 价格合规 ============

export interface PriceComplianceResult {
  isValid: boolean;
  minPrice: number;      // 最低允许价格
  maxPrice: number;      // 最高建议价格
  currentPrice: number;
  basePrice: number;     // PMS底价
  suggestion: string;
  isTooLow?: boolean;
  isTooHigh?: boolean;
}

// ============ 发布频率控制 ============

export interface PublishRateLimit {
  platform: Platform;
  dailyQuota: number;      // 每日上限
  remainingQuota: number;  // 剩余配额
  nextAvailableTime?: string;  // 下次可发布时间
  canPublish: boolean;
}

export interface PublishSchedule {
  contentId: string;
  suggestedTime: string;
  reason: string;
  queuePosition: number;
}

// ============ 账号健康度 ============

export interface AccountHealth {
  platform: Platform;
  accountId: string;
  hotelId?: string;
  score: number;           // 0-100
  status: 'healthy' | 'warning' | 'danger';
  recentViolations: number;
  lastViolationAt?: string;
  publishSuccessRate: number;  // 发布成功率
  dailyPublishCount: number;
  deviceId?: string;
  ip?: string;
}

// ============ 风控规则配置 ============

export interface RiskRuleConfig {
  id: string;
  name: string;
  description: string;
  
  // 敏感词检测
  sensitiveWordEnabled: boolean;
  autoReplace: boolean;  // 自动替换敏感词
  
  // 相似度检测
  similarityCheckEnabled: boolean;
  similarityThreshold: number;  // 默认0.8
  
  // 广告法检查
  adLawCheckEnabled: boolean;
  autoCorrect: boolean;  // 自动修正违规内容
  
  // 价格合规
  priceCheckEnabled: boolean;
  minDiscount: number;   // 最低折扣，默认0.7
  maxPremium: number;    // 最高溢价，默认1.5
  
  // 发布频率
  rateLimitEnabled: boolean;
  dailyLimits: Record<Platform, number>;
  intervals: Record<Platform, number>;
  
  updatedAt: string;
  updatedBy: string;
}

// ============ 人工审核 Workflow ============

export type ReviewStatus = 
  | 'draft'           // 草稿
  | 'ai_checking'     // AI检测中
  | 'ai_rejected'     // AI检测不通过
  | 'pending_review'  // 待人工审核
  | 'approved'        // 已通过
  | 'rejected'        // 已拒绝
  | 'published';      // 已发布

export interface ReviewWorkflow {
  contentId: string;
  status: ReviewStatus;
  
  // AI检测结果
  aiCheckResults: {
    sensitiveWord?: SensitiveWordCheckResult;
    similarity?: SimilarityCheckResult;
    adLaw?: AdLawCheckResult;
    price?: PriceComplianceResult;
    checkedAt: string;
  };
  
  // 人工审核
  manualReview?: {
    reviewerId: string;
    reviewerName: string;
    result: 'approve' | 'reject';
    comment?: string;
    reviewedAt: string;
  };
  
  // 快速通道
  fastTrack: boolean;
  fastTrackReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============ 风控预警 ============

export interface RiskAlert {
  id: string;
  type: 'frequency_limit' | 'similarity_high' | 'account_at_risk' | 'price_violation' | 'content_violation';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  platform?: Platform;
  hotelId?: string;
  hotelName?: string;
  contentId?: string;
  suggestedAction: string;
  isRead: boolean;
  createdAt: string;
}

// ============ 账号矩阵 ============

export interface DeviceAccount {
  deviceId: string;
  deviceName: string;
  ip: string;
  location?: string;
  status: 'active' | 'suspended' | 'banned';
  
  accounts: {
    xiaohongshu?: PlatformAccount;
    xianyu?: PlatformAccount;
    wechat?: PlatformAccount;
  };
  
  hotelId?: string;
  hotelName?: string;
  lastActiveAt?: string;
}

export interface PlatformAccount {
  accountId: string;
  accountName: string;
  platform: Platform;
  status: 'healthy' | 'warning' | 'danger' | 'banned';
  followers?: number;
  dailyPublishCount: number;
  lastPublishAt?: string;
  cookies?: string;  // 加密存储
  notes?: string;
}

// ============ 智能排期 ============

export interface SmartSchedule {
  time: Date;
  score: number;      // 推荐度 0-100
  reason: string;     // 推荐理由
  isToday: boolean;
}

// ============ 平台健康度 ============

export interface PlatformHealth {
  platform: Platform;
  platformName: string;
  score: number;
  status: 'healthy' | 'warning' | 'danger';
  violations: number;
  remainingQuota: number;
}

// ============ 风控检查 ============

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskCheckParams {
  content: string;
  platform: Platform;
  hotelId: string;
  price?: number;
  basePrice?: number;
}

export interface RiskCheckResult {
  riskLevel: RiskLevel;
  canPublish: boolean;
  checks: {
    sensitiveWords: SensitiveWordCheckResult;
    similarity: SimilarityCheckResult;
    adLaw: AdLawCheckResult;
    price: PriceComplianceResult | null;
    rateLimit: PublishRateLimit | null;
  };
  suggestions: string[];
}

// ============ 风控统计数据 ============

export interface RiskStats {
  totalHotels: number;
  totalAccounts: number;
  
  healthDistribution: {
    healthy: number;
    warning: number;
    danger: number;
  };
  
  todayStats: {
    published: number;
    rejected: number;
    pendingReview: number;
    alerts: number;
  };
  
  platformStats: Record<Platform, {
    totalAccounts: number;
    activeAccounts: number;
    todayPublished: number;
    violations: number;
  }>;
}
