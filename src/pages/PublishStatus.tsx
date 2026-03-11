import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, MousePointer, MessageCircle, ShoppingCart, PlusCircle, Activity, RefreshCw, Calendar } from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { platformLogos, formatPrice } from '@/utils/helpers';

// 时间范围选项
const timeRangeOptions = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义' },
];

export default function PublishStatus() {
  const { contents, transactions, currentRoomType } = useUnifiedStore();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'new' | 'active' | 'retention'>('active');
  
  // 页面内时间范围状态（自定义默认最近7天，结束日期不能超过今天）
  const [timeRange, setTimeRange] = useState<string>('today');
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ 
    start: weekAgoStr, 
    end: todayStr 
  });
  
  // 计算日期范围
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week': {
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateRange.start) {
          start.setTime(new Date(customDateRange.start).getTime());
          start.setHours(0, 0, 0, 0);
        }
        if (customDateRange.end) {
          end.setTime(new Date(customDateRange.end).getTime());
          end.setHours(23, 59, 59, 999);
        }
        break;
    }
    
    return { start, end };
  }, [timeRange, customDateRange]);
  
  // 过滤时间范围内的内容（已发布的）
  const filteredContents = useMemo(() => {
    return contents.filter(c => {
      const contentDate = new Date(c.publishedAt || c.createdAt);
      return contentDate >= dateRange.start && contentDate <= dateRange.end;
    });
  }, [contents, dateRange]);
  
  // 过滤时间范围内的交易
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate >= dateRange.start && txnDate <= dateRange.end;
    });
  }, [transactions, dateRange]);
  
  // ========== 维度1：今日/本周/本月新增（按发布时间过滤）==========
  const newContentsStats = useMemo(() => {
    const stats: Record<string, { published: number; running: number; deals: number; gmv: number }> = {
      xianyu: { published: 0, running: 0, deals: 0, gmv: 0 },
      xiaohongshu: { published: 0, running: 0, deals: 0, gmv: 0 },
    };
    
    // 统计时间范围内新发布的内容
    filteredContents.forEach(content => {
      if (stats[content.platform]) {
        stats[content.platform].published++;
        if (content.status === 'published') {
          stats[content.platform].running++;
        }
      }
    });
    
    // 统计该时间范围内所有交易的成交（不限于来源内容）
    filteredTransactions.forEach(txn => {
      if (stats[txn.platform]) {
        stats[txn.platform].deals++;
        stats[txn.platform].gmv += txn.price;
      }
    });
    
    return stats;
  }, [filteredContents, filteredTransactions]);

  // ========== 维度2：活跃内容（今日=当前published，本周本月=有成交的内容）==========
  const activeContentsStats = useMemo(() => {
    const stats: Record<string, { active: number; deals: number; gmv: number; totalContents: number }> = {
      xianyu: { active: 0, deals: 0, gmv: 0, totalContents: 0 },
      xiaohongshu: { active: 0, deals: 0, gmv: 0, totalContents: 0 },
    };
    
    let activeContents: typeof contents;
    
    if (timeRange === 'today') {
      // 今日：实时运营视角，看当前在跑的内容
      activeContents = contents.filter(c => c.status === 'published');
    } else {
      // 本周/本月：复盘视角，看产生过实际成交的内容
      const contentIdsWithDeals = new Set(
        filteredTransactions.map(t => t.sourceContentId).filter(Boolean)
      );
      activeContents = contents.filter(c => contentIdsWithDeals.has(c.id));
    }
    
    activeContents.forEach(content => {
      if (stats[content.platform]) {
        stats[content.platform].active++;
      }
    });
    
    // 统计总内容数（包含非活跃的，用于参考）
    contents.forEach(content => {
      if (stats[content.platform]) {
        stats[content.platform].totalContents++;
      }
    });
    
    // 统计这些活跃内容的成交
    const activeContentIds = new Set(activeContents.map(c => c.id));
    filteredTransactions.forEach(txn => {
      if (stats[txn.platform] && txn.sourceContentId && activeContentIds.has(txn.sourceContentId)) {
        stats[txn.platform].deals++;
        stats[txn.platform].gmv += txn.price;
      }
    });
    
    return stats;
  }, [contents, filteredTransactions, timeRange]);

  // ========== 维度3：内容留存（仅本周/本月）==========
  const retentionStats = useMemo(() => {
    // 只计算本周/本月
    if (timeRange === 'today') return null;
    
    const stats: Record<string, { 
      prevPeriodContents: number;  // 上周期发布的内容数
      retainedContents: number;    // 本周期仍有成交的
      retentionRate: number;       // 留存率
      retainedGMV: number;         // 留存内容贡献的GMV
    }> = {
      xianyu: { prevPeriodContents: 0, retainedContents: 0, retentionRate: 0, retainedGMV: 0 },
      xiaohongshu: { prevPeriodContents: 0, retainedContents: 0, retentionRate: 0, retainedGMV: 0 },
    };
    
    // 计算上周期的时间范围
    const prevStart = new Date(dateRange.start);
    const prevEnd = new Date(dateRange.end);
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    prevStart.setDate(prevStart.getDate() - daysDiff);
    prevEnd.setDate(prevEnd.getDate() - daysDiff);
    
    // 找出上周期发布的内容
    const prevPeriodContents = contents.filter(c => {
      const contentDate = new Date(c.publishedAt || c.createdAt);
      return contentDate >= prevStart && contentDate <= prevEnd;
    });
    
    // 统计上周期各平台内容数
    prevPeriodContents.forEach(content => {
      if (stats[content.platform]) {
        stats[content.platform].prevPeriodContents++;
      }
    });
    
    // 检查这些内容在本周期是否有成交
    const prevContentIds = new Set(prevPeriodContents.map(c => c.id));
    
    filteredTransactions.forEach(txn => {
      if (txn.sourceContentId && prevContentIds.has(txn.sourceContentId)) {
        const platform = txn.platform;
        if (stats[platform]) {
          // 避免重复计数同一内容（但允许累加GMV）
          stats[platform].retainedGMV += txn.price;
        }
      }
    });
    
    // 统计有成交的留存内容数（需要去重）
    const retainedContentIds = new Set(
      filteredTransactions
        .filter(t => t.sourceContentId && prevContentIds.has(t.sourceContentId))
        .map(t => t.sourceContentId)
    );
    
    retainedContentIds.forEach(id => {
      const content = contents.find(c => c.id === id);
      if (content && stats[content.platform]) {
        stats[content.platform].retainedContents++;
      }
    });
    
    // 计算留存率
    Object.keys(stats).forEach(platform => {
      const s = stats[platform];
      s.retentionRate = s.prevPeriodContents > 0 
        ? Math.round((s.retainedContents / s.prevPeriodContents) * 100)
        : 0;
    });
    
    return stats;
  }, [contents, filteredTransactions, dateRange, timeRange]);
  
  // 格式化日期显示
  const formatDateRange = () => {
    if (timeRange === 'today') {
      return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    }
    const startStr = dateRange.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const endStr = dateRange.end.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };
  
  // 根据视图模式获取内容列表
  const displayContents = useMemo(() => {
    if (viewMode === 'new') {
      // 新增：按发布时间过滤
      return filteredContents;
    } else if (viewMode === 'active') {
      if (timeRange === 'today') {
        // 今日：实时运营视角，看当前在跑的内容
        return contents.filter(c => c.status === 'published');
      } else {
        // 本周/本月：复盘视角，看产生过实际成交的内容
        const contentIdsWithDeals = new Set(
          filteredTransactions.map(t => t.sourceContentId).filter(Boolean)
        );
        return contents.filter(c => contentIdsWithDeals.has(c.id));
      }
    } else if (viewMode === 'retention' && timeRange !== 'today') {
      // 内容留存：上周期发布，本周期有成交的内容
      const prevStart = new Date(dateRange.start);
      const prevEnd = new Date(dateRange.end);
      const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      prevStart.setDate(prevStart.getDate() - daysDiff);
      prevEnd.setDate(prevEnd.getDate() - daysDiff);
      
      // 上周期发布的内容
      const prevPeriodContents = contents.filter(c => {
        const contentDate = new Date(c.publishedAt || c.createdAt);
        return contentDate >= prevStart && contentDate <= prevEnd;
      });
      
      // 本周期有成交的内容
      const contentIdsWithDeals = new Set(
        filteredTransactions.map(t => t.sourceContentId).filter(Boolean)
      );
      
      // 交集：上周期发布且本周期有成交
      return prevPeriodContents.filter(c => contentIdsWithDeals.has(c.id));
    }
    return [];
  }, [viewMode, filteredContents, contents, filteredTransactions, timeRange, dateRange]);

  // 平台筛选后的内容
  const platformFilteredContents = selectedPlatform
    ? displayContents.filter((c) => c.platform === selectedPlatform)
    : displayContents;

  // 计算漏斗数据（根据视图模式选择数据源）
  const funnelData = useMemo(() => {
    let sourceContents: typeof contents;
    
    if (viewMode === 'new') {
      sourceContents = filteredContents;
    } else if (viewMode === 'active') {
      if (timeRange === 'today') {
        sourceContents = contents.filter(c => c.status === 'published');
      } else {
        const contentIdsWithDeals = new Set(
          filteredTransactions.map(t => t.sourceContentId).filter(Boolean)
        );
        sourceContents = contents.filter(c => contentIdsWithDeals.has(c.id));
      }
    } else {
      sourceContents = displayContents;
    }
    
    const totalImpressions = sourceContents.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0);
    const totalClicks = sourceContents.reduce((sum, c) => sum + (c.performance?.clicks || 0), 0);
    const totalInquiries = sourceContents.reduce((sum, c) => sum + (c.performance?.inquiries || 0), 0);
    const totalConversions = filteredTransactions.length; // 用实际成交数
    
    return [
      { stage: '曝光', count: totalImpressions, rate: 100, color: '#07C160' },
      { stage: '点击', count: totalClicks, rate: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 100) : 0, color: '#A855F7' },
      { stage: '咨询', count: totalInquiries, rate: totalClicks > 0 ? Math.round((totalInquiries / totalClicks) * 100) : 0, color: '#FFB800' },
      { stage: '成交', count: totalConversions, rate: totalInquiries > 0 ? Math.round((totalConversions / totalInquiries) * 100) : 0, color: '#00E396' },
    ];
  }, [viewMode, filteredContents, contents, filteredTransactions, timeRange, displayContents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">发布状态</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-[#07C160]/10 text-[#07C160] border border-[#07C160]/30">
              {timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">{formatDateRange()}</p>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-2">
            {/* 时间范围选择 */}
            <div className="flex items-center gap-1 bg-bg-secondary rounded-xl p-1 border border-border-color">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTimeRange(option.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    timeRange === option.key
                      ? 'bg-neon-cyan/20 text-neon-cyan'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* 自定义日期选择器 - 放在下方（结束日期不能超过今天） */}
            {timeRange === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <div className="relative">
                  <input
                    type="date"
                    max={todayStr}
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-2 py-1 pr-8 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:outline-none focus:border-neon-cyan/50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-text-hint pointer-events-none" size={14} />
                </div>
                <span className="text-text-secondary text-xs">至</span>
                <div className="relative">
                  <input
                    type="date"
                    max={todayStr}
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-2 py-1 pr-8 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:outline-none focus:border-neon-cyan/50 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-text-hint pointer-events-none" size={14} />
                </div>
              </motion.div>
            )}
          </div>
        
          {/* 维度切换 */}
          <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-1 border border-border-color">
            <button
              onClick={() => setViewMode('new')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === 'new'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <PlusCircle size={14} />
              <span>{timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}新增</span>
            </button>
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewMode === 'active'
                  ? timeRange === 'today' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-amber/20 text-neon-amber'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Activity size={14} />
              <span>{timeRange === 'today' ? '活跃中' : `${timeRangeOptions.find(o => o.key === timeRange)?.label || ''}有成交`}</span>
            </button>
            {timeRange !== 'today' && (
              <button
                onClick={() => setViewMode('retention')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'retention'
                    ? 'bg-neon-purple/20 text-neon-purple'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <RefreshCw size={14} />
                <span>内容留存</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 平台分布统计 - 根据维度切换显示不同数据 */}
      <div className="grid grid-cols-3 gap-6">
        {viewMode === 'new' 
          ? Object.entries(newContentsStats).map(([platform, stats]) => {
              const info = platformLogos[platform];
              return (
                <div
                  key={platform}
                  onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                  className={`bg-bg-secondary rounded-xl border p-6 cursor-pointer transition-all ${
                    selectedPlatform === platform ? 'border-opacity-100' : 'border-border-color hover:border-opacity-50'
                  }`}
                  style={{ borderColor: selectedPlatform === platform ? info.color : undefined }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={info.logo}
                      alt={info.name}
                      className="w-12 h-12 rounded-xl object-contain"
                    />
                    <div>
                      <div className="font-semibold" style={{ color: info.color }}>{info.name}</div>
                      <div className="text-xs text-text-secondary">新增内容成交 {stats.deals}单</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-bg-tertiary rounded p-2">
                      <div className="text-neon-cyan font-mono">{stats.published}</div>
                      <div className="text-xs text-text-secondary">新增发布</div>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                      <div className="text-neon-green font-mono">{stats.running}</div>
                      <div className="text-xs text-text-secondary">运行中</div>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                      <div className="text-neon-amber font-mono">{stats.deals}</div>
                      <div className="text-xs text-text-secondary">成交</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border-color">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">GMV</span>
                      <span className="text-xl font-mono" style={{ color: info.color }}>
                        {formatPrice(stats.gmv)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          : viewMode === 'active'
            ? Object.entries(activeContentsStats).map(([platform, stats]) => {
                const info = platformLogos[platform];
                return (
                  <div
                    key={platform}
                    onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                    className={`bg-bg-secondary rounded-xl border p-6 cursor-pointer transition-all ${
                      selectedPlatform === platform ? 'border-opacity-100' : 'border-border-color hover:border-opacity-50'
                    }`}
                    style={{ borderColor: selectedPlatform === platform ? info.color : undefined }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img 
                        src={info.logo}
                        alt={info.name}
                        className="w-12 h-12 rounded-xl object-contain"
                      />
                      <div>
                        <div className="font-semibold" style={{ color: info.color }}>{info.name}</div>
                        <div className="text-xs text-text-secondary">
                          {timeRange === 'today' 
                            ? `活跃 ${stats.active}/${stats.totalContents} 条`
                            : `${timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}有成交 ${stats.active} 条`}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className={`rounded p-2 border ${timeRange === 'today' ? 'bg-neon-green/10 border-neon-green/30' : 'bg-neon-amber/10 border-neon-amber/30'}`}>
                        <div className={timeRange === 'today' ? 'text-neon-green' : 'text-neon-amber'}>{stats.active}</div>
                        <div className="text-xs text-text-secondary">{timeRange === 'today' ? '活跃中' : '有成交'}</div>
                      </div>
                      <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-neon-amber font-mono">{stats.deals}</div>
                        <div className="text-xs text-text-secondary">{timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}成交</div>
                      </div>
                      <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-neon-cyan font-mono">
                          {stats.active > 0 ? ((stats.deals / stats.active) * 100).toFixed(1) : '0'}%
                        </div>
                        <div className="text-xs text-text-secondary">转化</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-color">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">{timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}GMV</span>
                        <span className="text-xl font-mono" style={{ color: info.color }}>
                          {formatPrice(stats.gmv)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            : // 内容留存视图
              retentionStats && Object.entries(retentionStats).map(([platform, stats]) => {
                const info = platformLogos[platform];
                return (
                  <div
                    key={platform}
                    onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                    className={`bg-bg-secondary rounded-xl border p-6 cursor-pointer transition-all ${
                      selectedPlatform === platform ? 'border-opacity-100' : 'border-border-color hover:border-opacity-50'
                    }`}
                    style={{ borderColor: selectedPlatform === platform ? info.color : undefined }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img 
                        src={info.logo}
                        alt={info.name}
                        className="w-12 h-12 rounded-xl object-contain"
                      />
                      <div>
                        <div className="font-semibold" style={{ color: info.color }}>{info.name}</div>
                        <div className="text-xs text-text-secondary">上周期发布的内容</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-neon-cyan font-mono">{stats.prevPeriodContents}</div>
                        <div className="text-xs text-text-secondary">上周期发布</div>
                      </div>
                      <div className="bg-neon-purple/10 rounded p-2 border border-neon-purple/30">
                        <div className="text-neon-purple font-mono">{stats.retainedContents}</div>
                        <div className="text-xs text-text-secondary">本周期仍成交</div>
                      </div>
                      <div className="bg-bg-tertiary rounded p-2">
                        <div className="text-neon-green font-mono">{stats.retentionRate}%</div>
                        <div className="text-xs text-text-secondary">留存率</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-color">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">留存内容贡献GMV</span>
                        <span className="text-xl font-mono" style={{ color: info.color }}>
                          {formatPrice(stats.retainedGMV)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 内容明细列表 */}
        <div className="col-span-8 bg-bg-secondary rounded-xl border border-border-color p-6">
          <h2 className="text-lg font-semibold mb-4">
            内容明细
            <span className="text-xs text-text-secondary font-normal ml-2">
              {viewMode === 'new' 
                ? `${timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}新增的内容`
                : viewMode === 'active'
                  ? timeRange === 'today'
                    ? '当前活跃中的内容'
                    : `${timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}有成交的内容`
                  : '上周期发布且本周期仍有成交的内容'}
            </span>
          </h2>
          {platformFilteredContents.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-lg mb-2">
                {viewMode === 'retention' ? '暂无留存内容' : '暂无发布内容'}
              </div>
              <div className="text-sm">
                {viewMode === 'retention'
                  ? '上周期发布的内容在本周期暂无成交，建议优化内容或调整投放策略'
                  : '去「内容工厂」创建并发布内容后，这里会显示实时数据'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {platformFilteredContents.map((content) => {
                const info = platformLogos[content.platform];
                // 实时统计该内容的实际成交数和GMV
                const contentDeals = transactions.filter(txn => txn.sourceContentId === content.id).length;
                const contentGMV = transactions
                  .filter(txn => txn.sourceContentId === content.id)
                  .reduce((sum, txn) => sum + txn.price, 0);
                const conversionRate = (content.performance?.clicks || 0) > 0
                  ? ((contentDeals / content.performance.clicks) * 100).toFixed(1)
                  : '0';

                return (
                  <div key={content.id} className="bg-bg-tertiary rounded-lg p-4 border border-border-color">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={info.logo}
                          alt={info.name}
                          className="w-10 h-10 rounded-lg object-contain"
                        />
                        <div>
                          <div className="font-medium text-sm">{content.title}</div>
                          <div className="text-xs text-text-secondary">{content.id} · {currentRoomType?.name || '标准房'}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        content.status === 'published' 
                          ? 'bg-neon-green/20 text-neon-green' 
                          : 'bg-neon-amber/20 text-neon-amber'
                      }`}>
                        {content.status === 'published' ? '运行中' : '审核中'}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-text-secondary mb-1">
                          <Eye size={14} />
                          曝光
                        </div>
                        <div className="font-mono">{content.performance?.impressions || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-text-secondary mb-1">
                          <MousePointer size={14} />
                          点击
                        </div>
                        <div className="font-mono">{content.performance?.clicks || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-text-secondary mb-1">
                          <MessageCircle size={14} />
                          咨询
                        </div>
                        <div className="font-mono">{content.performance?.inquiries || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-text-secondary mb-1">
                          <ShoppingCart size={14} />
                          成交
                        </div>
                        <div className="font-mono text-neon-green">{contentDeals}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-text-secondary mb-1">转化率</div>
                        <div className="font-mono">{conversionRate}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-text-secondary mb-1">成交GMV</div>
                        <div className="font-mono" style={{ color: info.color }}>
                          {formatPrice(contentGMV)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 漏斗可视化 */}
        <div className="col-span-4 bg-bg-secondary rounded-xl border border-border-color p-6">
          <h2 className="text-lg font-semibold mb-4">转化漏斗</h2>
          {displayContents.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              暂无数据<br/>发布内容后将显示转化漏斗
            </div>
          ) : (
            <div className="space-y-4">
              {funnelData.map((item, idx) => (
                <div key={item.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{item.stage}</span>
                    <span className="font-mono" style={{ color: item.color }}>
                      {item.count.toLocaleString()} ({item.rate}%)
                    </span>
                  </div>
                  <div className="h-8 bg-bg-tertiary rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.rate}%` }}
                      transition={{ delay: idx * 0.1, duration: 0.5 }}
                      className="h-full flex items-center justify-center text-xs font-medium"
                      style={{ background: item.color }}
                    >
                      {item.rate > 20 && `${item.rate}%`}
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border-color">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">成交订单</span>
              <span className="text-2xl font-mono text-neon-green">{filteredTransactions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">平均客单价</span>
              <span className="font-mono text-neon-cyan">
                {formatPrice(filteredTransactions.length > 0 
                  ? Math.round(filteredTransactions.reduce((sum: number, t: { price: number }) => sum + t.price, 0) / filteredTransactions.length)
                  : 0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
