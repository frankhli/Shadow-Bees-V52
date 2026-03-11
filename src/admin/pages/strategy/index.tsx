/**
 * 策略管控中心 - Phase 3 核心功能
 * 策略冲突检测 + 策略执行监控 + 策略规则配置
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Play,
  Settings,
  ChevronRight,
  Info,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
  Package,
  Globe,
  X,
  Search,
} from 'lucide-react';
import { useAdminStore, type GroupStrategyRule, type StrategyRuleType } from '../../stores/adminStore';
import { StrategyConflictPanel } from '../../components/StrategyConflictPanel';
import { StrategyExecutionMonitor } from '../../components/StrategyExecutionMonitor';

type StrategyTab = 'conflict' | 'execution' | 'rules';

// 规则类型配置
const ruleTypeConfig: Record<StrategyRuleType, { label: string; icon: typeof DollarSign; color: string; bg: string }> = {
  min_price: { label: '最低限价', icon: DollarSign, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  max_discount: { label: '最大折扣', icon: Percent, color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  inventory_reserve: { label: '库存保留', icon: Package, color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
  channel_priority: { label: '渠道优先', icon: Globe, color: 'text-neon-green', bg: 'bg-neon-green/10' },
};

// 策略规则卡片
function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: GroupStrategyRule;
  onEdit: (rule: GroupStrategyRule) => void;
  onDelete: (rule: GroupStrategyRule) => void;
  onToggle: (rule: GroupStrategyRule) => void;
}) {
  const typeConfig = ruleTypeConfig[rule.ruleType];
  const Icon = typeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        rule.enabled ? 'bg-[#0B0F19] border-gray-800' : 'bg-gray-900/30 border-gray-800/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${typeConfig.bg} flex items-center justify-center`}>
            <Icon size={18} className={typeConfig.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{rule.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.bg} ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              {!rule.enabled && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">已禁用</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>优先级: {rule.priority}</span>
              <span>适用门店: {rule.hotelIds.length}家</span>
              {rule.conditions.occupancyRange && (
                <span>入住率: {rule.conditions.occupancyRange.min}%-{rule.conditions.occupancyRange.max}%</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(rule)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={rule.enabled ? '禁用' : '启用'}
          >
            {rule.enabled ? (
              <ToggleRight size={20} className="text-neon-green" />
            ) : (
              <ToggleLeft size={20} className="text-gray-500" />
            )}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit2 size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(rule)}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// 规则编辑弹窗
function RuleModal({
  isOpen,
  onClose,
  rule,
  onSave,
  customers,
}: {
  isOpen: boolean;
  onClose: () => void;
  rule: GroupStrategyRule | null;
  onSave: (rule: Partial<GroupStrategyRule>) => void;
  customers: any[];
}) {
  const [formData, setFormData] = useState<Partial<GroupStrategyRule>>({
    name: '',
    ruleType: 'min_price',
    hotelIds: [],
    conditions: {},
    action: { type: '', value: 0 },
    priority: 50,
    enabled: true,
    description: '',
  });

  // 当编辑现有规则时，填充表单
  if (rule && isOpen && !formData.name && rule.name) {
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      hotelIds: rule.hotelIds,
      conditions: rule.conditions,
      action: rule.action,
      priority: rule.priority,
      enabled: rule.enabled,
      description: rule.description || '',
    });
  }

  const groupCustomers = customers.filter((c) => c.type === 'group');
  const selectedCustomer = groupCustomers[0]; // 简化：选择第一个集团
  const hotels = selectedCustomer?.hotels || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
    // 重置表单
    setFormData({
      name: '',
      ruleType: 'min_price',
      hotelIds: [],
      conditions: {},
      action: { type: '', value: 0 },
      priority: 50,
      enabled: true,
      description: '',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#151B2B] rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold">{rule ? '编辑规则' : '新建规则'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 规则名称 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">规则名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
                placeholder="例如：集团最低限价策略"
                required
              />
            </div>

            {/* 规则类型 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">规则类型</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ruleTypeConfig) as StrategyRuleType[]).map((type) => {
                  const config = ruleTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, ruleType: type })}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        formData.ruleType === type
                          ? 'border-neon-cyan bg-neon-cyan/10'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <Icon size={18} className={config.color} />
                      <span className="text-sm">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 适用门店 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">适用门店</label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-[#0B0F19] rounded-lg border border-gray-800">
                {hotels.map((hotel: any) => (
                  <label key={hotel.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hotelIds?.includes(hotel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, hotelIds: [...(formData.hotelIds || []), hotel.id] });
                        } else {
                          setFormData({
                            ...formData,
                            hotelIds: formData.hotelIds?.filter((id) => id !== hotel.id) || [],
                          });
                        }
                      }}
                      className="rounded border-gray-700 bg-[#0B0F19] text-neon-cyan focus:ring-neon-cyan"
                    />
                    <span className="text-sm">{hotel.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 动作值 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {formData.ruleType === 'min_price' && '最低限价 (元)'}
                {formData.ruleType === 'max_discount' && '最大折扣 (%)'}
                {formData.ruleType === 'inventory_reserve' && '保留比例 (%)'}
                {formData.ruleType === 'channel_priority' && '优先级'}
              </label>
              <input
                type="number"
                value={formData.action?.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    action: { type: formData.ruleType || '', value: parseFloat(e.target.value) },
                  })
                }
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
                required
              />
            </div>

            {/* 入住率范围 */}
            {formData.ruleType === 'min_price' || formData.ruleType === 'inventory_reserve' ? (
              <div>
                <label className="block text-sm text-gray-400 mb-2">触发入住率范围 (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.conditions?.occupancyRange?.min || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          occupancyRange: {
                            min: parseInt(e.target.value),
                            max: formData.conditions?.occupancyRange?.max || 100,
                          },
                        },
                      })
                    }
                    className="flex-1 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.conditions?.occupancyRange?.max || 100}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          occupancyRange: {
                            min: formData.conditions?.occupancyRange?.min || 0,
                            max: parseInt(e.target.value),
                          },
                        },
                      })
                    }
                    className="flex-1 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
                  />
                </div>
              </div>
            ) : null}

            {/* 优先级 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">优先级 (1-100)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none h-20 resize-none"
                placeholder="规则说明..."
              />
            </div>

            {/* 按钮 */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
              >
                保存
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function StrategyManagement() {
  const [activeTab, setActiveTab] = useState<StrategyTab>('conflict');
  const { customers, addStrategyRule, updateStrategyRule, deleteStrategyRule, toggleStrategyRule } = useAdminStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GroupStrategyRule | null>(null);
  const [filterType, setFilterType] = useState<StrategyRuleType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'conflict' as StrategyTab, label: '冲突检测', icon: AlertTriangle, description: '集团策略与平台建议偏离预警' },
    { id: 'execution' as StrategyTab, label: '执行监控', icon: Play, description: '策略执行状态与异常追踪' },
    { id: 'rules' as StrategyTab, label: '策略规则', icon: Settings, description: '集团策略规则配置' },
  ];

  // 获取集团客户的策略规则
  const allRules = useMemo(() => {
    const rules: GroupStrategyRule[] = [];
    customers.forEach((c) => {
      if (c.type === 'group' && c.groupProfile?.strategyRules) {
        rules.push(...c.groupProfile.strategyRules);
      }
    });
    return rules;
  }, [customers]);

  // 过滤规则
  const filteredRules = useMemo(() => {
    return allRules.filter((rule) => {
      if (filterType !== 'all' && rule.ruleType !== filterType) return false;
      if (searchQuery && !rule.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allRules, filterType, searchQuery]);

  // 统计
  const stats = useMemo(() => {
    return {
      total: allRules.length,
      enabled: allRules.filter((r) => r.enabled).length,
      disabled: allRules.filter((r) => !r.enabled).length,
      byType: {
        min_price: allRules.filter((r) => r.ruleType === 'min_price').length,
        max_discount: allRules.filter((r) => r.ruleType === 'max_discount').length,
        inventory_reserve: allRules.filter((r) => r.ruleType === 'inventory_reserve').length,
        channel_priority: allRules.filter((r) => r.ruleType === 'channel_priority').length,
      },
    };
  }, [allRules]);

  const handleSaveRule = (formData: Partial<GroupStrategyRule>) => {
    const groupCustomer = customers.find((c) => c.type === 'group');
    if (!groupCustomer) return;

    if (editingRule) {
      updateStrategyRule(groupCustomer.id, editingRule.id, formData);
    } else {
      addStrategyRule(groupCustomer.id, formData as Omit<GroupStrategyRule, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setEditingRule(null);
  };

  const handleEdit = (rule: GroupStrategyRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (rule: GroupStrategyRule) => {
    if (confirm('确定要删除这条规则吗？')) {
      const groupCustomer = customers.find((c) => c.type === 'group');
      if (groupCustomer) {
        deleteStrategyRule(groupCustomer.id, rule.id);
      }
    }
  };

  const handleToggle = (rule: GroupStrategyRule) => {
    const groupCustomer = customers.find((c) => c.type === 'group');
    if (groupCustomer) {
      toggleStrategyRule(groupCustomer.id, rule.id);
    }
  };

  const handleAddNew = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-neon-amber/10 rounded-lg">
              <Shield size={24} className="text-neon-amber" />
            </div>
            策略管控中心
          </h1>
          <p className="text-sm text-gray-400 mt-1">管理集团策略与平台算法的协同，防止冲突并监控执行</p>
        </div>
      </motion.div>

      {/* Tab 导航 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 p-1 bg-[#151B2B] rounded-xl border border-gray-800"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto" />}
            </button>
          );
        })}
      </motion.div>

      {/* 提示信息 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl"
      >
        <Info size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-gray-300">{tabs.find((t) => t.id === activeTab)?.description}</p>
        </div>
      </motion.div>

      {/* Tab 内容 */}
      <AnimatePresence mode="wait">
        {activeTab === 'conflict' && (
          <motion.div
            key="conflict"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <StrategyConflictPanel customers={customers} suggestions={[]} />
          </motion.div>
        )}

        {activeTab === 'execution' && (
          <motion.div
            key="execution"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <StrategyExecutionMonitor customers={customers} />
          </motion.div>
        )}

        {activeTab === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-400">总规则数</p>
              </div>
              <div className="p-4 bg-neon-green/10 rounded-xl border border-neon-green/30">
                <p className="text-2xl font-bold text-neon-green">{stats.enabled}</p>
                <p className="text-xs text-gray-400">已启用</p>
              </div>
              <div className="p-4 bg-gray-500/10 rounded-xl border border-gray-500/30">
                <p className="text-2xl font-bold text-gray-400">{stats.disabled}</p>
                <p className="text-xs text-gray-400">已禁用</p>
              </div>
              <div className="p-4 bg-neon-cyan/10 rounded-xl border border-neon-cyan/30">
                <p className="text-2xl font-bold text-neon-cyan">{stats.byType.min_price}</p>
                <p className="text-xs text-gray-400">限价规则</p>
              </div>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索规则..."
                    className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as StrategyRuleType | 'all')}
                  className="px-4 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
                >
                  <option value="all">全部类型</option>
                  <option value="min_price">最低限价</option>
                  <option value="max_discount">最大折扣</option>
                  <option value="inventory_reserve">库存保留</option>
                  <option value="channel_priority">渠道优先</option>
                </select>
              </div>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
              >
                <Plus size={18} />
                新建规则
              </button>
            </div>

            {/* 规则列表 */}
            <div className="space-y-3">
              {filteredRules.length > 0 ? (
                filteredRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-[#151B2B] rounded-xl border border-gray-800">
                  <Settings size={48} className="mx-auto mb-3 opacity-30" />
                  <p>暂无策略规则</p>
                  <button
                    onClick={handleAddNew}
                    className="mt-4 text-neon-cyan hover:underline text-sm"
                  >
                    创建第一条规则 →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 规则编辑弹窗 */}
      <RuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rule={editingRule}
        onSave={handleSaveRule}
        customers={customers}
      />
    </div>
  );
}
