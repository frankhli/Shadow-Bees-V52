/**
 * 非标渠道订单管理
 * 
 * 核心定位：管理私域渠道（闲鱼/小红书/微信/抖音）产生的订单
 * 
 * 数据流向：
 * 私域渠道下单 → Shadow-Bees抓取 → 写入华美会PMS → PMS管理入住/退房
 * 
 * 与PMS订单的区别：
 * - 非标渠道订单：来自闲鱼/小红书等私域渠道，需同步至PMS
 * - PMS订单：来自OTA/官网，直接在PMS中管理
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Search, CheckCircle, XCircle, Clock,
  LogIn, LogOut, Eye, RefreshCw,
  ExternalLink, AlertCircle, Check, X, RotateCcw,
  Package, TrendingUp
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { orderApi } from '../../api';

// ============================================
// 类型定义
// ============================================
type ChannelType = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
type OrderStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
type PMSStatus = 'pending' | 'syncing' | 'synced' | 'failed';

interface NonStandardOrder {
  id: string;
  orderNo: string;           // 渠道订单号
  channel: ChannelType;      // 来源渠道
  channelOrderId: string;    // 渠道侧订单ID
  
  // 酒店信息
  hotelId: string;
  hotelName: string;
  
  // 房型信息
  roomTypeId: string;
  roomTypeName: string;
  roomCount: number;
  
  // 入住信息
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  
  // 价格信息
  totalAmount: number;
  channelFee: number;
  platformFee: number;
  netAmount: number;
  
  // 状态
  status: OrderStatus;
  pmsStatus: PMSStatus;
  pmsOrderId?: string;       // 同步到PMS后的订单号
  
  // 时间戳
  createdAt: string;
  syncedAt?: string;
  
  // 备注
  guestNotes?: string;
  operatorNotes?: string;
}

// ============================================
// 渠道配置
// ============================================
const CHANNEL_CONFIG: Record<ChannelType, {
  name: string;
  logo: string;
  color: string;
  bgColor: string;
}> = {
  xianyu: {
    name: '闲鱼',
    logo: '/logos/xianyu.jpg',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  xiaohongshu: {
    name: '小红书',
    logo: '/logos/xiaohongshu.jpg',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  wechat: {
    name: '微信',
    logo: '/logos/wechat.jpg',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  douyin: {
    name: '抖音',
    logo: '/logos/douyin.jpg',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

// 订单状态配置
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: '待确认', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
  confirmed: { label: '已确认', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: CheckCircle },
  checked_in: { label: '已入住', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: LogIn },
  checked_out: { label: '已退房', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: LogOut },
  cancelled: { label: '已取消', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

// PMS同步状态配置
const PMS_STATUS_CONFIG: Record<PMSStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: '待同步', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
  syncing: { label: '同步中', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: RefreshCw },
  synced: { label: '已同步', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: CheckCircle },
  failed: { label: '同步失败', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};



// ============================================
// 工具函数
// ============================================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

// ============================================
// 主组件
// ============================================
export default function OrderManagement() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const [orders, setOrders] = useState<NonStandardOrder[]>([]);
  
  // 加载非标订单数据 - 当酒店选择变化时重新加载
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await orderApi.getNonStandardOrders({
          page: 1,
          pageSize: 50,
        });
        if (response.success) {
          setOrders(response.data.list as unknown as NonStandardOrder[]);
        }
      } catch (error) {
        console.error('加载订单失败:', error);
      }
    };
    loadOrders();
  }, [selectedHotelIds]);
  
  // 筛选
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
    channel: '',
    pmsStatus: '',
    dateRange: 'all', // all, today, week, month
  });
  
  // 时间范围选项
  const DATE_RANGE_OPTIONS = [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今日' },
    { value: 'week', label: '近7天' },
    { value: 'month', label: '近30天' },
  ];
  
  // 详情弹窗
  const [selectedOrder, setSelectedOrder] = useState<NonStandardOrder | null>(null);
  
  // 根据筛选条件过滤订单
  const filteredOrders = useMemo(() => {
    // 根据时间范围过滤
    const filterByDateRange = (order: NonStandardOrder) => {
      if (filters.dateRange === 'all') return true;
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case 'today':
          return orderDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return orderDate >= monthAgo;
        default:
          return true;
      }
    };
    
    return orders.filter(order => {
      if (selectedHotelIds.length > 0 && !selectedHotelIds.includes(order.hotelId)) return false;
      if (filters.keyword && !order.guestName.includes(filters.keyword) && !order.orderNo.includes(filters.keyword)) return false;
      if (filters.status && order.status !== filters.status) return false;
      if (filters.channel && order.channel !== filters.channel) return false;
      if (filters.pmsStatus && order.pmsStatus !== filters.pmsStatus) return false;
      if (!filterByDateRange(order)) return false;
      return true;
    });
  }, [orders, selectedHotelIds, filters]);
  
  // 统计
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const pendingSync = filteredOrders.filter(o => o.pmsStatus === 'pending').length;
    const failedSync = filteredOrders.filter(o => o.pmsStatus === 'failed').length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const netAmount = filteredOrders.reduce((sum, o) => sum + o.netAmount, 0);
    
    return { totalOrders, pendingSync, failedSync, totalAmount, netAmount };
  }, [filteredOrders]);
  
  // 处理同步到PMS
  const handleSyncToPMS = async (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, pmsStatus: 'syncing' } : o
    ));
    
    // 模拟API调用
    setTimeout(() => {
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, pmsStatus: 'synced', pmsOrderId: `PMS-${Date.now()}`, syncedAt: new Date().toISOString() }
          : o
      ));
    }, 1500);
  };
  
  // 处理确认订单
  const handleConfirmOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: 'confirmed' } : o
    ));
  };
  
  // 处理取消订单
  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: 'cancelled' } : o
    ));
  };
  
  // 未选择酒店时的空状态
  if (selectedHotelIds.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            请在顶部酒店选择器中至少选择一家酒店，查看和管理非标渠道订单
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-violet-600" />
            非标渠道订单
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 1 
              ? `${hotels.find(h => h.id === selectedHotelIds[0])?.name} - 私域渠道订单管理`
              : `已选择 ${selectedHotelIds.length} 家酒店 - 批量管理私域订单`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href="https://pms.huamei.com/orders"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            在PMS中查看订单
          </a>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <RefreshCw className="w-4 h-4" />
            抓取新订单
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="订单总数" value={stats.totalOrders} subtitle="非标渠道订单" icon={Package} color="bg-violet-100 text-violet-600" />
        <StatCard title="待同步" value={stats.pendingSync} subtitle="需同步至PMS" icon={Clock} color="bg-amber-100 text-amber-600" />
        <StatCard title="同步失败" value={stats.failedSync} subtitle="需人工处理" icon={AlertCircle} color="bg-red-100 text-red-600" />
        <StatCard title="订单总额" value={formatCurrency(stats.totalAmount)} subtitle="含渠道费用" icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <StatCard title="实际收入" value={formatCurrency(stats.netAmount)} subtitle="扣除费用后" icon={CheckCircle} color="bg-emerald-100 text-emerald-600" />
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
        {/* 第一行：搜索 + 下拉筛选 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订单号、客人姓名..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          
          <select
            value={filters.channel}
            onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">全部渠道</option>
            {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">全部状态</option>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={filters.pmsStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, pmsStatus: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">同步状态</option>
            {Object.entries(PMS_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        
        {/* 第二行：时间范围标签 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 mr-1">时间范围：</span>
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilters(prev => ({ ...prev, dateRange: option.value }))}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                filters.dateRange === option.value
                  ? 'bg-violet-100 text-violet-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-[180px]">订单信息</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-[100px]">渠道</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-[140px]">酒店/房型</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-[160px]">入住信息</th>
                <th className="px-3 py-3 text-right text-sm font-medium text-gray-500 w-[120px]">金额</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 w-[100px]">订单状态</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 w-[100px]">PMS同步</th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-500 w-[120px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const channelConfig = CHANNEL_CONFIG[order.channel];
                const statusConfig = ORDER_STATUS_CONFIG[order.status];
                const pmsConfig = PMS_STATUS_CONFIG[order.pmsStatus];
                const StatusIcon = statusConfig.icon;
                const PMSIcon = pmsConfig.icon;
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    {/* 订单信息 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{order.orderNo}</span>
                        {/* 推演订单标识 */}
                        {order.id.startsWith('SIM-') && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded border border-blue-100 whitespace-nowrap">
                            推演
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{order.id}</div>
                      <div className="text-xs text-gray-400 mt-1 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </td>
                    
                    {/* 渠道 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-4 flex items-center justify-center bg-white rounded overflow-hidden border border-gray-100 flex-shrink-0">
                          <img src={channelConfig.logo} alt={channelConfig.name} className="w-full h-full object-contain" />
                        </div>
                        <span className={`text-sm ${channelConfig.color} whitespace-nowrap`}>{channelConfig.name}</span>
                      </div>
                    </td>
                    
                    {/* 酒店/房型 */}
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]" title={order.hotelName}>{order.hotelName}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {order.roomTypeName} × {order.roomCount}间
                      </div>
                    </td>
                    
                    {/* 入住信息 */}
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(order.checkInDate)} - {formatDate(order.checkOutDate)}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{order.nights}晚 | {order.guestName}</div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">{order.guestPhone}</div>
                    </td>
                    
                    {/* 金额 */}
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(order.totalAmount)}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        渠道费 {formatCurrency(order.channelFee)}
                      </div>
                      <div className="text-xs text-emerald-600 whitespace-nowrap">
                        实收 {formatCurrency(order.netAmount)}
                      </div>
                    </td>
                    
                    {/* 订单状态 */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${statusConfig.bgColor} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3 flex-shrink-0" />
                        {statusConfig.label}
                      </span>
                    </td>
                    
                    {/* PMS同步 */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${pmsConfig.bgColor} ${pmsConfig.color}`}>
                          <PMSIcon className="w-3 h-3 flex-shrink-0" />
                          {pmsConfig.label}
                        </span>
                        {order.pmsOrderId && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">{order.pmsOrderId}</span>
                        )}
                      </div>
                    </td>
                    
                    {/* 操作 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {order.pmsStatus === 'pending' && (
                          <button
                            onClick={() => handleSyncToPMS(order.id)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="同步到PMS"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        
                        {order.pmsStatus === 'failed' && (
                          <button
                            onClick={() => handleSyncToPMS(order.id)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="重试同步"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirmOrder(order.id)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="确认订单"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="取消订单"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4" />
            暂无非标渠道订单
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-medium text-blue-900">使用说明</div>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• 非标渠道订单：来自闲鱼、小红书、微信、抖音等私域渠道的订单</li>
              <li>• 订单需同步至华美会PMS，由PMS管理入住/退房等操作</li>
              <li>• 待同步订单：已确认但未写入PMS的订单，请及时同步</li>
              <li>• 同步失败订单：通常因PMS库存不足，需检查库存后重试</li>
              <li>• 入住/退房操作请在PMS中进行，数据会自动回同步</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSync={() => handleSyncToPMS(selectedOrder.id)}
        />
      )}
    </div>
  );
}

// ============================================
// 统计卡片组件
// ============================================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Package;
  color: string;
}) {
  const [bgColor, textColor] = color.split(' ');
  
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 订单详情弹窗
// ============================================
function OrderDetailModal({
  order,
  onClose,
  onSync,
}: {
  order: NonStandardOrder;
  onClose: () => void;
  onSync: () => void;
}) {
  const channelConfig = CHANNEL_CONFIG[order.channel];
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const pmsConfig = PMS_STATUS_CONFIG[order.pmsStatus];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">订单详情</h3>
              <p className="text-sm text-gray-500 mt-1">{order.orderNo}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 渠道信息 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-6 flex items-center justify-center bg-white rounded overflow-hidden border border-gray-100">
              <img src={channelConfig.logo} alt={channelConfig.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{channelConfig.name}</div>
              <div className="text-xs text-gray-500">渠道订单号: {order.channelOrderId}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${pmsConfig.bgColor} ${pmsConfig.color}`}>
                {pmsConfig.label}
              </span>
            </div>
          </div>
          
          {/* 入住信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">入住人</label>
              <div className="font-medium text-gray-900">{order.guestName}</div>
              <div className="text-sm text-gray-500">{order.guestPhone}</div>
            </div>
            <div>
              <label className="text-xs text-gray-500">入住日期</label>
              <div className="font-medium text-gray-900">
                {formatDate(order.checkInDate)} - {formatDate(order.checkOutDate)}
              </div>
              <div className="text-sm text-gray-500">共 {order.nights} 晚</div>
            </div>
          </div>
          
          {/* 酒店房型 */}
          <div>
            <label className="text-xs text-gray-500">酒店/房型</label>
            <div className="font-medium text-gray-900">{order.hotelName}</div>
            <div className="text-sm text-gray-500">{order.roomTypeName} × {order.roomCount} 间</div>
          </div>
          
          {/* 金额明细 */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <label className="text-xs text-gray-500">金额明细</label>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">订单总额</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">渠道费用</span>
                <span className="text-red-600">-{formatCurrency(order.channelFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">平台服务费</span>
                <span className="text-red-600">-{formatCurrency(order.platformFee)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium text-gray-900">实际收入</span>
                <span className="font-bold text-emerald-600">{formatCurrency(order.netAmount)}</span>
              </div>
            </div>
          </div>
          
          {/* PMS同步状态 */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs text-gray-500">PMS同步状态</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${pmsConfig.bgColor} ${pmsConfig.color}`}>
                    {pmsConfig.label}
                  </span>
                  {order.pmsOrderId && (
                    <span className="text-sm text-gray-500">PMS订单: {order.pmsOrderId}</span>
                  )}
                </div>
              </div>
              
              {(order.pmsStatus === 'pending' || order.pmsStatus === 'failed') && (
                <button
                  onClick={onSync}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {order.pmsStatus === 'failed' ? '重新同步' : '同步到PMS'}
                </button>
              )}
            </div>
            
            {order.pmsStatus === 'synced' && order.syncedAt && (
              <div className="text-xs text-gray-500 mt-2">
                同步时间: {new Date(order.syncedAt).toLocaleString()}
              </div>
            )}
            
            {order.operatorNotes && (
              <div className="text-xs text-amber-600 mt-2">
                备注: {order.operatorNotes}
              </div>
            )}
          </div>
        </div>
        
        {/* 底部操作 */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            关闭
          </button>
          <a
            href={`https://pms.huamei.com/orders/${order.pmsOrderId || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-violet-600 hover:bg-violet-50 rounded-lg flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            在PMS中查看
          </a>
        </div>
      </div>
    </div>
  );
}
