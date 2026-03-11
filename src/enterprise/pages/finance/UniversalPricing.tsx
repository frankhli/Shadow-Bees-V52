/**
 * 全域定价中心 - 企业版 V2
 * 
 * 设计原则：
 * 1. 复刻酒店端定价决策页面的所有精华功能
 * 2. 多酒店矩阵支持全房型概览
 * 3. 单酒店深度视图与酒店端功能一致
 * 4. 未来预测支持多酒店切换
 * 5. 配置页面完善统控策略、渠道策略、审批流
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Settings, CheckCircle2, Globe, Target, 
  TrendingUp, Calendar, Sparkles, Bed, DollarSign, Zap, 
  Building2, CheckSquare, Square, ChevronLeft,
  Grid3X3, List, Flame,
  AlertCircle, X, TrendingDown, Pause, Play, RefreshCw,
  Clock, BarChart3, Shield, CheckCircle, XCircle, Sliders,
  Users, Bell, Lightbulb, AlertTriangle
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { useAuthStore, EnterpriseRole } from '../../stores/authStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { platformLogos } from '../../../utils/helpers';
import { pricingApi } from '../../api';
import { Link } from 'react-router-dom';
import { SERVICE_MODE_CONFIG } from '../../api/pricingApi';
import type { ServiceMode } from '../../api/pricingApi';
import { useToast } from '../../../components/ui/Toast';

// Local type for hotel tier
type Tier = 'premium' | 'comfort' | 'economy';

// ============================================
// 类型定义
// ============================================
type ViewMode = 'matrix' | 'detail';
type PricingTab = 'realtime' | 'future' | 'config';
type PricingMode = 'clearance' | 'dynamic' | 'scalper';
type UserRole = 'owner' | 'manager' | 'staff';
// type AutoApplyMode = 'auto' | 'manual';

interface RoomType {
  id: string;
  name: string;
  floorPrice: number;
  ceilingPrice: number;
  currentPrice: number;
  aiSuggestion: number;
  competitorAvg: number;
  competitorMin: number;  // 同档次竞品最低价
  competitorMax: number;  // 同档次竞品最高价
  priceDiff: number;
  percentChange: string;
  trend: 'up' | 'down' | 'stable';
  inventory: number;
  totalRooms: number;
}

interface ChannelPrice {
  channelId: string;
  channelName: string;
  price: number;
  diff: number;
  coefficient: number;
  enabled: boolean;
}

interface HotelPricingDetail {
  hotelId: string;
  hotelName: string;
  city: string;
  starRating: number;
  roomTypes: RoomType[];
  channels: ChannelPrice[];
  aiFactors: {
    weekendPremium: number;
    inventoryLevel: 'low' | 'medium' | 'high';
    competitorPosition: 'lower' | 'similar' | 'higher';
    eventImpact: number;
    recommendation: string;
    confidence: number;
  };
  // 智能定价助手状态
  smartPricing: {
    enabled: boolean;
    autoApply: boolean;
    mode: PricingMode;
    lastUpdate: number;
    todayUpdateCount: number;
    maxUpdatesPerDay: number;
  };
  // 底价建议
  floorPriceSuggestion?: {
    show: boolean;
    suggestedPrice: number;
    reason: string;
    trend: 'up' | 'down';
  };
}

interface FutureDateData {
  date: Date;
  dateStr: string;
  display: string;
  weekday: string;
  isWeekend: boolean;
  aiSuggestion: number;
  competitorAvg: number;
  priceDiff: number;
  eventImpact: number;
  events: { name: string; intensity: 'high' | 'medium' | 'low' }[];
  inventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout';
  applied: boolean;
  roomTypeId: string;
}



// ============================================
// 模拟数据生成
// TODO: 这些是演示数据生成函数，需要替换为真实API调用
// ============================================
const ROOM_TYPE_NAMES = ['大床房', '双床房', '套房', '家庭房'];

const MODE_CONFIG = {
  clearance: { label: '快速出货', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: '库存积压，建议降价促销', effect: '预计多卖 2-3 间' },
  dynamic: { label: '随行就市', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', desc: '市场平稳，跟随竞品定价', effect: '价格有竞争力' },
  scalper: { label: '收益最大化', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', desc: '市场紧张，适当溢价', effect: '收益提升 ¥80-120' },
};

/**
 * 根据定价模式计算AI建议价格（与酒店端逻辑一致）
 * - clearance: 锚定竞品最低价 × 0.95（确保价格优势）
 * - dynamic: 锚定竞品中间价（平衡策略）
 * - scalper: 锚定竞品最高价 × 1.1（追求溢价）
 * 
 * TODO: 当前使用本地计算逻辑，需接入真实AI定价API
 */
function calculateAISuggestion(
  competitorMin: number,
  competitorMax: number,
  floorPrice: number,
  ceilingPrice: number,
  mode: PricingMode
): { aiSuggestion: number; anchorDescription: string } {
  let anchorPrice: number;
  let anchorDescription: string;
  
  switch (mode) {
    case 'clearance':
      // 尾货模式：锚定最低价，确保价格优势
      anchorPrice = Math.round(competitorMin * 0.95);
      anchorDescription = '锚定最低价（尾货）';
      break;
    case 'scalper':
      // 黄牛模式：锚定最高价，追求溢价
      anchorPrice = Math.round(competitorMax * 1.1);
      anchorDescription = '锚定最高价（黄牛）';
      break;
    case 'dynamic':
    default:
      // 动态模式：锚定中间价，平衡策略
      anchorPrice = Math.round((competitorMin + competitorMax) / 2);
      anchorDescription = '锚定中间价（动态）';
      break;
  }
  
  // 建议价格在锚定价和底价/天花板之间取约束值
  const aiSuggestion = Math.max(floorPrice, Math.min(ceilingPrice, anchorPrice));
  
  return { aiSuggestion, anchorDescription };
}

/**
 * TODO: 演示数据 - 生成模拟房型数据
 * 实际应调用 pricingApi.getRoomTypes(hotelId) 获取真实数据
 */
function generateRoomTypes(
  basePrice: number, 
  hotel: any, 
  mode: PricingMode = 'dynamic'
): RoomType[] {
  return ROOM_TYPE_NAMES.map((name, idx) => {
    const multiplier = [1, 1.1, 1.8, 1.4][idx];
    const currentPrice = Math.round(basePrice * multiplier);
    
    // 根据酒店星级确定档次
    const hotelTier: Tier = hotel?.starRating >= 5 ? 'premium' : hotel?.starRating >= 4 ? 'comfort' : 'economy';
    const roomCategory: pricingApi.RoomCategory = idx === 0 ? 'standard' : idx === 1 ? 'standard' : idx === 2 ? 'suite' : 'budget';
    
    // 获取真实竞品价格区间
    const priceRange = pricingApi.getCompetitorPriceRange(hotel?.id || 'hotel-001', hotelTier, hotel?.city || '成都', roomCategory);
    const competitorMin = priceRange.min || Math.round(currentPrice * 0.85);
    const competitorMax = priceRange.max || Math.round(currentPrice * 1.15);
    const competitorAvg = priceRange.avg || Math.round(currentPrice);
    
    // 底价和天花板（基于当前价格）
    const floorPrice = Math.round(currentPrice * 0.7);
    const ceilingPrice = Math.round(currentPrice * 1.5);
    
    // 根据定价模式计算AI建议价
    const { aiSuggestion } = calculateAISuggestion(
      competitorMin,
      competitorMax,
      floorPrice,
      ceilingPrice,
      mode
    );
    
    const priceDiff = aiSuggestion - currentPrice;
    
    return {
      id: `rt-${idx}`,
      name,
      floorPrice,
      ceilingPrice,
      currentPrice,
      aiSuggestion,
      competitorAvg,
      competitorMin,
      competitorMax,
      priceDiff,
      percentChange: ((priceDiff / currentPrice) * 100).toFixed(1),
      trend: priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'stable',
      inventory: Math.floor(Math.random() * 50) + 10,
      totalRooms: 100,
    };
  });
}

/**
 * TODO: 演示数据 - 生成模拟渠道价格
 * 实际应调用 pricingApi.getChannelPrices(hotelId) 获取真实数据
 */
function generateChannelPrices(basePrice: number): ChannelPrice[] {
  return [
    { channelId: 'ctrip', channelName: '携程', price: Math.round(basePrice * 1.02), diff: 2, coefficient: 1.02, enabled: true },
    { channelId: 'meituan', channelName: '美团', price: Math.round(basePrice * 0.98), diff: -2, coefficient: 0.98, enabled: true },
    { channelId: 'fliggy', channelName: '飞猪', price: Math.round(basePrice * 1.0), diff: 0, coefficient: 1.0, enabled: true },
    { channelId: 'wechat', channelName: '官方微信', price: basePrice, diff: 0, coefficient: 1.0, enabled: true },
    { channelId: 'xiaohongshu', channelName: '小红书', price: Math.round(basePrice * 1.05), diff: 5, coefficient: 1.05, enabled: true },
    { channelId: 'xianyu', channelName: '闲鱼', price: Math.round(basePrice * 0.95), diff: -5, coefficient: 0.95, enabled: true },
  ];
}

