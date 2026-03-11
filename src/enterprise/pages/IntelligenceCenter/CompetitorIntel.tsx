/**
 * 企业版竞品监控 V3 - 保留酒店端精华设计
 * 
 * 架构：
 * 1. 多酒店矩阵：简洁概览，点击进入单酒店
 * 2. 单酒店深度：100%复刻酒店端布局
 *    - 上部：竞品房型价格矩阵（我的酒店+三档对比）
 *    - 下部：选中档次酒店列表+价格趋势
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, BarChart3, Download, Bed,
  Hotel, Grid3X3, List, ChevronLeft, Building2,
  Activity, RefreshCw
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 类型定义
// ============================================
// 四档酒店类型：平价型 < 经济型 < 舒适型 < 高端型
type Tier = 'budget' | 'economy' | 'comfort' | 'premium';
type RoomType = 'budget' | 'standard' | 'suite';
type ViewMode = 'matrix' | 'detail';

// 档次配置：名称、颜色、价格基准
const TIER_CONFIG: Record<Tier, { name: string; color: string; bg: string; border: string; basePrice: number }> = {
  budget: { name: '平价型', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', basePrice: 120 },
  economy: { name: '经济型', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', basePrice: 180 },
  comfort: { name: '舒适型', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', basePrice: 320 },
  premium: { name: '高端型', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', basePrice: 550 },
};

// 档次顺序（用于计算低一档/高一档）
const TIER_ORDER: Tier[] = ['budget', 'economy', 'comfort', 'premium'];

// 获取相对档次（-1=低一档, 0=同档次, 1=高一档）
function getRelativeTier(hotelTier: Tier, offset: -1 | 0 | 1): Tier | null {
  const index = TIER_ORDER.indexOf(hotelTier);
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= TIER_ORDER.length) return null;
  return TIER_ORDER[targetIndex];
}

// 获取档次的显示名称（带相对位置描述）
function getTierDisplayName(hotelTier: Tier, targetTier: Tier): string {
  const hotelIndex = TIER_ORDER.indexOf(hotelTier);
  const targetIndex = TIER_ORDER.indexOf(targetTier);
  const diff = targetIndex - hotelIndex;
  const baseName = TIER_CONFIG[targetTier].name;
  
  if (diff === -1) return `低一档（${baseName}）`;
  if (diff === 0) return `同档次（${baseName} - 参考）`;
  if (diff === 1) return `高一档（${baseName}）`;
  return baseName;
}

interface CompetitorHotel {
  id: string;
  name: string;
  brand: string;
  tier: Tier;
  distance: number;
  prices: Record<RoomType, { price: number; change: number }>;
  occupancyRate: number;
  reviewScore: number;
  status: 'available' | 'normal' | 'tight';
}

interface MyHotelData {
  hotelId: string;
  hotelName: string;
  city: string;
  tier: Tier;
  prices: Record<RoomType, number>;
  ownPrice: number;
  competitors: CompetitorHotel[];
  // 只包含相关三档（低一档/同档次/高一档）
  relevantTiers: { lower: Tier | null; same: Tier; higher: Tier | null };
}

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
    <div className={`relative inline-flex items-center bg-white rounded-xl border border-gray-200 ${isSmall ? 'p-1' : 'p-1.5'} shadow-sm`}>
      <motion.div
        className="absolute rounded-lg bg-violet-100 shadow-sm"
        layoutId="segmented-comp"
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
          } ${value === option.value ? 'text-violet-700 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {option.icon && <span>{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// 模拟数据生成
// ============================================
const roomTypeLabels: Record<RoomType, string> = {
  budget: '经济房',
  standard: '标准房',
  suite: '套房',
};

// 各档次竞品品牌
const TIER_BRANDS: Record<Tier, string[]> = {
  budget: ['99旅馆', '易佰连锁', '海友酒店', '布丁酒店'],
  economy: ['7天连锁', '如家酒店', '汉庭酒店', '锦江之星'],
  comfort: ['全季酒店', '桔子酒店', '亚朵轻居', '星程酒店'],
  premium: ['亚朵酒店', '美居酒店', '开元名庭', '美豪丽致'],
};

function generateCompetitorsByTier(tier: Tier, city: string): CompetitorHotel[] {
  const brands = TIER_BRANDS[tier];
  const basePrice = TIER_CONFIG[tier].basePrice;
  
  return brands.map((brand, idx) => {
    const price = basePrice + (Math.random() - 0.5) * 40;
    return {
      id: `comp-${tier}-${idx}-${city}`,
      name: `${brand}·${city}店`,
      brand,
      tier,
      distance: 0.3 + Math.random() * 2.5,
      prices: {
        budget: { price: Math.round(price * 0.75), change: (Math.random() - 0.5) * 15 },
        standard: { price: Math.round(price), change: (Math.random() - 0.5) * 15 },
        suite: { price: Math.round(price * 1.4), change: (Math.random() - 0.5) * 15 },
      },
      occupancyRate: Math.round(55 + Math.random() * 35),
      reviewScore: 3.6 + Math.random() * 1.2,
      status: Math.random() > 0.75 ? 'tight' : Math.random() > 0.4 ? 'normal' : 'available',
    };
  });
}

// 根据星级判断档次：1-3星=经济型（华美会主要服务区间）, 4星=舒适型, 5星=高端型
// 注意：华美会的酒店都是经济型（2-3星），所以默认返回 economy
function getTierByStarRating(starRating: number): Tier {
  if (starRating >= 5) return 'premium';
  if (starRating >= 4) return 'comfort';
  // 1-3星都属于经济型（如家、汉庭、7天等都是2-3星经济型）
  return 'economy';
}

function generateHotelData(hotel: any): MyHotelData {
  // 根据星级判断档次（华美会的8家都是2星经济型）
  const hotelTier = getTierByStarRating(hotel.starRating || 2);
  const config = TIER_CONFIG[hotelTier];
  
  // 确定相关三档：低一档、同档次、高一档
  const lowerTier = getRelativeTier(hotelTier, -1);
  const higherTier = getRelativeTier(hotelTier, 1);
  
  // 只生成相关三档的竞品
  const competitors: CompetitorHotel[] = [];
  if (lowerTier) competitors.push(...generateCompetitorsByTier(lowerTier, hotel.city));
  competitors.push(...generateCompetitorsByTier(hotelTier, hotel.city)); // 同档次竞品
  if (higherTier) competitors.push(...generateCompetitorsByTier(higherTier, hotel.city));
  
  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    city: hotel.city,
    tier: hotelTier,
    prices: {
      budget: Math.round(config.basePrice * 0.75),
      standard: config.basePrice,
      suite: Math.round(config.basePrice * 1.5),
    },
    ownPrice: config.basePrice,
    competitors,
    relevantTiers: {
      lower: lowerTier,
      same: hotelTier,
      higher: higherTier,
    },
  };
}

// ============================================
// 价格趋势图表
// ============================================
function PriceTrendChart({ data }: { data: any[] }) {
  if (data.length === 0) return null;
  
  const maxPrice = Math.max(...data.map(d => Math.max(d.ourPrice, d.compAvg)));
  const minPrice = Math.min(...data.map(d => Math.min(d.ourPrice, d.compAvg)));
  const range = maxPrice - minPrice || 1;

  return (
    <div className="h-48 bg-gray-50 rounded-xl p-4">
      <svg className="w-full h-full" viewBox={`0 0 ${data.length * 40} 160`} preserveAspectRatio="none">
        {/* 网格线 */}
        {[0, 40, 80, 120, 160].map(y => (
          <line key={y} x1="0" y1={y} x2={data.length * 40} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4" />
        ))}
        
        {/* 竞品价格线 */}
        <polyline
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          points={data.map((d, i) => {
            const y = 160 - ((d.compAvg - minPrice) / range) * 140 - 10;
            return `${i * 40 + 20},${y}`;
          }).join(' ')}
        />
        
        {/* 我们的价格线 */}
        <polyline
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          points={data.map((d, i) => {
            const y = 160 - ((d.ourPrice - minPrice) / range) * 140 - 10;
            return `${i * 40 + 20},${y}`;
          }).join(' ')}
        />
        
        {/* 数据点 */}
        {data.map((d, i) => {
          const y1 = 160 - ((d.compAvg - minPrice) / range) * 140 - 10;
          const y2 = 160 - ((d.ourPrice - minPrice) / range) * 140 - 10;
          return (
            <g key={i}>
              <circle cx={i * 40 + 20} cy={y1} r="3" fill="#8B5CF6" />
              <circle cx={i * 40 + 20} cy={y2} r="3" fill="#F59E0B" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================
// 视图：单酒店深度竞品分析（100%复刻酒店端）
// ============================================
function SingleHotelCompetitorView({ 
  hotelData, 
  onBack 
}: { 
  hotelData: MyHotelData; 
  onBack: () => void;
}) {
  // 默认选中同档次（参考）
  const [activeTier, setActiveTier] = useState<Tier>(hotelData.relevantTiers.same);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14);

  // 获取相关三档
  const { lower: lowerTier, same: sameTier, higher: higherTier } = hotelData.relevantTiers;
  const relevantTierList = [lowerTier, sameTier, higherTier].filter(Boolean) as Tier[];

  // 按档次分组竞品（只包含相关三档）
  const tierCompetitors = useMemo(() => {
    const grouped: Partial<Record<Tier, CompetitorHotel[]>> = {};
    relevantTierList.forEach(tier => {
      grouped[tier] = hotelData.competitors.filter(c => c.tier === tier);
    });
    return grouped as Record<Tier, CompetitorHotel[]>;
  }, [hotelData.competitors, hotelData.relevantTiers]);

  // 当前选中的竞品列表
  const currentCompetitors = tierCompetitors[activeTier] || [];

  // 计算各档统计数据
  const tierStats = useMemo(() => {
    const stats: Partial<Record<Tier, { count: number; minPrice: number; maxPrice: number; minDist: number; maxDist: number }>> = {};
    
    relevantTierList.forEach(tier => {
      const comps = tierCompetitors[tier] || [];
      if (comps.length === 0) {
        stats[tier] = { count: 0, minPrice: 0, maxPrice: 0, minDist: 0, maxDist: 0 };
        return;
      }
      
      const prices = comps.flatMap(c => [c.prices.budget.price, c.prices.standard.price, c.prices.suite.price]);
      const distances = comps.map(c => c.distance);
      
      stats[tier] = {
        count: comps.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        minDist: Math.min(...distances),
        maxDist: Math.max(...distances),
      };
    });
    
    return stats as Record<Tier, { count: number; minPrice: number; maxPrice: number; minDist: number; maxDist: number }>;
  }, [tierCompetitors, hotelData.relevantTiers]);

  // 趋势数据（基于当前选中的竞品档次）
  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    let ourPrice = hotelData.prices.standard;
    // 竞品均价基于当前选中的档次
    const activeTierStats = tierStats[activeTier];
    let compAvg = activeTierStats?.count > 0 
      ? (activeTierStats.minPrice + activeTierStats.maxPrice) / 2 
      : hotelData.prices.standard * 1.1;
    
    for (let i = timeRange; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      ourPrice += (Math.random() - 0.5) * 30;
      compAvg += (Math.random() - 0.5) * 25;
      data.push({ 
        date: `${date.getMonth() + 1}/${date.getDate()}`, 
        ourPrice: Math.round(ourPrice), 
        compAvg: Math.round(compAvg),
      });
    }
    return data;
  }, [timeRange, hotelData.prices.standard, activeTier, tierStats]);

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />返回多酒店视图
        </button>
        <div className="h-6 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-600" />
          <h2 className="text-xl font-bold text-gray-900">{hotelData.hotelName}</h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">{hotelData.city}</span>
        </div>
      </div>

      {/* 竞品房型价格矩阵 - 核心组件（100%复刻酒店端） */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-600" />
          竞品房型价格矩阵
          <span className="text-xs text-gray-500 font-normal">实时监测 · 3km范围内</span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm text-gray-500 font-medium whitespace-nowrap">档次</th>
                <th className="text-center py-3 px-2 text-sm text-gray-500 font-medium whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1"><Bed className="w-4 h-4" />经济房</div>
                </th>
                <th className="text-center py-3 px-2 text-sm text-gray-500 font-medium whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1"><Bed className="w-4 h-4" />标准房</div>
                </th>
                <th className="text-center py-3 px-2 text-sm text-gray-500 font-medium whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1"><Bed className="w-4 h-4" />套房</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 我的酒店 - 金色高亮参照行 */}
              <tr className="border-b-2 border-amber-300 bg-amber-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
                      <Hotel size={16} className="text-amber-700" />
                    </div>
                    <div>
                      <div className="text-amber-700 font-bold">我的酒店</div>
                      <div className="text-xs text-amber-600">基准参照</div>
                    </div>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  <div className="text-xl font-mono font-bold text-amber-700">¥{hotelData.prices.budget}</div>
                </td>
                <td className="text-center py-4 px-4">
                  <div className="text-xl font-mono font-bold text-amber-700">¥{hotelData.prices.standard}</div>
                </td>
                <td className="text-center py-4 px-4">
                  <div className="text-xl font-mono font-bold text-amber-700">¥{hotelData.prices.suite}</div>
                </td>
              </tr>
              
              {/* 动态渲染三档：低一档/同档次/高一档 */}
              {relevantTierList.map((tier) => {
                const stats = tierStats[tier];
                const isLower = tier === lowerTier;
                const isSame = tier === sameTier;
                const displayName = getTierDisplayName(hotelData.tier, tier);
                
                // 根据相对位置确定样式
                const bgColor = isLower ? 'bg-gray-50' : isSame ? 'bg-cyan-50' : 'bg-violet-50';
                const hoverBg = isLower ? 'hover:bg-gray-100' : isSame ? 'hover:bg-cyan-100' : 'hover:bg-violet-100';
                const textColor = isLower ? 'text-gray-600' : isSame ? 'text-cyan-600' : 'text-violet-600';
                const borderColor = isLower ? 'border-gray-200' : isSame ? 'border-cyan-300' : 'border-violet-200';
                const dotColor = isLower ? 'bg-gray-400' : isSame ? 'bg-cyan-500' : 'bg-violet-500';
                
                return (
                  <tr 
                    key={tier}
                    className={`border-b border-gray-100 cursor-pointer transition-all ${hoverBg} ${activeTier === tier ? `${bgColor} border-l-4 border-l-${isSame ? 'cyan' : isLower ? 'gray' : 'violet'}-400` : ''}`}
                    onClick={() => setActiveTier(tier)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {isSame ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-100 rounded-md">
                            <Target className="w-3.5 h-3.5 text-cyan-700" />
                            <span className="text-xs font-semibold text-cyan-700">参考</span>
                          </div>
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        )}
                        <div>
                          <div className={`${isSame ? 'font-bold' : 'font-medium'} whitespace-nowrap text-gray-900`}>
                            {displayName}
                          </div>
                          <div className={`text-xs ${textColor}`}>
                            {stats?.count || 0}家酒店 · {stats?.minDist?.toFixed(1) || 0}-{stats?.maxDist?.toFixed(1) || 0}km
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`text-lg font-mono font-bold ${textColor}`}>
                        {stats?.count > 0 ? `¥${stats.minPrice}-¥${stats.maxPrice}` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">{stats?.count || 0}家酒店</div>
                    </td>
                    <td className={`text-center py-4 px-4 ${isSame ? `border ${borderColor} rounded-lg bg-white` : ''}`}>
                      <div className={`text-lg font-mono font-bold ${textColor}`}>
                        {stats?.count > 0 ? `¥${Math.round((stats.minPrice + stats.maxPrice) / 2)}` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">均价</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`text-lg font-mono font-bold ${textColor}`}>
                        {stats?.count > 0 ? `¥${Math.round(stats.maxPrice * 1.3)}+` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">套房</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          点击上方档次行可查看该档次酒店详情
        </div>
      </div>

      {/* 下部：选中档次酒店列表 + 价格趋势 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 当前选中档次的酒店列表 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <span className="text-lg">▼</span>
            <h3 className="font-semibold text-gray-900">
              <span className="whitespace-nowrap">{getTierDisplayName(hotelData.tier, activeTier)}</span>
              <span className="text-sm font-normal text-gray-500 ml-2">{currentCompetitors.length}家 · {tierStats[activeTier]?.minDist?.toFixed(1) || 0}-{tierStats[activeTier]?.maxDist?.toFixed(1) || 0}km</span>
            </h3>
          </div>

          {currentCompetitors.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {currentCompetitors.map((hotel, idx) => {
                const myStandardPrice = hotelData.prices.standard;
                const standardDiff = ((hotel.prices.standard.price - myStandardPrice) / myStandardPrice * 100).toFixed(0);
                const isLower = Number(standardDiff) < 0;
                
                return (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="pl-4 border-l-2 border-gray-200 hover:border-violet-400 transition-all"
                  >
                    {/* 酒店名称和距离 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-900 font-medium">{hotel.name}</span>
                      <span className="text-xs text-gray-500">（{hotel.distance.toFixed(1)}km）</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${isLower ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        比我{isLower ? '低' : '高'}{Math.abs(Number(standardDiff))}%
                      </span>
                    </div>
                    
                    {/* 三个房型价格 */}
                    <div className="flex items-center gap-6 mb-2 text-sm flex-wrap">
                      <span className={hotel.prices.budget.change > 0 ? 'text-red-600 whitespace-nowrap' : 'text-emerald-600 whitespace-nowrap'}>
                        经济房：¥{hotel.prices.budget.price}
                        <span className="text-xs ml-1">({hotel.prices.budget.change > 0 ? '+' : ''}{hotel.prices.budget.change.toFixed(0)}%)</span>
                      </span>
                      <span className={hotel.prices.standard.change > 0 ? 'text-red-600 whitespace-nowrap' : 'text-emerald-600 whitespace-nowrap'}>
                        标准房：¥{hotel.prices.standard.price}
                        <span className="text-xs ml-1">({hotel.prices.standard.change > 0 ? '+' : ''}{hotel.prices.standard.change.toFixed(0)}%)</span>
                      </span>
                      <span className={hotel.prices.suite.change > 0 ? 'text-red-600 whitespace-nowrap' : 'text-emerald-600 whitespace-nowrap'}>
                        套房：¥{hotel.prices.suite.price}
                        <span className="text-xs ml-1">({hotel.prices.suite.change > 0 ? '+' : ''}{hotel.prices.suite.change.toFixed(0)}%)</span>
                      </span>
                    </div>

                    {/* 平台价格标签 */}
                    <div className="flex items-center gap-2">
                      {['携程', '美团', '高德', '飞猪'].map((platform) => {
                        const mainPrice = hotel.prices.standard.price;
                        const platformPrice = mainPrice + (platform === '携程' ? 5 : platform === '美团' ? 0 : platform === '高德' ? -5 : -2);
                        return (
                          <span
                            key={platform}
                            className="px-2 py-1 rounded text-xs bg-gray-50 border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 transition-all cursor-pointer"
                          >
                            {platform}¥{platformPrice}
                          </span>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500">
              <Activity size={48} className="mx-auto mb-4 opacity-30" />
              <p>该档次暂无竞品数据</p>
            </div>
          )}
        </div>

        {/* 价格趋势对比 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-600" />
              竞品趋势预测
            </h3>
            <SegmentedControl
              value={timeRange}
              onChange={(v) => setTimeRange(v)}
              options={[{ value: 7, label: '7天' }, { value: 14, label: '14天' }, { value: 30, label: '30天' }]}
              size="sm"
            />
          </div>
          <PriceTrendChart data={trendData} />
          
          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 text-xs mt-4">
            <span className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span>竞品均价</span>
            <span className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"><span className="w-3 h-3 bg-amber-500 rounded-full"></span>我们的价格</span>
          </div>

          {/* 价格差异分析 */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
            {[
              { label: '平均价差', value: `+¥${Math.round(trendData.reduce((a, b) => a + (b.ourPrice - b.compAvg), 0) / trendData.length)}`, color: 'emerald' },
              { label: '最高溢价', value: `+¥${Math.max(...trendData.map(d => d.ourPrice - d.compAvg))}`, color: 'amber' },
              { label: '价格优势天数', value: `${trendData.filter(d => d.ourPrice <= d.compAvg).length}天`, color: 'violet' },
            ].map((item, idx) => (
              <div key={idx} className={`bg-${item.color}-50 rounded-lg p-3 text-center`}>
                <div className={`text-xs text-${item.color}-600 mb-1`}>{item.label}</div>
                <div className={`text-lg font-bold text-${item.color}-600`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 视图：多酒店矩阵（简洁入口）
// ============================================
function MultiHotelMatrixView({ 
  hotelsData,
  onSelectHotel
}: { 
  hotelsData: MyHotelData[];
  onSelectHotel: (_data: MyHotelData) => void;
}) {
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const { info, success, error } = useToast();

  // 生成竞品分析报告
  const handleGenerateReport = async () => {
    if (selectedHotels.size === 0) {
      info('请先选择酒店', '请至少选择一家酒店');
      return;
    }
    
    setIsGenerating(true);
    try {
      const hotelNames = hotelsData
        .filter(h => selectedHotels.has(h.hotelId))
        .map(h => h.hotelName)
        .slice(0, 3)
        .join('、') + (selectedHotels.size > 3 ? `等${selectedHotels.size}家` : '');
      
      // 模拟生成报告
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 生成报告内容
      const reportContent = generateCompetitorReport();
      
      // 下载报告
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `竞品分析报告_${dateStr}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('报告生成成功', `已为${hotelNames}生成竞品分析报告并下载`);
    } catch (err) {
      error('生成失败', '请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 生成竞品报告内容
  const generateCompetitorReport = () => {
    const selectedData = hotelsData.filter(h => selectedHotels.has(h.hotelId));
    let report = `竞品分析报告\n生成时间：${new Date().toLocaleString()}\n`;
    report += `分析酒店数：${selectedData.length}家\n\n`;
    
    selectedData.forEach((hotel, idx) => {
      report += `${idx + 1}. ${hotel.hotelName} (${hotel.city})\n`;
      report += `   本店价格：¥${hotel.ownPrice || '-'}\n`;
      report += `   周边竞品：\n`;
      hotel.competitors.slice(0, 5).forEach(c => {
        report += `     - ${c.brand}：¥${c.prices[selectedRoomType]?.price || '-'} (${c.distance}km)\n`;
      });
      report += `\n`;
    });
    
    report += `\n建议策略：\n`;
    report += `1. 关注竞品价格变动，及时调整本店定价\n`;
    report += `2. 利用非对称竞争优势，避免直接价格战\n`;
    report += `3. 加强渠道差异化运营，提升转化率\n`;
    
    return report;
  };

  // 导出竞品数据为CSV
  const handleExport = () => {
    if (selectedHotels.size === 0) {
      info('请先选择酒店', '请至少选择一家酒店');
      return;
    }
    
    try {
      const selectedData = hotelsData.filter(h => selectedHotels.has(h.hotelId));
      
      // 构建CSV数据
      const headers = ['酒店名称', '城市', '经济型均价', '舒适型均价', '高端型均价', '主要竞品', '建议策略'];
      
      const rows = selectedData.map(hotel => {
        // 计算各档次均价
        const tierPrices = {
          economy: { prices: [] as number[], brands: [] as string[] },
          comfort: { prices: [] as number[], brands: [] as string[] },
          premium: { prices: [] as number[], brands: [] as string[] },
        };
        
        hotel.competitors.forEach(c => {
          // budget 映射到 economy
          const tier = c.tier === 'budget' ? 'economy' : c.tier;
          tierPrices[tier].prices.push(c.prices[selectedRoomType]?.price || 0);
          tierPrices[tier].brands.push(c.brand);
        });
        
        const economyAvg = tierPrices.economy.prices.length > 0 
          ? Math.round(tierPrices.economy.prices.reduce((a,b) => a+b, 0) / tierPrices.economy.prices.length) 
          : '-';
        const comfortAvg = tierPrices.comfort.prices.length > 0 
          ? Math.round(tierPrices.comfort.prices.reduce((a,b) => a+b, 0) / tierPrices.comfort.prices.length) 
          : '-';
        const premiumAvg = tierPrices.premium.prices.length > 0 
          ? Math.round(tierPrices.premium.prices.reduce((a,b) => a+b, 0) / tierPrices.premium.prices.length) 
          : '-';
        
        const mainCompetitors = hotel.competitors.slice(0, 3).map(c => c.brand).join('、');
        
        // 生成建议策略
        let strategy = '保持观望';
        const ownPrice = hotel.ownPrice || 0;
        const marketAvg = (typeof economyAvg === 'number' ? economyAvg : 0) + (typeof comfortAvg === 'number' ? comfortAvg : 0) / 2;
        if (ownPrice < marketAvg * 0.9) strategy = '有涨价空间';
        if (ownPrice > marketAvg * 1.1) strategy = '建议优化价格';
        
        return [
          hotel.hotelName,
          hotel.city,
          economyAvg,
          comfortAvg,
          premiumAvg,
          mainCompetitors,
          strategy
        ];
      });
      
      // 构建CSV内容
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      // 下载文件
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `竞品分析_${selectedRoomType}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('导出成功', `已下载 ${selectedHotels.size} 家酒店的竞品数据`);
    } catch (err) {
      console.error('导出失败:', err);
      error('导出失败', '请稍后重试');
    }
  };

  const selectAll = selectedHotels.size === hotelsData.length;

  const toggleSelectAll = () => {
    setSelectedHotels(selectAll ? new Set() : new Set(hotelsData.map(h => h.hotelId)));
  };

  const toggleHotel = (hotelId: string) => {
    setSelectedHotels(prev => {
      const newSet = new Set(prev);
      newSet.has(hotelId) ? newSet.delete(hotelId) : newSet.add(hotelId);
      return newSet;
    });
  };

  // 计算每个酒店在各档次的竞品数据
  const hotelMatrixData = useMemo(() => {
    return hotelsData.map(hotel => {
      const tierAvgs = {
        economy: { avg: 0, count: 0 },
        comfort: { avg: 0, count: 0 },
        premium: { avg: 0, count: 0 },
      };
      
      (['economy', 'comfort', 'premium'] as Tier[]).forEach(tier => {
        const tierComps = hotel.competitors.filter(c => c.tier === tier);
        if (tierComps.length > 0) {
          const prices = tierComps.map(c => c.prices[selectedRoomType].price);
          (tierAvgs as Record<Tier, { avg: number; count: number }>)[tier].avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          (tierAvgs as Record<Tier, { avg: number; count: number }>)[tier].count = tierComps.length;
        }
      });
      
      return {
        ...hotel,
        tierAvgs,
      };
    });
  }, [hotelsData, selectedRoomType]);

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Grid3X3 className="w-5 h-5 text-violet-600" />
          <span className="font-medium text-gray-900">多酒店竞品矩阵</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(roomTypeLabels) as RoomType[]).map(type => (
              <button
                key={type}
                onClick={() => setSelectedRoomType(type)}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${selectedRoomType === type ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'}`}
              >
                {roomTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>
        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          {selectAll ? '取消全选' : '全选'} {hotelsData.length} 家
        </button>
      </div>

      {/* 矩阵表格 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 w-12"></th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">酒店</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">城市</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">我的价格</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>经济型竞品</div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>舒适型竞品</div>
              </th>
              <th className="text-center py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"></span>高端型竞品</div>
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hotelMatrixData.map((data, idx) => {
              const isSelected = selectedHotels.has(data.hotelId);
              const myPrice = data.prices[selectedRoomType];
              
              return (
                <motion.tr
                  key={data.hotelId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-violet-50/50' : ''}`}
                >
                  <td className="py-4 px-4">
                    <button onClick={() => toggleHotel(data.hotelId)}>
                      <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`} />
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Hotel className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="font-medium text-gray-900">{data.hotelName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500">{data.city}</td>
                  <td className="text-center py-4 px-4">
                    <div className="text-xl font-bold text-amber-600 font-mono">¥{myPrice}</div>
                    <div className="text-xs text-gray-400">{roomTypeLabels[selectedRoomType]}</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    {data.tierAvgs.economy.count > 0 ? (
                      <>
                        <div className="text-lg font-semibold text-emerald-600">¥{data.tierAvgs.economy.avg}</div>
                        <div className={`text-xs ${data.tierAvgs.economy.avg < myPrice ? 'text-emerald-500' : 'text-red-500'}`}>
                          {((data.tierAvgs.economy.avg - myPrice) / myPrice * 100).toFixed(0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="text-center py-4 px-4 bg-cyan-50/30">
                    {data.tierAvgs.comfort.count > 0 ? (
                      <>
                        <div className="text-lg font-semibold text-cyan-600">¥{data.tierAvgs.comfort.avg}</div>
                        <div className={`text-xs ${data.tierAvgs.comfort.avg < myPrice ? 'text-emerald-500' : 'text-red-500'}`}>
                          {((data.tierAvgs.comfort.avg - myPrice) / myPrice * 100).toFixed(0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {data.tierAvgs.premium.count > 0 ? (
                      <>
                        <div className="text-lg font-semibold text-violet-600">¥{data.tierAvgs.premium.avg}</div>
                        <div className={`text-xs ${data.tierAvgs.premium.avg < myPrice ? 'text-emerald-500' : 'text-red-500'}`}>
                          {((data.tierAvgs.premium.avg - myPrice) / myPrice * 100).toFixed(0)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="text-right py-4 px-4">
                    <button onClick={() => onSelectHotel(data)} className="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                      详细分析
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 批量操作 */}
      {selectedHotels.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="text-sm text-violet-700">已选择 <b>{selectedHotels.size}</b> 家酒店</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating && <RefreshCw className="w-4 h-4 animate-spin" />}
              生成竞品报告
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 border border-violet-300 text-violet-700 text-sm rounded-lg hover:bg-violet-100 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />导出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export default function CompetitorIntel() {
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedHotelData, setSelectedHotelData] = useState<MyHotelData | null>(null);
  const { info, success } = useToast();
  
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = hotels.filter(h => selectedHotelIds.includes(h.id));

  const hotelsData = useMemo(() => 
    selectedHotels.map(h => generateHotelData(h)),
  [selectedHotels]);

  // 导出竞品数据为CSV
  const handleExport = () => {
    try {
      // 构建CSV数据
      const headers = ['酒店名称', '城市', '本店价格', '竞品数量', '主要竞品', '建议策略'];
      
      const rows = hotelsData.map(hotel => {
        const mainCompetitors = hotel.competitors.slice(0, 3).map(c => c.brand).join('、');
        
        // 计算平均竞品价格
        const avgCompPrice = hotel.competitors.length > 0
          ? Math.round(hotel.competitors.reduce((sum, c) => sum + (c.prices.standard?.price || 0), 0) / hotel.competitors.length)
          : 0;
        
        // 生成建议策略
        let strategy = '保持观望';
        const ownPrice = hotel.ownPrice || 0;
        if (avgCompPrice > 0) {
          if (ownPrice < avgCompPrice * 0.9) strategy = '有涨价空间';
          else if (ownPrice > avgCompPrice * 1.1) strategy = '建议优化价格';
          else strategy = '价格适中';
        }
        
        return [
          hotel.hotelName,
          hotel.city,
          `¥${ownPrice}`,
          hotel.competitors.length,
          mainCompetitors,
          strategy
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `竞品监控数据_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('导出成功', `已导出${hotelsData.length}家酒店的竞品数据`);
    } catch (err) {
      info('导出失败', '请稍后重试');
    }
  };

  if (selectedHotels.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Target className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500">请在顶部全局选择器中至少选择一家酒店</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">竞品监控</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `${selectedHotels[0].name} - 单酒店竞品分析`
              : `已选择 ${selectedHotels.length} 家酒店 - 多酒店竞品矩阵`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedHotels.length > 1 && (
            <SegmentedControl
              value={viewMode}
              onChange={(v) => { setViewMode(v); setSelectedHotelData(null); }}
              options={[
                { value: 'matrix', label: '多酒店矩阵', icon: <Grid3X3 className="w-4 h-4" /> },
                { value: 'detail', label: '单酒店深度', icon: <List className="w-4 h-4" /> },
              ]}
              size="md"
            />
          )}
          <button 
            onClick={() => {
              // 如果没有选择酒店，默认导出所有酒店
              if (selectedHotels.length === 0) {
                info('请先选择酒店', '请至少选择一家酒店进行导出');
                return;
              }
              // 使用已选择的酒店
              handleExport();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">导出报告</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {selectedHotelData ? (
        <SingleHotelCompetitorView 
          hotelData={selectedHotelData} 
          onBack={() => setSelectedHotelData(null)} 
        />
      ) : selectedHotels.length === 1 || viewMode === 'detail' ? (
        <SingleHotelCompetitorView 
          hotelData={hotelsData[0]} 
          onBack={() => {}} 
        />
      ) : (
        <MultiHotelMatrixView 
          hotelsData={hotelsData}
          onSelectHotel={(data) => setSelectedHotelData(data)}
        />
      )}
    </div>
  );
}
