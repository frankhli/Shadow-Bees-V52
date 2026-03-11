/**
 * 算法优化引擎（管理端）
 * 基于定价事件数据优化算法模板和酒店画像
 */

import { pricingDataCollector, type PricingDecisionEvent } from './pricingDataCollector';

import type { HotelPricingProfile } from '@/types';

// ============================================================
// 优化配置
// ============================================================

const OPTIMIZATION_CONFIG = {
  // 最小样本数，低于此数量不优化
  minSampleSize: 10,
  // 学习率
  learningRate: 0.1,
  // 价格调整步长
  priceStep: 5,
  // 置信度阈值
  confidenceThreshold: 0.7,
};

// ============================================================
// 优化结果类型
// ============================================================

export interface OptimizationResult {
  timestamp: string;
  hotelId?: string;
  templateId?: string;
  
  // 优化建议
  suggestions: Array<{
    type: 'price_adjustment' | 'channel_reallocation' | 'inventory_adjustment' | 'template_update';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImprovement: number; // 预期收益提升百分比
    currentValue: number;
    suggestedValue: number;
    reasoning: string;
  }>;

  // 学习摘要
  learning: {
    totalEvents: number;
    successRate: number;
    avgPriceDeviation: number;
    bestPerformingChannel: string;
    worstPerformingChannel: string;
  };
}

// ============================================================
// 算法优化引擎
// ============================================================

export class AlgorithmOptimizer {
  private hotelProfiles: Map<string, HotelPricingProfile> = new Map();

  /**
   * 基于酒店历史数据生成优化建议
   */
  async optimizeForHotel(hotelId: string): Promise<OptimizationResult> {
    // 获取该酒店的所有定价事件
    const events = await pricingDataCollector.getHotelPricingHistory(hotelId);
    
    if (events.length < OPTIMIZATION_CONFIG.minSampleSize) {
      return {
        timestamp: new Date().toISOString(),
        hotelId,
        suggestions: [],
        learning: {
          totalEvents: events.length,
          successRate: 0,
          avgPriceDeviation: 0,
          bestPerformingChannel: '',
          worstPerformingChannel: '',
        },
      };
    }

    // 过滤已完成的事件
    const completedEvents = events.filter(e => e.processingStatus === 'completed' && e.outcome);
    
    if (completedEvents.length < OPTIMIZATION_CONFIG.minSampleSize) {
      return {
        timestamp: new Date().toISOString(),
        hotelId,
        suggestions: [{
          type: 'template_update',
          priority: 'low',
          description: '数据收集中，请等待更多成交结果',
          expectedImprovement: 0,
          currentValue: 0,
          suggestedValue: 0,
          reasoning: `已收集 ${events.length} 条定价事件，${completedEvents.length} 条有成交结果，需要至少 ${OPTIMIZATION_CONFIG.minSampleSize} 条才能生成可靠建议`,
        }],
        learning: {
          totalEvents: events.length,
          successRate: 0,
          avgPriceDeviation: 0,
          bestPerformingChannel: '',
          worstPerformingChannel: '',
        },
      };
    }

    // 分析表现
    const analysis = this.analyzePerformance(completedEvents);
    
    // 生成建议
    const suggestions = this.generateSuggestions(hotelId, completedEvents, analysis);

    // 更新酒店画像
    this.updateHotelProfile(hotelId, completedEvents, analysis);

    return {
      timestamp: new Date().toISOString(),
      hotelId,
      suggestions,
      learning: {
        totalEvents: completedEvents.length,
        successRate: analysis.successRate,
        avgPriceDeviation: analysis.avgPriceDeviation,
        bestPerformingChannel: analysis.bestChannel,
        worstPerformingChannel: analysis.worstChannel,
      },
    };
  }

