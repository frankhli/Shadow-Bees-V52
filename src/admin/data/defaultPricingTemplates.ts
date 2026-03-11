/**
 * 默认定价算法模板库
 * 根据酒店类型、地理位置生成多套算法
 */

import type { PricingAlgorithmTemplate } from '@/types';

// 模板1：CBD商务酒店 - 动态定价
export const cbdBusinessTemplate: PricingAlgorithmTemplate = {
  id: 'tpl-cbd-business-001',
  name: 'CBD商务酒店 - 动态定价模板',
  description: '适用于城市中心商务区酒店，工作日常态运营，周末适度降价',
  applicableTags: {
    location: { areaType: 'cbd', cityTier: 'tier1' },
    property: { type: 'business', tier: 'comfort' },
    customer: { primaryType: 'business', priceSensitivity: 'low' }
  },
  baseStrategy: 'dynamic',
  eventResponse: {
    eventTypes: {
      concert: {
        intensityFactor: { low: 1.1, medium: 1.3, high: 1.5 },
        timeWindow: { before: 24, during: 1.5, after: 0.9 }
      },
      exhibition: {
        intensityFactor: { low: 1.15, medium: 1.35, high: 1.6 },
        durationFactor: 0.95
      },
      holiday: {
        intensityFactor: { low: 1.1, medium: 1.25, high: 1.4 }
      }
    },
    stackingRule: 'max_only',
    maxStackingFactor: 1.8
  },
  inventoryResponse: {
    thresholds: {
      abundant: { priceFactor: 0.95, urgencyMessage: '限时特惠' },
      normal: { priceFactor: 1.0 },
      tight: { priceFactor: 1.15, urgencyMessage: '仅剩X间' },
      soldout: { priceFactor: 1.25, urgencyMessage: '最后机会' }
    },
    priceUpdateInterval: 60
  },
  platformStrategy: {
    xianyu: { baseDiscount: 0.9, highlight: '比酒店便宜' },
    xiaohongshu: { baseDiscount: 1.0, highlight: '商务优选', contentBonus: 0.1 },
    wechat: { baseDiscount: 0.85, highlight: '限时秒杀', flashSaleEnabled: true },
    ota: { baseDiscount: 1.0, priceMatch: 'competitor_avg' }
  },
  contentLinkage: {
    qualityTiers: {
      excellent: { score: 80, priceBonus: 0.15 },
      good: { score: 60, priceBonus: 0.08 },
      average: { score: 40, priceBonus: 0 },
      poor: { score: 0, priceBonus: -0.1 }
    },
    heatFactor: {
      viral: 1.2,
      trending: 1.1,
      stable: 1.0,
      declining: 0.9
    }
  },
  weatherFactor: {
    enabled: false,
    weatherImpacts: {
      sunny: { factor: 1.0, label: '晴天' },
      cloudy: { factor: 1.0, label: '多云' },
      rainy: { factor: 0.95, label: '雨天' },
      snowy: { factor: 0.9, label: '雪天' },
      foggy: { factor: 0.95, label: '雾霾' }
    },
    specialConditions: {
      heavyRainScenic: { factor: 0.8, label: '暴雨' },
      snowMountain: { factor: 1.0, label: '雪山晴天' },
      typhoon: { factor: 0.7, label: '台风' },
      aqiPoor: { threshold: 200, factor: 0.95, label: '重度雾霾' }
    },
    applicableHotelTypes: ['business']
  },
  membershipStrategy: {
    enabled: true,
    tierDiscounts: {
      regular: { discount: 0.95, label: '普通会员' },
      silver: { discount: 0.92, label: '银卡' },
      gold: { discount: 0.88, label: '金卡' },
      platinum: { discount: 0.85, label: '铂金' }
    },
    repeatCustomerBonus: {
      enabled: true,
      minPreviousStays: 3,
      discount: 0.95
    },
    memberOnlyPricing: {
      enabled: true,
      publicPricePremium: 0.15
    }
  },
  learningParams: {
    historicalPerformance: {
      avgRevenuePerRoom: 420,
      occupancyRate: 0.82,
      priceElasticity: 0.4,
      competitorWinRate: 0.65
    },
    autoTuneRules: {
      ifStaleRateGt: '0.3',
      ifOccupancyLt: '0.5',
      ifCompetitorWinRateLt: '0.4'
    }
  }
};

