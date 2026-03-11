/**
 * 酒店端 - 工单中心
 * 提交工单、查看列表、回复
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  CheckCircle,
  X,
  Send,
  AlertCircle,
  Headphones,
  Filter,
  Phone,
  Mail,
  User,
  ChevronRight,
  Bell,
  Flame,
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import type { Ticket, TicketType, TicketStatus } from '@/types';

const ticketTypeLabels: Record<TicketType, string> = {
  tech: '技术问题',
  business: '业务申请',
  consult: '使用咨询',
};

const statusLabels: Record<TicketStatus, { text: string; color: string }> = {
  open: { text: '待处理', color: 'text-amber-400' },
  processing: { text: '处理中', color: 'text-cyan-400' },
  resolved: { text: '已解决', color: 'text-green-400' },
  closed: { text: '已关闭', color: 'text-text-secondary' },
};

// 常用问题描述模板
const commonIssues: Record<TicketType, Array<{ label: string; value: string }>> = {
  tech: [
    { label: '系统无法登录/登录异常', value: '无法登录系统，提示账号密码错误或页面无响应，请协助排查。' },
    { label: '价格同步失败', value: '修改房价后，OTA平台价格未同步更新，请检查并手动推送。' },
    { label: '房态显示不正确', value: '系统中的房态与实际不符，已售/可售状态显示错误。' },
    { label: '订单无法确认', value: '收到新订单后点击确认无反应，订单状态卡在待确认。' },
    { label: '数据报表加载慢/出错', value: '打开数据报表页面加载缓慢，或提示查询失败。' },
    { label: '消息通知收不到', value: '新订单、预警等消息没有收到推送通知。' },
  ],
  business: [
    { label: '申请开通新OTA渠道', value: '希望开通新的OTA平台连接，请协助对接。' },
    { label: '申请账期调整', value: '因经营需要，申请调整结算账期，请审核。' },
    { label: '申请发票开具', value: '需要开具服务费发票，金额及抬头信息请查看附件。' },
    { label: '申请合同续签', value: '当前服务合同即将到期，申请续签事宜。' },
    { label: '申请培训支持', value: '新入职员工需要系统操作培训，请安排。' },
    { label: '申请功能定制', value: '希望增加特定功能模块，需求细节可电话沟通。' },
  ],
  consult: [
    { label: '如何设置促销活动', value: '想了解如何在系统中设置限时促销活动，请指导操作步骤。' },
    { label: '竞争对手价格分析', value: '竞争对手分析功能如何使用，数据更新频率是多少？' },
    { label: '收益管理策略建议', value: '近期入住率波动较大，希望获得收益管理方面的专业建议。' },
    { label: '动态调价规则说明', value: '系统的自动调价逻辑是什么，如何设置更合理？' },
    { label: '数据报表解读', value: '部分报表指标含义不太清楚，需要详细说明。' },
    { label: '系统功能使用指导', value: '某些功能模块不太会使用，需要操作指导。' },
  ],
};

export function TicketCenter() {
  const { tickets, currentHotel, user, addTicket, addTicketMessage, resolveTicket, urgeTicket } = useUnifiedStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<TicketStatus | 'all' | 'pending_rating' | 'rated'>('all');
  const [urgentFeedback, setUrgentFeedback] = useState<{ ticketId: string; message: string; type: 'success' | 'error' } | null>(null);

  // 过滤当前酒店的工单
  const hotelTickets = tickets.filter((t) => t.hotelId === currentHotel.id);
  
  // 筛选逻辑
  const filteredTickets = (() => {
    if (filter === 'all') return hotelTickets;
    if (filter === 'pending_rating') {
      // 已解决但未评价
      return hotelTickets.filter((t) => t.status === 'resolved' && !t.rating);
    }
    if (filter === 'rated') {
      // 已评价
      return hotelTickets.filter((t) => t.status === 'resolved' && t.rating);
    }
    return hotelTickets.filter((t) => t.status === filter);
  })();
  
  // 统计
  const stats = {
    all: hotelTickets.length,
    open: hotelTickets.filter((t) => t.status === 'open').length,
    processing: hotelTickets.filter((t) => t.status === 'processing').length,
    pendingRating: hotelTickets.filter((t) => t.status === 'resolved' && !t.rating).length,
    rated: hotelTickets.filter((t) => t.status === 'resolved' && t.rating).length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Headphones className="text-neon-cyan" size={24} />
            工单支持
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            遇到问题？提交工单，我们将尽快回复
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all"
        >
          <Plus size={18} />
          提交工单
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-gray-600" onClick={() => setFilter('all')}>
          <p className="text-2xl font-bold">{stats.all}</p>
          <p className="text-xs text-text-secondary">全部工单</p>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-amber-500/50" onClick={() => setFilter('open')}>
          <p className="text-2xl font-bold text-amber-400">{stats.open}</p>
          <p className="text-xs text-text-secondary">待处理</p>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-cyan-500/50" onClick={() => setFilter('processing')}>
          <p className="text-2xl font-bold text-cyan-400">{stats.processing}</p>
          <p className="text-xs text-text-secondary">处理中</p>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-purple-500/50" onClick={() => setFilter('pending_rating')}>
          <p className="text-2xl font-bold text-purple-400">{stats.pendingRating}</p>
          <p className="text-xs text-text-secondary">待评价</p>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-green-500/50" onClick={() => setFilter('rated')}>
          <p className="text-2xl font-bold text-green-400">{stats.rated}</p>
          <p className="text-xs text-text-secondary">已评价</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={16} className="text-text-secondary" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-1.5 bg-bg-secondary border border-border-color rounded-lg text-sm"
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
      <div className="flex-1 overflow-auto space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无工单</p>
            <p className="text-sm mt-1">点击右上角提交新工单</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-bg-secondary rounded-xl border border-border-color cursor-pointer hover:border-neon-cyan/50 transition-all"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded bg-gray-800 ${statusLabels[ticket.status].color}`}>
                      {statusLabels[ticket.status].text}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {ticketTypeLabels[ticket.type]}
                    </span>
                    <span className="text-xs text-text-muted">{ticket.id}</span>
                  </div>
                  <h3 className="font-medium mb-1">{ticket.title}</h3>
                  <p className="text-sm text-text-secondary line-clamp-2">{ticket.description}</p>
                  
                  {/* 联系人信息 */}
                  {(ticket.contactName || ticket.contactPhone) && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                      {ticket.contactName && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {ticket.contactName}
                        </span>
                      )}
                      {ticket.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          {ticket.contactPhone}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {ticket.messages.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-neon-cyan">
                      <MessageSquare size={12} />
                      {ticket.messages.length} 条回复
                    </div>
                  )}
                  
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
                  <span className="text-xs text-text-muted">
                    {new Date(ticket.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  
                  {/* 催单按钮 - 仅待处理/处理中显示 */}
                  {(ticket.status === 'open' || ticket.status === 'processing') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const result = urgeTicket(ticket.id);
                        setUrgentFeedback({ ticketId: ticket.id, message: result.message, type: result.success ? 'success' : 'error' });
                        // 3秒后清除反馈
                        setTimeout(() => setUrgentFeedback((prev) => (prev?.ticketId === ticket.id ? null : prev)), 3000);
                      }}
                      disabled={(ticket.urgentCount || 0) >= 3}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                        (ticket.urgentCount || 0) >= 3
                          ? 'bg-gray-800 text-text-muted cursor-not-allowed'
                          : (ticket.urgentCount || 0) > 0
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      }`}
                      title={(ticket.urgentCount || 0) >= 3 ? '已多次催促' : '点击催促平台尽快处理'}
                    >
                      {(ticket.urgentCount || 0) > 0 ? (
                        <>
                          <Flame size={12} />
                          <span>已催{ticket.urgentCount}次</span>
                        </>
                      ) : (
                        <>
                          <Bell size={12} />
                          <span>催单</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 创建工单弹窗 */}
      <CreateTicketModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => {
          addTicket({
            ...data,
            hotelId: currentHotel.id,
            hotelName: currentHotel.name,
            status: 'open',
            priority: 'medium',
            source: 'hotel',
            tags: [],
            messages: [],
          });
          setShowCreate(false);
        }}
        defaultContactName={user.name}
      />

      {/* 工单详情弹窗 */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSendMessage={(content) => {
            addTicketMessage(selectedTicket.id, {
              sender: 'hotel',
              senderName: user.name,
              content,
            });
          }}
          onResolve={(data) => {
            resolveTicket(selectedTicket.id, data);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}

// 创建工单弹窗
interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    title: string; 
    description: string; 
    type: TicketType;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  }) => void;
  defaultContactName: string;
}

function CreateTicketModal({ isOpen, onClose, onSubmit, defaultContactName }: CreateTicketModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<TicketType>('tech');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [customDescription, setCustomDescription] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  
  // 联系方式
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // 根据选择的问题生成标题和描述
  const title = useMemo(() => {
    if (isCustom) return customDescription.slice(0, 30) || '其他问题';
    const issue = commonIssues[type].find(i => i.value === selectedIssue);
    return issue?.label || '';
  }, [type, selectedIssue, isCustom, customDescription]);

  const description = useMemo(() => {
    if (isCustom) return customDescription;
    const issue = commonIssues[type].find(i => i.value === selectedIssue);
    return issue?.value || '';
  }, [type, selectedIssue, isCustom, customDescription]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    if (!contactPhone.trim() && !contactEmail.trim()) return;
    
    onSubmit({ 
      title, 
      description, 
      type,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
    });
    
    // 重置表单
    setStep(1);
    setType('tech');
    setSelectedIssue('');
    setCustomDescription('');
    setIsCustom(false);
    setContactName(defaultContactName);
    setContactPhone('');
    setContactEmail('');
  };

  const canSubmit = title.trim() && description.trim() && (contactPhone.trim() || contactEmail.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl bg-bg-secondary rounded-xl border border-border-color overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              step === 1 ? 'bg-neon-cyan text-black' : 'bg-gray-800 text-text-secondary'
            }`}>
              1
            </div>
            <ChevronRight size={16} className="text-text-muted" />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              step === 2 ? 'bg-neon-cyan text-black' : 'bg-gray-800 text-text-secondary'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm text-text-secondary">
              {step === 1 ? '选择问题类型' : '填写联系方式'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-4">
          {step === 1 ? (
            <div className="space-y-4">
              {/* 工单类型选择 */}
              <div>
                <label className="block text-sm text-text-secondary mb-3">工单类型</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['tech', 'business', 'consult'] as TicketType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setType(t);
                        setSelectedIssue('');
                        setIsCustom(false);
                      }}
                      className={`px-4 py-3 rounded-xl text-sm border transition-all ${
                        type === t
                          ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                          : 'border-border-color text-text-secondary hover:border-gray-600'
                      }`}
                    >
                      {ticketTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 常用问题选择 */}
              <div>
                <label className="block text-sm text-text-secondary mb-3">
                  请选择具体问题
                  <span className="text-xs text-text-muted ml-2">（选择最符合的一项）</span>
                </label>
                <div className="space-y-2">
                  {commonIssues[type].map((issue, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedIssue(issue.value);
                        setIsCustom(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        selectedIssue === issue.value && !isCustom
                          ? 'border-neon-cyan bg-neon-cyan/10 text-text-primary'
                          : 'border-border-color text-text-secondary hover:border-gray-600 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{issue.label}</span>
                        {selectedIssue === issue.value && !isCustom && (
                          <CheckCircle size={16} className="text-neon-cyan" />
                        )}
                      </div>
                    </button>
                  ))}
                  
                  {/* 其他（手动填写） */}
                  <button
                    onClick={() => {
                      setIsCustom(true);
                      setSelectedIssue('');
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      isCustom
                        ? 'border-neon-cyan bg-neon-cyan/10 text-text-primary'
                        : 'border-border-color text-text-secondary hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        其他问题（需手动填写）
                      </span>
                      {isCustom && <CheckCircle size={16} className="text-neon-cyan" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* 手动填写描述 */}
              <AnimatePresence>
                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-sm text-text-secondary mb-2">详细描述</label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="请详细描述您遇到的问题或需求..."
                      rows={4}
                      className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-xl text-sm focus:border-neon-cyan focus:outline-none resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 预览 */}
              {(selectedIssue || (isCustom && customDescription)) && !isCustom && (
                <div className="p-4 bg-bg-primary rounded-xl border border-border-color">
                  <p className="text-xs text-text-muted mb-1">问题预览</p>
                  <p className="text-sm font-medium mb-2">{title}</p>
                  <p className="text-sm text-text-secondary">{description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 问题摘要 */}
              <div className="p-4 bg-bg-primary rounded-xl border border-border-color">
                <p className="text-xs text-text-muted mb-1">问题类型 · {ticketTypeLabels[type]}</p>
                <p className="text-sm font-medium">{title}</p>
              </div>

              {/* 联系方式 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    <User size={14} className="inline mr-1" />
                    联系人姓名
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="请输入联系人姓名"
                    className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-xl text-sm focus:border-neon-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    <Phone size={14} className="inline mr-1" />
                    手机号码
                    <span className="text-xs text-text-muted ml-1">（手机或邮箱至少填一项）</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="请输入手机号码"
                    className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-xl text-sm focus:border-neon-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    <Mail size={14} className="inline mr-1" />
                    电子邮箱
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="请输入电子邮箱"
                    className="w-full px-4 py-3 bg-bg-primary border border-border-color rounded-xl text-sm focus:border-neon-cyan focus:outline-none"
                  />
                </div>
              </div>

              {/* 提示 */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  <AlertCircle size={12} className="inline mr-1" />
                  请确保联系方式准确，客服将通过此方式与您沟通处理问题
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-border-color">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              上一步
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            取消
          </button>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedIssue && !(isCustom && customDescription.trim())}
              className="px-6 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-6 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交工单
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

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

// 工单详情弹窗
interface TicketDetailModalProps {
  ticket: Ticket;
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
  
  // 评价表单状态
  const [rating, setRating] = useState(5);
  const [responseSpeed, setResponseSpeed] = useState<'fast' | 'normal' | 'slow'>('fast');
  const [resolutionEffect, setResolutionEffect] = useState<'full' | 'partial' | 'none'>('full');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');

  const handleSend = () => {
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
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl bg-bg-secondary rounded-xl border border-border-color overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded bg-gray-700 ${statusLabels[ticket.status].color}`}>
              {statusLabels[ticket.status].text}
            </span>
            <span className="text-sm text-text-secondary font-mono">{ticket.id}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* 标题和描述 */}
          <div>
            <h3 className="font-medium text-lg mb-2 text-text-primary">{ticket.title}</h3>
            <p className="text-sm text-text-secondary">{ticket.description}</p>
            
            {/* 联系人信息 */}
            {(ticket.contactName || ticket.contactPhone || ticket.contactEmail) && (
              <div className="mt-3 p-3 bg-bg-primary rounded-lg border border-border-color">
                <p className="text-xs text-text-secondary mb-2">联系人信息</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {ticket.contactName && (
                    <span className="flex items-center gap-1 text-text-secondary">
                      <User size={12} className="text-text-secondary" />
                      {ticket.contactName}
                    </span>
                  )}
                  {ticket.contactPhone && (
                    <span className="flex items-center gap-1 text-text-secondary">
                      <Phone size={12} className="text-text-secondary" />
                      {ticket.contactPhone}
                    </span>
                  )}
                  {ticket.contactEmail && (
                    <span className="flex items-center gap-1 text-text-secondary">
                      <Mail size={12} className="text-text-secondary" />
                      {ticket.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
              <span className="text-text-secondary">{ticketTypeLabels[ticket.type]}</span>
              <span>创建于 {new Date(ticket.createdAt).toLocaleString('zh-CN')}</span>
              {ticket.readByAdminAt && (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle size={10} />
                  运营已读
                </span>
              )}
            </div>
          </div>

          {/* 处理进度 */}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div className="p-4 bg-bg-primary rounded-lg border border-border-color">
              {/* 负责人 */}
              {ticket.assignedToName && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-xs text-neon-cyan">
                    {ticket.assignedToName.charAt(0)}
                  </div>
                  <span className="text-sm text-text-secondary">处理人：{ticket.assignedToName}</span>
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
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-neon-cyan to-blue-500 transition-all duration-500"
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
                        <AlertCircle size={12} />
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
                    <span className="text-xs text-text-secondary">
                      预计 {Math.floor(hoursLeft)} 小时内回复
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {ticket.messages.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border-color">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'hotel' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                      msg.sender === 'hotel'
                        ? 'bg-neon-cyan/20 text-neon-cyan'
                        : 'bg-gray-800'
                    }`}
                  >
                    <p className="text-xs text-text-secondary mb-1">
                      {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                <span className="text-sm text-text-secondary">整体满意度</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= (ticket.rating || 0) ? 'text-yellow-400' : 'text-text-muted'
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
                  <span className="text-text-secondary">
                    响应速度：
                    <span className={ticket.responseSpeed === 'fast' ? 'text-green-400' : ticket.responseSpeed === 'slow' ? 'text-red-400' : 'text-yellow-400'}>
                      {ticket.responseSpeed === 'fast' ? '很快' : ticket.responseSpeed === 'slow' ? '较慢' : '一般'}
                    </span>
                  </span>
                )}
                {ticket.resolutionEffect && (
                  <span className="text-text-secondary">
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

          {/* 评价表单 - 显示条件：1. 用户点击去评价 2. 工单已解决但未评价 */}
          {(showRating || (ticket.status === 'resolved' && !ticket.rating)) && (
            <div className="p-4 bg-bg-primary rounded-lg space-y-4">
              <p className="text-sm font-medium text-text-primary">请对本次服务进行评价</p>
              
              {/* 整体满意度 */}
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">整体满意度</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= rating ? 'text-yellow-400' : 'text-text-muted'
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
                          : 'border-border-color text-text-secondary hover:border-gray-600'
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
                          : 'border-border-color text-text-secondary hover:border-gray-600'
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
                          ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                          : 'border-border-color text-text-secondary hover:border-gray-600'
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
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-color rounded-lg text-sm text-text-secondary placeholder-gray-500 resize-none focus:border-neon-cyan focus:outline-none"
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
            {/* 回复输入框 - 仅在未解决时显示 */}
            {ticket.status !== 'resolved' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="输入回复..."
                  className="flex-1 px-4 py-2 bg-bg-primary border border-border-color rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim()}
                  className="px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
            
            {/* 去评价按钮 - 处理中或未评价已解决时显示 */}
            {(ticket.status === 'processing' || (ticket.status === 'resolved' && !ticket.rating)) && !showRating && (
              <button
                onClick={() => setShowRating(true)}
                className="w-full py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-all"
              >
                <CheckCircle size={14} className="inline mr-1" />
                {ticket.status === 'resolved' ? '工单已解决，去评价' : '问题已解决，去评价'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TicketCenter;
