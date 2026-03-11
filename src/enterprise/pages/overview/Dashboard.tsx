/**
 * 集团经营大盘 - 企业版首页
 * 
 * 功能：
 * - 展示集团整体数据
 * - 酒店列表（可点击进入酒店操作台）
 * - 快速操作入口
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Star,
  MapPin,
  ChevronRight,
  Activity,
  BarChart3,
  Search,
  MousePointerClick,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';

// 指标卡片
function MetricCard({ title, value, change, trend, icon: Icon, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`flex items-center gap-1 text-xs ${
        trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
      }`}>
        {trend === 'up' && <TrendingUp size={12} />}
        {trend === 'down' && <TrendingUp size={12} className="rotate-180" />}
        <span>{change}</span>
      </div>
    </motion.div>
  );
}

// 酒店卡片
function HotelCard({ hotel }: { hotel: any }) {
  return (
    <Link to={`/hotel-workbench/${hotel.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{hotel.city}</span>
              {hotel.starRating && (
                <>
                  <span className="text-gray-300">|</span>
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>{hotel.starRating}星</span>
                </>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">今日营收</div>
            <div className="font-semibold text-gray-900">
              ¥{(hotel.metrics?.todayRevenue || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">入住率</div>
            <div className="font-semibold text-gray-900">
              {((hotel.metrics?.occupancyRate || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">订单</div>
            <div className="font-semibold text-gray-900">
              {hotel.metrics?.todayOrders || 0}
            </div>
          </div>
        </div>

        {/* 快捷操作提示 */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1">
            <MousePointerClick className="w-3.5 h-3.5" />
            点击进入操作台
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export function Dashboard() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');

  // 根据选中的酒店筛选有效酒店
  const effectiveHotels = selectedHotelIds?.length > 0
    ? hotels.filter(h => selectedHotelIds.includes(h.id))
    : hotels;

  // 统计数据
  const stats = {
    totalRevenue: effectiveHotels.reduce((sum, h) => sum + (h.metrics?.revenue || h.metrics?.todayRevenue || 0), 0),
    totalOrders: effectiveHotels.reduce((sum, h) => sum + (h.metrics?.orders || h.metrics?.todayOrders || 0), 0),
    avgOccupancy: effectiveHotels.length > 0 
      ? effectiveHotels.reduce((sum, h) => sum + (h.metrics?.occupancyRate || 0), 0) / effectiveHotels.length 
      : 0,
    activeHotels: effectiveHotels.filter(h => h.status === 'active').length,
  };

  // 过滤酒店
  const filteredHotels = hotels.filter(hotel => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!hotel.name?.toLowerCase().includes(query) && 
          !hotel.city?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterRegion !== 'all' && hotel.region !== filterRegion && (hotel as any).region !== filterRegion) {
      return false;
    }
    return true;
  });

  // 提取区域列表
  const regions = [...new Set(hotels.map(h => h.region || (h as any).region).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">集团经营大盘</h1>
          <p className="text-gray-500 mt-1">管理 {hotels.length} 家酒店，点击任意酒店进入操作台</p>
        </div>
        <Link
          to="/pricing"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <BarChart3 className="w-4 h-4" />
          批量操作
        </Link>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="集团总营收"
          value={`¥${stats.totalRevenue.toLocaleString()}`}
          change="实时统计"
          trend="neutral"
          icon={DollarSign}
          color="#8B5CF6"
        />
        <MetricCard
          title="总订单数"
          value={stats.totalOrders.toString()}
          change="实时统计"
          trend="neutral"
          icon={ShoppingCart}
          color="#10B981"
        />
        <MetricCard
          title="平均入住率"
          value={`${(stats.avgOccupancy * 100).toFixed(1)}%`}
          change="实时统计"
          trend="neutral"
          icon={Activity}
          color="#F59E0B"
        />
        <MetricCard
          title="运营中酒店"
          value={`${stats.activeHotels}/${effectiveHotels.length}`}
          change={selectedHotelIds?.length > 0 ? `已选${selectedHotelIds.length}家` : '全部酒店'}
          trend="neutral"
          icon={Building2}
          color="#3B82F6"
        />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'AI客服中心', path: '/aichat/inbox', icon: Users, desc: '统一收件箱' },
          { label: '渠道分析', path: '/channel-analytics/dashboard', icon: BarChart3, desc: '渠道大盘' },
          { label: '批量调价', path: '/pricing', icon: DollarSign, desc: '多酒店统一定价' },
          { label: '风控中心', path: '/risk/compliance-center', icon: Activity, desc: '合规检测' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 酒店列表 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">酒店列表</h2>
            <div className="flex items-center gap-3">
              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索酒店..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
                />
              </div>
              {/* 区域筛选 */}
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">全部区域</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 酒店卡片网格 */}
        <div className="p-4">
          {filteredHotels.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">没有找到符合条件的酒店</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
