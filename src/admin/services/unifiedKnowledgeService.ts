/**
 * 统一知识服务
 * 聚合 pricingDataCollector 和 aiKnowledgeDB 的数据
 * 为 AI知识沉淀页面 提供统一查询接口
 */

import { pricingDataCollector, type PricingDecisionEvent } from './pricingDataCollector';
import { aiKnowledgeDB, type AIKnowledgeEntry } from './aiKnowledgeDB';

// ============================================
// 统一案例类型
// ============================================

export type UnifiedCaseType = 'pricing' | 'content' | 'service';

export interface UnifiedCase {
  id: string;
  type: UnifiedCaseType;
  status: 'success' | 'failure' | 'pending';
  hotelId: string;
  hotelName: string;
  timestamp: string;
  
  // AI决策信息
  aiDecision: {
    model: string;
    suggestion: any;
    confidence: number;
    reasoning: string;
  };
  
  // 上下文特征
  context: {
    features: number[];
    rawContext: Record<string, any>;
  };
  
  // 人工干预
  humanAction?: {
    action: 'accept' | 'modify' | 'reject';
    userId?: string;
    feedback?: string;
    finalResult?: any;
  };
  
  // 效果追踪
  outcome?: {
    success: boolean;
    metrics: Record<string, number>;
    trackedAt?: string;
  };
  
  // 标签
  tags: string[];
  learningValue: number;
  
  // 原始数据引用（用于详情查看）
  source: 'pricing' | 'knowledge';
  sourceId: string;
}

// ============================================
// 查询参数
// ============================================

export interface QueryParams {
  type?: UnifiedCaseType;
  status?: 'success' | 'failure' | 'pending';
  hotelId?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  minLearningValue?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// 统计数据
// ============================================

export interface KnowledgeStats {
  totalCases: number;
  byType: Record<UnifiedCaseType, number>;
  byStatus: {
    success: number;
    failure: number;
    pending: number;
  };
  avgConfidence: number;
  acceptanceRate: number;
  topTags: Array<{ tag: string; count: number }>;
  learningValueDistribution: {
    high: number;   // 80-100
    medium: number; // 50-79
    low: number;    // 0-49
  };
  // 时间趋势
  trend: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}

// ============================================
// 统一知识服务
// ============================================

class UnifiedKnowledgeService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    // 初始化底层存储
    await pricingDataCollector.init?.();
    await aiKnowledgeDB.init();
    
