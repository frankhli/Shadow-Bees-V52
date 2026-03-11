/**
 * SaaS运营后台 - 渠道对比
 * 渠道横向对比分析 - 支持时间范围切换
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Download,
  Minus,
  Calendar,
} from 'lucide-react';
import { useAdminStore, type Platform } from '../../stores/adminStore';
import { Button } from '../../components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlatformLogo } from '../../components/PlatformLogo';
import { useSearchParams } from 'react-router-dom';

const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];

// 时间范围配置
const timeRangeConfig = {
  today: { label: '今日', days: 1 },
  week: { label: '本周', days: 7 },
  month: { label: '本月', days: 30 },
  custom: { label: '自定义', days: 30 },
};

type TimeRange = keyof typeof timeRangeConfig;

const platformNames: Record<Platform, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
};

// 对比维度
const dimensions = [
  { id: 'exposure', name: '曝光能力', weight: 25 },
  { id: 'click', name: '点击转化', weight: 25 },
  { id: 'inquiry', name: '询盘质量', weight: 25 },
  { id: 'conversion', name: '成交转化', weight: 25 },
];

export default function ChannelComparePage() {
  const { contentItems, selectedTimeRange, setSelectedTimeRange } = useAdminStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['exposure', 'click', 'inquiry', 'conversion']);
  
  // 从URL或store获取时间范围
  const currentTimeRange = (searchParams.get('range') as TimeRange) || selectedTimeRange;

  // 从真实数据计算各渠道评分（按时间范围缩放）
  const scores = useMemo(() => {
    const stats = {
      xianyu: { impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
      xiaohongshu: { impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
      wechat: { impressions: 0, clicks: 0, inquiries: 0, conversions: 0 }
    };
    
    // 微信子类型统计
    const wechatSubtypeStats: Record<string, { count: number; impressions: number; clicks: number; inquiries: number; conversions: number }> = {
      moments: { count: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
      group: { count: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
      private: { count: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
      channels: { count: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0 },
    };

    // 根据时间范围计算缩放因子
    const getTimeScaleFactor = () => {
      switch (currentTimeRange) {
        case 'today': return 1 / 30;
        case 'week': return 7 / 30;
        case 'month': return 1;
        case 'custom': return 1;
        default: return 1;
      }
    };
    
    const scaleFactor = getTimeScaleFactor();

    // 汇总 contentItems 数据（按时间范围缩放）
    contentItems.forEach((item) => {
      if (item.stats && stats[item.platform]) {
        stats[item.platform].impressions += Math.round((item.stats.impressions || 0) * scaleFactor);
        stats[item.platform].clicks += Math.round((item.stats.clicks || 0) * scaleFactor);
        stats[item.platform].inquiries += Math.round((item.stats.inquiries || 0) * scaleFactor);
        stats[item.platform].conversions += Math.round((item.stats.conversions || 0) * scaleFactor);
      }
      
      // 统计微信子类型
      if (item.platform === 'wechat' && item.subtype) {
        const subtype = item.subtype;
        if (!wechatSubtypeStats[subtype]) {
          wechatSubtypeStats[subtype] = { count: 0, impressions: 0, clicks: 0, inquiries: 0, conversions: 0 };
        }
        wechatSubtypeStats[subtype].count += 1;
        wechatSubtypeStats[subtype].impressions += Math.round((item.stats?.impressions || 0) * scaleFactor);
        wechatSubtypeStats[subtype].clicks += Math.round((item.stats?.clicks || 0) * scaleFactor);
        wechatSubtypeStats[subtype].inquiries += Math.round((item.stats?.inquiries || 0) * scaleFactor);
        wechatSubtypeStats[subtype].conversions += Math.round((item.stats?.conversions || 0) * scaleFactor);
      }
    });

    // 计算最大值用于标准化
    const maxImpressions = Math.max(...Object.values(stats).map(s => s.impressions), 1);
    const maxClicks = Math.max(...Object.values(stats).map(s => s.clicks), 1);
    const maxInquiries = Math.max(...Object.values(stats).map(s => s.inquiries), 1);
    const maxConversions = Math.max(...Object.values(stats).map(s => s.conversions), 1);

    return {
      xianyu: { 
        exposure: Math.round((stats.xianyu.impressions / maxImpressions) * 100),
        click: Math.round((stats.xianyu.clicks / maxClicks) * 100),
        inquiry: Math.round((stats.xiaohongshu.inquiries / maxInquiries) * 100),
        conversion: Math.round((stats.xianyu.conversions / maxConversions) * 100),
      },
      xiaohongshu: { 
        exposure: Math.round((stats.xiaohongshu.impressions / maxImpressions) * 100),
        click: Math.round((stats.xiaohongshu.clicks / maxClicks) * 100),
        inquiry: Math.round((stats.xiaohongshu.inquiries / maxInquiries) * 100),
        conversion: Math.round((stats.xiaohongshu.conversions / maxConversions) * 100),
      },
      wechat: { 
        exposure: Math.round((stats.wechat.impressions / maxImpressions) * 100) || 10, // 私域默认给个基础分
        click: Math.round((stats.wechat.clicks / maxClicks) * 100) || 15,
        inquiry: Math.round((stats.wechat.inquiries / maxInquiries) * 100) || 20,
        conversion: Math.round((stats.wechat.conversions / maxConversions) * 100) || 30, // 私域转化率高
      },
      wechatSubtypes: wechatSubtypeStats,
    };
  }, [contentItems, currentTimeRange]);
  
  // 处理时间范围切换
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setSearchParams({ range });
  };

  // 计算综合得分
  const totalScores = useMemo(() => {
    return platforms.map(platform => {
      const platformScores = scores[platform];
      const total = selectedDimensions.reduce((sum, dim) => {
        const weight = dimensions.find(d => d.id === dim)?.weight || 25;
        return sum + (platformScores[dim as keyof typeof platformScores] * weight / 100);
      }, 0);
      return { platform, score: Math.round(total) };
    }).sort((a, b) => b.score - a.score);
  }, [scores, selectedDimensions]);

  // 雷达图数据点
  const radarPoints = useMemo(() => {
    const angleStep = (Math.PI * 2) / selectedDimensions.length;
    return platforms.map(platform => {
      const points = selectedDimensions.map((dim, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const score = scores[platform][dim as keyof typeof scores[typeof platform]];
        const radius = (score / 100) * 80;
        return {
          x: 100 + radius * Math.cos(angle),
          y: 100 + radius * Math.sin(angle),
        };
      });
      return { platform, points };
    });
  }, [scores, selectedDimensions]);

  // 处理导出 - 导出对比数据为 CSV
  const handleExport = () => {
    // 获取当前时间
    const now = new Date().toLocaleString('zh-CN');
    const timeRangeLabel = timeRangeConfig[currentTimeRange].label;
    
    // 构建 CSV 内容
    const rows: string[] = [];
    
    // 标题
    rows.push('渠道对比分析报告');
    rows.push(`生成时间,${now}`);
    rows.push(`时间范围,${timeRangeLabel}`);
    rows.push('');
    
    // 综合得分排名
    rows.push('综合得分排名');
    rows.push('排名,平台,综合得分');
    totalScores.forEach((item, index) => {
      rows.push(`${index + 1},${platformNames[item.platform]},${item.score}`);
    });
    rows.push('');
    
    // 维度评分对比
    rows.push('维度评分对比');
    const headerRow = ['维度', '权重', ...platforms.map(p => platformNames[p])].join(',');
    rows.push(headerRow);
    selectedDimensions.forEach((dimId) => {
      const dim = dimensions.find(d => d.id === dimId);
      if (dim) {
        const scoresRow = platforms.map(p => scores[p][dimId as keyof typeof scores[typeof p]]);
        rows.push([dim.name, `${dim.weight}%`, ...scoresRow].join(','));
      }
    });
    rows.push('');
    
    // 各维度详细得分
    rows.push('各平台详细得分');
    rows.push('平台,' + dimensions.filter(d => selectedDimensions.includes(d.id)).map(d => d.name).join(','));
    platforms.forEach((platform) => {
      const platformScoresList = dimensions
        .filter(d => selectedDimensions.includes(d.id))
        .map(d => scores[platform][d.id as keyof typeof scores[typeof platform]]);
      rows.push([platformNames[platform], ...platformScoresList].join(','));
    });
    
    // 转换为 CSV 格式
    const csvContent = '\uFEFF' + rows.join('\n');
    
    // 创建下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `渠道对比报告_${timeRangeLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">渠道对比</h1>
          <p className="text-gray-400 mt-1">多维度渠道横向对比分析 · {timeRangeConfig[currentTimeRange].label}</p>
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
          <Button variant="secondary" icon={<Download />} onClick={handleExport}>
            导出对比报告
          </Button>
        </div>
      </div>

      {/* 维度选择 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">对比维度:</span>
          {dimensions.map((dim) => (
            <button
              key={dim.id}
              onClick={() => {
                if (selectedDimensions.includes(dim.id)) {
                  if (selectedDimensions.length > 1) {
                    setSelectedDimensions(selectedDimensions.filter(d => d !== dim.id));
                  }
                } else {
                  setSelectedDimensions([...selectedDimensions, dim.id]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedDimensions.includes(dim.id)
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {dim.name}
            </button>
          ))}
        </div>
      </Card>

      {/* 综合得分排名 */}
      <div className="grid grid-cols-3 gap-4">
        {totalScores.map((item, index) => (
          <motion.div
            key={item.platform}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-5 ${index === 0 ? 'border-neon-cyan/30' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-neon-cyan text-black' : 'bg-gray-700 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <PlatformLogo platform={item.platform} size={28} />
                  <span className="text-lg font-semibold text-white">{platformNames[item.platform]}</span>
                </div>
                {index === 0 && <Badge variant="default">最优</Badge>}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{item.score}</span>
                <span className="text-gray-400 mb-1">/ 100</span>
              </div>
              <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className={`h-full rounded-full ${
                    item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 雷达图 + 详细对比 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 雷达图 */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">能力雷达图</h3>
          <div className="flex items-center justify-center">
            <svg width="240" height="240" viewBox="0 0 200 200">
              {/* 背景网格 */}
              {[20, 40, 60, 80, 100].map((level) => (
                <circle
                  key={level}
                  cx="100"
                  cy="100"
                  r={level * 0.8}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}
              {/* 轴线 */}
              {selectedDimensions.map((_, i) => {
                const angle = i * ((Math.PI * 2) / selectedDimensions.length) - Math.PI / 2;
                const x = 100 + 80 * Math.cos(angle);
                const y = 100 + 80 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2={x}
                    y2={y}
                    stroke="#374151"
                    strokeWidth="1"
                  />
                );
              })}
              {/* 维度标签 */}
              {selectedDimensions.map((dim, i) => {
                const angle = i * ((Math.PI * 2) / selectedDimensions.length) - Math.PI / 2;
                const x = 100 + 95 * Math.cos(angle);
                const y = 100 + 95 * Math.sin(angle);
                const dimName = dimensions.find(d => d.id === dim)?.name || dim;
                return (
                  <text
                    key={dim}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#9CA3AF"
                    fontSize="10"
                  >
                    {dimName}
                  </text>
                );
              })}
              {/* 数据区域 */}
              {radarPoints.map((item) => {
                const colors = {
                  xianyu: '#3B82F6',
                  xiaohongshu: '#EF4444',
                  wechat: '#07C160',
                };
                const pathData = item.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                return (
                  <path
                    key={item.platform}
                    d={pathData}
                    fill={colors[item.platform]}
                    fillOpacity="0.2"
                    stroke={colors[item.platform]}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            {platforms.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <PlatformLogo platform={p} size={16} />
                <span className="text-gray-400 text-sm">{platformNames[p]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 详细评分对比 */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">维度评分对比</h3>
          <div className="space-y-4">
            {selectedDimensions.map((dimId) => {
              const dim = dimensions.find(d => d.id === dimId);
              const platformScoresList = platforms.map(p => ({
                platform: p,
                score: scores[p][dimId as keyof typeof scores[typeof p]],
              })).sort((a, b) => b.score - a.score);
              const maxScore = platformScoresList[0]?.score || 0;
              
              return (
                <div key={dimId}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">{dim?.name}</span>
                    <span className="text-gray-400 text-sm">权重 {dim?.weight}%</span>
                  </div>
                  <div className="space-y-2">
                    {platformScoresList.map(({ platform, score }) => (
                      <div key={platform} className="flex items-center gap-3">
                        <PlatformLogo platform={platform} size={16} />
                        <div className="flex-1">
                          <div className="h-6 bg-gray-700 rounded-full overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full ${
                                score === maxScore ? 'bg-neon-cyan' : 'bg-gray-500'
                              }`}
                            />
                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs text-white">
                              {score}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 优劣势对比表 */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">渠道优劣势分析</h3>
        <div className="grid grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const platformScoresList = Object.entries(scores[platform as keyof typeof scores] || {}).filter(([k]) => k !== 'wechatSubtypes').map(([key, value]) => ({
              dim: dimensions.find(d => d.id === key)?.name || key,
              score: value as number,
            })).sort((a, b) => b.score - a.score);
            
            return (
              <div key={platform} className="border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <PlatformLogo platform={platform} size={24} />
                  <span className="text-lg font-semibold text-white">{platformNames[platform]}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                      <TrendingUp size={14} /> 优势
                    </span>
                    <p className="text-gray-300 text-sm mt-1">{platformScoresList[0]?.dim} ({platformScoresList[0]?.score}分)</p>
                    <p className="text-gray-300 text-sm">{platformScoresList[1]?.dim} ({platformScoresList[1]?.score}分)</p>
                  </div>
                  <div>
                    <span className="text-amber-400 text-sm font-medium flex items-center gap-1">
                      <Minus size={14} /> 待提升
                    </span>
                    <p className="text-gray-300 text-sm mt-1">{platformScoresList[platformScoresList.length - 1]?.dim}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 微信私域子类型分析 */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">微信私域运营分布</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: 'moments', label: '朋友圈', icon: '📱', color: 'bg-green-500/20 text-green-400' },
            { key: 'group', label: '微信群', icon: '👥', color: 'bg-blue-500/20 text-blue-400' },
            { key: 'private', label: '私聊', icon: '💬', color: 'bg-purple-500/20 text-purple-400' },
            { key: 'channels', label: '视频号', icon: '🎬', color: 'bg-orange-500/20 text-orange-400' },
          ].map((item) => {
            const subStats = (scores.wechatSubtypes as any)?.[item.key] || { count: 0, conversions: 0 };
            return (
              <div key={item.key} className="border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-gray-300 font-medium">{item.label}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">内容数</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${item.color}`}>{subStats.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">成交</span>
                    <span className="text-white">{subStats.conversions}</span>
                  </div>
                  {subStats.count > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">转化率</span>
                      <span className="text-emerald-400">
                        {((subStats.conversions / Math.max(subStats.count, 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
