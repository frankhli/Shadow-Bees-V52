/**
 * Shadow-Bees V52 - 经营概览页面
 * 时间维度：今日/本周/本月/自定义
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  Activity, Building2,
  DollarSign, Target,
  Info, AlertOctagon,
  Flame,
  Clock, Home, CheckCircle, Receipt, RefreshCw,
  Percent, Wallet,
  X
} from 'lucide-react';
import type { OrderStatus } from '@/types';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { TimeModeControl } from '@/components/TimeModeControl';
import { PriceApprovalModal } from '@/components/PriceApprovalModal';

import { WeekMonthView } from '@/components/overview/WeekMonthView';
import { PlatformLogo } from '@/components/PlatformLogo';
import { themeColors, modeLabels, modeDetails, calculateFinancialStats, calculateChangeRate } from '@/utils/helpers';
import type { Platform } from '@/types';

// 时间范围配置
const rangeConfig = {
  today: { label: '今日', days: 1, compareLabel: '较昨日' },
  week: { label: '本周', days: 7, compareLabel: '较上周' },
  month: { label: '本月', days: 30, compareLabel: '较上月' },
  custom: { label: '自定义日期', days: 0, compareLabel: '较上期' },
};

// 获取本地日期字符串（YYYY-MM-DD格式）
function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 智能时间格式化
function formatSmartTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ============================================
// 关键指标霓虹数字卡（优化版）
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
  title, value, subtitle, trend, trendValue, icon: Icon, color, delay = 0,
  animatedValue, valuePrefix = '', valueSuffix = ''
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return '#00E396';
    if (trend === 'down') return '#FF4757';
    return '#6B7280';
  };

  const getTrendBg = () => {
    if (trend === 'up') return 'bg-neon-green/10';
    if (trend === 'down') return 'bg-neon-red/10';
    return 'bg-text-muted/10';
  };

  // 提取数值用于动画
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
        transition: { duration: 0.2 }
      }}
      className="relative p-4 rounded-xl border overflow-hidden group cursor-pointer bg-bg-secondary"
      style={{ 
        borderColor: `${color}30`,
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
          background: `radial-gradient(circle at 50% 0%, ${color}15 0%, transparent 70%)`
        }}
      />
      
      <div className="relative">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary font-medium">{title}</span>
          <motion.div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15` }}
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Icon size={18} style={{ color }} />
          </motion.div>
        </div>
        
        {/* 主数值 - 带动画 */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-din text-2xl font-bold" style={{ color }}>
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
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${getTrendBg()} w-fit`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.5 }}
        >
          {trend === 'up' && <TrendingUp size={12} style={{ color: getTrendColor() }} />}
          {trend === 'down' && <TrendingDown size={12} style={{ color: getTrendColor() }} />}
          {trend === 'neutral' && <Info size={12} style={{ color: getTrendColor() }} />}
          <span style={{ color: getTrendColor() }}>{trendValue}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// 动画数值组件
function AnimatedMetricValue({ 
  value, prefix, suffix, delay 
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
// 房型销售统计（优化版）
// ============================================

function RoomTypeSales({ transactions, roomTypes }: { 
  transactions: any[]; 
  roomTypes: any[];
}) {
  const { currentTheme } = useUnifiedStore();
  const theme = themeColors[currentTheme] || themeColors.cyan;
  
  const roomStats = roomTypes.map(room => {
    const roomTxns = transactions.filter(t => t.roomType === room.name);
    const revenue = roomTxns.reduce((sum, t) => sum + t.financials.gross, 0);
    const count = roomTxns.length;
    const avgPrice = count > 0 ? Math.round(revenue / count) : 0;
    return { ...room, revenue, count, avgPrice };
  }).sort((a, b) => b.revenue - a.revenue);
  
  const totalRevenue = roomStats.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = roomStats.reduce((sum, r) => sum + r.count, 0);
  
  return (
    <div className="bg-surface rounded-xl border border-border-color p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Building2 size={18} style={{ color: theme.primary }} />
          房型销售排行
        </h3>
        <div className="text-xs text-text-secondary">
          共<span className="text-text-primary font-medium">{totalOrders}</span>单 · 
          ¥<span className="text-text-primary font-medium">{totalRevenue.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {roomStats.map((room, index) => {
          const percentage = totalRevenue > 0 ? (room.revenue / totalRevenue) * 100 : 0;
          const rankColors = ['#FFB800', '#C0C0C0', '#CD7F32'];
          return (
            <div key={room.id} className="relative group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* 排名 */}
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                    style={{ 
                      background: index < 3 ? `${rankColors[index]}20` : 'var(--surface-hover)',
                      color: index < 3 ? rankColors[index] : 'var(--text-secondary)'
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{room.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                      <span className="text-neon-green">{room.count}单</span>
                      <span>·</span>
                      <span>均价¥{room.avgPrice}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-medium" style={{ color: theme.primary }}>
                    ¥{room.revenue.toLocaleString()}
                  </span>
                  <div className="text-[10px] text-text-secondary">{percentage.toFixed(0)}%</div>
                </div>
              </div>
              {/* 进度条 */}
              <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: index === 0 ? theme.primary : `${theme.primary}80` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 平台销售分布（优化版）
// ============================================

function PlatformSales({ transactions }: { transactions: any[] }) {
  const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
  
  const platformNames: Record<Platform, string> = {
    xianyu: '闲鱼',
    xiaohongshu: '小红书',
    wechat: '微信',
  };

  const platformColors: Record<Platform, string> = {
    xianyu: '#FFB800',
    xiaohongshu: '#FF2442',
    wechat: '#07C160',
  };
  
  const stats = platforms.map(platform => {
    const count = transactions.filter(t => t.platform === platform).length;
    const revenue = transactions
      .filter(t => t.platform === platform)
      .reduce((sum, t) => sum + t.financials.gross, 0);
    const avgPrice = count > 0 ? Math.round(revenue / count) : 0;
    return { platform, count, revenue, avgPrice };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);
  
  return (
    <div className="bg-surface rounded-xl border border-border-color p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        平台分布
        <span className="text-xs text-text-secondary font-normal">{totalCount}单</span>
      </h3>
      
      <div className="space-y-3">
        {stats.map(({ platform, count, revenue, avgPrice }, index) => {
          const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
          return (
            <div key={platform} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={platform} size={24} />
                  <div>
                    <div className="text-sm font-medium">{platformNames[platform]}</div>
                    <div className="text-[10px] text-text-secondary">{count}单 · 均价¥{avgPrice}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium" style={{ color: platformColors[platform] }}>
                    ¥{revenue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-text-secondary">{percentage.toFixed(0)}%</div>
                </div>
              </div>
              {/* 进度条 */}
              <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: platformColors[platform] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 总计 */}
      <div className="mt-3 pt-3 border-t border-border-color">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">合计</span>
          <div className="text-right">
            <span className="text-sm font-mono font-medium">¥{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 实时成交滚动（优化版）
// ============================================

function LiveTransactions() {
  const { transactions, currentTheme } = useUnifiedStore();
  const theme = themeColors[currentTheme] || themeColors.cyan;
  // 用于强制重新渲染以更新时间显示
  const [, forceUpdate] = useState({});
  
  // 每秒更新一次时间显示
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate({});
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const platformNames: Record<Platform, string> = {
    xianyu: '闲鱼',
    xiaohongshu: '小红书',
    wechat: '微信',
  };

  const platformColors: Record<Platform, string> = {
    xianyu: '#FFB800',
    xiaohongshu: '#FF2442',
    wechat: '#07C160',
  };

  // 计算今日统计（基于日期过滤）
  // 使用本地日期字符串进行过滤，避免UTC时区转换问题
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayTransactions = transactions.filter(t => {
    // 将ISO时间戳转换为本地日期字符串进行比较
    const txnDate = new Date(t.timestamp);
    const txnDateStr = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}-${String(txnDate.getDate()).padStart(2, '0')}`;
    return txnDateStr === todayStr;
  });
  const todayCount = todayTransactions.length;
  
  // 按时间倒序排列（最新的在前）
  const sortedTodayTransactions = todayTransactions
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return (
    <div className="bg-surface rounded-xl border border-border-color p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={18} style={{ color: theme.primary }} className="animate-pulse" />
          实时成交
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-xs text-text-secondary">
            今日<span className="text-neon-green font-medium">{todayCount}</span>单
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-text-secondary">实时</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {sortedTodayTransactions.map((txn, idx) => (
          <motion.div
            key={txn.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 bg-surface-hover rounded-lg hover:bg-surface-hover/80 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ background: `${platformColors[txn.platform]}20` }}
              >
                <img 
                  src={`/logos/${txn.platform}.jpg`} 
                  alt={platformNames[txn.platform]}
                  className="w-5 h-5 object-contain rounded"
                />
              </div>
              <div>
                <div className="text-sm font-medium">{txn.roomType}</div>
                <div className="text-xs text-text-secondary">
                  {new Date(txn.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold font-mono text-sm" style={{ color: theme.primary }}>
                ¥{txn.price}
              </div>
              <div className="text-[10px] text-text-secondary">
                {(() => {
                  const now = new Date();
                  const txnTime = new Date(txn.timestamp);
                  const diffMs = now.getTime() - txnTime.getTime();
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  
                  // 处理未来时间（diffMs < 0）：显示具体时间而不是相对时间
                  if (diffMs < 0) {
                    return txnTime.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
                  }
                  
                  if (diffMins < 1) return '刚刚成交';
                  if (diffMins < 60) return `${diffMins}分钟前`;
                  if (diffHours < 24) return `${diffHours}小时前`;
                  return txnTime.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
                })()}
              </div>
            </div>
          </motion.div>
        ))}
        
        {transactions.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            暂无成交数据
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export default function TodayOverview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    currentHotel, 
    currentTheme,
    currentMode,
    currentRoomType,
    timeMode,
    alerts, 
    removeAlert,
    transactions,
    contents,
    inventory,
    yesterdayStats,
    presetStats,  // 预设对比数据
    pendingPriceApproval,
    approvePriceChange,
    rejectPriceChange,
    generateSmartAlerts,
    switchRoomType,
    smartPricing,
    auditLogs,
  } = useUnifiedStore();
  
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  const theme = themeColors[currentTheme] || themeColors.cyan;
  
  // 从 URL 获取时间范围
  const range = (searchParams.get('range') || 'today') as keyof typeof rangeConfig;
  const rangeInfo = rangeConfig[range] || rangeConfig.today;
  
  // 计算日期范围
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    
    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
      // 本周从周一开始（中国习惯）
      const day = start.getDay(); // 0=周日, 1=周一...
      const diff = day === 0 ? 6 : day - 1; // 周一时diff=0, 周日时diff=6
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'custom') {
      // 自定义范围，从 URL 读取
      const startDate = searchParams.get('start');
      const endDate = searchParams.get('end');
      if (startDate) {
        start.setTime(new Date(startDate).getTime());
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end.setTime(new Date(endDate).getTime());
        end.setHours(23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
      }
    }
    
    return { start, end };
  }, [range, searchParams]);
  
  // 计算对比期日期范围（上周/上月/上段时间）
  const compareDateRange = useMemo(() => {
    const now = new Date();
    
    if (range === 'today') {
      // 对比昨日
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { start: yesterday, end: yesterdayEnd };
    } else if (range === 'week') {
      // 对比上周（周一到周日）
      const lastWeekStart = new Date(dateRange.start);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(dateRange.end);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      lastWeekEnd.setHours(23, 59, 59, 999);
      return { start: lastWeekStart, end: lastWeekEnd };
    } else if (range === 'month') {
      // 对比上月
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: lastMonthStart, end: lastMonthEnd };
    } else {
      // 自定义：对比等长的上一段时间
      const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(dateRange.start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff + 1);
      prevStart.setHours(0, 0, 0, 0);
      return { start: prevStart, end: prevEnd };
    }
  }, [range, dateRange]);
  
  // 过滤时间范围内的交易（历史回放和沙盘模拟模式下显示所有）
  const filteredTransactions = useMemo(() => {
    // 历史回放和沙盘模拟模式下显示所有交易
    if (timeMode === 'history' || timeMode === 'sandbox') {
      return transactions;
    }
    return transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate >= dateRange.start && txnDate <= dateRange.end;
    });
  }, [transactions, dateRange, timeMode]);
  
  // 过滤对比期交易数据
  const compareTransactions = useMemo(() => {
    if (timeMode === 'history' || timeMode === 'sandbox') {
      return []; // 历史/沙盘模式下无对比
    }
    return transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate >= compareDateRange.start && txnDate <= compareDateRange.end;
    });
  }, [transactions, compareDateRange, timeMode]);
  
  // 初始生成智能预警
  useEffect(() => {
    generateSmartAlerts();
  }, []);
  
  // 计算综合指标（使用统一财务口径）
  const currentStats = useMemo(() => calculateFinancialStats(filteredTransactions), [filteredTransactions]);
  const compareStats = useMemo(() => calculateFinancialStats(compareTransactions), [compareTransactions]);
  
  // 实时GMV和确认GMV
  const totalRevenue = currentStats.realtimeGMV;
  const confirmedRevenue = currentStats.confirmedGMV;
  const totalRoomsSold = currentStats.realtimeOrders;
  const confirmedRoomsSold = currentStats.confirmedOrders;
  const avgPrice = currentStats.avgPrice;
  
  // ===== 智能对比数据选择（实时推演模式下使用预设数据）=====
  // 根据时间范围选择合适的预设对比数据
  const getPresetCompareData = () => {
    switch (range) {
      case 'today':
        return { revenue: presetStats.today.revenue, orders: presetStats.today.orders };
      case 'week':
        return { revenue: presetStats.thisWeek.revenue, orders: presetStats.thisWeek.orders };
      case 'month':
        return { revenue: presetStats.thisMonth.revenue, orders: presetStats.thisMonth.orders };
      default:
        return { revenue: yesterdayStats.revenue, orders: yesterdayStats.roomsSold };
    }
  };
  
  const presetCompare = getPresetCompareData();
  
  // 计算变化率（优先使用实际对比期数据，如果没有则使用预设数据）
  // 实时推演模式下：当前是今日开始，历史数据都是预设的
  const hasRealCompareData = compareStats.realtimeOrders >= 3; // 至少3单才认为有真实对比数据
  const baseRevenue = hasRealCompareData ? compareStats.realtimeGMV : presetCompare.revenue;
  const baseRooms = hasRealCompareData ? compareStats.realtimeOrders : presetCompare.orders;
  
  const revenueChangeCalc = calculateChangeRate(totalRevenue, baseRevenue);
  const revenueChange = revenueChangeCalc.value;
  const roomsChange = totalRoomsSold - baseRooms;
  
  // 标记为已使用（避免编译警告）
  void confirmedRoomsSold;
  void roomsChange;
  
  // 总库存（从房型配置获取，实时）
  const totalInventory = currentHotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
  
  // 已售房间数（从交易数据实时计算：已付款 + 已入住 + 已离店 + 已开票）
  const totalSold = useMemo(() => {
    return filteredTransactions.filter(t => 
      ['paid', 'checked_in', 'checked_out', 'invoiced'].includes(t.status)
    ).length;
  }, [filteredTransactions]);
  
  // 实际可用房间数 = 总库存 - 已售
  const totalAvailable = totalInventory - totalSold;
  
  // 空置率
  const vacantRate = totalInventory > 0 ? ((totalAvailable / totalInventory) * 100).toFixed(1) : '0';
  
  // 入住率 = 已售 / 总库存
  const occupancyRate = totalInventory > 0 ? Math.round((totalSold / totalInventory) * 100) : 0;

  // ========== 新增：平台特色指标（真实数据计算）==========
  
  // 1. 内容引流订单 - 统计有关联内容的订单（sourceContentId 不为空）
  const contentReferredOrders = useMemo(() => {
    return filteredTransactions.filter(t => t.sourceContentId && t.sourceContentId.trim() !== '').length;
  }, [filteredTransactions]);
  
  const contentReferralRate = totalRoomsSold > 0 
    ? Math.round((contentReferredOrders / totalRoomsSold) * 100) 
    : 0;
  
  // 2. 灵活库存销售率 - 来自非标渠道（xianyu/xiaohongshu/wechat）的订单占比
  const flexiblePlatformOrders = useMemo(() => {
    const flexiblePlatforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
    return filteredTransactions.filter(t => flexiblePlatforms.includes(t.platform)).length;
  }, [filteredTransactions]);
  
  const flexibleSalesRate = totalRoomsSold > 0 
    ? Math.round((flexiblePlatformOrders / totalRoomsSold) * 100) 
    : 0;
  
  // 3. 提前预订周期 - 平均提前多少天预订（checkInDate - timestamp）
  const avgBookingLeadTime = useMemo(() => {
    const leadTimes = filteredTransactions
      .filter((t): t is typeof t & { checkInDate: string } => !!t.checkInDate && !!t.timestamp)
      .map(t => {
        const bookingDate = new Date(t.timestamp);
        const checkInDate = new Date(t.checkInDate);
        const diffTime = checkInDate.getTime() - bookingDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      });
    
    if (leadTimes.length === 0) return 0;
    const avg = leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length;
    return Math.round(avg * 10) / 10; // 保留1位小数
  }, [filteredTransactions]);
  
  // 4. 动态调价次数 - 从审计日志中统计今日价格调整记录
  const pricingAdjustmentCount = useMemo(() => {
    const today = getLocalDateString();
    return auditLogs.filter(log => {
      const isPricingAction = log.action.includes('调价') || log.action.includes('定价') || log.action.includes('改价');
      const isToday = log.time && log.time.startsWith(today);
      return isPricingAction && isToday;
    }).length;
  }, [auditLogs]);
  
  // 标记为已使用（避免编译警告）
  void smartPricing;

  // ========== 今日订单状态看板数据（实时计算）==========
  const todayOrderStatus = useMemo(() => {
    const todayStr = getLocalDateString();
    
    // 各状态订单统计
    const statusCounts: Record<OrderStatus, number> = {
      pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
      refund_pending: 0, cancelled: 0,
    };
    
    // 今日需关注的订单
    let todayCheckin = 0;  // 今日预抵
    let todayCheckout = 0; // 今日预离
    let pendingConfirm = 0; // 待确认
    let pendingInvoice = 0; // 待开票
    
    filteredTransactions.forEach(t => {
      // 统计各状态
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      
      // 今日预抵（今日checkInDate且状态为已付款）
      if (t.checkInDate === todayStr && t.status === 'paid') {
        todayCheckin++;
      }
      
      // 今日预离（今日checkOutDate且状态为已入住/已离店）
      if (t.checkOutDate === todayStr && ['checked_in', 'checked_out'].includes(t.status)) {
        todayCheckout++;
      }
      
      // 待确认
      if (t.status === 'pending') {
        pendingConfirm++;
      }
      
      // 待开票（已离店未开票）
      if (t.status === 'checked_out') {
        pendingInvoice++;
      }
    });
    
    return {
      statusCounts,
      todayCheckin,
      todayCheckout,
      pendingConfirm,
      pendingInvoice,
      total: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // 格式化日期显示
  const formatDateRange = () => {
    if (range === 'today') {
      return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    }
    const startStr = dateRange.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const endStr = dateRange.end.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // 主视图
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">
              经营概览 · <span style={{ color: theme.primary }}>{currentHotel.name}</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-xs bg-[#07C160]/10 text-[#07C160] border border-[#07C160]/30">
              {rangeInfo.label}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            {formatDateRange()}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 当前模式 */}
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ 
              background: `${modeDetails[currentMode].color}20`, 
              border: `1px solid ${modeDetails[currentMode].color}` 
            }}
          >
            {currentMode === 'scalper' && <Flame size={16} style={{ color: modeDetails[currentMode].color }} />}
            {currentMode === 'dynamic' && <Activity size={16} style={{ color: modeDetails[currentMode].color }} />}
            {currentMode === 'clearance' && <TrendingDown size={16} style={{ color: modeDetails[currentMode].color }} />}
            <span style={{ color: modeDetails[currentMode].color }}>
              {modeLabels[currentMode]}
            </span>
          </div>
        </div>
      </div>
      
      {/* 决策预警栏 - 优化版：呼吸灯 + 智能时间 + 一键清除 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {/* 头部：标题 + 一键清除 */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">系统预警</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-amber/20 text-neon-amber">
                {alerts.length}
              </span>
            </div>
            <button
              onClick={() => alerts.forEach(a => removeAlert(a.id))}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            >
              一键清除
            </button>
          </div>
          
          {alerts
            .sort((a, b) => {
              const priority = { critical: 0, warning: 1, info: 2 };
              return priority[a.level] - priority[b.level];
            })
            .slice(0, 3)
            .map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-4 rounded-xl border relative overflow-hidden ${
                  alert.level === 'critical' 
                    ? 'bg-neon-red/10 border-neon-red/30' 
                    : alert.level === 'warning'
                    ? 'bg-neon-amber/10 border-neon-amber/30'
                    : 'bg-neon-cyan/10 border-neon-cyan/30'
                }`}
              >
                {/* Critical 级别呼吸灯效果 */}
                {alert.level === 'critical' && (
                  <>
                    {/* 脉冲边框 */}
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-neon-red/50"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    {/* 光晕效果 */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'radial-gradient(circle at center, rgba(255, 71, 87, 0.15) 0%, transparent 70%)',
                      }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </>
                )}
                
                <div className="flex items-center gap-3 relative z-10">
                  {alert.level === 'critical' ? (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <AlertOctagon className="text-neon-red" size={20} />
                    </motion.div>
                  ) : alert.level === 'warning' ? (
                    <AlertTriangle className="text-neon-amber" size={20} />
                  ) : (
                    <Info className="text-neon-cyan" size={20} />
                  )}
                  <div>
                    <div className={`font-medium ${
                      alert.level === 'critical' ? 'text-neon-red' : 
                      alert.level === 'warning' ? 'text-neon-amber' : 
                      'text-neon-cyan'
                    }`}>
                      {alert.message}
                    </div>
                    {/* 智能时间显示 */}
                    <div className="text-xs text-text-secondary">
                      {formatSmartTime(alert.timestamp)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-text-secondary hover:text-text-primary transition-colors relative z-10 p-1 hover:bg-white/10 rounded"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
        </div>
      )}

      {/* 关键指标卡片 - 酒店行业专业指标（两行布局） */}
      {/* 大屏/中屏4列×2行 → 小屏2列 → 手机1列 */}
      {/* key包含range确保切换时间范围时重新触发动画 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 第1行：核心收益指标 */}
        <MetricCard
          key={`revenue-${range}`}
          title="总营收"
          value={`¥${(totalRevenue / 1000).toFixed(1)}k`}
          animatedValue={Math.round(totalRevenue / 1000)}
          valuePrefix="¥"
          valueSuffix="k"
          subtitle={`${currentStats.realtimeOrders}单·确认¥${(confirmedRevenue / 1000).toFixed(0)}k`}
          trend={revenueChangeCalc.isValid ? (Number(revenueChange.replace(/[+\-%]/g, '')) >= 0 ? 'up' : 'down') : 'neutral'}
          trendValue={`${rangeInfo.compareLabel} ${revenueChangeCalc.isValid ? revenueChange : '--'}`}
          icon={DollarSign}
          color="#07C160"
          delay={0}
        />
        <MetricCard
          key={`occupancy-${range}`}
          title="入住率"
          value={`${occupancyRate}%`}
          animatedValue={occupancyRate}
          valueSuffix="%"
          subtitle={`${totalSold}/${totalInventory}间·剩${totalAvailable}`}
          trend={occupancyRate >= 85 ? 'up' : occupancyRate < 50 ? 'down' : 'neutral'}
          trendValue={occupancyRate >= 85 ? '优秀' : occupancyRate < 50 ? '需引流' : '正常'}
          icon={Percent}
          color="#00E396"
          delay={0.05}
        />
        <MetricCard
          key={`avgprice-${range}`}
          title="平均房价"
          value={`¥${avgPrice}`}
          animatedValue={avgPrice}
          valuePrefix="¥"
          subtitle={`已售客房均价`}
          trend="neutral"
          trendValue="基准¥380"
          icon={Wallet}
          color="#FFB800"
          delay={0.1}
        />
        <MetricCard
          key={`revpar-${range}`}
          title="单房收益"
          value={`¥${totalInventory > 0 ? Math.round(totalRevenue / totalInventory) : 0}`}
          subtitle={`每间可售房收益`}
          trend={Number(vacantRate) < 20 && avgPrice > 350 ? 'up' : 'neutral'}
          trendValue={Number(vacantRate) < 20 && avgPrice > 350 ? '收益佳' : '可优化'}
          icon={Target}
          color="#A855F7"
          delay={0.15}
        />
        
        {/* 第2行：平台特色指标（新增） */}
        <MetricCard
          key={`content-${range}`}
          title="内容引流"
          value={`${contentReferredOrders}`}
          animatedValue={contentReferredOrders}
          subtitle={`${contentReferralRate}%来自内容`}
          trend={contentReferralRate > 30 ? 'up' : contentReferralRate > 10 ? 'neutral' : 'down'}
          trendValue={contentReferralRate > 30 ? '内容驱动强' : contentReferralRate > 10 ? '内容正常' : '需增内容'}
          icon={Activity}
          color="#EC4899"
          delay={0.2}
        />
        <MetricCard
          key={`flexible-${range}`}
          title="灵活库存销售"
          value={`${flexibleSalesRate}%`}
          subtitle={`${flexiblePlatformOrders}单·非标渠道`}
          trend={flexibleSalesRate > 40 ? 'up' : flexibleSalesRate > 20 ? 'neutral' : 'down'}
          trendValue={flexibleSalesRate > 40 ? '渠道健康' : flexibleSalesRate > 20 ? '渠道正常' : '需拓渠道'}
          icon={TrendingUp}
          color="#14B8A6"
          delay={0.25}
        />
        <MetricCard
          key={`leadtime-${range}`}
          title="提前预订"
          value={`${avgBookingLeadTime}天`}
          subtitle={`平均提前预订周期`}
          trend={avgBookingLeadTime > 7 ? 'up' : avgBookingLeadTime > 3 ? 'neutral' : 'down'}
          trendValue={avgBookingLeadTime > 7 ? '预订早·收益稳' : avgBookingLeadTime > 3 ? '周期正常' : '临时单多'}
          icon={Clock}
          color="#8B5CF6"
          delay={0.3}
        />
        <MetricCard
          key={`pricing-${range}`}
          title="调价次数"
          value={`${pricingAdjustmentCount}`}
          subtitle={`今日价格调整`}
          trend={pricingAdjustmentCount > 5 ? 'up' : pricingAdjustmentCount > 0 ? 'neutral' : 'neutral'}
          trendValue={pricingAdjustmentCount > 5 ? '动态调价活跃' : pricingAdjustmentCount > 0 ? '调价正常' : '价格稳定'}
          icon={RefreshCw}
          color="#F97316"
          delay={0.35}
        />
      </div>
      
      {/* 主体内容 */}
      {range !== 'today' ? (
        <WeekMonthView
          currentHotel={currentHotel}
          currentRoomType={currentRoomType}
          transactions={transactions}
          contents={contents}
          inventory={inventory}
          range={range}
          dateRange={dateRange}
          compareRange={compareDateRange}
          onSwitchRoomType={switchRoomType}
        />
      ) : (
        <div className="space-y-6">
          {/* 今日订单状态看板 - 优化版 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-5 border border-border-color"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock size={18} className="text-neon-purple" />
                今日订单状态
                <span className="text-xs text-text-secondary font-normal px-2 py-0.5 bg-surface-hover rounded-full">
                  共{todayOrderStatus.total}笔 · 实时
                </span>
              </h3>
            </div>
            
            <div className="grid grid-cols-6 gap-3">
              {/* 待确认 */}
              <motion.div 
                whileHover={{ scale: todayOrderStatus.pendingConfirm > 0 ? 1.03 : 1.02 }}
                onClick={() => todayOrderStatus.pendingConfirm > 0 && navigate('/orders')}
                className={`p-3 rounded-xl border transition-all ${
                  todayOrderStatus.pendingConfirm > 0 
                    ? 'bg-neon-amber/10 border-neon-amber/50 shadow-lg shadow-neon-amber/10 cursor-pointer hover:bg-neon-amber/20' 
                    : 'bg-surface-hover border-border-color cursor-default'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    todayOrderStatus.pendingConfirm > 0 ? 'bg-neon-amber/20' : 'bg-surface'
                  }`}>
                    <Clock size={16} className={todayOrderStatus.pendingConfirm > 0 ? 'text-neon-amber' : 'text-text-secondary'} />
                  </div>
                  <span className="text-xs text-text-secondary">待确认</span>
                </div>
                <div className={`text-xl font-bold ${todayOrderStatus.pendingConfirm > 0 ? 'text-neon-amber' : 'text-text-primary'}`}>
                  {todayOrderStatus.pendingConfirm}
                </div>
                {todayOrderStatus.pendingConfirm > 0 && (
                  <div className="text-[10px] text-neon-amber mt-1">前往订单管理 →</div>
                )}
              </motion.div>
              
              {/* 今日预抵 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl border border-border-color bg-surface-hover transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                    <Home size={16} className="text-neon-cyan" />
                  </div>
                  <span className="text-xs text-text-secondary">今日入住</span>
                </div>
                <div className="text-xl font-bold text-text-primary">{todayOrderStatus.todayCheckin}</div>
                <div className="text-[10px] text-text-hint mt-1">待办理入住</div>
              </motion.div>
              
              {/* 在住 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl border border-border-color bg-surface-hover transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                    <CheckCircle size={16} className="text-neon-purple" />
                  </div>
                  <span className="text-xs text-text-secondary">在住</span>
                </div>
                <div className="text-xl font-bold text-text-primary">{todayOrderStatus.statusCounts.checked_in}</div>
                <div className="text-[10px] text-text-hint mt-1">已办理入住</div>
              </motion.div>
              
              {/* 今日预离 */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl border border-border-color bg-surface-hover transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                    <Receipt size={16} className="text-neon-blue" />
                  </div>
                  <span className="text-xs text-text-secondary">今日离店</span>
                </div>
                <div className="text-xl font-bold text-text-primary">{todayOrderStatus.todayCheckout}</div>
                <div className="text-[10px] text-text-hint mt-1">待退房结算</div>
              </motion.div>
              
              {/* 待开票 */}
              <motion.div 
                whileHover={{ scale: todayOrderStatus.pendingInvoice > 0 ? 1.03 : 1.02 }}
                onClick={() => todayOrderStatus.pendingInvoice > 0 && navigate('/finance')}
                className={`p-3 rounded-xl border transition-all ${
                  todayOrderStatus.pendingInvoice > 0 
                    ? 'bg-neon-green/10 border-neon-green/50 shadow-lg shadow-neon-green/10 cursor-pointer hover:bg-neon-green/20' 
                    : 'bg-surface-hover border-border-color cursor-default'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    todayOrderStatus.pendingInvoice > 0 ? 'bg-neon-green/20' : 'bg-surface'
                  }`}>
                    <DollarSign size={16} className={todayOrderStatus.pendingInvoice > 0 ? 'text-neon-green' : 'text-text-secondary'} />
                  </div>
                  <span className="text-xs text-text-secondary">待开票</span>
                </div>
                <div className={`text-xl font-bold ${todayOrderStatus.pendingInvoice > 0 ? 'text-neon-green' : 'text-text-primary'}`}>
                  {todayOrderStatus.pendingInvoice}
                </div>
                {todayOrderStatus.pendingInvoice > 0 && (
                  <div className="text-[10px] text-neon-green mt-1">前往财务处理 →</div>
                )}
              </motion.div>
              
              {/* 已退款 */}
              <motion.div 
                whileHover={{ scale: todayOrderStatus.statusCounts.refunded > 0 ? 1.03 : 1.02 }}
                onClick={() => todayOrderStatus.statusCounts.refunded > 0 && navigate('/finance')}
                className={`p-3 rounded-xl border transition-all ${
                  todayOrderStatus.statusCounts.refunded > 0 
                    ? 'bg-neon-red/10 border-neon-red/50 shadow-lg shadow-neon-red/10 cursor-pointer hover:bg-neon-red/20' 
                    : 'bg-surface-hover border-border-color cursor-default'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    todayOrderStatus.statusCounts.refunded > 0 ? 'bg-neon-red/20' : 'bg-surface'
                  }`}>
                    <RefreshCw size={16} className={todayOrderStatus.statusCounts.refunded > 0 ? 'text-neon-red' : 'text-text-secondary'} />
                  </div>
                  <span className="text-xs text-text-secondary">已退款</span>
                </div>
                <div className={`text-xl font-bold ${todayOrderStatus.statusCounts.refunded > 0 ? 'text-neon-red' : 'text-text-primary'}`}>
                  {todayOrderStatus.statusCounts.refunded}
                </div>
                {todayOrderStatus.statusCounts.refunded > 0 ? (
                  <div className="text-[10px] text-neon-red mt-1">前往财务查看 →</div>
                ) : (
                  <div className="text-[10px] text-text-hint mt-1">无退款</div>
                )}
              </motion.div>
            </div>
          </motion.div>
          
          {/* 主体内容 - 三栏布局 */}
          <div className="grid grid-cols-3 gap-5">
            {/* 房型销售排行 */}
            <RoomTypeSales 
              transactions={filteredTransactions} 
              roomTypes={currentHotel.roomTypes} 
            />
            
            {/* 实时成交滚动 */}
            <LiveTransactions />
            
            {/* 平台分布 */}
            <PlatformSales transactions={filteredTransactions} />
          </div>
          
          {/* 时间模式控制 - 独立底部板块 */}
          <TimeModeControl />
        </div>
      )}
      
      {/* 调价审批弹窗 */}
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
      
      {/* 待审批提示 */}
      {pendingPriceApproval && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowApprovalModal(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-neon-amber/20 border border-neon-amber rounded-lg text-neon-amber hover:bg-neon-amber/30 transition-all shadow-lg"
        >
          <DollarSign size={18} />
          <span className="text-sm font-medium">待审批调价</span>
        </motion.button>
      )}
    </div>
  );
}
