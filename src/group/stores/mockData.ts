/**
 * Shadow-Bees V52 - 集团端 Mock 数据生成
 * 数据勾稽关系：
 * 1. RevPAR = ADR × Occupancy
 * 2. GMV = RevPAR × RoomCount × Days
 * 3. 内容 → 曝光 → 点击 → 咨询 → 订单 → GMV
 * 4. 订单 = GMV / 客单价
 * 
 * 注意：基础酒店配置已从 shared/groupData.ts 导入，与 admin 端统一
 */

import type { HotelInGroup, SystemHealthMetrics, AIQuotaUsage } from './groupStore';
import { sharedHotels } from '@/shared/groupData';

// 基础酒店配置 - 从共享数据转换
const baseHotels = sharedHotels.map(h => ({
  id: h.id,
  name: h.name,
  region: h.region,
  brand: h.brand,
  manager: h.manager,
  roomCount: h.roomCount,
  baseADR: h.adr,
}));

// 时间范围配置
type TimeRange = 'today' | 'week' | 'month' | 'year';

const timeRangeConfig: Record<TimeRange, { days: number; label: string }> = {
  today: { days: 1, label: '今日' },
  week: { days: 7, label: '本周' },
  month: { days: 30, label: '本月' },
  year: { days: 365, label: '本年' },
};

/**
 * 计算AI价值（核心逻辑）- 根据时间范围动态计算
 */
function calculateAIValue(gmv: number, contentCount: number, totalOrders: number, days: number = 30): HotelInGroup['aiValue'] {
  // AI定价增收：假设AI定价比人工定价高5-15%
  const pricingLiftRate = 0.05 + Math.random() * 0.10;
  const pricingLift = Math.round(gmv * pricingLiftRate * 0.3);
  
  // AI内容增收：假设AI内容带来的订单占20-40%
  const contentLiftRate = 0.20 + Math.random() * 0.20;
  const contentLift = Math.round(gmv * contentLiftRate * 0.3);
  
  // AI客服增收：假设AI客服提升转化率5-10%
  const serviceLiftRate = 0.05 + Math.random() * 0.05;
  const serviceLift = Math.round(gmv * serviceLiftRate * 0.2);
  
  const totalLift = pricingLift + contentLift + serviceLift;
  
  // 节省人工成本（按实际天数比例计算）
  const hourlyRate = 50; // 元/小时
  const contentHoursSaved = contentCount * 0.5;
  const serviceHoursSaved = totalOrders * 0.2;
  const pricingHoursSaved = days * 0.5; // 每天节省0.5小时定价调整
  const laborHoursSaved = Math.round(contentHoursSaved + serviceHoursSaved + pricingHoursSaved);
  const laborCostSaved = Math.round(laborHoursSaved * hourlyRate);
  
  // ROI计算 - 根据时间范围调整投入成本
  const dailyFee = 5000 / 30; // 日订阅费
  const periodFee = Math.round(dailyFee * days); // 当前时间段的费用
  const roi = periodFee > 0 ? Math.round(((totalLift + laborCostSaved) / periodFee) * 100) : 0;
  
  return {
    pricingLift,
    contentLift,
    serviceLift,
    totalLift,
    laborHoursSaved,
    laborCostSaved,
    roi,
  };
}

