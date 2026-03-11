/**
 * AI服务抽象接口
 * 所有AI实现（规则引擎/大模型）都必须实现此接口
 */

import type {
  IntentResult,
  AIResponse,
  ConversationContext,
  AIServiceConfig,
  Tool,
} from './types';

export abstract class AIService {
  protected config: AIServiceConfig;
  protected tools: Map<string, Tool> = new Map();

  constructor(config: AIServiceConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 500,
      timeout: 10000,
      cacheEnabled: true,
      fallbackToRule: true,
      ...config,
    };
  }

  /**
   * 分析用户意图
   * @param message 用户消息
   * @param context 对话上下文
   */
  abstract analyzeIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentResult>;

  /**
   * 生成AI回复
   * @param message 用户消息
   * @param context 对话上下文
   * @returns AI回复
   */
  abstract generateReply(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse>;

  /**
   * 完整对话处理（意图识别+回复生成）
   * @param message 用户消息
   * @param context 对话上下文
   */
  async chat(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // 1. 分析意图
      const intent = await this.analyzeIntent(message, context);
      
      // 2. 生成回复
      const response = await this.generateReply(message, context);
      
      // 3. 附加意图信息
      response.intent = intent;
      response.metadata = {
        ...response.metadata,
        latency: Date.now() - startTime,
      };
      
      return response;
    } catch (error) {
      console.error('[AIService] Chat error:', error);
      
      // 失败时回退到规则引擎（如果配置允许）
      if (this.config.fallbackToRule && this.config.provider !== 'rule') {
        console.log('[AIService] Fallback to rule engine');
        const { RuleBasedAdapter } = await import('./adapters/RuleBasedAdapter');
        const fallback = new RuleBasedAdapter({ provider: 'rule' });
        return fallback.chat(message, context);
      }
      
      throw error;
    }
  }

  /**
   * 批量处理（用于离线分析）
   * @param messages 消息列表
   */
  async batchChat(
    messages: Array<{ message: string; context: ConversationContext }>
  ): Promise<AIResponse[]> {
    return Promise.all(
      messages.map(({ message, context }) => this.chat(message, context))
    );
  }

  /**
   * 注册工具（Function Calling）
   * @param tool 工具定义
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 执行工具
   * @param name 工具名
   * @param args 参数
   */
  protected async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(args);
  }

  /**
   * 清理资源
   */
  abstract dispose(): void;

  /**
   * 获取服务状态
   */
  abstract getStatus(): {
    provider: string;
    model?: string;
    healthy: boolean;
    latency?: number;
  };
}
