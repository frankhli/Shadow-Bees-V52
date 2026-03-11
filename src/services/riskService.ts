/**
 * 风控服务
 * 整合所有风控检查逻辑
 */

import type {
  SensitiveWordCheckResult,
  SimilarityCheckResult,
  AdLawCheckResult,
  PriceComplianceResult,
  PublishRateLimit,
  PlatformHealth,
  Platform,
  RiskCheckResult,
  RiskCheckParams,
  RiskLevel,
} from '@/types/risk';

// 敏感词库（实际应从后端获取）
const SENSITIVE_WORDS: Record<string, { word: string; replacement: string; severity: 'high' | 'medium' | 'low' }[]> = {
  xiaohongshu: [
    { word: '微信', replacement: '丝❤', severity: 'high' },
    { word: 'VX', replacement: '联系', severity: 'high' },
    { word: '二维码', replacement: '扫码', severity: 'high' },
    { word: '私信', replacement: '联系', severity: 'medium' },
    { word: '加V', replacement: '联系', severity: 'high' },
    { word: '最低价', replacement: '内部价', severity: 'medium' },
    { word: '全网最低', replacement: '优惠价', severity: 'medium' },
    { word: '最便宜', replacement: '很划算', severity: 'low' },
    { word: '第一', replacement: '优质', severity: 'medium' },
    { word: '顶级', replacement: '高端', severity: 'low' },
    { word: '最好', replacement: '优质', severity: 'medium' },
  ],
  xianyu: [
    { word: '加V', replacement: '联系', severity: 'high' },
    { word: '券', replacement: '优惠', severity: 'medium' },
    { word: '转让', replacement: '代订', severity: 'medium' },
    { word: '票', replacement: '房间', severity: 'low' },
    { word: '微信', replacement: '联系', severity: 'high' },
    { word: '二维码', replacement: '图片', severity: 'high' },
  ],
  wechat: [
    { word: '转账', replacement: '付款', severity: 'medium' },
    { word: '支付宝', replacement: '支付', severity: 'low' },
  ],
};

// 广告法违规词
const AD_LAW_VIOLATIONS = [
  { word: '第一', rule: '绝对化用语', severity: 'high' },
  { word: '最佳', rule: '绝对化用语', severity: 'high' },
  { word: '最好', rule: '绝对化用语', severity: 'high' },
  { word: '顶级', rule: '绝对化用语', severity: 'high' },
  { word: '国家级', rule: '绝对化用语', severity: 'high' },
  { word: '最高级', rule: '绝对化用语', severity: 'high' },
  { word: '唯一', rule: '绝对化用语', severity: 'high' },
  { word: '最低价', rule: '价格承诺', severity: 'medium' },
  { word: '全网最低', rule: '价格承诺', severity: 'medium' },
  { word: '保证', rule: '过度承诺', severity: 'medium' },
  { word: '永久', rule: '时间承诺', severity: 'medium' },
  { word: '秒杀', rule: '夸大宣传', severity: 'low' },
];

// 平台发布限制
const PLATFORM_LIMITS: Record<'xiaohongshu' | 'xianyu' | 'wechat', { dailyLimit: number; minInterval: number }> = {
  xiaohongshu: { dailyLimit: 3, minInterval: 4 * 60 * 60 * 1000 },
  xianyu: { dailyLimit: 5, minInterval: 2 * 60 * 60 * 1000 },
  wechat: { dailyLimit: 2, minInterval: 8 * 60 * 60 * 1000 },
};

// 生成稳定的伪随机数（基于种子）
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// 获取今日日期字符串（用于缓存）
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// 风控数据缓存
const riskDataCache: Map<string, PlatformHealth> = new Map();

export class RiskService {
  private static instance: RiskService;
  
  private constructor() {}
  
  static getInstance(): RiskService {
    if (!RiskService.instance) {
      RiskService.instance = new RiskService();
    }
    return RiskService.instance;
  }

