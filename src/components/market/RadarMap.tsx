import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Zap, Building2, AlertTriangle, Radio, Hotel, Flame, CircleDot } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RadarItem {
  id: string;
  name: string;
  type: 'self' | 'competitor' | 'event';
  distance: number; // 米
  angle: number; // 角度 0-360
  intensity?: 'low' | 'medium' | 'high';
  status?: 'available' | 'normal' | 'tight' | 'soldout';
  price?: number;
  icon?: string;
  details?: any;
}

interface RadarMapProps {
  hotelName: string;
  events: Array<{
    id: string;
    name: string;
    distance: number;
    intensity: 'low' | 'medium' | 'high';
    description: string;
    impact?: string;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    distance: number;
    currentPrice: number;
    status: 'available' | 'normal' | 'tight' | 'soldout';
    brand: string;
    roomTypes?: Array<{
      id: string;
      name: string;
      price: number;
      inventory: number;
      status: 'available' | 'normal' | 'tight' | 'soldout';
    }>;
  }>;
  maxRadius: number; // 最大半径 km
  onRadiusChange?: (radius: number) => void;
}

export function RadarMap({ 
  hotelName, 
  events, 
  competitors, 
  maxRadius = 5,
  onRadiusChange 
}: RadarMapProps) {
  const [radius, setRadius] = useState(Math.min(5, maxRadius));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'event' | 'competitor'>('all');

  // 转换数据为雷达项 - 按距离均匀分布
  const radarItems: RadarItem[] = useMemo(() => {
    const items: RadarItem[] = [];
    
    // 自己（中心）
    items.push({
      id: 'self',
      name: hotelName,
      type: 'self',
      distance: 0,
      angle: 0,
      icon: 'self'
    });
    
    // 事件 - 按实际距离放置
    events.forEach((event, idx) => {
      const angle = (idx * 137.5) % 360; // 黄金角度分布
      items.push({
        id: `event-${event.id}`,
        name: event.name,
        type: 'event',
        distance: event.distance,
        angle: angle,
        intensity: event.intensity,
        icon: event.intensity,
        details: event
      });
    });
    
    // 竞品 - 按实际距离放置
    competitors.forEach((comp, idx) => {
      const angle = (idx * 137.5 + 180) % 360; // 与事件错开
      items.push({
        id: `comp-${comp.id}`,
        name: comp.brand,
        type: 'competitor',
        distance: comp.distance * 1000, // km转米
        angle: angle,
        status: comp.status,
        price: comp.currentPrice,
        icon: 'competitor',
        details: comp
      });
    });
    
    return items;
  }, [events, competitors, hotelName]);

  // 计算显示位置 - 自适应缩放，避免所有点挤在中间
  const getPosition = (distance: number, angle: number) => {
    const maxDisplayRadius = 130; // 雷达图显示半径px
    
    // 使用非线性缩放，让近处和远处的点都能看清
    // 公式: sqrt(距离/最大半径) * 显示半径，这样近处不会挤在一起，远处也不会太靠边
    const normalizedDist = Math.sqrt(Math.min(distance / (radius * 1000), 1));
    const r = normalizedDist * maxDisplayRadius;
    
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * r;
    const y = Math.sin(rad) * r;
    return { x, y };
  };

  // 同心圆刻度 - 根据当前半径动态调整
  const rings = useMemo(() => {
    // 根据半径大小决定显示几个环
    if (radius <= 3) return [0.33, 0.67, 1];
    if (radius <= 10) return [0.25, 0.5, 0.75, 1];
    return [0.2, 0.4, 0.6, 0.8, 1];
  }, [radius]);

  // 处理半径变化
  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    onRadiusChange?.(newRadius);
  };

  // 统计数据
  const stats = useMemo(() => ({
    events: events.filter(e => e.distance <= radius * 1000),
    competitors: competitors.filter(c => c.distance <= radius),
    highImpact: events.filter(e => e.intensity === 'high' && e.distance <= radius * 1000)
  }), [events, competitors, radius]);

  // 过滤显示的项
  const visibleItems = radarItems.filter(item => {
    if (item.type === 'self') return true;
    if (item.distance > radius * 1000) return false;
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* 左侧：雷达图 */}
      <div className="col-span-5">
        <div className="bg-bg-secondary rounded-xl border border-border-color p-4 h-full">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#00F0FF]" />
              <h3 className="font-semibold text-text-primary">商圈雷达</h3>
            </div>
            <div className="text-xs text-[#00F0FF] font-mono">{radius.toFixed(1)}km</div>
          </div>

          {/* 雷达图主体 */}
          <div className="relative h-[280px] flex items-center justify-center">
            {/* 背景圆环 */}
            <div className="absolute w-[260px] h-[260px] rounded-full border border-border-color/50 bg-bg-primary">
              {/* 同心圆 - 带刻度标签 */}
              {rings.map((ring, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-full border border-border-color/30 flex items-start justify-center"
                  style={{
                    width: `${ring * 100}%`,
                    height: `${ring * 100}%`,
                    left: `${(1 - ring) * 50}%`,
                    top: `${(1 - ring) * 50}%`,
                  }}
                >
                  <span className="text-[9px] text-text-muted -mt-3 bg-bg-primary px-1">
                    {(radius * ring).toFixed(1)}km
                  </span>
                </div>
              ))}
              
              {/* 十字线 */}
              <div className="absolute w-full h-px bg-border-color/30 top-1/2" />
              <div className="absolute h-full w-px bg-border-color/30 left-1/2" />
            </div>

            {/* 扫描线动画 */}
            <motion.div
              className="absolute w-[130px] h-[130px]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0, 240, 255, 0.15) 90deg, transparent 180deg)',
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
                    className={cn(
                      "absolute cursor-pointer transition-all duration-300",
                      isFilteredOut && "opacity-20"
                    )}
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
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg transition-all",
                      item.type === 'self' && "bg-[#00F0FF] border-[#00F0FF] text-black",
                      item.type === 'event' && item.intensity === 'high' && "bg-red-500 border-red-400 shadow-red-500/30 text-text-primary",
                      item.type === 'event' && item.intensity === 'medium' && "bg-[#FFB800] border-[#FFB800] text-black shadow-[#FFB800]/30",
                      item.type === 'event' && item.intensity === 'low' && "bg-[#00E396] border-[#00E396] text-black shadow-[#00E396]/30",
                      item.type === 'competitor' && "bg-[#A855F7] border-[#A855F7] shadow-[#A855F7]/30 text-text-primary",
                      isHovered && "ring-2 ring-white scale-110"
                    )}>
                      {item.type === 'self' ? (
                        <Hotel size={16} strokeWidth={2.5} />
                      ) : item.type === 'event' ? (
                        item.intensity === 'high' ? (
                          <Flame size={14} strokeWidth={2.5} />
                        ) : (
                          <CircleDot size={12} strokeWidth={2.5} />
                        )
                      ) : (
                        <Building2 size={14} strokeWidth={2.5} />
                      )}
                    </div>
                    
                    {/* 距离标签（仅悬停） */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap z-50">
                        <div className="bg-bg-primary border border-border-color rounded-lg px-3 py-2 text-xs shadow-2xl">
                          <div className="font-medium text-text-primary">{item.name}</div>
                          <div className="text-text-secondary">
                            {(item.distance / 1000).toFixed(1)}km
                            {item.price && ` · ¥${item.price}`}
                          </div>
                          {item.details?.impact && (
                            <div className="text-[#FFB800] mt-1">{item.details.impact}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* 中心点 */}
            <div className="absolute w-4 h-4 bg-[#00F0FF] rounded-full shadow-lg shadow-[#00F0FF]/50 animate-pulse" />
          </div>

          {/* 半径调节 */}
          <div className="mt-4 p-3 bg-bg-primary rounded-lg border border-border-color/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                监测范围
              </span>
              <span className="text-xs text-text-muted">最大 {maxRadius}km</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={handleRadiusChange}
              min={0.5}
              max={maxRadius}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>500m</span>
              <span>{(maxRadius / 2).toFixed(0)}km</span>
              <span>{maxRadius}km</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：事件和竞品列表 */}
      <div className="col-span-7 space-y-4">
        {/* 统计标签栏 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all",
              activeFilter === 'all' 
                ? "bg-[#00F0FF]/10 border-[#00F0FF]/50 text-[#00F0FF]" 
                : "bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary"
            )}
          >
            <Radio className="w-4 h-4" />
            全部 ({stats.events.length + stats.competitors.length})
          </button>
          
          <button
            onClick={() => setActiveFilter('event')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all",
              activeFilter === 'event' 
                ? "bg-[#FFB800]/10 border-[#FFB800]/50 text-[#FFB800]" 
                : "bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary"
            )}
          >
            <Zap className="w-4 h-4" />
            事件 {stats.events.length}
            {stats.highImpact.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-text-primary text-[10px] flex items-center justify-center">
                {stats.highImpact.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveFilter('competitor')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all",
              activeFilter === 'competitor' 
                ? "bg-[#A855F7]/10 border-[#A855F7]/50 text-[#A855F7]" 
                : "bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary"
            )}
          >
            <Building2 className="w-4 h-4" />
            竞品 {stats.competitors.length}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 事件列表 */}
          {(activeFilter === 'all' || activeFilter === 'event') && (
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                  事件情报
                </h3>
                <Badge className="bg-[#FFB800]/10 text-[#FFB800] text-xs">
                  {stats.events.length}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {stats.events.length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-sm">
                    {radius < 5 ? '当前半径内无事件，扩大范围查看更多' : '当前范围无事件'}
                  </div>
                ) : (
                  stats.events.map((event) => (
                    <motion.div
                      key={event.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-3 rounded-lg border text-sm cursor-pointer transition-all",
                        event.intensity === 'high' 
                          ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' 
                          : event.intensity === 'medium'
                          ? 'bg-[#FFB800]/10 border-[#FFB800]/30 hover:bg-[#FFB800]/20'
                          : 'bg-[#00E396]/10 border-[#00E396]/30 hover:bg-[#00E396]/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-text-primary">{event.name}</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          event.intensity === 'high' ? 'bg-red-500/30 text-red-300' : 
                          event.intensity === 'medium' ? 'bg-[#FFB800]/30 text-[#FFB800]' : 
                          'bg-[#00E396]/30 text-[#00E396]'
                        )}>
                          {(event.distance / 1000).toFixed(1)}km
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary line-clamp-1">{event.description}</div>
                      {event.impact && (
                        <div className={cn(
                          "text-xs mt-1",
                          event.intensity === 'high' ? 'text-red-400' : 'text-[#00E396]'
                        )}>
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
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-text-primary flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#A855F7]" />
                  竞品动态
                </h3>
                <Badge className="bg-[#A855F7]/10 text-[#A855F7] text-xs">
                  {stats.competitors.length}
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {stats.competitors.length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-sm">
                    {radius < 5 ? '当前半径内无竞品，扩大范围查看更多' : '当前范围无竞品'}
                  </div>
                ) : (
                  stats.competitors.map((comp) => {
                    // 计算该竞品的价格区间
                    const roomTypes = comp.roomTypes || [];
                    const hasRoomTypes = roomTypes.length > 0;
                    const minPrice = hasRoomTypes 
                      ? Math.min(...roomTypes.map(r => r.price)) 
                      : comp.currentPrice;
                    const maxPrice = hasRoomTypes 
                      ? Math.max(...roomTypes.map(r => r.price)) 
                      : comp.currentPrice;
                    
                    return (
                      <motion.div
                        key={comp.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 bg-bg-primary rounded-lg border border-border-color/50 hover:border-[#A855F7]/30 transition-all"
                      >
                        {/* 酒店名称和距离 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-text-primary text-sm">{comp.name}</div>
                          <div className="text-xs text-text-muted">{comp.distance}km</div>
                        </div>
                        
                        {/* 价格区间 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-text-secondary">
                            {hasRoomTypes ? `${roomTypes.length}种房型` : '标准房'}
                          </div>
                          <div className="text-right">
                            {minPrice === maxPrice ? (
                              <div className="font-mono text-[#00F0FF] font-bold">¥{minPrice}</div>
                            ) : (
                              <div className="font-mono text-[#00F0FF] font-bold text-sm">
                                ¥{minPrice}<span className="text-text-muted text-xs">起</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 房型价格标签 */}
                        {hasRoomTypes && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {roomTypes.slice(0, 3).map((room, idx) => (
                              <span 
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-color/50"
                              >
                                {room.name.length > 6 ? room.name.slice(0, 6) + '...' : room.name} ¥{room.price}
                              </span>
                            ))}
                            {roomTypes.length > 3 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary text-text-muted">
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
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <span>图例：</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#00F0FF]" />
            <span>本酒店</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>高影响</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#FFB800]" />
            <span>中影响</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#00E396]" />
            <span>低影响</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#A855F7]" />
            <span>竞品</span>
          </div>
        </div>
      </div>
    </div>
  );
}
