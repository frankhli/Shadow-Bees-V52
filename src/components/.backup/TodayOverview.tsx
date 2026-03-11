import React from 'react';
import { 
  Activity, TrendingUp, Users, Clock,
  ArrowRight, RefreshCw, CreditCard,
  CheckCircle, Receipt, AlertCircle, Home,
  Calendar, AlertTriangle, Ban
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

// 状态配置 - 深色主题
const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待确认', color: 'text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  paid: { label: '已成交', color: 'text-blue-400', icon: <CreditCard className="w-4 h-4" /> },
  checked_in: { label: '已入住', color: 'text-purple-400', icon: <Home className="w-4 h-4" /> },
  checked_out: { label: '已离店', color: 'text-indigo-400', icon: <CheckCircle className="w-4 h-4" /> },
  invoiced: { label: '已开票', color: 'text-green-400', icon: <Receipt className="w-4 h-4" /> },
  refunded: { label: '已退款', color: 'text-red-400', icon: <RefreshCw className="w-4 h-4" /> },
  refund_pending: { label: '退款待处理', color: 'text-orange-400', icon: <AlertTriangle className="w-4 h-4" /> },
  cancelled: { label: '已取消', color: 'text-text-secondary', icon: <Ban className="w-4 h-4" /> },
};

const statusFlow: OrderStatus[] = ['pending', 'paid', 'checked_in', 'checked_out', 'invoiced'];

// 平台名称映射
const platformNames: Record<string, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
};

interface TodayOverviewProps {
  range?: 'today' | 'week' | 'month' | 'custom';
  dateRange?: { start: Date; end: Date };
}

