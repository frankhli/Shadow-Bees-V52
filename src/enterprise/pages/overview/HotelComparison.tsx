/**
 * 门店对比 - 企业版
 * 
 * 核心功能：
 * - 酒店列表（健康度筛选、搜索）
 * - 多选对比（最多5家）
 * - 指标对比表格（GMV、RevPAR、入住率、AI采纳率等）
 * - 批量操作（选中后可批量调价/生成内容）
 */

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Download,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  List,
  Zap,
  FileText,
  Target,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { generateHotelMetrics, generateHotelAIMetrics } from '../../api/mockData';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 类型定义
// ============================================

type FilterStatus = 'all' | 'healthy' | 'warning' | 'critical';
type ViewMode = 'list' | 'comparison';
type SortBy = 'gmv' | 'occupancy' | 'revpar' | 'ai';
type TimeRange = 'today' | 'week' | 'month';

interface HotelWithMetrics {
  id: string;
  name: string;
  city: string;
  managerName?: string;
  healthStatus?: string;
  roomCount: number;
  // 计算出的指标
  revenue: number;
  orders: number;
  occupancyRate: number;
  revpar: number;
  adr: number;
  aiAdoptionRate: number;
  aiValue: number;
}

interface ComparisonMetric {
  key: keyof HotelWithMetrics;
  label: string;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

// ============================================
// 时间范围切换器
// ============================================

function TimeRangeSelector({ 
  value, 
  onChange 
}: { 
  value: TimeRange; 
  onChange: (range: TimeRange) => void;
}) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            value === range.value
              ? 'bg-white text-violet-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// 酒店卡片组件
// ============================================

function HotelCard({ 
  hotel, 
  isSelected, 
  isCompared,
  onClick, 
  onToggleCompare 
}: { 
  hotel: HotelWithMetrics;
  isSelected?: boolean;
  isCompared?: boolean;
  onClick: () => void;
  onToggleCompare: (e: React.MouseEvent) => void;
}) {
  const statusConfig = {
    healthy: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: CheckCircle },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: AlertTriangle },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: XCircle },
  };
  
  const status = hotel.healthStatus || 'healthy';
  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config.icon;
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative p-4 bg-white rounded-xl border transition-all cursor-pointer group ${
        isSelected 
          ? 'border-violet-500 shadow-md' 
          : isCompared
          ? 'border-blue-300 bg-blue-50/30'
          : 'border-gray-200 hover:border-violet-300'
      }`}
      onClick={onClick}
    >
      {/* 对比选择框 */}
      <div 
        className={`absolute top-3 right-3 w-6 h-6 rounded border flex items-center justify-center transition-colors ${
          isCompared 
            ? 'bg-blue-500 border-blue-500 text-white' 
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onClick={onToggleCompare}
      >
        {isCompared && <CheckCircle className="w-4 h-4" />}
      </div>
      
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-violet-100' : 'bg-gray-100'}`}>
          <Building2 className={`w-6 h-6 ${isSelected ? 'text-violet-600' : 'text-gray-500'}`} />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h4 className="font-semibold text-gray-900 truncate">{hotel.name}</h4>
          <p className="text-xs text-gray-500">{hotel.city} · {hotel.managerName || '暂无经理'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bg} ${config.text}`}>
              <Icon className="w-3 h-3" />
              {status === 'healthy' ? '健康' : status === 'warning' ? '警告' : '异常'}
            </span>
            <span className="text-xs text-gray-400">{hotel.roomCount}间房</span>
          </div>
        </div>
      </div>
      
      {/* 关键指标 */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-400">GMV</p>
          <p className="font-semibold text-gray-900">¥{(hotel.revenue / 10000).toFixed(1)}w</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">入住率</p>
          <p className="font-semibold text-gray-900">{(hotel.occupancyRate * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">AI采纳</p>
          <p className="font-semibold text-violet-600">{Math.round(hotel.aiAdoptionRate)}%</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 对比表格组件
// ============================================

function ComparisonTable({ hotels, comparedIds }: { hotels: HotelWithMetrics[]; comparedIds: string[] }) {
  const comparedHotels = hotels.filter(h => comparedIds.includes(h.id));
  
  const metrics: ComparisonMetric[] = [
    { key: 'revenue', label: 'GMV', format: (v) => `¥${(v / 10000).toFixed(1)}w`, higherIsBetter: true },
    { key: 'revpar', label: 'RevPAR', format: (v) => `¥${Math.round(v || 0)}`, higherIsBetter: true },
    { key: 'occupancyRate', label: '入住率', format: (v) => `${Math.round((v || 0) * 100)}%`, higherIsBetter: true },
    { key: 'adr', label: 'ADR', format: (v) => `¥${Math.round(v || 0)}`, higherIsBetter: true },
    { key: 'orders', label: '订单数', format: (v) => `${Math.round(v || 0)}`, higherIsBetter: true },
    { key: 'aiAdoptionRate', label: 'AI采纳率', format: (v) => `${Math.round(v || 0)}%`, higherIsBetter: true },
    { key: 'aiValue', label: 'AI贡献', format: (v) => `¥${(v / 10000).toFixed(1)}w`, higherIsBetter: true },
  ];
  
  // 计算每项指标的最大/最小值
  const getBestValue = (key: keyof HotelWithMetrics, higherIsBetter: boolean) => {
    const values = comparedHotels.map(h => h[key] as number);
    return higherIsBetter ? Math.max(...values) : Math.min(...values);
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-500" />
          指标对比
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">指标</th>
              {comparedHotels.map(h => (
                <th key={h.id} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {h.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map((metric) => {
              const bestValue = getBestValue(metric.key, metric.higherIsBetter);
              return (
                <tr key={metric.key}>
                  <td className="px-4 py-3 text-sm text-gray-500">{metric.label}</td>
                  {comparedHotels.map(h => {
                    const value = h[metric.key] as number;
                    const isBest = value === bestValue;
                    return (
                      <td 
                        key={h.id} 
                        className={`px-4 py-3 text-center text-sm font-medium ${
                          isBest ? 'text-green-600 bg-green-50/50' : 'text-gray-900'
                        }`}
                      >
                        {metric.format(value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function HotelComparison() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hotels, selectedHotelIds, selectMultipleHotels } = useEnterpriseStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('gmv');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  
  // 计算日期范围
  const dates = useMemo(() => {
    const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
    const list: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      list.push(date.toISOString().split('T')[0]);
    }
    return list;
  }, [timeRange]);
  
  // 计算带指标数据的酒店列表
  const hotelsWithMetrics = useMemo((): HotelWithMetrics[] => {
    return hotels.map(hotel => {
      // 汇总该酒店在当前时间范围的指标
      let revenue = 0;
      let orders = 0;
      let occupancyRate = 0;
      let revpar = 0;
      let adr = 0;
      let aiAdoptionRate = 0;
      let aiValue = 0;
      
      dates.forEach(date => {
        const metrics = generateHotelMetrics(hotel.id, date);
        const aiMetrics = generateHotelAIMetrics(hotel.id, date);
        
        revenue += metrics.revenue;
        orders += metrics.orders;
        occupancyRate += metrics.occupancyRate;
        revpar += metrics.revpar;
        adr += metrics.adr;
        aiAdoptionRate += aiMetrics.aiAdoptionRate;
        aiValue += aiMetrics.aiPricingLift + aiMetrics.aiContentLift + aiMetrics.aiServiceLift;
      });
      
      const days = dates.length || 1;
      
      return {
        ...hotel,
        revenue,
        orders,
        occupancyRate: occupancyRate / days,
        revpar: revpar / days,
        adr: adr / days,
        aiAdoptionRate: aiAdoptionRate / days,
        aiValue,
      };
    });
  }, [hotels, dates]);
  
  // 筛选酒店
  const filteredHotels = useMemo(() => {
    return hotelsWithMetrics.filter(hotel => {
      if (searchQuery && !hotel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterStatus !== 'all' && (hotel.healthStatus || 'healthy') !== filterStatus) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'gmv') return b.revenue - a.revenue;
      if (sortBy === 'occupancy') return b.occupancyRate - a.occupancyRate;
      if (sortBy === 'revpar') return b.revpar - a.revpar;
      return b.aiAdoptionRate - a.aiAdoptionRate;
    });
  }, [hotelsWithMetrics, searchQuery, filterStatus, sortBy]);
  
  // 健康度统计
  const healthStats = useMemo(() => {
    return {
      total: hotels.length,
      healthy: hotels.filter(h => (h.healthStatus || 'healthy') === 'healthy').length,
      warning: hotels.filter(h => h.healthStatus === 'warning').length,
      critical: hotels.filter(h => h.healthStatus === 'critical').length,
    };
  }, [hotels]);
  
  // 切换对比选择
  const toggleComparison = (hotelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setComparedIds(prev => {
      if (prev.includes(hotelId)) {
        return prev.filter(id => id !== hotelId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, hotelId];
    });
  };

  const periodLabel = {
    today: '今日',
    week: '本周',
    month: '本月',
  }[timeRange];

  // 导出数据功能
  const handleExport = useCallback(() => {
    if (filteredHotels.length === 0) {
      toast.warning('暂无数据可导出');
      return;
    }
    
    try {
      // 构建CSV数据
      const headers = ['酒店名称', '城市', '房间数', 'GMV(元)', '订单数', '入住率(%)', 'RevPAR(元)', 'ADR(元)', 'AI采纳率(%)', '健康状态'];
      
      const rows = filteredHotels.map(h => [
        h.name,
        h.city,
        h.roomCount,
        h.revenue,
        h.orders,
        (h.occupancyRate * 100).toFixed(0),
        Math.round(h.revpar || 0),
        Math.round(h.adr || 0),
        Math.round(h.aiAdoptionRate),
        h.healthStatus === 'healthy' ? '健康' : h.healthStatus === 'warning' ? '警告' : '异常'
      ]);
      
      // 添加汇总行
      const totalRevenue = filteredHotels.reduce((sum, h) => sum + h.revenue, 0);
      const totalOrders = filteredHotels.reduce((sum, h) => sum + h.orders, 0);
      const avgOccupancy = filteredHotels.reduce((sum, h) => sum + h.occupancyRate, 0) / filteredHotels.length;
      const avgAdr = filteredHotels.reduce((sum, h) => sum + h.adr, 0) / filteredHotels.length;
      const avgRevpar = filteredHotels.reduce((sum, h) => sum + h.revpar, 0) / filteredHotels.length;
      const avgAiAdoption = filteredHotels.reduce((sum, h) => sum + h.aiAdoptionRate, 0) / filteredHotels.length;
      
      rows.push(['汇总/平均', '-', '-', totalRevenue, totalOrders, (avgOccupancy * 100).toFixed(0), Math.round(avgRevpar), Math.round(avgAdr), Math.round(avgAiAdoption), '-']);
      
      // 构建CSV内容
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      // 创建并下载文件
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `门店对比数据_${periodLabel}_${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('导出成功', `已下载门店对比数据_${periodLabel}_${dateStr}.csv`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败', '请稍后重试');
    }
  }, [filteredHotels, periodLabel, toast]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">门店对比</h1>
          <p className="text-gray-500 text-sm mt-1">
            {hotels.length}家门店 · {periodLabel}数据对比分析
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button 
            onClick={handleExport}
            disabled={filteredHotels.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>
      </div>

      {/* 健康度筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'all' 
              ? 'bg-violet-100 text-violet-700' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          全部 ({healthStats.total})
        </button>
        <button
          onClick={() => setFilterStatus('healthy')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'healthy' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          健康 ({healthStats.healthy})
        </button>
        <button
          onClick={() => setFilterStatus('warning')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'warning' 
              ? 'bg-amber-100 text-amber-700' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          警告 ({healthStats.warning})
        </button>
        <button
          onClick={() => setFilterStatus('critical')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'critical' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          异常 ({healthStats.critical})
        </button>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            列表视图
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'comparison' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            对比视图
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索酒店..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-48"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="gmv">按GMV排序</option>
            <option value="occupancy">按入住率排序</option>
            <option value="revpar">按RevPAR排序</option>
            <option value="ai">按AI采纳率排序</option>
          </select>
        </div>
      </div>

      {/* 内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 酒店列表 */}
        <div className={`space-y-4 ${viewMode === 'comparison' ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                isSelected={selectedHotelIds.includes(hotel.id)}
                isCompared={comparedIds.includes(hotel.id)}
                onClick={() => selectMultipleHotels([hotel.id])}
                onToggleCompare={(e) => toggleComparison(hotel.id, e)}
              />
            ))}
          </div>
          
          {filteredHotels.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>没有找到匹配的酒店</p>
            </div>
          )}
        </div>
        
        {/* 对比视图 */}
        {viewMode === 'comparison' && (
          <div className="lg:col-span-2 space-y-6">
            {/* 已选对比酒店 */}
            {comparedIds.length > 0 && (
              <ComparisonTable hotels={hotelsWithMetrics} comparedIds={comparedIds} />
            )}
            
            {/* 快速选择 */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">快速选择对比 ({comparedIds.length}/5)</h3>
                {comparedIds.length > 0 && (
                  <button
                    onClick={() => setComparedIds([])}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    清空
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {filteredHotels.slice(0, 8).map(hotel => (
                  <button
                    key={hotel.id}
                    onClick={() => {
                      if (!comparedIds.includes(hotel.id) && comparedIds.length < 5) {
                        setComparedIds([...comparedIds, hotel.id]);
                      }
                    }}
                    disabled={comparedIds.includes(hotel.id) || comparedIds.length >= 5}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      comparedIds.includes(hotel.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : comparedIds.length >= 5
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{hotel.name}</div>
                    <div className="text-xs text-gray-400">GMV ¥{(hotel.revenue / 10000).toFixed(1)}w</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 批量操作 */}
            {comparedIds.length > 0 && (
              <div className="bg-violet-50 rounded-xl p-5 border border-violet-200">
                <h3 className="font-medium text-violet-900 mb-3">批量操作</h3>
                <p className="text-sm text-violet-600 mb-3">
                  已选择 {comparedIds.length} 家酒店进行批量操作
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => navigate('/strategy-center')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700"
                  >
                    <Zap className="w-4 h-4" />
                    批量调价
                  </button>
                  <button 
                    onClick={() => navigate('/content-center')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-violet-600 border border-violet-200 rounded-lg text-sm hover:bg-violet-50"
                  >
                    <FileText className="w-4 h-4" />
                    生成内容
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelComparison;
