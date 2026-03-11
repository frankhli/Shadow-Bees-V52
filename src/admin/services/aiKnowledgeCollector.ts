/**
 * AI知识收集器
 * 通过 BroadcastChannel 接收酒店端AI事件，存储到IndexedDB
 */

import { aiKnowledgeDB, type AIKnowledgeEntry } from './aiKnowledgeDB';

// ============================================
// 消息类型定义
// ============================================

export type AIEventType = 
  | 'PRICING_DECISION'      // 定价决策事件
  | 'CONTENT_GENERATED'     // 内容生成事件
  | 'SERVICE_REPLY'         // 客服回复事件
  | 'AI_FEEDBACK';          // AI效果反馈（72小时后）

export interface AIEventPayload {
  eventType: AIEventType;
  eventId: string;
  hotelId: string;
  hotelName: string;
  timestamp: string;
  
  // 输入上下文
  input: {
    features: number[];
    context: Record<string, any>;
  };
  
  // AI输出
  aiOutput: {
    model: string;
    suggestion: any;
    confidence: number;
    reasoning: string;
  };
  
  // 人工干预
  humanAction?: {
    userId: string;
    action: 'accept' | 'modify' | 'reject';
    finalResult?: any;
    feedback?: string;
  };
}

export interface AIFeedbackPayload {
  eventId: string;
  outcome: {
    success: boolean;
    metrics: Record<string, number>;
  };
  trackedAt: string;
}

// ============================================
// 通道配置
// ============================================

const AI_SYNC_CHANNEL = 'ai_knowledge_sync';

// ============================================
// AI知识收集器
// ============================================

