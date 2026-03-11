/**
 * Shadow-Bees V52 - 钱货盘点
 * 库存看板、库存调拨、集团订单
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Building2,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// 模拟库存数据
const mockInventory = [
  { id: '1', name: '三里屯精品店', standard: { total: 50, sold: 45, available: 5 }, deluxe: { total: 30, sold: 28, available: 2 }, family: { total: 20, sold: 15, available: 5 }, status: 'warning' },
  { id: '2', name: '国贸商务店', standard: { total: 80, sold: 65, available: 15 }, deluxe: { total: 40, sold: 35, available: 5 }, family: { total: 0, sold: 0, available: 0 }, status: 'normal' },
  { id: '3', name: '望京科技店', standard: { total: 60, sold: 48, available: 12 }, deluxe: { total: 25, sold: 20, available: 5 }, family: { total: 15, sold: 10, available: 5 }, status: 'normal' },
  { id: '4', name: '朝阳门店', standard: { total: 40, sold: 32, available: 8 }, deluxe: { total: 20, sold: 18, available: 2 }, family: { total: 10, sold: 5, available: 5 }, status: 'normal' },
  { id: '5', name: '亚运村店', standard: { total: 35, sold: 35, available: 0 }, deluxe: { total: 15, sold: 12, available: 3 }, family: { total: 8, sold: 4, available: 4 }, status: 'critical' },
];

// 模拟调拨数据
const mockTransfers = [
  { id: '1', from: '望京店', to: '亚运村店', roomType: '标准大床房', count: 5, status: 'completed', time: '2026-02-16 14:30' },
  { id: '2', from: '国贸店', to: '三里屯店', roomType: '豪华大床房', count: 2, status: 'completed', time: '2026-02-15 10:20' },
  { id: '3', from: '三里屯店', to: '亚运村店', roomType: '标准大床房', count: 3, status: 'pending', time: '2026-02-17 09:00' },
];

// 模拟订单数据
const mockOrders = [
  { id: 'ORD20260217001', hotel: '三里屯精品店', platform: '美团', roomType: '标准大床房', price: 580, status: 'paid', time: '10分钟前' },
  { id: 'ORD20260217002', hotel: '国贸商务店', platform: '闲鱼', roomType: '豪华大床房', price: 720, status: 'paid', time: '15分钟前' },
  { id: 'ORD20260217003', hotel: '望京科技店', platform: '微信', roomType: '标准大床房', price: 450, status: 'pending', time: '20分钟前' },
  { id: 'ORD20260217004', hotel: '朝阳门店', platform: '小红书', roomType: '家庭房', price: 580, status: 'paid', time: '30分钟前' },
];

export function Inventory() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfer' | 'orders'>('inventory');
  useGroupStore();

  const getStatusColor = (status: string) => {
    if (status === 'critical') return { color: 'text-neon-red', bg: 'bg-neon-red/10', label: '紧张' };
    if (status === 'warning') return { color: 'text-neon-amber', bg: 'bg-neon-amber/10', label: '偏低' };
    return { color: 'text-neon-green', bg: 'bg-neon-green/10', label: '充足' };
  };

  const totalRooms = mockInventory.reduce((sum, h) => sum + h.standard.total + h.deluxe.total + h.family.total, 0);
  const totalSold = mockInventory.reduce((sum, h) => sum + h.standard.sold + h.deluxe.sold + h.family.sold, 0);
  const totalAvailable = totalRooms - totalSold;
  const occupancy = Math.round((totalSold / totalRooms) * 100);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">钱货盘点</h1>
          <p className="text-text-secondary text-sm mt-1">
            库存实时监控 · 跨店调拨 · 订单管理
          </p>
        </div>
      </motion.div>

      {/* Tab切换 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit"
      >
        {[
          { key: 'inventory', label: '库存看板', icon: Package },
          { key: 'transfer', label: '库存调拨', icon: ArrowRightLeft },
          { key: 'orders', label: '集团订单', icon: ShoppingCart },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab 内容区域 */}
      <AnimatePresence mode="wait">
        {activeTab === 'inventory' && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '总房量', value: totalRooms, subtext: '间', icon: Building2, color: '#A855F7' },
              { label: '已售', value: totalSold, subtext: '间', icon: TrendingUp, color: '#00E396' },
              { label: '剩余', value: totalAvailable, subtext: '间', icon: Package, color: '#FFB800' },
              { label: '入住率', value: `${occupancy}%`, subtext: '集团平均', icon: TrendingUp, color: '#00A8FF' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface rounded-xl border border-border-color p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs text-text-muted mt-1">{stat.subtext}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 库存紧张提醒 */}
          {mockInventory.some(h => h.status === 'critical' || h.status === 'warning') && (
            <div className="bg-neon-amber/5 border border-neon-amber/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-neon-amber mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">库存预警</span>
              </div>
              <p className="text-sm text-text-secondary">
                {mockInventory.filter(h => h.status === 'critical').length} 家酒店库存紧张，
                {mockInventory.filter(h => h.status === 'warning').length} 家酒店库存偏低，建议启动调拨
              </p>
            </div>
          )}

          {/* 库存详情表格 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold">各店库存详情</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="text-left text-xs font-medium text-text-secondary py-3 px-4">酒店</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">标准大床</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">豪华大床</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">家庭房</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {mockInventory.map((hotel) => {
                    const statusConfig = getStatusColor(hotel.status);
                    return (
                      <tr key={hotel.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4 font-medium">{hotel.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={hotel.standard.available < 5 ? 'text-neon-amber' : ''}>
                            {hotel.standard.available}/{hotel.standard.total}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={hotel.deluxe.available < 3 ? 'text-neon-amber' : ''}>
                            {hotel.deluxe.available}/{hotel.deluxe.total}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hotel.family.total > 0 ? (
                            <span className={hotel.family.available < 3 ? 'text-neon-amber' : ''}>
                              {hotel.family.available}/{hotel.family.total}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

        {activeTab === 'transfer' && (
          <motion.div
            key="transfer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">调拨记录</h3>
            <button onClick={() => alert('发起调拨')} className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors">
              <Plus className="w-4 h-4" />
              发起调拨
            </button>
          </div>

          {/* 调拨列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="divide-y divide-border-color">
              {mockTransfers.map((transfer) => (
                <div key={transfer.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{transfer.from}</span>
                        <ArrowRightLeft className="w-4 h-4 text-neon-purple" />
                        <span className="font-medium">{transfer.to}</span>
                      </div>
                      <span className="text-sm text-text-secondary">
                        {transfer.roomType} × {transfer.count}间
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted">{transfer.time}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        transfer.status === 'completed' 
                          ? 'bg-neon-green/10 text-neon-green' 
                          : 'bg-neon-amber/10 text-neon-amber'
                      }`}>
                        {transfer.status === 'completed' ? '已完成' : '待确认'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 智能调拨建议 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-semibold">智能调拨建议</h3>
                <p className="text-xs text-text-secondary">基于库存和预测需求</p>
              </div>
            </div>
            <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-medium">建议调拨：</span>
                从 <span className="text-neon-green">望京店</span> 调拨 <span className="font-medium">5间标准大床房</span> 至 <span className="text-neon-red">亚运村店</span>
              </p>
              <p className="text-xs text-text-secondary mt-2">
                原因：亚运村店今日售罄概率 95%，望京店剩余 12 间，预计收益提升 ¥3,500
              </p>
              <button onClick={() => alert('一键执行调拨')} className="mt-3 px-4 py-2 text-sm bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors">
                一键执行
              </button>
            </div>
          </div>
        </motion.div>
      )}

        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '今日订单', value: '156', change: '+12%', icon: ShoppingCart, color: '#A855F7' },
              { label: '成交额', value: '¥8.2万', change: '+15%', icon: TrendingUp, color: '#00E396' },
              { label: '待确认', value: '8', change: '-3', icon: Clock, color: '#FFB800' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface rounded-xl border border-border-color p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                    <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-neon-green' : 'text-neon-amber'}`}>
                      {stat.change} 较昨日
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 订单列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color flex items-center justify-between">
              <h3 className="font-semibold">最新订单</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="搜索订单..."
                    className="pl-9 pr-4 py-1.5 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none"
                  />
                </div>
              </div>
            </div>
            <div className="divide-y divide-border-color">
              {mockOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-muted">{order.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-hover text-text-secondary">
                          {order.platform}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        {order.hotel} · {order.roomType}
                      </p>
                      <p className="text-xs text-text-muted mt-1">{order.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neon-purple">¥{order.price}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.status === 'paid' 
                          ? 'bg-neon-green/10 text-neon-green' 
                          : 'bg-neon-amber/10 text-neon-amber'
                      }`}>
                        {order.status === 'paid' ? '已支付' : '待支付'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default Inventory;
