/**
 * AI服务工厂
 * 根据配置创建对应的AI服务实例
 * 
 * 使用示例：
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

import { AIService } from './AIService';
import type { AIServiceConfig } from './types';
import { RuleBasedAdapter } from './adapters/RuleBasedAdapter';
import { DeepSeekAdapter } from './adapters/DeepSeekAdapter';
import { AI_PROVIDER, AI_CONFIG } from './config';

export class AIServiceFactory {
  private static instances: Map<string, AIService> = new Map();

  /**
   * 创建AI服务实例
   * @param config 服务配置
   * @param cacheKey 缓存key（用于复用实例）
   */
  static create(config: AIServiceConfig, cacheKey?: string): AIService {
    const key = cacheKey || config.provider;
    
    // 复用已有实例
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let instance: AIService;

    switch (config.provider) {
      case 'rule':
        instance = new RuleBasedAdapter(config);
        break;

      case 'deepseek':
        instance = new DeepSeekAdapter(config);
        break;

      case 'openai':
        // TODO: 实现 OpenAIAdapter
        throw new Error('OpenAI adapter not implemented yet');

      case 'local':
        // TODO: 实现 LocalModelAdapter
        throw new Error('Local model adapter not implemented yet');

      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }

    // 缓存实例
    this.instances.set(key, instance);
    
    console.log(`[AIServiceFactory] Created ${config.provider} instance`);
    return instance;
  }

  /**
   * 获取默认实例（从配置读取）
   */
  static getDefault(): AIService {
    return this.create({
      provider: AI_PROVIDER,
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      maxTokens: AI_CONFIG.maxTokens,
    }, 'default');
  }

  /**
   * 获取指定provider的实例
   */
  static getProvider(provider: AIServiceConfig['provider']): AIService {
    return this.create({ provider }, provider);
  }

  /**
   * 销毁实例
   */
  static dispose(key?: string): void {
    if (key) {
      const instance = this.instances.get(key);
      if (instance) {
        instance.dispose();
        this.instances.delete(key);
      }
    } else {
      // 销毁所有实例
      this.instances.forEach(instance => instance.dispose());
      this.instances.clear();
    }
  }

  /**
   * 获取所有实例状态
   */
  static getAllStatus(): Array<{ key: string; status: any }> {
    return Array.from(this.instances.entries()).map(([key, instance]) => ({
      key,
      status: instance.getStatus(),
    }));
  }
}

// 导出默认实例（方便直接使用）
export const aiService = AIServiceFactory.getDefault();
