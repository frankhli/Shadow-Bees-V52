/**
 * 智能定价中心 V2
 * 
 * 核心理念转变：从"策略下发"到"智能建议 + 分层协作"
 * 
 * 酒店参与度等级：
 * - hands_off: 全权托管，自动生成并执行
 * - notify: 知会模式，自动执行但通知酒店
 * - confirm: 确认模式，需酒店确认后执行
 * - negotiate: 协商模式，双方可修改协商
 * - diy: 完全自主，华美会仅提供数据支持
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Target, Calendar, Building2, CheckCircle, Clock,
  TrendingUp, Edit3, Search, X,
  ChevronRight, Zap, MessageSquare,
  Shield, Eye,
  XCircle, Hotel, Loader2,
  Info as InfoIcon
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { strategyApi, eventsApi } from '../../api';
import { useCountUp } from '../../hooks/useCountUp';
import type { EventIntel } from '../../api/types';

// ============================================
// 类型定义
// ============================================
type EngagementLevel = 'hands_off' | 'notify' | 'confirm' | 'negotiate' | 'diy';
type SuggestionStatus = 'draft' | 'pending' | 'hotel_confirmed' | 'hotel_rejected' | 'hotel_modified' | 'executed' | 'expired';
type SuggestionType = 'holiday' | 'event' | 'daily' | 'competitor_response';

interface HotelEngagement {
  hotelId: string;
  hotelName: string;
  level: EngagementLevel;
  autoExecuteAfterHours?: number; // 自动执行超时时间（确认模式下）
}

interface PricingSuggestion {
  id: string;
  name: string;
  type: SuggestionType;
  hotelId: string;
  hotelName: string;
  engagementLevel: EngagementLevel;
  
  // 时间
  startDate: string;
  endDate: string;
  createdAt: string;
  
  // 定价规则
  rules: {
    basePrice: number;
    suggestedPrice: number;
    increasePercent: number;
    maxPremium: number;
    reasoning: string; // AI建议理由
  };
  
  // 预期效果
  expectedImpact: {
    revenueIncrease: number;
    occupancyImpact: number; // 预计入住率变化
    confidence: number; // AI置信度 0-100
  };
  
  // 状态
  status: SuggestionStatus;
  
  // 酒店反馈（如果有）
  hotelFeedback?: {
    action: 'confirm' | 'reject' | 'modify';
    message?: string;
    modifiedRules?: Partial<PricingSuggestion['rules']>;
    respondedAt?: string;
  };
  
  // 执行记录
  execution?: {
    executedAt: string;
    executedBy: 'ai' | 'hotel_manager' | 'huamei_operator';
    actualImpact?: number;
  };
}

// ============================================
// 参与度等级配置
// ============================================
const ENGAGEMENT_CONFIG: Record<EngagementLevel, {
  label: string;
  description: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
  badgeColor: string;
  automation: 'full' | 'semi' | 'manual';
}> = {
  hands_off: {
    label: '全权托管',
    description: '完全信任华美会，AI自动生成并执行',
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    automation: 'full',
  },
  notify: {
    label: '知会模式',
    description: '自动执行但会通知您',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-700',
    automation: 'full',
  },
  confirm: {
    label: '确认模式',
    description: '需确认后执行，超时自动执行',
    icon: CheckCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    badgeColor: 'bg-amber-100 text-amber-700',
    automation: 'semi',
  },
  negotiate: {
    label: '协商模式',
    description: '双方协商确定最终价格',
    icon: MessageSquare,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    badgeColor: 'bg-violet-100 text-violet-700',
    automation: 'manual',
  },
  diy: {
    label: '完全自主',
    description: '酒店自行定价，华美会提供数据',
    icon: Edit3,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    badgeColor: 'bg-gray-100 text-gray-700',
    automation: 'manual',
  },
};

// 建议类型配置
const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, { label: string; icon: typeof Calendar; color: string; bgColor: string }> = {
  holiday: { label: '节假日', icon: Calendar, color: 'text-red-600', bgColor: 'bg-red-50' },
  event: { label: '事件驱动', icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  daily: { label: '日常优化', icon: Target, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  competitor_response: { label: '竞品响应', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
};

// 状态配置
const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  draft: { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Edit3 },
  pending: { label: '待确认', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock },
  hotel_confirmed: { label: '已确认', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  hotel_rejected: { label: '已拒绝', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
  hotel_modified: { label: '已修改', color: 'text-violet-600', bgColor: 'bg-violet-50', icon: MessageSquare },
  executed: { label: '已执行', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: CheckCircle },
  expired: { label: '已过期', color: 'text-gray-500', bgColor: 'bg-gray-50', icon: Clock },
};

// ============================================
// 工具函数
// ============================================
function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(1)}万`;
  }
  return `¥${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getCountdownHours(createdAt: string, autoExecuteAfterHours: number): number {
  const created = new Date(createdAt).getTime();
  const deadline = created + autoExecuteAfterHours * 60 * 60 * 1000;
  const now = Date.now();
  const hoursLeft = Math.max(0, Math.ceil((deadline - now) / (60 * 60 * 1000)));
  return hoursLeft;
}

// ============================================
// Toast 通知 Hook（简化版，不依赖 Provider）
// ============================================
type ToastType = 'success' | 'error' | 'info' | 'warning';

function useSimpleToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // 3秒后自动移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

// ============================================
// 数字动画组件
// ============================================
function AnimatedNumber({ 
  value, 
  formatter = (v: number) => v.toString(),
  className = ''
}: { 
  value: number; 
  formatter?: (v: number) => string;
  className?: string;
}) {
  const { count } = useCountUp(value, { duration: 1000 });
  return <span className={className}>{formatter(Math.round(count))}</span>;
}

// ============================================
// Toast 容器组件
// ============================================
function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: InfoSvg,
  };
  
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm min-w-[300px] max-w-[500px] shadow-lg ${colors[toast.type]}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => onRemove(toast.id)}
                className="p-1 hover:bg-black/5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// AlertTriangle 和 Info 图标组件
function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  );
}

function InfoSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  );
}

// ============================================
// 主组件
// ============================================
export default function PricingStrategy() {
  // 从全局状态获取选中的酒店
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  
  // Toast 通知
  const { toasts, showToast, removeToast } = useSimpleToast();
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  
  // 根据选中的酒店生成参与度配置（实际应从API获取，这里用mock映射）
  const selectedHotels = useMemo(() => {
    return hotels.filter(h => selectedHotelIds.includes(h.id));
  }, [hotels, selectedHotelIds]);
  
  // TODO: 演示数据 - 为选中的酒店生成参与度配置（实际应从后端获取）
  // 实际应调用 api.getHotelEngagements(selectedHotelIds) 获取真实数据
  const hotelEngagements: HotelEngagement[] = useMemo(() => {
    return selectedHotels.map((hotel, index) => {
      // 根据酒店ID映射不同的参与度（模拟数据）
      const levels: EngagementLevel[] = ['hands_off', 'notify', 'confirm', 'negotiate', 'diy'];
      const level = levels[index % levels.length];
      return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        level,
        autoExecuteAfterHours: level === 'confirm' ? 24 : undefined,
      };
    });
  }, [selectedHotels]);
  
  const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([]);
  
  // 通过API加载定价建议数据
  // 加载定价建议 - 当酒店选择变化时重新加载
  useEffect(() => {
    const loadSuggestions = async () => {
      if (selectedHotelIds.length === 0) return;
      
      setIsLoading(true);
      try {
        const response = await strategyApi.getPricingSuggestions({ page: 1, pageSize: 20 });
        if (response.success) {
          setSuggestions(response.data.list);
        } else {
          showToast(response.message || '加载建议失败', 'error');
        }
      } catch (error) {
        showToast('加载建议失败，请稍后重试', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadSuggestions();
  }, [selectedHotelIds, showToast]);
  
  // 视图状态
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PricingSuggestion | null>(null);
  
  // 筛选
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    status: '',
    engagementLevel: '',
  });

  // 只显示选中酒店的建议
  const relevantSuggestions = useMemo(() => {
    if (selectedHotelIds.length === 0) return [];
    return suggestions.filter(s => selectedHotelIds.includes(s.hotelId));
  }, [suggestions, selectedHotelIds]);

  // 统计数据（只统计选中酒店）
  const stats = useMemo(() => {
    const pendingConfirmations = relevantSuggestions.filter(s => s.status === 'pending').length;
    const negotiations = relevantSuggestions.filter(s => s.status === 'hotel_modified').length;
    const totalRevenueImpact = relevantSuggestions
      .filter(s => s.status === 'executed')
      .reduce((sum, s) => sum + (s.execution?.actualImpact || s.expectedImpact.revenueIncrease), 0);
    const handsOffCount = hotelEngagements.filter(h => h.level === 'hands_off').length;
    
    return {
      pendingConfirmations,
      negotiations,
      totalRevenueImpact,
      handsOffCount,
      totalSuggestions: relevantSuggestions.length,
      executedCount: relevantSuggestions.filter(s => s.status === 'executed').length,
    };
  }, [relevantSuggestions, hotelEngagements]);

  // 筛选后的建议
  const filteredSuggestions = useMemo(() => {
    return relevantSuggestions.filter(s => {
      if (selectedHotelId && s.hotelId !== selectedHotelId) return false;
      if (filters.keyword && !s.name.includes(filters.keyword) && !s.hotelName.includes(filters.keyword)) return false;
      if (filters.type && s.type !== filters.type) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.engagementLevel && s.engagementLevel !== filters.engagementLevel) return false;
      return true;
    });
  }, [relevantSuggestions, selectedHotelId, filters]);

  // 按酒店分组的统计（只包含选中酒店）
  const hotelStats = useMemo(() => {
    return hotelEngagements.map(engagement => {
      const hotelSuggestions = relevantSuggestions.filter(s => s.hotelId === engagement.hotelId);
      const pendingCount = hotelSuggestions.filter(s => s.status === 'pending').length;
      const negotiationCount = hotelSuggestions.filter(s => s.status === 'hotel_modified').length;
      const revenueImpact = hotelSuggestions
        .filter(s => s.status === 'executed')
        .reduce((sum, s) => sum + (s.execution?.actualImpact || 0), 0);
      
      return {
        ...engagement,
        pendingCount,
        negotiationCount,
        revenueImpact,
        suggestionCount: hotelSuggestions.length,
      };
    });
  }, [hotelEngagements, relevantSuggestions]);

  // 处理生成建议 - 调用真实API
  const handleGenerateSuggestion = async (data: Partial<PricingSuggestion>) => {
    setIsGenerating(true);
    try {
      // 调用真实的API生成建议
      const response = await strategyApi.generateSuggestions(data.hotelId ? [data.hotelId] : []);
      
      if (response.success && response.data.length > 0) {
        // 使用API返回的建议，但可以合并一些表单数据
        const newSuggestions = response.data.map(suggestion => ({
          ...suggestion,
          name: data.name || suggestion.name,
          startDate: data.startDate || suggestion.startDate,
          endDate: data.endDate || suggestion.endDate,
          type: data.type || suggestion.type,
        }));
        
        setSuggestions(prev => [...newSuggestions, ...prev]);
        showToast(`成功生成 ${newSuggestions.length} 条定价建议`, 'success');
        setShowGenerateModal(false);
      } else {
        showToast(response.message || '生成建议失败', 'error');
      }
    } catch (error) {
      showToast('生成建议失败，请稍后重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理确认建议 - 调用真实API
  const handleConfirmSuggestion = async (suggestionId: string) => {
    setIsConfirming(suggestionId);
    try {
      const response = await strategyApi.applySuggestion(suggestionId);
      
      if (response.success) {
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId 
            ? { ...s, status: 'executed', execution: { executedAt: new Date().toISOString(), executedBy: 'hotel_manager' } }
            : s
        ));
        showToast('建议已确认并执行', 'success');
      } else {
        showToast(response.message || '确认失败', 'error');
      }
    } catch (error) {
      showToast('确认失败，请稍后重试', 'error');
    } finally {
      setIsConfirming(null);
    }
  };

  // 处理执行建议 - 调用真实API
  const handleExecuteSuggestion = async (suggestionId: string) => {
    setIsExecuting(suggestionId);
    try {
      const response = await strategyApi.applySuggestion(suggestionId);
      
      if (response.success) {
        setSuggestions(prev => prev.map(s => 
          s.id === suggestionId 
            ? { ...s, status: 'executed', execution: { executedAt: new Date().toISOString(), executedBy: 'huamei_operator' } }
            : s
        ));
        showToast('建议已执行', 'success');
      } else {
        showToast(response.message || '执行失败', 'error');
      }
    } catch (error) {
      showToast('执行失败，请稍后重试', 'error');
    } finally {
      setIsExecuting(null);
    }
  };

  // 未选择酒店时的空状态
  if (selectedHotelIds.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Hotel className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            请在顶部酒店选择器中至少选择一家酒店，查看和管理定价建议
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast 通知 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" />
              智能定价中心
            </h1>
            {/* 演示模式标记 */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              <InfoIcon className="w-3 h-3" />
              演示模式
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 1 
              ? `${selectedHotels[0]?.name} - 单酒店定价管理`
              : `已选择 ${selectedHotelIds.length} 家酒店 - 批量定价管理`
            }
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? '生成中...' : '生成定价建议'}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="待确认建议" 
          value={stats.pendingConfirmations} 
          subtitle="需酒店确认"
          icon={Clock} 
          color="bg-amber-100 text-amber-600" 
          isLoading={isLoading}
        />
        <StatCard 
          title="协商中" 
          value={stats.negotiations} 
          subtitle="酒店提出修改"
          icon={MessageSquare} 
          color="bg-violet-100 text-violet-600" 
          isLoading={isLoading}
        />
        <StatCard 
          title="本月增收" 
          value={stats.totalRevenueImpact}
          valueFormatter={formatCurrency}
          subtitle="已通过建议实现"
          icon={TrendingUp} 
          color="bg-emerald-100 text-emerald-600" 
          isLoading={isLoading}
          isAnimated
        />
        <StatCard 
          title="全权托管" 
          value={`${stats.handsOffCount}家`} 
          subtitle="自动执行中"
          icon={Shield} 
          color="bg-blue-100 text-blue-600" 
          isLoading={isLoading}
        />
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：酒店列表（3列） */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                酒店管理
              </h3>
              <button 
                onClick={() => setSelectedHotelId(null)}
                className={`text-xs px-2 py-1 rounded ${!selectedHotelId ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                全部
              </button>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {hotelStats.map(hotel => {
                const engagementConfig = ENGAGEMENT_CONFIG[hotel.level] || ENGAGEMENT_CONFIG.confirm;
                const isSelected = selectedHotelId === hotel.hotelId;
                
                return (
                  <button
                    key={hotel.hotelId}
                    onClick={() => setSelectedHotelId(isSelected ? null : hotel.hotelId)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-violet-500 bg-violet-50' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{hotel.hotelName}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${engagementConfig.badgeColor}`}>
                            {engagementConfig.label}
                          </span>
                        </div>
                      </div>
                      {(hotel.pendingCount > 0 || hotel.negotiationCount > 0) && (
                        <div className="flex flex-col items-end gap-1">
                          {hotel.pendingCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                              {hotel.pendingCount}
                            </span>
                          )}
                          {hotel.negotiationCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center">
                              {hotel.negotiationCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {hotel.revenueImpact > 0 && (
                      <div className="mt-2 text-xs text-emerald-600">
                        +{formatCurrency(hotel.revenueImpact)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧：建议列表（9列） */}
        <div className="col-span-9 space-y-4">
          {/* 筛选栏 */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索建议名称、酒店..."
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(SUGGESTION_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">全部状态</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-violet-500 animate-spin" />
              <p className="text-gray-500">加载中...</p>
            </div>
          )}

          {/* 建议列表 */}
          {!isLoading && (
            <div className="space-y-3">
              {filteredSuggestions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">暂无定价建议</p>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="mt-4 text-violet-600 hover:text-violet-700 text-sm"
                  >
                    生成第一个建议
                  </button>
                </div>
              ) : (
                filteredSuggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setShowDetailModal(true);
                    }}
                    onConfirm={() => handleConfirmSuggestion(suggestion.id)}
                    onExecute={() => handleExecuteSuggestion(suggestion.id)}
                    isConfirming={isConfirming === suggestion.id}
                    isExecuting={isExecuting === suggestion.id}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 生成建议弹窗 */}
      {showGenerateModal && (
        <GenerateSuggestionModal
          hotels={hotelEngagements}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateSuggestion}
          isGenerating={isGenerating}
        />
      )}

      {/* 详情弹窗 */}
      {showDetailModal && selectedSuggestion && (
        <SuggestionDetailModal
          suggestion={selectedSuggestion}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSuggestion(null);
          }}
          onConfirm={() => handleConfirmSuggestion(selectedSuggestion.id)}
          onExecute={() => handleExecuteSuggestion(selectedSuggestion.id)}
          isConfirming={isConfirming === selectedSuggestion.id}
          isExecuting={isExecuting === selectedSuggestion.id}
        />
      )}
    </div>
  );
}