  /**
   * 执行完整风控检查
   */
  async checkAll(params: RiskCheckParams): Promise<RiskCheckResult> {
    const checks: RiskCheckResult['checks'] = {
      sensitiveWords: await this.checkSensitiveWords(params.content, params.platform),
      similarity: await this.checkSimilarity(params.content, params.hotelId),
      adLaw: await this.checkAdLaw(params.content),
      price: params.price && params.basePrice 
        ? await this.checkPrice(params.price, params.basePrice)
        : null,
      rateLimit: await this.checkRateLimit(params.platform, params.hotelId),
    };

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(checks);
    
    // 生成处理建议
    const suggestions = this.generateSuggestions(checks);

    return {
      riskLevel,
      canPublish: riskLevel !== 'high' && checks.rateLimit?.canPublish !== false,
      checks,
      suggestions,
    };
  }

  /**
   * 敏感词检测
   */
  async checkSensitiveWords(content: string, platform: Platform): Promise<SensitiveWordCheckResult> {
    const violations: SensitiveWordCheckResult['violations'] = [];
    let processedContent = content;
    
    const platformWords = SENSITIVE_WORDS[platform] || [];
    
    platformWords.forEach(({ word, replacement, severity }) => {
      const regex = new RegExp(word, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        violations.push({
          word: match[0],
          position: [match.index, match.index + match[0].length],
          severity,
          suggestion: replacement
        });
        
        if (severity !== 'high') {
          processedContent = processedContent.replace(regex, replacement);
        }
      }
    });

    return {
      hasViolation: violations.length > 0,
      violations: violations.sort((a, b) => b.severity.localeCompare(a.severity)),
      processedContent
    };
  }

  /**
   * 相似度检测
   */
  async checkSimilarity(_content: string, _hotelId: string): Promise<SimilarityCheckResult> {
    // 模拟从历史内容中检测
    // 实际应调用API获取酒店历史内容
    const similarity = Math.random() * 0.3; // 模拟低相似度
    
    return {
      similarity,
      threshold: 0.75,
      isViolation: similarity >= 0.75,
      similarContents: []
    };
  }

