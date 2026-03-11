/**
 * Shadow-Bees V52 - 订单管理页面
 * 钱货盘点 - 订单全流程管理
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, CheckCircle, XCircle, Clock, 
  Home, Receipt, RefreshCw,
  User, Building2, Bed, TrendingUp, AlertTriangle,
  DollarSign, Package, ChevronDown, SlidersHorizontal,
  CheckCircle2, Ban
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { PlatformLogo } from '@/components/PlatformLogo';
import { calculateFinancialStats } from '@/utils/helpers';
// 根据时间范围筛选订单的辅助函数
function filterOrdersByTimeRange(
  orders: Transaction[],
  timeRange: string,
  customStart?: string,
  customEnd?: string
): Transaction[] {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(0);
      endDate = customEnd ? new Date(customEnd) : now;
      break;
    default:
      return orders;
  }

  return orders.filter(order => {
    const orderDate = new Date(order.timestamp);
    return orderDate >= startDate && orderDate <= endDate;
  });
}
import type { OrderStatus, Transaction } from '@/types';
import { useToast } from '@/components/ui/Toast';

// 平台名称中文映射
const platformNames: Record<string, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
  ota: 'OTA',
};

// 订单状态配置
const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { 
    label: '待确认', 
    color: '#F59E0B', 
    bgColor: 'bg-amber-500/10',
    icon: Clock 
  },
  paid: { 
    label: '已付款', 
    color: '#3B82F6', 
    bgColor: 'bg-blue-500/10',
    icon: CheckCircle 
  },
  checked_in: { 
    label: '已入住', 
    color: '#8B5CF6', 
    bgColor: 'bg-purple-500/10',
    icon: Home 
  },
  checked_out: { 
    label: '已离店', 
    color: '#10B981', 
    bgColor: 'bg-green-500/10',
    icon: Receipt 
  },
  invoiced: { 
    label: '已开票', 
    color: '#06B6D4', 
    bgColor: 'bg-cyan-500/10',
    icon: DollarSign 
  },
  refunded: { 
    label: '已退款', 
    color: '#EF4444', 
    bgColor: 'bg-red-500/10',
    icon: RefreshCw 
  },
  refund_pending: { 
    label: '退款待处理', 
    color: '#F97316', 
    bgColor: 'bg-orange-500/10',
    icon: AlertTriangle 
  },
  cancelled: { 
    label: '已取消', 
    color: '#6B7280', 
    bgColor: 'bg-gray-500/10',
    icon: XCircle 
  },
};

// 时间范围配置
const timeRangeOptions = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义' },
  { key: 'all', label: '全部' },
];

// 平台选项
const platformOptions: { key: string; label: string; platform: string }[] = [
  { key: 'xianyu', label: '闲鱼', platform: 'xianyu' },
  { key: 'xiaohongshu', label: '小红书', platform: 'xiaohongshu' },
  { key: 'wechat', label: '微信', platform: 'wechat' },
];

// 房型选项（从酒店配置动态获取）
const getRoomTypeOptions = (hotel: any) => {
  return hotel?.roomTypes?.map((r: any) => ({ key: r.id, label: r.name })) || [];
};

// 金额范围选项
const priceRanges = [
  { key: 'all', label: '全部金额', min: 0, max: Infinity },
  { key: 'under200', label: '200元以下', min: 0, max: 200 },
  { key: '200-400', label: '200-400元', min: 200, max: 400 },
  { key: '400-600', label: '400-600元', min: 400, max: 600 },
  { key: 'over600', label: '600元以上', min: 600, max: Infinity },
];





export default function OrderManagement() {
  const { transactions, currentHotel, autoConfirmOrders, setAutoConfirmOrders, inventory } = useUnifiedStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [customDateRange] = useState<{ start?: string; end?: string }>({});

  // 订单列表的 ref，用于点击筛选后滚动
  const orderListRef = useRef<HTMLDivElement>(null);

  const roomTypeOptions = getRoomTypeOptions(currentHotel);

  // 处理筛选并滚动到订单列表
  const handleStatusFilter = (status: OrderStatus | 'all') => {
    setStatusFilter(status);
    // 延迟滚动，等待筛选渲染完成
    setTimeout(() => {
      orderListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // 计算统计数据（基于筛选后的订单）- 使用统一的 calculateFinancialStats 函数
  const stats = useMemo(() => {
    // 时间筛选
    let timeFilteredOrders = transactions;
    if (timeRange !== 'all') {
      timeFilteredOrders = filterOrdersByTimeRange(
        transactions,
        timeRange,
        customDateRange.start,
        customDateRange.end
      );
    }

    // 使用统一的财务统计函数（与库存日历、经营概览、财务页面一致）
    const financialStats = calculateFinancialStats(timeFilteredOrders);

    // 各状态订单统计
    const pendingOrders = timeFilteredOrders.filter(t => t.status === 'pending').length;
    const paidOrders = timeFilteredOrders.filter(t => t.status === 'paid').length;
    const checkedInOrders = timeFilteredOrders.filter(t => t.status === 'checked_in').length;
    const checkedOutOrders = timeFilteredOrders.filter(t => t.status === 'checked_out').length;
    const invoicedOrders = timeFilteredOrders.filter(t => t.status === 'invoiced').length;
    const refundedOrders = timeFilteredOrders.filter(t => t.status === 'refunded').length;
    const refundPendingOrders = timeFilteredOrders.filter(t => t.status === 'refund_pending').length;
    
    // 平台分布 - 使用统一的 gross 口径
    const platformStats = {
      xianyu: timeFilteredOrders.filter(t => t.platform === 'xianyu' && t.status !== 'refunded').reduce((sum, t) => sum + (t.financials?.gross || t.price || 0), 0),
      xiaohongshu: timeFilteredOrders.filter(t => t.platform === 'xiaohongshu' && t.status !== 'refunded').reduce((sum, t) => sum + (t.financials?.gross || t.price || 0), 0),
      wechat: timeFilteredOrders.filter(t => t.platform === 'wechat' && t.status !== 'refunded').reduce((sum, t) => sum + (t.financials?.gross || t.price || 0), 0),
    };

    // 计算财务影响
    const financials = {
      totalRevenue: financialStats.realtimeGMV,
      refundCount: financialStats.refundOrders,
      refundAmount: financialStats.refundAmount,
      netRevenue: financialStats.netRevenue,
      avgOrderValue: financialStats.avgPrice,
    };

    // 计算今日库存影响（从 inventory.calendar 获取实时数据）
    const today = new Date().toISOString().split('T')[0];
    const todayInv = inventory.calendar?.[today];
    
    // 今日总房数和剩余可售
    const todayTotalRooms = todayInv?.summary.totalRooms || 
      currentHotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
    const todayAvailable = todayInv?.summary.totalAvailable || 
      Math.max(0, todayTotalRooms - timeFilteredOrders.filter(t => {
        if (t.status === 'refunded' || !t.checkInDate || !t.checkOutDate) return false;
        return t.checkInDate <= today && t.checkOutDate > today;
      }).length);
    
    // 计算灵活渠道和OTA渠道可售（基于实际库存按比例分配）
    // 逻辑：剩余可售 = OTA可售 + 灵活可售
    let flexibleTotalAllocation = 0; // 灵活渠道总配额
    let otaTotalAllocation = 0; // OTA渠道总配额
    
    if (todayInv) {
      Object.entries(todayInv.byRoomType).forEach(([roomTypeId, roomInv]) => {
        const room = currentHotel.roomTypes.find(r => r.id === roomTypeId);
        if (room) {
          flexibleTotalAllocation += roomInv.channelAllocation.flexible;
          otaTotalAllocation += roomInv.channelAllocation.ota;
        }
      });
    } else {
      // 从库存池获取
      flexibleTotalAllocation = inventory.flexiblePool?.total || 0;
      otaTotalAllocation = inventory.otaPool?.total || 0;
    }
    
    // 按配额比例分配实际可售
    const totalAllocation = flexibleTotalAllocation + otaTotalAllocation;
    let flexibleAvailable = 0;
    let otaAvailable = 0;
    
    if (totalAllocation > 0) {
      const flexibleRatio = flexibleTotalAllocation / totalAllocation;
      flexibleAvailable = Math.round(todayAvailable * flexibleRatio);
      otaAvailable = todayAvailable - flexibleAvailable; // 剩余给OTA，确保总和等于todayAvailable
    } else {
      flexibleAvailable = Math.round(todayAvailable * 0.4); // 默认40%
      otaAvailable = todayAvailable - flexibleAvailable;
    }
    
    const inventoryImpact = {
      totalRooms: todayTotalRooms,
      availableRooms: todayAvailable,
      flexibleAvailable,
      otaAvailable,
      occupancyRate: todayTotalRooms > 0 ? Math.round(((todayTotalRooms - todayAvailable) / todayTotalRooms) * 100) : 0,
    };

    return {
      totalRevenue: financialStats.realtimeGMV,
      totalOrders: financialStats.realtimeOrders,
      pendingOrders,
      paidOrders,
      checkedInOrders,
      checkedOutOrders,
      invoicedOrders,
      refundedOrders,
      refundPendingOrders,
      platformStats,
      financials,
      inventoryImpact,
      refundCount: financialStats.refundOrders,
      refundAmount: financialStats.refundAmount,
    };
  }, [transactions, timeRange, customDateRange, currentHotel]);

  // 筛选订单
  const filteredOrders = useMemo(() => {
    let result = transactions;

    // 搜索筛选
    if (searchQuery) {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.roomType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // 平台筛选
    if (platformFilter !== 'all') {
      result = result.filter(order => order.platform === platformFilter);
    }

    // 房型筛选
    if (roomTypeFilter !== 'all') {
      result = result.filter(order => order.roomType === roomTypeFilter);
    }

    // 金额范围筛选
    if (priceRange !== 'all') {
      const range = priceRanges.find(r => r.key === priceRange);
      if (range) {
        result = result.filter(order => order.price >= range.min && order.price <= range.max);
      }
    }

    // 时间范围筛选
    if (timeRange !== 'all') {
      result = filterOrdersByTimeRange(result, timeRange, customDateRange.start, customDateRange.end);
    }

    return result;
  }, [transactions, searchQuery, statusFilter, platformFilter, roomTypeFilter, priceRange, timeRange, customDateRange]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-din">钱货盘点</h1>
          <p className="text-sm text-text-secondary mt-1">订单全生命周期管理 · 实时追踪</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 自动确认开关 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border-color">
            <span className="text-sm text-gray-300">自动确认</span>
            <button
              onClick={() => setAutoConfirmOrders(!autoConfirmOrders)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoConfirmOrders ? 'bg-neon-green' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoConfirmOrders ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs ${autoConfirmOrders ? 'text-neon-green' : 'text-text-secondary'}`}>
              {autoConfirmOrders ? '开启' : '关闭'}
            </span>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              showFilters 
                ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan' 
                : 'border-border-color text-text-secondary hover:border-neon-cyan'
            }`}
          >
            <SlidersHorizontal size={18} />
            筛选
            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 总营收 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color cursor-pointer hover:border-neon-green transition-colors"
          onClick={() => handleStatusFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">总营收</span>
            <DollarSign size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">
            ¥{stats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-text-hint mt-1">不含退款</p>
        </motion.div>

        {/* 总订单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color cursor-pointer hover:border-neon-cyan transition-colors"
          onClick={() => handleStatusFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">总订单</span>
            <Package size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalOrders}</p>
          <div className="flex items-center gap-2 mt-1">
            {stats.pendingOrders > 0 && (
              <span 
                className="text-xs text-neon-amber cursor-pointer hover:underline px-2 py-0.5 rounded bg-neon-amber/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusFilter('pending');
                }}
              >
                {stats.pendingOrders} 待确认
              </span>
            )}
          </div>
        </motion.div>

        {/* 退款订单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-5 border cursor-pointer transition-colors ${
            stats.refundPendingOrders > 0 || stats.refundedOrders > 0
              ? 'bg-neon-red/10 border-neon-red/50 hover:border-neon-red' 
              : 'bg-bg-secondary border-border-color hover:border-neon-red'
          }`}
          onClick={() => handleStatusFilter('refund_pending')}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm">退款/售后</span>
            <RefreshCw size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">
            {stats.refundPendingOrders + stats.refundedOrders}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {stats.refundPendingOrders > 0 && (
              <span 
                className="text-xs text-neon-red cursor-pointer hover:underline px-2 py-0.5 rounded bg-neon-red/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusFilter('refund_pending');
                }}
              >
                {stats.refundPendingOrders} 退款中
              </span>
            )}
            {stats.refundedOrders > 0 && (
              <span 
                className="text-xs text-text-secondary cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusFilter('refunded');
                }}
              >
                {stats.refundedOrders} 已退款
              </span>
            )}
          </div>
        </motion.div>

        {/* 平台分布 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-bg-secondary rounded-xl p-5 border border-border-color"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary text-sm">平台营收分布</span>
            <TrendingUp size={18} className="text-neon-purple" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-text-secondary">闲鱼</p>
              <p className="font-bold text-neon-amber">¥{stats.platformStats.xianyu.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary">小红书</p>
              <p className="font-bold text-neon-red">¥{stats.platformStats.xiaohongshu.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary">微信</p>
              <p className="font-bold text-neon-cyan">¥{stats.platformStats.wechat.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 财务影响分析 */}
      <div className="bg-bg-secondary rounded-xl p-5 border border-border-color">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <DollarSign size={18} className="text-neon-cyan" />
          财务影响
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-xs text-text-secondary">总营收</p>
            <p className="text-xl font-bold text-neon-green">¥{stats.financials.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-xs text-text-secondary">退款金额</p>
            <p className="text-xl font-bold text-neon-red">-¥{stats.financials.refundAmount.toLocaleString()}</p>
            <p className="text-xs text-neon-red">{stats.financials.refundCount} 笔</p>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-xs text-text-secondary">净收入</p>
            <p className="text-xl font-bold text-neon-cyan">¥{stats.financials.netRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <p className="text-xs text-text-secondary">客单价</p>
            <p className="text-xl font-bold">¥{stats.financials.avgOrderValue.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* 库存影响 */}
      <div className="bg-bg-secondary rounded-xl p-5 border border-border-color">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Bed size={18} className="text-neon-purple" />
          今日库存
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
            <span className="text-sm text-text-secondary">总房数</span>
            <span className="font-bold">{stats.inventoryImpact.totalRooms}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
            <span className="text-sm text-text-secondary">剩余可售</span>
            <span className={`font-bold ${stats.inventoryImpact.availableRooms < 10 ? 'text-neon-red' : 'text-neon-green'}`}>
              {stats.inventoryImpact.availableRooms}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
            <span className="text-sm text-text-secondary">灵活渠道</span>
            <span className={`font-bold ${stats.inventoryImpact.flexibleAvailable < 5 ? 'text-neon-red' : 'text-neon-cyan'}`}>
              {stats.inventoryImpact.flexibleAvailable}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
            <span className="text-sm text-text-secondary">OTA渠道</span>
            <span className="font-bold text-blue-400">{stats.inventoryImpact.otaAvailable}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
            <span className="text-sm text-text-secondary">入住率</span>
            <span className={`font-bold ${stats.inventoryImpact.occupancyRate > 80 ? 'text-neon-red' : 'text-neon-cyan'}`}>
              {stats.inventoryImpact.occupancyRate}%
            </span>
          </div>
        </div>
        
        {/* 退款/库存预警 */}
        {(stats.inventoryImpact.availableRooms < 10 || stats.inventoryImpact.flexibleAvailable < 5 || stats.refundPendingOrders > 0) && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            stats.inventoryImpact.availableRooms < 10 || stats.inventoryImpact.flexibleAvailable < 5 || stats.refundPendingOrders > 0
              ? 'bg-neon-red/10 border border-neon-red/30' 
              : 'bg-neon-green/10 border border-neon-green/30'
          }`}>
            <AlertTriangle size={16} className={
              stats.inventoryImpact.availableRooms < 10 || stats.inventoryImpact.flexibleAvailable < 5 || stats.refundPendingOrders > 0
                ? 'text-neon-red' 
                : 'text-neon-green'
            } />
            <span className={`text-sm ${
              stats.inventoryImpact.availableRooms < 10 || stats.inventoryImpact.flexibleAvailable < 5 || stats.refundPendingOrders > 0
                ? 'text-neon-red' 
                : 'text-neon-green'
            }`}>
              {stats.inventoryImpact.availableRooms < 10 && `总库存仅剩${stats.inventoryImpact.availableRooms}间`}
              {stats.inventoryImpact.flexibleAvailable < 5 && `${stats.inventoryImpact.availableRooms < 10 ? ' · ' : ''}灵活渠道仅剩${stats.inventoryImpact.flexibleAvailable}间`}
              {stats.refundPendingOrders > 0 && `${(stats.inventoryImpact.availableRooms < 10 || stats.inventoryImpact.flexibleAvailable < 5) ? ' · ' : ''}${stats.refundPendingOrders}笔退款待处理`}
            </span>
          </div>
        )}
      </div>

      {/* 筛选面板 */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-bg-secondary rounded-xl p-5 border border-border-color overflow-hidden"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 时间范围 */}
              <div>
                <label className="text-sm text-text-secondary block mb-2">时间范围</label>
                <div className="flex flex-wrap gap-2">
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setTimeRange(option.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        timeRange === option.key
                          ? 'bg-neon-cyan text-black'
                          : 'bg-bg-primary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 订单状态 */}
              <div>
                <label className="text-sm text-text-secondary block mb-2">订单状态</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm"
                >
                  <option value="all">全部状态</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* 平台 */}
              <div>
                <label className="text-sm text-text-secondary block mb-2">平台</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm"
                >
                  <option value="all">全部平台</option>
                  {platformOptions.map((option) => (
                    <option key={option.key} value={option.platform}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* 房型 */}
              <div>
                <label className="text-sm text-text-secondary block mb-2">房型</label>
                <select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm"
                >
                  <option value="all">全部房型</option>
                  {roomTypeOptions.map((option: { key: string; label: string }) => (
                    <option key={option.key} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* 金额范围 */}
              <div>
                <label className="text-sm text-text-secondary block mb-2">金额范围</label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm"
                >
                  {priceRanges.map((range) => (
                    <option key={range.key} value={range.key}>{range.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 清除筛选 */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setPlatformFilter('all');
                  setRoomTypeFilter('all');
                  setPriceRange('all');
                  setTimeRange('all');
                }}
                className="text-sm text-neon-cyan hover:underline"
              >
                清除全部筛选
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搜索和列表 */}
      <div ref={orderListRef} className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-border-color">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="搜索订单号、房型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:border-neon-cyan"
            />
          </div>
        </div>

        {/* 订单列表 */}
        <div className="divide-y divide-border-color">
          {filteredOrders.map((order, index) => {
            const status = statusConfig[order.status];
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <PlatformLogo platform={order.platform} size={32} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{order.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${status.bgColor}`} style={{ color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                        <span>{order.roomType}</span>
                        <span>·</span>
                        <span>{new Date(order.timestamp).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">¥{order.price.toLocaleString()}</p>
                    <p className="text-sm text-text-secondary">
                      {order.stayNights || 1} 晚
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-text-secondary">
              <Package size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无符合条件的订单</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 订单详情弹窗 */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
}

// 订单详情弹窗
function OrderDetailModal({ order, onClose }: { order: Transaction; onClose: () => void }) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const { confirmOrder, cancelOrder, approveRefund, rejectRefund } = useUnifiedStore();
  const toast = useToast();
  
  const handleConfirm = () => {
    const success = confirmOrder(order.id);
    if (success) {
      toast.success('订单已确认', '库存已扣减');
      onClose();
    } else {
      toast.error('确认失败', '库存不足或订单状态异常');
    }
  };
  
  const handleCancel = () => {
    const success = cancelOrder(order.id);
    if (success) {
      toast.success('订单已取消', '库存已释放');
      onClose();
    }
  };
  
  const handleApproveRefund = () => {
    const success = approveRefund(order.id);
    if (success) {
      toast.success('退款已同意', '库存已释放');
      onClose();
    }
  };
  
  const handleRejectRefund = () => {
    const success = rejectRefund(order.id, '不符合退款政策');
    if (success) {
      toast.success('退款已拒绝', '订单恢复原状态');
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg max-h-[85vh] bg-bg-secondary rounded-2xl border border-border-color shadow-2xl flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-border-color flex-shrink-0">
          <h3 className="text-lg font-bold">订单详情</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <XCircle size={20} />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 状态 */}
          <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${status.bgColor}`}>
            <StatusIcon size={24} style={{ color: status.color }} />
            <span className="text-lg font-medium" style={{ color: status.color }}>{status.label}</span>
          </div>
          
          {/* 订单信息 */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">订单号</span>
              <span className="font-mono">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">下单时间</span>
              <span>{new Date(order.timestamp).toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">平台</span>
              <div className="flex items-center gap-2">
                <PlatformLogo platform={order.platform} size={20} />
                <span>{platformNames[order.platform] || order.platform}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-color" />
          
          {/* 客户信息 */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User size={16} className="text-neon-cyan" />
              客户信息
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-text-secondary text-xs">客户编号</div>
                <div>客户 {order.id.slice(-4)}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">联系方式</div>
                <div>--</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-color" />
          
          {/* 入住信息 */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 size={16} className="text-neon-cyan" />
              入住信息
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-text-secondary text-xs">房型</div>
                <div>{order.roomType}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">数量</div>
                <div>{order.stayNights || 1} 间 · {order.stayNights || 1}晚</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">入住日期</div>
                <div>{order.checkInDate}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs">离店日期</div>
                <div>{order.checkOutDate}</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-color" />
          
          {/* 金额信息 */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign size={16} className="text-neon-cyan" />
              金额明细
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">订单金额</span>
                <span className="font-mono">¥{order.price.toLocaleString()}</span>
              </div>
              {order.financials && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-300">平台手续费</span>
                    <span className="font-mono text-neon-red">-¥{(order.financials.gross - order.financials.net).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border-color">
                    <span className="font-medium">净收入</span>
                    <span className="font-mono font-bold text-neon-green">¥{order.financials.net.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex gap-3 p-5 border-t border-border-color flex-shrink-0 bg-bg-secondary">
          {/* 待确认：确认/取消 */}
          {order.status === 'pending' && (
            <>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-neon-green/10 border border-neon-green rounded-lg text-neon-green hover:bg-neon-green/20 transition-colors"
              >
                <CheckCircle2 size={16} className="inline mr-1" />
                确认订单
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 py-2.5 bg-neon-red/10 border border-neon-red rounded-lg text-neon-red hover:bg-neon-red/20 transition-colors"
              >
                <Ban size={16} className="inline mr-1" />
                取消订单
              </button>
            </>
          )}
          
          {/* 退款待处理：同意/拒绝 */}
          {order.status === 'refund_pending' && (
            <>
              <button 
                onClick={handleApproveRefund}
                className="flex-1 py-2.5 bg-neon-green/10 border border-neon-green rounded-lg text-neon-green hover:bg-neon-green/20 transition-colors"
              >
                <CheckCircle2 size={16} className="inline mr-1" />
                同意退款
              </button>
              <button 
                onClick={handleRejectRefund}
                className="flex-1 py-2.5 bg-neon-red/10 border border-neon-red rounded-lg text-neon-red hover:bg-neon-red/20 transition-colors"
              >
                <Ban size={16} className="inline mr-1" />
                拒绝退款
              </button>
            </>
          )}
          
          {/* 其他状态只显示关闭 */}
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-hover border border-border-color rounded-lg hover:border-neon-cyan transition-colors text-text-primary"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
}

