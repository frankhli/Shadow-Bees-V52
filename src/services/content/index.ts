/**
 * 内容生成服务统一导出
 */

export {
  contentGenerationService,
  ContentGenerationService,
} from './ContentGenerationService';

export type {
  Platform,
  ContentType,
  ToneType,
  AudienceType,
  HotelInfo,
  PricingContext,
  HotEvent,
  ContentGenerationRequest,
  GeneratedContent,
  LLMProviderConfig,
  GenerationOptions,
  ContentProvider,
} from './types';

export {
  BaseProvider,
  TemplateProvider,
  DeepSeekProvider,
  DeepSeekConfigHelp,
  OpenAIProvider,
  OpenAIConfigHelp,
} from './ContentGenerationService';
