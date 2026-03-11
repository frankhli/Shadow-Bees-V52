/**
 * 策略执行监控组件 - Phase 3 核心功能
 * 监控集团策略的「是否执行」和「是否异常」，不看详细数据
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  TrendingUp,
  Shield,
  Filter,
  RefreshCw,
  ChevronRight,
  Play,
  Pause,
  AlertTriangle,
  X
} from 'lucide-react';
import type { Customer } from '../stores/adminStore';

// 策略执行状态
export type ExecutionStatus = 'executed' | 'pending' | 'failed' | 'blocked';

// 策略类型配置（全局）
const strategyTypeConfig = {
  pricing: { icon: TrendingUp, color: 'text-neon-cyan', label: '定价策略' },
  inventory: { icon: Shield, color: 'text-neon-purple', label: '库存策略' },
  discount: { icon: Activity, color: 'text-neon-amber', label: '折扣策略' },
  channel: { icon: Building2, color: 'text-neon-green', label: '渠道策略' },
};

// 策略执行记录
export interface StrategyExecution {
  id: string;
  customerId: string;
  customerName: string;
  hotelId: string;
  hotelName: string;
  strategyType: 'pricing' | 'inventory' | 'channel' | 'discount';
  strategyName: string;
  status: ExecutionStatus;
  // 执行时间
  scheduledAt: string;
  executedAt?: string;
  // 异常信息（仅状态，无详细数据）
  hasException: boolean;
  exceptionType?: 'timeout' | 'rejected' | 'system_error' | 'conflict';
  // 结果摘要
  result: 'success' | 'partial' | 'failed';
  retryCount: number;
}

// 模拟生成执行记录
function generateMockExecutions(customers: Customer[]): StrategyExecution[] {
  const executions: StrategyExecution[] = [];
  const now = new Date();
  
  for (const customer of customers.filter(c => c.type === 'group')) {
    for (const hotel of customer.hotels) {
      // 每个门店生成几条执行记录
      const strategies = [
        { type: 'pricing' as const, name: '最低限价策略' },
        { type: 'inventory' as const, name: '库存保留策略' },
        { type: 'discount' as const, name: '折扣限制策略' },
        { type: 'channel' as const, name: '渠道优先级策略' },
      ];
      
      for (const strategy of strategies) {
        const isExecuted = Math.random() > 0.3;
        const hasException = isExecuted && Math.random() > 0.8;
        
        executions.push({
          id: `exec-${hotel.id}-${strategy.type}`,
          customerId: customer.id,
          customerName: customer.companyName,
          hotelId: hotel.id,
          hotelName: hotel.name,
          strategyType: strategy.type,
          strategyName: strategy.name,
          status: isExecuted ? (hasException ? 'failed' : 'executed') : 'pending',
          scheduledAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          executedAt: isExecuted ? new Date().toISOString() : undefined,
          hasException,
          exceptionType: hasException 
            ? ['timeout', 'rejected', 'system_error', 'conflict'][Math.floor(Math.random() * 4)] as any
            : undefined,
          result: isExecuted ? (hasException ? 'failed' : 'success') : 'failed',
          retryCount: hasException ? Math.floor(Math.random() * 3) : 0,
        });
      }
    }
  }
  
  return executions.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

// 执行卡片
function ExecutionCard({
  execution,
  onClick
}: {
  execution: StrategyExecution;
  onClick: () => void;
}) {
  const statusConfig = {
    executed: { label: '已执行', color: 'text-neon-green', bg: 'bg-neon-green/10', icon: CheckCircle2 },
    pending: { label: '待执行', color: 'text-neon-amber', bg: 'bg-neon-amber/10', icon: Clock },
    failed: { label: '执行失败', color: 'text-neon-red', bg: 'bg-neon-red/10', icon: XCircle },
    blocked: { label: '被阻断', color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Pause },
  };
  
  const config = statusConfig[execution.status];
  const typeConfig = strategyTypeConfig[execution.strategyType];
  const StatusIcon = config.icon;
  const TypeIcon = typeConfig.icon;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        execution.hasException 
          ? 'bg-red-500/5 border-red-500/30' 
          : 'bg-[#0B0F19] border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
            <TypeIcon size={18} className={typeConfig.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{execution.strategyName}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                <StatusIcon size={12} className="inline mr-1" />
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{execution.hotelName}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>计划: {new Date(execution.scheduledAt).toLocaleDateString()}</span>
              {execution.executedAt && (
                <span>执行: {new Date(execution.executedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          {execution.hasException ? (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <AlertTriangle size={14} />
              <span>异常</span>
            </div>
          ) : execution.status === 'executed' ? (
            <CheckCircle2 size={20} className="text-neon-green" />
          ) : (
            <ChevronRight size={20} className="text-gray-500" />
          )}
        </div>
      </div>
      
      {execution.hasException && execution.exceptionType && (
        <div className="mt-3 p-2 bg-red-500/10 rounded-lg text-xs text-red-400">
          异常类型: {{
            timeout: '执行超时',
            rejected: '被系统拒绝',
            system_error: '系统错误',
            conflict: '策略冲突'
          }[execution.exceptionType]}
          {execution.retryCount > 0 && ` · 已重试${execution.retryCount}次`}
        </div>
      )}
    </motion.div>
  );
}

export function StrategyExecutionMonitor({ customers }: { customers: Customer[] }) {
  const [filterStatus, setFilterStatus] = useState<ExecutionStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExecution, setSelectedExecution] = useState<StrategyExecution | null>(null);
  
  // 生成执行数据
  const executions = useMemo(() => {
    return generateMockExecutions(customers);
  }, [customers, refreshKey]);
  
  // 统计
  const stats = useMemo(() => {
    const total = executions.length;
    const executed = executions.filter(e => e.status === 'executed').length;
    const pending = executions.filter(e => e.status === 'pending').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const exceptions = executions.filter(e => e.hasException).length;
    
    return {
      total,
      executed,
      pending,
      failed,
      exceptions,
      executionRate: total > 0 ? Math.round((executed / total) * 100) : 0,
    };
  }, [executions]);
  
  // 过滤
  const filteredExecutions = useMemo(() => {
    return executions.filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterType !== 'all' && e.strategyType !== filterType) return false;
      return true;
    });
  }, [executions, filterStatus, filterType]);
  
  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
      {/* 头部 */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-cyan/10 rounded-lg">
              <Play size={20} className="text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">策略执行监控</h2>
              <p className="text-gray-400 text-sm">
                执行率 {stats.executionRate}% · {stats.exceptions} 个异常
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
        <div className="grid grid-cols-5 gap-3 mt-4">
          <div className="p-3 bg-[#0B0F19] rounded-lg">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">总策略数</p>
          </div>
          <div className="p-3 bg-neon-green/10 rounded-lg border border-neon-green/30">
            <p className="text-2xl font-bold text-neon-green">{stats.executed}</p>
            <p className="text-xs text-gray-400">已执行</p>
          </div>
          <div className="p-3 bg-neon-amber/10 rounded-lg border border-neon-amber/30">
            <p className="text-2xl font-bold text-neon-amber">{stats.pending}</p>
            <p className="text-xs text-gray-400">待执行</p>
          </div>
          <div className="p-3 bg-neon-red/10 rounded-lg border border-neon-red/30">
            <p className="text-2xl font-bold text-neon-red">{stats.failed}</p>
            <p className="text-xs text-gray-400">失败</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <p className="text-2xl font-bold text-red-400">{stats.exceptions}</p>
            <p className="text-xs text-gray-400">异常</p>
          </div>
        </div>
      </div>
      
      {/* 过滤器 */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
        <Filter size={16} className="text-gray-500" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ExecutionStatus | 'all')}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="executed">已执行</option>
          <option value="pending">待执行</option>
          <option value="failed">失败</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 bg-[#0B0F19] border border-gray-700 rounded text-sm focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部类型</option>
          <option value="pricing">定价策略</option>
          <option value="inventory">库存策略</option>
          <option value="discount">折扣策略</option>
          <option value="channel">渠道策略</option>
        </select>
      </div>
      
      {/* 执行列表 */}
      <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
        {filteredExecutions.length > 0 ? (
          filteredExecutions.map((execution) => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              onClick={() => setSelectedExecution(execution)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
            <p>暂无策略执行记录</p>
          </div>
        )}
      </div>
      
      {/* 执行详情弹窗 */}
      <AnimatePresence>
        {selectedExecution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedExecution(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#151B2B] rounded-2xl border border-gray-800 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedExecution.strategyName}</h3>
                <button 
                  onClick={() => setSelectedExecution(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">策略类型</span>
                  <span className={strategyTypeConfig[selectedExecution.strategyType].color}>
                    {selectedExecution.strategyType === 'pricing' && '定价策略'}
                    {selectedExecution.strategyType === 'inventory' && '库存策略'}
                    {selectedExecution.strategyType === 'discount' && '折扣策略'}
                    {selectedExecution.strategyType === 'channel' && '渠道策略'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">执行状态</span>
                  <span className={{
                    executed: 'text-neon-green',
                    pending: 'text-neon-amber',
                    failed: 'text-neon-red',
                    blocked: 'text-gray-400'
                  }[selectedExecution.status]}>
                    {{
                      executed: '已执行',
                      pending: '待执行',
                      failed: '执行失败',
                      blocked: '被阻断'
                    }[selectedExecution.status]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">门店</span>
                  <span>{selectedExecution.hotelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">计划时间</span>
                  <span>{new Date(selectedExecution.scheduledAt).toLocaleString()}</span>
                </div>
                {selectedExecution.executedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">执行时间</span>
                    <span>{new Date(selectedExecution.executedAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedExecution.hasException && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <span className="text-red-400 font-medium">异常信息</span>
                    <p className="text-red-400/80 mt-1">
                      {{
                        timeout: '执行超时',
                        rejected: '被系统拒绝',
                        system_error: '系统错误',
                        conflict: '策略冲突'
                      }[selectedExecution.exceptionType || 'system_error']}
                    </p>
                    {selectedExecution.retryCount > 0 && (
                      <p className="text-red-400/60 mt-1">已重试 {selectedExecution.retryCount} 次</p>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setSelectedExecution(null)}
                className="w-full mt-6 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
