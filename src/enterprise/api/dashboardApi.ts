/**
 * 仪表盘相关API
 * 包含数据勾稽关系的计算
 */

import type { ApiResponse, DashboardSummary, DashboardTrend } from './types';
import { MOCK_HOTELS, generateHotelMetrics } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取仪表盘汇总数据（带勾稽关系验证）
 */
export async function getDashboardSummary(
  hotelIds?: string[],
  date?: string
): Promise<ApiResponse<DashboardSummary>> {
  await delay();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  const targetHotels = hotelIds || MOCK_HOTELS.map((h: { id: string }) => h.id);
  
  // 聚合所有酒店的指标
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalSoldRooms = 0;
  let totalAvailableRooms = 0;
  let totalADR = 0;
  
  targetHotels.forEach((hotelId: string) => {
    const metrics = generateHotelMetrics(hotelId, targetDate);
    totalRevenue += metrics.revenue;
    totalOrders += metrics.orders;
    totalSoldRooms += metrics.soldRooms;
    totalAvailableRooms += metrics.availableRooms + metrics.soldRooms;
    totalADR += metrics.adr;
  });
  
  // 计算集团级指标（带勾稽关系）
  const occupancyRate = totalAvailableRooms > 0 
    ? Math.round((totalSoldRooms / totalAvailableRooms) * 100) / 100 
    : 0;
  
  // ADR = 总营收 / 已售房间数
  const adr = totalSoldRooms > 0 ? Math.round(totalRevenue / totalSoldRooms) : 0;
  
  // RevPAR = ADR × 入住率 = 总营收 / 总房间数
  const revpar = totalAvailableRooms > 0 ? Math.round(totalRevenue / totalAvailableRooms) : 0;
  
  // 昨日数据对比
  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let yesterdayRevenue = 0;
  let yesterdayOrders = 0;
  let yesterdaySoldRooms = 0;
  let yesterdayAvailableRooms = 0;
  
  targetHotels.forEach(hotelId => {
    const metrics = generateHotelMetrics(hotelId, yesterdayStr);
    yesterdayRevenue += metrics.revenue;
    yesterdayOrders += metrics.orders;
    yesterdaySoldRooms += metrics.soldRooms;
    yesterdayAvailableRooms += metrics.availableRooms + metrics.soldRooms;
  });
  
  const yesterdayOccupancy = yesterdayAvailableRooms > 0 
    ? yesterdaySoldRooms / yesterdayAvailableRooms 
    : 0;
  
  // 计算同比变化
  const revenueChange = yesterdayRevenue > 0 
    ? Math.round(((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) / 100 
    : 0;
  const ordersChange = yesterdayOrders > 0 
    ? Math.round(((totalOrders - yesterdayOrders) / yesterdayOrders) * 100) / 100 
    : 0;
  const occupancyChange = Math.round((occupancyRate - yesterdayOccupancy) * 100) / 100;
  
  return {
    success: true,
    data: {
      date: targetDate,
      totalRevenue,
      totalOrders,
      occupancyRate,
      adr,
      revpar,
      availableRooms: totalAvailableRooms - totalSoldRooms,
      soldRooms: totalSoldRooms,
      comparedToYesterday: {
        revenue: revenueChange,
        orders: ordersChange,
        occupancyRate: occupancyChange,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取趋势数据
 */
export async function getDashboardTrends(
  days: number = 30,
  hotelIds?: string[]
): Promise<ApiResponse<DashboardTrend[]>> {
  await delay();
  
  const targetHotels = hotelIds || MOCK_HOTELS.map((h: { id: string }) => h.id);
  const trends: DashboardTrend[] = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    let revenue = 0;
    let orders = 0;
    let soldRooms = 0;
    let availableRooms = 0;
    let totalADR = 0;
    
    targetHotels.forEach((hotelId: string) => {
      const metrics = generateHotelMetrics(hotelId, dateStr);
      revenue += metrics.revenue;
      orders += metrics.orders;
      soldRooms += metrics.soldRooms;
      availableRooms += metrics.availableRooms + metrics.soldRooms;
      totalADR += metrics.adr;
    });
    
    const occupancyRate = availableRooms > 0 ? soldRooms / availableRooms : 0;
    const adr = soldRooms > 0 ? Math.round(revenue / soldRooms) : 0;
    const revpar = availableRooms > 0 ? Math.round(revenue / availableRooms) : 0;
    
    trends.push({
      date: dateStr,
      revenue,
      orders,
      occupancyRate,
      adr,
      revpar,
    });
  }
  
  return {
    success: true,
    data: trends,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取酒店排名
 */
export async function getHotelRankings(
  type: 'revenue' | 'occupancy' | 'adr' | 'revpar' = 'revenue',
  limit: number = 10
): Promise<ApiResponse<{ hotelId: string; hotelName: string; value: number; rank: number }[]>> {
  await delay();
  
  const today = new Date().toISOString().split('T')[0];
  
  const rankings = MOCK_HOTELS.map(hotel => {
    const metrics = generateHotelMetrics(hotel.id, today);
    let value: number;
    
    switch (type) {
      case 'revenue':
        value = metrics.revenue;
        break;
      case 'occupancy':
        value = metrics.occupancyRate;
        break;
      case 'adr':
        value = metrics.adr;
        break;
      case 'revpar':
        value = metrics.revpar;
        break;
      default:
        value = metrics.revenue;
    }
    
    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      value,
      rank: 0, // 稍后计算
    };
  });
  
  // 排序并计算排名
  rankings.sort((a, b) => b.value - a.value);
  rankings.forEach((item, index) => {
    item.rank = index + 1;
  });
  
  return {
    success: true,
    data: rankings.slice(0, limit),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取渠道占比
 */
export async function getChannelDistribution(
  _hotelIds?: string[]
): Promise<ApiResponse<{ channelName: string; revenue: number; percentage: number }[]>> {
  await delay();
  
  const channels = ['携程', '美团', '飞猪', '直客', '其他'];
  const distribution = channels.map(name => {
    const revenue = Math.floor(Math.random() * 100000 + 50000);
    return { channelName: name, revenue, percentage: 0 };
  });
  
  const total = distribution.reduce((sum, d) => sum + d.revenue, 0);
  distribution.forEach(d => {
    d.percentage = Math.round((d.revenue / total) * 100);
  });
  
  // 重新计算确保总和为100%
  const totalPercentage = distribution.reduce((sum, d) => sum + d.percentage, 0);
  if (totalPercentage !== 100 && distribution.length > 0) {
    distribution[0].percentage += 100 - totalPercentage;
  }
  
  return {
    success: true,
    data: distribution.sort((a, b) => b.revenue - a.revenue),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取异常提醒
 */
export async function getDashboardAlerts(
  hotelIds?: string[]
): Promise<ApiResponse<{ type: string; title: string; description: string; severity: 'high' | 'medium' | 'low' }[]>> {
  await delay();
  
  const today = new Date().toISOString().split('T')[0];
  const alerts: { type: string; title: string; description: string; severity: 'high' | 'medium' | 'low' }[] = [];
  
  const targetHotels = hotelIds || MOCK_HOTELS.map((h: { id: string }) => h.id);
  
  targetHotels.forEach((hotelId: string) => {
    const hotel = MOCK_HOTELS.find(h => h.id === hotelId);
    const metrics = generateHotelMetrics(hotelId, today);
    
    // 入住率过低提醒
    if (metrics.occupancyRate < 0.4) {
      alerts.push({
        type: 'low_occupancy',
        title: '入住率偏低',
        description: `${hotel?.name}今日入住率仅${Math.round(metrics.occupancyRate * 100)}%，建议开启促销活动`,
        severity: 'high',
      });
    }
    
    // 价格异常提醒
    if (metrics.adr < 400) {
      alerts.push({
        type: 'low_price',
        title: '平均房价异常',
        description: `${hotel?.name}ADR仅为¥${metrics.adr}，低于历史均值`,
        severity: 'medium',
      });
    }
  });
  
  return {
    success: true,
    data: alerts.slice(0, 5), // 最多5条
    timestamp: new Date().toISOString(),
  };
}
