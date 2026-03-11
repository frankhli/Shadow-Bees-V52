/**
 * 企业版操作审计 V3
 * 
 * 功能：
 * 1. 操作日志查询（与顶部酒店选择器关联）
 * 2. 用户行为追踪
 * 3. 敏感操作监控
 * 4. 审计报表导出
 * 5. 合规检查
 * 6. Tab切换布局优化
 * 
 * 数据来源：
 * - 使用 auditApi 获取真实数据
 * - API端点：/api/v1/audit/logs
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  FileSearch, User, Filter, Download,
  CheckCircle, XCircle, AlertTriangle,
  ChevronDown, Search, Eye, Edit, Trash2, Plus,
  DollarSign, Package, Settings, Shield,
  Calendar, Building2, PieChart,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { useToast } from '../../../components/ui/Toast';
import { auditApi } from '../../api';
import type { AuditRecord, AuditStats } from '../../api/types';

// ============================================
// 类型定义
// ============================================
type OperationType = AuditRecord['operation'];
type ResourceType = AuditRecord['resource'];
type RiskLevel = AuditRecord['riskLevel'];

// ============================================
// 配置
// ============================================
const operationConfig: Record<OperationType, { name: string; color: string; icon: any }> = {
  create: { name: '创建', color: '#10B981', icon: Plus },
  update: { name: '修改', color: '#F59E0B', icon: Edit },
  delete: { name: '删除', color: '#EF4444', icon: Trash2 },
  view: { name: '查看', color: '#3B82F6', icon: Eye },
  export: { name: '导出', color: '#8B5CF6', icon: Download },
  login: { name: '登录', color: '#6B7280', icon: User },
};

const resourceConfig: Record<ResourceType, { name: string; color: string; bgColor: string; icon: any }> = {
  price: { name: '价格', color: '#EF4444', bgColor: '#FEF2F2', icon: DollarSign },
  inventory: { name: '库存', color: '#F59E0B', bgColor: '#FFFBEB', icon: Package },
  order: { name: '订单', color: '#3B82F6', bgColor: '#EFF6FF', icon: FileSearch },
  account: { name: '账号', color: '#8B5CF6', bgColor: '#F5F3FF', icon: User },
  content: { name: '内容', color: '#10B981', bgColor: '#F0FDF4', icon: Edit },
  settings: { name: '设置', color: '#6B7280', bgColor: '#F3F4F6', icon: Settings },
};

// ============================================
// 快捷时间选项
// ============================================
const QUICK_DATE_RANGES = [
  { label: '今天', days: 0 },
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '本月', days: 'month' as const },
];

// ============================================
// 统计卡片骨架屏组件
// ============================================
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export default function AuditLog() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotelsList = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'highrisk'>('overview');
  
  // 数据状态
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    totalRecords: 0,
    success: 0,
    failed: 0,
    highRisk: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    todayCount: 0,
    todayRecords: 0,
    operationCounts: { create: 0, update: 0, delete: 0, view: 0, export: 0, login: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  
  // 时间筛选状态
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start: sevenDaysAgo, end: today };
  });
  const [activeQuickRange, setActiveQuickRange] = useState<string>('近7天');
  
  // 其他筛选状态
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<OperationType[]>([]);
  const [selectedResources, setSelectedResources] = useState<ResourceType[]>([]);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 导出状态
  const [isExporting, setIsExporting] = useState(false);

  // 从API获取数据
  const fetchAuditData = useCallback(async () => {
    if (selectedHotelIds.length === 0) {
      setRecords([]);
      setTotal(0);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 获取审计日志列表
      const logsResponse = await auditApi.getAuditLogs({
        page,
        pageSize,
        hotelIds: selectedHotelIds,
        startDate: dateRange.start,
        endDate: dateRange.end,
        operations: selectedOperations.length > 0 ? selectedOperations : undefined,
        resources: selectedResources.length > 0 ? selectedResources : undefined,
        riskLevels: riskFilter !== 'all' ? [riskFilter] : undefined,
        keyword: searchQuery || undefined,
      });
      
      if (logsResponse.success) {
        setRecords(logsResponse.data.list);
        setTotal(logsResponse.data.total);
      } else {
        toastRef.current.error('获取数据失败', logsResponse.message || '请稍后重试');
      }
    } catch (err) {
      toastRef.current.error('获取数据失败', err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedHotelIds, page, pageSize, dateRange.start, dateRange.end,
    selectedOperations, selectedResources, riskFilter, searchQuery
  ]);

  // 获取统计数据（独立加载，避免阻塞列表）
  const fetchStatsData = useCallback(async () => {
    if (selectedHotelIds.length === 0) return;
    
    setIsStatsLoading(true);
    try {
      const statsResponse = await auditApi.getAuditStats(selectedHotelIds);
      if (statsResponse.success) {
        setStats(statsResponse.data);
      } else {
        toastRef.current.error('获取统计数据失败', statsResponse.message || '请稍后重试');
      }
    } catch (err) {
      toastRef.current.error('获取统计数据失败', err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsStatsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelIds]);
  
  // 监听筛选条件变化，自动加载数据
  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // 监听酒店变化，加载统计数据
  useEffect(() => {
    fetchStatsData();
  }, [fetchStatsData]);
  
  // 当顶部酒店选择器变化时，重置分页
  useEffect(() => {
    setPage(1);
  }, [selectedHotelIds]);
  
  // 导出功能
  const handleExport = async () => {
    if (selectedHotelIds.length === 0) {
      toastRef.current.warning('请选择酒店', '请先选择至少一家酒店再导出日志');
      return;
    }

    setIsExporting(true);
    try {
      const response = await auditApi.exportAuditLogs({
        hotelIds: selectedHotelIds,
        startDate: dateRange.start,
        endDate: dateRange.end,
        format: 'csv',
      });
      
      if (response.success) {
        // 触发文件下载
        const { downloadUrl, filename } = response.data;
        
        // 创建临时链接进行下载
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toastRef.current.success('导出成功', `文件 ${filename} 已开始下载`);
      } else {
        toastRef.current.error('导出失败', response.message || '请稍后重试');
      }
    } catch (err) {
      toastRef.current.error('导出失败', err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsExporting(false);
    }
  };
  
  // 获取所有用户（从当前数据中分析）
  const allUsers = useMemo(() => {
    const userMap = new Map();
    records.forEach(r => {
      if (!userMap.has(r.userId)) {
        userMap.set(r.userId, { id: r.userId, name: r.userName, role: r.userRole });
      }
    });
    return Array.from(userMap.values());
  }, [records]);
  
  // 筛选后的记录（前端筛选用户）
  const filteredRecords = useMemo(() => {
    if (selectedUsers.length === 0) return records;
    return records.filter(r => selectedUsers.includes(r.userId));
  }, [records, selectedUsers]);
  
  // 快捷时间选择
  const handleQuickRangeSelect = (range: typeof QUICK_DATE_RANGES[0]) => {
    setActiveQuickRange(range.label);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start: Date;
    let end: Date = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    if (range.days === 0) {
      start = new Date(today);
    } else if (range.days === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      start = new Date(today.getTime() - range.days * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取风险等级样式
  const getRiskStyle = (level: RiskLevel) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">操作审计</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 0 
              ? '请选择酒店查看操作审计'
              : selectedHotelIds.length === 1
                ? `查看 ${selectedHotelsList[0]?.name} 的操作审计`
                : `汇总 ${selectedHotelIds.length} 家酒店的操作审计`
            }
            {total > 0 && ` · 共 ${total} 条记录`}
            {isLoading && <span className="ml-2 text-violet-600">加载中...</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索操作内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 w-48"
            />
          </div>

          {/* 风险筛选 */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="all">全部风险</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">筛选</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* 导出按钮 */}
          <button 
            onClick={handleExport}
            disabled={isExporting || selectedHotelIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-sm">{isExporting ? '导出中...' : '导出日志'}</span>
          </button>
        </div>
      </div>

      {/* Tab 导航 */}
      {selectedHotelIds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-1">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: '审计概览', icon: PieChart },
              { id: 'logs', label: '操作记录', icon: FileSearch },
              { id: 'highrisk', label: '高风险操作', icon: AlertTriangle, count: filteredRecords.filter(r => r.riskLevel === 'high').length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      {showFilters && selectedHotelIds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* 日期范围 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">时间范围</label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {QUICK_DATE_RANGES.map(range => (
                <button
                  key={range.label}
                  onClick={() => handleQuickRangeSelect(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    activeQuickRange === range.label
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    setActiveQuickRange('');
                  }}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <span className="text-gray-500">至</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    setActiveQuickRange('');
                  }}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* 已选酒店展示（来自顶部选择器） */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              已选酒店 
              <span className="text-xs text-gray-400 font-normal ml-1">
                (从顶部酒店选择器中选择)
              </span>
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
          
          {/* 用户筛选 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">操作人员</label>
            <div className="flex flex-wrap gap-2">
              {allUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUsers(prev => 
                    prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    selectedUsers.includes(user.id)
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {user.name} ({user.role})
                </button>
              ))}
            </div>
          </div>
          
          {/* 操作类型筛选 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">操作类型</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(operationConfig) as OperationType[]).map(op => {
                const config = operationConfig[op];
                return (
                  <button
                    key={op}
                    onClick={() => setSelectedOperations(prev => 
                      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedOperations.includes(op)
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <config.icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 资源类型筛选 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">操作对象</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(resourceConfig) as ResourceType[]).map(res => {
                const config = resourceConfig[res];
                return (
                  <button
                    key={res}
                    onClick={() => setSelectedResources(prev => 
                      prev.includes(res) ? prev.filter(r => r !== res) : [...prev, res]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedResources.includes(res)
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <config.icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 内容 */}
      {selectedHotelIds.length > 0 && (
        <>
          {/* ============ 审计概览 Tab ============ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-4 gap-4">
                {isStatsLoading ? (
                  <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FileSearch className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            <AnimatedNumber value={stats.total} duration={1.2} />
                          </div>
                          <div className="text-sm text-gray-500">操作记录</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            <AnimatedNumber value={stats.success} duration={1.2} />
                          </div>
                          <div className="text-sm text-gray-500">成功操作</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            <AnimatedNumber value={stats.failed} duration={1.2} />
                          </div>
                          <div className="text-sm text-gray-500">失败操作</div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setActiveTab('highrisk')}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-300 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            <AnimatedNumber value={stats.highRisk} duration={1.2} />
                          </div>
                          <div className="text-sm text-gray-500">高风险操作</div>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
              
              {/* 快捷入口 */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('logs')}
                  disabled={isLoading}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                      <FileSearch className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">查看操作记录</div>
                      <div className="text-sm text-gray-500">
                        {isLoading ? '加载中...' : `查看全部 ${filteredRecords.length} 条记录`}
                      </div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('highrisk')}
                  disabled={isStatsLoading}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">高风险操作</div>
                      <div className="text-sm text-gray-500">
                        {isStatsLoading ? '加载中...' : (
                          <AnimatedNumber value={stats.highRisk} duration={1.2} suffix=" 条需要关注" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* ============ 操作记录 Tab ============ */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">操作记录</h3>
                <span className="text-sm text-gray-500">共 {filteredRecords.length} 条记录</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[140px]">时间</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[120px]">操作人员</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[150px]">酒店</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[80px]">操作</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[80px]">对象</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[200px]">详情</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[100px]">IP地址</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[60px]">风险</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[60px]">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.slice(0, 20).map(record => {
                      const opConfig = operationConfig[record.operation];
                      const resConfig = resourceConfig[record.resource];
                      
                      return (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatTime(record.timestamp)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-gray-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{record.userName}</div>
                                <div className="text-xs text-gray-500">{record.userRole}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-600 truncate max-w-[150px]" title={record.hotelName}>
                            {record.hotelName}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                              style={{ backgroundColor: opConfig.color + '20', color: opConfig.color }}
                            >
                              <opConfig.icon className="w-3 h-3 shrink-0" />
                              {opConfig.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                              style={{ backgroundColor: resConfig.bgColor, color: resConfig.color }}
                            >
                              <resConfig.icon className="w-3 h-3 shrink-0" />
                              {resConfig.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-600 truncate max-w-[200px]" title={record.details}>
                            {record.details}
                          </td>
                          <td className="py-3 px-3 text-center text-xs text-gray-500 font-mono whitespace-nowrap">
                            {record.ip}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getRiskStyle(record.riskLevel)}`}>
                              {record.riskLevel === 'high' ? '高' : record.riskLevel === 'medium' ? '中' : '低'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {record.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 whitespace-nowrap">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                成功
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 whitespace-nowrap">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                失败
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 分页 */}
              {total > 0 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    显示 {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1 || isLoading}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / pageSize) || isLoading}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {filteredRecords.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无符合条件的操作记录</p>
                </div>
              )}
              
              {isLoading && (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-violet-600 animate-spin" />
                  <p className="text-gray-500">加载中...</p>
                </div>
              )}
            </div>
          )}
          
          {/* ============ 高风险操作 Tab ============ */}
          {activeTab === 'highrisk' && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {isStatsLoading ? '加载中...' : (
                      <>
                        发现 <AnimatedNumber value={stats.highRisk} duration={1.2} /> 条高风险操作记录
                      </>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">高风险操作列表</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[140px]">时间</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[120px]">操作人员</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[150px]">酒店</th>
                        <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[80px]">操作</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 w-[250px]">详情</th>
                        <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[100px]">IP地址</th>
                        <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 w-[60px]">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords
                        .filter(r => r.riskLevel === 'high')
                        .map(record => {
                          const opConfig = operationConfig[record.operation];
                          
                          return (
                            <tr key={record.id} className="hover:bg-gray-50 bg-red-50/30">
                              <td className="py-3 px-3 text-sm text-gray-600 whitespace-nowrap">
                                {formatTime(record.timestamp)}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-gray-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">{record.userName}</div>
                                    <div className="text-xs text-gray-500">{record.userRole}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-600 truncate max-w-[150px]" title={record.hotelName}>
                                {record.hotelName}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                                  style={{ backgroundColor: opConfig.color + '20', color: opConfig.color }}
                                >
                                  <opConfig.icon className="w-3 h-3 shrink-0" />
                                  {opConfig.name}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-600 truncate max-w-[250px]" title={record.details}>
                                {record.details}
                              </td>
                              <td className="py-3 px-3 text-center text-xs text-gray-500 font-mono whitespace-nowrap">
                                {record.ip}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {record.status === 'success' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600 whitespace-nowrap">
                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    成功
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-red-600 whitespace-nowrap">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    失败
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.filter(r => r.riskLevel === 'high').length === 0 && !isLoading && (
                  <div className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                    <p className="text-gray-500">恭喜，没有发现高风险操作</p>
                  </div>
                )}
                {isLoading && (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 text-violet-600 animate-spin" />
                    <p className="text-gray-500">加载中...</p>
                  </div>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看操作审计</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            操作审计需要选择至少一家酒店才能查看。<br/>
            支持多酒店操作记录汇总与审计。
          </p>
          <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
            <Building2 className="w-4 h-4" />
            <span>请从顶部酒店选择器中选择酒店</span>
          </div>
        </div>
      )}
    </div>
  );
}
