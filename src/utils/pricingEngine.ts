/**
 * Shadow-Bees V52 - 统一定价预测引擎
 * 被定价决策、事件情报、竞品分析共享，确保预测逻辑勾稽一致
 */

import type { Event, Competitor, RoomType, PricingMode } from '@/types';

export interface FutureDateData {
  date: Date;
  dateStr: string;
  display: string;
  weekday: string;
  isWeekend: boolean;
  competitorMin: number;
  competitorMax: number;
  competitorAvg: number;
  aiSuggestion: number;
  events: Event[];
  inventoryStatus: {
    label: string;
    color: string;
    bg: string;
    border: string;
  } | null;
  priceMultiplier: number;
}

export interface PricingFactors {
  basePrice: number;
  eventMultiplier: number;
  weekendMultiplier: number;
  inventoryMultiplier: number;
  finalPrice: number;
}

// ============================================
// 核心预测算法（与 PricingDecision 页面统一）
// ============================================

/**
 * 计算事件影响系数
 * - high intensity: +0.25
 * - medium intensity: +0.15  
 * - low intensity: +0.05
 */
export function calculateEventMultiplier(events: Event[]): number {
  let multiplier = 1;
  events.forEach(e => {
    if (e.intensity === 'high') multiplier += 0.25;
    else if (e.intensity === 'medium') multiplier += 0.15;
    else multiplier += 0.05;
  });
  return multiplier;
}

/**
 * 计算周末影响系数
 * - 周末: +0.10
 * - 平日: 1.0
 */
export function calculateWeekendMultiplier(date: Date): number {
  const dayOfWeek = date.getDay();
  return (dayOfWeek === 0 || dayOfWeek === 6) ? 1.10 : 1.0;
}

/**
 * 计算库存影响系数
 * - 售罄: +0.30
 * - 紧张: +0.15
 * - 正常: 1.0
 * - 充足: 1.0
 */
export function calculateInventoryMultiplier(
  status: 'abundant' | 'normal' | 'tight' | 'soldout' | null
): number {
  if (!status) return 1.0;
  switch (status) {
    case 'soldout': return 1.30;
    case 'tight': return 1.15;
    default: return 1.0;
  }
}

/**
 * 获取库存状态标签
 */
export function getInventoryStatusLabel(
  available: number,
  total: number
): { label: string; color: string; bg: string; border: string; status: 'abundant' | 'normal' | 'tight' | 'soldout' } | null {
  if (total === 0) return null;
  
  const occupancyRate = (total - available) / total;
  
  if (available === 0) {
    return { 
      label: '售罄', 
      color: 'text-red-400', 
      bg: 'bg-red-500/10', 
      border: 'border-red-500/30',
      status: 'soldout'
    };
  }
  if (occupancyRate > 0.8) {
    return { 
      label: '紧张', 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-500/10', 
      border: 'border-yellow-500/30',
      status: 'tight'
    };
  }
  if (occupancyRate > 0.5) {
    return { 
      label: '适中', 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10', 
      border: 'border-blue-500/30',
      status: 'normal'
    };
  }
  return { 
    label: '充足', 
    color: 'text-green-400', 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30',
    status: 'abundant'
  };
}

/**
 * 计算竞品平均未来价格
 */
export function calculateCompetitorAvgPrice(
  dateStr: string,
  competitors: Competitor[]
): number {
  if (!competitors?.length) return 0;
  const prices = competitors
    .map(c => {
      const future = c.futurePrices?.[dateStr];
      return future ? future.price : c.currentPrice;
    })
    .filter((p): p is number => p > 0);
  return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
}

/**
 * 计算 AI 建议价格（核心算法）
 */
