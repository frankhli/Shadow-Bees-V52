/**
 * DeepSeek 大模型适配器
 * 
 * 预留实现，接入 DeepSeek API
 * 等账号申请下来后，只需要实现 analyzeIntent 和 generateReply 即可
 * 
 * 使用方法：
 * 1. 申请 DeepSeek API Key
 * 2. 设置环境变量 DEEPSEEK_API_KEY
 * 3. 在配置文件中切换 provider: 'deepseek'
 */

import { AIService } from '../AIService';
import type {
  IntentResult,
  AIResponse,
  ConversationContext,
} from '../types';

// TODO: 安装依赖
// npm install openai

export class DeepSeekAdapter extends AIService {
  private client: any = null;
  // private systemPrompt: string = '';

  constructor(config: any) {
    super(config);
    this.initClient();
    // this.initSystemPrompt();
  }

  private initClient() {
    // TODO: 初始化 OpenAI 客户端（DeepSeek兼容OpenAI接口）
    // const OpenAI = require('openai');
    // this.client = new OpenAI({
    //   apiKey: process.env.DEEPSEEK_API_KEY,
    //   baseURL: 'https://api.deepseek.com/v1',
    // });
    console.warn('[DeepSeekAdapter] Not implemented yet');
  }



  async analyzeIntent(
    _message: string,
    _context: ConversationContext
  ): Promise<IntentResult> {
    // TODO: 调用 DeepSeek 进行意图识别
    return {
      type: 'unknown',
      confidence: 0,
      entities: {},
      sentiment: { score: 0, label: 'neutral' },
      urgency: 'low',
    };
  }

  async generateReply(
    _message: string,
    _context: ConversationContext
  ): Promise<AIResponse> {
    // TODO: 调用 DeepSeek 生成回复
    return {
      content: '【DeepSeek 尚未接入，请检查配置】',
      shouldEscalate: false,
      metadata: {
        model: 'deepseek-chat',
      },
    };
  }

  /**
   * 流式对话（提供更好的用户体验）
   */
  async *streamChat(
    _message: string,
    _context: ConversationContext
  ): AsyncGenerator<string, AIResponse, unknown> {
    // TODO: 实现流式输出
    yield '【流式输出未实现】';
    
    return {
      content: '【DeepSeek 尚未接入】',
      shouldEscalate: false,
    };
  }

  dispose(): void {
    // 清理资源
    this.client = null;
  }

  getStatus() {
    return {
      provider: 'deepseek',
      model: this.config.model || 'deepseek-chat',
      healthy: !!this.client,
      latency: undefined,
    };
  }
}

/**
 * 接入步骤：
 * 
 * 1. 安装依赖
 *    npm install openai
 * 
 * 2. 申请 API Key
 *    访问 https://platform.deepseek.com/
 *    注册账号并创建 API Key
 * 
 * 3. 配置环境变量
 *    .env 文件添加：
 *    DEEPSEEK_API_KEY=sk-xxxxxxxx
 * 
 * 4. 取消注释 initClient 中的代码
 * 
 * 5. 实现 analyzeIntent 和 generateReply
 *    参考文档：https://platform.deepseek.com/docs
 * 
 * 6. 切换配置
 *    在 config/ai.ts 中设置 provider: 'deepseek'
 */
