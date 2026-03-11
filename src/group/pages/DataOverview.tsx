/**
 * Shadow-Bees V52 - 每日简报（CEO仪表盘）
 * 核心理念：不是展示所有数据，而是回答"今天我最需要关心的3件事"
 * 数据来源于酒店端（单体）的聚合
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Rocket,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  BarChart3,
  Activity,
  Bot,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Target,
  Lightbulb,
  FileText,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { useGroupStore, type TimeRange, type HotelInGroup } from '../stores/groupStore';
import { useNavigate } from 'react-router-dom';
import { PlatformLogo } from '@/components/PlatformLogo';
import type { Platform } from '@/types';

// ============================================
// 类型定义
// ============================================

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  subtext?: string;
  icon: any;
  color: string;
  delay?: number;
  onClick?: () => void;
  isLoading?: boolean;
  animationKey?: number;
  rawValue?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  sparklineData?: number[]; // 迷你趋势图数据
}

interface TodoItem {
  id: string;
  type: 'anomaly' | 'strategy' | 'hotel' | 'ai' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  link: string;
  impact?: number; // 预计影响金额
}

interface HealthIndicatorProps {
  label: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  icon: any;
}

// ============================================
// Sparkline 迷你趋势图组件
// ============================================

function Sparkline({ data, color, width = 60, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  // 生成路径点
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(' L ')}`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* 渐变定义 */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* 填充区域 */}
      <path
        d={`${pathD} L ${width},${height} L 0,${height} Z`}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
        className="opacity-50"
      />
      
      {/* 线条 */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* 终点圆点 */}
      <motion.circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5 }}
      />
    </svg>
  );
}

// ============================================
// 动画数字组件（与酒店端保持一致）
// ============================================

function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '', 
  delay = 0,
  animationKey = 0,
  className = '',
  style
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  delay?: number;
  animationKey?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;

    // 重置为0，然后开始动画
    setDisplayValue(0);
    
    const timer = setTimeout(() => {
      let startTime: number;
      const duration = 1500;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        // easeOutQuart 缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setDisplayValue(Math.floor(easeOutQuart * value));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, (delay || 0) * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, delay, animationKey]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{displayValue.toLocaleString('zh-CN')}{suffix}
    </span>
  );
}

// ============================================
// 子组件
// ============================================

