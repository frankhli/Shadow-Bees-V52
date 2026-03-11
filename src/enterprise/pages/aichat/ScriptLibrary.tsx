/**
 * Shadow-Bees V52 - AI客服中心 - 话术库管理（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. 集团话术 + 酒店自定义话术分层管理
 * 3. 批量应用到多家酒店
 * 4. AI推荐话术标记
 * 5. 话术使用统计
 * 
 * 主题：企业版浅色主题
 */

import { useState, useMemo, useEffect } from 'react';
import { scriptApi } from '../../api';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy,
  Check,
  Building2,
  Globe,
  MessageCircle,
  Sparkles,
  X,
  Layers,
  Send,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';

// ==================== 类型定义 ====================

type ScriptCategory = 'greeting' | 'pricing' | 'facility' | 'booking' | 'complaint' | 'other';
type ScriptScope = 'group' | 'hotel';

interface Script {
  id: string;
  title: string;
  content: string;
  category: ScriptCategory;
  scope: ScriptScope;
  hotelIds: string[];  // 支持多酒店
  hotelNames: string[];
  channels: string[];
  tags: string[];
  usageCount: number;
  aiRecommended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 话术分类配置
const CATEGORIES: Record<ScriptCategory, { name: string; color: string; icon: string }> = {
  greeting: { name: '问候欢迎', color: 'bg-green-100 text-green-700', icon: '👋' },
  pricing: { name: '价格咨询', color: 'bg-blue-100 text-blue-700', icon: '💰' },
  facility: { name: '设施服务', color: 'bg-purple-100 text-purple-700', icon: '🏨' },
  booking: { name: '预订相关', color: 'bg-orange-100 text-orange-700', icon: '📅' },
  complaint: { name: '投诉处理', color: 'bg-red-100 text-red-700', icon: '😔' },
  other: { name: '其他', color: 'bg-gray-100 text-gray-700', icon: '📝' },
};

// ==================== 子组件 ====================

// 话术编辑弹窗
function ScriptEditModal({
  isOpen,
  script,
  selectedHotels,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  script: Script | null;
  selectedHotels: { id: string; name: string }[];
  onSave: (script: Script) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Script>>({
    title: '',
    content: '',
    category: 'greeting',
    scope: 'group',
    hotelIds: [],
    hotelNames: [],
    channels: ['wechat', 'xianyu'],
    tags: [],
    aiRecommended: false,
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (script) {
      setForm({ ...script });
    } else {
      setForm({
        title: '',
        content: '',
        category: 'greeting',
        scope: selectedHotels.length === 1 ? 'hotel' : 'group',
        hotelIds: selectedHotels.length === 1 ? [selectedHotels[0].id] : [],
        hotelNames: selectedHotels.length === 1 ? [selectedHotels[0].name] : [],
        channels: ['wechat', 'xianyu'],
        tags: [],
        aiRecommended: false,
      });
    }
  }, [script, isOpen, selectedHotels]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.title || !form.content) return;

    const newScript: Script = {
      id: script?.id || `script_${Date.now()}`,
      title: form.title!,
      content: form.content!,
      category: form.category as ScriptCategory,
      scope: form.scope as ScriptScope,
      hotelIds: form.scope === 'hotel' ? (form.hotelIds || []) : [],
      hotelNames: form.scope === 'hotel' ? (form.hotelNames || []) : [],
      channels: form.channels || ['wechat'],
      tags: form.tags || [],
      usageCount: script?.usageCount || 0,
      aiRecommended: form.aiRecommended || false,
      createdAt: script?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSave(newScript);
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags?.filter(t => t !== tag) || [] });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {script ? '编辑话术' : '新建话术'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 话术标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">话术标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="如：标准问候语"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* 话术内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">话术内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="输入话术内容，支持变量如{酒店名称}、{价格}等..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              支持变量：{'{酒店名称}'}, {'{房型}'}, {'{价格}'}, {'{日期}'}, {'{补偿方案}'}
            </p>
          </div>

          {/* 分类和范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ScriptCategory })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {Object.entries(CATEGORIES).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">适用范围</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as ScriptScope })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="group">集团统一</option>
                <option value="hotel">酒店自定义</option>
              </select>
            </div>
          </div>

          {/* 酒店选择（仅酒店自定义时显示） */}
          {form.scope === 'hotel' && selectedHotels.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">应用到酒店</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedHotels.map(hotel => (
                  <label key={hotel.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.hotelIds?.includes(hotel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            hotelIds: [...(form.hotelIds || []), hotel.id],
                            hotelNames: [...(form.hotelNames || []), hotel.name],
                          });
                        } else {
                          const idx = form.hotelIds?.indexOf(hotel.id) || -1;
                          if (idx >= 0) {
                            const newIds = [...(form.hotelIds || [])];
                            const newNames = [...(form.hotelNames || [])];
                            newIds.splice(idx, 1);
                            newNames.splice(idx, 1);
                            setForm({ ...form, hotelIds: newIds, hotelNames: newNames });
                          }
                        }
                      }}
                      className="w-4 h-4 text-violet-600"
                    />
                    <span className="text-sm">{hotel.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 适用渠道 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">适用渠道</label>
            <div className="flex gap-3">
              {[
                { id: 'wechat', name: '微信' },
                { id: 'xianyu', name: '闲鱼' },
                { id: 'xiaohongshu', name: '小红书' },
              ].map(channel => (
                <label key={channel.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.channels?.includes(channel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, channels: [...(form.channels || []), channel.id] });
                      } else {
                        setForm({ ...form, channels: form.channels?.filter(c => c !== channel.id) || [] });
                      }
                    }}
                    className="w-4 h-4 text-violet-600"
                  />
                  <span className="text-sm">{channel.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags?.map(tag => (
                <span key={tag} className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-violet-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="输入标签按回车添加"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                添加
              </button>
            </div>
          </div>

          {/* AI推荐 */}
          <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-700">标记为AI推荐话术</span>
            </div>
            <button
              onClick={() => setForm({ ...form, aiRecommended: !form.aiRecommended })}
              className={`w-11 h-6 rounded-full transition-colors ${
                form.aiRecommended ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                form.aiRecommended ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
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
            disabled={!form.title || !form.content}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            保存话术
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function ScriptLibrary() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  const [scripts, setScripts] = useState<Script[]>([]);

  // 从 API 加载话术数据
  // 加载话术 - 当酒店选择变化时重新加载
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const response = await scriptApi.getScripts({ page: 1, pageSize: 50 });
        if (response.success) {
          setScripts(response.data.list as unknown as Script[]);
        }
      } catch (error) {
        console.error('加载话术失败:', error);
      }
    };
    loadScripts();
  }, [selectedHotels]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // 获取当前选中酒店ID集合（转为Set便于查找）
  const selectedHotelIdSet = useMemo(() => 
    new Set(selectedHotels.map(h => h.id)),
    [selectedHotels]
  );

  // 过滤话术：显示集团话术 + 选中酒店的自定义话术
  const filteredScripts = useMemo(() => {
    return scripts.filter(script => {
      // 分类过滤
      if (filterCategory !== 'all' && script.category !== filterCategory) return false;
      
      // 范围过滤
      if (filterScope !== 'all' && script.scope !== filterScope) return false;
      
      // 酒店可见性过滤
      if (script.scope === 'hotel') {
        // 酒店话术：只有当选中酒店包含该话术所属酒店时才显示
        if (selectedHotels.length === 0) return false;
        const isVisible = script.hotelIds.some(id => selectedHotelIdSet.has(id));
        if (!isVisible) return false;
      }
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          script.title.toLowerCase().includes(query) ||
          script.content.toLowerCase().includes(query) ||
          script.tags.some(t => t.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [scripts, filterCategory, filterScope, searchQuery, selectedHotels, selectedHotelIdSet]);

  // 统计数据
  const stats = useMemo(() => {
    const visibleScripts = scripts.filter(script => {
      if (script.scope === 'hotel') {
        return script.hotelIds.some(id => selectedHotelIdSet.has(id));
      }
      return true;
    });
    
    return {
      total: visibleScripts.length,
      group: visibleScripts.filter(s => s.scope === 'group').length,
      hotel: visibleScripts.filter(s => s.scope === 'hotel').length,
      aiRecommended: visibleScripts.filter(s => s.aiRecommended).length,
      totalUsage: visibleScripts.reduce((sum, s) => sum + s.usageCount, 0),
    };
  }, [scripts, selectedHotelIdSet]);

  // 复制话术
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 删除话术
  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条话术吗？')) {
      setScripts(prev => prev.filter(s => s.id !== id));
      setSelectedScripts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (confirm(`确定要删除选中的 ${selectedScripts.size} 条话术吗？`)) {
      setScripts(prev => prev.filter(s => !selectedScripts.has(s.id)));
      setSelectedScripts(new Set());
      setBatchMode(false);
    }
  };

  // 保存话术
  const handleSaveScript = (script: Script) => {
    setScripts(prev => {
      const existing = prev.find(s => s.id === script.id);
      if (existing) {
        return prev.map(s => s.id === script.id ? script : s);
      }
      return [...prev, script];
    });
  };

  // 切换话术选择
  const toggleScriptSelection = (id: string) => {
    setSelectedScripts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedScripts.size === filteredScripts.length) {
      setSelectedScripts(new Set());
    } else {
      setSelectedScripts(new Set(filteredScripts.map(s => s.id)));
    }
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看话术库</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          话术库需要选择至少一家酒店才能查看。<br/>
          集团统一话术对所有酒店生效，酒店自定义话术仅对指定酒店显示。
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
          <h1 className="text-2xl font-bold text-gray-900">话术库管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `管理 ${selectedHotels[0].name} 的话术模板`
              : `管理 ${selectedHotels.length} 家酒店的话术模板`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              batchMode 
                ? 'bg-violet-100 text-violet-700' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            {batchMode ? '退出批量' : '批量管理'}
          </button>
          <button 
            onClick={() => {
              setEditingScript(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            新建话术
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">可见话术</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.group}</div>
              <div className="text-sm text-gray-500">集团话术</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.hotel}</div>
              <div className="text-sm text-gray-500">酒店话术</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.aiRecommended}</div>
              <div className="text-sm text-gray-500">AI推荐</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(stats.totalUsage / 1000).toFixed(1)}k</div>
              <div className="text-sm text-gray-500">总使用次数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          {batchMode && (
            <button
              onClick={toggleSelectAll}
              className="px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg"
            >
              {selectedScripts.size === filteredScripts.length ? '取消全选' : '全选'}
            </button>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索话术标题、内容、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <option value="all">全部分类</option>
            {Object.entries(CATEGORIES).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <option value="all">全部范围</option>
            <option value="group">集团统一</option>
            <option value="hotel">酒店自定义</option>
          </select>
        </div>
      </div>

      {/* 批量操作栏 */}
      {batchMode && selectedScripts.size > 0 && (
        <div className="bg-violet-50 p-4 rounded-xl border border-violet-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-violet-600" />
            <span className="text-violet-900 font-medium">
              已选择 {selectedScripts.size} 条话术
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
            <button
              onClick={() => setSelectedScripts(new Set())}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              清空选择
            </button>
          </div>
        </div>
      )}

      {/* 话术列表 */}
      <div className="grid grid-cols-2 gap-4">
        {filteredScripts.map((script) => (
          <div 
            key={script.id} 
            className={`bg-white p-5 rounded-xl border transition-colors ${
              selectedScripts.has(script.id) 
                ? 'border-violet-500 ring-2 ring-violet-100' 
                : 'border-gray-200 hover:border-violet-300'
            }`}
          >
            {/* 头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {batchMode && (
                  <input
                    type="checkbox"
                    checked={selectedScripts.has(script.id)}
                    onChange={() => toggleScriptSelection(script.id)}
                    className="w-4 h-4 text-violet-600"
                  />
                )}
                <h3 className="font-semibold text-gray-900">{script.title}</h3>
                {script.aiRecommended && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI推荐
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleCopy(script.content, script.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                  title="复制"
                >
                  {copiedId === script.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button 
                  onClick={() => setEditingScript(script)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(script.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 内容 */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{script.content}</p>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2 py-1 text-xs rounded-full ${CATEGORIES[script.category]?.color || 'bg-gray-100 text-gray-700'}`}>
                {CATEGORIES[script.category]?.name || script.category || '其他'}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                script.scope === 'group' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {script.scope === 'group' 
                  ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> 集团统一</span>
                  : <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {script.hotelNames?.[0] || '未知酒店'}{script.hotelNames?.length > 1 ? `等${script.hotelNames.length}家` : ''}</span>
                }
              </span>
              {script.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            {/* 底部信息 */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  使用 {script.usageCount.toLocaleString()} 次
                </span>
                <span className="text-gray-300">|</span>
                <span>适用: {script.channels?.join(', ') || '全渠道'}</span>
              </div>
              <span>更新 {script.updatedAt ? new Date(script.updatedAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredScripts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">暂无符合条件的话术</p>
          <p className="text-sm text-gray-400 mb-4">
            {searchQuery ? '尝试调整搜索条件' : '当前选中酒店暂无自定义话术'}
          </p>
          <button 
            onClick={() => {
              setEditingScript(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            新建话术
          </button>
        </div>
      )}

      {/* 话术编辑弹窗 */}
      <ScriptEditModal
        isOpen={showAddModal || editingScript !== null}
        script={editingScript}
        selectedHotels={selectedHotels}
        onSave={handleSaveScript}
        onClose={() => {
          setShowAddModal(false);
          setEditingScript(null);
        }}
      />
    </div>
  );
}

export default ScriptLibrary;
