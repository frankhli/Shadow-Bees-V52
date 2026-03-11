/**
 * 今日实况 - 企业版多酒店聚合视角
 * 
 * 核心功能：
 * - 多酒店数据聚合（GMV、订单、入住率）
 * - 实时成交滚动（所有选中酒店的订单）
 * - 订单状态看板（待确认/今日入住/在住/今日离店/待开票/已退款）
 * - 快捷操作入口（批量确认订单）
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '../../hooks/useCountUp';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Activity,
  Building2,
  Clock,
  Home,
  CheckCircle,
  Receipt,
  RefreshCw,
  Percent,
  Target,
  ArrowRight,
  Zap,
  Users,
  Play,
  Pause,
  RotateCcw,
  PartyPopper,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  X,
  Bell,
  Eye,
  Info,
} from 'lucide-react';
import { useEnterpriseStore, type SmartAlert } from '../../stores/enterpriseStore';
import { useAuthStore, EnterpriseRole } from '../../stores/authStore';
import type { Order } from '../../api/types';
import { MOCK_NON_STANDARD_ORDERS } from '../../api/mockData';
import { formatSmartAmount, formatSmartCount, type SmartFormatResult } from '../../utils/formatters';

// ============================================
// 类型定义
// ============================================

interface TodayOrderStatus {
  // 今日新单（今日0点至今创建）
  todayNew: {
    pending: number;    // 待确认
    confirmed: number;  // 已确认
    total: number;      // 今日新单总数
  };
  // 今日需处理（历史订单+今日新单中需关注的）
  todayAttention: {
    todayCheckin: number;   // 今日入住（今日到店办理入住）
    checkedIn: number;      // 在住（已入住未退房）
    todayCheckout: number;  // 今日离店（今日需退房）
    pendingInvoice: number; // 待开票（已退房未开票）
    todayRefunded: number;  // 今日退款
    total: number;          // 需处理总数
  };
}

interface LiveTransaction {
  id: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  price: number;
  timestamp: string;
  platform: string;
}

// ============================================
// 数字动画组件
// ============================================

function AnimatedNumber({ 
  value, 
  duration = 1500, 
  prefix = '', 
  suffix = '', 
  decimals = 0 
}: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const { count } = useCountUp(value, { duration });
  
  const formatNumber = (num: number) => {
    // 始终使用 toFixed 来限制小数位数，然后再格式化
    const fixed = num.toFixed(decimals);
    if (decimals === 0) {
      // 整数直接返回，添加千分位
      return parseInt(fixed).toLocaleString('zh-CN');
    }
    // 小数保留指定位数
    return fixed;
  };
  
  return (
    <span>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}

// ============================================
// 指标卡片组件
// ============================================

function MetricCard({ 
  title, 
  value, 
  numericValue,
  smartFormat,
  change, 
  trend, 
  icon: Icon, 
  color,
  delay = 0,
  onClick 
}: { 
  title: string;
  value?: string;
  numericValue?: { value: number; prefix?: string; suffix?: string; decimals?: number };
  smartFormat?: SmartFormatResult;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 8px 24px ${color}15` }}
      onClick={onClick}
      className={`relative p-5 bg-white rounded-xl border border-gray-200 overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 顶部色条 */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1" title={smartFormat?.fullValue}>
            {smartFormat ? (
              <span className="flex items-baseline gap-0.5">
                <span>{smartFormat.prefix}{smartFormat.value}</span>
                {smartFormat.unit && <span className="text-sm text-gray-500">{smartFormat.unit}</span>}
              </span>
            ) : numericValue ? (
              <AnimatedNumber 
                value={numericValue.value} 
                prefix={numericValue.prefix}
                suffix={numericValue.suffix}
                decimals={numericValue.decimals}
              />
            ) : (
              value
            )}
          </p>
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 实时推演控制面板
// ============================================

