/**
 * SaaS运营后台 - 定价监控中心（统一数据源版）
 * 使用 store.anomalies 作为异常数据源
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Building2,
  Search,
  Filter,
  ChevronRight,
  PieChart,
  Percent,
} from 'lucide-react';
import { useAdminStore, type HotelData } from '../../stores/adminStore';
import { useNavigate } from 'react-router-dom';
import type { Anomaly } from '../../utils/anomalyDetector';
import { PageSkeleton } from '@/components/ux/Skeleton';

// 模式标签配置
const modeConfig = {
  scalper: { label: '黄牛模式', color: 'text-purple-400', bgColor: 'bg-purple-400/10', desc: '高需求溢价' },
  dynamic: { label: '动态模式', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', desc: '弹性定价' },
  clearance: { label: '尾货模式', color: 'text-amber-400', bgColor: 'bg-amber-400/10', desc: '促销清仓' },
};

function getHotelTypeLabel(type: HotelData['type']) {
  const labels: Record<HotelData['type'], string> = {
    city: '城市酒店',
    suburb: '郊区酒店',
    tourist: '景区酒店',
  };
  return labels[type];
}

export default function PricingMonitorPage() {
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
  const pricingAnomalies = useMemo(() => {
    return anomalies.filter(a => a.type === 'pricing');
  }, [anomalies]);

  // 统计数据
  const stats = useMemo(() => {
    const criticalCount = pricingAnomalies.filter(a => a.level === 'critical').length;
    const warningCount = pricingAnomalies.filter(a => a.level === 'warning').length;
    
    // 各模式分布
    const modeDistribution = hotels.reduce((acc, h) => {
      acc[h.currentMode] = (acc[h.currentMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 平均价格偏离
    const deviationAnomalies = pricingAnomalies.filter(a => a.title.includes('价格'));
    const avgDeviation = deviationAnomalies.length > 0
      ? deviationAnomalies.reduce((sum, a) => {
          // 从描述中提取偏离百分比
          const match = a.description.match(/偏离(\d+)%/);
          return sum + (match ? parseInt(match[1]) : 0);
        }, 0) / deviationAnomalies.length
      : 0;
    
    // 低于底价的酒店数
    const belowFloorHotels = new Set(pricingAnomalies.filter(a => a.title.includes('底价')).map(a => a.hotelId)).size;
    
    return {
      criticalCount,
      warningCount,
      totalAnomalies: pricingAnomalies.length,
      modeDistribution,
      avgDeviation: Math.round(avgDeviation * 10) / 10,
      belowFloorHotels,
    };
  }, [pricingAnomalies, hotels]);

  // 过滤异常
  const filteredAnomalies = useMemo(() => {
    return pricingAnomalies
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
  }, [pricingAnomalies, filterLevel, searchQuery]);

  // 酒店定价数据
  const hotelPricingData = useMemo(() => {
    return hotels.map(hotel => {
      // 计算平均偏离
      const avgDeviation = hotel.roomTypes.reduce((sum, room) => {
        return sum + Math.abs((room.currentPrice - hotel.competitorAvgPrice) / hotel.competitorAvgPrice * 100);
      }, 0) / hotel.roomTypes.length;
      
      // 检查是否有低于底价的房型
      const hasBelowFloor = hotel.roomTypes.some(r => r.currentPrice < r.floorPrice);
      
      // 获取该酒店的异常
      const hotelAnomalies = pricingAnomalies.filter(a => a.hotelId === hotel.id);
      
      return {
        hotel,
        avgDeviation: Math.round(avgDeviation * 10) / 10,
        hasBelowFloor,
        anomalies: hotelAnomalies,
        hasCritical: hotelAnomalies.some(a => a.level === 'critical'),
      };
    }).sort((a, b) => {
      if (a.hasCritical !== b.hasCritical) return a.hasCritical ? -1 : 1;
      if (a.hasBelowFloor !== b.hasBelowFloor) return a.hasBelowFloor ? -1 : 1;
      return b.avgDeviation - a.avgDeviation;
    });
  }, [hotels, pricingAnomalies]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">定价监控</h1>
          <p className="text-gray-400 text-sm mt-1">
            使用统一异常数据源 · 与异常中心保持一致
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/anomalies?type=pricing')}
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
            <span className="text-gray-400 text-sm">平均偏离</span>
            <Percent size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.avgDeviation}%</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">低于底价</span>
            <TrendingDown size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.belowFloorHotels}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">定价模式</span>
            <PieChart size={18} className="text-neon-purple" />
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            {Object.entries(stats.modeDistribution).map(([mode, count]) => (
              <span key={mode} className={`px-2 py-0.5 rounded ${modeConfig[mode as keyof typeof modeConfig].bgColor}`}>
                {modeConfig[mode as keyof typeof modeConfig].label.split('模式')[0]} {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {[
          { id: 'overview', label: '酒店定价概览', icon: Building2 },
          { id: 'anomalies', label: '定价异常', icon: AlertTriangle, count: stats.totalAnomalies },
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
          <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-medium">酒店定价监控</h3>
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
              {hotelPricingData.map(({ hotel, avgDeviation, hasBelowFloor, anomalies, hasCritical }) => (
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
                          {hasBelowFloor && (
                            <span className="px-2 py-0.5 text-xs rounded bg-neon-red/20 text-neon-red">
                              低于底价
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{hotel.city}</span>
                          <span>·</span>
                          <span className={modeConfig[hotel.currentMode].color}>
                            {modeConfig[hotel.currentMode].label}
                          </span>
                          <span>·</span>
                          <span>竞品均价 ¥{hotel.competitorAvgPrice}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* 价格偏离 */}
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">价格偏离</p>
                        <span className={`text-lg font-bold ${
                          avgDeviation > 30 ? 'text-neon-red' :
                          avgDeviation > 20 ? 'text-neon-amber' : 'text-neon-green'
                        }`}>
                          {avgDeviation}%
                        </span>
                      </div>
                      
                      {/* 房型价格 */}
                      <div className="text-right w-48">
                        <p className="text-xs text-gray-400 mb-1">价格区间</p>
                        <div className="flex items-center justify-end gap-2 text-sm">
                          {hotel.roomTypes.slice(0, 2).map(room => (
                            <span key={room.id} className={room.currentPrice < room.floorPrice ? 'text-neon-red' : ''}>
                              ¥{room.currentPrice}
                            </span>
                          ))}
                        </div>
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
                <p className="text-lg font-medium text-neon-green">暂无定价异常</p>
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
            <p className="text-sm text-gray-400">
              {hotel.city} · {getHotelTypeLabel(hotel.type)} · 
              <span className={modeConfig[hotel.currentMode].color}>
                {modeConfig[hotel.currentMode].label}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            ×
          </button>
        </div>

        {/* 竞品对比 */}
        <div className="p-4 bg-[#0B0F19] rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">市场竞品均价</span>
            <span className="text-xl font-bold">¥{hotel.competitorAvgPrice}</span>
          </div>
          <p className="text-xs text-gray-500">
            建议定价保持在竞品价格的 ±20% 范围内
          </p>
        </div>

        {/* 房型价格表 */}
        <div className="space-y-3">
          <h4 className="font-medium">房型定价详情</h4>
          {hotel.roomTypes.map(room => {
            const deviation = ((room.currentPrice - hotel.competitorAvgPrice) / hotel.competitorAvgPrice) * 100;
            const isBelowFloor = room.currentPrice < room.floorPrice;
            
            return (
              <div key={room.id} className={`p-4 rounded-lg border ${
                isBelowFloor ? 'bg-neon-red/5 border-neon-red/30' : 'bg-[#0B0F19] border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-gray-400">
                      底价 ¥{room.floorPrice} · 顶价 ¥{room.ceilingPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isBelowFloor ? 'text-neon-red' : ''}`}>
                      ¥{room.currentPrice}
                    </p>
                    <p className={`text-xs ${
                      Math.abs(deviation) > 30 ? 'text-neon-red' :
                      Math.abs(deviation) > 20 ? 'text-neon-amber' : 'text-neon-green'
                    }`}>
                      {deviation > 0 ? '+' : ''}{Math.round(deviation)}% vs 竞品
                    </p>
                  </div>
                </div>
                {isBelowFloor && (
                  <p className="text-sm text-neon-red mt-2">
                    ⚠️ 当前价格低于底价，存在亏损风险
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