// 生成酒店完整数据（带勾稽关系）
export function generateHotelData(timeRange: TimeRange = 'month'): HotelInGroup[] {
  const days = timeRangeConfig[timeRange].days;
  
  return baseHotels.map((base) => {
    // 基础波动（-10% 到 +15%）
    const fluctuation = 0.9 + Math.random() * 0.25;
    
    // 核心指标（勾稽关系）
    const adr = Math.round(base.baseADR * fluctuation);
    const occupancy = Math.min(95, Math.max(60, Math.round(75 + Math.random() * 20)));
    const revpar = Math.round(adr * occupancy / 100);
    
    // GMV = RevPAR × 房量 × 天数
    const gmv = Math.round(revpar * base.roomCount * days);
    
    // 非标渠道占比（30%-55%）
    const nonStandardRatio = Math.round(30 + Math.random() * 25);
    
    // 内容数据（与GMV关联）
    const contentCount = Math.max(5, Math.floor(gmv / 15000));
    const contentScore = Math.round(75 + Math.random() * 20);
    
    // 内容表现（勾稽：曝光 → 点击 → 咨询 → 订单）
    const totalImpressions = Math.floor(gmv / 10);
    const totalClicks = Math.floor(totalImpressions * (0.02 + Math.random() * 0.05));
    const totalInquiries = Math.floor(totalClicks * (0.1 + Math.random() * 0.2));
    
    // 订单数据（勾稽：GMV = 订单数 × 客单价）
    const avgOrderValue = Math.round(450 + Math.random() * 300);
    const totalConversions = Math.floor(gmv / avgOrderValue);
    const totalCount = Math.max(1, totalConversions);
    
    // 分平台订单
    const xiaohongshuOrders = Math.floor(totalCount * (0.3 + Math.random() * 0.1));
    const wechatOrders = Math.floor(totalCount * (0.25 + Math.random() * 0.1));
    const xianyuOrders = totalCount - xiaohongshuOrders - wechatOrders;
    
    // 客服指标
    const serviceScore = Number((4 + Math.random()).toFixed(1));
    const aiResolutionRate = Math.round(75 + Math.random() * 20);
    
    // 健康度
    const healthScore = Math.round(
      (occupancy * 0.3) + 
      (contentScore * 0.2) + 
      (serviceScore * 10) + 
      (aiResolutionRate * 0.3)
    );
    const healthLevel = healthScore >= 85 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical';
    
    // 定价数据
    const floorPrice = Math.round(adr * 0.7);
    const ceilingPrice = Math.round(adr * 1.5);
    const aiSuggestionPrice = Math.round(adr * (0.95 + Math.random() * 0.1));
    const priceAdoptionRate = Math.round(70 + Math.random() * 25);
    
    // 库存数据
    const occupiedTonight = Math.round(base.roomCount * occupancy / 100);
    const availableTonight = base.roomCount - occupiedTonight - Math.floor(Math.random() * 3);
    const inventoryStatus = availableTonight < 5 ? 'soldout' : 
                           availableTonight < 15 ? 'tight' : 
                           availableTonight < 30 ? 'normal' : 'abundant';
    
    // 竞品数据
    const marketPriceDiff = (Math.random() - 0.5) * 100;
    const avgMarketPrice = Math.round(adr - marketPriceDiff);
    
    // 计算AI价值（根据时间范围）
    const aiValue = calculateAIValue(gmv, contentCount, totalCount, days);
    
    return {
      id: base.id,
      name: base.name,
      region: base.region,
      brand: base.brand,
      manager: base.manager,
      roomCount: base.roomCount,
      status: healthLevel === 'healthy' ? 'active' : healthLevel as 'warning' | 'critical',
      gmv,
      revpar,
      occupancy,
      adr,
      nonStandardRatio,
      contentCount,
      contentScore,
      serviceScore,
      aiResolutionRate,
      healthScore,
      healthLevel,
      // 定价
      pricing: {
        currentMode: 'dynamic',
        floorPrice,
        ceilingPrice,
        currentPrice: adr,
        aiSuggestionPrice,
        priceAdoptionRate,
        lastPriceChangeAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      },
      // 库存
      inventory: {
        totalRooms: base.roomCount,
        availableTonight: Math.max(0, availableTonight),
        occupiedTonight,
        maintenanceRooms: base.roomCount - availableTonight - occupiedTonight,
        occupancyRate: occupancy,
        status: inventoryStatus,
        tightRoomTypes: inventoryStatus === 'tight' || inventoryStatus === 'soldout' 
          ? ['标准大床房'] : [],
      },
      // 内容表现
      contentPerformance: {
        totalImpressions,
        totalClicks,
        totalInquiries,
        totalConversions,
        avgCTR: Number((totalClicks / totalImpressions * 100).toFixed(2)),
        avgConversionRate: Number((totalConversions / totalInquiries * 100).toFixed(2)),
        // 私域专属指标
        privateDomain: {
          totalTouches: Math.floor(wechatOrders * 10),
          totalReplies: Math.floor(wechatOrders * 3),
          totalPrivateConversions: wechatOrders,
          bySubtype: [
            { subtype: 'moments', count: Math.floor(contentCount * 0.3), touches: Math.floor(wechatOrders * 4), conversions: Math.floor(wechatOrders * 0.4) },
            { subtype: 'group', count: Math.floor(contentCount * 0.2), touches: Math.floor(wechatOrders * 2), conversions: Math.floor(wechatOrders * 0.3) },
            { subtype: 'private', count: Math.floor(contentCount * 0.35), touches: Math.floor(wechatOrders * 3), conversions: Math.floor(wechatOrders * 0.2) },
            { subtype: 'channels', count: Math.floor(contentCount * 0.15), touches: Math.floor(wechatOrders * 1), conversions: Math.floor(wechatOrders * 0.1) },
          ],
        },
        byPlatform: [
          { platform: 'xiaohongshu', impressions: Math.floor(totalImpressions * 0.4), clicks: Math.floor(totalClicks * 0.45), conversions: xiaohongshuOrders },
          { platform: 'wechat', impressions: Math.floor(totalImpressions * 0.35), clicks: Math.floor(totalClicks * 0.35), conversions: wechatOrders, touches: Math.floor(wechatOrders * 10), replies: Math.floor(wechatOrders * 3), privateConversions: wechatOrders },
          { platform: 'xianyu', impressions: Math.floor(totalImpressions * 0.25), clicks: Math.floor(totalClicks * 0.2), conversions: xianyuOrders },
        ],
      },
      // 订单
      orders: {
        totalCount,
        byPlatform: {
          xiaohongshu: xiaohongshuOrders,
          wechat: wechatOrders,
          xianyu: xianyuOrders,
        },
        avgOrderValue,
        cancellationRate: Number((Math.random() * 8).toFixed(1)),
        refundRate: Number((Math.random() * 4).toFixed(1)),
        tonightOrders: Math.max(1, Math.floor(occupiedTonight * 0.3)),
      },
      // 竞品
      competitor: {
        avgMarketPrice,
        priceDifference: Math.round(adr - avgMarketPrice),
        competitorCount: Math.floor(Math.random() * 8) + 5,
        rankInArea: Math.floor(Math.random() * 5) + 1,
      },
      // 系统使用
      systemUsage: {
        lastLoginAt: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
        loginFrequency: Math.floor(Math.random() * 5) + 3,
        featureUsage: {
          aiContent: Math.floor(Math.random() * 50) + 10,
          aiService: Math.floor(Math.random() * 200) + 50,
          aiPricing: Math.floor(Math.random() * 20) + 5,
        },
        dataCompleteness: Math.round(75 + Math.random() * 20),
      },
      // AI价值（核心）
      aiValue,
      // 培训
      training: {
        completed: Math.random() > 0.2,
        completedAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 86400000 * 30).toISOString() : undefined,
        score: Math.random() > 0.2 ? Math.floor(Math.random() * 20) + 80 : undefined,
      },
    };
  });
}

