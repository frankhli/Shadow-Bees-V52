/**
 * Shadow-Bees V52 - 渠道效能大盘（企业版）
 * 
 * 核心功能：
 * 1. 单酒店深度分析：漏斗、热力图、详细指标
 * 2. 多酒店对比分析：排行榜、优势识别、异常检测
 * 3. 时间范围切换：7天/30天/90天数据动态加载
 * 4. 渠道筛选：全部/闲鱼/小红书/微信/抖音
 * 
 * 主题：企业版浅色主题（Tailwind gray-xxx）
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Target,
  Users,
  ShoppingCart,
  CreditCard,
  Lightbulb,
  Building2,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import * as channelApi from '../../api/channelApi';
import type { Platform, TimeRange, ChannelInsight } from '../../api/channelApi';
import { formatSmartAmount, formatSmartCount, type SmartFormatResult } from '../../utils/formatters';

// ==================== 常量配置 ====================

const PLATFORM_CONFIG: Record<Platform, { 
  name: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
  logo: string;
  desc: string;
}> = {
  xianyu: { 
    name: '闲鱼', 
    color: '#FF6B00', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200',
    logo: '/logos/xianyu.jpg',
    desc: '二手交易',
  },
  xiaohongshu: { 
    name: '小红书', 
    color: '#FF2442', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200',
    logo: '/logos/xiaohongshu.jpg',
    desc: '种草社区',
  },
  wechat: { 
    name: '微信', 
    color: '#07C160', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200',
    logo: '/logos/wechat.jpg',
    desc: '私域流量',
  },
  douyin: { 
    name: '抖音', 
    color: '#000000', 
    bgColor: 'bg-gray-100', 
    borderColor: 'border-gray-200',
    logo: '/logos/douyin.jpg',
    desc: '短视频',
  },
};

// ==================== 子组件 ====================

/**
 * 指标卡片组件
 */
function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  subtitle,
  smartFormat,
  loading = false,
}: { 
  title: string;
  value?: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  subtitle?: string;
  smartFormat?: SmartFormatResult;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900" title={smartFormat?.fullValue}>
            {smartFormat ? (
              <span className="flex items-baseline gap-0.5">
                <span>{smartFormat.prefix}{smartFormat.value}</span>
                {smartFormat.unit && <span className="text-sm text-gray-500">{smartFormat.unit}</span>}
              </span>
            ) : (
              value
            )}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
               trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
              {change}
            </span>
            {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
          </div>
        </div>
        <div className="p-3 bg-violet-50 rounded-xl">
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
      </div>
    </div>
  );
}

/**
 * 漏斗图组件
 */
