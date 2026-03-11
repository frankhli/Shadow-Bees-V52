/**
 * SaaS运营后台 - 客户成功中心（视觉重构版）
 * 简洁 · 高效 · 有动画巧思
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Minus,
  Crown,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Check,
  Archive,
  GraduationCap,
  Clock,
  User,
  X,
} from 'lucide-react';
import { useAdminStore, type Customer } from '../../stores/adminStore';
import {
  calculateAllCustomerHealth,
  calculateSuccessMetrics,
  generateActionItems,
  type CustomerHealthScore,
  type HealthLevel,
  type Quadrant,
} from '../../services/customerSuccessService';
import { RenewalCalendar } from '../../components/RenewalCalendar';
import { useNavigate } from 'react-router-dom';

// ============================================
// 配置
// ============================================

const LEVEL_STYLES: Record<HealthLevel, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: '#10B981', bg: 'bg-emerald-500/10', label: '健康' },
  warning: { icon: AlertCircle, color: '#F59E0B', bg: 'bg-amber-500/10', label: '需关注' },
  critical: { icon: XCircle, color: '#EF4444', bg: 'bg-red-500/10', label: '高风险' },
};

const QUADRANT_STYLES: Record<Quadrant, { label: string; color: string; icon: string; tip: string }> = {
  star: { label: '明星', color: '#10B981', icon: '★', tip: '用得对 + 赚得多' },
  potential: { label: '潜力', color: '#3B82F6', icon: '↗', tip: '用得对 + 赚得少' },
  atRisk: { label: '风险', color: '#F59E0B', icon: '⚠', tip: '用得错 + 赚得多' },
  dormant: { label: '沉睡', color: '#6B7280', icon: 'Zzz', tip: '用得错 + 赚得少' },
};

// ============================================
// 动画数字组件
// ============================================

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (value - start) * ease);
      
      setDisplay(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{display}</span>;
}

// ============================================
// 统计卡片
// ============================================

function StatCard({ 
  title, 
  value, 
  color, 
  icon: Icon,
  onClick,
  delay = 0 
}: { 
  title: string; 
  value: number; 
  color: string; 
  icon: typeof CheckCircle2;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="relative overflow-hidden bg-[#151B2B] rounded-2xl p-5 cursor-pointer group"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      {/* 悬停光效 */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 60%)` }}
      />
      
      <div className="relative flex items-center gap-4">
        {/* 图标容器 */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        
        {/* 数字和文字 */}
        <div className="flex-1">
          <p className="text-3xl font-bold text-white">
            <AnimatedNumber value={value} />
          </p>
          <p className="text-sm text-gray-400 mt-0.5">{title}</p>
        </div>
      </div>
      
      {/* 底部指示条 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
        <motion.div 
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: delay + 0.3, duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
}

// ============================================
// 战略四象限卡片
// ============================================

function QuadrantCard({ 
  quadrant, 
  count, 
  customers,
  onClick 
}: { 
  quadrant: Quadrant; 
  count: number; 
  customers: CustomerHealthScore[];
  onClick: () => void;
}) {
  const style = QUADRANT_STYLES[quadrant];
  const percentage = customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-[#151B2B] rounded-xl p-4 cursor-pointer overflow-hidden group"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
    >
      {/* 背景渐变 */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${style.color}08, transparent)` }}
      />
      
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{style.icon}</span>
            <span className="font-semibold text-white">{style.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{style.tip}</p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: style.color }}>{count}</p>
          <p className="text-xs text-gray-500">{percentage}%</p>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: style.color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

// ============================================
// 客户卡片
// ============================================

function CustomerCard({ 
  customer, 
  onClick,
  index 
}: { 
  customer: CustomerHealthScore; 
  onClick: () => void;
  index: number;
}) {
  const level = LEVEL_STYLES[customer.level];
  const quadrant = QUADRANT_STYLES[customer.quadrant || 'dormant'];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 4, backgroundColor: 'rgba(30, 37, 56, 0.8)' }}
      onClick={onClick}
      className="flex items-center gap-4 p-3 rounded-xl bg-[#0B0F19] cursor-pointer transition-colors group"
    >
      {/* 健康度圆环 */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1f2937" strokeWidth="3" />
          <motion.circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke={level.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(customer.overallScore / 100) * 125.6} 125.6`}
            initial={{ strokeDasharray: '0 125.6' }}
            animate={{ strokeDasharray: `${(customer.overallScore / 100) * 125.6} 125.6` }}
            transition={{ duration: 1, delay: index * 0.05 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: level.color }}>{customer.overallScore}</span>
        </div>
      </div>
      
      {/* 客户信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{customer.customerName}</span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${quadrant.color}20`, color: quadrant.color }}
          >
            {quadrant.label}
          </span>
        </div>
        
        {/* 关键指标 - 单行展示 */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <TrendingUp size={12} className={customer.metrics.flexibleSellThrough >= 60 ? 'text-emerald-400' : 'text-amber-400'} />
            售罄{customer.metrics.flexibleSellThrough}%
          </span>
          <span className="w-1 h-1 bg-gray-700 rounded-full" />
          <span className={customer.metrics.nonStandardRevenueRatio >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
            非标{customer.metrics.nonStandardRevenueRatio}%
          </span>
          <span className="w-1 h-1 bg-gray-700 rounded-full" />
          <span>GMV ¥{(customer.gmv / 10000).toFixed(1)}万</span>
        </div>
      </div>
      
      {/* 箭头 */}
      <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
    </motion.div>
  );
}