export function calculateAISuggestion(
  dateStr: string,
  competitorAvg: number,
  currentRoomType: RoomType | null,
  events: Event[],
  inventoryStatus: { status: 'abundant' | 'normal' | 'tight' | 'soldout' } | null
): { price: number; factors: PricingFactors } {
  if (!currentRoomType) {
    return { 
      price: 0, 
      factors: { basePrice: 0, eventMultiplier: 1, weekendMultiplier: 1, inventoryMultiplier: 1, finalPrice: 0 } 
    };
  }

  const date = new Date(dateStr);
  
  // 各因子计算
  const eventMultiplier = calculateEventMultiplier(events.filter(e => e.date === dateStr));
  const weekendMultiplier = calculateWeekendMultiplier(date);
  const inventoryMultiplier = calculateInventoryMultiplier(inventoryStatus?.status || null);
  
  // 基准价格（竞品均价优先，其次房型中间价）
  const basePrice = competitorAvg > 0 
    ? competitorAvg 
    : Math.round((currentRoomType.floorPrice + currentRoomType.ceilingPrice) / 2);
  
  // 综合乘数
  const totalMultiplier = eventMultiplier * weekendMultiplier * inventoryMultiplier;
  
  // 计算建议价
  const suggested = Math.round(basePrice * totalMultiplier);
  
  // 限制在底价和天花板价之间
  const finalPrice = Math.max(
    currentRoomType.floorPrice, 
    Math.min(currentRoomType.ceilingPrice, suggested)
  );

  return {
    price: finalPrice,
    factors: {
      basePrice,
      eventMultiplier,
      weekendMultiplier,
      inventoryMultiplier,
      finalPrice
    }
  };
}

/**
 * 生成未来日期列表
 */
export function generateFutureDates(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function displayDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getWeekday(date: Date): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}

/**
 * 生成完整的未来定价数据（供各页面使用）
 */
export function generateFuturePricingData(
  days: number,
  competitors: Competitor[],
  events: Event[],
  currentRoomType: RoomType | null,
  inventoryCalendar: Record<string, { byRoomType?: Record<string, { total: number; available: number }> }> | null
): FutureDateData[] {
  const futureDates = generateFutureDates(days);
  
  return futureDates.map(date => {
    const dateStr = formatDate(date);
    const dayEvents = events.filter(e => e.date === dateStr);
    
    // 获取库存状态
    let inventoryStatus = null;
    if (inventoryCalendar?.[dateStr]?.byRoomType?.[currentRoomType?.id || '']) {
      const roomData = inventoryCalendar[dateStr].byRoomType![currentRoomType!.id];
      inventoryStatus = getInventoryStatusLabel(roomData.available, roomData.total);
    }
    
    // 计算竞品均价（根据房型匹配）
    const roomName = currentRoomType?.name.toLowerCase() || '';
    const roomCategory = 
      roomName.includes('经济') || roomName.includes('特价') || roomName.includes('无窗') ? 'budget' :
      roomName.includes('豪华') || roomName.includes('套房') || roomName.includes('观景') ? 'suite' : 'standard';
    
    const matchedPrices = competitors.map(c => {
      // 获取该竞品对应房型的基础价格
      let roomBasePrice: number;
      if (!c.roomTypes || c.roomTypes.length === 0) {
        roomBasePrice = c.currentPrice;
      } else {
        const rooms = [...c.roomTypes].sort((a, b) => a.price - b.price);
        if (roomCategory === 'budget') roomBasePrice = rooms[0]?.price || c.currentPrice;
        else if (roomCategory === 'suite') roomBasePrice = rooms[rooms.length - 1]?.price || c.currentPrice;
        else roomBasePrice = rooms[Math.floor(rooms.length / 2)]?.price || c.currentPrice;
      }
      
      // 如果有未来价格波动，应用到该房型价格上
      const future = c.futurePrices?.[dateStr];
      if (future) {
        // 计算波动系数（未来价格 / 当前基础价格）
        const fluctuationRatio = future.price / (c.currentPrice || 1);
        return Math.round(roomBasePrice * fluctuationRatio);
      }
      
      return roomBasePrice;
    }).filter((p): p is number => p > 0);
    
    // 计算竞品价格统计（min/max/avg）
    const competitorMin = matchedPrices.length > 0 ? Math.min(...matchedPrices) : 0;
    const competitorMax = matchedPrices.length > 0 ? Math.max(...matchedPrices) : 0;
    const competitorAvg = matchedPrices.length > 0 
      ? Math.round(matchedPrices.reduce((a, b) => a + b, 0) / matchedPrices.length)
      : 0;
    
    // 计算 AI 建议价
    const { price: aiSuggestion, factors } = calculateAISuggestion(
      dateStr,
      competitorAvg,
      currentRoomType,
      dayEvents,
      inventoryStatus
    );
    
    return {
      date,
      dateStr,
      display: displayDate(date),
      weekday: getWeekday(date),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      competitorMin,
      competitorMax,
      competitorAvg,
      aiSuggestion,
      events: dayEvents,
      inventoryStatus,
      priceMultiplier: factors.eventMultiplier * factors.weekendMultiplier * factors.inventoryMultiplier
    };
  });
}

