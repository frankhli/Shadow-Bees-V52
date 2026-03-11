/**
 * Shadow-Bees V52 - 定价决策页面
 * 布局调整：上方AI建议，下方调价决策
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Bed, Shield, CheckCircle, XCircle, Clock, AlertCircle,
  Sparkles, Target, Building2, Calendar, Flame, Zap, Circle,
  ChevronRight, ChevronLeft, TrendingUp, BarChart3
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { PriceApprovalModal } from '@/components/PriceApprovalModal';
import { PricingPanel } from '@/components/pricing';
import { PlatformLogo } from '@/components/PlatformLogo';
import { SmartPricingPanel } from '@/components/pricing/SmartPricingPanel';
import { FloorPriceSuggestion } from '@/components/pricing/FloorPriceSuggestion';

import { generateFuturePricingData, getEventImpactColor } from '@/utils/pricingEngine';
import { 
  generateHotelsByTier
} from '@/utils/competitorDataGenerator';
import { getRoomTypeCategory } from '@/utils/smartPricingEngine';
import type { Platform } from '@/types';

// ============================================
// AI定价建议组件
// ============================================

function AIRecommendation() {
  const { 
    currentHotel, 
    currentRoomType,
    events,
    currentMode,
    updateCurrentPrice,
  } = useUnifiedStore();

  // 使用统一的竞品数据源（与市场情报一致）
  const todayStr = new Date().toISOString().split('T')[0];
  const hotelsByTier = useMemo(() => {
    if (!currentHotel) return { economy: [], comfort: [], premium: [] };
    return generateHotelsByTier(currentHotel.id, todayStr, events);
  }, [currentHotel?.id, todayStr, events]);

  // 计算AI建议价格
  const recommendation = useMemo(() => {
    if (!currentRoomType) return null;

    const basePrice = currentRoomType.currentPrice || currentRoomType.floorPrice;
    const floorPrice = currentRoomType.floorPrice;
    const ceilingPrice = currentRoomType.ceilingPrice;

    // 获取当前房型类型
    const roomCategory = getRoomTypeCategory(currentRoomType.name) as 'budget' | 'standard' | 'suite';
    
    // 使用酒店自身的档次获取同类竞品
    const ourTier = currentHotel.tier;
    const tierHotels = hotelsByTier[ourTier];
    
    // 获取该档次所有酒店的当前房型价格
    const prices = tierHotels
      .map(h => h.prices[roomCategory]?.price)
      .filter((p): p is number => p !== undefined);
    
    // 计算竞品价格区间
    const competitorMin = prices.length > 0 ? Math.min(...prices) : 0;
    const competitorMax = prices.length > 0 ? Math.max(...prices) : 0;
    const competitorAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

    // 根据定价模式确定锚定价格
    let anchorPrice: number;
    let anchorDescription: string;
    
    switch (currentMode) {
      case 'clearance':
        // 尾货模式：锚定最低价，确保价格优势
        anchorPrice = Math.round(competitorMin * 0.95);
        anchorDescription = '锚定最低价（尾货）';
        break;
      case 'scalper':
        // 黄牛模式：锚定最高价，追求溢价
        anchorPrice = Math.round(competitorMax * 1.1);
        anchorDescription = '锚定最高价（黄牛）';
        break;
      case 'dynamic':
      default:
        // 动态模式：锚定中间价，平衡策略
        anchorPrice = Math.round((competitorMin + competitorMax) / 2);
        anchorDescription = '锚定中间价（动态）';
        break;
    }

    // 建议价格在锚定价和底价/天花板之间取约束值
    const suggestedPrice = Math.max(floorPrice, Math.min(ceilingPrice, anchorPrice));

    const priceDiff = suggestedPrice - basePrice;
    const percentChange = ((priceDiff / basePrice) * 100).toFixed(1);

    // 判断价格趋势
    const trend = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'stable';
    
    // 灵活渠道基准价 vs 竞品均价的百分比
    const currentPriceVsCompetitor = ((basePrice - competitorAvg) / competitorAvg * 100).toFixed(1);
    const currentPriceTrend = basePrice > competitorAvg ? 'up' : basePrice < competitorAvg ? 'down' : 'stable';

    // 计算锚定约束价格
    const anchorLow = Math.round(competitorMin * 1.2);
    const anchorHigh = Math.round(competitorMax * 0.9);

    return {
      suggestedPrice,
      priceDiff,
      percentChange,
      trend,
      competitorMin,
      competitorMax,
      competitorAvg,
      anchorDescription,
      highImpactEvents: events.filter(e => e.intensity === 'high').length,
      mediumImpactEvents: events.filter(e => e.intensity === 'medium').length,
      // 基于数据质量计算置信度（替代随机）
      confidence: (() => {
        let score = 50; // 基础分
        
        // 1. 数据完整度（0-20分）- 竞品数据越多越可靠
        if (prices.length >= 5) score += 20;
        else if (prices.length >= 3) score += 15;
        else if (prices.length >= 1) score += 10;
        
        // 2. 数据一致性（0-20分）- 价格波动越小越可靠
        if (prices.length > 1) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
          const stdDev = Math.sqrt(variance);
          const cv = avg > 0 ? stdDev / avg : 0; // 变异系数
          
          if (cv < 0.1) score += 20;      // 价格波动 < 10%，很集中
          else if (cv < 0.2) score += 15; // 价格波动 < 20%，较集中
          else if (cv < 0.3) score += 10; // 价格波动 < 30%，一般
          else score += 5;                // 价格波动大，数据分散
        }
        
        // 3. 事件明确度（0-15分）
        if (events.length > 0) {
          const highImpactCount = events.filter(e => e.intensity === 'high').length;
          const mediumImpactCount = events.filter(e => e.intensity === 'medium').length;
          
          if (highImpactCount > 0) score += 15;   // 高影响事件，定价依据明确
          else if (mediumImpactCount > 0) score += 10;
          else score += 5;
        } else {
          score += 8; // 无事件也是明确的信号（平稳期）
        }
        
        // 4. 价格区间合理性（0-15分）- 有明确的底价和天花板
        if (floorPrice > 0 && ceilingPrice > floorPrice) {
          const rangeRatio = (ceilingPrice - floorPrice) / floorPrice;
          if (rangeRatio > 0.5) score += 15; // 价格区间足够大，有调整空间
          else if (rangeRatio > 0.3) score += 10;
          else score += 5;
        }
        
        return Math.min(98, Math.max(60, score)); // 控制在60-98之间
      })(),
      anchorLow,
      anchorHigh,
      roomCategory,
      currentPriceVsCompetitor,
      currentPriceTrend,
    };
  }, [currentRoomType, currentHotel, hotelsByTier, events, currentMode, todayStr]);

  if (!recommendation) return null;

  return (
    <div className="bg-gradient-to-br from-[#07C160]/10 via-bg-secondary to-bg-secondary rounded-xl border border-[#07C160]/30 p-5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#07C160]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#07C160]" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">AI 定价建议</h3>
            <p className="text-xs text-[#07C160]">Shadow Intelligence Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">置信度</span>
          <div className="w-20 h-2 bg-bg-primary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#07C160] to-[#00E396]"
              style={{ width: `${recommendation.confidence}%` }}
            />
          </div>
          <span className="text-xs text-[#07C160] font-mono">{recommendation.confidence}%</span>
        </div>
      </div>

      {/* 建议价格 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* 灵活渠道基准价 - 统一使用金色 */}
        <div className="bg-bg-primary rounded-lg p-4 border border-[#FFB800]/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#FFB800]/10 to-transparent rounded-bl-full" />
          <div className="text-sm text-[#FFB800] mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            灵活渠道基准价
          </div>
          <div className="text-3xl font-bold text-[#FFB800] font-mono">
            ¥{currentRoomType?.currentPrice || 0}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1">
            <span className={`font-medium ${
              recommendation.currentPriceTrend === 'up' ? 'text-[#00E396]' : 
              recommendation.currentPriceTrend === 'down' ? 'text-red-400' : 'text-text-secondary'
            }`}>
              {recommendation.currentPriceTrend === 'up' ? '↑' : recommendation.currentPriceTrend === 'down' ? '↓' : '→'}
              {recommendation.currentPriceTrend === 'up' ? '+' : ''}{recommendation.currentPriceVsCompetitor}%
            </span>
            <span className="text-text-muted">vs 竞品</span>
          </div>
        </div>

        {/* 同类竞品价格区间 */}
        <div className="bg-bg-primary rounded-lg p-4 border border-border-color/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
          <div className="text-sm text-purple-400 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            同类竞品价格区间
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            ¥{recommendation.competitorMin}-¥{recommendation.competitorMax}
          </div>
          <div className="text-xs mt-1 text-text-muted">
            均价 ¥{recommendation.competitorAvg} · {recommendation.anchorDescription}
          </div>
        </div>

        {/* AI建议价格 + 应用按钮 - 强化CTA */}
        <div className="bg-gradient-to-br from-[#07C160]/15 to-bg-primary rounded-lg p-4 border border-[#07C160]/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#07C160]/10 blur-2xl rounded-full" />
          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="text-sm text-[#07C160] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI建议价格
            </div>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-bold text-[#07C160] font-mono">
              ¥{recommendation.suggestedPrice}
            </span>
          </div>
          <div className="text-xs mt-1 flex items-center gap-1 relative z-10">
            <span className={`font-medium ${
              recommendation.trend === 'up' ? 'text-[#00E396]' : 
              recommendation.trend === 'down' ? 'text-[#FFB800]' : 'text-text-secondary'
            }`}>
              {recommendation.trend === 'up' ? '↑' : recommendation.trend === 'down' ? '↓' : '→'}
              {recommendation.trend === 'up' ? '+' : ''}{recommendation.percentChange}%
            </span>
            <span className="text-text-muted">vs 灵活渠道基准价</span>
          </div>
          {/* 应用按钮 - 醒目主CTA */}
          {recommendation.suggestedPrice !== currentRoomType?.currentPrice && (
            <button
              onClick={() => updateCurrentPrice(recommendation.suggestedPrice)}
              className="mt-3 w-full py-2 text-sm font-medium bg-[#07C160] text-bg-primary rounded-lg hover:bg-[#07C160]/90 transition-all flex items-center justify-center gap-1 animate-pulse"
            >
              <Sparkles className="w-4 h-4" />
              应用AI建议
            </button>
          )}
        </div>
      </div>

      {/* 建议依据 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <DollarSign className="w-3 h-3" />
            当前底价
          </div>
          <div className="text-2xl font-bold text-text-primary font-mono mt-2">
            ¥{currentRoomType?.floorPrice || 0}
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <Calendar className="w-3 h-3" />
            事件影响
          </div>
          <div className="text-sm text-text-primary">
            {recommendation.highImpactEvents > 0 ? (
              <span className="text-[#FFB800]">{recommendation.highImpactEvents} 个高影响事件</span>
            ) : recommendation.mediumImpactEvents > 0 ? (
              <span className="text-[#07C160]">{recommendation.mediumImpactEvents} 个中等影响</span>
            ) : (
              <span className="text-text-secondary">暂无重大事件</span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {events.length} 个相关事件
          </div>
        </div>

        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
            <Target className="w-3 h-3" />
            定价策略
          </div>
          <div className="text-sm text-text-primary">
            {recommendation.trend === 'up' ? '建议提价' : 
             recommendation.trend === 'down' ? '建议降价' : '维持现价'}
          </div>
          <div className="text-xs text-text-muted mt-1">
            符合{currentRoomType?.name}定位
          </div>
        </div>
      </div>

      {/* 来源说明 */}
      <div className="flex items-center justify-between pt-4 border-t border-border-color">
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>数据来源：</span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            竞品监测
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            事件分析
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI算法计算
          </span>
        </div>
        <div className="text-xs text-text-muted">
          基于 {currentHotel?.name} 实时数据
        </div>
      </div>
    </div>
  );
}

