import { useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Wrench, ArrowRightLeft,
  TrendingUp, Calendar, Filter, Eye, EyeOff,
  Layers, DollarSign, Users, Package, CreditCard, Home, CheckCircle, Receipt, RefreshCw, AlertTriangle, Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnifiedStore } from '@/stores/unifiedStore';

// 状态颜色映射
type StatusType = 'abundant' | 'normal' | 'tight' | 'soldout';
const statusColors: Record<StatusType, { bg: string; border: string; text: string; label: string }> = {
  abundant: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', label: '充足' },
  normal: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', label: '正常' },
  tight: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: '紧张' },
  soldout: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: '售罄' },
};

interface InventoryCalendarProps {
  roomTypeId?: string;
}

export function InventoryCalendar({ roomTypeId }: InventoryCalendarProps) {
  const {
    inventory,
    currentHotel,
    transactions,
    transferDailyAllocation,
    setMaintenance,
    updateDynamicPrice,
    timeMode,
    historyPlayback,
  } = useUnifiedStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<string>(roomTypeId || 'all');
  const [expandedRoomType, setExpandedRoomType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'occupied' | 'channel' | 'price' | 'orders'>('overview');
  
  // 筛选状态
  const [filters, setFilters] = useState({
    showOTA: true,
    showFlexible: true,
    showMaintenance: true,
    minPrice: 0,
    maxPrice: 5000,
    statusFilter: 'all' as 'all' | 'abundant' | 'normal' | 'tight' | 'soldout',
  });

  // 根据时间模式确定日期基准
  const baseDate = useMemo(() => {
    if (timeMode === 'history' && historyPlayback.currentSnapshot) {
      return new Date(historyPlayback.currentSnapshot.timestamp);
    }
    return new Date();
  }, [timeMode, historyPlayback.currentSnapshot]);

  // 生成日期数组（从基准日期起365天）
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      result.push(date.toISOString().split('T')[0]);
    }
    return result;
  }, [baseDate]);

  // 滚动控制
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 获取指定日期的房型库存（考虑筛选）
  const getRoomInventory = (dateStr: string) => {
    if (!inventory.calendar) return null;
    const daily = inventory.calendar[dateStr];
    if (!daily) return null;

    // 全部房型汇总
    if (selectedRoomType === 'all') {
      const roomIds = Object.keys(daily.byRoomType);
      if (roomIds.length === 0) return null;

      let total = 0;
      let available = 0;
      let ota = 0;
      let flexible = 0;
      let maintenance = 0;
      let arriving = 0;
      let checkedIn = 0;
      let minPrice = Infinity;

      roomIds.forEach(id => {
        const room = daily.byRoomType[id];
        total += room.total;
        available += room.available;
        ota += room.channelAllocation.ota;
        flexible += room.channelAllocation.flexible;
        maintenance += room.occupied.maintenance;
        arriving += room.occupied.arriving;
        checkedIn += room.occupied.checkedIn;
        minPrice = Math.min(minPrice, room.dynamicPrice.suggestedPrice);
      });

      return {
        total,
        available,
        channelAllocation: { ota, flexible },
        occupied: { maintenance, arriving, checkedIn },
        dynamicPrice: { suggestedPrice: minPrice === Infinity ? 0 : minPrice },
      };
    }

    return daily.byRoomType[selectedRoomType];
  };

  // 筛选后的日期列表
  const filteredDates = useMemo(() => {
    return dates.filter(dateStr => {
      const roomInv = getRoomInventory(dateStr);
      if (!roomInv) return false;

      // 状态筛选
      if (filters.statusFilter !== 'all') {
        const status = roomInv.available === 0 ? 'soldout' :
                      roomInv.available < roomInv.total * 0.1 ? 'tight' :
                      roomInv.available < roomInv.total * 0.3 ? 'normal' : 'abundant';
        if (status !== filters.statusFilter) return false;
      }

      // 价格筛选
      if (roomInv.dynamicPrice.suggestedPrice < filters.minPrice) return false;
      if (roomInv.dynamicPrice.suggestedPrice > filters.maxPrice) return false;

      // 渠道筛选（检查是否有该渠道配额）
      if (!filters.showOTA && !filters.showFlexible) return false;
      if (!filters.showOTA && roomInv.channelAllocation.ota > 0) {
        // 如果只看灵活渠道，但OTA有配额，仍然显示（显示总可售）
      }

      return true;
    });
  }, [dates, filters, selectedRoomType, inventory.calendar]);

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
    };
  };

  // 获取当前选中的房型信息
  const currentRoomType = selectedRoomType === 'all' 
    ? { name: '全部房型', floorPrice: 0, ceilingPrice: 0 }
    : currentHotel.roomTypes.find(r => r.id === selectedRoomType);

  // 筛选与选中日期相关的订单
  const getOrdersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    return transactions.filter(t => {
      if (!t.checkInDate || !t.checkOutDate) return false;
      
      const checkIn = t.checkInDate;
      const checkOut = t.checkOutDate;
      
      // 筛选条件：
      // 1. 入住日期 = 选中日期（今日预抵）
      // 2. 入住日期 < 选中日期 < 离店日期（在住中）
      // 3. 离店日期 = 选中日期（今日预离）
      const isCheckIn = checkIn === selectedDate;
      const isCheckOut = checkOut === selectedDate;
      const isStaying = checkIn < selectedDate && selectedDate < checkOut;
      
      if (!isCheckIn && !isCheckOut && !isStaying) return false;
      
      // 如果选中特定房型，进一步筛选（通过房型名称匹配）
      if (selectedRoomType !== 'all') {
        const room = currentHotel.roomTypes.find(r => r.id === selectedRoomType);
        if (room && t.roomType !== room.name) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, selectedDate, selectedRoomType, currentHotel.roomTypes]);

  // 订单状态配置
  const orderStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    pending: { label: '待确认', color: '#F59E0B', bgColor: 'bg-amber-500/10', icon: Clock },
    paid: { label: '已付款', color: '#3B82F6', bgColor: 'bg-blue-500/10', icon: CreditCard },
    checked_in: { label: '已入住', color: '#8B5CF6', bgColor: 'bg-purple-500/10', icon: Home },
    checked_out: { label: '已离店', color: '#10B981', bgColor: 'bg-green-500/10', icon: CheckCircle },
    invoiced: { label: '已开票', color: '#06B6D4', bgColor: 'bg-cyan-500/10', icon: Receipt },
    refunded: { label: '已退款', color: '#EF4444', bgColor: 'bg-red-500/10', icon: RefreshCw },
    refund_pending: { label: '退款中', color: '#F97316', bgColor: 'bg-orange-500/10', icon: AlertTriangle },
  };

  return (
    <div className="space-y-4 text-text-primary">
      {/* 标题和控制 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00F0FF]" />
            全年库存日历
            {timeMode === 'history' && (
              <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                历史回放
              </Badge>
            )}
          </h3>
          
          {/* 房型选择 */}
          <div className="flex items-center gap-2">
            <Button
              variant={selectedRoomType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRoomType('all')}
              className={cn(
                "text-xs",
                selectedRoomType === 'all' 
                  ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]" 
                  : "bg-bg-secondary border-border-color text-text-secondary"
              )}
            >
              <Layers className="w-3 h-3 mr-1" />
              全部
            </Button>
            {currentHotel.roomTypes.map(room => (
              <Button
                key={room.id}
                variant={selectedRoomType === room.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRoomType(room.id)}
                className={cn(
                  "text-xs",
                  selectedRoomType === room.id 
                    ? "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]" 
                    : "bg-bg-secondary border-border-color text-text-secondary"
                )}
              >
                {room.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => scroll('left')} className="bg-bg-secondary border-border-color">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => scroll('right')} className="bg-bg-secondary border-border-color">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className="p-3 bg-bg-secondary border-border-color">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">筛选:</span>
          </div>

          {/* 渠道筛选 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilters(f => ({ ...f, showOTA: !f.showOTA }))}
              className={cn(
                "text-xs",
                filters.showOTA ? "bg-blue-500/20 border-blue-500/50 text-blue-400" : "bg-bg-primary border-border-color text-text-muted"
              )}
            >
              {filters.showOTA ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
              OTA渠道
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilters(f => ({ ...f, showFlexible: !f.showFlexible }))}
              className={cn(
                "text-xs",
                filters.showFlexible ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-bg-primary border-border-color text-text-muted"
              )}
            >
              {filters.showFlexible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
              灵活渠道
            </Button>
          </div>

          {/* 状态筛选 */}
          <select
            value={filters.statusFilter}
            onChange={(e) => setFilters(f => ({ ...f, statusFilter: e.target.value as any }))}
            className="bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary"
          >
            <option value="all">全部状态</option>
            <option value="abundant">库存充足</option>
            <option value="normal">库存正常</option>
            <option value="tight">库存紧张</option>
            <option value="soldout">已售罄</option>
          </select>

          {/* 价格筛选 */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-text-secondary" />
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => setFilters(f => ({ ...f, minPrice: Number(e.target.value) }))}
              className="w-16 bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary"
              placeholder="最低价"
            />
            <span className="text-text-muted">-</span>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))}
              className="w-16 bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary"
              placeholder="最高价"
            />
          </div>

          {/* 重置筛选 */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilters({
              showOTA: true,
              showFlexible: true,
              showMaintenance: true,
              minPrice: 0,
              maxPrice: 5000,
              statusFilter: 'all',
            })}
            className="text-xs bg-bg-primary border-border-color text-text-secondary"
          >
            重置
          </Button>
        </div>
      </Card>

      {/* 图例 */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(statusColors).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} />
            <span className={colors.text}>{colors.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-3 h-3 rounded border border-purple-500 bg-purple-500/20" />
          <span className="text-purple-400">历史回放</span>
        </div>
      </div>

      {/* 日历横向滚动区域 */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {filteredDates.map((dateStr, index) => {
            const roomInv = getRoomInventory(dateStr);
            if (!roomInv) return null;

            // 根据筛选计算有效可售
            let effectiveAvailable = roomInv.available;
            if (!filters.showOTA) {
              effectiveAvailable = Math.min(effectiveAvailable, roomInv.channelAllocation.flexible);
            }
            if (!filters.showFlexible) {
              effectiveAvailable = Math.min(effectiveAvailable, roomInv.channelAllocation.ota);
            }

            const status = effectiveAvailable === 0 ? 'soldout' :
                          effectiveAvailable < roomInv.total * 0.1 ? 'tight' :
                          effectiveAvailable < roomInv.total * 0.3 ? 'normal' : 'abundant';
            
            const colors = statusColors[status];
            const { month, day, weekday } = formatDate(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = index === 0 && timeMode === 'realtime';
            const isHistory = timeMode === 'history';

            return (
              <motion.div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "flex-shrink-0 w-20 p-2 rounded-lg border cursor-pointer transition-all",
                  "scroll-snap-align-start",
                  colors.bg,
                  colors.border,
                  isSelected && "ring-2 ring-[#00F0FF]",
                  isHistory && "border-purple-500/30"
                )}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center">
                  <div className={cn("text-xs font-medium", colors.text)}>
                    {month}/{day}
                  </div>
                  <div className="text-[10px] text-text-muted">周{weekday}</div>
                  {isToday && (
                    <Badge variant="outline" className="text-[8px] mt-1 border-[#00F0FF] text-[#00F0FF]">
                      今天
                    </Badge>
                  )}
                  {isHistory && (
                    <Badge variant="outline" className="text-[8px] mt-1 border-purple-500 text-purple-400">
                      历史
                    </Badge>
                  )}
                </div>
                
                <div className="mt-2 text-center">
                  <div className={cn("text-lg font-bold", colors.text)}>
                    {effectiveAvailable}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    可售/{roomInv.total}
                  </div>
                </div>

                {/* 占用明细 */}
                <div className="mt-2 space-y-1">
                  {filters.showMaintenance && roomInv.occupied.maintenance > 0 && (
                    <div className="flex justify-between text-[9px]">
                      <span className="text-text-muted">维修</span>
                      <span className="text-yellow-400">{roomInv.occupied.maintenance}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[9px]">
                    <span className="text-text-muted">预抵</span>
                    <span className="text-cyan-400">{roomInv.occupied.arriving}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-text-muted">在住</span>
                    <span className="text-green-400">{roomInv.occupied.checkedIn}</span>
                  </div>
                </div>

                {/* 渠道配额 */}
                <div className="mt-2 pt-2 border-t border-border-color/30 space-y-1">
                  {filters.showOTA && (
                    <div className="flex justify-between text-[9px]">
                      <span className="text-text-muted">OTA</span>
                      <span className="text-blue-400">{roomInv.channelAllocation.ota}</span>
                    </div>
                  )}
                  {filters.showFlexible && (
                    <div className="flex justify-between text-[9px]">
                      <span className="text-text-muted">灵活</span>
                      <span className="text-cyan-400">{roomInv.channelAllocation.flexible}</span>
                    </div>
                  )}
                </div>

                {/* 价格 */}
                <div className="mt-2 pt-2 border-t border-border-color/30">
                  <div className="text-[9px] text-center text-purple-400">
                    ¥{roomInv.dynamicPrice.suggestedPrice}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 选中日期详情面板 */}
      {selectedDate && inventory.calendar?.[selectedDate] && currentRoomType && (
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                {selectedDate} · {currentRoomType.name}
                {timeMode === 'history' && (
                  <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                    历史数据
                  </Badge>
                )}
              </h4>
              <p className="text-sm text-text-secondary">
                底价¥{currentRoomType.floorPrice} · 上限¥{currentRoomType.ceilingPrice}
              </p>
            </div>
            {(() => {
              const dailyInv = inventory.calendar![selectedDate];
              // 如果是全部房型，取汇总状态
              let status: StatusType = 'abundant';
              if (selectedRoomType === 'all') {
                status = dailyInv.summary.inventoryStatus as StatusType;
              } else {
                const room = dailyInv.byRoomType[selectedRoomType];
                if (room) {
                  status = room.available === 0 ? 'soldout' :
                          room.available < room.total * 0.1 ? 'tight' :
                          room.available < room.total * 0.3 ? 'normal' : 'abundant';
                }
              }
              return (
                <Badge 
                  variant="outline" 
                  className={cn(
                    statusColors[status].border,
                    statusColors[status].text
                  )}
                >
                  {statusColors[status].label}
                </Badge>
              );
            })()}
          </div>

          {/* 房型详情列表 */}
          {selectedRoomType === 'all' ? (
            // 显示所有房型（手风琴效果）
            <div className="space-y-3">
              {currentHotel.roomTypes.map(room => {
                const roomInv = inventory.calendar![selectedDate].byRoomType[room.id];
                if (!roomInv) return null;
                const isExpanded = expandedRoomType === room.id;
                const roomOrders = getOrdersForSelectedDate.filter(o => o.roomType === room.name);
                
                return (
                  <div key={room.id} className="bg-bg-primary rounded-lg border border-border-color/50 overflow-hidden">
                    {/* 房型标题栏（可点击展开/收起） */}
                    <div 
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-secondary/50 transition-colors"
                      onClick={() => setExpandedRoomType(isExpanded ? null : room.id)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">{room.name}</span>
                        <span className="text-xs text-text-muted">
                          可售 <span className="text-green-400">{roomInv.available}/{roomInv.total}</span>
                        </span>
                        <span className="text-xs text-text-muted">
                          OTA/灵活 <span>{roomInv.channelAllocation.ota}/{roomInv.channelAllocation.flexible}</span>
                        </span>
                        <span className="text-xs text-purple-400">¥{roomInv.dynamicPrice.suggestedPrice}</span>
                        {roomOrders.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">
                            📦 {roomOrders.length}笔订单
                          </span>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 text-text-muted transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                    
                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="border-t border-border-color/50">
                        {/* Tab 导航 */}
                        <div className="flex border-b border-border-color/50">
                          {[
                            { key: 'overview', label: '库存概览' },
                            { key: 'occupied', label: '占用明细' },
                            { key: 'channel', label: '渠道配额' },
                            { key: 'price', label: '动态定价' },
                            { key: 'orders', label: `本日订单 (${roomOrders.length})` },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(tab.key as any);
                              }}
                              className={cn(
                                "flex-1 px-3 py-2 text-xs transition-colors",
                                activeTab === tab.key 
                                  ? "bg-neon-cyan/10 text-neon-cyan border-b-2 border-neon-cyan" 
                                  : "text-text-muted hover:text-text-primary"
                              )}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        
                        {/* Tab 内容 */}
                        <div className="p-4">
                          {activeTab === 'overview' && (
                            <div className="grid grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">总房数</span>
                                <div className="font-mono text-sm">{roomInv.total}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">可售</span>
                                <div className="font-mono text-sm text-green-400">{roomInv.available}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">占用率</span>
                                <div className="font-mono text-sm">{Math.round(((roomInv.total - roomInv.available) / roomInv.total) * 100)}%</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">底价/上限</span>
                                <div className="font-mono text-sm">¥{room.floorPrice}/¥{room.ceilingPrice}</div>
                              </div>
                            </div>
                          )}
                          
                          {activeTab === 'occupied' && (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">维修房</span>
                                <div className="font-mono text-sm text-yellow-400">{roomInv.occupied.maintenance}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">今日预抵</span>
                                <div className="font-mono text-sm text-cyan-400">{roomInv.occupied.arriving}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">在住</span>
                                <div className="font-mono text-sm text-green-400">{roomInv.occupied.checkedIn}</div>
                              </div>
                            </div>
                          )}
                          
                          {activeTab === 'channel' && (
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span>OTA渠道配额</span>
                                <span className="font-mono">{roomInv.channelAllocation.ota}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>灵活渠道配额</span>
                                <span className="font-mono">{roomInv.channelAllocation.flexible}</span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs bg-bg-secondary border-border-color"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    transferDailyAllocation(selectedDate, room.id, 'ota', 'flexible', 1);
                                  }}
                                  disabled={roomInv.channelAllocation.ota <= 0 || timeMode === 'history'}
                                >
                                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                                  OTA→灵活
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs bg-bg-secondary border-border-color"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    transferDailyAllocation(selectedDate, room.id, 'flexible', 'ota', 1);
                                  }}
                                  disabled={roomInv.channelAllocation.flexible <= 0 || timeMode === 'history'}
                                >
                                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                                  灵活→OTA
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {activeTab === 'price' && (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">基础价</span>
                                <div className="font-mono text-sm">¥{roomInv.dynamicPrice.basePrice}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">建议价</span>
                                <div className="font-mono text-sm text-purple-400">¥{roomInv.dynamicPrice.suggestedPrice}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-text-muted">溢价系数</span>
                                <div className="font-mono text-sm">{roomInv.dynamicPrice.priceFactor.toFixed(2)}x</div>
                              </div>
                            </div>
                          )}
                          
                          {activeTab === 'orders' && (
                            <div>
                              {roomOrders.length === 0 ? (
                                <div className="text-center py-8 text-text-muted text-sm">
                                  本日无订单
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
                                        className="p-3 bg-bg-secondary rounded-lg border border-border-color/50"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-mono text-xs text-text-secondary">{order.orderNo || order.id.slice(-6)}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.bgColor}`} style={{ color: status.color }}>
                                            {status.label}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                                          <span className={isCheckIn ? 'text-neon-green' : isCheckOut ? 'text-neon-amber' : 'text-text-muted'}>
                                            {stayLabel}
                                          </span>
                                          <span>·</span>
                                          <span>{order.stayNights || 1}晚</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-sm font-bold text-neon-cyan">¥{order.price}</span>
                                          <span className="text-xs text-text-muted capitalize">{order.platform}</span>
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
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 显示单个房型详情
            (() => {
              const roomInv = inventory.calendar![selectedDate].byRoomType[selectedRoomType];
              if (!roomInv) return null;

              return (
                <div className="grid grid-cols-4 gap-4">
                  {/* 库存概览 */}
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      库存概览
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>总房数</span>
                      <span className="font-mono">{roomInv.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>可售</span>
                      <span className="font-mono text-green-400">{roomInv.available}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>占用率</span>
                      <span className="font-mono">{Math.round(((roomInv.total - roomInv.available) / roomInv.total) * 100)}%</span>
                    </div>
                  </div>

                  {/* 占用明细 */}
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary">占用明细</div>
                    <div className="flex justify-between text-sm">
                      <span>维修</span>
                      <span className="font-mono text-yellow-400">{roomInv.occupied.maintenance}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>今日预抵</span>
                      <span className="font-mono text-cyan-400">{roomInv.occupied.arriving}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>在住</span>
                      <span className="font-mono text-green-400">{roomInv.occupied.checkedIn}</span>
                    </div>
                  </div>

                  {/* 渠道配额 */}
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary">渠道配额</div>
                    <div className="flex justify-between text-sm">
                      <span>OTA</span>
                      <span className="font-mono">{roomInv.channelAllocation.ota}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>灵活渠道</span>
                      <span className="font-mono">{roomInv.channelAllocation.flexible}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-bg-secondary border-border-color"
                        onClick={() => transferDailyAllocation(selectedDate, selectedRoomType, 'ota', 'flexible', 1)}
                        disabled={roomInv.channelAllocation.ota <= 0 || timeMode === 'history'}
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        OTA→灵活
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs bg-bg-secondary border-border-color"
                        onClick={() => transferDailyAllocation(selectedDate, selectedRoomType, 'flexible', 'ota', 1)}
                        disabled={roomInv.channelAllocation.flexible <= 0 || timeMode === 'history'}
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        灵活→OTA
                      </Button>
                    </div>
                  </div>

                  {/* 价格管理 */}
                  <div className="space-y-2">
                    <div className="text-sm text-text-secondary flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      动态定价
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>基础价</span>
                      <span className="font-mono">¥{roomInv.dynamicPrice.basePrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>建议价</span>
                      <span className="font-mono text-purple-400">¥{roomInv.dynamicPrice.suggestedPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>溢价系数</span>
                      <span className="font-mono">{roomInv.dynamicPrice.priceFactor.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* 快捷操作（仅实时模式可用） */}
          {timeMode === 'realtime' && selectedRoomType !== 'all' && (
            <div className="mt-4 pt-4 border-t border-border-color flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-bg-secondary border-border-color"
                onClick={() => {
                  const newMaintenance = prompt('设置维修房数量:', '0');
                  if (newMaintenance) {
                    setMaintenance(selectedDate, selectedRoomType, parseInt(newMaintenance));
                  }
                }}
              >
                <Wrench className="w-4 h-4 mr-1" />
                维修房
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-bg-secondary border-border-color"
                onClick={() => {
                  const room = currentHotel.roomTypes.find(r => r.id === selectedRoomType);
                  const newPrice = prompt('设置当日价格:', room?.floorPrice.toString());
                  if (newPrice) {
                    updateDynamicPrice(selectedDate, selectedRoomType, parseInt(newPrice));
                  }
                }}
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                调整价格
              </Button>
            </div>
          )}

          {/* 订单列表 - 本日相关订单 */}
          {(() => {
            const orders = getOrdersForSelectedDate;
            if (orders.length === 0) return null;
            
            return (
              <div className="mt-4 pt-4 border-t border-border-color">
                <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-neon-cyan" />
                  本日订单 ({orders.length}笔)
                </h5>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {orders.map(order => {
                    const status = orderStatusConfig[order.status];
                    const isCheckIn = order.checkInDate === selectedDate;
                    const isCheckOut = order.checkOutDate === selectedDate;
                    const isStaying = order.checkInDate! < selectedDate && selectedDate < order.checkOutDate!;
                    
                    let stayLabel = '';
                    if (isCheckIn) stayLabel = '今日入住';
                    else if (isCheckOut) stayLabel = '今日离店';
                    else if (isStaying) stayLabel = '入住中';
                    
                    return (
                      <div 
                        key={order.id} 
                        className="p-3 bg-bg-primary rounded-lg border border-border-color/50 hover:border-neon-cyan/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-text-secondary">{order.orderNo || order.id}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.bgColor}`} style={{ color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-sm font-medium mb-1">{order.roomType}</div>
                        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                          <span className={isCheckIn ? 'text-neon-green' : isCheckOut ? 'text-neon-amber' : ''}>
                            {stayLabel}
                          </span>
                          <span>·</span>
                          <span>{order.stayNights || 1}晚</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-neon-cyan">¥{order.price}</span>
                          <span className="text-xs text-text-muted capitalize">{order.platform}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
