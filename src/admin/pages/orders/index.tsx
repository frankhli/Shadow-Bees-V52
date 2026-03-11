/**
 * SaaS运营后台 - 订单监控中心（统一数据源版）
 * 使用 store.orders 作为订单数据源
 */

import { useState, useMemo, useEffect } from 'react';
import { PageSkeleton } from '@/components/ux/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  TrendingDown,
  RotateCcw,
  MessageSquare,
  DollarSign,
  Search,
  Clock,
} from 'lucide-react';
import { useAdminStore, type Order, type OrderStatus, type OrderPlatform } from '../../stores/adminStore';
import { useNavigate } from 'react-router-dom';
import { PlatformLogo } from '../../components/PlatformLogo';
import type { Anomaly } from '../../utils/anomalyDetector';

// 平台配置
const platformConfig: Record<OrderPlatform, { name: string; color: string }> = {
  xianyu: { name: '闲鱼', color: 'text-yellow-400' },
  xiaohongshu: { name: '小红书', color: 'text-red-400' },
  wechat: { name: '微信', color: 'text-green-500' },
  ota: { name: 'OTA', color: 'text-blue-400' },
};

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  paid: { label: '已支付', color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
  pending: { label: '待支付', color: 'text-neon-amber', bgColor: 'bg-neon-amber/10' },
  checked_in: { label: '已入住', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/10' },
  checked_out: { label: '已退房', color: 'text-gray-400', bgColor: 'bg-gray-700/30' },
  refunded: { label: '已退款', color: 'text-neon-red', bgColor: 'bg-neon-red/10' },
  disputed: { label: '纠纷中', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
};

export default function OrderMonitorPage() {
  const navigate = useNavigate();
  const { orders, anomalies } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<OrderPlatform | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'anomalies'>('orders');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 当筛选条件改变时，重置为只显示10行
  useEffect(() => {
    setShowAllOrders(false);
  }, [statusFilter, platformFilter, searchQuery]);

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, platformFilter, searchQuery]);

  // 使用统一的 anomalies 数据源获取订单相关异常
  const orderAnomalies = useMemo(() => {
    return anomalies.filter(a => a.type === 'order');
  }, [anomalies]);

  // 过滤订单
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => statusFilter === 'all' || o.status === statusFilter)
      .filter(o => platformFilter === 'all' || o.platform === platformFilter)
      .filter(o => 
        searchQuery === '' || 
        o.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, statusFilter, platformFilter, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    const totalAmount = orders.reduce((sum, o) => o.status !== 'refunded' ? sum + o.price : sum, 0);
    const refundedAmount = orders.filter(o => o.status === 'refunded').reduce((sum, o) => sum + (o.refundAmount || o.price), 0);
    const refundRate = orders.length > 0 ? (orders.filter(o => o.status === 'refunded').length / orders.length) * 100 : 0;
    
    return {
      total: orders.length,
      totalAmount,
      refundedCount: orders.filter(o => o.status === 'refunded').length,
      refundedAmount,
      refundRate: Math.round(refundRate * 10) / 10,
      complaintCount: orders.filter(o => o.hasComplaint).length,
      pendingCount: orders.filter(o => o.status === 'pending').length,
      anomalyCount: orderAnomalies.length,
    };
  }, [orders, orderAnomalies]);

  // 平台分布（保留计算逻辑供将来使用）
  useMemo(() => {
    const stats: Record<string, { count: number; amount: number }> = {};
    orders.forEach(o => {
      if (!stats[o.platform]) stats[o.platform] = { count: 0, amount: 0 };
      stats[o.platform].count++;
      if (o.status !== 'refunded') {
        stats[o.platform].amount += o.price;
      }
    });
    return stats;
  }, [orders]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">订单监控</h1>
          <p className="text-gray-400 text-sm mt-1">
            使用统一订单数据源 · 共 {stats.total} 笔订单
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/anomalies?type=order')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg hover:border-neon-cyan transition-all text-sm"
          >
            <AlertTriangle size={16} />
            查看异常中心 ({stats.anomalyCount})
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总订单</span>
            <ShoppingCart size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">订单总额</span>
            <DollarSign size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">¥{(stats.totalAmount / 10000).toFixed(1)}万</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">退款率</span>
            <RotateCcw size={18} className="text-neon-red" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${stats.refundRate > 20 ? 'text-neon-red' : 'text-neon-amber'}`}>
            {stats.refundRate}%
          </p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">投诉订单</span>
            <MessageSquare size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.complaintCount}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待支付</span>
            <Clock size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.pendingCount}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">退款金额</span>
            <TrendingDown size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-2">¥{(stats.refundedAmount / 10000).toFixed(1)}万</p>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {[
          { id: 'orders', label: '订单列表', icon: ShoppingCart },
          { id: 'anomalies', label: '订单异常', icon: AlertTriangle, count: stats.anomalyCount },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-neon-cyan border-neon-cyan'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  tab.id === 'anomalies' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-700 text-gray-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 订单列表 Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* 筛选栏 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索订单号、客户、酒店..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
            >
              <option value="all">全部状态</option>
              <option value="paid">已支付</option>
              <option value="pending">待支付</option>
              <option value="checked_in">已入住</option>
              <option value="checked_out">已退房</option>
              <option value="refunded">已退款</option>
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as OrderPlatform | 'all')}
              className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
            >
              <option value="all">全部渠道</option>
              <option value="xianyu">闲鱼</option>
              <option value="xiaohongshu">小红书</option>
              <option value="wechat">微信</option>
              <option value="ota">OTA</option>
            </select>
          </div>

          {/* 订单列表 */}
          <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0B0F19]">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">订单信息</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">酒店</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">渠道</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">金额</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                  <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(showAllOrders ? filteredOrders : filteredOrders.slice(0, 10)).map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#1E2538] cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{order.id}</p>
                        <p className="text-xs text-gray-400">{order.guestName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm">{order.hotelName}</p>
                      <p className="text-xs text-gray-400">{order.roomType}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {order.platform !== 'ota' && <PlatformLogo platform={order.platform} size={16} />}
                        <span className="text-sm">{platformConfig[order.platform].name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium">¥{order.price}</p>
                      {order.refundAmount && (
                        <p className="text-xs text-neon-red">退 ¥{order.refundAmount}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${statusConfig[order.status].bgColor} ${statusConfig[order.status].color}`}>
                        {statusConfig[order.status].label}
                      </span>
                      {order.hasComplaint && (
                        <span className="ml-2 px-2 py-1 text-xs rounded bg-neon-red/20 text-neon-red">
                          投诉
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 10 && (
              <div className="p-4 text-center border-t border-gray-800">
                <button 
                  onClick={() => setShowAllOrders(!showAllOrders)}
                  className="text-sm text-neon-purple hover:text-neon-purple/80 transition-colors"
                >
                  {showAllOrders ? '收起 ↑' : `查看全部 ${filteredOrders.length} 笔订单 →`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 异常 Tab */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {orderAnomalies.length > 0 ? (
            orderAnomalies.map((anomaly) => (
              <AnomalyCard key={anomaly.id} anomaly={anomaly} />
            ))
          ) : (
            <div className="text-center py-12 bg-[#151B2B] rounded-xl border border-gray-800">
              <CheckCircle size={48} className="mx-auto mb-4 text-neon-green" />
              <p className="text-lg font-medium text-neon-green">暂无订单异常</p>
              <p className="text-sm text-gray-400 mt-1">当前未发现订单相关异常</p>
            </div>
          )}
        </div>
      )}

      {/* 订单详情弹窗 */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// 异常卡片组件
function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const navigate = useNavigate();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-[#151B2B] rounded-xl border transition-all hover:border-gray-600 ${
        anomaly.level === 'critical' ? 'border-neon-red/30' : 'border-neon-amber/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${
          anomaly.level === 'critical' ? 'bg-neon-red/10 text-neon-red' : 'bg-neon-amber/10 text-neon-amber'
        }`}>
          {anomaly.level === 'critical' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{anomaly.title}</span>
            <span className={`px-2 py-0.5 text-xs rounded ${
              anomaly.level === 'critical' ? 'bg-neon-red/20 text-neon-red' : 'bg-neon-amber/20 text-neon-amber'
            }`}>
              {anomaly.level === 'critical' ? '严重' : '警告'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-2">{anomaly.hotelName}</p>
          <p className="text-sm text-gray-300 mb-3">{anomaly.description}</p>
          
          {anomaly.metrics && anomaly.metrics.length > 0 && (
            <div className="flex items-center gap-4 bg-[#0B0F19] rounded-lg p-3 mb-3">
              {anomaly.metrics.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="text-gray-500">{m.label}:</span>
                  <span className="ml-1 font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-cyan-400">💡 {anomaly.suggestion}</p>
            <button
              onClick={() => navigate('/anomalies')}
              className="text-sm text-neon-cyan hover:underline"
            >
              去处理 →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 订单详情弹窗
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[#151B2B] rounded-xl border border-gray-800 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">订单详情</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">订单号</span>
            <span className="font-mono">{order.id}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">酒店</span>
            <span>{order.hotelName}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">房型</span>
            <span>{order.roomType}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">客户</span>
            <span>{order.guestName} {order.guestPhone}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">渠道</span>
            <div className="flex items-center gap-2">
              {order.platform !== 'ota' && <PlatformLogo platform={order.platform} size={16} />}
              <span>{platformConfig[order.platform].name}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">金额</span>
            <span className="text-xl font-bold">¥{order.price}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">状态</span>
            <span className={`px-2 py-1 text-xs rounded ${statusConfig[order.status].bgColor} ${statusConfig[order.status].color}`}>
              {statusConfig[order.status].label}
            </span>
          </div>
          
          {order.refundAmount && (
            <div className="p-3 bg-neon-red/10 border border-neon-red/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-neon-red">退款金额</span>
                <span className="text-neon-red font-bold">¥{order.refundAmount}</span>
              </div>
              <p className="text-sm text-neon-red mt-1">原因：{order.refundReason}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">入住日期</span>
            <span>{order.checkInDate} ~ {order.checkOutDate}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
            <span className="text-gray-400">下单时间</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
