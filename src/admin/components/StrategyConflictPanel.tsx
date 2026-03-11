/**
 * 策略冲突检测面板 - Phase 3 核心功能
 * 展示集团策略与平台算法的冲突
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Building,
  TrendingUp,
  Shield,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import type { Customer } from '../stores/adminStore';
import type { PricingSuggestion } from '@/types';
import {
  detectAllConflicts,
  getConflictStats,
  generateConflictRecommendations,
  resolveConflict,
  type StrategyConflict,
  type ConflictType,
  type ConflictSeverity
} from '../services/strategyConflictService';
import { toast } from '@/components/ux/EnhancedToast';

interface StrategyConflictPanelProps {
  customers: Customer[];
  suggestions: PricingSuggestion[];
}

// 冲突类型配置
const conflictTypeConfig: Record<ConflictType, { label: string; icon: typeof AlertTriangle; color: string }> = {
  price_deviation: { label: '价格偏离', icon: TrendingUp, color: 'text-neon-cyan' },
  inventory_block: { label: '库存阻断', icon: Shield, color: 'text-neon-amber' },
  channel_priority: { label: '渠道冲突', icon: AlertCircle, color: 'text-neon-purple' },
  discount_override: { label: '折扣覆盖', icon: AlertTriangle, color: 'text-neon-red' },
};

// 严重度配置
const severityConfig: Record<ConflictSeverity, { label: string; bg: string; border: string; icon: typeof AlertOctagon }> = {
  critical: { label: '严重', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertOctagon },
  warning: { label: '警告', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  info: { label: '提示', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info },
};

// 冲突卡片
function ConflictCard({
  conflict,
  onResolve,
  isResolving,
  isResolved
}: {
  conflict: StrategyConflict;
  onResolve: (conflict: StrategyConflict, resolution: 'follow_group' | 'follow_platform' | 'custom') => void;
  isResolving: boolean;
  isResolved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = conflictTypeConfig[conflict.type];
  const severityConfigItem = severityConfig[conflict.severity];
  const TypeIcon = typeConfig.icon;
  const SeverityIcon = severityConfigItem.icon;
  
  const recommendations = useMemo(() => generateConflictRecommendations(conflict), [conflict]);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl overflow-hidden ${severityConfigItem.bg} ${severityConfigItem.border}`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:brightness-110 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${typeConfig.color}`}>
            <SeverityIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{conflict.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${severityConfigItem.bg} ${severityConfigItem.border}`}>
                {severityConfigItem.label}
              </span>
              <span className={`text-xs flex items-center gap-1 ${typeConfig.color}`}>
                <TypeIcon size={12} />
                {typeConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 truncate">{conflict.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-gray-500">
                <Building size={12} className="inline mr-1" />
                {conflict.hotelName}
              </span>
              <span className="text-neon-amber">
                偏离度: {conflict.deviation}%
              </span>
              <span className="text-red-400">
                风险: ¥{conflict.impact.revenueRisk.toLocaleString()}
              </span>
            </div>
          </div>
          <ChevronRight
            size={18}
            className={`text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-800/50"
          >
            <div className="p-4 space-y-4 bg-[#0B0F19]/50">
              {/* 对比展示 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#151B2B] rounded-lg border border-neon-purple/20">
                  <p className="text-xs text-neon-purple mb-1">集团策略</p>
                  <p className="text-sm font-medium">{conflict.groupStrategy.rule}</p>
                  <p className="text-lg font-bold text-neon-purple mt-1">
                    {typeof conflict.groupStrategy.value === 'number' 
                      ? `¥${conflict.groupStrategy.value.toLocaleString()}`
                      : conflict.groupStrategy.value}
                  </p>
                </div>
                <div className="p-3 bg-[#151B2B] rounded-lg border border-neon-cyan/20">
                  <p className="text-xs text-neon-cyan mb-1">平台建议</p>
                  <p className="text-sm font-medium">{conflict.platformSuggestion.reason}</p>
                  <p className="text-lg font-bold text-neon-cyan mt-1">
                    {typeof conflict.platformSuggestion.value === 'number'
                      ? `¥${conflict.platformSuggestion.value.toLocaleString()}`
                      : conflict.platformSuggestion.value}
                  </p>
                </div>
              </div>
              
              {/* 建议 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">解决建议</p>
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-neon-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-2 pt-2">
                {isResolved ? (
                  <div className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    已解决
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(conflict, 'follow_group');
                      }}
                      disabled={isResolving}
                      className="flex-1 py-2 bg-neon-purple/20 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isResolving ? <Loader2 size={14} className="animate-spin" /> : null}
                      采用集团策略
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(conflict, 'follow_platform');
                      }}
                      disabled={isResolving}
                      className="flex-1 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isResolving ? <Loader2 size={14} className="animate-spin" /> : null}
                      采用平台建议
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(conflict, 'custom');
                      }}
                      disabled={isResolving}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                    >
                      自定义
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StrategyConflictPanel({ customers, suggestions }: StrategyConflictPanelProps) {
  const [filterType, setFilterType] = useState<ConflictType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ConflictSeverity | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 检测冲突
  const conflicts = useMemo(() => {
    return detectAllConflicts(customers, suggestions);
  }, [customers, suggestions, refreshKey]);
  
  // 统计
  const stats = useMemo(() => getConflictStats(conflicts), [conflicts]);
  

  
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  
  // 过滤 - 排除已解决的冲突
  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      if (resolvedIds.has(c.id)) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false;
      return c.status === 'active';
    });
  }, [conflicts, filterType, filterSeverity, resolvedIds]);
  
  const handleResolve = async (conflict: StrategyConflict, resolution: 'follow_group' | 'follow_platform' | 'custom') => {
    setResolvingIds(prev => new Set(prev).add(conflict.id));
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 更新冲突状态
    resolveConflict(conflict, resolution, 'current-user');
    setResolvedIds(prev => new Set(prev).add(conflict.id));
    setResolvingIds(prev => {
      const next = new Set(prev);
      next.delete(conflict.id);
      return next;
    });
    
    // 显示成功提示
    const resolutionText = {
      follow_group: '已采用集团策略',
      follow_platform: '已采用平台建议',
      custom: '已标记为自定义处理'
    }[resolution];
    
    toast.success(`${conflict.title} - ${resolutionText}`);
  };
  
  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
      {/* 头部 */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-amber/10 rounded-lg">
              <ArrowRightLeft size={20} className="text-neon-amber" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">策略冲突检测</h2>
              <p className="text-gray-400 text-sm">
                {stats.active} 个活跃冲突 · 总风险 ¥{stats.totalRevenueRisk.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={18} className="text-gray-400" />
          </button>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
            <p className="text-xs text-gray-400">严重冲突</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <p className="text-2xl font-bold text-amber-400">{stats.warning}</p>
            <p className="text-xs text-gray-400">警告冲突</p>
          </div>
          <div className="p-3 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
            <p className="text-2xl font-bold text-neon-purple">{stats.byType.price}</p>
            <p className="text-xs text-gray-400">价格冲突</p>
          </div>
          <div className="p-3 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30">
            <p className="text-2xl font-bold text-neon-cyan">{stats.byType.inventory}</p>
            <p className="text-xs text-gray-400">库存冲突</p>
          </div>
        </div>
      </div>
      
      {/* 过滤器 */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
        <Filter size={16} className="text-gray-500" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ConflictType | 'all')}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部类型</option>
          <option value="price_deviation">价格偏离</option>
          <option value="inventory_block">库存阻断</option>
          <option value="discount_override">折扣覆盖</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as ConflictSeverity | 'all')}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部级别</option>
          <option value="critical">严重</option>
          <option value="warning">警告</option>
          <option value="info">提示</option>
        </select>
      </div>
      
      {/* 冲突列表 */}
      <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
        {filteredConflicts.length > 0 ? (
          filteredConflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={handleResolve}
              isResolving={resolvingIds.has(conflict.id)}
              isResolved={resolvedIds.has(conflict.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
            <p>暂无策略冲突</p>
            <p className="text-sm text-gray-600 mt-1">
              集团策略与平台算法建议目前一致
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