function FunnelChart({ 
  data,
  loading = false,
}: { 
  data: { impression: number; click: number; inquiry: number; order: number };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const steps = [
    { label: '曝光', value: data.impression, color: 'bg-blue-500', width: '100%' },
    { label: '点击', value: data.click, color: 'bg-cyan-500', width: `${(data.click / data.impression) * 100}%` },
    { label: '咨询', value: data.inquiry, color: 'bg-amber-500', width: `${(data.inquiry / data.impression) * 100}%` },
    { label: '成交', value: data.order, color: 'bg-emerald-500', width: `${(data.order / data.impression) * 100}%` },
  ];

  const totalConversion = data.impression > 0 
    ? ((data.order / data.impression) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="w-4 h-4 text-violet-600" />
        转化漏斗
      </h4>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-10">{step.label}</span>
            <div className="flex-1">
              <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${step.color} transition-all duration-500`}
                  style={{ width: step.width }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900 w-16 text-right">
              {(step.value / 1000).toFixed(1)}k
            </span>
            {index > 0 && (
              <span className="text-xs text-gray-400 w-12 text-right">
                {steps[index - 1].value > 0 
                  ? `${((step.value / steps[index - 1].value) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">总转化率</span>
          <span className="text-lg font-bold text-emerald-600">{totalConversion}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 24小时热力图组件
 */
function HourlyHeatmap({ 
  data,
  platform,
  loading = false,
}: { 
  data: number[];
  platform: Platform;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const maxValue = Math.max(...data, 1);
  const config = PLATFORM_CONFIG[platform];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-violet-600" />
        24小时访客分布
      </h4>
      <div className="grid grid-cols-12 gap-1">
        {data.map((value, hour) => (
          <div key={hour} className="text-center">
            <div 
              className="h-12 rounded transition-all hover:opacity-80"
              style={{ 
                backgroundColor: config.color,
                opacity: 0.1 + (value / maxValue) * 0.9,
              }}
              title={`${hour}:00 - 访客: ${value}`}
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              {hour % 3 === 0 ? hour : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

/**
 * 洞察卡片组件（紧凑版）
 */
function InsightCard({ insight }: { insight: ChannelInsight }) {
  const config = {
    opportunity: { icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    warning: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    tip: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  }[insight.type];

  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-lg border ${config.border} ${config.bg}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-medium text-gray-900 truncate">{insight.title}</h5>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 渠道筛选卡片（紧凑横向版）
 */
function PlatformFilterCard({
  platform,
  isSelected,
  isAll = false,
  onClick,
  metrics,
}: {
  platform?: Platform;
  isSelected: boolean;
  isAll?: boolean;
  onClick: () => void;
  metrics?: { gmv: number; orders: number; growth: number; trend: 'up' | 'down' | 'stable' };
}) {
  const config = platform ? PLATFORM_CONFIG[platform] : null;

  if (isAll) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          isSelected
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
        </div>
        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">全部</span>
        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />}
      </button>
    );
  }

  if (!config || !metrics) return null;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isSelected
          ? `border-violet-500 bg-violet-50`
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white flex items-center justify-center border border-gray-100">
        <img 
          src={config.logo} 
          alt={config.name}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900">{config.name}</span>
          <span className={`text-xs ${
            metrics.trend === 'up' ? 'text-emerald-600' : metrics.trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {metrics.growth >= 0 ? '+' : ''}{metrics.growth.toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-gray-500">¥{(metrics.gmv / 10000).toFixed(1)}万 · {metrics.orders}单</p>
      </div>
    </button>
  );
}

// ==================== 主组件 ====================

export default function ChannelDashboard() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  
  // 状态管理
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<channelApi.ChannelDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载渠道数据
  const loadChannelData = async () => {
    if (selectedHotelIds.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await channelApi.getChannelDashboard(selectedHotelIds, timeRange);
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || '加载数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('加载渠道数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和时间范围变化时重新加载
  useEffect(() => {
    loadChannelData();
  }, [selectedHotelIds, timeRange]);

  // 汇总数据
  const summary = useMemo(() => {
    if (!dashboardData) return null;
    return dashboardData.summary;
  }, [dashboardData]);

  // 获取第一个酒店的渠道指标（用于筛选展示）
  const hotelMetrics = useMemo(() => {
    if (!dashboardData?.hotels[0]) return [];
    return dashboardData.hotels[0].metrics;
  }, [dashboardData]);

  // 筛选后的指标数据
  const filteredMetrics = useMemo(() => {
    if (!dashboardData) return [];
    
    const allMetrics = dashboardData.hotels.flatMap((h: channelApi.HotelChannelData) => h.metrics);
    
    if (selectedPlatform === 'all') {
      return allMetrics;
    }
    
    return allMetrics.filter((m: channelApi.ChannelMetrics) => m.platform === selectedPlatform);
  }, [dashboardData, selectedPlatform]);

  // 计算筛选后的汇总
  const filteredSummary = useMemo(() => {
    if (filteredMetrics.length === 0) return null;
    
    const totalGMV = filteredMetrics.reduce((sum: number, m: channelApi.ChannelMetrics) => sum + m.gmv, 0);
    const totalOrders = filteredMetrics.reduce((sum: number, m: channelApi.ChannelMetrics) => sum + m.orders, 0);
    const totalVisitors = filteredMetrics.reduce((sum: number, m: channelApi.ChannelMetrics) => sum + m.visitors, 0);
    const avgConversionRate = filteredMetrics.reduce((sum: number, m: channelApi.ChannelMetrics) => sum + m.conversionRate, 0) / filteredMetrics.length;
    const avgGrowth = filteredMetrics.reduce((sum: number, m: channelApi.ChannelMetrics) => sum + m.growth, 0) / filteredMetrics.length;
    
    return {
      totalGMV,
      totalOrders,
      totalVisitors,
      avgConversionRate,
      avgGrowth,
      trend: avgGrowth >= 0 ? 'up' : 'down' as 'up' | 'down',
    };
  }, [filteredMetrics]);

  // 汇总漏斗数据
  const totalFunnel = useMemo(() => {
    if (filteredMetrics.length === 0) return { impression: 0, click: 0, inquiry: 0, order: 0 };
    
    return filteredMetrics.reduce((acc: { impression: number; click: number; inquiry: number; order: number }, m: channelApi.ChannelMetrics) => ({
      impression: acc.impression + m.funnel.impression,
      click: acc.click + m.funnel.click,
      inquiry: acc.inquiry + m.funnel.inquiry,
      order: acc.order + m.funnel.order,
    }), { impression: 0, click: 0, inquiry: 0, order: 0 });
  }, [filteredMetrics]);

  // 24小时数据汇总（用于热力图）
  const hourlyData = useMemo(() => {
    if (filteredMetrics.length === 0) return Array(24).fill(0);
    
    const combined: number[] = Array(24).fill(0);
    filteredMetrics.forEach((m: channelApi.ChannelMetrics) => {
      m.hourlyDistribution.forEach((value: number, hour: number) => {
        combined[hour] += value;
      });
    });
    return combined;
  }, [filteredMetrics]);

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看渠道数据</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          渠道大盘需要选择至少一家酒店才能展示数据。<br/>
          您可以通过顶部酒店选择器选择单个或多个酒店进行查看和对比。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BatchOperationBar />
      
      {/* 头部操作栏 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600" />
            渠道效能大盘
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? selectedHotels[0]?.name
              : `已选择 ${selectedHotels.length} 家酒店 - 对比分析`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 时间范围切换 */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                disabled={loading}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range 
                    ? 'bg-violet-100 text-violet-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {range === '7d' ? '近7天' : range === '30d' ? '近30天' : '近90天'}
              </button>
            ))}
          </div>
          
          {/* 刷新按钮 */}
          <button
            onClick={loadChannelData}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* 导出按钮 */}
          <button 
            onClick={() => {
              // 导出渠道数据为CSV
              const headers = ['渠道', '曝光量', '点击量', '订单量', 'GMV', '转化率', '客单价'];
              const rows = filteredMetrics.map(m => [
                PLATFORM_CONFIG[m.platform].name,
                m.impressions,
                m.clicks,
                m.orders,
                m.gmv,
                `${(m.conversionRate * 100).toFixed(2)}%`,
                m.avgOrderValue.toFixed(2)
              ]);
              const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `渠道数据_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button 
            onClick={loadChannelData}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            重试
          </button>
        </div>
      )}

      {/* 渠道筛选栏 - 横向紧凑排列 */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-sm text-gray-500 mr-1 flex-shrink-0">渠道筛选:</span>
          <PlatformFilterCard
            isAll
            isSelected={selectedPlatform === 'all'}
            onClick={() => setSelectedPlatform('all')}
          />
          {hotelMetrics.map((metric: channelApi.ChannelMetrics) => (
            <PlatformFilterCard
              key={metric.platform}
              platform={metric.platform}
              isSelected={selectedPlatform === metric.platform}
              onClick={() => setSelectedPlatform(metric.platform)}
              metrics={{
                gmv: metric.gmv,
                orders: metric.orders,
                growth: metric.growth,
                trend: metric.trend,
              }}
            />
          ))}
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="总GMV"
          smartFormat={filteredSummary ? formatSmartAmount(filteredSummary.totalGMV) : undefined}
          value={!filteredSummary ? '¥0' : undefined}
          change={filteredSummary ? `${filteredSummary.avgGrowth >= 0 ? '+' : ''}${filteredSummary.avgGrowth.toFixed(1)}%` : '0%'}
          trend={filteredSummary ? (filteredSummary.avgGrowth >= 0 ? 'up' : 'down') : 'stable'}
          icon={CreditCard}
          subtitle="环比"
          loading={loading}
        />
        <MetricCard
          title="订单数"
          smartFormat={filteredSummary ? formatSmartCount(filteredSummary.totalOrders) : undefined}
          value={!filteredSummary ? '0' : undefined}
          change={summary ? `${summary.periodOverPeriod.ordersGrowth >= 0 ? '+' : ''}${summary.periodOverPeriod.ordersGrowth.toFixed(1)}%` : '0%'}
          trend={summary ? (summary.periodOverPeriod.ordersGrowth >= 0 ? 'up' : 'down') : 'stable'}
          icon={ShoppingCart}
          subtitle="环比"
          loading={loading}
        />
        <MetricCard
          title="访客数"
          smartFormat={filteredSummary ? formatSmartCount(filteredSummary.totalVisitors) : undefined}
          value={!filteredSummary ? '0' : undefined}
          change={summary ? `${summary.periodOverPeriod.visitorsGrowth >= 0 ? '+' : ''}${summary.periodOverPeriod.visitorsGrowth.toFixed(1)}%` : '0%'}
          trend={summary ? (summary.periodOverPeriod.visitorsGrowth >= 0 ? 'up' : 'down') : 'stable'}
          icon={Users}
          subtitle="环比"
          loading={loading}
        />
        <MetricCard
          title="平均转化率"
          value={filteredSummary ? `${filteredSummary.avgConversionRate.toFixed(2)}%` : '0%'}
          change={filteredSummary ? `${filteredSummary.avgGrowth >= 0 ? '+' : ''}${filteredSummary.avgGrowth.toFixed(1)}%` : '0%'}
          trend={filteredSummary ? (filteredSummary.avgGrowth >= 0 ? 'up' : 'down') : 'stable'}
          icon={Target}
          subtitle="环比"
          loading={loading}
        />
      </div>

      {/* 主内容区 - 三列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：转化漏斗 */}
        <div>
          <FunnelChart 
            data={totalFunnel}
            loading={loading}
          />
        </div>

        {/* 中间：24小时热力图 */}
        <div>
          {selectedPlatform !== 'all' ? (
            <HourlyHeatmap 
              data={hourlyData}
              platform={selectedPlatform}
              loading={loading}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
              <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600" />
                24小时访客分布
              </h4>
              <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)] text-gray-400">
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">选择单个渠道查看时段分布</p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：智能洞察 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-violet-600" />
            智能洞察
            {dashboardData?.insights && (
              <span className="text-xs text-gray-400 font-normal">
                {dashboardData.insights.length}条
              </span>
            )}
          </h4>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : dashboardData?.insights && dashboardData.insights.length > 0 ? (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {dashboardData.insights.map((insight: ChannelInsight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">暂无异常洞察</p>
            </div>
          )}
        </div>
      </div>

      {/* 数据说明 */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>
          数据说明：当前展示{timeRange === '7d' ? '近7天' : timeRange === '30d' ? '近30天' : '近90天'}数据，
          环比对比上期。更新时间：{new Date().toLocaleString()}
        </span>
      </div>
    </div>
  );
}
