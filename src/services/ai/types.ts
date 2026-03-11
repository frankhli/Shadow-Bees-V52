/**
 * AI服务类型定义
 * 抽象接口，屏蔽底层实现差异（规则引擎/大模型）
 */

export type Platform = 'xiaohongshu' | 'xianyu' | 'wechat';

export type IntentType = 
  | 'price_inquiry'      // 价格咨询
  | 'bargain'            // 议价
  | 'complaint'          // 投诉
  | 'booking'            // 预订
  | 'refund'             // 退款
  | 'inquiry'            // 咨询
  | 'small_talk'         // 闲聊
  | 'escalation_request' // 要求人工
  | 'unknown';           // 未知

export type SentimentLabel = 'angry' | 'frustrated' | 'neutral' | 'positive' | 'excited';

export interface IntentResult {
  type: IntentType;
  confidence: number;           // 置信度 0-1
  entities: Record<string, string>; // 提取的实体
  sentiment: {
    score: number;              // -1 到 1
    label: SentimentLabel;
  };
  urgency: 'low' | 'medium' | 'high' | 'critical';
  raw?: any;                    // 原始返回（调试）
}

export interface AIResponse {
  content: string;              // 回复内容
  shouldEscalate: boolean;      // 是否转人工
  reason?: string;              // 转人工原因
  intent?: IntentResult;        // 意图分析结果
  metadata?: {                  // 额外元数据
    model?: string;             // 使用的模型
    tokens?: number;            // Token消耗
    latency?: number;           // 响应延迟
  };
}

export interface CustomerProfile {
  name: string;
  platform: Platform;
  visitCount: number;
  inquiryCount: number;         // 议价次数
  priceSensitivity: 'low' | 'medium' | 'high';
  bookingHistory: 'none' | 'once' | 'repeat';
}

export interface SessionMetrics {
  duration: number;             // 会话时长(ms)
  topicSwitches: number;        // 话题跳转次数
  resistancePoints: string[];   // 客户抗拒点
}

export interface Message {
  role: 'customer' | 'ai' | 'human';
  content: string;
  timestamp: number;
  sentiment?: number;           // 情绪分数
}

export interface ConversationContext {
  sessionId: string;
  messages: Message[];
  customerProfile: CustomerProfile;
  sessionMetrics: SessionMetrics;
}

// AI服务配置
export interface AIServiceConfig {
  provider: 'rule' | 'deepseek' | 'openai' | 'local';
  model?: string;               // 模型名称
  temperature?: number;         // 创造性 0-1
  maxTokens?: number;           // 最大回复长度
  timeout?: number;             // 超时时间(ms)
  cacheEnabled?: boolean;       // 是否启用缓存
  fallbackToRule?: boolean;     // 大模型失败时回退到规则引擎
}

// 工具定义（Function Calling）
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}