// 生成其他Mock数据
export function generateMockData(timeRange: TimeRange = 'month') {
  const hotels = generateHotelData(timeRange);
  
  // 系统健康度
  const systemHealth: SystemHealthMetrics = {
    overallScore: Math.round(hotels.reduce((s, h) => s + h.healthScore, 0) / hotels.length),
    dimensions: {
      dataCompleteness: Math.round(hotels.reduce((s, h) => s + h.systemUsage.dataCompleteness, 0) / hotels.length),
      usageActivity: Math.round(hotels.reduce((s, h) => s + h.systemUsage.loginFrequency, 0) / hotels.length * 10),
      aiAdoption: Math.round(hotels.reduce((s, h) => s + h.pricing.priceAdoptionRate, 0) / hotels.length),
      trainingCompletion: Math.round(hotels.filter(h => h.training.completed).length / hotels.length * 100),
    },
    atRiskHotels: hotels.filter(h => h.healthLevel !== 'healthy').map(h => h.id),
    activeHotels: hotels.filter(h => h.systemUsage.loginFrequency > 3).map(h => h.id),
  };
  
  // AI额度汇总
  const aiQuotaUsage: AIQuotaUsage = {
    totalContentLimit: hotels.length * 100,
    totalContentUsed: hotels.reduce((s, h) => s + h.systemUsage.featureUsage.aiContent, 0),
    totalServiceLimit: hotels.length * 1000,
    totalServiceUsed: hotels.reduce((s, h) => s + h.systemUsage.featureUsage.aiService, 0),
    hotelUsage: hotels.map(h => ({
      hotelId: h.id,
      hotelName: h.name,
      contentUsed: h.systemUsage.featureUsage.aiContent,
      serviceUsed: h.systemUsage.featureUsage.aiService,
    })),
  };
  
  return { hotels, systemHealth, aiQuotaUsage };
}

// 导出现成数据
export const { hotels: mockHotels, systemHealth: mockSystemHealth, aiQuotaUsage: mockAIQuotaUsage } = generateMockData('month');
