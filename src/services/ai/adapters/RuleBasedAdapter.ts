/**
 * 规则引擎适配器
 * 包装现有的 aiAgentService，实现 AIService 接口
 * 
 * 这是当前使用的实现，未来可无缝切换到大模型
 */

import { AIService } from '../AIService';
import type {
  IntentResult,
  AIResponse,
  ConversationContext,
} from '../types';
import { aiAgentService } from '@/services/aiAgentService';

export class RuleBasedAdapter extends AIService {
  private cache: Map<string, AIResponse> = new Map();

  async analyzeIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentResult> {
    // 转换上下文格式
    const agentContext = this.convertContext(context);
    
    // 调用现有的 aiAgentService
    const result = await aiAgentService.analyzeIntent(message, agentContext);
    
    // 转换结果格式
    return {
      type: result.type,
      confidence: result.confidence,
      entities: result.entities,
      sentiment: result.sentiment,
      urgency: result.urgency,
    };
  }

  async generateReply(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(message, context);
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 转换上下文
    const agentContext = this.convertContext(context);
    
    // 分析意图
    const intent = await aiAgentService.analyzeIntent(message, agentContext);
    
    // 生成回复
    const reply = await aiAgentService.generateReply(intent, agentContext);

    const response: AIResponse = {
      content: reply.content,
      shouldEscalate: reply.shouldEscalate,
      reason: reply.reason,
      metadata: {
        model: 'rule-engine',
        latency: 0, // 规则引擎几乎无延迟
      },
    };

    // 缓存结果
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, response);
      // 限制缓存大小
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
    }

    return response;
  }

  /**
   * 转换上下文格式
   */
  private convertContext(context: ConversationContext): any {
    return {
      messages: context.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sentiment: m.sentiment,
      })),
      customerProfile: {
        name: context.customerProfile.name,
        platform: context.customerProfile.platform,
        visitCount: context.customerProfile.visitCount,
        inquiryCount: context.customerProfile.inquiryCount,
        priceSensitivity: context.customerProfile.priceSensitivity,
        bookingHistory: context.customerProfile.bookingHistory,
      },
      sessionMetrics: {
        duration: context.sessionMetrics.duration,
        topicSwitches: context.sessionMetrics.topicSwitches,
        resistancePoints: context.sessionMetrics.resistancePoints,
      },
    };
  }

  /**
   * 生成缓存Key
   */
  private getCacheKey(message: string, context: ConversationContext): string {
    // 简化：只取消息内容+议价次数作为key
    return `${message.slice(0, 50)}_${context.customerProfile.inquiryCount}`;
  }

  dispose(): void {
    this.cache.clear();
  }

  getStatus() {
    return {
      provider: 'rule',
      model: 'rule-engine-v1',
      healthy: true,
      latency: 0,
    };
  }
}
