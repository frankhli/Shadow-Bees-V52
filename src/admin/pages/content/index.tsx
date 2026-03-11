/**
 * SaaS运营后台 - 内容管理（后发监控版）
 * 先发后审模式：事后管控、风险巡检、代客修改、实时监控
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  AlertTriangle,
  Edit3,
  Building2,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  BarChart3,
  Activity,
  Flag,
  Ban,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsDown,
  Zap,
} from 'lucide-react';
import { PlatformLogo } from '../../components/PlatformLogo';
import { useAdminStore, type ContentItem, type Platform } from '../../stores/adminStore';
import { useToast } from '../../components/ui/Toast';
import { ContentManageModal } from './ContentManageModal';

const platformConfig: Record<Platform, { name: string; color: string; bgColor: string }> = {
  xianyu: { name: '闲鱼', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  xiaohongshu: { name: '小红书', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  wechat: { name: '微信', color: 'text-green-500', bgColor: 'bg-green-500/20' },
};

// 异常类型配置
const anomalyConfig = {
  exposure_spike: { label: '曝光激增', color: 'text-purple-400', bgColor: 'bg-purple-400/20', icon: Zap },
  exposure_drop: { label: '曝光骤降', color: 'text-amber-400', bgColor: 'bg-amber-400/20', icon: TrendingUp },
  complaint: { label: '用户投诉', color: 'text-red-400', bgColor: 'bg-red-400/20', icon: MessageSquare },
  price_abnormal: { label: '价格异常', color: 'text-orange-400', bgColor: 'bg-orange-400/20', icon: AlertTriangle },
  sensitive_word: { label: '敏感词', color: 'text-pink-400', bgColor: 'bg-pink-400/20', icon: Flag },
};

// 生成模拟实时监控数据
const generateRealtimeStats = (_item: ContentItem) => {
  const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
  const ctr = (Math.random() * 5 + 1).toFixed(2);
  const conversionRate = (Math.random() * 3 + 0.5).toFixed(2);
  
  return {
    impressions: baseImpressions,
    clicks: Math.floor(baseImpressions * parseFloat(ctr) / 100),
    inquiries: Math.floor(baseImpressions * 0.02),
    conversions: Math.floor(baseImpressions * parseFloat(conversionRate) / 100),
    ctr: parseFloat(ctr),
    conversionRate: parseFloat(conversionRate),
    updateTime: new Date().toISOString(),
  };
};

// 注意：异常数据现在统一从 store.anomalies 获取
// 以下函数已弃用，保留 generateAnomalyMessage 用于显示
// const generateAnomalies = (_item: ContentItem) => { ... };

// Note: generateAnomalyMessage is no longer used, kept for reference
// const generateAnomalyMessage = (type: string) => { ... };

export default function ContentPage() {
  const { contentItems, selectContent, selectedContent, updateContent } = useAdminStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  const [showManage, setShowManage] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'anomaly' | 'reported' | 'takedown'>('all');
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 模拟实时数据更新
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000); // 30秒更新一次
    return () => clearInterval(timer);
  }, []);

  // 计算风险等级
  const getRiskLevel = (item: ContentItem) => {
    if (item.status === 'takedown') return 'takedown';
    if (item.reports && item.reports.length > 0) return 'danger';
    if (item.anomalies && item.anomalies.some(a => a.level === 'high')) return 'danger';
    if (item.aiScore === undefined) return 'safe';
    if (item.aiScore < 60) return 'danger';
    if (item.aiScore < 80) return 'warning';
    return 'safe';
  };

  const riskLevels: Record<string, { text: string; color: string; bgColor: string }> = {
    safe: { text: '正常', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
    warning: { text: '建议优化', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20' },
    danger: { text: '需处理', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
    takedown: { text: '已下架', color: 'text-gray-400', bgColor: 'bg-gray-700/50' },
  };

  // 为内容项添加实时数据（不再随机生成异常，使用 store 数据）
  const enrichedContent = useMemo(() => {
    return contentItems.map(item => ({
      ...item,
      stats: item.stats || generateRealtimeStats(item),
      // 使用 item 本身存储的 anomalies，不再临时生成
      anomalies: item.anomalies || [],
    }));
  }, [contentItems, lastUpdate]);

  // 过滤内容
  const filteredContent = enrichedContent.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
    const matchesSubtype = subtypeFilter === 'all' || item.subtype === subtypeFilter;
    const matchesRisk = riskFilter === 'all' || getRiskLevel(item) === riskFilter;
    const matchesAnomaly = anomalyFilter === 'all' || 
      (anomalyFilter === 'has_anomaly' && item.anomalies && item.anomalies.length > 0) ||
      item.anomalies?.some(a => a.type === anomalyFilter);
    
    // Tab过滤
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'anomaly' ? (item.anomalies && item.anomalies.length > 0) :
      activeTab === 'reported' ? (item.reports && item.reports.length > 0) :
      activeTab === 'takedown' ? item.status === 'takedown' : true;
    
    return matchesSearch && matchesPlatform && matchesSubtype && matchesRisk && matchesAnomaly && matchesTab;
  });

  // 统计
  const stats = {
    total: enrichedContent.length,
    danger: enrichedContent.filter(i => getRiskLevel(i) === 'danger').length,
    warning: enrichedContent.filter(i => getRiskLevel(i) === 'warning').length,
    safe: enrichedContent.filter(i => getRiskLevel(i) === 'safe').length,
    takedown: enrichedContent.filter(i => i.status === 'takedown').length,
    withAnomaly: enrichedContent.filter(i => i.anomalies && i.anomalies.length > 0).length,
    withReport: enrichedContent.filter(i => i.reports && i.reports.length > 0).length,
  };

  // 异常聚合统计
  const anomalyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedContent.forEach(item => {
      item.anomalies?.forEach(a => {
        counts[a.type] = (counts[a.type] || 0) + 1;
      });
    });
    return counts;
  }, [enrichedContent]);

  const handleManage = (item: ContentItem) => {
    selectContent(item);
    setShowManage(true);
  };

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleTakedown = (item: ContentItem, reason: string) => {
    updateContent(item.id, {
      status: 'takedown',
      takedown: {
        reason,
        operator: '系统管理员',
        time: new Date().toISOString(),
        appealStatus: 'none',
      },
    });
  };



  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">内容监控中心</h1>
          <p className="text-gray-400 text-sm mt-1">
            先发后审模式 · 实时监控 · 异常检测 · 一键处置
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-neon-green/10 text-neon-green text-sm rounded-lg border border-neon-green/30">
            <Activity size={14} className="inline mr-1" />
            实时监控中
          </div>
          <button 
            className="p-2 hover:bg-[#1E2538] rounded-lg transition-all"
            onClick={() => {
              setLastUpdate(Date.now());
              toast.success('数据已刷新');
            }}
          >
            <RefreshCw size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已发布内容</span>
            <BarChart3 size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.withAnomaly} 个异常</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-red-500/50" onClick={() => setActiveTab('reported')}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">投诉举报</span>
            <Flag size={18} className="text-neon-red" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-red">{stats.withReport}</p>
          <p className="text-xs text-gray-500 mt-1">待处理</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-purple-500/50" onClick={() => setActiveTab('anomaly')}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">数据异常</span>
            <AlertOctagon size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-purple-400">{stats.withAnomaly}</p>
          <p className="text-xs text-gray-500 mt-1">24小时内</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">建议优化</span>
            <AlertTriangle size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber">{stats.warning}</p>
          <p className="text-xs text-gray-500 mt-1">AI检测</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-gray-500/50" onClick={() => setActiveTab('takedown')}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已下架</span>
            <Ban size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-400">{stats.takedown}</p>
          <p className="text-xs text-gray-500 mt-1">含申诉中</p>
        </div>
      </div>

      {/* 异常类型分布 */}
      {Object.keys(anomalyStats).length > 0 && (
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity size={16} className="text-neon-cyan" />
            异常类型分布
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(anomalyStats).map(([type, count]) => {
              const config = anomalyConfig[type as keyof typeof anomalyConfig];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setAnomalyFilter(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    anomalyFilter === type 
                      ? `${config.bgColor} ${config.color} border-current` 
                      : 'bg-[#0B0F19] border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-sm">{config.label}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${config.bgColor}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {anomalyFilter !== 'all' && (
              <button
                onClick={() => setAnomalyFilter('all')}
                className="px-3 py-2 text-sm text-gray-400 hover:text-white"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {[
          { key: 'all', label: '全部内容', count: stats.total },
          { key: 'anomaly', label: '数据异常', count: stats.withAnomaly },
          { key: 'reported', label: '投诉举报', count: stats.withReport },
          { key: 'takedown', label: '已下架', count: stats.takedown },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? 'text-neon-cyan border-neon-cyan'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-[#0B0F19]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索内容标题、酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部平台</option>
            <option value="xianyu">闲鱼</option>
            <option value="xiaohongshu">小红书</option>
            <option value="wechat">微信</option>
          </select>
          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部类型</option>
            <optgroup label="私域内容">
              <option value="moments">朋友圈</option>
              <option value="group">微信群</option>
              <option value="private">私聊</option>
              <option value="channels">视频号</option>
            </optgroup>
            <optgroup label="公域内容">
              <option value="concertTransfer">演唱会转让</option>
              <option value="xhsGuide">小红书攻略</option>
            </optgroup>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="danger">需处理</option>
            <option value="warning">建议优化</option>
            <option value="safe">正常</option>
          </select>
        </div>
      </div>

      {/* 内容列表 */}
      <div className="space-y-3">
        {filteredContent.map((item) => {
          const platform = platformConfig[item.platform];
          const riskLevel = getRiskLevel(item);
          const risk = riskLevels[riskLevel];
          const isExpanded = expandedItems.has(item.id);
          const hasAnomaly = item.anomalies && item.anomalies.length > 0;
          const hasReport = item.reports && item.reports.length > 0;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#151B2B] rounded-xl border overflow-hidden transition-all ${
                riskLevel === 'danger' ? 'border-neon-red/50' :
                riskLevel === 'warning' ? 'border-neon-amber/50' :
                riskLevel === 'takedown' ? 'border-gray-700' :
                'border-gray-800'
              }`}
            >
              {/* 主行 */}
              <div 
                className="p-4 cursor-pointer hover:bg-[#1E2538] transition-colors"
                onClick={() => handleToggleExpand(item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* 展开图标 */}
                    <button className="p-1 hover:bg-gray-700 rounded">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {/* 平台图标 */}
                    <div className={`p-1.5 rounded-lg ${platform.bgColor}`}>
                      <PlatformLogo platform={item.platform} size={22} />
                    </div>
                    
                    {/* 内容信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{item.title}</p>
                        {/* 私域子类型标签 */}
                        {item.subtype && (
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            item.subtype === 'moments' ? 'bg-green-500/20 text-green-400' :
                            item.subtype === 'group' ? 'bg-amber-500/20 text-amber-400' :
                            item.subtype === 'private' ? 'bg-cyan-500/20 text-cyan-400' :
                            item.subtype === 'channels' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.subtype === 'moments' ? '朋友圈' :
                             item.subtype === 'group' ? '微信群' :
                             item.subtype === 'private' ? '私聊' :
                             item.subtype === 'channels' ? '视频号' :
                             item.subtype}
                          </span>
                        )}
                        {hasAnomaly && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-400/20 text-purple-400">
                            异常
                          </span>
                        )}
                        {hasReport && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-red-400/20 text-red-400">
                            被举报
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 size={12} />
                          {item.hotelName}
                        </span>
                        <span>•</span>
                        <span>ID: {item.id}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 实时数据 - 公域/私域区分显示 */}
                  {item.platform === 'wechat' ? (
                    // 私域指标（使用类型断言访问私域字段）
                    <div className="flex items-center gap-6 mr-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">{(item.stats as any)?.touches?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-400">触达</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-neon-cyan">{(item.stats as any)?.replies || 0}</p>
                        <p className="text-xs text-gray-400">回复</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-neon-green">{(item.stats as any)?.privateConversions || 0}</p>
                        <p className="text-xs text-gray-400">成交</p>
                      </div>
                    </div>
                  ) : item.stats && (
                    // 公域指标
                    <div className="flex items-center gap-6 mr-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">{item.stats.impressions.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">曝光</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-neon-cyan">{item.stats.ctr}%</p>
                        <p className="text-xs text-gray-400">点击率</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-neon-green">{item.stats.conversionRate}%</p>
                        <p className="text-xs text-gray-400">转化率</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 状态标签 */}
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded ${risk.bgColor} ${risk.color}`}>
                      {risk.text}
                    </span>
                    {item.aiScore && (
                      <span className={`text-xs ${
                        item.aiScore >= 80 ? 'text-neon-green' :
                        item.aiScore >= 60 ? 'text-neon-amber' : 'text-neon-red'
                      }`}>
                        AI: {item.aiScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 展开详情 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="border-t border-gray-800 overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      {/* 异常详情 */}
                      {hasAnomaly && (
                        <div className="p-3 bg-purple-400/5 border border-purple-400/20 rounded-lg">
                          <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                            <AlertOctagon size={14} />
                            异常检测
                          </h4>
                          <div className="space-y-2">
                            {item.anomalies?.map((anomaly, idx) => {
                              const config = anomalyConfig[anomaly.type];
                              return (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <span className={`px-2 py-0.5 text-xs rounded ${config?.bgColor} ${config?.color}`}>
                                    {config?.label}
                                  </span>
                                  <span className="text-gray-300">{anomaly.message}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(anomaly.detectedAt).toLocaleString('zh-CN')}
                                  </span>
                                  {anomaly.level === 'high' && (
                                    <span className="px-1.5 py-0.5 text-xs rounded bg-red-400/20 text-red-400">
                                      高危
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* 举报详情 */}
                      {hasReport && (
                        <div className="p-3 bg-red-400/5 border border-red-400/20 rounded-lg">
                          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                            <ThumbsDown size={14} />
                            用户举报
                          </h4>
                          <div className="space-y-2">
                            {item.reports?.map((report, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="px-2 py-0.5 text-xs rounded bg-red-400/20 text-red-400">
                                  {report.type === 'spam' ? '垃圾信息' :
                                   report.type === 'misleading' ? '虚假宣传' :
                                   report.type === 'inappropriate' ? '内容不当' :
                                   report.type === 'copyright' ? '侵权' : '其他'}
                                </span>
                                <span className="text-gray-300">{report.description}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(report.createdAt).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 下架记录 */}
                      {item.takedown && (
                        <div className="p-3 bg-gray-700/20 border border-gray-600 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            <Ban size={14} />
                            下架记录
                          </h4>
                          <p className="text-sm text-gray-300">{item.takedown.reason}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            操作人: {item.takedown.operator} · 
                            {new Date(item.takedown.time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      )}
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleManage(item)}
                          className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-all flex items-center gap-1.5"
                        >
                          <Edit3 size={14} />
                          代客修改
                        </button>
                        
                        {item.status !== 'takedown' ? (
                          <>
                            <button
                              onClick={() => handleTakedown(item, '内容违规')}
                              className="px-4 py-2 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-all flex items-center gap-1.5"
                            >
                              <Ban size={14} />
                              立即下架
                            </button>
                            <button 
                              onClick={() => {
                                updateContent(item.id, { 
                                  status: 'flagged',
                                  takedown: {
                                    reason: '限流处理：内容存在风险，已限制曝光',
                                    operator: '系统管理员',
                                    time: new Date().toISOString(),
                                    appealStatus: 'none',
                                  }
                                });
                                toast.success('已限流处理', `内容 "${item.title}" 已被限制曝光`);
                              }}
                              className="px-4 py-2 bg-amber-500/20 text-amber-400 text-sm rounded-lg hover:bg-amber-500/30 transition-all"
                            >
                              限流处理
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              updateContent(item.id, { 
                                status: 'approved',
                                takedown: undefined
                              });
                              toast.success('已恢复上架', `内容 "${item.title}" 已恢复正常展示`);
                            }}
                            className="px-4 py-2 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition-all"
                          >
                            恢复上架
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            const platformUrls: Record<string, string> = {
                              xianyu: `https://www.goofish.com/item?id=${item.id}`,
                              xiaohongshu: `https://www.xiaohongshu.com/explore/${item.id}`,
                              wechat: `https://www.wechat.com/video/${item.id}`,
                            };
                            window.open(platformUrls[item.platform] || '#', '_blank');
                          }}
                          className="px-4 py-2 text-gray-400 text-sm hover:text-white transition-all ml-auto"
                        >
                          查看原始链接
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      
      {/* Content Manage Modal */}
      {showManage && selectedContent && (
        <ContentManageModal
          content={selectedContent}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
