/**
 * 数据大盘 - 企业版
 * 
 * 核心功能：
 * - GMV趋势图（近30天）
 * - 区域效能分布
 * - 酒店排名
 * - 渠道效能分析
 * - 异常聚合
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useCountUp } from '../../hooks/useCountUp';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  MapPin,
  BarChart3,
  ArrowUpRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  ChevronRight,
  Rocket,
  Download,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { dashboardApi } from '../../api';
import { generateHotelMetrics } from '../../api/mockData';
import { useToast } from '../../../components/ui/Toast';
import { formatSmartAmount, formatSmartCount, type SmartFormatResult } from '../../utils/formatters';

// ============================================
// 类型定义
// ============================================

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface TrendData {
  date: string;
  revenue: number;
  orders: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

// ============================================
// 指标卡片组件
// ============================================

// ============================================
// 数字动画组件
// ============================================

function AnimatedNumber({ value, duration = 1500, prefix = '', suffix = '', decimals = 0 }: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const { count } = useCountUp(value, { duration });
  
  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return num.toLocaleString('zh-CN');
  };
  
  return (
    <span>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}

// ============================================
// 加载骨架屏组件
// ============================================

function MetricCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative p-5 bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200" />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 rounded mt-2 animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded mt-2 animate-pulse" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    </motion.div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color,
  delay = 0,
  subtitle,
  animatedValue,
  smartFormat,
  isLoading = false
}: { 
  title: string;
  value?: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
  delay?: number;
  subtitle?: string;
  animatedValue?: { value: number; prefix?: string; suffix?: string; decimals?: number };
  smartFormat?: SmartFormatResult;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <MetricCardSkeleton delay={delay} />;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, boxShadow: `0 8px 24px ${color}15` }}
      className="relative p-5 bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1" title={smartFormat?.fullValue}>
            {smartFormat ? (
              <span className="flex items-baseline gap-0.5">
                <span>{smartFormat.prefix}{smartFormat.value}</span>
                {smartFormat.unit && <span className="text-sm text-gray-500">{smartFormat.unit}</span>}
              </span>
            ) : animatedValue ? (
              <AnimatedNumber {...animatedValue} />
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        </div>
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 趋势图表组件（简化版，使用CSS实现）
// ============================================

function TrendChart({ data, range }: { data: TrendData[]; range: TimeRange }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const minRevenue = Math.min(...data.map(d => d.revenue));
  const rangeRevenue = maxRevenue - minRevenue || 1;
  
  // 计算路径点
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.revenue - minRevenue) / rangeRevenue) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (range === 'today') return date.toLocaleTimeString('zh-CN', { hour: '2-digit' });
    if (range === 'week') return date.toLocaleDateString('zh-CN', { weekday: 'short' });
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-500" />
            GMV趋势
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {range === 'today' ? '今日实时' : range === 'week' ? '近7天' : range === 'month' ? '近30天' : '本年度'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-violet-600">
            ¥{(data.reduce((sum, d) => sum + d.revenue, 0) / 10000).toFixed(1)}万
          </div>
          <div className="text-xs text-gray-400">累计营收</div>
        </div>
      </div>
      
      {/* 简化图表 */}
      <div className="relative h-48 w-full">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f3f4f6" strokeWidth="0.5" />
          ))}
          
          {/* 面积填充 */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* 线条 */}
          <polyline
            points={points}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* 数据点 */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d.revenue - minRevenue) / rangeRevenue) * 80 - 10;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill="#8B5CF6"
              />
            );
          })}
        </svg>
        
        {/* X轴标签 */}
        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
            <span key={i}>{formatDate(d.date)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 酒店排名组件
// ============================================

function HotelRanking({ hotels, timeRange }: { hotels: any[]; timeRange: TimeRange }) {
  const navigate = useNavigate();
  const sortedHotels = [...hotels].sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
  
  const rankColors = ['#FFB800', '#C0C0C0', '#CD7F32'];
  
  // 格式化 GMV 显示
  const formatGMV = (gmv: number) => {
    if (gmv >= 10000) {
      return `¥${(gmv / 10000).toFixed(1)}万`;
    }
    return `¥${Math.round(gmv)}`;
  };
  
  const periodLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '本年',
  }[timeRange];
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">酒店业绩排名</h3>
            <p className="text-xs text-gray-500">{periodLabel}GMV</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {sortedHotels.map((hotel, index) => (
          <motion.div
            key={hotel.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/hotel-workbench/${hotel.id}`)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            {/* 排名 */}
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: index < 3 ? `${rankColors[index]}20` : '#f3f4f6',
                color: index < 3 ? rankColors[index] : '#9ca3af'
              }}
            >
              {index + 1}
            </div>
            
            {/* 酒店信息 */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-medium text-gray-900 text-sm truncate" title={hotel.name}>
                {hotel.name}
              </h4>
              <p className="text-xs text-gray-500 truncate">{hotel.city} · {hotel.roomCount}间</p>
            </div>
            
            {/* 指标 */}
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-violet-600 text-sm whitespace-nowrap">
                {formatGMV(hotel.gmv || 0)}
              </div>
              <div className="text-[10px] text-gray-400 whitespace-nowrap">
                入住 {(hotel.avgOccupancy * 100).toFixed(0)}%
              </div>
            </div>
            
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors flex-shrink-0" />
          </motion.div>
        ))}
        
        {sortedHotels.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 渠道效能组件
// ============================================

function ChannelPerformance({ selectedHotelIds, timeRange }: { selectedHotelIds: string[]; timeRange: TimeRange }) {
  // 基于选中酒店和时间范围生成渠道数据
  const channels = useMemo(() => {
    // 种子基于酒店ID和时间范围，确保数据一致性
    const seed = selectedHotelIds.join(',') + timeRange;
    const hash = seed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const random = Math.abs(hash) / 2147483647;
    
    // 基础渠道配置
    const baseChannels = [
      { name: '携程', code: 'ctrip', color: '#00A8FF', baseRatio: 0.35, logo: '/logos/ctrip.jpg' },
      { name: '美团', code: 'meituan', color: '#FFC300', baseRatio: 0.25, logo: '/logos/meituan.jpg' },
      { name: '小红书', code: 'xiaohongshu', color: '#FF2442', baseRatio: 0.15, logo: '/logos/xiaohongshu.jpg' },
      { name: '闲鱼', code: 'xianyu', color: '#FFB800', baseRatio: 0.10, logo: '/logos/xianyu.jpg' },
      { name: '微信', code: 'wechat', color: '#07C160', baseRatio: 0.15, logo: '/logos/wechat.jpg' },
    ];
    
    // 生成各渠道数据（基于选中酒店数量）
    const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const baseGMV = selectedHotelIds.length * 8000 * days; // 每家酒店每天约8000GMV
    
    return baseChannels.map((c, i) => {
      // 添加一些随机波动
      const variation = 0.8 + ((random * 100 * (i + 1)) % 40) / 100; // 0.8 - 1.2
      const gmv = Math.round(baseGMV * c.baseRatio * variation);
      const orders = Math.round(gmv / 150); // 平均客单价150
      const change = Math.round(((variation - 1) * 100));
      
      return { ...c, gmv, orders, change };
    });
  }, [selectedHotelIds, timeRange]);
  
  const totalGMV = channels.reduce((sum, c) => sum + c.gmv, 0);
  const totalOrders = channels.reduce((sum, c) => sum + c.orders, 0);
  
  // 格式化 GMV 显示
  const formatGMV = (gmv: number) => {
    if (gmv >= 10000) {
      return `¥${(gmv / 10000).toFixed(1)}万`;
    }
    return `¥${Math.round(gmv)}`;
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">渠道效能</h3>
            <p className="text-xs text-gray-500">GMV {formatGMV(totalGMV)} · {totalOrders}单</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {channels.map((channel, index) => {
          const percentage = totalGMV > 0 ? (channel.gmv / totalGMV) * 100 : 0;
          const isPositive = channel.change >= 0;
          return (
            <motion.div
              key={channel.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <img 
                    src={channel.logo} 
                    alt={channel.name}
                    className="w-7 h-7 rounded-lg object-contain flex-shrink-0 border border-gray-100"
                    onError={(e) => {
                      // 如果图片加载失败，显示首字母
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="w-7 h-7 rounded-lg items-center justify-center text-xs font-bold flex-shrink-0 hidden"
                    style={{ background: `${channel.color}20`, color: channel.color }}
                  >
                    {channel.name[0]}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-sm font-medium text-gray-900 truncate">{channel.name}</div>
                    <div className="text-[10px] text-gray-500">{channel.orders}单</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold whitespace-nowrap" style={{ color: channel.color }}>
                    ¥{(channel.gmv / 10000).toFixed(1)}万
                  </div>
                  <div className={`text-[10px] whitespace-nowrap ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{channel.change}%
                  </div>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: channel.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 异常聚合组件
// ============================================

function AnomalyList({ selectedHotelIds }: { selectedHotelIds: string[] }) {
  const [anomalies, setAnomalies] = useState<{ id: string; type: string; level: string; title: string; description: string; hotelName: string }[]>([]);
  
  useEffect(() => {
    const fetchAlerts = async () => {
      const res = await dashboardApi.getDashboardAlerts(selectedHotelIds);
      if (res.success) {
        setAnomalies(res.data.map((a, i) => ({ 
          id: String(i), 
          type: a.type.includes('price') ? 'pricing' : a.type.includes('inventory') ? 'inventory' : 'content',
          level: a.severity === 'high' ? 'critical' : 'warning',
          title: a.title,
          description: a.description,
          hotelName: selectedHotelIds.length === 1 ? '' : '多酒店'
        })));
      }
    };
    fetchAlerts();
  }, [selectedHotelIds]);
  
  const typeConfig: Record<string, { label: string; color: string }> = {
    pricing: { label: '定价', color: 'purple' },
    inventory: { label: '库存', color: 'cyan' },
    content: { label: '内容', color: 'amber' },
  };
  
  const levelConfig: Record<string, { icon: any; color: string }> = {
    critical: { icon: AlertOctagon, color: 'red' },
    warning: { icon: AlertTriangle, color: 'amber' },
    info: { icon: CheckCircle, color: 'green' },
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">待处理异常</h3>
            <p className="text-xs text-gray-500">{anomalies.length} 项需要关注</p>
          </div>
        </div>
        <Link to="/risk/warning" className="text-sm text-violet-600 hover:underline flex items-center gap-1">
          查看全部 <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="space-y-2">
        {anomalies.map((anomaly) => {
          const type = typeConfig[anomaly.type];
          const level = levelConfig[anomaly.level];
          const Icon = level.icon;
          
          return (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon className={`w-5 h-5 text-${level.color}-500 flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded bg-${type.color}-50 text-${type.color}-600`}>
                    {type.label}
                  </span>
                  <span className="text-xs text-gray-400">{anomaly.hotelName}</span>
                </div>
                <h5 className="font-medium text-sm mt-1 text-gray-900">{anomaly.title}</h5>
                <p className="text-xs text-gray-500 mt-0.5">{anomaly.description}</p>
              </div>
              <Link 
                to="/risk/warning"
                className="text-xs text-violet-600 hover:underline flex-shrink-0 px-2 py-1 rounded hover:bg-violet-50 transition-colors"
              >
                处理
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function DataDashboard() {
  const toast = useToast();
  const { hotels, selectedHotelIds, dashboardTrends, loadDashboardData } = useEnterpriseStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 加载趋势数据 - 当时间范围或酒店选择变化时重新加载
  // 获取两倍数据用于环比对比
  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
    
    // 获取趋势数据（获取两倍时间范围用于环比对比）
    const fetchTrends = async () => {
      const baseDays = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      // 获取两倍数据用于环比对比
      const res = await dashboardApi.getDashboardTrends(baseDays * 2, selectedHotelIds);
      if (res.success) {
        setTrends(res.data);
      }
      setIsLoading(false);
    };
    fetchTrends();
  }, [timeRange, loadDashboardData, selectedHotelIds]);

  // 导出报表功能 - 导出CSV格式数据
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // 构建CSV数据
      const headers = ['日期', '营收(元)', '订单数', '入住率(%)', 'ADR(元)', 'RevPAR(元)'];
      
      // 使用趋势数据或仪表板趋势数据
      const dataToExport = trends.length > 0 ? trends : dashboardTrends;
      
      if (dataToExport.length === 0) {
        toast.warning('暂无数据可导出');
        return;
      }
      
      const rows = dataToExport.map(d => [
        d.date,
        d.revenue,
        d.orders,
        (d.occupancyRate * 100).toFixed(2),
        Math.round(d.adr || 0),
        Math.round(d.revpar || 0)
      ]);
      
      // 添加汇总行
      const totalRevenue = dataToExport.reduce((sum, d) => sum + d.revenue, 0);
      const totalOrders = dataToExport.reduce((sum, d) => sum + d.orders, 0);
      const avgOccupancy = dataToExport.reduce((sum, d) => sum + d.occupancyRate, 0) / dataToExport.length;
      const avgAdr = dataToExport.reduce((sum, d) => sum + (d.adr || 0), 0) / dataToExport.length;
      const avgRevpar = dataToExport.reduce((sum, d) => sum + (d.revpar || 0), 0) / dataToExport.length;
      
      rows.push(['汇总/平均', totalRevenue, totalOrders, (avgOccupancy * 100).toFixed(2), Math.round(avgAdr), Math.round(avgRevpar)]);
      
      // 构建CSV内容
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      // 创建并下载文件
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const rangeLabel = { today: '今日', week: '本周', month: '本月', year: '本年' }[timeRange];
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `数据报表_${rangeLabel}_${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('导出成功', `已下载数据报表_${rangeLabel}_${dateStr}.csv`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败', '请稍后重试');
    } finally {
      setIsExporting(false);
    }
  }, [trends, dashboardTrends, timeRange]);

  // 计算每个酒店的指标（用于排名）
  const hotelsWithMetrics = useMemo(() => {
    if (selectedHotelIds.length === 0) return [];
    
    // 计算当前周期的日期范围
    const currentPeriodDays = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const dates: string[] = [];
    for (let i = currentPeriodDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // 为每个选中的酒店计算指标
    return selectedHotelIds.map(hotelId => {
      const hotel = hotels.find(h => h.id === hotelId);
      if (!hotel) return null;
      
      // 使用 generateHotelMetrics 计算该酒店在当前周期的数据
      let gmv = 0;
      let orders = 0;
      let totalOccupancy = 0;
      
      dates.forEach(date => {
        const metrics = generateHotelMetrics(hotelId, date);
        gmv += metrics.revenue;
        orders += metrics.orders;
        totalOccupancy += metrics.occupancyRate;
      });
      
      const avgOccupancy = dates.length > 0 ? totalOccupancy / dates.length : hotel.occupancyRate || 0;
      
      return {
        ...hotel,
        gmv,
        orders,
        avgOccupancy,
      };
    }).filter(Boolean);
  }, [hotels, selectedHotelIds, timeRange]);

  // 聚合统计数据（从趋势数据计算，更真实）
  const stats = useMemo(() => {
    const dataToUse = trends.length > 0 ? trends : dashboardTrends;
    if (dataToUse.length === 0) {
      return { gmv: 0, orders: 0, occupancy: 0, revpar: 0, gmvChange: 0, ordersChange: 0, occupancyChange: 0 };
    }
    
    // 计算当前周期的数据（取最近的数据）
    const currentPeriodDays = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const currentData = dataToUse.slice(-currentPeriodDays);
    
    // 当前周期汇总
    const totalRevenue = currentData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const totalOrders = currentData.reduce((sum, d) => sum + (d.orders || 0), 0);
    const avgOccupancy = currentData.length > 0
      ? currentData.reduce((sum, d) => sum + (d.occupancyRate || 0), 0) / currentData.length
      : 0;
    const avgRevpar = currentData.length > 0
      ? currentData.reduce((sum, d) => sum + (d.revpar || 0), 0) / currentData.length
      : 0;
    
    // 计算上一个周期的数据用于对比（取前一个同等长度的时间段）
    const previousData = dataToUse.slice(-currentPeriodDays * 2, -currentPeriodDays);
    
    // 如果没有上一个周期的数据，只返回当前数据，变化率为0
    if (previousData.length === 0 || previousData.length < currentPeriodDays * 0.5) {
      return { 
        gmv: totalRevenue, 
        orders: totalOrders, 
        occupancy: avgOccupancy, 
        revpar: avgRevpar, 
        gmvChange: 0, 
        ordersChange: 0, 
        occupancyChange: 0 
      };
    }
    
    // 上一个周期汇总
    const prevRevenue = previousData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const prevOrders = previousData.reduce((sum, d) => sum + (d.orders || 0), 0);
    const prevOccupancy = previousData.length > 0
      ? previousData.reduce((sum, d) => sum + (d.occupancyRate || 0), 0) / previousData.length
      : 0;
    
    // 计算变化率（限制在合理范围内，避免极端值）
    const calculateChange = (current: number, previous: number): number => {
      if (previous <= 0) return 0;
      const change = (current - previous) / previous;
      // 限制变化率在 -90% 到 +200% 之间，避免极端值
      return Math.max(-0.9, Math.min(2.0, change));
    };
    
    const gmvChange = calculateChange(totalRevenue, prevRevenue);
    const ordersChange = calculateChange(totalOrders, prevOrders);
    const occupancyChange = calculateChange(avgOccupancy, prevOccupancy);
    
    return {
      gmv: totalRevenue,
      orders: totalOrders,
      occupancy: avgOccupancy,
      revpar: avgRevpar,
      gmvChange,
      ordersChange,
      occupancyChange,
    };
  }, [trends, dashboardTrends, timeRange]);

  const rangeLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
    year: '本年',
  }[timeRange];

  const compareLabel = {
    today: '较昨日',
    week: '较上周',
    month: '较上月',
    year: '较上年',
  }[timeRange];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据大盘</h1>
          <p className="text-gray-500 text-sm mt-1">
            集团旗下 {selectedHotelIds.length} 家酒店经营数据分析
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 时间范围切换 */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-gray-200">
            {(['today', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range === 'today' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </motion.div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={`${rangeLabel}GMV`}
          smartFormat={isLoading ? undefined : formatSmartAmount(stats.gmv)}
          change={`${stats.gmvChange >= 0 ? '+' : ''}${(stats.gmvChange * 100).toFixed(1)}% ${compareLabel}`}
          trend={stats.gmvChange >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          color="#8B5CF6"
          delay={0}
          subtitle={isLoading ? '' : `${formatSmartCount(stats.orders).value}${formatSmartCount(stats.orders).unit}笔订单`}
          isLoading={isLoading}
        />
        <MetricCard
          title="总订单数"
          smartFormat={isLoading ? undefined : formatSmartCount(stats.orders)}
          change={`${stats.ordersChange >= 0 ? '+' : ''}${(stats.ordersChange * 100).toFixed(0)}% ${compareLabel}`}
          trend={stats.ordersChange >= 0 ? 'up' : 'down'}
          icon={BarChart3}
          color="#10B981"
          delay={0.05}
          isLoading={isLoading}
        />
        <MetricCard
          title="平均入住率"
          value={`${(stats.occupancy * 100).toFixed(1)}%`}
          change={`${stats.occupancyChange >= 0 ? '+' : ''}${(stats.occupancyChange * 100).toFixed(1)}% ${compareLabel}`}
          trend={stats.occupancyChange >= 0 ? 'up' : 'down'}
          icon={MapPin}
          color="#F59E0B"
          delay={0.1}
          animatedValue={isLoading ? undefined : { value: stats.occupancy * 100, suffix: '%', decimals: 1 }}
          isLoading={isLoading}
        />
        <MetricCard
          title="集团RevPAR"
          smartFormat={isLoading ? undefined : formatSmartAmount(stats.revpar)}
          change={`${stats.gmvChange >= 0 ? '+' : ''}${(stats.gmvChange * 100).toFixed(1)}% ${compareLabel}`}
          trend={stats.gmvChange >= 0 ? 'up' : 'down'}
          icon={Building2}
          color="#3B82F6"
          delay={0.15}
          isLoading={isLoading}
        />
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：趋势图 + 异常 */}
        <div className="lg:col-span-2 space-y-6">
          <TrendChart data={trends.length > 0 ? trends : dashboardTrends} range={timeRange} />
          <AnomalyList selectedHotelIds={selectedHotelIds} />
        </div>
        
        {/* 右侧：酒店排名 + 渠道效能 */}
        <div className="space-y-6">
          <HotelRanking hotels={hotelsWithMetrics} timeRange={timeRange} />
          <ChannelPerformance selectedHotelIds={selectedHotelIds} timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
}

export default DataDashboard;
