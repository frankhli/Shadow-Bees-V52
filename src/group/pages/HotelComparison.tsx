/**
 * Shadow-Bees V52 - 门店全景
 * 统一入口：门店列表 + 详情面板 + 对比分析 + 实时监控
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Download,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  List,
  MessageSquare,
  FileText,
  Tag,
} from 'lucide-react';
import { useGroupStore, type HotelInGroup, type TimeRange } from '../stores/groupStore';

// ============================================
// 类型定义
// ============================================

type ViewMode = 'list' | 'detail' | 'comparison';
type FilterStatus = 'all' | 'healthy' | 'warning' | 'critical';

// ============================================
// 子组件：门店卡片
// ============================================

function HotelCard({ hotel, isSelected, onClick }: { hotel: HotelInGroup; isSelected?: boolean; onClick: () => void }) {
  const statusColors = {
    healthy: { bg: 'bg-neon-green/10', border: 'border-neon-green/30', text: 'text-neon-green', icon: CheckCircle },
    warning: { bg: 'bg-neon-amber/10', border: 'border-neon-amber/30', text: 'text-neon-amber', icon: AlertTriangle },
    critical: { bg: 'bg-neon-red/10', border: 'border-neon-red/30', text: 'text-neon-red', icon: XCircle },
  };
  
  const style = statusColors[hotel.healthLevel];
  const Icon = style.icon;

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected ? 'bg-neon-purple/10 border-neon-purple' : 'bg-surface border-border-color hover:border-neon-purple/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${isSelected ? 'bg-neon-purple/20' : 'bg-surface-hover'} flex items-center justify-center`}>
            <Building2 className={`w-5 h-5 ${isSelected ? 'text-neon-purple' : 'text-text-secondary'}`} />
          </div>
          <div>
            <h4 className="font-medium text-sm">{hotel.name}</h4>
            <p className="text-xs text-text-secondary">{hotel.manager} · {hotel.region}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${style.text}`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border-color">
        <div className="text-center">
          <p className="text-xs text-text-secondary">GMV</p>
          <p className="text-sm font-medium">¥{(hotel.gmv / 10000).toFixed(1)}w</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-secondary">入住率</p>
          <p className="text-sm font-medium">{Math.round(hotel.occupancy)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-secondary">AI</p>
          <p className="text-sm font-medium">{Math.round(hotel.aiResolutionRate)}%</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 子组件：门店详情面板
// ============================================

function HotelDetailPanel({ hotel, onClose }: { hotel: HotelInGroup; onClose: () => void }) {
  const { selectedTimeRange } = useGroupStore();
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : selectedTimeRange === 'week' ? '本周' : selectedTimeRange === 'month' ? '本月' : '本年';
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-border-color z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{hotel.name}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* 基本信息 */}
        <div className="p-4 rounded-xl bg-surface-hover mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-neon-purple" />
            </div>
            <div>
              <p className="font-medium">{hotel.manager}</p>
              <p className="text-xs text-text-secondary">{hotel.region} · {hotel.roomCount}间房</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
            hotel.healthLevel === 'healthy' ? 'bg-neon-green/10 text-neon-green' :
            hotel.healthLevel === 'warning' ? 'bg-neon-amber/10 text-neon-amber' :
            'bg-neon-red/10 text-neon-red'
          }`}>
            {hotel.healthLevel === 'healthy' ? <CheckCircle className="w-3 h-3" /> :
             hotel.healthLevel === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
             <XCircle className="w-3 h-3" />}
            {hotel.healthLevel === 'healthy' ? '健康' : hotel.healthLevel === 'warning' ? '预警' : '异常'}
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-surface-hover">
            <p className="text-xs text-text-secondary">{timeRangeLabel}GMV</p>
            <p className="text-lg font-bold text-neon-purple">¥{(hotel.gmv / 10000).toFixed(1)}w</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-hover">
            <p className="text-xs text-text-secondary">RevPAR</p>
            <p className="text-lg font-bold text-neon-green">¥{Math.round(hotel.revpar)}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-hover">
            <p className="text-xs text-text-secondary">入住率</p>
            <p className="text-lg font-bold">{Math.round(hotel.occupancy)}%</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-hover">
            <p className="text-xs text-text-secondary">AI采纳率</p>
            <p className="text-lg font-bold text-neon-cyan">{Math.round(hotel.aiResolutionRate)}%</p>
          </div>
        </div>

        {/* AI功能使用情况 */}
        <div className="mb-4">
          <h3 className="font-medium mb-3">AI功能使用</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-hover">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neon-purple" />
                <span className="text-sm">内容生成</span>
              </div>
              <span className="text-sm">{Math.round(hotel.systemUsage.featureUsage.aiContent * 100)}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-hover">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neon-green" />
                <span className="text-sm">智能客服</span>
              </div>
              <span className="text-sm">{Math.round(hotel.systemUsage.featureUsage.aiService * 100)}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-hover">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-neon-cyan" />
                <span className="text-sm">智能定价</span>
              </div>
              <span className="text-sm">{Math.round(hotel.systemUsage.featureUsage.aiPricing * 100)}%</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-2">
          <button 
            onClick={() => {
              const report = {
                门店名称: hotel.name,
                所属区域: hotel.region,
                门店经理: hotel.manager,
                房间数量: hotel.roomCount,
                [`${timeRangeLabel}GMV`]: `¥${(hotel.gmv / 10000).toFixed(1)}万`,
                RevPAR: `¥${Math.round(hotel.revpar)}`,
                ADR: `¥${Math.round(hotel.adr)}`,
                入住率: `${Math.round(hotel.occupancy)}%`,
                健康度: hotel.healthLevel === 'healthy' ? '健康' : hotel.healthLevel === 'warning' ? '预警' : '异常',
                AI定价增收: `¥${(hotel.aiValue.pricingLift / 10000).toFixed(1)}万`,
                AI内容增收: `¥${(hotel.aiValue.contentLift / 10000).toFixed(1)}万`,
                AI客服增收: `¥${(hotel.aiValue.serviceLift / 10000).toFixed(1)}万`,
                AI总价值: `¥${(hotel.aiValue.totalLift / 10000).toFixed(1)}万`,
                节省工时: `${hotel.aiValue.laborHoursSaved}小时`,
                节省成本: `¥${(hotel.aiValue.laborCostSaved / 10000).toFixed(1)}万`,
                AI使用率: `${Math.round(hotel.aiResolutionRate)}%`,
                内容数量: hotel.contentCount,
                内容评分: Math.round(hotel.contentScore),
                客服评分: hotel.serviceScore.toFixed(1),
              };
              console.table(report);
              alert(`${hotel.name} 详细报表\n\n已导出至控制台\n按 F12 → Console 查看`);
            }}
            className="w-full py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
          >
            查看详细报表
          </button>
          <button 
            onClick={() => alert(`已为 ${hotel.name} 发起运营诊断申请`)}
            className="w-full py-2 border border-border-color rounded-lg hover:bg-surface-hover transition-colors"
          >
            发起运营诊断
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 子组件：对比分析
// ============================================

function ComparisonView({ hotels, selectedHotels }: { hotels: HotelInGroup[]; selectedHotels: string[] }) {
  const comparedHotels = hotels.filter(h => selectedHotels.includes(h.id));
  
  const metrics = [
    { label: 'GMV', key: 'gmv', format: (v: number) => `¥${(v / 10000).toFixed(1)}w` },
    { label: 'RevPAR', key: 'revpar', format: (v: number) => `¥${Math.round(v)}` },
    { label: '入住率', key: 'occupancy', format: (v: number) => `${Math.round(v)}%` },
    { label: 'AI采纳率', key: 'aiResolutionRate', format: (v: number) => `${Math.round(v)}%` },
    { label: '内容分', key: 'contentScore', format: (v: number) => `${Math.round(v)}` },
    { label: '客服分', key: 'serviceScore', format: (v: number) => `${v.toFixed(1)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-surface border border-border-color overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-color">
              <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">指标</th>
              {comparedHotels.map(h => (
                <th key={h.id} className="text-center py-3 px-2 text-sm font-medium">{h.name}</th>
              ))}
              <th className="text-center py-3 px-2 text-sm font-medium text-text-secondary">集团平均</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const values = comparedHotels.map(h => (h as any)[metric.key] as number);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              return (
                <tr key={metric.key} className="border-b border-border-color last:border-0">
                  <td className="py-3 px-2 text-sm">{metric.label}</td>
                  {values.map((v, i) => (
                    <td key={i} className="text-center py-3 px-2">
                      <span className={v > avg ? 'text-neon-green' : v < avg ? 'text-neon-red' : ''}>
                        {metric.format(v)}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-3 px-2 text-text-secondary">
                    {metric.format(avg)}
                  </td>
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
  const { hotels, selectedTimeRange, setTimeRange } = useGroupStore();
  
  const timeRangeLabel = selectedTimeRange === 'today' ? '今日' : selectedTimeRange === 'week' ? '本周' : selectedTimeRange === 'month' ? '本月' : '本年';
  
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const selectedHotel = useMemo(() => 
    hotels.find(h => h.id === selectedHotelId),
    [hotels, selectedHotelId]
  );

  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      if (searchQuery && !hotel.name.includes(searchQuery) && !hotel.manager.includes(searchQuery)) {
        return false;
      }
      if (filterStatus !== 'all' && hotel.healthLevel !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [hotels, searchQuery, filterStatus]);

  const healthStats = useMemo(() => {
    return {
      healthy: hotels.filter(h => h.healthLevel === 'healthy').length,
      warning: hotels.filter(h => h.healthLevel === 'warning').length,
      critical: hotels.filter(h => h.healthLevel === 'critical').length,
    };
  }, [hotels]);

  const toggleHotelSelection = (hotelId: string) => {
    setSelectedHotels(prev => 
      prev.includes(hotelId) 
        ? prev.filter(id => id !== hotelId)
        : prev.length < 5 ? [...prev, hotelId] : prev
    );
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
          <h1 className="text-2xl font-bold">门店全景</h1>
          <p className="text-text-secondary text-sm mt-1">
            {hotels.length}家门店 · {timeRangeLabel}数据 · 实时监控
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 时间范围切换 */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            {(['today', 'week', 'month', 'year'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-neon-purple text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {range === 'today' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          
          {/* 视图切换 */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'list' ? 'bg-neon-purple text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <List className="w-4 h-4" />
              列表
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'comparison' ? 'bg-neon-purple text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              对比
              {selectedHotels.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {selectedHotels.length}
                </span>
              )}
            </button>
          </div>

          <button 
            onClick={() => {
              // 模拟导出功能
              const data = hotels.map(h => ({
                门店: h.name,
                经理: h.manager,
                区域: h.region,
                GMV: `¥${(h.gmv / 10000).toFixed(1)}万`,
                入住率: `${Math.round(h.occupancy)}%`,
                AI使用率: `${Math.round(h.aiResolutionRate)}%`,
                健康度: h.healthLevel === 'healthy' ? '健康' : h.healthLevel === 'warning' ? '预警' : '异常'
              }));
              console.table(data);
              alert(`门店数据导出成功！\n共导出 ${hotels.length} 家门店数据`);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-color rounded-lg text-sm hover:border-neon-purple/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </motion.div>

      {/* 健康度概览 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-2xl font-bold">{hotels.length}</p>
          <p className="text-xs text-text-secondary">门店总数</p>
        </div>
        <div 
          className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20 cursor-pointer hover:bg-neon-green/10 transition-colors"
          onClick={() => setFilterStatus('healthy')}
        >
          <p className="text-2xl font-bold text-neon-green">{healthStats.healthy}</p>
          <p className="text-xs text-text-secondary">健康</p>
        </div>
        <div 
          className="p-4 rounded-xl bg-neon-amber/5 border border-neon-amber/20 cursor-pointer hover:bg-neon-amber/10 transition-colors"
          onClick={() => setFilterStatus('warning')}
        >
          <p className="text-2xl font-bold text-neon-amber">{healthStats.warning}</p>
          <p className="text-xs text-text-secondary">预警</p>
        </div>
        <div 
          className="p-4 rounded-xl bg-neon-red/5 border border-neon-red/20 cursor-pointer hover:bg-neon-red/10 transition-colors"
          onClick={() => setFilterStatus('critical')}
        >
          <p className="text-2xl font-bold text-neon-red">{healthStats.critical}</p>
          <p className="text-xs text-text-secondary">异常</p>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索门店或经理..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: 'none' }}
        >
          <option value="all">全部状态</option>
          <option value="healthy">健康</option>
          <option value="warning">预警</option>
          <option value="critical">异常</option>
        </select>
        {filterStatus !== 'all' && (
          <button 
            onClick={() => setFilterStatus('all')}
            className="text-sm text-neon-purple hover:underline"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                isSelected={selectedHotelId === hotel.id}
                onClick={() => setSelectedHotelId(hotel.id)}
              />
            ))}
          </motion.div>
        )}

        {viewMode === 'comparison' && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* 门店选择 */}
            <div className="p-4 rounded-xl bg-surface border border-border-color">
              <p className="text-sm text-text-secondary mb-3">
                选择对比门店（最多5家）：{selectedHotels.length}/5
              </p>
              <div className="flex flex-wrap gap-2">
                {hotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => toggleHotelSelection(hotel.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedHotels.includes(hotel.id)
                        ? 'bg-neon-purple text-white'
                        : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {hotel.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedHotels.length >= 2 ? (
              <ComparisonView hotels={hotels} selectedHotels={selectedHotels} />
            ) : (
              <div className="p-12 text-center text-text-secondary">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>请选择至少2家门店进行对比</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 门店详情抽屉 */}
      <AnimatePresence>
        {selectedHotel && (
          <HotelDetailPanel 
            hotel={selectedHotel} 
            onClose={() => setSelectedHotelId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default HotelComparison;
