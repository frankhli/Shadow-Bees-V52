/**
 * Shadow-Bees V52 - 集团策略中心
 * 统一定价策略下发、执行监控、审批流程
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Percent,
  Users,
  Send,
  Bell,
  Edit3,
  Trash2,
  Copy,
  Shield,
  UserCog,
  Building,
  ToggleRight,
  Info,
  MapPin,
  DollarSign,
  BarChart3,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
} from 'lucide-react';
import { useGroupStore, type HotelInGroup } from '../stores/groupStore';

// 策略类型配置
const strategyTypeConfig = {
  holiday: { label: '节假日策略', color: '#FF6B6B', icon: Calendar, bgColor: 'bg-red-500/10' },
  event: { label: '事件策略', color: '#A855F7', icon: Bell, bgColor: 'bg-purple-500/10' },
  daily: { label: '日常策略', color: '#00E396', icon: Target, bgColor: 'bg-green-500/10' },
};

// 策略状态配置
const strategyStatusConfig = {
  draft: { label: '草稿', color: 'text-text-muted', bgColor: 'bg-surface-hover' },
  pending: { label: '审批中', color: 'text-neon-amber', bgColor: 'bg-amber-500/10' },
  active: { label: '生效中', color: 'text-neon-green', bgColor: 'bg-green-500/10' },
  expired: { label: '已过期', color: 'text-text-muted', bgColor: 'bg-surface-hover' },
};

// ============================================
// 策略卡片
// ============================================

function StrategyCard({ strategy, index }: { strategy: { id: string; name: string; type: 'holiday' | 'event' | 'daily'; startDate: string; endDate: string; scope: string | string[]; rules: { baseIncrease: number; maxPremium: number; channelDiscount?: Record<string, number> }; status: string; executionStatus: { total: number; confirmed: number; executed: number } }; index: number }) {
  const typeConfig = strategyTypeConfig[strategy.type];
  const TypeIcon = typeConfig.icon;
  const statusConfig = strategyStatusConfig[strategy.status as keyof typeof strategyStatusConfig];

  const executionRate = Math.round((strategy.executionStatus.executed / strategy.executionStatus.total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-surface rounded-xl border border-border-color overflow-hidden hover:border-neon-purple/30 transition-colors"
    >
      {/* 头部 */}
      <div className="p-4 border-b border-border-color">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{strategy.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                ID: {strategy.id} · {strategy.startDate} 至 {strategy.endDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => alert(`编辑策略: ${strategy.name}\n\n功能说明：可修改策略规则、时间范围、适用门店等`)}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
              title="编辑策略"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => alert(`已复制策略模板: ${strategy.name}\n\n您可以在新建策略时基于此模板快速创建`)}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
              title="复制策略"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                if (confirm(`确定要删除策略「${strategy.name}」吗？\n\n此操作不可撤销`)) {
                  alert(`策略「${strategy.name}」已删除`);
                }
              }}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-neon-red transition-colors"
              title="删除策略"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 策略规则 */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <span className="text-text-secondary">基础涨幅</span>
            <span className="font-semibold text-neon-purple">+{strategy.rules.baseIncrease}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-neon-amber" />
            <span className="text-text-secondary">溢价上限</span>
            <span className="font-semibold text-neon-amber">+{strategy.rules.maxPremium}%</span>
          </div>
        </div>

        {strategy.rules.channelDiscount && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary">渠道额外折扣：</span>
            {Object.entries(strategy.rules.channelDiscount).map(([channel, discount]) => (
              <span key={channel} className="px-2 py-0.5 rounded bg-surface-hover text-text-secondary">
                {channel === 'xianyu' ? '闲鱼' : channel === 'wechat' ? '微信' : channel} -{discount}%
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-text-secondary" />
          <span className="text-text-secondary">适用范围：</span>
          <span className="font-medium">{strategy.scope === 'all' ? '全部门店' : `${strategy.executionStatus.total} 家门店`}</span>
        </div>
      </div>

      {/* 执行进度 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-text-secondary">执行进度</span>
          <span className="font-medium">{strategy.executionStatus.executed}/{strategy.executionStatus.total} 店已执行</span>
        </div>
        <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${executionRate}%` }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
            className="h-full rounded-full bg-neon-green"
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-neon-green" />
              已确认 {strategy.executionStatus.confirmed}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-neon-amber" />
              待确认 {strategy.executionStatus.total - strategy.executionStatus.confirmed}
            </span>
          </div>
          {strategy.executionStatus.confirmed < strategy.executionStatus.total && (
            <button 
              onClick={() => {
                const pendingCount = strategy.executionStatus.total - strategy.executionStatus.confirmed;
                alert(`已发送催促通知给 ${pendingCount} 家门店店长\n\n通知内容：请尽快确认「${strategy.name}」的执行安排`);
              }}
              className="text-neon-purple hover:underline"
            >
              一键催促
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 策略执行详情
// ============================================

function ExecutionDetailItem({ hotel, status }: { hotel: { id: string; name: string; manager: string }; status: 'confirmed' | 'pending' | 'rejected' | 'executed' }) {
  const statusConfig = {
    confirmed: { label: '已确认', color: 'text-neon-amber', bgColor: 'bg-amber-500/10', icon: Clock },
    pending: { label: '待确认', color: 'text-text-muted', bgColor: 'bg-surface-hover', icon: AlertCircle },
    rejected: { label: '已驳回', color: 'text-neon-red', bgColor: 'bg-red-500/10', icon: AlertCircle },
    executed: { label: '已执行', color: 'text-neon-green', bgColor: 'bg-green-500/10', icon: CheckCircle },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover hover:bg-surface border border-transparent hover:border-border-color transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{hotel.name}</p>
          <p className="text-xs text-text-secondary">店长：{hotel.manager}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
        {status === 'pending' && (
          <button 
            onClick={() => alert(`已向店长 ${hotel.manager} 发送催促通知\n\n通知方式：短信 + App推送`)}
            className="text-xs px-3 py-1 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
          >
            催促
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// 新建策略弹窗
// ============================================

function CreateStrategyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const { hotels } = useGroupStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface rounded-2xl border border-border-color w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="p-4 border-b border-border-color flex items-center justify-between">
            <h3 className="text-lg font-semibold">新建定价策略</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary">
              ×
            </button>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border-color bg-surface-hover">
            {['基本信息', '策略规则', '选择门店', '确认下发'].map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step > index + 1 ? 'bg-neon-green text-white' : step === index + 1 ? 'bg-neon-purple text-white' : 'bg-surface-hover text-text-muted'}`}>
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${step === index + 1 ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
                {index < 3 && <ChevronRight className="w-4 h-4 text-text-muted" />}
              </div>
            ))}
          </div>

          {/* 内容区 */}
          <div className="p-4 overflow-y-auto max-h-[50vh]">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">策略名称</label>
                  <input
                    type="text"
                    placeholder="如：春节假期统一定价策略"
                    className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">策略类型</label>
                  <div className="flex gap-2">
                    {Object.entries(strategyTypeConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => alert(`已选择策略类型：${config.label}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-color hover:border-neon-purple/30 transition-colors"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: config.color }} />
                        <span className="text-sm">{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">生效日期</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none appearance-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">失效日期</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary focus:border-neon-purple focus:outline-none appearance-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">基础涨幅 (%)</label>
                    <input
                      type="number"
                      placeholder="30"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">溢价上限 (%)</label>
                    <input
                      type="number"
                      placeholder="50"
                      className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">触发调价的最低入住率 (%)</label>
                  <input
                    type="number"
                    placeholder="70"
                    className="w-full px-4 py-2 bg-surface border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">渠道额外折扣</label>
                  <div className="space-y-2">
                    {['闲鱼', '微信', '小红书'].map((channel) => (
                      <div key={channel} className="flex items-center gap-2">
                        <span className="text-sm w-16">{channel}</span>
                        <input
                          type="number"
                          placeholder="5"
                          className="w-24 px-3 py-1.5 bg-surface border border-border-color rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-neon-purple focus:outline-none appearance-none"
                        />
                        <span className="text-sm text-text-secondary">% 折扣</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => alert('已选中所有门店')} className="px-3 py-1.5 text-sm bg-neon-purple text-white rounded-lg">全选</button>
                  <button onClick={() => alert('按区域选择功能开发中...')} className="px-3 py-1.5 text-sm border border-border-color rounded-lg hover:bg-surface-hover">按区域选择</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {hotels.map((hotel) => (
                    <label key={hotel.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-color hover:border-neon-purple/30 cursor-pointer transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-border-color bg-surface text-neon-purple focus:ring-neon-purple appearance-none checked:bg-neon-purple checked:border-neon-purple" defaultChecked />
                      <div>
                        <p className="font-medium text-sm">{hotel.name}</p>
                        <p className="text-xs text-text-secondary">{hotel.region}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-hover">
                  <h4 className="font-medium mb-3">策略预览</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">策略名称</span>
                      <span>春节假期统一定价策略</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">生效时间</span>
                      <span>2026.02.08 - 2026.02.17</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">基础涨幅</span>
                      <span className="text-neon-purple font-medium">+30%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">适用范围</span>
                      <span>全部 15 家门店</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-neon-amber/5 border border-neon-amber/30">
                  <p className="text-sm text-neon-amber flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    策略下发后，店长需要在 24 小时内确认，逾期未确认将自动生效
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="p-4 border-t border-border-color flex justify-between">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              className={`px-4 py-2 rounded-lg border border-border-color ${step === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-hover'}`}
              disabled={step === 1}
            >
              上一步
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary">
                取消
              </button>
              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 rounded-lg bg-neon-purple text-white hover:bg-neon-purple/90 transition-colors"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-neon-purple text-white hover:bg-neon-purple/90 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  确认下发
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// 运营模式配置组件
// ============================================

type OperationMode = 'centralized' | 'regional' | 'decentralized';

const modeConfig = {
  centralized: {
    label: '集团主导',
    description: '策略由集团统一制定，门店必须执行',
    icon: Shield,
    color: '#A855F7',
    features: ['策略集团统一定制', '门店自动生效', '无需店长确认', '适用于强管控集团'],
  },
  regional: {
    label: '区域自治',
    description: '区域经理可调整策略，门店建议采纳',
    icon: Building,
    color: '#00A8FF',
    features: ['区域可调整策略参数', '门店24小时内确认', '逾期自动生效', '适用于中型集团'],
  },
  decentralized: {
    label: '门店自主',
    description: '门店完全自主决策，AI提供建议',
    icon: UserCog,
    color: '#00E396',
    features: ['AI提供策略建议', '店长自主选择', '集团看效果数据', '适用于松散联盟'],
  },
};

function OperationModeConfig() {
  const [currentMode, setCurrentMode] = useState<OperationMode>('regional');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-xl border border-border-color p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-neon-purple" />
            运营模式配置
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            设置集团与门店的决策权限分配
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1.5 text-sm border border-border-color rounded-lg hover:bg-surface-hover transition-colors"
        >
          {isEditing ? '取消' : '修改'}
        </button>
      </div>

      {/* 当前模式展示 */}
      {!isEditing && (
        <div className="p-4 rounded-xl bg-surface-hover border border-border-color">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${modeConfig[currentMode].color}20` }}
            >
              {(() => {
                const Icon = modeConfig[currentMode].icon;
                return <Icon className="w-5 h-5" style={{ color: modeConfig[currentMode].color }} />;
              })()}
            </div>
            <div>
              <p className="font-semibold">{modeConfig[currentMode].label}</p>
              <p className="text-xs text-text-secondary">{modeConfig[currentMode].description}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border-color">
            <p className="text-xs text-text-muted mb-2">当前权限配置：</p>
            <div className="flex flex-wrap gap-2">
              {modeConfig[currentMode].features.map((feature, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded bg-surface border border-border-color">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 模式选择 */}
      {isEditing && (
        <div className="space-y-3">
          {(Object.keys(modeConfig) as OperationMode[]).map((mode) => {
            const config = modeConfig[mode];
            const Icon = config.icon;
            return (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setCurrentMode(mode)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  currentMode === mode
                    ? 'border-neon-purple bg-neon-purple/5'
                    : 'border-border-color hover:border-neon-purple/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${config.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{config.label}</p>
                      {currentMode === mode && (
                        <span className="px-2 py-0.5 text-[10px] rounded bg-neon-purple text-white">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{config.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {config.features.map((feature, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
          
          <div className="p-3 rounded-lg bg-neon-amber/5 border border-neon-amber/20">
            <p className="text-xs text-neon-amber flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              修改运营模式将影响所有门店的策略执行方式，请谨慎操作
            </p>
          </div>
          
          <button
            onClick={() => setIsEditing(false)}
            className="w-full py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
          >
            保存配置
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// 子组件：策略执行列表（可展开/收起）
// ============================================

function StrategyExecutionList({ hotels }: { hotels: HotelInGroup[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayHotels = isExpanded ? hotels : hotels.slice(0, 3);
  const hasMore = hotels.length > 3;
  
  const statuses: Array<'confirmed' | 'pending' | 'rejected' | 'executed'> = ['executed', 'executed', 'confirmed', 'executed', 'confirmed', 'executed', 'pending', 'executed', 'confirmed', 'executed'];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 rounded text-xs bg-neon-green/10 text-neon-green">已执行 7</span>
        <span className="px-2 py-1 rounded text-xs bg-neon-amber/10 text-neon-amber">已确认 2</span>
        <span className="px-2 py-1 rounded text-xs bg-surface-hover text-text-muted">待确认 1</span>
      </div>

      <AnimatePresence mode="wait">
        {displayHotels.map((hotel, index) => (
          <motion.div
            key={hotel.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.03 }}
          >
            <ExecutionDetailItem
              hotel={hotel}
              status={statuses[index % statuses.length]}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {hasMore && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 py-2 text-sm text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5 transition-colors flex items-center justify-center gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              查看全部 {hotels.length} 家门店
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// 主页面
// ============================================

export function StrategyCenter() {
  const { strategies, hotels } = useGroupStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [, setSelectedStrategy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'strategies' | 'effects' | 'market' | 'config'>('strategies');

  const activeStrategies = strategies.filter((s) => s.status === 'active');
  const pendingStrategies = strategies.filter((s) => s.status === 'pending');
  

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">策略中心</h1>
          <p className="text-text-secondary text-sm mt-1">
            统一定价策略 · 运营模式配置 · 权限管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab切换 */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'strategies'
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              策略管理
            </button>
            <button
              onClick={() => setActiveTab('effects')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'effects'
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              效果验证
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'market'
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              市场情报
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'config'
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              运营模式
            </button>
          </div>
          
          {activeTab === 'strategies' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl hover:bg-neon-purple/90 transition-colors shadow-lg shadow-neon-purple/25"
            >
              <Plus className="w-4 h-4" />
              新建策略
            </button>
          )}
        </div>
      </motion.div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {activeTab === 'strategies' && (
          <motion.div
            key="strategies"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '生效中策略', value: activeStrategies.length, subtext: '个策略正在执行', icon: Target, color: '#00E396' },
          { label: '待审批策略', value: pendingStrategies.length, subtext: '个策略待审批', icon: Clock, color: '#FFB800' },
          { label: '策略执行率', value: '87%', subtext: '平均执行进度', icon: TrendingUp, color: '#A855F7' },
          { label: '店长确认率', value: '92%', subtext: '24小时内确认', icon: Users, color: '#00A8FF' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface rounded-xl border border-border-color p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.subtext}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 策略列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：策略卡片 */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-semibold mb-3">生效中的策略 ({activeStrategies.length})</h3>
            <div className="space-y-4">
              {activeStrategies.map((strategy, index) => (
                <div key={strategy.id} onClick={() => setSelectedStrategy(strategy.id)}>
                  <StrategyCard strategy={strategy} index={index} />
                </div>
              ))}
            </div>
          </motion.div>

          {pendingStrategies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-semibold mb-3">审批中的策略 ({pendingStrategies.length})</h3>
              <div className="space-y-4">
                {pendingStrategies.map((strategy, index) => (
                  <div key={strategy.id} onClick={() => setSelectedStrategy(strategy.id)}>
                    <StrategyCard strategy={strategy} index={index} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* 右侧：执行详情 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-xl border border-border-color p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">策略执行详情</h3>
            <select className="px-3 py-1.5 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none">
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <StrategyExecutionList hotels={hotels} />
        </motion.div>
      </div>

      {/* 新建策略弹窗 */}
      <CreateStrategyModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
          </motion.div>
        )}

        {activeTab === 'effects' && (
          <motion.div
            key="effects"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StrategyEffectTracking />
          </motion.div>
        )}

        {activeTab === 'market' && (
          <motion.div
            key="market"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <MarketIntelligence />
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <OperationModeConfig />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border border-border-color p-5"
            >
              <h3 className="font-semibold mb-4">权限配置说明</h3>
              <div className="space-y-4 text-sm">
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="font-medium text-neon-purple mb-1">集团主导模式</p>
                  <p className="text-text-secondary text-xs">
                    适用于希望强管控的集团。所有定价、内容策略由集团统一制定，
                    门店系统自动执行，无需店长确认。适合直营连锁集团。
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="font-medium text-neon-cyan mb-1">区域自治模式</p>
                  <p className="text-text-secondary text-xs">
                    适用于中大型集团。区域经理可根据本地情况调整策略参数，
                    门店有24小时确认期，逾期自动生效。平衡管控与灵活性。
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="font-medium text-neon-green mb-1">门店自主模式</p>
                  <p className="text-text-secondary text-xs">
                    适用于松散加盟集团。AI提供策略建议，店长自主决定是否采纳，
                    集团通过数据看效果。最大化门店自主权。
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 策略效果验证组件
// ============================================

function StrategyEffectTracking() {
  
  // 模拟策略效果数据
  const strategyEffects = [
    {
      id: 's1',
      name: '春节定价策略',
      type: 'holiday',
      status: 'completed',
      period: '2024.02.08 - 2024.02.17',
      coverage: 15,
      baseline: { gmv: 450000, revpar: 320, occupancy: 65 },
      actual: { gmv: 680000, revpar: 420, occupancy: 82 },
      lift: { gmv: 51, revpar: 31, occupancy: 26 },
      roi: 340,
    },
    {
      id: 's2',
      name: '情人节促销活动',
      type: 'event',
      status: 'completed',
      period: '2024.02.14 - 2024.02.14',
      coverage: 12,
      baseline: { gmv: 28000, revpar: 380, occupancy: 70 },
      actual: { gmv: 52000, revpar: 520, occupancy: 95 },
      lift: { gmv: 86, revpar: 37, occupancy: 36 },
      roi: 520,
    },
    {
      id: 's3',
      name: '淡季促销策略',
      type: 'daily',
      status: 'active',
      period: '2024.03.01 - 2024.03.31',
      coverage: 15,
      baseline: { gmv: 320000, revpar: 280, occupancy: 55 },
      actual: { gmv: 380000, revpar: 310, occupancy: 68 },
      lift: { gmv: 19, revpar: 11, occupancy: 24 },
      roi: 180,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 总体效果统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">策略累计增收</p>
          <p className="text-2xl font-bold text-neon-purple">¥128万</p>
          <p className="text-xs text-neon-green mt-1">+32% 较自然增长</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">平均策略ROI</p>
          <p className="text-2xl font-bold text-neon-green">285%</p>
          <p className="text-xs text-text-muted mt-1">投入产出比</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">成功策略数</p>
          <p className="text-2xl font-bold">12/15</p>
          <p className="text-xs text-text-muted mt-1">80% 成功率</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">平均执行率</p>
          <p className="text-2xl font-bold text-neon-cyan">91%</p>
          <p className="text-xs text-text-muted mt-1">门店配合度</p>
        </div>
      </div>

      {/* 策略效果列表 */}
      <div className="space-y-4">
        <h3 className="font-semibold">策略效果明细</h3>
        {strategyEffects.map((effect, index) => (
          <motion.div
            key={effect.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 rounded-xl bg-surface border border-border-color"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{effect.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    effect.status === 'completed' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-purple/10 text-neon-purple'
                  }`}>
                    {effect.status === 'completed' ? '已完成' : '执行中'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {effect.period} · 覆盖 {effect.coverage} 家门店
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-neon-green">+{effect.roi}%</p>
                <p className="text-xs text-text-secondary">ROI</p>
              </div>
            </div>

            {/* 效果对比 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-surface-hover">
                <p className="text-xs text-text-secondary mb-1">GMV增长</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-neon-purple">+{effect.lift.gmv}%</span>
                  <span className="text-xs text-text-muted">
                    ¥{(effect.actual.gmv / 10000).toFixed(0)}万
                  </span>
                </div>
                <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-neon-purple" style={{ width: `${Math.min(effect.lift.gmv, 100)}%` }} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-hover">
                <p className="text-xs text-text-secondary mb-1">RevPAR提升</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-neon-green">+{effect.lift.revpar}%</span>
                  <span className="text-xs text-text-muted">
                    ¥{effect.actual.revpar}
                  </span>
                </div>
                <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-neon-green" style={{ width: `${Math.min(effect.lift.revpar, 100)}%` }} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-hover">
                <p className="text-xs text-text-secondary mb-1">入住率提升</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-neon-cyan">+{effect.lift.occupancy}%</span>
                  <span className="text-xs text-text-muted">
                    {effect.actual.occupancy}%
                  </span>
                </div>
                <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-neon-cyan" style={{ width: `${Math.min(effect.lift.occupancy, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* 基准对比 */}
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>基准值:</span>
              <span>GMV ¥{(effect.baseline.gmv / 10000).toFixed(0)}万</span>
              <span>RevPAR ¥{effect.baseline.revpar}</span>
              <span>入住率 {effect.baseline.occupancy}%</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 策略模板库 */}
      <div className="p-5 rounded-xl bg-surface border border-border-color">
        <h3 className="font-semibold mb-4">策略模板库</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: '节假日定价', icon: Calendar, desc: '自动识别节假日调价', success: '92%' },
            { name: '淡季促销', icon: TrendingUp, desc: '库存压力自动促销', success: '85%' },
            { name: '新店开业', icon: Building2, desc: '新店爬坡期策略', success: '88%' },
            { name: '竞对应对', icon: Target, desc: '竞品调价自动跟进', success: '78%' },
          ].map((template) => (
            <div key={template.name} className="p-4 rounded-xl bg-surface-hover hover:bg-surface border border-border-color hover:border-neon-purple/30 transition-all cursor-pointer">
              <template.icon className="w-8 h-8 text-neon-purple mb-2" />
              <h4 className="font-medium text-sm">{template.name}</h4>
              <p className="text-xs text-text-secondary mt-1">{template.desc}</p>
              <p className="text-xs text-neon-green mt-2">成功率 {template.success}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 市场情报组件
// ============================================

function MarketIntelligence() {
  const { hotels, marketIntelligence } = useGroupStore();
  
  // 使用 store 中的真实数据
  const competitors = marketIntelligence.competitors;
  const marketTrends = marketIntelligence.marketTrends;
  const pricingSuggestions = marketIntelligence.pricingSuggestions;
  const marketHeat = marketIntelligence.marketHeat;
  
  const avgMarketPrice = Math.round(competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length);
  const ourPrice = hotels[0]?.pricing?.currentPrice || 328;
  const pricePosition = ((ourPrice - avgMarketPrice) / avgMarketPrice * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">市场平均房价</p>
          <p className="text-2xl font-bold">¥{avgMarketPrice}</p>
          <p className={`text-xs mt-1 ${Number(pricePosition) > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
            我们 {Number(pricePosition) > 0 ? '高于' : '低于'}市场 {Math.abs(Number(pricePosition))}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">竞品监控数量</p>
          <p className="text-2xl font-bold">{competitors.length}</p>
          <p className="text-xs text-text-muted mt-1">3km范围内</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">市场需求热度</p>
          <p className="text-2xl font-bold text-neon-amber">
            {marketHeat.level === 'high' ? '高' : marketHeat.level === 'medium' ? '中' : '低'}
          </p>
          <p className={`text-xs mt-1 ${marketHeat.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
            较上周 {marketHeat.change >= 0 ? '+' : ''}{marketHeat.change}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-color">
          <p className="text-xs text-text-secondary">市场需求指数</p>
          <p className="text-2xl font-bold text-neon-green">{marketHeat.demandIndex}</p>
          <p className="text-xs text-text-muted mt-1">100为基准</p>
        </div>
      </div>

      {/* 竞品价格监控 */}
      <div className="p-5 rounded-xl bg-surface border border-border-color">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-neon-purple" />
            竞品价格监控（3km范围）
          </h3>
          <div className="flex items-center gap-2">
            <button className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-3 text-left text-text-secondary font-medium">酒店名称</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">距离</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">今日房价</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">涨跌</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">评分</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">入住率</th>
                <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {competitors.map((hotel) => (
                <tr key={hotel.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 font-medium">{hotel.name}</td>
                  <td className="px-4 py-3 text-center text-text-secondary">{hotel.distance}km</td>
                  <td className="px-4 py-3 text-center font-medium">¥{hotel.price}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`flex items-center justify-center gap-1 ${
                      hotel.priceChange > 0 ? 'text-neon-red' : 'text-neon-green'
                    }`}>
                      {hotel.priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(hotel.priceChange)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{hotel.rating}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neon-purple rounded-full" 
                          style={{ width: `${hotel.occupancy}%` }}
                        />
                      </div>
                      <span className="text-xs w-8">{hotel.occupancy}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 text-text-secondary hover:text-neon-purple rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* 自己 */}
              <tr className="bg-neon-purple/5">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] bg-neon-purple text-white rounded">我们</span>
                  杭州西湖店
                </td>
                <td className="px-4 py-3 text-center text-text-secondary">-</td>
                <td className="px-4 py-3 text-center font-bold text-neon-purple">¥{ourPrice}</td>
                <td className="px-4 py-3 text-center">-</td>
                <td className="px-4 py-3 text-center">4.6</td>
                <td className="px-4 py-3 text-center">82%</td>
                <td className="px-4 py-3 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 市场趋势 */}
        <div className="p-5 rounded-xl bg-surface border border-border-color">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-neon-purple" />
            RevPAR 市场趋势对比
          </h3>
          <div className="space-y-3">
            {marketTrends.map((day, idx) => {
              const maxRevpar = Math.max(day.ourRevpar, day.marketRevpar);
              const ourWidth = (day.ourRevpar / maxRevpar) * 100;
              const marketWidth = (day.marketRevpar / maxRevpar) * 100;
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-10">{day.date}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-8">我们</span>
                      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ourWidth}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className="h-full bg-neon-purple rounded-full"
                        />
                      </div>
                      <span className="text-xs w-8 text-right">¥{day.ourRevpar}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-8">市场</span>
                      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${marketWidth}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className="h-full bg-text-muted rounded-full"
                        />
                      </div>
                      <span className="text-xs w-8 text-right text-text-muted">¥{day.marketRevpar}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI定价建议 */}
        <div className="p-5 rounded-xl bg-surface border border-border-color">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-neon-purple" />
            AI 定价策略建议
          </h3>
          <div className="space-y-3">
            {pricingSuggestions.map((suggestion) => (
              <motion.div
                key={suggestion.type}
                whileHover={{ scale: 1.01 }}
                className="p-4 rounded-xl bg-surface-hover border border-border-color hover:border-neon-purple/30 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {suggestion.type === 'aggressive' ? '激进定价' : 
                         suggestion.type === 'conservative' ? '保守定价' : '动态跟随'}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        suggestion.risk === 'high' ? 'bg-neon-red/10 text-neon-red' :
                        suggestion.risk === 'medium' ? 'bg-neon-amber/10 text-neon-amber' :
                        'bg-neon-green/10 text-neon-green'
                      }`}>
                        风险{suggestion.risk === 'high' ? '高' : suggestion.risk === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{suggestion.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-neon-purple">¥{suggestion.price}</p>
                    <p className="text-xs text-neon-green">{suggestion.lift}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <button 
            onClick={() => alert('已应用动态跟随定价策略\n\n系统将自动：\n1. 监控竞品价格变化\n2. 在±10%范围内自动调价\n3. 每日生成价格建议报告')}
            className="w-full mt-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
          >
            应用推荐策略
          </button>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '竞品追踪', icon: Search, color: '#A855F7', action: () => alert('竞品追踪设置\n\n监控范围：3km\n监控频率：每小时\n预警阈值：价格变化±10%') },
          { label: '价格预警', icon: Bell, color: '#FFB800', action: () => alert('价格预警设置\n\n已开启以下预警：\n- 竞对大幅降价（>15%）\n- 市场热度突增（>20%）\n- 满房率低于50%') },
          { label: '批量调价', icon: DollarSign, color: '#00E396', action: () => alert('批量调价工具\n\n可选择以下策略批量下发：\n- 节假日统一定价\n- 淡季促销调价\n- 跟随市场动态调价') },
          { label: '导出报告', icon: Download, color: '#00A8FF', action: () => alert('导出市场情报报告\n\n报告包含：\n- 竞品价格对比\n- 市场趋势分析\n- 定价建议\n\n格式：PDF/Excel') },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.action}
              className="p-4 rounded-xl bg-surface border border-border-color hover:border-neon-purple/50 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${action.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-neon-purple transition-colors" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StrategyCenter;
