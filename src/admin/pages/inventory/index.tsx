/**
 * SaaS运营后台 - 库存监控中心（统一数据源版）
 * 使用 store.anomalies 作为异常数据源
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Building2,
  TrendingUp,
  Search,
  Filter,
  PieChart,
  ChevronRight,
} from 'lucide-react';
import { useAdminStore, type HotelData, type Platform } from '../../stores/adminStore';
import { useNavigate } from 'react-router-dom';
import { PlatformLogo } from '../../components/PlatformLogo';
import type { Anomaly } from '../../utils/anomalyDetector';
import { PageSkeleton } from '@/components/ux/Skeleton';

// 平台配置
const platformConfig: Record<Platform, { name: string; color: string }> = {
  xianyu: { name: '闲鱼', color: 'text-yellow-400' },
  xiaohongshu: { name: '小红书', color: 'text-red-400' },
  wechat: { name: '微信', color: 'text-green-500' },
};

export default function InventoryMonitorPage() {
  const navigate = useNavigate();
  const { hotels, anomalies } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'warning'>('all');
  const [selectedHotel, setSelectedHotel] = useState<HotelData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [filterLevel, searchQuery, activeTab]);

  // 使用统一的 anomalies 数据源（与异常中心一致）
  const inventoryAnomalies = useMemo(() => {
    return anomalies.filter(a => a.type === 'inventory');
  }, [anomalies]);

  // 统计数据
  const stats = useMemo(() => {
    const criticalCount = inventoryAnomalies.filter(a => a.level === 'critical').length;
    const warningCount = inventoryAnomalies.filter(a => a.level === 'warning').length;
    
    // 计算平均售罄率
    const avgSellThrough = hotels.reduce((sum, h) => {
      const total = h.inventory.ota.total + h.inventory.flexible.total;
      const sold = h.inventory.ota.sold + h.inventory.flexible.sold;
      return sum + (total > 0 ? (sold / total) * 100 : 0);
    }, 0) / hotels.length;
    
    // 计算各渠道占比
    const totalInventory = hotels.reduce((sum, h) => 
      sum + h.inventory.ota.total + h.inventory.flexible.total, 0
    );
    const otaRatio = hotels.reduce((sum, h) => sum + h.inventory.ota.total, 0) / totalInventory * 100;
    const flexibleRatio = 100 - otaRatio;
    
    // 灵活池售罄率
    const flexibleSellThrough = hotels.reduce((sum, h) => {
      const flexibleTotal = h.roomTypes.reduce((s, r) => s + r.flexibleAllocation, 0);
      const flexibleSold = h.inventory.flexible.sold;
      return sum + (flexibleTotal > 0 ? (flexibleSold / flexibleTotal) * 100 : 0);
    }, 0) / hotels.length;
    
    return {
      criticalCount,
      warningCount,
      totalAnomalies: inventoryAnomalies.length,
      avgSellThrough: Math.round(avgSellThrough * 10) / 10,
      otaRatio: Math.round(otaRatio),
      flexibleRatio: Math.round(flexibleRatio),
      flexibleSellThrough: Math.round(flexibleSellThrough * 10) / 10,
    };
  }, [inventoryAnomalies, hotels]);

  // 过滤异常
  const filteredAnomalies = useMemo(() => {
    return inventoryAnomalies
      .filter(a => filterLevel === 'all' || a.level === filterLevel)
      .filter(a => 
        searchQuery === '' || 
        a.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (a.level !== b.level) return a.level === 'critical' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [inventoryAnomalies, filterLevel, searchQuery]);

  // 酒店列表数据
  const hotelInventoryData = useMemo(() => {
    return hotels.map(hotel => {
      const { inventory, roomTypes } = hotel;
      const { ota, flexible } = inventory;
      
      const otaSellThrough = ota.total > 0 ? (ota.sold / ota.total) * 100 : 0;
      const flexibleTotal = roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
      const flexibleSellThrough = flexibleTotal > 0 ? (flexible.sold / flexibleTotal) * 100 : 0;
      const overallSellThrough = (ota.sold + flexible.sold) / (ota.total + flexibleTotal) * 100;
      
      // 获取该酒店的异常
      const hotelAnomalies = inventoryAnomalies.filter(a => a.hotelId === hotel.id);
      
      return {
        hotel,
        otaSellThrough: Math.round(otaSellThrough * 10) / 10,
        flexibleSellThrough: Math.round(flexibleSellThrough * 10) / 10,
        overallSellThrough: Math.round(overallSellThrough * 10) / 10,
        anomalies: hotelAnomalies,
        hasCritical: hotelAnomalies.some(a => a.level === 'critical'),
      };
    }).sort((a, b) => {
      // 有异常的排前面，严重的排最前面
      if (a.hasCritical !== b.hasCritical) return a.hasCritical ? -1 : 1;
      if (a.anomalies.length !== b.anomalies.length) return b.anomalies.length - a.anomalies.length;
      return a.overallSellThrough - b.overallSellThrough;
    });
  }, [hotels, inventoryAnomalies]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">库存监控</h1>
          <p className="text-gray-400 text-sm mt-1">
            使用统一异常数据源 · 与异常中心保持一致
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/anomalies?type=inventory')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg hover:border-neon-cyan transition-all text-sm"
          >
            <AlertTriangle size={16} />
            查看异常中心 ({stats.totalAnomalies})
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">严重异常</span>
            <AlertOctagon size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.criticalCount}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">警告</span>
            <AlertTriangle size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.warningCount}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">平均售罄率</span>
            <TrendingUp size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.avgSellThrough}%</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">灵活池售罄</span>
            <Package size={18} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.flexibleSellThrough}%</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">渠道占比</span>
            <PieChart size={18} className="text-neon-green" />
          </div>
          <p className="text-sm mt-2">
            <span className="text-neon-cyan">OTA {stats.otaRatio}%</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-neon-purple">灵活 {stats.flexibleRatio}%</span>
          </p>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {[
          { id: 'overview', label: '酒店库存概览', icon: Building2 },
          { id: 'anomalies', label: '库存异常', icon: AlertTriangle, count: stats.totalAnomalies },
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

      {/* 概览 Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 酒店列表 */}
          <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-medium">酒店库存监控</h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-red" />
                  有严重异常
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-amber" />
                  有警告
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-800">
              {hotelInventoryData.map(({ hotel, otaSellThrough, flexibleSellThrough, overallSellThrough, anomalies, hasCritical }) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-[#1E2538] transition-colors cursor-pointer"
                  onClick={() => setSelectedHotel(hotel)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        hasCritical ? 'bg-neon-red/20 text-neon-red' :
                        anomalies.length > 0 ? 'bg-neon-amber/20 text-neon-amber' :
                        'bg-neon-green/20 text-neon-green'
                      }`}>
                        {hasCritical ? <AlertOctagon size={20} /> :
                         anomalies.length > 0 ? <AlertTriangle size={20} /> :
                         <CheckCircle size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{hotel.name}</span>
                          {anomalies.length > 0 && (
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              hasCritical ? 'bg-neon-red/20 text-neon-red' : 'bg-neon-amber/20 text-neon-amber'
                            }`}>
                              {anomalies.length} 个异常
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {hotel.city} · {hotel.roomTypes.length} 种房型
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      {/* OTA 售罄率 */}
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">OTA 售罄率</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                otaSellThrough < 40 ? 'bg-neon-red' :
                                otaSellThrough < 70 ? 'bg-neon-amber' : 'bg-neon-green'
                              }`}
                              style={{ width: `${Math.min(otaSellThrough, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            otaSellThrough < 40 ? 'text-neon-red' :
                            otaSellThrough < 70 ? 'text-neon-amber' : 'text-neon-green'
                          }`}>
                            {otaSellThrough}%
                          </span>
                        </div>
                      </div>
                      
                      {/* 灵活池售罄率 */}
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">灵活池售罄率</p>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                flexibleSellThrough < 30 ? 'bg-neon-red' :
                                flexibleSellThrough < 60 ? 'bg-neon-amber' : 'bg-neon-green'
                              }`}
                              style={{ width: `${Math.min(flexibleSellThrough, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            flexibleSellThrough < 30 ? 'text-neon-red' :
                            flexibleSellThrough < 60 ? 'text-neon-amber' : 'text-neon-green'
                          }`}>
                            {flexibleSellThrough}%
                          </span>
                        </div>
                      </div>
                      
                      {/* 整体售罄率 */}
                      <div className="text-center w-20">
                        <p className="text-xs text-gray-400 mb-1">整体</p>
                        <span className="text-lg font-bold">{overallSellThrough}%</span>
                      </div>
                      
                      <ChevronRight size={18} className="text-gray-500" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 异常 Tab */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {/* 筛选栏 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索酒店或异常..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as typeof filterLevel)}
                className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
              >
                <option value="all">全部级别</option>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
              </select>
            </div>
          </div>

          {/* 异常列表 */}
          <div className="space-y-3">
            {filteredAnomalies.length > 0 ? (
              filteredAnomalies.map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))
            ) : (
              <div className="text-center py-12 bg-[#151B2B] rounded-xl border border-gray-800">
                <CheckCircle size={48} className="mx-auto mb-4 text-neon-green" />
                <p className="text-lg font-medium text-neon-green">暂无库存异常</p>
                <p className="text-sm text-gray-400 mt-1">当前筛选条件下未发现异常</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 酒店详情弹窗 */}
      <AnimatePresence>
        {selectedHotel && (
          <HotelDetailModal hotel={selectedHotel} onClose={() => setSelectedHotel(null)} />
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

// 酒店详情弹窗
function HotelDetailModal({ hotel, onClose }: { hotel: HotelData; onClose: () => void }) {
  const { inventory, roomTypes } = hotel;
  const { ota, flexible } = inventory;
  
  const otaSellThrough = ota.total > 0 ? (ota.sold / ota.total) * 100 : 0;
  const flexibleTotal = roomTypes.reduce((sum, r) => sum + r.flexibleAllocation, 0);
  const flexibleSellThrough = flexibleTotal > 0 ? (flexible.sold / flexibleTotal) * 100 : 0;

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
        className="bg-[#151B2B] rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">{hotel.name}</h3>
            <p className="text-sm text-gray-400">{hotel.city} · {hotel.type === 'city' ? '城市' : hotel.type === 'suburb' ? '郊区' : '景区'}酒店</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            ×
          </button>
        </div>

        {/* 库存概览 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-2">OTA 渠道</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{ota.sold}</span>
              <span className="text-gray-500">/ {ota.total} 间</span>
            </div>
            <p className={`text-sm mt-1 ${otaSellThrough < 40 ? 'text-neon-red' : 'text-neon-green'}`}>
              售罄率 {Math.round(otaSellThrough)}%
            </p>
          </div>
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-400 mb-2">灵活池</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{flexible.sold}</span>
              <span className="text-gray-500">/ {flexibleTotal} 间</span>
            </div>
            <p className={`text-sm mt-1 ${flexibleSellThrough < 50 ? 'text-neon-amber' : 'text-neon-green'}`}>
              售罄率 {Math.round(flexibleSellThrough)}%
            </p>
          </div>
        </div>

        {/* 各平台分配 */}
        <div className="space-y-3">
          <h4 className="font-medium">平台分配详情</h4>
          {Object.entries(flexible.platforms).map(([platform, data]) => {
            const platformSellThrough = data.allocated > 0 ? (data.sold / data.allocated) * 100 : 0;
            return (
              <div key={platform} className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={platform as Platform} size={20} />
                  <span className="text-sm">{platformConfig[platform as Platform].name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">分配: {data.allocated}间</span>
                  <span className="text-gray-400">售出: {data.sold}间</span>
                  <span className={`font-medium ${platformSellThrough < 50 ? 'text-neon-amber' : 'text-neon-green'}`}>
                    {Math.round(platformSellThrough)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
