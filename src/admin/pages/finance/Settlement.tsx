/**
 * SaaS运营后台 - 结算记录
 * 结算管理、打款记录
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Calendar,
  Banknote,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { Button, useToast } from '../../components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// 结算状态类型
type SettlementStatus = 'paid' | 'processing' | 'pending';

// 生成结算数据 - 基于真实订单数据
interface Order {
  id: string;
  hotelId: string;
  hotelName: string;
  price: number;
  status: string;
}

function generateSettlementData(orders: Order[]) {
  const settlements: {
    id: string;
    hotelId: string;
    hotelName: string;
    period: string;
    amount: number;
    commission: number;
    netAmount: number;
    status: SettlementStatus;
    payDate: string;
    method: string;
  }[] = [];

  // 按酒店分组统计订单
  const hotelOrders: Record<string, typeof orders> = {};
  orders.forEach((order: Order) => {
    if (order.status === 'paid' || order.status === 'checked_out') {
      if (!hotelOrders[order.hotelId]) {
        hotelOrders[order.hotelId] = [];
      }
      hotelOrders[order.hotelId].push(order);
    }
  });

  // 为每个酒店生成结算记录
  let id = 1;
  Object.entries(hotelOrders).forEach(([hotelId, orders]) => {
    const hotelName = orders[0]?.hotelName || '未知酒店';
    const totalAmount = orders.reduce((sum: number, o: Order) => sum + o.price, 0);
    const commission = Math.round(totalAmount * 0.1); // 10% 佣金
    const netAmount = totalAmount - commission;
    
    settlements.push({
      id: `SET-2024-${String(id++).padStart(3, '0')}`,
      hotelId,
      hotelName,
      period: '2024-01-01 ~ 2024-01-31',
      amount: totalAmount,
      commission,
      netAmount,
      status: id % 3 === 0 ? 'processing' : 'paid',
      payDate: id % 3 === 0 ? '-' : '2024-02-05',
      method: '银行转账',
    });
  });

  return settlements;
}

export default function SettlementPage() {
  const { orders } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatus>('all');

  // 生成结算数据
  const settlementData = useMemo(() => 
    generateSettlementData(orders as Order[]),
    [orders]
  );

  // 统计
  const stats = useMemo(() => {
    const totalAmount = settlementData.reduce((sum, s) => sum + s.amount, 0);
    const totalCommission = settlementData.reduce((sum, s) => sum + s.commission, 0);
    const totalNet = settlementData.reduce((sum, s) => sum + s.netAmount, 0);
    const paidCount = settlementData.filter(s => s.status === 'paid').length;
    
    return [
      { label: '结算总额', value: `¥${totalAmount.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
      { label: '平台佣金', value: `¥${totalCommission.toLocaleString()}`, icon: CreditCard, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      { label: '实付金额', value: `¥${totalNet.toLocaleString()}`, icon: Banknote, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
      { label: '已结算笔数', value: paidCount, icon: CheckCircle2, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
    ];
  }, [settlementData]);

  // 筛选数据
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return settlementData;
    return settlementData.filter(s => s.status === statusFilter);
  }, [settlementData, statusFilter]);

  const { success, info, warning } = useToast();

  // 导出结算记录为CSV
  const handleExport = () => {
    if (filteredData.length === 0) {
      warning('暂无结算数据可导出');
      return;
    }

    // 构建CSV内容
    const headers = ['结算单号', '酒店', '结算周期', '订单金额', '平台佣金', '实付金额', '打款日期', '状态'];
    const rows = filteredData.map(item => [
      item.id,
      item.hotelName,
      item.period,
      item.amount,
      item.commission,
      item.netAmount,
      item.payDate,
      item.status === 'paid' ? '已结算' : item.status === 'processing' ? '处理中' : '待结算'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `结算记录_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success(`成功导出 ${filteredData.length} 条结算记录`);
  };

  // 批量结算功能（模拟处理）
  const handleBatchSettle = () => {
    const pendingItems = filteredData.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      info('当前没有待结算的记录');
      return;
    }

    info(`开始批量结算，共 ${pendingItems.length} 笔待处理...`);
    
    // 模拟处理过程
    setTimeout(() => {
      success(`批量结算完成，已成功处理 ${pendingItems.length} 笔结算`);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">结算记录</h1>
          <p className="text-gray-400 mt-1">酒店结算管理与打款记录</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<Download />} onClick={handleExport}>
            导出结算单
          </Button>
          <Button variant="primary" icon={<DollarSign />} onClick={handleBatchSettle}>
            批量结算
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon size={24} className={stat.color} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 筛选栏 */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-gray-400">结算状态:</span>
          </div>
          {[
            { id: 'all', name: '全部' },
            { id: 'paid', name: '已结算' },
            { id: 'processing', name: '处理中' },
            { id: 'pending', name: '待结算' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s.id
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {s.name}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-700" />
          <input
            type="date"
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
          />
        </div>
      </Card>

      {/* 结算列表 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">结算明细</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索酒店名称..."
                className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">结算单号</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">酒店</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">结算周期</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">订单金额</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">平台佣金</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">实付金额</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">打款日期</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">状态</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono">{item.id}</td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="text-white">{item.hotelName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white">{item.period}</td>
                  <td className="py-3 px-4 text-white">¥{item.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-amber-400">¥{item.commission.toLocaleString()}</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">¥{item.netAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-white">{item.payDate}</td>
                  <td className="py-3 px-4">
                    {item.status === 'paid' && <Badge variant="default">已结算</Badge>}
                    {item.status === 'processing' && <Badge variant="secondary">处理中</Badge>}
                    {item.status === 'pending' && <Badge variant="outline">待结算</Badge>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    暂无结算数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 结算规则说明 */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">结算规则</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-blue-400" />
              <span className="text-white font-medium">结算周期</span>
            </div>
            <p className="text-gray-400 text-sm">T+1结算，每月1日和16日进行结算</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={18} className="text-amber-400" />
              <span className="text-white font-medium">平台佣金</span>
            </div>
            <p className="text-gray-400 text-sm">标准佣金率为订单金额的10%</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={18} className="text-emerald-400" />
              <span className="text-white font-medium">打款方式</span>
            </div>
            <p className="text-gray-400 text-sm">银行对公转账，预计1-3个工作日到账</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