    this.initialized = true;
    console.log('[UnifiedKnowledgeService] Initialized');
  }

  /**
   * 查询统一案例列表
   */
  async queryCases(params: QueryParams = {}): Promise<UnifiedCase[]> {
    await this.init();

    const [pricingCases, knowledgeCases] = await Promise.all([
      this.fetchPricingCases(params),
      this.fetchKnowledgeCases(params),
    ]);

    // 合并并转换
    let allCases: UnifiedCase[] = [
      ...pricingCases.map(c => this.transformPricingCase(c)),
      ...knowledgeCases.map(c => this.transformKnowledgeCase(c)),
    ];

    // 过滤
    if (params.tags && params.tags.length > 0) {
      allCases = allCases.filter(c => 
        params.tags!.some(tag => c.tags.includes(tag))
      );
    }

    if (params.minLearningValue !== undefined) {
      allCases = allCases.filter(c => 
        c.learningValue >= params.minLearningValue!
      );
    }

    // 排序（时间倒序）
    allCases.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 分页
    const offset = params.offset || 0;
    const limit = params.limit || allCases.length;
    return allCases.slice(offset, offset + limit);
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<KnowledgeStats> {
    await this.init();

    const allCases = await this.queryCases({ limit: 10000 });

    const byType: Record<UnifiedCaseType, number> = { pricing: 0, content: 0, service: 0 };
    const byStatus = { success: 0, failure: 0, pending: 0 };
    const tagCounts = new Map<string, number>();
    let totalConfidence = 0;
    let acceptedCount = 0;
    let learningValueHigh = 0;
    let learningValueMedium = 0;
    let learningValueLow = 0;

    for (const c of allCases) {
      byType[c.type]++;
      byStatus[c.status]++;
      totalConfidence += c.aiDecision.confidence;
      
      if (c.humanAction?.action === 'accept') acceptedCount++;
      
      if (c.learningValue >= 80) learningValueHigh++;
      else if (c.learningValue >= 50) learningValueMedium++;
      else learningValueLow++;

      c.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }

    // 时间趋势（最近30天）
    const trend = this.calculateTrend(allCases);

    return {
      totalCases: allCases.length,
      byType,
      byStatus,
      avgConfidence: allCases.length > 0 ? totalConfidence / allCases.length : 0,
      acceptanceRate: allCases.length > 0 ? acceptedCount / allCases.length : 0,
      topTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      learningValueDistribution: {
        high: learningValueHigh,
        medium: learningValueMedium,
        low: learningValueLow,
      },
      trend,
    };
  }

  /**
   * 获取单个案例详情
   */
  async getCaseDetail(id: string): Promise<UnifiedCase | null> {
    await this.init();

    // 尝试从pricingDataCollector获取
    const pricingHistory = await pricingDataCollector.getHotelPricingHistory('');
    const pricingCase = pricingHistory.find(c => c.id === id);
    if (pricingCase) {
      return this.transformPricingCase(pricingCase);
    }

    // 尝试从aiKnowledgeDB获取
    const entries = await aiKnowledgeDB.queryEntries({ limit: 10000 });
    const knowledgeCase = entries.find(c => c.id === id);
    if (knowledgeCase) {
      return this.transformKnowledgeCase(knowledgeCase);
    }

    return null;
  }

  // ============================================
  // 内部方法
  // ============================================

  private async fetchPricingCases(params: QueryParams): Promise<PricingDecisionEvent[]> {
    try {
      // 使用新增的getAllEvents方法获取所有定价事件
      const allEvents = await pricingDataCollector.getAllEvents(params.limit);
      
      // 过滤
      return allEvents.filter(event => {
        if (params.hotelId && event.hotelId !== params.hotelId) return false;
        if (params.status && event.processingStatus !== params.status) return false;
        return true;
      });
    } catch (error) {
      console.error('[UnifiedKnowledgeService] Failed to fetch pricing cases:', error);
      return [];
    }
  }

  private async fetchKnowledgeCases(params: QueryParams): Promise<AIKnowledgeEntry[]> {
    try {
      return await aiKnowledgeDB.queryEntries({
        type: params.type as any,
        status: params.status,
        limit: params.limit,
      });
    } catch (error) {
      console.error('[UnifiedKnowledgeService] Failed to fetch knowledge cases:', error);
      return [];
    }
  }

  private transformPricingCase(event: PricingDecisionEvent): UnifiedCase {
    return {
      id: event.id,
      type: 'pricing',
      status: event.processingStatus === 'completed' 
        ? (event.outcome?.result72h?.sold ? 'success' : 'failure')
        : 'pending',
      hotelId: event.hotelId,
      hotelName: event.hotelSnapshot?.roomTypeName || '未知酒店',
      timestamp: event.timestamp,
      aiDecision: {
        model: event.aiSuggestion ? 'ai-pricing-v1' : 'manual',
        suggestion: event.aiSuggestion || { price: event.priceChange.newPrice },
        confidence: event.aiSuggestion?.confidence || 0.5,
        reasoning: event.aiSuggestion?.reasoning || '人工定价',
      },
      context: {
        features: [
          event.hotelSnapshot?.currentInventory / (event.hotelSnapshot?.totalInventory || 1),
          event.temporalContext?.dayOfWeek / 7,
          event.competitorSnapshot?.marketAvgPrice / (event.priceChange.newPrice || 1),
        ],
        rawContext: {
          inventoryStatus: event.hotelSnapshot?.inventoryStatus,
          dayOfWeek: event.temporalContext?.dayOfWeek,
          isHoliday: event.temporalContext?.isHoliday,
          competitorAvgPrice: event.competitorSnapshot?.marketAvgPrice,
        },
      },
      humanAction: {
        action: event.priceChange.trigger === 'auto' ? 'accept' : 'modify',
        userId: event.priceChange.userId,
      },
      outcome: event.outcome ? {
        success: event.outcome.result72h?.sold || false,
        metrics: {
          timeToSold: event.outcome.result72h?.timeToSold || 0,
          transactionPrice: event.outcome.result72h?.transactionPrice || 0,
        },
        trackedAt: event.outcome.outcomeTimestamp,
      } : undefined,
      tags: this.extractPricingTags(event),
      learningValue: this.calculatePricingLearningValue(event),
      source: 'pricing',
      sourceId: event.id,
    };
  }

  private transformKnowledgeCase(entry: AIKnowledgeEntry): UnifiedCase {
    return {
      id: entry.id,
      type: entry.type,
      status: entry.status,
      hotelId: entry.hotelId,
      hotelName: entry.hotelName,
      timestamp: entry.timestamp,
      aiDecision: entry.aiOutput,
      context: {
        features: entry.input.features,
        rawContext: entry.input.context,
      },
      humanAction: entry.humanAction,
      outcome: entry.outcome,
      tags: entry.tags,
      learningValue: entry.learningValue,
      source: 'knowledge',
      sourceId: entry.id,
    };
  }

  private extractPricingTags(event: PricingDecisionEvent): string[] {
    const tags: string[] = ['定价'];
    
    if (event.temporalContext?.dayOfWeek === 0 || event.temporalContext?.dayOfWeek === 6) {
      tags.push('周末');
    }
    
    if (event.hotelSnapshot?.inventoryStatus === 'tight') {
      tags.push('库存紧张');
    }
    
    if (event.aiSuggestion && event.aiSuggestion.confidence > 0.8) {
      tags.push('高置信度');
    }

    return tags;
  }

  private calculatePricingLearningValue(event: PricingDecisionEvent): number {
    let value = 50;
    
    if (event.aiSuggestion) {
      value += event.aiSuggestion.confidence * 30;
    }
    
    if (event.outcome?.result72h?.sold) {
      value += 20;
    }

    return Math.min(100, Math.round(value));
  }

  private calculateTrend(cases: UnifiedCase[]): KnowledgeStats['trend'] {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayCases = cases.filter(c => c.timestamp.startsWith(date));
      const successCases = dayCases.filter(c => c.status === 'success');
      
      return {
        date,
        count: dayCases.length,
        successRate: dayCases.length > 0 ? successCases.length / dayCases.length : 0,
      };
    });
  }
}

// ============================================
// 单例导出
// ============================================

export const unifiedKnowledgeService = new UnifiedKnowledgeService();
