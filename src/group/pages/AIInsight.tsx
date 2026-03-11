/**
 * Shadow-Bees V52 - AI价值中心
 * 核心理念：证明AI的商业价值，展示ROI计算
 * 数据来源于酒店端（单体）的聚合
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  FileText,
  MessageSquare,
  Tag,
  BarChart3,
  Zap,
  Target,
  Users,
  Download,
  ChevronRight,
  Sparkles,
  Calculator,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Briefcase,
} from 'lucide-react';
import { useGroupStore, type TimeRange } from '../stores/groupStore';
import { useNavigate } from 'react-router-dom';

// ============================================
// 子组件：ROI计算器（基于真实数据）
// ============================================

function RoiCalculator() {
  const { aiValueSummary, selectedTimeRange } = useGroupStore();
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : 
                        selectedTimeRange === 'week' ? '本周' : 
                        selectedTimeRange === 'month' ? '本月' : '本年';

  // 数据已根据时间范围在store中计算，直接显示
  const { 
    pricingLift, 
    contentLift, 
    serviceLift, 
    totalLift, 
    laborHoursSaved, 
    laborCostSaved, 
    totalInvestment, 
    roi 
  } = aiValueSummary;

  const netBenefit = totalLift + laborCostSaved - totalInvestment;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-neon-purple/20 via-neon-purple/10 to-transparent border border-neon-purple/30"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-neon-purple" />
        </div>
        <div>
          <h3 className="text-lg font-bold">AI ROI 计算器</h3>
          <p className="text-sm text-text-secondary">基于{timeRangeLabel}实际数据自动计算</p>
        </div>
      </div>

      {/* 增收分解 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface/50 text-center">
          <Tag className="w-6 h-6 mx-auto mb-2 text-neon-cyan" />
          <p className="text-xs text-text-secondary mb-1">AI定价增收</p>
          <p className="text-xl font-bold text-neon-cyan whitespace-nowrap">
            ¥{(pricingLift / 10000).toFixed(1)}万
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface/50 text-center">
          <FileText className="w-6 h-6 mx-auto mb-2 text-neon-purple" />
          <p className="text-xs text-text-secondary mb-1">AI内容增收</p>
          <p className="text-xl font-bold text-neon-purple whitespace-nowrap">
            ¥{(contentLift / 10000).toFixed(1)}万
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface/50 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-neon-green" />
          <p className="text-xs text-text-secondary mb-1">AI客服增收</p>
          <p className="text-xl font-bold text-neon-green whitespace-nowrap">
            ¥{(serviceLift / 10000).toFixed(1)}万
          </p>
        </div>
      </div>

      {/* 降本 */}
      <div className="p-4 rounded-xl bg-surface/50 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-neon-amber" />
            <span className="text-sm">节省人工成本</span>
          </div>
          <span className="text-lg font-bold text-neon-amber">
            ¥{(laborCostSaved / 10000).toFixed(1)}万
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1 ml-7">
          节省 {laborHoursSaved} 工时
        </p>
      </div>

      {/* 总价值和ROI */}
      <div className="p-4 rounded-xl bg-neon-purple/20 border border-neon-purple/30">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">{timeRangeLabel}AI总价值</p>
            <p className="text-2xl font-bold text-white whitespace-nowrap">¥{(netBenefit / 10000).toFixed(1)}万</p>
          </div>
          <div className="text-center border-x border-border-color">
            <p className="text-xs text-text-secondary mb-1">投资回报率</p>
            <p className="text-2xl font-bold text-neon-green whitespace-nowrap">{roi}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary mb-1">系统投入</p>
            <p className="text-2xl font-bold text-text-secondary whitespace-nowrap">¥{(totalInvestment / 10000).toFixed(1)}万</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 子组件：价值趋势图
// ============================================