/**
 * 获取事件影响等级颜色和图标标识
 */
export function getEventImpactColor(intensity: 'low' | 'medium' | 'high'): {
  bg: string;
  text: string;
  iconKey: 'flame' | 'zap' | 'circle';
} {
  switch (intensity) {
    case 'high':
      return { bg: 'bg-red-500/20', text: 'text-red-400', iconKey: 'flame' };
    case 'medium':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', iconKey: 'zap' };
    default:
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', iconKey: 'circle' };
  }
}

/**
 * ============================================
 * AI建议价格统一计算（核心算法）
 * 用于：竞品分析今日/未来、定价策略今日/未来
 * ============================================
 * 
 * 计算逻辑：
 * - 尾货模式(clearance): 竞品价 × 0.85-0.95随机系数（价格优势大，好清仓）
 * - 动态模式(dynamic): 竞品价 × 0.95-1.05随机系数（与竞品接近，平衡策略）
 * - 黄牛模式(scalper): 竞品价 × 1.0-1.15随机系数（持平或溢价）
 * 
 * 约束条件：
 * - 必须 >= floorPrice（底价）
 * - 必须 <= ceilingPrice（上限）
 * - 加入随机波动，显得AI算法复杂智能
 */
export function calculateAIRecommendation(
  competitorAvg: number,
  floorPrice: number,
  ceilingPrice: number,
  mode: PricingMode,
  seed?: string // 可选种子，保证同一天计算结果一致
): { price: number; factors: { competitorBase: number; modeMultiplier: number; randomFactor: number; finalPrice: number } } {
  
  // 如果没有竞品价格，使用底价和上限的中间值作为基准
  const competitorBase = competitorAvg > 0 ? competitorAvg : Math.round((floorPrice + ceilingPrice) / 2);
  
  // 根据定价模式确定价格系数范围
  let minMultiplier: number;
  let maxMultiplier: number;
  
  switch (mode) {
    case 'clearance':
      // 尾货模式：比竞品低 5%-15%，确保价格优势
      minMultiplier = 0.85;
      maxMultiplier = 0.95;
      break;
    case 'scalper':
      // 黄牛模式：与竞品持平或高 0%-15%，追求溢价
      minMultiplier = 1.0;
      maxMultiplier = 1.15;
      break;
    case 'dynamic':
    default:
      // 动态模式：与竞品接近，-5% 到 +5%，平衡策略
      minMultiplier = 0.95;
      maxMultiplier = 1.05;
      break;
  }
  
  // 生成随机因子（如果有种子则使用种子生成伪随机，保证同一天结果一致）
  let randomFactor: number;
  if (seed) {
    // 简单的哈希函数生成伪随机数
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const normalizedHash = Math.abs(hash) / 2147483647;
    randomFactor = minMultiplier + normalizedHash * (maxMultiplier - minMultiplier);
  } else {
    // 真随机
    randomFactor = minMultiplier + Math.random() * (maxMultiplier - minMultiplier);
  }
  
  // 计算建议价格
  let suggestedPrice = Math.round(competitorBase * randomFactor);
  
  // 边界约束：必须在底价和上限之间
  suggestedPrice = Math.max(floorPrice, Math.min(ceilingPrice, suggestedPrice));
  
  return {
    price: suggestedPrice,
    factors: {
      competitorBase,
      modeMultiplier: (minMultiplier + maxMultiplier) / 2, // 模式平均系数
      randomFactor: Math.round(randomFactor * 100) / 100, // 保留两位小数
      finalPrice: suggestedPrice
    }
  };
}
