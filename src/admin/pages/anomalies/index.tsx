/**
 * SaaS运营后台 - 异常中心（统一数据源版）
 * 使用 store.anomalies 作为数据源，与健康度评分保持一致
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Search,
  TrendingUp,
  Package,
  ShoppingCart,
  FileText,
  HeadphonesIcon,
  X,
  Send,
  CreditCard,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { useNavigate } from 'react-router-dom';
import type { Anomaly, AnomalyType } from '../../utils/anomalyDetector';
import { PageSkeleton } from '@/components/ux/Skeleton';

// 业务域配置
const domainConfig: Record<AnomalyType, { 
  label: string; 
  icon: typeof TrendingUp; 
  color: string; 
  bgColor: string;
  page: string;
}> = {
  pricing: { 
    label: '定价', 
    icon: TrendingUp, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-400/10',
    page: '/pricing',
  },
  inventory: { 
    label: '库存', 
    icon: Package, 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-400/10',
    page: '/inventory',
  },
  order: { 
    label: '订单', 
    icon: ShoppingCart, 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-400/10',
    page: '/orders',
  },
  content: { 
    label: '内容', 
    icon: FileText, 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-400/10',
    page: '/content',
  },
  service: { 
    label: '服务', 
    icon: HeadphonesIcon, 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-400/10',
    page: '/support',
  },
  finance: {
    label: '财务',
    icon: CreditCard,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    page: '/finance',
  },
};

// 状态配置
const statusConfig = {
  pending: { label: '待处理', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  processing: { label: '处理中', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  resolved: { label: '已解决', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  ignored: { label: '已忽略', color: 'text-gray-400', bgColor: 'bg-gray-700/50' },
};

// 超时时间配置（小时）
const OVERTIME_HOURS = 24;

// 计算等待时间
function getWaitingHours(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60));
}

// 格式化等待时间显示
function formatWaitingTime(hours: number): string {
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days}天`;
  return `${days}天${remainingHours}小时`;
}

export default function AnomalyCenterPage() {
  const navigate = useNavigate();
  const { 
    anomalies, 
    adminUser, 
    updateAnomalyStatus, 
    hotels 
  } = useAdminStore();
  
  const [filterStatus, setFilterStatus] = useState<Anomaly['status'] | 'all' | 'overtime'>('overtime');
  const [filterType, setFilterType] = useState<AnomalyType | 'all'>('all');
  const [filterHotel, setFilterHotel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Anomaly | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [taskNotes, setTaskNotes] = useState<Record<string, { author: string; content: string; time: string }[]>>({});

  // 统计数据 - 基于 store.anomalies
  const stats = useMemo(() => {
    const byStatus = {
      pending: anomalies.filter(t => t.status === 'pending').length,
      processing: anomalies.filter(t => t.status === 'processing').length,
      resolved: anomalies.filter(t => t.status === 'resolved').length,
      ignored: anomalies.filter(t => t.status === 'ignored').length,
    };
    const critical = anomalies.filter(t => t.level === 'critical' && t.status !== 'resolved' && t.status !== 'ignored').length;
    const warning = anomalies.filter(t => t.level === 'warning' && t.status !== 'resolved' && t.status !== 'ignored').length;
    // 超时未响应：pending 状态且超过 24 小时
    const overtime = anomalies.filter(t => {
      if (t.status !== 'pending') return false;
      const waitingHours = getWaitingHours(t.createdAt);
      return waitingHours >= OVERTIME_HOURS;
    }).length;
    return { ...byStatus, critical, warning, overtime, total: anomalies.length };
  }, [anomalies]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    return anomalies.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchHotel = filterHotel === 'all' || t.hotelId === filterHotel;
      const matchSearch = searchQuery === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 状态筛选逻辑
      let matchStatus = true;
      if (filterStatus === 'overtime') {
        // 超时未响应：pending 状态且超过 24 小时
        const waitingHours = getWaitingHours(t.createdAt);
        matchStatus = t.status === 'pending' && waitingHours >= OVERTIME_HOURS;
      } else if (filterStatus !== 'all') {
        matchStatus = t.status === filterStatus;
      }
      
      return matchStatus && matchType && matchHotel && matchSearch;
    });
  }, [anomalies, filterStatus, filterType, filterHotel, searchQuery]);

  // 添加备注
  const addNote = (taskId: string, content: string) => {
    if (!content.trim()) return;
    setTaskNotes(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), {
        author: adminUser?.name || '系统',
        content: content.trim(),
        time: new Date().toISOString(),
      }],
    }));
    setNoteInput('');
  };

  // 获取备注
  const getNotes = (taskId: string) => taskNotes[taskId] || [];

  // 筛选条件变化时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [filterType, filterStatus, searchQuery]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">异常中心</h1>
          <p className="text-gray-400 text-sm mt-1">
            运营团队每日工作台 · 与健康度评分使用同一数据源
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.critical > 0 && (
            <div className="px-3 py-1.5 bg-red-400/10 rounded-lg border border-red-400/30">
              <span className="text-red-400 text-sm font-medium">🔴 {stats.critical} 个严重异常</span>
            </div>
          )}
          {stats.warning > 0 && (
            <div className="px-3 py-1.5 bg-amber-400/10 rounded-lg border border-amber-400/30">
              <span className="text-amber-400 text-sm font-medium">⚠️ {stats.warning} 个警告</span>
            </div>
          )}
        </div>
      </div>

      {/* 状态统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        <StatusCard 
          title="超时未响应" 
          count={stats.overtime} 
          color="red" 
          active={filterStatus === 'overtime'}
          onClick={() => setFilterStatus('overtime')}
          icon={<AlertTriangle size={16} />}
        />
        <StatusCard 
          title="待处理" 
          count={stats.pending} 
          color="orange" 
          active={filterStatus === 'pending'}
          onClick={() => setFilterStatus('pending')}
        />
        <StatusCard 
          title="处理中" 
          count={stats.processing} 
          color="amber" 
          active={filterStatus === 'processing'}
          onClick={() => setFilterStatus('processing')}
        />
        <StatusCard 
          title="已解决" 
          count={stats.resolved} 
          color="emerald" 
          active={filterStatus === 'resolved'}
          onClick={() => setFilterStatus('resolved')}
        />
        <StatusCard 
          title="已忽略" 
          count={stats.ignored} 
          color="gray" 
          active={filterStatus === 'ignored'}
          onClick={() => setFilterStatus('ignored')}
        />
        <StatusCard 
          title="全部异常" 
          count={stats.total} 
          color="cyan" 
          active={filterStatus === 'all'}
          onClick={() => setFilterStatus('all')}
        />
      </div>

      {/* 筛选工具栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索异常或酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">业务域：</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AnomalyType | 'all')}
            className="px-3 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部</option>
            {Object.entries(domainConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">酒店：</span>
          <select
            value={filterHotel}
            onChange={(e) => setFilterHotel(e.target.value)}
            className="px-3 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部</option>
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => {
            const DomainIcon = domainConfig[task.type].icon;
            const isSelected = selectedTask?.id === task.id;
            const notes = getNotes(task.id);
            
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#151B2B] rounded-xl border transition-all ${
                  isSelected ? 'border-neon-cyan' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* 任务头部 */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedTask(isSelected ? null : task)}
                >
                  <div className="flex items-start gap-4">
                    {/* 类型图标 */}
                    <div className={`p-2 rounded-lg ${domainConfig[task.type].bgColor}`}>
                      <DomainIcon size={18} className={domainConfig[task.type].color} />
                    </div>
                    
                    {/* 主要内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{task.title}</span>
                        {task.level === 'critical' && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-red-400/10 text-red-400">严重</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${statusConfig[task.status].bgColor} ${statusConfig[task.status].color}`}>
                          {statusConfig[task.status].label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{task.hotelName}</span>
                        <span>•</span>
                        <span>{domainConfig[task.type].label}</span>
                        <span>•</span>
                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        {/* 等待时间标签 */}
                        {(() => {
                          const waitingHours = getWaitingHours(task.createdAt);
                          const isOvertime = waitingHours >= OVERTIME_HOURS && task.status === 'pending';
                          return (
                            <>
                              <span>•</span>
                              <span className={`flex items-center gap-1 ${isOvertime ? 'text-red-400 font-medium' : ''}`}>
                                <Timer size={14} />
                                {isOvertime ? '已等待 ' : ''}
                                {formatWaitingTime(waitingHours)}
                              </span>
                            </>
                          );
                        })()}
                        {task.metrics && task.metrics.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-neon-cyan">{task.metrics[0].label}: {task.metrics[0].value}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      {task.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAnomalyStatus(task.id, 'processing');
                          }}
                          className="px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/20 transition-all"
                        >
                          处理
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(task.relatedPage);
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#1E2538] rounded-lg transition-all"
                        title="查看详情"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 展开详情 */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-800 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {/* 描述 */}
                        <p className="text-gray-300">{task.description}</p>
                        
                        {/* 指标 */}
                        {task.metrics && task.metrics.length > 0 && (
                          <div className="flex items-center gap-6 bg-[#0B0F19] rounded-lg p-3">
                            {task.metrics.map((m, i) => (
                              <div key={i} className="text-sm">
                                <span className="text-gray-500">{m.label}:</span>
                                <span className="ml-1 font-medium">{m.value}</span>
                                {m.threshold && (
                                  <span className="ml-1 text-gray-600">(目标: {m.threshold})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 建议 */}
                        <div className="flex items-start gap-2 text-sm bg-cyan-400/5 p-3 rounded-lg">
                          <span className="text-cyan-400 font-medium">建议:</span>
                          <span className="text-cyan-400">{task.suggestion}</span>
                        </div>
                        
                        {/* 备注历史 */}
                        {notes.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-400">跟进记录</h4>
                            {notes.map((note, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-gray-500">{note.author}:</span>
                                <span className="text-gray-300">{note.content}</span>
                                <span className="text-gray-600 text-xs">
                                  {new Date(note.time).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 添加备注 */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="添加跟进备注..."
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#0B0F19] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addNote(task.id, noteInput);
                              }
                            }}
                          />
                          <button
                            onClick={() => addNote(task.id, noteInput)}
                            className="p-2 bg-neon-cyan/10 text-neon-cyan rounded-lg hover:bg-neon-cyan/20 transition-all"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                        
                        {/* 状态操作 */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                          <div className="flex items-center gap-2">
                            {task.status !== 'resolved' && (
                              <button
                                onClick={() => updateAnomalyStatus(task.id, 'resolved')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-400/20 transition-all"
                              >
                                <CheckCircle size={14} />
                                标记已解决
                              </button>
                            )}
                            {task.status !== 'ignored' && task.status !== 'resolved' && (
                              <button
                                onClick={() => updateAnomalyStatus(task.id, 'ignored')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-300 rounded-lg text-sm transition-all"
                              >
                                <X size={14} />
                                忽略
                              </button>
                            )}
                            {task.status !== 'pending' && task.status !== 'processing' && (
                              <button
                                onClick={() => updateAnomalyStatus(task.id, 'pending')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-300 rounded-lg text-sm transition-all"
                              >
                                <Clock size={14} />
                                重新打开
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-[#151B2B] rounded-xl border border-gray-800">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <p className="text-lg font-medium text-emerald-400">没有符合条件的异常</p>
            <p className="text-sm text-gray-400 mt-1">当前筛选条件下暂无异常任务</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

interface StatusCardProps {
  title: string;
  count: number;
  color: 'red' | 'orange' | 'amber' | 'emerald' | 'gray' | 'cyan';
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function StatusCard({ title, count, color, active, onClick, icon }: StatusCardProps) {
  const colorMap = {
    red: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    gray: { text: 'text-gray-400', bg: 'bg-gray-700/50', border: 'border-gray-600' },
    cyan: { text: 'text-neon-cyan', bg: 'bg-neon-cyan/10', border: 'border-neon-cyan/30' },
  };
  
  const c = colorMap[color];
  
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        active ? `${c.bg} ${c.border}` : 'bg-[#151B2B] border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2">
        <p className={`text-2xl font-bold ${active ? c.text : 'text-white'}`}>{count}</p>
        {icon && <span className={active ? c.text : 'text-gray-400'}>{icon}</span>}
      </div>
      <p className={`text-sm mt-1 ${active ? c.text : 'text-gray-400'}`}>{title}</p>
    </button>
  );
}
