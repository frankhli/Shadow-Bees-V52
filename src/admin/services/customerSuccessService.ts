/**
 * 客户成功服务 - 集团健康度计算
 * 数据联动：基于酒店端数据聚合计算
 */

import type { Customer, HotelData } from '../stores/adminStore';
import type { Anomaly } from '../utils/anomalyDetector';

// ============================================
// 类型定义
// ============================================

export interface HealthDimension {
  name: string;
  score: number; // 0-100
  weight: number; // 权重
  details: {
    label: string;
    value: string;
    status: 'good' | 'warning' | 'critical';
  }[];
}

export interface HotelHealthScore {
  hotelId: string;
  hotelName: string;
  overall: number; // 0-100
  level: 'healthy' | 'warning' | 'critical';
  dimensions: HealthDimension[];
  lastUpdated: string;
}

export interface GroupHealthScore {
  customerId: string;
  groupName: string;
  overall: number; // 0-100
  level: 'healthy' | 'warning' | 'critical';
  hotelScores: HotelHealthScore[];
  // 集团特有指标
  strategyExecutionRate: number; // 策略执行率
  dataConsistencyScore: number; // 数据一致性
  dimensions: HealthDimension[];
  trend: { date: string; score: number }[]; // 30天趋势
}

export type HealthLevel = 'healthy' | 'warning' | 'critical';
export type Quadrant = 'star' | 'potential' | 'atRisk' | 'dormant';

export interface CustomerHealthScore {
  customerId: string;
  customerName: string;
  type: 'single' | 'group';
  overallScore: number;
  level: HealthLevel;
  quadrant?: Quadrant;
  gmv: number;
  // 五维度分数 (直接暴露便于UI使用)
  businessScore: number;
  systemScore: number;
  aiScore: number;
  operationScore: number;
  retentionScore: number;
  // 风险标记
  riskFlags: string[];
  // 指标详情
  metrics: {
    loginDaysInWeek: number;
    lastLoginAt?: string;
    flexibleSellThrough: number;
    nonStandardRevenueRatio: number;
    aiFeaturesUsed: number;
    contentConversionRate?: number;
  };
  // 关联的酒店健康度
  hotelScores?: HotelHealthScore[];
  lastUpdated: string;
}

export interface RenewalRisk {
  customerId: string;
  customerName: string;
  type: 'single' | 'group';
  expireAt: string;
  daysUntilExpire: number;
  healthScore: number;
  monthlyRevenue: number;
  gmvTrend: 'up' | 'down' | 'stable';
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  factors: string[];
}

export interface AIValueReport {
  customerId: string;
  customerName: string;
  period: { start: string; end: string };
  // 增收
  pricingLift: number;
  contentLift: number;
  serviceLift: number;
  totalLift: number;
  // 降本
  laborHoursSaved: number;
  laborCostSaved: number;
  // ROI
  totalInvestment: number;
  roi: number;
  // 门店对比
  hotelComparisons: {
    hotelId: string;
    hotelName: string;
    aiAdoptionRate: number;
    revenueLift: number;
  }[];
  // 建议
  recommendations: string[];
}

// ============================================
// 门店健康度计算
// ============================================

/**
 * 计算单个门店的健康度
 * 五维度评分：经营(30%)、系统(25%)、内容(20%)、客服(15%)、库存(10%)
 */
