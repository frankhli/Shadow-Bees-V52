/**
 * SaaS运营后台 - 数据仓库（真实数据版）
 * 展示真实数据而非模拟数据
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Download,
  Table,
  Info,
  Activity,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { PlatformLogo } from '../../components/PlatformLogo';
import { PageSkeleton } from '@/components/ux/Skeleton';


// 平台名称中文映射
const platformNames: Record<string, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
  ota: 'OTA',
};

// 数据表定义
const tableSchemas = [
  {
    name: 'orders',
    label: '订单数据',
    description: '所有订单的完整记录，包含状态、金额、渠道等信息',
    recordCount: (store: any) => store.orders?.length || 0,
  },
  {
    name: 'content',
    label: '内容数据',
    description: '发布内容的完整数据，包含曝光、点击、转化等指标',
    recordCount: (store: any) => store.contentItems?.length || 0,
  },
  {
    name: 'hotels',
    label: '酒店数据',
    description: '酒店基础信息、库存、定价等数据',
    recordCount: (store: any) => store.hotels?.length || 0,
  },
  {
    name: 'anomalies',
    label: '异常数据',
    description: '所有检测到的异常记录',
    recordCount: (store: any) => store.anomalies?.length || 0,
  },
];

export default function DataWarehousePage() {
  const store = useAdminStore();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const selectedTableInfo = tableSchemas.find(t => t.name === selectedTable);
  
  // 获取实时数据（今日）
  const todayRealtime = store.realtimeMetrics?.today || { gmv: 0, orders: 0 };
  const hasRealtimeData = todayRealtime.orders > 0;

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据仓库</h1>
          <p className="text-gray-400 text-sm mt-1">
            查看和导出真实业务数据
          </p>
        </div>
        
        {/* 实时数据指示器 */}
        {hasRealtimeData && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
            <span className="text-xs text-neon-green">实时数据接入中</span>
          </div>
        )}
      </div>
      
      {/* 实时数据统计卡片 */}
      {hasRealtimeData && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Activity size={14} />
              今日实时GMV
            </div>
            <p className="text-xl font-bold text-neon-green">¥{todayRealtime.gmv.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Activity size={14} />
              今日实时订单
            </div>
            <p className="text-xl font-bold text-neon-green">{todayRealtime.orders}</p>
          </div>
          <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Activity size={14} />
              本周实时GMV
            </div>
            <p className="text-xl font-bold text-neon-cyan">¥{(store.realtimeMetrics?.thisWeek?.gmv || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Activity size={14} />
              本周实时订单
            </div>
            <p className="text-xl font-bold text-neon-cyan">{store.realtimeMetrics?.thisWeek?.orders || 0}</p>
          </div>
        </div>
      )}

      {/* 数据表列表 */}
      <div className="grid grid-cols-4 gap-4">
        {tableSchemas.map((table) => (
          <motion.button
            key={table.name}
            onClick={() => setSelectedTable(table.name)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedTable === table.name
                ? 'bg-neon-cyan/10 border-neon-cyan'
                : 'bg-[#151B2B] border-gray-800 hover:border-gray-700'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Database size={24} className={selectedTable === table.name ? 'text-neon-cyan' : 'text-gray-400'} />
              <span className="text-2xl font-bold">{table.recordCount(store)}</span>
            </div>
            <p className={`font-medium ${selectedTable === table.name ? 'text-neon-cyan' : ''}`}>
              {table.label}
            </p>
            <p className="text-xs text-gray-400 mt-1">{table.description}</p>
          </motion.button>
        ))}
      </div>

      {/* 数据预览 */}
      {selectedTable && (
        <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
          {/* 表头 */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Table size={20} className="text-neon-cyan" />
              <div>
                <h3 className="font-medium">{selectedTableInfo?.label}</h3>
                <p className="text-xs text-gray-400">{selectedTableInfo?.recordCount(store)} 条记录</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportData(selectedTable, store)}
                className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 transition-all text-sm"
              >
                <Download size={16} />
                导出 JSON
              </button>
            </div>
          </div>

          {/* 数据内容 */}
          <div className="p-4">
            {selectedTable === 'orders' && <OrdersPreview store={store} searchQuery={searchQuery} />}
            {selectedTable === 'content' && <ContentPreview store={store} searchQuery={searchQuery} />}
            {selectedTable === 'hotels' && <HotelsPreview store={store} searchQuery={searchQuery} />}
            {selectedTable === 'anomalies' && <AnomaliesPreview store={store} searchQuery={searchQuery} />}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-neon-cyan mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">关于数据仓库</h4>
            <p className="text-sm text-gray-400">
              数据仓库展示了系统中的真实业务数据。您可以选择不同的数据表查看详情，并导出为 JSON 格式。
              所有数据均来自 store 中的实时状态。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 订单数据预览（带筛选）
function OrdersPreview({ store, searchQuery }: { store: any; searchQuery: string }) {
  const orders = store.orders || [];
  const [showAll, setShowAll] = useState(false);
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // 获取所有酒店列表（去重）
  const hotels: string[] = Array.from(new Set(orders.map((o: any) => o.hotelName)));
  
  const filtered = orders.filter((o: any) => {
    const matchesSearch = searchQuery === '' || 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHotel = hotelFilter === 'all' || o.hotelName === hotelFilter;
    const matchesPlatform = platformFilter === 'all' || o.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesHotel && matchesPlatform && matchesStatus;
  });
  
  const displayOrders = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div>
      {/* 筛选栏 */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3">
        <select
          value={hotelFilter}
          onChange={(e) => setHotelFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部酒店</option>
          {hotels.map((h: string) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部渠道</option>
          <option value="xianyu">闲鱼</option>
          <option value="xiaohongshu">小红书</option>
          <option value="wechat">微信</option>
          <option value="ota">OTA</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="paid">已成交</option>
          <option value="pending">待确认</option>
          <option value="checked_in">已入住</option>
          <option value="refunded">已退款</option>
        </select>
        {(hotelFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setHotelFilter('all'); setPlatformFilter('all'); setStatusFilter('all'); }}
            className="px-3 py-1.5 text-sm text-neon-cyan hover:text-neon-cyan/80"
          >
            清除筛选
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          共 {filtered.length} 条记录
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">订单号</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">酒店</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">渠道</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">客人</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">金额</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {displayOrders.map((order: any) => (
              <tr key={order.id} className="hover:bg-[#1E2538]">
                <td className="py-2 px-3 text-sm font-mono">{order.id}</td>
                <td className="py-2 px-3 text-sm">{order.hotelName}</td>
                <td className="py-2 px-3 text-sm">
                  {order.platform !== 'ota' && <PlatformLogo platform={order.platform} size={16} />}
                  <span className="ml-1">{platformNames[order.platform] || order.platform}</span>
                </td>
                <td className="py-2 px-3 text-sm">
                  <div>{order.guestName || '-'}</div>
                  <div className="text-xs text-gray-500">{order.guestPhone || '-'}</div>
                </td>
                <td className="py-2 px-3 text-sm">¥{order.price}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    order.status === 'paid' ? 'bg-neon-green/20 text-neon-green' :
                    order.status === 'refunded' ? 'bg-neon-red/20 text-neon-red' :
                    'bg-neon-amber/20 text-neon-amber'
                  }`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有符合条件的订单
          </div>
        )}
        {filtered.length > 10 && (
          <div className="text-center py-3">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {showAll ? '收起' : `查看全部 ${filtered.length} 条记录`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 内容数据预览（带筛选）
function ContentPreview({ store, searchQuery }: { store: any; searchQuery: string }) {
  const contents = store.contentItems || [];
  const [showAll, setShowAll] = useState(false);
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('all');
  
  // 获取所有酒店列表（去重）
  const hotels: string[] = Array.from(new Set(contents.map((c: any) => c.hotelName)));
  
  const filtered = contents.filter((c: any) => {
    const matchesSearch = searchQuery === '' || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHotel = hotelFilter === 'all' || c.hotelName === hotelFilter;
    const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
    const matchesSubtype = subtypeFilter === 'all' || c.subtype === subtypeFilter;
    return matchesSearch && matchesHotel && matchesPlatform && matchesSubtype;
  });
  
  const displayContents = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div>
      {/* 筛选栏 */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3">
        <select
          value={hotelFilter}
          onChange={(e) => setHotelFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部酒店</option>
          {hotels.map((h: string) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setSubtypeFilter('all'); }}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部平台</option>
          <option value="xianyu">闲鱼</option>
          <option value="xiaohongshu">小红书</option>
          <option value="wechat">微信</option>
        </select>
        {platformFilter === 'wechat' && (
          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部子类型</option>
            <option value="moments">朋友圈</option>
            <option value="group">微信群</option>
            <option value="private">私聊</option>
            <option value="channels">视频号</option>
          </select>
        )}
        {(hotelFilter !== 'all' || platformFilter !== 'all' || subtypeFilter !== 'all') && (
          <button
            onClick={() => { setHotelFilter('all'); setPlatformFilter('all'); setSubtypeFilter('all'); }}
            className="px-3 py-1.5 text-sm text-neon-cyan hover:text-neon-cyan/80"
          >
            清除筛选
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          共 {filtered.length} 条记录
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">标题</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">酒店</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">平台/类型</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">曝光</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">点击</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">咨询</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">成交</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {displayContents.map((content: any) => (
              <tr key={content.id} className="hover:bg-[#1E2538]">
                <td className="py-2 px-3 text-sm truncate max-w-xs">{content.title}</td>
                <td className="py-2 px-3 text-sm">{content.hotelName}</td>
                <td className="py-2 px-3 text-sm">
                  <div className="flex items-center gap-1">
                    <PlatformLogo platform={content.platform} size={16} />
                    <span>{platformNames[content.platform] || content.platform}</span>
                    {content.subtype && (
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded ${
                        content.subtype === 'moments' ? 'bg-green-500/20 text-green-400' :
                        content.subtype === 'group' ? 'bg-blue-500/20 text-blue-400' :
                        content.subtype === 'private' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {content.subtype === 'moments' ? '朋友圈' :
                         content.subtype === 'group' ? '微信群' :
                         content.subtype === 'private' ? '私聊' : '视频号'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-sm">{(content.stats?.impressions || 0).toLocaleString()}</td>
                <td className="py-2 px-3 text-sm">{(content.stats?.clicks || 0).toLocaleString()}</td>
                <td className="py-2 px-3 text-sm">{(content.stats?.inquiries || 0).toLocaleString()}</td>
                <td className="py-2 px-3 text-sm">{content.stats?.conversions || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有符合条件的内容
          </div>
        )}
        {filtered.length > 10 && (
          <div className="text-center py-3">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {showAll ? '收起' : `查看全部 ${filtered.length} 条记录`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 酒店数据预览（带筛选）
function HotelsPreview({ store, searchQuery }: { store: any; searchQuery: string }) {
  const hotels = store.hotels || [];
  const [showAll, setShowAll] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // 获取城市和类型列表（去重）
  const cities = (Array.from(new Set(hotels.map((h: any) => h.city))) as string[]).filter(Boolean);
  const types = (Array.from(new Set(hotels.map((h: any) => h.type))) as string[]).filter(Boolean);
  
  const filtered = hotels.filter((h: any) => {
    const matchesSearch = searchQuery === '' || 
      h.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter === 'all' || h.city === cityFilter;
    const matchesType = typeFilter === 'all' || h.type === typeFilter;
    return matchesSearch && matchesCity && matchesType;
  });
  
  const displayHotels = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div>
      {/* 筛选栏 */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部城市</option>
          {cities.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部类型</option>
          {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(cityFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => { setCityFilter('all'); setTypeFilter('all'); }}
            className="px-3 py-1.5 text-sm text-neon-cyan hover:text-neon-cyan/80"
          >
            清除筛选
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          共 {filtered.length} 条记录
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">酒店名称</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">城市</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">类型</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">今日订单</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">今日收入</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {displayHotels.map((hotel: any) => {
              // 基础数据
              const baseOrders = hotel.todayOrders || 0;
              const baseRevenue = hotel.todayRevenue || 0;
              // 检查是否有实时数据（按酒店ID或全局）
              const hasHotelRealtimeData = store.realtimeMetrics?.today?.orders > 0 || store.realtimeMetrics?.today?.gmv > 0;
              
              return (
                <tr key={hotel.id} className="hover:bg-[#1E2538]">
                  <td className="py-2 px-3 text-sm">{hotel.name}</td>
                  <td className="py-2 px-3 text-sm">{hotel.city}</td>
                  <td className="py-2 px-3 text-sm">{hotel.type}</td>
                  <td className="py-2 px-3 text-sm">
                    {baseOrders}
                    {hasHotelRealtimeData && <span className="text-xs text-neon-green ml-1">+实时</span>}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    ¥{baseRevenue.toLocaleString()}
                    {hasHotelRealtimeData && <span className="text-xs text-neon-green ml-1">+实时</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有符合条件的酒店
          </div>
        )}
        {filtered.length > 10 && (
          <div className="text-center py-3">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {showAll ? '收起' : `查看全部 ${filtered.length} 条记录`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 异常数据预览（带筛选）
function AnomaliesPreview({ store, searchQuery }: { store: any; searchQuery: string }) {
  const anomalies = store.anomalies || [];
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  
  // 获取筛选选项（去重）
  const types: string[] = Array.from(new Set(anomalies.map((a: any) => a.type)));
  const hotels: string[] = Array.from(new Set(anomalies.map((a: any) => a.hotelName)));
  
  const filtered = anomalies.filter((a: any) => {
    const matchesSearch = searchQuery === '' || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    const matchesLevel = levelFilter === 'all' || a.level === levelFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesHotel = hotelFilter === 'all' || a.hotelName === hotelFilter;
    return matchesSearch && matchesType && matchesLevel && matchesStatus && matchesHotel;
  });
  
  const displayAnomalies = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div>
      {/* 筛选栏 */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部类型</option>
          {types.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={hotelFilter}
          onChange={(e) => setHotelFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部酒店</option>
          {hotels.map((h: string) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">信息</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm text-gray-300 focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="resolved">已解决</option>
          <option value="ignored">已忽略</option>
        </select>
        {(typeFilter !== 'all' || levelFilter !== 'all' || statusFilter !== 'all' || hotelFilter !== 'all') && (
          <button
            onClick={() => { setTypeFilter('all'); setLevelFilter('all'); setStatusFilter('all'); setHotelFilter('all'); }}
            className="px-3 py-1.5 text-sm text-neon-cyan hover:text-neon-cyan/80"
          >
            清除筛选
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          共 {filtered.length} 条记录
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">类型</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">酒店</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">标题</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">级别</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {displayAnomalies.map((anomaly: any) => (
              <tr key={anomaly.id} className="hover:bg-[#1E2538]">
                <td className="py-2 px-3 text-sm">{anomaly.type}</td>
                <td className="py-2 px-3 text-sm">{anomaly.hotelName}</td>
                <td className="py-2 px-3 text-sm truncate max-w-xs">{anomaly.title}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    anomaly.level === 'critical' ? 'bg-neon-red/20 text-neon-red' : 'bg-neon-amber/20 text-neon-amber'
                  }`}>
                    {anomaly.level}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    anomaly.status === 'pending' ? 'bg-neon-amber/20 text-neon-amber' :
                    anomaly.status === 'resolved' ? 'bg-neon-green/20 text-neon-green' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {anomaly.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有符合条件的异常
          </div>
        )}
        {filtered.length > 10 && (
          <div className="text-center py-3">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {showAll ? '收起' : `查看全部 ${filtered.length} 条记录`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 导出数据函数
function exportData(tableName: string, store: any) {
  let data: any[] = [];
  let filename = '';

  switch (tableName) {
    case 'orders':
      data = store.orders || [];
      filename = 'orders';
      break;
    case 'content':
      data = store.contentItems || [];
      filename = 'contents';
      break;
    case 'hotels':
      data = store.hotels || [];
      filename = 'hotels';
      break;
    case 'anomalies':
      data = store.anomalies || [];
      filename = 'anomalies';
      break;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