export class AIKnowledgeCollector {
  private channel: BroadcastChannel | null = null;
  private isCollecting = false;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(AI_SYNC_CHANNEL);
      this.setupListeners();
    }
    console.log('[AIKnowledgeCollector] Initialized');
  }

  private setupListeners(): void {
    if (!this.channel) return;

    this.channel.onmessage = async (event) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'PRICING_DECISION':
        case 'CONTENT_GENERATED':
        case 'SERVICE_REPLY':
          await this.handleAIEvent(payload as AIEventPayload);
          break;
          
        case 'AI_FEEDBACK':
          await this.handleFeedback(payload as AIFeedbackPayload);
          break;
      }
    };
  }

  /**
   * 处理AI事件
   */
  private async handleAIEvent(payload: AIEventPayload): Promise<void> {
    if (this.isCollecting) return;
    this.isCollecting = true;

    try {
      console.log('[AIKnowledgeCollector] Received AI event:', payload.eventType, payload.eventId);

      // 转换为知识库条目
      const entry: AIKnowledgeEntry = {
        id: payload.eventId,
        type: this.mapEventType(payload.eventType),
        status: 'pending',
        hotelId: payload.hotelId,
        hotelName: payload.hotelName,
        timestamp: payload.timestamp,
        input: payload.input,
        aiOutput: payload.aiOutput,
        humanAction: payload.humanAction,
        tags: this.generateTags(payload),
        learningValue: this.calculateLearningValue(payload),
      };

      // 存储到数据库
      await aiKnowledgeDB.addEntry(entry);
      
      console.log('[AIKnowledgeCollector] Entry stored:', entry.id);
    } catch (error) {
      console.error('[AIKnowledgeCollector] Failed to store entry:', error);
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * 处理效果反馈
   */
  private async handleFeedback(payload: AIFeedbackPayload): Promise<void> {
    try {
      console.log('[AIKnowledgeCollector] Received feedback:', payload.eventId);

      // 更新案例状态和效果
      await aiKnowledgeDB.updateOutcome(payload.eventId, {
        success: payload.outcome.success,
        metrics: payload.outcome.metrics,
        trackedAt: payload.trackedAt,
      });

      // 更新状态
      const status = payload.outcome.success ? 'success' : 'failure';
      await aiKnowledgeDB.updateStatus(payload.eventId, status);
      
      console.log('[AIKnowledgeCollector] Feedback applied:', payload.eventId);
    } catch (error) {
      console.error('[AIKnowledgeCollector] Failed to apply feedback:', error);
    }
  }

  /**
   * 映射事件类型
   */
  private mapEventType(eventType: AIEventType): 'pricing' | 'content' | 'service' {
    switch (eventType) {
      case 'PRICING_DECISION':
        return 'pricing';
      case 'CONTENT_GENERATED':
        return 'content';
      case 'SERVICE_REPLY':
        return 'service';
      default:
        return 'pricing';
    }
  }

  /**
   * 生成标签
   */
  private generateTags(payload: AIEventPayload): string[] {
    const tags: string[] = [];
    const ctx = payload.input.context;

    // 根据类型生成标签
    switch (payload.eventType) {
      case 'PRICING_DECISION':
        if (ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6) tags.push('周末');
        if (ctx.inventoryStatus === 'tight') tags.push('库存紧张');
        if (ctx.inventoryStatus === 'abundant') tags.push('库存充足');
        if (payload.aiOutput.confidence > 0.8) tags.push('高置信度');
        if (payload.aiOutput.confidence < 0.6) tags.push('低置信度');
        break;
        
      case 'CONTENT_GENERATED':
        if (ctx.platform) tags.push(ctx.platform);
        if (ctx.style) tags.push(ctx.style);
        if (payload.humanAction?.action === 'accept') tags.push('高转化');
        break;
        
      case 'SERVICE_REPLY':
        if (ctx.intent) tags.push(ctx.intent);
        if (payload.aiOutput.confidence > 0.9) tags.push('高置信度');
        break;
    }

    // 添加人工干预标签
    if (payload.humanAction) {
      if (payload.humanAction.action === 'accept') tags.push('已采纳');
      if (payload.humanAction.action === 'modify') tags.push('被修改');
      if (payload.humanAction.action === 'reject') tags.push('被拒绝');
    }

    return tags;
  }

  /**
   * 计算学习价值
   */
  private calculateLearningValue(payload: AIEventPayload): number {
    let value = 50; // 基础值

    // 置信度影响
    value += payload.aiOutput.confidence * 30;

    // 人工干预增加学习价值
    if (payload.humanAction) {
      if (payload.humanAction.action === 'modify') value += 15;
      if (payload.humanAction.action === 'reject') value += 20;
      if (payload.humanAction.feedback) value += 10;
    }

    // 特殊情况加成
    const ctx = payload.input.context;
    if (ctx.inventoryStatus === 'tight' || ctx.inventoryStatus === 'soldout') {
      value += 5;
    }

    return Math.min(100, Math.round(value));
  }

  /**
   * 手动触发案例收集（用于测试）
   */
  async collectTestEntry(entry: AIKnowledgeEntry): Promise<void> {
    await aiKnowledgeDB.addEntry(entry);
  }

  /**
   * 获取统计信息
   */
  async getStats(type?: 'pricing' | 'content' | 'service') {
    return aiKnowledgeDB.getStats(type);
  }

  /**
   * 查询案例
   */
  async queryEntries(options: {
    type?: 'pricing' | 'content' | 'service';
    status?: 'success' | 'failure' | 'pending';
    hotelId?: string;
    limit?: number;
  } = {}) {
    return aiKnowledgeDB.queryEntries(options);
  }

  /**
   * 销毁收集器
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

// ============================================
// 单例导出
// ============================================

export const aiKnowledgeCollector = new AIKnowledgeCollector();

// ============================================
// 酒店端发送事件帮助函数（供酒店端调用）
// ============================================

/**
 * 发送定价决策事件（酒店端调用）
 */
export function sendPricingDecisionEvent(payload: Omit<AIEventPayload, 'eventType'>): void {
  if (typeof BroadcastChannel === 'undefined') return;
  
  const channel = new BroadcastChannel(AI_SYNC_CHANNEL);
  channel.postMessage({
    type: 'PRICING_DECISION',
    payload: { ...payload, eventType: 'PRICING_DECISION' },
  });
  channel.close();
}

/**
 * 发送内容生成事件（酒店端调用）
 */
export function sendContentGeneratedEvent(payload: Omit<AIEventPayload, 'eventType'>): void {
  if (typeof BroadcastChannel === 'undefined') return;
  
  const channel = new BroadcastChannel(AI_SYNC_CHANNEL);
  channel.postMessage({
    type: 'CONTENT_GENERATED',
    payload: { ...payload, eventType: 'CONTENT_GENERATED' },
  });
  channel.close();
}

/**
 * 发送客服回复事件（酒店端调用）
 */
export function sendServiceReplyEvent(payload: Omit<AIEventPayload, 'eventType'>): void {
  if (typeof BroadcastChannel === 'undefined') return;
  
  const channel = new BroadcastChannel(AI_SYNC_CHANNEL);
  channel.postMessage({
    type: 'SERVICE_REPLY',
    payload: { ...payload, eventType: 'SERVICE_REPLY' },
  });
  channel.close();
}

/**
 * 发送效果反馈（酒店端/定时任务调用）
 */
export function sendAIFeedback(payload: AIFeedbackPayload): void {
  if (typeof BroadcastChannel === 'undefined') return;
  
  const channel = new BroadcastChannel(AI_SYNC_CHANNEL);
  channel.postMessage({
    type: 'AI_FEEDBACK',
    payload,
  });
  channel.close();
}