interface SimulationControlPanelProps {
  isRunning: boolean;
  todayStats: {
    totalOrders: number;
    totalGMV: number;
    roomNights: number;
  };
  generatedOrders: Order[];
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

function SimulationControlPanel({ 
  isRunning, 
  todayStats, 
  generatedOrders,
  onStart, 
  onStop, 
  onClear 
}: SimulationControlPanelProps) {
  const platformNames: Record<string, string> = {
    xianyu: '闲鱼',
    xiaohongshu: '小红书',
    wechat: '微信',
    douyin: '抖音',
  };

  // 智能时间格式化
  const formatSmartTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 按时间排序，最新的在前（只显示当前时间之前的订单）
  const sortedOrders = [...generatedOrders]
    .filter(o => new Date(o.createdAt || 0).getTime() <= Date.now())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Play className={`w-5 h-5 ${isRunning ? 'text-green-500' : 'text-violet-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">实时推演</h3>
              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-medium rounded">
                演示
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  运行中（平均45秒一单）
                </span>
              ) : (
                <span className="text-violet-600">模拟订单生成 · 演示数据</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
            >
              <Pause className="w-4 h-4" />
              暂停推演
            </button>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-600 hover:bg-green-100 transition-colors"
            >
              <Play className="w-4 h-4" />
              开始推演
            </button>
          )}
          
          {generatedOrders.length > 0 && (
            <button
              onClick={onClear}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="清除推演数据"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* 推演统计 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            <AnimatedNumber value={todayStats.totalOrders} suffix="单" />
          </div>
          <div className="text-xs text-gray-500">今日成交</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-violet-600">
            <AnimatedNumber value={todayStats.totalGMV / 10000} prefix="¥" suffix="万" decimals={1} />
          </div>
          <div className="text-xs text-gray-500">今日GMV</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            <AnimatedNumber value={todayStats.roomNights} suffix="晚" />
          </div>
          <div className="text-xs text-gray-500">占用房晚</div>
        </div>
      </div>
      
      {/* 最近成交列表 */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">最近成交</span>
          <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">演示数据</span>
        </div>
        
        {sortedOrders.map((order, idx) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <PartyPopper className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {formatSmartTime(order.createdAt)} {order.roomTypeName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-violet-600">
                ¥{order.totalAmount?.toLocaleString()}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                {platformNames[order.source as string] || order.source}
              </span>
            </div>
          </motion.div>
        ))}
        
        {sortedOrders.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">等待成交...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 实时成交滚动组件
// ============================================

function LiveTransactions({ transactions, showHotelName = true }: { transactions: LiveTransaction[]; showHotelName?: boolean }) {
  const navigate = useNavigate();
  
  const platformNames: Record<string, string> = {
    xianyu: '闲鱼',
    xiaohongshu: '小红书',
    wechat: '微信',
    ctrip: '携程',
    meituan: '美团',
  };

  const platformColors: Record<string, string> = {
    xianyu: '#FFB800',
    xiaohongshu: '#FF2442',
    wechat: '#07C160',
    ctrip: '#00A8FF',
    meituan: '#00E396',
  };

  // 智能时间格式化
  const formatSmartTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 按时间排序，最新的在前
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-500" />
          实时成交
          <span className="flex items-center gap-1.5 text-xs text-gray-500 font-normal">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            实时
          </span>
        </h3>
        <span className="text-xs text-gray-500">今日 {transactions.length} 单</span>
      </div>
      
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {sortedTransactions.map((txn, idx) => (
          <motion.div
            key={txn.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
            onClick={() => navigate('/orders')}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
                style={{ 
                  background: `${platformColors[txn.platform] || '#8B5CF6'}20`,
                  color: platformColors[txn.platform] || '#8B5CF6'
                }}
              >
                {(platformNames[txn.platform] || '未')[0]}
              </div>
              <div>
                {/* 多酒店视角显示酒店名+房型，单酒店视角只显示房型 */}
                {showHotelName ? (
                  <>
                    <div className="text-sm font-medium text-gray-900">{txn.hotelName}</div>
                    <div className="text-xs text-gray-500">{txn.roomType}</div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-gray-900">{txn.roomType}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">¥{txn.price.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">
                {formatSmartTime(txn.timestamp)}
              </div>
            </div>
          </motion.div>
        ))}
        
        {transactions.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无成交数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 订单状态看板组件
// ============================================

function OrderStatusBoard({ status }: { status: TodayOrderStatus }) {
  const navigate = useNavigate();
  
  // 今日新单 items
  const todayNewItems = [
    { 
      key: 'pending', 
      label: '待确认', 
      value: status.todayNew.pending, 
      icon: Clock, 
      color: 'amber',
      desc: '需尽快处理',
      action: '/orders?status=pending'
    },
    { 
      key: 'confirmed', 
      label: '今日新单', 
      value: status.todayNew.confirmed, 
      icon: ShoppingCart, 
      color: 'emerald',
      desc: '已确认',
      action: '/orders?status=today-new'
    },
  ];
  
  // 今日需处理 items
  const attentionItems = [
    { 
      key: 'todayCheckin', 
      label: '今日入住', 
      value: status.todayAttention.todayCheckin, 
      icon: Home, 
      color: 'cyan',
      desc: '待办理入住',
      action: '/orders?status=today-checkin'
    },
    { 
      key: 'checkedIn', 
      label: '在住', 
      value: status.todayAttention.checkedIn, 
      icon: CheckCircle, 
      color: 'violet',
      desc: '已办理入住',
      action: '/orders?status=checked-in'
    },
    { 
      key: 'todayCheckout', 
      label: '今日离店', 
      value: status.todayAttention.todayCheckout, 
      icon: Receipt, 
      color: 'blue',
      desc: '待退房结算',
      action: '/orders?status=today-checkout'
    },
    { 
      key: 'pendingInvoice', 
      label: '待开票', 
      value: status.todayAttention.pendingInvoice, 
      icon: DollarSign, 
      color: 'green',
      desc: '财务待处理',
      action: '/orders?status=pending-invoice'
    },
    { 
      key: 'todayRefunded', 
      label: '今日退款', 
      value: status.todayAttention.todayRefunded, 
      icon: RefreshCw, 
      color: 'red',
      desc: '退款完成',
      action: '/orders?status=refunded'
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', light: 'bg-amber-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', light: 'bg-cyan-100' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', light: 'bg-violet-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', light: 'bg-green-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', light: 'bg-red-100' },
  };
  
  const renderItem = (item: typeof todayNewItems[0]) => {
    const colors = colorMap[item.color];
    const Icon = item.icon;
    const hasAction = item.value > 0;
    
    return (
      <motion.div
        key={item.key}
        whileHover={{ scale: hasAction ? 1.03 : 1 }}
        onClick={() => hasAction && navigate(item.action)}
        className={`p-4 rounded-xl border transition-all ${
          hasAction 
            ? `${colors.bg} ${colors.border} cursor-pointer shadow-sm hover:shadow-md` 
            : 'bg-gray-50 border-gray-100 cursor-default'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-lg ${hasAction ? colors.light : 'bg-gray-100'} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${hasAction ? colors.text : 'text-gray-400'}`} />
          </div>
        </div>
        <div className={`text-2xl font-bold ${hasAction ? colors.text : 'text-gray-400'}`}>
          <AnimatedNumber value={item.value} />
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
        {hasAction && (
          <div className={`text-[10px] mt-1 ${colors.text}`}>{item.desc} →</div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-500" />
          订单状态看板
          <span className="text-xs text-gray-500 font-normal px-2 py-0.5 bg-gray-100 rounded-full">
            需处理 {status.todayAttention.total} 笔 · 新单 {status.todayNew.total} 笔
          </span>
        </h3>
      </div>
      
      {/* 今日新单 */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          今日新单（0点至今）
        </div>
        <div className="grid grid-cols-2 gap-3">
          {todayNewItems.map(renderItem)}
        </div>
      </div>
      
      {/* 分隔线 */}
      <div className="border-t border-gray-100 my-4"></div>
      
      {/* 今日需处理 */}
      <div>
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          今日需处理（含历史订单）
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {attentionItems.map(renderItem)}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 快捷操作入口组件
// ============================================

function QuickActions({ selectedHotelIds }: { selectedHotelIds: string[] }) {
  const navigate = useNavigate();
  
  const actions = [
    { 
      label: '批量确认订单', 
      icon: CheckCircle, 
      color: 'violet', 
      path: '/orders',
      desc: '一键确认待处理订单'
    },
    { 
      label: '批量调价', 
      icon: Zap, 
      color: 'amber', 
      path: '/strategy/pricing',
      desc: `${selectedHotelIds.length}家酒店`
    },
    { 
      label: '生成内容', 
      icon: Activity, 
      color: 'green', 
      path: '/content',
      desc: 'AI批量生成营销内容'
    },
    { 
      label: '查看报表', 
      icon: Target, 
      color: 'blue', 
      path: '/dashboard',
      desc: '数据大盘分析'
    },
  ];

  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-200',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200',
    green: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${colorMap[action.color]}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm">{action.label}</div>
              <div className="text-xs opacity-70 truncate">{action.desc}</div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function TodayOverview() {
  const navigate = useNavigate();
  const { 
    hotels, 
    selectedHotelIds, 
    orders,
    dashboardSummary,
    alerts,
    loadDashboardData,
    loadOrders,
    generateSmartAlerts,
    dismissAlert,
    clearAllAlerts,
    realtimeSimulation,
    startRealtimeSimulation,
    stopRealtimeSimulation,
    clearSimulationOrders,
  } = useEnterpriseStore();
  
  // 获取当前用户角色
  const { user } = useAuthStore();
  const isGroupOperator = user?.role === EnterpriseRole.GROUP_ADMIN || user?.role === EnterpriseRole.GROUP_OPERATOR;

  // 加载数据 - 当酒店选择变化时重新加载
  useEffect(() => {
    loadDashboardData();
    loadOrders();
  }, [loadDashboardData, loadOrders, selectedHotelIds]);
  
  // 生成智能预警
  useEffect(() => {
    if (selectedHotelIds.length > 0) {
      generateSmartAlerts();
    }
    // 每5分钟刷新一次预警
    const interval = setInterval(() => {
      if (selectedHotelIds.length > 0) {
        generateSmartAlerts();
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [selectedHotelIds, orders, generateSmartAlerts]);

  // 获取选中的酒店
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  // 如果没有选中酒店，默认选中所有
  useEffect(() => {
    if (selectedHotelIds.length === 0 && hotels.length > 0) {
      // 这里可以通过 store 的 selectAllHotels 来全选
    }
  }, [hotels, selectedHotelIds]);

  // 聚合统计数据
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 昨日日期
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // 今日订单（从选中酒店中筛选，且在当前时间之前）
    const todayOrders = orders.filter(o => {
      if (!selectedHotelIds.includes(o.hotelId)) return false;
      if (!o.createdAt?.startsWith(today)) return false;
      // 过滤掉未来时间的订单
      const orderTime = new Date(o.createdAt).getTime();
      return orderTime <= now.getTime();
    });
    
    // 昨日订单（从选中酒店中筛选）
    const yesterdayOrders = orders.filter(o => {
      if (!selectedHotelIds.includes(o.hotelId)) return false;
      return o.createdAt?.startsWith(yesterdayStr);
    });
    
    // 计算今日总GMV
    const totalGMV = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // 计算昨日总GMV
    const yesterdayGMV = yesterdayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    // 计算订单数
    const totalOrders = todayOrders.length;
    const yesterdayOrdersCount = yesterdayOrders.length;
    
    // 计算入住率（从dashboardSummary聚合）
    const avgOccupancy = selectedHotels.length > 0
      ? selectedHotels.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / selectedHotels.length
      : 0;
    
    // 使用dashboardSummary返回的RevPAR，如果没有则计算
    const totalRooms = selectedHotels.reduce((sum, h) => sum + (h.roomCount || 0), 0);
    const calculatedRevPAR = totalRooms > 0 ? Math.round(totalGMV / totalRooms) : 0;
    const revpar = dashboardSummary?.revpar || calculatedRevPAR || 0;

    // 计算同比变化（基于实际订单数据）
    const gmvChange = yesterdayGMV > 0 ? (totalGMV - yesterdayGMV) / yesterdayGMV : 0;
    const ordersChange = yesterdayOrdersCount > 0 ? (totalOrders - yesterdayOrdersCount) / yesterdayOrdersCount : 0;

    return {
      gmv: totalGMV,
      orders: totalOrders,
      occupancy: avgOccupancy,
      revpar,
      gmvChange,
      ordersChange,
      occupancyChange: 0, // 入住率暂无对比数据
    };
  }, [orders, selectedHotels, selectedHotelIds, dashboardSummary]);

  // 计算今日订单状态（区分今日新单和今日需处理）
  const todayOrderStatus = useMemo((): TodayOrderStatus => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const selectedOrders = orders.filter(o => selectedHotelIds.includes(o.hotelId));
    
    // 今日新单（今日0点至今创建的订单）
    const todayNewOrders = selectedOrders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      return orderDate === today;
    });
    
    // 今日新单统计
    const todayNew = {
      pending: todayNewOrders.filter(o => o.status === 'pending').length,
      confirmed: todayNewOrders.filter(o => o.status === 'confirmed').length,
      total: todayNewOrders.length,
    };
    
    // 今日需处理统计
    const todayAttention = {
      // 今日入住：今日到店且已确认（等待办理入住）
      todayCheckin: selectedOrders.filter(o => 
        o.checkInDate === today && o.status === 'confirmed'
      ).length,
      // 在住：已入住未退房
      checkedIn: selectedOrders.filter(o => o.status === 'checked_in').length,
      // 今日离店：今日需退房（已入住或已退房）
      todayCheckout: selectedOrders.filter(o => 
        o.checkOutDate === today && ['checked_in', 'checked_out'].includes(o.status || '')
      ).length,
      // 待开票：已退房未开票（简化逻辑：已退房即待开票）
      pendingInvoice: selectedOrders.filter(o => o.status === 'checked_out').length,
      // 今日退款：今日创建的退款订单（包括标准订单和非标渠道订单）
      todayRefunded: (() => {
        // 标准订单中的今日退款
        const standardRefunds = todayNewOrders.filter(o => o.status === 'refunded' as Order['status']).length;
        // 非标渠道订单中的今日退款
        const nsRefunds = MOCK_NON_STANDARD_ORDERS.filter(o => {
          if (!selectedHotelIds.includes(o.hotelId)) return false;
          if (!o.createdAt?.startsWith(today)) return false;
          return o.status === 'cancelled';
        }).length;
        return standardRefunds + nsRefunds;
      })(),
      // 需处理总数
      total: 0, // 下面计算
    };
    
    // 去重计算需处理总数（一个订单可能同时满足多个条件，但只算一次）
    const attentionOrderIds = new Set<string>();
    selectedOrders.forEach(o => {
      if (o.checkInDate === today && o.status === 'confirmed') attentionOrderIds.add(o.id);
      if (o.status === 'checked_in') attentionOrderIds.add(o.id);
      if (o.checkOutDate === today && ['checked_in', 'checked_out'].includes(o.status || '')) attentionOrderIds.add(o.id);
      if (o.status === 'checked_out') attentionOrderIds.add(o.id);
    });
    todayNewOrders.forEach(o => {
      if (o.status === 'refunded') attentionOrderIds.add(o.id);
    });
    todayAttention.total = attentionOrderIds.size;
    
    return { todayNew, todayAttention };
  }, [orders, selectedHotelIds]);

  // 生成实时成交数据（只显示今天且在当前时间之前的订单）
  const liveTransactions = useMemo((): LiveTransaction[] => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return orders
      .filter(o => {
        // 1. 必须是选中的酒店
        if (!selectedHotelIds.includes(o.hotelId)) return false;
        
        // 2. 必须是今天的订单
        const orderDate = o.createdAt?.split('T')[0];
        if (orderDate !== today) return false;
        
        // 3. 必须在当前时间之前（不能是未来订单）
        const orderTime = new Date(o.createdAt || 0).getTime();
        if (orderTime > now.getTime()) return false;
        
        return true;
      })
      .map(o => ({
        id: o.id,
        hotelId: o.hotelId,
        hotelName: hotels.find(h => h.id === o.hotelId)?.name || '未知酒店',
        roomType: o.roomTypeName || '标准房',
        price: o.totalAmount || 0,
        timestamp: o.createdAt || new Date().toISOString(),
        platform: o.source || 'direct',
      }));
  }, [orders, selectedHotelIds, hotels]);

  return (
    <div className="space-y-6">
      {/* 演示数据提示横幅 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-900">演示数据模式</div>
            <p className="text-sm text-amber-800 mt-1">
              当前展示的是演示数据，所有经营数据（GMV、订单、入住率等）均为模拟生成，仅供功能演示使用。
              实时推演功能模拟订单生成过程，帮助您体验系统功能。
            </p>
            {/* TODO: 接入真实数据API后移除此提示 */}
          </div>
        </div>
      </div>

      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">今日实况</h1>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              演示数据
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            实时监控 {selectedHotelIds.length} 家酒店经营数据
            {selectedHotelIds.length === 0 && '（请在顶部选择酒店）'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            数据更新于 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {/* TODO: 刷新按钮当前调用的是模拟数据加载，需接入真实API */}
          <button 
            onClick={() => { loadDashboardData(); loadOrders(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </motion.div>

      {/* 智能预警面板 - 根据角色显示不同内容 */}
      <SmartAlertPanel 
        alerts={alerts}
        onDismiss={dismissAlert}
        onClearAll={clearAllAlerts}
        isGroupOperator={isGroupOperator}
        selectedHotelCount={selectedHotelIds.length}
      />

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="今日GMV"
          smartFormat={formatSmartAmount(stats.gmv)}
          change={`${stats.gmvChange >= 0 ? '+' : ''}${(stats.gmvChange * 100).toFixed(1)}% 较昨日`}
          trend={stats.gmvChange >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          color="#8B5CF6"
          delay={0}
          onClick={() => navigate('/dashboard')}
        />
        <MetricCard
          title="今日订单"
          smartFormat={formatSmartCount(stats.orders)}
          change={`${stats.ordersChange >= 0 ? '+' : ''}${(stats.ordersChange * 100).toFixed(0)}% 较昨日`}
          trend={stats.ordersChange >= 0 ? 'up' : 'down'}
          icon={ShoppingCart}
          color="#10B981"
          delay={0.05}
          onClick={() => navigate('/orders')}
        />
        <MetricCard
          title="平均入住率"
          numericValue={{ value: stats.occupancy * 100, suffix: '%', decimals: 0 }}
          change={`${stats.occupancyChange >= 0 ? '+' : ''}${(stats.occupancyChange * 100).toFixed(1)}% 较昨日`}
          trend={stats.occupancyChange >= 0 ? 'up' : 'down'}
          icon={Percent}
          color="#F59E0B"
          delay={0.1}
        />
        <MetricCard
          title="RevPAR"
          smartFormat={formatSmartAmount(stats.revpar)}
          change={stats.revpar > 0 ? '较昨日有增长' : '暂无对比'}
          trend={stats.revpar > 0 ? 'up' : 'neutral'}
          icon={Target}
          color="#3B82F6"
          delay={0.15}
        />
      </div>

      {/* 快捷操作入口 */}
      <QuickActions selectedHotelIds={selectedHotelIds} />

      {/* 实时推演控制面板 */}
      <div className="relative">
        {/* 演示模式标记 */}
        <div className="absolute -top-3 left-4 z-10">
          <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full border border-violet-200">
            演示模式
          </span>
        </div>
        <SimulationControlPanel 
          isRunning={realtimeSimulation.isRunning}
          todayStats={realtimeSimulation.todayStats}
          generatedOrders={orders.filter(o => {
            // 只显示当前选中的酒店的推演订单
            if (!o.id.startsWith('SIM-') || !selectedHotelIds.includes(o.hotelId)) return false;
            // 过滤掉未来时间的订单（防止显示未来订单）
            const orderTime = new Date(o.createdAt || 0).getTime();
            return orderTime <= Date.now();
          })}
          onStart={startRealtimeSimulation}
          onStop={stopRealtimeSimulation}
          onClear={clearSimulationOrders}
        />
      </div>

      {/* 订单状态看板 */}
      <OrderStatusBoard status={todayOrderStatus} />

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 实时成交 */}
        <div className="lg:col-span-2">
          <LiveTransactions 
            transactions={liveTransactions} 
            showHotelName={selectedHotelIds.length > 1}
          />
        </div>
        
        {/* 酒店概况 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-500" />
              {selectedHotels.length > 1 ? '酒店概况' : '酒店信息'}
            </h3>
            {selectedHotels.length > 1 && (
              <span className="text-xs text-gray-500">{selectedHotels.length} 家</span>
            )}
          </div>
          
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {selectedHotels.map((hotel, idx) => (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/hotel-workbench/${hotel.id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{hotel.name}</div>
                  <div className="text-xs text-gray-500">{hotel.city} · {hotel.roomCount}间房</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-violet-600">
                    {hotel.occupancyRate ? `${(hotel.occupancyRate * 100).toFixed(0)}%` : '--'}
                  </div>
                  <div className="text-[10px] text-gray-400">入住率</div>
                </div>
              </motion.div>
            ))}
            
            {selectedHotels.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">请在顶部选择酒店</p>
              </div>
            )}
          </div>
          
          {selectedHotels.length > 1 && (
            <button 
              onClick={() => navigate('/comparison')}
              className="w-full mt-3 py-2 text-sm text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors flex items-center justify-center gap-1"
            >
              查看门店对比 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 智能预警面板组件
// ============================================

interface SmartAlertPanelProps {
  alerts: SmartAlert[];
  onDismiss: (alertId: string) => void;
  onClearAll: () => void;
  isGroupOperator: boolean;
  selectedHotelCount: number;
}

function SmartAlertPanel({ 
  alerts, 
  onDismiss, 
  onClearAll,
  isGroupOperator,
  selectedHotelCount 
}: SmartAlertPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  
  // 过滤出未处理的预警
  const activeAlerts = alerts.filter(a => !a.dismissed);
  
  // 按级别分组
  const criticalAlerts = activeAlerts.filter(a => a.level === 'critical');
  const warningAlerts = activeAlerts.filter(a => a.level === 'warning');
  const infoAlerts = activeAlerts.filter(a => a.level === 'info');
  
  // 获取图标和颜色
  const getAlertConfig = (level: SmartAlert['level']) => {
    switch (level) {
      case 'critical':
        return { 
          icon: AlertOctagon, 
          bgColor: 'bg-red-50', 
          borderColor: 'border-red-200',
          textColor: 'text-red-600',
          iconColor: 'text-red-500'
        };
      case 'warning':
        return { 
          icon: AlertTriangle, 
          bgColor: 'bg-amber-50', 
          borderColor: 'border-amber-200',
          textColor: 'text-amber-600',
          iconColor: 'text-amber-500'
        };
      default:
        return { 
          icon: AlertCircle, 
          bgColor: 'bg-blue-50', 
          borderColor: 'border-blue-200',
          textColor: 'text-blue-600',
          iconColor: 'text-blue-500'
        };
    }
  };
  
  // 如果没有预警，不显示面板
  if (activeAlerts.length === 0 || selectedHotelCount === 0) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${
        criticalAlerts.length > 0 ? 'border-red-200 bg-red-50/30' : 
        warningAlerts.length > 0 ? 'border-amber-200 bg-amber-50/30' : 
        'border-blue-200 bg-blue-50/30'
      }`}
    >
      {/* 预警面板头部 */}
      <div 
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-opacity-50 transition-colors ${
          criticalAlerts.length > 0 ? 'bg-red-50 hover:bg-red-100' : 
          warningAlerts.length > 0 ? 'bg-amber-50 hover:bg-amber-100' : 
          'bg-blue-50 hover:bg-blue-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            criticalAlerts.length > 0 ? 'bg-red-100' : 
            warningAlerts.length > 0 ? 'bg-amber-100' : 
            'bg-blue-100'
          }`}>
            <Bell className={`w-4 h-4 ${
              criticalAlerts.length > 0 ? 'text-red-500' : 
              warningAlerts.length > 0 ? 'text-amber-500' : 
              'text-blue-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                智能预警
              </span>
              {/* 预警数量徽章 */}
              {criticalAlerts.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                  {criticalAlerts.length} 紧急
                </span>
              )}
              {warningAlerts.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
                  {warningAlerts.length} 提醒
                </span>
              )}
              {infoAlerts.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                  {infoAlerts.length} 通知
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isGroupOperator 
                ? `监控 ${selectedHotelCount} 家酒店经营状况` 
                : '实时监控酒店经营状况'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 一键清除 */}
          {activeAlerts.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white/50 transition-colors"
            >
              清除全部
            </button>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
          </motion.div>
        </div>
      </div>
      
      {/* 预警列表 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {activeAlerts.map((alert, idx) => {
                const config = getAlertConfig(alert.level);
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/50`}>
                      <Icon className={`w-4 h-4 ${config.iconColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {/* 酒店名称 - 仅集团运营显示 */}
                          {isGroupOperator && (
                            <div className="text-xs text-gray-500 mb-0.5">
                              {alert.hotelName}
                            </div>
                          )}
                          <p className={`font-medium text-sm ${config.textColor}`}>
                            {alert.message}
                          </p>
                          {alert.detail && (
                            <p className="text-xs text-gray-600 mt-1">
                              {alert.detail}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(alert.timestamp).toLocaleTimeString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        
                        {alert.requiresAction && alert.actionLink && (
                          <button
                            onClick={() => navigate(alert.actionLink!)}
                            className={`text-xs px-3 py-1 rounded-full bg-white border ${config.borderColor} ${config.textColor} hover:bg-opacity-80 transition-colors flex items-center gap-1`}
                          >
                            {alert.actionText || '查看'}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        
                        {!alert.requiresAction && (
                          <button
                            onClick={() => onDismiss(alert.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            已阅
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {activeAlerts.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无预警信息</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TodayOverview;