// ============================================
// 未来定价预测面板
// ============================================

function FuturePricingPanel({ viewRange }: { viewRange: 7 | 14 | 30 }) {
  const { 
    currentRoomType, 
    currentHotel, 
    inventory, 
    events, 
    competitors, 
    switchRoomType,
    updateDynamicPrice,
    addAuditLog,
  } = useUnifiedStore();
  const [appliedDates, setAppliedDates] = useState<Set<string>>(new Set());
  
  // 确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    date: string;
    suggestedPrice: number;
    competitorAvg: number;
  }>({
    isOpen: false,
    date: '',
    suggestedPrice: 0,
    competitorAvg: 0,
  });
  
  // 使用共享定价引擎生成未来数据
  const dates = useMemo(() => {
    return generateFuturePricingData(
      viewRange,
      competitors,
      events,
      currentRoomType,
      inventory?.calendar || null
    );
  }, [viewRange, competitors, events, currentRoomType, inventory?.calendar]);
  
  // 关闭确认弹窗
  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };
  
  // 确认应用价格
  const confirmApplyPrice = () => {
    const { date, suggestedPrice } = confirmDialog;
    if (!date || !currentRoomType) return;

    // 从库存日历中获取旧价格
    const oldPrice = inventory.calendar?.[date]?.byRoomType?.[currentRoomType.id]?.dynamicPrice?.suggestedPrice 
      || currentRoomType.floorPrice;
    
    // 应用价格
    updateDynamicPrice(date, currentRoomType.id, suggestedPrice);
    setAppliedDates(prev => new Set([...prev, date]));
    
    // 记录审计日志
    addAuditLog({
      action: '应用未来定价',
      detail: `将 ${date} 的 ${currentRoomType.name} 价格从 ¥${oldPrice} 调整为 ¥${suggestedPrice}`,
      level: 'normal',
      metadata: {
        date,
        roomTypeId: currentRoomType.id,
        roomTypeName: currentRoomType.name,
        oldPrice,
        newPrice: suggestedPrice,
        competitorAvg: confirmDialog.competitorAvg,
      },
    });
    
    closeConfirmDialog();
  };
  
  // 打开确认弹窗
  const openConfirmDialog = (dateInfo: any) => {
    if (!dateInfo || appliedDates.has(dateInfo.dateStr)) return;
    
    setConfirmDialog({
      isOpen: true,
      date: dateInfo.dateStr,
      suggestedPrice: dateInfo.aiSuggestion,
      competitorAvg: dateInfo.competitorAvg || 0,
    });
  };

  // 计算关键指标
  const stats = useMemo(() => {
    const avgAiPrice = Math.round(dates.reduce((sum, d) => sum + d.aiSuggestion, 0) / dates.length);
    const avgCompetitorPrice = Math.round(dates.reduce((sum, d) => sum + (d.competitorAvg || 0), 0) / dates.filter(d => d.competitorAvg).length) || 0;
    const priceDiff = avgCompetitorPrice > 0 ? Math.round(((avgAiPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100) : 0;
    const eventDays = dates.filter(d => d.events.length > 0).length;
    const appliedCount = dates.filter(d => appliedDates.has(d.dateStr)).length;
    
    return {
      avgAiPrice,
      avgCompetitorPrice,
      priceDiff,
      eventDays,
      appliedCount,
      totalDays: dates.length,
    };
  }, [dates, appliedDates]);

  return (
    <div className="space-y-6">
      {/* 房型切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-bg-secondary rounded-xl p-1 border border-border-color">
          <Bed size={16} className="text-text-secondary ml-2" />
          {currentHotel?.roomTypes.map((room) => (
            <button
              key={room.id}
              onClick={() => switchRoomType(room.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                room.id === currentRoomType?.id
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> 售罄
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 紧张
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 适中
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> 充足
          </span>
        </div>
      </div>

      {/* 关键指标统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">AI建议均价</span>
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-neon-cyan" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neon-cyan">¥{stats.avgAiPrice}</div>
          <div className="text-xs text-text-secondary mt-1">基于AI算法预测</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">竞品均价</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">¥{stats.avgCompetitorPrice}</div>
          <div className="text-xs text-text-secondary mt-1">市场平均水平</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">价差优势</span>
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <DollarSign size={16} className="text-neon-green" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${stats.priceDiff >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
            {stats.priceDiff >= 0 ? '+' : ''}{stats.priceDiff}%
          </div>
          <div className="text-xs text-text-secondary mt-1">{stats.priceDiff >= 0 ? '溢价空间' : '价格优势'}</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">事件影响天数</span>
            <div className="w-8 h-8 rounded-lg bg-neon-amber/10 flex items-center justify-center">
              <Calendar size={16} className="text-neon-amber" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neon-amber">{stats.eventDays}</div>
          <div className="text-xs text-text-secondary mt-1">共{stats.totalDays}天</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-color"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">已应用定价</span>
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-neon-green" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neon-green">{stats.appliedCount}</div>
          <div className="text-xs text-text-secondary mt-1">{stats.totalDays - stats.appliedCount}天待确认</div>
        </motion.div>
      </div>

      {/* 日期卡片网格 */}
      <div className="grid grid-cols-7 gap-3">
        {dates.map((dateInfo, idx) => (
          <motion.div
            key={dateInfo.dateStr}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`relative p-3 rounded-xl border ${dateInfo.inventoryStatus?.border || 'border-border-color'} ${dateInfo.inventoryStatus?.bg || 'bg-bg-secondary'} hover:border-neon-cyan/50 transition-all cursor-pointer group`}
          >
            {/* 日期头部 */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${dateInfo.isWeekend ? 'text-neon-purple' : 'text-text-primary'}`}>
                {dateInfo.display}
              </span>
              <span className="text-xs text-text-secondary">{dateInfo.weekday}</span>
            </div>
            
            {/* 竞品均价 */}
            <div className="mb-2">
              <div className="text-xs text-text-secondary mb-1">竞品均价</div>
              <div className="text-lg font-mono font-bold text-purple-400">
                ¥{dateInfo.competitorAvg || '-'}
              </div>
            </div>
            
            {/* AI建议 */}
            <div className="mb-2">
              <div className="text-xs text-text-secondary mb-1">AI建议</div>
              <div className="text-xl font-mono font-bold text-neon-cyan">
                ¥{dateInfo.aiSuggestion}
              </div>
            </div>
            
            {/* 库存状态 */}
            {dateInfo.inventoryStatus && (
              <div className={`text-xs ${dateInfo.inventoryStatus.color} mb-2`}>
                库存{dateInfo.inventoryStatus.label}
              </div>
            )}
            
            {/* 事件标记 */}
            {dateInfo.events.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dateInfo.events.map((e, i) => {
                  const { bg, text, iconKey } = getEventImpactColor(e.intensity);
                  const Icon = iconKey === 'flame' ? Flame : iconKey === 'zap' ? Zap : Circle;
                  return (
                    <span 
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${bg} ${text} flex items-center gap-0.5`}
                      title={e.name}
                    >
                      <Icon size={8} /> {e.name.slice(0, 4)}
                    </span>
                  );
                })}
              </div>
            )}
            
            {/* 悬停操作 */}
            <div className="absolute inset-0 bg-bg-secondary/95 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {appliedDates.has(dateInfo.dateStr) ? (
                <span className="px-3 py-1.5 text-neon-green text-sm flex items-center gap-1">
                  <CheckCircle size={14} />
                  已应用
                </span>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openConfirmDialog(dateInfo);
                  }}
                  className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/30 transition-all"
                >
                  应用定价
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 趋势图表区域 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h4 className="font-semibold mb-4">价格趋势对比</h4>
        <div className="h-48 flex items-end justify-between gap-2 px-4">
          {dates.slice(0, 14).map((dateInfo, idx) => {
            const maxPrice = Math.max(...dates.map(d => Math.max(d.competitorAvg || 0, d.aiSuggestion)));
            const competitorHeight = dateInfo.competitorAvg ? (dateInfo.competitorAvg / maxPrice) * 100 : 0;
            const aiHeight = (dateInfo.aiSuggestion / maxPrice) * 100;
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5 h-36">
                  {/* 竞品价格柱 */}
                  {dateInfo.competitorAvg > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${competitorHeight}%` }}
                      transition={{ delay: idx * 0.05 }}
                      className="w-2 bg-purple-500/60 rounded-t"
                      title={`竞品: ¥${dateInfo.competitorAvg}`}
                    />
                  )}
                  {/* AI建议柱 */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${aiHeight}%` }}
                    transition={{ delay: idx * 0.05 }}
                    className="w-2 bg-neon-cyan/80 rounded-t"
                    title={`AI建议: ¥${dateInfo.aiSuggestion}`}
                  />
                </div>
                <span className="text-[10px] text-text-secondary">{dateInfo.display}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500/60 rounded"></span>
            竞品均价
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neon-cyan/80 rounded"></span>
            AI建议价
          </span>
        </div>
      </div>
      
      {/* 确认应用定价弹窗 */}
      {confirmDialog.isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={closeConfirmDialog}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-bg-secondary border border-border-color rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-neon-cyan" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">确认应用定价</h3>
            </div>

            <p className="text-text-secondary mb-6">
              您确定要将 <span className="text-text-primary font-medium">{confirmDialog.date}</span> 的房价设置为{' '}
              <span className="text-neon-cyan font-bold text-xl">¥{confirmDialog.suggestedPrice}</span> 吗？
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">当前售价</span>
                <span className="text-text-secondary">¥{currentRoomType?.currentPrice || currentRoomType?.floorPrice || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">竞品均价</span>
                <span className="text-purple-400">¥{confirmDialog.competitorAvg}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">建议价格</span>
                <span className="text-neon-cyan font-bold">¥{confirmDialog.suggestedPrice}</span>
              </div>
              <div className="h-px bg-border-color my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">价格变动</span>
                <span className={confirmDialog.suggestedPrice > (currentRoomType?.currentPrice || 0) ? 'text-neon-green' : confirmDialog.suggestedPrice < (currentRoomType?.currentPrice || 0) ? 'text-neon-amber' : 'text-text-secondary'}>
                  {confirmDialog.suggestedPrice > (currentRoomType?.currentPrice || 0) ? '+' : ''}
                  {((((confirmDialog.suggestedPrice - (currentRoomType?.currentPrice || 0)) / ((currentRoomType?.currentPrice || 1))) * 100)).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-bg-secondary border border-border-color text-text-secondary rounded-lg hover:bg-border-color/50 transition-all"
                onClick={closeConfirmDialog}
              >
                <XCircle className="w-4 h-4 inline mr-1" />
                取消
              </button>
              <button
                className="flex-1 px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all"
                onClick={confirmApplyPrice}
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                确认应用
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 审批管理视图
// ============================================

function ApprovalManagement() {
  const { 
    user, 
    pendingPriceApproval,
    auditLogs,
    approvePriceChange,
    rejectPriceChange
  } = useUnifiedStore();
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleAction = (type: 'approve' | 'reject') => {
    setAction(type);
    setShowConfirm(true);
  };

  const confirmAction = () => {
    if (action === 'approve') {
      approvePriceChange();
    } else {
      rejectPriceChange();
    }
    setShowConfirm(false);
    setAction(null);
  };

  // 从审计日志获取审批相关记录
  const approvalHistory = useMemo(() => {
    return auditLogs.filter(log => 
      log.action.includes('审批') || 
      log.action.includes('底价突破申请')
    ).slice(0, 10); // 最近10条
  }, [auditLogs]);

  // 员工视图：显示申请状态
  if (user.role === 'staff') {
    return (
      <div className="space-y-6">
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-neon-cyan" />
            我的申请
          </h3>
          
          {pendingPriceApproval ? (
            <div className="p-4 bg-neon-amber/10 border border-neon-amber/30 rounded-lg">
              <div className="flex items-center gap-2 text-neon-amber mb-2">
                <Clock size={16} />
                <span className="font-medium">申请待审批</span>
              </div>
              <div className="text-sm text-text-secondary">
                申请将价格从 <span className="text-text-primary">¥{pendingPriceApproval.currentPrice}</span> 调整至 <span className="text-text-primary">¥{pendingPriceApproval.requestedPrice}</span>
              </div>
              <div className="text-xs text-text-secondary mt-2">
                申请时间: {new Date(pendingPriceApproval.timestamp).toLocaleString('zh-CN')}
              </div>
              <div className="text-xs text-text-secondary">
                理由: {pendingPriceApproval.reason}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              暂无待审批申请
            </div>
          )}
        </div>
        
        {/* 审批流程说明 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="font-semibold mb-4">审批流程</h3>
          <div className="flex items-center justify-between">
            {['提交申请', '经理审批', '价格调整'].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  pendingPriceApproval ? 
                    idx <= 1 ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-bg-tertiary text-text-secondary'
                    : idx === 0 ? 'bg-neon-green/20 text-neon-green' : 'bg-bg-tertiary text-text-secondary'
                }`}>
                  {idx + 1}
                </div>
                <span className="ml-2 text-sm">{step}</span>
                {idx < 2 && (
                  <div className="mx-4 w-12 h-px bg-border-color" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 老板/经理视图：显示待审批列表和操作
  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield size={18} className="text-neon-cyan" />
          待审批申请
        </h3>
        
        {pendingPriceApproval ? (
          <div className="p-4 bg-neon-amber/10 border border-neon-amber/30 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-neon-amber mb-2">
                  <AlertCircle size={16} />
                  <span className="font-medium">价格调整申请</span>
                </div>
                <div className="text-sm text-text-secondary mb-1">
                  申请人: <span className="text-text-primary">{pendingPriceApproval.requestedBy}</span>
                </div>
                <div className="text-sm text-text-secondary mb-1">
                  当前价格: <span className="text-text-primary">¥{pendingPriceApproval.currentPrice}</span>
                  {' → '}
                  申请价格: <span className="text-neon-cyan">¥{pendingPriceApproval.requestedPrice}</span>
                </div>
                <div className="text-xs text-text-secondary mt-2">
                  申请理由: {pendingPriceApproval.reason}
                </div>
                
                {pendingPriceApproval.requestedBy === user.name && (
                  <div className="mt-2 text-xs text-neon-red">
                    ⚠️ 不能审批自己的申请
                  </div>
                )}
              </div>
              
              {pendingPriceApproval.requestedBy !== user.name && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('reject')}
                    className="px-4 py-2 rounded-lg border border-neon-red/30 text-neon-red hover:bg-neon-red/10 transition-all"
                  >
                    <XCircle size={16} className="inline mr-1" />
                    拒绝
                  </button>
                  <button
                    onClick={() => handleAction('approve')}
                    className="px-4 py-2 rounded-lg bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 transition-all"
                  >
                    <CheckCircle size={16} className="inline mr-1" />
                    同意
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            <CheckCircle size={48} className="mx-auto mb-4 text-neon-green opacity-50" />
            <p>暂无待审批申请</p>
          </div>
        )}
      </div>

      {/* 审批历史（真实审计日志） */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="font-semibold mb-4">近期审批记录</h3>
        <div className="space-y-2">
          {approvalHistory.length > 0 ? (
            approvalHistory.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center gap-2">
                  {log.action === '审批通过' ? (
                    <CheckCircle size={16} className="text-neon-green" />
                  ) : log.action === '审批拒绝' ? (
                    <XCircle size={16} className="text-neon-red" />
                  ) : (
                    <Clock size={16} className="text-neon-amber" />
                  )}
                  <span className="text-sm">{log.user}</span>
                  <span className="text-sm text-text-secondary truncate max-w-[200px]">{log.detail}</span>
                </div>
                <span className="text-xs text-text-secondary">{log.time}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <Clock size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无审批记录</p>
              <p className="text-xs mt-2">审批操作将自动记录到审计日志</p>
            </div>
          )}
        </div>
      </div>

      {/* 确认弹窗 */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-6 w-full max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                {action === 'approve' ? (
                  <CheckCircle size={48} className="mx-auto mb-4 text-neon-green" />
                ) : (
                  <XCircle size={48} className="mx-auto mb-4 text-neon-red" />
                )}
                <h3 className="text-lg font-semibold">
                  {action === 'approve' ? '确认同意' : '确认拒绝'}
                </h3>
                <p className="text-sm text-text-secondary mt-2">
                  {action === 'approve' 
                    ? `同意将价格调整为 ¥${pendingPriceApproval?.requestedPrice}？`
                    : '拒绝此价格调整申请？'
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border-color hover:bg-bg-tertiary transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                    action === 'approve'
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30'
                      : 'bg-neon-red/20 text-neon-red border border-neon-red/30 hover:bg-neon-red/30'
                  }`}
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

// ============================================
// 审批视图子组件
// ============================================
function ApprovalView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">价格审批</h1>
          <p className="text-sm text-text-secondary mt-1">
            实时定价调整申请的审批管理
          </p>
        </div>
      </div>
      <ApprovalManagement />
    </div>
  );
}

// ============================================
// 未来预测视图子组件（优化版）
// ============================================
function FutureView() {
  const [viewRange, setViewRange] = useState<7 | 14 | 30>(7);
  
  return (
    <div className="space-y-6">
      {/* 页面标题 - 统一风格 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">未来预测</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-neon-purple/10 text-neon-purple border border-neon-purple/30">
              {viewRange}天
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            AI基于市场趋势预测未来价格走势并提前规划
          </p>
        </div>
        
        {/* 时间范围选择 */}
        <div className="flex items-center gap-1 bg-bg-secondary rounded-xl p-1 border border-border-color">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setViewRange(days as 7 | 14 | 30)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                viewRange === days
                  ? 'bg-neon-purple/20 text-neon-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {days}天
            </button>
          ))}
        </div>
      </div>
      
      <FuturePricingPanel viewRange={viewRange} />
    </div>
  );
}

// ============================================
// 实时定价视图子组件
// ============================================
function PlatformView() {
  const { 
    currentHotel, 
    currentRoomType,
    currentMode,
    pendingPriceApproval,
    user,
    switchRoomType,
    approvePriceChange,
    rejectPriceChange,
    generateSmartAlerts,
    pricing,
    updateCurrentPrice,
  } = useUnifiedStore();
  
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    generateSmartAlerts();
  }, [currentRoomType?.id]);

  const adjustedFloorPrice = currentRoomType?.floorPrice || 150;
  const adjustedCeilingPrice = currentRoomType?.ceilingPrice || 1500;

  const platformConfig: Record<Platform, { name: string; color: string; coefficient: number; riskDeposit: number }> = {
    xianyu: { name: '闲鱼', color: '#FFDA44', coefficient: 1.08, riskDeposit: 0.15 },
    xiaohongshu: { name: '小红书', color: '#FF2442', coefficient: 1.0, riskDeposit: 0.20 },
    wechat: { name: '微信', color: '#07C160', coefficient: 0.95, riskDeposit: 0.08 },
  };

  const getPlatformPrice = (platform: Platform, base: number) => {
    return Math.round(base * platformConfig[platform].coefficient);
  };

  // 今日日期
  const todayStr = new Date().toISOString().split('T')[0];
  
  // 统一的竞品数据源（与市场情报一致）
  const hotelsByTier = useMemo(() => {
    if (!currentHotel) return { economy: [], comfort: [], premium: [] };
    return generateHotelsByTier(currentHotel.id, todayStr, []);
  }, [currentHotel?.id, todayStr]);
  
  // 为所有房型预计算AI建议价（基于当前定价模式，与详情页一致）
  const roomTypeRecommendations = useMemo(() => {
    if (!currentHotel || hotelsByTier.economy.length === 0) return {};
    
    const result: Record<string, { suggestedPrice: number; competitorMin: number; competitorMax: number; competitorAvg: number; trend: 'up' | 'down' | 'stable'; percentChange: string }> = {};
    
    // 使用酒店自身的档次获取同类竞品
    const ourTier = currentHotel?.tier;
    const tierHotels = ourTier ? hotelsByTier[ourTier] || [] : [];
    
    currentHotel?.roomTypes?.forEach(roomType => {
      const roomCategory = getRoomTypeCategory(roomType.name) as 'budget' | 'standard' | 'suite';
      
      // 获取同类竞品酒店的该房型价格
      const prices = (tierHotels || [])
        .map(h => h.prices?.[roomCategory]?.price)
        .filter((p): p is number => p !== undefined);
      
      const competitorMin = prices.length > 0 ? Math.min(...prices) : 0;
      const competitorMax = prices.length > 0 ? Math.max(...prices) : 0;
      const competitorAvg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      
      // 根据当前定价模式计算锚定价格（与详情页一致）
      let anchorPrice: number;
      switch (currentMode) {
        case 'clearance':
          anchorPrice = Math.round(competitorMin * 0.95);
          break;
        case 'scalper':
          anchorPrice = Math.round(competitorMax * 1.1);
          break;
        case 'dynamic':
        default:
          anchorPrice = Math.round((competitorMin + competitorMax) / 2);
          break;
      }
      const suggestedPrice = Math.max(roomType.floorPrice, Math.min(roomType.ceilingPrice, anchorPrice));
      const basePrice = roomType.currentPrice || roomType.floorPrice;
      const priceDiff = suggestedPrice - basePrice;
      const percentChange = ((priceDiff / basePrice) * 100).toFixed(1);
      const trend = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'stable';
      
      result[roomType.id] = {
        suggestedPrice,
        competitorMin,
        competitorMax,
        competitorAvg,
        trend,
        percentChange,
      };
    });
    
    return result;
  }, [currentHotel, hotelsByTier, currentMode]);
  
  // 进入房型详情
  const enterRoomDetail = (roomTypeId: string) => {
    switchRoomType(roomTypeId);
    setViewMode('detail');
  };
  
  // 返回概览
  const backToOverview = () => {
    setViewMode('overview');
  };
  
  // 概览模式：显示所有房型卡片
  if (viewMode === 'overview') {
    return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">实时定价</h1>
            <p className="text-sm text-text-secondary mt-1">
              基于AI建议的实时多平台价格管理与调整
            </p>
          </div>
        </div>
        
        {/* 全房型概览卡片 */}
        <div className="grid grid-cols-1 gap-4">
          {currentHotel?.roomTypes?.map((roomType) => {
            // AI建议价（与详情页一致）
            const roomCategory = getRoomTypeCategory(roomType.name) as 'budget' | 'standard' | 'suite';
            const recommendation = roomTypeRecommendations[roomType.id];
            const suggestedPrice = recommendation?.suggestedPrice || Math.round((roomType.floorPrice + roomType.ceilingPrice) / 2);
            
            const basePrice = pricing?.roomBasePrices?.[roomType.id] ?? Math.round((roomType.floorPrice + roomType.ceilingPrice) / 2);
            
            // 是否需要应用建议
            const shouldApply = suggestedPrice !== basePrice;
            
            return (
              <motion.div
                key={roomType.id}
                className="bg-bg-secondary rounded-xl border border-border-color p-5 hover:border-neon-cyan/50 transition-all group"
                whileHover={{ scale: 1.005 }}
              >
                {/* 第一行：房型信息 + 快捷操作 */}
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => enterRoomDetail(roomType.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                      <Bed className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{roomType.name}</h3>
                      <span className="text-xs text-text-secondary">
                        底价 ¥{roomType.floorPrice} · 天花板 ¥{roomType.ceilingPrice}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">
                      {roomCategory === 'budget' ? '经济房' : roomCategory === 'suite' ? '套房' : '标准房'}
                    </span>
                  </div>
                  
                  {/* 快捷应用按钮 */}
                  <div className="flex items-center gap-2">
                    {shouldApply && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // 先切换到该房型，再应用价格
                          switchRoomType(roomType.id);
                          setTimeout(() => updateCurrentPrice(suggestedPrice, '概览页快捷应用'), 50);
                        }}
                        className="px-3 py-1.5 text-xs bg-neon-cyan text-bg-primary rounded-lg hover:bg-neon-cyan/90 transition-all flex items-center gap-1 font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        应用AI建议
                      </button>
                    )}
                    <button
                      onClick={() => enterRoomDetail(roomType.id)}
                      className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center group-hover:bg-neon-cyan/20 transition-all"
                    >
                      <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-neon-cyan" />
                    </button>
                  </div>
                </div>
                
                {/* 第二行：三大价格横向大字显示 + 趋势 */}
                <div className="grid grid-cols-3 gap-4">
                  {/* 灵活渠道基准价 */}
                  <div className="text-center p-3 rounded-lg bg-[#FFB800]/5 border border-[#FFB800]/20">
                    <div className="text-xs text-[#FFB800]/70 mb-1">灵活渠道基准价</div>
                    <div className="text-2xl font-bold text-[#FFB800] font-mono">¥{basePrice}</div>
                  </div>
                  
                  {/* AI建议价 - 带趋势指示 */}
                  <div className={`text-center p-3 rounded-lg border ${shouldApply ? 'bg-neon-cyan/10 border-neon-cyan/40' : 'bg-neon-cyan/5 border-neon-cyan/20'}`}>
                    <div className="text-xs text-neon-cyan/70 mb-1">AI建议价</div>
                    <div className="text-2xl font-bold text-neon-cyan font-mono">¥{suggestedPrice}</div>
                    {recommendation && recommendation.trend !== 'stable' && (
                      <div className={`text-xs mt-1 ${recommendation.trend === 'up' ? 'text-[#00E396]' : 'text-[#FFB800]'}`}>
                        {recommendation.trend === 'up' ? '↑ +' : '↓ '}{recommendation.percentChange}%
                      </div>
                    )}
                    {shouldApply && (
                      <div className="text-[10px] text-neon-cyan mt-1 animate-pulse">
                        待应用
                      </div>
                    )}
                  </div>
                  
                  {/* 同类竞品 */}
                  <div className="text-center p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <div className="text-xs text-purple-400/70 mb-1">同类竞品</div>
                    <div className="text-2xl font-bold text-purple-400 font-mono">
                      {recommendation ? `¥${recommendation.competitorMin}-¥${recommendation.competitorMax}` : '-'}
                    </div>
                    {recommendation && (
                      <div className="text-xs text-text-muted mt-1">
                        均价 ¥{recommendation.competitorAvg}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* 快速操作提示 */}
        <div className="text-center text-sm text-text-secondary">
          点击上方房型卡片进入详细定价页面
        </div>
      </div>
    );
  }
  
  // 详情模式：显示单个房型的完整定价信息
  return (
    <div className="space-y-6">
      {/* 页面标题 + 返回按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={backToOverview}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            返回概览
          </button>
          <div>
            <h1 className="text-2xl font-bold">{currentRoomType?.name} - 实时定价详情</h1>
            <p className="text-sm text-text-secondary mt-1">
              基于AI建议的实时多平台价格精细化管理
            </p>
          </div>
        </div>
        
        {/* 房型切换（仅显示其他房型） */}
        <div className="flex items-center gap-2">
          {currentHotel?.roomTypes
            ?.filter(r => r.id !== currentRoomType?.id)
            .map((room) => (
              <button
                key={room.id}
                onClick={() => enterRoomDetail(room.id)}
                className="px-3 py-1.5 rounded-md text-sm bg-bg-secondary border border-border-color text-text-secondary hover:border-neon-cyan/50 hover:text-text-primary transition-all"
              >
                切换到{room.name}
              </button>
            ))}
        </div>
      </div>

      {/* ========== 第一行：AI建议 + 平台价格 左右并排 ========== */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：AI定价建议（占2列） */}
        <div className="col-span-2">
          <AIRecommendation />
        </div>
        
        {/* 右侧：平台价格（占1列，垂直堆叠） */}
        <div className="space-y-3">
          <div className="text-sm text-text-secondary mb-2">各渠道售价</div>
          {(Object.keys(platformConfig) as Platform[]).map((platform) => {
            const config = platformConfig[platform];
            const platformPrice = getPlatformPrice(platform, currentRoomType?.currentPrice || 0);
            
            return (
              <motion.div
                key={platform}
                className="flex items-center justify-between p-3 rounded-lg border bg-bg-secondary/50"
                style={{ borderColor: config.color + '40' }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(var(--border-color), 0.5)' }}
              >
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={platform} size={24} />
                  <span className="text-sm" style={{ color: config.color }}>
                    {config.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono" style={{ color: config.color }}>
                    ¥{platformPrice}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    系数 {config.coefficient}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* ========== 底价智能建议（浮动通知样式） ========== */}
      <FloorPriceSuggestion />
      
      {/* ========== 第二行：价格范围 + 智能定价助手 + 调价面板 三栏并排 ========== */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：价格范围（占1列）- 添加更多辅助信息 */}
        <div className="space-y-3">
          <div className="text-sm text-text-secondary mb-2">价格区间</div>
          {/* 底价红线 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-neon-red/30 bg-bg-secondary">
            <div>
              <div className="text-xs text-neon-red mb-1">底价红线</div>
              <div className="text-xl font-mono font-bold text-neon-red">
                ¥{adjustedFloorPrice}
              </div>
            </div>
            <div className="text-xs text-text-secondary text-right">
              最低<br/>售价
            </div>
          </div>
          
          {/* 灵活渠道基准价 - 统一金色 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#FFB800]/30 bg-bg-secondary">
            <div>
              <div className="text-xs text-[#FFB800] mb-1">灵活渠道基准价</div>
              <div className="text-xl font-mono font-bold text-[#FFB800]">
                ¥{currentRoomType?.currentPrice || 0}
              </div>
            </div>
            <div className="text-xs text-text-secondary text-right">
              影响三<br/>平台售价
            </div>
          </div>
          
          {/* 天花板价 */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-neon-cyan/30 bg-bg-secondary">
            <div>
              <div className="text-xs text-neon-cyan mb-1">天花板价</div>
              <div className="text-xl font-mono font-bold text-neon-cyan">
                ¥{adjustedCeilingPrice}
              </div>
            </div>
            <div className="text-xs text-text-secondary text-right">
              最高<br/>售价
            </div>
          </div>
          
          {/* 新增：调价空间指示器 */}
          <div className="p-3 rounded-xl bg-bg-secondary border border-border-color">
            <div className="text-xs text-text-secondary mb-2">当前调价空间</div>
            <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-neon-red via-[#FFB800] to-neon-cyan rounded-full"
                style={{ 
                  left: '0%',
                  right: '0%'
                }}
              />
              {/* 当前价格指示点 */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[#FFB800] shadow-lg"
                style={{ 
                  left: `${((currentRoomType?.currentPrice || adjustedFloorPrice) - adjustedFloorPrice) / (adjustedCeilingPrice - adjustedFloorPrice) * 100}%`
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-text-secondary">
              <span>底价</span>
              <span className="text-[#FFB800]">当前</span>
              <span>天花板</span>
            </div>
          </div>
        </div>
        
        {/* 右侧：智能定价助手 + 调价面板 左右并排（占2列） */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <SmartPricingPanel />
          <PricingPanel />
        </div>
      </div>

      {/* 调价审批弹窗 - 仅老板/经理可见 */}
      {user?.role !== 'staff' && (
        <PriceApprovalModal
          isOpen={showApprovalModal || !!pendingPriceApproval}
          onClose={() => setShowApprovalModal(false)}
          onApprove={() => {
            approvePriceChange();
            setShowApprovalModal(false);
          }}
          onReject={() => {
            rejectPriceChange();
            setShowApprovalModal(false);
          }}
          approval={pendingPriceApproval}
        />
      )}
    </div>
  );
}

// ============================================
// 主页面 - 只负责路由分发
// ============================================

// ============================================
// 主页面 - 只负责路由分发
// ============================================
export default function PricingDecision() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'platform' | 'approval' | 'future' | null;
  const activeTab = tabFromUrl || 'platform';

  // 根据标签渲染对应的子组件
  switch (activeTab) {
    case 'approval':
      return <ApprovalView />;
    case 'future':
      return <FutureView />;
    case 'platform':
    default:
      return <PlatformView />;
  }
}