// ============================================
// 子组件：统计卡片
// ============================================
function StatCard({ 
  title, 
  value, 
  valueFormatter,
  subtitle,
  icon: Icon, 
  color,
  isLoading,
  isAnimated
}: { 
  title: string; 
  value: string | number; 
  valueFormatter?: (v: number) => string;
  subtitle: string;
  icon: typeof TrendingUp; 
  color: string;
  isLoading?: boolean;
  isAnimated?: boolean;
}) {
  const [bgColor, textColor] = color.split(' ');
  
  // 如果是数字且需要动画
  const numericValue = typeof value === 'number' ? value : null;
  
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {isLoading ? (
            <div className="h-8 flex items-center">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : isAnimated && numericValue !== null ? (
            <AnimatedNumber 
              value={numericValue}
              formatter={valueFormatter || ((v) => v.toLocaleString())}
              className={`text-2xl font-bold mt-1 ${textColor}`}
            />
          ) : (
            <p className={`text-2xl font-bold mt-1 ${textColor}`}>
              {typeof value === 'number' && valueFormatter ? valueFormatter(value) : value}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 子组件：建议卡片
// ============================================
function SuggestionCard({
  suggestion,
  onClick,
  onConfirm,
  onExecute,
  isConfirming,
  isExecuting,
}: {
  suggestion: PricingSuggestion;
  onClick: () => void;
  onConfirm: () => void;
  onExecute: () => void;
  isConfirming?: boolean;
  isExecuting?: boolean;
}) {
  const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.type] || SUGGESTION_TYPE_CONFIG.daily;
  const statusConfig = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.draft;
  const engagementConfig = ENGAGEMENT_CONFIG[suggestion.engagementLevel] || ENGAGEMENT_CONFIG.confirm;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  
  // 如果是确认模式且待确认，计算倒计时
  const countdownHours = suggestion.engagementLevel === 'confirm' && suggestion.status === 'pending' && suggestion.hotelId
    ? getCountdownHours(suggestion.createdAt, 24)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-violet-300 transition-colors"
    >
      {/* 头部 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{suggestion.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {suggestion.hotelName}
                </span>
                <span>·</span>
                <span className={`px-1.5 py-0.5 rounded ${engagementConfig.badgeColor}`}>
                  {engagementConfig.label}
                </span>
                <span>·</span>
                <span>{formatDate(suggestion.startDate)} - {formatDate(suggestion.endDate)}</span>
              </div>
            </div>
          </div>
          
          {/* 预期效果 */}
          <div className="text-right">
            <div className={`text-lg font-bold ${suggestion.expectedImpact.revenueIncrease >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {suggestion.expectedImpact.revenueIncrease >= 0 ? '+' : ''}
              {formatCurrency(suggestion.expectedImpact.revenueIncrease)}
            </div>
            <div className="text-xs text-gray-400">
              预估增收
            </div>
          </div>
        </div>
      </div>
      
      {/* 建议详情 */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">建议价格</span>
            <span className="font-semibold text-gray-900">¥{suggestion.rules.suggestedPrice}</span>
            <span className={`text-xs ${suggestion.rules.increasePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ({suggestion.rules.increasePercent >= 0 ? '+' : ''}{suggestion.rules.increasePercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">AI置信度</span>
            <span className="font-semibold text-violet-600">{suggestion.expectedImpact.confidence}%</span>
          </div>
          
          {/* 酒店反馈（如果有） */}
          {suggestion.hotelFeedback && (
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" />
              <span className="text-violet-600">{suggestion.hotelFeedback.message}</span>
            </div>
          )}
          
          {/* 倒计时（确认模式） */}
          {countdownHours !== null && countdownHours > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <Clock className="w-4 h-4" />
              <span className="text-xs">{countdownHours}小时后自动执行</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={onClick}
          className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
        >
          查看详情
          <ChevronRight className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2">
          {suggestion.status === 'pending' && (
            <>
              <button
                onClick={onClick}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                查看
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isConfirming && <Loader2 className="w-3 h-3 animate-spin" />}
                {isConfirming ? '确认中...' : '确认执行'}
              </button>
            </>
          )}
          
          {suggestion.status === 'hotel_modified' && (
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting && <Loader2 className="w-3 h-3 animate-spin" />}
              {isExecuting ? '执行中...' : '接受修改并执行'}
            </button>
          )}
          
          {suggestion.status === 'executed' && suggestion.execution && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              已执行
              {suggestion.execution.actualImpact && (
                <span className="text-emerald-600">
                  (+{formatCurrency(suggestion.execution.actualImpact)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 子组件：生成建议弹窗
// ============================================
function GenerateSuggestionModal({
  hotels,
  onClose,
  onGenerate,
  isGenerating,
}: {
  hotels: HotelEngagement[];
  onClose: () => void;
  onGenerate: (data: Partial<PricingSuggestion>) => void;
  isGenerating?: boolean;
}) {
  const [form, setForm] = useState({
    hotelId: hotels[0]?.hotelId || '',
    type: 'daily' as SuggestionType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [events, setEvents] = useState<EventIntel[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const selectedHotel = hotels.find(h => h.hotelId === form.hotelId);
  const engagementConfig = selectedHotel ? (ENGAGEMENT_CONFIG[selectedHotel.level] || ENGAGEMENT_CONFIG.confirm) : null;
  
  // 加载影响选中酒店的事件
  useEffect(() => {
    if (form.hotelId) {
      setLoadingEvents(true);
      eventsApi.getEventsForHotel(form.hotelId).then(response => {
        if (response.success) {
          setEvents(response.data);
        }
        setLoadingEvents(false);
      }).catch(() => {
        setLoadingEvents(false);
      });
    }
  }, [form.hotelId]);
  
  // 选择事件后自动填充
  const handleSelectEvent = (event: EventIntel) => {
    setSelectedEventId(event.id);
    const eventType: SuggestionType = event.type === 'holiday' ? 'holiday' : 
                                      event.type === 'concert' || event.type === 'sports' ? 'event' : 'daily';
    setForm(prev => ({
      ...prev,
      type: eventType,
      startDate: event.startDate,
      endDate: event.endDate,
    }));
  };
  
  const handleGenerate = () => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    
    onGenerate({
      name: selectedEvent 
        ? `[${selectedEvent.title}] ${selectedHotel?.hotelName || ''} - 调价建议`
        : `${selectedHotel?.hotelName || ''} - ${(SUGGESTION_TYPE_CONFIG[form.type] || SUGGESTION_TYPE_CONFIG.daily).label}调价建议`,
      type: form.type,
      hotelId: form.hotelId,
      hotelName: selectedHotel?.hotelName || '',
      engagementLevel: selectedHotel?.level || 'confirm',
      startDate: form.startDate,
      endDate: form.endDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              生成智能定价建议
            </h3>
            {/* 演示模式标记 */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              <InfoIcon className="w-3 h-3" />
              演示模式
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600" disabled={isGenerating}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 演示模式提示 */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <InfoIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            当前为演示模式，AI生成的建议为模拟数据，仅供功能展示使用。
          </p>
        </div>
        
        <div className="space-y-4">
          {/* 选择酒店 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择酒店</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {hotels.map(hotel => {
                const config = ENGAGEMENT_CONFIG[hotel.level] || ENGAGEMENT_CONFIG.confirm;
                return (
                  <label
                    key={hotel.hotelId}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      form.hotelId === hotel.hotelId ? 'bg-violet-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hotel"
                      value={hotel.hotelId}
                      checked={form.hotelId === hotel.hotelId}
                      onChange={(e) => setForm(prev => ({ ...prev, hotelId: e.target.value }))}
                      className="text-violet-600"
                      disabled={isGenerating}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{hotel.hotelName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.badgeColor}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">{config.description}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          
          {/* 关联事件（如果有） */}
          {events.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                关联事件
                <span className="text-xs text-gray-400 font-normal ml-2">自动填充时间和类型</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {loadingEvents ? (
                  <div className="text-center py-4 text-gray-400 text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">暂无影响该酒店的事件</div>
                ) : (
                  events.map(event => (
                    <label
                      key={event.id}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedEventId === event.id ? 'bg-violet-50 border border-violet-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="event"
                        checked={selectedEventId === event.id}
                        onChange={() => handleSelectEvent(event)}
                        className="mt-1 text-violet-600"
                        disabled={isGenerating}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm truncate">{event.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            event.impact === 'high' ? 'bg-red-100 text-red-700' :
                            event.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {event.impact === 'high' ? '高影响' : event.impact === 'medium' ? '中影响' : '低影响'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {event.startDate} {event.endDate && event.endDate !== event.startDate ? `~ ${event.endDate}` : ''}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedEventId && (
                <button
                  onClick={() => {
                    setSelectedEventId(null);
                    setForm(prev => ({ ...prev, type: 'daily' }));
                  }}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  disabled={isGenerating}
                >
                  清除选择
                </button>
              )}
            </div>
          )}
          
          {/* 建议类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">建议类型</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SUGGESTION_TYPE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setForm(prev => ({ ...prev, type: key as SuggestionType }))}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      form.type === key
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className={`w-4 h-4 ${form.type === key ? config.color : 'text-gray-400'}`} />
                    <span className={`text-sm ${form.type === key ? 'text-gray-900' : 'text-gray-600'}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 时间范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                disabled={isGenerating}
              />
            </div>
          </div>
          
          {/* 参与度提示 */}
          {engagementConfig && (
            <div className={`p-3 rounded-lg ${engagementConfig.bgColor}`}>
              <div className="flex items-start gap-2">
                <engagementConfig.icon className={`w-4 h-4 mt-0.5 ${engagementConfig.color}`} />
                <div>
                  <div className={`text-sm font-medium ${engagementConfig.color}`}>
                    {engagementConfig.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {engagementConfig.automation === 'full' 
                      ? 'AI生成后将自动执行，无需等待' 
                      : engagementConfig.automation === 'semi'
                      ? 'AI生成后需酒店确认，超时自动执行'
                      : 'AI生成后需双方协商确认'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 生成进度提示 */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-violet-900">AI正在分析数据...</p>
                <p className="text-xs text-violet-600 mt-0.5">分析历史定价、竞品价格、需求预测</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !form.hotelId}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成建议
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// 子组件：建议详情弹窗
// ============================================
function SuggestionDetailModal({
  suggestion,
  onClose,
  onConfirm,
  onExecute,
  isConfirming,
  isExecuting,
}: {
  suggestion: PricingSuggestion;
  onClose: () => void;
  onConfirm: () => void;
  onExecute: () => void;
  isConfirming?: boolean;
  isExecuting?: boolean;
}) {
  const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.type] || SUGGESTION_TYPE_CONFIG.daily;
  const statusConfig = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.draft;
  const engagementConfig = ENGAGEMENT_CONFIG[suggestion.engagementLevel] || ENGAGEMENT_CONFIG.confirm;
  const TypeIcon = typeConfig.icon;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${typeConfig.bgColor} flex items-center justify-center`}>
                <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{suggestion.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${engagementConfig.badgeColor}`}>
                    {engagementConfig.label}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={isConfirming || isExecuting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 酒店信息 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Building2 className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900">{suggestion.hotelName}</span>
          </div>
          
          {/* AI建议理由 */}
          <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="font-medium text-violet-900">AI建议理由</span>
            </div>
            <p className="text-sm text-violet-800">{suggestion.rules.reasoning}</p>
          </div>
          
          {/* 定价方案 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl text-center">
              <div className="text-sm text-gray-500 mb-1">当前价格</div>
              <div className="text-2xl font-bold text-gray-900">¥{suggestion.rules.basePrice}</div>
            </div>
            <div className="p-4 border border-violet-200 bg-violet-50 rounded-xl text-center">
              <div className="text-sm text-violet-600 mb-1">建议价格</div>
              <div className="text-2xl font-bold text-violet-700">¥{suggestion.rules.suggestedPrice}</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-xl text-center">
              <div className="text-sm text-gray-500 mb-1">涨幅</div>
              <div className={`text-2xl font-bold ${suggestion.rules.increasePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {suggestion.rules.increasePercent >= 0 ? '+' : ''}{suggestion.rules.increasePercent}%
              </div>
            </div>
          </div>
          
          {/* 预期效果 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">预期效果</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">预估增收</div>
                <div className={`text-lg font-bold ${suggestion.expectedImpact.revenueIncrease >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {suggestion.expectedImpact.revenueIncrease >= 0 ? '+' : ''}
                  {formatCurrency(suggestion.expectedImpact.revenueIncrease)}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">入住率影响</div>
                <div className={`text-lg font-bold ${suggestion.expectedImpact.occupancyImpact >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {suggestion.expectedImpact.occupancyImpact >= 0 ? '+' : ''}
                  {suggestion.expectedImpact.occupancyImpact}%
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">AI置信度</div>
                <div className="text-lg font-bold text-violet-600">
                  {suggestion.expectedImpact.confidence}%
                </div>
              </div>
            </div>
          </div>
          
          {/* 酒店反馈（如果有） */}
          {suggestion.hotelFeedback && (
            <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-violet-600" />
                <span className="font-medium text-violet-900">酒店反馈</span>
              </div>
              <p className="text-sm text-violet-800 mb-2">{suggestion.hotelFeedback.message}</p>
              {suggestion.hotelFeedback.modifiedRules && (
                <div className="text-sm text-gray-600">
                  建议调整为：¥{suggestion.hotelFeedback.modifiedRules.suggestedPrice}
                  （{suggestion.hotelFeedback.modifiedRules.increasePercent}%）
                </div>
              )}
            </div>
          )}
          
          {/* 执行记录（如果有） */}
          {suggestion.execution && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-emerald-900">执行记录</span>
              </div>
              <div className="text-sm text-emerald-800">
                于 {new Date(suggestion.execution.executedAt).toLocaleString()} 执行
                {suggestion.execution.executedBy === 'ai' && '（系统自动）'}
                {suggestion.execution.executedBy === 'hotel_manager' && '（酒店确认）'}
                {suggestion.execution.executedBy === 'huamei_operator' && '（运营人员）'}
              </div>
              {suggestion.execution.actualImpact && (
                <div className="mt-2 text-sm text-emerald-700">
                  实际增收：+{formatCurrency(suggestion.execution.actualImpact)}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 底部操作 */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming || isExecuting}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            关闭
          </button>
          
          {suggestion.status === 'pending' && (
            <button
              onClick={() => { onConfirm(); onClose(); }}
              disabled={isConfirming}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
              {isConfirming ? '确认中...' : '确认执行'}
            </button>
          )}
          
          {suggestion.status === 'hotel_modified' && (
            <button
              onClick={() => { onExecute(); onClose(); }}
              disabled={isExecuting}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isExecuting ? '执行中...' : '接受修改并执行'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