/**
 * 根据酒店档次获取基础价格（经济型酒店基准）
 * TODO: 演示数据，实际应从酒店基础信息API获取
 */
function getBasePriceByTier(starRating: number): number {
  // 经济型酒店（1-3星）：基准价 ¥150-200
  if (starRating <= 3) return 150 + Math.random() * 50;
  // 舒适型（4星）：基准价 ¥280-380
  if (starRating === 4) return 280 + Math.random() * 100;
  // 高端型（5星）：基准价 ¥450-650
  return 450 + Math.random() * 200;
}

/**
 * TODO: 演示数据 - 生成模拟酒店详情
 * 实际应调用 pricingApi.getHotelPricingDetail(hotelId) 获取真实数据
 */
function generateHotelDetail(hotel: any, mode: PricingMode = 'dynamic'): HotelPricingDetail {
  // 根据酒店档次确定基础价格
  const basePrice = getBasePriceByTier(hotel?.starRating || 2);
  const roomTypes = generateRoomTypes(basePrice, hotel, mode);
  const modes: PricingMode[] = ['clearance', 'dynamic', 'scalper'];
  
  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    city: hotel.city,
    starRating: hotel.starRating || 4,
    roomTypes,
    channels: generateChannelPrices(roomTypes[0].currentPrice),
    aiFactors: {
      weekendPremium: 10 + Math.floor(Math.random() * 10),
      inventoryLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      competitorPosition: ['lower', 'similar', 'higher'][Math.floor(Math.random() * 3)] as any,
      eventImpact: Math.random() > 0.7 ? 15 + Math.floor(Math.random() * 15) : 0,
      recommendation: '建议上调周末价格，当前库存紧张且竞品价格较高',
      confidence: 85 + Math.floor(Math.random() * 10),
    },
    smartPricing: {
      enabled: Math.random() > 0.3,
      autoApply: Math.random() > 0.5,
      mode: modes[Math.floor(Math.random() * 3)],
      lastUpdate: Date.now() - Math.floor(Math.random() * 3600000),
      todayUpdateCount: Math.floor(Math.random() * 15),
      maxUpdatesPerDay: 20,
    },
    floorPriceSuggestion: Math.random() > 0.7 ? {
      show: true,
      suggestedPrice: Math.round(basePrice * 0.8),
      reason: '近期库存压力较大，建议适当下调底价以加速出货',
      trend: 'down',
    } : undefined,
  };
}

/**
 * TODO: 演示数据 - 生成模拟未来日期定价数据
 * 实际应调用 pricingApi.getFuturePricing(hotelId, roomTypeId, days) 获取真实数据
 */
function generateFutureData(days: number, basePrice: number, roomTypeId: string): FutureDateData[] {
  const result: FutureDateData[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hasEvent = Math.random() > 0.85;
    const eventImpact = hasEvent ? (Math.random() > 0.5 ? 0.25 : 0.15) : 0;
    const weekendMultiplier = isWeekend ? 1.1 : 1;
    const aiSuggestion = Math.round(basePrice * weekendMultiplier * (1 + eventImpact));
    const competitorAvg = Math.round(aiSuggestion * (0.95 + Math.random() * 0.1));
    const priceDiff = aiSuggestion - basePrice;
    
    let inventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout' = 'abundant';
    const rand = Math.random();
    if (rand > 0.95) inventoryStatus = 'soldout';
    else if (rand > 0.85) inventoryStatus = 'tight';
    else if (rand > 0.6) inventoryStatus = 'normal';
    
    result.push({
      date,
      dateStr: date.toISOString().split('T')[0],
      display: `${date.getMonth() + 1}/${date.getDate()}`,
      weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
      isWeekend,
      aiSuggestion,
      competitorAvg,
      priceDiff,
      eventImpact,
      events: hasEvent ? [{ name: ['演唱会', '展会', '节假日', '马拉松'][Math.floor(Math.random() * 4)], intensity: Math.random() > 0.6 ? 'high' : 'medium' }] : [],
      inventoryStatus,
      applied: false,
      roomTypeId,
    });
  }
  
  return result;
}

// ============================================
// 数字动画组件
// ============================================
/* unused
function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { duration: 1000, bounce: 0 });
  
  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);
  
  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + Math.round(latest).toLocaleString() + suffix;
      }
    });
    return unsubscribe;
  }, [spring, prefix, suffix]);
  
  return <span ref={ref} className={className}>{prefix}{value.toLocaleString()}{suffix}</span>;
}
*/

// 价格变动动画组件
function AnimatedPrice({ value, className = '' }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  
  useEffect(() => {
    if (value !== prevValue.current) {
      const startValue = prevValue.current;
      const endValue = value;
      const duration = 500;
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        
        setDisplayValue(Math.round(startValue + (endValue - startValue) * easeProgress));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      prevValue.current = value;
    }
  }, [value]);
  
  return <span className={className}>¥{displayValue.toLocaleString()}</span>;
}

// ============================================
// 工具函数
// ============================================
function getInventoryColor(status: string) {
  switch (status) {
    case 'soldout': return 'bg-red-500';
    case 'tight': return 'bg-amber-500';
    case 'normal': return 'bg-blue-500';
    default: return 'bg-emerald-500';
  }
}

function getEventImpactColor(intensity: string) {
  switch (intensity) {
    case 'high': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
  }
}

