/**
 * 远程配置中心类型定义
 * 管理端 → 酒店端 静默配置下发
 */

// 配置来源类型
export type ConfigSource = 'manual' | 'knowledge';

// 配置包
export interface ConfigPackage {
  id: string;
  version: string;           // 语义化版本：1.0.0
  name: string;              // 配置名称：如"算法模板v2.1"
  description?: string;
  
  // 配置来源
  source?: ConfigSource;
  sourceInfo?: {
    knowledgeCaseIds?: string[];  // 来源知识库案例ID
    generatedAt?: string;         // 生成时间
    generatedBy?: string;         // 生成人
    caseCount?: number;           // 基于多少案例
  };
  
  // 配置内容
  content: {
    // === 定价AI配置 ===
    // 算法模板参数
    templates?: PricingTemplateConfig[];
    
    // 价格系数调整
    priceMultipliers?: {
      baseMarkup: number;      // 基础溢价率
      eventMultiplier: number; // 事件响应倍数
      inventoryMultiplier: number; // 库存响应倍数
    };
    
    // 库存阈值
    inventoryThresholds?: {
      tight: number;    // < 10% 视为紧张
      normal: number;   // < 30% 视为正常
      abundant: number; // >= 30% 视为充足
    };
    
    // 渠道策略
    channelStrategy?: Record<string, {
      markup: number;
      allocation: number;
    }>;
    
    // === 内容AI配置（新增）===
    contentTemplates?: ContentTemplateConfig[];
    
    contentGuidelines?: {
      platform: string;
      style: string;
      bestPractices: string[];
      hashtagStrategy: {
        min: number;
        max: number;
        recommended: string[];
      };
    }[];
    
    // === 客服AI配置（新增）===
    serviceResponses?: ServiceResponseConfig[];
    
    serviceGuidelines?: {
      intent: string;
      priority: number;
      escalationThreshold: number;
    }[];
  };
  
  // 生效范围
  target: {
    type: 'all' | 'specific' | 'gray';
    hotelIds?: string[];      // specific 模式
    grayPercent?: number;     // gray 模式：0-100
  };
  
  // 元数据
  metadata: {
    createdBy: string;
    createdAt: string;
    forceUpdate: boolean;     // 强制更新（立即生效）
    restartRequired: boolean; // 是否需要重启（PricingMode切换）
  };
}

// 定价模板配置（简化版，用于下发）
export interface PricingTemplateConfig {
  id: string;
  name: string;
  baseStrategy: 'scalper' | 'dynamic' | 'clearance';
  applicableTags: {
    location?: string[];
    property?: string[];
    customer?: string[];
  };
  params: {
    markupRange: [number, number];      // 溢价范围 [0.8, 1.5]
    priceElasticity: number;             // 价格弹性系数
    responseSpeed: 'fast' | 'normal' | 'slow'; // 调价响应速度
  };
}

// 酒店端配置状态
export interface HotelConfigState {
  currentVersion: string;
  pendingVersion?: string;    // 待更新版本
  lastCheckAt: string;
  updateStatus: 'up_to_date' | 'pending' | 'downloading' | 'ready' | 'error';
  
  // 本地缓存的配置
  localConfig: ConfigPackage | null;
  
  // 更新历史
  history: Array<{
    version: string;
    appliedAt: string;
    result: 'success' | 'failed';
  }>;
}

// 配置下发事件
export interface ConfigPushEvent {
  type: 'CONFIG_PUSH';
  config: ConfigPackage;
  timestamp: string;
  signature: string;          // 签名防篡改
}

// 配置回滚请求
export interface ConfigRollbackEvent {
  type: 'CONFIG_ROLLBACK';
  toVersion: string;
  reason: string;
  timestamp: string;
}

// === 内容模板配置（新增）===
export interface ContentTemplateConfig {
  id: string;
  name: string;
  platform: 'xiaohongshu' | 'xianyu' | 'wechat' | 'douyin';
  style: 'urgent' | 'engaging' | 'professional' | 'lifestyle';
  template: string;           // 模板文本，含占位符
  placeholders: string[];     // 占位符列表
  titleTemplate?: string;     // 标题模板
  hashtagRecommendations: string[];
  imageSuggestions: string[];
  performance: {
    avgConversionRate: number;
    usageCount: number;
    avgImpressions: number;
  };
}

// === 客服回复配置（新增）===
export interface ServiceResponseConfig {
  id: string;
  intent: string;             // 意图：price_inquiry, availability, etc.
  intentKeywords: string[];   // 触发关键词
  response: string;           // 标准回复
  alternativeResponses: string[]; // 备选回复
  contextRequired: string[];  // 需要的上下文
  performance: {
    avgSatisfaction: number;
    resolutionRate: number;
    usageCount: number;
  };
  escalationTriggers?: string[]; // 升级触发条件
}
