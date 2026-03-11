/**
 * 合规中心 V2
 * 
 * 功能：
 * 1. 平台规则管理（与顶部酒店选择器关联）
 * 2. 法规合规检测
 * 3. 风险事件追踪与处理
 * 4. 平台规则实时同步（需商务合作）
 * 5. 实时监控合规事件
 * 
 * 平台规则同步说明：
 * - 各平台（闲鱼/小红书/微信/抖音）的规则获取需要官方 API 授权
 * - 需要与平台方进行商务谈判获取接口权限
 * - 当前使用模拟数据演示架构
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Gavel,
  Globe,
  AlertOctagon,
  Clock,
  Search,
  Building2,
  PieChart,
  Shield,
  Loader2,
  CheckCircle,
  ExternalLink,
  FileText,
  Filter,
  ChevronDown,
  Activity
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { useComplianceStore } from '../../stores/complianceStore';
import { complianceEventBus, type ComplianceEvent } from '../../services/complianceService';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { complianceApi } from '../../api';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 平台 Logo 组件
// ============================================
const PlatformLogo: React.FC<{ platform: string; size?: 'sm' | 'md' }> = ({ 
  platform, 
  size = 'sm' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8'
  };
  
  const logos: Record<string, string> = {
    xianyu: '/logos/xianyu.jpg',
    xiaohongshu: '/logos/xiaohongshu.jpg',
    wechat: '/logos/wechat.jpg',
    douyin: '/logos/douyin.jpg',
  };
  
  const names: Record<string, string> = {
    xianyu: '闲鱼',
    xiaohongshu: '小红书',
    wechat: '微信',
    douyin: '抖音',
  };
  
  const logoUrl = logos[platform];
  const name = names[platform] || platform;
  
  if (!logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded bg-gray-100 flex items-center justify-center`}>
        <Globe className="w-4 h-4 text-gray-500" />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded overflow-hidden bg-white border border-gray-100`}>
      <img 
        src={logoUrl} 
        alt={name}
        className="w-full h-full object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
};

// ============================================
// 类型定义
// ============================================

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type PlatformType = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';

interface PlatformRule {
  id: string;
  platform: PlatformType;
  platformName: string;
  category: 'content' | 'pricing' | 'behavior' | 'account';
  ruleName: string;
  description: string;
  forbiddenWords: string[];
  lastUpdated: Date;
  updateFrequency: 'realtime' | 'daily' | 'weekly';
  status: 'active' | 'warning' | 'error';
}

interface LegalCompliance {
  id: string;
  name: string;
  type: 'advertising' | 'consumer' | 'tax' | 'privacy' | 'other';
  description: string;
  keyPoints: string[];
  checkItems: {
    name: string;
    enabled: boolean;
    autoCheck: boolean;
  }[];
  enabled: boolean;
}

interface RiskEvent {
  id: string;
  type: 'platform' | 'legal' | 'account';
  level: RiskLevel;
  title: string;
  description: string;
  source: string;
  detectedAt: Date;
  status: 'pending' | 'processing' | 'resolved';
  suggestion: string;
  hotelId?: string;
  hotelName?: string;
}



// ============================================
// 主组件
// ============================================
export function ComplianceCenter() {
  const toast = useToast();
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotelsList = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState<'overview' | 'platform' | 'legal' | 'events' | 'realtime'>('overview');
  
  // 数据状态
  const [platformRules, setPlatformRules] = useState<PlatformRule[]>([]);
  const [legalCompliance, setLegalCompliance] = useState<LegalCompliance[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  
  // 实时合规状态
  const [realtimeEvents, setRealtimeEvents] = useState<ComplianceEvent[]>([]);
  const complianceStats = useComplianceStore(state => state.stats);
  const recentBlocks = useComplianceStore(state => state.recentBlocks);
  
  // 搜索和筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // 同步状态
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date('2024-03-06 14:30:00'));
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // 订阅合规事件
  useEffect(() => {
    const unsubscribe = complianceEventBus.subscribe((event) => {
      setRealtimeEvents(prev => [event, ...prev].slice(0, 20));
    });
    return () => unsubscribe();
  }, []);

  // 加载合规数据 - 当酒店选择变化时重新加载
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rulesRes, legalRes, eventsRes] = await Promise.all([
          complianceApi.getPlatformRules(),
          complianceApi.getLegalCompliance(),
          complianceApi.getRiskEvents(),
        ]);
        if (rulesRes.success) setPlatformRules(rulesRes.data.list as unknown as PlatformRule[]);
        if (legalRes.success) setLegalCompliance(legalRes.data as unknown as LegalCompliance[]);
        if (eventsRes.success) setRiskEvents(eventsRes.data.list as unknown as RiskEvent[]);
      } catch (error) {
        console.error('加载合规数据失败:', error);
      }
    };
    loadData();
  }, [selectedHotelIds]);

  // 根据选中酒店筛选风险事件
  const filteredRiskEvents = useMemo(() => {
    if (selectedHotelIds.length === 0) return [];
    
    return riskEvents.filter(event => {
      // 搜索筛选
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query) && 
            !event.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [riskEvents, selectedHotelIds, searchQuery]);

  // 统计
  const stats = useMemo(() => {
    const pendingCount = filteredRiskEvents.filter(e => e.status === 'pending').length;
    const criticalCount = filteredRiskEvents.filter(e => e.level === 'critical' && e.status === 'pending').length;
    const highCount = filteredRiskEvents.filter(e => e.level === 'high' && e.status === 'pending').length;
    
    const passRate = selectedHotelIds.length > 0 ? 98.5 : 0;
    const checkCount = selectedHotelIds.length * 78;
    
    return {
      ruleCount: platformRules.length,
      legalCount: legalCompliance.length,
      pendingCount,
      criticalCount,
      highCount,
      passRate,
      checkCount,
    };
  }, [platformRules, legalCompliance, filteredRiskEvents, selectedHotelIds]);

  // 处理风险事件状态变更
  const handleEventStatusChange = useCallback((eventId: string, newStatus: RiskEvent['status']) => {
    setRiskEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, status: newStatus } : e
    ));
  }, []);

  // 同步平台规则
  const handleSyncRules = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage('正在同步平台规则...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newRule: PlatformRule = {
        id: `rule_${Date.now()}`,
        platform: 'xiaohongshu',
        platformName: '小红书',
        category: 'content',
        ruleName: '新规则示例（同步测试）',
        description: '通过同步功能获取的最新平台规则',
        forbiddenWords: ['新违禁词1', '新违禁词2'],
        lastUpdated: new Date(),
        updateFrequency: 'realtime',
        status: 'active',
      };
      
      setPlatformRules(prev => [newRule, ...prev]);
      setLastSyncTime(new Date());
      setSyncStatus('success');
      setSyncMessage('同步成功！已更新 1 条新规则');
      
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
      
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('同步失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 获取风险等级颜色
  const getLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: RiskEvent['status']) => {
    switch (status) {
      case 'pending': return 'text-red-600';
      case 'processing': return 'text-orange-600';
      case 'resolved': return 'text-green-600';
    }
  };

  // 获取事件类型颜色
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'block': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'info': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取来源名称
  const getSourceName = (source: string) => {
    switch (source) {
      case 'content_factory': return '内容工厂';
      case 'ai_chat': return 'AI对话';
      default: return source;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">合规中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 0 
              ? '请选择酒店查看合规检测数据'
              : selectedHotelIds.length === 1
                ? `查看 ${selectedHotelsList[0]?.name} 的合规检测`
                : `汇总 ${selectedHotelIds.length} 家酒店的合规检测`
            }
            {selectedHotelIds.length > 0 && filteredRiskEvents.length > 0 && ` · ${filteredRiskEvents.length} 个风险事件`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索风险事件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 w-48"
            />
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters 
                ? 'bg-violet-50 border-violet-300 text-violet-700' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <Filter className={`w-4 h-4 ${showFilters ? 'text-violet-600' : 'text-gray-500'}`} />
            <span className="text-sm">筛选</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* 已选酒店 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              已选酒店
              <span className="text-xs text-gray-400 font-normal ml-1">(从顶部酒店选择器中选择)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedHotelsList.length > 0 ? (
                selectedHotelsList.map(hotel => (
                  <span
                    key={hotel.id}
                    className="px-3 py-1.5 rounded-lg text-sm bg-violet-50 border border-violet-200 text-violet-700"
                  >
                    {hotel.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">未选择酒店</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      {selectedHotelIds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-1 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { id: 'overview', label: '概览', icon: PieChart },
              { id: 'realtime', label: '实时监控', icon: Activity, count: realtimeEvents.filter(e => e.type === 'content_blocked').length },
              { id: 'platform', label: '平台规则', icon: Globe, count: platformRules.length },
              { id: 'legal', label: '法规合规', icon: Gavel, count: legalCompliance.length },
              { id: 'events', label: '风险事件', icon: AlertOctagon, count: stats.pendingCount },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 内容 */}
      {selectedHotelIds.length > 0 && (
        <>
          {/* ============ 合规概览 Tab ============ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.ruleCount}</div>
                      <div className="text-sm text-gray-500">平台规则</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.legalCount}</div>
                      <div className="text-sm text-gray-500">法规合规项</div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setActiveTab('events')}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
                      <div className="text-sm text-gray-500">待处理风险</div>
                      {(stats.criticalCount > 0 || stats.highCount > 0) && (
                        <div className="text-xs text-red-600 mt-0.5">
                          {stats.criticalCount > 0 && `${stats.criticalCount} 紧急 `}
                          {stats.highCount > 0 && `${stats.highCount} 高`}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.passRate}%</div>
                      <div className="text-sm text-gray-500">检测通过率</div>
                      <div className="text-xs text-gray-400 mt-0.5">今日检测 {stats.checkCount} 条</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 快捷入口 */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('platform')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">平台规则管理</div>
                      <div className="text-sm text-gray-500">管理 {platformRules.length} 条平台规则</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('legal')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">法规合规设置</div>
                      <div className="text-sm text-gray-500">{legalCompliance.length} 项合规检测已启用</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('events')}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <AlertOctagon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">处理风险事件</div>
                      <div className="text-sm text-gray-500">{stats.pendingCount} 个待处理风险</div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* 最近风险事件 */}
              {filteredRiskEvents.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">最近风险事件</h3>
                    <button 
                      onClick={() => setActiveTab('events')}
                      className="text-sm text-violet-600 hover:text-violet-700"
                    >
                      查看全部
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {filteredRiskEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            event.level === 'critical' ? 'bg-red-500' :
                            event.level === 'high' ? 'bg-orange-500' :
                            event.level === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900">{event.title}</div>
                            <div className="text-sm text-gray-500">{event.source} · {event.detectedAt.toLocaleString()}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                          event.status === 'pending' ? 'bg-red-100 text-red-700' :
                          event.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {event.status === 'pending' ? '待处理' :
                           event.status === 'processing' ? '处理中' : '已解决'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ 实时监控 Tab ============ */}
          {activeTab === 'realtime' && (
            <div className="space-y-6">
              {/* 实时统计卡片 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{complianceStats.totalChecks}</div>
                      <div className="text-sm text-gray-500">今日总检测</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{complianceStats.totalBlocks}</div>
                      <div className="text-sm text-gray-500">拦截次数</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{complianceStats.violationsToday}</div>
                      <div className="text-sm text-gray-500">今日违规</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {complianceStats.totalChecks > 0 
                          ? Math.round(((complianceStats.totalChecks - complianceStats.violationsToday) / complianceStats.totalChecks) * 100)
                          : 100}%
                      </div>
                      <div className="text-sm text-gray-500">合规率</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 最近拦截记录 */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      最近拦截记录
                    </h3>
                    <span className="text-xs text-gray-400">最近 {recentBlocks.length} 条</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-80 overflow-auto">
                    {recentBlocks.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
                        <p>暂无拦截记录</p>
                      </div>
                    ) : (
                      recentBlocks.slice(0, 10).map((block, idx) => (
                        <div key={idx} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                内容ID: {block.contentId.substring(0, 20)}...
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700">
                                  {block.violation?.ruleName || '违规拦截'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(block.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 实时事件流 */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      实时事件流
                    </h3>
                    <span className="text-xs text-gray-400">最近 {realtimeEvents.length} 条</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-80 overflow-auto">
                    {realtimeEvents.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p>等待实时事件...</p>
                      </div>
                    ) : (
                      realtimeEvents.map((event, idx) => (
                        <div key={idx} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 text-xs rounded ${getEventTypeColor(event.type)}`}>
                                  {event.type === 'content_blocked' ? '拦截' : event.type === 'violation_found' ? '违规' : event.type === 'check_completed' ? '检测完成' : '信息'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {getSourceName(event.source)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {event.violation ? `发现${event.violation.ruleName}问题` : '合规检测事件'}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 来源分布 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">检测来源分布</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">内容工厂</div>
                        <div className="text-sm text-gray-500">content_factory</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {realtimeEvents.filter(e => e.source === 'content_factory').length}
                      </div>
                      <div className="text-xs text-gray-500">事件</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">AI对话</div>
                        <div className="text-sm text-gray-500">ai_chat</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {realtimeEvents.filter(e => e.source === 'ai_chat').length}
                      </div>
                      <div className="text-xs text-gray-500">事件</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ============ 平台规则 Tab ============ */}
          {activeTab === 'platform' && (
            <div className="space-y-4">
              {platformRules.map((rule) => (
                <div key={rule.id} className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <PlatformLogo platform={rule.platform} size="md" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{rule.ruleName}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                            rule.status === 'active' ? 'bg-green-100 text-green-700' :
                            rule.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rule.status === 'active' ? '正常' : 
                             rule.status === 'warning' ? '警告' : '异常'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{rule.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {(rule.forbiddenWords || []).map((word) => (
                            <span key={word} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {rule.updateFrequency === 'realtime' ? '实时更新' :
                         rule.updateFrequency === 'daily' ? '每日更新' : '每周更新'}
                      </div>
                      <div className="mt-1">
                        最后更新: {rule.lastUpdated ? new Date(rule.lastUpdated).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* ============ 法规合规 Tab ============ */}
          {activeTab === 'legal' && (
            <div className="grid grid-cols-2 gap-4">
              {legalCompliance.map((legal) => (
                <div key={legal.id} className="bg-white p-5 rounded-xl border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Gavel className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{legal.name}</h4>
                        <p className="text-sm text-gray-500">{legal.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                      legal.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {legal.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">合规要点</div>
                      <div className="flex flex-wrap gap-2">
                        {(legal.keyPoints || []).map((point, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">检测项</div>
                      <div className="space-y-2">
                        {(legal.checkItems || []).map((item) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.name}</span>
                            <div className="flex items-center gap-2">
                              {item.autoCheck && (
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded">
                                  自动
                                </span>
                              )}
                              <span className={`w-2 h-2 rounded-full ${item.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* ============ 风险事件 Tab ============ */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {/* 风险统计 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                  <div className="text-2xl font-bold text-red-600">{stats.criticalCount}</div>
                  <div className="text-sm text-red-700">紧急风险</div>
                </div>
                <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
                  <div className="text-2xl font-bold text-orange-600">{stats.highCount}</div>
                  <div className="text-sm text-orange-700">高风险</div>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredRiskEvents.filter(e => e.level === 'medium' && e.status === 'pending').length}
                  </div>
                  <div className="text-sm text-yellow-700">中风险</div>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredRiskEvents.filter(e => e.level === 'low' && e.status === 'pending').length}
                  </div>
                  <div className="text-sm text-blue-700">低风险</div>
                </div>
              </div>
              
              {/* 风险事件列表 */}
              <div className="space-y-4">
                {filteredRiskEvents.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                    <p className="text-gray-500">暂无风险事件</p>
                    <p className="text-sm text-gray-400 mt-1">所有检测均通过，未发现合规风险</p>
                  </div>
                ) : (
                  filteredRiskEvents.map((event) => (
                    <div key={event.id} className={`bg-white p-5 rounded-xl border-2 ${getLevelColor(event.level)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{event.title}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap flex-shrink-0 bg-white/50`}>
                              {event.level === 'critical' ? '紧急' :
                               event.level === 'high' ? '高' :
                               event.level === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                          <p className="text-sm opacity-80 mb-3">{event.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm opacity-60">
                            <span>来源: {event.source}</span>
                            <span>检测时间: {event.detectedAt.toLocaleString()}</span>
                            <span className={getStatusColor(event.status)}>
                              状态: {event.status === 'pending' ? '待处理' :
                                    event.status === 'processing' ? '处理中' : '已解决'}
                            </span>
                          </div>
                          <div className="mt-3 p-3 bg-white/50 rounded-lg">
                            <div className="text-sm font-medium mb-1">处理建议</div>
                            <div className="text-sm opacity-80">{event.suggestion}</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {event.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleEventStatusChange(event.id, 'processing')}
                                className="px-4 py-2 bg-white border border-current rounded-lg text-sm hover:bg-white/80 whitespace-nowrap"
                              >
                                标记处理中
                              </button>
                              <button 
                                onClick={() => handleEventStatusChange(event.id, 'resolved')}
                                className="px-4 py-2 bg-white border border-current rounded-lg text-sm hover:bg-white/80 whitespace-nowrap"
                              >
                                标记已解决
                              </button>
                            </>
                          )}
                          {event.status === 'processing' && (
                            <button 
                              onClick={() => handleEventStatusChange(event.id, 'resolved')}
                              className="px-4 py-2 bg-white border border-current rounded-lg text-sm hover:bg-white/80 whitespace-nowrap"
                            >
                              标记已解决
                            </button>
                          )}
                          {event.status === 'resolved' && (
                            <span className="px-4 py-2 text-green-600 text-sm flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              已解决
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* 未选择酒店时的空状态 */}
      {selectedHotelIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看合规检测</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            合规检测需要选择至少一家酒店才能查看。<br/>
            支持多酒店合规规则管理与风险检测。
          </p>
          <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
            <Building2 className="w-4 h-4" />
            <span>请从顶部酒店选择器中选择酒店</span>
          </div>
        </div>
      )}

      {/* 同步状态 */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        syncStatus === 'success' ? 'bg-green-50 border-green-200' :
        syncStatus === 'error' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          ) : syncStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : syncStatus === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <RefreshCw className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <div className={`text-sm font-medium ${
              syncStatus === 'success' ? 'text-green-700' :
              syncStatus === 'error' ? 'text-red-700' :
              'text-gray-700'
            }`}>
              {syncMessage || '规则同步状态'}
            </div>
            <div className="text-xs text-gray-500">
              {lastSyncTime ? `上次同步: ${lastSyncTime.toLocaleString()}` : '尚未同步'}
              {syncStatus !== 'syncing' && ' | 下次同步: 实时'}
            </div>
          </div>
        </div>
        <button 
          onClick={handleSyncRules}
          disabled={isSyncing}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              同步中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              立即同步
            </>
          )}
        </button>
      </div>
      
      {/* 平台规则同步说明 */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">平台规则同步说明</h4>
            <p className="text-sm text-blue-700 mb-2">
              各平台（闲鱼/小红书/微信/抖音）的规则获取需要官方 API 授权。已与平台方完成商务谈判并获取接口权限的，可实时同步最新规则。
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-blue-600">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> 闲鱼：已接入
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> 小红书：已接入
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 微信：谈判中
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 抖音：待启动
              </span>
            </div>
          </div>
          <a 
            href="#" 
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              toast.info('请联系商务团队获取平台接入支持');
            }}
          >
            了解更多 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ComplianceCenter;
