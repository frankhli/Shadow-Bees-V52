/**
 * SaaS运营后台 - 工单支持
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Tag,
  Calendar,
  Send,
  Building2,
  MessageSquare,
  User,
  Phone,
  Mail,
  Flame,
  Building,
  Hotel,
} from 'lucide-react';
import { useAdminStore, type Ticket, type TicketStatus, type TicketPriority } from '../../stores/adminStore';
import { getAdminTicketSync } from '@/services/ticketSync';
import { Button, useToast } from '../../components/ui';
import { CreateTicketModal } from './CreateTicketModal';

const statusLabels: Record<TicketStatus, { text: string; color: string }> = {
  open: { text: '待处理', color: 'text-neon-amber' },
  processing: { text: '处理中', color: 'text-neon-cyan' },
  resolved: { text: '已解决', color: 'text-neon-green' },
  closed: { text: '已关闭', color: 'text-gray-400' },
};

const priorityLabels: Record<TicketPriority, { text: string; color: string }> = {
  low: { text: '低', color: 'bg-gray-700 text-gray-300' },
  medium: { text: '中', color: 'bg-neon-cyan/20 text-neon-cyan' },
  high: { text: '高', color: 'bg-neon-orange/20 text-neon-orange' },
  urgent: { text: '紧急', color: 'bg-neon-red/20 text-neon-red' },
};

// 快捷回复预设
const quickReplies = [
  { label: '已收到', content: '您好，您的工单已收到，我们正在核实处理中，请耐心等待。' },
  { label: '需要更多信息', content: '您好，为了更好地帮助您解决问题，能否提供更多详细信息？例如：1.问题发生的具体时间 2.操作步骤 3.错误截图（如有）感谢您的配合！' },
  { label: '正在处理', content: '您好，我们正在紧急处理您的问题，预计将在2小时内给您答复。' },
  { label: '已修复', content: '您好，该问题已修复，请您刷新页面后重试。如仍有问题请随时反馈。' },
  { label: '电话联系', content: '您好，为了更好地解决您的问题，我们将安排专人与您电话联系，请保持电话畅通。' },
];

export default function SupportPage() {
  const { tickets, hotels, selectTicket, selectedTicket, systemUsers, adminUser } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all' | 'pending_rating' | 'rated' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'single' | 'group'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 模拟加载
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [statusFilter, priorityFilter, assigneeFilter, customerTypeFilter]);

  // 判断是否超时（超过24h未处理）
  const isOverdue = (ticket: Ticket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    const created = new Date(ticket.createdAt).getTime();
    const hoursElapsed = (Date.now() - created) / (1000 * 60 * 60);
    return hoursElapsed > 24;
  };

  // 计算响应时长（创建到现在的小时数）
  const getResponseDuration = (ticket: Ticket) => {
    const created = new Date(ticket.createdAt).getTime();
    const hours = (Date.now() - created) / (1000 * 60 * 60);
    if (hours < 1) return `${Math.floor(hours * 60)}分钟`;
    if (hours < 24) return `${Math.floor(hours)}小时`;
    return `${Math.floor(hours / 24)}天`;
  };

  // 过滤工单
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (hotels.find(h => h.id === ticket.hotelId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    // 负责人筛选
    const matchesAssignee = assigneeFilter === 'all' || 
      (assigneeFilter === 'me' ? ticket.assignedTo === adminUser?.id : ticket.assignedTo === assigneeFilter);
    
    // 状态筛选（支持待评价、已评价、超时）
    let matchesStatus = true;
    if (statusFilter === 'pending_rating') {
      matchesStatus = ticket.status === 'resolved' && !ticket.rating;
    } else if (statusFilter === 'rated') {
      matchesStatus = ticket.status === 'resolved' && !!ticket.rating;
    } else if (statusFilter === 'overdue') {
      matchesStatus = isOverdue(ticket);
    } else if (statusFilter !== 'all') {
      matchesStatus = ticket.status === statusFilter;
    }
    
    // 客户类型筛选（单体/集团）
    const matchesCustomerType = customerTypeFilter === 'all' || 
      (customerTypeFilter === 'group' ? (ticket.isGroupLevel || ticket.customerType === 'group') : 
       !(ticket.isGroupLevel || ticket.customerType === 'group'));
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesCustomerType;
  });

  // 统计
  const stats = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    processing: tickets.filter((t) => t.status === 'processing').length,
    pendingRating: tickets.filter((t) => t.status === 'resolved' && !t.rating).length,
    rated: tickets.filter((t) => t.status === 'resolved' && t.rating).length,
    singleHotel: tickets.filter((t) => !(t.isGroupLevel || t.customerType === 'group')).length,
    group: tickets.filter((t) => t.isGroupLevel || t.customerType === 'group').length,
    avgResponseTime: '12分钟',
  };

  const handleViewTicket = (ticket: Ticket) => {
    selectTicket(ticket);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工单支持</h1>
          <p className="text-gray-400 text-sm mt-1">
            客户问题跟踪 · 平均响应 {stats.avgResponseTime}
          </p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setShowCreate(true)}>
          新建工单
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div 
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-gray-600"
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">全部工单</span>
            <Filter size={18} className="text-gray-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.all}</p>
        </div>
        <div 
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-amber-500/50"
          onClick={() => setStatusFilter('open')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待处理</span>
            <AlertCircle size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-400">{stats.open}</p>
        </div>
        <div 
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-cyan-500/50"
          onClick={() => setStatusFilter('processing')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">处理中</span>
            <Clock size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2 text-cyan-400">{stats.processing}</p>
        </div>
        <div 
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-purple-500/50"
          onClick={() => setStatusFilter('pending_rating')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">待评价</span>
            <span className="text-purple-400 text-xs">未评</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-purple-400">{stats.pendingRating}</p>
        </div>
        <div 
          className="p-4 bg-[#151B2B] rounded-xl border border-gray-800 cursor-pointer hover:border-green-500/50"
          onClick={() => setStatusFilter('rated')}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">已评价</span>
            <CheckCircle size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{stats.rated}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索工单标题、酒店..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="pending_rating">待评价</option>
            <option value="rated">已评价</option>
            <option value="closed">已关闭</option>
            <option value="overdue">⚠️ 已超时</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部负责人</option>
            <option value="me">👤 我的工单</option>
            <option value="">未分配</option>
            {systemUsers
              .filter((u) => u.status === 'active')
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部优先级</option>
            <option value="urgent">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value as 'all' | 'single' | 'group')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部客户类型</option>
            <option value="single">🏨 单体酒店</option>
            <option value="group">🏢 集团客户</option>
          </select>
        </div>
      </div>

      {/* 工单列表 - 卡片式布局，更适合展示 */}
      <div className="space-y-3">
        {isLoading ? (
          // 加载状态
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-14 bg-gray-800 rounded animate-pulse" />
                    <div className="h-5 w-12 bg-gray-800 rounded animate-pulse" />
                  </div>
                  <div className="h-5 bg-gray-800 rounded w-2/3 animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="h-3 bg-gray-800 rounded w-20 animate-pulse" />
                    <div className="h-3 bg-gray-800 rounded w-24 animate-pulse" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-800 rounded w-16 mb-2 animate-pulse" />
                  <div className="h-8 bg-gray-800 rounded w-14 animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-[#151B2B] rounded-xl border border-gray-800">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无符合条件的工单</p>
          </div>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleViewTicket(ticket)}
              className={`p-4 bg-[#151B2B] rounded-xl border cursor-pointer transition-all hover:border-neon-cyan/50 ${
                isOverdue(ticket) ? 'border-red-500/50 bg-red-500/5' : 'border-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* 左侧：标题和标签 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusLabels[ticket.status].color.replace('text-', 'bg-').replace('400', '400/20')}`}>
                      {statusLabels[ticket.status].text}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${priorityLabels[ticket.priority].color}`}>
                      {priorityLabels[ticket.priority].text}
                    </span>
                    {/* 客户类型标识 */}
                    {ticket.isGroupLevel || ticket.customerType === 'group' ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                        <Building size={10} />
                        集团
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                        <Hotel size={10} />
                        单体
                      </span>
                    )}
                    {(ticket.urgentCount || 0) > 0 && (
                      <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
                        (ticket.urgentCount || 0) >= 3
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        <Flame size={10} />
                        催{ticket.urgentCount}
                      </span>
                    )}
                    {isOverdue(ticket) && (
                      <span className="text-xs text-red-400">⚠️ 超时</span>
                    )}
                  </div>
                  <h3 className="font-medium text-white mb-1 truncate">{ticket.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span className="font-mono">{ticket.id}</span>
                    <span>·</span>
                    <span className={ticket.isGroupLevel || ticket.customerType === 'group' ? 'text-purple-400' : 'text-blue-400'}>
                      {ticket.isGroupLevel || ticket.customerType === 'group' ? '🏢' : '🏨'}
                      {hotels.find(h => h.id === ticket.hotelId)?.name || ticket.hotelName || '未知酒店'}
                    </span>
                    <span>·</span>
                    <span className={isOverdue(ticket) ? 'text-red-400' : ''}>
                      已等{getResponseDuration(ticket)}
                    </span>
                  </div>
                </div>
                
                {/* 右侧：负责人和操作 */}
                <div className="text-right flex-shrink-0">
                  <div className="mb-2">
                    {ticket.assignedToName ? (
                      <span className="text-sm text-neon-cyan">{ticket.assignedToName}</span>
                    ) : (
                      <span className="text-sm text-amber-400">待分配</span>
                    )}
                  </div>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleViewTicket(ticket); }}>
                    处理
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 工单详情弹窗 */}
      {showDetail && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* 新建工单弹窗 */}
      {showCreate && (
        <CreateTicketModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// 工单详情弹窗
interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
}

function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const { hotels, updateTicket, systemUsers } = useAdminStore();
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 点击外部关闭分配下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
    };
    if (showAssignDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignDropdown]);

  const hotelName = hotels.find(h => h.id === ticket.hotelId)?.name || '未知酒店';

  // 发送已读回执
  useEffect(() => {
    const syncService = getAdminTicketSync();
    const now = new Date().toISOString();
    
    // 更新本地状态
    updateTicket(ticket.id, {
      readByAdminAt: ticket.readByAdminAt || now,
      lastReadAt: now,
    });
    
    // 广播给酒店端
    syncService.broadcast({
      type: 'TICKET_READ',
      ticketId: ticket.id,
      readAt: now,
      timestamp: Date.now(),
    });
  }, [ticket.id]);

  const handleSubmitReply = async () => {
    if (!reply.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 更新工单状态和添加回复
    updateTicket(ticket.id, {
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });

    toast.success('回复已发送', `已通知 ${hotelName}`);
    setLoading(false);
    setReply('');
  };

  const handleResolve = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    updateTicket(ticket.id, {
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    });

    toast.success('工单已解决', `${ticket.id} 已标记为已解决`);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{ticket.title}</h3>
              {/* 催促标记 - 详情头部 */}
              {(ticket.urgentCount || 0) > 0 && (
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    (ticket.urgentCount || 0) >= 3
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}
                >
                  <Flame size={12} />
                  被催促 {ticket.urgentCount} 次
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">{ticket.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <span className="text-gray-400 text-2xl">&times;</span>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 工单信息 */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-[#0B0F19] rounded-lg">
            <div>
              <p className="text-sm text-gray-300 mb-1">酒店</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 size={14} className="text-gray-400" />
                {hotelName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-1">优先级</p>
              <span className={`px-2 py-1 text-xs rounded ${priorityLabels[ticket.priority].color}`}>
                {priorityLabels[ticket.priority].text}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-300 mb-1">状态</p>
              <span className={`text-sm ${statusLabels[ticket.status].color}`}>
                {statusLabels[ticket.status].text}
              </span>
            </div>
          </div>

          {/* 负责人分配 */}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">负责人</p>
                  <p className="font-medium">
                    {ticket.assignedToName ? (
                      <span className="text-neon-cyan">{ticket.assignedToName}</span>
                    ) : (
                      <span className="text-gray-500">未分配</span>
                    )}
                  </p>
                </div>
                
                <div className="relative" ref={assignDropdownRef}>
                  {showAssignDropdown ? (
                    <div className="absolute right-0 top-0 z-10 w-48 bg-[#151B2B] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                      <div className="p-2 border-b border-gray-700">
                        <p className="text-xs text-gray-400">选择负责人</p>
                      </div>
                      {systemUsers
                        .filter((u) => u.status === 'active')
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              updateTicket(ticket.id, {
                                assignedTo: user.id,
                                assignedToName: user.name,
                                status: ticket.status === 'open' ? 'processing' : ticket.status,
                                updatedAt: new Date().toISOString(),
                              });
                              // 广播给酒店端
                              const syncService = getAdminTicketSync();
                              syncService.broadcast({
                                type: 'TICKET_ASSIGNED',
                                ticketId: ticket.id,
                                assignedTo: user.id,
                                assignedToName: user.name,
                                timestamp: Date.now(),
                              });
                              setShowAssignDropdown(false);
                              toast.success('已分配', `工单已分配给 ${user.name}`);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-xs text-neon-cyan">
                              {user.name.charAt(0)}
                            </div>
                            <span>{user.name}</span>
                            {user.id === ticket.assignedTo && (
                              <span className="ml-auto text-neon-cyan">✓</span>
                            )}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAssignDropdown(true)}
                      className="px-3 py-1.5 bg-neon-cyan/10 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/20 transition-all flex items-center gap-1"
                    >
                      <User size={14} />
                      {ticket.assignedTo ? '重新分配' : '分配负责人'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 联系人信息 */}
          {(ticket.contactName || ticket.contactPhone || ticket.contactEmail) && (
            <div className="p-4 bg-[#0B0F19] rounded-lg border border-neon-cyan/20">
              <p className="text-sm text-gray-300 mb-3 flex items-center gap-2">
                <User size={14} />
                联系人信息
                <span className="text-xs text-neon-cyan">（客户提交）</span>
              </p>
              <div className="grid grid-cols-3 gap-4">
                {ticket.contactName && (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-500" />
                    <span className="text-sm">{ticket.contactName}</span>
                  </div>
                )}
                {ticket.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <a 
                      href={`tel:${ticket.contactPhone}`} 
                      className="text-sm text-neon-cyan hover:underline font-medium"
                    >
                      {ticket.contactPhone}
                    </a>
                  </div>
                )}
                {ticket.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <a 
                      href={`mailto:${ticket.contactEmail}`} 
                      className="text-sm text-neon-cyan hover:underline font-medium"
                    >
                      {ticket.contactEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 问题描述 */}
          <div className="p-4 bg-[#0B0F19] rounded-lg">
            <p className="text-sm text-gray-300 mb-2">问题描述</p>
            <p className="text-sm text-gray-200">{ticket.description}</p>
          </div>

          {/* 标签 */}
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gray-300" />
            {ticket.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>

          {/* 客户评价 */}
          {ticket.rating && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <CheckCircle size={16} />
                  客户评价
                </p>
                <span className="text-xs text-gray-500">
                  评价时间：{ticket.resolvedAt && new Date(ticket.resolvedAt).toLocaleString('zh-CN')}
                </span>
              </div>
              
              {/* 整体满意度 */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">整体满意度</span>
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
                <span className="text-sm font-bold text-yellow-400">{ticket.rating}分</span>
              </div>
              
              {/* 响应速度和解决效果 */}
              <div className="grid grid-cols-2 gap-4">
                {ticket.responseSpeed && (
                  <div className="p-3 bg-[#0B0F19] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">响应速度</p>
                    <p className={`text-sm font-medium ${
                      ticket.responseSpeed === 'fast' ? 'text-green-400' : 
                      ticket.responseSpeed === 'slow' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {ticket.responseSpeed === 'fast' ? '⭐ 很快' : 
                       ticket.responseSpeed === 'slow' ? '🐢 较慢' : '⏱️ 一般'}
                    </p>
                  </div>
                )}
                {ticket.resolutionEffect && (
                  <div className="p-3 bg-[#0B0F19] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">解决效果</p>
                    <p className={`text-sm font-medium ${
                      ticket.resolutionEffect === 'full' ? 'text-green-400' : 
                      ticket.resolutionEffect === 'none' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {ticket.resolutionEffect === 'full' ? '✅ 完全解决' : 
                       ticket.resolutionEffect === 'none' ? '❌ 未解决' : '⚠️ 基本解决'}
                    </p>
                  </div>
                )}
              </div>
              
              {/* 评价标签 */}
              {ticket.ratingTags && ticket.ratingTags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">评价标签</p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.ratingTags.map((tag) => (
                      <span 
                        key={tag} 
                        className={`px-2 py-1 text-xs rounded ${
                          ['值得改进', '回复较慢', '沟通不畅'].includes(tag)
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-green-500/10 text-green-400'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 文字反馈 */}
              {ticket.feedback && (
                <div className="p-3 bg-[#0B0F19] rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">其他建议</p>
                  <p className="text-sm text-gray-200 italic">"{ticket.feedback}"</p>
                </div>
              )}
            </div>
          )}

          {/* 快捷回复 */}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">快捷回复</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setReply(item.content)}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 回复区域 */}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2 text-white">
                <MessageSquare size={16} />
                回复客户
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="输入回复内容..."
                rows={4}
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar size={16} />
            创建于 {new Date(ticket.createdAt).toLocaleString('zh-CN')}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSubmitReply}
                  loading={loading}
                  disabled={!reply.trim()}
                  icon={<Send size={16} />}
                >
                  发送回复
                </Button>
                <Button
                  onClick={handleResolve}
                  loading={loading}
                  icon={<CheckCircle size={16} />}
                >
                  标记已解决
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
