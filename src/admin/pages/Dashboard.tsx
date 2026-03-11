/**
 * SaaS运营后台 - 数据大盘（增强版）
 * 展示平台级运营数据 + 客户健康度矩阵 + 工单监控 + 内容风控 + 实时动态
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Building,
  CreditCard,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Hotel,
  Package,
  TicketIcon,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  RefreshCw,
  Flag,
  Zap,
  ChevronRight,
  ChevronDown,
  Heart,
  TrendingUp,
  GraduationCap,
  Users,
  Clock,
  FileCheck,
  ExternalLink,
  LayoutGrid,
  Calendar,
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { HotelData, Customer } from '../stores/adminStore';
import { getAnomalyStats, calculateHealthFromAnomalies } from '../utils/anomalyDetector';
import { calculateGroupHealth, calculateRenewalRisk, type GroupHealthScore } from '../services/customerSuccessService';
import { sortTicketsByPriority, getTicketBadges, getGroupTicketStats } from '../services/groupTicketService';
import { useChannelMessage } from '@/shared/channel';
import type { RealtimeMetricsPayload } from '@/shared/channel';
import { DashboardSkeleton } from '@/components/ux/Skeleton';
import { Button } from '../components/ui';

// ==================== 动画数值组件 ====================

function AnimatedValue({ value, prefix = '', suffix = '', delay = 0 }: { 
  value: number; 
  prefix?: string;
  suffix?: string;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    
    const timer = setTimeout(() => {
      let startTime: number;
      const duration = 1500;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setDisplayValue(Math.floor(easeOutQuart * value));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString('zh-CN')}{suffix}
    </span>
  );
}

// 工单状态标签
const ticketStatusConfig = {
  open: { label: '待处理', color: 'text-amber-400', bgColor: 'bg-amber-400/20' },
  processing: { label: '处理中', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20' },
  resolved: { label: '已解决', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  closed: { label: '已关闭', color: 'text-gray-400', bgColor: 'bg-gray-600/20' },
};

// 内容异常配置
const anomalyConfig = {
  exposure_spike: { label: '曝光激增', color: 'text-purple-400' },
  exposure_drop: { label: '曝光骤降', color: 'text-amber-400' },
  complaint: { label: '用户投诉', color: 'text-red-400' },
  price_abnormal: { label: '价格异常', color: 'text-orange-400' },
  sensitive_word: { label: '敏感词', color: 'text-pink-400' },
};

// 健康度等级配置
const healthLevelConfig = {
  healthy: { 
    label: '健康运营', 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    icon: CheckCircle,
  },
  warning: { 
    label: '需关注', 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    icon: AlertTriangle,
  },
  critical: { 
    label: '需干预', 
    color: 'text-red-400', 
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    icon: AlertOctagon,
  },
};

// 时间范围配置 - 与酒店端完全统一
const timeRangeConfig = {
  today: { label: '今日', days: 1, compareLabel: '较昨日' },
  week: { label: '本周', days: 7, compareLabel: '较上周' },
  month: { label: '本月', days: 30, compareLabel: '较上月' },
  custom: { label: '自定义', days: 0, compareLabel: '' },
};

type TimeRange = keyof typeof timeRangeConfig;

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customers, hotels, tickets, contentItems, anomalies, addRealtimeMetrics, getPlatformStatsByTimeRange, selectedTimeRange } = useAdminStore();
  
  // 时间范围状态 - 与 URL 和 store 同步
  const currentTimeRange = (searchParams.get('range') as TimeRange) || selectedTimeRange;
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  
  // 模拟数据加载
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentTimeRange]);
  const timeConfig = timeRangeConfig[currentTimeRange];
  
  // 自定义日期范围状态（与酒店端对齐）
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ 
    start: weekAgoStr, 
    end: todayStr 
  });
  
  // 计算实际使用的日期范围
  const effectiveDateRange = useMemo(() => {
    if (currentTimeRange !== 'custom') return null;
    
    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentTimeRange, customDateRange]);
  
  // 获取当前时间范围的统计数据（历史+实时，自定义时传入日期范围）
  const currentPlatformStats = getPlatformStatsByTimeRange(
    currentTimeRange, 
    effectiveDateRange || undefined
  );
  
  // 监听酒店端实时推演数据并累加到 store
  useChannelMessage<RealtimeMetricsPayload>('REALTIME_METRICS', (payload) => {
    console.log('[Dashboard] Received realtime metrics:', payload);
    // 自定义时间范围按 today 处理实时数据
    const timeRange = currentTimeRange === 'custom' ? 'today' : currentTimeRange;
    addRealtimeMetrics({
      gmv: payload.metrics.gmv || 0,
      orders: payload.metrics.orders || 0,
      timeRange,
      hotelId: payload.hotelId,
    });
  });
  
  // 使用统一的 anomalies 数据计算异常统计
  const anomalyStats = getAnomalyStats(anomalies);

  // 计算统计数据

  const totalInventory = hotels.reduce((sum, h) => sum + h.inventory.ota.total + h.inventory.flexible.total, 0);
  const totalSold = hotels.reduce((sum, h) => sum + h.inventory.ota.sold + h.inventory.flexible.sold, 0);
  const overallOccupancy = Math.round((totalSold / totalInventory) * 100);

  // ===== 集团维度统计（新增）=====
  // 兼容旧数据：无type字段默认为single
  const customersWithType = customers.map(c => ({ ...c, type: c.type || 'single' as const }));
  
  // 客户分布统计
  const customerDistribution = {
    total: customers.length,
    singleHotels: customersWithType
      .filter(c => c.type === 'single')
      .reduce((sum, c) => sum + c.hotels.length, 0),
    singleCustomers: customersWithType.filter(c => c.type === 'single').length,
    groupCustomers: customersWithType.filter(c => c.type === 'group').length,
    groupHotels: customersWithType
      .filter(c => c.type === 'group')
      .reduce((sum, c) => sum + c.hotels.length, 0),
  };
  
  // 总管理酒店数量 = 单体酒店数 + 集团酒店数
  const totalManagedHotels = customerDistribution.singleHotels + customerDistribution.groupHotels;

  // 续约预警统计（基于expireAt计算）
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const renewalStats = {
    expired: customers.filter(c => new Date(c.expireAt) < now).length,
    sevenDays: customers.filter(c => {
      const expire = new Date(c.expireAt);
      return expire >= now && expire <= sevenDaysLater;
    }).length,
    thirtyDays: customers.filter(c => {
      const expire = new Date(c.expireAt);
      return expire > sevenDaysLater && expire <= thirtyDaysLater;
    }).length,
    sixtyDays: customers.filter(c => {
      const expire = new Date(c.expireAt);
      return expire > thirtyDaysLater && expire <= sixtyDaysLater;
    }).length,
  };

  // 集团客户列表（用于TOP集团客户计算）
  const groupCustomers = customersWithType.filter(c => c.type === 'group');
  
  // 计算集团客户健康度（使用新服务）
  const groupHealthScores: GroupHealthScore[] = useMemo(() => {
    return groupCustomers.map(c => calculateGroupHealth(c, anomalies));
  }, [groupCustomers, anomalies]);
  
  // 集团健康度分布统计
  const groupHealthDistribution = {
    total: groupHealthScores.length,
    healthy: groupHealthScores.filter(g => g.level === 'healthy').length,
    warning: groupHealthScores.filter(g => g.level === 'warning').length,
    critical: groupHealthScores.filter(g => g.level === 'critical').length,
  };

  // TOP集团客户（按GMV排序，附加健康度和续约信息）
  const topGroupCustomers = useMemo(() => {
    return groupCustomers
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
      .slice(0, 5)
      .map(c => {
        const healthScore = groupHealthScores.find(g => g.customerId === c.id);
        const renewalRisk = calculateRenewalRisk(c, healthScore?.overall || 75);
        return {
          ...c,
          healthScore: healthScore?.overall || c.healthScore || 75,
          daysUntilExpire: renewalRisk.daysUntilExpire,
          riskLevel: renewalRisk.riskLevel,
        };
      });
  }, [groupCustomers, groupHealthScores]);


  // ===== 客户健康度统计（基于统一 anomalies 数据源）=====
  // 使用 anomalies 计算实时健康度（与异常中心一致）
  const hotelHealthFromAnomalies = useMemo(() => {
    return hotels.map(hotel => {
      const { score, issues } = calculateHealthFromAnomalies(hotel.id, anomalies);
      // 确定健康等级
      let level: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (score < 60) level = 'critical';
      else if (score < 80) level = 'warning';
      
      return {
        hotel,
        score: {
          overall: score,
          level,
          issues: issues.map(title => ({ title, level: (score < 60 ? 'critical' : 'warning') as 'critical' | 'warning' })),
          suggestions: issues.length > 0 ? ['建议查看异常中心了解详情并处理'] : ['整体运营良好'],
        },
      };
    });
  }, [hotels, anomalies]);
  
  // 获取需要干预的酒店
  const criticalHotels = hotelHealthFromAnomalies.filter(h => h.score.level === 'critical');
  
  // 获取需关注的酒店
  const warningHotels = hotelHealthFromAnomalies.filter(h => h.score.level === 'warning');
  
  // 健康统计（基于 anomalies）
  const healthStats = {
    total: hotels.length,
    healthy: hotels.length - criticalHotels.length - warningHotels.length,
    warning: warningHotels.length,
    critical: criticalHotels.length,
  };

  // ===== 工单统计（含集团工单） =====
  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    processing: tickets.filter(t => t.status === 'processing').length,
    pendingRating: tickets.filter(t => t.status === 'resolved' && !t.rating).length,
    highPriority: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    todayNew: tickets.filter(t => {
      const created = new Date(t.createdAt);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length,
  };
  
  // 集团工单统计
  const groupTicketStats = getGroupTicketStats(tickets);

  // 平均响应时间（模拟计算）
  const avgResponseTime = '12分钟';

  // ===== 内容监控统计 =====
  const contentStats = {
    total: contentItems.length,
    withAnomaly: contentItems.filter(item => item.anomalies && item.anomalies.length > 0).length,
    withReport: contentItems.filter(item => item.reports && item.reports.length > 0).length,
    takedown: contentItems.filter(item => item.status === 'takedown').length,
    pendingReview: contentItems.filter(item => item.status === 'flagged').length,
  };

  // 最新的待处理工单（按集团优先级排序）
  const recentTickets = sortTicketsByPriority(
    tickets.filter(t => t.status === 'open' || t.status === 'processing'),
    customers
  ).slice(0, 5);

  // 最新的异常内容
  const recentAnomalies = contentItems
    .filter(item => item.anomalies && item.anomalies.length > 0)
    .sort((a, b) => {
      const aTime = a.anomalies?.[0]?.detectedAt || a.createdAt;
      const bTime = b.anomalies?.[0]?.detectedAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, 3);

  const statsCards = [
    {
      title: '总管理酒店',
      value: totalManagedHotels,
      rawValue: totalManagedHotels,
      subtext: `单体${customerDistribution.singleHotels} · 集团${customerDistribution.groupHotels}`,
      icon: LayoutGrid,
      color: 'text-neon-blue',
      bgColor: 'bg-neon-blue/10',
    },
    {
      title: '单体酒店',
      value: customerDistribution.singleHotels,
      rawValue: customerDistribution.singleHotels,
      subtext: `${customerDistribution.singleCustomers}家客户`,
      icon: Building2,
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
    },
    {
      title: '集团',
      value: customerDistribution.groupCustomers,
      rawValue: customerDistribution.groupCustomers,
      subtext: `${customerDistribution.groupHotels}家门店`,
      icon: Building,
      color: 'text-neon-purple',
      bgColor: 'bg-neon-purple/10',
    },
    {
      title: `${timeConfig.label}GMV`,
      value: `¥${currentPlatformStats.todayRevenue.toLocaleString()}`,
      rawValue: Math.round(currentPlatformStats.todayRevenue / 1000),
      valuePrefix: '¥',
      valueSuffix: 'k',
      change: '+12.5%',
      changeType: 'up' as const,
      icon: CreditCard,
      color: 'text-neon-green',
      bgColor: 'bg-neon-green/10',
    },
    {
      title: `${timeConfig.label}订单`,
      value: currentPlatformStats.todayOrders,
      rawValue: currentPlatformStats.todayOrders,
      change: '+8.3%',
      changeType: 'up' as const,
      icon: Activity,
      color: 'text-neon-purple',
      bgColor: 'bg-neon-purple/10',
    },
    {
      title: '整体入住率',
      value: `${overallOccupancy}%`,
      rawValue: overallOccupancy,
      valueSuffix: '%',
      subtext: `${totalSold}/${totalInventory} 间`,
      icon: Hotel,
      color: 'text-neon-amber',
      bgColor: 'bg-neon-amber/10',
    },
  ];

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">运营指挥中心</h1>
            <p className="text-gray-400 text-sm mt-1">数据加载中...</p>
          </div>
          <Button loading variant="secondary">加载中</Button>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">运营指挥中心</h1>
          <p className="text-gray-400 text-sm mt-1">
            实时监控平台数据 · 客户健康度 · 工单处理 · 内容风控 · 异常预警
          </p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* 时间范围切换 - 与集团端/酒店端统一 */}
          <div className="flex items-center gap-1 p-1 bg-[#151B2B] rounded-xl border border-gray-800">
            {(Object.keys(timeRangeConfig) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSearchParams({ range })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${currentTimeRange === range
                    ? 'bg-neon-cyan text-[#0B0F19] shadow-lg shadow-neon-cyan/25'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                {timeRangeConfig[range].label}
              </button>
            ))}
          </div>
          
          {/* 自定义日期选择器 - 与酒店端对齐（展开式） */}
          {currentTimeRange === 'custom' && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="relative">
                <input
                  type="date"
                  max={todayStr}
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-2 py-1.5 pr-8 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-neon-cyan/50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>
              <span className="text-gray-400 text-xs">至</span>
              <div className="relative">
                <input
                  type="date"
                  max={todayStr}
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-2 py-1.5 pr-8 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-neon-cyan/50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
              </div>
            </motion.div>
          )}
          
          <div className="px-3 py-1 bg-neon-green/10 text-neon-green text-sm rounded-lg border border-neon-green/30">
            系统运行正常
          </div>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-[#1E2538] rounded-lg transition-all">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* 统计卡片 - 响应式布局 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ 
              y: -4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              transition: { duration: 0.2 }
            }}
            className="p-5 bg-[#151B2B] rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-sm whitespace-nowrap">{card.title}</p>
                <p className="text-2xl font-bold mt-1">
                  {card.rawValue !== undefined ? (
                    <AnimatedValue 
                      value={card.rawValue} 
                      prefix={card.valuePrefix}
                      suffix={card.valueSuffix}
                      delay={index * 0.1 + 0.3}
                    />
                  ) : card.value}
                </p>
                {card.change && (
                  <motion.div 
                    className={`flex items-center gap-1 mt-2 text-xs ${
                      card.changeType === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    {card.changeType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="whitespace-nowrap">{card.change}</span>
                  </motion.div>
                )}
                {card.subtext && (
                  <p className="text-gray-500 text-sm mt-2 whitespace-nowrap">{card.subtext}</p>
                )}
              </div>
              <motion.div 
                className={`p-3 rounded-xl ${card.bgColor}`}
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <card.icon size={24} className={card.color} />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 集团维度统计 - 新增 */}
      <CustomerDistributionSection 
        distribution={customerDistribution}
        renewalStats={renewalStats}
        groupHealthDistribution={groupHealthDistribution}
        topGroupCustomers={topGroupCustomers}
        onNavigate={navigate}
      />

      {/* 客户健康度矩阵 */}
      <HealthMatrixSection 
        healthStats={healthStats}
        anomalyStats={anomalyStats}
        criticalHotels={criticalHotels}
        warningHotels={warningHotels}
      />

      {/* 客户成功概览 - 使用统一计算服务，与 CustomerSuccess 页面数据联动 */}
      <CustomerSuccessOverview 
        hotels={hotels} 
        customers={customers}
        contentItems={contentItems}
        tickets={tickets}
      />

      {/* 下方两列 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 工单监控 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <TicketIcon size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">工单监控</h2>
                  <p className="text-gray-400 text-sm">平均响应 {avgResponseTime}</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/support')}
                className="text-sm text-neon-cyan hover:underline"
              >
                查看全部 →
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* 工单统计 */}
            <div className="grid grid-cols-5 gap-3 mb-5">
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-amber-400">{ticketStats.open}</p>
                <p className="text-xs text-gray-400 mt-1">待处理</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-cyan-400">{ticketStats.processing}</p>
                <p className="text-xs text-gray-400 mt-1">处理中</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{ticketStats.pendingRating}</p>
                <p className="text-xs text-gray-400 mt-1">待评价</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-red-400">{ticketStats.highPriority}</p>
                <p className="text-xs text-gray-400 mt-1">高优先级</p>
              </div>
              <div className="text-center p-3 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                <p className="text-2xl font-bold text-neon-purple">{groupTicketStats.total}</p>
                <p className="text-xs text-gray-400 mt-1">集团工单</p>
              </div>
            </div>

            {/* 最新工单（按优先级排序，集团工单优先） */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">优先处理</h3>
                {groupTicketStats.urgent > 0 && (
                  <span className="text-xs text-neon-purple">
                    {groupTicketStats.urgent} 个紧急集团工单
                  </span>
                )}
              </div>
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => {
                  const badges = getTicketBadges(ticket);
                  return (
                    <motion.div 
                      key={ticket.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => navigate('/support')}
                      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-[#1E2538] cursor-pointer transition-all ${
                        ticket.isGroupLevel ? 'bg-neon-purple/5 border border-neon-purple/20' : 'bg-[#0B0F19]'
                      }`}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        ticket.priority === 'urgent' ? 'bg-red-400' :
                        ticket.priority === 'high' ? 'bg-orange-400' :
                        'bg-cyan-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{ticket.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${ticketStatusConfig[ticket.status].bgColor} ${ticketStatusConfig[ticket.status].color}`}>
                            {ticketStatusConfig[ticket.status].label}
                          </span>
                          {badges.map((badge, idx) => (
                            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.color}`}>
                              {badge.text}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{ticket.hotelName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        {(ticket as any).priorityScore > 100 && (
                          <span className="text-[10px] text-neon-amber">
                            优先级: {(ticket as any).priorityScore}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p>暂无待处理工单</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 内容风控 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden"
        >
          <div className="p-5 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Flag size={20} className="text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">内容风控</h2>
                  <p className="text-gray-400 text-sm">后发监控 · 异常巡检</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/content')}
                className="text-sm text-neon-cyan hover:underline"
              >
                查看全部 →
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* 内容统计 */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-white">{contentStats.total}</p>
                <p className="text-xs text-gray-400 mt-1">总内容</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-amber-400">{contentStats.withAnomaly}</p>
                <p className="text-xs text-gray-400 mt-1">数据异常</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-orange-400">{contentStats.withReport}</p>
                <p className="text-xs text-gray-400 mt-1">被举报</p>
              </div>
              <div className="text-center p-3 bg-[#0B0F19] rounded-lg">
                <p className="text-2xl font-bold text-red-400">{contentStats.takedown}</p>
                <p className="text-xs text-gray-400 mt-1">已下架</p>
              </div>
            </div>

            {/* 最新异常 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">最新异常</h3>
              {recentAnomalies.length > 0 ? (
                recentAnomalies.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => navigate('/content')}
                    className="flex items-start gap-3 p-3 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] cursor-pointer transition-all"
                  >
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.hotelName}</p>
                      {item.anomalies && item.anomalies[0] && (
                        <p className="text-xs text-amber-400 mt-1">
                          {anomalyConfig[item.anomalies[0].type as keyof typeof anomalyConfig]?.label || '异常'}
                          : {item.anomalies[0].message}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p>暂无内容异常</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

// ==================== 客户健康度矩阵组件 ====================

interface HealthMatrixSectionProps {
  healthStats: {
    healthy: number;
    warning: number;
    critical: number;
    total: number;
  };
  anomalyStats: {
    pending: number;
    today?: number;
  };
  criticalHotels: {
    hotel: HotelData;
    score: {
      overall: number;
      level: 'healthy' | 'warning' | 'critical';
      breakdown?: { pricing: number; inventory: number; content: number; service: number };
      issues: { title: string; level: 'warning' | 'critical' }[];
      suggestions: string[];
    };
  }[];
  warningHotels: {
    hotel: HotelData;
    score: {
      overall: number;
      level: 'healthy' | 'warning' | 'critical';
      breakdown?: { pricing: number; inventory: number; content: number; service: number };
      issues: { title: string; level: 'warning' | 'critical' }[];
      suggestions: string[];
    };
  }[];
}

function HealthMatrixSection({ 
  healthStats, 
  anomalyStats, 
  criticalHotels, 
  warningHotels 
}: HealthMatrixSectionProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* 可折叠标题栏 */}
      <div 
        className="p-5 border-b border-gray-800 cursor-pointer hover:bg-[#1E2538]/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Heart size={20} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">客户健康度矩阵</h2>
              <p className="text-gray-400 text-sm">
                基于统一异常检测 · 共 {healthStats.total} 家酒店 · 
                <span 
                  className="text-neon-cyan cursor-pointer hover:underline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/anomalies');
                  }}
                >
                  查看异常中心 ({anomalyStats.pending} 待处理)
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {Object.entries(healthLevelConfig).map(([key, config]) => {
              const count = healthStats[key as keyof typeof healthStats] || 0;
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${config.bgColor}`}>
                    <Icon size={14} className={config.color} />
                  </div>
                  <span className="text-sm text-gray-400">{config.label}</span>
                  <span className={`text-sm font-semibold ${config.color}`}>{count}</span>
                </div>
              );
            })}
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="ml-2 text-gray-400"
            >
              <ChevronDown size={20} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 可折叠内容区 */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5">
              {/* 需要干预的客户 */}
              {criticalHotels.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertOctagon size={16} className="text-red-400" />
                    <span className="text-sm font-medium text-red-400">需要立即干预</span>
                    <span className="text-sm text-gray-500">({criticalHotels.length}家)</span>
                  </div>
                  <div className="space-y-2">
                    {criticalHotels.map(({ hotel, score }) => (
                      <HealthHotelCard 
                        key={hotel.id} 
                        hotel={hotel} 
                        score={score} 
                        onClick={() => navigate('/anomalies')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 需要关注的客户 */}
              {warningHotels.length > 0 && (
                <div className={criticalHotels.length > 0 ? 'mt-6' : ''}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">需要关注</span>
                    <span className="text-sm text-gray-500">({warningHotels.length}家)</span>
                  </div>
                  <div className="space-y-2">
                    {warningHotels.slice(0, 2).map(({ hotel, score }) => (
                      <HealthHotelCard 
                        key={hotel.id} 
                        hotel={hotel} 
                        score={score}
                        compact
                        onClick={() => navigate('/anomalies')}
                      />
                    ))}
                    {warningHotels.length > 2 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/anomalies');
                        }}
                        className="w-full py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1E2538] rounded-lg transition-all"
                      >
                        查看全部 {warningHotels.length} 家需关注酒店 →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 全部健康 */}
              {criticalHotels.length === 0 && warningHotels.length === 0 && (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-4">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <p className="text-lg font-medium text-emerald-400">所有客户运营健康</p>
                  <p className="text-sm text-gray-400 mt-1">暂未发现需要关注的问题</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== 健康度酒店卡片组件 ====================

interface HealthHotelCardProps {
  hotel: HotelData;
  score: {
    overall: number;
    level: 'healthy' | 'warning' | 'critical';
    breakdown?: { pricing: number; inventory: number; content: number; service: number };
    issues: { title: string; level: 'warning' | 'critical' }[];
    suggestions: string[];
  };
  compact?: boolean;
  onClick?: () => void;
}

function HealthHotelCard({ hotel, score, compact = false, onClick }: HealthHotelCardProps) {
  const levelConfig = healthLevelConfig[score.level];
  const LevelIcon = levelConfig.icon;
  
  // 获取问题列表（从 anomalies 计算的问题）
  const topIssues = score.issues.slice(0, compact ? 1 : 2);

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:opacity-90 ${levelConfig.bgColor} ${levelConfig.borderColor}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <LevelIcon size={16} className={levelConfig.color} />
            <span className="font-medium truncate">{hotel.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${levelConfig.bgColor} ${levelConfig.color}`}>
              {score.overall}分
            </span>
          </div>
          
          {!compact && score.breakdown && (
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <TrendingUp size={12} />
                定价{score.breakdown.pricing}分
              </span>
              <span className="flex items-center gap-1">
                <Package size={12} />
                库存{score.breakdown.inventory}分
              </span>
              <span className="flex items-center gap-1">
                <Zap size={12} />
                内容{score.breakdown.content}分
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} />
                服务{score.breakdown.service}分
              </span>
            </div>
          )}
          
          <div className="space-y-1">
            {topIssues.map((issue, idx) => (
              <p key={idx} className={`text-sm ${issue.level === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                • {issue.title}
              </p>
            ))}
          </div>
          
          {!compact && score.suggestions[0] && (
            <p className="text-xs text-gray-400 mt-2">
              💡 {score.suggestions[0]}
            </p>
          )}
        </div>
        
        <ChevronRight size={18} className="text-gray-500 mt-1" />
      </div>
    </div>
  );
}


// ==================== 客户成功概览组件 ====================
// 使用统一的 customerSuccessService 计算逻辑，与 CustomerSuccess 页面数据联动

import {
  calculateAllCustomerHealth,
  calculateSuccessMetrics,
} from '../services/customerSuccessService';

interface CustomerSuccessOverviewProps {
  hotels: HotelData[];
  customers: Customer[];
  contentItems: import('../stores/adminStore').ContentItem[];
  tickets: import('../stores/adminStore').Ticket[];
}

function CustomerSuccessOverview({ hotels, customers, contentItems, tickets }: CustomerSuccessOverviewProps) {
  const navigate = useNavigate();

  // 使用统一的客户成功计算服务（与 CustomerSuccess 页面一致）
  const healthScores = useMemo(() => {
    return calculateAllCustomerHealth(customers, contentItems, tickets);
  }, [customers, contentItems, tickets]);

  const successMetrics = useMemo(() => {
    return calculateSuccessMetrics(healthScores);
  }, [healthScores]);

  // 行动清单（预留，可用于后续添加快速行动按钮）
  // const actionItems = useMemo(() => {
  //   return generateActionItems(healthScores);
  // }, [healthScores]);

  // 培训完成率
  const trainingStats = useMemo(() => {
    const completed = hotels.filter(h => h.training?.completed).length;
    const total = hotels.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, rate };
  }, [hotels]);

  // 功能采用率
  const adoptionStats = useMemo(() => {
    const usingAI = hotels.filter(h => 
      h.aiAdoption?.content || h.aiAdoption?.service || h.aiAdoption?.pricing
    ).length;
    const total = hotels.length;
    const rate = total > 0 ? Math.round((usingAI / total) * 100) : 0;
    return { usingAI, total, rate };
  }, [hotels]);

  // 流失风险客户（基于新的健康度计算）
  const churnRiskStats = useMemo(() => {
    const atRisk = healthScores.filter((h: import('../services/customerSuccessService').CustomerHealthScore) => 
      h.level === 'critical' || h.metrics.loginDaysInWeek === 0
    );
    
    const sorted = atRisk
      .map((h: import('../services/customerSuccessService').CustomerHealthScore) => ({
        ...h,
        notLoggedInDays: h.metrics.lastLoginAt
          ? Math.floor((Date.now() - new Date(h.metrics.lastLoginAt).getTime()) / (24 * 60 * 60 * 1000))
          : 999,
      }))
      .sort((a: import('../services/customerSuccessService').CustomerHealthScore & { notLoggedInDays: number }, 
             b: import('../services/customerSuccessService').CustomerHealthScore & { notLoggedInDays: number }) => {
        if (a.level === 'critical' && b.level !== 'critical') return -1;
        if (b.level === 'critical' && a.level !== 'critical') return 1;
        return b.notLoggedInDays - a.notLoggedInDays;
      });

    return {
      count: atRisk.length,
      top5: sorted.slice(0, 5),
    };
  }, [healthScores]);

  // 续约预警
  const renewalStats = useMemo(() => {
    const now = new Date().getTime();
    const thirtyDaysLater = now + 30 * 24 * 60 * 60 * 1000;
    
    const expiringSoon = customers
      .filter(c => {
        const expireTime = new Date(c.expireAt).getTime();
        return expireTime > now && expireTime <= thirtyDaysLater;
      })
      .map(c => ({
        ...c,
        daysUntilExpire: Math.ceil((new Date(c.expireAt).getTime() - now) / (24 * 60 * 60 * 1000)),
      }))
      .sort((a, b) => a.daysUntilExpire - b.daysUntilExpire);

    return {
      count: expiringSoon.length,
      customers: expiringSoon,
    };
  }, [customers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* 头部 */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Users size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">客户成功概览</h2>
              <p className="text-gray-400 text-sm">培训进度 · 功能采用 · 客户价值 · 流失预警</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/customers?tab=success')}
            className="text-sm text-neon-cyan hover:underline flex items-center gap-1"
          >
            查看详情 <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          {/* 培训完成率 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/training')}
            className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">培训完成率</p>
                <p className="text-2xl font-bold mt-1">
                  <AnimatedValue value={trainingStats.rate} suffix="%" delay={0.6} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{trainingStats.completed}/{trainingStats.total}家门店</p>
              </div>
              <div className="p-2.5 rounded-lg bg-neon-blue/10">
                <GraduationCap size={20} className="text-neon-blue" />
              </div>
            </div>
          </motion.div>

          {/* 功能采用率 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            onClick={() => navigate('/customers?tab=success')}
            className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">功能采用率</p>
                <p className="text-2xl font-bold mt-1">
                  <AnimatedValue value={adoptionStats.rate} suffix="%" delay={0.7} />
                </p>
                <p className="text-xs text-gray-500 mt-1">至少使用1项AI功能</p>
              </div>
              <div className="p-2.5 rounded-lg bg-neon-purple/10">
                <Zap size={20} className="text-neon-purple" />
              </div>
            </div>
          </motion.div>

          {/* 平均健康度 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => navigate('/customers?tab=success')}
            className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">平均健康度</p>
                <p className="text-2xl font-bold mt-1">
                  <AnimatedValue value={successMetrics.avgHealthScore} delay={0.8} />
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {successMetrics.healthyCount}健康 / {successMetrics.warningCount}关注 / {successMetrics.criticalCount}风险
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-neon-amber/10">
                <Activity size={20} className="text-neon-amber" />
              </div>
            </div>
          </motion.div>

          {/* 流失风险 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            onClick={() => navigate('/customers?tab=success')}
            className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">流失风险</p>
                <p className="text-2xl font-bold mt-1">
                  <AnimatedValue value={churnRiskStats.count} delay={0.9} />
                </p>
                <p className="text-xs text-gray-500 mt-1">需主动干预</p>
              </div>
              <div className="p-2.5 rounded-lg bg-neon-red/10">
                <AlertTriangle size={20} className="text-neon-red" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 下方两列：高风险客户 + 续约预警 */}

        {/* 下方两列：高风险客户 + 续约预警 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 高风险客户列表 */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                TOP 5 高风险客户
              </h3>
              <button 
                onClick={() => navigate('/customers?tab=success')}
                className="text-xs text-neon-cyan hover:underline flex items-center gap-1"
              >
                查看全部 <ChevronRight size={12} />
              </button>
            </div>
            
            <div className="bg-[#0B0F19] rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">客户名称</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">健康度</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">最后登录</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">AI功能</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">续约状态</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {churnRiskStats.top5.length > 0 ? (
                    churnRiskStats.top5.map((customer: import('../services/customerSuccessService').CustomerHealthScore & { notLoggedInDays: number }, idx: number) => {
                      const isCritical = customer.level === 'critical';
                      const notLoggedInDays = customer.metrics.lastLoginAt
                        ? Math.floor((Date.now() - new Date(customer.metrics.lastLoginAt).getTime()) / (24 * 60 * 60 * 1000))
                        : 999;
                      const healthColor = isCritical ? 'text-red-400' : notLoggedInDays > 7 ? 'text-amber-400' : 'text-gray-400';
                      const healthBg = isCritical ? 'bg-red-400/10' : notLoggedInDays > 7 ? 'bg-amber-400/10' : 'bg-gray-400/10';
                      
                      return (
                        <motion.tr 
                          key={customer.customerId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + idx * 0.05 }}
                          className="hover:bg-[#1E2538] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.customerName}</span>
                              {isCritical && <AlertOctagon size={14} className="text-red-400" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${healthBg} ${healthColor}`}>
                              {customer.overallScore}分
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={notLoggedInDays > 7 ? 'text-amber-400' : 'text-gray-400'}>
                              <Clock size={12} className="inline mr-1" />
                              {notLoggedInDays >= 999 ? '从未登录' : notLoggedInDays > 0 ? `${notLoggedInDays}天前` : '今天'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-gray-400">{Math.floor(Math.random() * 3) + 1}/3项</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-400/10 text-emerald-400">
                              <FileCheck size={12} className="mr-1" />
                              正常
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => navigate(`/customers?tab=success&customer=${customer.customerId}`)}
                              className="text-xs text-neon-cyan hover:text-neon-cyan/80 flex items-center gap-1 ml-auto"
                            >
                              查看详情 <ExternalLink size={10} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                        <p>暂无高风险客户</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 续约预警 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                续约预警
              </h3>
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                {renewalStats.count}个即将到期
              </span>
            </div>
            
            <div className="bg-[#0B0F19] rounded-xl border border-gray-800 p-4">
              {renewalStats.customers.length > 0 ? (
                <div className="space-y-3">
                  {renewalStats.customers.map((customer, idx) => (
                    <motion.div 
                      key={customer.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + idx * 0.05 }}
                      className="flex items-center justify-between p-3 bg-[#151B2B] rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{customer.companyName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">销售: {customer.salesRep}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${
                          customer.daysUntilExpire <= 7 ? 'text-red-400' : 
                          customer.daysUntilExpire <= 14 ? 'text-amber-400' : 'text-gray-400'
                        }`}>
                          {customer.daysUntilExpire}天后
                        </span>
                        <p className="text-xs text-gray-500">到期</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                  <p>暂无即将到期客户</p>
                </div>
              )}
              
              {renewalStats.customers.length > 0 && (
                <button 
                  onClick={() => navigate('/customers?filter=expiring')}
                  className="w-full mt-4 py-2 text-xs text-neon-cyan hover:text-neon-cyan/80 border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/5 transition-all"
                >
                  查看全部到期客户 →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== 集团维度统计组件 ====================

interface CustomerDistributionSectionProps {
  distribution: {
    total: number;
    singleHotels: number;
    singleCustomers: number;
    groupCustomers: number;
    groupHotels: number;
  };
  renewalStats: {
    expired: number;
    sevenDays: number;
    thirtyDays: number;
    sixtyDays: number;
  };
  groupHealthDistribution: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  topGroupCustomers: Array<{
    id: string;
    companyName: string;
    monthlyRevenue: number;
    healthScore?: number;
    daysUntilExpire: number;
    riskLevel?: 'high' | 'medium' | 'low';
  }>;
  onNavigate: (path: string) => void;
}

function CustomerDistributionSection({ 
  distribution, 
  renewalStats,
  groupHealthDistribution,
  topGroupCustomers,
  onNavigate 
}: CustomerDistributionSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* 头部 */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-purple/10 rounded-lg">
              <Users size={20} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">客户分布与续约</h2>
              <p className="text-gray-400 text-sm">单体与集团客户分布 · 续约预警</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('/customers')}
            className="text-sm text-neon-cyan hover:underline"
          >
            查看全部 →
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-6">
          {/* 客户分布 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">客户分布</h3>
            <div className="grid grid-cols-2 gap-3">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800"
              >
                <p className="text-3xl font-bold text-neon-cyan">{distribution.singleCustomers}</p>
                <p className="text-xs text-gray-400 mt-1">单体客户</p>
                <p className="text-xs text-neon-cyan/70 mt-0.5">{distribution.singleHotels}家酒店</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45 }}
                className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800"
              >
                <p className="text-3xl font-bold text-neon-purple">{distribution.groupCustomers}</p>
                <p className="text-xs text-gray-400 mt-1">集团客户</p>
                <p className="text-xs text-neon-purple/70 mt-0.5">{distribution.groupHotels}家门店</p>
              </motion.div>
            </div>
            <div className="p-3 bg-[#0B0F19] rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">总客户数</span>
                <span className="font-bold">{distribution.total}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div className="flex h-full">
                  <div 
                    className="bg-neon-cyan" 
                    style={{ width: `${(distribution.singleCustomers / distribution.total) * 100}%` }}
                  />
                  <div 
                    className="bg-neon-purple" 
                    style={{ width: `${(distribution.groupCustomers / distribution.total) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan" />
                  单体 {(distribution.singleCustomers / distribution.total * 100).toFixed(0)}%
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-purple" />
                  集团 {(distribution.groupCustomers / distribution.total * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 续约预警 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">续约预警</h3>
            <div className="space-y-2">
              {renewalStats.expired > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-all"
                  onClick={() => onNavigate('/customers?status=expired')}
                >
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={16} className="text-red-400" />
                    <span className="text-sm">已过期</span>
                  </div>
                  <span className="text-lg font-bold text-red-400">{renewalStats.expired}</span>
                </motion.div>
              )}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-all"
                onClick={() => onNavigate('/customers?renewal=7')}
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-red-400" />
                  <span className="text-sm">7天内到期</span>
                </div>
                <span className="text-lg font-bold text-red-400">{renewalStats.sevenDays}</span>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                onClick={() => onNavigate('/customers?renewal=30')}
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-sm">30天内到期</span>
                </div>
                <span className="text-lg font-bold text-amber-400">{renewalStats.thirtyDays}</span>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg border border-gray-800 cursor-pointer hover:bg-[#1E2538] transition-all"
                onClick={() => onNavigate('/customers?renewal=60')}
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-sm">60天内到期</span>
                </div>
                <span className="text-lg font-bold text-gray-400">{renewalStats.sixtyDays}</span>
              </motion.div>
            </div>
          </div>

          {/* 集团健康度分布 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300">集团健康度分布</h3>
            <div className="space-y-3">
              {/* 环形图 */}
              <div className="flex items-center justify-center py-2">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    {/* 背景圆环 */}
                    <path
                      className="text-gray-800"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    {/* 健康 */}
                    <path
                      className="text-emerald-400"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(groupHealthDistribution.healthy / Math.max(groupHealthDistribution.total, 1)) * 100}, 100`}
                    />
                    {/* 需关注 */}
                    <path
                      className="text-amber-400"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(groupHealthDistribution.warning / Math.max(groupHealthDistribution.total, 1)) * 100}, 100`}
                      strokeDashoffset={`${-(groupHealthDistribution.healthy / Math.max(groupHealthDistribution.total, 1)) * 100}`}
                    />
                    {/* 高风险 */}
                    <path
                      className="text-red-400"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${(groupHealthDistribution.critical / Math.max(groupHealthDistribution.total, 1)) * 100}, 100`}
                      strokeDashoffset={`${-((groupHealthDistribution.healthy + groupHealthDistribution.warning) / Math.max(groupHealthDistribution.total, 1)) * 100}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{groupHealthDistribution.total}</span>
                  </div>
                </div>
              </div>
              
              {/* 图例 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm">健康</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{groupHealthDistribution.healthy}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm">需关注</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{groupHealthDistribution.warning}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm">高风险</span>
                  </div>
                  <span className="text-sm font-bold text-red-400">{groupHealthDistribution.critical}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* TOP集团客户 */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">TOP集团客户</h3>
            <span className="text-xs text-gray-500">按GMV · 显示健康度与续约状态</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {topGroupCustomers.length > 0 ? (
              topGroupCustomers.map((customer, idx) => (
                <motion.div 
                  key={customer.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg cursor-pointer hover:bg-[#1E2538] transition-all"
                  onClick={() => onNavigate(`/customers?id=${customer.id}`)}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{customer.companyName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        ¥{(customer.monthlyRevenue / 10000).toFixed(1)}万/月
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      (customer.healthScore || 0) >= 80 ? 'bg-emerald-500/10' :
                      (customer.healthScore || 0) >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'
                    }`}>
                      <span className={`text-sm font-bold ${
                        (customer.healthScore || 0) >= 80 ? 'text-emerald-400' :
                        (customer.healthScore || 0) >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {customer.healthScore || '-'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs ${
                        customer.daysUntilExpire <= 7 ? 'text-red-400' :
                        customer.daysUntilExpire <= 30 ? 'text-amber-400' : 'text-gray-400'
                      }`}>
                        {customer.daysUntilExpire > 0 ? `${customer.daysUntilExpire}天` : '已过期'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 col-span-2">
                <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                <p>暂无集团客户</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
