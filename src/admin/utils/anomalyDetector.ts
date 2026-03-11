/**
 * Shadow-Bees 统一异常检测中心
 * 
 * 设计原则：
 * 1. 所有异常检测逻辑集中在此，避免各模块重复计算
 * 2. 健康度评分、异常中心、数据大盘都使用同一数据源
 * 3. 异常数据持久化到 store，不依赖临时生成
 */

import type { 
  HotelData, 
  ContentItem, 
  Ticket, 
  OTAOrder,
  PricingMode 
} from '../stores/adminStore';

// ==================== 类型定义 ====================

export type AnomalyType = 'pricing' | 'inventory' | 'order' | 'content' | 'service' | 'finance';
export type AnomalyLevel = 'warning' | 'critical';
export type AnomalyStatus = 'pending' | 'processing' | 'resolved' | 'ignored';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  level: AnomalyLevel;
  status: AnomalyStatus;
  title: string;
  description: string;
  hotelId: string;
  hotelName: string;
  metrics?: { label: string; value: string; threshold?: string }[];
  suggestion: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  relatedId?: string; // 关联的订单/内容/工单ID
  relatedPage: string;
}

// ==================== 统一阈值配置 ====================

export const THRESHOLDS = {
  // 定价
  priceDeviation: { warning: 20, critical: 30 },        // 偏离市场价百分比
  floorPriceViolation: true,                             // 低于底价(无条件严重)
  
  // 库存
  otaSellThrough: { warning: 40, critical: 25 },        // OTA售罄率（低于说明积压）
  flexibleSellThrough: { warning: 50, critical: 30 },   // 灵活池售罄率
  flexibleSoldOut: { warning: 85, critical: 95 },       // 灵活池即将售罄
  
  // 内容
  contentScore: { warning: 70, critical: 60 },          // AI内容评分
  violationCount: { warning: 2, critical: 4 },          // 违规次数
  minContentCount: { warning: 3, critical: 1 },         // 最少内容数
  
  // 服务
  openTicketDays: { warning: 2, critical: 5 },          // 工单未处理天数
  recentTicketCount: { warning: 3, critical: 5 },       // 近7天工单数
  avgRating: { warning: 4.0, critical: 3.0 },           // 平均评分
  
  // 订单/财务
  refundRate: { warning: 20, critical: 30 },            // 退款率
  reconciliationException: true,                         // 对账异常
};

// ==================== 异常生成器 ====================

