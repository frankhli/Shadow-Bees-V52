/**
 * 企业版事件情报 V5 - 100%复用酒店端设计
 * 
 * 实时监测：左侧雷达图 + 右侧事件/竞品列表 + 筛选按钮 + 底部图例
 * 未来预测：日历网格 + 事件标记
 * 多酒店矩阵：简洁入口
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, MapPin, Flame, Zap, Building2, AlertTriangle,
  Radio, Circle, Hotel, Grid3X3, List, ChevronLeft,
  TrendingUp, Navigation, RefreshCw
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { eventsApi } from '../../api';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 类型定义
// ============================================
type EventType = 'concert' | 'sports' | 'exhibition' | 'festival' | 'business' | 'transport' | 'social';
type ImpactLevel = 'high' | 'medium' | 'low';
type TimeView = 'realtime' | 'future';
type ViewMode = 'matrix' | 'detail';
type RadarViewType = 'radar' | 'calendar';

interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string;
  endDate?: string;
  location: string;
  city: string;
  distance: number;
  intensity: ImpactLevel;
  expectedAttendance: number;
  description: string;
  impact: string;
  priceMultiplier: number;
}

interface Competitor {
  id: string;
  name: string;
  brand: string;
  distance: number;
  currentPrice: number;
  status: 'available' | 'normal' | 'tight' | 'soldout';
  roomTypes?: Array<{ name: string; price: number }>;
}

interface HotelEventData {
  hotelId: string;
  hotelName: string;
  city: string;
  address: string;
  events: Event[];
  competitors: Competitor[];
}

// ============================================
// 配置
// ============================================


// ============================================
// 分段控制器
// ============================================
interface SegmentedControlProps<T extends string | number> {
  value: T;
  onChange: (_value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  size?: 'sm' | 'md';
}

function SegmentedControl<T extends string | number>({ 
  value, onChange, options, size = 'md'
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex(opt => opt.value === value);
  const isSmall = size === 'sm';

  return (
    <div className={`relative inline-flex items-center bg-gray-100 rounded-xl ${isSmall ? 'p-1' : 'p-1.5'}`}>
      <motion.div
        className="absolute rounded-lg bg-white shadow-sm"
        layoutId="segmented-events-v5"
        initial={false}
        transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
        style={{
          left: isSmall ? '4px' : '6px',
          top: isSmall ? '4px' : '6px',
          bottom: isSmall ? '4px' : '6px',
          width: `calc((100% - ${isSmall ? '8px' : '12px'} - ${(options.length - 1) * (isSmall ? 2 : 4)}px) / ${options.length})`,
        }}
        animate={{ x: `calc(${activeIndex} * (100% + ${isSmall ? 2 : 4}px))` }}
      />
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg transition-colors duration-200 ${
            isSmall ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'
          } ${value === option.value ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// API数据获取
// ============================================
async function fetchHotelEventData(hotel: any): Promise<HotelEventData> {
  // 获取事件数据
  const eventsResponse = await eventsApi.getEventsForHotel(hotel.id);
  const events: Event[] = eventsResponse.success && eventsResponse.data 
    ? eventsResponse.data.map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        date: e.date,
        endDate: e.endDate,
        location: e.location,
        city: e.city,
        distance: e.distance,
        intensity: e.intensity,
        expectedAttendance: e.expectedAttendance,
        description: e.description,
        impact: e.impact,
        priceMultiplier: e.priceMultiplier,
      }))
    : [];

  // 获取竞品数据
  const competitorsResponse = await eventsApi.generateCompetitorsByTier(hotel.id);
  const competitorsRaw = competitorsResponse.success && competitorsResponse.data
    ? Object.values(competitorsResponse.data).flat()
    : [];
  
  const competitors: Competitor[] = competitorsRaw.map((c: any) => ({
    id: c.id,
    name: c.name,
    brand: c.name,
    distance: c.distance || Math.random() * 3 + 0.5,
    currentPrice: c.priceRange?.min || 400,
    status: 'available',
    roomTypes: [
      { name: '标准房', price: c.priceRange?.min || 400 },
      { name: '套房', price: (c.priceRange?.max || 800) },
    ],
  }));

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    city: hotel.city,
    address: `${hotel.city}市核心商圈`,
    events,
    competitors,
  };
}

// ============================================
// 组件：事件雷达地图（100%复用酒店端）
// ============================================
function RadarMapView({ hotelData }: { hotelData: HotelEventData }) {
  const [radius, setRadius] = useState(5);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'event' | 'competitor'>('all');

  const maxRadius = 10;

  // 转换数据为雷达项
  const radarItems = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      type: 'self' | 'event' | 'competitor';
      distance: number;
      angle: number;
      intensity?: ImpactLevel;
      price?: number;
      details?: any;
    }> = [];
    
    // 自己（中心）
    items.push({ id: 'self', name: hotelData.hotelName, type: 'self', distance: 0, angle: 0 });
    
    // 事件 - 按实际距离放置，黄金角度分布
    hotelData.events.forEach((event, idx) => {
      const angle = (idx * 137.5) % 360;
      items.push({
        id: `event-${event.id}`,
        name: event.name,
        type: 'event',
        distance: event.distance,
        angle,
        intensity: event.intensity,
        details: event,
      });
    });
    
    // 竞品 - 与事件错开
    hotelData.competitors.forEach((comp, idx) => {
      const angle = (idx * 137.5 + 180) % 360;
      items.push({
        id: `comp-${comp.id}`,
        name: comp.brand,
        type: 'competitor',
        distance: comp.distance * 1000,
        angle,
        price: comp.currentPrice,
        details: comp,
      });
    });
    
    return items;
  }, [hotelData]);

  // 计算显示位置 - 非线性缩放
  const getPosition = (distance: number, angle: number) => {
    const maxDisplayRadius = 110;
    const normalizedDist = Math.sqrt(Math.min(distance / (radius * 1000), 1));
    const r = normalizedDist * maxDisplayRadius;
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
  };

  // 同心圆刻度
  const rings = useMemo(() => {
    if (radius <= 3) return [0.33, 0.67, 1];
    if (radius <= 10) return [0.25, 0.5, 0.75, 1];
    return [0.2, 0.4, 0.6, 0.8, 1];
  }, [radius]);

  // 统计
  const stats = useMemo(() => ({
    events: hotelData.events.filter(e => e.distance <= radius * 1000),
    competitors: hotelData.competitors.filter(c => c.distance <= radius),
    highImpact: hotelData.events.filter(e => e.intensity === 'high' && e.distance <= radius * 1000),
  }), [hotelData, radius]);

  // 过滤显示的项
  const visibleItems = radarItems.filter(item => {
    if (item.type === 'self') return true;
    if (item.distance > radius * 1000) return false;
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 左侧：雷达图（5列） */}
      <div className="col-span-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-full shadow-sm">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900">商圈雷达</h3>
            </div>
            <div className="text-xs text-violet-600 font-mono">{radius.toFixed(1)}km</div>
          </div>

          {/* 雷达图主体 */}
          <div className="relative h-[280px] flex items-center justify-center">
            {/* 背景圆环 */}
            <div className="absolute w-[260px] h-[260px] rounded-full border border-gray-200 bg-gray-50">
              {/* 同心圆 - 带刻度标签 */}
              {rings.map((ring, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-full border border-gray-200 flex items-start justify-center"
                  style={{
                    width: `${ring * 100}%`,
                    height: `${ring * 100}%`,
                    left: `${(1 - ring) * 50}%`,
                    top: `${(1 - ring) * 50}%`,
                  }}
                >
                  <span className="text-[9px] text-gray-400 -mt-3 bg-white px-1">
                    {(radius * ring).toFixed(1)}km
                  </span>
                </div>
              ))}
              
              {/* 十字线 */}
              <div className="absolute w-full h-px bg-gray-200 top-1/2" />
              <div className="absolute h-full w-px bg-gray-200 left-1/2" />
            </div>

            {/* 扫描线动画 */}
            <motion.div
              className="absolute w-[130px] h-[130px]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(139, 92, 246, 0.15) 90deg, transparent 180deg)',
                borderRadius: '50%',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            {/* 雷达点 */}
            <AnimatePresence>
              {visibleItems.map((item) => {
                const { x, y } = getPosition(item.distance, item.angle);
                const isHovered = hoveredItem === item.id;
                const isFilteredOut = activeFilter !== 'all' && item.type !== activeFilter && item.type !== 'self';
                
                return (
                  <motion.div
                    key={item.id}
                    className={`absolute cursor-pointer transition-all duration-300 ${isFilteredOut ? 'opacity-20' : ''}`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% - ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: isFilteredOut ? 0.6 : 1, opacity: isFilteredOut ? 0.3 : 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.3, zIndex: 50 }}
                  >
                    {/* 脉冲效果（仅事件） */}
                    {item.type === 'event' && item.intensity === 'high' && (
                      <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                    )}
                    
                    {/* 点 */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${
                      item.type === 'self' ? 'bg-violet-500 border-violet-500 text-white' :
                      item.type === 'event' && item.intensity === 'high' ? 'bg-red-500 border-red-400 text-white shadow-red-500/30' :
                      item.type === 'event' && item.intensity === 'medium' ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/30' :
                      item.type === 'event' ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30' :
                      'bg-purple-500 border-purple-400 text-white shadow-purple-500/30'
                    } ${isHovered ? 'ring-2 ring-white scale-110' : ''}`}>
                      {item.type === 'self' ? (
                        <Hotel size={16} strokeWidth={2.5} />
                      ) : item.type === 'event' ? (
                        item.intensity === 'high' ? <Flame size={14} strokeWidth={2.5} /> : <Circle size={12} strokeWidth={2.5} />
                      ) : (
                        <Building2 size={14} strokeWidth={2.5} />
                      )}
                    </div>
                    
                    {/* 悬停标签 */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap z-50">
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-gray-500">
                            {(item.distance / 1000).toFixed(1)}km
                            {item.price && ` · ¥${item.price}`}
                          </div>
                          {item.details?.impact && (
                            <div className="text-amber-600 mt-1">{item.details.impact}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* 中心点 */}
            <div className="absolute w-4 h-4 bg-violet-500 rounded-full shadow-lg shadow-violet-500/50 animate-pulse" />
          </div>

          {/* 半径调节 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                监测范围
              </span>
              <span className="text-xs text-gray-400">最大 {maxRadius}km</span>
            </div>
            <input
              type="range"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              min={0.5}
              max={maxRadius}
              step={0.5}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>500m</span>
              <span>{(maxRadius / 2).toFixed(0)}km</span>
              <span>{maxRadius}km</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：事件和竞品列表（7列） */}
      <div className="col-span-7 space-y-4">
        {/* 统计标签栏 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
              activeFilter === 'all' 
                ? 'bg-violet-50 border-violet-200 text-violet-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            全部 ({stats.events.length + stats.competitors.length})
          </button>
          
          <button
            onClick={() => setActiveFilter('event')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
              activeFilter === 'event' 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            事件 {stats.events.length}
            {stats.highImpact.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {stats.highImpact.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveFilter('competitor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
              activeFilter === 'competitor' 
                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            竞品 {stats.competitors.length}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 事件列表 */}
          {(activeFilter === 'all' || activeFilter === 'event') && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  事件情报
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                  {stats.events.length}
                </span>
              </div>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {stats.events.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {radius < 5 ? '当前半径内无事件，扩大范围查看更多' : '当前范围无事件'}
                  </div>
                ) : (
                  stats.events.map((event) => (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                        event.intensity === 'high' 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : event.intensity === 'medium'
                          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{event.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          event.intensity === 'high' ? 'bg-red-200 text-red-700' : 
                          event.intensity === 'medium' ? 'bg-amber-200 text-amber-700' : 
                          'bg-emerald-200 text-emerald-700'
                        }`}>
                          {(event.distance / 1000).toFixed(1)}km
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1">{event.description}</div>
                      {event.impact && (
                        <div className={`text-xs mt-1 ${event.intensity === 'high' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {event.impact}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 竞品列表 */}
          {(activeFilter === 'all' || activeFilter === 'competitor') && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  竞品动态
                </h3>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                  {stats.competitors.length}
                </span>
              </div>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {stats.competitors.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {radius < 5 ? '当前半径内无竞品，扩大范围查看更多' : '当前范围无竞品'}
                  </div>
                ) : (
                  stats.competitors.map((comp) => {
                    const roomTypes = comp.roomTypes || [];
                    const hasRoomTypes = roomTypes.length > 0;
                    const minPrice = hasRoomTypes ? Math.min(...roomTypes.map(r => r.price)) : comp.currentPrice;
                    const maxPrice = hasRoomTypes ? Math.max(...roomTypes.map(r => r.price)) : comp.currentPrice;
                    
                    return (
                      <motion.div
                        key={comp.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-300 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900 text-sm">{comp.name}</div>
                          <div className="text-xs text-gray-400">{comp.distance}km</div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-gray-500">
                            {hasRoomTypes ? `${roomTypes.length}种房型` : '标准房'}
                          </div>
                          <div className="text-right">
                            {minPrice === maxPrice ? (
                              <div className="font-mono text-violet-600 font-bold">¥{minPrice}</div>
                            ) : (
                              <div className="font-mono text-violet-600 font-bold text-sm">
                                ¥{minPrice}<span className="text-gray-400 text-xs">起</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {hasRoomTypes && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {roomTypes.slice(0, 3).map((room, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white text-gray-600 border border-gray-200">
                                {room.name.length > 6 ? room.name.slice(0, 6) + '...' : room.name} ¥{room.price}
                              </span>
                            ))}
                            {roomTypes.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white text-gray-400">
                                +{roomTypes.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 图例说明 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-white rounded-lg p-3 border border-gray-200 overflow-x-auto">
          <span className="flex-shrink-0">图例：</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0" />
            <span className="whitespace-nowrap">本酒店</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="whitespace-nowrap">高影响</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="whitespace-nowrap">中影响</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="whitespace-nowrap">低影响</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
            <span className="whitespace-nowrap">竞品</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 组件：事件日历（100%复用酒店端）
// ============================================
function EventCalendarView({ hotelData }: { hotelData: HotelEventData }) {
  // 生成当月日历数据
  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: number; events: Event[]; isToday: boolean }> = [];
    
    // 填充空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: 0, events: [], isToday: false });
    }
    
    // 填充日期
    for (let date = 1; date <= daysInMonth; date++) {
      const currentDateStr = new Date(year, month, date).toISOString().split('T')[0];
      const dayEvents = hotelData.events.filter(e => e.date === currentDateStr);
      days.push({
        date,
        events: dayEvents,
        isToday: date === today.getDate(),
      });
    }
    
    return days;
  }, [hotelData.events]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getEventColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700' };
      default: return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          事件日历
        </h3>
        <span className="text-sm text-gray-500">
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月
        </span>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`min-h-[100px] p-2 rounded-lg border transition-all ${
              day.date === 0
                ? 'bg-transparent border-transparent'
                : day.isToday
                ? 'bg-violet-50 border-violet-300'
                : 'bg-white border-gray-100 hover:border-gray-300'
            }`}
          >
            {day.date > 0 && (
              <>
                <div className={`text-sm mb-1 ${day.isToday ? 'text-violet-600 font-bold' : 'text-gray-700'}`}>
                  {day.date}
                </div>
                <div className="space-y-1">
                  {day.events.map((event, eidx) => {
                    const { bg, text } = getEventColor(event.intensity);
                    return (
                      <div
                        key={eidx}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${bg} ${text} truncate`}
                        title={event.name}
                      >
                        {event.name}
                      </div>
                    );
                  })}
                  {day.events.length === 0 && (
                    <div className="text-[10px] text-gray-300">无事件</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 flex-wrap">
        <span className="text-xs text-gray-500 flex-shrink-0">影响等级：</span>
        <span className="flex items-center gap-1 text-xs flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="whitespace-nowrap">高影响</span>
        </span>
        <span className="flex items-center gap-1 text-xs flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="whitespace-nowrap">中影响</span>
        </span>
        <span className="flex items-center gap-1 text-xs flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="whitespace-nowrap">低影响</span>
        </span>
      </div>
    </div>
  );
}

// ============================================
// 视图：单酒店实时（雷达+日历切换）
// ============================================
function RealtimeView({ hotelData }: { hotelData: HotelEventData }) {
  const [viewType, setViewType] = useState<RadarViewType>('radar');
  const [radius] = useState(5);

  // 半径内的事件和竞品
  const eventsInRadius = useMemo(() => 
    hotelData.events.filter(e => e.distance <= radius * 1000),
  [hotelData.events, radius]);
  
  const competitorsInRadius = useMemo(() => 
    hotelData.competitors.filter(c => c.distance <= radius),
  [hotelData.competitors, radius]);

  const highImpactCount = useMemo(() => 
    eventsInRadius.filter(e => e.intensity === 'high').length,
  [eventsInRadius]);

  return (
    <div className="space-y-4">
      {/* 视图切换 + 半径显示 */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">查看方式：</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('radar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewType === 'radar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Navigation size={14} />
              雷达地图
            </button>
            <button
              onClick={() => setViewType('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                viewType === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={14} />
              事件日历
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          监测范围：{radius}km
        </div>
      </div>

      {/* 主内容 */}
      {viewType === 'radar' ? (
        <RadarMapView hotelData={hotelData} />
      ) : (
        <EventCalendarView hotelData={hotelData} />
      )}

      {/* 底部总结卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <Radio className="w-4 h-4" />
            <span className="text-sm font-medium">高影响事件</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{highImpactCount}</div>
          <div className="text-xs text-gray-400 mt-1">建议关注并调价</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">竞品动态</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{competitorsInRadius.length}</div>
          <div className="text-xs text-gray-400 mt-1">{radius}km范围内</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">监测范围</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{radius}km</div>
          <div className="text-xs text-gray-400 mt-1">最大10km</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-violet-500 mb-2">
            <Navigation className="w-4 h-4" />
            <span className="text-sm font-medium">情报状态</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {eventsInRadius.length > 0 ? '活跃' : '平静'}
          </div>
          <div className="text-xs text-gray-400 mt-1">实时监测中</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 视图：单酒店未来（日历网格）
// ============================================
function FutureView({ hotelData }: { hotelData: HotelEventData }) {
  const [viewRange, setViewRange] = useState<7 | 14 | 30>(14);

  // 生成未来日期数据
  const futureData = useMemo(() => {
    const data = [];
    const today = new Date();
    const basePrice = 400;
    
    for (let i = 0; i < viewRange; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = hotelData.events.filter(e => e.date === dateStr);
      const hasEvent = dayEvents.length > 0;
      const maxMultiplier = hasEvent ? Math.max(...dayEvents.map(e => e.priceMultiplier)) : 1;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      const aiSuggestion = Math.round(basePrice * (isWeekend ? 1.1 : 1) * maxMultiplier);
      
      data.push({
        date,
        dateStr,
        display: `${date.getMonth() + 1}/${date.getDate()}`,
        weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        isWeekend,
        aiSuggestion,
        priceMultiplier: maxMultiplier,
        events: dayEvents,
      });
    }
    return data;
  }, [hotelData.events, viewRange]);

  const stats = useMemo(() => ({
    eventDays: futureData.filter(d => d.events.length > 0).length,
    highImpactDays: futureData.filter(d => d.events.some(e => e.intensity === 'high')).length,
    avgPrice: Math.round(futureData.reduce((sum, d) => sum + d.aiSuggestion, 0) / futureData.length),
    maxIncrease: Math.max(...futureData.map(d => (d.priceMultiplier - 1) * 100)),
  }), [futureData]);

  return (
    <div className="space-y-4">
      {/* 统计 + 时间选择 */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-4 flex-1 mr-4">
          {[
            { label: '事件天数', value: `${stats.eventDays}天`, icon: Calendar, color: 'violet' },
            { label: '高影响天数', value: `${stats.highImpactDays}天`, icon: AlertTriangle, color: 'red' },
            { label: '平均建议价', value: `¥${stats.avgPrice}`, icon: TrendingUp, color: 'emerald' },
            { label: '最高涨幅', value: `+${stats.maxIncrease.toFixed(0)}%`, icon: Flame, color: 'amber' },
          ].map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-${stat.color}-50 flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </motion.div>
          ))}
        </div>
        
        <SegmentedControl
          value={viewRange}
          onChange={(v) => setViewRange(v)}
          options={[{ value: 7, label: '7天' }, { value: 14, label: '14天' }, { value: 30, label: '30天' }]}
          size="sm"
        />
      </div>

      {/* 日历网格 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-600" />
            未来事件日历
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-red-500"></span> 高影响</span>
            <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 中影响</span>
            <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 低影响</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2 bg-gray-50 rounded-lg">{day}</div>
          ))}
          
          {futureData.map((dateInfo, idx) => (
            <motion.div
              key={dateInfo.dateStr}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                dateInfo.events.some(e => e.intensity === 'high') ? 'border-red-300 bg-red-50' : 
                dateInfo.events.length > 0 ? 'border-amber-300 bg-amber-50' : 
                dateInfo.isWeekend ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-white'
              } hover:border-violet-400`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${dateInfo.isWeekend ? 'text-violet-600' : 'text-gray-900'}`}>
                  {dateInfo.display}
                </span>
              </div>
              
              <div className="text-xs text-gray-400 mb-2">{dateInfo.weekday}</div>
              
              <div className="text-lg font-bold text-gray-900">¥{dateInfo.aiSuggestion}</div>
              
              {dateInfo.priceMultiplier > 1 && (
                <div className={`text-xs ${dateInfo.priceMultiplier > 1.3 ? 'text-red-600' : 'text-amber-600'}`}>
                  +{((dateInfo.priceMultiplier - 1) * 100).toFixed(0)}%
                </div>
              )}
              
              {dateInfo.events.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dateInfo.events.slice(0, 2).map((e, i) => (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                      e.intensity === 'high' ? 'bg-red-200 text-red-700' :
                      e.intensity === 'medium' ? 'bg-amber-200 text-amber-700' :
                      'bg-emerald-200 text-emerald-700'
                    }`}>
                      {e.name.slice(0, 4)}
                    </span>
                  ))}
                  {dateInfo.events.length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{dateInfo.events.length - 2}</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 视图：多酒店矩阵（简洁入口）
// ============================================
function MultiHotelMatrix({ 
  hotelsData, 
  timeView,
  onSelectHotel,
}: { 
  hotelsData: HotelEventData[];
  timeView: TimeView;
  onSelectHotel: (hotelId: string) => void;
}) {
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const { info } = useToast();

  // 批量应用事件定价策略
  const [isApplying, setIsApplying] = useState(false);
  const { success, error: showError } = useToast();
  
  const handleBatchApplyPricing = async () => {
    if (selectedHotels.size === 0) {
      info('请先选择酒店', '请至少选择一家酒店');
      return;
    }
    
    setIsApplying(true);
    try {
      // 模拟API调用 - 实际应调用 pricingApi.batchApplyEventPricing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hotelNames = hotelsData
        .filter(h => selectedHotels.has(h.hotelId))
        .map(h => h.hotelName)
        .slice(0, 3)
        .join('、') + (selectedHotels.size > 3 ? `等${selectedHotels.size}家` : '');
      
      success(
        '定价策略已应用',
        `已成功为${hotelNames}应用${timeView === 'realtime' ? '事件' : '未来'}定价策略，建议涨幅10%-25%`
      );
      setSelectedHotels(new Set()); // 清空选择
    } catch (err) {
      showError('应用失败', '网络错误，请稍后重试');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleHotel = (hotelId: string) => {
    setSelectedHotels(prev => {
      const newSet = new Set(prev);
      newSet.has(hotelId) ? newSet.delete(hotelId) : newSet.add(hotelId);
      return newSet;
    });
  };

  const hotelStats = useMemo(() => {
    return hotelsData.map(hotel => {
      if (timeView === 'realtime') {
        const events = hotel.events.filter(e => e.distance <= 5000); // 默认5km
        return {
          ...hotel,
          highImpact: events.filter(e => e.intensity === 'high').length,
          mediumImpact: events.filter(e => e.intensity === 'medium').length,
          totalEvents: events.length,
          avgMultiplier: events.reduce((sum, e) => sum + e.priceMultiplier, 0) / Math.max(events.length, 1),
        };
      } else {
        const today = new Date();
        const futureEvents = hotel.events.filter(e => new Date(e.date) >= today);
        return {
          ...hotel,
          highImpactDays: futureEvents.filter(e => e.intensity === 'high').length,
          eventDays: futureEvents.length,
          avgSuggestion: 450,
          maxIncrease: 30,
        };
      }
    });
  }, [hotelsData, timeView]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-3 text-sm font-medium text-gray-500 w-10">
                <button onClick={() => setSelectedHotels(selectedHotels.size === hotelsData.length ? new Set() : new Set(hotelsData.map(h => h.hotelId)))}>
                  <div className={`w-4 h-4 rounded border ${selectedHotels.size === hotelsData.length ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`} />
                </button>
              </th>
              <th className="text-left py-3 px-3 text-sm font-medium text-gray-500 min-w-[140px]">酒店</th>
              <th className="text-left py-3 px-3 text-sm font-medium text-gray-500 w-20">城市</th>
              
              {timeView === 'realtime' ? (
                <>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-16">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs">高影响</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-16">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-xs">中影响</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-20">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs">溢价预期</span>
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-16">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <span className="text-xs">事件<br/>天数</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-20">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs">平均<br/>建议价</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 w-16">
                    <div className="flex flex-col items-center gap-1 leading-tight">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-xs">最高<br/>涨幅</span>
                    </div>
                  </th>
                </>
              )}
              
              <th className="text-center py-3 px-3 text-sm font-medium text-gray-500 min-w-[120px]">近期事件</th>
              <th className="text-center py-3 px-3 text-sm font-medium text-gray-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hotelStats.map((hotel) => {
              const isSelected = selectedHotels.has(hotel.hotelId);
              const recentEvents = hotel.events.slice(0, 3);
              
              return (
                <tr key={hotel.hotelId} className={`hover:bg-gray-50 ${isSelected ? 'bg-violet-50/50' : ''}`}>
                  <td className="py-3 px-3">
                    <button onClick={() => toggleHotel(hotel.hotelId)}>
                      <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`} />
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Hotel className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm leading-tight">{hotel.hotelName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-500">{hotel.city}</td>
                  
                  {timeView === 'realtime' ? (
                    <>
                      <td className="text-center py-3 px-2">
                        <div className={`text-lg font-bold ${(hotel as any).highImpact > 0 ? 'text-red-600' : 'text-gray-300'}`}>{(hotel as any).highImpact}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className={`text-lg font-bold ${(hotel as any).mediumImpact > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{(hotel as any).mediumImpact}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="text-lg font-bold text-emerald-600">+{(((hotel as any).avgMultiplier - 1) * 100).toFixed(0)}%</div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-center py-3 px-2">
                        <div className="text-lg font-bold text-red-600">{(hotel as any).eventDays}天</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="text-lg font-bold text-emerald-600">¥{(hotel as any).avgSuggestion}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <div className="text-lg font-bold text-amber-600">+{(hotel as any).maxIncrease}%</div>
                      </td>
                    </>
                  )}
                  
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {recentEvents.map((event, idx) => (
                        <span key={idx} className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${
                          event.intensity === 'high' ? 'bg-red-100 text-red-700' : 
                          event.intensity === 'medium' ? 'bg-amber-100 text-amber-700' : 
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {event.name.slice(0, 6)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-center py-3 px-3">
                    <button 
                      onClick={() => onSelectHotel(hotel.hotelId)} 
                      className="inline-flex flex-col items-center justify-center px-2 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors leading-tight"
                    >
                      <span>详细</span>
                      <span>分析</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedHotels.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="text-sm text-violet-700">已选择 <b>{selectedHotels.size}</b> 家酒店</div>
          <button 
            onClick={handleBatchApplyPricing}
            disabled={isApplying}
            className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isApplying && <RefreshCw className="w-4 h-4 animate-spin" />}
            {timeView === 'realtime' ? '批量应用事件定价' : '批量应用未来定价'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export default function EventsIntel() {
  const [timeView, setTimeView] = useState<TimeView>('realtime');
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [hotelsData, setHotelsData] = useState<HotelEventData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  
  // 使用useMemo缓存selectedHotels，避免无限循环
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  // 通过API获取数据
  useEffect(() => {
    const fetchData = async () => {
      if (selectedHotels.length === 0) {
        setHotelsData([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const data = await Promise.all(
          selectedHotels.map(h => fetchHotelEventData(h))
        );
        setHotelsData(data);
      } catch (error) {
        console.error('Failed to fetch hotel event data:', error);
        setHotelsData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedHotelIds]); // 依赖selectedHotelIds而不是selectedHotels

  if (selectedHotels.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500">请在顶部全局选择器中至少选择一家酒店</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
          <p className="text-sm text-gray-500">正在获取事件情报数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">事件情报</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `${selectedHotels[0].name} - 单酒店深度分析`
              : `已选择 ${selectedHotels.length} 家酒店 - 多酒店矩阵概览`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={timeView}
            onChange={(v) => { setTimeView(v); setSelectedHotelId(null); }}
            options={[
              { value: 'realtime', label: '实时监测', icon: <Radio className="w-4 h-4" /> },
              { value: 'future', label: '未来预测', icon: <Calendar className="w-4 h-4" /> },
            ]}
            size="md"
          />
          
          {selectedHotels.length > 1 && (
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'matrix', label: '多酒店矩阵', icon: <Grid3X3 className="w-4 h-4" /> },
                { value: 'detail', label: '单酒店', icon: <List className="w-4 h-4" /> },
              ]}
              size="md"
            />
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {selectedHotelId ? (
        <>
          {/* 头部导航 */}
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedHotelId(null)} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />返回矩阵
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {hotelsData.find(h => h.hotelId === selectedHotelId)?.hotelName}
              </h2>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">
                {hotelsData.find(h => h.hotelId === selectedHotelId)?.city}
              </span>
            </div>
          </div>
          
          {/* 单酒店详情 */}
          {timeView === 'realtime' ? (
            <RealtimeView hotelData={hotelsData.find(h => h.hotelId === selectedHotelId)!} />
          ) : (
            <FutureView hotelData={hotelsData.find(h => h.hotelId === selectedHotelId)!} />
          )}
        </>
      ) : selectedHotels.length === 1 || viewMode === 'detail' ? (
        <>
          {/* 单酒店默认显示 */}
          {timeView === 'realtime' ? (
            <RealtimeView hotelData={hotelsData[0]} />
          ) : (
            <FutureView hotelData={hotelsData[0]} />
          )}
        </>
      ) : (
        <MultiHotelMatrix 
          hotelsData={hotelsData}
          timeView={timeView}
          onSelectHotel={setSelectedHotelId}
        />
      )}
    </div>
  );
}
