/**
 * SaaS运营后台 - 财务合规中心
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Receipt,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  Clock,
  Building2,
  User,
  Phone,
  Calendar,
  TrendingUp,
  Package,
  Ban,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import {
  useAdminStore,
  type OTAOrder,
  type Invoice,
  type Refund,
  type CustomerOrder,
  type ReconciliationStatus,
  type InvoiceStatus,
  type RefundStatus,
  type OTAChannel,
  type CustomerOrderStatus,
  type CustomerOrderType,
} from '../../stores/adminStore';
import { Button, useToast } from '../../components/ui';
import { PageSkeleton } from '@/components/ux/Skeleton';


// ============================================
// 辅助函数和常量
// ============================================

const channelLabels: Record<OTAChannel, string> = {
  ctrip: '携程',
  meituan: '美团',
  fliggy: '飞猪',
};

const channelColors: Record<OTAChannel, string> = {
  ctrip: 'bg-blue-500/20 text-blue-400',
  meituan: 'bg-yellow-500/20 text-yellow-400',
  fliggy: 'bg-orange-500/20 text-orange-400',
};

const reconciliationStatusLabels: Record<ReconciliationStatus, { text: string; color: string; icon: React.ReactNode }> = {
  matched: { text: '已对账', color: 'text-neon-green', icon: <CheckCircle2 size={14} /> },
  pending: { text: '待对账', color: 'text-neon-amber', icon: <Clock size={14} /> },
  exception: { text: '异常', color: 'text-neon-red', icon: <AlertCircle size={14} /> },
};

const differenceTypeLabels: Record<string, string> = {
  amount_mismatch: '金额不符',
  status_mismatch: '状态不一致',
  missing_order: '缺失订单',
};

const invoiceStatusLabels: Record<InvoiceStatus, { text: string; color: string; bg: string }> = {
  pending: { text: '待开票', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  issued: { text: '已开票', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  mailed: { text: '已邮寄', color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  completed: { text: '已完成', color: 'text-neon-green', bg: 'bg-neon-green/10' },
};

const invoiceTypeLabels: Record<string, string> = {
  electronic: '电子发票',
  paper: '纸质发票',
};

const refundStatusLabels: Record<RefundStatus, { text: string; color: string; bg: string }> = {
  pending: { text: '待审核', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  approved: { text: '已批准', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  rejected: { text: '已拒绝', color: 'text-neon-red', bg: 'bg-neon-red/10' },
  processing: { text: '处理中', color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  completed: { text: '已完成', color: 'text-neon-green', bg: 'bg-neon-green/10' },
};

const refundReasonLabels: Record<string, string> = {
  customer_cancel: '客户取消',
  hotel_issue: '酒店原因',
  duplicate_order: '重复下单',
  price_adjustment: '价格调整',
  other: '其他',
};

// 客户订单类型标签
const customerOrderTypeLabels: Record<CustomerOrderType, { text: string; color: string; bg: string }> = {
  subscription: { text: '新购订阅', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  renewal: { text: '续费', color: 'text-neon-green', bg: 'bg-neon-green/10' },
  upgrade: { text: '升级', color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  addon: { text: '增购', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  refund: { text: '退款', color: 'text-neon-red', bg: 'bg-neon-red/10' },
};

// 客户订单状态标签
const customerOrderStatusLabels: Record<CustomerOrderStatus, { text: string; color: string; bg: string }> = {
  pending: { text: '待付款', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  paid: { text: '已付款', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  processing: { text: '处理中', color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  completed: { text: '已完成', color: 'text-neon-green', bg: 'bg-neon-green/10' },
  cancelled: { text: '已取消', color: 'text-gray-400', bg: 'bg-gray-700/30' },
  overdue: { text: '已逾期', color: 'text-neon-red', bg: 'bg-neon-red/10' },
};

// 格式化金额
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ============================================
// 主组件
// ============================================

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'invoice' | 'refund' | 'customerOrders'>(
    (searchParams.get('tab') as 'reconciliation' | 'invoice' | 'refund' | 'customerOrders') || 'reconciliation'
  );
  const [isLoading, setIsLoading] = useState(true);
  const { financeStats, customerOrders } = useAdminStore();
  const toast = useToast();

  // 模拟加载状态 - 页面初始化
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Tab 切换时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // 从 URL 参数获取搜索词（用于从客户详情页跳转）
  const urlSearchQuery = searchParams.get('search') || '';

  // 监听 URL 参数变化，更新 activeTab
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'reconciliation' | 'invoice' | 'refund' | 'customerOrders' | null;
    if (tabFromUrl && ['reconciliation', 'invoice', 'refund', 'customerOrders'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // 统计待催款订单数
  const overdueOrdersCount = customerOrders.filter(o => o.status === 'overdue' || (o.status === 'pending' && o.dueDate && new Date(o.dueDate) < new Date())).length;

  // 当 tab 改变时更新 URL
  const handleTabChange = (tab: 'reconciliation' | 'invoice' | 'refund' | 'customerOrders') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'reconciliation') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams);
  };

  const tabs = [
    { id: 'reconciliation', label: '对账看板', icon: Receipt },
    { id: 'invoice', label: '发票管理', icon: FileText },
    { id: 'refund', label: '退款审核', icon: RotateCcw },
    { id: 'customerOrders', label: '客户订单', icon: ShoppingBag, badge: overdueOrdersCount },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">财务合规中心</h1>
          <p className="text-gray-400 text-sm mt-1">对账管理 · 发票处理 · 退款审核</p>
        </div>
        <Button 
          icon={<Download size={18} />} 
          variant="secondary"
          onClick={() => {
            const { otaOrders, invoices, refunds } = useAdminStore.getState();
            const data = {
              otaOrders,
              invoices,
              refunds,
              financeStats,
              exportTime: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `财务报表_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('报表导出成功');
          }}
        >
          导出报表
        </Button>
      </div>

      {/* 财务统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        {/* 本月应收 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">本月应收</span>
            <TrendingUp size={18} className="text-neon-cyan" />
          </div>
          <p className="text-xl font-bold mt-2">{(financeStats.receivableThisMonth / 10000).toFixed(1)}万</p>
          <p className="text-xs text-gray-500 mt-1">目标完成 75%</p>
        </div>

        {/* 本月已收 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">本月已收</span>
            <CheckCircle size={18} className="text-neon-green" />
          </div>
          <p className="text-xl font-bold mt-2 text-neon-green">
            {(financeStats.receivedThisMonth / 10000).toFixed(1)}万
          </p>
          <p className="text-xs text-gray-500 mt-1">回款率 {(financeStats.receivedThisMonth / financeStats.receivableThisMonth * 100).toFixed(0)}%</p>
        </div>

        {/* 本月待收 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">本月待收</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-xl font-bold mt-2 text-neon-amber">
            {(financeStats.pendingReceipt / 10000).toFixed(1)}万
          </p>
          <p className="text-xs text-gray-500 mt-1">{Math.ceil(financeStats.pendingReceipt / financeStats.receivableThisMonth * 100)}% 待回款</p>
        </div>

        {/* 发票金额 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">本月发票</span>
            <FileText size={18} className="text-neon-purple" />
          </div>
          <p className="text-xl font-bold mt-2">{(financeStats.invoiceAmountThisMonth / 10000).toFixed(1)}万</p>
          <p className="text-xs text-neon-purple mt-1">{financeStats.pendingInvoiceCount} 张待开</p>
        </div>

        {/* 待处理退款 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待处理退款</span>
            <RotateCcw size={18} className="text-neon-red" />
          </div>
          <p className="text-xl font-bold mt-2 text-neon-red">
            {formatAmount(financeStats.pendingRefundAmount)}
          </p>
          <p className="text-xs text-neon-red mt-1">{financeStats.pendingRefundCount} 笔待审</p>
        </div>

        {/* 对账概览 */}
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">对账概览</span>
            <Receipt size={18} className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold">{financeStats.reconciliationStats.matched}</span>
            <span className="text-xs text-gray-500">/</span>
            <span className="text-sm text-gray-400">{financeStats.reconciliationStats.total}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {financeStats.reconciliationStats.exception} 笔异常
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-[#151B2B] rounded-xl border border-gray-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-neon-cyan/20 text-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {'badge' in tab && tab.badge && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 bg-neon-red/20 text-neon-red text-xs rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'reconciliation' && <ReconciliationPanel />}
          {activeTab === 'invoice' && <InvoicePanel />}
          {activeTab === 'refund' && <RefundPanel />}
          {activeTab === 'customerOrders' && <CustomerOrdersPanel initialSearch={urlSearchQuery} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 对账看板组件
// ============================================

function ReconciliationPanel() {
  const { otaOrders, reconcileOrder, selectOTAOrder, selectedOTAOrder } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<OTAChannel | 'all'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, channelFilter, searchQuery]);

  // 过滤订单
  const filteredOrders = otaOrders.filter((order) => {
    const matchesSearch =
      order.externalOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || order.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  // 统计数据
  const stats = {
    total: otaOrders.length,
    matched: otaOrders.filter((o) => o.status === 'matched').length,
    pending: otaOrders.filter((o) => o.status === 'pending').length,
    exception: otaOrders.filter((o) => o.status === 'exception').length,
  };

  const handleReconcile = (order: OTAOrder) => {
    reconcileOrder(order.id, '人工核对一致');
    toast.success('对账成功', `${order.externalOrderId} 已标记为已对账`);
  };

  const handleViewDetail = (order: OTAOrder) => {
    selectOTAOrder(order);
    setShowDetail(true);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      {/* 对账统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-gray-600"
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">全部订单</span>
            <Filter size={18} className="text-gray-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-green-500/50"
          onClick={() => setStatusFilter('matched')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已对账</span>
            <CheckCircle size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">{stats.matched}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-amber-500/50"
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待对账</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.pending}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-red-500/50"
          onClick={() => setStatusFilter('exception')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">异常</span>
            <AlertCircle size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.exception}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索订单号、客人姓名、酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReconciliationStatus | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="matched">已对账</option>
            <option value="pending">待对账</option>
            <option value="exception">异常</option>
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as OTAChannel | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部渠道</option>
            <option value="ctrip">携程</option>
            <option value="meituan">美团</option>
            <option value="fliggy">飞猪</option>
          </select>
        </div>
      </div>

      {/* 对账列表 */}
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">渠道</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">OTA订单号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">酒店</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">房型/日期</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">OTA金额</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">系统金额</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">差异</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[#1E2538] transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${channelColors[order.channel]}`}>
                      {channelLabels[order.channel]}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-mono">{order.externalOrderId}</td>
                  <td className="py-4 px-4 text-sm">{order.hotelName}</td>
                  <td className="py-4 px-4">
                    <p className="text-sm">{order.roomType}</p>
                    <p className="text-xs text-gray-500">
                      {order.checkInDate} ~ {order.checkOutDate}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-sm">{formatAmount(order.otaAmount)}</td>
                  <td className="py-4 px-4 text-sm">
                    {order.systemAmount === 0 ? (
                      <span className="text-gray-500">未找到</span>
                    ) : (
                      formatAmount(order.systemAmount)
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {order.differenceAmount ? (
                      <span className="text-neon-red text-sm">{formatAmount(order.differenceAmount)}</span>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                    {order.differenceType && (
                      <p className="text-xs text-neon-red mt-0.5">
                        {differenceTypeLabels[order.differenceType]}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`flex items-center gap-1 text-sm ${reconciliationStatusLabels[order.status].color}`}>
                      {reconciliationStatusLabels[order.status].icon}
                      {reconciliationStatusLabels[order.status].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewDetail(order)}
                      >
                        查看
                      </Button>
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleReconcile(order)}
                        >
                          对账
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedOTAOrder && (
        <OTAOrderDetailModal
          order={selectedOTAOrder}
          onClose={() => setShowDetail(false)}
          onReconcile={() => {
            handleReconcile(selectedOTAOrder);
            setShowDetail(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// 发票管理组件
// ============================================

function InvoicePanel() {
  const { invoices, issueInvoice, mailInvoice, selectInvoice, selectedInvoice } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计
  const stats = {
    pending: invoices.filter((i) => i.status === 'pending').length,
    issued: invoices.filter((i) => i.status === 'issued').length,
    mailed: invoices.filter((i) => i.status === 'mailed').length,
    completed: invoices.filter((i) => i.status === 'completed').length,
  };

  const handleIssue = (invoice: Invoice) => {
    issueInvoice(invoice.id, 'https://example.com/invoice/sample.pdf');
    toast.success('开票成功', `${invoice.id} 已标记为已开票`);
  };

  const handleMail = (invoice: Invoice) => {
    mailInvoice(invoice.id, 'SF9876543210');
    toast.success('已标记邮寄', `${invoice.id} 已标记为已邮寄`);
  };

  const handleViewDetail = (invoice: Invoice) => {
    selectInvoice(invoice);
    setShowDetail(true);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-amber-500/50"
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待开票</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.pending}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-cyan-500/50"
          onClick={() => setStatusFilter('issued')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已开票</span>
            <CheckCircle size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-cyan">{stats.issued}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-purple-500/50"
          onClick={() => setStatusFilter('mailed')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已邮寄</span>
            <Package size={18} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-purple">{stats.mailed}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-green-500/50"
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已完成</span>
            <CheckCircle2 size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">{stats.completed}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索发票号、抬头、酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="pending">待开票</option>
            <option value="issued">已开票</option>
            <option value="mailed">已邮寄</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      {/* 发票列表 */}
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">发票号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">酒店</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">发票抬头</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">税号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">金额</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">类型</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">申请时间</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredInvoices.map((invoice, index) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[#1E2538] transition-colors"
                >
                  <td className="py-4 px-4 text-sm font-mono">{invoice.id}</td>
                  <td className="py-4 px-4 text-sm">{invoice.hotelName}</td>
                  <td className="py-4 px-4 text-sm max-w-[200px] truncate" title={invoice.title}>
                    {invoice.title}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono text-gray-400">{invoice.taxNumber}</td>
                  <td className="py-4 px-4 text-sm font-medium">{formatAmount(invoice.amount)}</td>
                  <td className="py-4 px-4">
                    <span className="text-xs text-gray-400">{invoiceTypeLabels[invoice.type]}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-400">
                    {new Date(invoice.appliedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${invoiceStatusLabels[invoice.status].bg} ${invoiceStatusLabels[invoice.status].color}`}>
                      {invoiceStatusLabels[invoice.status].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewDetail(invoice)}
                      >
                        详情
                      </Button>
                      {invoice.status === 'pending' && (
                        <Button
                          size="sm"
                          icon={<Upload size={14} />}
                          onClick={() => handleIssue(invoice)}
                        >
                          开票
                        </Button>
                      )}
                      {invoice.status === 'issued' && invoice.type === 'paper' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Package size={14} />}
                          onClick={() => handleMail(invoice)}
                        >
                          标记邮寄
                        </Button>
                      )}
                      {invoice.status === 'issued' && invoice.type === 'electronic' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            toast.success('已发送', `电子发票已发送至 ${invoice.email}`);
                          }}
                        >
                          发送邮件
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setShowDetail(false)}
          onIssue={() => {
            handleIssue(selectedInvoice);
            setShowDetail(false);
          }}
          onMail={() => {
            handleMail(selectedInvoice);
            setShowDetail(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// 退款审核组件
// ============================================

function RefundPanel() {
  const { refunds, selectRefund, selectedRefund } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch =
      refund.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 统计（仅用于监控，不干预审批）
  const stats = {
    pending: refunds.filter((r) => r.status === 'pending').length,
    approved: refunds.filter((r) => r.status === 'approved' || r.status === 'processing').length,
    rejected: refunds.filter((r) => r.status === 'rejected').length,
    completed: refunds.filter((r) => r.status === 'completed').length,
  };

  const handleViewDetail = (refund: Refund) => {
    selectRefund(refund);
    setShowDetail(true);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-amber-500/50"
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待审核</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.pending}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-cyan-500/50"
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已批准</span>
            <CheckCircle size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-cyan">{stats.approved}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-red-500/50"
          onClick={() => setStatusFilter('rejected')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已拒绝</span>
            <Ban size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.rejected}</p>
        </div>
        <div
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-green-500/50"
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已完成</span>
            <CheckCircle2 size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">{stats.completed}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索退款单号、订单号、客户、酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RefundStatus | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已批准</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
      </div>

      {/* 退款列表 */}
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">退款单号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">订单号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">酒店</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">客户</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">退款金额</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">原因</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">申请时间</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredRefunds.map((refund, index) => (
                <motion.tr
                  key={refund.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[#1E2538] transition-colors"
                >
                  <td className="py-4 px-4 text-sm font-mono">{refund.id}</td>
                  <td className="py-4 px-4 text-sm text-gray-400">{refund.orderId}</td>
                  <td className="py-4 px-4 text-sm">{refund.hotelName}</td>
                  <td className="py-4 px-4">
                    <p className="text-sm">{refund.customerName}</p>
                    <p className="text-xs text-gray-500">{refund.customerPhone}</p>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-neon-red">
                    {formatAmount(refund.amount)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs text-gray-400">{refundReasonLabels[refund.reason]}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-400">
                    {new Date(refund.appliedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${refundStatusLabels[refund.status].bg} ${refundStatusLabels[refund.status].color}`}>
                      {refundStatusLabels[refund.status].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewDetail(refund)}
                      >
                        查看详情
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedRefund && (
        <RefundDetailModal
          refund={selectedRefund}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

// ============================================
// 详情弹窗组件
// ============================================

interface OTAOrderDetailModalProps {
  order: OTAOrder;
  onClose: () => void;
  onReconcile: () => void;
}

function OTAOrderDetailModal({ order, onClose, onReconcile }: OTAOrderDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold">对账详情</h3>
            <p className="text-sm text-gray-400 mt-1">{order.externalOrderId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 text-2xl">&times;</span>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#0B0F19] rounded-lg">
            <div>
              <p className="text-sm text-gray-400 mb-1">OTA渠道</p>
              <span className={`px-2 py-1 text-xs rounded ${channelColors[order.channel]}`}>
                {channelLabels[order.channel]}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">酒店</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 size={14} className="text-gray-400" />
                {order.hotelName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">房型</p>
              <p className="font-medium">{order.roomType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">入住日期</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar size={14} className="text-gray-400" />
                {order.checkInDate} ~ {order.checkOutDate}
              </p>
            </div>
          </div>

          {/* 金额对比 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm font-medium mb-4">金额对比</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[#151B2B] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">OTA金额</p>
                <p className="text-lg font-bold">{formatAmount(order.otaAmount)}</p>
              </div>
              <div className="text-center p-3 bg-[#151B2B] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">系统金额</p>
                <p className="text-lg font-bold">{order.systemAmount === 0 ? '-' : formatAmount(order.systemAmount)}</p>
              </div>
              <div className="text-center p-3 bg-[#151B2B] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">差异</p>
                <p className={`text-lg font-bold ${order.differenceAmount ? 'text-neon-red' : 'text-neon-green'}`}>
                  {order.differenceAmount ? formatAmount(order.differenceAmount) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* 状态对比 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm font-medium mb-4">状态对比</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">OTA状态</p>
                <p className="text-sm">{order.otaStatus === 'confirmed' ? '已确认' : order.otaStatus === 'cancelled' ? '已取消' : order.otaStatus}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">系统状态</p>
                <p className="text-sm">{order.systemStatus === 'confirmed' ? '已确认' : order.systemStatus === 'not_found' ? '未找到' : order.systemStatus}</p>
              </div>
            </div>
          </div>

          {/* 对账状态 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">对账状态</p>
                <span className={`flex items-center gap-1 text-sm ${reconciliationStatusLabels[order.status].color}`}>
                  {reconciliationStatusLabels[order.status].icon}
                  {reconciliationStatusLabels[order.status].text}
                </span>
              </div>
              {order.reconciledAt && (
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">对账时间</p>
                  <p className="text-sm">{new Date(order.reconciledAt).toLocaleString('zh-CN')}</p>
                </div>
              )}
            </div>
          </div>

          {/* 备注 */}
          {order.notes && (
            <div className="p-4 bg-neon-red/5 border border-neon-red/20 rounded-lg">
              <p className="text-sm text-neon-red flex items-center gap-2 mb-1">
                <AlertCircle size={14} />
                备注
              </p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            订单创建时间：{new Date(order.createdAt).toLocaleString('zh-CN')}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
            {order.status === 'pending' && (
              <Button onClick={onReconcile} icon={<CheckCircle size={16} />}>
                标记已对账
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onIssue: () => void;
  onMail: () => void;
}

function InvoiceDetailModal({ invoice, onClose, onIssue, onMail }: InvoiceDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold">发票详情</h3>
            <p className="text-sm text-gray-400 mt-1">{invoice.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 text-2xl">&times;</span>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 申请人信息 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-3">申请人信息</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-500" />
                <span className="text-sm">{invoice.hotelName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500" />
                <span className="text-sm">{invoice.applicantName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-500" />
                <span className="text-sm">{invoice.applicantPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-sm">{new Date(invoice.appliedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* 发票信息 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-3">发票信息</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">发票抬头</span>
                <span className="text-sm font-medium">{invoice.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">税号</span>
                <span className="text-sm font-mono">{invoice.taxNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">发票类型</span>
                <span className="text-sm">{invoiceTypeLabels[invoice.type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">发票金额</span>
                <span className="text-lg font-bold text-neon-cyan">{formatAmount(invoice.amount)}</span>
              </div>
              {invoice.email && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">接收邮箱</span>
                  <span className="text-sm">{invoice.email}</span>
                </div>
              )}
              {invoice.address && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">邮寄地址</span>
                  <span className="text-sm">{invoice.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* 状态时间线 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-4">处理进度</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${invoice.status !== 'pending' ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-amber/20 text-neon-amber'}`}>
                  <CheckCircle size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">提交申请</p>
                  <p className="text-xs text-gray-500">{new Date(invoice.appliedAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              <div className="ml-4 w-px h-6 bg-gray-800" />
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${invoice.status === 'issued' || invoice.status === 'mailed' || invoice.status === 'completed' ? 'bg-neon-green/20 text-neon-green' : invoice.status === 'pending' ? 'bg-gray-800 text-gray-500' : 'bg-gray-700'}`}>
                  {invoice.status === 'issued' || invoice.status === 'mailed' || invoice.status === 'completed' ? <CheckCircle size={16} /> : <span className="text-xs">2</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${invoice.status === 'pending' ? 'text-gray-500' : ''}`}>开具发票</p>
                  {invoice.issuedAt && <p className="text-xs text-gray-500">{new Date(invoice.issuedAt).toLocaleString('zh-CN')}</p>}
                </div>
              </div>
              <div className="ml-4 w-px h-6 bg-gray-800" />
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${invoice.status === 'mailed' || invoice.status === 'completed' ? 'bg-neon-green/20 text-neon-green' : invoice.type === 'electronic' && invoice.status === 'issued' ? 'bg-neon-green/20 text-neon-green' : 'bg-gray-800 text-gray-500'}`}>
                  {invoice.status === 'mailed' || invoice.status === 'completed' || (invoice.type === 'electronic' && invoice.status === 'issued') ? <CheckCircle size={16} /> : <span className="text-xs">3</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${invoice.status !== 'mailed' && invoice.status !== 'completed' && !(invoice.type === 'electronic' && invoice.status === 'issued') ? 'text-gray-500' : ''}`}>
                    {invoice.type === 'electronic' ? '发送邮箱' : '邮寄发票'}
                  </p>
                  {invoice.mailedAt && <p className="text-xs text-gray-500">{new Date(invoice.mailedAt).toLocaleString('zh-CN')}</p>}
                  {invoice.trackingNumber && <p className="text-xs text-gray-500">快递单号: {invoice.trackingNumber}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 备注 */}
          {invoice.remarks && (
            <div className="p-4 bg-[#0B0F19] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">备注</p>
              <p className="text-sm">{invoice.remarks}</p>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          {invoice.status === 'pending' && (
            <Button onClick={onIssue} icon={<Upload size={16} />}>
              标记已开票
            </Button>
          )}
          {invoice.status === 'issued' && invoice.type === 'paper' && (
            <Button onClick={onMail} icon={<Package size={16} />}>
              标记已邮寄
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface RefundDetailModalProps {
  refund: Refund;
  onClose: () => void;
}

function RefundDetailModal({ refund, onClose }: RefundDetailModalProps) {

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold">退款审核</h3>
            <p className="text-sm text-gray-400 mt-1">{refund.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 text-2xl">&times;</span>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 订单信息 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#0B0F19] rounded-lg">
            <div>
              <p className="text-sm text-gray-400 mb-1">酒店</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 size={14} className="text-gray-400" />
                {refund.hotelName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">关联订单</p>
              <p className="text-sm font-mono">{refund.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">申请时间</p>
              <p className="text-sm">{new Date(refund.appliedAt).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">退款金额</p>
              <p className="text-lg font-bold text-neon-red">{formatAmount(refund.amount)}</p>
            </div>
          </div>

          {/* 客户信息 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-3">客户信息</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500" />
                <span className="text-sm">{refund.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-500" />
                <span className="text-sm">{refund.customerPhone}</span>
              </div>
            </div>
          </div>

          {/* 退款原因 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-3">退款原因</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-800 text-xs rounded">{refundReasonLabels[refund.reason]}</span>
              </div>
              <p className="text-sm">{refund.reasonDetail}</p>
            </div>
          </div>

          {/* 处理信息 */}
          {refund.reviewer && (
            <div className="p-4 bg-[#0B0F19] rounded-lg">
              <p className="text-sm text-gray-400 mb-3">处理信息</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">处理人</p>
                  <p className="text-sm">{refund.reviewer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">处理时间</p>
                  <p className="text-sm">{refund.reviewedAt && new Date(refund.reviewedAt).toLocaleString('zh-CN')}</p>
                </div>
                {refund.reviewNotes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">处理备注</p>
                    <p className="text-sm">{refund.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            当前状态：
            <span className={`ml-2 px-2 py-1 text-xs rounded ${refundStatusLabels[refund.status].bg} ${refundStatusLabels[refund.status].color}`}>
              {refundStatusLabels[refund.status].text}
            </span>
            <span className="ml-3 text-xs text-gray-500">
              由酒店端处理，平台仅做记录
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


// ============================================
// 客户商务订单组件
// ============================================

function CustomerOrdersPanel({ initialSearch = '' }: { initialSearch?: string }) {
  const { customerOrders, selectCustomerOrder, selectedCustomerOrder, markCustomerOrderPaid, markCustomerOrderOverdue } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<CustomerOrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CustomerOrderType | 'all'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, typeFilter, searchQuery]);

  // 如果有初始搜索值，自动聚焦搜索框
  useEffect(() => {
    if (initialSearch) {
      // 可以在这里添加额外的逻辑，比如自动展开筛选等
    }
  }, [initialSearch]);

  // 过滤订单
  const filteredOrders = customerOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.contractNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.salesRep.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // 统计
  const stats = {
    total: customerOrders.length,
    totalAmount: customerOrders.reduce((sum, o) => sum + o.amount, 0),
    pending: customerOrders.filter((o) => o.status === 'pending').length,
    paid: customerOrders.filter((o) => o.status === 'paid' || o.status === 'completed').length,
    overdue: customerOrders.filter((o) => o.status === 'overdue').length,
    pendingAmount: customerOrders.filter((o) => o.status === 'pending' || o.status === 'overdue').reduce((sum, o) => sum + o.amount - o.paidAmount, 0),
  };

  const handleViewDetail = (order: CustomerOrder) => {
    selectCustomerOrder(order);
    setShowDetail(true);
  };

  const handleMarkPaid = (order: CustomerOrder) => {
    markCustomerOrderPaid(order.id, 'bank_transfer', order.amount);
    toast.success('标记付款成功', `${order.id} 已标记为已付款`);
  };

  const handleMarkOverdue = (order: CustomerOrder) => {
    markCustomerOrderOverdue(order.id);
    toast.warning('已标记逾期', `${order.id} 已标记为逾期，请尽快催款`);
  };

  const handleRemind = (order: CustomerOrder) => {
    toast.info('催款提醒已发送', `已向 ${order.customerName} 发送催款通知`);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">订单总数</span>
            <ShoppingBag size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">订单总额</span>
            <DollarSign size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">{(stats.totalAmount / 10000).toFixed(1)}万</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待付款</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.pending}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已逾期</span>
            <AlertTriangle size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.overdue}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待收金额</span>
            <TrendingUp size={18} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-purple">{(stats.pendingAmount / 10000).toFixed(1)}万</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索订单号、客户名称、合同编号、销售..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerOrderStatus | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="pending">待付款</option>
            <option value="paid">已付款</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="overdue">已逾期</option>
            <option value="cancelled">已取消</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CustomerOrderType | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部类型</option>
            <option value="subscription">新购订阅</option>
            <option value="renewal">续费</option>
            <option value="upgrade">升级</option>
            <option value="addon">增购</option>
            <option value="refund">退款</option>
          </select>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">订单号</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">客户</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">类型</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">金额</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">账期/到期日</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">销售</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-[#1E2538] transition-colors ${order.status === 'overdue' ? 'bg-neon-red/5' : ''}`}
                >
                  <td className="py-4 px-4">
                    <p className="text-sm font-mono">{order.id}</p>
                    {order.contractNo && (
                      <p className="text-xs text-gray-500">合同: {order.contractNo}</p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.description}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${customerOrderTypeLabels[order.type].bg} ${customerOrderTypeLabels[order.type].color}`}>
                      {customerOrderTypeLabels[order.type].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium">{formatAmount(order.amount)}</p>
                    {order.paidAmount > 0 && order.paidAmount !== order.amount && (
                      <p className="text-xs text-neon-green">已付: {formatAmount(order.paidAmount)}</p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {order.dueDate ? (
                      <div>
                        <p className={`text-sm ${order.isOverdue ? 'text-neon-red' : 'text-gray-400'}`}>
                          {new Date(order.dueDate).toLocaleDateString('zh-CN')}
                        </p>
                        {order.isOverdue && (
                          <p className="text-xs text-neon-red">逾期 {order.overdueDays} 天</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${customerOrderStatusLabels[order.status].bg} ${customerOrderStatusLabels[order.status].color}`}>
                      {customerOrderStatusLabels[order.status].text}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-400">{order.salesRep}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewDetail(order)}
                      >
                        详情
                      </Button>
                      {order.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(order)}
                          >
                            标记付款
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkOverdue(order)}
                          >
                            标记逾期
                          </Button>
                        </>
                      )}
                      {order.status === 'overdue' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemind(order)}
                        >
                          催款
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedCustomerOrder && (
        <CustomerOrderDetailModal
          order={selectedCustomerOrder}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

// 客户订单详情弹窗
interface CustomerOrderDetailModalProps {
  order: CustomerOrder;
  onClose: () => void;
}

function CustomerOrderDetailModal({ order, onClose }: CustomerOrderDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold">客户订单详情</h3>
            <p className="text-sm text-gray-400 mt-1">{order.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 text-2xl">&times;</span>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#0B0F19] rounded-lg">
            <div>
              <p className="text-sm text-gray-400 mb-1">客户</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 size={14} className="text-gray-400" />
                {order.customerName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">订单类型</p>
              <span className={`px-2 py-1 text-xs rounded ${customerOrderTypeLabels[order.type].bg} ${customerOrderTypeLabels[order.type].color}`}>
                {customerOrderTypeLabels[order.type].text}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">销售负责人</p>
              <p className="font-medium">{order.salesRep}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">合同编号</p>
              <p className="font-medium">{order.contractNo || '-'}</p>
            </div>
          </div>

          {/* 订单明细 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm font-medium mb-4">订单明细</p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} x {formatAmount(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatAmount(item.totalPrice)}</p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-gray-400">合计</p>
                <p className="text-lg font-bold text-neon-cyan">{formatAmount(order.amount)}</p>
              </div>
            </div>
          </div>

          {/* 支付信息 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm font-medium mb-4">支付信息</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">支付状态</p>
                <span className={`px-2 py-1 text-xs rounded ${customerOrderStatusLabels[order.status].bg} ${customerOrderStatusLabels[order.status].color}`}>
                  {customerOrderStatusLabels[order.status].text}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">支付方式</p>
                <p className="text-sm">
                  {order.paymentMethod === 'bank_transfer' ? '银行转账' :
                   order.paymentMethod === 'alipay' ? '支付宝' :
                   order.paymentMethod === 'wechat_pay' ? '微信支付' :
                   order.paymentMethod === 'corporate' ? '对公转账' : '-'}
                </p>
              </div>
              {order.paymentTime && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">支付时间</p>
                  <p className="text-sm">{new Date(order.paymentTime).toLocaleString('zh-CN')}</p>
                </div>
              )}
              {order.dueDate && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">账期/到期日</p>
                  <p className={`text-sm ${order.isOverdue ? 'text-neon-red' : ''}`}>
                    {new Date(order.dueDate).toLocaleDateString('zh-CN')}
                    {order.isOverdue && ` (逾期 ${order.overdueDays} 天)`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 服务周期 */}
          {(order.periodStart || order.periodEnd) && (
            <div className="p-4 bg-[#0B0F19] rounded-lg">
              <p className="text-sm font-medium mb-4">服务周期</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">开始日期</p>
                  <p className="text-sm">{order.periodStart ? new Date(order.periodStart).toLocaleDateString('zh-CN') : '-'}</p>
                </div>
                <div className="text-gray-600">→</div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">结束日期</p>
                  <p className="text-sm">{order.periodEnd ? new Date(order.periodEnd).toLocaleDateString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 发票信息 */}
          {order.invoiceId && (
            <div className="p-4 bg-[#0B0F19] rounded-lg">
              <p className="text-sm font-medium mb-4">发票信息</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">发票号</p>
                  <p className="text-sm font-mono">{order.invoiceId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">发票状态</p>
                  <p className="text-sm">
                    {order.invoiceStatus === 'pending' ? '待开票' :
                     order.invoiceStatus === 'issued' ? '已开票' :
                     order.invoiceStatus === 'mailed' ? '已邮寄' :
                     order.invoiceStatus === 'completed' ? '已完成' : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 备注 */}
          {order.notes && (
            <div className="p-4 bg-[#0B0F19] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">备注</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            创建时间：{new Date(order.createdAt).toLocaleString('zh-CN')}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
