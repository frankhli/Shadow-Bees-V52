/**
 * AI服务统一入口
 * 
 * 使用方式：
 * 
 * 1. 基础使用（推荐）
 *    import { aiService } from '@/services/ai';
 *    const response = await aiService.chat(message, context);
 * 
 * 2. 指定provider
 *    import { AIServiceFactory } from '@/services/ai';
 *    const aiService = AIServiceFactory.getProvider('deepseek');
 * 
 * 3. 自定义配置
 *    import { AIServiceFactory } from '@/services/ai';
 *    const aiService = AIServiceFactory.create({
 *      provider: 'deepseek',
 *      temperature: 0.8,
 *    });
 */

// 核心类
export { AIService } from './AIService';
export { AIServiceFactory, aiService } from './AIServiceFactory';

// 适配器（按需导入）
export { RuleBasedAdapter } from './adapters/RuleBasedAdapter';
export { DeepSeekAdapter } from './adapters/DeepSeekAdapter';

// 类型定义
export type {
  IntentType,
  SentimentLabel,
  IntentResult,
  AIResponse,
  CustomerProfile,
  SessionMetrics,
  Message,
  ConversationContext,
  AIServiceConfig,
  Tool,
} from './types';

// 配置
export { AI_PROVIDER, AI_CONFIG, AI_FEATURES } from './config';