// 模板2：景区度假酒店 - 黄牛模式
export const scenicResortTemplate: PricingAlgorithmTemplate = {
  id: 'tpl-scenic-resort-001',
  name: '景区度假酒店 - 事件驱动溢价模板',
  description: '适用于景区周边度假酒店，事件驱动高溢价，天气敏感',
  applicableTags: {
    location: { areaType: 'scenic', viewType: 'mountain' },
    property: { type: 'resort', tier: 'premium' },
    customer: { primaryType: 'leisure', priceSensitivity: 'medium' }
  },
  baseStrategy: 'scalper',
  eventResponse: {
    eventTypes: {
      concert: {
        intensityFactor: { low: 1.3, medium: 1.6, high: 2.0 },
        timeWindow: { before: 48, during: 2.0, after: 0.8 }
      },
      holiday: {
        intensityFactor: { low: 1.2, medium: 1.5, high: 1.9 }
      },
      sports: {
        intensityFactor: { low: 1.2, medium: 1.5, high: 1.8 }
      }
    },
    stackingRule: 'max_only',
    maxStackingFactor: 2.5
  },
  inventoryResponse: {
    thresholds: {
      abundant: { priceFactor: 0.85, urgencyMessage: '特惠抢购' },
      normal: { priceFactor: 1.0 },
      tight: { priceFactor: 1.3, urgencyMessage: '热销中' },
      soldout: { priceFactor: 1.5, urgencyMessage: '即将售罄' }
    },
    priceUpdateInterval: 30
  },
  platformStrategy: {
    xianyu: { baseDiscount: 0.85, highlight: '超值套餐' },
    xiaohongshu: { baseDiscount: 1.05, highlight: '网红打卡', contentBonus: 0.15 },
    wechat: { baseDiscount: 0.8, highlight: '限时秒杀', flashSaleEnabled: true },
    ota: { baseDiscount: 0.95, priceMatch: 'competitor_avg' }
  },
  contentLinkage: {
    qualityTiers: {
      excellent: { score: 80, priceBonus: 0.2 },
      good: { score: 60, priceBonus: 0.1 },
      average: { score: 40, priceBonus: 0 },
      poor: { score: 0, priceBonus: -0.15 }
    },
    heatFactor: {
      viral: 1.4,
      trending: 1.2,
      stable: 1.0,
      declining: 0.85
    }
  },
  weatherFactor: {
    enabled: true,
    weatherImpacts: {
      sunny: { factor: 1.2, label: '晴天' },
      cloudy: { factor: 1.05, label: '多云' },
      rainy: { factor: 0.75, label: '雨天' },
      snowy: { factor: 1.3, label: '雪景' },
      foggy: { factor: 0.8, label: '雾霾' }
    },
    specialConditions: {
      heavyRainScenic: { factor: 0.6, label: '景区暴雨' },
      snowMountain: { factor: 1.5, label: '雪山晴天' },
      typhoon: { factor: 0.5, label: '台风' },
      aqiPoor: { threshold: 150, factor: 0.85, label: '中度雾霾' }
    },
    applicableHotelTypes: ['resort', 'scenic']
  },
  membershipStrategy: {
    enabled: true,
    tierDiscounts: {
      regular: { discount: 0.95, label: '普通会员' },
      silver: { discount: 0.9, label: '银卡' },
      gold: { discount: 0.85, label: '金卡' },
      platinum: { discount: 0.8, label: '铂金' }
    },
    repeatCustomerBonus: {
      enabled: true,
      minPreviousStays: 2,
      discount: 0.9
    },
    memberOnlyPricing: {
      enabled: false,
      publicPricePremium: 0.1
    }
  },
  learningParams: {
    historicalPerformance: {
      avgRevenuePerRoom: 680,
      occupancyRate: 0.68,
      priceElasticity: 0.8,
      competitorWinRate: 0.55
    },
    autoTuneRules: {
      ifStaleRateGt: '0.25',
      ifOccupancyLt: '0.4',
      ifCompetitorWinRateLt: '0.35'
    }
  }
};