export function detectAllAnomalies(
  hotels: HotelData[],
  contents: ContentItem[],
  tickets: Ticket[],
  otaOrders?: OTAOrder[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();
  
  hotels.forEach(hotel => {
    // 1. 定价异常
    anomalies.push(...detectPricingAnomalies(hotel, now));
    
    // 2. 库存异常
    anomalies.push(...detectInventoryAnomalies(hotel, now));
    
    // 3. 内容异常
    const hotelContents = contents.filter(c => c.hotelId === hotel.id);
    anomalies.push(...detectContentAnomalies(hotel, hotelContents, now));
    
    // 4. 服务异常
    const hotelTickets = tickets.filter(t => t.hotelId === hotel.id);
    anomalies.push(...detectServiceAnomalies(hotel, hotelTickets, now));
    
    // 5. 订单异常（模拟数据）
    anomalies.push(...detectOrderAnomalies(hotel, now));
  });
  
  // 6. 财务对账异常
  if (otaOrders) {
    anomalies.push(...detectFinanceAnomalies(hotels, otaOrders, now));
  }
  
  // 按严重程度和创建时间排序
  return anomalies.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'critical' ? -1 : 1;
    if (a.status !== b.status) {
      const order = { pending: 0, processing: 1, resolved: 2, ignored: 3 };
      return order[a.status] - order[b.status];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ==================== 定价异常检测 ====================

function detectPricingAnomalies(hotel: HotelData, now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  hotel.roomTypes.forEach(room => {
    const deviation = ((room.currentPrice - hotel.competitorAvgPrice) / hotel.competitorAvgPrice) * 100;
    const absDeviation = Math.abs(deviation);
    
    // 低于底价 - 严重
    if (room.currentPrice < room.floorPrice) {
      anomalies.push({
        id: `ANM-${hotel.id}-${room.id}-floor`,
        type: 'pricing',
        level: 'critical',
        status: 'pending',
        title: `${room.name}低于底价销售`,
        description: `${hotel.name}的${room.name}当前¥${room.currentPrice}，低于底价¥${room.floorPrice}，每单亏损¥${room.floorPrice - room.currentPrice}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [
          { label: '当前价格', value: `¥${room.currentPrice}` },
          { label: '底价', value: `¥${room.floorPrice}` },
          { label: '单均亏损', value: `¥${room.floorPrice - room.currentPrice}` },
        ],
        suggestion: '立即调整价格至底价以上，检查是否误操作或系统故障',
        createdAt: now,
        updatedAt: now,
        relatedPage: '/pricing',
      });
    }
    // 严重偏离市场价
    else if (absDeviation > THRESHOLDS.priceDeviation.critical) {
      anomalies.push({
        id: `ANM-${hotel.id}-${room.id}-price-critical`,
        type: 'pricing',
        level: 'critical',
        status: 'pending',
        title: `${room.name}价格严重偏离市场`,
        description: `${hotel.name}的${room.name}当前定价¥${room.currentPrice}，较市场均价偏离${Math.round(absDeviation)}%`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [
          { label: '当前价格', value: `¥${room.currentPrice}` },
          { label: '市场均价', value: `¥${hotel.competitorAvgPrice}` },
          { label: '偏离幅度', value: `${Math.round(absDeviation)}%` },
        ],
        suggestion: deviation > 0 
          ? '价格偏高，建议适当降价以提升竞争力，或加强内容营销突出差异化价值'
          : '价格偏低，建议提价至合理区间，避免影响品牌形象和利润',
        createdAt: now,
        updatedAt: now,
        relatedPage: '/pricing',
      });
    }
    // 一般偏离
    else if (absDeviation > THRESHOLDS.priceDeviation.warning) {
      anomalies.push({
        id: `ANM-${hotel.id}-${room.id}-price-warning`,
        type: 'pricing',
        level: 'warning',
        status: 'pending',
        title: `${room.name}价格偏离市场`,
        description: `${hotel.name}的${room.name}当前定价¥${room.currentPrice}，较市场均价偏离${Math.round(absDeviation)}%`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [
          { label: '当前价格', value: `¥${room.currentPrice}` },
          { label: '市场均价', value: `¥${hotel.competitorAvgPrice}` },
          { label: '偏离幅度', value: `${Math.round(absDeviation)}%` },
        ],
        suggestion: '建议关注价格竞争力，适时调整至合理区间',
        createdAt: now,
        updatedAt: now,
        relatedPage: '/pricing',
      });
    }
    
    // 定价模式匹配度检查
    const modeMatch = checkModeMatch(hotel.type, hotel.currentMode);
    if (modeMatch < 0.5 && !anomalies.find(a => a.id === `ANM-${hotel.id}-mode`)) {
      anomalies.push({
        id: `ANM-${hotel.id}-mode`,
        type: 'pricing',
        level: 'warning',
        status: 'pending',
        title: '定价模式建议调整',
        description: `当前${getModeLabel(hotel.currentMode)}模式可能不适合${getHotelTypeLabel(hotel.type)}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        suggestion: `建议切换至${getModeLabel(getIdealMode(hotel.type))}模式以获得更好收益`,
        createdAt: now,
        updatedAt: now,
        relatedPage: '/pricing',
      });
    }
  });
  
  return anomalies;
}

// ==================== 库存异常检测 ====================

function detectInventoryAnomalies(hotel: HotelData, now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { ota, flexible } = hotel.inventory;
  const flexibleTotal = hotel.roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
  
  const otaSellThrough = ota.total > 0 ? (ota.sold / ota.total) * 100 : 0;
  const flexibleSellThrough = flexibleTotal > 0 ? (flexible.sold / flexibleTotal) * 100 : 0;
  
  // OTA库存积压
  if (otaSellThrough < THRESHOLDS.otaSellThrough.critical) {
    anomalies.push({
      id: `ANM-${hotel.id}-ota-backlog-critical`,
      type: 'inventory',
      level: 'critical',
      status: 'pending',
      title: 'OTA渠道库存严重积压',
      description: `${hotel.name}的OTA渠道售罄率仅${Math.round(otaSellThrough)}%，大量库存闲置`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: 'OTA售罄率', value: `${Math.round(otaSellThrough)}%`, threshold: `>${THRESHOLDS.otaSellThrough.warning}%` },
        { label: 'OTA剩余', value: `${ota.available}间` },
        { label: '灵活池售罄', value: `${Math.round(flexibleSellThrough)}%` },
      ],
      suggestion: `建议立即将${Math.min(ota.available - 5, 5)}间库存从OTA调拨至灵活池，增加非标渠道曝光`,
      createdAt: now,
      updatedAt: now,
      relatedPage: '/inventory',
    });
  } else if (otaSellThrough < THRESHOLDS.otaSellThrough.warning) {
    anomalies.push({
      id: `ANM-${hotel.id}-ota-backlog-warning`,
      type: 'inventory',
      level: 'warning',
      status: 'pending',
      title: 'OTA渠道库存积压',
      description: `${hotel.name}的OTA渠道售罄率${Math.round(otaSellThrough)}%，可考虑增加灵活池投放`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: 'OTA售罄率', value: `${Math.round(otaSellThrough)}%`, threshold: `>${THRESHOLDS.otaSellThrough.warning}%` },
        { label: 'OTA剩余', value: `${ota.available}间` },
      ],
      suggestion: '建议将部分库存从OTA调拨至灵活池，优化渠道分配',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/inventory',
    });
  }
  
  // 灵活池销售缓慢
  if (flexibleSellThrough < THRESHOLDS.flexibleSellThrough.critical && flexibleTotal > 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-flexible-slow-critical`,
      type: 'inventory',
      level: 'critical',
      status: 'pending',
      title: '灵活池销售缓慢',
      description: `${hotel.name}的灵活池售罄率仅${Math.round(flexibleSellThrough)}%，建议加强内容营销`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: '灵活池售罄率', value: `${Math.round(flexibleSellThrough)}%`, threshold: `>${THRESHOLDS.flexibleSellThrough.warning}%` },
      ],
      suggestion: '建议加强内容营销、优化定价策略或增加平台投放',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/inventory',
    });
  }
  
  // 灵活池即将售罄
  if (flexibleSellThrough > THRESHOLDS.flexibleSoldOut.critical && otaSellThrough < 50) {
    anomalies.push({
      id: `ANM-${hotel.id}-flexible-soldout-critical`,
      type: 'inventory',
      level: 'critical',
      status: 'pending',
      title: '灵活池即将售罄但OTA积压',
      description: `${hotel.name}的灵活池仅剩${flexibleTotal - flexible.sold}间，但OTA仍有大量库存`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: '灵活池剩余', value: `${flexibleTotal - flexible.sold}间` },
        { label: '灵活池售罄率', value: `${Math.round(flexibleSellThrough)}%` },
        { label: 'OTA售罄率', value: `${Math.round(otaSellThrough)}%` },
      ],
      suggestion: '建议立即从OTA调拨库存至灵活池，抓住非标渠道销售机会',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/inventory',
    });
  } else if (flexibleSellThrough > THRESHOLDS.flexibleSoldOut.warning) {
    anomalies.push({
      id: `ANM-${hotel.id}-flexible-soldout-warning`,
      type: 'inventory',
      level: 'warning',
      status: 'pending',
      title: '灵活池即将售罄',
      description: `${hotel.name}的灵活池仅剩${flexibleTotal - flexible.sold}间`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: '灵活池剩余', value: `${flexibleTotal - flexible.sold}间` },
        { label: '灵活池售罄率', value: `${Math.round(flexibleSellThrough)}%` },
      ],
      suggestion: '建议监控库存情况，适时调整定价策略或从OTA调拨',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/inventory',
    });
  }
  
  return anomalies;
}

// ==================== 内容异常检测 ====================

function detectContentAnomalies(hotel: HotelData, contents: ContentItem[], now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // 1. 内容数量检查
  if (contents.length === 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-none`,
      type: 'content',
      level: 'critical',
      status: 'pending',
      title: '无内容发布',
      description: `${hotel.name}尚未在非标渠道发布任何内容，无法获取流量`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      suggestion: '建议立即在闲鱼/小红书/微信发布引流内容',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  } else if (contents.length < THRESHOLDS.minContentCount.critical) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-few`,
      type: 'content',
      level: 'critical',
      status: 'pending',
      title: '内容发布严重不足',
      description: `${hotel.name}仅发布${contents.length}条内容，建议每平台至少保持3-5条活跃`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '内容数量', value: `${contents.length}条`, threshold: `>${THRESHOLDS.minContentCount.warning}条` }],
      suggestion: '建议增加内容发布频率，覆盖更多流量入口',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  } else if (contents.length < THRESHOLDS.minContentCount.warning) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-warning`,
      type: 'content',
      level: 'warning',
      status: 'pending',
      title: '内容发布不足',
      description: `${hotel.name}仅发布${contents.length}条内容`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '内容数量', value: `${contents.length}条`, threshold: `>${THRESHOLDS.minContentCount.warning}条` }],
      suggestion: '建议增加内容发布频率，保持每平台3-5条活跃内容',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  }
  
  // 2. AI评分低的内容
  const lowScoreContents = contents.filter(c => (c.aiScore || 100) < THRESHOLDS.contentScore.critical);
  if (lowScoreContents.length > 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-lowscore`,
      type: 'content',
      level: 'critical',
      status: 'pending',
      title: `${lowScoreContents.length}条内容质量较低`,
      description: `${hotel.name}有${lowScoreContents.length}条内容AI评分低于60分，可能影响平台推荐和转化率`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '低质量内容', value: `${lowScoreContents.length}条`, threshold: '0条' }],
      suggestion: '建议优化内容文案、图片质量，参考高评分内容模板',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  }
  
  // 3. 违规/被标记内容
  const violations = contents.filter(c => c.status === 'flagged' || c.status === 'takedown');
  if (violations.length >= THRESHOLDS.violationCount.critical) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-violation-critical`,
      type: 'content',
      level: 'critical',
      status: 'pending',
      title: '内容违规严重',
      description: `${hotel.name}有${violations.length}条内容被标记或下架，需立即处理`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '违规内容', value: `${violations.length}条`, threshold: `<${THRESHOLDS.violationCount.warning}条` }],
      suggestion: '存在违规内容，建议优化文案避免敏感词，参考平台规范',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  } else if (violations.length >= THRESHOLDS.violationCount.warning) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-violation-warning`,
      type: 'content',
      level: 'warning',
      status: 'pending',
      title: '存在违规内容',
      description: `${hotel.name}有${violations.length}条内容被标记`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '违规内容', value: `${violations.length}条`, threshold: `<${THRESHOLDS.violationCount.warning}条` }],
      suggestion: '建议优化文案避免敏感词',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  }
  
  // 4. 内容更新停滞
  const recentContents = contents.filter(c => {
    const created = new Date(c.createdAt);
    const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  if (recentContents.length === 0 && contents.length > 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-content-stale`,
      type: 'content',
      level: 'warning',
      status: 'pending',
      title: '内容更新停滞',
      description: `${hotel.name}近7天无新内容发布`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      suggestion: '建议保持内容更新频率，至少每周发布1-2条新内容',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/content',
    });
  }
  
  return anomalies;
}

