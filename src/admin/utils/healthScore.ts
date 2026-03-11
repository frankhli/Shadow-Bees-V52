/**
 * Shadow-Bees V52 - 客户健康度评分系统
 * 基于商业模式：非标渠道智能收益管理
 * 
 * 评分维度：
 * 1. 定价健康度 (30%) - 是否偏离市场价、调价频率
 * 2. 库存健康度 (25%) - 库存周转、渠道分配合理性
 * 3. 内容健康度 (25%) - 内容活跃度、违规情况
 * 4. 服务健康度 (20%) - 工单频次、满意度
 */

import type { HotelData, ContentItem, Ticket, PricingMode } from '../stores/adminStore';
import { THRESHOLDS as ANOMALY_THRESHOLDS } from './anomalyDetector';

// 健康度评分结果
export interface HealthScore {
  overall: number;           // 综合得分 0-100
  level: 'healthy' | 'warning' | 'critical';  // 健康等级
  breakdown: {
    pricing: number;         // 定价健康度 0-100
    inventory: number;       // 库存健康度 0-100
    content: number;         // 内容健康度 0-100
    service: number;         // 服务健康度 0-100
  };
  issues: HealthIssue[];     // 具体问题列表
  suggestions: string[];     // 改进建议
}

// 健康问题
export interface HealthIssue {
  type: 'pricing' | 'inventory' | 'content' | 'service';
  level: 'warning' | 'critical';
  title: string;
  description: string;
  metric?: {
    label: string;
    value: string;
    threshold: string;
  };
}

// 权重配置
const WEIGHTS = {
  pricing: 0.30,
  inventory: 0.25,
  content: 0.25,
  service: 0.20,
};

// 阈值配置 - 使用与异常检测统一的阈值
const THRESHOLDS = {
  // 定价
  priceDeviation: { 
    warning: ANOMALY_THRESHOLDS.priceDeviation.warning, 
    critical: ANOMALY_THRESHOLDS.priceDeviation.critical 
  },
  priceAdjustmentFreq: { warning: 5, critical: 10 },    // 日调价次数
  
  // 库存
  otaSellThrough: { 
    warning: ANOMALY_THRESHOLDS.otaSellThrough.warning, 
    critical: ANOMALY_THRESHOLDS.otaSellThrough.critical 
  },
  flexibleSellThrough: { 
    warning: ANOMALY_THRESHOLDS.flexibleSellThrough.warning, 
    critical: ANOMALY_THRESHOLDS.flexibleSellThrough.critical 
  },
  
  // 内容
  contentScore: { 
    warning: ANOMALY_THRESHOLDS.contentScore.warning, 
    critical: ANOMALY_THRESHOLDS.contentScore.critical 
  },
  violationCount: { 
    warning: ANOMALY_THRESHOLDS.violationCount.warning, 
    critical: ANOMALY_THRESHOLDS.violationCount.critical 
  },
  minContentCount: {
    warning: ANOMALY_THRESHOLDS.minContentCount.warning,
    critical: ANOMALY_THRESHOLDS.minContentCount.critical,
  },
  
  // 服务
  openTicketDays: { 
    warning: ANOMALY_THRESHOLDS.openTicketDays.warning, 
    critical: ANOMALY_THRESHOLDS.openTicketDays.critical 
  },
  recentTicketCount: { 
    warning: ANOMALY_THRESHOLDS.recentTicketCount.warning, 
    critical: ANOMALY_THRESHOLDS.recentTicketCount.critical 
  },
};

/**
 * 计算客户健康度评分
 */
