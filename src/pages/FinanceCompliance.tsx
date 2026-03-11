/**
 * Shadow-Bees V52 - 财务合规页面（重构版）
 * 标签切换：财务概览 | 订单状态
 * 时间维度：今日/本周/本月/自定义
 * 数据联动：财务数据 + 库存数据
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, PieChart, BarChart3, ListTodo, 
  Package, Bed, TrendingUp, AlertTriangle, Calendar
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { FinanceCompliance as FinanceComplianceV2 } from '@/components/finance/FinanceCompliance';
import { platformLogos } from '@/utils/helpers';
import { getTodayOccupancyFromCalendar } from '@/utils/inventoryHelpers';

// 时间范围配置
const timeRangeOptions = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义' },
];

// ============================================
// 主页面
// ============================================

export default function FinanceCompliance() {
  const [activeTab, setActiveTab] = useState<'original' | 'orders'>('original');
  const [timeRange, setTimeRange] = useState<string>('today');
  
  // 自定义日期范围（默认最近7天，结束日期不能超过今天）
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({ 
    start: weekAgoStr, 
    end: todayStr 
  });
  const { transactions, inventory, currentHotel } = useUnifiedStore();
  
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
  
  // 过滤时间范围内的交易
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate >= dateRange.start && txnDate <= dateRange.end;
    });
  }, [transactions, dateRange]);
  
  // 获取今日库存占用数据（财务与库存联动）
  const todayOccupancy = useMemo(() => {
    return getTodayOccupancyFromCalendar(inventory.calendar || null);
  }, [inventory.calendar]);
  
  // 计算库存相关的财务联动指标
  const inventoryFinanceStats = useMemo(() => {
    const totalRooms = currentHotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
    const occupied = todayOccupancy.totalOccupied;
    const available = todayOccupancy.totalAvailable;
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
    
    // 计算库存紧张度（影响定价策略）
    const isLowInventory = available < 10;
    const isHighOccupancy = occupancyRate > 80;
    
    return {
      totalRooms,
      occupied,
      available,
      occupancyRate,
      isLowInventory,
      isHighOccupancy,
    };
  }, [todayOccupancy, currentHotel.roomTypes]);
  
  const financeStats = useMemo(() => {
    const totalGross = filteredTransactions.reduce((sum, t) => sum + t.financials.gross, 0);
    const totalServiceFee = filteredTransactions.reduce((sum, t) => sum + t.financials.serviceFee, 0);
    const totalNet = filteredTransactions.reduce((sum, t) => sum + t.financials.net, 0);
    
    // 基于真实开票状态统计（替代固定系数0.9）
    const issuedTransactions = filteredTransactions.filter(t => t.invoice?.issued === true);
    const issuedCount = issuedTransactions.length;
    const issuedAmount = issuedTransactions.reduce((sum, t) => sum + (t.invoice?.amount || 0), 0);
    const pendingAmount = totalGross - issuedAmount;
    
    const conversionRate = filteredTransactions.length > 0 
      ? Math.round((issuedCount / filteredTransactions.length) * 100) 
      : 0; // 无交易时返回0而非100
    
    // 计算RevPAR（每间可售房收入）- 财务与库存联动指标
    const revpar = inventoryFinanceStats.totalRooms > 0 
      ? Math.round(totalGross / inventoryFinanceStats.totalRooms) 
      : 0;
    
    return {
      totalGross,
      totalServiceFee,
      totalNet,
      issuedCount,        // 新增：已开票数量
      issuedAmount,
      pendingAmount,
      conversionRate,
      transactionCount: filteredTransactions.length,
      revpar,
    };
  }, [filteredTransactions, inventoryFinanceStats.totalRooms]);

  const platformStats = useMemo(() => {
    const stats: Record<string, { count: number; gross: number; serviceFee: number; net: number }> = {
      xianyu: { count: 0, gross: 0, serviceFee: 0, net: 0 },
      xiaohongshu: { count: 0, gross: 0, serviceFee: 0, net: 0 },
      wechat: { count: 0, gross: 0, serviceFee: 0, net: 0 },
    };
    
    filteredTransactions.forEach(t => {
      if (stats[t.platform]) {
        stats[t.platform].count++;
        stats[t.platform].gross += t.financials.gross;
        stats[t.platform].serviceFee += t.financials.serviceFee;
        stats[t.platform].net += t.financials.net;
      }
    });
    
    return stats;
  }, [filteredTransactions]);
  
  // 格式化日期显示
  const formatDateRange = () => {
    if (timeRange === 'today') {
      return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    }
    const startStr = dateRange.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const endStr = dateRange.end.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 - 统一在顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">财务合规</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
              {timeRangeOptions.find(o => o.key === timeRange)?.label || '今日'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">{formatDateRange()}</p>
        </div>
        {/* 时间范围选择 */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-2">
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
          
          <div className="text-sm text-text-secondary pt-2">
            营收 <span className="text-neon-cyan font-medium">¥{financeStats.totalGross.toLocaleString()}</span> · 净收入 <span className="text-neon-green font-medium">¥{Math.round(financeStats.totalNet).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 标签切换 - 页面级别统一 */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-1 border border-border-color w-fit">
        <button
          onClick={() => setActiveTab('original')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
            activeTab === 'original'
              ? 'bg-neon-cyan/20 text-neon-cyan'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <PieChart size={16} />
          财务概览
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
            activeTab === 'orders'
              ? 'bg-neon-purple/20 text-neon-purple'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <ListTodo size={16} />
          订单状态
        </button>
      </div>

      {activeTab === 'orders' ? (
        /* ===== 订单状态视图 ===== */
        <FinanceComplianceV2 transactions={filteredTransactions} />
      ) : (
        /* ===== 财务概览视图 ===== */
        <>
          {/* 财务+库存联动指标 - 6卡片 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 财务指标 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">总成交金额(GMV)</span>
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                  <PieChart size={16} className="text-neon-cyan" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-neon-cyan">
                ¥{financeStats.totalGross.toLocaleString()}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                净收入 ¥{Math.round(financeStats.totalNet).toLocaleString()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">待开票金额</span>
                <div className="w-8 h-8 rounded-lg bg-neon-red/20 flex items-center justify-center">
                  <BarChart3 size={16} className="text-neon-red" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-neon-red">
                ¥{financeStats.pendingAmount.toLocaleString()}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                已开票 ¥{financeStats.issuedAmount.toLocaleString()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">开票转化率</span>
                <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center">
                  <CheckCircle size={16} className="text-neon-green" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-neon-green">
                {financeStats.conversionRate}%
              </div>
              <div className="text-xs text-text-secondary mt-1">
                服务费 ¥{Math.round(financeStats.totalServiceFee).toLocaleString()}
              </div>
            </motion.div>

            {/* 库存联动指标 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">入住率</span>
                <div className="w-8 h-8 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                  <Bed size={16} className="text-neon-purple" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-neon-purple">
                {inventoryFinanceStats.occupancyRate}%
              </div>
              <div className="text-xs text-text-secondary mt-1">
                已售 {inventoryFinanceStats.occupied}间 / 总{inventoryFinanceStats.totalRooms}间
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`bg-bg-secondary rounded-xl border p-4 ${
                inventoryFinanceStats.isLowInventory ? 'border-neon-red/50 bg-neon-red/5' : 'border-border-color'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">可售余量</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  inventoryFinanceStats.isLowInventory ? 'bg-neon-red/20' : 'bg-neon-green/20'
                }`}>
                  <Package size={16} className={inventoryFinanceStats.isLowInventory ? 'text-neon-red' : 'text-neon-green'} />
                </div>
              </div>
              <div className={`text-2xl font-mono font-bold ${
                inventoryFinanceStats.isLowInventory ? 'text-neon-red' : 'text-neon-green'
              }`}>
                {inventoryFinanceStats.available}<span className="text-sm font-normal text-text-secondary">间</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-secondary">剩余库存</span>
                {inventoryFinanceStats.isLowInventory && (
                  <span className="text-xs text-neon-red flex items-center gap-1">
                    <AlertTriangle size={12} />
                    紧张
                  </span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-bg-secondary rounded-xl border border-border-color p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">RevPAR</span>
                <div className="w-8 h-8 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-[#FFB800]" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-[#FFB800]">
                ¥{financeStats.revpar}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                每间可售房收入
              </div>
            </motion.div>
          </div>

          {/* 平台分布与财务详情 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 平台营收分布 */}
            <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PieChart size={18} className="text-neon-cyan" />
                平台营收分布
              </h3>
              
              <div className="space-y-4">
                {Object.entries(platformStats).map(([platform, stat], idx) => {
                  const totalGross = financeStats.totalGross || 1;
                  const percent = (stat.gross / totalGross) * 100;
                  const colors: Record<string, string> = {
                    xianyu: '#FFDA44',
                    xiaohongshu: '#FF2442',
                    wechat: '#07C160',
                  };
                  
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img 
                            src={platformLogos[platform]?.logo} 
                            alt={platformLogos[platform]?.name}
                            className="w-7 h-7 rounded object-contain"
                          />
                          <span className="font-medium">
                            {platform === 'xianyu' ? '闲鱼' : platform === 'xiaohongshu' ? '小红书' : '微信'}
                          </span>
                          <span className="text-xs text-text-secondary">{stat.count}单</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono">¥{stat.gross.toLocaleString()}</div>
                          <div className="text-xs text-text-secondary">净¥{Math.round(stat.net).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ delay: idx * 0.1 }}
                          className="h-full rounded-full"
                          style={{ background: colors[platform] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 财务详情 */}
            <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-neon-green" />
                财务详情
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">总成交金额(GMV)</span>
                  <span className="font-mono text-xl text-neon-cyan">¥{financeStats.totalGross.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">
                    平台服务费({financeStats.totalGross > 0 ? Math.round((financeStats.totalServiceFee / financeStats.totalGross) * 100) : 0}%)
                  </span>
                  <span className="font-mono text-neon-amber">-¥{financeStats.totalServiceFee.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg border border-neon-green/30">
                  <span className="font-medium">酒店实收</span>
                  <span className="font-mono text-xl text-neon-green">¥{Math.round(financeStats.totalNet).toLocaleString()}</span>
                </div>
                
                {/* 库存联动提示 */}
                <div className={`p-3 rounded-lg ${
                  inventoryFinanceStats.isHighOccupancy 
                    ? 'bg-neon-amber/10 border border-neon-amber/30' 
                    : 'bg-neon-green/10'
                }`}>
                  <div className={`flex items-center gap-2 text-sm ${
                    inventoryFinanceStats.isHighOccupancy ? 'text-neon-amber' : 'text-neon-green'
                  }`}>
                    <CheckCircle size={16} />
                    <span>
                      合规状态：已开票 {financeStats.conversionRate}% · 
                      入住率 {inventoryFinanceStats.occupancyRate}%
                      {inventoryFinanceStats.isHighOccupancy && ' (高收益期)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
