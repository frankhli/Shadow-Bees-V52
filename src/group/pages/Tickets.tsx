/**
 * Shadow-Bees V52 - 集团工单
 * 提交工单给管理端、查看处理进度、评价
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Plus,
  Clock,
  CheckCircle,
  MessageSquare,
  Building2,
  Send,
  X,
  Filter,
  User,
  Phone,
  Mail,
  ChevronLeft,
  Bell,
  Flame,
  AlertCircle,
  Headphones,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';
import { getGroupTicketSync } from '@/services/ticketSync';
import type { Ticket as TicketType } from '@/admin/stores/adminStore';

const ticketTypeLabels: Record<string, string> = {
  tech: '技术问题',
  business: '业务申请',
  consult: '使用咨询',
};

const priorityLabels: Record<string, { text: string; color: string; bg: string }> = {
  low: { text: '低', color: 'text-neon-green', bg: 'bg-neon-green/10' },
  medium: { text: '中', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  high: { text: '高', color: 'text-neon-orange', bg: 'bg-neon-orange/10' },
  urgent: { text: '紧急', color: 'text-neon-red', bg: 'bg-neon-red/10' },
};

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  open: { text: '待处理', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  processing: { text: '处理中', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  resolved: { text: '已解决', color: 'text-neon-green', bg: 'bg-neon-green/10' },
  closed: { text: '已关闭', color: 'text-text-muted', bg: 'bg-surface-hover' },
};

// 快捷回复预设
const quickReplies = [
  { label: '确认收到', content: '已收到，请尽快处理。' },
  { label: '催促处理', content: '请问处理进度如何？比较紧急，感谢！' },
  { label: '问题已解决', content: '问题已解决，感谢支持！' },
  { label: '需要更多帮助', content: '还有其他相关问题需要协助，请帮忙一起看看。' },
];

// 评价标签预设
const ratingTagOptions = [
  '响应及时',
  '专业高效',
  '态度友好',
  '耐心细致',
  '解决问题',
  '值得改进',
  '回复较慢',
  '沟通不畅',
];

export function Tickets() {
  const { hotels, groupTickets, submitTicket, receiveTicketUpdate, addTicketMessage, resolveTicket, urgeTicket } = useGroupStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [filter, setFilter] = useState<'all' | TicketType['status'] | 'pending_rating' | 'rated'>('all');
  const [urgentFeedback, setUrgentFeedback] = useState<{ ticketId: string; message: string; type: 'success' | 'error' } | null>(null);
  
  // 监听管理端的工单更新
  useEffect(() => {
    const sync = getGroupTicketSync();
    
    const unsubscribe = sync.subscribe((message) => {
      if (message.type === 'TICKET_UPDATED') {
        // 更新集团端工单状态
        receiveTicketUpdate(message.ticketId, message.updates);
      }
      if (message.type === 'TICKET_MESSAGE') {
        // 添加管理端发来的消息
        if (message.message) {
          addTicketMessage(message.ticketId, message.message);
        }
      }
    });
    
    return () => unsubscribe();
  }, [receiveTicketUpdate, addTicketMessage]);
  
  // 筛选工单
  const filteredTickets = (() => {
    if (filter === 'all') return groupTickets;
    if (filter === 'pending_rating') {
      return groupTickets.filter((t) => t.status === 'resolved' && !t.rating);
    }
    if (filter === 'rated') {
      return groupTickets.filter((t) => t.status === 'resolved' && t.rating);
    }
    return groupTickets.filter(t => t.status === filter);
  })();
  
  // 统计
  const stats = {
    total: groupTickets.length,
    open: groupTickets.filter(t => t.status === 'open').length,
    processing: groupTickets.filter(t => t.status === 'processing').length,
    pendingRating: groupTickets.filter((t) => t.status === 'resolved' && !t.rating).length,
    rated: groupTickets.filter((t) => t.status === 'resolved' && t.rating).length,
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="text-neon-purple" size={24} />
            集团工单
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            提交工单给平台运营团队 · 查看处理进度
          </p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建工单
        </button>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-4"
      >
        {[
          { label: '全部工单', value: stats.total, icon: Ticket, color: 'text-neon-purple', filter: 'all' as const },
          { label: '待处理', value: stats.open, icon: Clock, color: 'text-neon-amber', filter: 'open' as const },
          { label: '处理中', value: stats.processing, icon: MessageSquare, color: 'text-neon-cyan', filter: 'processing' as const },
          { label: '待评价', value: stats.pendingRating, icon: Bell, color: 'text-purple-400', filter: 'pending_rating' as const },
          { label: '已评价', value: stats.rated, icon: CheckCircle, color: 'text-neon-green', filter: 'rated' as const },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface rounded-xl border border-border-color p-4 cursor-pointer hover:border-neon-purple/50 transition-all"
            onClick={() => setFilter(stat.filter)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 筛选 */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-text-secondary" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-1.5 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="open">待处理</option>
          <option value="processing">处理中</option>
          <option value="resolved">已解决</option>
          <option value="pending_rating">待评价</option>
          <option value="rated">已评价</option>
          <option value="closed">已关闭</option>
        </select>
      </div>

      {/* 工单列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-surface rounded-xl border border-border-color overflow-hidden"
      >
        <div className="divide-y divide-border-color">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无工单</p>
              <p className="text-sm mt-1">点击右上角新建工单</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const statusConfig = statusLabels[ticket.status];
              const priorityConfig = priorityLabels[ticket.priority];
              
              return (
                <div 
                  key={ticket.id} 
                  className="p-4 hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-text-muted">{ticket.id}</span>
                        <h4 className="font-medium">{ticket.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig.bg} ${priorityConfig.color}`}>
                          {priorityConfig.text}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.text}
                        </span>
                        {ticket.messages.length > 1 && (
                          <span className="text-xs text-neon-cyan flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.messages.length}条对话
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {ticket.hotelName}
                        </span>
                        <span>类型: {ticketTypeLabels[ticket.type]}</span>
                        <span>创建于 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.assignedToName && (
                          <span className="text-neon-cyan">处理人: {ticket.assignedToName}</span>
                        )}
                      </div>
                      
                      {/* 催促反馈提示 */}
                      {urgentFeedback?.ticketId === ticket.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-2 text-xs ${urgentFeedback.type === 'success' ? 'text-green-400' : 'text-amber-400'}`}
                        >
                          {urgentFeedback.message}
                        </motion.div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <ChevronLeft className="w-5 h-5 text-text-muted rotate-180" />
                      
                      {/* 催单按钮 - 仅待处理/处理中显示 */}
                      {(ticket.status === 'open' || ticket.status === 'processing') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const result = urgeTicket(ticket.id);
                            setUrgentFeedback({ ticketId: ticket.id, message: result.message, type: result.success ? 'success' : 'error' });
                            setTimeout(() => setUrgentFeedback((prev) => (prev?.ticketId === ticket.id ? null : prev)), 3000);
                          }}
                          disabled={(ticket.urgentCount || 0) >= 3}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                            (ticket.urgentCount || 0) >= 3
                              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                              : (ticket.urgentCount || 0) > 0
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          }`}
                        >
                          {(ticket.urgentCount || 0) > 0 ? (
                            <>
                              <Flame className="w-3 h-3" />
                              <span>已催{ticket.urgentCount}次</span>
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3" />
                              <span>催单</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* 新建工单弹窗 */}
      <AnimatePresence>
        {showCreate && (
          <CreateTicketModal
            hotels={hotels}
            onSubmit={(data) => {
              submitTicket(data);
              setShowCreate(false);
            }}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      {/* 工单详情弹窗 */}
      <AnimatePresence>
        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onSendMessage={(content) => {
              addTicketMessage(selectedTicket.id, {
                id: `msg-${Date.now()}`,
                sender: 'hotel',
                senderName: '集团管理员',
                content,
                timestamp: new Date().toISOString(),
              });
              
              // 广播给管理端
              const sync = getGroupTicketSync();
              sync.broadcast({
                type: 'TICKET_MESSAGE',
                ticketId: selectedTicket.id,
                message: {
                  id: `msg-${Date.now()}`,
                  sender: 'hotel',
                  senderName: '集团管理员',
                  content,
                  timestamp: new Date().toISOString(),
                },
                timestamp: Date.now(),
              });
            }}
            onResolve={(data) => {
              resolveTicket(selectedTicket.id, data);
              
              // 广播给管理端
              const sync = getGroupTicketSync();
              sync.broadcast({
                type: 'TICKET_RESOLVED',
                ticketId: selectedTicket.id,
                data,
                timestamp: Date.now(),
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 工单详情弹窗
interface TicketDetailModalProps {
  ticket: TicketType;
  onClose: () => void;
  onSendMessage: (content: string) => void;
  onResolve: (data: {
    rating: number;
    responseSpeed: 'fast' | 'normal' | 'slow';
    resolutionEffect: 'full' | 'partial' | 'none';
    ratingTags: string[];
    feedback: string;
  }) => void;
}

function TicketDetailModal({ ticket, onClose, onSendMessage, onResolve }: TicketDetailModalProps) {
  const [reply, setReply] = useState('');
  const [showRating, setShowRating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 评价表单状态
  const [rating, setRating] = useState(5);
  const [responseSpeed, setResponseSpeed] = useState<'fast' | 'normal' | 'slow'>('fast');
  const [resolutionEffect, setResolutionEffect] = useState<'full' | 'partial' | 'none'>('full');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages]);

  const handleSendMessage = () => {
    if (!reply.trim()) return;
    onSendMessage(reply);
    setReply('');
  };

  const handleResolve = () => {
    onResolve({
      rating,
      responseSpeed,
      resolutionEffect,
      ratingTags: selectedTags,
      feedback,
    });
    setShowRating(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const statusConfig = statusLabels[ticket.status];
  const priorityConfig = priorityLabels[ticket.priority];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-xl border border-border-color w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-semibold">{ticket.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-text-muted">{ticket.id}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig.bg} ${priorityConfig.color}`}>
                  {priorityConfig.text}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.text}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 工单信息 */}
          <div className="p-4 border-b border-border-color bg-surface-hover/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">关联门店:</span>
                <span>{ticket.hotelName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">工单类型:</span>
                <span>{ticketTypeLabels[ticket.type]}</span>
              </div>
              {ticket.assignedToName && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-text-muted" />
                  <span className="text-text-secondary">处理人:</span>
                  <span className="text-neon-cyan">{ticket.assignedToName}</span>
                </div>
              )}
              {(ticket.contactPhone || ticket.contactEmail) && (
                <div className="flex items-center gap-2">
                  {ticket.contactPhone && <Phone className="w-4 h-4 text-text-muted" />}
                  {ticket.contactEmail && <Mail className="w-4 h-4 text-text-muted" />}
                  <span className="text-text-secondary">联系方式:</span>
                  <span>{ticket.contactPhone || ticket.contactEmail}</span>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-text-secondary">{ticket.description}</p>
            
            {/* 已读状态 */}
            {ticket.readByAdminAt && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />
                运营已读 {new Date(ticket.readByAdminAt).toLocaleString('zh-CN')}
              </div>
            )}
          </div>

          {/* 处理进度 */}
          {ticket.status !== 'resolved' && (
            <div className="p-4 bg-surface-hover/50 rounded-lg border border-border-color">
              {/* 负责人 */}
              {ticket.assignedToName && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-xs text-neon-cyan">
                    {ticket.assignedToName.charAt(0)}
                  </div>
                  <span className="text-sm">处理人：{ticket.assignedToName}</span>
                  <span className="text-xs text-green-400 ml-auto flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    在线处理中
                  </span>
                </div>
              )}
              
              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">处理进度</span>
                  <span className={ticket.assignedTo ? 'text-neon-cyan' : 'text-text-muted'}>
                    {ticket.assignedTo ? '已分配处理人' : '等待分配'}
                  </span>
                </div>
                <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-500"
                    style={{ width: ticket.assignedTo ? (ticket.status === 'processing' ? '60%' : '30%') : '15%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>提交</span>
                  <span>分配</span>
                  <span>处理中</span>
                  <span>完成</span>
                </div>
              </div>
              
              {/* 预计响应时间 */}
              <div className="mt-3 pt-3 border-t border-border-color">
                {(() => {
                  const created = new Date(ticket.createdAt).getTime();
                  const elapsed = (Date.now() - created) / (1000 * 60 * 60);
                  const isOverdue = elapsed > 24;
                  const hoursLeft = Math.max(0, 24 - elapsed);
                  
                  if (isOverdue) {
                    return (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        已超时 {Math.floor(elapsed - 24)} 小时，平台将优先处理
                      </span>
                    );
                  }
                  
                  if (hoursLeft < 12) {
                    return (
                      <span className="text-xs text-amber-400">
                        ⏰ 剩余 {Math.floor(hoursLeft)} 小时内回复（超时将升级）
                      </span>
                    );
                  }
                  
                  return (
                    <span className="text-xs text-text-muted">
                      预计 {Math.floor(hoursLeft)} 小时内回复
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 对话记录 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[300px]">
            {ticket.messages.length === 0 ? (
              <div className="text-center text-text-muted py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无对话记录</p>
              </div>
            ) : (
              ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'hotel' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl p-3 ${
                      msg.sender === 'hotel'
                        ? 'bg-neon-purple text-white rounded-br-sm'
                        : 'bg-surface-hover border border-border-color rounded-bl-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-80">{msg.senderName}</span>
                      <span className="text-xs opacity-60">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 已评价展示 */}
          {ticket.status === 'resolved' && ticket.rating && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-400">我的评价</p>
                <span className="text-xs text-text-muted">
                  {ticket.resolvedAt && new Date(ticket.resolvedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              
              {/* 星级 */}
              <div className="flex items-center gap-2">
                <span className="text-sm">整体满意度</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= (ticket.rating || 0) ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-yellow-400 ml-1">{ticket.rating}分</span>
              </div>
              
              {/* 响应速度和解决效果 */}
              <div className="flex flex-wrap gap-4 text-sm">
                {ticket.responseSpeed && (
                  <span>
                    响应速度：
                    <span className={ticket.responseSpeed === 'fast' ? 'text-green-400' : ticket.responseSpeed === 'slow' ? 'text-red-400' : 'text-yellow-400'}>
                      {ticket.responseSpeed === 'fast' ? '很快' : ticket.responseSpeed === 'slow' ? '较慢' : '一般'}
                    </span>
                  </span>
                )}
                {ticket.resolutionEffect && (
                  <span>
                    解决效果：
                    <span className={ticket.resolutionEffect === 'full' ? 'text-green-400' : ticket.resolutionEffect === 'none' ? 'text-red-400' : 'text-yellow-400'}>
                      {ticket.resolutionEffect === 'full' ? '完全解决' : ticket.resolutionEffect === 'none' ? '未解决' : '基本解决'}
                    </span>
                  </span>
                )}
              </div>
              
              {/* 评价标签 */}
              {ticket.ratingTags && ticket.ratingTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ticket.ratingTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 文字反馈 */}
              {ticket.feedback && (
                <p className="text-sm text-text-secondary italic">"{ticket.feedback}"</p>
              )}
            </div>
          )}

          {/* 评价表单 */}
          {(showRating || (ticket.status === 'resolved' && !ticket.rating)) && (
            <div className="p-4 bg-surface-hover rounded-lg space-y-4">
              <p className="text-sm font-medium">请对本次服务进行评价</p>
              
              {/* 整体满意度 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">整体满意度</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm text-yellow-400 ml-2">{rating}分</span>
                </div>
              </div>
              
              {/* 响应速度 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">响应速度</label>
                <div className="flex gap-2">
                  {[
                    { value: 'fast', label: '很快', color: 'green' },
                    { value: 'normal', label: '一般', color: 'yellow' },
                    { value: 'slow', label: '较慢', color: 'red' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setResponseSpeed(opt.value as 'fast' | 'normal' | 'slow')}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        responseSpeed === opt.value
                          ? `border-${opt.color}-400 bg-${opt.color}-400/10 text-${opt.color}-400`
                          : 'border-border-color text-text-secondary hover:border-text-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 解决效果 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">解决效果</label>
                <div className="flex gap-2">
                  {[
                    { value: 'full', label: '完全解决', color: 'green' },
                    { value: 'partial', label: '基本解决', color: 'yellow' },
                    { value: 'none', label: '未解决', color: 'red' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setResolutionEffect(opt.value as 'full' | 'partial' | 'none')}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        resolutionEffect === opt.value
                          ? `border-${opt.color}-400 bg-${opt.color}-400/10 text-${opt.color}-400`
                          : 'border-border-color text-text-secondary hover:border-text-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 评价标签 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">评价标签（可多选）</label>
                <div className="flex flex-wrap gap-2">
                  {ratingTagOptions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedTags.includes(tag)
                          ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                          : 'border-border-color text-text-secondary hover:border-text-muted'
                      }`}
                    >
                      {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 文字反馈 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">其他建议（选填）</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="您的建议对我们很重要..."
                  rows={3}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm text-text-primary placeholder-text-muted resize-none focus:border-neon-purple focus:outline-none"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowRating(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleResolve}
                  disabled={selectedTags.length === 0}
                  className="px-4 py-2 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交评价
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        {ticket.status !== 'closed' && !(ticket.status === 'resolved' && ticket.rating) && (
          <div className="p-4 border-t border-border-color space-y-3">
            {/* 快捷回复 */}
            {ticket.status !== 'resolved' && (
              <div className="px-4 py-2">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.label}
                      onClick={() => setReply(qr.content)}
                      className="px-3 py-1 text-xs bg-surface-hover hover:bg-neon-purple/20 hover:text-neon-purple rounded-full border border-border-color transition-colors whitespace-nowrap"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 回复输入框 - 仅在未解决时显示 */}
            {ticket.status !== 'resolved' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入回复内容..."
                  className="flex-1 px-4 py-2 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!reply.trim()}
                  className="px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  发送
                </button>
              </div>
            )}
            
            {/* 去评价按钮 */}
            {(ticket.status === 'processing' || (ticket.status === 'resolved' && !ticket.rating)) && !showRating && (
              <button
                onClick={() => setShowRating(true)}
                className="w-full py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-all"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                {ticket.status === 'resolved' ? '工单已解决，去评价' : '问题已解决，去评价'}
              </button>
            )}
          </div>
        )}

        {/* 已关闭提示 */}
        {(ticket.status === 'closed' || (ticket.status === 'resolved' && ticket.rating)) && (
          <div className="p-4 border-t border-border-color text-center text-text-muted text-sm">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            该工单已{ticket.status === 'resolved' ? '解决' : '关闭'}
            {ticket.rating && '，感谢您的评价'}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// 新建工单弹窗
function CreateTicketModal({
  hotels,
  onSubmit,
  onClose,
}: {
  hotels: { id: string; name: string }[];
  onSubmit: (data: {
    title: string;
    description: string;
    type: TicketType['type'];
    priority: TicketType['priority'];
    hotelId?: string;
  }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType['type']>('consult');
  const [priority, setPriority] = useState<TicketType['priority']>('medium');
  const [hotelId, setHotelId] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-xl border border-border-color w-full max-w-lg m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-color flex items-center justify-between">
          <h3 className="font-semibold">新建工单</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* 关联门店 */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">关联门店</label>
            <select
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
            >
              <option value="">集团总部</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          
          {/* 工单类型 */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">工单类型</label>
            <div className="flex gap-2">
              {(['tech', 'business', 'consult'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    type === t
                      ? 'bg-neon-purple text-white'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {ticketTypeLabels[t]}
                </button>
              ))}
            </div>
          </div>
          
          {/* 优先级 */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">优先级</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    priority === p
                      ? 'bg-neon-purple text-white'
                      : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {priorityLabels[p].text}
                </button>
              ))}
            </div>
          </div>
          
          {/* 标题 */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简要描述问题"
              className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none"
            />
          </div>
          
          {/* 详细描述 */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">详细描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您遇到的问题或需求..."
              rows={4}
              className="w-full px-3 py-2 bg-bg-primary border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none resize-none"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-border-color flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (title.trim() && description.trim()) {
                onSubmit({ title, description, type, priority, hotelId: hotelId || undefined });
              }
            }}
            disabled={!title.trim() || !description.trim()}
            className="px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            提交工单
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Tickets;
