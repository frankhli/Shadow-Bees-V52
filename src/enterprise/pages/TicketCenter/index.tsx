/**
 * 工单中心 V2 - 企业版
 * 
 * 优化功能：
 * 1. 常用问题模板（按类型预设）
 * 2. 两步创建流程（选问题→填联系方式）
 * 3. 催单功能（限3次）
 * 4. SLA超时提醒
 * 5. 批量操作（分配、关闭）
 * 6. 顶部酒店选择器关联
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Clock, CheckCircle, AlertCircle, MessageSquare, User, Calendar,
  ChevronRight, RefreshCw, Send, X, Building, FileText, Flame, Bell,
  Phone, Mail, CheckSquare, Square, UserPlus, Trash2, Timer, AlertTriangle
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { ticketApi } from '../../api';
import type { Ticket, TicketStatus, TicketPriority, TicketType } from '../../api/types';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 配置
// ============================================
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  open: { label: '待处理', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle },
  in_progress: { label: '处理中', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Clock },
  resolved: { label: '已解决', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  closed: { label: '已关闭', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: '紧急', color: 'text-red-600', bgColor: 'bg-red-100' },
  high: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  medium: { label: '中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  low: { label: '低', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const TYPE_CONFIG: Record<TicketType, { label: string; icon: any }> = {
  ota_issue: { label: 'OTA问题', icon: Building },
  guest_complaint: { label: '客人投诉', icon: User },
  system_bug: { label: '系统故障', icon: AlertCircle },
  other: { label: '其他', icon: FileText },
};

// SLA配置（小时）
const SLA_HOURS = {
  urgent: 2,
  high: 8,
  medium: 24,
  low: 72,
};

// 常用问题模板
const COMMON_ISSUES: Record<TicketType, Array<{ label: string; value: string }>> = {
  ota_issue: [
    { label: '价格同步失败', value: 'OTA平台价格未同步更新，请协助检查并手动推送。' },
    { label: '房态显示不正确', value: '系统中的房态与实际不符，已售/可售状态显示错误。' },
    { label: '订单无法确认', value: '收到新订单后点击确认无反应，订单状态卡在待确认。' },
    { label: '渠道账号异常', value: 'OTA平台账号登录异常或权限问题，需要协助处理。' },
  ],
  guest_complaint: [
    { label: '客人要求退款', value: '客人因个人原因要求取消订单并退款，请协助处理。' },
    { label: '服务投诉', value: '客人对酒店服务不满意，需要平台介入协调处理。' },
    { label: '设施问题', value: '客人反馈房间设施存在问题，影响入住体验。' },
    { label: '订单信息错误', value: '客人反馈订单信息（房型/日期）与实际需求不符。' },
  ],
  system_bug: [
    { label: '系统无法登录', value: '无法登录系统，提示账号密码错误或页面无响应。' },
    { label: '数据报表加载慢', value: '打开数据报表页面加载缓慢，或提示查询失败。' },
    { label: '消息通知收不到', value: '新订单、预警等消息没有收到推送通知。' },
    { label: '页面显示异常', value: '系统页面显示错乱或功能按钮无法点击。' },
  ],
  other: [
    { label: '功能使用咨询', value: '某些功能模块不太会使用，需要操作指导。' },
    { label: '账号权限申请', value: '需要开通新账号或调整现有账号权限。' },
    { label: '数据导出需求', value: '需要导出特定时间段的数据报表。' },
    { label: '其他问题', value: '其他未列出的问题或需求。' },
  ],
};

// ============================================
// 主组件
// ============================================
export default function TicketCenter() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const { success, error: showError, warning } = useToast();
  
  // 列表状态
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // 筛选状态
  const [filters, setFilters] = useState({
    keyword: '',
    status: '' as TicketStatus | '',
    priority: '' as TicketPriority | '',
    type: '' as TicketType | '',
  });
  
  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [batchAssignLoading, setBatchAssignLoading] = useState(false);
  const [batchCloseLoading, setBatchCloseLoading] = useState(false);
  const [urgeLoading, setUrgeLoading] = useState<Record<string, boolean>>({});
  
  // 确认弹窗状态
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    loading?: boolean;
    confirmText?: string;
    confirmType?: 'danger' | 'primary';
  }>({ show: false, title: '', message: '', onConfirm: () => {} });
  
  // 详情/创建弹窗
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 统计数据
  const [stats, setStats] = useState({
    total: 0, open: 0, inProgress: 0, resolved: 0, urgent: 0, overdue: 0,
  });
  
  // 加载工单列表
  const loadTickets = async () => {
    // 没有选中酒店时，显示空数据
    if (selectedHotelIds.length === 0) {
      setTickets([]);
      setTotal(0);
      setStats({ total: 0, open: 0, inProgress: 0, resolved: 0, urgent: 0, overdue: 0 });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // 单选时传hotelId，多选时不传（前端过滤）
      const hotelId = selectedHotelIds.length === 1 ? selectedHotelIds[0] : undefined;
      
      const response = await ticketApi.getTickets({
        page, pageSize,
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        type: filters.type || undefined,
        hotelId,
      });
      
      if (response.success) {
        let filteredList = response.data.list;
        // 多选时前端过滤
        if (selectedHotelIds.length > 1) {
          filteredList = filteredList.filter((t: Ticket) => 
            selectedHotelIds.includes(t.hotelId)
          );
        }
        // 计算SLA状态
        filteredList = filteredList.map((t: Ticket) => ({
          ...t,
          isOverdue: checkOverdue(t),
          remainingHours: getRemainingHours(t),
        }));
        setTickets(filteredList);
        setTotal(filteredList.length);
      }
      
      // 加载统计 - 只统计选中的酒店
      const statsRes = await ticketApi.getTicketStats(hotelId);
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('加载工单失败:', error);
      showError('加载失败', '无法加载工单数据，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 检查是否超时
  const checkOverdue = (ticket: Ticket): boolean => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursElapsed > SLA_HOURS[ticket.priority];
  };
  
  // 获取剩余时间
  const getRemainingHours = (ticket: Ticket): number => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return 0;
    const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    return Math.max(0, SLA_HOURS[ticket.priority] - hoursElapsed);
  };
  
  // 页面或筛选变化时加载
  useEffect(() => {
    loadTickets();
  }, [page, filters.status, filters.priority, filters.type]);
  
  // 酒店选择器变化时，重置到第一页
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    } else {
      loadTickets();
    }
  }, [selectedHotelIds]);
  
  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.keyword]);
  
  // 查看工单详情
  const viewTicketDetail = async (ticket: Ticket) => {
    setDetailLoading(true);
    try {
      const response = await ticketApi.getTicketDetail(ticket.id);
      if (response.success) {
        setSelectedTicket(response.data);
      } else {
        showError('加载失败', response.message || '无法加载工单详情');
      }
    } catch (error) {
      console.error('加载工单详情失败:', error);
      showError('加载失败', '无法加载工单详情，请稍后重试');
    } finally {
      setDetailLoading(false);
    }
  };
  
  // 催单
  const handleUrgeTicket = async (ticketId: string, currentCount: number = 0) => {
    if (currentCount >= 3) {
      warning('催促次数已达上限', '该工单已催促3次，请勿重复催促');
      return;
    }
    setUrgeLoading(prev => ({ ...prev, [ticketId]: true }));
    try {
      const response = await ticketApi.urgeTicket(ticketId);
      if (response.success) {
        success('催促成功', `已通知处理人员（第${response.data.urgeCount}次）`);
        loadTickets();
      } else {
        showError('催促失败', response.message || '请稍后重试');
      }
    } catch (err: any) {
      console.error('催单失败:', err);
      showError('催促失败', err?.message || '请稍后重试');
    } finally {
      setUrgeLoading(prev => ({ ...prev, [ticketId]: false }));
    }
  };
  
  // 批量选择
  const toggleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) newSet.delete(ticketId);
      else newSet.add(ticketId);
      return newSet;
    });
  };
  
  const selectAllTickets = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };
  
  // 批量分配
  const handleBatchAssign = async (assignee: string) => {
    setBatchAssignLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedTickets).map(id => ticketApi.assignTicket(id, assignee))
      );
      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        success('批量分配成功', `已分配 ${successCount} 个工单给 ${assignee}`);
      } else if (successCount === 0) {
        showError('批量分配失败', '所有工单分配失败，请稍后重试');
      } else {
        warning('部分分配成功', `成功 ${successCount} 个，失败 ${failCount} 个`);
      }
      
      setShowBatchAssignModal(false);
      setBatchMode(false);
      setSelectedTickets(new Set());
      loadTickets();
    } catch (err: any) {
      console.error('批量分配失败:', err);
      showError('批量分配失败', err?.message || '请稍后重试');
    } finally {
      setBatchAssignLoading(false);
    }
  };
  
  // 批量关闭
  const handleBatchClose = () => {
    setConfirmModal({
      show: true,
      title: '确认批量关闭',
      message: `确定要关闭选中的 ${selectedTickets.size} 个工单吗？关闭后工单将无法继续处理。`,
      confirmText: '确认关闭',
      confirmType: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        setBatchCloseLoading(true);
        try {
          const results = await Promise.allSettled(
            Array.from(selectedTickets).map(id => ticketApi.updateTicketStatus(id, 'closed'))
          );
          const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
          const failCount = results.length - successCount;
          
          if (failCount === 0) {
            success('批量关闭成功', `已关闭 ${successCount} 个工单`);
          } else if (successCount === 0) {
            showError('批量关闭失败', '所有工单关闭失败，请稍后重试');
          } else {
            warning('部分关闭成功', `成功 ${successCount} 个，失败 ${failCount} 个`);
          }
          
          setBatchMode(false);
          setSelectedTickets(new Set());
          loadTickets();
        } catch (err: any) {
          console.error('批量关闭失败:', err);
          showError('批量关闭失败', err?.message || '请稍后重试');
        } finally {
          setBatchCloseLoading(false);
          setConfirmModal(prev => ({ ...prev, show: false, loading: false }));
        }
      },
    });
  };
  
  const totalPages = Math.ceil(total / pageSize);
  
  return (
    <div className="p-6 space-y-6">
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工单中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            处理酒店运营中的各类问题和投诉
            {selectedHotelIds.length > 0 && ` · ${selectedHotelIds.length} 家酒店`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 批量操作开关 */}
          <button
            onClick={() => {
              setBatchMode(!batchMode);
              setSelectedTickets(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              batchMode ? 'bg-violet-100 text-violet-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {batchMode ? '退出批量' : '批量操作'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建工单
          </button>
        </div>
      </div>
      
      {/* 未选择酒店提示 */}
      {selectedHotelIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-amber-900">未选择酒店</div>
              <div className="text-sm text-amber-700">
                请从顶部酒店选择器中选择酒店，查看对应酒店的工单数据
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        <StatCard title="全部工单" value={stats.total} icon={FileText} color="bg-gray-100 text-gray-600" 
          active={filters.status === ''} onClick={() => setFilters(f => ({ ...f, status: '' }))} animate />
        <StatCard title="待处理" value={stats.open} icon={AlertCircle} color="bg-red-100 text-red-600" 
          active={filters.status === 'open'} onClick={() => setFilters(f => ({ ...f, status: f.status === 'open' ? '' : 'open' }))} animate />
        <StatCard title="处理中" value={stats.inProgress} icon={Clock} color="bg-blue-100 text-blue-600" 
          active={filters.status === 'in_progress'} onClick={() => setFilters(f => ({ ...f, status: f.status === 'in_progress' ? '' : 'in_progress' }))} animate />
        <StatCard title="已解决" value={stats.resolved} icon={CheckCircle} color="bg-green-100 text-green-600" 
          active={filters.status === 'resolved'} onClick={() => setFilters(f => ({ ...f, status: f.status === 'resolved' ? '' : 'resolved' }))} animate />
        <StatCard title="紧急工单" value={stats.urgent} icon={AlertCircle} color="bg-orange-100 text-orange-600" 
          active={filters.priority === 'urgent'} onClick={() => setFilters(f => ({ ...f, priority: f.priority === 'urgent' ? '' : 'urgent' }))} animate />
        <StatCard title="即将超时" value={stats.overdue || 0} icon={Timer} color="bg-purple-100 text-purple-600" animate />
      </div>
      
      {/* 批量操作栏 */}
      <AnimatePresence>
        {batchMode && selectedTickets.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-violet-900">已选择 {selectedTickets.size} 个工单</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBatchAssignModal(true)}
                disabled={batchAssignLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-violet-300 rounded-lg text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchAssignLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {batchAssignLoading ? '分配中...' : '批量分配'}
              </button>
              <button
                onClick={handleBatchClose}
                disabled={batchCloseLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchCloseLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {batchCloseLoading ? '关闭中...' : '批量关闭'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工单标题、编号..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>
          
          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TicketStatus }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          {/* 优先级筛选 */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as TicketPriority }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="">全部优先级</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          {/* 类型筛选 */}
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as TicketType }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="">全部类型</option>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          {/* 刷新按钮 */}
          <button 
            onClick={loadTickets} 
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* 工单列表 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-4" />
            <p>暂无工单数据</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-4 text-violet-600 hover:text-violet-700 text-sm">
              创建第一个工单
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* 表头 */}
            {batchMode && (
              <div className="px-4 py-3 bg-gray-50 flex items-center gap-3">
                <button onClick={selectAllTickets} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {selectedTickets.size === tickets.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  全选
                </button>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {tickets.map((ticket: any, index) => {
                const statusConfig = STATUS_CONFIG[ticket.status as TicketStatus];
                const priorityConfig = PRIORITY_CONFIG[ticket.priority as TicketPriority];
                const typeConfig = TYPE_CONFIG[ticket.type as TicketType];
                const StatusIcon = statusConfig.icon;
                const TypeIcon = typeConfig.icon;
                const isSelected = selectedTickets.has(ticket.id);
                const isUrging = urgeLoading[ticket.id];
                
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-violet-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 批量选择框 */}
                      {batchMode && (
                        <button
                          onClick={() => toggleSelectTicket(ticket.id)}
                          className="mt-1 transition-colors"
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5 text-violet-600" /> : <Square className="w-5 h-5 text-gray-400" />}
                        </button>
                      )}
                      
                      {/* 类型图标 */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      
                      {/* 主要内容 */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !batchMode && viewTicketDetail(ticket)}>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          {/* SLA状态 */}
                          {ticket.isOverdue ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              已超时
                            </span>
                          ) : ticket.remainingHours < 4 ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-600">
                              <Timer className="w-3 h-3" />
                              剩{ticket.remainingHours.toFixed(1)}h
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{ticket.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {hotels.find(h => h.id === ticket.hotelId)?.name || '未知酒店'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ticket.createdBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ticket.createdAt).toLocaleString()}
                          </span>
                          {ticket.comments?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {ticket.comments.length}条回复
                            </span>
                          )}
                          {ticket.urgeCount > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <Flame className="w-3 h-3" />
                              已催{ticket.urgeCount}次
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 右侧操作 */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                        
                        {/* 催单按钮 */}
                        {!batchMode && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUrgeTicket(ticket.id, ticket.urgeCount || 0);
                            }}
                            disabled={ticket.urgeCount >= 3 || isUrging}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                              ticket.urgeCount >= 3
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : ticket.urgeCount > 0
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            } ${isUrging ? 'opacity-70' : ''}`}
                            title={ticket.urgeCount >= 3 ? '已多次催促' : '点击催促'}
                          >
                            {isUrging ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : ticket.urgeCount > 0 ? (
                              <Flame className="w-3 h-3" />
                            ) : (
                              <Bell className="w-3 h-3" />
                            )}
                            {isUrging ? '催单中...' : ticket.urgeCount > 0 ? `已催${ticket.urgeCount}次` : '催单'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        
        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">共 {total} 条，第 {page}/{totalPages} 页</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                <button key={i + 1} onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === i + 1 ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 工单详情弹窗 */}
      <TicketDetailModal
        ticket={selectedTicket}
        loading={detailLoading}
        onClose={() => setSelectedTicket(null)}
        onUpdate={loadTickets}
        hotels={hotels}
        onUrge={handleUrgeTicket}
        urgeLoading={urgeLoading}
      />
      
      {/* 创建工单弹窗 */}
      <CreateTicketModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={loadTickets}
        hotels={hotels}
      />
      
      {/* 批量分配弹窗 */}
      <AnimatePresence>
        {showBatchAssignModal && (
          <BatchAssignModal
            count={selectedTickets.size}
            onClose={() => setShowBatchAssignModal(false)}
            onAssign={handleBatchAssign}
            loading={batchAssignLoading}
          />
        )}
      </AnimatePresence>
      
      {/* 确认弹窗 */}
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}

// ============================================
// 子组件
// ============================================

// 数字动画组件
function AnimatedNumber({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  
  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // 使用 easeOutCubic 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
    prevValueRef.current = value;
  }, [value, duration]);
  
  return <span>{displayValue}</span>;
}

function StatCard({ title, value, icon: Icon, color, active, onClick, animate: enableAnimate }: any) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
        active ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {enableAnimate ? <AnimatedNumber value={value} /> : value}
      </div>
    </motion.div>
  );
}

// 确认弹窗组件
function ConfirmModal({ show, title, message, onConfirm, onCancel, loading, confirmText = '确认', confirmType = 'primary' }: any) {
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel} 
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 ${
                confirmType === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-violet-600 hover:bg-violet-700'
              }`}
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? '处理中...' : confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 工单详情弹窗
function TicketDetailModal({ ticket, loading, onClose, onUpdate, hotels, onUrge, urgeLoading }: any) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  
  if (!ticket) return null;
  
  const statusConfig = STATUS_CONFIG[ticket.status as TicketStatus];
  const priorityConfig = PRIORITY_CONFIG[ticket.priority as TicketPriority];
  const typeConfig = TYPE_CONFIG[ticket.type as TicketType];
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;
  const isUrging = urgeLoading?.[ticket.id];
  
  // 计算处理时长
  const handleTime = useMemo(() => {
    const hours = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return `${Math.floor(hours * 60)}分钟`;
    if (hours < 24) return `${Math.floor(hours)}小时`;
    return `${Math.floor(hours / 24)}天`;
  }, [ticket.createdAt]);
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await ticketApi.addTicketComment(ticket.id, newComment, 'current-user', '当前用户');
      if (res.success) {
        setNewComment('');
        const detailRes = await ticketApi.getTicketDetail(ticket.id);
        if (detailRes.success) Object.assign(ticket, detailRes.data);
        onUpdate();
        success('发送成功', '评论已添加');
      } else {
        showError('发送失败', res.message || '请稍后重试');
      }
    } catch (error) {
      console.error('添加评论失败:', error);
      showError('发送失败', '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleUpdateStatus = async (status: TicketStatus) => {
    setUpdatingStatus(status);
    try {
      const res = await ticketApi.updateTicketStatus(ticket.id, status);
      if (res.success) {
        ticket.status = status;
        onUpdate();
        success('状态更新成功', `工单已标记为${STATUS_CONFIG[status].label}`);
      } else {
        showError('更新失败', res.message || '请稍后重试');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      showError('更新失败', '请稍后重试');
    } finally {
      setUpdatingStatus(null);
    }
  };
  
  return (
    <AnimatePresence>
      {ticket && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
              </div>
            ) : (
              <>
                {/* 头部 */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                      {/* SLA状态 */}
                      {ticket.isOverdue && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          已超时
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><TypeIcon className="w-4 h-4" />{typeConfig.label}</span>
                      <span className="flex items-center gap-1"><Building className="w-4 h-4" />
                        {hotels.find((h: any) => h.id === ticket.hotelId)?.name || '未知酒店'}
                      </span>
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />
                        已{handleTime}
                      </span>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* 内容 */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* 状态操作 */}
                  <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />{statusConfig.label}
                    </span>
                    
                    {/* 催单按钮 */}
                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <button
                        onClick={() => onUrge(ticket.id, ticket.urgeCount || 0)}
                        disabled={ticket.urgeCount >= 3 || isUrging}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                          ticket.urgeCount >= 3
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : ticket.urgeCount > 0
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        } ${isUrging ? 'opacity-70' : ''}`}
                      >
                        {isUrging ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : ticket.urgeCount > 0 ? (
                          <Flame className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                        {isUrging ? '催单中...' : ticket.urgeCount >= 3 ? '已催3次' : ticket.urgeCount > 0 ? `已催${ticket.urgeCount}次` : '催单'}
                      </button>
                    )}
                    
                    <div className="flex-1"></div>
                    {ticket.status !== 'in_progress' && (
                      <button 
                        onClick={() => handleUpdateStatus('in_progress')} 
                        disabled={updatingStatus !== null}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {updatingStatus === 'in_progress' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        开始处理
                      </button>
                    )}
                    {ticket.status !== 'resolved' && (
                      <button 
                        onClick={() => handleUpdateStatus('resolved')} 
                        disabled={updatingStatus !== null}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {updatingStatus === 'resolved' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        标记已解决
                      </button>
                    )}
                    {ticket.status !== 'closed' && (
                      <button 
                        onClick={() => handleUpdateStatus('closed')} 
                        disabled={updatingStatus !== null}
                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {updatingStatus === 'closed' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        关闭工单
                      </button>
                    )}
                  </div>
                  
                  {/* 描述 */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">问题描述</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                  
                  {/* 评论列表 */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">处理记录</h4>
                    {ticket.comments?.length === 0 ? (
                      <p className="text-gray-400 text-sm">暂无处理记录</p>
                    ) : (
                      <AnimatePresence>
                        {ticket.comments?.map((comment: any, index: number) => (
                          <motion.div 
                            key={comment.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-violet-600" />
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{comment.authorName}</span>
                                <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-gray-600 text-sm">{comment.content}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
                
                {/* 底部评论输入 */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex gap-3">
                    <input
                      type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      placeholder="添加处理记录..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button 
                      onClick={handleAddComment} 
                      disabled={!newComment.trim() || submitting}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submitting ? '发送中...' : '发送'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 创建工单弹窗 - 两步流程
function CreateTicketModal({ show, onClose, onCreate, hotels }: any) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<TicketType>('ota_issue');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();
  
  // 表单数据
  const [hotelId, setHotelId] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // 根据选择的问题生成标题和描述
  const title = useMemo(() => {
    if (isCustom) return customDescription.slice(0, 30) || '其他问题';
    const issue = COMMON_ISSUES[type].find(i => i.value === selectedIssue);
    return issue?.label || '';
  }, [type, selectedIssue, isCustom, customDescription]);
  
  const description = useMemo(() => {
    if (isCustom) return customDescription;
    const issue = COMMON_ISSUES[type].find(i => i.value === selectedIssue);
    return issue?.value || '';
  }, [type, selectedIssue, isCustom, customDescription]);
  
  const handleSubmit = async () => {
    if (!hotelId || !title.trim() || !description.trim()) return;
    if (!contactPhone.trim() && !contactEmail.trim()) return;
    
    setSubmitting(true);
    try {
      // 将联系方式添加到描述中
      const fullDescription = `${description}\n\n【联系方式】\n联系人：${contactName || '未填写'}\n电话：${contactPhone || '未填写'}\n邮箱：${contactEmail || '未填写'}`;
      
      const res = await ticketApi.createTicket({
        hotelId, type, priority, title,
        description: fullDescription,
        status: 'open', createdBy: '当前用户',
      });
      
      if (res.success) {
        success('创建成功', '工单已提交，我们会尽快处理');
        onCreate();
        onClose();
        // 重置表单
        setStep(1); setType('ota_issue'); setSelectedIssue(''); setIsCustom(false);
        setCustomDescription(''); setHotelId(''); setPriority('medium');
        setContactName(''); setContactPhone(''); setContactEmail('');
      } else {
        showError('创建失败', res.message || '请稍后重试');
      }
    } catch (error) {
      console.error('创建工单失败:', error);
      showError('创建失败', '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  const canSubmit = title.trim() && description.trim() && (contactPhone.trim() || contactEmail.trim());
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-white rounded-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${step === 1 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>1</div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${step === 2 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>2</div>
            <span className="ml-2 text-sm text-gray-600">{step === 1 ? '选择问题类型' : '填写联系方式'}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-4">
          {step === 1 ? (
            <div className="space-y-4">
              {/* 酒店选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择酒店 *</label>
                <select value={hotelId} onChange={(e) => setHotelId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="">请选择酒店</option>
                  {hotels.map((h: any) => (<option key={h.id} value={h.id}>{h.name}</option>))}
                </select>
              </div>
              
              {/* 优先级 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">优先级 *</label>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <button key={key} onClick={() => setPriority(key as TicketPriority)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        priority === key ? `${config.bgColor} ${config.color} ring-2 ring-offset-1` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 工单类型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">工单类型</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <button key={key} onClick={() => { setType(key as TicketType); setSelectedIssue(''); setIsCustom(false); }}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        type === key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 常用问题选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">请选择具体问题</label>
                <div className="space-y-2">
                  {COMMON_ISSUES[type].map((issue, index) => (
                    <button key={index} onClick={() => { setSelectedIssue(issue.value); setIsCustom(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        selectedIssue === issue.value && !isCustom ? 'border-violet-500 bg-violet-50 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span>{issue.label}</span>
                        {selectedIssue === issue.value && !isCustom && <CheckCircle className="w-4 h-4 text-violet-600" />}
                      </div>
                    </button>
                  ))}
                  
                  {/* 其他（手动填写） */}
                  <button onClick={() => { setIsCustom(true); setSelectedIssue(''); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      isCustom ? 'border-violet-500 bg-violet-50 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />其他问题（手动填写）</span>
                      {isCustom && <CheckCircle className="w-4 h-4 text-violet-600" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* 手动填写描述 */}
              <AnimatePresence>
                {isCustom && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <label className="block text-sm font-medium text-gray-700 mb-2">详细描述</label>
                    <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="请详细描述您遇到的问题或需求..." rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 resize-none" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 预览 */}
              {(selectedIssue || (isCustom && customDescription)) && !isCustom && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">问题预览</p>
                  <p className="text-sm font-medium mb-2">{title}</p>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 问题摘要 */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">问题类型 · {TYPE_CONFIG[type].label}</p>
                <p className="text-sm font-medium">{title}</p>
              </div>

              {/* 联系方式 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><User className="w-4 h-4 inline mr-1" />联系人姓名</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                    placeholder="请输入联系人姓名" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />手机号码
                    <span className="text-xs text-gray-400 ml-1">（手机或邮箱至少填一项）</span>
                  </label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="请输入手机号码" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><Mail className="w-4 h-4 inline mr-1" />电子邮箱</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="请输入电子邮箱" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              {/* 提示 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600"><AlertCircle className="w-4 h-4 inline mr-1" />请确保联系方式准确，客服将通过此方式与您沟通处理问题</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          {step === 2 && <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">上一步</button>}
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">取消</button>
          {step === 1 ? (
            <button onClick={() => setStep(2)} disabled={!hotelId || (!selectedIssue && !(isCustom && customDescription.trim()))}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">下一步</button>
          ) : (
            <button onClick={handleSubmit} disabled={!canSubmit || submitting}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              {submitting ? '创建中...' : '提交工单'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// 批量分配弹窗
function BatchAssignModal({ count, onClose, onAssign, loading }: any) {
  const [assignee, setAssignee] = useState('');
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">批量分配工单</h3>
        <p className="text-sm text-gray-500 mb-4">将选中的 <span className="font-medium text-violet-600">{count}</span> 个工单分配给：</p>
        
        <input
          type="text"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="输入处理人姓名"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 mb-4 disabled:bg-gray-100"
        />
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onAssign(assignee)}
            disabled={!assignee.trim() || loading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? '分配中...' : '确认分配'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