// ==================== 服务异常检测 ====================

function detectServiceAnomalies(hotel: HotelData, tickets: Ticket[], now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // 1. 未处理工单
  const openTickets = tickets.filter(t => t.status === 'open');
  const staleTickets = openTickets.filter(t => {
    const created = new Date(t.createdAt);
    const daysOpen = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysOpen > THRESHOLDS.openTicketDays.critical;
  });
  
  if (staleTickets.length > 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-ticket-stale`,
      type: 'service',
      level: 'critical',
      status: 'pending',
      title: `${staleTickets.length}个工单超期未处理`,
      description: `${hotel.name}存在超过${THRESHOLDS.openTicketDays.critical}天未处理的工单，严重影响客户体验`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '超期工单', value: `${staleTickets.length}个`, threshold: '0个' }],
      suggestion: '建议优先处理超期工单，提升响应速度',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/support',
    });
  } else if (openTickets.length > 0) {
    anomalies.push({
      id: `ANM-${hotel.id}-ticket-open`,
      type: 'service',
      level: 'warning',
      status: 'pending',
      title: `${openTickets.length}个待处理工单`,
      description: `${hotel.name}有待处理工单需要跟进`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '待处理工单', value: `${openTickets.length}个` }],
      suggestion: '建议及时跟进处理，避免超时',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/support',
    });
  }
  
  // 2. 近期工单频次
  const recentTickets = tickets.filter(t => {
    const created = new Date(t.createdAt);
    const daysAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  
  if (recentTickets.length >= THRESHOLDS.recentTicketCount.critical) {
    anomalies.push({
      id: `ANM-${hotel.id}-ticket-frequent-critical`,
      type: 'service',
      level: 'critical',
      status: 'pending',
      title: '近期问题频发',
      description: `${hotel.name}近7天提交${recentTickets.length}个工单，可能存在系统性问题`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [
        { label: '近7天工单', value: `${recentTickets.length}个`, threshold: `<${THRESHOLDS.recentTicketCount.warning}个` },
      ],
      suggestion: '建议主动联系客户排查问题，必要时安排技术支持',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/support',
    });
  } else if (recentTickets.length >= THRESHOLDS.recentTicketCount.warning) {
    anomalies.push({
      id: `ANM-${hotel.id}-ticket-frequent-warning`,
      type: 'service',
      level: 'warning',
      status: 'pending',
      title: '近期问题较多',
      description: `${hotel.name}近7天提交${recentTickets.length}个工单`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      metrics: [{ label: '近7天工单', value: `${recentTickets.length}个`, threshold: `<${THRESHOLDS.recentTicketCount.warning}个` }],
      suggestion: '建议关注客户使用情况，主动排查潜在问题',
      createdAt: now,
      updatedAt: now,
      relatedPage: '/support',
    });
  }
  
  // 3. 客户满意度低
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' && t.rating);
  if (resolvedTickets.length > 0) {
    const avgRating = resolvedTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / resolvedTickets.length;
    if (avgRating < THRESHOLDS.avgRating.critical) {
      anomalies.push({
        id: `ANM-${hotel.id}-rating-low`,
        type: 'service',
        level: 'critical',
        status: 'pending',
        title: '客户满意度低',
        description: `${hotel.name}平均评分${avgRating.toFixed(1)}星，需改进服务质量`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [{ label: '平均评分', value: `${avgRating.toFixed(1)}星`, threshold: `>${THRESHOLDS.avgRating.warning}星` }],
        suggestion: '建议回访低分客户，了解具体问题并改进',
        createdAt: now,
        updatedAt: now,
        relatedPage: '/support',
      });
    } else if (avgRating < THRESHOLDS.avgRating.warning) {
      anomalies.push({
        id: `ANM-${hotel.id}-rating-avg`,
        type: 'service',
        level: 'warning',
        status: 'pending',
        title: '客户满意度一般',
        description: `${hotel.name}平均评分${avgRating.toFixed(1)}星，有提升空间`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [{ label: '平均评分', value: `${avgRating.toFixed(1)}星`, threshold: `>${THRESHOLDS.avgRating.warning}星` }],
        suggestion: '建议关注客户反馈，提升服务体验',
        createdAt: now,
        updatedAt: now,
        relatedPage: '/support',
      });
    }
  }
  
  return anomalies;
}

// ==================== 订单异常检测（模拟）====================

function detectOrderAnomalies(hotel: HotelData, now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // 模拟退款率异常 (20%概率)
  if (Math.random() < 0.2) {
    const refundRate = 20 + Math.floor(Math.random() * 15);
    if (refundRate > THRESHOLDS.refundRate.critical) {
      anomalies.push({
        id: `ANM-${hotel.id}-refund-critical`,
        type: 'order',
        level: 'critical',
        status: 'pending',
        title: `退款率过高 (${refundRate}%)`,
        description: `${hotel.name}近7天退款率${refundRate}%，可能存在严重服务质量或价格问题`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [
          { label: '退款率', value: `${refundRate}%`, threshold: `<${THRESHOLDS.refundRate.warning}%` },
        ],
        suggestion: '建议立即检查酒店服务质量、价格竞争力，排查是否存在系统性问题',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)).toISOString(),
        updatedAt: now,
        relatedPage: '/orders',
      });
    } else if (refundRate > THRESHOLDS.refundRate.warning) {
      anomalies.push({
        id: `ANM-${hotel.id}-refund-warning`,
        type: 'order',
        level: 'warning',
        status: 'pending',
        title: `退款率偏高 (${refundRate}%)`,
        description: `${hotel.name}近7天退款率${refundRate}%，建议关注`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        metrics: [
          { label: '退款率', value: `${refundRate}%`, threshold: `<${THRESHOLDS.refundRate.warning}%` },
        ],
        suggestion: '建议检查预订确认流程、价格合理性',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)).toISOString(),
        updatedAt: now,
        relatedPage: '/orders',
      });
    }
  }
  
  return anomalies;
}

// ==================== 财务异常检测 ====================

function detectFinanceAnomalies(_hotels: HotelData[], otaOrders: OTAOrder[], now: string): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  const exceptionOrders = otaOrders.filter(o => o.status === 'exception');
  
  exceptionOrders.forEach(order => {
    let title = '对账异常';
    let description = '';
    
    switch (order.differenceType) {
      case 'amount_mismatch':
        title = `订单金额不一致`;
        description = `${order.hotelName}的${order.channel}订单金额差异¥${order.differenceAmount}`;
        break;
      case 'status_mismatch':
        title = `订单状态不一致`;
        description = `${order.hotelName}的订单在${order.channel}状态为${order.otaStatus}，系统为${order.systemStatus}`;
        break;
      case 'missing_order':
        title = `系统缺失订单`;
        description = `${order.hotelName}在${order.channel}有订单但系统未找到`;
        break;
    }
    
    anomalies.push({
      id: `ANM-${order.id}-finance`,
      type: 'finance',
      level: 'critical',
      status: 'pending',
      title,
      description,
      hotelId: order.hotelId,
      hotelName: order.hotelName,
      metrics: [
        { label: '渠道', value: order.channel },
        { label: 'OTA单号', value: order.externalOrderId },
        ...(order.differenceAmount ? [{ label: '差异金额', value: `¥${order.differenceAmount}` }] : []),
      ],
      suggestion: order.differenceType === 'missing_order' 
        ? '建议立即核查订单来源，补录系统或排查是否为虚假订单'
        : '建议核对价格配置，确认是否为调价未同步导致',
      createdAt: order.createdAt,
      updatedAt: now,
      relatedId: order.id,
      relatedPage: '/finance',
    });
  });
  
  return anomalies;
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

function getIdealMode(hotelType: HotelData['type']): PricingMode {
  const ideal: Record<HotelData['type'], PricingMode> = {
    city: 'clearance',
    suburb: 'scalper',
    tourist: 'dynamic',
  };
  return ideal[hotelType];
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

// ==================== 统计函数 ====================

export function getAnomalyStats(anomalies: Anomaly[]) {
  return {
    total: anomalies.length,
    pending: anomalies.filter(a => a.status === 'pending').length,
    processing: anomalies.filter(a => a.status === 'processing').length,
    resolved: anomalies.filter(a => a.status === 'resolved').length,
    ignored: anomalies.filter(a => a.status === 'ignored').length,
    critical: anomalies.filter(a => a.level === 'critical' && a.status !== 'resolved' && a.status !== 'ignored').length,
    warning: anomalies.filter(a => a.level === 'warning' && a.status !== 'resolved' && a.status !== 'ignored').length,
    byType: {
      pricing: anomalies.filter(a => a.type === 'pricing').length,
      inventory: anomalies.filter(a => a.type === 'inventory').length,
      order: anomalies.filter(a => a.type === 'order').length,
      content: anomalies.filter(a => a.type === 'content').length,
      service: anomalies.filter(a => a.type === 'service').length,
      finance: anomalies.filter(a => a.type === 'finance').length,
    },
  };
}

// 根据异常计算健康度评分（反向计算）
export function calculateHealthFromAnomalies(
  hotelId: string, 
  anomalies: Anomaly[]
): { score: number; issues: string[] } {
  const hotelAnomalies = anomalies.filter(a => a.hotelId === hotelId && a.status !== 'resolved');
  
  let score = 100;
  const issues: string[] = [];
  
  hotelAnomalies.forEach(anomaly => {
    if (anomaly.level === 'critical') {
      score -= 15;
      issues.push(anomaly.title);
    } else {
      score -= 8;
      issues.push(anomaly.title);
    }
  });
  
  return { 
    score: Math.max(0, Math.round(score)), 
    issues: issues.slice(0, 3) 
  };
}
