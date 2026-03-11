/**
 * Shadow-Bees V52 - 工具函数
 */

import type { ThemeType, PricingMode, Transaction, OrderStatus } from '@/types';
import { CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, CircleDollarSign, Package, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================
// 主题色映射
// ============================================

export const themeColors: Record<ThemeType, { primary: string; neon: string; gradient: string }> = {
  cyan: {
    primary: '#07C160',
    neon: '#07C160',
    gradient: 'linear-gradient(135deg, #07C160 0%, #05A050 100%)',
  },
  violet: {
    primary: '#A855F7',
    neon: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
  },
  amber: {
    primary: '#FFB800',
    neon: '#FFB800',
    gradient: 'linear-gradient(135deg, #FFB800 0%, #F59E0B 100%)',
  },
};

// ============================================
// 定价模式映射
// ============================================

// 简化版本 - 仅标签
export const modeLabels: Record<PricingMode, string> = {
  scalper: '黄牛模式',
  dynamic: '动态模式',
  clearance: '尾货模式',
};

// 详细信息版本 - 与全域定价中心保持一致
export const modeDetails: Record<PricingMode, { 
  label: string; 
  color: string; 
  icon: LucideIcon; 
  description: string;
  contentAngle: string; // 内容生成角度
  keySellingPoints: string[]; // 关键卖点
}> = {
  scalper: { 
    label: '收益最大化', 
    color: '#A855F7', 
    icon: TrendingUp, 
    description: '市场紧张，适当溢价，强调稀缺性和独特价值',
    contentAngle: '稀缺尊享',
    keySellingPoints: ['限量房源', '黄金地段', '品质体验', '抢先预订']
  },
  dynamic: { 
    label: '随行就市', 
    color: '#06B6D4', 
    icon: Activity, 
    description: '市场平稳，跟随竞品定价，强调性价比和均衡价值',
    contentAngle: '价值均衡',
    keySellingPoints: ['市场均价', '性价比之选', '稳定品质', '即时确认']
  },
  clearance: { 
    label: '快速出货', 
    color: '#F59E0B', 
    icon: Package, 
    description: '库存积压，降价促销，强调优惠力度和捡漏机会',
    contentAngle: '限时特惠',
    keySellingPoints: ['限时特价', '直降优惠', '捡漏机会', '最后几间']
  },
};

// ============================================
// 平台Logo映射
// ============================================

export const platformLogos: Record<string, { 
  url: string; 
  color: string; 
  name: string;
  iconName: 'fish' | 'book-open' | 'message-circle';
  logo: string;
  bgColor: string;
  coefficient: number;
}> = {
  ctrip: {
    url: '',
    color: '#2577E3',
    name: '携程',
    iconName: 'message-circle',
    logo: '/ctrip-logo.jpg',
    bgColor: '#EFF6FF',
    coefficient: 1.02,
  },
  meituan: {
    url: '',
    color: '#FFC300',
    name: '美团',
    iconName: 'message-circle',
    logo: '/meituan-logo.jpg',
    bgColor: '#FFFBEB',
    coefficient: 0.98,
  },
  fliggy: {
    url: '',
    color: '#FFCC00',
    name: '飞猪',
    iconName: 'message-circle',
    logo: '/fliggy-logo.jpg',
    bgColor: '#FFFBEB',
    coefficient: 1.0,
  },
  wechat: {
    url: '',
    color: '#07C160',
    name: '官方微信',
    iconName: 'message-circle',
    logo: '/logos/wechat.jpg',
    bgColor: '#F0FDF4',
    coefficient: 1.0,
  },
  xiaohongshu: {
    url: '',
    color: '#FF2442',
    name: '小红书',
    iconName: 'book-open',
    logo: '/logos/xiaohongshu.jpg',
    bgColor: '#FEF2F2',
    coefficient: 1.05,
  },
  xianyu: {
    url: '',
    color: '#FF6B00',
    name: '闲鱼',
    iconName: 'fish',
    logo: '/logos/xianyu.jpg',
    bgColor: '#FFF7ED',
    coefficient: 0.95,
  },
  douyin: {
    url: '',
    color: '#000000',
    name: '抖音',
    iconName: 'message-circle',
    logo: '/logos/douyin.jpg',
    bgColor: '#F3F4F6',
    coefficient: 1.0,
  },
};

// ============================================
// 品牌Logo映射
// ============================================

export const brandLogos: Record<string, string> = {
  '亚朵': 'https://img.atour.cn/official/common/logo.png',
  '桔子水晶': 'https://www.orangehotel.com.cn/images/logo.png',
  '全季': 'https://www.jihotel.com/images/logo.png',
};

// ============================================
// 格式化函数
// ============================================

export const formatPrice = (price: number): string => {
  return `¥${price.toLocaleString()}`;
};

export const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ============================================
// 计算函数
// ============================================

export const calculateDeviation = (price: number, avg: number): string => {
  const deviation = ((price - avg) / avg) * 100;
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${deviation.toFixed(1)}%`;
};

export const calculatePriceRange = (mode?: PricingMode): { min: number; max: number; label: string } => {
  switch (mode) {
    case 'scalper':
      return { min: 0, max: 5, label: '0-5%' };
    case 'dynamic':
      return { min: 5, max: 8, label: '5-8%' };
    case 'clearance':
      return { min: 10, max: 15, label: '10-15%' };
    default:
      return { min: 5, max: 8, label: '5-8%' };
  }
};

// ============================================
// 工具函数
// ============================================

export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// ============================================
// 房型优势标签计算
// ============================================

export type AdvantageLabel = {
  Icon: LucideIcon;
  text: string;
  color: string;
  description: string;
};

export const calculateAdvantageLabel = (
  myPrice: number,
  competitorAvg: number,
  myRating: number = 4.8,
  competitorRating: number = 4.5
): AdvantageLabel => {
  const priceRatio = myPrice / competitorAvg;
  const ratingDiff = myRating - competitorRating;
  
  // 显著优势：价格低于竞品且评分更高
  if (priceRatio < 0.95 && ratingDiff > 0.2) {
    return {
      Icon: CheckCircle2,
      text: '显著优势',
      color: '#00E396',
      description: '价格低于竞品，且评分更高',
    };
  }
  
  // 合理溢价：价格略高于竞品但评分更高
  if (priceRatio >= 0.95 && priceRatio <= 1.1 && ratingDiff > 0.1) {
    return {
      Icon: TrendingUp,
      text: '合理溢价',
      color: '#FFB800',
      description: '价格略高，但品质更优',
    };
  }
  
  // 性价比：价格远低于竞品
  if (priceRatio < 0.9) {
    return {
      Icon: TrendingDown,
      text: '性价比',
      color: '#FF9900',
      description: '价格优势明显',
    };
  }
  
  // 定价风险：价格远高于竞品
  if (priceRatio > 1.15) {
    return {
      Icon: AlertTriangle,
      text: '定价风险',
      color: '#FF4757',
      description: '价格偏离市场，可能滞销',
    };
  }
  
  // 默认：动态平衡
  return {
    Icon: CircleDollarSign,
    text: '动态平衡',
    color: '#FFB800',
    description: '价格与市场持平',
  };
};

// ============================================
// 财务统计工具函数（统一口径）
// ============================================

export interface FinancialStats {
  // 实时GMV：所有非退款订单的 gross（含待确认）
  realtimeGMV: number;
  // 确认GMV：仅已入住/已离店/已开票订单的 gross
  confirmedGMV: number;
  // 净收入：非退款订单的 net 总和
  netRevenue: number;
  // 退款金额
  refundAmount: number;
  // 实时订单数：所有非退款订单
  realtimeOrders: number;
  // 确认订单数：仅已入住/已离店/已开票
  confirmedOrders: number;
  // 退款单数
  refundOrders: number;
  // 平均客单价（基于实时GMV）
  avgPrice: number;
}

// 确认状态的订单（已产生实际收入）
const CONFIRMED_STATUSES: OrderStatus[] = ['checked_in', 'checked_out', 'invoiced'];

/**
 * 统一财务统计函数
 * @param transactions 交易列表
 * @returns 财务统计数据
 */
export const calculateFinancialStats = (transactions: Transaction[]): FinancialStats => {
  // 实时数据（非退款订单）
  const validTransactions = transactions.filter(t => t.status !== 'refunded');
  const realtimeGMV = validTransactions.reduce((sum, t) => sum + (t.financials?.gross || t.price || 0), 0);
  const realtimeOrders = validTransactions.length;
  
  // 确认数据（已实际入住或完成）
  const confirmedTransactions = transactions.filter(t => CONFIRMED_STATUSES.includes(t.status));
  const confirmedGMV = confirmedTransactions.reduce((sum, t) => sum + (t.financials?.gross || t.price || 0), 0);
  const confirmedOrders = confirmedTransactions.length;
  
  // 净收入
  const netRevenue = validTransactions.reduce((sum, t) => sum + (t.financials?.net || t.price * 0.94 || 0), 0);
  
  // 退款统计
  const refundTransactions = transactions.filter(t => t.status === 'refunded');
  const refundAmount = refundTransactions.reduce((sum, t) => sum + (t.refundInfo?.amount || t.refund?.amount || 0), 0);
  const refundOrders = refundTransactions.length;
  
  // 平均客单价
  const avgPrice = realtimeOrders > 0 ? Math.round(realtimeGMV / realtimeOrders) : 0;
  
  return {
    realtimeGMV,
    confirmedGMV,
    netRevenue,
    refundAmount,
    realtimeOrders,
    confirmedOrders,
    refundOrders,
    avgPrice,
  };
};

/**
 * 计算对比变化率
 * @param current 当前值
 * @param compare 对比值
 * @returns 变化率字符串（如：+15.2% 或 --）
 */
export const calculateChangeRate = (current: number, compare: number): { value: string; isValid: boolean } => {
  if (compare <= 0 || current < 0) {
    return { value: '--', isValid: false };
  }
  const rate = ((current - compare) / compare) * 100;
  return { 
    value: `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`,
    isValid: true 
  };
};

// ============================================
// 内容效率统计
// ============================================

export interface ContentEfficiencyStats {
  // 总发布数
  totalPublished: number;
  // 总曝光
  totalImpressions: number;
  // 总点击
  totalClicks: number;
  // 总咨询
  totalInquiries: number;
  // 总转化（实际成交数）
  totalConversions: number;
  // 曝光→点击转化率
  clickThroughRate: number;
  // 点击→咨询转化率
  inquiryRate: number;
  // 咨询→成交转化率
  conversionRate: number;
  // 内容→成交总转化率
  overallConversionRate: number;
  // 平均每条内容收益
  revenuePerContent: number;
}

/**
 * 计算内容效率指标
 * @param contents 内容列表
 * @param transactions 交易列表（用于关联统计）
 * @returns 内容效率统计
 */
export const calculateContentEfficiency = (
  contents: { performance?: { impressions?: number; clicks?: number; inquiries?: number; conversions?: number } }[],
  transactions?: Transaction[]
): ContentEfficiencyStats => {
  const totalPublished = contents.length;
  
  const totalImpressions = contents.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0);
  const totalClicks = contents.reduce((sum, c) => sum + (c.performance?.clicks || 0), 0);
  const totalInquiries = contents.reduce((sum, c) => sum + (c.performance?.inquiries || 0), 0);
  const totalConversions = contents.reduce((sum, c) => sum + (c.performance?.conversions || 0), 0);
  
  // 如果提供了 transactions，以 transactions 中的关联数据为准
  const actualConversions = transactions?.filter(t => t.sourceContentId && t.status !== 'refunded').length || totalConversions;
  
  // 各阶段转化率
  const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const inquiryRate = totalClicks > 0 ? (totalInquiries / totalClicks) * 100 : 0;
  const conversionRate = totalInquiries > 0 ? (actualConversions / totalInquiries) * 100 : 0;
  const overallConversionRate = totalPublished > 0 ? (actualConversions / totalPublished) * 100 : 0;
  
  return {
    totalPublished,
    totalImpressions,
    totalClicks,
    totalInquiries,
    totalConversions: actualConversions,
    clickThroughRate: Number(clickThroughRate.toFixed(1)),
    inquiryRate: Number(inquiryRate.toFixed(1)),
    conversionRate: Number(conversionRate.toFixed(1)),
    overallConversionRate: Number(overallConversionRate.toFixed(1)),
    revenuePerContent: 0, // 需要外部传入 GMV 计算
  };
};
