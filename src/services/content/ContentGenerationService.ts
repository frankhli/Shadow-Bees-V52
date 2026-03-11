/**
 * 内容生成服务
 * 统一入口，支持多 Provider 自动切换和降级
 * 
 * 使用示例：
 * ```typescript
 * import { contentGenerationService } from '@/services/content';
 * 
 * // 默认使用模板
 * const content = await contentGenerationService.generate(request);
 * 
 * // 指定 Provider
 * const content = await contentGenerationService.generate(request, { provider: 'deepseek' });
 * 
 * // A/B测试
 * const variants = await contentGenerationService.generateBatch(request, 3);
 * ```
 */

import { BaseProvider } from './providers/BaseProvider';
import { TemplateProvider } from './providers/TemplateProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import type {
  ContentGenerationRequest,
  GeneratedContent,
  GenerationOptions,
  LLMProviderConfig,
} from './types';

export * from './types';

export class ContentGenerationService {
  private static instance: ContentGenerationService;
  private providers = new Map<string, BaseProvider>();
  private defaultProvider = 'template';
  private configs: Record<string, LLMProviderConfig> = {};

  private constructor() {
    this.initDefaultConfigs();
    this.registerDefaultProviders();
  }

  static getInstance(): ContentGenerationService {
    if (!ContentGenerationService.instance) {
      ContentGenerationService.instance = new ContentGenerationService();
    }
    return ContentGenerationService.instance;
  }

