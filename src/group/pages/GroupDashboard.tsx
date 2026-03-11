/**
 * Shadow-Bees V52 - 集团总览页面
 * 与酒店端TodayOverview保持一致的动画和交互效果
 * 时间维度：今日/本周/本月/本年
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Users,
  Rocket,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  ChevronRight,
  MapPin,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { useGroupStore, type HotelInGroup, type GroupAnomaly } from '../stores/groupStore';

// 时间范围配置 - 增加本年
const rangeConfig = {
  today: { label: '今日', days: 1, compareLabel: '较昨日' },
  week: { label: '本周', days: 7, compareLabel: '较上周' },
  month: { label: '本月', days: 30, compareLabel: '较上月' },
  year: { label: '本年', days: 365, compareLabel: '较上年' },
};

type TimeRange = keyof typeof rangeConfig;

// ============================================
// 关键指标霓虹数字卡 - 与酒店端完全一致
// ============================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: any;
  color: string;
  delay?: number;
  animatedValue?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color,
  delay = 0,
  animatedValue,
  valuePrefix = '',
  valueSuffix = '',
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return '#00E396';
    if (trend === 'down') return '#FF4757';
    return '#6B7280';
  };

  const getTrendBg = () => {
    if (trend === 'up') return 'bg-neon-green/10';
    if (trend === 'down') return 'bg-neon-red/10';
    return 'bg-gray-500/10';
  };

  const numericValue = animatedValue !== undefined ? animatedValue :
    parseFloat(value.replace(/[^0-9.-]/g, ''));
  const shouldAnimate = !isNaN(numericValue) && numericValue > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{
        y: -4,
        boxShadow: `0 20px 40px ${color}15`,
        transition: { duration: 0.2 },
      }}
      className="relative p-5 rounded-xl border overflow-hidden group cursor-pointer"
      style={{
        borderColor: `${color}30`,
        background: 'linear-gradient(135deg, rgba(21, 27, 43, 0.9) 0%, rgba(11, 15, 25, 0.9) 100%)',
      }}
    >
      {/* 顶部色条 */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: delay + 0.2 }}
      />

      {/* 悬停光效 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}15 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary font-medium">{title}</span>
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15` }}
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Icon size={20} style={{ color }} />
          </motion.div>
        </div>

        {/* 主数值 */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-din text-3xl font-bold" style={{ color }}>
            {shouldAnimate ? (
              <AnimatedMetricValue
                value={numericValue}
                prefix={valuePrefix}
                suffix={valueSuffix}
                delay={delay + 0.3}
              />
            ) : value}
          </span>
        </div>

        {/* 副标题 */}
        <div className="text-xs text-text-secondary mb-3">{subtitle}</div>

        {/* 趋势指示器 */}
        <motion.div
          className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${getTrendBg()} w-fit`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.5 }}
        >
          {trend === 'up' && <TrendingUp size={12} style={{ color: getTrendColor() }} />}
          {trend === 'down' && <TrendingDown size={12} style={{ color: getTrendColor() }} />}
          <span style={{ color: getTrendColor() }}>{trendValue}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// 动画数值组件 - 与酒店端一致
function AnimatedMetricValue({
  value,
  prefix,
  suffix,
  delay,
}: {
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
    }, (delay || 0) * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString('zh-CN')}{suffix}
    </span>
  );
}

// ============================================
// 区域效能卡片
// ============================================

function RegionCard({ region, index }: { region: { id: string; name: string; manager: string; hotelCount: number; gmv: number; revpar: number; occupancy: number; score: number }; index: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00E396';
    if (score >= 60) return '#FFB800';
    return '#FF4757';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border-color hover:border-neon-purple/30 transition-colors"
    >
      <div className="flex-shrink-0">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
          style={{ background: `${getScoreColor(region.score)}20`, color: getScoreColor(region.score) }}
        >
          {region.score}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{region.name}</h4>
          <span className="text-xs text-text-muted">{region.manager}</span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
          <span>{region.hotelCount}家店</span>
          <span>GMV ¥{(region.gmv / 10000).toFixed(0)}万</span>
          <span>RevPAR ¥{region.revpar}</span>
          <span>入住率 {region.occupancy}%</span>
        </div>
      </div>
      <div className="flex-shrink-0">
        <div className="h-2 w-24 bg-surface-hover rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${region.score}%` }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
            className="h-full rounded-full"
            style={{ background: getScoreColor(region.score) }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 酒店排名列表
// ============================================

function HotelRankingItem({ hotel, index }: { hotel: HotelInGroup; index: number }) {
  const rankColors = ['#FFB800', '#C0C0C0', '#CD7F32'];
  const rankBgColors = ['#FFB80020', '#C0C0C020', '#CD7F3220'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className="flex items-center gap-4 p-3 rounded-xl bg-surface border border-border-color hover:border-neon-purple/30 transition-colors cursor-pointer group"
    >
      {/* 排名 */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          background: index < 3 ? rankBgColors[index] : 'var(--surface-hover)',
          color: index < 3 ? rankColors[index] : 'var(--text-secondary)',
        }}
      >
        {index + 1}
      </div>

      {/* 酒店信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{hotel.name}</h4>
          {hotel.healthLevel === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-neon-amber flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{hotel.region}</span>
          <span>·</span>
          <span>{hotel.manager}</span>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="text-right">
        <div className="font-mono font-semibold text-neon-purple">
          ¥{(hotel.gmv / 10000).toFixed(1)}万
        </div>
        <div className="text-xs text-text-secondary">
          RevPAR ¥{hotel.revpar} · 入住{hotel.occupancy}%
        </div>
      </div>

      {/* 箭头 */}
      <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

// ============================================
// 异常聚合卡片
// ============================================

function AnomalyCard({ anomaly }: { anomaly: GroupAnomaly }) {
  const getTypeConfig = (type: GroupAnomaly['type']) => {
    const configs = {
      pricing: { label: '定价', color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
      inventory: { label: '库存', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
      content: { label: '内容', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      service: { label: '客服', color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
      finance: { label: '财务', color: 'text-red-400', bgColor: 'bg-red-400/10' },
    };
    return configs[type];
  };

  const getLevelIcon = (level: GroupAnomaly['level']) => {
    if (level === 'critical') return <AlertOctagon className="w-4 h-4 text-neon-red" />;
    if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-neon-amber" />;
    return <CheckCircle className="w-4 h-4 text-neon-green" />;
  };

  const config = getTypeConfig(anomaly.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg bg-surface-hover border border-border-color hover:border-neon-purple/30 transition-colors"
    >
      {getLevelIcon(anomaly.level)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-text-muted">{anomaly.hotelName}</span>
        </div>
        <h5 className="font-medium text-sm mt-1">{anomaly.title}</h5>
        <p className="text-xs text-text-secondary mt-0.5">{anomaly.description}</p>
      </div>
      <button onClick={() => alert(`处理异常: ${anomaly.title}`)} className="text-xs text-neon-purple hover:underline flex-shrink-0">
        处理
      </button>
    </motion.div>
  );
}

// ============================================
// 渠道效能卡片
// ============================================

function ChannelCard({ channel, index }: { channel: { platform: string; gmv: number; orderCount: number; ratio: number; change: number }; index: number }) {
  const platformNames: Record<string, string> = {
    meituan: '美团',
    xiecheng: '携程',
    xiaohongshu: '小红书',
    xianyu: '闲鱼',
    wechat: '微信',
  };

  const platformColors: Record<string, string> = {
    meituan: '#00E396',
    xiecheng: '#00A8FF',
    xiaohongshu: '#FF2442',
    xianyu: '#FFDD00',
    wechat: '#07C160',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.05 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium"
        style={{ background: `${platformColors[channel.platform]}20`, color: platformColors[channel.platform] }}
      >
        {platformNames[channel.platform]?.charAt(0)}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{platformNames[channel.platform]}</span>
          <span className="text-xs text-neon-green">+{channel.change}%</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${channel.ratio}%` }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: platformColors[channel.platform] }}
            />
          </div>
          <span className="text-xs text-text-secondary w-8">{channel.ratio}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 主页面
// ============================================

export function GroupDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hotels, regions, channels, anomalies, totalGMV, totalRevpar, avgOccupancy, healthyHotelsCount, warningHotelsCount, criticalHotelsCount, selectedTimeRange } = useGroupStore();
  
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : selectedTimeRange === 'week' ? '本周' : selectedTimeRange === 'month' ? '本月' : '本年';

  // 时间范围
  const currentRange = (searchParams.get('range') as TimeRange) || 'today';
  const config = rangeConfig[currentRange];

  // 异常分类
  const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
  const warningAnomalies = anomalies.filter(a => a.level === 'warning');

  // 排序酒店
  const sortedHotels = useMemo(() => {
    return [...hotels].sort((a, b) => b.gmv - a.gmv);
  }, [hotels]);

  // 指标卡片数据
  const metricCards = [
    {
      title: '集团GMV',
      value: `¥${(totalGMV / 10000).toFixed(1)}万`,
      rawValue: Math.round(totalGMV / 1000),
      subtitle: `${config.compareLabel} +12.5%`,
      trend: 'up' as const,
      trendValue: '+12.5%',
      icon: DollarSign,
      color: '#A855F7',
      valuePrefix: '¥',
      valueSuffix: 'k',
    },
    {
      title: '集团RevPAR',
      value: `¥${totalRevpar}`,
      rawValue: totalRevpar,
      subtitle: `${config.compareLabel} +5.2%`,
      trend: 'up' as const,
      trendValue: '+5.2%',
      icon: BarChart3,
      color: '#00E396',
    },
    {
      title: '综合入住率',
      value: `${avgOccupancy}%`,
      rawValue: avgOccupancy,
      subtitle: `${config.compareLabel} +3.1%`,
      trend: 'up' as const,
      trendValue: '+3.1%',
      icon: Users,
      color: '#FFB800',
      valueSuffix: '%',
    },
    {
      title: '内容转化率',
      value: `${Math.round(hotels.reduce((sum, h) => sum + (h.contentPerformance?.avgConversionRate || 0), 0) / hotels.length)}%`,
      rawValue: Math.round(hotels.reduce((sum, h) => sum + (h.contentPerformance?.avgConversionRate || 0), 0) / hotels.length),
      subtitle: '内容→订单转化',
      trend: 'up' as const,
      trendValue: '+2.3%',
      icon: Rocket,
      color: '#FF6B6B',
      valueSuffix: '%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">集团数据大盘</h1>
          <p className="text-text-secondary text-sm mt-1">
            实时监控集团旗下 {hotels.length} 家酒店经营数据
          </p>
        </div>

        {/* 时间范围切换 */}
        <div className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color">
          {(Object.keys(rangeConfig) as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setSearchParams({ range })}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${currentRange === range
                  ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }
              `}
            >
              {rangeConfig[range].label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <MetricCard key={card.title} {...card} delay={index * 0.1} />
        ))}
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：区域效能 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* 区域效能热力图 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-neon-purple" />
                </div>
                <div>
                  <h3 className="font-semibold">区域效能热力图</h3>
                  <p className="text-xs text-text-secondary">{regions.length} 个区域 · 按综合评分排序</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-green" />
                  <span className="text-text-secondary">优秀(80+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-amber" />
                  <span className="text-text-secondary">良好(60-80)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-red" />
                  <span className="text-text-secondary">待提升(&lt;60)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regions.map((region, index) => (
                <RegionCard key={region.id} region={region} index={index} />
              ))}
            </div>
          </div>

          {/* 异常聚合 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-red/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-neon-red" />
                </div>
                <div>
                  <h3 className="font-semibold">待处理异常</h3>
                  <p className="text-xs text-text-secondary">
                    严重 {criticalAnomalies.length} 项 · 警告 {warningAnomalies.length} 项
                  </p>
                </div>
              </div>
              <Link to="/anomalies" className="text-sm text-neon-purple hover:underline flex items-center gap-1">
                进入异常中心
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-2">
              {anomalies.slice(0, 5).map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* 右侧：酒店排名 + 渠道效能 */}
        <div className="space-y-4">
          {/* 酒店排名 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface rounded-xl border border-border-color p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-amber/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-neon-amber" />
                </div>
                <div>
                  <h3 className="font-semibold">旗下酒店排名</h3>
                  <p className="text-xs text-text-secondary">按 GMV 排序 · {timeRangeLabel}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {sortedHotels.slice(0, 10).map((hotel, index) => (
                <HotelRankingItem key={hotel.id} hotel={hotel} index={index} />
              ))}
            </div>

            <button onClick={() => alert('查看全部酒店列表')} className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-neon-purple border border-border-color hover:border-neon-purple/30 rounded-lg transition-colors">
              查看全部 {hotels.length} 家酒店
            </button>
          </motion.div>

          {/* 渠道效能 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-surface rounded-xl border border-border-color p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-neon-green" />
                </div>
                <div>
                  <h3 className="font-semibold">渠道效能</h3>
                  <p className="text-xs text-text-secondary">GMV分布 · 总订单 {channels.reduce((sum, c) => sum + c.orderCount, 0)}单</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {channels.map((channel, index) => (
                <ChannelCard key={channel.platform} channel={channel} index={index} />
              ))}
            </div>
          </motion.div>

          {/* 健康度统计 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-surface rounded-xl border border-border-color p-5"
          >
            <h3 className="font-semibold mb-4">集团健康度分布</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-neon-green" />
                    健康运营
                  </span>
                  <span className="font-medium">{healthyHotelsCount}家</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-neon-amber" />
                    需要关注
                  </span>
                  <span className="font-medium">{warningHotelsCount}家</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-neon-red" />
                    需要干预
                  </span>
                  <span className="font-medium">{criticalHotelsCount}家</span>
                </div>
              </div>
              <div className="w-20 h-20 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-hover"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-neon-purple"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(healthyHotelsCount / hotels.length) * 100}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{Math.round((healthyHotelsCount / hotels.length) * 100)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default GroupDashboard;
