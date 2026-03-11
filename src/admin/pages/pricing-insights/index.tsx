/**
 * 定价洞察 - 算法优化中心（完整版）
 * 
 * 核心功能：
 * 1. 实时数据收集：监听酒店端改价事件
 * 2. 算法模板性能：展示模板效果
 * 3. 酒店定价画像：分类管理酒店
 * 4. 智能优化建议：基于真实数据生成
 * 
 * DEBUG: v20240215-1750 - 已更新酒店数据
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Building2,
  Zap,
  AlertCircle,
  ChevronRight,
  BarChart3,
  PieChart,
  Settings,
  Activity,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pricingDataCollector, type PricingDecisionEvent } from '@/admin/services/pricingDataCollector';
import { pricingOutcomeTracker } from '@/admin/services/pricingOutcomeTracker';
import { algorithmOptimizer, type OptimizationResult } from '@/admin/services/algorithmOptimizer';

// 模拟数据 - 模板性能
const mockTemplatePerformance = [
  {
    id: 'tpl-cbd-business-001',
    name: 'CBD商务酒店 - 动态定价',
    strategy: 'dynamic' as const,
    applicableHotels: 12,
    totalSuggestions: 68,
    acceptRate: 75,
    avgRevenuePerRoom: 420,
    occupancyRate: 82,
    priceElasticity: 0.4,
    staleRate: 8,
    status: 'active' as const,
  },
  {
    id: 'tpl-scenic-resort-001',
    name: '景区度假酒店 - 黄牛模式',
    strategy: 'scalper' as const,
    applicableHotels: 8,
    totalSuggestions: 45,
    acceptRate: 45,
    avgRevenuePerRoom: 680,
    occupancyRate: 68,
    priceElasticity: 0.8,
    staleRate: 25,
    status: 'needs_optimization' as const,
  },
  {
    id: 'tpl-suburb-economy-001',
    name: '郊区经济酒店 - 尾货模式',
    strategy: 'clearance' as const,
    applicableHotels: 15,
    totalSuggestions: 43,
    acceptRate: 85,
    avgRevenuePerRoom: 180,
    occupancyRate: 88,
    priceElasticity: 1.5,
    staleRate: 5,
    status: 'active' as const,
  },
];

// 模拟数据 - 酒店画像（与酒店端 hotels.ts 同步）
const mockHotelProfiles = [
  {
    hotelId: 'sanlitun',
    hotelName: '三里屯潮流酒店',
    type: '自主型' as const,
    acceptRate: 30,
    aiRevenue: 12500,
    selfRevenue: 11800,
    staleRate: 15,
    pricingStyle: 'expert' as const,
    suggestion: '该酒店自主定价能力强，建议减少价格干预，专注内容策略',
  },
  {
    hotelId: 'chongli',
    hotelName: '崇礼星空酒店',
    type: '信任型' as const,
    acceptRate: 95,
    aiRevenue: 15200,
    selfRevenue: 0,
    staleRate: 8,
    pricingStyle: 'auto' as const,
    suggestion: '完全信任AI，收益稳定，保持当前策略',
  },
  {
    hotelId: 'dali',
    hotelName: '大理洱海酒店',
    type: '混合型' as const,
    acceptRate: 55,
    aiRevenue: 8900,
    selfRevenue: 9200,
    staleRate: 12,
    pricingStyle: 'learning' as const,
    suggestion: '部分场景AI建议效果不佳，需针对性优化事件响应策略',
  },
];

export default function PricingInsightsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'hotels' | 'optimization'>('overview');
  
  // 实时数据收集相关状态
  const [events, setEvents] = useState<PricingDecisionEvent[]>([]);
  const [, setIsLoading] = useState(true);
  const [realtimeStats, setRealtimeStats] = useState({
    totalEvents: 0,
    avgPriceChange: 0,
    upCount: 0,
    downCount: 0,
  });
  
  // 算法优化相关状态
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 计算核心指标
  const stats = useMemo(() => {
    return {
      totalHotels: mockHotelProfiles.length,
      trustTypeHotels: mockHotelProfiles.filter(h => h.type === '信任型').length,
      avgAcceptRate: Math.round(mockHotelProfiles.reduce((sum, h) => sum + h.acceptRate, 0) / mockHotelProfiles.length),
      totalSuggestions: mockTemplatePerformance.reduce((sum, t) => sum + t.totalSuggestions, 0),
    };
  }, []);

  useEffect(() => {
    // 初始化数据收集器
    pricingDataCollector.init().then(() => {
      console.log('[PricingInsights] Data collector initialized');
    });

    // 启动结果追踪器
    pricingOutcomeTracker.start();

    // 读取已收集的事件
    loadEvents();

    // 监听新的改价事件
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sb_pricing_events_')) {
        loadEvents();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      pricingOutcomeTracker.stop();
    };
  }, []);

  const loadEvents = async () => {
    const allEvents: PricingDecisionEvent[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb_pricing_events_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const hotelEvents = JSON.parse(data);
            allEvents.push(...hotelEvents);
          }
        } catch {
          // ignore
        }
      }
    }

    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(allEvents.slice(0, 100));
    
    const upCount = allEvents.filter(e => e.priceChange.newPrice > e.priceChange.oldPrice).length;
    const downCount = allEvents.filter(e => e.priceChange.newPrice < e.priceChange.oldPrice).length;
    const avgChange = allEvents.length > 0
      ? allEvents.reduce((sum, e) => sum + (e.priceChange.newPrice - e.priceChange.oldPrice), 0) / allEvents.length
      : 0;
    
    setRealtimeStats({
      totalEvents: allEvents.length,
      avgPriceChange: Math.round(avgChange),
      upCount,
      downCount,
    });
    
    setIsLoading(false);
  };

  // 运行全局算法优化
  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const result = await algorithmOptimizer.optimizeGlobalTemplates();
      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const chartData = events
    .slice(0, 20)
    .reverse()
    .map((e, idx) => ({
      index: idx + 1,
      oldPrice: e.priceChange.oldPrice,
      newPrice: e.priceChange.newPrice,
      change: e.priceChange.newPrice - e.priceChange.oldPrice,
    }));

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-[#151B2B] rounded-xl border border-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">算法模板数</span>
            <Brain className="text-[#00F0FF]" size={20} />
          </div>
          <p className="text-3xl font-bold">{mockTemplatePerformance.length}</p>
          <p className="text-xs text-gray-500 mt-1">全部活跃</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 bg-[#151B2B] rounded-xl border border-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">建议采纳率</span>
            <Target className="text-green-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-green-400">{stats.avgAcceptRate}%</p>
          <p className="text-xs text-gray-500 mt-1">目标: 75%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 bg-[#151B2B] rounded-xl border border-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">实时定价事件</span>
            <Activity className="text-[#00F0FF]" size={20} />
          </div>
          <p className="text-3xl font-bold text-[#00F0FF]">{realtimeStats.totalEvents}</p>
          <p className="text-xs text-gray-500 mt-1">
            ↑{realtimeStats.upCount} ↓{realtimeStats.downCount}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 bg-[#151B2B] rounded-xl border border-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">信任型酒店</span>
            <Users className="text-purple-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-purple-400">{stats.trustTypeHotels}</p>
          <p className="text-xs text-gray-500 mt-1">共{stats.totalHotels}家酒店</p>
        </motion.div>
      </div>

      {/* 实时数据收集 */}
      {realtimeStats.totalEvents > 0 && (
        <Card className="bg-[#141B2D] border-[#2D3A55]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              实时定价数据
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 ml-2">
                <Activity className="w-3 h-3 mr-1" />
                收集中
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3A55" />
                  <XAxis dataKey="index" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141B2D', border: '1px solid #2D3A55' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line type="monotone" dataKey="oldPrice" stroke="#9CA3AF" name="原价" strokeWidth={2} />
                  <Line type="monotone" dataKey="newPrice" stroke="#00F0FF" name="新价" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 酒店效果对比 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-5 bg-[#151B2B] rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PieChart className="text-[#00F0FF]" size={20} />
            酒店定价类型分布
          </h3>
          <div className="space-y-3">
            {mockHotelProfiles.map((hotel) => (
              <div key={hotel.hotelId} className="p-3 bg-[#0B0F19] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{hotel.hotelName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    hotel.type === '信任型' ? 'bg-green-500/20 text-green-400' :
                    hotel.type === '自主型' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {hotel.type}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">采纳率</p>
                    <p className={hotel.acceptRate > 70 ? 'text-green-400' : 'text-amber-400'}>
                      {hotel.acceptRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">AI收益</p>
                    <p className="text-[#00F0FF]">¥{hotel.aiRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">滞销率</p>
                    <p className={hotel.staleRate < 10 ? 'text-green-400' : 'text-red-400'}>
                      {hotel.staleRate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-[#151B2B] rounded-xl border border-gray-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-[#00F0FF]" size={20} />
            最近定价事件
          </h3>
          <div className="space-y-2 max-h-64 overflow-auto">
            {events.slice(0, 5).map((event) => {
              const isUp = event.priceChange.newPrice > event.priceChange.oldPrice;
              const isDown = event.priceChange.newPrice < event.priceChange.oldPrice;
              
              return (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isUp ? 'bg-green-500/20 text-green-400' : 
                      isDown ? 'bg-red-500/20 text-red-400' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {isUp ? <TrendingUp size={14} /> : 
                       isDown ? <TrendingDown size={14} /> : 
                       <DollarSign size={14} />}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{event.hotelId}</div>
                      <div className="text-xs text-gray-500">{formatTime(event.timestamp)}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-mono">
                      ¥{event.priceChange.oldPrice} → ¥{event.priceChange.newPrice}
                    </div>
                    <div className={`text-xs ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-400'}`}>
                      {isUp ? '+' : ''}{event.priceChange.newPrice - event.priceChange.oldPrice}
                    </div>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p>暂无定价数据</p>
                <p className="text-xs mt-1">酒店端改价后将自动收集</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">算法模板性能</h3>
      
      <div className="grid gap-4">
        {mockTemplatePerformance.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-5 bg-[#151B2B] rounded-xl border ${
              template.status === 'needs_optimization' ? 'border-amber-500/30' : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold">{template.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    template.strategy === 'dynamic' ? 'bg-blue-500/20 text-blue-400' :
                    template.strategy === 'scalper' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {template.strategy === 'dynamic' ? '动态定价' :
                     template.strategy === 'scalper' ? '黄牛模式' : '尾货模式'}
                  </span>
                  {template.status === 'needs_optimization' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      需优化
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-5 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">适用酒店</p>
                    <p className="font-medium">{template.applicableHotels}家</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">累计建议</p>
                    <p className="font-medium">{template.totalSuggestions}次</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">采纳率</p>
                    <p className={template.acceptRate > 70 ? 'text-green-400' : 'text-amber-400'}>
                      {template.acceptRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">单间收益</p>
                    <p className="text-[#00F0FF]">¥{template.avgRevenuePerRoom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">滞销率</p>
                    <p className={template.staleRate < 10 ? 'text-green-400' : 'text-red-400'}>
                      {template.staleRate}%
                    </p>
                  </div>
                </div>
              </div>
              
              <ChevronRight className="text-gray-600" size={20} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderHotels = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">酒店定价画像</h3>
      
      <div className="grid gap-4">
        {mockHotelProfiles.map((hotel) => (
          <motion.div
            key={hotel.hotelId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 bg-[#151B2B] rounded-xl border border-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Building2 className="text-[#00F0FF]" size={24} />
                  <h4 className="font-bold">{hotel.hotelName}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    hotel.pricingStyle === 'auto' ? 'bg-green-500/20 text-green-400' :
                    hotel.pricingStyle === 'expert' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {hotel.pricingStyle === 'auto' ? '自动定价' :
                     hotel.pricingStyle === 'expert' ? '专家型' : '学习型'}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">类型</p>
                    <p>{hotel.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">采纳率</p>
                    <p className={hotel.acceptRate > 70 ? 'text-green-400' : 'text-amber-400'}>
                      {hotel.acceptRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AI收益贡献</p>
                    <p className="text-[#00F0FF]">¥{hotel.aiRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">滞销率</p>
                    <p className={hotel.staleRate < 10 ? 'text-green-400' : 'text-red-400'}>
                      {hotel.staleRate}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-[#0B0F19] rounded text-xs text-gray-400">
                  <span className="text-[#00F0FF]">建议：</span>{hotel.suggestion}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderOptimization = () => (
    <div className="space-y-6">
      {/* 基于真实数据的优化 */}
      <Card className="bg-[#141B2D] border-[#2D3A55]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI 实时优化引擎
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={runOptimization}
              disabled={isOptimizing || realtimeStats.totalEvents < 10}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {isOptimizing ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-1" />
              )}
              {isOptimizing ? '优化中...' : '运行优化'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {realtimeStats.totalEvents < 10 ? (
            <div className="text-center py-6 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>数据不足，无法运行优化</p>
              <p className="text-xs mt-1">需要至少 10 条定价事件（当前 {realtimeStats.totalEvents} 条）</p>
            </div>
          ) : optimizationResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-[#0A0E1A] rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">总决策数</div>
                  <div className="text-lg font-bold text-white">{optimizationResult.learning.totalEvents}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">成交率</div>
                  <div className="text-lg font-bold text-green-400">
                    {(optimizationResult.learning.successRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">最优渠道</div>
                  <div className="text-lg font-bold text-blue-400">
                    {optimizationResult.learning.bestPerformingChannel || 'N/A'}
                  </div>
                </div>
              </div>

              {optimizationResult.suggestions.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white mb-3">优化建议</h4>
                  {optimizationResult.suggestions.map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        suggestion.priority === 'high' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Settings className={`w-5 h-5 mt-0.5 ${
                          suggestion.priority === 'high' ? 'text-red-400' : 
                          suggestion.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              suggestion.priority === 'high' 
                                ? 'bg-red-500/20 text-red-400' 
                                : suggestion.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低'}
                            </span>
                            <span className="text-sm font-medium text-white">
                              {suggestion.description}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{suggestion.reasoning}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-gray-500">
                              当前: <span className="text-gray-300">{suggestion.currentValue}</span>
                            </span>
                            <span className="text-gray-500">
                              建议: <span className="text-green-400">{suggestion.suggestedValue}</span>
                            </span>
                            <span className="text-green-400 flex items-center gap-1">
                              <ArrowUpRight size={12} />
                              预期提升 +{suggestion.expectedImprovement.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>当前算法表现良好，暂无优化建议</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>点击"运行优化"按钮分析定价数据</p>
              <p className="text-xs mt-1">AI 将基于 {realtimeStats.totalEvents} 条定价事件生成优化建议</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="text-[#00F0FF]" size={28} />
            定价洞察
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            算法优化中心 · 基于实时数据持续优化AI定价策略
          </p>
        </div>
        {realtimeStats.totalEvents > 0 && (
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <Activity className="w-3 h-3 mr-1" />
            实时收集 {realtimeStats.totalEvents} 条事件
          </Badge>
        )}
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {[
          { key: 'overview', label: '总览', icon: PieChart },
          { key: 'templates', label: '算法模板', icon: Brain },
          { key: 'hotels', label: '酒店画像', icon: Building2 },
          { key: 'optimization', label: '优化建议', icon: Zap },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-[#00F0FF] text-black'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'templates' && renderTemplates()}
        {activeTab === 'hotels' && renderHotels()}
        {activeTab === 'optimization' && renderOptimization()}
      </div>
    </div>
  );
}