export function calculateHealthScore(
  hotel: HotelData,
  contents: ContentItem[],
  tickets: Ticket[]
): HealthScore {
  const pricingScore = calculatePricingScore(hotel);
  const inventoryScore = calculateInventoryScore(hotel);
  const contentScore = calculateContentScore(hotel, contents);
  const serviceScore = calculateServiceScore(hotel, tickets);
  
  // 综合得分（加权平均）
  const overall = Math.round(
    pricingScore.score * WEIGHTS.pricing +
    inventoryScore.score * WEIGHTS.inventory +
    contentScore.score * WEIGHTS.content +
    serviceScore.score * WEIGHTS.service
  );
  
  // 确定健康等级
  let level: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (overall < 60 || [pricingScore, inventoryScore, contentScore, serviceScore].some(s => s.score < 40)) {
    level = 'critical';
  } else if (overall < 80 || [pricingScore, inventoryScore, contentScore, serviceScore].some(s => s.score < 60)) {
    level = 'warning';
  }
  
  // 合并所有问题
  const allIssues = [
    ...pricingScore.issues,
    ...inventoryScore.issues,
    ...contentScore.issues,
    ...serviceScore.issues,
  ];
  
  // 生成建议
  const suggestions = generateSuggestions(allIssues);
  
  return {
    overall,
    level,
    breakdown: {
      pricing: pricingScore.score,
      inventory: inventoryScore.score,
      content: contentScore.score,
      service: serviceScore.score,
    },
    issues: allIssues,
    suggestions,
  };
}

// ==================== 定价健康度 ====================
interface SubScore {
  score: number;
  issues: HealthIssue[];
}

function calculatePricingScore(hotel: HotelData): SubScore {
  const issues: HealthIssue[] = [];
  let score = 100;
  
  const { roomTypes, competitorAvgPrice, currentMode } = hotel;
  
  // 1. 检查是否有房型价格偏离市场价过大
  roomTypes.forEach(room => {
    const deviation = Math.abs(room.currentPrice - competitorAvgPrice) / competitorAvgPrice * 100;
    
    if (deviation > THRESHOLDS.priceDeviation.critical) {
      score -= 20;
      issues.push({
        type: 'pricing',
        level: 'critical',
        title: `${room.name}价格严重偏离市场`,
        description: `当前定价¥${room.currentPrice}，较市场价偏离${Math.round(deviation)}%`,
        metric: {
          label: '价格偏离',
          value: `${Math.round(deviation)}%`,
          threshold: `<${THRESHOLDS.priceDeviation.warning}%`,
        },
      });
    } else if (deviation > THRESHOLDS.priceDeviation.warning) {
      score -= 10;
      issues.push({
        type: 'pricing',
        level: 'warning',
        title: `${room.name}价格偏离市场`,
        description: `当前定价¥${room.currentPrice}，较市场价偏离${Math.round(deviation)}%`,
        metric: {
          label: '价格偏离',
          value: `${Math.round(deviation)}%`,
          threshold: `<${THRESHOLDS.priceDeviation.warning}%`,
        },
      });
    }
    
    // 2. 检查是否低于底价（严重问题）
    if (room.currentPrice < room.floorPrice) {
      score -= 25;
      issues.push({
        type: 'pricing',
        level: 'critical',
        title: `${room.name}低于底价销售`,
        description: `当前¥${room.currentPrice}，底价¥${room.floorPrice}，存在亏损风险`,
        metric: {
          label: '低于底价',
          value: `¥${room.floorPrice - room.currentPrice}`,
          threshold: '¥0',
        },
      });
    }
  });
  
  // 3. 检查定价模式与酒店类型的匹配度
  const modeMatchScore = checkModeMatch(hotel.type, currentMode);
  if (modeMatchScore < 0.5) {
    score -= 15;
    issues.push({
      type: 'pricing',
      level: 'warning',
      title: '定价模式建议调整',
      description: `当前${getModeLabel(currentMode)}模式可能不适合${getHotelTypeLabel(hotel.type)}`,
    });
  }
  
  return { score: Math.max(0, score), issues };
}