export function TodayOverview({ range = 'today', dateRange }: TodayOverviewProps) {
  const { 
    transactions, 
    user,
    pendingPriceApproval,
    currentHotel
  } = useUnifiedStore();

  // 时间范围标签
  const rangeLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
    custom: '本期',
  }[range];

  // 计算有效的日期范围
  const effectiveDateRange = React.useMemo(() => {
    if (dateRange) return dateRange;
    
    const end = new Date();
    const start = new Date();
    
    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    
    return { start, end };
  }, [range, dateRange]);

  // 过滤时间范围内的交易
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      const txnDate = new Date(t.timestamp);
      return txnDate >= effectiveDateRange.start && txnDate <= effectiveDateRange.end;
    });
  }, [transactions, effectiveDateRange]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    // 新增订单数（本时间范围内创建且未退款）
    const newOrders = filteredTransactions.filter(t => t.status !== 'refunded').length;
    
    // GMV（本时间范围内成交的非退款订单）
    const gmv = filteredTransactions
      .filter(t => t.status !== 'refunded')
      .reduce((sum, t) => sum + t.financials.gross, 0);
    
    // 本日入住数（今日checkInDate且已付款/已入住/已离店/已开票）
    const todayStr = new Date().toISOString().split('T')[0];
    const checkins = transactions.filter(t => {
      if (!t.checkInDate || t.checkInDate !== todayStr) return false;
      return ['paid', 'checked_in', 'checked_out', 'invoiced'].includes(t.status);
    }).length;
    
    // 本日离店数（今日checkOutDate且已离店/已开票）
    const checkouts = transactions.filter(t => {
      if (!t.checkOutDate || t.checkOutDate !== todayStr) return false;
      return ['checked_out', 'invoiced'].includes(t.status);
    }).length;
    
    // 入住率 = 当前在住房间数 / 总房间数
    // 当前在住 = 已入住 + 已离店（当日）+ 已开票（当日离店）
    
    const occupiedRooms = transactions.filter(t => 
      t.status === 'checked_in' || 
      (t.status === 'checked_out' && t.checkOutDate === todayStr) ||
      (t.status === 'invoiced' && t.checkOutDate === todayStr)
    ).length;
    
    const totalInventory = currentHotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0);
    const occupancyRate = totalInventory > 0 ? Math.round((occupiedRooms / totalInventory) * 100) : 0;
    
    return {
      newOrders,
      gmv,
      checkins,
      checkouts,
      occupancyRate,
      occupiedRooms,
      totalInventory,
    };
  }, [filteredTransactions, transactions, currentHotel.roomTypes]);

  // 状态分布统计（基于过滤后的交易）
  const statusStats = React.useMemo(() => {
    const stats: Record<OrderStatus, number> = {
      pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
      refund_pending: 0, cancelled: 0,
    };
    filteredTransactions.forEach(t => {
      stats[t.status] = (stats[t.status] || 0) + 1;
    });
    return stats;
  }, [filteredTransactions]);

  // 待处理事项
  const pendingItems = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      pendingConfirm: filteredTransactions.filter(t => t.status === 'pending').length,
      pendingInvoice: filteredTransactions.filter(t => t.status === 'checked_out').length,
      pendingCheckin: filteredTransactions.filter(t => {
        if (t.status !== 'paid' || !t.checkInDate) return false;
        return t.checkInDate === today;
      }).length,
    };
  }, [filteredTransactions]);

  // 最近5条交易
  const recentTransactions = React.useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 text-text-primary">
      {/* 关键指标 */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{rangeLabel}新增订单</p>
              <p className="text-2xl font-bold text-[#00F0FF]">{stats.newOrders}</p>
            </div>
            <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-[#00F0FF]" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{rangeLabel}GMV</p>
              <p className="text-2xl font-bold text-[#00E396]">¥{stats.gmv.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-[#00E396]/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#00E396]" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">实时入住率</p>
              <p className="text-2xl font-bold text-[#A855F7]">{stats.occupancyRate}%</p>
            </div>
            <div className="p-2 bg-[#A855F7]/10 rounded-lg">
              <Users className="w-5 h-5 text-[#A855F7]" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            {stats.occupiedRooms}间在住 / {stats.totalInventory}间总房
          </p>
        </Card>

        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">待处理</p>
              <p className="text-2xl font-bold text-[#FFB800]">
                {pendingItems.pendingConfirm + pendingItems.pendingInvoice + pendingItems.pendingCheckin}
              </p>
            </div>
            <div className="p-2 bg-[#FFB800]/10 rounded-lg">
              <Activity className="w-5 h-5 text-[#FFB800]" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">
            确认{pendingItems.pendingConfirm} · 开票{pendingItems.pendingInvoice} · 入住{pendingItems.pendingCheckin}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 实时成交 */}
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-text-primary">{rangeLabel}成交动态</h3>
              <p className="text-xs text-text-secondary">
                {effectiveDateRange.start.toLocaleDateString('zh-CN')} - {effectiveDateRange.end.toLocaleDateString('zh-CN')}
              </p>
            </div>
            <Badge variant="outline" className="bg-[#00E396]/10 text-[#00E396] border-[#00E396]/30">
              <div className="w-2 h-2 bg-[#00E396] rounded-full mr-1.5 animate-pulse" />
              实时
            </Badge>
          </div>

          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-sm">
                该时间段暂无成交数据
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-3 bg-bg-primary rounded-lg border border-border-color/50 flex items-center gap-3"
                >
                  <div className={cn("p-2 rounded-full bg-bg-secondary", statusConfig[transaction.status].color)}>
                    {statusConfig[transaction.status].icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm">{transaction.orderNo}</span>
                      <Badge variant="outline" className="text-xs border-border-color text-text-secondary">
                        {platformNames[transaction.platform] || transaction.platform}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {transaction.guestName || '未命名客人'} · {transaction.roomType}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-text-primary">¥{transaction.price}</div>
                    <div className="text-xs text-text-muted">
                      {new Date(transaction.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(transaction.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <Badge className={cn("text-xs bg-bg-secondary border", statusConfig[transaction.status].color)} 
                    style={{ borderColor: 'currentColor', color: undefined }}>
                    {statusConfig[transaction.status].label}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* 订单生命周期 */}
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">{rangeLabel}订单生命周期</h3>
            <Badge variant="outline" className="text-xs border-border-color text-text-secondary">
              <Calendar className="w-3 h-3 mr-1" />
              {filteredTransactions.length}笔订单
            </Badge>
          </div>

          {/* 状态流程 */}
          <div className="space-y-2">
            {statusFlow.map((status, index) => {
              const count = statusStats[status];
              const isLast = index === statusFlow.length - 1;
              
              return (
                <div key={status} className="relative">
                  <div className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    count > 0 ? "bg-bg-primary border-border-color" : "bg-bg-secondary border-border-color/30"
                  )}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                      count > 0 ? statusConfig[status].color : "text-text-muted",
                      count > 0 ? "bg-bg-secondary" : "bg-bg-primary"
                    )}>
                      {count}
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-medium",
                        count > 0 ? statusConfig[status].color : "text-text-muted"
                      )}>
                        {statusConfig[status].label}
                      </div>
                      <div className="text-xs text-text-muted">
                        {status === 'pending' && '等待商家确认'}
                        {status === 'paid' && '待入住'}
                        {status === 'checked_in' && '客人已到店'}
                        {status === 'checked_out' && '待开票'}
                        {status === 'invoiced' && '流程完成'}
                      </div>
                    </div>
                    {statusConfig[status].icon}
                  </div>
                  
                  {!isLast && (
                    <div className="flex justify-center my-1">
                      <ArrowRight className="w-3 h-3 text-text-muted rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 退款说明 */}
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">
                {rangeLabel}退款: {statusStats.refunded} 笔
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              任何状态均可退款，退款后GMV扣减
            </p>
          </div>

          {/* 待审批提示 */}
          {pendingPriceApproval && (
            <div className="mt-3 p-3 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#FFB800] mt-0.5" />
                <div className="text-sm text-[#FFB800]">
                  <div className="font-medium">底价调整申请待审批</div>
                  <div className="text-xs mt-1">
                    {pendingPriceApproval.requestedBy} 申请调整至 ¥{pendingPriceApproval.requestedPrice}
                  </div>
                  {user.permissions.canApprove && (
                    <Button size="sm" variant="outline" className="mt-2 w-full border-[#FFB800]/50 text-[#FFB800]">
                      去审批
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
