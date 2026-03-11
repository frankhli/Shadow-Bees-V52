/**
 * 订单管理适配器
 * 将酒店端的订单管理适配到企业版的酒店操作台
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  Search,
  Calendar,
  User,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../stores/enterpriseStore';

// 订单状态
type OrderStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

// 订单数据
interface Order {
  id: string;
  hotelId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomCount: number;
  nights: number;
  totalAmount: number;
  status: OrderStatus;
  channel: string;
  channelOrderId: string;
  createdAt: string;
  specialRequests?: string;
}

interface OrdersAdapterProps {
  hotelId: string;
  readOnly?: boolean;
  onStatusUpdate?: (orderId: string, status: OrderStatus) => void;
}

// 订单状态配置
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: '待确认', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  confirmed: { label: '已确认', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle },
  checked_in: { label: '已入住', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  checked_out: { label: '已退房', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

// 渠道配置
const CHANNEL_CONFIG: Record<string, { name: string; color: string }> = {
  xiaohongshu: { name: '小红书', color: 'bg-red-100 text-red-700' },
  xianyu: { name: '闲鱼', color: 'bg-yellow-100 text-yellow-700' },
  wechat: { name: '微信', color: 'bg-green-100 text-green-700' },
  ota: { name: 'OTA', color: 'bg-blue-100 text-blue-700' },
  direct: { name: '直销', color: 'bg-gray-100 text-gray-700' },
};

export function OrdersAdapter({ hotelId, readOnly = false, onStatusUpdate }: OrdersAdapterProps) {
  const { getHotelById } = useEnterpriseStore();
  const [_hotel, setHotel] = useState<EnterpriseHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const hotelData = getHotelById(hotelId);
    if (hotelData) {
      setHotel(hotelData);
    }
    // 加载模拟订单数据
    setOrders(getMockOrders(hotelId));
    setLoading(false);
  }, [hotelId, getHotelById]);

  // 模拟订单数据
  function getMockOrders(hotelId: string): Order[] {
    return [
      {
        id: 'ORD20240315001',
        hotelId,
        guestName: '张先生',
        guestPhone: '138****1234',
        checkIn: '2024-03-20',
        checkOut: '2024-03-22',
        roomType: '标准大床房',
        roomCount: 1,
        nights: 2,
        totalAmount: 760,
        status: 'pending',
        channel: 'xiaohongshu',
        channelOrderId: 'XHS20240315001',
        createdAt: '2024-03-15 10:30:00',
        specialRequests: '希望安排安静房间',
      },
      {
        id: 'ORD20240315002',
        hotelId,
        guestName: '李女士',
        guestPhone: '139****5678',
        checkIn: '2024-03-18',
        checkOut: '2024-03-20',
        roomType: '豪华双床房',
        roomCount: 2,
        nights: 2,
        totalAmount: 2080,
        status: 'confirmed',
        channel: 'xianyu',
        channelOrderId: 'XY20240315002',
        createdAt: '2024-03-15 09:15:00',
      },
      {
        id: 'ORD20240314003',
        hotelId,
        guestName: '王先生',
        guestPhone: '137****9012',
        checkIn: '2024-03-16',
        checkOut: '2024-03-17',
        roomType: '行政套房',
        roomCount: 1,
        nights: 1,
        totalAmount: 980,
        status: 'checked_in',
        channel: 'wechat',
        channelOrderId: 'WX20240314003',
        createdAt: '2024-03-14 16:45:00',
      },
      {
        id: 'ORD20240313004',
        hotelId,
        guestName: '赵女士',
        guestPhone: '136****3456',
        checkIn: '2024-03-15',
        checkOut: '2024-03-16',
        roomType: '标准大床房',
        roomCount: 1,
        nights: 1,
        totalAmount: 380,
        status: 'checked_out',
        channel: 'ota',
        channelOrderId: 'OTA20240313004',
        createdAt: '2024-03-13 11:20:00',
      },
      {
        id: 'ORD20240312005',
        hotelId,
        guestName: '陈先生',
        guestPhone: '135****7890',
        checkIn: '2024-03-18',
        checkOut: '2024-03-19',
        roomType: '豪华双床房',
        roomCount: 1,
        nights: 1,
        totalAmount: 520,
        status: 'cancelled',
        channel: 'xiaohongshu',
        channelOrderId: 'XHS20240312005',
        createdAt: '2024-03-12 14:30:00',
      },
    ];
  }

  // 过滤订单
  const filteredOrders = orders.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!order.guestName.toLowerCase().includes(query) &&
          !order.id.toLowerCase().includes(query) &&
          !order.channelOrderId.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (channelFilter !== 'all' && order.channel !== channelFilter) return false;
    return true;
  });

  // 统计
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    today: orders.filter(o => o.checkIn === new Date().toISOString().split('T')[0]).length,
  };

  // 状态标签
  function StatusTag({ status }: { status: OrderStatus }) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  // 渠道标签
  function ChannelTag({ channel }: { channel: string }) {
    const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.direct;
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
        {config.name}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部订单', value: stats.total, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
          { label: '待确认', value: stats.pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: '已确认', value: stats.confirmed, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
          { label: '今日入住', value: stats.today, icon: Calendar, color: 'bg-violet-50 text-violet-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订单号、客人姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* 渠道筛选 */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">全部渠道</option>
            {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>

          {/* 日期范围 */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">订单信息</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">入住信息</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">房型/天数</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">金额</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">渠道</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{order.guestName}</div>
                  <div className="text-xs text-gray-500">{order.id}</div>
                  <div className="text-xs text-gray-400">{order.createdAt}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {order.checkIn} ~ {order.checkOut}
                  </div>
                  <div className="text-xs text-gray-500">{order.nights}晚</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{order.roomType}</div>
                  <div className="text-xs text-gray-500">{order.roomCount}间</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-medium text-gray-900">¥{order.totalAmount}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusTag status={order.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ChannelTag channel={order.channel} />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetail(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {!readOnly && order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onStatusUpdate?.(order.id, 'confirmed')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="确认订单"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onStatusUpdate?.(order.id, 'cancelled')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="取消订单"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">没有找到符合条件的订单</p>
          </div>
        )}
      </div>

      {/* 订单详情弹窗 */}
      <AnimatePresence>
        {showDetail && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-lg mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">订单详情</h3>
                  <p className="text-sm text-gray-500">{selectedOrder.id}</p>
                </div>
                <StatusTag status={selectedOrder.status} />
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-4">
                {/* 客人信息 */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{selectedOrder.guestName}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedOrder.guestPhone}
                    </div>
                  </div>
                </div>

                {/* 入住信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">入住日期</span>
                    <span className="font-medium text-gray-900">{selectedOrder.checkIn}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">退房日期</span>
                    <span className="font-medium text-gray-900">{selectedOrder.checkOut}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">入住天数</span>
                    <span className="font-medium text-gray-900">{selectedOrder.nights}晚</span>
                  </div>
                </div>

                {/* 房型信息 */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">{selectedOrder.roomType}</span>
                  <span className="text-gray-900">× {selectedOrder.roomCount}间</span>
                </div>

                {/* 金额 */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-600">订单总额</span>
                  <span className="text-2xl font-bold text-violet-600">¥{selectedOrder.totalAmount}</span>
                </div>

                {/* 特殊需求 */}
                {selectedOrder.specialRequests && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">特殊需求</span>
                    </div>
                    <p className="text-amber-600 text-sm mt-1">{selectedOrder.specialRequests}</p>
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowDetail(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  关闭
                </button>
                {!readOnly && selectedOrder.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        onStatusUpdate?.(selectedOrder.id, 'confirmed');
                        setShowDetail(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      确认订单
                    </button>
                    <button
                      onClick={() => {
                        onStatusUpdate?.(selectedOrder.id, 'cancelled');
                        setShowDetail(false);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      取消订单
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OrdersAdapter;
