/**
 * 企业版财务对账 V2
 * 
 * 功能：
 * 1. 多酒店财务汇总（与顶部酒店选择器联动）
 * 2. 平台对账（应收 vs 实收）
 * 3. 与非标渠道订单深度关联
 * 4. 开票状态跟踪
 * 5. 时间筛选与数据联动
 * 6. 异常交易标记与差异分析
 * 7. 财务报表导出
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  DollarSign, CheckCircle, AlertTriangle,
  Filter, Download, ChevronDown,
  Minus, Search,
  CreditCard, Wallet, Receipt, PieChart,
  ExternalLink, Calendar,
  Eye,
  Package, Link2, RefreshCw, X,
  UserCircle, Loader2
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { useCountUp } from '../../hooks/useCountUp';
import { useToast } from '../../../components/ui/Toast';
import { 
  getFinanceReconciliationService,
  type Transaction,
  type Platform,
  type InvoiceStatus,
  type ReconcileStatus,
  type NonStandardOrderLink
} from '../../services/financeReconciliationService';
import { formatSmartAmount } from '../../utils/formatters';

// ============================================
// 类型定义
// ============================================
interface TransactionWithLink extends Transaction {
  linkedOrder?: NonStandardOrderLink;
}

// ============================================
// 配置
// ============================================
const platformConfig: Record<Platform, { name: string; color: string; bgColor: string; logo: string }> = {
  xianyu: { name: '闲鱼', color: '#FF6B00', bgColor: '#FFF7ED', logo: '/logos/xianyu.jpg' },
  xiaohongshu: { name: '小红书', color: '#FF2442', bgColor: '#FEF2F2', logo: '/logos/xiaohongshu.jpg' },
  wechat: { name: '微信', color: '#07C160', bgColor: '#F0FDF4', logo: '/logos/wechat.jpg' },
  douyin: { name: '抖音', color: '#000000', bgColor: '#F3F4F6', logo: '/logos/douyin.jpg' },
  direct: { name: '直客', color: '#8B5CF6', bgColor: '#F5F3FF', logo: '' },
};

// 平台Logo组件
const PlatformLogo: React.FC<{ platform: Platform; size?: 'sm' | 'md' | 'lg'; showName?: boolean }> = ({ 
  platform, 
  size = 'sm',
  showName = true 
}) => {
  const config = platformConfig[platform];
  const containerClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  };
  
  if (platform === 'direct') {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`${containerClasses[size]} rounded bg-violet-100 flex items-center justify-center overflow-hidden`}>
          <UserCircle className="w-3.5 h-3.5 text-violet-600" />
        </div>
        {showName && <span className="text-sm text-gray-700 whitespace-nowrap">{config.name}</span>}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={`${containerClasses[size]} rounded overflow-hidden bg-white border border-gray-100 flex items-center justify-center`}>
        <img 
          src={config.logo} 
          alt={config.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            // 图片加载失败时显示备选
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[10px] font-bold" style="background:${config.bgColor};color:${config.color}">${config.name[0]}</div>`;
          }}
        />
      </div>
      {showName && <span className="text-sm text-gray-700 whitespace-nowrap">{config.name}</span>}
    </div>
  );
};

const invoiceStatusConfig: Record<InvoiceStatus, { name: string; color: string; bgColor: string }> = {
  issued: { name: '已开票', color: '#10B981', bgColor: '#F0FDF4' },
  pending: { name: '待开票', color: '#F59E0B', bgColor: '#FFFBEB' },
  not_required: { name: '无需开票', color: '#6B7280', bgColor: '#F3F4F6' },
};

const reconcileStatusConfig: Record<ReconcileStatus, { name: string; color: string; bgColor: string; icon: any }> = {
  matched: { name: '已对平', color: '#10B981', bgColor: '#F0FDF4', icon: CheckCircle },
  mismatch: { name: '差异', color: '#EF4444', bgColor: '#FEF2F2', icon: AlertTriangle },
  pending: { name: '待对账', color: '#6B7280', bgColor: '#F3F4F6', icon: Minus },
};

// 快捷时间选项
const QUICK_DATE_RANGES = [
  { label: '今天', days: 0 },
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '本月', days: 'month' as const },
  { label: '上月', days: 'lastMonth' as const },
];

// ============================================
// 数字动画显示组件
// ============================================
const AnimatedNumber: React.FC<{ 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
  className?: string;
}> = ({ value, prefix = '', suffix = '', decimals = 0, className = '' }) => {
  const { count } = useCountUp(value, { duration: 1200 });
  
  const formattedValue = decimals > 0 
    ? count.toFixed(decimals) 
    : Math.round(count).toLocaleString();
  
  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

// ============================================
// 加载状态组件
// ============================================
const LoadingSpinner: React.FC<{ text?: string }> = ({ text = '加载中...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
    <span className="text-gray-500 text-sm">{text}</span>
  </div>
);

// ============================================
// 主组件
// ============================================
export default function FinanceReconciliation() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotelsList = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  const toast = useToast();
  const toastRef = useRef(toast);
  // 保持toast引用最新
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  
  const financeService = useMemo(() => getFinanceReconciliationService(), []);
  const financeServiceRef = useRef(financeService);
  useEffect(() => {
    financeServiceRef.current = financeService;
  }, [financeService]);
  
  // 状态
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start: sevenDaysAgo, end: today };
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [reconcileFilter, setReconcileFilter] = useState<ReconcileStatus | 'all'>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickRange, setActiveQuickRange] = useState<string>('近7天');
  
  // 数据加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMarkingMatched, setIsMarkingMatched] = useState<string | null>(null);
  const [isIssuingInvoice, setIsIssuingInvoice] = useState<string | null>(null);
  
  // 数据状态
  const [transactions, setTransactions] = useState<TransactionWithLink[]>([]);
  const [stats, setStats] = useState({
    totalGross: 0,
    totalNet: 0,
    totalActual: 0,
    totalMismatch: 0,
    pendingInvoice: 0,
    count: 0,
  });
  const [platformStats, setPlatformStats] = useState<Record<Platform, { count: number; amount: number }>>({
    xianyu: { count: 0, amount: 0 },
    xiaohongshu: { count: 0, amount: 0 },
    wechat: { count: 0, amount: 0 },
    douyin: { count: 0, amount: 0 },
    direct: { count: 0, amount: 0 },
  });
  
  // 详情弹窗
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithLink | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    title: '',
    taxNo: '',
    email: '',
  });
  
  // Tab 切换状态
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'mismatch' | 'invoice'>('overview');

  // ============================================
  // 数据获取
  // ============================================
  const fetchData = useCallback(async () => {
    if (selectedHotelIds.length === 0) return;
    
    setIsLoading(true);
    try {
      // 并行获取所有数据
      const [transactionsData, statsData, platformStatsData] = await Promise.all([
        financeServiceRef.current.getTransactions(selectedHotelIds, dateRange, {
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          reconcileStatus: reconcileFilter !== 'all' ? reconcileFilter : undefined,
          invoiceStatus: invoiceFilter !== 'all' ? invoiceFilter : undefined,
          searchQuery: searchQuery || undefined,
        }),
        financeServiceRef.current.getStats(selectedHotelIds, dateRange),
        financeServiceRef.current.getPlatformStats(selectedHotelIds, dateRange),
      ]);
      
      setTransactions(transactionsData);
      setStats(statsData);
      setPlatformStats(platformStatsData);
    } catch (error) {
      toastRef.current.error('获取财务数据失败，请稍后重试');
      // eslint-disable-next-line no-console
      console.error('Failed to fetch finance data:', error);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelIds, dateRange, selectedPlatforms, reconcileFilter, invoiceFilter, searchQuery]);

  // 监听筛选条件变化，重新获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 筛选数据（前端筛选，用于快速响应）
  const filteredTransactions = useMemo(() => {
    const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const endDate = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity;
    
    // 未选择酒店时不显示数据
    if (selectedHotelIds.length === 0) return [];
    
    return transactions.filter(t => {
      // 酒店筛选 - 使用顶部选择器
      if (!selectedHotelIds.includes(t.hotelId)) return false;
      // 平台筛选
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(t.platform)) return false;
      // 对账状态筛选
      if (reconcileFilter !== 'all' && t.reconcileStatus !== reconcileFilter) return false;
      // 开票状态筛选
      if (invoiceFilter !== 'all' && t.invoiceStatus !== invoiceFilter) return false;
      // 搜索
      if (searchQuery && !t.guestName.includes(searchQuery) && !t.orderId.includes(searchQuery) && !t.hotelName.includes(searchQuery)) return false;
      // 时间筛选
      const txnDate = new Date(t.transactionDate).getTime();
      if (txnDate < startDate || txnDate > endDate) return false;
      return true;
    });
  }, [transactions, selectedHotelIds, selectedPlatforms, reconcileFilter, invoiceFilter, searchQuery, dateRange]);

  // 格式化金额
  const formatMoney = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };
  
  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  
  // 快捷时间选择
  const handleQuickRangeSelect = (range: typeof QUICK_DATE_RANGES[0]) => {
    setActiveQuickRange(range.label);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start: Date;
    let end: Date = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    if (range.days === 0) {
      start = new Date(today);
    } else if (range.days === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (range.days === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(today.getTime() - range.days * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
    
    toastRef.current.success(`已选择时间范围：${range.label}`);
  };
  
  // 导出报表
  const handleExport = async () => {
    if (filteredTransactions.length === 0) {
      toastRef.current.warning('没有可导出的数据');
      return;
    }
    
    setIsExporting(true);
    try {
      // 调用导出 API
      const result = await financeService.exportReport(selectedHotelIds, dateRange, 'csv');
      
      if (result.success && result.downloadUrl) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `财务对账报表_${dateRange.start}_${dateRange.end}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toastRef.current.success('报表导出成功');
      } else {
        // 本地生成 CSV 作为备选
        const csvContent = [
          ['订单号', '酒店', '平台', '客人', '房型/晚', '订单金额', '服务费', '平台费', '应收净额', '实收金额', '差异', '开票状态', '对账状态', '交易日期'].join(','),
          ...filteredTransactions.map(t => [
            t.orderId, t.hotelName, platformConfig[t.platform].name, t.guestName, `${t.roomType}/${t.nights}晚`,
            t.amount, t.serviceFee, t.platformFee, t.expectedAmount, t.actualAmount,
            t.expectedAmount - t.actualAmount, invoiceStatusConfig[t.invoiceStatus].name,
            reconcileStatusConfig[t.reconcileStatus].name, new Date(t.transactionDate).toLocaleDateString()
          ].join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `财务对账报表_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
        
        toastRef.current.success('报表导出成功');
      }
    } catch (error) {
      toastRef.current.error('导出失败，请稍后重试');
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 标记为已对平
  const handleMarkAsMatched = async (orderId: string) => {
    setIsMarkingMatched(orderId);
    try {
      const result = await financeService.markAsMatched(orderId, '手动标记为已对平');
      if (result.success) {
        toastRef.current.success('已标记为已对平');
        // 刷新数据
        await fetchData();
        setShowDetailModal(false);
      } else {
        toastRef.current.error(result.error || '操作失败');
      }
    } catch (error) {
      toastRef.current.error('操作失败，请稍后重试');
      console.error('Mark as matched failed:', error);
    } finally {
      setIsMarkingMatched(null);
    }
  };

  // 开具发票
  const handleIssueInvoice = async () => {
    if (!selectedTransaction) return;
    
    // 表单验证
    if (!invoiceFormData.title.trim()) {
      toastRef.current.warning('请输入发票抬头');
      return;
    }
    if (!invoiceFormData.taxNo.trim()) {
      toastRef.current.warning('请输入税号');
      return;
    }
    if (!invoiceFormData.email.trim() || !invoiceFormData.email.includes('@')) {
      toastRef.current.warning('请输入有效的邮箱地址');
      return;
    }
    
    setIsIssuingInvoice(selectedTransaction.orderId);
    try {
      const result = await financeService.issueInvoice(selectedTransaction.orderId, {
        ...invoiceFormData,
        amount: selectedTransaction.amount,
      });
      
      if (result.success) {
        toastRef.current.success(`发票开具成功，发票号：${result.invoiceNo}`);
        // 刷新数据
        await fetchData();
        setShowInvoiceModal(false);
        setInvoiceFormData({ title: '', taxNo: '', email: '' });
      } else {
        toastRef.current.error(result.error || '发票开具失败');
      }
    } catch (error) {
      toastRef.current.error('发票开具失败，请稍后重试');
      console.error('Issue invoice failed:', error);
    } finally {
      setIsIssuingInvoice(null);
    }
  };

  // 查看发票详情
  const handleViewInvoice = async (orderId: string) => {
    try {
      const invoice = await financeService.getInvoiceDetail(orderId);
      if (invoice) {
        toastRef.current.info(`发票号：${invoice.invoiceNo}，金额：${formatMoney(invoice.amount)}`);
      } else {
        toastRef.current.warning('未找到发票信息');
      }
    } catch (error) {
      toastRef.current.error('获取发票信息失败');
      console.error('Get invoice detail failed:', error);
    }
  };

  // 查看非标渠道订单
  const handleViewNonStandardOrder = (channelOrderNo: string) => {
    toastRef.current.info(`正在打开非标渠道订单：${channelOrderNo}`);
    // [演示数据] 实际项目中这里应该跳转到非标订单详情页或打开新窗口
    // window.open(`/orders/non-standard/${channelOrderNo}`, '_blank');
  };

  // 查看 PMS 订单
  const handleViewPMSOrder = (pmsOrderId: string) => {
    toastRef.current.info(`正在打开 PMS 订单：${pmsOrderId}`);
    // [演示数据] 实际项目中这里应该跳转到 PMS 订单详情页或打开新窗口
    // window.open(`/pms/orders/${pmsOrderId}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">财务对账</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 0 
              ? '请选择酒店查看财务对账数据'
              : selectedHotelIds.length === 1
                ? `查看 ${selectedHotelsList[0]?.name} 的财务对账`
                : `汇总 ${selectedHotelIds.length} 家酒店的财务对账数据 · ${filteredTransactions.length} 笔交易`
            }
            {isLoading && (
              <span className="inline-flex items-center gap-1 ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                加载中...
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          {/* 搜索 */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订单、客人、酒店"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 w-44 lg:w-48"
            />
          </div>

          {/* 对账状态筛选 */}
          <select
            value={reconcileFilter}
            onChange={(e) => setReconcileFilter(e.target.value as ReconcileStatus | 'all')}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 flex-shrink-0"
          >
            <option value="all">全部状态</option>
            <option value="matched">已对平</option>
            <option value="mismatch">有差异</option>
            <option value="pending">待对账</option>
          </select>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-colors flex-shrink-0 ${
              showFilters 
                ? 'bg-violet-50 border-violet-300 text-violet-700' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <Filter className={`w-4 h-4 ${showFilters ? 'text-violet-600' : 'text-gray-500'}`} />
            <span className="text-sm">筛选</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* 导出按钮 */}
          <button 
            onClick={handleExport}
            disabled={filteredTransactions.length === 0 || isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-sm">{isExporting ? '导出中...' : '导出'}</span>
          </button>
        </div>
      </div>

      {/* Tab 导航 */}
      {selectedHotelIds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-1">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: '对账概览', icon: PieChart },
              { id: 'transactions', label: '交易明细', icon: CreditCard },
              { id: 'mismatch', label: '差异分析', icon: AlertTriangle, count: filteredTransactions.filter(t => t.reconcileStatus === 'mismatch').length },
              { id: 'invoice', label: '开票管理', icon: Receipt, count: stats.pendingInvoice },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 筛选面板 - 只在交易明细和差异分析显示 */}
      {showFilters && selectedHotelIds.length > 0 && (activeTab === 'transactions' || activeTab === 'mismatch') && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* 日期范围 - 快捷选择 + 自定义 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">时间范围</label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {QUICK_DATE_RANGES.map(range => (
                <button
                  key={range.label}
                  onClick={() => handleQuickRangeSelect(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    activeQuickRange === range.label
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    setActiveQuickRange('');
                  }}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <span className="text-gray-500">至</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    setActiveQuickRange('');
                  }}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>
          
          {/* 平台筛选 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">平台</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(platformConfig) as Platform[]).map(platform => {
                const config = platformConfig[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatforms(prev => 
                      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
                    )}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedPlatforms.includes(platform)
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                    style={selectedPlatforms.includes(platform) ? {} : { borderColor: config.color + '40', color: config.color }}
                  >
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 内容 */}
      {selectedHotelIds.length > 0 && (
        <>
          {/* ============ 概览 Tab ============ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 核心指标 */}
              <div className="grid grid-cols-5 gap-4">
                {(() => {
                  const grossFmt = formatSmartAmount(stats.totalGross);
                  const netFmt = formatSmartAmount(stats.totalNet);
                  const actualFmt = formatSmartAmount(stats.totalActual);
                  const mismatchFmt = formatSmartAmount(stats.totalMismatch);
                  
                  return (
                    <>
                      {/* 总交易额 */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-lg font-bold text-gray-900">{grossFmt.prefix}{grossFmt.value}</span>
                              {grossFmt.unit && <span className="text-xs text-gray-500">{grossFmt.unit}</span>}
                            </div>
                            <div className="text-xs text-gray-500">总交易额</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 应收净额 */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-lg font-bold text-gray-900">{netFmt.prefix}{netFmt.value}</span>
                              {netFmt.unit && <span className="text-xs text-gray-500">{netFmt.unit}</span>}
                            </div>
                            <div className="text-xs text-gray-500">应收净额</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 实收金额 */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-lg font-bold text-gray-900">{actualFmt.prefix}{actualFmt.value}</span>
                              {actualFmt.unit && <span className="text-xs text-gray-500">{actualFmt.unit}</span>}
                            </div>
                            <div className="text-xs text-gray-500">实收金额</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 差异金额 */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-lg font-bold text-red-600">{mismatchFmt.prefix}{mismatchFmt.value}</span>
                              {mismatchFmt.unit && <span className="text-xs text-gray-500">{mismatchFmt.unit}</span>}
                            </div>
                            <div className="text-xs text-gray-500">差异金额</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 待开票 */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-lg font-bold text-gray-900">{stats.pendingInvoice}</span>
                            </div>
                            <div className="text-xs text-gray-500">待开票</div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* 平台分布 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">平台分布</h3>
                <div className="grid grid-cols-5 gap-4">
                  {(Object.keys(platformConfig) as Platform[]).map(platform => {
                    const stat = platformStats[platform];
                    return (
                      <div key={platform} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <PlatformLogo platform={platform} size="md" showName={true} />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          <AnimatedNumber value={stat.count} suffix="单" />
                        </div>
                        <div className="text-sm text-gray-500">{formatMoney(stat.amount)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 快捷入口 */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('mismatch')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">差异分析</div>
                      <div className="text-sm text-gray-500">
                        {filteredTransactions.filter(t => t.reconcileStatus === 'mismatch').length} 笔待处理
                      </div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('invoice')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">开票管理</div>
                      <div className="text-sm text-gray-500">{stats.pendingInvoice} 笔待开票</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">交易明细</div>
                      <div className="text-sm text-gray-500">查看全部 {filteredTransactions.length} 笔交易</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* ============ 交易明细 Tab ============ */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-gray-900">交易明细</h3>
                  <span className="text-sm text-gray-500">
                    共 {filteredTransactions.length} 笔交易
                  </span>
                  {/* 非标渠道订单关联标识 */}
                  <span className="text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    已关联非标渠道订单
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-xs">数据范围: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}</span>
                </div>
              </div>
              
              {isLoading ? (
                <LoadingSpinner text="正在加载交易数据..." />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[200px]">订单/渠道信息</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[180px]">酒店/平台</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[120px]">客人信息</th>
                          <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 w-[140px]">金额明细</th>
                          <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 w-[100px]">应收/实收</th>
                          <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[80px]">差异</th>
                          <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[70px]">开票</th>
                          <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[70px]">状态</th>
                          <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[60px]">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map(t => {
                          const invoiceCfg = invoiceStatusConfig[t.invoiceStatus];
                          const reconcileCfg = reconcileStatusConfig[t.reconcileStatus];
                          const ReconcileIcon = reconcileCfg.icon;
                          const hasDiff = t.expectedAmount !== t.actualAmount;
                          const diffAmount = t.expectedAmount - t.actualAmount;
                          
                          return (
                            <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${hasDiff ? 'bg-red-50/30' : ''}`}>
                              {/* 订单/渠道信息 */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-mono text-gray-900">{t.orderId.slice(-10)}</span>
                                  {t.linkedOrder && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Package className="w-3 h-3 text-violet-500 shrink-0" />
                                      <span className="text-violet-600 font-medium truncate">{t.linkedOrder.channelOrderNo}</span>
                                      {t.linkedOrder.syncStatus === 'synced' ? (
                                        <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
                                      ) : t.linkedOrder.syncStatus === 'failed' ? (
                                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3 text-amber-500 shrink-0" />
                                      )}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-400">{formatDate(t.transactionDate)}</span>
                                </div>
                              </td>
                              
                              {/* 酒店/平台 */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-sm text-gray-900 truncate">{t.hotelName}</span>
                                  <PlatformLogo platform={t.platform} size="sm" />
                                </div>
                              </td>
                              
                              {/* 客人信息 */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm text-gray-900">{t.guestName}</span>
                                  <span className="text-xs text-gray-500">{t.roomType}</span>
                                  <span className="text-xs text-gray-400">{t.nights}晚</span>
                                </div>
                              </td>
                              
                              {/* 金额明细 */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-gray-900">{formatMoney(t.amount)}</span>
                                  <span className="text-xs text-gray-500">服务费 -{formatMoney(t.serviceFee)}</span>
                                  <span className="text-xs text-gray-500">平台费 -{formatMoney(t.platformFee)}</span>
                                </div>
                              </td>
                              
                              {/* 应收/实收 */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm text-gray-600">{formatMoney(t.expectedAmount)}</span>
                                  <span className={`text-sm font-medium ${hasDiff ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatMoney(t.actualAmount)}
                                  </span>
                                </div>
                              </td>
                              
                              {/* 差异 */}
                              <td className="py-3 px-3 text-center">
                                {hasDiff ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-sm font-bold text-red-600">
                                      {formatMoney(diffAmount)}
                                    </span>
                                    {t.mismatchReason && (
                                      <span className="text-xs text-gray-500 truncate max-w-[70px]" title={t.mismatchReason}>
                                        {t.mismatchReason.slice(0, 4)}..
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-green-600 text-sm">-</span>
                                )}
                              </td>
                              
                              {/* 开票 */}
                              <td className="py-3 px-3 text-center">
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                                  style={{ backgroundColor: invoiceCfg.bgColor, color: invoiceCfg.color }}
                                >
                                  {invoiceCfg.name}
                                </span>
                              </td>
                              
                              {/* 状态 */}
                              <td className="py-3 px-3 text-center">
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                                  style={{ backgroundColor: reconcileCfg.bgColor, color: reconcileCfg.color }}
                                >
                                  <ReconcileIcon className="w-3 h-3 shrink-0" />
                                  {reconcileCfg.name}
                                </span>
                              </td>
                              
                              {/* 操作 */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedTransaction(t);
                                    setShowDetailModal(true);
                                  }}
                                  className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                  title="查看详情"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center">
                      <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">暂无符合条件的交易记录</p>
                      <p className="text-sm text-gray-400 mt-1">请调整筛选条件或时间范围</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* ============ 差异分析 Tab ============ */}
          {activeTab === 'mismatch' && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    发现 {filteredTransactions.filter(t => t.reconcileStatus === 'mismatch').length} 笔差异订单，
                    差异总额 <AnimatedNumber value={stats.totalMismatch} prefix="¥" className="font-bold" />
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">差异订单列表</h3>
                </div>
                
                {isLoading ? (
                  <LoadingSpinner text="正在加载差异数据..." />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[180px]">订单信息</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[200px]">酒店/平台</th>
                            <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 w-[120px]">应收金额</th>
                            <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 w-[120px]">实收金额</th>
                            <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 w-[100px]">差异</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[140px]">差异原因</th>
                            <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[80px]">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTransactions
                            .filter(t => t.reconcileStatus === 'mismatch')
                            .map(t => {
                              const diffAmount = t.expectedAmount - t.actualAmount;
                              return (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="py-3 px-3">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-mono text-gray-900">{t.orderId.slice(-10)}</span>
                                      <span className="text-xs text-gray-400">{formatDate(t.transactionDate)}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex flex-col gap-1.5">
                                      <span className="text-sm text-gray-900 truncate">{t.hotelName}</span>
                                      <PlatformLogo platform={t.platform} size="sm" />
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right text-sm text-gray-900">{formatMoney(t.expectedAmount)}</td>
                                  <td className="py-3 px-3 text-right text-sm text-gray-600">{formatMoney(t.actualAmount)}</td>
                                  <td className="py-3 px-3 text-right">
                                    <span className="text-sm font-bold text-red-600">
                                      {formatMoney(diffAmount)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-600 truncate max-w-[140px]" title={t.mismatchReason}>
                                    {t.mismatchReason || '未知原因'}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedTransaction(t);
                                        setShowDetailModal(true);
                                      }}
                                      className="text-sm text-violet-600 hover:text-violet-700"
                                    >
                                      查看详情
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {filteredTransactions.filter(t => t.reconcileStatus === 'mismatch').length === 0 && (
                      <div className="p-12 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                        <p className="text-gray-500">恭喜，没有发现差异订单</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* ============ 开票管理 Tab ============ */}
          {activeTab === 'invoice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setInvoiceFilter('pending')}
                  className={`bg-white rounded-xl border p-4 text-left transition-colors ${invoiceFilter === 'pending' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200 hover:border-amber-200'}`}
                >
                  <div className="text-2xl font-bold text-amber-600">
                    <AnimatedNumber value={stats.pendingInvoice} />
                  </div>
                  <div className="text-sm text-gray-500">待开票</div>
                </button>
                <button 
                  onClick={() => setInvoiceFilter('issued')}
                  className={`bg-white rounded-xl border p-4 text-left transition-colors ${invoiceFilter === 'issued' ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200 hover:border-green-200'}`}
                >
                  <div className="text-2xl font-bold text-green-600">
                    <AnimatedNumber value={filteredTransactions.filter(t => t.invoiceStatus === 'issued').length} />
                  </div>
                  <div className="text-sm text-gray-500">已开票</div>
                </button>
                <button 
                  onClick={() => setInvoiceFilter('not_required')}
                  className={`bg-white rounded-xl border p-4 text-left transition-colors ${invoiceFilter === 'not_required' ? 'border-gray-300 ring-2 ring-gray-100' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="text-2xl font-bold text-gray-600">
                    <AnimatedNumber value={filteredTransactions.filter(t => t.invoiceStatus === 'not_required').length} />
                  </div>
                  <div className="text-sm text-gray-500">无需开票</div>
                </button>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {invoiceFilter === 'pending' && '待开票列表'}
                    {invoiceFilter === 'issued' && '已开票列表'}
                    {invoiceFilter === 'not_required' && '无需开票列表'}
                    {invoiceFilter === 'all' && '全部开票记录'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={invoiceFilter}
                      onChange={(e) => setInvoiceFilter(e.target.value as InvoiceStatus | 'all')}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                    >
                      <option value="pending">待开票</option>
                      <option value="issued">已开票</option>
                      <option value="not_required">无需开票</option>
                      <option value="all">全部</option>
                    </select>
                    {invoiceFilter === 'pending' && stats.pendingInvoice > 0 && (
                      <button 
                        onClick={async () => {
                          if (!confirm(`确认对 ${stats.pendingInvoice} 笔待开票记录进行批量开票？`)) return;
                          
                          toastRef.current.info('正在开票', '正在生成批量开票申请...');
                          
                          // 模拟API调用
                          await new Promise(resolve => setTimeout(resolve, 1500));
                          
                          toastRef.current.success(
                            '开票申请已提交',
                            `已成功提交 ${stats.pendingInvoice} 笔开票申请，预计1-2个工作日内处理完毕`
                          );
                          
                          // 刷新数据
                          fetchData();
                        }}
                        className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                      >
                        批量开票
                      </button>
                    )}
                  </div>
                </div>
                
                {isLoading ? (
                  <LoadingSpinner text="正在加载开票数据..." />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">订单信息</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">酒店</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">客人</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">金额</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">开票状态</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredTransactions
                            .filter(t => invoiceFilter === 'all' || t.invoiceStatus === invoiceFilter)
                            .map(t => (
                              <tr key={t.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="text-sm font-mono text-gray-900">{t.orderId.slice(-10)}</div>
                                  <div className="text-xs text-gray-400">{formatDate(t.transactionDate)}</div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-900">{t.hotelName}</td>
                                <td className="py-3 px-4 text-sm text-gray-600">{t.guestName}</td>
                                <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">{formatMoney(t.amount)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span 
                                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                                    style={{ 
                                      backgroundColor: invoiceStatusConfig[t.invoiceStatus].bgColor,
                                      color: invoiceStatusConfig[t.invoiceStatus].color
                                    }}
                                  >
                                    {invoiceStatusConfig[t.invoiceStatus].name}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {t.invoiceStatus === 'pending' ? (
                                    <button 
                                      onClick={() => {
                                        setSelectedTransaction(t);
                                        setShowInvoiceModal(true);
                                      }}
                                      className="text-sm text-violet-600 hover:text-violet-700"
                                    >
                                      开具发票
                                    </button>
                                  ) : t.invoiceStatus === 'issued' ? (
                                    <button 
                                      onClick={() => handleViewInvoice(t.orderId)}
                                      className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                      查看发票
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredTransactions.filter(t => invoiceFilter === 'all' || t.invoiceStatus === invoiceFilter).length === 0 && (
                      <div className="p-12 text-center">
                        <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">
                          {invoiceFilter === 'pending' && '暂无待开票订单'}
                          {invoiceFilter === 'issued' && '暂无已开票记录'}
                          {invoiceFilter === 'not_required' && '暂无无需开票记录'}
                          {invoiceFilter === 'all' && '暂无开票记录'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* 详情弹窗 - 展示非标渠道订单关联 */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">交易详情</h3>
                <p className="text-sm text-gray-500">订单号: {selectedTransaction.orderId}</p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 非标渠道订单关联信息 */}
              {selectedTransaction.linkedOrder ? (
                <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="w-5 h-5 text-violet-600" />
                    <h4 className="font-semibold text-gray-900">非标渠道订单关联</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">渠道订单号</span>
                      <p className="font-medium text-violet-700">{selectedTransaction.linkedOrder.channelOrderNo}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">来源渠道</span>
                      <p className="font-medium text-gray-900">
                        {platformConfig[selectedTransaction.linkedOrder.channel]?.name || selectedTransaction.linkedOrder.channel}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">PMS订单号</span>
                      <p className="font-medium text-gray-900">
                        {selectedTransaction.linkedOrder.pmsOrderId || '未同步'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">同步状态</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        selectedTransaction.linkedOrder.syncStatus === 'synced'
                          ? 'bg-green-100 text-green-700'
                          : selectedTransaction.linkedOrder.syncStatus === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedTransaction.linkedOrder.syncStatus === 'synced' && <CheckCircle className="w-3 h-3" />}
                        {selectedTransaction.linkedOrder.syncStatus === 'failed' && <AlertTriangle className="w-3 h-3" />}
                        {selectedTransaction.linkedOrder.syncStatus === 'pending' && <RefreshCw className="w-3 h-3" />}
                        {selectedTransaction.linkedOrder.syncStatus === 'synced' && '已同步'}
                        {selectedTransaction.linkedOrder.syncStatus === 'failed' && '同步失败'}
                        {selectedTransaction.linkedOrder.syncStatus === 'pending' && '同步中'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => handleViewNonStandardOrder(selectedTransaction.linkedOrder!.channelOrderNo)}
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                    >
                      查看非标渠道订单 <ExternalLink className="w-3 h-3" />
                    </button>
                    {selectedTransaction.linkedOrder.pmsOrderId && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button 
                          onClick={() => handleViewPMSOrder(selectedTransaction.linkedOrder!.pmsOrderId!)}
                          className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                        >
                          查看PMS订单 <ExternalLink className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Package className="w-5 h-5" />
                    <span>直客订单，无需关联非标渠道</span>
                  </div>
                </div>
              )}
              
              {/* 交易信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">酒店</span>
                      <span className="text-gray-900">{selectedTransaction.hotelName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">客人</span>
                      <span className="text-gray-900">{selectedTransaction.guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">房型</span>
                      <span className="text-gray-900">{selectedTransaction.roomType} · {selectedTransaction.nights}晚</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">交易日期</span>
                      <span className="text-gray-900">{new Date(selectedTransaction.transactionDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">金额明细</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">订单金额</span>
                      <span className="text-gray-900">{formatMoney(selectedTransaction.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">服务费</span>
                      <span className="text-red-600">-{formatMoney(selectedTransaction.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">平台费</span>
                      <span className="text-red-600">-{formatMoney(selectedTransaction.platformFee)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-gray-900">应收净额</span>
                      <span className="text-gray-900">{formatMoney(selectedTransaction.expectedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">实收金额</span>
                      <span className={selectedTransaction.expectedAmount !== selectedTransaction.actualAmount ? 'text-red-600' : 'text-green-600'}>
                        {formatMoney(selectedTransaction.actualAmount)}
                      </span>
                    </div>
                    {selectedTransaction.expectedAmount !== selectedTransaction.actualAmount && (
                      <div className="flex justify-between text-red-600 bg-red-50 p-2 rounded">
                        <span>差异金额</span>
                        <span className="font-bold">
                          {formatMoney(selectedTransaction.expectedAmount - selectedTransaction.actualAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 对账状态与差异原因 */}
              {(selectedTransaction.reconcileStatus === 'mismatch' || selectedTransaction.mismatchReason) && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <h4 className="font-medium text-red-800 mb-2">差异分析</h4>
                  <p className="text-sm text-red-700">
                    原因: {selectedTransaction.mismatchReason || '未记录具体原因'}
                  </p>
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  关闭
                </button>
                {selectedTransaction.reconcileStatus !== 'matched' && (
                  <button 
                    onClick={() => handleMarkAsMatched(selectedTransaction.orderId)}
                    disabled={isMarkingMatched === selectedTransaction.orderId}
                    className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMarkingMatched === selectedTransaction.orderId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {isMarkingMatched === selectedTransaction.orderId ? '处理中...' : '标记为已对平'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 开具发票弹窗 */}
      {showInvoiceModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">开具发票</h3>
                <p className="text-sm text-gray-500">订单号: {selectedTransaction.orderId}</p>
              </div>
              <button 
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceFormData({ title: '', taxNo: '', email: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-sm text-amber-800">
                  开票金额：<span className="font-bold">{formatMoney(selectedTransaction.amount)}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发票抬头 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceFormData.title}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入发票抬头"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  税号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceFormData.taxNo}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, taxNo: e.target.value }))}
                  placeholder="请输入纳税人识别号"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  接收邮箱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={invoiceFormData.email}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入接收邮箱"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setInvoiceFormData({ title: '', taxNo: '', email: '' });
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleIssueInvoice}
                disabled={isIssuingInvoice === selectedTransaction.orderId}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isIssuingInvoice === selectedTransaction.orderId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                {isIssuingInvoice === selectedTransaction.orderId ? '开具中...' : '确认开具'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 未选择酒店时的空状态 */}
      {selectedHotelIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看财务对账</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            财务对账需要选择至少一家酒店才能查看。<br/>
            支持多酒店财务数据汇总与对账。
          </p>
          <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
            <Package className="w-4 h-4" />
            <span>请从顶部酒店选择器中选择酒店</span>
          </div>
        </div>
      )}
    </div>
  );
}
