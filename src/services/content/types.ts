/**
 * 内容生成服务类型定义
 * 与具体模型无关的通用接口
 */

export type Platform = 'xiaohongshu' | 'xianyu' | 'wechat' | 'douyin';
export type ContentType = 'promotion' | 'event' | 'transfer' | 'flash_sale';
export type ToneType = 'professional' | 'casual' | 'humorous' | 'emotional' | 'urgent';
export type AudienceType = 'business' | 'leisure' | 'young' | 'family' | 'luxury';

export interface HotelInfo {
  name: string;
  location: string;
  features: string[];
  roomTypes: Array<{
    name: string;
    area?: string;
    bedType?: string;
    view?: string;
    amenities?: string[];
  }>;
  nearbyAttractions: string[];
  uniqueSellingPoints: string[];
}

export interface PricingContext {
  basePrice: number;
  platformPrice: number;
  competitorAvg: number;
  discount: number;
}

export interface HotEvent {
  type: 'concert' | 'sports' | 'exhibition' | 'festival' | 'conference';
  name: string;
  venue: string;
  dates: string[];
  popularity: 'high' | 'medium' | 'low';
}

export interface ContentGenerationRequest {
  platform: Platform;
  contentType: ContentType;
  hotelInfo: HotelInfo;
  pricing: PricingContext;
  hotEvent?: HotEvent;
  targetAudience?: AudienceType;
  tone?: ToneType;
  /** 额外上下文，模型专用 */
  extraContext?: Record<string, unknown>;
}

export interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
  callToAction: string;
  imageSuggestions: string[];
  bestPublishTime: string;
  estimatedEngagement: 'high' | 'medium' | 'low';
  /** 生成元数据 */
  metadata?: {
    provider: string;
    model?: string;
    tokensUsed?: number;
    generationTime?: number;
    confidence?: number;
  };
}

/** 大模型 Provider 配置 */
export interface LLMProviderConfig {
  name: string;
  enabled: boolean;
  priority: number; // 优先级，数字越小越优先
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  /** 自定义参数 */
  customParams?: Record<string, unknown>;
}

/** 生成选项 */
export interface GenerationOptions {
  /** 强制使用指定 provider */
  provider?: string;
  /** 生成版本数（用于A/B测试） */
  variants?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 自定义系统提示词 */
  customSystemPrompt?: string;
}

/** Provider 接口 - 所有大模型需实现 */
export interface ContentProvider {
  readonly name: string;
  readonly version: string;
  
  /** 检查服务是否可用 */
  healthCheck(): Promise<boolean>;
  
  /** 生成内容 */
  generate(request: ContentGenerationRequest): Promise<GeneratedContent>;
  
  /** 批量生成 */
  generateBatch?(
    request: ContentGenerationRequest, 
    variants: number
  ): Promise<GeneratedContent[]>;
  
  /** 优化现有内容 */
  optimize?(content: string, platform: Platform): Promise<string>;
}
