import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle,
  Receipt, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderStatus, Transaction } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待确认', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  paid: { label: '已成交', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  checked_in: { label: '已入住', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  checked_out: { label: '已离店', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  invoiced: { label: '已开票', color: 'text-green-400', bg: 'bg-green-400/10' },
  refunded: { label: '已退款', color: 'text-red-400', bg: 'bg-red-400/10' },
  refund_pending: { label: '退款待处理', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  cancelled: { label: '已取消', color: 'text-text-secondary', bg: 'bg-gray-400/10' },
};

// 平台名称映射
const platformNames: Record<string, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
};

export function FinanceCompliance({ transactions }: { transactions: Transaction[] }) {

  // 计算订单状态分布 - 使用真实数据
  const statusStats = React.useMemo(() => {
    const stats: Record<OrderStatus, number> = {
      pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
      refund_pending: 0, cancelled: 0,
    };
    transactions.forEach(t => {
      stats[t.status] = (stats[t.status] || 0) + 1;
    });
    return stats;
  }, [transactions]);

  // 计算财务数据 - 使用真实数据
  const financeStats = React.useMemo(() => {
    const validTransactions = transactions.filter(t => t.status !== 'refunded' && t.status !== 'pending');
    const refundTransactions = transactions.filter(t => t.status === 'refunded');
    
    // 成交GMV = 所有成交订单金额
    const totalGMV = transactions.reduce((sum, t) => sum + t.price, 0);
    // 实际GMV = 扣除退款后的金额
    const actualGMV = validTransactions.reduce((sum, t) => sum + t.financials.gross, 0);
    // 退款金额
    const refundAmount = refundTransactions.reduce((sum, t) => sum + (t.refundInfo?.amount || 0), 0);
    // 净收入
    const netRevenue = validTransactions.reduce((sum, t) => sum + t.financials.net, 0);
    
    // 开票金额
    const invoicedAmount = transactions
      .filter(t => t.status === 'invoiced')
      .reduce((sum, t) => sum + (t.invoice?.amount || 0), 0);
    // 待开票金额
    const uninvoicedAmount = transactions
      .filter(t => t.status === 'checked_out')
      .reduce((sum, t) => sum + t.price, 0);
    
    return {
      totalGMV,
      actualGMV,
      refundAmount,
      refundRate: totalGMV > 0 ? (refundAmount / totalGMV * 100).toFixed(1) : '0',
      netRevenue,
      invoicedAmount,
      uninvoicedAmount,
      pendingInvoiceCount: transactions.filter(t => t.status === 'checked_out').length,
    };
  }, [transactions]);

  const totalOrders = transactions.length;

  return (
    <div className="space-y-4 text-text-primary">
      {/* 财务概览卡片 - 深色主题 */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">成交GMV</p>
              <p className="text-xl font-bold text-[#00F0FF]">¥{financeStats.totalGMV.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#00F0FF]" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">含已退款订单</p>
        </Card>

        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">实际GMV</p>
              <p className="text-xl font-bold text-[#00E396]">¥{financeStats.actualGMV.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-[#00E396]/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-[#00E396]" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">扣除退款后</p>
        </Card>

        <Card className={cn(
          "p-4 bg-bg-secondary border-border-color",
          Number(financeStats.refundRate) > 10 ? "border-red-500/50" : ""
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">退款金额</p>
              <p className={cn(
                "text-xl font-bold",
                Number(financeStats.refundRate) > 10 ? "text-red-400" : "text-[#FFB800]"
              )}>
                ¥{financeStats.refundAmount.toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              Number(financeStats.refundRate) > 10 ? "bg-red-400/10" : "bg-[#FFB800]/10"
            )}>
              <TrendingDown className={cn(
                "w-5 h-5",
                Number(financeStats.refundRate) > 10 ? "text-red-400" : "text-[#FFB800]"
              )} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">退款率 {financeStats.refundRate}%</p>
        </Card>

        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">净收入</p>
              <p className="text-xl font-bold text-[#A855F7]">¥{financeStats.netRevenue.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-[#A855F7]/10 rounded-lg">
              <Receipt className="w-5 h-5 text-[#A855F7]" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-2">扣除服务费后</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 订单状态分布 */}
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">订单状态分布</h3>
            <Badge variant="outline" className="border-border-color text-text-secondary">
              共 {totalOrders} 笔
            </Badge>
          </div>
          
          {/* 状态分布条形图 */}
          <div className="space-y-2">
            {(Object.keys(statusConfig) as OrderStatus[]).map((status) => {
              const count = statusStats[status];
              const percentage = totalOrders > 0 ? (count / totalOrders * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-20 flex items-center gap-1.5 text-xs">
                    <span className={statusConfig[status].color}>{statusConfig[status].label}</span>
                  </div>
                  <div className="flex-1 h-5 bg-bg-primary rounded-full overflow-hidden border border-border-color/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={cn("h-full rounded-full", statusConfig[status].bg)}
                    />
                  </div>
                  <div className="w-14 text-right text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{count}</span>
                    <span className="ml-1">({percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 最近退款记录 */}
          <div className="border-t border-border-color mt-3 pt-3">
            <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-red-400" />
              最近退款
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {transactions
                .filter(t => t.status === 'refunded')
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-bg-primary rounded-lg text-sm border border-border-color/50">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs">{t.orderNo}</span>
                      <Badge variant="outline" className="text-xs border-border-color text-text-secondary">
                        {platformNames[t.platform] || t.platform}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{t.refundInfo?.reason}</span>
                      <span className="font-medium text-red-400">-¥{t.refundInfo?.amount}</span>
                    </div>
                  </div>
                ))}
              {transactions.filter(t => t.status === 'refunded').length === 0 && (
                <div className="text-center text-text-muted py-2 text-sm">暂无退款</div>
              )}
            </div>
          </div>
        </Card>

        {/* 开票状态 */}
        <Card className="p-4 bg-bg-secondary border-border-color">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">开票管理</h3>
            {financeStats.pendingInvoiceCount > 0 && (
              <Badge className="bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/30">
                {financeStats.pendingInvoiceCount} 笔待开
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">已开票金额</span>
                <span className="font-semibold text-[#00E396]">¥{financeStats.invoicedAmount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-text-muted mt-1">
                {transactions.filter(t => t.status === 'invoiced').length} 笔订单
              </div>
            </div>

            <div className="p-3 bg-bg-primary rounded-lg border border-border-color/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">待开票金额</span>
                <span className="font-semibold text-[#FFB800]">¥{financeStats.uninvoicedAmount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-text-muted mt-1">
                {financeStats.pendingInvoiceCount} 笔订单待开票
              </div>
            </div>

            {financeStats.pendingInvoiceCount > 0 && (
              <Button 
                variant="outline" 
                className="w-full border-border-color text-text-secondary hover:bg-border-color"
                size="sm"
              >
                <Receipt className="w-4 h-4 mr-2" />
                批量开票
              </Button>
            )}
          </div>

          {/* 合规提示 */}
          <div className="mt-3 p-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#00F0FF] mt-0.5" />
              <div className="text-xs text-[#00F0FF]">
                <div className="font-medium">合规状态</div>
                <div>开票率 {financeStats.totalGMV > 0 ? 
                  ((financeStats.invoicedAmount / financeStats.totalGMV) * 100).toFixed(1) : 0}%</div>
                {Number(financeStats.refundRate) > 15 && (
                  <div className="mt-1 text-red-400">⚠️ 退款率偏高</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