// ============================================
// 培训安排弹窗
// ============================================

function TrainingScheduleModal({
  action,
  onClose,
  onSchedule,
}: {
  action: ReturnType<typeof generateActionItems>[0];
  onClose: () => void;
  onSchedule: (data: { type: string; date: string; trainer: string; note: string }) => void;
}) {
  const [type, setType] = useState<'onboarding' | 'advanced' | 'special'>('onboarding');
  const [date, setDate] = useState('');
  const [trainer, setTrainer] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!date) return;
    setIsSubmitting(true);
    
    setTimeout(() => {
      onSchedule({
        type: type === 'onboarding' ? '启动培训' : type === 'advanced' ? '进阶培训' : '专项培训',
        date,
        trainer: trainer || '待定',
        note,
      });
      setIsSubmitting(false);
    }, 500);
  };

  const trainingTypes = [
    { id: 'onboarding', label: '启动培训', desc: '新客户的系统基础培训', color: '#3B82F6' },
    { id: 'advanced', label: '进阶培训', desc: 'AI工具、高级功能培训', color: '#8B5CF6' },
    { id: 'special', label: '专项培训', desc: '针对具体问题的定制培训', color: '#F59E0B' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#151B2B] rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative p-5 border-b border-gray-800">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GraduationCap size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">安排培训</h2>
                <p className="text-sm text-gray-400">{action.customerName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 培训类型 */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">培训类型</label>
            <div className="space-y-2">
              {trainingTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    type === t.id 
                      ? 'border-blue-500/50 bg-blue-500/10' 
                      : 'border-gray-800 bg-[#0B0F19] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                    {type === t.id && (
                      <CheckCircle2 size={16} className="text-blue-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 培训时间 */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">培训时间</label>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-gray-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 培训师 */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">培训师（可选）</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                placeholder="输入培训师姓名"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">备注（可选）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加培训相关的备注信息..."
              rows={3}
              className="w-full px-4 py-2.5 bg-[#0B0F19] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!date || isSubmitting}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                安排中...
              </>
            ) : (
              <>
                <Calendar size={16} />
                确认安排
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// 行动项
// ============================================

function ActionItem({ 
  action, 
  index,
  onComplete,
  isCompleting,
  onScheduleTraining,
}: { 
  action: ReturnType<typeof generateActionItems>[0]; 
  index: number;
  onComplete: () => void;
  isCompleting: boolean;
  onScheduleTraining?: (action: ReturnType<typeof generateActionItems>[0]) => void;
}) {
  const priorityColors = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', hover: 'hover:bg-red-500/20' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', hover: 'hover:bg-amber-500/20' },
    low: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400', hover: 'hover:bg-gray-500/20' },
  };
  const colors = priorityColors[action.priority];
  const isTraining = action.type === 'training_needed';
  
  // 确定图标
  const Icon = action.type === 'churn_risk' ? XCircle :
               action.type === 'revenue_opportunity' ? TrendingUp :
               action.type === 'training_needed' ? GraduationCap :
               action.type === 'renewal' ? Calendar : Phone;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ delay: index * 0.08 }}
      className={`group flex items-center gap-3 p-3 rounded-xl border ${colors.bg} ${colors.border} transition-all`}
    >
      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={colors.text} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{action.customerName}</span>
          <span className={`text-xs ${colors.text}`}>
            {action.priority === 'high' ? '高优' : action.priority === 'medium' ? '中优' : '低优'}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">{action.message}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-right flex-shrink-0 mr-2">
          <p className="text-xs text-emerald-400">¥{(action.opportunityValue / 1000).toFixed(0)}k</p>
          <p className="text-[10px] text-gray-500">价值</p>
        </div>
        
        {/* 培训类型显示"安排"按钮，其他显示"完成"按钮 */}
        {isTraining && onScheduleTraining ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onScheduleTraining(action)}
            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-1"
          >
            <GraduationCap size={14} />
            安排
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onComplete}
            disabled={isCompleting}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${colors.hover} ${colors.bg} border ${colors.border}`}
            title="标记为已完成"
          >
            <Check size={16} className={colors.text} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// 客户详情弹窗
// ============================================

function CustomerDetail({ 
  customer, 
  onClose 
}: { 
  customer: CustomerHealthScore; 
  onClose: () => void;
}) {
  const level = LEVEL_STYLES[customer.level];
  
  // 三维度数据
  const dimensions = [
    { name: '经营', score: customer.businessScore, icon: TrendingUp, color: '#10B981' },
    { name: '系统', score: customer.systemScore, icon: CheckCircle2, color: '#3B82F6' },
    { name: 'AI', score: customer.aiScore, icon: Crown, color: '#8B5CF6' },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#151B2B] rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative p-6 pb-4">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: level.color }} />
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <level.icon size={20} style={{ color: level.color }} />
                <h2 className="text-xl font-bold text-white">{customer.customerName}</h2>
              </div>
              <p className="text-sm text-gray-400">
                {customer.type === 'group' ? '集团客户' : '单体客户'} · 
                月GMV ¥{customer.gmv.toLocaleString()}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <XCircle size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* 三维度 */}
        <div className="px-6 py-4 bg-[#0B0F19]">
          <div className="grid grid-cols-3 gap-4">
            {dimensions.map((d, i) => (
              <motion.div 
                key={d.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1f2937" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${(d.score / 100) * 175.9} 175.9`}
                      initial={{ strokeDasharray: '0 175.9' }}
                      animate={{ strokeDasharray: `${(d.score / 100) * 175.9} 175.9` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <d.icon size={14} style={{ color: d.color }} />
                    <span className="text-sm font-bold text-white">{d.score}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{d.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* 关键指标 */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">关键指标</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
              <span className="text-sm text-gray-400">灵活池售罄</span>
              <span className={`font-medium ${customer.metrics.flexibleSellThrough >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {customer.metrics.flexibleSellThrough}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
              <span className="text-sm text-gray-400">非标收入占比</span>
              <span className={`font-medium ${customer.metrics.nonStandardRevenueRatio >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {customer.metrics.nonStandardRevenueRatio}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
              <span className="text-sm text-gray-400">内容转化率</span>
              <span className={`font-medium ${(customer.metrics.contentConversionRate || 0) >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {customer.metrics.contentConversionRate?.toFixed(1) || '0.0'}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg">
              <span className="text-sm text-gray-400">近7天登录</span>
              <span className={`font-medium ${customer.metrics.loginDaysInWeek >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {customer.metrics.loginDaysInWeek}天
              </span>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-3 mt-6">
            <button className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Mail size={16} />
              发送邮件
            </button>
            <button className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: level.color }}>
              <Phone size={16} />
              电话联系
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// 主页面
// ============================================

export default function CustomerSuccess() {
  const { customers, contentItems, tickets } = useAdminStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuadrant, setFilterQuadrant] = useState<Quadrant | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHealthScore | null>(null);
  const [selectedRenewalCustomer, setSelectedRenewalCustomer] = useState<Customer | null>(null);
  
  // 已完成的行动项（从 localStorage 读取）
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cs_completed_actions');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    }
    return new Set<string>();
  });
  
  // 正在完成的行动项（用于动画）
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  
  // 培训安排相关
  const [schedulingAction, setSchedulingAction] = useState<ReturnType<typeof generateActionItems>[0] | null>(null);
  const [scheduledTrainings, setScheduledTrainings] = useState<Array<{
    id: string;
    customerId: string;
    customerName: string;
    type: string;
    date: string;
    trainer: string;
    note: string;
    status: 'scheduled' | 'completed';
    createdAt: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cs_scheduled_trainings');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [];
  });

  // 计算数据
  const healthScores = useMemo(() => {
    return calculateAllCustomerHealth(customers, contentItems, tickets);
  }, [customers, contentItems, tickets]);

  const metrics = useMemo(() => {
    return calculateSuccessMetrics(healthScores);
  }, [healthScores]);

  // 行动项（过滤已完成的，按优先级排序）
  const allActionItems = useMemo(() => {
    return generateActionItems(healthScores);
  }, [healthScores]);
  
  const pendingActionItems = useMemo(() => {
    return allActionItems.filter(a => !completedActions.has(a.id)).slice(0, 5);
  }, [allActionItems, completedActions]);
  
  const completedCount = completedActions.size;
  const totalActionsCount = allActionItems.length;

  // 标记行动为已完成
  const completeAction = (actionId: string) => {
    setCompletingIds(prev => new Set(prev).add(actionId));
    
    // 延迟后从列表移除（让动画播放完）
    setTimeout(() => {
      setCompletedActions(prev => {
        const next = new Set(prev);
        next.add(actionId);
        // 持久化到 localStorage
        localStorage.setItem('cs_completed_actions', JSON.stringify(Array.from(next)));
        return next;
      });
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }, 300);
  };
  
  // 清空已完成的记录（重置）
  const resetCompleted = () => {
    if (confirm('确定要清空所有已完成的行动记录吗？')) {
      setCompletedActions(new Set());
      localStorage.removeItem('cs_completed_actions');
    }
  };
  
  // 处理培训安排
  const handleScheduleTraining = (data: { type: string; date: string; trainer: string; note: string }) => {
    if (!schedulingAction) return;
    
    const newTraining = {
      id: `training-${schedulingAction.customerId}-${Date.now()}`,
      customerId: schedulingAction.customerId,
      customerName: schedulingAction.customerName,
      type: data.type,
      date: data.date,
      trainer: data.trainer,
      note: data.note,
      status: 'scheduled' as const,
      createdAt: new Date().toISOString(),
    };
    
    const updatedTrainings = [...scheduledTrainings, newTraining];
    setScheduledTrainings(updatedTrainings);
    localStorage.setItem('cs_scheduled_trainings', JSON.stringify(updatedTrainings));
    
    // 将培训行动标记为已完成（因为已经安排了）
    setCompletedActions(prev => {
      const next = new Set(prev);
      next.add(schedulingAction.id);
      localStorage.setItem('cs_completed_actions', JSON.stringify(Array.from(next)));
      return next;
    });
    
    setSchedulingAction(null);
  };
  
  // 筛选客户
  const filteredCustomers = useMemo(() => {
    return healthScores
      .filter(c => {
        if (searchQuery && !c.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (filterQuadrant !== 'all' && c.quadrant !== filterQuadrant) return false;
        return true;
      })
      .slice(0, 10);
  }, [healthScores, searchQuery, filterQuadrant]);

  // 四象限统计
  const quadrantCounts = useMemo(() => ({
    star: healthScores.filter(c => c.quadrant === 'star').length,
    potential: healthScores.filter(c => c.quadrant === 'potential').length,
    atRisk: healthScores.filter(c => c.quadrant === 'atRisk').length,
    dormant: healthScores.filter(c => c.quadrant === 'dormant').length,
  }), [healthScores]);

  return (
    <div className="space-y-6 p-2">
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">客户成功中心</h1>
          <p className="text-sm text-gray-400 mt-1">
            {metrics.totalCustomers} 家客户 · 
            总GMV ¥{(metrics.totalGMV / 10000).toFixed(1)}万 · 
            平均健康度 {metrics.avgHealthScore}分
          </p>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="健康客户"
          value={metrics.healthyCount}
          color="#10B981"
          icon={CheckCircle2}
          delay={0}
        />
        <StatCard
          title="需关注"
          value={metrics.warningCount}
          color="#F59E0B"
          icon={AlertCircle}
          delay={0.1}
        />
        <StatCard
          title="高风险"
          value={metrics.criticalCount}
          color="#EF4444"
          icon={XCircle}
          delay={0.2}
        />
        <StatCard
          title="平均健康度"
          value={metrics.avgHealthScore}
          color="#3B82F6"
          icon={TrendingUp}
          delay={0.3}
        />
      </div>

      {/* 战略四象限 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">战略四象限</h2>
          {filterQuadrant !== 'all' && (
            <button 
              onClick={() => setFilterQuadrant('all')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              清除筛选 <Minus size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(quadrantCounts) as Quadrant[]).map((q) => (
            <QuadrantCard
              key={q}
              quadrant={q}
              count={quadrantCounts[q]}
              customers={healthScores}
              onClick={() => setFilterQuadrant(filterQuadrant === q ? 'all' : q)}
            />
          ))}
        </div>
      </motion.div>

      {/* 下方两列 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 行动看板 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#151B2B] rounded-2xl p-5"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">今日行动</h2>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  onClick={resetCompleted}
                  className="text-xs px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors flex items-center gap-1"
                  title="清空已完成记录"
                >
                  <Archive size={12} />
                  已处理 {completedCount}
                </button>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                pendingActionItems.length === 0 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {pendingActionItems.length} 待办
              </span>
            </div>
          </div>
          
          {/* 进度条 */}
          {totalActionsCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>处理进度</span>
                <span>{Math.round((completedCount / totalActionsCount) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalActionsCount) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {pendingActionItems.length > 0 ? (
                pendingActionItems.map((action, idx) => (
                  <ActionItem 
                    key={action.id} 
                    action={action} 
                    index={idx}
                    onComplete={() => completeAction(action.id)}
                    isCompleting={completingIds.has(action.id)}
                    onScheduleTraining={action.type === 'training_needed' ? setSchedulingAction : undefined}
                  />
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-3">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium">太棒了！</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {completedCount > 0 
                      ? `已完成 ${completedCount} 项行动` 
                      : '暂无待处理行动'}
                  </p>
                  {completedCount > 0 && (
                    <button
                      onClick={resetCompleted}
                      className="mt-3 text-xs text-gray-400 hover:text-white underline"
                    >
                      查看新的行动建议
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 客户列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#151B2B] rounded-2xl p-5"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {filterQuadrant === 'all' ? '客户列表' : QUADRANT_STYLES[filterQuadrant].label + '客户'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#0B0F19] border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:border-gray-600 outline-none w-32"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer, i) => (
                <CustomerCard 
                  key={customer.customerId} 
                  customer={customer} 
                  onClick={() => setSelectedCustomer(customer)}
                  index={i}
                />
              ))}
            </AnimatePresence>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Filter size={32} className="mx-auto mb-2 opacity-30" />
                <p>未找到匹配客户</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDetail 
            customer={selectedCustomer} 
            onClose={() => setSelectedCustomer(null)} 
          />
        )}
      </AnimatePresence>
      
      {/* 培训安排弹窗 */}
      <AnimatePresence>
        {schedulingAction && (
          <TrainingScheduleModal
            action={schedulingAction}
            onClose={() => setSchedulingAction(null)}
            onSchedule={handleScheduleTraining}
          />
        )}
      </AnimatePresence>
      
      {/* 已安排培训列表（可展开） */}
      {scheduledTrainings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151B2B] rounded-2xl p-5 mt-6"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GraduationCap size={20} className="text-blue-400" />
              已安排的培训
            </h2>
            <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
              {scheduledTrainings.filter(t => t.status === 'scheduled').length} 待执行
            </span>
          </div>
          
          <div className="space-y-2">
            {scheduledTrainings
              .filter(t => t.status === 'scheduled')
              .slice(0, 3)
              .map((training, i) => (
                <motion.div
                  key={training.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <GraduationCap size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{training.customerName}</p>
                      <p className="text-xs text-gray-400">
                        {training.type} · {new Date(training.date).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      培训师: {training.trainer}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
          
          {scheduledTrainings.filter(t => t.status === 'scheduled').length > 3 && (
            <button className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              查看全部 {scheduledTrainings.filter(t => t.status === 'scheduled').length} 个培训 →
            </button>
          )}
        </motion.div>
      )}

      {/* 续约日历 */}
      <RenewalCalendar 
        customers={customers}
        onSelectCustomer={(customer) => setSelectedRenewalCustomer(customer)}
      />
      
      {/* 续约客户详情弹窗 */}
      <AnimatePresence>
        {selectedRenewalCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedRenewalCustomer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#151B2B] rounded-2xl border border-gray-800 p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedRenewalCustomer.companyName}</h3>
                <button 
                  onClick={() => setSelectedRenewalCustomer(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">类型</span>
                  <span className={selectedRenewalCustomer.type === 'group' ? 'text-neon-purple' : 'text-neon-cyan'}>
                    {selectedRenewalCustomer.type === 'group' ? '集团客户' : '单体客户'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">续约日期</span>
                  <span className="text-neon-amber">
                    {new Date(selectedRenewalCustomer.expireAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">剩余天数</span>
                  <span className="font-medium">
                    {Math.ceil((new Date(selectedRenewalCustomer.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">月GMV</span>
                  <span>¥{selectedRenewalCustomer.monthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">门店数</span>
                  <span>{selectedRenewalCustomer.hotels.length} 家</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedRenewalCustomer(null);
                    navigate(`/customers?id=${selectedRenewalCustomer.id}`);
                  }}
                  className="flex-1 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
                >
                  查看详情
                </button>
                <button
                  onClick={() => setSelectedRenewalCustomer(null)}
                  className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
