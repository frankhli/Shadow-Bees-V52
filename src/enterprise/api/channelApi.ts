/**
 * 渠道大盘 API
 * 
 * 提供渠道效能数据查询，包括：
 * - 各渠道 GMV、订单、转化率等核心指标
 * - 漏斗数据（曝光->点击->咨询->成交）
 * - 24小时分布数据
 * - 多时间范围支持（7天/30天/90天）
 * 
 * 当前使用 Mock 数据，后期可无缝替换为真实 API
 */

import type { ApiResponse } from './types';

// 模拟网络延迟
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== 类型定义 ====================

export type Platform = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
export type TimeRange = '7d' | '30d' | '90d';
export type Trend = 'up' | 'down' | 'stable';

export interface ChannelMetrics {
  platform: Platform;
  gmv: number;
  orders: number;
  visitors: number;
  inquiries: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
  avgOrderValue: number;
  roi: number;
  growth: number; // 环比增长率
  trend: Trend;
  hourlyDistribution: number[]; // 24小时数据
  funnel: {
    impression: number;
    click: number;
    inquiry: number;
    order: number;
  };
  // 新增：对比数据（用于计算环比）
  previousPeriod?: {
    gmv: number;
    orders: number;
    visitors: number;
  };
}

export interface HotelChannelData {
  hotelId: string;
  hotelName: string;
  timeRange: TimeRange;
  startDate: string;
  endDate: string;
  metrics: ChannelMetrics[];
  totalGMV: number;
  totalOrders: number;
  totalVisitors: number;
  avgConversionRate: number;
  avgGrowth: number;
  // 汇总环比数据
  periodOverPeriod: {
    gmvGrowth: number;
    ordersGrowth: number;
    visitorsGrowth: number;
  };
}

export interface ChannelInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip';
  title: string;
  description: string;
  platform?: Platform;
  impact: 'high' | 'medium' | 'low';
  action?: string;
}

export interface ChannelDashboardResponse {
  hotels: HotelChannelData[];
  summary: {
    totalGMV: number;
    totalOrders: number;
    totalVisitors: number;
    avgConversionRate: number;
    avgGrowth: number;
    periodOverPeriod: {
      gmvGrowth: number;
      ordersGrowth: number;
      visitorsGrowth: number;
    };
  };
  insights: ChannelInsight[];
}

// ==================== 常量配置 ====================

const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  baseGMV: number; // 基础 GMV（用于生成合理的数据范围）
  conversionRateBase: number; // 基础转化率
  peakHours: number[]; // 高峰时段
}> = {
  xianyu: {
    name: '闲鱼',
    baseGMV: 150000,
    conversionRateBase: 3.5,
    peakHours: [19, 20, 21, 22, 23], // 晚上活跃
  },
  xiaohongshu: {
    name: '小红书',
    baseGMV: 120000,
    conversionRateBase: 2.8,
    peakHours: [12, 13, 20, 21, 22, 23], // 午休+晚上
  },
  wechat: {
    name: '微信',
    baseGMV: 80000,
    conversionRateBase: 4.2,
    peakHours: [8, 9, 12, 13, 18, 19, 20, 21, 22], // 全天较均匀
  },
  douyin: {
    name: '抖音',
    baseGMV: 60000,
    conversionRateBase: 2.2,
    peakHours: [19, 20, 21, 22, 23], // 晚上高峰
  },
};

// ==================== Mock 数据生成器 ====================

/**
 * 生成24小时分布数据
 */
function generateHourlyDistribution(
  platform: Platform,
  totalVisitors: number,
  timeRange: TimeRange
): number[] {
  const config = PLATFORM_CONFIG[platform];
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const hourlyTotal = Array(24).fill(0);
  
  // 为每一天生成数据，然后汇总
  for (let d = 0; d < days; d++) {
    // 基础流量分布（按小时）
    const dayDistribution = Array(24).fill(0).map((_, hour) => {
      let base = 1;
      
      // 根据平台特性设置高峰
      if (config.peakHours.includes(hour)) {
        base = 3 + Math.random() * 2; // 高峰期 3-5倍
      } else if (hour >= 0 && hour <= 6) {
        base = 0.1 + Math.random() * 0.2; // 深夜 0.1-0.3倍
      } else {
        base = 0.5 + Math.random() * 0.5; // 平时 0.5-1倍
      }
      
      return base;
    });
    
    // 归一化并分配访客数
    const dayTotal = dayDistribution.reduce((a, b) => a + b, 0);
    const dayVisitors = (totalVisitors / days) * (0.8 + Math.random() * 0.4); // 每天有波动
    
    dayDistribution.forEach((weight, hour) => {
      hourlyTotal[hour] += Math.floor((weight / dayTotal) * dayVisitors);
    });
  }
  
  return hourlyTotal;
}