// ==================== 库存健康度 ====================
function calculateInventoryScore(hotel: HotelData): SubScore {
  const issues: HealthIssue[] = [];
  let score = 100;
  
  const { inventory, roomTypes } = hotel;
  const { ota, flexible } = inventory;
  
  // 1. OTA渠道售罄率（太低说明积压）
  const otaSellThrough = ota.total > 0 ? (ota.sold / ota.total) * 100 : 0;
  if (otaSellThrough < THRESHOLDS.otaSellThrough.critical) {
    score -= 20;
    issues.push({
      type: 'inventory',
      level: 'critical',
      title: 'OTA渠道库存严重积压',
      description: `OTA售罄率仅${Math.round(otaSellThrough)}%，建议调拨至灵活池`,
      metric: {
        label: 'OTA售罄率',
        value: `${Math.round(otaSellThrough)}%`,
        threshold: `>${THRESHOLDS.otaSellThrough.warning}%`,
      },
    });
  } else if (otaSellThrough < THRESHOLDS.otaSellThrough.warning) {
    score -= 10;
    issues.push({
      type: 'inventory',
      level: 'warning',
      title: 'OTA渠道库存积压',
      description: `OTA售罄率${Math.round(otaSellThrough)}%，可考虑增加灵活池投放`,
      metric: {
        label: 'OTA售罄率',
        value: `${Math.round(otaSellThrough)}%`,
        threshold: `>${THRESHOLDS.otaSellThrough.warning}%`,
      },
    });
  }
  
  // 2. 灵活池售罄率（太低说明内容营销不足）
  const flexibleTotal = roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
  const flexibleSellThrough = flexibleTotal > 0 ? (flexible.sold / flexibleTotal) * 100 : 0;
  if (flexibleSellThrough < THRESHOLDS.flexibleSellThrough.critical) {
    score -= 15;
    issues.push({
      type: 'inventory',
      level: 'critical',
      title: '灵活池销售缓慢',
      description: `灵活池售罄率仅${Math.round(flexibleSellThrough)}%，建议加强内容营销`,
      metric: {
        label: '灵活池售罄率',
        value: `${Math.round(flexibleSellThrough)}%`,
        threshold: `>${THRESHOLDS.flexibleSellThrough.warning}%`,
      },
    });
  }
  
  // 3. 检查各平台分配是否均衡
  const platformAllocation = flexible.platforms;
  const totalAllocated = Object.values(platformAllocation).reduce((sum, p) => sum + p.allocated, 0);
  if (totalAllocated > 0) {
    const allocationRates = Object.entries(platformAllocation).map(([platform, data]) => ({
      platform,
      rate: (data.allocated / totalAllocated) * 100,
    }));
    const maxDiff = Math.max(...allocationRates.map(r => r.rate)) - Math.min(...allocationRates.map(r => r.rate));
    
    if (maxDiff > 40) {
      score -= 10;
      issues.push({
        type: 'inventory',
        level: 'warning',
        title: '渠道分配不均衡',
        description: '各平台库存分配差异过大，建议优化渠道策略',
      });
    }
  }
  
  return { score: Math.max(0, score), issues };
}

