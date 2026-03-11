/**
 * AI效果看板 - 企业版
 * 
 * 核心功能：
 * - AI增收统计（定价/内容/客服）
 * - AI采纳率分析
 * - 人效提升分析
 * - ROI计算
 * - 酒店AI排名
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Target,
  Sparkles,
  FileText,
  MessageSquare,
  Crown,
  Zap,
  RefreshCw,
  CheckCircle,
  Bot,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { generateHotelAIMetrics } from '../../api/mockData';
import { formatSmartAmount, type SmartFormatResult } from '../../utils/formatters';

// ============================================
// 类型定义
// ============================================

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface AIValueData {
  pricingLift: number;
  contentLift: number;
  serviceLift: number;
  totalLift: number;
  laborHoursSaved: number;
  laborCostSaved: number;
  roi: number;
}

interface HotelAIStats {
  id: string;
  name: string;
  city: string;
  aiAdoptionRate: number;
  contentCount: number;
  aiResolutionRate: number;
  pricingAdoptionRate: number;
  aiValue: AIValueData;
}

// ============================================
// 时间范围切换器
// ============================================

function TimeRangeSelector({ 
  value, 
  onChange 
}: { 
  value: TimeRange; 
  onChange: (range: TimeRange) => void;
}) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'year', label: '本年' },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            value === range.value
              ? 'bg-white text-violet-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// AI价值卡片组件
// ============================================

function AIValueCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  color,
  trend,
  smartFormat,
  delay = 0 
}: { 
  title: string;
  value?: string;
  subtext: string;
  icon: any;
  color: string;
  trend: number;
  smartFormat?: SmartFormatResult;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 8px 24px ${color}15` }}
      className="relative p-5 bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold mt-1 truncate" style={{ color }} title={smartFormat?.fullValue}>
            {smartFormat ? (
              <span className="flex items-baseline gap-0.5">
                <span>{smartFormat.prefix}{smartFormat.value}</span>
                {smartFormat.unit && <span className="text-sm text-gray-500">{smartFormat.unit}</span>}
              </span>
            ) : (
              value
            )}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{subtext}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// AI采纳率组件
// ============================================

function AIAdoptionCard({ title, rate, icon: Icon, color }: { 
  title: string;
  rate: number;
  icon: any;
  color: string;
}) {
  const getStatus = (r: number) => {
    if (r >= 80) return { label: '优秀', color: 'green' };
    if (r >= 60) return { label: '良好', color: 'amber' };
    return { label: '需提升', color: 'red' };
  };
  
  const status = getStatus(rate);
  
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${status.color}-50 text-${status.color}-600 flex-shrink-0`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${rate}%`, background: color }}
              />
            </div>
            <span className="text-sm font-bold flex-shrink-0" style={{ color }}>{rate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 人效提升组件
// ============================================

function EfficiencyCard({ 
  title, 
  saved, 
  unit, 
  icon: Icon,
  color,
  subtext
}: { 
  title: string;
  saved: number;
  unit: string;
  icon: any;
  color: string;
  subtext: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold text-gray-900">{saved}</span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{subtext}</p>
      </div>
    </div>
  );
}

// ============================================
// 酒店AI排名组件
// ============================================

function HotelAIRanking({ hotels, timeRange }: { hotels: HotelAIStats[]; timeRange: TimeRange }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'value' | 'adoption' | 'content'>('value');
  
  const sortedHotels = useMemo(() => {
    return [...hotels].sort((a, b) => {
      if (sortBy === 'value') return b.aiValue.totalLift - a.aiValue.totalLift;
      if (sortBy === 'adoption') return b.aiAdoptionRate - a.aiAdoptionRate;
      return b.contentCount - a.contentCount;
    });
  }, [hotels, sortBy]);
  
  const rankColors = ['#FFB800', '#C0C0C0', '#CD7F32'];
  
  const periodLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '本年',
  }[timeRange];
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="truncate">AI效能排名</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{periodLabel}AI贡献价值排序</p>
        </div>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 flex-shrink-0 ml-2"
        >
          <option value="value">按AI价值</option>
          <option value="adoption">按采纳率</option>
          <option value="content">按内容数</option>
        </select>
      </div>
      
      <div className="space-y-2 max-h-[360px] overflow-y-auto">
        {sortedHotels.map((hotel, index) => (
          <motion.div
            key={hotel.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/hotel-workbench/${hotel.id}`)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            {/* 排名 */}
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: index < 3 ? `${rankColors[index]}20` : '#f3f4f6',
                color: index < 3 ? rankColors[index] : '#9ca3af'
              }}
            >
              {index + 1}
            </div>
            
            {/* 酒店信息 */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-medium text-gray-900 text-sm truncate" title={hotel.name}>{hotel.name}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                <span>{hotel.city}</span>
                <span>·</span>
                <span>采纳{hotel.aiAdoptionRate}%</span>
                <span>·</span>
                <span>{hotel.contentCount}篇内容</span>
              </div>
            </div>
            
            {/* AI价值 */}
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-violet-600 text-sm whitespace-nowrap">
                ¥{(hotel.aiValue.totalLift / 10000).toFixed(1)}万
              </div>
              <div className="text-[10px] text-gray-400">AI贡献</div>
            </div>
          </motion.div>
        ))}
        
        {sortedHotels.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// AI优化建议组件 - 可操作的智能建议
// ============================================

interface HotelSuggestion {
  hotel: HotelAIStats;
  issues: { type: 'pricing' | 'content' | 'service'; message: string; priority: number }[];
  quickAction: { label: string; path: string };
}

function AIOptimizationSuggestions({ 
  hotels, 
  avgAdoptionRate 
}: { 
  hotels: HotelAIStats[]; 
  avgAdoptionRate: number;
}) {
  const navigate = useNavigate();
  
  // 生成每家酒店的具体优化建议
  const suggestions = useMemo((): HotelSuggestion[] => {
    return hotels.map(hotel => {
      const issues: HotelSuggestion['issues'] = [];
      
      // 定价采纳率低
      if (hotel.pricingAdoptionRate < 60) {
        issues.push({
          type: 'pricing',
          message: `定价采纳率仅${hotel.pricingAdoptionRate}%，错失收益机会`,
          priority: 100 - hotel.pricingAdoptionRate
        });
      }
      
      // 内容生成少
      if (hotel.contentCount < 5) {
        issues.push({
          type: 'content',
          message: `本周仅${hotel.contentCount}篇内容，建议加强小红书/闲鱼运营`,
          priority: 30
        });
      }
      
      // 客服AI解决率低
      if (hotel.aiResolutionRate < 50) {
        issues.push({
          type: 'service',
          message: `AI客服解决率${hotel.aiResolutionRate}%，话术库待优化`,
          priority: 70 - hotel.aiResolutionRate
        });
      }
      
      // 确定快捷操作
      let quickAction = { label: '查看详情', path: `/hotel-workbench/${hotel.id}` };
      if (issues.length > 0) {
        const topIssue = issues.sort((a, b) => b.priority - a.priority)[0];
        if (topIssue.type === 'pricing') {
          quickAction = { label: '去定价', path: `/pricing/${hotel.id}` };
        } else if (topIssue.type === 'content') {
          quickAction = { label: '去生成内容', path: '/content-factory' };
        } else if (topIssue.type === 'service') {
          quickAction = { label: '优化话术', path: '/aichat/scripts' };
        }
      }
      
      return { hotel, issues, quickAction };
    }).filter(s => s.issues.length > 0) // 只显示有问题的酒店
      .sort((a, b) => b.issues[0].priority - a.issues[0].priority) // 按优先级排序
      .slice(0, 3); // 最多显示3家
  }, [hotels]);
  
  // 生成整体建议
  const overallSuggestion = useMemo(() => {
    const lowPricingHotels = hotels.filter(h => h.pricingAdoptionRate < 60).length;
    const lowContentHotels = hotels.filter(h => h.contentCount < 5).length;
    
    if (avgAdoptionRate >= 80) {
      return { type: 'success' as const, message: 'AI使用情况良好，继续保持！' };
    }
    if (lowPricingHotels > 0) {
      return { 
        type: 'warning' as const, 
        message: `${lowPricingHotels}家酒店定价采纳率偏低，建议优先优化`,
        action: { label: '批量查看', path: '/pricing' }
      };
    }
    if (lowContentHotels > 0) {
      return { 
        type: 'info' as const, 
        message: `${lowContentHotels}家酒店内容产出不足`,
        action: { label: '去内容工厂', path: '/content-factory' }
      };
    }
    return { type: 'info' as const, message: 'AI使用正常，可进一步提升采纳率' };
  }, [hotels, avgAdoptionRate]);
  
  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'pricing': return <DollarSign className="w-3 h-3" />;
      case 'content': return <FileText className="w-3 h-3" />;
      case 'service': return <MessageSquare className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };
  
  const getIssueColor = (type: string) => {
    switch (type) {
      case 'pricing': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'content': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'service': return 'text-violet-600 bg-violet-50 border-violet-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            overallSuggestion.type === 'success' ? 'bg-green-100' : 'bg-amber-100'
          }`}>
            {overallSuggestion.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI优化建议</h3>
            <p className="text-xs text-gray-500">{overallSuggestion.message}</p>
          </div>
        </div>
        {'action' in overallSuggestion && overallSuggestion.action && (
          <button
            onClick={() => navigate(overallSuggestion.action!.path)}
            className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1"
          >
            {overallSuggestion.action.label}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* 具体酒店建议列表 */}
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map(({ hotel, issues, quickAction }) => (
            <div key={hotel.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{hotel.name}</span>
                  <span className="text-xs text-gray-400">{hotel.city}</span>
                </div>
                <button
                  onClick={() => navigate(quickAction.path)}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-0.5"
                >
                  {quickAction.label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issues.slice(0, 2).map((issue, idx) => (
                  <span 
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getIssueColor(issue.type)}`}
                  >
                    {getIssueIcon(issue.type)}
                    {issue.message}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-400" />
          <p className="text-sm">所有酒店AI使用情况良好</p>
        </div>
      )}
      
      {/* 快捷操作入口 */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => navigate('/pricing')}
          className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors flex items-center justify-center gap-1"
        >
          <DollarSign className="w-3 h-3" />
          定价中心
        </button>
        <button
          onClick={() => navigate('/content-factory')}
          className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors flex items-center justify-center gap-1"
        >
          <FileText className="w-3 h-3" />
          内容工厂
        </button>
        <button
          onClick={() => navigate('/aichat/collab')}
          className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 transition-colors flex items-center justify-center gap-1"
        >
          <Bot className="w-3 h-3" />
          人机协作
        </button>
      </div>
    </div>
  );
}