/**
 * 生成单个平台的渠道指标
 */
function generatePlatformMetrics(
  platform: Platform,
  hotelFactor: number,
  timeRange: TimeRange
): ChannelMetrics {
  const config = PLATFORM_CONFIG[platform];
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  
  // 基础数据（根据时间范围缩放）
  const baseGMV = config.baseGMV * hotelFactor * (days / 7);
  const variation = 0.7 + Math.random() * 0.6; // 0.7-1.3 的随机波动
  const gmv = Math.floor(baseGMV * variation);
  
  // 订单数（基于GMV和平均客单价）
  const avgOrderValue = 600 + Math.random() * 800; // 600-1400元
  const orders = Math.floor(gmv / avgOrderValue);
  
  // 访客数（基于转化率的反推）
  const conversionRate = config.conversionRateBase * (0.8 + Math.random() * 0.4);
  const visitors = Math.floor(orders / (conversionRate / 100));
  
  // 漏斗数据
  const inquiryRate = 0.15 + Math.random() * 0.1; // 15-25% 咨询率
  const inquiries = Math.floor(visitors * inquiryRate);
  
  const clickRate = 0.25 + Math.random() * 0.15; // 25-40% 点击率
  const clicks = Math.floor(visitors * clickRate);
  
  const impressionMultiplier = 5 + Math.random() * 5; // 曝光是访客的 5-10 倍
  const impressions = Math.floor(visitors * impressionMultiplier);
  
  // 24小时分布
  const hourlyDistribution = generateHourlyDistribution(platform, visitors, timeRange);
  
  // 上期数据（用于计算环比）- 90% ~ 110% 的波动
  const previousVariation = 0.9 + Math.random() * 0.2;
  const previousGMV = Math.floor(gmv * previousVariation);
  const previousOrders = Math.floor(orders * previousVariation);
  const previousVisitors = Math.floor(visitors * previousVariation);
  
  // 计算环比增长率
  const growth = previousGMV > 0 
    ? ((gmv - previousGMV) / previousGMV) * 100 
    : 0;
  
  return {
    platform,
    gmv,
    orders,
    visitors,
    inquiries,
    impressions,
    clicks,
    conversionRate,
    avgOrderValue,
    roi: 2 + Math.random() * 2.5, // ROI 2-4.5
    growth: Number(growth.toFixed(1)),
    trend: growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable',
    hourlyDistribution,
    funnel: {
      impression: impressions,
      click: clicks,
      inquiry: inquiries,
      order: orders,
    },
    previousPeriod: {
      gmv: previousGMV,
      orders: previousOrders,
      visitors: previousVisitors,
    },
  };
}

/**
 * 生成单个酒店的渠道数据
 */
function generateHotelChannelData(
  hotelId: string,
  hotelName: string,
  timeRange: TimeRange
): HotelChannelData {
  // 酒店规模系数（根据hotelId生成稳定的随机数）
  const hotelFactor = 0.5 + (hotelId.charCodeAt(hotelId.length - 1) % 10) / 10;
  
  const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat', 'douyin'];
  const metrics = platforms.map(p => generatePlatformMetrics(p, hotelFactor, timeRange));
  
  // 计算汇总数据
  const totalGMV = metrics.reduce((sum, m) => sum + m.gmv, 0);
  const totalOrders = metrics.reduce((sum, m) => sum + m.orders, 0);
  const totalVisitors = metrics.reduce((sum, m) => sum + m.visitors, 0);
  const avgConversionRate = metrics.reduce((sum, m) => sum + m.conversionRate, 0) / metrics.length;
  const avgGrowth = metrics.reduce((sum, m) => sum + m.growth, 0) / metrics.length;
  
  // 计算汇总环比
  const previousTotalGMV = metrics.reduce((sum, m) => sum + (m.previousPeriod?.gmv || 0), 0);
  const previousTotalOrders = metrics.reduce((sum, m) => sum + (m.previousPeriod?.orders || 0), 0);
  const previousTotalVisitors = metrics.reduce((sum, m) => sum + (m.previousPeriod?.visitors || 0), 0);
  
  // 计算日期范围
  const endDate = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  return {
    hotelId,
    hotelName,
    timeRange,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    metrics,
    totalGMV,
    totalOrders,
    totalVisitors,
    avgConversionRate,
    avgGrowth,
    periodOverPeriod: {
      gmvGrowth: previousTotalGMV > 0 ? Number((((totalGMV - previousTotalGMV) / previousTotalGMV) * 100).toFixed(1)) : 0,
      ordersGrowth: previousTotalOrders > 0 ? Number((((totalOrders - previousTotalOrders) / previousTotalOrders) * 100).toFixed(1)) : 0,
      visitorsGrowth: previousTotalVisitors > 0 ? Number((((totalVisitors - previousTotalVisitors) / previousTotalVisitors) * 100).toFixed(1)) : 0,
    },
  };
}

