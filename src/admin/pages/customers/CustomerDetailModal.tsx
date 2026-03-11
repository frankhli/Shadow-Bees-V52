/**
 * 客户详情弹窗 - 展示酒店详细数据
 * 增强版：添加健康度评分、续约风险评估、关联数据展示
 */

import { useState, useMemo } from 'react';
import {
  X, Building2, Phone, Mail, Calendar, CreditCard, Smartphone, Package, Hotel,
  HeartPulse, TicketCheck, FileText, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight,
  RotateCcw, FileSearch, Gift, Activity, AlertCircle, MessageSquare, Eye, ThumbsUp
} from 'lucide-react';
import { PlatformLogo } from '../../components/PlatformLogo';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAdminStore, type Customer, type HotelData, type Platform, type Ticket, type ContentItem } from '../../stores/adminStore';
import { useToast } from '../../components/ui/Toast';

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
}

const platformNames: Record<Platform, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
};

// 环形进度条组件
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color = '#00D4FF',
  children
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E2538"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// 获取健康度评级
function getHealthRating(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 90) return { label: '优秀', color: 'text-neon-green', bgColor: 'bg-neon-green/20' };
  if (score >= 75) return { label: '良好', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20' };
  if (score >= 60) return { label: '一般', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20' };
  return { label: '风险', color: 'text-neon-red', bgColor: 'bg-neon-red/20' };
}

// 计算健康度评分
function calculateHealthScore(
  customer: Customer,
  tickets: Ticket[],
  contents: ContentItem[]
): {
  totalScore: number;
  ticketScore: number;
  complianceScore: number;
  revenueScore: number;
  activityScore: number;
  details: { label: string; score: number; weight: number; desc: string }[];
} {
  // 1. 工单频率评分 (30%) - 基于近期工单数量和状态
  const customerTickets = tickets.filter(t => customer.hotelIds.includes(t.hotelId));
  const recentTickets = customerTickets.filter(t => {
    const daysSince = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });
  const openTickets = recentTickets.filter(t => t.status === 'open' || t.status === 'processing').length;
  const ticketScore = Math.max(0, 100 - openTickets * 15 - (recentTickets.length - openTickets) * 5);

  // 2. 内容合规评分 (25%) - 基于内容审核状态
  const customerContents = contents.filter(c => customer.hotelIds.includes(c.hotelId));
  const flaggedContents = customerContents.filter(c => c.status === 'flagged' || c.status === 'takedown').length;
  const pendingContents = customerContents.filter(c => c.status === 'pending').length;
  const complianceScore = Math.max(0, 100 - flaggedContents * 20 - pendingContents * 5);

  // 3. 收入稳定性评分 (30%) - 基于月收入和总收入的比率
  const monthlyRatio = customer.monthlyRevenue / (customer.totalRevenue / Math.max(1, Math.ceil((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))));
  const revenueScore = Math.min(100, Math.max(40, monthlyRatio * 80));

  // 4. 活跃度评分 (15%) - 基于酒店数量和订单数
  const hotelCount = customer.hotels.length;
  const orderActivity = Math.min(100, (customer.totalOrders / Math.max(1, hotelCount)) / 10);
  const activityScore = Math.min(100, hotelCount * 20 + orderActivity * 0.8);

  // 加权总分
  const totalScore = Math.round(
    ticketScore * 0.30 +
    complianceScore * 0.25 +
    revenueScore * 0.30 +
    activityScore * 0.15
  );

  return {
    totalScore,
    ticketScore: Math.round(ticketScore),
    complianceScore: Math.round(complianceScore),
    revenueScore: Math.round(revenueScore),
    activityScore: Math.round(activityScore),
    details: [
      { label: '工单频率', score: Math.round(ticketScore), weight: 30, desc: `${recentTickets.length}个近期工单` },
      { label: '内容合规', score: Math.round(complianceScore), weight: 25, desc: `${flaggedContents}个违规内容` },
      { label: '收入稳定', score: Math.round(revenueScore), weight: 30, desc: `月均¥${(customer.monthlyRevenue / 10000).toFixed(1)}万` },
      { label: '活跃度', score: Math.round(activityScore), weight: 15, desc: `${hotelCount}家酒店` },
    ],
  };
}

// 计算续约风险评估
function calculateRenewalRisk(
  customer: Customer,
  tickets: Ticket[],
  contents: ContentItem[]
): {
  daysUntilExpiry: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  recommendation: string;
  suggestedAction: string;
} {
  const daysUntilExpiry = Math.ceil((new Date(customer.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const riskFactors: string[] = [];

  // 检查近期工单
  const recentTickets = tickets.filter(t => {
    const daysSince = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return customer.hotelIds.includes(t.hotelId) && daysSince <= 30 && (t.status === 'open' || t.status === 'processing');
  });
  if (recentTickets.length > 2) {
    riskFactors.push(`近期有${recentTickets.length}个未解决工单`);
  }

  // 检查内容违规
  const flaggedContents = contents.filter(c =>
    customer.hotelIds.includes(c.hotelId) && (c.status === 'flagged' || c.status === 'takedown')
  );
  if (flaggedContents.length > 0) {
    riskFactors.push(`${flaggedContents.length}个内容违规待处理`);
  }

  // 检查收入下降（简化逻辑：如果月营收低于累计平均的50%）
  const monthsActive = Math.max(1, Math.ceil((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const avgMonthlyRevenue = customer.totalRevenue / monthsActive;
  if (customer.monthlyRevenue < avgMonthlyRevenue * 0.5) {
    riskFactors.push('月收入较平均水平下降超过50%');
  }

  // 到期时间风险
  if (daysUntilExpiry < 30) {
    riskFactors.push(`仅剩${daysUntilExpiry}天即将到期`);
  }

  // 确定风险等级
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (daysUntilExpiry < 7 || riskFactors.length >= 3) {
    riskLevel = 'high';
  } else if (daysUntilExpiry < 30 || riskFactors.length >= 1) {
    riskLevel = 'medium';
  }

  // 生成建议
  let recommendation = '';
  let suggestedAction = '';
  if (riskLevel === 'high') {
    recommendation = '建议立即联系客户，提供专项优惠方案';
    suggestedAction = '升级至企业版享8折优惠';
  } else if (riskLevel === 'medium') {
    recommendation = '建议提前沟通续约意向，了解客户痛点';
    suggestedAction = '赠送1个月使用时长';
  } else {
    recommendation = '客户状态良好，正常推进续约流程';
    suggestedAction = '推荐年度套餐享9折优惠';
  }

  return {
    daysUntilExpiry,
    riskLevel,
    riskFactors,
    recommendation,
    suggestedAction,
  };
}

export function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'hotels' | 'channels' | 'health' | 'tickets' | 'contents' | 'finance'>('overview');
  const [selectedHotel, setSelectedHotel] = useState<HotelData | null>(customer.hotels[0] || null);
  
  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: customer.companyName,
    contactName: customer.contactName,
    contactPhone: customer.contactPhone,
    contactEmail: customer.contactEmail,
    salesRep: customer.salesRep,
    notes: customer.notes || '',
    tier: customer.tier,
    status: customer.status,
  });

  // 从 store 获取关联数据
  const { tickets, contentItems } = useAdminStore();

  // 过滤该客户相关的数据
  const customerTickets = useMemo(() =>
    tickets.filter(t => customer.hotelIds.includes(t.hotelId)).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [tickets, customer.hotelIds]
  );

  const customerContents = useMemo(() =>
    contentItems.filter(c => customer.hotelIds.includes(c.hotelId)).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [contentItems, customer.hotelIds]
  );

  // 计算健康度评分
  const healthData = useMemo(() => calculateHealthScore(customer, tickets, contentItems), [customer, tickets, contentItems]);
  const healthRating = getHealthRating(healthData.totalScore);

  // 计算续约风险
  const renewalRisk = useMemo(() => calculateRenewalRisk(customer, tickets, contentItems), [customer, tickets, contentItems]);

  // 生成财务趋势数据（模拟过去6个月）
  const financeTrend = useMemo(() => {
    const months = 6;
    const data = [];
    const baseRevenue = customer.monthlyRevenue;
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      // 模拟波动数据
      const variance = (Math.random() - 0.5) * 0.3;
      data.push({
        month: `${date.getMonth() + 1}月`,
        revenue: Math.round(baseRevenue * (1 + variance)),
      });
    }
    return data;
  }, [customer.monthlyRevenue]);

  const statusLabels: Record<string, { text: string; color: string; bgColor: string }> = {
    trial: { text: '试用中', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20' },
    active: { text: '正常', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
    suspended: { text: '已停用', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
    expired: { text: '已过期', color: 'text-gray-400', bgColor: 'bg-gray-700' },
  };

  const tierLabels: Record<string, { text: string; color: string }> = {
    free: { text: '免费版', color: 'text-gray-400' },
    starter: { text: '入门版', color: 'text-neon-cyan' },
    professional: { text: '专业版', color: 'text-neon-purple' },
    enterprise: { text: '企业版', color: 'text-neon-amber' },
  };

  const ticketStatusLabels: Record<string, { text: string; color: string; bgColor: string }> = {
    open: { text: '待处理', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20' },
    processing: { text: '处理中', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20' },
    resolved: { text: '已解决', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
    closed: { text: '已关闭', color: 'text-gray-400', bgColor: 'bg-gray-700' },
  };

  const ticketPriorityLabels: Record<string, { text: string; color: string }> = {
    low: { text: '低', color: 'text-gray-400' },
    medium: { text: '中', color: 'text-neon-cyan' },
    high: { text: '高', color: 'text-neon-amber' },
    urgent: { text: '紧急', color: 'text-neon-red' },
  };

  const contentStatusLabels: Record<string, { text: string; color: string; bgColor: string }> = {
    pending: { text: '审核中', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20' },
    approved: { text: '已通过', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
    rejected: { text: '已拒绝', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
    flagged: { text: '需关注', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
    takedown: { text: '已下架', color: 'text-gray-400', bgColor: 'bg-gray-700' },
  };

  const status = statusLabels[customer.status];

  const toast = useToast();
  const navigate = useNavigate();
  const { updateCustomer } = useAdminStore();

  // 快捷操作处理
  const handleExtendTrial = () => {
    const newExpireAt = new Date(customer.expireAt);
    newExpireAt.setDate(newExpireAt.getDate() + 7);
    updateCustomer(customer.id, { 
      expireAt: newExpireAt.toISOString(),
      status: 'trial'
    });
    toast.success('试用期延长成功', `已为 ${customer.companyName} 延长试用期7天，新到期时间：${newExpireAt.toLocaleDateString('zh-CN')}`);
  };

  const handleInitiateRenewal = () => {
    toast.success('续约流程已发起', `${customer.companyName} 的续约申请已提交，建议方案：${renewalRisk.suggestedAction}`);
  };

  const handleViewOrder = () => {
    // 跳转到财务中心的客户订单 Tab，并携带客户名称作为搜索参数
    const searchParam = encodeURIComponent(customer.companyName);
    onClose(); // 先关闭弹窗
    navigate(`/finance?tab=customerOrders&search=${searchParam}`);
  };

  // 保存编辑信息
  const handleSaveEdit = () => {
    updateCustomer(customer.id, editForm);
    toast.success('保存成功', '客户信息已更新');
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditForm({
      companyName: customer.companyName,
      contactName: customer.contactName,
      contactPhone: customer.contactPhone,
      contactEmail: customer.contactEmail,
      salesRep: customer.salesRep,
      notes: customer.notes || '',
      tier: customer.tier,
      status: customer.status,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 - 更深背景 + 模糊 + 防止穿透 */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-[#0f1420] rounded-xl border-2 border-gray-400 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600 bg-[#151b2e]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
              <Building2 size={28} className="text-neon-cyan" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{customer.companyName}</h3>
              <p className="text-sm text-gray-400">Tenant ID: {customer.tenantId}</p>
            </div>
            {/* 健康度快捷显示 */}
            <div className={`ml-4 px-3 py-1 rounded-full text-sm flex items-center gap-2 ${healthRating.bgColor} ${healthRating.color}`}>
              <HeartPulse size={14} />
              健康度: {healthData.totalScore}分 ({healthRating.label})
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex border-b border-gray-600 overflow-x-auto bg-[#151b2e]">
          {[
            { id: 'overview', label: '概览', icon: Building2 },
            { id: 'hotels', label: '酒店详情', icon: Hotel },
            { id: 'channels', label: '渠道数据', icon: Smartphone },
            { id: 'health', label: '健康度', icon: HeartPulse },
            { id: 'tickets', label: '工单', icon: TicketCheck },
            { id: 'contents', label: '内容', icon: FileText },
            { id: 'finance', label: '财务', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-5 py-3 text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-neon-cyan border-b-2 border-neon-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {/* 显示数量徽标 */}
                {tab.id === 'tickets' && customerTickets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-neon-amber/20 text-neon-amber text-xs rounded-full">
                    {customerTickets.length}
                  </span>
                )}
                {tab.id === 'contents' && customerContents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-neon-cyan/20 text-neon-cyan text-xs rounded-full">
                    {customerContents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-6 bg-[#0f1420]">
          {/* 概览 Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 续约风险提醒 */}
              {renewalRisk.riskLevel !== 'low' && (
                <div className={`p-4 rounded-lg border ${
                  renewalRisk.riskLevel === 'high'
                    ? 'bg-neon-red/10 border-neon-red/30'
                    : 'bg-neon-amber/10 border-neon-amber/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className={renewalRisk.riskLevel === 'high' ? 'text-neon-red' : 'text-neon-amber'} />
                    <div className="flex-1">
                      <h4 className={`font-medium ${renewalRisk.riskLevel === 'high' ? 'text-neon-red' : 'text-neon-amber'}`}>
                        续约风险提醒
                      </h4>
                      <p className="text-sm text-gray-300 mt-1">
                        距离到期还有 <span className="font-bold">{renewalRisk.daysUntilExpiry}</span> 天
                        {renewalRisk.riskFactors.length > 0 && (
                          <span> · 风险因素: {renewalRisk.riskFactors.join('、')}</span>
                        )}
                      </p>
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-sm text-gray-400">建议: {renewalRisk.recommendation}</span>
                        <button
                          onClick={handleInitiateRenewal}
                          className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-all"
                        >
                          立即处理
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 基本信息 - 编辑模式下显示表单 */}
              {isEditing ? (
                <div className="space-y-4 p-4 bg-[#0B0F19] rounded-lg border border-neon-cyan/30">
                  <h4 className="text-sm font-medium text-neon-cyan mb-4 flex items-center gap-2">
                    <Building2 size={16} />
                    编辑客户信息
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">公司名称</label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">联系人</label>
                      <input
                        type="text"
                        value={editForm.contactName}
                        onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">联系电话</label>
                      <input
                        type="text"
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">邮箱</label>
                      <input
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">销售负责人</label>
                      <input
                        type="text"
                        value={editForm.salesRep}
                        onChange={(e) => setEditForm({ ...editForm, salesRep: e.target.value })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">套餐</label>
                      <select
                        value={editForm.tier}
                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as Customer['tier'] })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      >
                        <option value="free">免费版</option>
                        <option value="starter">入门版</option>
                        <option value="professional">专业版</option>
                        <option value="enterprise">企业版</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">状态</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Customer['status'] })}
                        className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors"
                      >
                        <option value="trial">试用中</option>
                        <option value="active">正常</option>
                        <option value="suspended">已暂停</option>
                        <option value="expired">已过期</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">备注</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-[#1E2538] border border-gray-700 rounded-lg text-white focus:border-neon-cyan focus:outline-none transition-colors resize-none"
                      placeholder="添加客户备注信息..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Phone size={14} />
                      联系电话
                    </div>
                    <p className="font-medium">{customer.contactPhone}</p>
                  </div>
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Mail size={14} />
                      邮箱
                    </div>
                    <p className="font-medium">{customer.contactEmail}</p>
                  </div>
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <Calendar size={14} />
                      开通时间
                    </div>
                    <p className="font-medium">
                      {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="p-4 bg-[#0B0F19] rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                      <CreditCard size={14} />
                      到期时间
                    </div>
                    <p className="font-medium">
                      {new Date(customer.expireAt).toLocaleDateString('zh-CN')}
                      <span className={`ml-2 text-sm ${renewalRisk.daysUntilExpiry < 30 ? 'text-neon-amber' : 'text-gray-500'}`}>
                        ({renewalRisk.daysUntilExpiry}天后)
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* 套餐和状态 - 编辑模式下隐藏 */}
              {!isEditing && (
                <div className="flex items-center gap-4 p-4 bg-[#0B0F19] rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">当前套餐</p>
                    <p className={`text-lg font-bold ${tierLabels[customer.tier].color}`}>
                      {tierLabels[customer.tier].text}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-gray-800" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">状态</p>
                    <span className={`px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-gray-800" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">销售负责人</p>
                    <p className="font-medium">{customer.salesRep}</p>
                  </div>
                </div>
              )}

              {/* 营收数据 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-2xl font-bold text-neon-cyan">
                    ¥{(customer.monthlyRevenue / 10000).toFixed(2)}万
                  </p>
                  <p className="text-sm text-gray-400">月GMV</p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-2xl font-bold text-neon-purple">
                    ¥{(customer.totalRevenue / 10000).toFixed(1)}万
                  </p>
                  <p className="text-sm text-gray-400">累计GMV</p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-2xl font-bold text-neon-green">
                    {customer.totalOrders}
                  </p>
                  <p className="text-sm text-gray-400">总订单数</p>
                </div>
              </div>

              {/* 快捷数据入口 */}
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('health')}
                  className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <HeartPulse size={16} className="text-neon-green" />
                    健康度评分
                  </div>
                  <p className="text-2xl font-bold text-neon-green">{healthData.totalScore}</p>
                  <p className="text-xs text-gray-500 mt-1">点击查看详情</p>
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <TicketCheck size={16} className="text-neon-cyan" />
                    待处理工单
                  </div>
                  <p className="text-2xl font-bold text-neon-cyan">
                    {customerTickets.filter(t => t.status === 'open' || t.status === 'processing').length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">共{customerTickets.length}个工单</p>
                </button>
                <button
                  onClick={() => setActiveTab('contents')}
                  className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <FileText size={16} className="text-neon-purple" />
                    已发布内容
                  </div>
                  <p className="text-2xl font-bold text-neon-purple">{customerContents.length}</p>
                  <p className="text-xs text-gray-500 mt-1">点击查看列表</p>
                </button>
                <button
                  onClick={() => setActiveTab('finance')}
                  className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <TrendingUp size={16} className="text-neon-amber" />
                    收入趋势
                  </div>
                  <p className="text-2xl font-bold text-neon-amber">↗</p>
                  <p className="text-xs text-gray-500 mt-1">查看财务记录</p>
                </button>
              </div>

              {/* 酒店列表 */}
              <div>
                <p className="text-sm text-gray-400 mb-3">关联酒店</p>
                <div className="space-y-2">
                  {customer.hotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg cursor-pointer hover:bg-[#1E2538]"
                      onClick={() => {
                        setSelectedHotel(hotel);
                        setActiveTab('hotels');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Hotel size={18} className="text-neon-cyan" />
                        <div>
                          <p className="font-medium">{hotel.name}</p>
                          <p className="text-xs text-gray-400">
                            {hotel.city} · {hotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0)}间房
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-neon-green">
                          ¥{hotel.todayRevenue.toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          hotel.currentMode === 'scalper' ? 'bg-neon-red/20 text-neon-red' :
                          hotel.currentMode === 'dynamic' ? 'bg-neon-cyan/20 text-neon-cyan' :
                          'bg-neon-green/20 text-neon-green'
                        }`}>
                          {hotel.currentMode === 'scalper' ? '黄牛' :
                           hotel.currentMode === 'dynamic' ? '动态' : '尾货'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {customer.notes && (
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">备注</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* 酒店详情 Tab */}
          {activeTab === 'hotels' && selectedHotel && (
            <div className="space-y-6">
              {/* 酒店选择器 */}
              <div className="flex gap-2">
                {customer.hotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => setSelectedHotel(hotel)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedHotel.id === hotel.id
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'bg-[#0B0F19] text-gray-400 hover:text-white'
                    }`}
                  >
                    {hotel.name}
                  </button>
                ))}
              </div>

              {/* 酒店概览 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-xl font-bold text-neon-cyan">
                    {selectedHotel.roomTypes.reduce((sum, r) => sum + r.totalInventory, 0)}
                  </p>
                  <p className="text-xs text-gray-400">总房量</p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-xl font-bold text-neon-green">
                    {selectedHotel.occupancyRate}%
                  </p>
                  <p className="text-xs text-gray-400">入住率</p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-xl font-bold text-neon-purple">
                    ¥{selectedHotel.todayRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">今日收入</p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg text-center">
                  <p className="text-xl font-bold text-neon-amber">
                    {selectedHotel.alertCount}
                  </p>
                  <p className="text-xs text-gray-400">待处理预警</p>
                </div>
              </div>

              {/* 库存分布 */}
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Package size={16} className="text-neon-cyan" />
                  库存渠道分布
                </h4>
                <div className="space-y-4">
                  {/* OTA渠道 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">OTA渠道</span>
                      <span className="text-sm text-gray-400">
                        {selectedHotel.inventory.ota.sold}/{selectedHotel.inventory.ota.total}
                        ({Math.round(selectedHotel.inventory.ota.sellThroughRate)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full">
                      <div
                        className="h-2 bg-neon-cyan rounded-full"
                        style={{ width: `${selectedHotel.inventory.ota.sellThroughRate}%` }}
                      />
                    </div>
                  </div>
                  {/* 非标渠道 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">非标渠道（灵活池）</span>
                      <span className="text-sm text-gray-400">
                        {selectedHotel.inventory.flexible.sold}/{selectedHotel.inventory.flexible.maxAllocation} 投放上限
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full">
                      <div
                        className="h-2 bg-neon-purple rounded-full"
                        style={{ width: `${(selectedHotel.inventory.flexible.sold / selectedHotel.inventory.flexible.maxAllocation) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 房型详情 */}
              <div>
                <h4 className="font-medium mb-3">房型配置</h4>
                <div className="space-y-2">
                  {selectedHotel.roomTypes.map((room) => (
                    <div key={room.id} className="p-3 bg-[#0B0F19] rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-sm text-neon-cyan">¥{room.currentPrice}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>底价: ¥{room.floorPrice}</span>
                        <span>天花: ¥{room.ceilingPrice}</span>
                        <span>总库存: {room.totalInventory}间</span>
                        <span>灵活池: {room.flexibleAllocation}间</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 渠道数据 Tab */}
          {activeTab === 'channels' && selectedHotel && (
            <div className="space-y-6">
              {/* 酒店选择器 */}
              <div className="flex gap-2">
                {customer.hotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => setSelectedHotel(hotel)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedHotel.id === hotel.id
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'bg-[#0B0F19] text-gray-400 hover:text-white'
                    }`}
                  >
                    {hotel.name}
                  </button>
                ))}
              </div>

              {/* 平台数据卡片 */}
              <div className="grid grid-cols-3 gap-4">
                {selectedHotel.platformMetrics.map((pm) => {
                  return (
                    <div key={pm.platform} className="p-4 bg-[#0B0F19] rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <PlatformLogo platform={pm.platform} size={24} />
                        <span className="font-medium">{platformNames[pm.platform]}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">发布内容</span>
                          <span>{pm.contentCount}条</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">曝光量</span>
                          <span>{pm.impressions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">点击量</span>
                          <span>{pm.clicks.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">咨询量</span>
                          <span>{pm.inquiries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">转化订单</span>
                          <span className="text-neon-green">{pm.conversions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">渠道收入</span>
                          <span className="text-neon-green">¥{pm.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-800">
                          <span className="text-gray-400">转化率</span>
                          <span className={pm.conversionRate > 1.5 ? 'text-neon-green' : 'text-gray-400'}>
                            {pm.conversionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 平台库存分配 */}
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <h4 className="font-medium mb-4">各平台库存分配</h4>
                <div className="space-y-3">
                  {(Object.keys(selectedHotel.inventory.flexible.platforms) as Platform[]).map((platform) => {
                    const data = selectedHotel.inventory.flexible.platforms[platform];
                    return (
                      <div key={platform} className="flex items-center gap-4">
                        <div className="w-28 flex items-center gap-2">
                          <PlatformLogo platform={platform} size={18} />
                          <span className="text-sm">{platformNames[platform]}</span>
                        </div>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full">
                          <div
                            className="h-2 bg-neon-purple rounded-full"
                            style={{ width: `${(data.sold / data.allocated) * 100}%` }}
                          />
                        </div>
                        <div className="w-32 text-right text-sm">
                          <span className="text-neon-green">{data.sold}</span>
                          <span className="text-gray-400"> / {data.allocated} 已售</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 健康度 Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* 总分卡片 */}
              <div className="p-6 bg-[#0B0F19] rounded-lg">
                <div className="flex items-center gap-8">
                  <CircularProgress
                    value={healthData.totalScore}
                    size={140}
                    strokeWidth={12}
                    color={healthData.totalScore >= 75 ? '#00D4FF' : healthData.totalScore >= 60 ? '#FFB800' : '#FF4757'}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-bold">{healthData.totalScore}</p>
                      <p className="text-xs text-gray-400">总分</p>
                    </div>
                  </CircularProgress>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${healthRating.bgColor} ${healthRating.color}`}>
                        {healthRating.label}
                      </span>
                      <span className="text-gray-400">客户健康度评级</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      基于工单频率、内容合规、收入稳定性和活跃度四个维度综合评估
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="text-gray-400">评级标准：</span>
                      <span className="text-neon-green">优秀(90-100)</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-neon-cyan">良好(75-89)</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-neon-amber">一般(60-74)</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-neon-red">风险(0-59)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 维度详情 */}
              <div className="grid grid-cols-2 gap-4">
                {healthData.details.map((item, index) => {
                  const colors = ['bg-neon-cyan', 'bg-neon-green', 'bg-neon-purple', 'bg-neon-amber'];
                  return (
                    <div key={index} className="p-4 bg-[#0B0F19] rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="text-sm text-gray-500">权重 {item.weight}%</span>
                      </div>
                      <div className="flex items-end gap-3 mb-2">
                        <span className="text-2xl font-bold" style={{ color: item.score >= 75 ? '#00D4FF' : item.score >= 60 ? '#FFB800' : '#FF4757' }}>
                          {item.score}
                        </span>
                        <span className="text-xs text-gray-500 mb-1">{item.desc}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full">
                        <div
                          className={`h-2 ${colors[index]} rounded-full`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 续约风险评估 */}
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-neon-cyan" />
                  续约风险评估
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 w-24">风险等级</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      renewalRisk.riskLevel === 'low' ? 'bg-neon-green/20 text-neon-green' :
                      renewalRisk.riskLevel === 'medium' ? 'bg-neon-amber/20 text-neon-amber' :
                      'bg-neon-red/20 text-neon-red'
                    }`}>
                      {renewalRisk.riskLevel === 'low' ? '低风险' :
                       renewalRisk.riskLevel === 'medium' ? '中风险' : '高风险'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 w-24">到期剩余</span>
                    <span className={renewalRisk.daysUntilExpiry < 30 ? 'text-neon-amber' : ''}>
                      {renewalRisk.daysUntilExpiry} 天
                    </span>
                  </div>
                  {renewalRisk.riskFactors.length > 0 && (
                    <div className="flex items-start gap-4">
                      <span className="text-gray-400 w-24">风险因素</span>
                      <div className="flex flex-wrap gap-2">
                        {renewalRisk.riskFactors.map((factor, idx) => (
                          <span key={idx} className="px-2 py-1 bg-neon-red/10 text-neon-red text-sm rounded">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <span className="text-gray-400 w-24">续约建议</span>
                    <div className="flex-1">
                      <p className="text-sm">{renewalRisk.recommendation}</p>
                      <div className="mt-2 p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                        <p className="text-sm text-neon-cyan flex items-center gap-2">
                          <Gift size={14} />
                          推荐方案: {renewalRisk.suggestedAction}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 工单 Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">历史工单 ({customerTickets.length})</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-neon-amber" />
                    待处理: {customerTickets.filter(t => t.status === 'open').length}
                  </span>
                  <span className="flex items-center gap-1 ml-3">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan" />
                    处理中: {customerTickets.filter(t => t.status === 'processing').length}
                  </span>
                </div>
              </div>

              {customerTickets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <TicketCheck size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无工单记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerTickets.map((ticket) => {
                    const status = ticketStatusLabels[ticket.status];
                    const priority = ticketPriorityLabels[ticket.priority];
                    return (
                      <div key={ticket.id} className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${status.bgColor} ${status.color}`}>
                                {status.text}
                              </span>
                              <span className={`text-xs ${priority.color}`}>
                                优先级: {priority.text}
                              </span>
                              <span className="text-xs text-gray-500">{ticket.type === 'tech' ? '技术' : ticket.type === 'business' ? '业务' : '咨询'}</span>
                            </div>
                            <h5 className="font-medium mb-1">{ticket.title}</h5>
                            <p className="text-sm text-gray-400 line-clamp-2">{ticket.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building2 size={12} />
                                {ticket.hotelName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(ticket.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                              {ticket.assignedToName && (
                                <span className="flex items-center gap-1">
                                  <span className="text-neon-cyan">@{ticket.assignedToName}</span>
                                </span>
                              )}
                              {ticket.messages.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={12} />
                                  {ticket.messages.length}条回复
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {ticket.status === 'resolved' && ticket.rating ? (
                              <div className="flex items-center gap-1 text-neon-green">
                                <ThumbsUp size={14} />
                                <span className="text-sm">{ticket.rating}星</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 内容 Tab */}
          {activeTab === 'contents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">已发布内容 ({customerContents.length})</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-neon-green" />
                    已通过: {customerContents.filter(c => c.status === 'approved').length}
                  </span>
                  <span className="flex items-center gap-1 ml-3">
                    <span className="w-2 h-2 rounded-full bg-neon-amber" />
                    审核中: {customerContents.filter(c => c.status === 'pending').length}
                  </span>
                </div>
              </div>

              {customerContents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无内容记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerContents.map((content) => {
                    const status = contentStatusLabels[content.status];
                    return (
                      <div key={content.id} className="p-4 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <PlatformLogo platform={content.platform} size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${status.bgColor} ${status.color}`}>
                                {status.text}
                              </span>
                              <span className="text-xs text-gray-500">{platformNames[content.platform]}</span>
                              {content.aiScore !== undefined && (
                                <span className={`text-xs ${content.aiScore >= 80 ? 'text-neon-green' : content.aiScore >= 60 ? 'text-neon-amber' : 'text-neon-red'}`}>
                                  AI评分: {content.aiScore}
                                </span>
                              )}
                            </div>
                            <h5 className="font-medium mb-1 truncate">{content.title}</h5>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{content.hotelName}</span>
                              <span>¥{content.price}</span>
                              <span>{content.author}</span>
                              <span>{new Date(content.createdAt).toLocaleDateString('zh-CN')}</span>
                            </div>
                            {/* 统计数据 */}
                            {content.stats && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800 text-xs">
                                <span className="flex items-center gap-1 text-gray-400">
                                  <Eye size={12} />
                                  {content.stats.impressions.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                  <ArrowUpRight size={12} />
                                  {content.stats.clicks.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                  <MessageSquare size={12} />
                                  {content.stats.inquiries}
                                </span>
                                <span className="flex items-center gap-1 text-neon-green">
                                  <CheckCircle size={12} />
                                  {content.stats.conversions}单
                                </span>
                              </div>
                            )}
                            {/* 异常标记 */}
                            {content.anomalies && content.anomalies.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                {content.anomalies.map((anomaly, idx) => (
                                  <span key={idx} className="flex items-center gap-1 text-xs text-neon-red">
                                    <AlertCircle size={12} />
                                    {anomaly.message}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 财务 Tab */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* 财务概览 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">月GMV</p>
                  <p className="text-xl font-bold text-neon-cyan">
                    ¥{(customer.monthlyRevenue / 10000).toFixed(2)}万
                  </p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">累计GMV</p>
                  <p className="text-xl font-bold text-neon-purple">
                    ¥{(customer.totalRevenue / 10000).toFixed(1)}万
                  </p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">平均客单价</p>
                  <p className="text-xl font-bold text-neon-green">
                    ¥{customer.totalOrders > 0 ? Math.round(customer.totalRevenue / customer.totalOrders) : 0}
                  </p>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">累计订单</p>
                  <p className="text-xl font-bold text-neon-amber">
                    {customer.totalOrders}
                  </p>
                </div>
              </div>

              {/* 月收入趋势 */}
              <div className="p-4 bg-[#0B0F19] rounded-lg">
                <h4 className="font-medium mb-4">近6个月收入趋势</h4>
                <div className="flex items-end gap-4 h-40">
                  {financeTrend.map((item, index) => {
                    const maxRevenue = Math.max(...financeTrend.map(d => d.revenue));
                    const height = (item.revenue / maxRevenue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full bg-neon-cyan/30 hover:bg-neon-cyan/50 rounded-t transition-all cursor-pointer relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              ¥{(item.revenue / 10000).toFixed(2)}万
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 消费统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <h4 className="font-medium mb-4">套餐使用时长</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">已使用</span>
                      <span>
                        {Math.ceil((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))} 天
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">到期剩余</span>
                      <span className={renewalRisk.daysUntilExpiry < 30 ? 'text-neon-amber' : ''}>
                        {renewalRisk.daysUntilExpiry} 天
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full mt-2">
                      <div
                        className="h-2 bg-neon-cyan rounded-full"
                        style={{
                          width: `${Math.min(100, (Math.ceil((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)) /
                            (Math.ceil((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + renewalRisk.daysUntilExpiry)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[#0B0F19] rounded-lg">
                  <h4 className="font-medium mb-4">消费排名</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">该客户排名</span>
                      <span className="text-neon-cyan font-bold">前 20%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">同类套餐平均</span>
                      <span>¥{(customer.monthlyRevenue * 0.85 / 10000).toFixed(2)}万/月</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">与平均对比</span>
                      <span className="text-neon-green">+{((customer.monthlyRevenue / (customer.monthlyRevenue * 0.85) - 1) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-600 bg-[#151b2e]">
          {/* 快捷操作 */}
          <div className="flex items-center gap-3">
            {customer.status === 'trial' && (
              <button
                onClick={handleExtendTrial}
                className="flex items-center gap-2 px-4 py-2 bg-neon-amber/20 text-neon-amber border border-neon-amber/50 rounded-lg hover:bg-neon-amber/30 transition-all"
              >
                <RotateCcw size={16} />
                延长试用期
              </button>
            )}
            <button
              onClick={handleInitiateRenewal}
              className="flex items-center gap-2 px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/50 rounded-lg hover:bg-neon-green/30 transition-all"
            >
              <Gift size={16} />
              发起续约
            </button>
            <button
              onClick={handleViewOrder}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all"
            >
              <FileSearch size={16} />
              查看原始订单
            </button>
          </div>

          {/* 关闭按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              关闭
            </button>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg hover:bg-neon-cyan/30 transition-all"
              >
                编辑信息
              </button>
            ) : (
              <>
                <button 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/50 rounded-lg hover:bg-neon-green/30 transition-all"
                >
                  保存修改
                </button>
              </>
            )}
            <button 
              onClick={handleInitiateRenewal}
              className="px-4 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg hover:bg-neon-purple/30 transition-all"
            >
              续费升级
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
