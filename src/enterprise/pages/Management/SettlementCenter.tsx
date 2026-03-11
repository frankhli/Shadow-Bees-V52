/**
 * 企业版结算中心 V3
 * 
 * 基于非标渠道订单的结算管理：
 * 1. 酒店应付视角（单体酒店）：应付华美会的佣金（订单金额10%）
 * 2. 平台分账视角（华美会）：与 Shadow Bees 分账（1:1，各5%）
 * 
 * 分账逻辑：
 * - 华美会收取酒店：订单金额 × 10%
 * - 华美会分给 Shadow Bees：佣金 × 50% = 订单金额 × 5%
 * - 华美会净得：订单金额 × 5%
 * - 酒店实得：订单金额 × 90%
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Wallet, Receipt, Building2,
  Download, Filter,
  ChevronDown, CheckCircle,
  Clock, BarChart3,
  PieChart, TrendingUp, DollarSign,
  ArrowLeftRight, Building, RefreshCw,
  FileSpreadsheet, Loader2
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { useCountUp } from '../../hooks/useCountUp';
import { useToast } from '../../../components/ui/Toast';
import { type SettlementItem, type SettlementStatus, type ChannelType, getSettlements, getSettlementStats, getMonthlySettlementStats, getAvailablePeriods, exportSettlements, applyInvoice, confirmSettlement } from '../../api/settlementApi';

// ============================================
// 类型定义
// ============================================

interface Stats {
  totalOrders: number;
  totalAmount: number;
  totalCommission: number;
  totalShadowBeesShare: number;
  totalHuameihuiNet: number;
  totalHotelNet: number;
  pendingCount: number;
  pendingCommission: number;
}

// ============================================
// 配置
// ============================================

const CHANNEL_CONFIG: Record<ChannelType, { name: string; color: string; bgColor: string }> = {
  xianyu: { name: '闲鱼', color: '#FF6B00', bgColor: '#FFF7ED' },
  xiaohongshu: { name: '小红书', color: '#FF2442', bgColor: '#FEF2F2' },
  wechat: { name: '微信', color: '#07C160', bgColor: '#F0FDF4' },
  douyin: { name: '抖音', color: '#000000', bgColor: '#F3F4F6' },
};

const STATUS_CONFIG = {
  pending: { name: '待结算', color: '#F59E0B', bgColor: '#FFFBEB', icon: Clock },
  settled: { name: '已结算', color: '#10B981', bgColor: '#F0FDF4', icon: CheckCircle },
  invoiced: { name: '已开票', color: '#3B82F6', bgColor: '#EFF6FF', icon: Receipt },
};

// ============================================
// 数字动画组件
// ============================================

function AnimatedNumber({ 
  value, 
  prefix = '', 

  duration = 1500 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  duration?: number;
}) {
  const { count } = useCountUp(value, { duration });
  
  const formatValue = (val: number) => {
    if (prefix === '¥') {
      return `¥${Math.round(val).toLocaleString()}`;
    }
    return Math.round(val).toLocaleString();
  };
  
  return <span>{formatValue(count)}</span>;
}

// ============================================
// 加载骨架屏组件
// ============================================

function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="w-20 h-6 bg-gray-200 rounded" />
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 border-b border-gray-100" />
      ))}
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export default function SettlementCenter() {
  const { selectedHotelIds } = useEnterpriseStore();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  
  // Tab 切换：酒店应付视角 vs 平台分账视角
  const [viewMode, setViewMode] = useState<'hotel' | 'platform'>('hotel');
  const [activeTab, setActiveTab] = useState<'orders' | 'summary'>('orders');
  
  // 数据状态
  const [settlementData, setSettlementData] = useState<SettlementItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalAmount: 0,
    totalCommission: 0,
    totalShadowBeesShare: 0,
    totalHuameihuiNet: 0,
    totalHotelNet: 0,
    pendingCount: 0,
    pendingCommission: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<Array<{
    period: string;
    orderAmount: number;
    commission: number;
    shadowBeesShare: number;
    huameihuiNet: number;
  }>>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  
  // UI 状态
  const [showFilters, setShowFilters] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 分页
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  // 选中的结算单（用于批量操作）
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 获取数据
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const hotelId = selectedHotelIds.length === 1 ? selectedHotelIds[0] : undefined;
      
      // 并行获取数据
      const [settlementsRes, statsRes, monthlyRes, periodsRes] = await Promise.all([
        getSettlements({
          page,
          pageSize,
          hotelId,
          period: periodFilter,
          status: statusFilter as SettlementStatus,
        }),
        getSettlementStats(hotelId),
        getMonthlySettlementStats(hotelId),
        getAvailablePeriods(),
      ]);
      
      if (settlementsRes.success) {
        setSettlementData(settlementsRes.data.list);
        setTotal(settlementsRes.data.total);
      }
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      
      if (monthlyRes.success) {
        setMonthlyStats(monthlyRes.data);
      }
      
      if (periodsRes.success) {
        setAvailablePeriods(periodsRes.data);
      }
    } catch (error) {
      toastRef.current.error('数据加载失败', '请稍后重试');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelIds, page, pageSize, periodFilter, statusFilter]);
  
  // 初始加载和数据变化时重新获取
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // 刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(false);
    setIsRefreshing(false);
    toastRef.current.success('刷新成功', '数据已更新');
  };
  
  // 导出数据
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const hotelId = selectedHotelIds.length === 1 ? selectedHotelIds[0] : undefined;
      const res = await exportSettlements({
        hotelId,
        period: periodFilter,
        status: statusFilter,
      });
      
      if (res.success) {
        // 创建并下载 CSV 文件
        const csvContent = generateCSV(settlementData);
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', res.data.filename.replace('.xlsx', '.csv'));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toastRef.current.success('导出成功', `文件 ${res.data.filename} 已下载`);
      } else {
        toastRef.current.error('导出失败', res.message || '请稍后重试');
      }
    } catch (error) {
      toastRef.current.error('导出失败', '请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };
  
  // 生成 CSV 内容
  const generateCSV = (data: SettlementItem[]) => {
    const headers = ['订单号', '渠道', '酒店', '客人', '房型', '订单金额', '应付佣金', '状态', '创建时间'];
    const rows = data.map(item => [
      item.orderNo,
      CHANNEL_CONFIG[item.channel].name,
      item.hotelName,
      item.guestName,
      item.roomTypeName,
      item.orderAmount,
      item.huameihuiCommission,
      STATUS_CONFIG[item.status].name,
      new Date(item.createdAt).toLocaleDateString('zh-CN'),
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };
  
  // 申请开票
  const handleApplyInvoice = async () => {
    if (selectedIds.length === 0) {
      toastRef.current.warning('请选择结算单', '请先选择需要开票的结算单');
      return;
    }
    
    try {
      const res = await applyInvoice(selectedIds);
      if (res.success) {
        toastRef.current.success('申请成功', `发票号: ${res.data.invoiceNo}`);
        setSelectedIds([]);
        fetchData(false);
      } else {
        toastRef.current.error('申请失败', res.message || '请稍后重试');
      }
    } catch (error) {
      toastRef.current.error('申请失败', '请稍后重试');
    }
  };
  
  // 确认结算
  const handleConfirmSettlement = async () => {
    if (selectedIds.length === 0) {
      toastRef.current.warning('请选择结算单', '请先选择需要结算的订单');
      return;
    }
    
    try {
      const res = await confirmSettlement(selectedIds);
      if (res.success) {
        toastRef.current.success('结算成功', '选中的订单已结算');
        setSelectedIds([]);
        fetchData(false);
      } else {
        toastRef.current.error('结算失败', res.message || '请稍后重试');
      }
    } catch (error) {
      toastRef.current.error('结算失败', '请稍后重试');
    }
  };

  // 筛选数据（前端筛选，用于已加载的数据）
  const filteredData = useMemo(() => {
    return settlementData.filter(item => {
      // 酒店选择器关联
      if (selectedHotelIds.length > 0 && !selectedHotelIds.includes(item.hotelId)) {
        return false;
      }
      return true;
    });
  }, [settlementData, selectedHotelIds]);
  
  // 格式化金额
  const formatMoney = (amount: number) => `¥${amount.toLocaleString()}`;
  
  // 切换选中状态
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">结算中心</h1>
            <p className="text-sm text-gray-500 mt-1">
              基于非标渠道订单的分账管理
              {selectedHotelIds.length > 0 && ` · ${selectedHotelIds.length} 家酒店`}
            </p>
          </div>
          
          {/* 操作按钮组 */}
          <div className="flex items-center gap-2">
            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">刷新</span>
            </button>
            
            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-sm">导出</span>
            </button>
          </div>
        </div>
        
        {/* 操作栏 - 单列布局避免换行 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 视角切换 */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('hotel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap ${
                viewMode === 'hotel'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building className="w-4 h-4" />
              酒店应付
            </button>
            <button
              onClick={() => setViewMode('platform')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap ${
                viewMode === 'platform'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              平台分账
            </button>
          </div>
          
          {/* Tab 切换 */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              订单明细
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              结算汇总
            </button>
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors shrink-0"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">筛选</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 批量操作按钮 */}
          {selectedIds.length > 0 && (
            <>
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <span className="text-sm text-gray-600">
                已选择 {selectedIds.length} 项
              </span>
              <button
                onClick={handleConfirmSettlement}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                确认结算
              </button>
              <button
                onClick={handleApplyInvoice}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                申请开票
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* 未选择酒店提示 */}
      {selectedHotelIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-amber-900">未选择酒店</div>
              <div className="text-sm text-amber-700">
                请从顶部酒店选择器中选择酒店，查看结算数据
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ===== 酒店应付视角 ===== */}
      {viewMode === 'hotel' && (
        <>
          {/* 统计卡片 */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      <AnimatedNumber value={stats.totalOrders} />
                    </div>
                    <div className="text-sm text-gray-500">订单数量</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      <AnimatedNumber value={stats.totalAmount} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">订单总额</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      <AnimatedNumber value={stats.totalCommission} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">应付华美会佣金 (10%)</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      <AnimatedNumber value={stats.totalHotelNet} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">酒店实得 (90%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 分账说明 */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <PieChart className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">分账说明</h4>
                <p className="text-sm text-blue-700 mt-1">
                  非标渠道订单总金额的 <strong>10%</strong> 作为华美会佣金，
                  其中 <strong>5%</strong> 分给 Shadow Bees，<strong>5%</strong> 为华美会净得。
                  酒店实得订单金额的 <strong>90%</strong>。
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* ===== 平台分账视角 ===== */}
      {viewMode === 'platform' && (
        <>
          {/* 统计卡片 */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      <AnimatedNumber value={stats.totalOrders} />
                    </div>
                    <div className="text-sm text-gray-500">订单数量</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      <AnimatedNumber value={stats.totalCommission} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">华美会收取佣金 (10%)</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-violet-600">
                      <AnimatedNumber value={stats.totalShadowBeesShare} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">应付 Shadow Bees (5%)</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      <AnimatedNumber value={stats.totalHuameihuiNet} prefix="¥" />
                    </div>
                    <div className="text-sm text-gray-500">华美会净得 (5%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 分账流向图 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-6">分账流向</h3>
            <div className="flex items-center justify-between">
              {/* 酒店 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building className="w-8 h-8 text-blue-600" />
                </div>
                <div className="font-medium text-gray-900">酒店</div>
                <div className="text-sm text-gray-500">实得 90%</div>
                <div className="text-lg font-bold text-green-600">
                  {isLoading ? '¥...' : formatMoney(stats.totalHotelNet)}
                </div>
              </div>
              
              {/* 箭头 1 */}
              <div className="flex-1 px-4">
                <div className="h-1 bg-gray-200 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-50 px-2 py-1 rounded text-xs text-amber-700 border border-amber-200">
                    支付 10% 佣金
                  </div>
                </div>
              </div>
              
              {/* 华美会 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Wallet className="w-8 h-8 text-amber-600" />
                </div>
                <div className="font-medium text-gray-900">华美会</div>
                <div className="text-sm text-gray-500">收取 10% 佣金</div>
                <div className="text-lg font-bold text-amber-600">
                  {isLoading ? '¥...' : formatMoney(stats.totalCommission)}
                </div>
              </div>
              
              {/* 箭头 2 */}
              <div className="flex-1 px-4">
                <div className="h-1 bg-gray-200 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-50 px-2 py-1 rounded text-xs text-violet-700 border border-violet-200">
                    分给 Shadow Bees 50%
                  </div>
                </div>
              </div>
              
              {/* Shadow Bees */}
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ArrowLeftRight className="w-8 h-8 text-violet-600" />
                </div>
                <div className="font-medium text-gray-900">Shadow Bees</div>
                <div className="text-sm text-gray-500">分得 5%</div>
                <div className="text-lg font-bold text-violet-600">
                  {isLoading ? '¥...' : formatMoney(stats.totalShadowBeesShare)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">结算周期</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">全部周期</option>
                {availablePeriods.map(period => (
                  <option key={period} value={period}>
                    {period.replace('-', '年')}月
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">结算状态</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">全部状态</option>
                <option value="pending">待结算</option>
                <option value="settled">已结算</option>
                <option value="invoiced">已开票</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setPeriodFilter('all');
                  setStatusFilter('all');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                重置筛选
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 订单明细表格 */}
      {activeTab === 'orders' && (
        <>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单信息</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">渠道</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单金额</th>
                    {viewMode === 'hotel' ? (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 text-amber-600">应付佣金 (10%)</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 text-green-600">酒店实得 (90%)</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 text-amber-600">华美会佣金 (10%)</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 text-violet-600">Shadow Bees (5%)</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 text-green-600">华美会净得 (5%)</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={viewMode === 'hotel' ? 7 : 8} 
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Receipt className="w-12 h-12 text-gray-300" />
                          <p>暂无结算数据</p>
                          <p className="text-sm text-gray-400">请调整筛选条件或稍后再试</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const channelConfig = CHANNEL_CONFIG[item.channel];
                      const statusConfig = STATUS_CONFIG[item.status];
                      const StatusIcon = statusConfig.icon;
                      const isSelected = selectedIds.includes(item.id);
                      
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-violet-50/50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(item.id)}
                              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{item.orderNo}</div>
                              <div className="text-sm text-gray-500">{item.hotelName}</div>
                              <div className="text-xs text-gray-400">{item.guestName} · {item.roomTypeName}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span 
                              className="px-2 py-1 text-xs rounded-full" 
                              style={{ color: channelConfig.color, backgroundColor: channelConfig.bgColor }}
                            >
                              {channelConfig.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{formatMoney(item.orderAmount)}</div>
                          </td>
                          {viewMode === 'hotel' ? (
                            <>
                              <td className="px-4 py-3">
                                <div className="font-medium text-amber-600">{formatMoney(item.huameihuiCommission)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-green-600">{formatMoney(item.hotelNet)}</div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3">
                                <div className="font-medium text-amber-600">{formatMoney(item.huameihuiCommission)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-violet-600">{formatMoney(item.shadowBeesShare)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-green-600">{formatMoney(item.huameihuiNet)}</div>
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" 
                              style={{ color: statusConfig.color, backgroundColor: statusConfig.bgColor }}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              
              {/* 分页 */}
              {total > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    共 {total} 条记录，第 {page} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <span className="text-sm text-gray-600">
                      {page} / {Math.ceil(total / pageSize)}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                      disabled={page >= Math.ceil(total / pageSize)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* 结算汇总 */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">按月结算汇总</h3>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : monthlyStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>暂无汇总数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyStats.map((data) => (
                <div key={data.period} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{data.period}</h4>
                    <span className="text-sm text-gray-500">订单总额: {formatMoney(data.orderAmount)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-500">华美会佣金 (10%)</div>
                      <div className="text-lg font-bold text-amber-600">{formatMoney(data.commission)}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-500">Shadow Bees (5%)</div>
                      <div className="text-lg font-bold text-violet-600">{formatMoney(data.shadowBeesShare)}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-500">华美会净得 (5%)</div>
                      <div className="text-lg font-bold text-green-600">{formatMoney(data.huameihuiNet)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