/**
 * 生成智能洞察
 */
function generateInsights(hotels: HotelChannelData[]): ChannelInsight[] {
  const insights: ChannelInsight[] = [];
  
  // 为每个酒店生成洞察
  hotels.forEach(hotel => {
    const bestPlatform = hotel.metrics.reduce((best, m) => m.gmv > best.gmv ? m : best, hotel.metrics[0]);
    const worstPlatform = hotel.metrics.reduce((worst, m) => m.gmv < worst.gmv ? m : worst, hotel.metrics[0]);
    const fastestGrowing = hotel.metrics.reduce((fast, m) => m.growth > fast.growth ? m : fast, hotel.metrics[0]);
    
    // 机会洞察
    if (bestPlatform.gmv > hotel.totalGMV * 0.4) {
      insights.push({
        id: `${hotel.hotelId}-opportunity-1`,
        type: 'opportunity',
        title: `${PLATFORM_CONFIG[bestPlatform.platform].name}表现优异`,
        description: `${hotel.hotelName}在${PLATFORM_CONFIG[bestPlatform.platform].name}渠道GMV占比${((bestPlatform.gmv / hotel.totalGMV) * 100).toFixed(0)}%，建议加大投放力度。`,
        platform: bestPlatform.platform,
        impact: 'high',
        action: '增加该渠道内容发布频率',
      });
    }
    
    // 警告洞察
    if (worstPlatform.conversionRate < 2) {
      insights.push({
        id: `${hotel.hotelId}-warning-1`,
        type: 'warning',
        title: `${PLATFORM_CONFIG[worstPlatform.platform].name}转化率偏低`,
        description: `${PLATFORM_CONFIG[worstPlatform.platform].name}渠道转化率仅${worstPlatform.conversionRate.toFixed(2)}%，低于健康水平。`,
        platform: worstPlatform.platform,
        impact: 'medium',
        action: '优化商品详情页或调整定价',
      });
    }
    
    // 增长洞察
    if (fastestGrowing.growth > 20) {
      insights.push({
        id: `${hotel.hotelId}-tip-1`,
        type: 'tip',
        title: `${PLATFORM_CONFIG[fastestGrowing.platform].name}增长迅猛`,
        description: `${PLATFORM_CONFIG[fastestGrowing.platform].name}渠道环比增长${fastestGrowing.growth.toFixed(1)}%，建议保持当前策略。`,
        platform: fastestGrowing.platform,
        impact: fastestGrowing.growth > 50 ? 'high' : 'medium',
      });
    }
  });
  
  return insights.slice(0, 6); // 最多返回6条
}

// ==================== API 函数 ====================

/**
 * 获取渠道大盘数据
 * 
 * @param hotelIds 酒店ID列表
 * @param timeRange 时间范围：7d/30d/90d
 * @returns 渠道大盘数据（包含各酒店明细和汇总）
 */
