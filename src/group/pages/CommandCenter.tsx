/**
 * Shadow-Bees V52 - 集团数据大屏 (Command Center)
 * 数据驾驶舱模式 - 地图展示、实时监控、全局态势
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Building2,
  TrendingUp,
  Activity,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { useGroupStore, type HotelInGroup } from '../stores/groupStore';
import { Link } from 'react-router-dom';

// ============================================
// 模拟地图组件 - 酒店位置分布
// ============================================

interface MapHotel {
  id: string;
  name: string;
  x: number; // 0-100 百分比
  y: number;
  region: string;
  status: 'healthy' | 'warning' | 'critical';
  gmv: number;
  occupancy: number;
}

const mockMapHotels: MapHotel[] = [
  { id: 'hotel_001', name: '三里屯精品店', x: 52, y: 35, region: '华北区', status: 'healthy', gmv: 523000, occupancy: 88 },
  { id: 'hotel_002', name: '国贸商务店', x: 55, y: 40, region: '华北区', status: 'healthy', gmv: 481000, occupancy: 85 },
  { id: 'hotel_003', name: '望京科技店', x: 58, y: 28, region: '华北区', status: 'warning', gmv: 456000, occupancy: 82 },
  { id: 'hotel_004', name: '朝阳门店', x: 54, y: 36, region: '华北区', status: 'healthy', gmv: 382000, occupancy: 78 },
  { id: 'hotel_005', name: '亚运村店', x: 56, y: 25, region: '华北区', status: 'healthy', gmv: 298000, occupancy: 75 },
  { id: 'hotel_006', name: '静安店', x: 72, y: 55, region: '华东区', status: 'healthy', gmv: 445000, occupancy: 86 },
  { id: 'hotel_007', name: '浦东店', x: 75, y: 58, region: '华东区', status: 'warning', gmv: 398000, occupancy: 79 },
  { id: 'hotel_008', name: '深圳湾店', x: 62, y: 78, region: '华南区', status: 'healthy', gmv: 356000, occupancy: 84 },
  { id: 'hotel_009', name: '天河店', x: 60, y: 76, region: '华南区', status: 'critical', gmv: 289000, occupancy: 68 },
  { id: 'hotel_010', name: '成都春熙店', x: 35, y: 52, region: '华西区', status: 'healthy', gmv: 312000, occupancy: 81 },
  { id: 'hotel_011', name: '西安钟楼店', x: 40, y: 42, region: '华西区', status: 'healthy', gmv: 278000, occupancy: 77 },
  { id: 'hotel_012', name: '杭州西湖店', x: 70, y: 58, region: '华东区', status: 'healthy', gmv: 423000, occupancy: 88 },
  { id: 'hotel_013', name: '南京新街口店', x: 68, y: 54, region: '华东区', status: 'warning', gmv: 367000, occupancy: 76 },
  { id: 'hotel_014', name: '广州珠江新城店', x: 61, y: 77, region: '华南区', status: 'healthy', gmv: 389000, occupancy: 82 },
  { id: 'hotel_015', name: '重庆解放碑店', x: 38, y: 58, region: '华西区', status: 'healthy', gmv: 298000, occupancy: 79 },
];

// ============================================
// 实时数据卡片
// ============================================

interface RealtimeCardProps {
  title: string;
  value: string | number;
  change?: number;
  unit?: string;
  icon: any;
  color: string;
  isLoading?: boolean;
}

function RealtimeCard({ title, value, change, unit, icon: Icon, color, isLoading }: RealtimeCardProps) {
  const trendColor = change && change > 0 ? '#00E396' : change && change < 0 ? '#FF4757' : '#6B7280';
  const TrendIcon = change && change > 0 ? ArrowUpRight : change && change < 0 ? ArrowDownRight : Minus;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative p-5 rounded-xl border overflow-hidden"
      style={{
        borderColor: `${color}30`,
        background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={String(value)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-3xl font-bold"
                style={{ color }}
              >
                {value}
              </motion.span>
            </AnimatePresence>
            {unit && <span className="text-text-muted text-sm">{unit}</span>}
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
              <span className="text-sm" style={{ color: trendColor }}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-text-muted">较昨日</span>
            </div>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      
      {/* 脉冲动画 */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ border: `2px solid ${color}` }}
          animate={{ opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ============================================
// 酒店状态卡片
// ============================================

function HotelStatusCard({ hotel, onClick }: { hotel: HotelInGroup; onClick?: () => void }) {
  const statusConfig = {
    healthy: { color: '#00E396', bg: 'bg-neon-green/10', label: '健康' },
    warning: { color: '#FFB800', bg: 'bg-neon-amber/10', label: '预警' },
    critical: { color: '#FF4757', bg: 'bg-neon-red/10', label: '异常' },
  }[hotel.healthLevel];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 rounded-xl border border-border-color bg-surface cursor-pointer hover:border-neon-purple/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{hotel.name}</h4>
          <p className="text-xs text-text-secondary mt-0.5">{hotel.region} · {hotel.manager}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bg}`} style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-surface-hover">
          <p className="text-xs text-text-muted">GMV</p>
          <p className="text-sm font-semibold text-neon-purple">¥{(hotel.gmv / 10000).toFixed(1)}万</p>
        </div>
        <div className="p-2 rounded-lg bg-surface-hover">
          <p className="text-xs text-text-muted">入住率</p>
          <p className="text-sm font-semibold text-neon-cyan">{hotel.occupancy}%</p>
        </div>
        <div className="p-2 rounded-lg bg-surface-hover">
          <p className="text-xs text-text-muted">RevPAR</p>
          <p className="text-sm font-semibold text-neon-amber">¥{hotel.revpar}</p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary">内容 {hotel.contentCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary">服务 {hotel.serviceScore}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary">AI {hotel.aiResolutionRate}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 地图可视化组件
// ============================================

function HotelMap({ hotels, selectedRegion, onSelectHotel }: { 
  hotels: MapHotel[]; 
  selectedRegion: string;
  onSelectHotel: (hotel: MapHotel) => void;
}) {
  const filteredHotels = selectedRegion === 'all' 
    ? hotels 
    : hotels.filter(h => h.region === selectedRegion);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-border-color bg-surface">
      {/* 模拟地图背景 */}
      <div className="absolute inset-0 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* 网格线 */}
          {Array.from({ length: 11 }).map((_, i) => (
            <g key={i}>
              <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="currentColor" strokeWidth="0.2" className="text-neon-purple" />
              <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="currentColor" strokeWidth="0.2" className="text-neon-purple" />
            </g>
          ))}
          {/* 区域标注 */}
          <text x="55" y="30" fill="currentColor" className="text-xs text-neon-purple/50">华北区</text>
          <text x="72" y="50" fill="currentColor" className="text-xs text-neon-cyan/50">华东区</text>
          <text x="62" y="75" fill="currentColor" className="text-xs text-neon-amber/50">华南区</text>
          <text x="35" y="50" fill="currentColor" className="text-xs text-neon-green/50">华西区</text>
        </svg>
      </div>

      {/* 酒店点位 */}
      <AnimatePresence>
        {filteredHotels.map((hotel) => {
          const color = hotel.status === 'healthy' ? '#00E396' : hotel.status === 'warning' ? '#FFB800' : '#FF4757';
          return (
            <motion.button
              key={hotel.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.2 }}
              onClick={() => onSelectHotel(hotel)}
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-bg-primary cursor-pointer"
              style={{ 
                left: `${hotel.x}%`, 
                top: `${hotel.y}%`,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
              }}
            >
              {/* 脉冲效果 */}
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color }}
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-surface/90 backdrop-blur border border-border-color">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-green" />
            <span className="text-text-secondary">健康</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-amber" />
            <span className="text-text-secondary">预警</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-red" />
            <span className="text-text-secondary">异常</span>
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="absolute top-4 right-4 p-3 rounded-lg bg-surface/90 backdrop-blur border border-border-color">
        <p className="text-2xl font-bold text-white">{filteredHotels.length}</p>
        <p className="text-xs text-text-secondary">在营门店</p>
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function CommandCenter() {
  const { 
    hotels, 
    totalGMV, 
    totalRevpar, 
    avgOccupancy,
    healthyHotelsCount,
    warningHotelsCount,
    criticalHotelsCount,
  } = useGroupStore();
  
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedHotel, setSelectedHotel] = useState<HotelInGroup | null>(null);
  const [isRealtime, setIsRealtime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // 实时刷新
  useEffect(() => {
    if (!isRealtime) return;
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // 30秒刷新
    return () => clearInterval(interval);
  }, [isRealtime]);

  // 筛选酒店
  const filteredHotels = useMemo(() => {
    let result = hotels;
    if (selectedRegion !== 'all') {
      result = result.filter(h => h.region === selectedRegion);
    }
    if (searchQuery) {
      result = result.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.manager.includes(searchQuery)
      );
    }
    return result;
  }, [hotels, selectedRegion, searchQuery]);

  // 区域选项
  const regions = ['all', ...Array.from(new Set(hotels.map(h => h.region)))];

  // 处理地图酒店选择
  const handleMapHotelSelect = (mapHotel: MapHotel) => {
    const hotel = hotels.find(h => h.id === mapHotel.id);
    if (hotel) setSelectedHotel(hotel);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">集团数据大屏</h1>
            <span className="px-2 py-0.5 text-xs rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30">
              实时监控
            </span>
          </div>
          <p className="text-text-secondary text-sm mt-1">
            全局态势感知 · 15家门店实时监控 · 数据30秒刷新
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-color">
            <Clock className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-secondary">
              更新于 {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={() => setIsRealtime(!isRealtime)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              isRealtime 
                ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' 
                : 'bg-surface border-border-color text-text-secondary'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRealtime ? 'animate-spin' : ''}`} />
            <span className="text-sm">{isRealtime ? '实时中' : '已暂停'}</span>
          </button>
        </div>
      </motion.div>

      {/* 关键指标 - 实时卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RealtimeCard
          title="集团总GMV"
          value={`¥${(totalGMV / 10000).toFixed(1)}万`}
          change={12.5}
          icon={DollarSign}
          color="#A855F7"
          isLoading={isRealtime}
        />
        <RealtimeCard
          title="平均RevPAR"
          value={totalRevpar}
          change={8.3}
          unit="元"
          icon={TrendingUp}
          color="#00E396"
          isLoading={isRealtime}
        />
        <RealtimeCard
          title="平均入住率"
          value={`${avgOccupancy}%`}
          change={-2.1}
          icon={Building2}
          color="#00A8FF"
          isLoading={isRealtime}
        />
        <RealtimeCard
          title="健康门店"
          value={`${healthyHotelsCount}/${hotels.length}`}
          change={5.0}
          icon={CheckCircle}
          color="#FFB800"
          isLoading={isRealtime}
        />
      </div>

      {/* 地图 + 详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地图 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-neon-purple" />
              门店分布图
            </h3>
            <div className="flex items-center gap-2">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    selectedRegion === region
                      ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple'
                      : 'bg-surface border-border-color text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {region === 'all' ? '全部' : region}
                </button>
              ))}
            </div>
          </div>
          
          <HotelMap 
            hotels={mockMapHotels} 
            selectedRegion={selectedRegion}
            onSelectHotel={handleMapHotelSelect}
          />
        </motion.div>

        {/* 选中酒店详情 / 健康度概览 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <AnimatePresence mode="wait">
            {selectedHotel ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 rounded-xl border border-neon-purple/30 bg-surface"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{selectedHotel.name}</h3>
                  <button 
                    onClick={() => setSelectedHotel(null)}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    返回概览
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">店长</span>
                    <span className="text-sm font-medium">{selectedHotel.manager}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">房量</span>
                    <span className="text-sm font-medium">{selectedHotel.roomCount} 间</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">GMV</span>
                    <span className="text-sm font-medium text-neon-purple">¥{(selectedHotel.gmv / 10000).toFixed(1)}万</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">RevPAR</span>
                    <span className="text-sm font-medium text-neon-amber">¥{selectedHotel.revpar}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">入住率</span>
                    <span className="text-sm font-medium text-neon-cyan">{selectedHotel.occupancy}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border-color">
                    <span className="text-sm text-text-secondary">服务评分</span>
                    <span className="text-sm font-medium">{selectedHotel.serviceScore}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-text-secondary">AI解决率</span>
                    <span className="text-sm font-medium text-neon-green">{selectedHotel.aiResolutionRate}%</span>
                  </div>
                </div>

                <Link 
                  to={`/comparison?hotels=${selectedHotel.id}`}
                  className="mt-4 w-full py-2 text-sm bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors flex items-center justify-center gap-2"
                >
                  查看对比分析
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 rounded-xl border border-border-color bg-surface"
              >
                <h3 className="font-semibold mb-4">健康度分布</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-neon-green" />
                      <span className="text-sm">健康门店</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-surface-hover overflow-hidden">
                        <div 
                          className="h-full bg-neon-green rounded-full"
                          style={{ width: `${(healthyHotelsCount / hotels.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{healthyHotelsCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-neon-amber" />
                      <span className="text-sm">预警门店</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-surface-hover overflow-hidden">
                        <div 
                          className="h-full bg-neon-amber rounded-full"
                          style={{ width: `${(warningHotelsCount / hotels.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{warningHotelsCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-neon-red" />
                      <span className="text-sm">异常门店</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-surface-hover overflow-hidden">
                        <div 
                          className="h-full bg-neon-red rounded-full"
                          style={{ width: `${(criticalHotelsCount / hotels.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{criticalHotelsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-neon-purple/5 border border-neon-purple/20">
                  <p className="text-xs text-text-secondary">
                    💡 点击地图上的点位查看门店详情，或点击下方卡片进行详细分析
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 筛选和搜索 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-neon-purple" />
          门店列表 ({filteredHotels.length}家)
        </h3>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="搜索门店或店长..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-48 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            {regions.map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  selectedRegion === region
                    ? 'bg-neon-purple text-white'
                    : 'text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {region === 'all' ? '全部' : region}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 酒店卡片网格 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {filteredHotels.map((hotel) => (
            <HotelStatusCard 
              key={hotel.id} 
              hotel={hotel} 
              onClick={() => setSelectedHotel(hotel)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredHotels.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">未找到匹配的门店</p>
        </div>
      )}
    </div>
  );
}

export default CommandCenter;
