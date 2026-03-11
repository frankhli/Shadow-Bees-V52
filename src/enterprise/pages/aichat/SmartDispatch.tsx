/**
 * Shadow-Bees V52 - AI客服中心 - 智能分发规则（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. 规则按酒店配置（每个酒店可独立配置AI规则）
 * 3. 批量配置规则（选中多家酒店时统一配置）
 * 4. AI客服工作时间设置
 * 5. 规则复制到其他酒店
 * 
 * 主题：企业版浅色主题
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Bot, 
  UserCircle, 
  ArrowRight, 
  Plus, 
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  Copy,
  X,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';

// ==================== 类型定义 ====================

type DispatchAction = 'ai_handle' | 'human_handle' | 'ai_then_human' | 'hotel_assign';
type ConditionType = 'keyword' | 'intent' | 'channel' | 'hotel' | 'priority' | 'time';

interface DispatchRule {
  id: string;
  name: string;
  condition: {
    type: ConditionType;
    operator: 'contains' | 'equals' | 'not_equals' | 'in' | 'not_in';
    value: string | string[];
  };
  action: DispatchAction;
  aiConfig?: {
    useScriptLibrary: boolean;
    autoReply: boolean;
    confidenceThreshold: number;
  };
  humanConfig?: {
    assignTo: 'group_pool' | 'hotel_staff' | 'specific_person';
    specificPersonId?: string;
    escalationTimeout: number;
  };
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

interface HotelAIConfig {
  hotelId: string;
  hotelName: string;
  rules: DispatchRule[];
  workingHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  nonWorkingHoursAction: 'ai_handle' | 'leave_message';
  aiEnabled: boolean;
  autoReplyConfidence: number;
}

// ==================== Mock数据 ====================

const createDefaultRules = (): DispatchRule[] => [
  {
    id: 'rule_001',
    name: '标准价格咨询自动回复',
    condition: {
      type: 'intent',
      operator: 'equals',
      value: 'pricing_inquiry',
    },
    action: 'ai_handle',
    aiConfig: {
      useScriptLibrary: true,
      autoReply: true,
      confidenceThreshold: 0.8,
    },
    priority: 1,
    enabled: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'rule_002',
    name: '投诉类消息转人工',
    condition: {
      type: 'keyword',
      operator: 'contains',
      value: ['投诉', '不满', '差评', '退款', '赔偿'],
    },
    action: 'human_handle',
    humanConfig: {
      assignTo: 'group_pool',
      escalationTimeout: 5,
    },
    priority: 10,
    enabled: true,
    createdAt: new Date('2024-01-05'),
  },
  {
    id: 'rule_003',
    name: '高优先级客户人工处理',
    condition: {
      type: 'priority',
      operator: 'equals',
      value: 'high',
    },
    action: 'ai_then_human',
    aiConfig: {
      useScriptLibrary: true,
      autoReply: false,
      confidenceThreshold: 0.9,
    },
    humanConfig: {
      assignTo: 'group_pool',
      escalationTimeout: 2,
    },
    priority: 8,
    enabled: true,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'rule_004',
    name: '深夜时段AI托管',
    condition: {
      type: 'time',
      operator: 'in',
      value: ['22:00-08:00'],
    },
    action: 'ai_handle',
    aiConfig: {
      useScriptLibrary: true,
      autoReply: true,
      confidenceThreshold: 0.7,
    },
    priority: 3,
    enabled: true,
    createdAt: new Date('2024-02-15'),
  },
];

// ==================== 子组件 ====================

// 规则编辑弹窗
function RuleEditModal({
  isOpen,
  rule,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  rule: DispatchRule | null;
  onSave: (rule: DispatchRule) => void;
  onClose: () => void;
}) {
  // 使用宽松类型定义表单状态
  const [form, setForm] = useState<{
    name: string;
    condition: { type: ConditionType; operator: string; value: string | string[] };
    action: DispatchAction;
    priority: number;
    enabled: boolean;
    aiConfig: { useScriptLibrary: boolean; autoReply: boolean; confidenceThreshold: number };
    humanConfig: { assignTo: string; specificPersonId?: string; escalationTimeout: number };
  }>({
    name: '',
    condition: { type: 'keyword', operator: 'contains', value: '' },
    action: 'ai_handle',
    priority: 1,
    enabled: true,
    aiConfig: { useScriptLibrary: true, autoReply: true, confidenceThreshold: 0.8 },
    humanConfig: { assignTo: 'group_pool', escalationTimeout: 5 },
  });

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name,
        condition: { ...rule.condition },
        action: rule.action,
        priority: rule.priority,
        enabled: rule.enabled,
        aiConfig: rule.aiConfig ? { ...rule.aiConfig } : { useScriptLibrary: true, autoReply: true, confidenceThreshold: 0.8 },
        humanConfig: rule.humanConfig ? { ...rule.humanConfig } : { assignTo: 'group_pool', escalationTimeout: 5 },
      });
    } else {
      setForm({
        name: '',
        condition: { type: 'keyword', operator: 'contains', value: '' },
        action: 'ai_handle',
        priority: 1,
        enabled: true,
        aiConfig: { useScriptLibrary: true, autoReply: true, confidenceThreshold: 0.8 },
        humanConfig: { assignTo: 'group_pool', escalationTimeout: 5 },
      });
    }
  }, [rule, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.name) return;
    
    const newRule: DispatchRule = {
      id: rule?.id || `rule_${Date.now()}`,
      name: form.name,
      condition: {
        type: form.condition.type,
        operator: form.condition.operator as any,
        value: form.condition.value,
      },
      action: form.action,
      priority: form.priority,
      enabled: form.enabled,
      createdAt: rule?.createdAt || new Date(),
      aiConfig: form.action === 'ai_handle' || form.action === 'ai_then_human' 
        ? {
            useScriptLibrary: form.aiConfig.useScriptLibrary,
            autoReply: form.aiConfig.autoReply,
            confidenceThreshold: form.aiConfig.confidenceThreshold,
          }
        : undefined,
      humanConfig: form.action === 'human_handle' || form.action === 'ai_then_human' || form.action === 'hotel_assign'
        ? {
            assignTo: form.humanConfig.assignTo as any,
            specificPersonId: form.humanConfig.specificPersonId,
            escalationTimeout: form.humanConfig.escalationTimeout,
          }
        : undefined,
    };
    
    onSave(newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {rule ? '编辑规则' : '新建规则'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* 规则名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：价格咨询自动回复"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* 触发条件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">触发条件</label>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={form.condition?.type}
                onChange={(e) => setForm({ 
                  ...form, 
                  condition: { ...form.condition, type: e.target.value as ConditionType }
                })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="keyword">关键词</option>
                <option value="intent">意图</option>
                <option value="channel">渠道</option>
                <option value="priority">优先级</option>
                <option value="time">时间段</option>
              </select>
              <select
                value={form.condition?.operator}
                onChange={(e) => setForm({ 
                  ...form, 
                  condition: { ...form.condition, operator: e.target.value as any }
                })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="contains">包含</option>
                <option value="equals">等于</option>
                <option value="not_equals">不等于</option>
                <option value="in">在列表中</option>
              </select>
              <input
                type="text"
                value={Array.isArray(form.condition?.value) ? form.condition.value.join(',') : form.condition?.value}
                onChange={(e) => setForm({ 
                  ...form, 
                  condition: { 
                    ...form.condition, 
                    value: e.target.value.includes(',') ? e.target.value.split(',') : e.target.value 
                  }
                })}
                placeholder="输入条件值"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* 执行动作 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">执行动作</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'ai_handle', label: 'AI自动处理', desc: '适合标准化咨询' },
                { value: 'human_handle', label: '转人工处理', desc: '适合复杂或敏感问题' },
                { value: 'ai_then_human', label: 'AI辅助+人工', desc: 'AI建议后转人工确认' },
                { value: 'hotel_assign', label: '分配给酒店', desc: '转给酒店专属客服' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, action: opt.value as DispatchAction })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.action === opt.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <div className={`font-medium ${form.action === opt.value ? 'text-violet-700' : 'text-gray-900'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI配置 */}
          {(form.action === 'ai_handle' || form.action === 'ai_then_human') && (
            <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
              <h4 className="font-medium text-violet-900 mb-3">AI配置</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">使用话术库</span>
                  <button
                    onClick={() => setForm({ 
                      ...form, 
                      aiConfig: { ...form.aiConfig, useScriptLibrary: !form.aiConfig?.useScriptLibrary }
                    })}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      form.aiConfig?.useScriptLibrary ? 'bg-violet-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      form.aiConfig?.useScriptLibrary ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">自动回复（无需人工确认）</span>
                  <button
                    onClick={() => setForm({ 
                      ...form, 
                      aiConfig: { ...form.aiConfig, autoReply: !form.aiConfig?.autoReply }
                    })}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      form.aiConfig?.autoReply ? 'bg-violet-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      form.aiConfig?.autoReply ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div>
                  <span className="text-sm text-gray-700">置信度阈值: {Math.round((form.aiConfig?.confidenceThreshold || 0.8) * 100)}%</span>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={Math.round((form.aiConfig?.confidenceThreshold || 0.8) * 100)}
                    onChange={(e) => setForm({ 
                      ...form, 
                      aiConfig: { ...form.aiConfig, confidenceThreshold: parseInt(e.target.value) / 100 }
                    })}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 人工配置 */}
          {(form.action === 'human_handle' || form.action === 'ai_then_human' || form.action === 'hotel_assign') && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-3">人工配置</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-700">分配给</span>
                  <select
                    value={form.humanConfig?.assignTo}
                    onChange={(e) => setForm({ 
                      ...form, 
                      humanConfig: { ...form.humanConfig, assignTo: e.target.value as any }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="group_pool">集团客服池</option>
                    <option value="hotel_staff">酒店专属客服</option>
                    <option value="specific_person">指定人员</option>
                  </select>
                </div>
                <div>
                  <span className="text-sm text-gray-700">升级超时时间（分钟）</span>
                  <input
                    type="number"
                    value={form.humanConfig?.escalationTimeout}
                    onChange={(e) => setForm({ 
                      ...form, 
                      humanConfig: { ...form.humanConfig, escalationTimeout: parseInt(e.target.value) }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">优先级（数字越小越优先）</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            保存规则
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function SmartDispatch() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  // 各酒店的AI配置
  const [hotelConfigs, setHotelConfigs] = useState<Record<string, HotelAIConfig>>({});
  
  // 当前编辑的酒店ID
  const [activeHotelId, setActiveHotelId] = useState<string>('');
  
  // 弹窗状态
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DispatchRule | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetHotels, setCopyTargetHotels] = useState<string[]>([]);

  // 初始化酒店配置
  useEffect(() => {
    const configs: Record<string, HotelAIConfig> = {};
    selectedHotels.forEach(hotel => {
      if (!hotelConfigs[hotel.id]) {
        configs[hotel.id] = {
          hotelId: hotel.id,
          hotelName: hotel.name,
          rules: createDefaultRules(),
          workingHours: { enabled: true, start: '09:00', end: '22:00' },
          nonWorkingHoursAction: 'ai_handle',
          aiEnabled: true,
          autoReplyConfidence: 0.8,
        };
      }
    });
    if (Object.keys(configs).length > 0) {
      setHotelConfigs(prev => ({ ...prev, ...configs }));
    }
  }, [selectedHotels]);

  // 设置当前活动酒店
  useEffect(() => {
    if (selectedHotels.length > 0 && !activeHotelId) {
      setActiveHotelId(selectedHotels[0].id);
    }
  }, [selectedHotels, activeHotelId]);

  // 获取当前配置
  const currentConfig = activeHotelId ? hotelConfigs[activeHotelId] : null;

  // 保存规则
  const handleSaveRule = (rule: DispatchRule) => {
    if (!activeHotelId) return;
    
    setHotelConfigs(prev => {
      const config = prev[activeHotelId];
      const existingIndex = config.rules.findIndex(r => r.id === rule.id);
      
      let newRules;
      if (existingIndex >= 0) {
        newRules = [...config.rules];
        newRules[existingIndex] = rule;
      } else {
        newRules = [...config.rules, rule];
      }
      
      return {
        ...prev,
        [activeHotelId]: { ...config, rules: newRules }
      };
    });
  };

  // 删除规则
  const handleDeleteRule = (ruleId: string) => {
    if (!activeHotelId || !confirm('确定要删除这条规则吗？')) return;
    
    setHotelConfigs(prev => ({
      ...prev,
      [activeHotelId]: {
        ...prev[activeHotelId],
        rules: prev[activeHotelId].rules.filter(r => r.id !== ruleId)
      }
    }));
  };

  // 切换规则启用状态
  const toggleRule = (ruleId: string) => {
    if (!activeHotelId) return;
    
    setHotelConfigs(prev => ({
      ...prev,
      [activeHotelId]: {
        ...prev[activeHotelId],
        rules: prev[activeHotelId].rules.map(r => 
          r.id === ruleId ? { ...r, enabled: !r.enabled } : r
        )
      }
    }));
  };

  // 复制规则到其他酒店
  const handleCopyRules = () => {
    if (!activeHotelId || copyTargetHotels.length === 0) return;
    
    const sourceRules = hotelConfigs[activeHotelId].rules;
    
    setHotelConfigs(prev => {
      const next = { ...prev };
      copyTargetHotels.forEach(hotelId => {
        if (next[hotelId]) {
          next[hotelId] = {
            ...next[hotelId],
            rules: sourceRules.map(r => ({
              ...r,
              id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
            }))
          };
        }
      });
      return next;
    });
    
    setShowCopyModal(false);
    setCopyTargetHotels([]);
  };

  // 更新工作时间配置
  const updateWorkingHours = (updates: Partial<HotelAIConfig['workingHours']>) => {
    if (!activeHotelId) return;
    
    setHotelConfigs(prev => ({
      ...prev,
      [activeHotelId]: {
        ...prev[activeHotelId],
        workingHours: { ...prev[activeHotelId].workingHours, ...updates }
      }
    }));
  };

  // 获取动作显示
  const getActionDisplay = (action: DispatchAction) => {
    switch (action) {
      case 'ai_handle':
        return { label: 'AI自动处理', color: 'bg-violet-100 text-violet-700', icon: Bot };
      case 'human_handle':
        return { label: '转人工处理', color: 'bg-blue-100 text-blue-700', icon: UserCircle };
      case 'ai_then_human':
        return { label: 'AI辅助+人工', color: 'bg-green-100 text-green-700', icon: MessageSquare };
      case 'hotel_assign':
        return { label: '分配给酒店', color: 'bg-orange-100 text-orange-700', icon: Building2 };
    }
  };

  // 获取条件显示
  const getConditionDisplay = (condition: DispatchRule['condition']) => {
    const typeLabels: Record<string, string> = {
      keyword: '关键词',
      intent: '意图',
      channel: '渠道',
      priority: '优先级',
      time: '时间段',
    };
    
    const operatorLabels: Record<string, string> = {
      contains: '包含',
      equals: '等于',
      not_equals: '不等于',
      in: '在...中',
      not_in: '不在...中',
    };

    return `${typeLabels[condition.type]} ${operatorLabels[condition.operator]} "${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}"`;
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店配置AI规则</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          智能分发规则需要选择至少一家酒店才能配置。<br/>
          您可以为单酒店独立配置，或选中多家酒店后批量应用相同规则。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />

      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能分发规则</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `配置 ${selectedHotels[0].name} 的AI客服规则`
              : `批量配置 ${selectedHotels.length} 家酒店的AI规则`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedHotels.length > 1 && currentConfig && (
            <button
              onClick={() => setShowCopyModal(true)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              复制规则到其他酒店
            </button>
          )}
          <button 
            onClick={() => {
              setEditingRule(null);
              setShowRuleModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            新建规则
          </button>
        </div>
      </div>

      {/* 多酒店切换标签 */}
      {selectedHotels.length > 1 && (
        <div className="bg-white p-2 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sm text-gray-500 px-2">配置酒店：</span>
            {selectedHotels.map(hotel => (
              <button
                key={hotel.id}
                onClick={() => setActiveHotelId(hotel.id)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeHotelId === hotel.id
                    ? 'bg-violet-100 text-violet-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {hotel.name}
                {hotelConfigs[hotel.id] && (
                  <span className="ml-2 text-xs opacity-70">
                    ({hotelConfigs[hotel.id].rules.filter(r => r.enabled).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI客服基础配置 */}
      {currentConfig && (
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-xl border border-violet-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <Settings className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentConfig.hotelName} - AI客服配置
              </h3>
              
              {/* 工作时间设置 */}
              <div className="bg-white/70 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-600" />
                    <span className="font-medium text-gray-900">AI客服工作时间</span>
                  </div>
                  <button
                    onClick={() => updateWorkingHours({ enabled: !currentConfig.workingHours.enabled })}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      currentConfig.workingHours.enabled ? 'bg-violet-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      currentConfig.workingHours.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                
                {currentConfig.workingHours.enabled && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={currentConfig.workingHours.start}
                        onChange={(e) => updateWorkingHours({ start: e.target.value })}
                        className="px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <span className="text-gray-500">至</span>
                      <input
                        type="time"
                        value={currentConfig.workingHours.end}
                        onChange={(e) => updateWorkingHours({ end: e.target.value })}
                        className="px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">非工作时间：</span>
                      <select
                        value={currentConfig.nonWorkingHoursAction}
                        onChange={(e) => setHotelConfigs(prev => ({
                          ...prev,
                          [activeHotelId]: {
                            ...prev[activeHotelId],
                            nonWorkingHoursAction: e.target.value as any
                          }
                        }))}
                        className="px-2 py-1 border border-gray-200 rounded"
                      >
                        <option value="ai_handle">AI继续自动回复</option>
                        <option value="leave_message">仅记录留言</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-600" />
                  <span className="text-gray-600">AI自动处理：适合标准化咨询</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">人工处理：适合复杂或敏感问题</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 规则列表 */}
      {currentConfig && (
        <div className="space-y-4">
          {currentConfig.rules
            .sort((a, b) => a.priority - b.priority)
            .map((rule, index) => {
              const actionDisplay = getActionDisplay(rule.action);
              const ActionIcon = actionDisplay.icon;
              
              return (
                <div 
                  key={rule.id} 
                  className={`bg-white rounded-xl border ${rule.enabled ? 'border-gray-200' : 'border-gray-200 bg-gray-50'} overflow-hidden`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      {/* 左侧：优先级和名称 */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                          <span className="text-xs text-gray-400">优先级</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold ${rule.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                              {rule.name}
                            </h4>
                            {!rule.enabled && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                已禁用
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Filter className="w-4 h-4" />
                            <span>如果 {getConditionDisplay(rule.condition)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 中间：动作 */}
                      <div className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-gray-300" />
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${actionDisplay.color}`}>
                          <ActionIcon className="w-4 h-4" />
                          {actionDisplay.label}
                        </span>
                      </div>

                      {/* 右侧：操作 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-6 h-6 text-violet-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleModal(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 详细配置 */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-sm">
                      {rule.aiConfig && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Bot className="w-4 h-4 text-violet-500" />
                          <span>AI配置：</span>
                          <span className={rule.aiConfig.autoReply ? 'text-green-600' : 'text-gray-400'}>
                            {rule.aiConfig.autoReply ? '自动回复' : '建议回复'}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>置信度 ≥ {Math.round(rule.aiConfig.confidenceThreshold * 100)}%</span>
                        </div>
                      )}
                      {rule.humanConfig && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserCircle className="w-4 h-4 text-blue-500" />
                          <span>人工配置：</span>
                          <span>
                            {rule.humanConfig.assignTo === 'group_pool' && '集团客服池'}
                            {rule.humanConfig.assignTo === 'hotel_staff' && '酒店人员'}
                            {rule.humanConfig.assignTo === 'specific_person' && '指定人员'}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>{rule.humanConfig.escalationTimeout}分钟内响应</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          
          {currentConfig.rules.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">暂无分发规则</p>
              <button 
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleModal(true);
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                新建规则
              </button>
            </div>
          )}
        </div>
      )}

      {/* 流程说明 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">消息处理流程</h4>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-gray-900">消息接入</div>
            <div className="text-xs text-gray-500">统一收件箱</div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-violet-100 flex items-center justify-center">
              <Filter className="w-6 h-6 text-violet-600" />
            </div>
            <div className="text-sm font-medium text-gray-900">规则匹配</div>
            <div className="text-xs text-gray-500">按优先级顺序</div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-sm font-medium text-gray-900">AI/人工处理</div>
            <div className="text-xs text-gray-500">自动或人工回复</div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-sm font-medium text-gray-900">完成归档</div>
            <div className="text-xs text-gray-500">记录数据</div>
          </div>
        </div>
      </div>

      {/* 规则编辑弹窗 */}
      <RuleEditModal
        isOpen={showRuleModal}
        rule={editingRule}
        onSave={handleSaveRule}
        onClose={() => {
          setShowRuleModal(false);
          setEditingRule(null);
        }}
      />

      {/* 复制规则弹窗 */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">复制规则到其他酒店</h3>
            <p className="text-gray-600 mb-4">
              将 <strong>{currentConfig?.hotelName}</strong> 的 {currentConfig?.rules.length} 条规则复制到：
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {selectedHotels
                .filter(h => h.id !== activeHotelId)
                .map(hotel => (
                  <label key={hotel.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={copyTargetHotels.includes(hotel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCopyTargetHotels([...copyTargetHotels, hotel.id]);
                        } else {
                          setCopyTargetHotels(copyTargetHotels.filter(id => id !== hotel.id));
                        }
                      }}
                      className="w-4 h-4 text-violet-600"
                    />
                    <span>{hotel.name}</span>
                  </label>
                ))}
            </div>
            
            {selectedHotels.filter(h => h.id !== activeHotelId).length === 0 && (
              <p className="text-gray-500 text-center py-4">没有其他酒店可复制</p>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyTargetHotels([]);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCopyRules}
                disabled={copyTargetHotels.length === 0}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                确认复制
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartDispatch;