function MetricCard({ title, value, change, subtext, icon: Icon, color, delay = 0, onClick, isLoading, animationKey, rawValue, valuePrefix, valueSuffix, sparklineData }: MetricCardProps) {
  // 判断是否使用动画（有原始数值时）
  const useAnimation = rawValue !== undefined && !isNaN(rawValue);
  
  // Skeleton 加载状态
  if (isLoading) {
    return (
      <div className="relative p-5 rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: `${color}20`, background: 'rgba(21, 27, 43, 0.6)' }}>
        {/* 顶部色条骨架 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700" />
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 标题骨架 */}
            <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
            {/* 数值骨架 */}
            <div className="h-8 w-32 bg-gray-700 rounded mt-2" />
            {/* 副标题骨架 */}
            <div className="h-3 w-24 bg-gray-700 rounded mt-2" />
          </div>
          {/* 图标骨架 */}
          <div className="w-12 h-12 rounded-xl bg-gray-700" />
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 20px 40px ${color}15` }}
      onClick={onClick}
      className={`relative p-5 rounded-xl border overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderColor: `${color}30`, background: 'linear-gradient(135deg, rgba(21, 27, 43, 0.9) 0%, rgba(11, 15, 25, 0.9) 100%)' }}
    >
      {/* 顶部色条 */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.2 }}
      />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-text-secondary text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color }}>
            {useAnimation ? (
              <AnimatedNumber 
                value={rawValue} 
                prefix={valuePrefix}
                suffix={valueSuffix}
                delay={delay + 0.3}
                animationKey={animationKey}
              />
            ) : value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-neon-green" />
              ) : (
                <TrendingDown className="w-4 h-4 text-neon-red" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-text-muted">较上期</span>
            </div>
          )}
          {subtext && <p className="text-xs text-text-muted mt-2">{subtext}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {/* 迷你趋势图 */}
          {sparklineData && sparklineData.length > 0 && (
            <Sparkline data={sparklineData} color={color} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TodoCard({ item, index }: { item: TodoItem; index: number }) {
  const navigate = useNavigate();
  const colors = {
    high: { bg: 'bg-neon-red/10', border: 'border-neon-red/30', text: 'text-neon-red', icon: AlertCircle },
    medium: { bg: 'bg-neon-amber/10', border: 'border-neon-amber/30', text: 'text-neon-amber', icon: AlertTriangle },
    low: { bg: 'bg-neon-blue/10', border: 'border-neon-blue/30', text: 'text-neon-blue', icon: Lightbulb },
  };
  const style = colors[item.priority];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => navigate(item.link)}
      className={`p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${style.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{item.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
              {item.priority === 'high' ? '紧急' : item.priority === 'medium' ? '重要' : '建议'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">{item.description}</p>
          {item.impact && (
            <p className={`text-xs mt-1 ${item.impact > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              预计影响: {item.impact > 0 ? '+' : ''}¥{Math.abs(item.impact).toLocaleString()}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-neon-purple">
            <span>{item.action}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HealthIndicator({ label, value, status, icon: Icon }: HealthIndicatorProps) {
  const colors = {
    healthy: { bg: 'bg-neon-green/10', text: 'text-neon-green', bar: 'bg-neon-green' },
    warning: { bg: 'bg-neon-amber/10', text: 'text-neon-amber', bar: 'bg-neon-amber' },
    critical: { bg: 'bg-neon-red/10', text: 'text-neon-red', bar: 'bg-neon-red' },
  };
  const style = colors[status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover">
      <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${style.text}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{label}</span>
          <span className={`text-sm font-medium ${style.text}`}>{value}%</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            className={`h-full ${style.bar}`}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 子组件：平台渠道分布（与酒店端保持一致）
// ============================================

interface PlatformDistributionProps {
  channels: {
    platform: Platform;
    gmv: number;
    orderCount: number;
    ratio: number;
    contentCount: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }[];
  animationKey?: number;
}

const platformNames: Record<Platform, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
};

const platformColors: Record<Platform, string> = {
  xianyu: '#FFB800',
  xiaohongshu: '#FF2442',
  wechat: '#07C160',
};

function PlatformDistribution({ channels, animationKey = 0 }: PlatformDistributionProps) {
  const navigate = useNavigate();
  
  // 按GMV排序
  const sortedChannels = [...channels].sort((a, b) => b.gmv - a.gmv);
  const totalGMV = sortedChannels.reduce((sum, c) => sum + c.gmv, 0);
  const totalOrders = sortedChannels.reduce((sum, c) => sum + c.orderCount, 0);
  
  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-neon-purple" />
          渠道分布
        </h3>
        <span className="text-xs text-text-secondary">{totalOrders}单</span>
      </div>
      
      <div className="space-y-4">
        {sortedChannels.map((channel, index) => {
          const percentage = totalGMV > 0 ? (channel.gmv / totalGMV) * 100 : 0;
          const avgOrderValue = channel.orderCount > 0 ? Math.round(channel.gmv / channel.orderCount) : 0;
          
          return (
            <div key={channel.platform} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={channel.platform} size={24} />
                  <div>
                    <div className="text-sm font-medium">{platformNames[channel.platform]}</div>
                    <div className="text-[10px] text-text-secondary">
                      {channel.orderCount}单 · 客单价¥{avgOrderValue.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <AnimatedNumber
                    value={Math.round(channel.gmv / 10000)}
                    prefix="¥"
                    suffix="万"
                    delay={index * 0.1}
                    animationKey={animationKey}
                    className="text-sm font-mono font-medium"
                    style={{ color: platformColors[channel.platform] }}
                  />
                  <div className="text-[10px] text-text-secondary">{percentage.toFixed(0)}%</div>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: platformColors[channel.platform] }}
                />
              </div>
              
              {/* 内容效果数据 - 简化显示 */}
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-secondary">
                <span>曝{(channel.impressions / 1000).toFixed(0)}k</span>
                <span>点{(channel.clicks / 1000).toFixed(0)}k</span>
                <span>转{channel.conversions}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 查看详情按钮 */}
      <button
        onClick={() => navigate('/channels')}
        className="w-full mt-3 py-1.5 text-xs text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5 transition-colors"
      >
        查看渠道详情 →
      </button>
    </div>
  );
}

function AIRoiCard({ title, value, subtext, icon: Icon, trend }: { title: string; value: string; subtext: string; icon: any; trend: number }) {
  return (
    <div className="p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-secondary">{title}</p>
          <p className="text-xl font-bold text-neon-purple mt-1">{value}</p>
          <p className="text-xs text-text-muted mt-1">{subtext}</p>
        </div>
        <div className="text-right">
          <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center mb-1">
            <Icon className="w-5 h-5 text-neon-purple" />
          </div>
          <span className={`text-xs ${trend >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 智能待办生成器
// ============================================

function generateSmartTodos(
  hotels: HotelInGroup[],
  anomalies: { id: string; hotelId: string; hotelName: string; level: 'critical' | 'warning' | 'info'; title: string; description: string; estimatedImpact?: number }[]
): TodoItem[] {
  const items: TodoItem[] = [];
  
  // 1. 紧急异常（基于酒店端聚合的异常）
  const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
  if (criticalAnomalies.length > 0) {
    items.push({
      id: 'anomaly-critical',
      type: 'anomaly',
      priority: 'high',
      title: `${criticalAnomalies.length}条紧急异常需处理`,
      description: criticalAnomalies[0]?.title || '系统检测到经营异常',
      action: '立即处理',
      link: '/hotels?filter=critical',
      impact: -criticalAnomalies.reduce((sum, a) => sum + (a.estimatedImpact || 0), 0),
    });
  }
  
  // 2. 低入住率门店（基于酒店端聚合的库存数据）
  const lowOccupancyHotels = hotels.filter(h => h.occupancy < 60);
  if (lowOccupancyHotels.length > 0) {
    const potentialLoss = lowOccupancyHotels.reduce((sum, h) => {
      const targetGMV = h.gmv / h.occupancy * 70; // 目标入住率70%
      return sum + (targetGMV - h.gmv);
    }, 0);
    
    items.push({
      id: 'hotel-low-occupancy',
      type: 'hotel',
      priority: 'medium',
      title: `${lowOccupancyHotels.length}家门店入住率低于60%`,
      description: `${lowOccupancyHotels.slice(0, 2).map(h => h.name).join('、')}等，建议推送促销活动`,
      action: '查看详情',
      link: '/hotels?filter=low-occupancy',
      impact: Math.round(potentialLoss),
    });
  }
  
  // 3. AI采纳率下降（基于酒店端聚合的系统使用数据）
  const lowAIAdoption = hotels.filter(h => h.pricing.priceAdoptionRate < 70);
  if (lowAIAdoption.length > 0) {
    items.push({
      id: 'ai-low-adoption',
      type: 'ai',
      priority: 'medium',
      title: `${lowAIAdoption.length}家门店AI使用率偏低`,
      description: '建议推送培训材料或安排运营诊断',
      action: '一键提醒',
      link: '/operations',
    });
  }
  
  // 4. 策略机会（基于酒店端聚合的机会识别）
  const highPotentialHotels = hotels
    .filter(h => h.occupancy > 80 && h.pricing.currentPrice < h.pricing.aiSuggestionPrice! * 0.9)
    .slice(0, 2);
  
  if (highPotentialHotels.length > 0) {
    const potentialGain = highPotentialHotels.reduce((sum, h) => {
      const priceDiff = (h.pricing.aiSuggestionPrice || h.pricing.currentPrice) - h.pricing.currentPrice;
      return sum + (priceDiff * h.inventory.occupiedTonight * 30); // 预估月收益
    }, 0);
    
    items.push({
      id: 'opportunity-pricing',
      type: 'opportunity',
      priority: 'low',
      title: `${highPotentialHotels.length}家门店有提价空间`,
      description: `${highPotentialHotels.map(h => h.name).join('、')}入住率高但价格偏低`,
      action: '查看机会',
      link: '/strategy',
      impact: Math.round(potentialGain),
    });
  }
  
  // 5. 策略执行提醒
  items.push({
    id: 'strategy-spring',
    type: 'strategy',
    priority: 'low',
    title: '春节定价策略待确认',
    description: '预计覆盖8家门店，AI预测可增收¥120万',
    action: '查看策略',
    link: '/strategy',
    impact: 1200000,
  });
  
  return items.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority];
  });
}

// ============================================
// 主页面
// ============================================

export function DataOverview() {
  const { 
    hotels, 
    channels,
    getTrainingCompletionRate,
    setTimeRange,
    selectedTimeRange,
    refreshData,
    anomalies,
    aiValueSummary,
  } = useGroupStore();
  
  // 直接在组件中计算指标，确保响应式更新
  const totalGMV = hotels.reduce((sum, h) => sum + h.gmv, 0);
  const avgOccupancy = Math.round(hotels.reduce((sum, h) => sum + h.occupancy, 0) / (hotels.length || 1));
  
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : 
                        selectedTimeRange === 'week' ? '本周' : 
                        selectedTimeRange === 'month' ? '本月' : '本年';
  
  // 根据时间范围获取对比标签
  const comparisonLabel = selectedTimeRange === 'today' ? '较昨日' : 
                         selectedTimeRange === 'week' ? '较上周' : 
                         selectedTimeRange === 'month' ? '较上月' : '较去年';
  
  // 根据时间范围获取AI贡献副文本
  const aiContributionSubtext = selectedTimeRange === 'today' ? '实时AI助力' : 
                               selectedTimeRange === 'week' ? '本周累计增益' : 
                               selectedTimeRange === 'month' ? '月度AI增收' : '年度AI价值';
  
  // GMV 副文本根据时间范围
  const gmvSubtext = selectedTimeRange === 'today' ? '截至当前' : 
                    selectedTimeRange === 'week' ? '本周累计' : 
                    selectedTimeRange === 'month' ? '含AI贡献18%' : '全年累计';
  
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllTodos, setShowAllTodos] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // 格式化金额显示（防止数字过长）
  const formatAmount = (amount: number): string => {
    const wan = amount / 10000;
    if (wan >= 10000) {
      // 超过1亿，显示为 x.x亿
      return `¥${(wan / 10000).toFixed(1)}亿`;
    } else if (wan >= 1000) {
      // 超过1000万，显示为 xxxx万（无小数）
      return `¥${Math.round(wan)}万`;
    } else {
      // 小于1000万，显示为 xx.x万
      return `¥${wan.toFixed(1)}万`;
    }
  };
  
  // 计算指标
  const aiRevenueContribution = Math.round(totalGMV * 0.18);
  const avgAIUsage = Math.round(hotels.reduce((sum, h) => sum + h.aiResolutionRate, 0) / hotels.length);
  const trainingRate = getTrainingCompletionRate();
  
  // 生成迷你趋势图数据（模拟7天/7周/7月/7年趋势）
  const sparklineData = useMemo(() => {
    const generateTrend = (baseValue: number, variance: number = 0.15) => {
      return Array.from({ length: 7 }, () => {
        const change = (Math.random() - 0.5) * 2 * variance;
        return Math.max(0, baseValue * (1 + change));
      });
    };
    
    return {
      gmv: generateTrend(totalGMV / 7, 0.2),
      aiContribution: generateTrend(aiRevenueContribution / 7, 0.25),
      occupancy: generateTrend(avgOccupancy, 0.1),
      aiUsage: generateTrend(avgAIUsage, 0.08),
    };
  }, [totalGMV, aiRevenueContribution, avgOccupancy, avgAIUsage, selectedTimeRange, animationKey]);
  
  // 健康度统计
  const healthStats = useMemo(() => {
    const total = hotels.length;
    const healthy = hotels.filter(h => h.healthLevel === 'healthy').length;
    const warning = hotels.filter(h => h.healthLevel === 'warning').length;
    const critical = hotels.filter(h => h.healthLevel === 'critical').length;
    return { total, healthy, warning, critical };
  }, [hotels]);

  // 智能待办生成
  const todos = useMemo(() => 
    generateSmartTodos(hotels, anomalies),
    [hotels, anomalies]
  );

  const displayTodos = showAllTodos ? todos : todos.slice(0, 3);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 更新 animationKey 触发数字重新动画
    setAnimationKey(prev => prev + 1);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setIsRefreshing(true);
    // 更新 animationKey 触发数字重新动画
    setAnimationKey(prev => prev + 1);
    // 使用 setTimeout 确保状态更新后再关闭 loading
    setTimeout(() => {
      setTimeRange(range);
      setIsRefreshing(false);
    }, 100);
  };

  // 生成简报总结
  const briefingSummary = useMemo(() => {
    if (healthStats.critical > 0) {
      return `${timeRangeLabel}需关注：${healthStats.critical}家门店异常`;
    }
    if (healthStats.warning > 0) {
      return `${timeRangeLabel}有${healthStats.warning}家门店需留意`;
    }
    return `${timeRangeLabel}经营状况良好，所有门店正常运行`;
  }, [healthStats, timeRangeLabel]);

  // 找出最佳实践门店
  const topPerformer = useMemo(() => {
    return [...hotels].sort((a, b) => b.aiValue.totalLift - a.aiValue.totalLift)[0];
  }, [hotels]);

  return (
    <div className="space-y-6">
      {/* 页面标题 + 时间切换 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">每日简报</h1>
          <p className="text-text-secondary text-sm mt-1">
            {briefingSummary}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            {(['today', 'week', 'month', 'year'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-neon-purple text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {range === 'today' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-color text-sm hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </motion.div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={`${timeRangeLabel}GMV`}
          value={formatAmount(totalGMV)}
          rawValue={Math.round(totalGMV / 10000)}
          valuePrefix="¥"
          valueSuffix="万"
          change={Math.floor(Math.random() * 20) - 5}
          subtext={gmvSubtext}
          icon={DollarSign}
          color="#A855F7"
          delay={0}
          onClick={() => navigate('/hotels', { state: { sort: 'gmv' } })}
          isLoading={isRefreshing}
          animationKey={animationKey}
          sparklineData={sparklineData.gmv}
        />
        <MetricCard
          title={`${timeRangeLabel}AI贡献`}
          value={formatAmount(aiRevenueContribution)}
          rawValue={Math.round(aiRevenueContribution / 10000)}
          valuePrefix="¥"
          valueSuffix="万"
          change={Math.floor(Math.random() * 30) + 5}
          subtext={aiContributionSubtext}
          icon={Brain}
          color="#00E396"
          delay={0.1}
          onClick={() => navigate('/ai')}
          isLoading={isRefreshing}
          animationKey={animationKey}
          sparklineData={sparklineData.aiContribution}
        />
        <MetricCard
          title={`${timeRangeLabel}平均入住率`}
          value={`${avgOccupancy}%`}
          rawValue={avgOccupancy}
          valueSuffix="%"
          change={Math.floor(Math.random() * 10) - 3}
          subtext={comparisonLabel}
          icon={Building2}
          color="#00A8FF"
          delay={0.2}
          isLoading={isRefreshing}
          animationKey={animationKey}
          sparklineData={sparklineData.occupancy}
        />
        <MetricCard
          title={`${timeRangeLabel}AI使用率`}
          value={`${avgAIUsage}%`}
          rawValue={avgAIUsage}
          valueSuffix="%"
          change={Math.floor(Math.random() * 15) + 2}
          subtext={`${hotels.filter(h => h.aiResolutionRate > 90).length}家超90% · ${comparisonLabel}`}
          icon={Bot}
          color="#FFB800"
          delay={0.3}
          onClick={() => navigate('/operations')}
          isLoading={isRefreshing}
          animationKey={animationKey}
          sparklineData={sparklineData.aiUsage}
        />
      </div>

      {/* 主要内容区：待办 + 健康度 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：今日待办 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-neon-purple" />
              需要关注
              {todos.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-neon-red/10 text-neon-red rounded-full">
                  {todos.length}
                </span>
              )}
            </h2>
            {todos.length > 3 && (
              <button 
                onClick={() => setShowAllTodos(!showAllTodos)}
                className="text-sm text-neon-purple hover:underline"
              >
                {showAllTodos ? '收起' : '查看全部'}
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <AnimatePresence>
              {displayTodos.map((todo, index) => (
                <TodoCard key={todo.id} item={todo} index={index} />
              ))}
            </AnimatePresence>
            
            {todos.length === 0 && (
              <div className="p-8 text-center text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-neon-green" />
                <p>太好了！今日暂无待处理事项</p>
              </div>
            )}
          </div>

          {/* AI价值速览 + 渠道分布 并排 */}
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* AI价值速览 */}
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-purple" />
                AI价值速览
              </h3>
              <div className="space-y-2">
                <AIRoiCard
                  title="内容生成"
                  value={`${hotels.reduce((sum, h) => sum + h.contentCount, 0)}篇`}
                  subtext={`节省${Math.round(aiValueSummary.laborHoursSaved * 0.4)}工时`}
                  icon={FileText}
                  trend={12}
                />
                <AIRoiCard
                  title="客服处理"
                  value={`${avgAIUsage}%`}
                  subtext="AI自动解决率"
                  icon={MessageSquare}
                  trend={8}
                />
                <AIRoiCard
                  title="定价优化"
                  value={`¥${(aiValueSummary.pricingLift / 10000).toFixed(1)}万`}
                  subtext={`${timeRangeLabel}增收`}
                  icon={TrendingUp}
                  trend={15}
                />
              </div>
            </div>
            
            {/* 渠道分布 */}
            <PlatformDistribution channels={channels} animationKey={animationKey} />
          </div>
          
          {/* 最佳实践 */}
          {topPerformer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-xl bg-gradient-to-r from-neon-green/10 to-transparent border border-neon-green/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-neon-green" />
                <span className="font-medium text-sm">本月AI效能冠军</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{topPerformer.name}</p>
                  <p className="text-xs text-text-secondary">
                    AI贡献 ¥{(topPerformer.aiValue.totalLift / 10000).toFixed(1)}万 · 
                    ROI {topPerformer.aiValue.roi}%
                  </p>
                </div>
                <button 
                  onClick={() => navigate(`/hotels?hotel=${topPerformer.id}`)}
                  className="text-sm text-neon-green hover:underline"
                >
                  查看详情 →
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 右侧：门店健康度 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-purple" />
            门店健康度
          </h2>
          
          <div className="p-5 rounded-xl bg-surface border border-border-color">
            {/* 健康度分布 */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-neon-green">{healthStats.healthy}</span>
                </div>
                <p className="text-xs text-text-secondary">健康</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neon-amber/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-neon-amber">{healthStats.warning}</span>
                </div>
                <p className="text-xs text-text-secondary">预警</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neon-red/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-neon-red">{healthStats.critical}</span>
                </div>
                <p className="text-xs text-text-secondary">异常</p>
              </div>
            </div>

            {/* 详细指标 */}
            <div className="space-y-3">
              <HealthIndicator
                label="经营健康度"
                value={Math.round(hotels.reduce((sum, h) => sum + (h.gmv > 50000 ? 100 : h.gmv > 30000 ? 80 : 60), 0) / hotels.length)}
                status={healthStats.critical > 0 ? 'critical' : healthStats.warning > 0 ? 'warning' : 'healthy'}
                icon={BarChart3}
              />
              <HealthIndicator
                label="系统使用度"
                value={Math.round(hotels.reduce((sum, h) => sum + h.systemUsage.dataCompleteness, 0) / hotels.length)}
                status={trainingRate < 80 ? 'warning' : 'healthy'}
                icon={Zap}
              />
              <HealthIndicator
                label="AI采纳度"
                value={avgAIUsage}
                status={avgAIUsage < 70 ? 'warning' : avgAIUsage < 90 ? 'warning' : 'healthy'}
                icon={Brain}
              />
            </div>

            <button 
              onClick={() => navigate('/operations')}
              className="w-full mt-4 py-2 text-sm text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5 transition-colors"
            >
              查看运营中心详情
            </button>
          </div>

          {/* 快速入口 */}
          <div className="p-5 rounded-xl bg-surface border border-border-color">
            <h3 className="font-medium mb-3">快速入口</h3>
            <div className="space-y-2">
              {[
                { label: '门店对比分析', icon: Building2, link: '/hotels' },
                { label: '策略执行情况', icon: Rocket, link: '/strategy' },
                { label: 'AI价值报告', icon: Sparkles, link: '/ai' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.link)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default DataOverview;