  /**
   * 全局模板优化（基于所有酒店数据）
   */
  async optimizeGlobalTemplates(): Promise<OptimizationResult> {
    // 获取所有事件（简化实现，实际应该聚合所有酒店）
    const allEvents: PricingDecisionEvent[] = [];
    
    // 从 IndexedDB 读取所有事件
    const DB_NAME = 'ShadowBeesAdminDB';
    const STORE_NAME = 'pricing_events';

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAll = store.getAll();

        getAll.onsuccess = () => {
          allEvents.push(...getAll.result);
          resolve();
        };
        getAll.onerror = () => reject(getAll.error);
      };
    });

    const completedEvents = allEvents.filter(e => e.processingStatus === 'completed' && e.outcome);
    
    const suggestions: OptimizationResult['suggestions'] = [];

    // 按模板类型分组分析
    const templateGroups = this.groupByTemplate(completedEvents);
    
    Object.entries(templateGroups).forEach(([templateId, events]) => {
      const analysis = this.analyzePerformance(events);
      
      // 如果模板表现不佳，建议调整
      if (analysis.successRate < 0.6) {
        suggestions.push({
          type: 'template_update',
          priority: 'high',
          description: `模板 "${templateId}" 成交率较低，建议调整参数`,
          expectedImprovement: (0.6 - analysis.successRate) * 20,
          currentValue: analysis.successRate,
          suggestedValue: 0.6,
          reasoning: `该模板成交率仅 ${(analysis.successRate * 100).toFixed(1)}%，低于目标 60%，建议调整价格系数和库存响应策略`,
        });
      }

      // 分析价格偏差
      if (analysis.avgPriceDeviation > 20) {
        suggestions.push({
          type: 'price_adjustment',
          priority: 'medium',
          description: '建议调整基准价格区间',
          expectedImprovement: 8,
          currentValue: analysis.avgPrice,
          suggestedValue: analysis.optimalPrice,
          reasoning: `当前价格与最优价平均偏差 ${analysis.avgPriceDeviation.toFixed(0)} 元，调整后预计提升收益 8%`,
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      suggestions,
      learning: {
        totalEvents: completedEvents.length,
        successRate: completedEvents.length > 0 
          ? completedEvents.filter(e => e.outcome?.result72h.sold).length / completedEvents.length 
          : 0,
        avgPriceDeviation: 0,
        bestPerformingChannel: this.findBestChannel(completedEvents),
        worstPerformingChannel: this.findWorstChannel(completedEvents),
      },
    };
  }

  /**
   * 分析表现数据
   */
  private analyzePerformance(events: PricingDecisionEvent[]) {
    const soldCount = events.filter(e => e.outcome?.result72h.sold).length;
    const successRate = soldCount / events.length;

    // 计算价格偏差
    let totalDeviation = 0;
    let optimalPriceSum = 0;
    let actualPriceSum = 0;

    events.forEach(e => {
      if (e.outcome) {
        totalDeviation += Math.abs(e.outcome.learningLabels.optimalPriceDelta);
        optimalPriceSum += e.priceChange.newPrice + e.outcome.learningLabels.optimalPriceDelta;
        actualPriceSum += e.priceChange.newPrice;
      }
    });

    const avgPriceDeviation = totalDeviation / events.length;
    const avgPrice = actualPriceSum / events.length;
    const optimalPrice = optimalPriceSum / events.length;

    // 渠道分析
    const channelStats: Record<string, { revenue: number; count: number }> = {};
    
    events.forEach(e => {
      if (e.outcome) {
        Object.entries(e.outcome.channelResults).forEach(([channel, result]) => {
          if (!channelStats[channel]) {
            channelStats[channel] = { revenue: 0, count: 0 };
          }
          channelStats[channel].revenue += result.netRevenue;
          channelStats[channel].count += result.quantity;
        });
      }
    });

    // 找出最佳和最差渠道
    let bestChannel = '';
    let worstChannel = '';
    let maxRevenue = 0;
    let minRevenue = Infinity;

    Object.entries(channelStats).forEach(([channel, stats]) => {
      if (stats.revenue > maxRevenue) {
        maxRevenue = stats.revenue;
        bestChannel = channel;
      }
      if (stats.revenue < minRevenue && stats.count > 0) {
        minRevenue = stats.revenue;
        worstChannel = channel;
      }
    });

    return {
      successRate,
      avgPriceDeviation,
      avgPrice,
      optimalPrice,
      bestChannel,
      worstChannel,
      channelStats,
    };
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(
    _hotelId: string,
    events: PricingDecisionEvent[],
    analysis: ReturnType<typeof this.analyzePerformance>
  ): OptimizationResult['suggestions'] {
    const suggestions: OptimizationResult['suggestions'] = [];

    // 1. 价格调整建议
    if (analysis.avgPriceDeviation > OPTIMIZATION_CONFIG.priceStep) {
      const direction = analysis.optimalPrice > analysis.avgPrice ? '上调' : '下调';
      suggestions.push({
        type: 'price_adjustment',
        priority: 'high',
        description: `建议${direction}基准价格`,
        expectedImprovement: Math.min(15, analysis.avgPriceDeviation / 10),
        currentValue: Math.round(analysis.avgPrice),
        suggestedValue: Math.round(analysis.optimalPrice),
        reasoning: `基于 ${events.length} 次定价事件分析，当前价格与最优价格平均偏差 ${Math.round(analysis.avgPriceDeviation)} 元，${direction}后可提升成交率和收益`,
      });
    }

    // 2. 渠道重新分配建议
    if (analysis.bestChannel && analysis.worstChannel && analysis.bestChannel !== analysis.worstChannel) {
      const bestRevenue = analysis.channelStats[analysis.bestChannel]?.revenue || 0;
      const worstRevenue = analysis.channelStats[analysis.worstChannel]?.revenue || 0;
      
      if (bestRevenue > worstRevenue * 1.5) {
        suggestions.push({
          type: 'channel_reallocation',
          priority: 'medium',
          description: `建议增加 "${analysis.bestChannel}" 渠道库存分配`,
          expectedImprovement: 10,
          currentValue: 50, // 假设当前分配50%
          suggestedValue: 70,
          reasoning: `"${analysis.bestChannel}" 渠道收益表现优异，是 "${analysis.worstChannel}" 的 ${(bestRevenue / Math.max(1, worstRevenue)).toFixed(1)} 倍，建议调整库存分配比例`,
        });
      }
    }

    // 3. 库存调整建议
    const highPriceEvents = events.filter(e => e.priceChange.newPrice > analysis.avgPrice * 1.2);
    const highPriceSoldRate = highPriceEvents.filter(e => e.outcome?.result72h.sold).length / Math.max(1, highPriceEvents.length);
    
    if (highPriceSoldRate < 0.3) {
      suggestions.push({
        type: 'inventory_adjustment',
        priority: 'medium',
        description: '高价房型库存释放策略优化',
        expectedImprovement: 12,
        currentValue: 24,
        suggestedValue: 48,
        reasoning: `高价房型成交率仅 ${(highPriceSoldRate * 100).toFixed(0)}%，建议提前 48 小时释放库存给灵活渠道，而非 24 小时`,
      });
    }

    // 4. AI 建议接受度分析
    const aiSuggestedEvents = events.filter(e => e.aiSuggestion);
    const acceptedAiEvents = aiSuggestedEvents.filter(e => 
      e.outcome?.learningLabels.shouldHaveAcceptedAi
    );
    
    if (aiSuggestedEvents.length > 0) {
      const acceptanceRate = acceptedAiEvents.length / aiSuggestedEvents.length;
      if (acceptanceRate < 0.5) {
        suggestions.push({
          type: 'template_update',
          priority: 'low',
          description: '提升 AI 建议可信度',
          expectedImprovement: 5,
          currentValue: acceptanceRate * 100,
          suggestedValue: 70,
          reasoning: `AI 建议正确率仅 ${(acceptanceRate * 100).toFixed(0)}%，建议增加更多历史数据训练，或调整置信度阈值`,
        });
      }
    }

    return suggestions;
  }

  /**
   * 更新酒店画像
   */
  private updateHotelProfile(
    hotelId: string,
    events: PricingDecisionEvent[],
    analysis: ReturnType<typeof this.analyzePerformance>
  ): void {
    // 计算AI定价和自主定价的统计数据
    const aiEvents = events.filter(e => e.aiSuggestion);
    const selfEvents = events.filter(e => !e.aiSuggestion);
    // 从渠道结果计算总收入
    const aiRevenue = aiEvents.reduce((sum, e) => 
      sum + Object.values(e.outcome?.channelResults || {}).reduce((s, c) => s + c.revenue, 0), 0);
    const selfRevenue = selfEvents.reduce((sum, e) => 
      sum + Object.values(e.outcome?.channelResults || {}).reduce((s, c) => s + c.revenue, 0), 0);
    const aiStaleCount = aiEvents.filter(e => !e.outcome?.result72h.sold).length;
    const selfStaleCount = selfEvents.filter(e => !e.outcome?.result72h.sold).length;
    
    const profile: HotelPricingProfile = {
      hotelId,
      hotelName: hotelId, // 临时值，会被实际酒店名称覆盖
      totalSuggestions: aiEvents.length,
      acceptedCount: aiEvents.filter(e => e.outcome?.learningLabels.shouldHaveAcceptedAi).length,
      ignoredCount: aiEvents.filter(e => !e.outcome?.learningLabels.shouldHaveAcceptedAi).length,
      autoPricingEnabled: false,
      aiPricingAvgRevenue: aiRevenue / Math.max(1, aiEvents.length),
      selfPricingAvgRevenue: selfRevenue / Math.max(1, selfEvents.length),
      aiPricingStaleRate: aiStaleCount / Math.max(1, aiEvents.length),
      selfPricingStaleRate: selfStaleCount / Math.max(1, selfEvents.length),
      priceElasticity: this.calculatePriceElasticity(events),
      avgPremiumOverCompetitor: 0, // 需要额外计算
      premiumConversionRate: 0, // 需要额外计算
      pricingStyle: 'mixed',
      lastUpdated: new Date().toISOString(),
    };

    // 原有代码保留，但不赋值给 profile
    const pricingBehavior = {
      avgPriceChangeFrequency: events.length / 30, // 假设30天
      priceElasticity: this.calculatePriceElasticity(events),
      preferredAdjustmentTime: this.findPreferredAdjustmentTime(events),
      confidenceInAI: events.filter(e => e.aiSuggestion && e.outcome?.learningLabels.shouldHaveAcceptedAi).length / Math.max(1, events.filter(e => e.aiSuggestion).length),
    };

    // 渠道偏好
    const channelPreferences = Object.entries(analysis.channelStats).map(([channel, stats]) => ({
      channel,
      preferenceScore: stats.revenue / Math.max(1, stats.count),
      conversionRate: stats.count / events.length,
    }));

    // 最优策略参数 - 保留但不存入 profile
    const optimalParams = {
      baseMarkup: (analysis.optimalPrice - analysis.avgPrice) / analysis.avgPrice,
      inventoryThresholds: {
        tight: 0.1,
        normal: 0.3,
        abundant: 0.5,
      },
      eventResponseMultiplier: 1.2,
    };

    // 学习积累
    const learning = {
      totalDecisions: events.length,
      successfulDecisions: events.filter(e => e.outcome?.result72h.sold).length,
      revenueOptimized: analysis.channelStats[analysis.bestChannel]?.revenue || 0,
    };

    // 存储完整画像数据
    const fullProfile = { ...profile, pricingBehavior, channelPreferences, optimalParams, learning };

    this.hotelProfiles.set(hotelId, profile);
    
    // 保存到 localStorage (存储完整数据)
    try {
      const profiles = JSON.parse(localStorage.getItem('sb_hotel_profiles') || '{}');
      profiles[hotelId] = fullProfile;
      localStorage.setItem('sb_hotel_profiles', JSON.stringify(profiles));
    } catch {
      // ignore
    }
  }

  /**
   * 计算价格弹性
   */
  private calculatePriceElasticity(events: PricingDecisionEvent[]): number {
    // 简化计算：价格变化与成交量变化的比率
    const priceChanges = events.map(e => ({
      priceChange: (e.priceChange.newPrice - e.priceChange.oldPrice) / e.priceChange.oldPrice,
      sold: e.outcome?.result72h.sold ? 1 : 0,
    }));

    if (priceChanges.length < 2) return -1;

    // 计算相关系数（简化版）
    const avgPriceChange = priceChanges.reduce((sum, p) => sum + p.priceChange, 0) / priceChanges.length;
    const avgSold = priceChanges.reduce((sum, p) => sum + p.sold, 0) / priceChanges.length;

    let numerator = 0;
    let denominator = 0;

    priceChanges.forEach(p => {
      numerator += (p.priceChange - avgPriceChange) * (p.sold - avgSold);
      denominator += Math.pow(p.priceChange - avgPriceChange, 2);
    });

    return denominator === 0 ? -1 : numerator / denominator;
  }

  /**
   * 找出最优调价时间
   */
  private findPreferredAdjustmentTime(events: PricingDecisionEvent[]): number {
    const hourCounts: Record<number, number> = {};
    
    events.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let maxHour = 9; // 默认上午9点
    let maxCount = 0;

    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = parseInt(hour);
      }
    });

    return maxHour;
  }

  /**
   * 按模板分组
   */
  private groupByTemplate(events: PricingDecisionEvent[]): Record<string, PricingDecisionEvent[]> {
    const groups: Record<string, PricingDecisionEvent[]> = {};
    
    // 简化：按酒店类型分组（实际应该关联到具体模板）
    events.forEach(e => {
      const key = e.hotelId || 'default';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(e);
    });

    return groups;
  }

  /**
   * 找出最佳渠道
   */
  private findBestChannel(events: PricingDecisionEvent[]): string {
    const channelRevenue: Record<string, number> = {};
    
    events.forEach(e => {
      if (e.outcome) {
        Object.entries(e.outcome.channelResults).forEach(([channel, result]) => {
          channelRevenue[channel] = (channelRevenue[channel] || 0) + result.netRevenue;
        });
      }
    });

    let bestChannel = '';
    let maxRevenue = 0;

    Object.entries(channelRevenue).forEach(([channel, revenue]) => {
      if (revenue > maxRevenue) {
        maxRevenue = revenue;
        bestChannel = channel;
      }
    });

    return bestChannel;
  }

  /**
   * 找出最差渠道
   */
  private findWorstChannel(events: PricingDecisionEvent[]): string {
    const channelRevenue: Record<string, number> = {};
    
    events.forEach(e => {
      if (e.outcome) {
        Object.entries(e.outcome.channelResults).forEach(([channel, result]) => {
          channelRevenue[channel] = (channelRevenue[channel] || 0) + result.netRevenue;
        });
      }
    });

    let worstChannel = '';
    let minRevenue = Infinity;

    Object.entries(channelRevenue).forEach(([channel, revenue]) => {
      if (revenue < minRevenue && revenue > 0) {
        minRevenue = revenue;
        worstChannel = channel;
      }
    });

    return worstChannel;
  }

  /**
   * 获取酒店画像
   */
  getHotelProfile(hotelId: string): HotelPricingProfile | undefined {
    // 先查内存
    if (this.hotelProfiles.has(hotelId)) {
      return this.hotelProfiles.get(hotelId);
    }

    // 再查 localStorage
    try {
      const profiles = JSON.parse(localStorage.getItem('sb_hotel_profiles') || '{}');
      return profiles[hotelId];
    } catch {
      return undefined;
    }
  }

  /**
   * 获取所有酒店画像
   */
  getAllHotelProfiles(): HotelPricingProfile[] {
    try {
      const profiles = JSON.parse(localStorage.getItem('sb_hotel_profiles') || '{}');
      return Object.values(profiles);
    } catch {
      return [];
    }
  }
}

// 单例导出
export const algorithmOptimizer = new AlgorithmOptimizer();