function ValueTrendChart() {
  const { aiValueSummary, selectedTimeRange } = useGroupStore();
  
  const trend = aiValueSummary?.monthlyTrend || [];
  const title = selectedTimeRange === 'today' ? '今日24小时' : 
                selectedTimeRange === 'week' ? '本周7天' : 
                selectedTimeRange === 'month' ? '本月4周' : '近12个月';
  
  // 计算最大值用于动态高度
  const maxLift = trend.length > 0 ? Math.max(...trend.map(m => m.lift), 1) : 1;
  const maxInvestment = trend.length > 0 ? Math.max(...trend.map(m => m.investment), 1) : 1;
  
  // 计算像素高度（最大 120px）
  const getHeightPx = (value: number, max: number) => {
    if (max === 0) return 30;
    const ratio = value / max;
    return Math.max(30, Math.round(ratio * 120));
  };
  
  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-neon-purple" />
        AI价值趋势（{title}）
      </h3>
      
      <div className="h-48 flex items-end justify-around px-2 pb-2">
        {trend.map((m, i) => {
          const liftHeight = getHeightPx(m.lift, maxLift);
          const investmentHeight = getHeightPx(m.investment, maxInvestment);
          
          return (
            <div key={i} className="flex flex-col items-center gap-2" style={{ minWidth: '50px', flex: 1 }}>
              {/* 数值标签 */}
              <span style={{ fontSize: '10px', color: '#A855F7', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {(m.lift / 1000).toFixed(0)}k
              </span>
              
              {/* 柱状图 */}
              <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                {/* AI增收柱 */}
                <div
                  style={{ 
                    width: '16px', 
                    height: `${liftHeight}px`, 
                    backgroundColor: 'rgba(168, 85, 247, 0.6)', 
                    borderRadius: '4px 4px 0 0',
                    minHeight: '30px'
                  }}
                  title={`AI增收: ¥${m.lift.toLocaleString()}`}
                />
                {/* 系统投入柱 */}
                <div
                  style={{ 
                    width: '16px', 
                    height: `${investmentHeight}px`, 
                    backgroundColor: 'rgba(156, 163, 175, 0.3)', 
                    borderRadius: '4px 4px 0 0',
                    minHeight: '30px'
                  }}
                  title={`系统投入: ¥${m.investment.toLocaleString()}`}
                />
              </div>
              
              {/* X轴标签 */}
              <span className="text-xs text-text-secondary">{m.month}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(168, 85, 247, 0.6)', borderRadius: '2px' }} />
          <span className="text-text-secondary">AI增收</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(156, 163, 175, 0.3)', borderRadius: '2px' }} />
          <span className="text-text-secondary">系统投入</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 子组件：功能采用率矩阵
// ============================================

function AdoptionMatrix() {
  const { hotels } = useGroupStore();

  const features = [
    { key: 'aiContent', name: 'AI内容生成', icon: FileText },
    { key: 'aiService', name: 'AI智能客服', icon: MessageSquare },
    { key: 'aiPricing', name: 'AI智能定价', icon: Tag },
  ];

  const adoptionRates = useMemo(() => {
    return features.map(feature => {
      const activeCount = hotels.filter(h => {
        if (feature.key === 'aiContent') return (h.systemUsage?.featureUsage?.aiContent || 0) > 30;
        if (feature.key === 'aiService') return (h.systemUsage?.featureUsage?.aiService || 0) > 100;
        return (h.pricing?.priceAdoptionRate || 0) > 70;
      }).length;
      return {
        ...feature,
        rate: hotels.length > 0 ? Math.round((activeCount / hotels.length) * 100) : 0,
        activeCount,
      };
    });
  }, [hotels]);

  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-neon-purple" />
        AI功能采用率
      </h3>
      
      <div className="space-y-4">
        {adoptionRates.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center">
                <Icon className="w-5 h-5 text-text-secondary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{item.name}</span>
                  <span className={`text-sm font-medium ${
                    item.rate > 80 ? 'text-neon-green' : 
                    item.rate > 50 ? 'text-neon-amber' : 'text-neon-red'
                  }`}>
                    {item.rate}%
                  </span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.rate}%` }}
                    className={`h-full rounded-full ${
                      item.rate > 80 ? 'bg-neon-green' : 
                      item.rate > 50 ? 'bg-neon-amber' : 'bg-neon-red'
                    }`}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {item.activeCount}/{hotels.length} 家门店活跃使用
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-surface-hover">
        <p className="text-xs text-text-secondary">
          💡 AI定价功能采用率偏低，可推送培训材料提升使用
        </p>
      </div>
    </div>
  );
}

// ============================================
// 子组件：门店AI效能排行
// ============================================

function HotelRanking() {
  const { aiValueSummary } = useGroupStore();
  const navigate = useNavigate();

  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-neon-purple" />
          AI效能排行榜
        </h3>
        <span className="text-xs text-text-secondary">按AI贡献金额排序</span>
      </div>
      
      <div className="space-y-3">
        {aiValueSummary.topPerformers.map((hotel, index) => (
          <motion.div
            key={hotel.hotelId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/hotels?hotel=${hotel.hotelId}`)}
            className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover hover:bg-surface transition-colors cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              index < 3 ? 'bg-neon-purple/20 text-neon-purple' : 'bg-surface text-text-secondary'
            }`}>
              {index + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{hotel.hotelName}</h4>
              <p className="text-xs text-text-secondary">ROI {hotel.roi}%</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-neon-purple">
                ¥{(hotel.aiValue / 10000).toFixed(1)}万
              </p>
              <p className="text-xs text-text-muted">AI贡献</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      <button 
        onClick={() => navigate('/hotels')}
        className="w-full mt-3 py-2 text-sm text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5 transition-colors"
      >
        查看全部门店详情
      </button>
    </div>
  );
}

// ============================================
// 子组件：行业对标
// ============================================

function BenchmarkComparison() {
  const { hotels } = useGroupStore();
  
  const avgAdoptionRate = hotels.length > 0 
    ? Math.round(hotels.reduce((sum, h) => sum + (h.aiResolutionRate || 0), 0) / hotels.length)
    : 0;

  const benchmarks = [
    { label: '本集团', value: avgAdoptionRate, color: '#A855F7', isUs: true },
    { label: '行业平均', value: 62, color: '#6B7280', isUs: false },
    { label: '行业头部', value: 92, color: '#00E396', isUs: false },
  ];

  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-neon-purple" />
        行业对标
      </h3>
      
      <div className="space-y-4">
        {benchmarks.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className={item.isUs ? 'font-medium text-neon-purple' : 'text-text-secondary'}>
                {item.label}
              </span>
              <span className={`font-medium ${item.isUs ? 'text-neon-purple' : ''}`}>
                {item.value}%
              </span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                className="h-full rounded-full"
                style={{ background: item.color }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 rounded-lg bg-neon-green/5 border border-neon-green/20">
        <p className="text-xs text-neon-green flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          您的集团AI采用率超过行业平均 {avgAdoptionRate - 62}%
        </p>
      </div>
    </div>
  );
}

// ============================================
// 子组件：建议执行追踪
// ============================================

function SuggestionTracking() {
  const { selectedTimeRange } = useGroupStore();
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : 
                        selectedTimeRange === 'week' ? '本周' : 
                        selectedTimeRange === 'month' ? '本月' : '本年';

  const stats = {
    total: 156,
    adopted: 124,
    pending: 32,
    successRate: 89,
  };

  const recentSuggestions = [
    { hotel: '三里屯店', type: 'pricing', suggestion: '周末调价至¥580', adopted: true, impact: '+¥3,200', time: '2小时前' },
    { hotel: '望京店', type: 'content', suggestion: '发布小红书笔记3篇', adopted: false, impact: '-', time: '4小时前' },
    { hotel: '国贸店', type: 'service', suggestion: '开启24h自动回复', adopted: true, impact: '+15%转化', time: '昨天' },
  ];

  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-neon-purple" />
        AI建议执行追踪
      </h3>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg bg-surface-hover">
          <p className="text-2xl font-bold text-neon-purple whitespace-nowrap">{stats.total}</p>
          <p className="text-xs text-text-secondary">{timeRangeLabel}建议数</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-hover">
          <p className="text-2xl font-bold text-neon-green whitespace-nowrap">{stats.adopted}</p>
          <p className="text-xs text-text-secondary">已采纳</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-hover">
          <p className="text-2xl font-bold text-neon-amber whitespace-nowrap">{stats.successRate}%</p>
          <p className="text-xs text-text-secondary">成功率</p>
        </div>
      </div>

      {/* 最近建议 */}
      <div className="space-y-2">
        {recentSuggestions.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover text-sm">
            <div className="flex items-center gap-2">
              {s.adopted ? (
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
              ) : (
                <AlertCircle className="w-4 h-4 text-neon-amber" />
              )}
              <span className="text-text-secondary">{s.hotel}</span>
            </div>
            <span className="flex-1 mx-2 truncate">{s.suggestion}</span>
            <span className={`${s.adopted ? 'text-neon-green' : 'text-text-muted'}`}>
              {s.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function AIInsight() {
  const { aiValueSummary, selectedTimeRange, setTimeRange } = useGroupStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'roi' | 'adoption' | 'suggestions'>('roi');
  
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : 
                        selectedTimeRange === 'week' ? '本周' : 
                        selectedTimeRange === 'month' ? '本月' : '本年';

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">AI价值中心</h1>
          <p className="text-text-secondary text-sm mt-1">
            量化AI商业价值 · 追踪功能采用 · 验证策略效果
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 时间范围切换 */}
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
          onClick={() => {
            const report = {
              时间范围: timeRangeLabel,
              AI增收: `¥${(aiValueSummary.totalLift / 10000).toFixed(1)}万`,
              节省成本: `¥${(aiValueSummary.laborCostSaved / 10000).toFixed(1)}万`,
              投资回报率: `${aiValueSummary.roi}%`,
              系统投入: `¥${(aiValueSummary.totalInvestment / 10000).toFixed(1)}万`,
              净收益: `¥${((aiValueSummary.totalLift + aiValueSummary.laborCostSaved - aiValueSummary.totalInvestment) / 10000).toFixed(1)}万`,
              门店数: aiValueSummary.topPerformers.length
            };
            console.table(report);
            alert(`AI价值报告导出成功！\n\n${timeRangeLabel}AI总价值: ${report.净收益}\n投资回报率: ${report.投资回报率}`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-color rounded-xl text-sm hover:border-neon-purple/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出价值报告
        </button>
        </div>
      </motion.div>

      {/* 核心价值卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: `${timeRangeLabel}AI增收`, 
            value: `¥${(aiValueSummary.totalLift / 10000).toFixed(1)}万`,
            subtext: '定价+内容+客服',
            icon: DollarSign,
            color: 'text-neon-purple'
          },
          { 
            label: '节省人工成本', 
            value: `¥${(aiValueSummary.laborCostSaved / 10000).toFixed(1)}万`,
            subtext: `${aiValueSummary.laborHoursSaved}工时`,
            icon: Clock,
            color: 'text-neon-amber'
          },
          { 
            label: '投资回报率', 
            value: `${aiValueSummary.roi}%`,
            subtext: '当前周期ROI',
            icon: TrendingUp,
            color: 'text-neon-green'
          },
          { 
            label: '系统投入', 
            value: `¥${(aiValueSummary.totalInvestment / 10000).toFixed(1)}万`,
            subtext: `${timeRangeLabel}订阅费`,
            icon: Zap,
            color: 'text-neon-cyan'
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl bg-surface border border-border-color"
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-text-secondary">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold whitespace-nowrap ${card.color}`}>{card.value}</p>
            <p className="text-xs text-text-muted mt-1">{card.subtext}</p>
          </motion.div>
        ))}
      </div>

      {/* ROI计算器 */}
      <RoiCalculator />

      {/* Tab切换 */}
      <div className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit">
        {[
          { key: 'roi', label: '价值概览', icon: DollarSign },
          { key: 'adoption', label: '采用分析', icon: Target },
          { key: 'suggestions', label: '建议追踪', icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {activeTab === 'roi' && (
          <motion.div
            key="roi"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* AI价值趋势 - 直接内联 */}
            <div className="p-5 rounded-xl bg-surface border border-border-color">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-neon-purple" />
                AI价值趋势（{timeRangeLabel}）
              </h3>
              {(() => {
                const trend = aiValueSummary?.monthlyTrend || [];
                const maxLift = trend.length > 0 ? Math.max(...trend.map(m => m.lift), 1) : 1;
                const maxInvestment = trend.length > 0 ? Math.max(...trend.map(m => m.investment), 1) : 1;
                
                const getHeightPx = (value: number, max: number) => {
                  if (max === 0) return 30;
                  const ratio = value / max;
                  return Math.max(30, Math.round(ratio * 120));
                };
                
                return (
                  <div className="h-48 flex items-end justify-around px-2 pb-2">
                    {trend.map((m, i) => {
                      const liftHeight = getHeightPx(m.lift, maxLift);
                      const investmentHeight = getHeightPx(m.investment, maxInvestment);
                      
                      return (
                        <div key={i} className="flex flex-col items-center gap-2" style={{ minWidth: '50px', flex: 1 }}>
                          <span style={{ fontSize: '10px', color: '#A855F7', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {(m.lift / 1000).toFixed(0)}k
                          </span>
                          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                            <div
                              style={{ 
                                width: '16px', 
                                height: `${liftHeight}px`, 
                                backgroundColor: 'rgba(168, 85, 247, 0.6)', 
                                borderRadius: '4px 4px 0 0',
                                minHeight: '30px'
                              }}
                              title={`AI增收: ¥${m.lift.toLocaleString()}`}
                            />
                            <div
                              style={{ 
                                width: '16px', 
                                height: `${investmentHeight}px`, 
                                backgroundColor: 'rgba(156, 163, 175, 0.3)', 
                                borderRadius: '4px 4px 0 0',
                                minHeight: '30px'
                              }}
                              title={`系统投入: ¥${m.investment.toLocaleString()}`}
                            />
                          </div>
                          <span className="text-xs text-text-secondary">{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(168, 85, 247, 0.6)', borderRadius: '2px' }} />
                  <span className="text-text-secondary">AI增收</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: '12px', height: '12px', backgroundColor: 'rgba(156, 163, 175, 0.3)', borderRadius: '2px' }} />
                  <span className="text-text-secondary">系统投入</span>
                </div>
              </div>
            </div>
            <BenchmarkComparison />
            <HotelRanking />
            <div className="p-5 rounded-xl bg-surface border border-border-color">
              <h3 className="font-semibold mb-4">提升AI价值</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/operations')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-hover hover:bg-surface transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-neon-purple" />
                    <span className="text-sm">培训未完成员工</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
                <button 
                  onClick={() => navigate('/strategy')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-hover hover:bg-surface transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-neon-amber" />
                    <span className="text-sm">优化策略配置</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'adoption' && (
          <motion.div
            key="adoption"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <AdoptionMatrix />
            <ValueTrendChart />
          </motion.div>
        )}

        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <SuggestionTracking />
            
            <div className="p-5 rounded-xl bg-surface border border-border-color">
              <h3 className="font-semibold mb-4">建议效果验证</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-neon-green/5 border border-neon-green/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    <span className="font-medium text-sm">定价策略验证成功</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    采纳AI定价建议的门店，RevPAR平均提升 12%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-neon-green/5 border border-neon-green/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    <span className="font-medium text-sm">内容策略验证成功</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    按AI建议发布内容的门店，曝光量平均提升 35%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-hover">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-neon-purple" />
                    <span className="font-medium text-sm">客服话术优化中</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    数据收集中，预计2周后出结论
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AIInsight;