  /**
   * 广告法检测
   */
  async checkAdLaw(content: string): Promise<AdLawCheckResult> {
    const violations: AdLawCheckResult['violations'] = [];
    let passed = 0;
    
    AD_LAW_VIOLATIONS.forEach(({ word, rule }) => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(content)) {
        violations.push({
          rule,
          violation: `${word} - 违反广告法`,
          suggestion: '请使用更客观的描述'
        });
      }
    });

    const total = 4; // 4个检查项
    passed = total - Math.min(violations.length, total);
    const score = Math.round((passed / total) * 100);

    return {
      score,
      violations,
      compliant: { passed, total },
      isCompliant: violations.length === 0
    };
  }

  /**
   * 价格合规检测
   */
  async checkPrice(price: number, basePrice: number, minDiscount = 0.7, maxMarkup = 1.25): Promise<PriceComplianceResult> {
    const minPrice = basePrice * minDiscount;
    const maxPrice = basePrice * maxMarkup;
    
    const isValid = price >= minPrice && price <= maxPrice;
    
    let suggestion = '';
    if (price < minPrice) {
      suggestion = `价格过低，建议不低于¥${minPrice.toFixed(0)}`;
    } else if (price > maxPrice) {
      suggestion = `价格偏高，建议不超过¥${maxPrice.toFixed(0)}`;
    } else {
      suggestion = '价格合规';
    }

    return {
      isValid,
      minPrice,
      maxPrice,
      currentPrice: price,
      basePrice,
      suggestion,
      isTooLow: price < minPrice,
      isTooHigh: price > maxPrice
    };
  }

  /**
   * 发布频率检测
   */
  async checkRateLimit(platform: Platform, _hotelId: string): Promise<PublishRateLimit> {
    const config = PLATFORM_LIMITS[platform];
    
    // 模拟今日发布次数（实际应从API获取）
    const todayCount = Math.floor(Math.random() * config.dailyLimit);
    const remainingQuota = config.dailyLimit - todayCount;
    
    return {
      platform,
      dailyQuota: config.dailyLimit,
      remainingQuota,
      canPublish: remainingQuota > 0,
    };
  }

  /**
   * 获取账户健康度
   * 使用基于hotelId和日期的稳定随机数，同一天内分数保持不变
   */
  async getAccountHealth(platform: Platform, hotelId: string): Promise<PlatformHealth> {
    const platformNames: Record<'xiaohongshu' | 'xianyu' | 'wechat', string> = {
      xiaohongshu: '小红书',
      xianyu: '闲鱼',
      wechat: '微信',
    };

    // 缓存键：酒店ID + 平台 + 日期
    const cacheKey = `${hotelId}-${platform}-${getTodayKey()}`;
    
    // 检查缓存
    const cached = riskDataCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 生成稳定的随机数（基于hotelId和日期）
    const seed = `${hotelId}-${platform}-${getTodayKey()}`;
    const randomScore = seededRandom(seed);
    
    // 生成60-100的分数
    const score = Math.floor(randomScore * 40) + 60;
    
    let status: PlatformHealth['status'] = 'healthy';
    if (score < 70) status = 'danger';
    else if (score < 85) status = 'warning';
    
    // 生成其他稳定数据
    const violations = Math.floor(seededRandom(`${seed}-violations`) * 5);
    const remainingQuota = Math.floor(seededRandom(`${seed}-quota`) * 3) + 1;

    const health: PlatformHealth = {
      platform,
      platformName: platformNames[platform],
      score,
      status,
      violations,
      remainingQuota,
    };
    
    // 存入缓存
    riskDataCache.set(cacheKey, health);
    
    return health;
  }

  /**
   * 清除缓存（用于测试或每日重置）
   */
  clearCache(): void {
    riskDataCache.clear();
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(checks: RiskCheckResult['checks']): RiskLevel {
    let score = 100;

    // 敏感词扣分
    if (checks.sensitiveWords.hasViolation) {
      const highRiskCount = checks.sensitiveWords.violations.filter(v => v.severity === 'high').length;
      score -= highRiskCount * 30;
      score -= (checks.sensitiveWords.violations.length - highRiskCount) * 10;
    }

    // 相似度扣分
    if (checks.similarity.isViolation) {
      score -= 25;
    }

    // 广告法扣分
    if (!checks.adLaw.isCompliant) {
      score -= checks.adLaw.violations.length * 15;
    }

    // 价格扣分
    if (checks.price && !checks.price.isValid) {
      score -= 20;
    }

    // 频率限制
    if (checks.rateLimit && !checks.rateLimit.canPublish) {
      score -= 50;
    }

    if (score >= 80) return 'low';
    if (score >= 50) return 'medium';
    return 'high';
  }

  /**
   * 生成处理建议
   */
  private generateSuggestions(checks: RiskCheckResult['checks']): string[] {
    const suggestions: string[] = [];

    if (checks.sensitiveWords.hasViolation) {
      const highRisk = checks.sensitiveWords.violations.filter(v => v.severity === 'high');
      if (highRisk.length > 0) {
        suggestions.push(`存在${highRisk.length}个高风险敏感词，请修改后再发布`);
      } else {
        suggestions.push('存在敏感词，建议参考替换方案修改');
      }
    }

    if (checks.similarity.isViolation) {
      suggestions.push('与历史内容相似度过高，建议调整文案关键词或角度');
    }

    if (!checks.adLaw.isCompliant) {
      suggestions.push('存在广告法违规词汇，建议使用客观描述');
    }

    if (checks.price && !checks.price.isValid) {
      if (checks.price.isTooLow) {
        suggestions.push(`价格过低，平台可能限流，建议不低于¥${checks.price.minPrice.toFixed(0)}`);
      } else {
        suggestions.push(`价格偏高，可能影响转化率，建议不超过¥${checks.price.maxPrice.toFixed(0)}`);
      }
    }

    if (checks.rateLimit && !checks.rateLimit.canPublish) {
      if (checks.rateLimit.remainingQuota === 0) {
        suggestions.push('今日发布配额已用完，建议明日再发布');
      } else {
        suggestions.push('发布频率过快，请等待冷却时间后再发布');
      }
    }

    return suggestions;
  }
}

export const riskService = RiskService.getInstance();