function formatTimeAgo(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
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
        layoutId="segmented-pricing"
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
// 组件：AI定价建议面板（酒店端复刻）
// ============================================
function AIRecommendationPanel({ 
  roomType, 
  hotelDetail, 
  onApply, 
  strategySource,
  isLoading = false,
}: { 
  roomType: RoomType; 
  hotelDetail: HotelPricingDetail; 
  onApply: () => void;
  strategySource?: { type: 'ai_auto' | 'strategy_center'; name?: string };
  isLoading?: boolean;
}) {
  const { aiFactors } = hotelDetail;
  
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-white rounded-xl border border-emerald-200 p-5 shadow-sm">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI 定价建议</h3>
            <p className="text-xs text-emerald-600">Shadow Intelligence Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 策略来源标识 */}
          {strategySource && (
            <div className={`text-xs px-2 py-1 rounded-full ${
              strategySource.type === 'strategy_center' 
                ? 'bg-violet-100 text-violet-700' 
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {strategySource.type === 'strategy_center' 
                ? `📋 策略: ${strategySource.name || '华美会运营'}` 
                : '🤖 AI自动计算'}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">置信度</span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${aiFactors.confidence}%` }} />
            </div>
            <span className="text-xs text-emerald-600 font-mono">{aiFactors.confidence}%</span>
          </div>
        </div>
      </div>

      {/* 建议价格 - 三列卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* 灵活渠道基准价 */}
        <div className="bg-white rounded-lg p-4 border border-amber-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-100 to-transparent rounded-bl-full" />
          <div className="text-sm text-amber-600 mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            灵活渠道基准价
          </div>
          <div className="text-3xl font-bold text-amber-600 font-mono">
            <AnimatedPrice value={roomType.currentPrice} />
          </div>
          <div className="text-xs mt-1 flex items-center gap-1">
            <span className={`font-medium ${roomType.trend === 'up' ? 'text-emerald-600' : roomType.trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {roomType.trend === 'up' ? '↑' : roomType.trend === 'down' ? '↓' : '→'}
              {roomType.trend === 'up' ? '+' : ''}{roomType.percentChange}%
            </span>
            <span className="text-gray-400">vs 竞品</span>
          </div>
        </div>

        {/* 同类竞品价格区间 */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-100 to-transparent rounded-bl-full" />
          <div className="text-sm text-violet-600 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            同类竞品价格区间
          </div>
          <div className="text-2xl font-bold text-violet-600 font-mono">
            ¥{roomType.competitorMin}-¥{roomType.competitorMax}
          </div>
          <div className="text-xs mt-1 text-gray-400">
            均价 ¥{roomType.competitorAvg} · {roomType.competitorMax - roomType.competitorMin > 100 ? '价格波动大' : '价格较集中'}
          </div>
        </div>

        {/* AI建议价格 */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-4 border border-emerald-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 blur-2xl rounded-full" />
          <div className="text-sm text-emerald-700 flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />
            AI建议价格
          </div>
          <div className="text-3xl font-bold text-emerald-600 font-mono">
            <AnimatedPrice value={roomType.aiSuggestion} />
          </div>
          <div className="text-xs mt-1 flex items-center gap-1">
            <span className={`font-medium ${roomType.priceDiff > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {roomType.priceDiff > 0 ? '↑' : '↓'}
              {roomType.priceDiff > 0 ? '+' : ''}{roomType.percentChange}%
            </span>
            <span className="text-gray-400">vs 当前价</span>
          </div>
          {roomType.aiSuggestion !== roomType.currentPrice && (
            <button
              onClick={onApply}
              disabled={isLoading}
              className="mt-3 w-full py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isLoading ? '应用中...' : '应用AI建议'}
            </button>
          )}
        </div>
      </div>

      {/* 建议依据 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <DollarSign className="w-3 h-3" />
            当前底价
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono mt-2">
            <AnimatedPrice value={roomType.floorPrice} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Calendar className="w-3 h-3" />
            事件影响
          </div>
          <div className="text-sm text-gray-900">
            {aiFactors.eventImpact > 0 ? (
              <span className="text-amber-600">{aiFactors.eventImpact}% 事件溢价</span>
            ) : (
              <span className="text-gray-400">暂无重大事件</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Target className="w-3 h-3" />
            定价策略
          </div>
          <div className="text-sm text-gray-900">
            {roomType.trend === 'up' ? '建议提价' : roomType.trend === 'down' ? '建议降价' : '维持现价'}
          </div>
          <div className="text-xs text-gray-400 mt-1">符合{roomType.name}定位</div>
        </div>
      </div>

      {/* 来源说明 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>数据来源：</span>
          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />竞品监测</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />事件分析</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />AI算法计算</span>
        </div>
        <div className="text-xs text-gray-400">基于 {hotelDetail.hotelName} 实时数据</div>
      </div>
    </div>
  );
}

// ============================================
// 组件：智能定价助手（酒店端复刻，支持模式切换）
// ============================================
function SmartPricingPanel({ 
  smartPricing, 
  competitorAvg, 
  competitorMin,
  competitorMax,
  basePrice,
  isLoading,
  onToggle, 
  onToggleAuto, 
  onRefresh,
  onChangeMode,
}: {
  smartPricing: HotelPricingDetail['smartPricing'];
  competitorAvg: number;
  competitorMin: number;
  competitorMax: number;
  basePrice: number;
  isLoading?: boolean;
  onToggle: () => void;
  onToggleAuto: () => void;
  onRefresh: () => void;
  onChangeMode: (mode: PricingMode) => void;
}) {
  const priceDiff = basePrice - competitorAvg;
  const priceDiffPercent = competitorAvg > 0 ? ((priceDiff / competitorAvg) * 100).toFixed(0) : '0';
  const modeConfig = MODE_CONFIG[smartPricing.mode];
  const ModeIcon = smartPricing.mode === 'clearance' ? TrendingDown : smartPricing.mode === 'scalper' ? TrendingUp : Zap;
  
  // 根据模式计算锚定价格（与酒店端一致）
  const getAnchorPrice = () => {
    switch (smartPricing.mode) {
      case 'clearance':
        return { price: Math.round(competitorMin * 0.95), desc: '锚定最低价 × 0.95' };
      case 'scalper':
        return { price: Math.round(competitorMax * 1.1), desc: '锚定最高价 × 1.1' };
      default:
        return { price: Math.round((competitorMin + competitorMax) / 2), desc: '锚定中间价' };
    }
  };
  const anchorInfo = getAnchorPrice();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${smartPricing.enabled ? "bg-cyan-100" : "bg-gray-100"}`}>
            <Brain className={`w-5 h-5 ${smartPricing.enabled ? "text-cyan-600" : "text-gray-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">智能定价助手</h3>
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {smartPricing.enabled ? '已开启：自动监控并推荐定价' : '已暂停：系统不会自动调价'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 ${
              smartPricing.enabled
                ? "bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200"
                : "bg-gray-100 text-gray-600 border border-gray-200 hover:text-gray-900"
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : smartPricing.enabled ? (
              <><Pause className="w-4 h-4" />暂停助手</>
            ) : (
              <><Play className="w-4 h-4" />开启助手</>
            )}
          </button>
          {smartPricing.enabled && (
            <button 
              onClick={onRefresh} 
              disabled={isLoading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50" 
              title="立即获取最新定价建议"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {smartPricing.enabled && (
        <>
          {/* 手动/自动模式切换 */}
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-sm text-gray-500 whitespace-nowrap">应用模式</span>
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{smartPricing.autoApply ? '自动' : '手动'}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">{smartPricing.autoApply ? '(系统自动应用)' : '(需手动确认)'}</span>
            </div>
            <button
              onClick={onToggleAuto}
              disabled={isLoading}
              className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-all disabled:opacity-50 ${smartPricing.autoApply ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"}`}
            >
              {isLoading ? '...' : smartPricing.autoApply ? '切手动' : '切自动'}
            </button>
          </div>

          {/* 模式切换按钮组 */}
          <div className="flex items-center gap-2 mb-3">
            {(['clearance', 'dynamic', 'scalper'] as PricingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeMode(mode)}
                disabled={isLoading}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all border whitespace-nowrap disabled:opacity-50 ${
                  smartPricing.mode === mode
                    ? `${MODE_CONFIG[mode].bg} ${MODE_CONFIG[mode].border} ${MODE_CONFIG[mode].color}`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {mode === 'clearance' && <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                {mode === 'dynamic' && <Zap className="w-3 h-3 inline mr-0.5" />}
                {mode === 'scalper' && <TrendingUp className="w-3 h-3 inline mr-0.5" />}
                {isLoading && smartPricing.mode === mode ? (
                  <RefreshCw className="w-3 h-3 inline animate-spin" />
                ) : (
                  MODE_CONFIG[mode].label
                )}
              </button>
            ))}
          </div>

          {/* 当前策略卡片 */}
          <div className={`rounded-lg border p-3 mb-3 ${modeConfig.bg} ${modeConfig.border}`}>
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${modeConfig.color}`}><ModeIcon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold text-sm whitespace-nowrap ${modeConfig.color}`}>{modeConfig.label}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap"><Clock className="w-3 h-3" />{formatTimeAgo(smartPricing.lastUpdate)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{modeConfig.desc}</p>
                <div className="mt-2 pt-2 border-t border-gray-200/50">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-gray-500 whitespace-nowrap">锚定策略：</span>
                    <span className={`font-medium whitespace-nowrap ${modeConfig.color}`}>{anchorInfo.desc} = ¥{anchorInfo.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 价格对比 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">与竞品对比</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-bold font-mono whitespace-nowrap ${priceDiff > 0 ? "text-emerald-600" : priceDiff < 0 ? "text-amber-600" : "text-gray-900"}`}>
                  {priceDiff > 0 ? '高' : priceDiff < 0 ? '低' : '平'}
                  {priceDiff !== 0 && ` ¥${Math.abs(priceDiff)}`}
                </span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">({priceDiffPercent}%)</span>
              </div>
              <div className="text-[10px] text-gray-400 whitespace-nowrap">竞品均价 ¥{competitorAvg}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">今日调价</div>
              <div className="text-base font-bold font-mono text-gray-900 whitespace-nowrap">{smartPricing.todayUpdateCount}<span className="text-[10px] text-gray-400 font-normal">/20</span></div>
              <div className="text-[10px] text-gray-400 whitespace-nowrap">间隔 ≥5分钟</div>
            </div>
          </div>

          {/* 规则说明（根据当前模式） */}
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-600 mb-1.5 whitespace-nowrap">
                  {smartPricing.mode === 'clearance' && '尾货模式：确保价格低于竞品'}
                  {smartPricing.mode === 'dynamic' && '动态模式：跟随市场中间价'}
                  {smartPricing.mode === 'scalper' && '黄牛模式：高于市场均价'}
                </p>
                <div className="space-y-1 text-gray-500/80 text-[11px]">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>• 竞品区间：</span>
                    <span className="font-medium">¥{competitorMin} - ¥{competitorMax}</span>
                    <span className="text-gray-400">(均价 ¥{competitorAvg})</span>
                  </div>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>• 当前价格 vs 竞品：</span>
                    <span className={priceDiff > 0 ? 'text-emerald-600' : priceDiff < 0 ? 'text-amber-600' : 'text-gray-600'}>
                      {priceDiff > 0 ? '高' : priceDiff < 0 ? '低' : '持平'} {Math.abs(Number(priceDiffPercent))}%
                    </span>
                  </div>
                  <div className="whitespace-nowrap">
                    <span>• </span>
                    <span className="text-cyan-600">
                      {smartPricing.mode === 'clearance' ? '目标：比最低价低 5%' : smartPricing.mode === 'scalper' ? '目标：比最高价高 10%' : '目标：接近中间价'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!smartPricing.enabled && (
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <Brain className="w-7 h-7 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-2">系统每5分钟分析市场，自动推荐定价</p>
          <button onClick={onToggle} className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-xs hover:bg-cyan-200 transition-all">开启助手</button>
        </div>
      )}
    </div>
  );
}

// ============================================
// 组件：底价建议浮动通知
// ============================================
function FloorPriceSuggestion({ suggestion, onApply, onDismiss, isLoading = false }: {
  suggestion?: HotelPricingDetail['floorPriceSuggestion'];
  onApply: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}) {
  if (!suggestion?.show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={`fixed right-6 top-24 z-50 w-96 rounded-xl border shadow-2xl p-4 ${suggestion.trend === 'up' ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${suggestion.trend === 'up' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {suggestion.trend === 'up' ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900 flex items-center gap-1.5 text-sm"><AlertCircle className="w-3.5 h-3.5" />底价调整建议</h4>
            <button onClick={onDismiss} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"><X className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{suggestion.reason}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">建议:</span>
              <span className={`text-base font-bold font-mono ${suggestion.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>¥{suggestion.suggestedPrice}</span>
            </div>
            <button
              onClick={onApply}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50 ${suggestion.trend === 'up' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              {isLoading ? '应用中...' : '应用'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 底价审批申请类型
interface FloorPriceApproval {
  id: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  currentFloorPrice: number;
  requestedFloorPrice: number;
  reason: string;
  requestedBy: string;
  requestedByRole: 'huamei_staff' | 'hotel_owner' | 'hotel_manager' | 'hotel_staff';
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: number;
}

// ============================================
// 组件：底价调整面板（带审批流程）
// ============================================
function FloorPricePanel({ 
  roomType, 
  userRole,
  userType, // 'huamei' | 'hotel'
  pendingApproval,
  onRequestApproval,
  onApprove,
  onReject,
}: {
  roomType: RoomType;
  userRole: UserRole;
  userType: 'huamei' | 'hotel';
  pendingApproval?: FloorPriceApproval;
  onRequestApproval: (newFloorPrice: number, reason: string) => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}) {
  const [newFloorPrice, setNewFloorPrice] = useState(roomType.floorPrice);
  const [reason, setReason] = useState('');
  const { success, error: showError } = useToast();

  const isHuameiStaff = userType === 'huamei';
  const isHotelStaff = userType === 'hotel' && userRole === 'staff';
  const isHotelOwner = userType === 'hotel' && userRole === 'owner';
  const isHotelManager = userType === 'hotel' && userRole === 'manager';
  const canDirectModify = isHotelOwner || isHotelManager; // 酒店老板/经理可直接修改
  const needApproval = isHuameiStaff || isHotelStaff; // 华美会运营或酒店员工需要审批

  // 获取权限说明文字
  const getPermissionText = () => {
    if (isHotelOwner) return '酒店老板模式 - 可直接修改底价';
    if (isHotelManager) return '酒店经理模式 - 可直接修改底价';
    if (isHotelStaff) return '酒店员工模式 - 需提交老板审批';
    if (isHuameiStaff) return '华美会运营模式 - 需提交酒店审批';
    return '只读模式';
  };

  // 获取权限标签
  const getPermissionBadge = () => {
    if (isHotelOwner) return { text: '酒店老板', class: 'bg-purple-100 text-purple-700' };
    if (isHotelManager) return { text: '酒店经理', class: 'bg-cyan-100 text-cyan-700' };
    if (isHotelStaff) return { text: '酒店员工', class: 'bg-gray-100 text-gray-600' };
    if (isHuameiStaff) return { text: '华美会运营', class: 'bg-blue-100 text-blue-700' };
    return { text: '只读', class: 'bg-gray-100 text-gray-500' };
  };

  const badge = getPermissionBadge();

  // 处理直接修改底价（酒店老板/经理）
  const handleDirectModify = () => {
    if (newFloorPrice <= 0) {
      showError('输入错误', '底价必须大于0');
      return;
    }
    if (newFloorPrice >= roomType.ceilingPrice) {
      showError('输入错误', '底价必须小于天花板价');
      return;
    }
    onRequestApproval(newFloorPrice, '酒店方直接修改');
    success('底价已更新', `底价已调整为 ¥${newFloorPrice}`);
  };

  // 处理提交审批申请
  const handleSubmitApproval = () => {
    if (!reason.trim()) {
      showError('缺少信息', '请输入调整原因');
      return;
    }
    if (newFloorPrice <= 0) {
      showError('输入错误', '底价必须大于0');
      return;
    }
    onRequestApproval(newFloorPrice, reason);
    setReason('');
    success('申请已提交', '底价调整申请已发送，等待审批');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            底价调整
          </h3>
          <p className="text-xs text-gray-500 truncate mt-0.5" title={getPermissionText()}>
            {getPermissionText()}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 flex-shrink-0 ml-2 ${badge.class}`}>
          <Shield className="w-3 h-3" />
          {badge.text}
        </div>
      </div>

      {/* 当前底价展示 */}
      <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-cyan-600">当前底价</div>
            <div className="text-2xl font-bold text-cyan-700">¥{roomType.floorPrice}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">房型</div>
            <div className="text-sm font-medium text-gray-700">{roomType.name}</div>
          </div>
        </div>
      </div>

      {/* 需要审批：显示申请表单 */}
      {needApproval && !pendingApproval && (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">申请调整底价</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">¥</span>
                <input
                  type="number"
                  value={newFloorPrice}
                  onChange={(e) => setNewFloorPrice(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900"
                  placeholder="请输入新底价"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">调整原因</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isHuameiStaff ? "请说明调整底价的原因，将发送给酒店店长审批..." : "请说明调整底价的原因，将发送给酒店老板审批..."}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg mt-1 text-gray-900 text-sm resize-none"
                rows={2}
              />
            </div>
            <button
              className="w-full py-2 bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={!reason.trim() || newFloorPrice <= 0}
              onClick={handleSubmitApproval}
            >
              <Clock className="w-4 h-4" />
              提交审批申请
            </button>
          </div>
          
          {/* 提示信息 */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <div className="font-medium mb-1 flex items-center gap-1 text-amber-700">
              <Lightbulb className="w-3 h-3" /> 
              {isHuameiStaff ? '华美会运营调整底价需酒店审批' : '员工调整底价需老板审批'}
            </div>
            <div className="text-gray-500">
              {isHuameiStaff 
                ? '您的底价调整申请将发送给酒店店长审批，审批通过后底价将自动应用。' 
                : '您的底价调整申请将发送给酒店老板审批，审批通过后底价将自动应用。'}
            </div>
          </div>
        </>
      )}

      {/* 审批中状态 */}
      {needApproval && pendingApproval && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <Clock className="w-4 h-4" />
            底价调整审批中
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>申请将底价从 <span className="text-gray-900 font-medium">¥{pendingApproval.currentFloorPrice}</span> 调整至 <span className="text-cyan-600 font-medium">¥{pendingApproval.requestedFloorPrice}</span></div>
            <div className="text-xs text-gray-500">申请理由：{pendingApproval.reason}</div>
            <div className="text-xs text-gray-400 mt-2">申请时间：{new Date(pendingApproval.timestamp).toLocaleString()}</div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            申请已发送，等待{isHuameiStaff ? '酒店店长' : '酒店老板'}审批...
          </div>
        </div>
      )}

      {/* 可直接修改（酒店老板/经理） */}
      {canDirectModify && (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">新底价</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">¥</span>
                <input
                  type="number"
                  value={newFloorPrice}
                  onChange={(e) => setNewFloorPrice(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900"
                  placeholder="请输入新底价"
                />
              </div>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              天花板价：¥{roomType.ceilingPrice}
            </div>
            <button
              className="w-full py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all flex items-center justify-center gap-2"
              onClick={handleDirectModify}
            >
              <CheckCircle className="w-4 h-4" />
              保存底价
            </button>
          </div>

          {/* 待审批列表（如果有华美会或员工提交的申请） */}
          <AnimatePresence>
            {pendingApproval && pendingApproval.requestedByRole !== (isHotelOwner ? 'hotel_owner' : 'hotel_manager') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-amber-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      底价调整申请待审批
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {pendingApproval.requestedBy} 申请将底价从 <span className="text-gray-900">¥{pendingApproval.currentFloorPrice}</span> 调整至 <span className="text-cyan-600">¥{pendingApproval.requestedFloorPrice}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">理由：{pendingApproval.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button 
                    className="flex-1 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm" 
                    onClick={() => onReject(pendingApproval.id)}
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />拒绝
                  </button>
                  <button 
                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm" 
                    onClick={() => onApprove(pendingApproval.id)}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />同意并应用
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 流程说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400 mb-2">底价调整审批流程</div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${needApproval ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>
              1
            </div>
            <span className="mt-1 text-gray-500">{isHuameiStaff ? '华美会' : '员工'}申请</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${pendingApproval ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              2
            </div>
            <span className="mt-1 text-gray-500">{isHuameiStaff ? '酒店' : '老板'}审批</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2"></div>
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              3
            </div>
            <span className="mt-1 text-gray-500">自动应用</span>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-gray-400 bg-gray-50 p-2 rounded">
          <span className="font-medium text-gray-500">说明：</span>
          {canDirectModify 
            ? '酒店老板/经理可直接修改底价，无需审批。华美会运营或酒店员工提交的调整申请需要您审批通过后才会生效。'
            : '底价调整涉及酒店核心收益，需要酒店方审批。您提交的申请将由酒店店长/老板审核，审批通过后底价将自动应用到系统中。'}
        </div>
      </div>
    </div>
  );
}


// ============================================
// 包装组件：缓存酒店数据，避免重复生成
// ============================================
function SingleHotelPricingViewWrapper({ 
  selectedHotel,
  userType,
  userRole,
}: { 
  selectedHotel: any;
  userType: 'huamei' | 'hotel';
  userRole: UserRole;
}) {
  // 使用 useMemo 缓存生成的酒店数据，避免每次渲染都重新生成随机数据
  const hotel = useMemo(() => generateHotelDetail(selectedHotel), [selectedHotel.id]);
  
  return (
    <SingleHotelPricingView 
      hotel={hotel} 
      onBack={() => {}} 
      userType={userType}
      userRole={userRole}
    />
  );
}

// ============================================
// 视图：单酒店深度定价
// ============================================
function SingleHotelPricingView({ 
  hotel: initialHotel, 
  onBack, 
  userType = 'huamei',
  userRole = 'staff',
}: { 
  hotel: HotelPricingDetail; 
  onBack: () => void;
  userType?: 'huamei' | 'hotel';
  userRole?: UserRole;
}) {
  // 使用 state 存储酒店数据，确保底价修改后能触发重新渲染
  const [hotel, setHotel] = useState<HotelPricingDetail>(initialHotel);
  const [selectedRoomType, setSelectedRoomType] = useState<string>(hotel.roomTypes[0]?.id);
  const [smartPricing, setSmartPricing] = useState(hotel.smartPricing);
  const [floorSuggestion, setFloorSuggestion] = useState(hotel.floorPriceSuggestion);

  const [floorPriceApproval, setFloorPriceApproval] = useState<FloorPriceApproval | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyLoading, setIsApplyLoading] = useState(false);
  const [isFloorApplyLoading, setIsFloorApplyLoading] = useState(false);
  const { success, error: showError, info } = useToast();
  
  // TODO: 演示数据 - 策略来源（模拟：30%概率来自策略中心）
  // 实际应从 pricingApi.getStrategySource(hotelId) 获取
  const [strategySource] = useState(() => {
    const hasStrategySource = Math.random() > 0.7;
    return hasStrategySource ? {
      type: 'strategy_center' as const,
      name: ['春节大促策略', '展会调价策略', '节假日溢价策略'][Math.floor(Math.random() * 3)]
    } : {
      type: 'ai_auto' as const
    };
  });

  const currentRoom = hotel.roomTypes.find(r => r.id === selectedRoomType) || hotel.roomTypes[0];

  // 加载定价配置（接入真实API）
  useEffect(() => {
    const loadConfig = async () => {
      const response = await pricingApi.getPricingConfig(hotel.hotelId);
      if (response.success && response.data) {
        setSmartPricing({
          enabled: response.data.enabled,
          autoApply: response.data.autoApply,
          mode: response.data.mode,
          lastUpdate: response.data.lastUpdate,
          todayUpdateCount: response.data.todayUpdateCount,
          maxUpdatesPerDay: response.data.maxUpdatesPerDay,
        });
      }
    };
    loadConfig();
  }, [hotel.hotelId]);

  // 切换助手开关
  const handleToggle = async () => {
    setIsLoading(true);
    const response = await pricingApi.togglePricingAssistant(hotel.hotelId, !smartPricing.enabled);
    if (response.success) {
      setSmartPricing(prev => ({ ...prev, enabled: !prev.enabled }));
    }
    setIsLoading(false);
  };

  // 切换自动/手动
  const handleToggleAuto = async () => {
    setIsLoading(true);
    const response = await pricingApi.toggleAutoApply(hotel.hotelId, !smartPricing.autoApply);
    if (response.success) {
      setSmartPricing(prev => ({ ...prev, autoApply: !prev.autoApply }));
    }
    setIsLoading(false);
  };

  // 切换定价模式
  const handleChangeMode = async (mode: PricingMode) => {
    setIsLoading(true);
    const response = await pricingApi.changePricingMode(hotel.hotelId, mode);
    if (response.success) {
      setSmartPricing(prev => ({ ...prev, mode }));
      // 注意：实际项目中这里需要通知父组件重新生成价格建议
      // 简化处理：通过刷新页面或回调函数实现
    }
    setIsLoading(false);
  };

  // 刷新定价建议
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // 调用AI建议API获取最新数据
      const response = await pricingApi.getAISuggestion({
        hotelId: hotel.hotelId,
        roomTypeId: currentRoom.id,
        currentPrice: currentRoom.currentPrice,
        floorPrice: currentRoom.floorPrice,
        ceilingPrice: currentRoom.ceilingPrice,
        mode: smartPricing.mode,
      });
      if (response.success) {
        info('已获取最新定价建议', `建议价格：¥${response.data.suggestedPrice}，${response.data.reasoning}`);
      } else {
        showError('获取建议失败', response.message || '请稍后重试');
      }
    } catch (err) {
      showError('获取建议失败', '网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAI = async () => {
    setIsApplyLoading(true);
    try {
      const response = await pricingApi.applyAISuggestion(
        hotel.hotelId,
        currentRoom.id,
        currentRoom.aiSuggestion
      );
      if (response.success) {
        success('已应用AI建议', `${currentRoom.name} 价格调整为 ¥${response.data.newPrice}`);
        // 更新今日调价次数
        setSmartPricing(prev => ({ ...prev, todayUpdateCount: prev.todayUpdateCount + 1 }));
      } else {
        showError('应用失败', response.message || '请稍后重试');
      }
    } catch (err) {
      showError('应用失败', '网络错误，请稍后重试');
    } finally {
      setIsApplyLoading(false);
    }
  };

  // 处理底价建议应用
  const handleApplyFloorSuggestion = async () => {
    if (!floorSuggestion) return;
    setIsFloorApplyLoading(true);
    try {
      // TODO: 接入真实API - 实际项目中应该调用真实的底价更新API
      // const response = await pricingApi.updateFloorPrice(hotel.hotelId, currentRoom.id, floorSuggestion.suggestedPrice);
      await new Promise(resolve => setTimeout(resolve, 500)); // 模拟API延迟
      success('已应用底价建议', `底价已调整为 ¥${floorSuggestion.suggestedPrice}`);
      setFloorSuggestion(prev => prev ? { ...prev, show: false } : undefined);
    } catch (err) {
      showError('应用失败', '网络错误，请稍后重试');
    } finally {
      setIsFloorApplyLoading(false);
    }
  };

  // 处理底价调整申请提交
  const handleFloorPriceRequest = (newFloorPrice: number, reason: string) => {
    const approval: FloorPriceApproval = {
      id: `floor-approval-${Date.now()}`,
      hotelId: hotel.hotelId,
      hotelName: hotel.hotelName,
      roomTypeId: currentRoom.id,
      roomTypeName: currentRoom.name,
      currentFloorPrice: currentRoom.floorPrice,
      requestedFloorPrice: newFloorPrice,
      reason,
      requestedBy: userType === 'huamei' ? '华美会运营' : '酒店员工',
      requestedByRole: userType === 'huamei' ? 'huamei_staff' : (userRole === 'staff' ? 'huamei_staff' : 'hotel_manager'),
      timestamp: Date.now(),
      status: 'pending',
    };
    setFloorPriceApproval(approval);
    
    // 如果是酒店老板/经理直接修改，直接应用
    if (userType === 'hotel' && (userRole === 'owner' || userRole === 'manager')) {
      // 更新本地底价数据 - 通过 setHotel 触发重新渲染
      setHotel(prev => ({
        ...prev,
        roomTypes: prev.roomTypes.map(rt => 
          rt.id === currentRoom.id ? { ...rt, floorPrice: newFloorPrice } : rt
        )
      }));
      success('底价已更新', `底价已调整为 ¥${newFloorPrice}`);
      setFloorPriceApproval(undefined);
    }
  };

  // 处理底价审批通过
  const handleFloorPriceApprove = (approvalId: string) => {
    if (floorPriceApproval && floorPriceApproval.id === approvalId) {
      // 应用底价调整 - 通过 setHotel 触发重新渲染
      setHotel(prev => ({
        ...prev,
        roomTypes: prev.roomTypes.map(rt => 
          rt.id === currentRoom.id ? { ...rt, floorPrice: floorPriceApproval.requestedFloorPrice } : rt
        )
      }));
      success('审批通过', `底价已调整为 ¥${floorPriceApproval.requestedFloorPrice}`);
      setFloorPriceApproval(undefined);
    }
  };

  // 处理底价审批拒绝
  const handleFloorPriceReject = (approvalId: string) => {
    if (floorPriceApproval && floorPriceApproval.id === approvalId) {
      info('已拒绝', '已拒绝底价调整申请');
      setFloorPriceApproval(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* 底价建议浮动通知 */}
      <FloorPriceSuggestion 
        suggestion={floorSuggestion} 
        onApply={handleApplyFloorSuggestion}
        onDismiss={() => setFloorSuggestion(prev => prev ? { ...prev, show: false } : undefined)}
        isLoading={isFloorApplyLoading}
      />

      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />返回多酒店视图
        </button>
        <div className="h-6 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-600" />
          <h2 className="text-xl font-bold text-gray-900">{hotel.hotelName}</h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">{hotel.city}</span>
        </div>
      </div>

      {/* 房型选择标签 */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm">
        <Bed size={16} className="text-gray-400 ml-2" />
        {hotel.roomTypes.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoomType(room.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${room.id === selectedRoomType ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {room.name}
          </button>
        ))}
      </div>

      {/* AI定价建议面板 */}
      <AIRecommendationPanel 
        roomType={currentRoom} 
        hotelDetail={hotel} 
        onApply={handleApplyAI}
        strategySource={strategySource}
        isLoading={isApplyLoading}
      />

      {/* 三列布局：智能助手 + 底价调整 + 渠道价格 */}
      <div className="grid grid-cols-3 gap-6">
        <SmartPricingPanel
          smartPricing={smartPricing}
          competitorAvg={currentRoom.competitorAvg}
          competitorMin={currentRoom.competitorMin}
          competitorMax={currentRoom.competitorMax}
          basePrice={currentRoom.currentPrice}
          isLoading={isLoading}
          onToggle={handleToggle}
          onToggleAuto={handleToggleAuto}
          onRefresh={handleRefresh}
          onChangeMode={handleChangeMode}
        />

        {/* 底价调整面板 - 带审批流程 */}
        <FloorPricePanel
          roomType={currentRoom}
          userRole={userRole}
          userType={userType}
          pendingApproval={floorPriceApproval}
          onRequestApproval={handleFloorPriceRequest}
          onApprove={handleFloorPriceApprove}
          onReject={handleFloorPriceReject}
        />

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-violet-600" />
            各渠道差异化售价
          </h4>
          <div className="space-y-2">
            {hotel.channels.map((channel) => {
              const platform = platformLogos[channel.channelId];
              return (
                <div key={channel.channelId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img 
                        src={platform?.logo || '/logo.jpg'} 
                        alt={channel.channelName} 
                        className="w-6 h-6 object-contain" 
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{channel.channelName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-gray-900 whitespace-nowrap">¥{channel.price}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${channel.diff > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {channel.diff > 0 ? '+' : ''}{channel.diff}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 视图：多酒店矩阵 - 全房型概览
// ============================================
function MultiHotelMatrixView({ hotels, onSelectHotel }: { hotels: any[]; onSelectHotel: (_h: any) => void }) {
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [isBatchSetting, setIsBatchSetting] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFloorPrice, setBatchFloorPrice] = useState<string>('');
  const [batchCeilingPrice, setBatchCeilingPrice] = useState<string>('');
  const [settingScope, setSettingScope] = useState<'all' | 'selected'>('selected');
  const { success, error: showError, info } = useToast();

  const hotelData = useMemo(() => hotels.map(h => generateHotelDetail(h)), [hotels]);
  const selectAll = selectedHotels.size === hotels.length;

  const toggleSelectAll = () => {
    setSelectedHotels(selectAll ? new Set() : new Set(hotels.map(h => h.id)));
  };

  const toggleHotel = (hotelId: string) => {
    setSelectedHotels(prev => {
      const newSet = new Set(prev);
      newSet.has(hotelId) ? newSet.delete(hotelId) : newSet.add(hotelId);
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-violet-600" />
          <span className="font-medium text-gray-900">多酒店全房型概览</span>
          <span className="text-sm text-gray-500">共 {hotels.length} 家酒店</span>
        </div>
        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          {selectAll ? <CheckSquare className="w-4 h-4 text-violet-600" /> : <Square className="w-4 h-4" />}
          全选
        </button>
      </div>

      {/* 酒店矩阵表格 - 显示所有房型 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-12"></th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">酒店</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">城市</th>
              {ROOM_TYPE_NAMES.map(name => (
                <th key={name} className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                  <div>{name}</div>
                  <div className="text-xs text-gray-400 font-normal">当前/建议</div>
                </th>
              ))}
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hotelData.map((data, idx) => {
              const isSelected = selectedHotels.has(data.hotelId);
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
                      {isSelected ? <CheckSquare className="w-4 h-4 text-violet-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="font-medium text-gray-900">{data.hotelName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500">{data.city}</td>
                  {data.roomTypes.map(room => (
                    <td key={room.id} className="py-4 px-2 text-center">
                      <div className="text-sm font-semibold text-gray-900">¥{room.currentPrice}</div>
                      <div className={`text-xs ${room.priceDiff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>AI: ¥{room.aiSuggestion}</div>
                    </td>
                  ))}
                  <td className="text-right py-4 px-4">
                    <button onClick={() => onSelectHotel(data)} className="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                      详细定价
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 批量操作栏 */}
      {selectedHotels.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="text-sm text-violet-700">已选择 <b>{selectedHotels.size}</b> 家酒店</div>
          <div className="flex items-center gap-2">
            {/* TODO: 批量操作功能待接入真实API */}
            <button 
              onClick={async () => {
                setIsBatchApplying(true);
                try {
                  info('批量应用中', `正在为 ${selectedHotels.size} 家酒店应用AI建议价格...`);
                  // TODO: 接入真实批量应用API
                  // const response = await pricingApi.batchApplySuggestions(Array.from(selectedHotels));
                  await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟API延迟
                  success('批量应用成功', `已为 ${selectedHotels.size} 家酒店应用AI建议价格`);
                  setSelectedHotels(new Set());
                } catch (err) {
                  showError('批量应用失败', '网络错误，请稍后重试');
                } finally {
                  setIsBatchApplying(false);
                }
              }}
              disabled={isBatchApplying || isBatchSetting}
              className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isBatchApplying && <RefreshCw className="w-4 h-4 animate-spin" />}
              批量应用建议价
            </button>
            <button 
              onClick={() => {
                if (selectedHotels.size === 0) {
                  info('请先选择酒店', '请至少选择一家酒店进行批量设置');
                  return;
                }
                setShowBatchModal(true);
                setSettingScope('selected');
              }}
              disabled={isBatchApplying || isBatchSetting}
              className="px-4 py-2 border border-violet-300 text-violet-700 text-sm rounded-lg hover:bg-violet-100 disabled:opacity-50 flex items-center gap-2"
            >
              {isBatchSetting && <RefreshCw className="w-4 h-4 animate-spin" />}
              批量设置底价/天花板
            </button>
          </div>
        </div>
      )}

      {/* 批量设置底价/天花板弹窗 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">批量设置底价/天花板</h3>
              <button 
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 设置范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">设置范围</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSettingScope('selected')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm border transition-colors ${
                      settingScope === 'selected'
                        ? 'bg-violet-50 border-violet-500 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    已选酒店 ({selectedHotels.size}家)
                  </button>
                  <button
                    onClick={() => setSettingScope('all')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm border transition-colors ${
                      settingScope === 'all'
                        ? 'bg-violet-50 border-violet-500 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    全部酒店 ({hotels.length}家)
                  </button>
                </div>
              </div>

              {/* 底价设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  底价 (元)
                  <span className="text-gray-400 font-normal ml-1">- 最低售价限制</span>
                </label>
                <input
                  type="number"
                  value={batchFloorPrice}
                  onChange={(e) => setBatchFloorPrice(e.target.value)}
                  placeholder="例如: 300"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 天花板设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  天花板价 (元)
                  <span className="text-gray-400 font-normal ml-1">- 最高售价限制</span>
                </label>
                <input
                  type="number"
                  value={batchCeilingPrice}
                  onChange={(e) => setBatchCeilingPrice(e.target.value)}
                  placeholder="例如: 1200"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 提示信息 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <p className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 设置后将影响{settingScope === 'selected' ? `已选中的 ${selectedHotels.size} 家` : `全部 ${hotels.length} 家`}酒店的定价策略</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!batchFloorPrice && !batchCeilingPrice) {
                    info('请至少设置一项', '底价或天花板价至少设置一项');
                    return;
                  }
                  
                  const floor = batchFloorPrice ? parseInt(batchFloorPrice) : null;
                  const ceiling = batchCeilingPrice ? parseInt(batchCeilingPrice) : null;
                  
                  if (floor && ceiling && floor >= ceiling) {
                    showError('设置错误', '底价必须小于天花板价');
                    return;
                  }

                  setIsBatchSetting(true);
                  try {
                    // 模拟API调用
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const targetHotels = settingScope === 'selected' 
                      ? hotels.filter(h => selectedHotels.has(h.id))
                      : hotels;
                    
                    success(
                      '设置成功',
                      `已为 ${targetHotels.length} 家酒店设置底价${floor ? `¥${floor}` : '不变'}/天花板${ceiling ? `¥${ceiling}` : '不变'}`
                    );
                    setShowBatchModal(false);
                    setBatchFloorPrice('');
                    setBatchCeilingPrice('');
                  } catch (err) {
                    showError('设置失败', '网络错误，请稍后重试');
                  } finally {
                    setIsBatchSetting(false);
                  }
                }}
                disabled={isBatchSetting}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isBatchSetting && <RefreshCw className="w-4 h-4 animate-spin" />}
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 视图：未来预测
// ============================================
function FuturePricingView({ hotels }: { hotels: any[] }) {
  const [viewRange, setViewRange] = useState<7 | 14 | 30>(14);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('大床房');
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotels[0]?.id);
  const [appliedDates, setAppliedDates] = useState<Set<string>>(new Set());
  const [applyingDate, setApplyingDate] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const basePrice = 450;
  const futureData = useMemo(() => generateFutureData(viewRange, basePrice, selectedRoomType), [viewRange, selectedRoomType]);

  const stats = useMemo(() => ({
    avgAiPrice: Math.round(futureData.reduce((sum, d) => sum + d.aiSuggestion, 0) / futureData.length),
    avgCompetitorPrice: Math.round(futureData.reduce((sum, d) => sum + d.competitorAvg, 0) / futureData.filter(d => d.competitorAvg).length) || 0,
    priceDiff: 0,
    eventDays: futureData.filter(d => d.events.length > 0).length,
    appliedCount: appliedDates.size,
    totalDays: futureData.length,
  }), [futureData, appliedDates]);

  stats.priceDiff = stats.avgCompetitorPrice > 0 ? Math.round(((stats.avgAiPrice - stats.avgCompetitorPrice) / stats.avgCompetitorPrice) * 100) : 0;

  const handleApplyPrice = async (dateStr: string) => {
    setApplyingDate(dateStr);
    try {
      // TODO: 接入真实未来定价API
      // const response = await pricingApi.applyFuturePrice(selectedHotelId, selectedRoomType, dateStr, aiSuggestion);
      await new Promise(resolve => setTimeout(resolve, 600)); // 模拟API延迟
      setAppliedDates(prev => new Set([...prev, dateStr]));
      success('定价已应用', `已成功应用 ${dateStr} 的AI建议定价`);
    } catch (err) {
      showError('应用失败', '网络错误，请稍后重试');
    } finally {
      setApplyingDate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          {hotels.length > 1 && (
            <select value={selectedHotelId} onChange={(e) => setSelectedHotelId(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {ROOM_TYPE_NAMES.map(name => (
              <button
                key={name}
                onClick={() => setSelectedRoomType(name)}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${selectedRoomType === name ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <SegmentedControl value={viewRange} onChange={(v) => setViewRange(v)} options={[{ value: 7, label: '7天' }, { value: 14, label: '14天' }, { value: 30, label: '30天' }]} size="sm" />
      </div>

      {/* 关键指标统计卡片 - 5列 */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'AI建议均价', value: `¥${stats.avgAiPrice}`, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', icon: TrendingUp },
          { label: '竞品均价', value: `¥${stats.avgCompetitorPrice}`, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', icon: BarChart3 },
          { label: '价差优势', value: `${stats.priceDiff >= 0 ? '+' : ''}${stats.priceDiff}%`, color: stats.priceDiff >= 0 ? 'text-emerald-600' : 'text-red-600', bg: stats.priceDiff >= 0 ? 'bg-emerald-50' : 'bg-red-50', border: stats.priceDiff >= 0 ? 'border-emerald-200' : 'border-red-200', icon: DollarSign },
          { label: '事件影响天数', value: stats.eventDays, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Calendar },
          { label: '已应用定价', value: stats.appliedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`${stat.bg} rounded-xl p-4 border ${stat.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* 日期卡片网格 */}
      <div className="grid grid-cols-7 gap-3">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2 bg-gray-50 rounded-lg">{day}</div>
        ))}
        {futureData.map((dateInfo, idx) => (
          <motion.div
            key={dateInfo.dateStr}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`relative p-3 rounded-xl border transition-all cursor-pointer group ${
              appliedDates.has(dateInfo.dateStr) ? 'border-emerald-300 bg-emerald-50' : 
              dateInfo.events.length > 0 ? 'border-amber-200 bg-amber-50' : 
              dateInfo.isWeekend ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-white'
            } hover:border-cyan-300`}
            onClick={() => !appliedDates.has(dateInfo.dateStr) && handleApplyPrice(dateInfo.dateStr)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${dateInfo.isWeekend ? 'text-violet-600' : 'text-gray-900'}`}>{dateInfo.display}</span>
              <span className="text-xs text-gray-400">{dateInfo.weekday}</span>
            </div>
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">竞品均价</div>
              <div className="text-lg font-mono font-bold text-violet-600">¥{dateInfo.competitorAvg || '-'}</div>
            </div>
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">AI建议</div>
              <div className="text-xl font-mono font-bold text-cyan-600">¥{dateInfo.aiSuggestion}</div>
            </div>
            <div className={`text-xs mb-2 ${getInventoryColor(dateInfo.inventoryStatus).replace('bg-', 'text-')}`}>库存{dateInfo.inventoryStatus === 'soldout' ? '售罄' : dateInfo.inventoryStatus === 'tight' ? '紧张' : dateInfo.inventoryStatus === 'normal' ? '适中' : '充足'}</div>
            {dateInfo.events.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dateInfo.events.map((e, i) => {
                  const colors = getEventImpactColor(e.intensity);
                  return <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} flex items-center gap-0.5`}><Flame size={8} /> {e.name.slice(0, 4)}</span>;
                })}
              </div>
            )}
            <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {appliedDates.has(dateInfo.dateStr) ? (
                <span className="px-3 py-1.5 text-emerald-600 text-sm flex items-center gap-1"><CheckCircle2 size={14} />已应用</span>
              ) : applyingDate === dateInfo.dateStr ? (
                <span className="px-3 py-1.5 text-cyan-600 text-sm flex items-center gap-1"><RefreshCw size={14} className="animate-spin" />应用中...</span>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); handleApplyPrice(dateInfo.dateStr); }} className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm hover:bg-cyan-200">应用定价</button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 价格趋势对比图 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">价格趋势对比</h4>
        <div className="h-48 flex items-end justify-between gap-2 px-4">
          {futureData.slice(0, 14).map((dateInfo, idx) => {
            const maxPrice = Math.max(...futureData.map(d => Math.max(d.competitorAvg || 0, d.aiSuggestion)));
            const competitorHeight = dateInfo.competitorAvg ? (dateInfo.competitorAvg / maxPrice) * 100 : 0;
            const aiHeight = (dateInfo.aiSuggestion / maxPrice) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5 h-36">
                  {dateInfo.competitorAvg > 0 && <motion.div initial={{ height: 0 }} animate={{ height: `${competitorHeight}%` }} transition={{ delay: idx * 0.05 }} className="w-2 bg-violet-400/60 rounded-t" />}
                  <motion.div initial={{ height: 0 }} animate={{ height: `${aiHeight}%` }} transition={{ delay: idx * 0.05 }} className="w-2 bg-cyan-500/80 rounded-t" />
                </div>
                <span className="text-[10px] text-gray-400">{dateInfo.display}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <span className="flex items-center gap-2"><span className="w-3 h-3 bg-violet-400/60 rounded"></span>竞品均价</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 bg-cyan-500/80 rounded"></span>AI建议</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 视图：配置页面
// ============================================
function PricingConfigView() {
  const [activeConfigTab, setActiveConfigTab] = useState<'strategy' | 'channels' | 'approval'>('strategy');
  const [configLoading, setConfigLoading] = useState<Record<string, boolean>>({});
  const [aiRules, setAiRules] = useState([
    { name: '竞品售罄+我们紧张', action: '自动涨价 10%', enabled: true, id: 'rule-1' },
    { name: '房间空置率>30%', action: '建议降价 5-8%', enabled: true, id: 'rule-2' },
    { name: '周末溢价', action: '自动上浮 10-15%', enabled: true, id: 'rule-3' },
    { name: '高影响事件', action: '建议上浮 20-30%', enabled: false, id: 'rule-4' },
  ]);
  const [channelStrategies, setChannelStrategies] = useState([
    { name: '携程', coefficient: 1.02, enabled: true, description: '高端用户，可接受溢价', id: 'ch-1' },
    { name: '美团', coefficient: 0.98, enabled: true, description: '价格敏感，需有竞争力', id: 'ch-2' },
    { name: '飞猪', coefficient: 1.0, enabled: true, description: '跟随基准价', id: 'ch-3' },
    { name: '官方微信', coefficient: 1.0, enabled: true, description: '直销渠道，基准价', id: 'ch-4' },
    { name: '小红书', coefficient: 1.05, enabled: true, description: '年轻用户，品质溢价', id: 'ch-5' },
    { name: '闲鱼', coefficient: 0.95, enabled: false, description: '尾货渠道，低价促销', id: 'ch-6' },
  ]);
  const { success, error: showError } = useToast();
  
  const handleToggleRule = async (ruleId: string) => {
    setConfigLoading(prev => ({ ...prev, [ruleId]: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setAiRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      ));
      success('设置已更新', 'AI定价规则已更新');
    } catch (err) {
      showError('更新失败', '网络错误，请稍后重试');
    } finally {
      setConfigLoading(prev => ({ ...prev, [ruleId]: false }));
    }
  };
  
  const handleToggleChannel = async (channelId: string) => {
    setConfigLoading(prev => ({ ...prev, [channelId]: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setChannelStrategies(prev => prev.map(ch => 
        ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
      ));
      success('渠道策略已更新', '渠道差异化策略已更新');
    } catch (err) {
      showError('更新失败', '网络错误，请稍后重试');
    } finally {
      setConfigLoading(prev => ({ ...prev, [channelId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 配置标签 */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm w-fit">
        {[
          { key: 'strategy', label: '统控策略', icon: Sliders },
          { key: 'channels', label: '渠道策略', icon: Globe },
          { key: 'approval', label: '审批流', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveConfigTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${activeConfigTab === key ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* 统控策略配置 */}
      {activeConfigTab === 'strategy' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-violet-600" />集团统控策略</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">底价红线控制</div>
                  <div className="text-sm text-gray-500">低于底价需要集团审批</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600 font-medium">已启用</span>
                  <button 
                    onClick={() => success('设置已更新', '底价红线控制已启用')}
                    className="w-10 h-6 bg-emerald-500 rounded-full relative transition-colors hover:bg-emerald-600"
                  >
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">天花板价限制</div>
                  <div className="text-sm text-gray-500">防止定价过高影响品牌</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600 font-medium">已启用</span>
                  <button 
                    onClick={() => success('设置已更新', '天花板价限制已启用')}
                    className="w-10 h-6 bg-emerald-500 rounded-full relative transition-colors hover:bg-emerald-600"
                  >
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">智能调价间隔</div>
                  <div className="text-sm text-gray-500">最小调价时间间隔</div>
                </div>
                <select 
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  onChange={(e) => success('设置已更新', `智能调价间隔已设置为${e.target.value}`)}
                >
                  <option>5分钟</option>
                  <option>15分钟</option>
                  <option>30分钟</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-violet-600" />AI定价规则</h4>
            <div className="space-y-4">
              {aiRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{rule.name}</div>
                    <div className="text-sm text-gray-500">{rule.action}</div>
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    disabled={configLoading[rule.id]}
                    className={`w-10 h-6 rounded-full relative transition-colors disabled:opacity-50 ${rule.enabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                  >
                    {configLoading[rule.id] ? (
                      <RefreshCw className="absolute top-1 left-1 w-4 h-4 text-white animate-spin" />
                    ) : (
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${rule.enabled ? 'right-1' : 'left-1'}`} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 渠道策略配置 */}
      {activeConfigTab === 'channels' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-violet-600" />渠道差异化策略</h4>
          <div className="space-y-3">
            {channelStrategies.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center font-bold text-gray-400">{channel.name[0]}</div>
                  <div>
                    <div className="font-medium text-gray-900">{channel.name}</div>
                    <div className="text-sm text-gray-500">{channel.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">价格系数</div>
                    <div className="font-semibold text-gray-900">{channel.coefficient.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleToggleChannel(channel.id)}
                    disabled={configLoading[channel.id]}
                    className={`w-10 h-6 rounded-full relative transition-colors disabled:opacity-50 ${channel.enabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                  >
                    {configLoading[channel.id] ? (
                      <RefreshCw className="absolute top-1 left-1 w-4 h-4 text-white animate-spin" />
                    ) : (
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${channel.enabled ? 'right-1' : 'left-1'}`} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 审批流配置 */}
      {activeConfigTab === 'approval' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-violet-600" />审批权限设置</h4>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">老板权限</span>
                </div>
                <div className="text-sm text-purple-700">• 直接修改所有价格<br/>• 审批员工申请<br/>• 设置底价/天花板</div>
              </div>
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-cyan-600" />
                  <span className="font-medium text-cyan-900">经理权限</span>
                </div>
                <div className="text-sm text-cyan-700">• 修改价格在底价之上<br/>• 审批员工申请<br/>• 查看所有数据</div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">员工权限</span>
                </div>
                <div className="text-sm text-gray-600">• 提交调价申请<br/>• 查看实时价格<br/>• 无直接修改权限</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-violet-600" />审批通知设置</h4>
            <div className="space-y-4">
              {[
                { id: 'wechat', name: '企业微信通知', desc: '价格审批推送到企业微信', enabled: true },
                { id: 'sms', name: '短信通知', desc: '紧急审批发送短信', enabled: true },
                { id: 'email', name: '邮件通知', desc: '每日价格变动汇总', enabled: false },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => success('设置已更新', `${item.name}已${item.enabled ? '关闭' : '启用'}`)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${item.enabled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export function UniversalPricing() {
  const [activeTab, setActiveTab] = useState<PricingTab>('realtime');
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedHotelDetail, setSelectedHotelDetail] = useState<HotelPricingDetail | null>(null);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('assist');
  const [pendingSuggestions, setPendingSuggestions] = useState(0);

  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const { user } = useAuthStore();
  const selectedHotels = hotels.filter(h => selectedHotelIds.includes(h.id));
  
  // 根据用户真实角色确定 userType 和 userRole
  // huamei: 华美会运营/管理员/集团角色 - 需要酒店审批
  // hotel: 酒店角色 - 根据具体角色判断是否需要审批
  const getUserTypeAndRole = (): { userType: 'huamei' | 'hotel'; userRole: UserRole } => {
    if (!user?.role) {
      return { userType: 'huamei', userRole: 'staff' };
    }
    
    // 酒店店长 - 可直接修改底价
    if (user.role === EnterpriseRole.HOTEL_MANAGER) {
      return { userType: 'hotel', userRole: 'owner' };
    }
    
    // 酒店员工/前台 - 需要老板审批
    if (user.role === EnterpriseRole.HOTEL_STAFF || user.role === EnterpriseRole.HOTEL_RECEPTION) {
      return { userType: 'hotel', userRole: 'staff' };
    }
    
    // 集团管理员、集团运营、区域经理、区域专员、超级管理员等 - 都需要酒店审批
    // 包括: GROUP_ADMIN, GROUP_OPERATOR, REGION_MANAGER, REGION_STAFF, SUPER_ADMIN
    return { userType: 'huamei', userRole: 'staff' };
  };
  
  const { userType, userRole } = getUserTypeAndRole();

  // 加载服务模式（单酒店视图时）
  useEffect(() => {
    if (selectedHotels.length === 1) {
      const loadServiceMode = async () => {
        const response = await pricingApi.getServiceMode(selectedHotels[0].id);
        if (response.success) {
          setServiceMode(response.data.mode);
          setPendingSuggestions(response.data.pendingSuggestions);
        }
      };
      loadServiceMode();
    }
  }, [selectedHotels]);

  if (selectedHotels.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Building2 className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500">请在顶部全局选择器中至少选择一家酒店</p>
        </div>
      </div>
    );
  }

  const modeConfig = SERVICE_MODE_CONFIG[serviceMode];

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">全域定价中心</h1>
            {/* 服务模式标识（单酒店视图时显示） */}
            {selectedHotels.length === 1 && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${modeConfig.badgeColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span className="text-xs font-medium">{modeConfig.label}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 ? (
              <span className="flex items-center gap-2">
                {selectedHotels[0].name} - 单酒店定价管理
                {/* 辅助决策模式：显示待确认建议 */}
                {serviceMode === 'assist' && pendingSuggestions > 0 && (
                  <Link 
                    to="/strategy/pricing" 
                    className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingSuggestions}条待确认建议
                  </Link>
                )}
                {/* 全权托管模式：显示自动执行提示 */}
                {serviceMode === 'full_trust' && (
                  <span className="text-emerald-600">AI自动执行中</span>
                )}
                {/* 完全自主模式：提示 */}
                {serviceMode === 'self_operated' && (
                  <span className="text-gray-500">自行定价模式</span>
                )}
              </span>
            ) : `已选择 ${selectedHotels.length} 家酒店 - 集团批量定价管理`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedHotels.length > 1 && activeTab === 'realtime' && (
            <SegmentedControl
              value={viewMode}
              onChange={(v) => { setViewMode(v); setSelectedHotelDetail(null); }}
              options={[
                { value: 'matrix', label: '多酒店矩阵', icon: <Grid3X3 className="w-4 h-4" /> },
                { value: 'detail', label: '单酒店深度', icon: <List className="w-4 h-4" /> },
              ]}
              size="md"
            />
          )}
          <SegmentedControl
            value={activeTab}
            onChange={(v) => { setActiveTab(v); setSelectedHotelDetail(null); }}
            options={[
              { value: 'realtime', label: '实时定价', icon: <Zap className="w-4 h-4" /> },
              { value: 'future', label: '未来预测', icon: <TrendingUp className="w-4 h-4" /> },
              { value: 'config', label: '配置', icon: <Settings className="w-4 h-4" /> },
            ]}
            size="md"
          />
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'realtime' && (
        <>
          {selectedHotelDetail ? (
            <SingleHotelPricingView 
              hotel={selectedHotelDetail} 
              onBack={() => setSelectedHotelDetail(null)} 
              userType={userType}
              userRole={userRole}
            />
          ) : selectedHotels.length === 1 || viewMode === 'detail' ? (
            <SingleHotelPricingViewWrapper 
              selectedHotel={selectedHotels[0]}
              userType={userType}
              userRole={userRole}
            />
          ) : (
            <MultiHotelMatrixView hotels={selectedHotels} onSelectHotel={(h) => setSelectedHotelDetail(h)} />
          )}
        </>
      )}

      {activeTab === 'future' && <FuturePricingView hotels={selectedHotels} />}
      {activeTab === 'config' && <PricingConfigView />}
    </div>
  );
}

export default UniversalPricing;
