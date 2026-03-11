/**
 * 企业版风控预警
 * 
 * 功能：
 * 1. 实时风险监控看板
 * 2. 风险分类统计（价格/库存/账号/内容）
 * 3. 预警规则配置
 * 4. 历史预警记录
 * 5. 风险趋势分析
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, Bell, Shield,
  DollarSign, Package, UserCircle, FileText,
  Filter, CheckCircle, XCircle, Clock, ChevronDown,
  Settings, Download, AlertOctagon, Building2,
  Users, CheckSquare, Layers, MessageSquare, 
  Target, AlertCircle, Lock, TrendingDown,
  Mail, Phone, MessageCircle, Send,
  BarChart3, BookOpen, X, Lightbulb, TrendingUp, Sparkles, Star
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { riskApi } from '../../api';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 平台配置（统一LOGO和中文名称）
// ============================================
const PLATFORM_CONFIG: Record<string, { name: string; logo: string; color: string }> = {
  xianyu: { name: '闲鱼', logo: '/logos/xianyu.jpg', color: '#FF6B00' },
  xiaohongshu: { name: '小红书', logo: '/logos/xiaohongshu.jpg', color: '#FF2442' },
  wechat: { name: '微信', logo: '/logos/wechat.jpg', color: '#07C160' },
  douyin: { name: '抖音', logo: '/logos/douyin.jpg', color: '#000000' },
};

// 获取平台显示组件
const PlatformBadge = ({ platform }: { platform: string }) => {
  const config = PLATFORM_CONFIG[platform];
  if (!config) return <span className="px-1.5 py-0.5 bg-white rounded text-xs text-gray-600 border">{platform}</span>;
  
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white rounded text-xs text-gray-600 border">
      <img src={config.logo} alt={config.name} className="w-3 h-3 object-contain rounded-sm" />
      {config.name}
    </span>
  );
};

// ============================================
// 类型定义
// ============================================

// 扩展风险类型
 type RiskType = 
   // 原有类型
   | 'price' | 'inventory' | 'account' | 'content' | 'compliance'
   // 新增类型
   | 'reputation'      // 舆情风险（差评、投诉）
   | 'competitor'      // 竞品风险（被跟价、被抢流量）
   | 'operation'       // 操作风险（超卖、重复预订）
   | 'financial'       // 财务风险（未开票、退款异常）
   | 'security';       // 安全风险（数据泄露、异常登录）

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

// 完整工作流状态
type RiskStatus = 
  | 'detected'      // 刚发现
  | 'confirmed'     // 已确认
  | 'assigned'      // 已分派
  | 'processing'    // 处理中
  | 'escalated'     // 已升级
  | 'resolved'      // 已解决
  | 'verified'      // 已验证
  | 'ignored'       // 已忽略
  | 'closed';       // 已关闭

// 风险影响评估
interface RiskImpact {
  revenueImpact: number;      // 预计收入影响（元）
  customerImpact: number;     // 预计影响客户数
  reputationScore: number;    // 声誉风险评分（0-100）
  timeToResolve: number;      // 建议解决时间（分钟）
  affectedChannels: string[]; // 影响渠道列表
}

// 风险关联分析
interface RiskRelation {
  relatedAlertIds: string[];  // 关联的风险ID
  rootCause?: string;         // 根因分析
  cascadeEffect: boolean;     // 是否有连锁效应
  riskCluster?: string;       // 风险聚类ID
}

// 处理记录
interface RiskAction {
  type: 'confirm' | 'assign' | 'comment' | 'escalate' | 'resolve' | 'verify' | 'ignore';
  user: string;
  timestamp: string;
  note: string;
  attachments?: string[];
}

interface RiskAlert {
  id: string;
  hotelId: string;
  hotelName: string;
  type: RiskType;
  level: RiskLevel;
  title: string;
  description: string;
  status: RiskStatus;
  createdAt: string;
  resolvedAt?: string;
  assignee?: string;
  autoResolved: boolean;
  
  // 新增字段
  impact: RiskImpact;         // 风险影响评估
  relation: RiskRelation;     // 风险关联分析
  actions: RiskAction[];      // 处理记录
  
  // P1: 通知升级机制
  notifications: RiskNotification[];  // 通知记录
  escalations: RiskEscalation[];      // 升级记录
  nextEscalationAt?: string;          // 下次升级时间
}

// 通知渠道
type NotificationChannel = 'app' | 'sms' | 'email' | 'dingtalk' | 'phone';

// 风险通知
interface RiskNotification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  sentAt: string;
  content: string;
  read: boolean;
}

// 升级记录
interface RiskEscalation {
  level: number;              // 升级层级
  from: string;               // 升级前负责人
  to: string;                 // 升级后负责人
  reason: string;             // 升级原因
  escalatedAt: string;        // 升级时间
  autoEscalated: boolean;     // 是否自动升级
}

// 通知规则配置
interface NotificationRule {
  riskLevel: RiskLevel;
  channels: NotificationChannel[];
  immediate: boolean;         // 是否立即通知
  delay: number;              // 延迟通知（分钟）
  repeatInterval?: number;    // 重复通知间隔（分钟）
  
  // 升级规则
  escalationRules: {
    level: number;            // 升级层级
    afterMinutes: number;     // 多久未处理升级
    to: string[];             // 升级给谁
    message: string;
    channels: NotificationChannel[];
  }[];
}

// 默认通知规则
const DEFAULT_NOTIFICATION_RULES: Record<RiskLevel, NotificationRule> = {
  critical: {
    riskLevel: 'critical',
    channels: ['app', 'sms', 'phone'],
    immediate: true,
    delay: 0,
    repeatInterval: 15,
    escalationRules: [
      { level: 1, afterMinutes: 15, to: ['风控主管'], message: '严重风险15分钟未处理', channels: ['app', 'sms', 'phone'] },
      { level: 2, afterMinutes: 60, to: ['运营总监'], message: '严重风险1小时未处理', channels: ['app', 'sms', 'phone'] },
      { level: 3, afterMinutes: 240, to: ['总经理'], message: '严重风险4小时未处理', channels: ['app', 'sms', 'phone'] },
    ],
  },
  high: {
    riskLevel: 'high',
    channels: ['app', 'sms'],
    immediate: true,
    delay: 5,
    repeatInterval: 30,
    escalationRules: [
      { level: 1, afterMinutes: 60, to: ['风控主管'], message: '高危风险1小时未处理', channels: ['app', 'sms'] },
      { level: 2, afterMinutes: 240, to: ['运营总监'], message: '高危风险4小时未处理', channels: ['app', 'sms'] },
    ],
  },
  medium: {
    riskLevel: 'medium',
    channels: ['app'],
    immediate: false,
    delay: 30,
    repeatInterval: 60,
    escalationRules: [
      { level: 1, afterMinutes: 240, to: ['风控主管'], message: '中危风险4小时未处理', channels: ['app'] },
    ],
  },
  low: {
    riskLevel: 'low',
    channels: ['app'],
    immediate: false,
    delay: 60,
    escalationRules: [],
  },
}

// ============================================
// 配置
// ============================================
const riskTypeConfig: Record<RiskType, { name: string; color: string; bgColor: string; icon: any }> = {
  // 原有类型
  price: { name: '价格异常', color: '#EF4444', bgColor: '#FEF2F2', icon: DollarSign },
  inventory: { name: '库存风险', color: '#F59E0B', bgColor: '#FFFBEB', icon: Package },
  account: { name: '账号异常', color: '#8B5CF6', bgColor: '#F5F3FF', icon: UserCircle },
  content: { name: '内容合规', color: '#3B82F6', bgColor: '#EFF6FF', icon: FileText },
  compliance: { name: '经营合规', color: '#10B981', bgColor: '#F0FDF4', icon: Shield },
  // 新增类型
  reputation: { name: '舆情风险', color: '#EC4899', bgColor: '#FDF2F8', icon: MessageSquare },
  competitor: { name: '竞品风险', color: '#F97316', bgColor: '#FFF7ED', icon: Target },
  operation: { name: '操作风险', color: '#6366F1', bgColor: '#EEF2FF', icon: AlertCircle },
  financial: { name: '财务风险', color: '#14B8A6', bgColor: '#F0FDFA', icon: TrendingDown },
  security: { name: '安全风险', color: '#DC2626', bgColor: '#FEF2F2', icon: Lock },
};

// 风险状态配置
const riskStatusConfig: Record<RiskStatus, { name: string; color: string; bgColor: string; badge: string; selectable: boolean }> = {
  detected: { name: '待确认', color: '#DC2626', bgColor: '#FEE2E2', badge: 'bg-red-100 text-red-700', selectable: true },
  confirmed: { name: '已确认', color: '#EA580C', bgColor: '#FFEDD5', badge: 'bg-orange-100 text-orange-700', selectable: true },
  assigned: { name: '已分派', color: '#3B82F6', bgColor: '#EFF6FF', badge: 'bg-blue-100 text-blue-700', selectable: true },
  processing: { name: '处理中', color: '#8B5CF6', bgColor: '#F5F3FF', badge: 'bg-purple-100 text-purple-700', selectable: true },
  escalated: { name: '已升级', color: '#DC2626', bgColor: '#FEE2E2', badge: 'bg-red-100 text-red-700', selectable: true },
  resolved: { name: '已解决', color: '#10B981', bgColor: '#F0FDF4', badge: 'bg-green-100 text-green-700', selectable: false },
  verified: { name: '已验证', color: '#059669', bgColor: '#F0FDF4', badge: 'bg-green-100 text-green-700', selectable: false },
  ignored: { name: '已忽略', color: '#6B7280', bgColor: '#F3F4F6', badge: 'bg-gray-100 text-gray-700', selectable: false },
  closed: { name: '已关闭', color: '#374151', bgColor: '#F3F4F6', badge: 'bg-gray-100 text-gray-700', selectable: false },
};

const riskLevelConfig: Record<RiskLevel, { name: string; color: string; bgColor: string; badge: string }> = {
  critical: { name: '严重', color: '#DC2626', bgColor: '#FEE2E2', badge: 'bg-red-600 text-white' },
  high: { name: '高危', color: '#EA580C', bgColor: '#FFEDD5', badge: 'bg-orange-500 text-white' },
  medium: { name: '中危', color: '#D97706', bgColor: '#FEF3C7', badge: 'bg-amber-500 text-white' },
  low: { name: '低危', color: '#6B7280', bgColor: '#F3F4F6', badge: 'bg-gray-500 text-white' },
};

// ============================================
// P2: 风险预测
// ============================================
interface RiskPrediction {
  id: string;
  riskType: RiskType;
  probability: number;        // 发生概率 0-100
  predictedTime: string;      // 预计发生时间
  severity: RiskLevel;        // 预计严重程度
  earlyWarningSignals: string[];  // 预警信号
  
  // 预防措施
  suggestedActions: {
    action: string;
    cost: number;            // 预防成本
    effectiveness: number;   // 预计效果 0-100
    difficulty: 'low' | 'medium' | 'high';
  }[];
  
  // 如果不采取措施
  ifNoAction: {
    expectedLoss: number;    // 预计损失
    probability: number;     // 发生概率
  };
}

// ============================================
// P2: 风险知识库
// ============================================
interface RiskKnowledge {
  id: string;
  pattern: string;              // 风险模式名称
  riskType: RiskType;
  description: string;          // 模式描述
  frequency: number;            // 发生频次（月）
  avgDetectionTime: number;     // 平均发现时间（分钟）
  avgResolutionTime: number;    // 平均解决时间（分钟）
  
  // 最佳实践
  bestPractices: {
    scenario: string;
    solution: string;
    steps: string[];
    responsible: string[];
    tools: string[];
  }[];
  
  // 常见问题
  faqs: {
    question: string;
    answer: string;
  }[];
  
  // 相似案例
  similarCases: {
    caseId: string;
    title: string;
    outcome: 'success' | 'partial' | 'failed';
    lesson: string;
  }[];
}


// ============================================
// 模拟数据
// ============================================
const generateMockAlerts = (hotels: any[]): RiskAlert[] => {
  const alerts: RiskAlert[] = [
    {
      id: 'risk-001',
      hotelId: hotels[0]?.id || 'h1',
      hotelName: hotels[0]?.name || '北京三里屯店',
      type: 'price',
      level: 'critical',
      title: '房价低于成本价',
      description: '大床房当前售价¥280，低于成本价¥320，建议立即调整',
      status: 'detected',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      autoResolved: false,
      impact: {
        revenueImpact: 50000,
        customerImpact: 120,
        reputationScore: 75,
        timeToResolve: 180,
        affectedChannels: ['xianyu', 'xiaohongshu', 'wechat'],
      },
      relation: {
        relatedAlertIds: ['risk-002', 'risk-006'],
        rootCause: '竞品降价导致被迫跟进',
        cascadeEffect: true,
        riskCluster: 'cluster-2024-03-07-price',
      },
      actions: [],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '定价专员', sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), content: '【严重】房价低于成本价', read: false },
        { id: 'n2', channel: 'sms', recipient: '定价专员', sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), content: '【Shadow-Bees】严重价格风险，请立即处理', read: false },
        { id: 'n3', channel: 'app', recipient: '风控主管', sentAt: new Date(Date.now() - 105 * 60 * 1000).toISOString(), content: '【升级预警】价格风险15分钟未处理，即将升级', read: false },
      ],
      escalations: [],
      nextEscalationAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 已过期45分钟，应已触发升级
    },
    {
      id: 'risk-002',
      hotelId: hotels[0]?.id || 'h1',
      hotelName: hotels[0]?.name || '北京三里屯店',
      type: 'inventory',
      level: 'high',
      title: '库存紧张预警',
      description: '未来3天房源剩余不足10%，建议关闭促销或提高价格',
      status: 'assigned',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      assignee: '运营专员A',
      autoResolved: false,
      impact: {
        revenueImpact: 30000,
        customerImpact: 50,
        reputationScore: 60,
        timeToResolve: 360,
        affectedChannels: ['wechat', 'xianyu'],
      },
      relation: {
        relatedAlertIds: ['risk-001'],
        rootCause: '预订量激增导致库存不足',
        cascadeEffect: true,
        riskCluster: 'cluster-2024-03-07-inventory',
      },
      actions: [
        { type: 'confirm', user: '系统', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), note: '风险已确认' },
        { type: 'assign', user: '系统', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), note: '指派给运营专员A' },
      ],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '运营专员A', sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), content: '【库存风险】您有新的风险待处理', read: true },
      ],
      escalations: [],
      nextEscalationAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 已过期，应触发升级
    },
    {
      id: 'risk-003',
      hotelId: hotels[1]?.id || 'h2',
      hotelName: hotels[1]?.name || '北京国贸店',
      type: 'security',
      level: 'critical',
      title: '闲鱼账号登录异常',
      description: '账号在异地登录，IP地址：113.45.XX.XX，可能存在安全风险',
      status: 'processing',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      assignee: '安全专员C',
      autoResolved: false,
      impact: {
        revenueImpact: 0,
        customerImpact: 0,
        reputationScore: 90,
        timeToResolve: 60,
        affectedChannels: ['xianyu'],
      },
      relation: {
        relatedAlertIds: [],
        cascadeEffect: false,
      },
      actions: [
        { type: 'confirm', user: '系统', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), note: '风险已确认' },
        { type: 'assign', user: '风控主管', timestamp: new Date(Date.now() - 7.5 * 60 * 60 * 1000).toISOString(), note: '紧急指派给安全专员C' },
        { type: 'comment', user: '安全专员C', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), note: '正在联系平台核实登录情况' },
      ],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '安全专员C', sentAt: new Date(Date.now() - 7.5 * 60 * 60 * 1000).toISOString(), content: '【安全风险】紧急：账号异常登录', read: true },
        { id: 'n2', channel: 'sms', recipient: '安全专员C', sentAt: new Date(Date.now() - 7.5 * 60 * 60 * 1000).toISOString(), content: '【Shadow-Bees】紧急安全风险，请立即处理', read: false },
      ],
      escalations: [],
      nextEscalationAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分钟后升级
    },
    {
      id: 'risk-004',
      hotelId: hotels[2]?.id || 'h3',
      hotelName: hotels[2]?.name || '上海外滩店',
      type: 'reputation',
      level: 'high',
      title: '小红书差评舆情',
      description: '近24小时出现3条差评，涉及卫生问题，需及时跟进',
      status: 'escalated',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      assignee: '客服主管D',
      autoResolved: false,
      impact: {
        revenueImpact: 15000,
        customerImpact: 80,
        reputationScore: 85,
        timeToResolve: 120,
        affectedChannels: ['xiaohongshu'],
      },
      relation: {
        relatedAlertIds: [],
        cascadeEffect: false,
      },
      actions: [
        { type: 'confirm', user: '系统', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), note: '风险已确认' },
        { type: 'assign', user: '系统', timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), note: '指派给客服专员' },
        { type: 'escalate', user: '客服专员', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), note: '涉及卫生问题，升级到客服主管' },
      ],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '客服专员', sentAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), content: '【舆情风险】有新的差评舆情待处理', read: true },
        { id: 'n2', channel: 'app', recipient: '客服主管D', sentAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), content: '【升级通知】舆情风险已升级给您', read: true },
        { id: 'n3', channel: 'sms', recipient: '客服主管D', sentAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), content: '【Shadow-Bees】舆情风险已升级，请关注', read: false },
      ],
      escalations: [
        { level: 1, from: '客服专员', to: '客服主管D', reason: '涉及卫生问题，超出客服专员处理权限', escalatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), autoEscalated: false },
      ],
      nextEscalationAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'risk-005',
      hotelId: hotels[0]?.id || 'h1',
      hotelName: hotels[0]?.name || '北京三里屯店',
      type: 'financial',
      level: 'high',
      title: '未开票订单过多',
      description: '过去7天有15笔订单未开具发票，占比23%，存在合规风险',
      status: 'assigned',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      assignee: '财务专员B',
      autoResolved: false,
      impact: {
        revenueImpact: 8000,
        customerImpact: 15,
        reputationScore: 40,
        timeToResolve: 480,
        affectedChannels: ['wechat', 'xianyu'],
      },
      relation: {
        relatedAlertIds: [],
        cascadeEffect: false,
      },
      actions: [
        { type: 'confirm', user: '系统', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), note: '风险已确认' },
        { type: 'assign', user: '系统', timestamp: new Date(Date.now() - 11.5 * 60 * 60 * 1000).toISOString(), note: '指派给财务专员B' },
      ],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '财务专员B', sentAt: new Date(Date.now() - 11.5 * 60 * 60 * 1000).toISOString(), content: '【财务风险】未开票订单过多，请处理', read: true },
      ],
      escalations: [],
      nextEscalationAt: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'risk-006',
      hotelId: hotels[3]?.id || 'h4',
      hotelName: hotels[3]?.name || '广州天河店',
      type: 'competitor',
      level: 'medium',
      title: '竞品降价跟进提醒',
      description: '周边3家竞品酒店降价10-15%，建议关注并评估跟进策略',
      status: 'verified',
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      autoResolved: false,
      impact: {
        revenueImpact: 20000,
        customerImpact: 60,
        reputationScore: 30,
        timeToResolve: 720,
        affectedChannels: ['xianyu', 'xiaohongshu'],
      },
      relation: {
        relatedAlertIds: ['risk-001'],
        rootCause: '竞品促销活动',
        cascadeEffect: false,
        riskCluster: 'cluster-2024-03-07-price',
      },
      actions: [
        { type: 'confirm', user: '系统', timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), note: '风险已确认' },
        { type: 'assign', user: '系统', timestamp: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(), note: '指派给定价专员' },
        { type: 'resolve', user: '定价专员', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), note: '已评估，决定不跟进降价，保持原价策略' },
        { type: 'verify', user: '运营经理', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), note: '审核通过，关闭风险' },
      ],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '定价专员', sentAt: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(), content: '【竞品风险】竞品降价跟进提醒', read: true },
        { id: 'n2', channel: 'app', recipient: '运营经理', sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), content: '【待验证】竞品风险已解决，请验证', read: true },
      ],
      escalations: [],
      nextEscalationAt: undefined,
    },
    {
      id: 'risk-007',
      hotelId: hotels[0]?.id || 'h1',
      hotelName: hotels[0]?.name || '北京三里屯店',
      type: 'operation',
      level: 'critical',
      title: '超卖风险预警',
      description: '大床房实际库存10间，但各渠道已售12间，存在超卖风险',
      status: 'detected',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      autoResolved: false,
      impact: {
        revenueImpact: 800,
        customerImpact: 2,
        reputationScore: 95,
        timeToResolve: 30,
        affectedChannels: ['wechat', 'xianyu'],
      },
      relation: {
        relatedAlertIds: ['risk-002'],
        rootCause: '库存同步延迟导致',
        cascadeEffect: true,
      },
      actions: [],
      notifications: [
        { id: 'n1', channel: 'app', recipient: '运营主管', sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), content: '【紧急】超卖风险预警', read: false },
        { id: 'n2', channel: 'sms', recipient: '运营主管', sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), content: '【Shadow-Bees】紧急：超卖风险，请立即处理', read: false },
        { id: 'n3', channel: 'phone', recipient: '运营主管', sentAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), content: '电话通知', read: false },
      ],
      escalations: [],
      nextEscalationAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1小时后升级
    },
  ];
  return alerts;
};

// ============================================
// 主组件
// ============================================
export default function RiskWarning() {
  const toast = useToast();
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  
  // 状态
  const [selectedTypes] = useState<RiskType[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<RiskLevel[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<RiskStatus | 'all' | 'pending'>('pending');
  const [showFilters, setShowFilters] = useState(false);
  
  // 预警列表状态
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  
  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [batchAssignee, setBatchAssignee] = useState('');
  
  // P1: 通知面板状态
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // P3: 标签切换状态
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'prediction' | 'knowledge'>('dashboard');
  
  // 规则配置弹窗状态
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [notificationRules, setNotificationRules] = useState<Record<RiskLevel, NotificationRule>>(DEFAULT_NOTIFICATION_RULES);
  
  // 知识库弹窗状态
  const [showAllKnowledgeModal, setShowAllKnowledgeModal] = useState(false);
  const [showKnowledgeDetailModal, setShowKnowledgeDetailModal] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<RiskKnowledge | null>(null);
  
  // API 数据状态
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [knowledge, setKnowledge] = useState<RiskKnowledge[]>([]);
  
  // 加载 API 数据 - 当酒店选择变化时重新加载
  useEffect(() => {
    const loadData = async () => {
      try {
        const [predRes, knowRes] = await Promise.all([
          riskApi.getRiskPredictions(),
          riskApi.getRiskKnowledge(),
        ]);
        if (predRes.success) setPredictions(predRes.data.list as unknown as RiskPrediction[]);
        if (knowRes.success) setKnowledge(knowRes.data.list as unknown as RiskKnowledge[]);
      } catch (error) {
        console.error('加载风险数据失败:', error);
      }
    };
    loadData();
  }, [selectedHotels]);
  
  // 定时更新当前时间（用于倒计时）
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // 每分钟更新
    return () => clearInterval(timer);
  }, []);
  
  // 计算倒计时
  const getCountdown = (targetTime: string) => {
    const diff = new Date(targetTime).getTime() - currentTime.getTime();
    if (diff <= 0) return '已超时';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分钟`;
  };

  // 获取选中酒店ID集合（转为Set便于查找）
  const selectedHotelIdSet = useMemo(() => 
    new Set(selectedHotels.map(h => h.id)),
    [selectedHotels]
  );

  // 初始化预警数据
  useEffect(() => {
    setAlerts(generateMockAlerts(hotels));
  }, [hotels]);
  
  // 所有预警（从状态获取）
  const allAlerts = alerts;

  // 需要处理的风险状态
  const pendingStatuses: RiskStatus[] = ['detected', 'confirmed', 'assigned', 'processing', 'escalated'];

  // 筛选数据（只显示选中酒店的风险）
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      if (!selectedHotelIdSet.has(alert.hotelId)) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(alert.type)) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(alert.level)) return false;
      if (selectedStatus === 'pending') {
        return pendingStatuses.includes(alert.status);
      }
      if (selectedStatus !== 'all' && alert.status !== selectedStatus) return false;
      return true;
    });
  }, [allAlerts, selectedHotelIdSet, selectedTypes, selectedLevels, selectedStatus]);

  // 统计（基于选中酒店）
  const stats = useMemo(() => {
    const visibleAlerts = allAlerts.filter(a => selectedHotelIdSet.has(a.hotelId));
    const pending = visibleAlerts.filter(a => pendingStatuses.includes(a.status));
    return {
      total: visibleAlerts.length,
      pending: pending.length,
      critical: pending.filter(a => a.level === 'critical').length,
      high: pending.filter(a => a.level === 'high').length,
      medium: pending.filter(a => a.level === 'medium').length,
      resolved: visibleAlerts.filter(a => ['resolved', 'verified', 'closed'].includes(a.status)).length,
    };
  }, [allAlerts, selectedHotelIds]);

  // 按类型统计（待处理）
  const typeStats = useMemo(() => {
    const stats: Record<RiskType, number> = {
      price: 0, inventory: 0, account: 0, content: 0, compliance: 0,
      reputation: 0, competitor: 0, operation: 0, financial: 0, security: 0
    };
    allAlerts.filter(a => selectedHotelIdSet.has(a.hotelId) && pendingStatuses.includes(a.status)).forEach(a => {
      stats[a.type]++;
    });
    return stats;
  }, [allAlerts, selectedHotelIds]);

  // 处理单个预警
  const handleResolve = async (alertId: string, note?: string) => {
    try {
      const res = await riskApi.resolveRiskAlert(alertId, note);
      if (res.success) {
        // 更新本地状态
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'resolved' as RiskStatus, resolvedAt: new Date().toISOString() }
            : alert
        ));
        toast.success('预警已处理');
      } else {
        console.error('处理预警失败:', res.message);
        toast.error('处理失败: ' + res.message);
      }
    } catch (error) {
      console.error('处理预警出错:', error);
      toast.error('处理出错');
    }
  };

  const handleIgnore = async (alertId: string, reason?: string) => {
    try {
      const res = await riskApi.ignoreRiskAlert(alertId, reason);
      if (res.success) {
        // 更新本地状态
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'ignored' as RiskStatus }
            : alert
        ));
        toast.success('预警已忽略');
      } else {
        console.error('忽略预警失败:', res.message);
        toast.error('忽略失败: ' + res.message);
      }
    } catch (error) {
      console.error('忽略预警出错:', error);
      toast.error('忽略出错');
    }
  };

  // 批量操作
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = filteredAlerts
      .filter(a => pendingStatuses.includes(a.status))
      .map(a => a.id);
    if (selectedAlerts.size === selectable.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(selectable));
    }
  };

  const handleBatchResolve = async () => {
    if (confirm(`确定要批量处理选中的 ${selectedAlerts.size} 个预警吗？`)) {
      try {
        const alertIds = Array.from(selectedAlerts);
        const res = await riskApi.batchResolveRiskAlerts(alertIds);
        if (res.success) {
          // TODO: 刷新风险预警列表或更新本地状态
          console.log('批量处理成功:', res.data?.resolvedIds);
          setSelectedAlerts(new Set());
          setBatchMode(false);
        } else {
          console.error('批量处理失败:', res.message);
        }
      } catch (error) {
        console.error('批量处理出错:', error);
      }
    }
  };

  const handleBatchIgnore = async () => {
    if (confirm(`确定要批量忽略选中的 ${selectedAlerts.size} 个预警吗？`)) {
      try {
        const alertIds = Array.from(selectedAlerts);
        const res = await riskApi.batchIgnoreRiskAlerts(alertIds);
        if (res.success) {
          // TODO: 刷新风险预警列表或更新本地状态
          console.log('批量忽略成功:', res.data?.ignoredIds);
          setSelectedAlerts(new Set());
          setBatchMode(false);
        } else {
          console.error('批量忽略失败:', res.message);
        }
      } catch (error) {
        console.error('批量忽略出错:', error);
      }
    }
  };

  const handleBatchAssign = async () => {
    if (!batchAssignee) return;
    try {
      const alertIds = Array.from(selectedAlerts);
      const res = await riskApi.batchAssignRiskAlerts(alertIds, batchAssignee);
      if (res.success) {
        // TODO: 刷新风险预警列表或更新本地状态
        console.log('批量分派成功:', res.data?.assignedIds);
        setSelectedAlerts(new Set());
        setShowBatchAssignModal(false);
        setBatchMode(false);
      } else {
        console.error('批量分派失败:', res.message);
      }
    } catch (error) {
      console.error('批量分派出错:', error);
    }
  };

  // 处理导出
  const handleExport = async () => {
    try {
      const hotelIds = Array.from(selectedHotelIds);
      const res = await riskApi.exportRiskAlerts({ 
        hotelIds,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });
      if (res.success && res.data?.downloadUrl) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = res.data.downloadUrl;
        link.download = `risk-alerts-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('导出成功:', res.data.downloadUrl);
      } else {
        console.error('导出失败:', res.message);
      }
    } catch (error) {
      console.error('导出出错:', error);
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diff < 1) return '刚刚';
    if (diff < 24) return `${diff}小时前`;
    return `${Math.floor(diff / 24)}天前`;
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看风控预警</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          风控预警需要选择至少一家酒店才能查看。<br/>
          支持多酒店风险数据汇总与批量处理。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  // 标签配置
  const tabs = [
    { id: 'dashboard', label: '数据大屏', icon: BarChart3, count: null },
    { id: 'alerts', label: '风险预警', icon: AlertTriangle, count: stats.pending },
    { id: 'prediction', label: '风险预测', icon: Target, count: predictions.length },
    { id: 'knowledge', label: '知识库', icon: Shield, count: knowledge.length },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">风控预警</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `查看 ${selectedHotels[0].name} 的风险预警`
              : `汇总 ${selectedHotels.length} 家酒店的风险预警`
            }
            {stats.pending > 0 && ` · ${stats.pending} 个待处理，${stats.critical} 个严重`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 批量模式切换（仅在风险预警标签显示） */}
          {activeTab === 'alerts' && (
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                if (batchMode) setSelectedAlerts(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                batchMode 
                  ? 'bg-violet-100 text-violet-700 border border-violet-200' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm">{batchMode ? '退出批量' : '批量处理'}</span>
            </button>
          )}

          {/* 状态筛选 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as RiskStatus | 'all' | 'pending')}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="pending">待处理</option>
            <option value="all">全部状态</option>
            {(Object.keys(riskStatusConfig) as RiskStatus[]).map(status => (
              <option key={status} value={status}>
                {riskStatusConfig[status].name}
              </option>
            ))}
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

          {/* 设置按钮 */}
          <button 
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">规则配置</span>
          </button>
        </div>
      </div>

      {/* P3: 标签导航 */}
      <div className="bg-white rounded-xl border border-gray-200 p-1">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 批量操作栏 */}
      {batchMode && selectedAlerts.size > 0 && (
        <div className="bg-violet-50 p-4 rounded-xl border border-violet-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-600" />
            <span className="text-violet-900 font-medium">
              已选择 {selectedAlerts.size} 个预警
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchAssignModal(true)}
              className="px-4 py-2 bg-white text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              批量分派
            </button>
            <button
              onClick={handleBatchResolve}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              批量处理
            </button>
            <button
              onClick={handleBatchIgnore}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              批量忽略
            </button>
            <button
              onClick={() => setSelectedAlerts(new Set())}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              清空选择
            </button>
          </div>
        </div>
      )}

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* 类型筛选 -->
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">风险类型</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(riskTypeConfig) as RiskType[]).map(type => {
                const config = riskTypeConfig[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedTypes(prev => 
                      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedTypes.includes(type)
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
          
          {/* 级别筛选 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">风险级别</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(riskLevelConfig) as RiskLevel[]).map(level => {
                const config = riskLevelConfig[level];
                return (
                  <button
                    key={level}
                    onClick={() => setSelectedLevels(prev => 
                      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
                    )}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      selectedLevels.includes(level)
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">预警总数</div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">待处理</div>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <AlertOctagon className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">严重</div>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">高危</div>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-amber-600">{stats.medium}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">中危</div>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">已解决</div>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 按类型分布 */}
      <div className="grid grid-cols-5 gap-4">
        {(Object.keys(riskTypeConfig) as RiskType[]).map(type => {
          const config = riskTypeConfig[type];
          const count = typeStats[type];
          return (
            <div key={type} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: config.bgColor }}
                >
                  <config.icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500">{config.name}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* P3: 可视化大屏 - 风控驾驶舱（浅色版） */}
      {activeTab === 'dashboard' && (
      <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 rounded-xl border border-violet-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">风控驾驶舱</h3>
              <p className="text-sm text-gray-500">实时风险监控与趋势分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              实时更新
            </span>
            <select className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-1.5">
              <option>近7天</option>
              <option>近30天</option>
              <option>近90天</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* 核心指标 */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <div className="text-gray-500 text-sm mb-1">风险发现数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-green-600 mt-1">↑ 12% 环比</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <div className="text-gray-500 text-sm mb-1">平均响应时间</div>
            <div className="text-2xl font-bold text-gray-900">18分钟</div>
            <div className="text-xs text-green-600 mt-1">↓ 5分钟 优化</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <div className="text-gray-500 text-sm mb-1">解决率</div>
            <div className="text-2xl font-bold text-gray-900">94.5%</div>
            <div className="text-xs text-green-600 mt-1">↑ 3.2% 提升</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <div className="text-gray-500 text-sm mb-1">预估止损</div>
            <div className="text-2xl font-bold text-gray-900">¥128万</div>
            <div className="text-xs text-green-600 mt-1">本月累计</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* 风险趋势图 */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm col-span-2">
            <h4 className="text-sm font-medium text-gray-700 mb-4">风险趋势（近7天）</h4>
            <div className="h-40 flex items-end gap-2">
              {[
                { day: '03-01', total: 8, critical: 1, high: 2 },
                { day: '03-02', total: 12, critical: 2, high: 3 },
                { day: '03-03', total: 6, critical: 0, high: 1 },
                { day: '03-04', total: 15, critical: 3, high: 4 },
                { day: '03-05', total: 10, critical: 1, high: 2 },
                { day: '03-06', total: 7, critical: 0, high: 2 },
                { day: '03-07', total: stats.pending, critical: stats.critical, high: stats.high },
              ].map((d, i) => {
                const maxTotal = 20;
                const totalHeight = (d.total / maxTotal) * 100;
                const criticalHeight = (d.critical / maxTotal) * 100;
                const highHeight = (d.high / maxTotal) * 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-32">
                      <div 
                        className="flex-1 bg-red-500 rounded-t"
                        style={{ height: `${criticalHeight}%` }}
                        title={`严重: ${d.critical}`}
                      />
                      <div 
                        className="flex-1 bg-orange-500 rounded-t"
                        style={{ height: `${highHeight}%` }}
                        title={`高危: ${d.high}`}
                      />
                      <div 
                        className="flex-1 bg-gray-300 rounded-t"
                        style={{ height: `${Math.max(0, totalHeight - criticalHeight - highHeight)}%` }}
                        title={`其他: ${d.total - d.critical - d.high}`}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />严重
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded" />高危
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 rounded" />其他
              </div>
            </div>
          </div>

          {/* 风险热力图 - 按酒店 */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <h4 className="text-sm font-medium text-gray-700 mb-4">酒店风险热力图</h4>
            <div className="space-y-3">
              {selectedHotels.slice(0, 5).map((hotel) => {
                const hotelAlerts = allAlerts.filter(a => a.hotelId === hotel.id && pendingStatuses.includes(a.status));
                const criticalCount = hotelAlerts.filter(a => a.level === 'critical').length;
                const highCount = hotelAlerts.filter(a => a.level === 'high').length;
                const totalCount = hotelAlerts.length;
                
                const heatScore = Math.min(100, (criticalCount * 40 + highCount * 20 + totalCount * 5));
                const heatColor = heatScore >= 80 ? 'bg-red-500' : heatScore >= 60 ? 'bg-orange-500' : heatScore >= 40 ? 'bg-yellow-500' : 'bg-green-500';
                
                return (
                  <div key={hotel.id} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-700 truncate">{hotel.name}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${heatColor} transition-all`}
                        style={{ width: `${heatScore}%` }}
                      />
                    </div>
                    <div className="w-8 text-xs text-right text-gray-400">{totalCount}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
              <span>低风险</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 bg-green-500 rounded" />
                <div className="w-4 h-2 bg-yellow-500 rounded" />
                <div className="w-4 h-2 bg-orange-500 rounded" />
                <div className="w-4 h-2 bg-red-500 rounded" />
              </div>
              <span>高风险</span>
            </div>
          </div>
        </div>

        {/* 团队绩效 */}
        <div className="mt-4 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-4">团队处理绩效（本月）</h4>
          <div className="grid grid-cols-5 gap-4">
            {[
              { name: '运营专员A', handled: 45, avgTime: '15分钟', satisfaction: 4.8 },
              { name: '财务专员B', handled: 32, avgTime: '22分钟', satisfaction: 4.9 },
              { name: '安全专员C', handled: 28, avgTime: '12分钟', satisfaction: 4.7 },
              { name: '客服主管D', handled: 38, avgTime: '18分钟', satisfaction: 4.6 },
              { name: '风控主管', handled: 52, avgTime: '10分钟', satisfaction: 4.9 },
            ].map((person, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-sm font-medium text-violet-700">
                    {person.name.slice(-2)}
                  </div>
                  <div className="text-sm font-medium text-gray-900">{person.name}</div>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>处理量</span>
                    <span className="font-medium text-gray-900">{person.handled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均时效</span>
                    <span className="font-medium text-gray-900">{person.avgTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>满意度</span>
                    <span className="text-amber-500 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {person.satisfaction}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* P2: 风险预测区域 */}
      {activeTab === 'prediction' && (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> 风险预测</h3>
              <p className="text-sm text-gray-500">基于历史数据和趋势分析，提前发现潜在风险</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
            {predictions.length} 个预测
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {predictions.map(pred => {
            const typeConfig = riskTypeConfig[pred.riskType] || { name: '未知类型', color: '#6B7280', bgColor: '#F3F4F6', icon: AlertCircle };
            const daysUntilRaw = Math.ceil((new Date(pred.predictedTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const daysUntil = isNaN(daysUntilRaw) ? 0 : daysUntilRaw;
            
            return (
              <div key={pred.id} className="bg-white rounded-lg border border-amber-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                    >
                      {typeConfig.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      pred.probability >= 80 ? 'bg-red-100 text-red-700' :
                      pred.probability >= 60 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      概率 {pred.probability}%
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{daysUntil <= 0 ? '即将发生' : `${daysUntil}天后`}</span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    预警信号
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(pred.earlyWarningSignals || []).slice(0, 3).map((signal, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        <span className="line-clamp-1">{signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">预计损失:</span>
                    <span className="font-medium text-red-600">
                          {pred.ifNoAction?.expectedLoss ? `¥${pred.ifNoAction.expectedLoss.toLocaleString()}` : '待定'}
                        </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(pred.suggestedActions || []).slice(0, 2).map((action, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          try {
                            const res = await riskApi.applyPredictionAction(pred.id, action.action);
                            if (res.success) {
                              console.log('建议操作已应用:', action.action);
                              // TODO: 刷新预测列表或显示成功提示
                            } else {
                              console.error('应用建议操作失败:', res.message);
                            }
                          } catch (error) {
                            console.error('应用建议操作出错:', error);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                      >
                        {action.action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* P2: 风险知识库 */}
      {activeTab === 'knowledge' && (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-600" />
                风险知识库
              </h3>
              <p className="text-sm text-gray-500">沉淀处理经验，提升风险应对效率</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAllKnowledgeModal(true)}
            className="text-sm text-violet-600 hover:underline"
          >
            查看全部
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {knowledge.map(knowledge => {
            const typeConfig = riskTypeConfig[knowledge.riskType] || { name: '未知类型', color: '#6B7280', bgColor: '#F3F4F6', icon: AlertCircle };
            
            return (
              <div key={knowledge.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                      >
                        {typeConfig.name}
                      </span>
                      <span className="text-xs text-gray-400">月均{knowledge.frequency}次</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mt-2">{knowledge.pattern}</h4>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{knowledge.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <div>
                    <span className="text-gray-400">发现:</span> {knowledge.avgDetectionTime}分钟
                  </div>
                  <div>
                    <span className="text-gray-400">解决:</span> {knowledge.avgResolutionTime}分钟
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">最佳实践:</div>
                  {(knowledge.bestPractices || []).slice(0, 1).map((bp, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      <div className="font-medium">{bp.scenario}</div>
                      <div className="text-xs text-gray-500 mt-1">{bp.solution}</div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedKnowledge(knowledge);
                    setShowKnowledgeDetailModal(true);
                  }}
                  className="mt-3 text-xs text-violet-600 hover:underline"
                >
                  查看完整方案 ({(knowledge.bestPractices || []).length}个)
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 预警列表 */}
      {activeTab === 'alerts' && (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {batchMode && (
              <button
                onClick={toggleSelectAll}
                className="text-sm text-violet-600 hover:text-violet-700"
              >
                {selectedAlerts.size === filteredAlerts.filter(a => pendingStatuses.includes(a.status)).length 
                  ? '取消全选' 
                  : '全选'}
              </button>
            )}
            <h3 className="font-semibold text-gray-900">预警列表</h3>
            <span className="text-sm text-gray-500">({filteredAlerts.length})</span>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredAlerts.map(alert => {
            const typeConfig = riskTypeConfig[alert.type] || { name: '未知类型', color: '#6B7280', bgColor: '#F3F4F6', icon: AlertCircle };
            const levelConfig = riskLevelConfig[alert.level];
            const statusConfig = riskStatusConfig[alert.status];
            
            const isSelected = selectedAlerts.has(alert.id);
            const canSelect = pendingStatuses.includes(alert.status);
            
            return (
              <div 
                key={alert.id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-violet-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 批量选择复选框 */}
                  {batchMode && canSelect && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAlertSelection(alert.id)}
                      className="mt-1 w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                    />
                  )}
                  
                  <div className="flex-1">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${levelConfig.badge}`}>
                        {levelConfig.name}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                      >
                        {typeConfig.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.badge}`}>
                        {statusConfig.name}
                      </span>
                      <span className="text-sm text-gray-500">{alert.hotelName}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(alert.createdAt)}
                      </span>
                    </div>
                    
                    {/* 标题和描述 */}
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                    
                    {/* 风险影响评估 */}
                    {alert.impact && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-2">风险影响评估</div>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">收入影响:</span>
                            <span className="ml-1 font-medium text-red-600">¥{alert.impact.revenueImpact.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">影响客户:</span>
                            <span className="ml-1 font-medium text-orange-600">{alert.impact.customerImpact}人</span>
                          </div>
                          <div>
                            <span className="text-gray-500">声誉风险:</span>
                            <span className={`ml-1 font-medium ${alert.impact.reputationScore >= 80 ? 'text-red-600' : alert.impact.reputationScore >= 60 ? 'text-orange-600' : 'text-yellow-600'}`}>
                              {alert.impact.reputationScore}分
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">建议解决:</span>
                            <span className="ml-1 font-medium text-blue-600">{Math.ceil(alert.impact.timeToResolve / 60)}小时内</span>
                          </div>
                        </div>
                        {alert.impact.affectedChannels.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-gray-500">影响渠道:</span>
                            <div className="flex gap-1">
                              {alert.impact.affectedChannels.map(ch => (
                                <PlatformBadge key={ch} platform={ch} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 关联风险 */}
                    {alert.relation?.relatedAlertIds.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-orange-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 关联风险:</span>
                        <span className="text-gray-600">{alert.relation.relatedAlertIds.length}个相关预警</span>
                        {alert.relation.rootCause && (
                          <span className="text-gray-500">· 根因: {alert.relation.rootCause}</span>
                        )}
                      </div>
                    )}
                    
                    {/* 负责人 */}
                    {alert.assignee && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <span>负责人:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{alert.assignee}</span>
                      </div>
                    )}
                    
                    {/* 处理记录（简化显示） */}
                    {alert.actions && alert.actions.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="text-gray-400">最新进展: </span>
                        <span>{alert.actions[alert.actions.length - 1].note}</span>
                        <span className="text-gray-400 ml-1">({alert.actions.length}条记录)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {/* 操作按钮 - 根据状态显示不同操作 */}
                    {alert.status === 'detected' && (
                      <>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          确认
                        </button>
                        <button
                          onClick={() => handleIgnore(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          忽略
                        </button>
                      </>
                    )}
                    {['confirmed', 'assigned'].includes(alert.status) && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        开始处理
                      </button>
                    )}
                    {alert.status === 'processing' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        标记解决
                      </button>
                    )}
                    {alert.status === 'escalated' && (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        已升级
                      </span>
                    )}
                    {['resolved', 'verified', 'closed'].includes(alert.status) && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {alert.autoResolved ? '自动解决' : riskStatusConfig[alert.status].name}
                      </span>
                    )}
                    {alert.status === 'ignored' && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <XCircle className="w-4 h-4" />
                        已忽略
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredAlerts.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无符合条件的预警</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 批量分派弹窗 */}
      {showBatchAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              批量分派预警
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              将选中的 {selectedAlerts.size} 个预警分派给：
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {['运营专员A', '运营专员B', '财务专员', '风控主管'].map(person => (
                <button
                  key={person}
                  onClick={() => setBatchAssignee(person)}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    batchAssignee === person
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="font-medium text-gray-900">{person}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBatchAssignModal(false);
                  setBatchAssignee('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleBatchAssign}
                disabled={!batchAssignee}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                确认分派
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P1: 通知升级面板 */}
      {showNotificationPanel && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">通知与升级</h3>
            <button 
              onClick={() => setShowNotificationPanel(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          <div className="p-4 space-y-6">
            {/* 升级倒计时区域 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1"><Clock className="w-4 h-4" /> 即将升级的风险</h4>
              <div className="space-y-3">
                {allAlerts
                  .filter(a => selectedHotelIdSet.has(a.hotelId) && a.nextEscalationAt && pendingStatuses.includes(a.status))
                  .map(alert => {
                    const countdown = getCountdown(alert.nextEscalationAt!);
                    const isOverdue = countdown === '已超时';
                    const rule = DEFAULT_NOTIFICATION_RULES[alert.level];
                    const nextEscalation = rule.escalationRules.find(e => 
                      alert.escalations?.length === e.level - 1
                    );
                    
                    return (
                      <div key={alert.id} className={`p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                          <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                            {isOverdue ? '已超时' : countdown}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {isOverdue ? (
                            <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 应立即升级到：{nextEscalation?.to.join(', ')}</span>
                          ) : nextEscalation ? (
                            <span>⬆️ {countdown}后将升级到：{nextEscalation.to.join(', ')}</span>
                          ) : (
                            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 已到达最高处理层级</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {allAlerts.filter(a => selectedHotelIdSet.has(a.hotelId) && a.nextEscalationAt && pendingStatuses.includes(a.status)).length === 0 && (
                  <div className="text-center text-gray-400 py-4">暂无即将升级的风险</div>
                )}
              </div>
            </div>

            {/* 已升级记录 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> 升级记录</h4>
              <div className="space-y-2">
                {allAlerts
                  .filter(a => selectedHotelIdSet.has(a.hotelId) && a.escalations && a.escalations.length > 0)
                  .flatMap(a => a.escalations?.map(e => ({ ...e, alertTitle: a.title, alertId: a.id })) || [])
                  .sort((a, b) => new Date(b.escalatedAt).getTime() - new Date(a.escalatedAt).getTime())
                  .slice(0, 5)
                  .map((esc, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">{esc.level}级升级</span>
                        <span className="text-gray-500">{formatTime(esc.escalatedAt)}</span>
                      </div>
                      <div className="text-gray-700">{esc.alertTitle}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {esc.from} → {esc.to} · {esc.autoEscalated ? '自动升级' : '手动升级'}
                      </div>
                    </div>
                  ))}
                {allAlerts.filter(a => selectedHotelIdSet.has(a.hotelId) && a.escalations && a.escalations.length > 0).length === 0 && (
                  <div className="text-center text-gray-400 py-4">暂无升级记录</div>
                )}
              </div>
            </div>

            {/* 通知记录 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1"><Mail className="w-4 h-4" /> 最近通知</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allAlerts
                  .filter(a => selectedHotelIdSet.has(a.hotelId))
                  .flatMap(a => a.notifications?.map(n => ({ ...n, alertTitle: a.title })) || [])
                  .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                  .slice(0, 10)
                  .map((notif, idx) => {
                    const channelIcons: Record<NotificationChannel, any> = {
                      app: Bell,
                      sms: MessageCircle,
                      email: Mail,
                      dingtalk: Send,
                      phone: Phone,
                    };
                    const Icon = channelIcons[notif.channel];
                    
                    return (
                      <div key={idx} className={`p-3 rounded-lg text-sm ${notif.read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'}`}>
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 ${notif.read ? 'text-gray-400' : 'text-blue-500'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{notif.recipient}</span>
                              {!notif.read && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                            </div>
                            <div className="text-gray-600 mt-1">{notif.content}</div>
                            <div className="text-xs text-gray-400 mt-1">{formatTime(notif.sentAt)} · {notif.channel}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 通知规则说明 */}
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-1"><FileText className="w-4 h-4" /> 通知规则</h5>
              <div className="space-y-1">
                <div>严重风险：立即 APP+短信+电话，15分钟升级</div>
                <div>高危风险：5分钟后 APP+短信，1小时升级</div>
                <div>中危风险：30分钟后 APP，4小时升级</div>
                <div>低危风险：仅 APP 通知</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 规则配置弹窗 */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">预警规则配置</h3>
                <p className="text-sm text-gray-500 mt-1">配置不同风险等级的通知渠道和升级规则</p>
              </div>
              <button 
                onClick={() => setShowRuleModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
                const rule = notificationRules[level];
                const levelNames: Record<RiskLevel, string> = {
                  critical: '严重风险',
                  high: '高危风险',
                  medium: '中危风险',
                  low: '低危风险'
                };
                const levelColors: Record<RiskLevel, string> = {
                  critical: 'bg-red-50 border-red-200',
                  high: 'bg-orange-50 border-orange-200',
                  medium: 'bg-yellow-50 border-yellow-200',
                  low: 'bg-blue-50 border-blue-200'
                };
                
                return (
                  <div key={level} className={`p-4 rounded-lg border ${levelColors[level]}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">{levelNames[level]}</h4>
                      <span className="text-xs text-gray-500">ID: {level}</span>
                    </div>
                    
                    {/* 通知渠道 */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">通知渠道</label>
                      <div className="flex gap-2 flex-wrap">
                        {(['app', 'sms', 'email', 'dingtalk', 'phone'] as NotificationChannel[]).map((channel) => (
                          <button
                            key={channel}
                            onClick={() => {
                              const newRules = { ...notificationRules };
                              const channels = newRules[level].channels;
                              if (channels.includes(channel)) {
                                newRules[level].channels = channels.filter(c => c !== channel);
                              } else {
                                newRules[level].channels = [...channels, channel];
                              }
                              setNotificationRules(newRules);
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                              rule.channels.includes(channel)
                                ? 'bg-violet-100 border-violet-300 text-violet-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {channel === 'app' && 'APP推送'}
                            {channel === 'sms' && '短信'}
                            {channel === 'email' && '邮件'}
                            {channel === 'dingtalk' && '钉钉'}
                            {channel === 'phone' && '电话'}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 延迟设置 */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">通知延迟（分钟）</label>
                        <input
                          type="number"
                          value={rule.delay}
                          onChange={(e) => {
                            const newRules = { ...notificationRules };
                            newRules[level].delay = parseInt(e.target.value) || 0;
                            setNotificationRules(newRules);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                          min="0"
                          step="5"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">重复间隔（分钟）</label>
                        <input
                          type="number"
                          value={rule.repeatInterval || ''}
                          onChange={(e) => {
                            const newRules = { ...notificationRules };
                            newRules[level].repeatInterval = parseInt(e.target.value) || undefined;
                            setNotificationRules(newRules);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                          min="0"
                          step="5"
                          placeholder="不重复"
                        />
                      </div>
                    </div>
                    
                    {/* 升级规则 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">升级规则</label>
                        <button
                          onClick={() => {
                            const newRules = { ...notificationRules };
                            newRules[level].escalationRules = [
                              ...newRules[level].escalationRules,
                              {
                                level: newRules[level].escalationRules.length + 1,
                                afterMinutes: 60,
                                to: ['风控主管'],
                                message: `${levelNames[level]}未处理`,
                                channels: ['app']
                              }
                            ];
                            setNotificationRules(newRules);
                          }}
                          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                        >
                          + 添加升级规则
                        </button>
                      </div>
                      <div className="space-y-2">
                        {rule.escalationRules.map((esc, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="text-gray-500">{esc.level}级升级</span>
                              <span className="text-gray-700">{esc.afterMinutes}分钟后</span>
                              <span className="text-gray-700">→ {esc.to.join(', ')}</span>
                              <button
                                onClick={() => {
                                  const newRules = { ...notificationRules };
                                  newRules[level].escalationRules = newRules[level].escalationRules.filter((_, i) => i !== idx);
                                  // 重新编号
                                  newRules[level].escalationRules = newRules[level].escalationRules.map((e, i) => ({
                                    ...e,
                                    level: i + 1
                                  }));
                                  setNotificationRules(newRules);
                                }}
                                className="ml-auto text-red-500 hover:text-red-600"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ))}
                        {rule.escalationRules.length === 0 && (
                          <div className="text-sm text-gray-400 italic">暂无升级规则</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await riskApi.saveNotificationRules(notificationRules);
                    if (res.success) {
                      setShowRuleModal(false);
                      toast.success('规则配置已保存');
                    } else {
                      toast.error('保存失败：' + (res.message || '未知错误'));
                    }
                  } catch (error) {
                    console.error('保存规则配置失败:', error);
                    toast.error('保存失败，请重试');
                  }
                }}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看全部知识库弹窗 */}
      {showAllKnowledgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">风险知识库</h3>
                  <p className="text-sm text-gray-500">共 {knowledge.length} 条风险知识</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllKnowledgeModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {knowledge.map(k => {
                  const typeConfig = riskTypeConfig[k.riskType] || { name: '未知类型', color: '#6B7280', bgColor: '#F3F4F6', icon: AlertCircle };
                  return (
                    <div key={k.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                            >
                              {typeConfig.name}
                            </span>
                            <span className="text-xs text-gray-400">月均{k.frequency}次</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mt-2">{k.pattern}</h4>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{k.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                        <div><span className="text-gray-400">发现:</span> {k.avgDetectionTime}分钟</div>
                        <div><span className="text-gray-400">解决:</span> {k.avgResolutionTime}分钟</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedKnowledge(k);
                          setShowAllKnowledgeModal(false);
                          setShowKnowledgeDetailModal(true);
                        }}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        查看完整方案 ({(k.bestPractices || []).length}个)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAllKnowledgeModal(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 知识库详情弹窗 */}
      {showKnowledgeDetailModal && selectedKnowledge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedKnowledge.pattern}</h3>
                  <p className="text-sm text-gray-500">完整处理方案</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowKnowledgeDetailModal(false);
                  setSelectedKnowledge(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">风险描述</h4>
                  <p className="text-sm text-gray-600">{selectedKnowledge.description}</p>
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-violet-600">{selectedKnowledge.frequency}</div>
                      <div className="text-xs text-gray-500">月均发生</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{selectedKnowledge.avgDetectionTime}分钟</div>
                      <div className="text-xs text-gray-500">平均发现时间</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedKnowledge.avgResolutionTime}分钟</div>
                      <div className="text-xs text-gray-500">平均解决时间</div>
                    </div>
                  </div>
                </div>
                
                {/* 最佳实践列表 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    最佳实践方案 ({(selectedKnowledge.bestPractices || []).length}个)
                  </h4>
                  <div className="space-y-4">
                    {(selectedKnowledge.bestPractices || []).map((bp, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-violet-600">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-2">{bp.scenario}</h5>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-xs text-green-700 font-medium mb-1">解决方案:</div>
                              <p className="text-sm text-gray-700">{bp.solution}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 相关案例 */}
                {selectedKnowledge.similarCases && selectedKnowledge.similarCases.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-900">相关案例</span>
                    </div>
                    <p className="text-sm text-amber-800">
                      该风险类型已积累 {selectedKnowledge.similarCases.length} 个处理案例，可作为参考
                    </p>
                    <div className="mt-3 space-y-2">
                      {selectedKnowledge.similarCases.slice(0, 3).map((c, idx) => (
                        <div key={idx} className="text-xs bg-white rounded p-2">
                          <div className="font-medium text-gray-700">{c.title}</div>
                          <div className="text-gray-500 mt-1">{c.lesson}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowKnowledgeDetailModal(false);
                  setSelectedKnowledge(null);
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
