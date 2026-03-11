/**
 * Shadow-Bees V52 - 市场情报页面（重构优化版）
 * 包含：事件情报 + 竞品分析（通过左侧导航切换）
 * 优化内容：
 * 1. 事件情报增加日历视图
 * 2. 竞品分析增加价格趋势图、热力图
 * 3. 统一时间选择器样式
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, MapPin,
  Navigation, Radio,
  Info,
  Bed,
  Calendar,
  Target, Flame, Zap, Circle,
  Building2
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { RadarMap } from '@/components/market/RadarMap';
import { 
  generateFuturePricingData,
  getEventImpactColor
} from '@/utils/pricingEngine';
import { generateHotelsByTier } from '@/utils/competitorDataGenerator';

// ============================================
// 分段控制器组件（滑动指示器）
// ============================================

interface SegmentedControlProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    icon?: React.ReactNode;
  }[];
  size?: 'sm' | 'md';
}

function SegmentedControl<T extends string | number>({ 
  value, 
  onChange, 
  options,
  size = 'md'
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex(opt => opt.value === value);
  
  const isSmall = size === 'sm';

  return (
    <div 
      className={`relative inline-flex items-center bg-bg-primary rounded-xl border border-border-color ${isSmall ? 'p-1' : 'p-1.5'}`}
    >
      {/* 滑动背景指示器 */}
      <motion.div
        className="absolute rounded-lg bg-border-color shadow-lg"
        layoutId="segmented-indicator"
        initial={false}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 35,
          mass: 0.8
        }}
        style={{
          left: isSmall ? '4px' : '6px',
          top: isSmall ? '4px' : '6px',
          bottom: isSmall ? '4px' : '6px',
          width: `calc((100% - ${isSmall ? '8px' : '12px'} - ${(options.length - 1) * (isSmall ? 2 : 4)}px) / ${options.length})`,
        }}
        animate={{
          x: `calc(${activeIndex} * (100% + ${isSmall ? 2 : 4}px))`,
        }}
      />
      
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`
            relative z-10 flex items-center justify-center gap-2 rounded-lg transition-colors duration-200
            ${isSmall ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'}
            ${value === option.value ? 'text-text-primary font-medium' : 'text-text-secondary hover:text-gray-200'}
          `}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// 今日/未来标签切换组件
// ============================================

function TimeRangeSwitch({ 
  activeRange, 
  onRangeChange,
  options = [7, 14, 30]
}: { 
  activeRange: 7 | 14 | 30; 
  onRangeChange: (range: 7 | 14 | 30) => void;
  options?: (7 | 14 | 30)[];
}) {
  const rangeOptions = options.map(range => ({
    value: range,
    label: `${range}天`,
  }));

  return (
    <SegmentedControl
      value={activeRange}
      onChange={onRangeChange}
      options={rangeOptions}
      size="sm"
    />
  );
}

// ============================================
// 事件日历视图组件
// ============================================