export function calculateHotelHealth(
  hotel: HotelData,
  anomalies: Anomaly[]
): HotelHealthScore {
  const now = new Date();
  const lastLogin = new Date(hotel.lastLoginAt);
  const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

  // 1. 经营健康度 (30%)
  const businessMetrics = {
    gmvScore: Math.min((hotel.todayRevenue / 10000) * 10, 100), // GMV越高越好
    occupancyScore: hotel.occupancyRate, // 入住率
    revparScore: Math.min(hotel.todayRevenue / (hotel.inventory.ota.total + hotel.inventory.flexible.total) / 10, 100),
  };
  const businessScore = Math.round(
    (businessMetrics.gmvScore * 0.4 + businessMetrics.occupancyScore * 0.4 + businessMetrics.revparScore * 0.2)
  );

  // 2. 系统健康度 (25%)
  const systemMetrics = {
    loginScore: Math.max(100 - daysSinceLogin * 5, 0), // 登录越近越好
    featureAdoption: [
      hotel.aiAdoption.content,
      hotel.aiAdoption.service,
      hotel.aiAdoption.pricing,
    ].filter(Boolean).length / 3 * 100,
  };
  const systemScore = Math.round(
    (systemMetrics.loginScore * 0.6 + systemMetrics.featureAdoption * 0.4)
  );

  // 3. 内容健康度 (20%)
  const contentMetrics = {
    qualityScore: hotel.platformMetrics.reduce((sum, pm) => sum + (pm.conversionRate || 0), 0) / 
      Math.max(hotel.platformMetrics.length, 1) * 20,
    activityScore: Math.min(hotel.platformMetrics.reduce((sum, pm) => sum + pm.contentCount, 0) * 5, 100),
  };
  const contentScore = Math.round(
    (contentMetrics.qualityScore * 0.6 + contentMetrics.activityScore * 0.4)
  );

  // 4. 客服健康度 (15%)
  const serviceScore = Math.round(hotel.aiAdoption.service ? 85 : 50);

  // 5. 库存健康度 (10%)
  const inventoryMetrics = {
    sellThroughRate: hotel.inventory.ota.sellThroughRate,
    flexibleUtilization: (hotel.inventory.flexible.sold / Math.max(hotel.inventory.flexible.total, 1)) * 100,
  };
  const inventoryScore = Math.round(
    (inventoryMetrics.sellThroughRate * 0.6 + inventoryMetrics.flexibleUtilization * 0.4)
  );

  // 异常扣分
  const hotelAnomalies = anomalies.filter(a => a.hotelId === hotel.id);
  const anomalyDeduction = Math.min(hotelAnomalies.length * 5, 20);

  // 计算总分
  const weightedScore = Math.round(
    businessScore * 0.30 +
    systemScore * 0.25 +
    contentScore * 0.20 +
    serviceScore * 0.15 +
    inventoryScore * 0.10 -
    anomalyDeduction
  );

  const overall = Math.max(0, Math.min(100, weightedScore));
  const level: 'healthy' | 'warning' | 'critical' = 
    overall >= 80 ? 'healthy' : overall >= 60 ? 'warning' : 'critical';

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    overall,
    level,
    dimensions: [
      {
        name: '经营',
        score: businessScore,
        weight: 0.30,
        details: [
          { label: '今日GMV', value: `¥${hotel.todayRevenue.toLocaleString()}`, status: businessMetrics.gmvScore > 60 ? 'good' : 'warning' },
          { label: '入住率', value: `${hotel.occupancyRate}%`, status: hotel.occupancyRate > 70 ? 'good' : 'warning' },
        ],
      },
      {
        name: '系统',
        score: systemScore,
        weight: 0.25,
        details: [
          { label: '登录活跃', value: daysSinceLogin === 0 ? '今日' : `${daysSinceLogin}天前`, status: daysSinceLogin < 3 ? 'good' : daysSinceLogin < 7 ? 'warning' : 'critical' },
          { label: '功能采用', value: `${Math.round(systemMetrics.featureAdoption)}%`, status: systemMetrics.featureAdoption > 50 ? 'good' : 'warning' },
        ],
      },
      {
        name: '内容',
        score: contentScore,
        weight: 0.20,
        details: [
          { label: '转化率', value: `${contentMetrics.qualityScore.toFixed(1)}%`, status: contentMetrics.qualityScore > 5 ? 'good' : 'warning' },
          { label: '内容数', value: `${hotel.platformMetrics.reduce((sum, pm) => sum + pm.contentCount, 0)}`, status: 'good' },
        ],
      },
      {
        name: '客服',
        score: serviceScore,
        weight: 0.15,
        details: [
          { label: 'AI客服', value: hotel.aiAdoption.service ? '已启用' : '未启用', status: hotel.aiAdoption.service ? 'good' : 'warning' },
        ],
      },
      {
        name: '库存',
        score: inventoryScore,
        weight: 0.10,
        details: [
          { label: '售罄率', value: `${inventoryMetrics.sellThroughRate.toFixed(1)}%`, status: inventoryMetrics.sellThroughRate > 70 ? 'good' : 'warning' },
        ],
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================
// 集团健康度聚合计算
// ============================================

/**
 * 计算集团客户健康度
 * 聚合旗下门店健康度（按GMV加权）+ 集团特有指标
 */
export function calculateGroupHealth(
  customer: Customer,
  anomalies: Anomaly[]
): GroupHealthScore {
  // 计算各门店健康度
  const hotelScores = customer.hotels.map(hotel => 
    calculateHotelHealth(hotel, anomalies)
  );

  // 按GMV加权计算整体健康度
  const totalRevenue = customer.hotels.reduce((sum, h) => sum + h.todayRevenue, 0);
  const weightedScore = hotelScores.reduce((sum, hs) => {
    const hotel = customer.hotels.find(h => h.id === hs.hotelId);
    const weight = hotel ? hotel.todayRevenue / Math.max(totalRevenue, 1) : 1 / hotelScores.length;
    return sum + hs.overall * weight;
  }, 0);

  // 集团特有指标（+10分）
  // 策略执行率（+5分）
  const strategyExecutionRate = 85; // 模拟数据，实际应从策略监控获取
  const strategyBonus = Math.round(strategyExecutionRate / 20);

  // 数据一致性（+5分）
  const lastLoginTimes = customer.hotels.map(h => new Date(h.lastLoginAt).getTime());
  const maxDiff = Math.max(...lastLoginTimes) - Math.min(...lastLoginTimes);
  const dataConsistencyScore = Math.max(0, 100 - Math.floor(maxDiff / (1000 * 60 * 60 * 24)) * 10);
  const consistencyBonus = Math.round(dataConsistencyScore / 20);

  const overall = Math.min(100, Math.round(weightedScore + strategyBonus + consistencyBonus));
  const level: 'healthy' | 'warning' | 'critical' = 
    overall >= 80 ? 'healthy' : overall >= 60 ? 'warning' : 'critical';

  // 各维度聚合
  const dimensions: HealthDimension[] = [
    {
      name: '经营',
      score: Math.round(hotelScores.reduce((sum, hs) => sum + hs.dimensions[0].score, 0) / hotelScores.length),
      weight: 0.30,
      details: [
        { label: '平均GMV', value: `¥${Math.round(totalRevenue / customer.hotels.length).toLocaleString()}`, status: 'good' },
        { label: '门店数', value: `${customer.hotels.length}`, status: 'good' },
      ],
    },
    {
      name: '系统',
      score: Math.round(hotelScores.reduce((sum, hs) => sum + hs.dimensions[1].score, 0) / hotelScores.length),
      weight: 0.25,
      details: [
        { label: '策略执行率', value: `${strategyExecutionRate}%`, status: strategyExecutionRate > 80 ? 'good' : 'warning' },
        { label: '数据一致性', value: `${dataConsistencyScore}%`, status: dataConsistencyScore > 80 ? 'good' : 'warning' },
      ],
    },
    {
      name: '内容',
      score: Math.round(hotelScores.reduce((sum, hs) => sum + hs.dimensions[2].score, 0) / hotelScores.length),
      weight: 0.20,
      details: [],
    },
    {
      name: '客服',
      score: Math.round(hotelScores.reduce((sum, hs) => sum + hs.dimensions[3].score, 0) / hotelScores.length),
      weight: 0.15,
      details: [],
    },
    {
      name: '库存',
      score: Math.round(hotelScores.reduce((sum, hs) => sum + hs.dimensions[4].score, 0) / hotelScores.length),
      weight: 0.10,
      details: [],
    },
  ];

  // 生成30天趋势（模拟数据）
  const trend = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    score: Math.round(overall + (Math.random() - 0.5) * 20),
  }));

  return {
    customerId: customer.id,
    groupName: customer.companyName,
    overall,
    level,
    hotelScores,
    strategyExecutionRate,
    dataConsistencyScore,
    dimensions,
    trend,
  };
}