// ==================== 内容健康度 ====================
function calculateContentScore(hotel: HotelData, contents: ContentItem[]): SubScore {
  const issues: HealthIssue[] = [];
  let score = 100;
  
  const hotelContents = contents.filter(c => c.hotelId === hotel.id);
  
  // 1. 内容数量检查
  if (hotelContents.length === 0) {
    score -= 30;
    issues.push({
      type: 'content',
      level: 'critical',
      title: '无内容发布',
      description: '该酒店尚未在非标渠道发布任何内容，无法获取流量',
    });
  } else if (hotelContents.length < 3) {
    score -= 15;
    issues.push({
      type: 'content',
      level: 'warning',
      title: '内容发布不足',
      description: `仅发布${hotelContents.length}条内容，建议每平台至少保持3-5条活跃`,
    });
  }
  
  // 2. AI内容评分检查
  const lowScoreContents = hotelContents.filter(c => (c.aiScore || 100) < THRESHOLDS.contentScore.critical);
  if (lowScoreContents.length > 0) {
    score -= 15;
    issues.push({
      type: 'content',
      level: 'critical',
      title: `${lowScoreContents.length}条内容质量较低`,
      description: 'AI评分低于60分，可能影响平台推荐和转化率',
      metric: {
        label: '低质量内容',
        value: `${lowScoreContents.length}条`,
        threshold: '0条',
      },
    });
  }
  
  // 3. 违规/下架内容检查
  const violations = hotelContents.filter(c => c.status === 'flagged' || c.status === 'takedown');
  if (violations.length >= THRESHOLDS.violationCount.critical) {
    score -= 25;
    issues.push({
      type: 'content',
      level: 'critical',
      title: '内容违规严重',
      description: `${violations.length}条内容被标记或下架，需立即处理`,
      metric: {
        label: '违规内容',
        value: `${violations.length}条`,
        threshold: `<${THRESHOLDS.violationCount.warning}条`,
      },
    });
  } else if (violations.length >= THRESHOLDS.violationCount.warning) {
    score -= 15;
    issues.push({
      type: 'content',
      level: 'warning',
      title: '存在违规内容',
      description: `${violations.length}条内容被标记，建议优化文案`,
    });
  }
  
  // 4. 内容活跃度（近7天是否有新发布）
  const recentContents = hotelContents.filter(c => {
    const created = new Date(c.createdAt);
    const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  if (recentContents.length === 0 && hotelContents.length > 0) {
    score -= 10;
    issues.push({
      type: 'content',
      level: 'warning',
      title: '内容更新停滞',
      description: '近7天无新内容发布，建议保持内容更新频率',
    });
  }
  
  return { score: Math.max(0, score), issues };
}

// ==================== 服务健康度 ====================
function calculateServiceScore(hotel: HotelData, tickets: Ticket[]): SubScore {
  const issues: HealthIssue[] = [];
  let score = 100;
  
  const hotelTickets = tickets.filter(t => t.hotelId === hotel.id);
  
  // 1. 未处理工单检查
  const openTickets = hotelTickets.filter(t => t.status === 'open');
  
  // 检查是否有工单超过阈值天数未处理
  const staleTickets = openTickets.filter(t => {
    const created = new Date(t.createdAt);
    const daysOpen = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysOpen > THRESHOLDS.openTicketDays.critical;
  });
  
  if (staleTickets.length > 0) {
    score -= 25;
    issues.push({
      type: 'service',
      level: 'critical',
      title: `${staleTickets.length}个工单超期未处理`,
      description: `存在超过${THRESHOLDS.openTicketDays.critical}天未处理的工单，严重影响客户体验`,
      metric: {
        label: '超期工单',
        value: `${staleTickets.length}个`,
        threshold: '0个',
      },
    });
  } else if (openTickets.length > 0) {
    score -= 10;
    issues.push({
      type: 'service',
      level: 'warning',
      title: `${openTickets.length}个待处理工单`,
      description: '有待处理工单需要跟进',
    });
  }
  
  // 2. 近期工单频次（反映产品/服务稳定性）
  const recentTickets = hotelTickets.filter(t => {
    const created = new Date(t.createdAt);
    const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  
  if (recentTickets.length >= THRESHOLDS.recentTicketCount.critical) {
    score -= 20;
    issues.push({
      type: 'service',
      level: 'critical',
      title: '近期问题频发',
      description: `近7天提交${recentTickets.length}个工单，可能存在系统性问题`,
      metric: {
        label: '近7天工单',
        value: `${recentTickets.length}个`,
        threshold: `<${THRESHOLDS.recentTicketCount.warning}个`,
      },
    });
  } else if (recentTickets.length >= THRESHOLDS.recentTicketCount.warning) {
    score -= 10;
    issues.push({
      type: 'service',
      level: 'warning',
      title: '近期问题较多',
      description: `近7天提交${recentTickets.length}个工单，建议关注`,
    });
  }
  
  // 3. 客户满意度检查（已解决工单的评价）
  const resolvedTickets = hotelTickets.filter(t => t.status === 'resolved' && t.rating);
  if (resolvedTickets.length > 0) {
    const avgRating = resolvedTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / resolvedTickets.length;
    if (avgRating < 3) {
      score -= 15;
      issues.push({
        type: 'service',
        level: 'critical',
        title: '客户满意度低',
        description: `平均评分${avgRating.toFixed(1)}星，需改进服务质量`,
        metric: {
          label: '平均评分',
          value: `${avgRating.toFixed(1)}星`,
          threshold: '>3星',
        },
      });
    } else if (avgRating < 4) {
      score -= 5;
      issues.push({
        type: 'service',
        level: 'warning',
        title: '客户满意度一般',
        description: `平均评分${avgRating.toFixed(1)}星，有提升空间`,
      });
    }
  }
  
  return { score: Math.max(0, score), issues };
}

// ==================== 辅助函数 ====================

function checkModeMatch(hotelType: HotelData['type'], mode: PricingMode): number {
  const idealMatches: Record<HotelData['type'], PricingMode> = {
    city: 'clearance',
    suburb: 'scalper',
    tourist: 'dynamic',
  };
  
  if (idealMatches[hotelType] === mode) return 1.0;
  
  const partialMatches: Record<HotelData['type'], PricingMode[]> = {
    city: ['dynamic'],
    suburb: ['dynamic'],
    tourist: ['clearance'],
  };
  
  if (partialMatches[hotelType]?.includes(mode)) return 0.6;
  return 0.3;
}

function getModeLabel(mode: PricingMode): string {
  const labels: Record<PricingMode, string> = {
    scalper: '黄牛模式',
    dynamic: '动态模式',
    clearance: '尾货模式',
  };
  return labels[mode] || mode;
}

function getHotelTypeLabel(type: HotelData['type']): string {
  const labels: Record<HotelData['type'], string> = {
    city: '城市酒店',
    suburb: '郊区酒店',
    tourist: '景区酒店',
  };
  return labels[type] || type;
}

function generateSuggestions(issues: HealthIssue[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.some(i => i.type === 'pricing')) {
    suggestions.push('建议优化定价策略，参考竞品价格调整至合理区间');
  }
  
  const inventoryIssues = issues.filter(i => i.type === 'inventory');
  if (inventoryIssues.some(i => i.title.includes('OTA'))) {
    suggestions.push('OTA渠道库存积压，建议调拨部分库存至灵活池，增加非标渠道曝光');
  }
  if (inventoryIssues.some(i => i.title.includes('灵活池'))) {
    suggestions.push('灵活池销售缓慢，建议加强内容营销或调整定价');
  }
  
  const contentIssues = issues.filter(i => i.type === 'content');
  if (contentIssues.some(i => i.title.includes('无内容'))) {
    suggestions.push('尚未发布非标渠道内容，建议立即在闲鱼/小红书/微信发布引流内容');
  } else if (contentIssues.some(i => i.title.includes('不足'))) {
    suggestions.push('建议增加内容发布频率，保持每平台3-5条活跃内容');
  }
  if (contentIssues.some(i => i.title.includes('违规'))) {
    suggestions.push('存在违规内容，建议优化文案避免敏感词，参考平台规范');
  }
  
  if (issues.some(i => i.type === 'service' && i.title.includes('超期'))) {
    suggestions.push('存在超期工单，建议优先处理客户问题，提升响应速度');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('整体运营良好，建议继续保持当前策略');
  }
  
  return suggestions;
}

// ==================== 批量计算 ====================

export function calculateAllHealthScores(
  hotels: HotelData[],
  contents: ContentItem[],
  tickets: Ticket[]
): Record<string, HealthScore> {
  const scores: Record<string, HealthScore> = {};
  
  hotels.forEach(hotel => {
    const score = calculateHealthScore(hotel, contents, tickets);
    scores[hotel.id] = score;
  });
  
  return scores;
}

export function getHealthStats(scores: Record<string, HealthScore>): {
  healthy: number;
  warning: number;
  critical: number;
  total: number;
} {
  const values = Object.values(scores);
  const stats = { healthy: 0, warning: 0, critical: 0, total: values.length };
  
  values.forEach(score => {
    stats[score.level]++;
  });
  
  return stats;
}
