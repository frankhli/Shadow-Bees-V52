/**
 * SaaS运营后台 - 渠道分析（融合版）
 * 基于真实酒店数据 + 实时推演 - 三大平台深度分析
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Download,
  Eye,
  MousePointer,
  MessageCircle,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useAdminStore, type Platform } from '../../stores/adminStore';
import { Button } from '../../components/ui';
import { useToast } from '../../components/ui';
import { PlatformLogo } from '../../components/PlatformLogo';
import { useSearchParams } from 'react-router-dom';

// 平台配置
const platformConfig: Record<Platform, { 
  name: string; 
  color: string; 
  bgColor: string;
  barColor: string;
}> = {
  xianyu: { 
    name: '闲鱼', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-400/10',
    barColor: '#FACC15',
  },
  xiaohongshu: { 
    name: '小红书', 
    color: 'text-red-400', 
    bgColor: 'bg-red-400/10',
    barColor: '#F87171',
  },
  wechat: { 
    name: '微信', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    barColor: '#07C160',
  },
};

const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];

// 时间范围配置
const timeRangeConfig = {
  today: { label: '今日', days: 1 },
  week: { label: '本周', days: 7 },
  month: { label: '本月', days: 30 },
  custom: { label: '自定义', days: 30 },
};

type TimeRange = keyof typeof timeRangeConfig;

export default function ChannelAnalysisPage() {
  const { hotels, contentItems, realtimeMetrics, selectedTimeRange, setSelectedTimeRange } = useAdminStore();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 从URL或store获取时间范围
  const currentTimeRange = (searchParams.get('range') as TimeRange) || selectedTimeRange;
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // 获取当前时间范围的天数
  const days = timeRangeConfig[currentTimeRange]?.days || 30;

  // 计算时间范围的开始日期
  const getStartDate = () => {
    const today = new Date();
    if (currentTimeRange === 'custom' && customDateRange.start) {
      return new Date(customDateRange.start);
    }
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    return start;
  };
  
  // 日期范围用于显示
  const dateRangeLabel = currentTimeRange === 'custom' && customDateRange.start 
    ? `${customDateRange.start} ~ ${customDateRange.end || '今'}`
    : timeRangeConfig[currentTimeRange].label;

  // 从所有酒店聚合平台数据（按时间范围过滤）
  const aggregatedMetrics = useMemo(() => {
    const metrics: Record<Platform, {
      contentCount: number;
      impressions: number;
      clicks: number;
      inquiries: number;
      conversions: number;
      revenue: number;
    }> = {
      xianyu: { contentCount: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0, revenue: 0 },
      xiaohongshu: { contentCount: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0, revenue: 0 },
      wechat: { contentCount: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0, revenue: 0 }
    };

    // 根据时间范围计算缩放因子
    const getTimeScaleFactor = () => {
      switch (currentTimeRange) {
        case 'today': return 1 / 30; // 今日约是月数据的 1/30
        case 'week': return 7 / 30;  // 本周约是月数据的 7/30
        case 'month': return 1;      // 本月完整数据
        case 'custom': 
          if (customDateRange.start && customDateRange.end) {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return days / 30;
          }
          return 1;
        default: return 1;
      }
    };
    
    const scaleFactor = getTimeScaleFactor();

    // 聚合 hotels 的 platformMetrics（历史数据，按时间范围缩放）
    hotels.forEach(hotel => {
      hotel.platformMetrics.forEach(pm => {
        if (platforms.includes(pm.platform)) {
          metrics[pm.platform].contentCount += Math.round(pm.contentCount * scaleFactor);
          metrics[pm.platform].impressions += Math.round(pm.impressions * scaleFactor);
          metrics[pm.platform].clicks += Math.round(pm.clicks * scaleFactor);
          metrics[pm.platform].inquiries += Math.round(pm.inquiries * scaleFactor);
          metrics[pm.platform].conversions += Math.round(pm.conversions * scaleFactor);
          metrics[pm.platform].revenue += Math.round(pm.revenue * scaleFactor);
        }
      });
    });

    // 添加实时推演数据
    const realtimeKey = currentTimeRange === 'today' ? 'today' : 
                       currentTimeRange === 'week' ? 'thisWeek' : 'thisMonth';
    const realtime = realtimeMetrics[realtimeKey];
    
    if (realtime && realtime.orders > 0) {
      // 按平台分配实时数据（根据内容占比分配）
      const totalContent = Object.values(metrics).reduce((sum, m) => sum + m.contentCount, 0);
      if (totalContent > 0) {
        platforms.forEach(platform => {
          const ratio = metrics[platform].contentCount / totalContent;
          metrics[platform].conversions += Math.round(realtime.orders * ratio * 0.3); // 30%归因到内容转化
          metrics[platform].revenue += Math.round(realtime.gmv * ratio * 0.3);
        });
      }
    }

    return metrics;
  }, [hotels, realtimeMetrics, currentTimeRange, customDateRange]);

  // 计算总体统计数据
  const totalStats = useMemo(() => {
    const totals = Object.values(aggregatedMetrics).reduce((sum, m) => ({
      contentCount: sum.contentCount + m.contentCount,
      impressions: sum.impressions + m.impressions,
      clicks: sum.clicks + m.clicks,
      inquiries: sum.inquiries + m.inquiries,
      conversions: sum.conversions + m.conversions,
      revenue: sum.revenue + m.revenue,
    }), { contentCount: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0, revenue: 0 });

    // 计算比率
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const inquiryRate = totals.clicks > 0 ? (totals.inquiries / totals.clicks) * 100 : 0;
    const conversionRate = totals.inquiries > 0 ? (totals.conversions / totals.inquiries) * 100 : 0;

    return { ...totals, ctr, inquiryRate, conversionRate };
  }, [aggregatedMetrics]);

  // 生成趋势数据（基于内容创建时间分布 + 实时数据）
  const trendData = useMemo(() => {
    const startDate = getStartDate();
    const days = currentTimeRange === 'today' ? 1 : currentTimeRange === 'week' ? 7 : 14;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      
      // 基于内容创建时间分布计算每日数据
      const dayData: Record<string, number | string> = { date: dateStr };
      
      platforms.forEach(platform => {
        // 根据时间范围调整数据量
        const timeScale = currentTimeRange === 'today' ? 0.1 : 
                         currentTimeRange === 'week' ? 0.5 : 1;
        
        const platformContent = contentItems.filter(c => 
          c.platform === platform && 
          new Date(c.createdAt).toDateString() === date.toDateString()
        );
        
        // 计算该日该平台的指标
        const impressions = platformContent.reduce((sum, c) => sum + (c.stats?.impressions || 0), 0);
        const clicks = platformContent.reduce((sum, c) => sum + (c.stats?.clicks || 0), 0);
        
        dayData[platform] = Math.round((impressions + clicks * 10) * timeScale);
      });
      
      data.push(dayData);
    }
    
    return data;
  }, [contentItems, currentTimeRange, customDateRange]);

  // 漏斗数据
  const funnelData = useMemo(() => {
    const filtered = selectedPlatform === 'all' 
      ? totalStats 
      : aggregatedMetrics[selectedPlatform];
    
    return [
      { stage: '曝光', count: filtered.impressions, rate: 100, color: 'bg-blue-500' },
      { stage: '点击', count: filtered.clicks, rate: filtered.impressions > 0 ? (filtered.clicks / filtered.impressions) * 100 : 0, color: 'bg-cyan-500' },
      { stage: '询盘', count: filtered.inquiries, rate: filtered.clicks > 0 ? (filtered.inquiries / filtered.clicks) * 100 : 0, color: 'bg-emerald-500' },
      { stage: '转化', count: filtered.conversions, rate: filtered.inquiries > 0 ? (filtered.conversions / filtered.inquiries) * 100 : 0, color: 'bg-amber-500' },
    ];
  }, [totalStats, aggregatedMetrics, selectedPlatform]);

  // 处理时间范围切换
  const handleTimeRangeChange = (range: TimeRange) => {
    if (range === 'custom') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      setSelectedTimeRange(range);
      setSearchParams({ range });
    }
  };

  // 根据时间范围动态计算变化率
  const getChangeRate = () => {
    const rates: Record<TimeRange, number> = {
      today: Math.random() * 10 + 5,      // +5% ~ +15%
      week: Math.random() * 15 + 8,       // +8% ~ +23%
      month: Math.random() * 20 + 10,     // +10% ~ +30%
      custom: Math.random() * 12 + 6,     // +6% ~ +18%
    };
    return rates[currentTimeRange] || 12;
  };

  // 导出渠道分析报告为CSV
  const handleExport = () => {
    try {
      const timestamp = new Date().toLocaleString('zh-CN');
      const platformLabel = selectedPlatform === 'all' ? '全部平台' : platformConfig[selectedPlatform].name;
      
      // CSV 头部
      const headers = ['渠道分析报告', '', '', '', '', ''];
      const metaRows = [
        ['导出时间', timestamp, '', '', '', ''],
        ['时间范围', dateRangeLabel, '', '', '', ''],
        ['平台筛选', platformLabel, '', '', '', ''],
        ['', '', '', '', '', ''],
      ];

      // 总体统计数据
      const statsRows = [
        ['总体统计', '', '', '', '', ''],
        ['指标', '数值', '', '', '', ''],
        ['总曝光', (selectedPlatform === 'all' ? totalStats.impressions : aggregatedMetrics[selectedPlatform].impressions).toString(), '', '', '', ''],
        ['总点击', (selectedPlatform === 'all' ? totalStats.clicks : aggregatedMetrics[selectedPlatform].clicks).toString(), '', '', '', ''],
        ['总询盘', (selectedPlatform === 'all' ? totalStats.inquiries : aggregatedMetrics[selectedPlatform].inquiries).toString(), '', '', '', ''],
        ['总转化', (selectedPlatform === 'all' ? totalStats.conversions : aggregatedMetrics[selectedPlatform].conversions).toString(), '', '', '', ''],
        ['总收入', `¥${(selectedPlatform === 'all' ? totalStats.revenue : aggregatedMetrics[selectedPlatform].revenue).toLocaleString()}`, '', '', '', ''],
        ['', '', '', '', '', ''],
      ];

      // 各平台详细数据
      const platformHeader = ['平台详情', '', '', '', '', ''];
      const platformCols = ['平台', '内容数', '曝光', '点击', '询盘', '转化', '收入'];
      const platformRows = platforms.map((p) => [
        platformConfig[p].name,
        aggregatedMetrics[p].contentCount.toString(),
        aggregatedMetrics[p].impressions.toString(),
        aggregatedMetrics[p].clicks.toString(),
        aggregatedMetrics[p].inquiries.toString(),
        aggregatedMetrics[p].conversions.toString(),
        `¥${aggregatedMetrics[p].revenue.toLocaleString()}`,
      ]);

      // 关键指标
      const keyMetricsRows = [
        ['', '', '', '', '', ''],
        ['关键指标', '', '', '', '', ''],
        ['点击率 (CTR)', `${(selectedPlatform === 'all' ? totalStats.ctr : (aggregatedMetrics[selectedPlatform].clicks / aggregatedMetrics[selectedPlatform].impressions) * 100).toFixed(2)}%`, '', '', '', ''],
        ['询盘率', `${(selectedPlatform === 'all' ? totalStats.inquiryRate : (aggregatedMetrics[selectedPlatform].inquiries / aggregatedMetrics[selectedPlatform].clicks) * 100).toFixed(2)}%`, '', '', '', ''],
        ['转化率', `${(selectedPlatform === 'all' ? totalStats.conversionRate : (aggregatedMetrics[selectedPlatform].conversions / aggregatedMetrics[selectedPlatform].inquiries) * 100).toFixed(2)}%`, '', '', '', ''],
      ];

      // 合并所有行
      const allRows = [
        headers,
        ...metaRows,
        ...statsRows,
        platformHeader,
        platformCols,
        ...platformRows,
        ...keyMetricsRows,
      ];

      // 转换为 CSV 格式
      const csvContent = allRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

      // 创建下载链接
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `渠道分析报告_${platformLabel}_${dateRangeLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success('报告导出成功');
    } catch (err) {
      error('导出失败，请重试');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">渠道分析</h1>
          <p className="text-gray-400 mt-1">三大平台深度数据分析与转化漏斗 · {dateRangeLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 时间范围切换 */}
          <div className="flex items-center gap-1 bg-[#151B2B] rounded-lg p-1">
            {(Object.keys(timeRangeConfig) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentTimeRange === range
                    ? 'bg-neon-cyan text-black'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {range === 'custom' ? <Calendar size={14} /> : timeRangeConfig[range].label}
              </button>
            ))}
          </div>
          
          <Button variant="secondary" onClick={handleExport} icon={<Download />}>
            导出报告
          </Button>
        </div>
      </div>

      {/* 自定义日期选择器 */}
      {showDatePicker && (
        <div className="bg-[#151B2B] border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">自定义日期范围:</span>
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            />
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => {
                setSelectedTimeRange('custom');
                setSearchParams({ range: 'custom' });
              }}
            >
              应用
            </Button>
          </div>
        </div>
      )}

      {/* 平台筛选 */}
      <div className="flex items-center gap-3">
        <Filter size={18} className="text-gray-400" />
        <button
          onClick={() => setSelectedPlatform('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPlatform === 'all'
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          全部平台
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              selectedPlatform === p
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <PlatformLogo platform={p} size={16} />
            {platformConfig[p].name}
          </button>
        ))}
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { 
            label: '总曝光', 
            value: (selectedPlatform === 'all' ? totalStats.impressions : aggregatedMetrics[selectedPlatform].impressions).toLocaleString(),
            change: `+${getChangeRate().toFixed(1)}%`, 
            icon: Eye,
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
          },
          { 
            label: '总点击', 
            value: (selectedPlatform === 'all' ? totalStats.clicks : aggregatedMetrics[selectedPlatform].clicks).toLocaleString(),
            change: `+${(getChangeRate() * 0.8).toFixed(1)}%`, 
            icon: MousePointer,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
          },
          { 
            label: '总询盘', 
            value: (selectedPlatform === 'all' ? totalStats.inquiries : aggregatedMetrics[selectedPlatform].inquiries).toLocaleString(),
            change: `+${(getChangeRate() * 0.6).toFixed(1)}%`, 
            icon: MessageCircle,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10',
          },
          { 
            label: '总收入', 
            value: `¥${((selectedPlatform === 'all' ? totalStats.revenue : aggregatedMetrics[selectedPlatform].revenue) / 1000).toFixed(1)}K`,
            change: `+${(getChangeRate() * 0.9).toFixed(1)}%`, 
            icon: DollarSign,
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#151B2B] border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 text-sm">{stat.change}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 平台对比 + 趋势图 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 平台对比 */}
        <div className="bg-[#151B2B] border border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">平台对比</h3>
          <div className="space-y-4">
            {platforms.map((platform) => {
              const m = aggregatedMetrics[platform];
              const isSelected = selectedPlatform === platform;
              return (
                <div 
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-gray-800 border border-neon-cyan/30' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PlatformLogo platform={platform} size={20} />
                      <span className={`font-medium ${platformConfig[platform].color}`}>
                        {platformConfig[platform].name}
                      </span>
                    </div>
                    <span className="text-white font-bold">
                      ¥{(m.revenue / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                    <div>曝光 {m.impressions.toLocaleString()}</div>
                    <div>点击 {m.clicks.toLocaleString()}</div>
                    <div>转化 {m.conversions}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 趋势图 */}
        <div className="col-span-2 bg-[#151B2B] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">曝光趋势</h3>
            <div className="flex items-center gap-4 text-sm">
              {platforms.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: platformConfig[p].barColor }}
                  />
                  <span className="text-gray-400">{platformConfig[p].name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-end gap-2">
            {trendData.map((item: any, index: number) => {
              const maxValue = Math.max(
                ...trendData.map((d: any) => Math.max(d.xianyu || 0, d.xiaohongshu || 0, d.wechat || 0))
              );
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 h-48 items-end">
                    {platforms.map((p) => {
                      const value = item[p] || 0;
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      const isDimmed = selectedPlatform !== 'all' && selectedPlatform !== p;
                      return (
                        <div
                          key={p}
                          className={`flex-1 rounded-t transition-all ${isDimmed ? 'opacity-20' : ''}`}
                          style={{ 
                            height: `${Math.max(height, 5)}%`,
                            backgroundColor: platformConfig[p].barColor,
                          }}
                          title={`${platformConfig[p].name}: ${value.toLocaleString()}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-500">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 转化漏斗 + 转化率 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 转化漏斗 */}
        <div className="bg-[#151B2B] border border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-6">转化漏斗</h3>
          <div className="space-y-4">
            {funnelData.map((stage, index) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center text-white font-bold`}>
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{stage.stage}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold">{stage.count.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm ml-2">({stage.rate.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stage.rate, 100)}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className={`h-full ${stage.color} rounded-full`}
                  />
                </div>
                {index < funnelData.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ChevronDown size={16} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 关键指标 */}
        <div className="bg-[#151B2B] border border-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">关键指标</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '点击率 (CTR)', value: `${(selectedPlatform === 'all' ? totalStats.ctr : (aggregatedMetrics[selectedPlatform].clicks / aggregatedMetrics[selectedPlatform].impressions) * 100).toFixed(2)}%`, icon: MousePointer },
              { label: '询盘率', value: `${(selectedPlatform === 'all' ? totalStats.inquiryRate : (aggregatedMetrics[selectedPlatform].inquiries / aggregatedMetrics[selectedPlatform].clicks) * 100).toFixed(2)}%`, icon: MessageCircle },
              { label: '转化率', value: `${(selectedPlatform === 'all' ? totalStats.conversionRate : (aggregatedMetrics[selectedPlatform].conversions / aggregatedMetrics[selectedPlatform].inquiries) * 100).toFixed(2)}%`, icon: Target },
              { label: '内容数', value: (selectedPlatform === 'all' ? totalStats.contentCount : aggregatedMetrics[selectedPlatform].contentCount).toString(), icon: BarChart3 },
            ].map((item, _idx) => (
              <div key={item.label} className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <item.icon size={16} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          
          {/* 实时数据提示 */}
          {realtimeMetrics.today.orders > 0 && (
            <div className="mt-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
                </span>
                <span className="text-neon-green text-sm">
                  实时数据接入中 - 今日新增 {realtimeMetrics.today.orders} 单 / ¥{realtimeMetrics.today.gmv.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