export async function getChannelDashboard(
  hotelIds: string[],
  timeRange: TimeRange
): Promise<ApiResponse<ChannelDashboardResponse>> {
  await delay(400); // 模拟网络延迟
  
  // 为每个酒店生成数据
  const hotels = hotelIds.map((id, index) => {
    // 根据ID生成酒店名称（实际应该从酒店列表获取）
    const hotelName = `酒店${String.fromCharCode(65 + (index % 26))}`;
    return generateHotelChannelData(id, hotelName, timeRange);
  });
  
  // 计算汇总数据
  const totalGMV = hotels.reduce((sum, h) => sum + h.totalGMV, 0);
  const totalOrders = hotels.reduce((sum, h) => sum + h.totalOrders, 0);
  const totalVisitors = hotels.reduce((sum, h) => sum + h.totalVisitors, 0);
  const avgConversionRate = hotels.length > 0 
    ? hotels.reduce((sum, h) => sum + h.avgConversionRate, 0) / hotels.length 
    : 0;
  const avgGrowth = hotels.length > 0
    ? hotels.reduce((sum, h) => sum + h.avgGrowth, 0) / hotels.length
    : 0;
  
  const insights = generateInsights(hotels);
  
  return {
    success: true,
    data: {
      hotels,
      summary: {
        totalGMV,
        totalOrders,
        totalVisitors,
        avgConversionRate,
        avgGrowth,
        periodOverPeriod: {
          gmvGrowth: hotels.length > 0 
            ? Number((hotels.reduce((sum, h) => sum + h.periodOverPeriod.gmvGrowth, 0) / hotels.length).toFixed(1))
            : 0,
          ordersGrowth: hotels.length > 0
            ? Number((hotels.reduce((sum, h) => sum + h.periodOverPeriod.ordersGrowth, 0) / hotels.length).toFixed(1))
            : 0,
          visitorsGrowth: hotels.length > 0
            ? Number((hotels.reduce((sum, h) => sum + h.periodOverPeriod.visitorsGrowth, 0) / hotels.length).toFixed(1))
            : 0,
        },
      },
      insights,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取单个酒店的渠道指标详情
 */
export async function getHotelChannelMetrics(
  _hotelId: string,
  timeRange: TimeRange
): Promise<ApiResponse<HotelChannelData>> {
  await delay(300);
  
  const data = generateHotelChannelData(_hotelId, `酒店${_hotelId.slice(-4)}`, timeRange);
  
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取渠道对比数据（用于多酒店对比分析）
 */
export async function getChannelComparison(
  hotelIds: string[],
  platform: Platform,
  timeRange: TimeRange
): Promise<ApiResponse<{
  platform: Platform;
  hotelMetrics: Array<{
    hotelId: string;
    hotelName: string;
    gmv: number;
    orders: number;
    conversionRate: number;
    growth: number;
  }>;
}>> {
  await delay(350);
  
  const hotelMetrics = hotelIds.map((id, index) => {
    const hotelFactor = 0.5 + (id.charCodeAt(id.length - 1) % 10) / 10;
    const platformMetric = generatePlatformMetrics(platform, hotelFactor, timeRange);
    
    return {
      hotelId: id,
      hotelName: `酒店${String.fromCharCode(65 + (index % 26))}`,
      gmv: platformMetric.gmv,
      orders: platformMetric.orders,
      conversionRate: platformMetric.conversionRate,
      growth: platformMetric.growth,
    };
  });
  
  return {
    success: true,
    data: {
      platform,
      hotelMetrics,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取渠道趋势数据（用于折线图）
 */
export async function getChannelTrends(
  _hotelId: string,
  platform: Platform | 'all',
  timeRange: TimeRange
): Promise<ApiResponse<{
  dates: string[];
  data: Array<{
    date: string;
    gmv: number;
    orders: number;
    visitors: number;
  }>;
}>> {
  await delay(300);
  
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const dates: string[] = [];
  const data: Array<{ date: string; gmv: number; orders: number; visitors: number }> = [];
  
  const endDate = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
    
    // 生成每日数据（有一定趋势性）
    const baseGMV = platform === 'all' ? 50000 : PLATFORM_CONFIG[platform as Platform].baseGMV / 7;
    const weekendFactor = date.getDay() === 0 || date.getDay() === 6 ? 1.3 : 1; // 周末更高
    const randomFactor = 0.7 + Math.random() * 0.6;
    
    const gmv = Math.floor(baseGMV * weekendFactor * randomFactor);
    const orders = Math.floor(gmv / (800 + Math.random() * 400));
    const visitors = Math.floor(orders / (0.03 + Math.random() * 0.02));
    
    data.push({ date: dateStr, gmv, orders, visitors });
  }
  
  return {
    success: true,
    data: { dates, data },
    timestamp: new Date().toISOString(),
  };
}
