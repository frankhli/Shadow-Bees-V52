/**
 * Shadow-Bees V52 - 本周/本月/自定义视图
 * 经营复盘：渠道ROI、预订行为、内容效率、库存周转、定价模式
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, 
  Clock, Layers, Sparkles, BarChart3, Target,
  ArrowRightLeft, Percent, Building2, Bed,
  CreditCard, CheckCircle, Home, Receipt, RefreshCw, AlertCircle
} from 'lucide-react';
import type { OrderStatus } from '@/types';
import type { Hotel, RoomType, Transaction, ContentItem, Inventory } from '@/types';
import { calculateFinancialStats, calculateChangeRate } from '@/utils/helpers';
import { PlatformLogo } from '@/components/PlatformLogo';

interface WeekMonthViewProps {
  currentHotel: Hotel;
  currentRoomType: RoomType;
  transactions: Transaction[];
  contents: ContentItem[];
  inventory: Inventory;
  range: 'week' | 'month' | 'custom';
  dateRange?: { start: Date; end: Date };
  compareRange?: { start: Date; end: Date };
  onSwitchRoomType: (roomTypeId: string) => void;
}

const platformConfig: Record<string, { name: string; color: string; key: 'xianyu' | 'xiaohongshu' | 'wechat' }> = {
  xianyu: { name: '闲鱼', color: '#00F0FF', key: 'xianyu' },
  xiaohongshu: { name: '小红书', color: '#FF0080', key: 'xiaohongshu' },
  wechat: { name: '微信', color: '#07C160', key: 'wechat' },
};

// 关键指标卡
function MetricCard({ title, value, subtitle, trend, trendValue, icon: Icon, color }: {
  title: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: any;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary rounded-xl p-5 border border-border-color"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{title}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-2xl font-bold font-mono mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-text-secondary mb-2">{subtitle}</div>
      <div className={`flex items-center gap-1 text-xs ${
        trend === 'up' ? 'text-[#00E396]' : 
        trend === 'down' ? 'text-[#FF4560]' : 
        'text-text-secondary'
      }`}>
        {trend === 'up' && <TrendingUp size={12} />}
        {trend === 'down' && <TrendingDown size={12} />}
        <span>{trendValue}</span>
      </div>
    </motion.div>
  );
}

export function WeekMonthView({
  currentHotel,
  currentRoomType,
  transactions,
  contents,
  inventory,
  range,
  dateRange,
  compareRange,
  onSwitchRoomType,
}: WeekMonthViewProps) {
  // 计算日期范围
  const effectiveRange = useMemo(() => {
    if (dateRange) return dateRange;
    
    const end = new Date();
    const start = new Date();
    
    if (range === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
    } else if (range === 'month') {
      start.setDate(1);
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, [range, dateRange]);

  // 对比期日期范围
  const effectiveCompareRange = useMemo(() => {
    if (compareRange) return compareRange;
    
    const days = Math.ceil((effectiveRange.end.getTime() - effectiveRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const compareEnd = new Date(effectiveRange.start);
    compareEnd.setDate(compareEnd.getDate() - 1);
    const compareStart = new Date(compareEnd);
    compareStart.setDate(compareStart.getDate() - days);
    
    return { start: compareStart, end: compareEnd };
  }, [effectiveRange, compareRange]);

  // 过滤时间范围内的交易
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.timestamp) return false;
      const date = new Date(t.timestamp);
      return date >= effectiveRange.start && date <= effectiveRange.end;
    });
  }, [transactions, effectiveRange]);

  // 对比期交易
  const compareTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.timestamp) return false;
      const date = new Date(t.timestamp);
      return date >= effectiveCompareRange.start && date <= effectiveCompareRange.end;
    });
  }, [transactions, effectiveCompareRange]);

  // 过滤内容（发布时间在范围内）
  const filteredContents = useMemo(() => {
    return contents.filter(c => {
      const date = new Date(c.publishedAt || c.createdAt);
      return date >= effectiveRange.start && date <= effectiveRange.end;
    });
  }, [contents, effectiveRange]);

  // ========== 核心KPI统计（使用统一财务口径）==========
  const kpis = useMemo(() => {
    // 本期数据
    const currentStats = calculateFinancialStats(filteredTransactions);
    // 对比期数据
    const compareStats = calculateFinancialStats(compareTransactions);
    
    // 计算变化率
    const gmvChange = calculateChangeRate(currentStats.realtimeGMV, compareStats.realtimeGMV);
    const orderChange = calculateChangeRate(currentStats.realtimeOrders, compareStats.realtimeOrders);
    
    return { 
      gmv: currentStats.realtimeGMV, 
      orders: currentStats.realtimeOrders, 
      avgPrice: currentStats.avgPrice,
      confirmedGMV: currentStats.confirmedGMV,
      confirmedOrders: currentStats.confirmedOrders,
      gmvChange: gmvChange.value,
      gmvChangeValid: gmvChange.isValid,
      orderChange: orderChange.value,
      orderChangeValid: orderChange.isValid,
    };
  }, [filteredTransactions, compareTransactions]);

  // ========== 渠道ROI统计（使用统一财务口径）==========
  const channelStats = useMemo(() => {
    return Object.entries(platformConfig).map(([key, config]) => {
      const channelTrans = filteredTransactions.filter(t => t.platform === key);
      const channelContents = filteredContents.filter(c => c.platform === key);
      
      // 使用统一的财务统计
      const channelStats = calculateFinancialStats(channelTrans);
      const contentCount = channelContents.length;
      // 转化率 = 成交数 / 发布内容数
      const conversionRate = contentCount > 0 ? ((channelStats.realtimeOrders / contentCount) * 100).toFixed(1) : '0';
      
      return {
        platform: key,
        name: config.name,
        color: config.color,
        revenue: channelStats.realtimeGMV,
        orders: channelStats.realtimeOrders,
        avgPrice: channelStats.avgPrice,
        contentCount,
        conversionRate,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, filteredContents]);

  // ========== 预订行为分析 ==========
  const bookingBehavior = useMemo(() => {
    const withDates = filteredTransactions.filter(t => t.checkInDate && t.checkOutDate);
    
    // 提前预订天数统计
    const advanceDays: Record<number, number> = {};
    // 入住时长统计
    const stayNights: Record<number, number> = {};
    
    withDates.forEach(t => {
      const txnDate = new Date(t.timestamp);
      const checkIn = new Date(t.checkInDate!);
      const checkOut = new Date(t.checkOutDate!);
      
      const daysAhead = Math.round((checkIn.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
      const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      advanceDays[daysAhead] = (advanceDays[daysAhead] || 0) + 1;
      stayNights[nights] = (stayNights[nights] || 0) + 1;
    });
    
    // 平均提前天数
    const totalAdvance = withDates.reduce((sum, t) => {
      const txnDate = new Date(t.timestamp);
      const checkIn = new Date(t.checkInDate!);
      return sum + Math.round((checkIn.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    const avgAdvanceDays = withDates.length > 0 ? Math.round(totalAdvance / withDates.length) : 0;
    
    // 平均入住晚数
    const totalNights = withDates.reduce((sum, t) => {
      const checkIn = new Date(t.checkInDate!);
      const checkOut = new Date(t.checkOutDate!);
      return sum + Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    const avgStayNights = withDates.length > 0 ? (totalNights / withDates.length).toFixed(1) : '0';
    
    // 渠道预订习惯
    const channelHabits = Object.entries(platformConfig).map(([key, config]) => {
      const channelWithDates = withDates.filter(t => t.platform === key);
      if (channelWithDates.length === 0) return null;
      
      const avgDays = channelWithDates.reduce((sum, t) => {
        const txnDate = new Date(t.timestamp);
        const checkIn = new Date(t.checkInDate!);
        return sum + Math.round((checkIn.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / channelWithDates.length;
      
      let habit = '当天预订';
      if (avgDays >= 1 && avgDays < 3) habit = '提前1-2天';
      else if (avgDays >= 3 && avgDays < 7) habit = '提前3-6天';
      else if (avgDays >= 7) habit = '提前一周+';
      
      return { platform: key, name: config.name, color: config.color, habit, avgDays: Math.round(avgDays) };
    }).filter(Boolean);
    
    return { 
      advanceDays, 
      stayNights, 
      avgAdvanceDays, 
      avgStayNights, 
      channelHabits,
      totalAnalyzed: withDates.length 
    };
  }, [filteredTransactions]);

  // ========== 订单状态流转统计 ==========
  const orderStatusFlow = useMemo(() => {
    // 统计各状态订单数
    const statusCounts: Record<OrderStatus, number> = {
      pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
      refund_pending: 0, cancelled: 0,
    };
    
    filteredTransactions.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    
    // 计算流转率（已成交到已入住的转化率）
    const totalPaidOrAfter = statusCounts.paid + statusCounts.checked_in + statusCounts.checked_out + statusCounts.invoiced;
    const paidToCheckedInRate = totalPaidOrAfter > 0 
      ? ((statusCounts.checked_in + statusCounts.checked_out + statusCounts.invoiced) / totalPaidOrAfter * 100).toFixed(1)
      : '0';
    
    return {
      counts: statusCounts,
      total: filteredTransactions.length,
      paidToCheckedInRate,
    };
  }, [filteredTransactions]);

  // 正常订单流程状态配置（5个，不含退款）
  const statusFlowConfig: { status: Exclude<OrderStatus, 'refunded'>; label: string; color: string; icon: any; description: string }[] = [
    { status: 'pending', label: '待确认', color: '#F59E0B', icon: AlertCircle, description: '等待商家确认' },
    { status: 'paid', label: '已成交', color: '#3B82F6', icon: CreditCard, description: '已付款待入住' },
    { status: 'checked_in', label: '已入住', color: '#8B5CF6', icon: Home, description: '客人已到店' },
    { status: 'checked_out', label: '已离店', color: '#6366F1', icon: CheckCircle, description: '等待开票' },
    { status: 'invoiced', label: '已开票', color: '#10B981', icon: Receipt, description: '流程完成' },
  ];
  
  // 异常数据统计
  const abnormalStats = useMemo(() => {
    const refundedCount = orderStatusFlow.counts.refunded;
    const totalPaid = orderStatusFlow.counts.paid + orderStatusFlow.counts.checked_in + 
                      orderStatusFlow.counts.checked_out + orderStatusFlow.counts.invoiced + refundedCount;
    const refundRate = totalPaid > 0 ? ((refundedCount / totalPaid) * 100).toFixed(1) : '0';
    
    // 待确认超24小时的（如果有创建时间）
    const pendingTimeout = filteredTransactions.filter(t => {
      if (t.status !== 'pending') return false;
      const txnTime = new Date(t.timestamp).getTime();
      const now = Date.now();
      return (now - txnTime) > 24 * 60 * 60 * 1000;
    }).length;
    
    return {
      refundedCount,
      refundRate,
      pendingTimeout,
    };
  }, [orderStatusFlow, filteredTransactions]);

  // ========== 内容效率统计 ==========
  const contentEfficiency = useMemo(() => {
    const totalPublished = filteredContents.length;
    const totalInquiries = filteredContents.reduce((sum, c) => sum + (c.performance?.inquiries || 0), 0);
    const totalConversions = filteredTransactions.length;
    
    // 内容→转化漏斗
    const inquiryRate = totalPublished > 0 ? ((totalInquiries / totalPublished) * 100).toFixed(1) : '0';
    const conversionRate = totalInquiries > 0 ? ((totalConversions / totalInquiries) * 100).toFixed(1) : '0';
    
    // 平均每个内容带来的收益
    const revenuePerContent = totalPublished > 0 ? Math.round(kpis.gmv / totalPublished) : 0;
    
    return { totalPublished, totalInquiries, totalConversions, inquiryRate, conversionRate, revenuePerContent };
  }, [filteredContents, filteredTransactions, kpis.gmv]);

  // ========== 库存周转统计 ==========
  const inventoryTurnover = useMemo(() => {
    const roomType = currentRoomType;
    const roomInv = inventory.byRoomType[roomType.id];
    
    if (!roomInv) return null;
    
    // 当前积压
    const backlogged = roomInv.available;
    // 本期内售出
    const soldInPeriod = filteredTransactions.filter(t => t.roomType === roomType.name).length;
    // 周转率
    const turnoverRate = roomInv.total > 0 ? ((soldInPeriod / roomInv.total) * 100).toFixed(1) : '0';
    // 避免的空房损失（按底价计算）
    const avoidedLoss = soldInPeriod * roomType.floorPrice;
    
    return { backlogged, soldInPeriod, turnoverRate, avoidedLoss, total: roomInv.total };
  }, [inventory, currentRoomType, filteredTransactions]);

  // ========== 定价模式效果（通过价格区间反推）==========
  const pricingModeStats = useMemo(() => {
    const floorPrice = currentRoomType.floorPrice;
    const ceilingPrice = currentRoomType.ceilingPrice;
    const midPrice = (floorPrice + ceilingPrice) / 2;
    
    // 尾货模式：底价+20%以内
    const clearance = filteredTransactions.filter(t => {
      return t.roomType === currentRoomType.name && t.price <= floorPrice * 1.2;
    });
    // 黄牛模式：高于中价
    const scalper = filteredTransactions.filter(t => {
      return t.roomType === currentRoomType.name && t.price > midPrice;
    });
    // 动态定价：中间区间
    const dynamic = filteredTransactions.filter(t => {
      return t.roomType === currentRoomType.name && t.price > floorPrice * 1.2 && t.price <= midPrice;
    });
    
    return [
      { mode: '尾货模式', count: clearance.length, revenue: clearance.reduce((s, t) => s + t.price, 0), color: '#FF4560' },
      { mode: '黄牛模式', count: scalper.length, revenue: scalper.reduce((s, t) => s + t.price, 0), color: '#00E396' },
      { mode: '动态定价', count: dynamic.length, revenue: dynamic.reduce((s, t) => s + t.price, 0), color: '#00F0FF' },
    ].sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, currentRoomType]);

  const label = range === 'week' ? '本周' : range === 'month' ? '本月' : '本期';
  const compareLabel = range === 'week' ? '较上周' : range === 'month' ? '较上月' : '较上期';

  return (
    <div className="space-y-6">
      {/* ========== 【全店汇总层】- 不受房型影响 ========== */}
      <div className="flex items-center gap-2 text-xs text-text-secondary border-b border-border-color pb-2">
        <Building2 size={14} className="text-neon-cyan" />
        <span>全店汇总 · 所有房型数据合计</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">不受房型切换影响</span>
      </div>

      {/* 核心KPI */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title={`${label}GMV`}
          value={`¥${kpis.gmv.toLocaleString()}`}
          subtitle={`${kpis.orders}笔订单`}
          trend={!kpis.gmvChangeValid ? 'neutral' : Number(kpis.gmvChange.replace(/[+\-%]/g, '')) >= 0 ? 'up' : 'down'}
          trendValue={`${compareLabel} ${kpis.gmvChangeValid ? kpis.gmvChange : '数据不足'}`}
          icon={DollarSign}
          color="#00F0FF"
        />
        <MetricCard
          title={`${label}订单`}
          value={`${kpis.orders}`}
          subtitle="成交数"
          trend={!kpis.orderChangeValid ? 'neutral' : Number(kpis.orderChange.replace(/[+\-%]/g, '')) >= 0 ? 'up' : 'down'}
          trendValue={`${compareLabel} ${kpis.orderChangeValid ? kpis.orderChange : '数据不足'}`}
          icon={BarChart3}
          color="#00E396"
        />
        <MetricCard
          title="平均客单价"
          value={`¥${kpis.avgPrice}`}
          subtitle="综合均价"
          trend="neutral"
          trendValue="--"
          icon={Target}
          color="#FFB800"
        />
        <MetricCard
          title="内容转化"
          value={`${contentEfficiency.conversionRate}%`}
          subtitle={`${contentEfficiency.totalPublished}条内容 → ${contentEfficiency.totalConversions}单`}
          trend="neutral"
          trendValue={`咨询率 ${contentEfficiency.inquiryRate}%`}
          icon={Sparkles}
          color="#A855F7"
        />
      </div>

      {/* 渠道ROI + 预订行为 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 渠道ROI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Percent size={18} className="text-neon-cyan" />
            渠道ROI
          </h3>
          <div className="space-y-3">
            {channelStats.map((stat) => (
              <div key={stat.platform} className="p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PlatformLogo platform={stat.platform as 'xianyu' | 'xiaohongshu' | 'wechat'} size={20} />
                    <span className="text-text-primary font-medium">{stat.name}</span>
                  </div>
                  <span className="text-sm font-mono" style={{ color: stat.color }}>
                    ¥{stat.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-text-secondary">{stat.orders}单</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">均价¥{stat.avgPrice}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#FFB800]">转化{stat.conversionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 预订行为分析 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-neon-magenta" />
            预订行为画像
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-bg-tertiary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">平均提前预订</div>
              <div className="text-xl font-bold text-text-primary">{bookingBehavior.avgAdvanceDays}天</div>
            </div>
            <div className="p-3 bg-bg-tertiary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">平均入住时长</div>
              <div className="text-xl font-bold text-text-primary">{bookingBehavior.avgStayNights}晚</div>
            </div>
          </div>

          <div className="space-y-2">
            {bookingBehavior.channelHabits?.map((habit) => (
              <div key={habit!.platform} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={habit!.platform as 'xianyu' | 'xiaohongshu' | 'wechat'} size={16} />
                  <span className="text-text-secondary">{habit!.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary">{habit!.habit}</span>
                  <span className="text-xs text-text-secondary">(平均{habit!.avgDays}天)</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-text-secondary text-right">
            基于{bookingBehavior.totalAnalyzed}笔有日期数据
          </div>
        </motion.div>
      </div>

      {/* 内容效率漏斗 - 全店汇总层 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-secondary rounded-xl p-5 border border-border-color"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Layers size={18} className="text-[#FFB800]" />
          内容效率漏斗
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">全店</span>
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-bg-tertiary rounded-lg text-center">
            <div className="text-xs text-text-secondary mb-1">发布内容</div>
            <div className="text-2xl font-bold text-[#00F0FF]">{contentEfficiency.totalPublished}</div>
            <div className="text-xs text-text-secondary mt-1">条</div>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-lg text-center">
            <div className="text-xs text-text-secondary mb-1">获得咨询</div>
            <div className="text-2xl font-bold text-[#FFB800]">{contentEfficiency.totalInquiries}</div>
            <div className="text-xs text-text-secondary mt-1">咨询率 {contentEfficiency.inquiryRate}%</div>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-lg text-center">
            <div className="text-xs text-text-secondary mb-1">成交转化</div>
            <div className="text-2xl font-bold text-[#00E396]">{contentEfficiency.totalConversions}</div>
            <div className="text-xs text-text-secondary mt-1">转化率 {contentEfficiency.conversionRate}%</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border-color">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">平均每条内容收益</span>
            <span className="text-[#FFB800] font-mono">¥{contentEfficiency.revenuePerContent}</span>
          </div>
        </div>
      </motion.div>

      {/* 订单状态流转 - 全店汇总层 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-bg-secondary rounded-xl p-5 border border-border-color"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} className="text-neon-purple" />
          订单状态流转
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">全店</span>
          <span className="text-xs text-text-secondary font-normal ml-2">
            共{orderStatusFlow.total}笔订单 · 入住转化率 {orderStatusFlow.paidToCheckedInRate}%
          </span>
        </h3>
        
        {/* 状态流转漏斗图 */}
        <div className="relative">
          {/* 流程线 */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border-color -translate-y-1/2 hidden md:block" />
          
          <div className="grid grid-cols-5 gap-3 relative">
            {statusFlowConfig.map((item, index) => {
              const Icon = item.icon;
              const count = orderStatusFlow.counts[item.status];
              const percentage = orderStatusFlow.total > 0 ? Math.round((count / orderStatusFlow.total) * 100) : 0;
              
              return (
                <div key={item.status} className="relative">
                  {/* 状态卡片 */}
                  <div 
                    className="p-3 rounded-lg border text-center transition-all hover:scale-105"
                    style={{ 
                      background: `${item.color}10`,
                      borderColor: `${item.color}30`,
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ background: `${item.color}20` }}
                    >
                      <Icon size={20} style={{ color: item.color }} />
                    </div>
                    <div className="text-xs text-text-secondary mb-1">{item.label}</div>
                    <div className="text-xl font-bold font-mono" style={{ color: item.color }}>
                      {count}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1">
                      占比 {percentage}%
                    </div>
                  </div>
                  
                  {/* 箭头（除了最后一个） */}
                  {index < statusFlowConfig.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                      <div className="text-text-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
      </motion.div>

      {/* 异常数据统计 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-bg-secondary rounded-xl p-5 border border-border-color"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400" />
          异常数据监控
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">全店</span>
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {/* 退款统计 */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-red-400" />
                <span className="text-sm text-red-400">退款订单</span>
              </div>
              <span className="text-2xl font-bold text-red-400">{abnormalStats.refundedCount}</span>
            </div>
            <div className="text-xs text-text-secondary">
              退款率 {abnormalStats.refundRate}% · 基于成交订单
            </div>
          </div>
          
          {/* 待确认超时 */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-yellow-400" />
                <span className="text-sm text-yellow-400">待确认超24h</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{abnormalStats.pendingTimeout}</span>
            </div>
            <div className="text-xs text-text-secondary">
              需及时处理避免流失
            </div>
          </div>
          
          {/* 整体健康度 */}
          <div className="p-4 bg-bg-tertiary border border-border-color rounded-lg">
            <div className="text-sm text-text-secondary mb-2">订单健康度</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.max(0, 100 - Number(abnormalStats.refundRate) * 2 - abnormalStats.pendingTimeout * 5)}%`,
                    background: Number(abnormalStats.refundRate) < 5 && abnormalStats.pendingTimeout === 0 
                      ? '#10B981' 
                      : Number(abnormalStats.refundRate) < 10 
                        ? '#F59E0B' 
                        : '#EF4444'
                  }}
                />
              </div>
              <span className="text-xs font-mono">
                {Number(abnormalStats.refundRate) < 5 && abnormalStats.pendingTimeout === 0 
                  ? '健康' 
                  : Number(abnormalStats.refundRate) < 10 
                    ? '一般' 
                    : '需关注'}
              </span>
            </div>
            <div className="text-[10px] text-text-secondary mt-2">
              基于退款率和待确认时效
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========== 【房型明细层】- 切换房型影响以下数据 ========== */}
      <div className="pt-4 border-t-2 border-dashed border-border-color">
        {/* 房型切换控制器 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Bed size={14} className="text-neon-purple" />
            <span>房型明细</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple">切换房型影响下方数据</span>
          </div>
          
          {/* 房型切换按钮组 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary mr-2">选择房型:</span>
            {currentHotel?.roomTypes.map((room) => (
              <button
                key={room.id}
                onClick={() => onSwitchRoomType(room.id)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                  room.id === currentRoomType?.id
                    ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/50'
                    : 'bg-bg-tertiary text-text-secondary border-border-color hover:border-neon-purple/30'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>

        {/* 当前选中房型提示 */}
        <div className="mb-4 p-3 bg-neon-purple/5 border border-neon-purple/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">当前查看:</span>
              <span className="text-sm text-neon-purple">{currentRoomType.name}</span>
              <span className="text-xs text-text-secondary">
                底价¥{currentRoomType.floorPrice} · 库存{inventory.byRoomType[currentRoomType.id]?.total || 0}间
              </span>
            </div>
            <div className="text-xs text-text-secondary">
              底价¥{currentRoomType.floorPrice} ~ 上限¥{currentRoomType.ceilingPrice}
            </div>
          </div>
        </div>
      </div>

      {/* 库存周转 + 定价策略效果 - 房型明细层（并排布局） */}
      <div className="grid grid-cols-2 gap-4">
        {/* 库存周转 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[#00E396]" />
            库存周转
            <span className="text-xs px-2 py-0.5 rounded bg-[#00E396]/10 text-[#00E396]">
              {currentRoomType.name}
            </span>
          </h3>
          {inventoryTurnover ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-bg-tertiary rounded-lg text-center">
                  <div className="text-xs text-text-secondary mb-1">本期售出</div>
                  <div className="text-xl font-bold text-[#00E396]">{inventoryTurnover.soldInPeriod}间</div>
                </div>
                <div className="p-3 bg-bg-tertiary rounded-lg text-center">
                  <div className="text-xs text-text-secondary mb-1">周转率</div>
                  <div className="text-xl font-bold text-text-primary">{inventoryTurnover.turnoverRate}%</div>
                </div>
              </div>
              <div className="p-3 bg-[#00E396]/10 border border-[#00E396]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">避免空房损失</span>
                  <span className="text-lg font-bold text-[#00E396]">¥{inventoryTurnover.avoidedLoss.toLocaleString()}</span>
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  按底价¥{currentRoomType.floorPrice}计算
                </div>
              </div>
              <div className="text-xs text-text-secondary">
                当前积压 {inventoryTurnover.backlogged}间 / 总房 {inventoryTurnover.total}间
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">暂无库存数据</div>
          )}
        </motion.div>

        {/* 定价策略效果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-[#FF4560]" />
            定价策略效果
            <span className="text-xs px-2 py-0.5 rounded bg-[#FF4560]/10 text-[#FF4560]">
              {currentRoomType.name}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {pricingModeStats.map((mode) => (
              <div key={mode.mode} className="p-3 bg-bg-tertiary rounded-lg border text-center" style={{ borderColor: `${mode.color}30` }}>
                <div className="text-xs text-text-primary mb-1">{mode.mode}</div>
                <div className="text-lg font-bold font-mono mb-0.5" style={{ color: mode.color }}>
                  ¥{mode.revenue.toLocaleString()}
                </div>
                <div className="text-[10px] text-text-secondary">{mode.count}单</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-text-secondary">
            基于底价¥{currentRoomType.floorPrice} ~ 中价¥{Math.round((currentRoomType.floorPrice + currentRoomType.ceilingPrice) / 2)} ~ 上限¥{currentRoomType.ceilingPrice}划分
          </div>
        </motion.div>
      </div>

      {/* 提示说明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-bg-tertiary/50 border border-border-color rounded-lg"
      >
        <div className="flex items-start gap-3 text-xs text-text-secondary">
          <div className="w-5 h-5 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={12} className="text-neon-cyan" />
          </div>
          <div>
            <span className="text-text-primary font-medium">全店汇总</span>：GMV、订单、渠道ROI、预订行为、内容效率为全店所有房型合计数据
          </div>
        </div>
        <div className="flex items-start gap-3 text-xs text-text-secondary mt-2">
          <div className="w-5 h-5 rounded-full bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
            <Bed size={12} className="text-neon-purple" />
          </div>
          <div>
            <span className="text-text-primary font-medium">房型明细</span>：库存周转、定价策略效果仅展示选中房型的数据
          </div>
        </div>
      </motion.div>
    </div>
  );
}