// 模板3：郊区经济酒店 - 尾货清仓
export const suburbEconomyTemplate: PricingAlgorithmTemplate = {
  id: 'tpl-suburb-economy-001',
  name: '郊区经济酒店 - 快速清仓模板',
  description: '适用于郊区经济型酒店，价格敏感客群，快速周转策略',
  applicableTags: {
    location: { areaType: 'suburb', cityTier: 'tier2' },
    property: { type: 'chain', tier: 'economy' },
    customer: { primaryType: 'student', priceSensitivity: 'high' }
  },
  baseStrategy: 'clearance',
  eventResponse: {
    eventTypes: {
      concert: {
        intensityFactor: { low: 1.05, medium: 1.15, high: 1.25 },
        timeWindow: { before: 12, during: 1.2, after: 0.95 }
      },
      exhibition: {
        intensityFactor: { low: 1.05, medium: 1.1, high: 1.2 }
      }
    },
    stackingRule: 'additive',
    maxStackingFactor: 1.3
  },
  inventoryResponse: {
    thresholds: {
      abundant: { priceFactor: 0.8, urgencyMessage: '特价房' },
      normal: { priceFactor: 0.9 },
      tight: { priceFactor: 1.0, urgencyMessage: '即将售罄' },
      soldout: { priceFactor: 1.1, urgencyMessage: '最后X间' }
    },
    priceUpdateInterval: 20
  },
  platformStrategy: {
    xianyu: { baseDiscount: 0.75, highlight: '学生特惠' },
    xiaohongshu: { baseDiscount: 0.85, highlight: '性价比之选', contentBonus: 0.05 },
    wechat: { baseDiscount: 0.7, highlight: '限时特惠', flashSaleEnabled: true },
    ota: { baseDiscount: 0.9, priceMatch: 'competitor_min' }
  },
  contentLinkage: {
    qualityTiers: {
      excellent: { score: 80, priceBonus: 0.08 },
      good: { score: 60, priceBonus: 0.04 },
      average: { score: 40, priceBonus: 0 },
      poor: { score: 0, priceBonus: -0.05 }
    },
    heatFactor: {
      viral: 1.15,
      trending: 1.08,
      stable: 1.0,
      declining: 0.95
    }
  },
  weatherFactor: {
    enabled: false,
    weatherImpacts: {
      sunny: { factor: 1.0, label: '晴天' },
      cloudy: { factor: 1.0, label: '多云' },
      rainy: { factor: 0.9, label: '雨天' },
      snowy: { factor: 0.85, label: '雪天' },
      foggy: { factor: 0.9, label: '雾霾' }
    },
    specialConditions: {
      heavyRainScenic: { factor: 0.7, label: '暴雨' },
      snowMountain: { factor: 1.0, label: '雪山晴天' },
      typhoon: { factor: 0.6, label: '台风' },
      aqiPoor: { threshold: 200, factor: 0.9, label: '重度雾霾' }
    },
    applicableHotelTypes: ['chain']
  },
  membershipStrategy: {
    enabled: false,
    tierDiscounts: {
      regular: { discount: 0.95, label: '普通会员' },
      silver: { discount: 0.9, label: '银卡' },
      gold: { discount: 0.85, label: '金卡' },
      platinum: { discount: 0.8, label: '铂金' }
    },
    repeatCustomerBonus: {
      enabled: true,
      minPreviousStays: 5,
      discount: 0.9
    },
    memberOnlyPricing: {
      enabled: false,
      publicPricePremium: 0
    }
  },
  learningParams: {
    historicalPerformance: {
      avgRevenuePerRoom: 180,
      occupancyRate: 0.88,
      priceElasticity: 1.5,
      competitorWinRate: 0.72
    },
    autoTuneRules: {
      ifStaleRateGt: '0.2',
      ifOccupancyLt: '0.6',
      ifCompetitorWinRateLt: '0.5'
    }
  }
};

// 导出所有默认模板
export const defaultPricingTemplates: PricingAlgorithmTemplate[] = [
  cbdBusinessTemplate,
  scenicResortTemplate,
  suburbEconomyTemplate
];

// 模板匹配器 - 根据酒店标签推荐最佳模板
export function matchTemplateForHotel(
  hotelTags: any,
  templates: PricingAlgorithmTemplate[]
): PricingAlgorithmTemplate | null {
  // 计算每个模板的匹配分数
  const scoredTemplates = templates.map((template) => {
    let score = 0;
    const tags = template.applicableTags;
    
    // 地理位置匹配
    if (tags.location?.areaType === hotelTags.location?.areaType) score += 3;
    if (tags.location?.cityTier === hotelTags.location?.cityTier) score += 2;
    if (tags.location?.viewType === hotelTags.location?.viewType) score += 2;
    
    // 酒店属性匹配
    if (tags.property?.type === hotelTags.property?.type) score += 3;
    if (tags.property?.tier === hotelTags.property?.tier) score += 2;
    
    // 客群匹配
    if (tags.customer?.primaryType === hotelTags.customer?.primaryType) score += 2;
    if (tags.customer?.priceSensitivity === hotelTags.customer?.priceSensitivity) score += 1;
    
    return { template, score };
  });
  
  // 返回得分最高的模板
  const bestMatch = scoredTemplates.sort((a, b) => b.score - a.score)[0];
  return bestMatch?.score >= 5 ? bestMatch.template : null;
}