  /**
   * 初始化默认配置
   */
  private initDefaultConfigs() {
    this.configs = {
      template: {
        name: 'template',
        enabled: true,
        priority: 999,
      },
      deepseek: {
        name: 'deepseek',
        enabled: false, // 默认禁用，需配置 API Key
        priority: 1,
        apiKey: (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || 'your_api_key_here',
        model: 'deepseek-chat',
        temperature: 0.8,
        maxTokens: 2000,
        timeout: 30000,
      },
      openai: {
        name: 'openai',
        enabled: false, // 默认禁用
        priority: 2,
        apiKey: (import.meta as any).env?.VITE_OPENAI_API_KEY || 'your_api_key_here',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 2000,
        timeout: 30000,
      },
      // 预留其他 Provider
      claude: {
        name: 'claude',
        enabled: false,
        priority: 3,
      },
      qwen: {
        name: 'qwen',
        enabled: false,
        priority: 4,
      },
      moonshot: {
        name: 'moonshot',
        enabled: false,
        priority: 5,
      },
    };
  }

  /**
   * 注册默认 Providers
   */
  private registerDefaultProviders() {
    this.register('template', new TemplateProvider(this.configs.template));
    
    // 只有配置了 API Key 才注册
    if (this.configs.deepseek.apiKey && this.configs.deepseek.apiKey !== 'your_api_key_here') {
      this.register('deepseek', new DeepSeekProvider(this.configs.deepseek as any));
      this.configs.deepseek.enabled = true;
    }
    
    if (this.configs.openai.apiKey && this.configs.openai.apiKey !== 'your_api_key_here') {
      this.register('openai', new OpenAIProvider(this.configs.openai as any));
      this.configs.openai.enabled = true;
    }
  }

  /**
   * 注册 Provider
   */
  register(name: string, provider: BaseProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * 配置 Provider
   */
  configure(name: string, config: Partial<LLMProviderConfig>): void {
    if (this.configs[name]) {
      this.configs[name] = { ...this.configs[name], ...config };
      
      // 如果 provider 已注册，更新其配置
      const provider = this.providers.get(name);
      if (provider) {
        // 需要重新创建 provider 以应用新配置
        if (name === 'deepseek' && config.apiKey) {
          this.providers.set(name, new DeepSeekProvider(this.configs[name] as any));
        } else if (name === 'openai' && config.apiKey) {
          this.providers.set(name, new OpenAIProvider(this.configs[name] as any));
        }
      }
    }
  }

  /**
   * 设置默认 Provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * 获取当前默认 Provider 名称
   */
  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  /**
   * 获取所有可用 Providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(name => {
      const provider = this.providers.get(name);
      return provider && this.configs[name]?.enabled;
    });
  }

  /**
   * 获取所有 Provider 配置状态
   */
  getProviderStatus(): Array<{ name: string; enabled: boolean; healthy: boolean }> {
    return Array.from(this.providers.entries()).map(([_name, _provider]) => ({
      name: _name,
      enabled: this.configs[_name]?.enabled ?? false,
      healthy: true, // 同步返回，实际健康状态需异步检查
    }));
  }

  /**
   * 健康检查所有 Providers
   */
  async healthCheckAll(): Promise<Array<{ name: string; healthy: boolean }>> {
    const results = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        try {
          const healthy = await provider.healthCheck();
          return { name, healthy };
        } catch {
          return { name, healthy: false };
        }
      })
    );
    return results;
  }

  /**
   * 生成内容
   * 
   * 自动策略：
   * 1. 如果指定了 provider，尝试使用
   * 2. 如果失败，按优先级尝试其他 provider
   * 3. 最后降级到模板
   */
  async generate(
    request: ContentGenerationRequest,
    options: GenerationOptions = {}
  ): Promise<GeneratedContent> {
    const { provider: preferredProvider, timeout = 30000 } = options;
    
    // 确定要尝试的 providers
    const providersToTry = this.getProvidersToTry(preferredProvider);
    
    // 依次尝试
    const errors: string[] = [];
    
    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // 带超时的生成
        const result = await Promise.race([
          provider.generate(request),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);
        
        // 记录实际使用的 provider
        return {
          ...result,
          metadata: {
            ...result.metadata,
            provider: providerName,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${providerName}: ${message}`);
        console.warn(`Provider '${providerName}' failed:`, message);
        // 继续尝试下一个
      }
    }

    // 全部失败
    throw new Error(`All providers failed: ${errors.join('; ')}`);
  }

  /**
   * 批量生成（A/B测试）
   */
  async generateBatch(
    request: ContentGenerationRequest,
    variants: number = 3,
    options: GenerationOptions = {}
  ): Promise<GeneratedContent[]> {
    const provider = this.getProviderToUse(options.provider);
    
    if (provider.generateBatch) {
      return provider.generateBatch(request, variants);
    }

    // 默认实现：多次调用 generate
    const results: GeneratedContent[] = [];
    for (let i = 0; i < variants; i++) {
      const content = await this.generate(request, options);
      results.push(content);
    }
    return results;
  }

  /**
   * 优化现有内容
   */
  async optimize(
    content: string,
    platform: ContentGenerationRequest['platform'],
    options: GenerationOptions = {}
  ): Promise<string> {
    const provider = this.getProviderToUse(options.provider);
    
    if (provider.optimize) {
      return provider.optimize(content, platform);
    }

    // 如果不支持优化，返回原内容
    return content;
  }

  /**
   * 获取要尝试的 providers 列表
   */
  private getProvidersToTry(preferred?: string): string[] {
    const providers: string[] = [];
    
    // 优先使用指定的
    if (preferred && this.providers.has(preferred)) {
      providers.push(preferred);
    }
    
    // 按优先级添加其他启用的 providers
    const sortedConfigs = Object.entries(this.configs)
      .filter(([name, config]) => 
        config.enabled && 
        this.providers.has(name) && 
        name !== preferred
      )
      .sort((a, b) => a[1].priority - b[1].priority);
    
    providers.push(...sortedConfigs.map(([name]) => name));
    
    // 确保至少有模板
    if (!providers.includes('template')) {
      providers.push('template');
    }
    
    return [...new Set(providers)]; // 去重
  }

  /**
   * 获取要使用的 provider
   */
  private getProviderToUse(preferred?: string): BaseProvider {
    const providerName = preferred || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    
    return provider;
  }
}

// 导出单例
export const contentGenerationService = ContentGenerationService.getInstance();

// 导出 Providers（供需要时直接使用）
export { BaseProvider } from './providers/BaseProvider';
export { TemplateProvider } from './providers/TemplateProvider';
export { DeepSeekProvider, DeepSeekConfigHelp } from './providers/DeepSeekProvider';
export { OpenAIProvider, OpenAIConfigHelp } from './providers/OpenAIProvider';
