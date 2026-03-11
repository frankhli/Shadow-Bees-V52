/**
 * 策略生成器
 * 从成功案例中提取策略，生成可下发的 ConfigPackage
 * 
 * 商业逻辑：
 * 1. 运营人员在知识沉淀页面选择成功案例
 * 2. 点击"生成配置"，系统自动提炼策略参数
 * 3. 人工预览/编辑后，导入ConfigManager
 * 4. 推送到酒店端，AI行为更新
 */

import type { ConfigPackage, PricingTemplateConfig, ContentTemplateConfig, ServiceResponseConfig } from '@/types/remoteConfig';
import type { UnifiedCase } from './unifiedKnowledgeService';

// ============================================
// 生成参数
// ============================================

export interface StrategyGenerateParams {
  name: string;
  description?: string;
  caseIds: string[];           // 基于哪些案例
  targetType: 'all' | 'specific' | 'gray';
  targetHotelIds?: string[];
  grayPercent?: number;
}

// ============================================
// 策略生成器
// ============================================

export class StrategyGenerator {
  /**
   * 从案例生成配置包
   */
  generateConfig(cases: UnifiedCase[], params: StrategyGenerateParams): ConfigPackage {
    console.log('[StrategyGenerator] Generating config from', cases.length, 'cases');

    // 按类型分组
    const pricingCases = cases.filter(c => c.type === 'pricing');
    const contentCases = cases.filter(c => c.type === 'content');
    const serviceCases = cases.filter(c => c.type === 'service');

    const config: ConfigPackage = {
      id: `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version: this.generateVersion(),
      name: params.name,
      description: params.description || this.generateDescription(cases),
      
      // 标记来源
      source: 'knowledge',
      sourceInfo: {
        knowledgeCaseIds: params.caseIds,
        generatedAt: new Date().toISOString(),
        generatedBy: 'strategy-generator',
        caseCount: cases.length,
      },
      
      // 配置内容
      content: {
        // 定价配置
        ...(pricingCases.length > 0 && {
          priceMultipliers: this.extractPriceMultipliers(pricingCases),
          inventoryThresholds: this.extractInventoryThresholds(pricingCases),
          templates: this.extractPricingTemplates(pricingCases),
        }),
        
        // 内容配置
        ...(contentCases.length > 0 && {
          contentTemplates: this.extractContentTemplates(contentCases),
          contentGuidelines: this.extractContentGuidelines(contentCases),
        }),
        
        // 客服配置
        ...(serviceCases.length > 0 && {
          serviceResponses: this.extractServiceResponses(serviceCases),
          serviceGuidelines: this.extractServiceGuidelines(serviceCases),
        }),
      },
      
      // 生效范围
      target: {
        type: params.targetType,
        hotelIds: params.targetHotelIds,
        grayPercent: params.grayPercent,
      },
      
      // 元数据
      metadata: {
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        forceUpdate: false,
        restartRequired: false,
      },
    };

    return config;
  }

  /**
   * 预览配置效果
   */
  previewConfig(config: ConfigPackage): {
    estimatedImprovement: number;
    applicableHotels: number;
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
  } {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // 检查定价风险
    if (config.content.priceMultipliers) {
      const { eventMultiplier } = config.content.priceMultipliers;
      if (eventMultiplier > 2.0) {
        warnings.push('事件溢价倍数过高(>2.0)，可能导致客户流失');
        riskLevel = 'high';
      } else if (eventMultiplier > 1.5) {
        warnings.push('事件溢价倍数较高，建议小范围测试');
        riskLevel = 'medium';
      }
    }

    // 检查内容模板
    if (config.content.contentTemplates && config.content.contentTemplates.length < 3) {
      warnings.push('内容模板数量较少，建议补充更多成功案例');
    }

    // 基于来源案例数估算效果
    const caseCount = config.sourceInfo?.caseCount || 0;
    const estimatedImprovement = Math.min(15, caseCount * 0.5);

    return {
      estimatedImprovement,
      applicableHotels: config.target.type === 'all' ? 100 : (config.target.hotelIds?.length || 0),
      riskLevel,
      warnings,
    };
  }

  // ============================================
  // 定价策略提取
  // ============================================

  private extractPriceMultipliers(cases: UnifiedCase[]): ConfigPackage['content']['priceMultipliers'] {
    // 计算平均溢价倍数
    const acceptedCases = cases.filter(c => c.humanAction?.action === 'accept');
    
    let baseMarkup = 1.15;
    let eventMultiplier = 1.3;
    let inventoryMultiplier = 1.2;

    // 从成功案例中提取
    if (acceptedCases.length > 0) {
      const weekendCases = acceptedCases.filter(c => c.tags.includes('周末'));
      const inventoryCases = acceptedCases.filter(c => c.tags.includes('库存紧张'));

      if (weekendCases.length > 0) {
        // 周末案例的平均溢价
        eventMultiplier = 1.2 + (weekendCases.length / acceptedCases.length) * 0.3;
      }

      if (inventoryCases.length > 0) {
        // 库存紧张案例的平均溢价
        inventoryMultiplier = 1.1 + (inventoryCases.length / acceptedCases.length) * 0.4;
      }
    }

    return {
      baseMarkup: Math.round(baseMarkup * 100) / 100,
      eventMultiplier: Math.round(eventMultiplier * 100) / 100,
      inventoryMultiplier: Math.round(inventoryMultiplier * 100) / 100,
    };
  }

  private extractInventoryThresholds(cases: UnifiedCase[]): ConfigPackage['content']['inventoryThresholds'] {
    // 分析库存状态分布
    const tightCases = cases.filter(c => c.context.rawContext.inventoryStatus === 'tight');
    const normalCases = cases.filter(c => c.context.rawContext.inventoryStatus === 'normal');

    // 根据成功案例调整阈值
    const tightThreshold = tightCases.length > normalCases.length ? 0.15 : 0.1;
    const normalThreshold = 0.3;

    return {
      tight: tightThreshold,
      normal: normalThreshold,
      abundant: 0.5,
    };
  }

  private extractPricingTemplates(cases: UnifiedCase[]): PricingTemplateConfig[] {
    // 按酒店类型分组
    const byHotelType = this.groupBy(cases, c => c.context.rawContext.hotelType || 'default');

    return Object.entries(byHotelType).map(([type, typeCases], index) => {
      const acceptedCases = typeCases.filter(c => c.humanAction?.action === 'accept');
      const avgLearningValue = acceptedCases.reduce((sum, c) => sum + c.learningValue, 0) / (acceptedCases.length || 1);

      return {
        id: `tpl-${type}-${index}`,
        name: `${type}酒店定价模板`,
        baseStrategy: this.inferStrategy(typeCases),
        applicableTags: {
          property: [type],
        },
        params: {
          markupRange: [0.8, 1.5],
          priceElasticity: avgLearningValue / 100,
          responseSpeed: avgLearningValue > 80 ? 'fast' : 'normal',
        },
      };
    });
  }

  // ============================================
  // 内容策略提取
  // ============================================

  private extractContentTemplates(cases: UnifiedCase[]): ContentTemplateConfig[] {
    // 按平台+风格分组
    const byPlatformStyle = this.groupBy(cases, c => 
      `${c.context.rawContext.platform}-${c.context.rawContext.style}`
    );

    return Object.entries(byPlatformStyle)
      .filter(([, groupCases]) => groupCases.length >= 2) // 至少2个案例
      .map(([key, groupCases], index) => {
        const [platform, style] = key.split('-');
        const bestCase = groupCases.sort((a, b) => b.learningValue - a.learningValue)[0];
        
        return {
          id: `content-${platform}-${style}-${index}`,
          name: `${platform} ${style}风格模板`,
          platform: platform as any,
          style: style as any,
          template: bestCase.aiDecision.suggestion.text?.slice(0, 200) || '',
          placeholders: ['hotelName', 'price', 'highlights'],
          titleTemplate: bestCase.aiDecision.suggestion.title,
          hashtagRecommendations: bestCase.aiDecision.suggestion.hashtags || [],
          imageSuggestions: ['房间全景', '特色设施', '周边景观'],
          performance: {
            avgConversionRate: bestCase.outcome?.metrics.conversionRate || 0,
            usageCount: groupCases.length,
            avgImpressions: bestCase.outcome?.metrics.impressions || 0,
          },
        };
      });
  }

  private extractContentGuidelines(cases: UnifiedCase[]): ConfigPackage['content']['contentGuidelines'] {
    const byPlatform = this.groupBy(cases, c => c.context.rawContext.platform);

    return Object.entries(byPlatform).map(([platform, platformCases]) => {
      const highPerforming = platformCases.filter(c => (c.outcome?.metrics.conversionRate || 0) > 0.03);
      
      return {
        platform,
        style: platformCases[0]?.context.rawContext.style || 'default',
        bestPractices: highPerforming.length > 0 
          ? ['使用emoji', '突出性价比', '添加定位标签']
          : ['保持简洁', '突出卖点'],
        hashtagStrategy: {
          min: 5,
          max: 8,
          recommended: ['#酒店推荐', '#性价比', '#旅行'],
        },
      };
    });
  }

  // ============================================
  // 客服策略提取
  // ============================================

  private extractServiceResponses(cases: UnifiedCase[]): ServiceResponseConfig[] {
    const byIntent = this.groupBy(cases, c => c.context.rawContext.intent);

    return Object.entries(byIntent)
      .filter(([, intentCases]) => intentCases.length >= 2)
      .map(([intent, intentCases], index) => {
        const bestCase = intentCases.sort((a, b) => 
          (b.outcome?.metrics.customerSatisfaction || 0) - (a.outcome?.metrics.customerSatisfaction || 0)
        )[0];

        return {
          id: `service-${intent}-${index}`,
          intent,
          intentKeywords: [intent.replace('_', '')],
          response: bestCase.aiDecision.suggestion.reply || '',
          alternativeResponses: intentCases.slice(1, 3).map(c => 
            c.aiDecision.suggestion.reply
          ).filter(Boolean),
          contextRequired: ['hotelId'],
          performance: {
            avgSatisfaction: bestCase.outcome?.metrics.customerSatisfaction || 4,
            resolutionRate: bestCase.outcome?.metrics.resolutionRate || 0.8,
            usageCount: intentCases.length,
          },
        };
      });
  }

  private extractServiceGuidelines(cases: UnifiedCase[]): ConfigPackage['content']['serviceGuidelines'] {
    const byIntent = this.groupBy(cases, c => c.context.rawContext.intent);

    return Object.entries(byIntent).map(([intent, _intentCases], index) => ({
      intent,
      priority: index + 1,
      escalationThreshold: 0.6,
    }));
  }

  // ============================================
  // 辅助方法
  // ============================================

  private generateVersion(): string {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
  }

  private generateDescription(cases: UnifiedCase[]): string {
    const byType = this.groupBy(cases, c => c.type);
    const parts: string[] = [];
    
    if (byType.pricing?.length) parts.push(`定价${byType.pricing.length}例`);
    if (byType.content?.length) parts.push(`内容${byType.content.length}例`);
    if (byType.service?.length) parts.push(`客服${byType.service.length}例`);

    return `基于${cases.length}个成功案例生成：${parts.join('，')}`;
  }

  private inferStrategy(cases: UnifiedCase[]): PricingTemplateConfig['baseStrategy'] {
    const avgLearningValue = cases.reduce((sum, c) => sum + c.learningValue, 0) / cases.length;
    
    if (avgLearningValue > 85) return 'scalper';
    if (avgLearningValue > 70) return 'dynamic';
    return 'clearance';
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

// ============================================
// 单例导出
// ============================================

export const strategyGenerator = new StrategyGenerator();
