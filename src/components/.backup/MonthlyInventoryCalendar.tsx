import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar, ChevronDown,
  TrendingUp, Users, DoorOpen, CreditCard, Package,
  ArrowLeft, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { calculateFinancialStats } from '@/utils/helpers';
import { PlatformLogo } from '@/components/PlatformLogo';
import type { Platform } from '@/types';

// 状态颜色映射
type StatusType = 'abundant' | 'normal' | 'tight' | 'soldout';
const statusColors: Record<StatusType, { bg: string; border: string; text: string; label: string; dot: string; bar: string }> = {
  abundant: { 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30', 
    text: 'text-green-400', 
    label: '充足',
    dot: 'bg-green-400',
    bar: 'bg-green-400'
  },
  normal: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30', 
    text: 'text-blue-400', 
    label: '正常',
    dot: 'bg-blue-400',
    bar: 'bg-blue-400'
  },
  tight: { 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30', 
    text: 'text-amber-400', 
    label: '紧张',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400'
  },
  soldout: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30', 
    text: 'text-red-400', 
    label: '售罄',
    dot: 'bg-red-400',
    bar: 'bg-red-400'
  },
};

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const months = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

export function MonthlyInventoryCalendar() {
  const {
    inventory,
    currentHotel,
    transactions,
    transferDailyAllocation,
    timeMode,
    historyPlayback,
  } = useUnifiedStore();

  const orderStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: '待确认', color: '#F59E0B', bgColor: 'bg-amber-500/10' },
    paid: { label: '已付款', color: '#3B82F6', bgColor: 'bg-blue-500/10' },
    checked_in: { label: '已入住', color: '#8B5CF6', bgColor: 'bg-purple-500/10' },
    checked_out: { label: '已离店', color: '#10B981', bgColor: 'bg-green-500/10' },
    invoiced: { label: '已开票', color: '#06B6D4', bgColor: 'bg-cyan-500/10' },
    refunded: { label: '已退款', color: '#EF4444', bgColor: 'bg-red-500/10' },
    refund_pending: { label: '退款中', color: '#F97316', bgColor: 'bg-orange-500/10' },
  };

  const [currentDate, setCurrentDate] = useState(() => {
    if (timeMode === 'history' && historyPlayback.currentSnapshot) {
      return new Date(historyPlayback.currentSnapshot.timestamp);
    }
    return new Date();
  });

  // 视图状态: 'year' | 'month'
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedRoomType, setExpandedRoomType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'occupied' | 'channel' | 'price' | 'orders'>('overview');

  const getStatus = (available: number, total: number): StatusType => {
    if (available === 0) return 'soldout';
    if (available < total * 0.1) return 'tight';
    if (available < total * 0.3) return 'normal';
    return 'abundant';
  };

  // 确定性哈希函数 - 基于日期生成固定占用率
  const getFixedOccupancyForDate = (dateStr: string, roomTypeId: string): number => {
    // 简单的字符串哈希，确保同一天同一房型总是返回相同值
    const str = dateStr + roomTypeId;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    // 返回 20% - 70% 的固定占用率
    return 0.2 + (Math.abs(hash) % 50) / 100;
  };

  // 计算月份统计数据 - 与经营概览/财务模块勾稽
  // 基于订单创建时间(timestamp)统计，使用统一的 calculateFinancialStats
  const getMonthStats = (monthIndex: number, year: number = currentDate.getFullYear()) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex, daysInMonth, 23, 59, 59);
    
    // 筛选该月创建的订单（与财务页面一致：只按时间筛选，不排除状态）
    const monthOrders = transactions.filter(t => {
      if (!t.timestamp) return false;
      const orderDate = new Date(t.timestamp);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });
    
    // 使用统一的财务统计函数（与财务模块、经营概览一致）
    const stats = calculateFinancialStats(monthOrders);
    
    // 计算有订单的天数（用于入住率）
    const validOrders = monthOrders.filter(t => t.status !== 'refunded');
    const daysWithOrders = new Set(validOrders.map(t => {
      const d = new Date(t.timestamp);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })).size;
    
    // 入住率 = 有订单天数 / 总天数
    const occupancyRate = daysInMonth > 0 ? (daysWithOrders / daysInMonth) * 100 : 0;
    
    return { 
      totalOrderCount: stats.realtimeOrders, // 使用统一函数的统计（非退款订单数）
      totalRevenue: stats.realtimeGMV, // 使用统一函数的统计（非退款订单GMV）
      occupiedDays: daysWithOrders,
      totalDays: daysInMonth,
      occupancyRate: Math.min(occupancyRate, 100),
      avgDailyPrice: stats.avgPrice // 使用统一函数计算的平均客单价
    };
  };

  // 生成指定月份的日历天数
  const getMonthCalendarDays = (monthIndex: number, year: number = currentDate.getFullYear()) => {
    const firstDay = new Date(year, monthIndex, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Array<{
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === monthIndex;
      const isToday = date.getTime() === today.getTime();
      
      days.push({ date, dateStr, isCurrentMonth, isToday });
    }
    
    return days;
  };

  // 获取指定日期的库存
  const getDayInventory = (dateStr: string) => {
    if (!inventory.calendar) return null;
    return inventory.calendar[dateStr];
  };

  // 获取指定日期订单
  const getDayOrders = (dateStr: string, roomName?: string) => {
    return transactions.filter(t => {
      if (!t.checkInDate || !t.checkOutDate) return false;
      const isCheckIn = t.checkInDate === dateStr;
      const isCheckOut = t.checkOutDate === dateStr;
      const isStaying = t.checkInDate < dateStr && dateStr < t.checkOutDate;
      const roomMatch = !roomName || t.roomType === roomName;
      return (isCheckIn || isCheckOut || isStaying) && roomMatch && 
             t.status !== 'refunded' && t.status !== 'cancelled';
    });
  };

  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setViewMode('month');
    setSelectedDate(null);
    setExpandedRoomType(null);
  };

  const handleBackToYear = () => {
    setViewMode('year');
    setSelectedMonth(null);
    setSelectedDate(null);
    setExpandedRoomType(null);
  };

  // 全年概览视图
  const renderYearView = () => {
    const today = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = today.getMonth();
    const isCurrentYear = currentYear === today.getFullYear();

    return (
      <div className="space-y-4">
        {/* 统计概览 - 使用统一的财务统计函数 */}
        <div className="grid grid-cols-4 gap-3">
          {(() => {
            // 筛选当前年份的订单（与财务页面一致）
            const yearStart = new Date(currentYear, 0, 1);
            const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);
            
            const yearOrders = transactions.filter(t => {
              if (!t.timestamp) return false;
              const orderDate = new Date(t.timestamp);
              return orderDate >= yearStart && orderDate <= yearEnd;
            });
            
            // 使用统一的财务统计函数（与财务模块、经营概览完全一致）
            const yearStats = calculateFinancialStats(yearOrders);
            
            // 计算有订单的天数（用于入住率）
            const validOrders = yearOrders.filter(t => t.status !== 'refunded');
            const daysWithOrders = new Set(validOrders.map(t => {
              const d = new Date(t.timestamp);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })).size;
            
            // 年度入住率 = 有订单天数 / 365
            const occupancyRate = (daysWithOrders / 365) * 100;
            
            const yearStatCards = [
              { label: '年度订单', value: `${yearStats.realtimeOrders}笔`, icon: Package, color: 'text-neon-cyan' },
              { label: '年度营收', value: `¥${(yearStats.realtimeGMV / 10000).toFixed(1)}万`, icon: CreditCard, color: 'text-neon-green' },
              { label: '平均入住率', value: `${occupancyRate.toFixed(1)}%`, icon: BarChart3, color: 'text-neon-purple' },
              { label: '当前年份', value: `${currentYear}`, icon: Calendar, color: 'text-neon-amber' },
            ];
            
            return yearStatCards.map((stat, idx) => (
              <div key={idx} className="bg-bg-secondary rounded-lg p-3 border border-border-color">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                  <span className="text-xs text-text-muted">{stat.label}</span>
                </div>
                <div className="text-lg font-semibold">{stat.value}</div>
              </div>
            ));
          })()}
        </div>

        {/* 12个月份卡片 */}
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {months.map((monthName, monthIndex) => {
            const stats = getMonthStats(monthIndex);
            const isPast = isCurrentYear && monthIndex < currentMonth;
            const isCurrent = isCurrentYear && monthIndex === currentMonth;
            const isFuture = isCurrentYear && monthIndex > currentMonth;
            
            return (
              <motion.div
                key={monthIndex}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleMonthClick(monthIndex)}
                className={cn(
                  "bg-bg-secondary rounded-lg border border-border-color overflow-hidden cursor-pointer transition-all",
                  "hover:border-neon-cyan/50 hover:shadow-lg hover:shadow-neon-cyan/10",
                  isCurrent && "border-neon-cyan ring-1 ring-neon-cyan",
                  isPast && "opacity-70"
                )}
              >
                {/* 月份标题 */}
                <div className={cn(
                  "px-3 py-2 flex items-center justify-between border-b border-border-color",
                  isCurrent && "bg-neon-cyan/10"
                )}>
                  <span className="font-semibold">{monthName}</span>
                  {isCurrent && <Badge className="text-xs bg-neon-cyan/20 text-neon-cyan border-0">本月</Badge>}
                  {isPast && <span className="text-xs text-text-muted">已结束</span>}
                  {isFuture && <span className="text-xs text-text-muted">未开始</span>}
                </div>
                
                {/* 月份数据 */}
                <div className="p-3 space-y-2">
                  {/* 入住率条 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">入住率</span>
                      <span className={stats.occupancyRate > 80 ? 'text-red-400' : stats.occupancyRate > 50 ? 'text-amber-400' : 'text-green-400'}>
                        {stats.occupancyRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          stats.occupancyRate > 80 ? 'bg-red-400' : stats.occupancyRate > 50 ? 'bg-amber-400' : 'bg-green-400'
                        )}
                        style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* 数据行 */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-text-secondary" />
                      <span className="text-text-secondary">订单:</span>
                      <span className="font-medium">{stats.totalOrderCount}笔</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 text-text-secondary" />
                      <span className="text-text-secondary">营收:</span>
                      <span className="font-medium">¥{(stats.totalRevenue / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-text-secondary" />
                      <span className="text-text-secondary">入住:</span>
                      <span className="font-medium">{stats.occupiedDays}天</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-text-secondary" />
                      <span className="text-text-secondary">均价:</span>
                      <span className="font-medium">¥{stats.avgDailyPrice}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // 单月详细视图
  const renderMonthView = () => {
    if (selectedMonth === null) return null;
    
    const monthStats = getMonthStats(selectedMonth);
    const calendarDays = getMonthCalendarDays(selectedMonth);
    
    return (
      <div className="space-y-4">
        {/* 导航栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToYear}
              className="bg-bg-secondary border-border-color"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回全年
            </Button>
            <h3 className="text-xl font-semibold">
              {currentDate.getFullYear()}年{months[selectedMonth]}
            </h3>
            <Badge variant="outline" className="text-xs">
              {monthStats.totalOrderCount}笔订单 · ¥{(monthStats.totalRevenue / 1000).toFixed(1)}k营收
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">月份切换:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
                if (newMonth === 11) {
                  setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() - 1); return nd; });
                }
                setSelectedMonth(newMonth);
                setSelectedDate(null);
                setExpandedRoomType(null);
              }}
              className="bg-bg-secondary border-border-color h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                if (newMonth === 0) {
                  setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() + 1); return nd; });
                }
                setSelectedMonth(newMonth);
                setSelectedDate(null);
                setExpandedRoomType(null);
              }}
              className="bg-bg-secondary border-border-color h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-6 text-xs">
          {Object.entries(statusColors).map(([key, colors]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
              <span className={colors.text}>{colors.label}</span>
            </div>
          ))}
        </div>

        {/* 完整月历 */}
        <div className="bg-bg-secondary rounded-lg border border-border-color p-4">
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm text-text-secondary py-2 font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* 日期网格 - 更大的格子 */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, dateStr, isCurrentMonth, isToday }) => {
              const dailyInv = getDayInventory(dateStr);
              const dayOrders = getDayOrders(dateStr);
              
              // 获取或生成库存数据
              let total = 0, available = 0, minPrice = Infinity;
              
              if (dailyInv) {
                // 使用实际库存数据
                const roomIds = Object.keys(dailyInv.byRoomType);
                roomIds.forEach(id => {
                  const room = dailyInv.byRoomType[id];
                  total += room.total;
                  available += room.available;
                  minPrice = Math.min(minPrice, room.dynamicPrice.suggestedPrice);
                });
              } else {
                // 生成默认库存数据（确定性算法 - 固定值）
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(dateStr);
                const isHistory = checkDate < today;
                
                currentHotel.roomTypes.forEach(room => {
                  total += room.totalInventory;
                  
                  if (isHistory) {
                    // 历史日期：基于日期哈希生成固定占用率（非随机）
                    const fixedOccupancy = getFixedOccupancyForDate(dateStr, room.id);
                    const occupied = Math.round(room.totalInventory * fixedOccupancy);
                    available += (room.totalInventory - occupied);
                  } else {
                    // 今天及未来：全部可用
                    available += room.totalInventory;
                  }
                  minPrice = Math.min(minPrice, room.floorPrice);
                });
              }
              
              const status = getStatus(available, total);
              const colors = statusColors[status];
              const isSelected = selectedDate === dateStr;
              
              return (
                <motion.div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : dateStr);
                    setExpandedRoomType(null);
                    setActiveTab('overview');
                  }}
                  className={cn(
                    "h-32 p-2 rounded-lg border cursor-pointer transition-all",
                    "flex flex-col",
                    isCurrentMonth ? colors.bg : "bg-bg-primary/30",
                    isCurrentMonth ? colors.border : "border-border-color/30",
                    isSelected && "ring-2 ring-[#00F0FF] border-[#00F0FF]",
                    !isCurrentMonth && "opacity-40"
                  )}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* 日期 */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-base font-semibold",
                      isToday ? "text-[#00F0FF]" : "text-text-primary"
                    )}>
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF]">今</span>
                    )}
                  </div>
                  
                  {/* 库存信息 */}
                  <div className="mt-auto space-y-1.5">
                    {/* 库存状态条 */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={cn("font-medium", colors.text)}>
                          {available}/{total}
                        </span>
                        {dayOrders.length > 0 && (
                          <span className="text-[10px] text-neon-cyan">{dayOrders.length}单</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", colors.bar)}
                          style={{ width: `${((total - available) / total) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* 价格 */}
                    <div className="text-xs text-purple-400">
                      ¥{minPrice === Infinity ? 0 : minPrice}
                    </div>
                    
                    {/* 订单小点 */}
                    {dayOrders.length > 0 && (
                      <div className="flex gap-1">
                        {dayOrders.slice(0, 5).map((order, i) => {
                          const isCheckIn = order.checkInDate === dateStr;
                          const isCheckOut = order.checkOutDate === dateStr;
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isCheckIn ? "bg-green-400" : isCheckOut ? "bg-amber-400" : "bg-purple-400"
                              )}
                              title={`${order.roomType} ¥${order.price}`}
                            />
                          );
                        })}
                        {dayOrders.length > 5 && (
                          <span className="text-[8px] text-text-muted">+{dayOrders.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 选中日期详情面板 - 放在日历下方 */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-bg-secondary rounded-lg border border-border-color p-4">
                {/* 日期标题 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold">{selectedDate} 详情</h4>
                    <span className="text-sm text-text-secondary">点击房型展开查看</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="bg-bg-tertiary border-border-color"
                  >
                    收起详情
                  </Button>
                </div>
                
                {/* 房型列表 */}
                <div className="space-y-2">
                  {currentHotel.roomTypes.map(room => {
                    // 获取库存数据，如果没有则生成默认数据（确定性算法）
                    const actualRoomInv = inventory.calendar?.[selectedDate]?.byRoomType[room.id];
                    
                    const roomInv = actualRoomInv || (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const checkDate = new Date(selectedDate);
                      
                      let available = room.totalInventory;
                      let checkedIn = 0;
                      let priceFactor = 1;
                      
                      if (checkDate < today) {
                        // 历史日期：使用固定占用率（非随机）
                        const fixedOccupancy = getFixedOccupancyForDate(selectedDate, room.id);
                        const occupied = Math.round(room.totalInventory * fixedOccupancy);
                        available = room.totalInventory - occupied;
                        checkedIn = occupied;
                        // 价格因子也基于日期固定
                        priceFactor = 1 + (fixedOccupancy * 0.5); // 占用率越高，价格越高
                      }
                      
                      return {
                        total: room.totalInventory,
                        available: available,
                        occupied: {
                          maintenance: 0,
                          arriving: 0,
                          checkedIn: checkedIn,
                          dayUse: 0,
                        },
                        channelAllocation: {
                          ota: Math.floor(available * 0.6),
                          flexible: available - Math.floor(available * 0.6),
                        },
                        dynamicPrice: {
                          basePrice: room.floorPrice,
                          suggestedPrice: Math.round(room.floorPrice * priceFactor),
                          priceFactor: priceFactor,
                        },
                      };
                    })();
                    
                    const isRoomExpanded = expandedRoomType === room.id;
                    const roomStatus = getStatus(roomInv.available, roomInv.total);
                    const roomColors = statusColors[roomStatus];
                    const roomOrders = getDayOrders(selectedDate, room.name);
                    
                    return (
                      <div 
                        key={room.id} 
                        className="bg-bg-tertiary/50 rounded-lg border border-border-color/50 overflow-hidden"
                      >
                        {/* 房型标题行 */}
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-tertiary transition-colors"
                          onClick={() => setExpandedRoomType(isRoomExpanded ? null : room.id)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-medium min-w-[100px]">{room.name}</span>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", roomColors.dot)} />
                              <span className={cn("text-sm", roomColors.text)}>
                                {roomInv.available}/{roomInv.total}
                              </span>
                            </div>
                            <span className="text-sm text-purple-400">
                              ¥{roomInv.dynamicPrice.suggestedPrice}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {roomOrders.length > 0 && (
                              <Badge className="bg-neon-cyan/10 text-neon-cyan border-0">
                                {roomOrders.length}笔订单
                              </Badge>
                            )}
                            <ChevronDown className={cn("w-5 h-5 text-text-muted transition-transform", isRoomExpanded && "rotate-180")} />
                          </div>
                        </div>
                        
                        {/* 展开的详情 */}
                        <AnimatePresence>
                          {isRoomExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="border-t border-border-color/50 overflow-hidden"
                            >
                              <div className="p-4">
                                {/* Tab导航 */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {[
                                    { key: 'overview', label: '库存概览', icon: DoorOpen },
                                    { key: 'occupied', label: '占用明细', icon: Users },
                                    { key: 'channel', label: '渠道配额', icon: Package },
                                    { key: 'price', label: '动态定价', icon: CreditCard },
                                    { key: 'orders', label: `订单列表(${roomOrders.length})`, icon: TrendingUp },
                                  ].map(tab => (
                                    <button
                                      key={tab.key}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab(tab.key as any);
                                      }}
                                      className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                                        activeTab === tab.key 
                                          ? "bg-neon-cyan/20 text-neon-cyan" 
                                          : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                                      )}
                                    >
                                      <tab.icon className="w-4 h-4" />
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Tab内容 */}
                                <div className="bg-bg-secondary rounded-lg p-4">
                                  {activeTab === 'overview' && (
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">总房数</div>
                                        <div className="text-2xl font-mono">{roomInv.total}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">可售房</div>
                                        <div className="text-2xl font-mono text-green-400">{roomInv.available}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">占用率</div>
                                        <div className="text-2xl font-mono">{Math.round(((roomInv.total - roomInv.available) / roomInv.total) * 100)}%</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">建议售价</div>
                                        <div className="text-2xl font-mono text-purple-400">¥{roomInv.dynamicPrice.suggestedPrice}</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {activeTab === 'occupied' && (
                                    <div className="grid grid-cols-4 gap-4">
                                      {[
                                        { label: '维修房', value: roomInv.occupied.maintenance, color: 'text-yellow-400' },
                                        { label: '今日预抵', value: roomInv.occupied.arriving, color: 'text-cyan-400' },
                                        { label: '在住客房', value: roomInv.occupied.checkedIn, color: 'text-green-400' },
                                        { label: '钟点房', value: roomInv.occupied.dayUse, color: 'text-text-primary' },
                                      ].map(item => (
                                        <div key={item.label} className="text-center">
                                          <div className="text-xs text-text-muted mb-1">{item.label}</div>
                                          <div className={cn("text-2xl font-mono", item.color)}>{item.value}间</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {activeTab === 'channel' && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-bg-tertiary/50 rounded-lg p-4 text-center">
                                          <div className="text-sm text-text-muted mb-2">OTA渠道配额</div>
                                          <div className="text-3xl font-mono text-blue-400">{roomInv.channelAllocation.ota}间</div>
                                        </div>
                                        <div className="bg-bg-tertiary/50 rounded-lg p-4 text-center">
                                          <div className="text-sm text-text-muted mb-2">灵活渠道配额</div>
                                          <div className="text-3xl font-mono text-cyan-400">{roomInv.channelAllocation.flexible}间</div>
                                        </div>
                                      </div>
                                      {timeMode === 'realtime' && (
                                        <div className="flex justify-center gap-3">
                                          <Button
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              transferDailyAllocation(selectedDate, room.id, 'ota', 'flexible', 1);
                                            }}
                                            disabled={roomInv.channelAllocation.ota <= 0}
                                            className="bg-bg-tertiary border-border-color"
                                          >
                                            OTA → 灵活
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              transferDailyAllocation(selectedDate, room.id, 'flexible', 'ota', 1);
                                            }}
                                            disabled={roomInv.channelAllocation.flexible <= 0}
                                            className="bg-bg-tertiary border-border-color"
                                          >
                                            灵活 → OTA
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {activeTab === 'price' && (
                                    <div className="grid grid-cols-3 gap-6">
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">基础价格</div>
                                        <div className="text-xl font-mono">¥{roomInv.dynamicPrice.basePrice}</div>
                                      </div>
                                      <div className="bg-neon-purple/10 rounded-lg p-4 text-center border border-neon-purple/30">
                                        <div className="text-sm text-text-muted mb-1">建议售价</div>
                                        <div className="text-3xl font-mono text-purple-400">¥{roomInv.dynamicPrice.suggestedPrice}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-text-muted mb-1">溢价系数</div>
                                        <div className="text-xl font-mono">{roomInv.dynamicPrice.priceFactor.toFixed(2)}x</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {activeTab === 'orders' && (
                                    <div>
                                      {roomOrders.length === 0 ? (
                                        <div className="text-center py-8 text-text-secondary">
                                          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                          <p>本日暂无订单</p>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                          {roomOrders.map(order => {
                                            const status = orderStatusConfig[order.status];
                                            const isCheckIn = order.checkInDate === selectedDate;
                                            const isCheckOut = order.checkOutDate === selectedDate;
                                            let stayLabel = '';
                                            if (isCheckIn) stayLabel = '今日入住';
                                            else if (isCheckOut) stayLabel = '今日离店';
                                            else stayLabel = '入住中';
                                            
                                            return (
                                              <div 
                                                key={order.id} 
                                                className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-color/50"
                                              >
                                                <div className="flex justify-between items-start mb-2">
                                                  <span className="text-xs text-text-secondary font-mono">{order.orderNo || order.id.slice(-6)}</span>
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.bgColor}`} style={{ color: status.color }}>
                                                    {status.label}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm mb-2">
                                                  <span className={isCheckIn ? 'text-green-400' : isCheckOut ? 'text-amber-400' : 'text-purple-400'}>
                                                    {stayLabel}
                                                  </span>
                                                  <span className="text-text-secondary">·</span>
                                                  <span className="text-text-secondary">{order.stayNights || 1}晚</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                  <span className="font-mono font-bold text-neon-cyan">¥{order.price}</span>
                                                  <div className="flex items-center gap-1.5">
                                                    <PlatformLogo platform={order.platform as Platform} size={14} />
                                                    <span className="text-xs text-text-secondary">
                                                      {order.platform === 'xianyu' ? '闲鱼' : 
                                                       order.platform === 'xiaohongshu' ? '小红书' : 
                                                       order.platform === 'wechat' ? '微信' : order.platform}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-text-primary">
      {/* 标题栏 - 只在全年视图显示年份导航 */}
      {viewMode === 'year' && (
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#00F0FF]" />
            库存日历
            {timeMode === 'history' && (
              <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                历史回放
              </Badge>
            )}
          </h3>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() - 1); return nd; })}
              className="bg-bg-secondary border-border-color"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[80px] text-center">{currentDate.getFullYear()}年</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(d => { const nd = new Date(d); nd.setFullYear(nd.getFullYear() + 1); return nd; })}
              className="bg-bg-secondary border-border-color"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="bg-bg-secondary border-border-color text-xs"
            >
              今年
            </Button>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <AnimatePresence mode="wait">
        {viewMode === 'year' ? (
          <motion.div
            key="year"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderYearView()}
          </motion.div>
        ) : (
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderMonthView()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