// ============================================
// 续约风险计算
// ============================================

/**
 * 计算续约风险评分
 * 风险评分 = f(到期天数, 健康度, GMV趋势)
 */
export function calculateRenewalRisk(
  customer: Customer,
  healthScore: number
): RenewalRisk {
  const now = new Date();
  const expireAt = new Date(customer.expireAt);
  const daysUntilExpire = Math.ceil((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // 风险评分计算 (0-100)
  let riskScore = 0;
  const factors: string[] = [];

  // 到期天数因素 (0-40分)
  if (daysUntilExpire < 0) {
    riskScore += 40;
    factors.push('已过期');
  } else if (daysUntilExpire <= 7) {
    riskScore += 35;
    factors.push('7天内到期');
  } else if (daysUntilExpire <= 30) {
    riskScore += 25;
    factors.push('30天内到期');
  } else if (daysUntilExpire <= 60) {
    riskScore += 15;
    factors.push('60天内到期');
  }

  // 健康度因素 (0-30分)
  if (healthScore < 60) {
    riskScore += 30;
    factors.push('健康度低于60分');
  } else if (healthScore < 80) {
    riskScore += 15;
    factors.push('健康度需关注');
  }

  // GMV趋势因素 (0-30分) - 模拟数据
  const gmvTrend: 'up' | 'down' | 'stable' = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down';
  if (gmvTrend === 'down') {
    riskScore += 30;
    factors.push('GMV连续下降');
  } else if (gmvTrend === 'stable') {
    riskScore += 10;
    factors.push('GMV增长停滞');
  }

  const riskLevel: 'high' | 'medium' | 'low' = 
    riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

  return {
    customerId: customer.id,
    customerName: customer.companyName,
    type: customer.type || 'single',
    expireAt: customer.expireAt,
    daysUntilExpire,
    healthScore,
    monthlyRevenue: customer.monthlyRevenue,
    gmvTrend,
    riskLevel,
    riskScore: Math.min(100, riskScore),
    factors,
  };
}

// ============================================
// AI价值报告生成
// ============================================

/**
 * 生成AI价值报告
 * 基于客户AI使用数据计算增收和降本
 */
export function generateAIValueReport(
  customer: Customer,
  period: { start: string; end: string }
): AIValueReport {
  // 计算AI增收（基于酒店数据聚合）
  const pricingLift = customer.hotels.reduce((sum, h) => {
    // AI定价增收 = 使用AI定价的订单额外收益（假设提升5%）
    const ai = h.aiAdoption || { pricing: false, content: false, service: false };
    const aiPricingRevenue = ai.pricing ? (h.todayRevenue || 0) * 0.05 * 30 : 0;
    return sum + aiPricingRevenue;
  }, 0);

  const contentLift = customer.hotels.reduce((sum, h) => {
    // AI内容增收 = AI生成内容的转化收益
    const pms = h.platformMetrics || [];
    const aiContentConversion = pms.reduce((pmSum, pm) => {
      return pmSum + ((pm.revenue || 0) * 0.1); // 假设AI内容提升10%转化
    }, 0);
    return sum + aiContentConversion;
  }, 0);

  const serviceLift = customer.hotels.reduce((sum, h) => {
    // AI客服增收 = 节省的人工成本
    const ai = h.aiAdoption || { pricing: false, content: false, service: false };
    const aiServiceSaving = ai.service ? 5000 : 0; // 每月节省5000元
    return sum + aiServiceSaving;
  }, 0);

  const totalLift = pricingLift + contentLift + serviceLift;

  // 降本计算
  const laborHoursSaved = customer.hotels.reduce((sum, h) => {
    // AI节省的工时
    const ai = h.aiAdoption || { pricing: false, content: false, service: false };
    const hours = [
      ai.pricing ? 20 : 0, // 定价优化节省20小时/月
      ai.content ? 30 : 0, // 内容生成节省30小时/月
      ai.service ? 40 : 0, // 客服节省40小时/月
    ].reduce((a, b) => a + b, 0);
    return sum + hours;
  }, 0);

  const laborCostSaved = laborHoursSaved * 50; // 假设人工时薪50元

  // AI投入（估算）
  const totalInvestment = customer.hotels.length * 2000; // 每店每月2000元

  // ROI计算
  const netBenefit = totalLift + laborCostSaved - totalInvestment;
  const roi = totalInvestment > 0 ? (netBenefit / totalInvestment) * 100 : 0;

  // 门店对比
  const hotelComparisons = customer.hotels.map(h => {
    const ai = h.aiAdoption || { pricing: false, content: false, service: false };
    const adoptionCount = [ai.pricing, ai.content, ai.service].filter(Boolean).length;
    return {
      hotelId: h.id,
      hotelName: h.name,
      aiAdoptionRate: Math.round((adoptionCount / 3) * 100),
      revenueLift: Math.round((h.todayRevenue || 0) * 0.05 * 30), // 假设增收5%
    };
  }).sort((a, b) => b.revenueLift - a.revenueLift);

  // 生成建议
  const recommendations: string[] = [];
  const adoptionRate = hotelComparisons.reduce((sum, h) => sum + h.aiAdoptionRate, 0) / hotelComparisons.length;
  
  if (adoptionRate < 50) {
    recommendations.push('整体AI采用率较低，建议加强培训和推广');
  }
  if (!customer.hotels.every(h => h.aiAdoption?.pricing)) {
    recommendations.push('部分门店未启用AI定价，建议全面推广');
  }
  if (!customer.hotels.every(h => h.aiAdoption?.content)) {
    recommendations.push('AI内容生成可进一步提升，建议增加内容投放');
  }
  if (roi < 100) {
    recommendations.push('当前ROI偏低，建议优化AI使用策略');
  }

  return {
    customerId: customer.id,
    customerName: customer.companyName,
    period,
    pricingLift: Math.round(pricingLift),
    contentLift: Math.round(contentLift),
    serviceLift: Math.round(serviceLift),
    totalLift: Math.round(totalLift),
    laborHoursSaved: Math.round(laborHoursSaved),
    laborCostSaved: Math.round(laborCostSaved),
    totalInvestment,
    roi: Math.round(roi),
    hotelComparisons,
    recommendations,
  };
}

/**
 * 批量计算所有客户健康度（兼容旧接口）
 */
export function calculateAllCustomerHealth(
  customers: Customer[],
  _contentItems: any[],
  _tickets: any[]
): CustomerHealthScore[] {
  return customers.map(c => {
    const healthScore = c.healthScore || 75;
    const level: HealthLevel = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
    // 计算GMV
    const gmv = c.monthlyRevenue || c.hotels.reduce((sum, h) => sum + (h.todayRevenue || 0) * 30, 0);
    // 计算象限
    const adoptionRate = c.hotels.length > 0 
      ? c.hotels.reduce((sum, h) => {
          const ai = h.aiAdoption || { pricing: false, content: false, service: false };
          return sum + (ai.pricing ? 1 : 0) + (ai.content ? 1 : 0) + (ai.service ? 1 : 0);
        }, 0) / (c.hotels.length * 3)
      : 0;
    let quadrant: Quadrant = 'dormant';
    if (adoptionRate > 0.5 && gmv > 100000) quadrant = 'star';
    else if (adoptionRate > 0.5 && gmv <= 100000) quadrant = 'potential';
    else if (adoptionRate <= 0.5 && gmv > 100000) quadrant = 'atRisk';
    
    // 计算售罄率（灵活库存）
    const flexibleSellThrough = c.hotels.length > 0
      ? c.hotels.reduce((sum, h) => {
          const inventory = h.inventory || { flexible: { total: 0, sold: 0 } };
          const flexTotal = inventory.flexible?.total || 0;
          const flexSold = inventory.flexible?.sold || 0;
          return sum + (flexTotal > 0 ? flexSold / flexTotal * 100 : 0);
        }, 0) / c.hotels.length
      : 0;
    
    // 非标收入占比
    const nonStandardRevenue = c.hotels.reduce((sum, h) => 
      sum + (h.platformMetrics || []).reduce((pmSum, pm) => pmSum + (pm.revenue || 0), 0), 0);
    const totalRevenue = c.hotels.reduce((sum, h) => sum + (h.todayRevenue || 0) * 30, 0);
    const nonStandardRevenueRatio = totalRevenue > 0 ? (nonStandardRevenue / totalRevenue) * 100 : 0;
    
    // AI功能使用数
    const aiFeaturesUsed = c.hotels.reduce((sum, h) => {
      const ai = h.aiAdoption || { pricing: false, content: false, service: false };
      return sum + (ai.pricing ? 1 : 0) + (ai.content ? 1 : 0) + (ai.service ? 1 : 0);
    }, 0);
    
    // 内容转化率
    const contentConversionRate = c.hotels.length > 0
      ? c.hotels.reduce((sum, h) => {
          const pms = h.platformMetrics || [];
          return sum + pms.reduce((pmSum, pm) => pmSum + (pm.conversionRate || 0), 0) / Math.max(pms.length, 1);
        }, 0) / c.hotels.length
      : 0;
    
    // 计算各维度分数
    const businessScore = Math.min(Math.round((gmv / 200000) * 100), 100);
    const systemScore = Math.round(adoptionRate * 100);
    const aiScore = Math.round((aiFeaturesUsed / Math.max(c.hotels.length * 3, 1)) * 100);
    const operationScore = Math.round(flexibleSellThrough);
    const retentionScore = healthScore;
    
    // 风险标记
    const riskFlags: string[] = [];
    if (level === 'critical') riskFlags.push('健康度低');
    if (flexibleSellThrough < 30) riskFlags.push('灵活库存滞销');
    if (adoptionRate < 0.3) riskFlags.push('AI功能使用率低');
    
    return {
      customerId: c.id,
      customerName: c.companyName,
      type: c.type,
      overallScore: healthScore,
      level,
      quadrant,
      gmv,
      businessScore,
      systemScore,
      aiScore,
      operationScore,
      retentionScore,
      riskFlags,
      metrics: {
        loginDaysInWeek: Math.floor(Math.random() * 7) + 1,
        lastLoginAt: c.hotels[0]?.lastLoginAt,
        flexibleSellThrough,
        nonStandardRevenueRatio,
        aiFeaturesUsed,
        contentConversionRate,
      },
      lastUpdated: new Date().toISOString(),
    };
  });
}

/**
 * 计算成功指标（兼容旧接口）
 */
export function calculateSuccessMetrics(healthScores: CustomerHealthScore[]) {
  const total = healthScores.length;
  if (total === 0) {
    return {
      totalCustomers: 0,
      totalGMV: 0,
      avgHealthScore: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      healthyRate: 0,
    };
  }
  
  const healthyCount = healthScores.filter(h => h.level === 'healthy').length;
  const warningCount = healthScores.filter(h => h.level === 'warning').length;
  const criticalCount = healthScores.filter(h => h.level === 'critical').length;
  const totalGMV = healthScores.reduce((sum, h) => sum + h.gmv, 0);
  
  return {
    totalCustomers: total,
    totalGMV,
    avgHealthScore: Math.round(healthScores.reduce((sum, h) => sum + h.overallScore, 0) / total),
    healthyCount,
    warningCount,
    criticalCount,
    healthyRate: Math.round((healthyCount / total) * 100),
  };
}

export type ActionType = 'churn_risk' | 'revenue_opportunity' | 'training_needed' | 'renewal';
export type ActionPriority = 'high' | 'medium' | 'low';

export interface ActionItem {
  id: string;
  customerId: string;
  customerName: string;
  priority: ActionPriority;
  action: string;
  reason: string;
  type: ActionType;
  message: string;
  opportunityValue: number;
}

/**
 * 生成行动项（兼容旧接口）
 */
export function generateActionItems(healthScores: CustomerHealthScore[]): ActionItem[] {
  const actions: ActionItem[] = [];
  
  for (const h of healthScores) {
    // 健康度低的客户 - 流失风险
    if (h.level === 'critical') {
      actions.push({
        id: `action-${h.customerId}-risk`,
        customerId: h.customerId,
        customerName: h.customerName,
        priority: 'high',
        action: '立即联系',
        reason: '健康度低于60分',
        type: 'churn_risk',
        message: `${h.customerName} 健康度仅为${h.overallScore}分，需立即干预`,
        opportunityValue: Math.round(h.gmv * 0.1),
      });
    }
    
    // AI使用率低的客户 - 培训需求
    if (h.aiScore < 40) {
      actions.push({
        id: `action-${h.customerId}-training`,
        customerId: h.customerId,
        customerName: h.customerName,
        priority: 'medium',
        action: '安排培训',
        reason: 'AI功能使用率低于40%',
        type: 'training_needed',
        message: `${h.customerName} AI功能使用率仅为${h.aiScore}%，建议安排培训`,
        opportunityValue: Math.round(h.gmv * 0.05),
      });
    }
    
    // GMV高的客户 - 增收机会
    if (h.gmv > 100000 && h.level === 'healthy') {
      actions.push({
        id: `action-${h.customerId}-upsell`,
        customerId: h.customerId,
        customerName: h.customerName,
        priority: 'medium',
        action: ' upsell机会',
        reason: '高价值客户，可推广更多功能',
        type: 'revenue_opportunity',
        message: `${h.customerName} GMV达到${(h.gmv/10000).toFixed(1)}万，有 upsell 潜力`,
        opportunityValue: Math.round(h.gmv * 0.15),
      });
    }
  }
  
  return actions.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });
}

// ============================================
// 批量计算服务
// ============================================

/**
 * 批量计算所有集团客户的健康度
 */
export function calculateAllGroupHealth(
  customers: Customer[],
  anomalies: Anomaly[]
): GroupHealthScore[] {
  return customers
    .filter(c => c.type === 'group')
    .map(c => calculateGroupHealth(c, anomalies));
}

/**
 * 批量计算所有客户的续约风险
 */
export function calculateAllRenewalRisks(
  customers: Customer[],
  healthScores: Map<string, number>
): RenewalRisk[] {
  return customers.map(c => {
    const healthScore = healthScores.get(c.id) || 75;
    return calculateRenewalRisk(c, healthScore);
  }).sort((a, b) => b.riskScore - a.riskScore);
}