// ============================================
// ROI分析组件
// ============================================

function ROIAnalysis({ data, hotelCount, timeRange }: { data: AIValueData; hotelCount: number; timeRange: TimeRange }) {
  // 每月固定投入（AI服务费）
  const monthlyInvestment = hotelCount * 3000; // 每家酒店月投入3000元
  
  // 当前周期实际投入
  const daysInPeriod = {
    today: 1,
    week: 7,
    month: 30,
    year: 365,
  }[timeRange];
  
  const investment = monthlyInvestment * (daysInPeriod / 30);
  const returnValue = data.totalLift;
  
  // 计算年化收益（用于ROI和回本周期）
  const yearlyReturn = returnValue * (365 / daysInPeriod);
  const yearlyInvestment = monthlyInvestment * 12;
  
  // ROI = 年化净收益 / 年化投入
  const roi = yearlyInvestment > 0 ? ((yearlyReturn - yearlyInvestment) / yearlyInvestment * 100) : 0;
  
  // 回本周期（月）= 月投入 / 月收益
  const monthlyReturn = yearlyReturn / 12;
  const paybackPeriod = monthlyReturn > 0 ? (monthlyInvestment / monthlyReturn) : 0;
  
  return (
    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-violet-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">AI投入产出分析</h3>
          <p className="text-xs text-gray-500 truncate">基于当前使用效果测算</p>
        </div>
      </div>
      
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-white rounded-lg">
          <div className={`text-lg font-bold whitespace-nowrap ${roi >= 0 ? 'text-violet-600' : 'text-red-600'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
          </div>
          <div className="text-[10px] text-gray-500 whitespace-nowrap">年化ROI</div>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-lg font-bold text-green-600 whitespace-nowrap">
            {paybackPeriod <= 0 ? '∞' : paybackPeriod < 1 ? '<1' : paybackPeriod.toFixed(0)}月
          </div>
          <div className="text-[10px] text-gray-500 whitespace-nowrap">回本周期</div>
        </div>
        <div className="text-center p-2 bg-white rounded-lg">
          <div className="text-lg font-bold text-amber-600 whitespace-nowrap">
            {returnValue >= 10000 ? (returnValue / 10000).toFixed(1) + '万' : Math.round(returnValue)}
          </div>
          <div className="text-[10px] text-gray-500 whitespace-nowrap">
            {timeRange === 'year' ? '年度收益' : timeRange === 'month' ? '本月收益' : timeRange === 'week' ? '本周收益' : '今日收益'}
          </div>
        </div>
      </div>
      
      {/* 投入产出明细 */}
      <div className="mt-3 p-3 bg-white rounded-lg space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 whitespace-nowrap">
            {timeRange === 'today' ? '今日投入' : timeRange === 'week' ? '本周投入' : timeRange === 'month' ? '本月投入' : '年度投入'}
          </span>
          <span className="font-medium text-gray-900 whitespace-nowrap">
            {investment < 10000 ? '¥' + Math.round(investment) : '¥' + (investment / 10000).toFixed(1) + '万'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 whitespace-nowrap">
            {timeRange === 'today' ? '今日增收' : timeRange === 'week' ? '本周增收' : timeRange === 'month' ? '本月增收' : '年度增收'}
          </span>
          <span className="font-medium text-green-600 whitespace-nowrap">
            {returnValue < 10000 ? '¥' + Math.round(returnValue) : '¥' + (returnValue / 10000).toFixed(1) + '万'}
          </span>
        </div>
        <div className="h-px bg-gray-100 my-1" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 whitespace-nowrap">
            {timeRange === 'today' ? '今日净收益' : timeRange === 'week' ? '本周净收益' : timeRange === 'month' ? '本月净收益' : '年度净收益'}
          </span>
          <span className={`font-medium whitespace-nowrap ${returnValue - investment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {returnValue - investment >= 0 ? '+' : ''}
            {Math.abs(returnValue - investment) < 10000 
              ? '¥' + Math.round(returnValue - investment) 
              : '¥' + ((returnValue - investment) / 10000).toFixed(1) + '万'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function AIDashboard() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 计算当前时间范围的日期
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = timeRange === 'today' ? 0 : timeRange === 'week' ? 6 : timeRange === 'month' ? 29 : 364;
    start.setDate(end.getDate() - days);
    return { start, end };
  }, [timeRange]);

  // 生成日期列表
  const dates = useMemo(() => {
    const list: string[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      list.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return list;
  }, [dateRange]);

  // 计算所有酒店的AI指标汇总
  const aiStats = useMemo(() => {
    if (selectedHotelIds.length === 0) {
      return {
        pricingLift: 0,
        contentLift: 0,
        serviceLift: 0,
        totalLift: 0,
        laborHoursSaved: 0,
        laborCostSaved: 0,
        roi: 0,
        avgAdoptionRate: 0,
        avgPricingAdoption: 0,
        avgContentAdoption: 0,
        avgServiceAdoption: 0,
        avgResolutionRate: 0,
        totalContent: 0,
        hotelCount: 0,
      };
    }

    let totalPricingLift = 0;
    let totalContentLift = 0;
    let totalServiceLift = 0;
    let totalLaborHours = 0;
    let totalContent = 0;
    let totalAdoptionRate = 0;
    let totalPricingAdoption = 0;
    let totalContentAdoption = 0;
    let totalServiceAdoption = 0;
    let totalResolutionRate = 0;
    let dataCount = 0;

    // 遍历每个酒店和每天
    selectedHotelIds.forEach(hotelId => {
      dates.forEach(date => {
        const metrics = generateHotelAIMetrics(hotelId, date);
        totalPricingLift += metrics.aiPricingLift;
        totalContentLift += metrics.aiContentLift;
        totalServiceLift += metrics.aiServiceLift;
        totalLaborHours += metrics.laborHoursSaved;
        totalContent += metrics.contentCount;
        totalAdoptionRate += metrics.aiAdoptionRate;
        totalPricingAdoption += metrics.pricingAdoptionRate;
        totalContentAdoption += metrics.contentAdoptionRate;
        totalServiceAdoption += metrics.serviceAdoptionRate;
        totalResolutionRate += metrics.aiResolutionRate;
        dataCount++;
      });
    });

    const hotelCount = selectedHotelIds.length;
    const totalRecords = dataCount || 1;

    // 计算平均值（按酒店数量平均）
    const avgAdoptionRate = Math.round(totalAdoptionRate / totalRecords);
    const avgPricingAdoption = Math.round(totalPricingAdoption / totalRecords);
    const avgContentAdoption = Math.round(totalContentAdoption / totalRecords);
    const avgServiceAdoption = Math.round(totalServiceAdoption / totalRecords);
    const avgResolutionRate = Math.round(totalResolutionRate / totalRecords);

    // 计算总增收（日增收 × 天数）
    const totalLift = totalPricingLift + totalContentLift + totalServiceLift;
    
    // 计算人效节省成本（假设50元/小时）
    const laborCostSaved = totalLaborHours * 50;

    return {
      pricingLift: totalPricingLift,
      contentLift: totalContentLift,
      serviceLift: totalServiceLift,
      totalLift,
      laborHoursSaved: totalLaborHours,
      laborCostSaved,
      roi: 0, // 在组件中计算
      avgAdoptionRate,
      avgPricingAdoption,
      avgContentAdoption,
      avgServiceAdoption,
      avgResolutionRate,
      totalContent,
      hotelCount,
    };
  }, [hotels, selectedHotelIds, dates]);

  // 计算趋势数据（与上期对比）
  const aiTrends = useMemo(() => {
    // 生成上期数据（往前推相同天数）
    const prevDays = dates.length;
    let prevPricingLift = 0;
    let prevContentLift = 0;
    let prevServiceLift = 0;

    selectedHotelIds.forEach(hotelId => {
      for (let i = 0; i < prevDays; i++) {
        const date = new Date(dateRange.start);
        date.setDate(date.getDate() - prevDays + i);
        const metrics = generateHotelAIMetrics(hotelId, date.toISOString().split('T')[0]);
        prevPricingLift += metrics.aiPricingLift;
        prevContentLift += metrics.aiContentLift;
        prevServiceLift += metrics.aiServiceLift;
      }
    });

    const calcTrend = (current: number, previous: number) => {
      if (previous <= 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalTrend: calcTrend(aiStats.totalLift, prevPricingLift + prevContentLift + prevServiceLift),
      pricingTrend: calcTrend(aiStats.pricingLift, prevPricingLift),
      contentTrend: calcTrend(aiStats.contentLift, prevContentLift),
      serviceTrend: calcTrend(aiStats.serviceLift, prevServiceLift),
    };
  }, [aiStats, dates, selectedHotelIds, dateRange]);

  // 酒店AI统计列表
  const hotelAIStats = useMemo((): HotelAIStats[] => {
    return selectedHotelIds.map(hotelId => {
      const hotel = hotels.find(h => h.id === hotelId);
      if (!hotel) return null as any;

      // 汇总该酒店在当前时间范围的AI指标
      let pricingLift = 0;
      let contentLift = 0;
      let serviceLift = 0;
      let laborHours = 0;
      let contentCount = 0;
      let aiAdoptionRate = 0;
      let pricingAdoptionRate = 0;
      let aiResolutionRate = 0;
      let count = 0;

      dates.forEach(date => {
        const metrics = generateHotelAIMetrics(hotelId, date);
        pricingLift += metrics.aiPricingLift;
        contentLift += metrics.aiContentLift;
        serviceLift += metrics.aiServiceLift;
        laborHours += metrics.laborHoursSaved;
        contentCount += metrics.contentCount;
        aiAdoptionRate += metrics.aiAdoptionRate;
        pricingAdoptionRate += metrics.pricingAdoptionRate;
        aiResolutionRate += metrics.aiResolutionRate;
        count++;
      });

      const days = count || 1;
      const totalLift = pricingLift + contentLift + serviceLift;
      const laborCostSaved = laborHours * 50;
      const investment = days * 100; // 每天投入100元
      const roi = investment > 0 ? Math.round((totalLift / investment) * 100) : 0;

      return {
        id: hotel.id,
        name: hotel.name,
        city: hotel.city || '',
        aiAdoptionRate: Math.round(aiAdoptionRate / days),
        contentCount,
        aiResolutionRate: Math.round(aiResolutionRate / days),
        pricingAdoptionRate: Math.round(pricingAdoptionRate / days),
        aiValue: {
          pricingLift,
          contentLift,
          serviceLift,
          totalLift,
          laborHoursSaved: laborHours,
          laborCostSaved,
          roi,
        },
      };
    }).filter(Boolean);
  }, [hotels, selectedHotelIds, dates]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const periodLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '本年',
  }[timeRange];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-violet-500 flex-shrink-0" />
            <span className="truncate">AI效果看板</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1 truncate">
            AI赋能经营分析 · {aiStats.hotelCount} 家酒店{periodLabel}数据汇总
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button 
            onClick={handleRefresh}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </motion.div>

      {/* AI增收总览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AIValueCard
          title={`${periodLabel}AI总增收`}
          smartFormat={formatSmartAmount(aiStats.totalLift)}
          subtext="定价+内容+客服"
          icon={DollarSign}
          color="#8B5CF6"
          trend={aiTrends.totalTrend}
          delay={0}
        />
        <AIValueCard
          title="定价优化增收"
          smartFormat={formatSmartAmount(aiStats.pricingLift)}
          subtext="AI智能定价建议"
          icon={Zap}
          color="#10B981"
          trend={aiTrends.pricingTrend}
          delay={0.05}
        />
        <AIValueCard
          title="内容营销增收"
          smartFormat={formatSmartAmount(aiStats.contentLift)}
          subtext="AI生成内容转化"
          icon={FileText}
          color="#F59E0B"
          trend={aiTrends.contentTrend}
          delay={0.1}
        />
        <AIValueCard
          title="客服提效增收"
          smartFormat={formatSmartAmount(aiStats.serviceLift)}
          subtext="AI自动回复节省"
          icon={MessageSquare}
          color="#3B82F6"
          trend={aiTrends.serviceTrend}
          delay={0.15}
        />
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：AI采纳率 + 人效提升 */}
        <div className="space-y-6">
          {/* AI采纳率分析 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">AI功能采纳率</h3>
                <p className="text-xs text-gray-500 truncate">各模块平均采纳情况</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <AIAdoptionCard 
                title="智能定价采纳率"
                rate={aiStats.avgPricingAdoption}
                icon={Zap}
                color="#8B5CF6"
              />
              <AIAdoptionCard 
                title="内容生成采纳率"
                rate={aiStats.avgContentAdoption}
                icon={FileText}
                color="#F59E0B"
              />
              <AIAdoptionCard 
                title="客服AI解决率"
                rate={aiStats.avgResolutionRate}
                icon={MessageSquare}
                color="#3B82F6"
              />
            </div>
          </div>
          
          {/* 人效提升分析 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">人效提升分析</h3>
                <p className="text-xs text-gray-500 truncate">AI替代人工工作量</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <EfficiencyCard
                title="节省总工时"
                saved={Math.round(aiStats.laborHoursSaved)}
                unit="小时"
                icon={Clock}
                color="#10B981"
                subtext={`≈ ${(aiStats.laborHoursSaved / 8).toFixed(1)} 个人工作日`}
              />
              <EfficiencyCard
                title="节省人力成本"
                saved={Math.round(aiStats.laborCostSaved / 10000)}
                unit="万元"
                icon={DollarSign}
                color="#F59E0B"
                subtext={`按50元/小时计算`}
              />
              <EfficiencyCard
                title="AI生成内容"
                saved={aiStats.totalContent}
                unit="篇"
                icon={FileText}
                color="#8B5CF6"
                subtext={`平均每人效提升${(aiStats.totalContent / (selectedHotelIds.length || 1)).toFixed(0)}篇`}
              />
            </div>
          </div>
        </div>
        
        {/* 右侧：酒店排名 + ROI分析 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HotelAIRanking hotels={hotelAIStats} timeRange={timeRange} />
            <ROIAnalysis data={aiStats} hotelCount={aiStats.hotelCount} timeRange={timeRange} />
          </div>
          
          {/* AI优化建议 - 可操作的智能建议 */}
          <AIOptimizationSuggestions 
            hotels={hotelAIStats} 
            avgAdoptionRate={aiStats.avgAdoptionRate}
          />
        </div>
      </div>
    </div>
  );
}

export default AIDashboard;