function EventCalendarView({ events }: { events: any[] }) {
  // 生成当月日历数据
  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: number; events: any[]; isToday: boolean }> = [];
    
    // 填充空白（月初前的空位）
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: 0, events: [], isToday: false });
    }
    
    // 填充日期
    for (let date = 1; date <= daysInMonth; date++) {
      const currentDateStr = new Date(year, month, date).toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.date === currentDateStr);
      days.push({
        date,
        events: dayEvents,
        isToday: date === today.getDate(),
      });
    }
    
    return days;
  }, [events]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#00F0FF]" />
          事件日历
        </h3>
        <span className="text-sm text-text-muted">
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月
        </span>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm text-text-muted py-2">
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
                ? 'bg-[#00F0FF]/10 border-[#00F0FF]/50'
                : 'bg-bg-primary border-border-color/50 hover:border-border-color'
            }`}
          >
            {day.date > 0 && (
              <>
                <div className={`text-sm mb-1 ${day.isToday ? 'text-[#00F0FF] font-bold' : 'text-text-secondary'}`}>
                  {day.date}
                </div>
                <div className="space-y-1">
                  {day.events.map((event, eidx) => {
                    const { bg, text } = getEventImpactColor(event.intensity);
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
                    <div className="text-[10px] text-text-muted/70">无事件</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-color">
        <span className="text-xs text-text-muted">影响等级：</span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          高影响
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
          中影响
        </span>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          低影响
        </span>
      </div>
    </div>
  );
}

// ============================================
// 竞品价格趋势图表组件
// ============================================

function PriceTrendChart({ data }: { data: Array<{ date: string; price: number; ourPrice: number }> }) {
  if (data.length === 0) return null;

  const maxPrice = Math.max(...data.map(d => Math.max(d.price, d.ourPrice)));
  const minPrice = Math.min(...data.map(d => Math.min(d.price, d.ourPrice)));
  const range = maxPrice - minPrice || 1;

  // 计算价格差异
  const priceDiff = data.map(d => ({
    ...d,
    diff: d.ourPrice - d.price,
    diffPercent: d.price > 0 ? ((d.ourPrice - d.price) / d.price * 100).toFixed(1) : '0',
  }));

  return (
    <div className="space-y-4">
      {/* 折线图 */}
      <div className="relative h-64 bg-bg-primary rounded-lg border border-border-color/50 p-4">
        <svg className="w-full h-full" viewBox={`0 0 ${data.length * 40} 200`} preserveAspectRatio="none">
          {/* 网格线 */}
          {[0, 50, 100, 150, 200].map(y => (
            <line key={y} x1="0" y1={y} x2={data.length * 40} y2={y} stroke="#2D3A55" strokeWidth="1" strokeDasharray="4" />
          ))}

          {/* 竞品价格线（紫色） */}
          <polyline
            fill="none"
            stroke="#A855F7"
            strokeWidth="2"
            points={data.map((d, i) => {
              const y = 200 - ((d.price - minPrice) / range) * 180 - 10;
              return `${i * 40 + 20},${y}`;
            }).join(' ')}
          />

          {/* 我们的价格线（青色） */}
          <polyline
            fill="none"
            stroke="#00F0FF"
            strokeWidth="2"
            points={data.map((d, i) => {
              const y = 200 - ((d.ourPrice - minPrice) / range) * 180 - 10;
              return `${i * 40 + 20},${y}`;
            }).join(' ')}
          />

          {/* 数据点 */}
          {data.map((d, i) => {
            const y1 = 200 - ((d.price - minPrice) / range) * 180 - 10;
            const y2 = 200 - ((d.ourPrice - minPrice) / range) * 180 - 10;
            return (
              <g key={i}>
                <circle cx={i * 40 + 20} cy={y1} r="4" fill="#A855F7" />
                <circle cx={i * 40 + 20} cy={y2} r="4" fill="#00F0FF" />
              </g>
            );
          })}
        </svg>

        {/* Y轴标签 */}
        <div className="absolute left-2 top-4 bottom-4 flex flex-col justify-between text-[10px] text-text-muted">
          <span>¥{maxPrice}</span>
          <span>¥{Math.round((maxPrice + minPrice) / 2)}</span>
          <span>¥{minPrice}</span>
        </div>
      </div>

      {/* 价格差异分析 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="text-xs text-text-muted mb-1">平均价差</div>
          <div className={`text-lg font-bold ${
            priceDiff.reduce((a, b) => a + b.diff, 0) / priceDiff.length > 0 
              ? 'text-[#00E396]' : 'text-red-400'
          }`}>
            {priceDiff.reduce((a, b) => a + b.diff, 0) / priceDiff.length > 0 ? '+' : ''}
            ¥{Math.round(priceDiff.reduce((a, b) => a + b.diff, 0) / priceDiff.length)}
          </div>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="text-xs text-text-muted mb-1">最高溢价</div>
          <div className="text-lg font-bold text-[#FFB800]">
            +¥{Math.max(...priceDiff.map(d => d.diff))}
          </div>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 border border-border-color/50">
          <div className="text-xs text-text-muted mb-1">价格优势天数</div>
          <div className="text-lg font-bold text-[#00F0FF]">
            {priceDiff.filter(d => d.diff <= 0).length}天
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 事件情报标签页（集成雷达+日历+列表）
// ============================================

function EventIntelligenceTab() {
  const { events, currentHotel, competitors, currentRoomType, inventory } = useUnifiedStore();
  const [monitorRadius, setMonitorRadius] = useState(5);
  const [viewMode, setViewMode] = useState<'today' | 'future'>('today');
  const [viewRange, setViewRange] = useState<7 | 14 | 30>(7);
  const [eventViewType, setEventViewType] = useState<'radar' | 'calendar'>('radar');

  // 今日事件数据
  const today = new Date().toISOString().split('T')[0];
  
  // 扩展事件数据（今日模式）
  const extendedEvents = useMemo(() => {
    const baseEvents = events.map(e => ({
      ...e,
      distance: Math.floor(Math.random() * Math.min(monitorRadius, 10) * 1000) + 200,
      status: 'active' as const,
      impact: e.intensity === 'high' ? '需求激增' : e.intensity === 'medium' ? '需求上升' : '影响较小',
    }));
    
    // 根据半径动态生成周边事件
    const nearbyEvents = [];
    if (monitorRadius > 1) {
      nearbyEvents.push({ 
        id: 'nearby-1', 
        name: '地铁站施工', 
        type: 'transport', 
        intensity: 'medium' as const, 
        distance: 800, 
        date: today, 
        status: 'active' as const, 
        description: '周边交通受影响', 
        impact: '-5%预期入住' 
      });
    }
    if (monitorRadius > 3) {
      nearbyEvents.push({ 
        id: 'nearby-2', 
        name: '商场开业', 
        type: 'social', 
        intensity: 'high' as const,
        distance: 2500, 
        date: today, 
        status: 'active' as const,
        description: '大型商场开业，人流增加', 
        impact: '+15%潜在客源' 
      });
    }
    if (monitorRadius > 10) {
      nearbyEvents.push({ 
        id: 'nearby-3', 
        name: '演唱会', 
        type: 'entertainment', 
        intensity: 'high' as const,
        distance: 15000, 
        date: today, 
        status: 'active' as const,
        description: '大型演唱会活动', 
        impact: '+30%需求激增' 
      });
    }
    
    return [...baseEvents, ...nearbyEvents];
  }, [events, monitorRadius, today]);

  // 未来事件预测数据
  const futureEventData = useMemo(() => {
    return generateFuturePricingData(
      viewRange,
      competitors,
      events,
      currentRoomType,
      inventory?.calendar || null
    );
  }, [viewRange, competitors, events, currentRoomType, inventory?.calendar]);

  // 扩展竞品数据 - 根据半径动态生成更多远处竞品
  const extendedCompetitors = useMemo(() => {
    const baseCompetitors = [...competitors];
    const ourBasePrice = currentRoomType 
      ? Math.round((currentRoomType.floorPrice + currentRoomType.ceilingPrice) / 2)
      : 350;
    
    const additionalCompetitors = [];
    
    if (monitorRadius > 3) {
      additionalCompetitors.push(
        { id: 'ext-1', name: '如家精选', distance: 3.5, currentPrice: Math.round(ourBasePrice * 0.75), status: 'normal' as const, brand: '如家' },
        { id: 'ext-2', name: '汉庭酒店', distance: 4.2, currentPrice: Math.round(ourBasePrice * 0.8), status: 'available' as const, brand: '汉庭' },
      );
    }
    
    if (monitorRadius > 5) {
      additionalCompetitors.push(
        { id: 'ext-3', name: '7天连锁', distance: 6.0, currentPrice: Math.round(ourBasePrice * 0.7), status: 'available' as const, brand: '7天' },
        { id: 'ext-4', name: '亚朵轻居', distance: 7.5, currentPrice: Math.round(ourBasePrice * 1.1), status: 'tight' as const, brand: '亚朵' },
      );
    }
    
    return [...baseCompetitors, ...additionalCompetitors];
  }, [competitors, monitorRadius, currentRoomType]);

  // 计算未来高影响事件数量
  const futureHighImpactCount = useMemo(() => {
    return futureEventData.filter(d => d.events.some(e => e.intensity === 'high')).length;
  }, [futureEventData]);

  return (
    <div className="space-y-6">
      {/* 页面标题 + 今日/未来切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">事件情报</h1>
          <p className="text-sm text-text-muted mt-1">
            实时监测商圈事件动态，AI预测未来影响并指导定价决策
          </p>
        </div>
        
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'today', label: '实时监测', icon: <Radio size={14} /> },
            { value: 'future', label: '趋势预测', icon: <Calendar size={14} /> },
          ]}
          size="md"
        />
      </div>

      {viewMode === 'today' ? (
        <>
          {/* 视图切换：雷达图 / 日历 */}
          <div className="flex items-center justify-between bg-bg-secondary rounded-xl border border-border-color p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">查看方式：</span>
              <div className="flex items-center gap-1 bg-bg-primary rounded-lg p-1">
                <button
                  onClick={() => setEventViewType('radar')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    eventViewType === 'radar'
                      ? 'bg-border-color text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Navigation size={14} />
                  雷达地图
                </button>
                <button
                  onClick={() => setEventViewType('calendar')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    eventViewType === 'calendar'
                      ? 'bg-border-color text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Calendar size={14} />
                  事件日历
                </button>
              </div>
            </div>
            <div className="text-xs text-text-muted">
              监测范围：{monitorRadius}km
            </div>
          </div>

          {eventViewType === 'radar' ? (
            /* 雷达地图视图 */
            <RadarMap
              hotelName={currentHotel.name}
              events={extendedEvents}
              competitors={extendedCompetitors}
              maxRadius={currentHotel.location.monitoringRadius}
              onRadiusChange={setMonitorRadius}
            />
          ) : (
            /* 事件日历视图 */
            <EventCalendarView events={extendedEvents} />
          )}

          {/* 底部补充：情报汇总卡片 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <Radio className="w-4 h-4" />
                <span className="text-sm font-medium">高影响事件</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">
                {extendedEvents.filter(e => e.intensity === 'high' && e.distance <= monitorRadius * 1000).length}
              </div>
              <div className="text-xs text-text-muted mt-1">建议关注并调价</div>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center gap-2 text-[#FFB800] mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">竞品动态</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">
                {extendedCompetitors.filter(c => c.distance <= monitorRadius).length}
              </div>
              <div className="text-xs text-text-muted mt-1">{monitorRadius}km范围内</div>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center gap-2 text-[#00E396] mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">监测范围</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">{monitorRadius}km</div>
              <div className="text-xs text-text-muted mt-1">最大{currentHotel.location.monitoringRadius}km</div>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center gap-2 text-[#00F0FF] mb-2">
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">情报状态</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">
                {extendedEvents.filter(e => e.distance <= monitorRadius * 1000).length > 0 ? '活跃' : '平静'}
              </div>
              <div className="text-xs text-text-muted mt-1">实时监测中</div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 未来事件预测视图 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">事件趋势预测</h3>
                <TimeRangeSwitch activeRange={viewRange} onRangeChange={setViewRange} />
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> 高影响
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 中影响
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> 低影响
                </span>
              </div>
            </div>

            {/* 事件日期网格 */}
            <div className="grid grid-cols-7 gap-3">
              {futureEventData.map((dateInfo, idx) => (
                <motion.div
                  key={dateInfo.dateStr}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`relative p-3 rounded-xl border ${
                    dateInfo.inventoryStatus?.border || 'border-border-color'
                  } ${dateInfo.inventoryStatus?.bg || 'bg-bg-primary'} hover:border-[#00F0FF]/50 transition-all`}
                >
                  {/* 日期头部 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${dateInfo.isWeekend ? 'text-[#A855F7]' : 'text-text-primary'}`}>
                      {dateInfo.display}
                    </span>
                    <span className="text-xs text-text-muted">{dateInfo.weekday}</span>
                  </div>
                  
                  {/* 价格乘数 */}
                  <div className="mb-2">
                    <div className="text-xs text-text-muted mb-1">价格系数</div>
                    <div className={`text-lg font-mono font-bold ${
                      dateInfo.priceMultiplier > 1.2 ? 'text-red-400' : 
                      dateInfo.priceMultiplier > 1.1 ? 'text-yellow-400' : 'text-[#00F0FF]'
                    }`}>
                      {dateInfo.priceMultiplier.toFixed(2)}x
                    </div>
                  </div>
                  
                  {/* AI建议价 */}
                  <div className="mb-2">
                    <div className="text-xs text-text-muted mb-1">AI建议价</div>
                    <div className="text-xl font-mono font-bold text-[#00E396]">
                      ¥{dateInfo.aiSuggestion}
                    </div>
                  </div>
                  
                  {/* 事件标记 */}
                  {dateInfo.events.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {dateInfo.events.map((e, i) => {
                        const { bg, text, iconKey } = getEventImpactColor(e.intensity);
                        const Icon = iconKey === 'flame' ? Flame : iconKey === 'zap' ? Zap : Circle;
                        return (
                          <span 
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${bg} ${text} flex items-center gap-0.5`}
                            title={e.name}
                          >
                            <Icon size={8} /> {e.name.slice(0, 4)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  {dateInfo.events.length === 0 && (
                    <div className="text-xs text-text-muted/70 mt-2">无特殊事件</div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* 预测汇总 */}
            <div className="mt-6 grid grid-cols-4 gap-4 pt-6 border-t border-border-color">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{futureHighImpactCount}</div>
                <div className="text-xs text-text-muted mt-1">高影响事件天数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00F0FF]">
                  {futureEventData.filter(d => d.isWeekend).length}
                </div>
                <div className="text-xs text-text-muted mt-1">周末天数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00E396]">
                  ¥{Math.round(futureEventData.reduce((a, b) => a + b.aiSuggestion, 0) / futureEventData.length)}
                </div>
                <div className="text-xs text-text-muted mt-1">平均建议价</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FFB800]">
                  {Math.max(...futureEventData.map(d => d.aiSuggestion))}%
                </div>
                <div className="text-xs text-text-muted mt-1">最高涨幅</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// 竞品分析标签页（高中低分档 + 房型映射）
// ============================================

function CompetitorAnalysisTab() {
  const { currentHotel, currentRoomType, switchRoomType, competitors, events, inventory, pricing } = useUnifiedStore();
  const [activeTier, setActiveTier] = useState<'economy' | 'comfort' | 'premium'>('comfort');
  const [viewMode, setViewMode] = useState<'today' | 'future'>('today');
  const [viewRange, setViewRange] = useState<7 | 14 | 30>(7);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // 获取按档次分组的完整酒店数据（唯一数据源）
  const hotelsByTier = useMemo(() => {
    if (!currentHotel) return { economy: [], comfort: [], premium: [] };
    return generateHotelsByTier(currentHotel.id, todayStr, events);
  }, [currentHotel?.id, todayStr, events]);
  
  // 计算每个档次的统计信息（家数、距离范围、各房型价格范围）
  const getTierSummary = (tier: 'economy' | 'comfort' | 'premium') => {
    const hotels = hotelsByTier[tier];
    if (hotels.length === 0) return { 
      count: 0, minDist: 0, maxDist: 0,
      budget: { min: 0, max: 0 },
      standard: { min: 0, max: 0 },
      suite: { min: 0, max: 0 },
    };
    const distances = hotels.map(h => h.distance);
    
    // 计算各房型的实际价格范围
    const budgetPrices = hotels.map(h => h.prices.budget?.price).filter((p): p is number => p !== undefined);
    const standardPrices = hotels.map(h => h.prices.standard?.price).filter((p): p is number => p !== undefined);
    const suitePrices = hotels.map(h => h.prices.suite?.price).filter((p): p is number => p !== undefined);
    
    return {
      count: hotels.length,
      minDist: Math.min(...distances),
      maxDist: Math.max(...distances),
      budget: budgetPrices.length > 0 ? { min: Math.min(...budgetPrices), max: Math.max(...budgetPrices) } : { min: 0, max: 0 },
      standard: standardPrices.length > 0 ? { min: Math.min(...standardPrices), max: Math.max(...standardPrices) } : { min: 0, max: 0 },
      suite: suitePrices.length > 0 ? { min: Math.min(...suitePrices), max: Math.max(...suitePrices) } : { min: 0, max: 0 },
    };
  };
  
  const economySummary = getTierSummary('economy');
  const comfortSummary = getTierSummary('comfort');
  const premiumSummary = getTierSummary('premium');
  
  // 获取当前选中档次的酒店列表
  const currentTierHotels = hotelsByTier[activeTier];
  
  // 未来竞品数据
  const futurePricingData = useMemo(() => {
    return generateFuturePricingData(
      viewRange,
      competitors,
      events,
      currentRoomType,
      inventory?.calendar || null
    );
  }, [viewRange, competitors, events, currentRoomType, inventory?.calendar]);

  // 计算未来竞品均价趋势
  const futureCompetitorTrend = useMemo(() => {
    if (!futurePricingData.length) return [];
    return futurePricingData.map(d => ({
      date: d.display,
      price: d.competitorAvg,
      ourPrice: d.aiSuggestion
    }));
  }, [futurePricingData]);

  // 判断当前房型类型
  const getOurRoomTypeCategory = (): 'budget' | 'standard' | 'suite' => {
    if (!currentRoomType) return 'standard';
    const roomName = currentRoomType.name.toLowerCase();
    if (roomName.includes('经济') || roomName.includes('特价') || roomName.includes('无窗') || roomName.includes('青旅') || roomName.includes('床位')) return 'budget';
    if (roomName.includes('豪华') || roomName.includes('套房') || roomName.includes('观景') || roomName.includes('全景')) return 'suite';
    return 'standard';
  };

  const ourRoomCategory = getOurRoomTypeCategory();

  return (
    <div className="space-y-6">
      {/* 页面标题 + 今日/未来切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">竞品分析</h1>
          <p className="text-sm text-text-muted mt-1">
            实时监测周边竞品价格与房态，AI预测未来价格走势
          </p>
        </div>
        
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'today', label: '实时监测', icon: <TrendingUp size={14} /> },
            { value: 'future', label: '趋势预测', icon: <Calendar size={14} /> },
          ]}
          size="md"
        />
      </div>

      {viewMode === 'today' ? (
        <>
          {/* 房型价格矩阵（核心：可点击展示详情） */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00F0FF]" />
              竞品房型价格矩阵
              <span className="text-xs text-text-muted font-normal">实时监测 · {currentHotel?.location?.monitoringRadius || 5}km范围内</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="text-left py-3 px-4 text-sm text-text-secondary font-medium">档次</th>
                    <th className="text-center py-3 px-4 text-sm text-text-secondary font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Bed className="w-4 h-4" />
                        经济房
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm text-text-secondary font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Bed className="w-4 h-4" />
                        标准房
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 text-sm text-text-secondary font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Bed className="w-4 h-4" />
                        套房
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* 我的酒店 - 基准参照行 - 动态获取房型并实时同步 pricing.roomBasePrices */}
                  {(() => {
                    // 动态匹配三个房型
                    const economyRoom = currentHotel?.roomTypes?.find(r => r.name.includes('经济'));
                    const standardRoom = currentHotel?.roomTypes?.find(r => !r.name.includes('经济') && !r.name.includes('套房'));
                    const suiteRoom = currentHotel?.roomTypes?.find(r => r.name.includes('套房'));
                    
                    // 从 pricing.roomBasePrices 读取价格，实时同步
                    const economyPrice = economyRoom && pricing?.roomBasePrices?.[economyRoom.id] !== undefined
                      ? pricing.roomBasePrices[economyRoom.id]
                      : Math.round((economyRoom?.floorPrice || 200 + (economyRoom?.ceilingPrice || 300)) / 2);
                    const standardPrice = standardRoom && pricing?.roomBasePrices?.[standardRoom.id] !== undefined
                      ? pricing.roomBasePrices[standardRoom.id]
                      : Math.round((standardRoom?.floorPrice || 300 + (standardRoom?.ceilingPrice || 400)) / 2);
                    const suitePrice = suiteRoom && pricing?.roomBasePrices?.[suiteRoom.id] !== undefined
                      ? pricing.roomBasePrices[suiteRoom.id]
                      : Math.round((suiteRoom?.floorPrice || 500 + (suiteRoom?.ceilingPrice || 700)) / 2);
                    
                    return (
                      <tr className="border-b-2 border-[#FFB800]/30 bg-[#FFB800]/5">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                              <Building2 size={16} className="text-[#FFB800]" />
                            </div>
                            <div>
                              <div className="text-[#FFB800] font-bold">我的酒店</div>
                              <div className="text-xs text-[#FFB800]/70">基准参照</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="text-xl font-mono font-bold text-[#FFB800]">
                            ¥{economyPrice}
                          </div>
                          <div className="text-xs text-[#FFB800]/70">{economyRoom?.name || '经济房'}</div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="text-xl font-mono font-bold text-[#FFB800]">
                            ¥{standardPrice}
                          </div>
                          <div className="text-xs text-[#FFB800]/70">{standardRoom?.name || '标准房'}</div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="text-xl font-mono font-bold text-[#FFB800]">
                            ¥{suitePrice}
                          </div>
                          <div className="text-xs text-[#FFB800]/70">{suiteRoom?.name || '套房'}</div>
                        </td>
                      </tr>
                    );
                  })()}
                  
                  {/* 低一档 - 可点击 */}
                  <tr 
                    className={`border-b border-border-color/50 cursor-pointer transition-all hover:bg-green-500/5 ${activeTier === 'economy' ? 'bg-green-500/10' : ''}`}
                    onClick={() => setActiveTier('economy')}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <div className="text-text-primary font-medium">低一档（经济型）</div>
                          <div className="text-xs text-green-400">{economySummary.count}家酒店 · {economySummary.minDist}-{economySummary.maxDist}km</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-green-400">
                        ¥{economySummary.budget.min}-¥{economySummary.budget.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {economySummary.count > 0 ? (
                          <>
                            {economySummary.count}家酒店
                          </>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-green-400">
                        ¥{economySummary.standard.min}-¥{economySummary.standard.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {economySummary.count > 0 ? (
                          <>
                            {economySummary.count}家酒店
                          </>
                        ) : '-'}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-green-400">
                        {economySummary.suite.min > 0 ? `¥${economySummary.suite.min}-¥${economySummary.suite.max}` : '-'}
                      </div>
                      <div className="text-xs text-text-muted">
                        {economySummary.suite.min > 0 ? `${economySummary.count}家酒店` : '无此房型'}
                      </div>
                    </td>
                  </tr>
                  
                  {/* 同档次 - 可点击（我们对标）- 显著高亮 */}
                  <tr 
                    className={`border-b border-border-color/50 cursor-pointer transition-all hover:bg-[#00F0FF]/10 border-l-4 ${activeTier === 'comfort' ? 'border-l-[#00F0FF] bg-[#00F0FF]/10' : 'border-l-[#00F0FF]/50 bg-[#00F0FF]/5'}`}
                    onClick={() => setActiveTier('comfort')}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#00F0FF]/20 rounded-md">
                          <Target className="w-3.5 h-3.5 text-[#00F0FF]" />
                          <span className="text-xs font-semibold text-[#00F0FF]">参考</span>
                        </div>
                        <div>
                          <div className="text-text-primary font-bold">同档次（舒适型）</div>
                          <div className="text-xs text-[#00F0FF]">{comfortSummary.count}家酒店 · {comfortSummary.minDist}-{comfortSummary.maxDist}km</div>
                        </div>
                      </div>
                    </td>
                    <td className={`text-center py-4 px-4 ${ourRoomCategory === 'budget' ? 'border border-[#00F0FF]/30 rounded-lg' : ''}`}>
                      <div className="text-lg font-mono font-bold text-[#00F0FF]">
                        ¥{comfortSummary.budget.min}-¥{comfortSummary.budget.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {comfortSummary.count}家酒店
                      </div>
                    </td>
                    <td className={`text-center py-4 px-4 ${ourRoomCategory === 'standard' ? 'border border-[#00F0FF]/30 rounded-lg' : ''}`}>
                      <div className="text-lg font-mono font-bold text-[#00F0FF]">
                        ¥{comfortSummary.standard.min}-¥{comfortSummary.standard.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {comfortSummary.count}家酒店
                      </div>
                    </td>
                    <td className={`text-center py-4 px-4 ${ourRoomCategory === 'suite' ? 'border border-[#00F0FF]/30 rounded-lg' : ''}`}>
                      <div className="text-lg font-mono font-bold text-[#00F0FF]">
                        ¥{comfortSummary.suite.min}-¥{comfortSummary.suite.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {comfortSummary.count}家酒店
                      </div>
                    </td>
                  </tr>
                  
                  {/* 高一档 - 可点击 */}
                  <tr 
                    className={`cursor-pointer transition-all hover:bg-purple-500/5 ${activeTier === 'premium' ? 'bg-purple-500/10' : ''}`}
                    onClick={() => setActiveTier('premium')}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <div>
                          <div className="text-text-primary font-medium">高一档（高档型）</div>
                          <div className="text-xs text-purple-400">{premiumSummary.count}家酒店 · {premiumSummary.minDist}-{premiumSummary.maxDist}km</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-purple-400">-</div>
                      <div className="text-xs text-text-muted">无此房型</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-purple-400">
                        ¥{premiumSummary.standard.min}-¥{premiumSummary.standard.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {premiumSummary.count}家酒店
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-lg font-mono font-bold text-purple-400">
                        ¥{premiumSummary.suite.min}-¥{premiumSummary.suite.max}
                      </div>
                      <div className="text-xs text-text-muted">
                        {premiumSummary.count}家酒店
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* 提示文字 */}
            <div className="mt-4 text-xs text-text-muted text-center">
              点击上方档次行可查看该档次酒店详情
            </div>
          </div>

          {/* 当前选中档次的酒店列表 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
            {/* 标题：▼ 低一档酒店（经济型，3公里内X家） */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-color/50">
              <span className="text-lg">▼</span>
              <h3 className="font-semibold text-text-primary">
                {activeTier === 'economy' ? '低一档酒店（经济型' : activeTier === 'premium' ? '高一档酒店（高档型' : '同档次酒店（舒适型'}
                ，3公里内{currentTierHotels.length}家）
              </h3>
            </div>

            {currentTierHotels.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {currentTierHotels.map((hotel, idx) => (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="pl-4 border-l-2 border-border-color hover:border-[#00F0FF]/50 transition-all"
                  >
                    {/* 酒店名称和距离 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-text-primary font-medium">{hotel.name}</span>
                      <span className="text-xs text-text-muted">（{hotel.distance}km）</span>
                    </div>
                    
                    {/* 三个房型价格 */}
                    <div className="flex items-center gap-6 mb-2 text-sm">
                      {hotel.prices.budget && (
                        <span className={hotel.prices.budget.status === 'soldout' ? 'text-text-muted line-through' : 'text-green-400'}>
                          经济房：¥{hotel.prices.budget.price}
                        </span>
                      )}
                      {hotel.prices.standard && (
                        <span className={hotel.prices.standard.status === 'soldout' ? 'text-text-muted line-through' : 'text-[#00F0FF]'}>
                          标准房：¥{hotel.prices.standard.price}
                        </span>
                      )}
                      {hotel.prices.suite && (
                        <span className={hotel.prices.suite.status === 'soldout' ? 'text-text-muted line-through' : 'text-purple-400'}>
                          套房：¥{hotel.prices.suite.price}
                        </span>
                      )}
                    </div>

                    {/* 平台价格按钮 */}
                    <div className="flex items-center gap-2">
                      {['携程', '美团', '高德', '飞猪'].map((platform) => {
                        // 获取该酒店的主价格（有标准房用标准房，否则用第一个有价格的房型）
                        const mainPrice = hotel.prices.standard?.price 
                          || hotel.prices.budget?.price 
                          || hotel.prices.suite?.price 
                          || 0;
                        // 平台价格略有差异（±10元）
                        const platformPrice = mainPrice + (platform === '携程' ? 5 : platform === '美团' ? 0 : platform === '高德' ? -5 : -2);
                        return (
                          <span
                            key={platform}
                            className="px-2 py-1 rounded text-xs bg-bg-primary border border-border-color text-text-secondary hover:border-[#00F0FF]/30 hover:text-text-primary transition-all cursor-pointer"
                          >
                            {platform}¥{platformPrice}
                          </span>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-bg-primary rounded-lg border border-border-color/50 text-center text-text-muted">
                <Info size={48} className="mx-auto mb-4 opacity-30" />
                <p>该档次暂无竞品数据</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 房型切换 - 未来视图 */}
          <div className="flex items-center justify-between bg-bg-secondary rounded-xl border border-border-color p-4">
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-[#00F0FF]" />
              <span className="text-text-primary font-medium">选择对标房型</span>
              <span className="text-text-muted text-sm">竞品价格预测将根据房型底价/天花板价自动计算</span>
            </div>
            <div className="flex items-center gap-2">
              {currentHotel.roomTypes.map((room) => (
                <button
                  key={room.id}
                  onClick={() => switchRoomType(room.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    room.id === currentRoomType?.id
                      ? 'bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-border-color'
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          {/* 未来竞品预测视图 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">竞品趋势预测</h3>
                <TimeRangeSwitch activeRange={viewRange} onRangeChange={setViewRange} />
              </div>
            </div>

            {/* 价格趋势图表 - 使用折线图 */}
            <PriceTrendChart data={futureCompetitorTrend} />

            {/* 图例 */}
            <div className="flex items-center justify-center gap-6 text-xs mt-6">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                竞品均价
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#00F0FF] rounded-full"></span>
                AI建议价
              </span>
            </div>

            {/* 未来日期网格 */}
            <div className="border-t border-border-color pt-6">
              <h4 className="text-sm font-medium text-text-secondary mb-4">详细预测数据</h4>
              <div className="grid grid-cols-7 gap-3">
                {futurePricingData.slice(0, viewRange <= 14 ? viewRange : 14).map((dateInfo, idx) => (
                  <motion.div
                    key={dateInfo.dateStr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="p-3 rounded-lg bg-bg-primary border border-border-color/50"
                  >
                    <div className="text-xs text-text-muted mb-1">{dateInfo.display}</div>
                    <div className="text-sm font-bold text-purple-400">¥{dateInfo.competitorAvg || '-'}</div>
                    <div className="text-xs text-[#00F0FF]">建议: ¥{dateInfo.aiSuggestion}</div>
                    {dateInfo.events.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {dateInfo.events.slice(0, 2).map((e, i) => {
                          const { iconKey } = getEventImpactColor(e.intensity);
                          const Icon = iconKey === 'flame' ? Flame : iconKey === 'zap' ? Zap : Circle;
                          return <span key={i} className="text-[10px]"><Icon size={8} /></span>;
                        })}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 预测汇总 */}
            <div className="mt-6 grid grid-cols-4 gap-4 pt-6 border-t border-border-color">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  ¥{Math.round(futureCompetitorTrend.reduce((a, b) => a + b.price, 0) / futureCompetitorTrend.length)}
                </div>
                <div className="text-xs text-text-muted mt-1">竞品平均价</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00F0FF]">
                  ¥{Math.round(futurePricingData.reduce((a, b) => a + b.aiSuggestion, 0) / futurePricingData.length)}
                </div>
                <div className="text-xs text-text-muted mt-1">我们建议价</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00E396]">
                  {futurePricingData.filter(d => d.priceMultiplier > 1.15).length}天
                </div>
                <div className="text-xs text-text-muted mt-1">建议提价天数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FFB800]">
                  {Math.max(...futurePricingData.map(d => d.priceMultiplier)).toFixed(2)}x
                </div>
                <div className="text-xs text-text-muted mt-1">最高价格系数</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export default function MarketIntelligence() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  
  // 根据 URL 参数决定显示哪个标签页
  const isCompetitors = tabFromUrl === 'competitors';
  
  return (
    <div className="p-6">
      {isCompetitors ? <CompetitorAnalysisTab /> : <EventIntelligenceTab />}
    </div>
  );
}
