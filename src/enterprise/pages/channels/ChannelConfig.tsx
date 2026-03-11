/**
 * Shadow-Bees V52 - 渠道配置管理（企业版）
 * 
 * 核心功能：
 * 1. 按酒店配置渠道（单酒店模式）
 * 2. 批量配置渠道（多酒店模式）
 * 3. 动态添加/删除自定义渠道
 * 4. 统一渠道模板管理
 * 
 * 主题：企业版浅色主题
 */

import { useState, useMemo } from 'react';
import { 
  Plus, 
  ToggleLeft, 
  ToggleRight,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  Building2,
  Layers,
  X,
  Info,
  Save,
  Settings,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';

// ==================== 类型定义 ====================

// 渠道平台类型
type ChannelType = 'content' | 'c2c' | 'private';
type PricingStrategy = 'same' | 'premium' | 'discount';

interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  logo: string;
  color: string;
  bgColor: string;
  description: string;
  features: string[];
  isCustom?: boolean; // 是否为自定义添加的渠道
}

interface HotelChannelConfig {
  hotelId: string;
  hotelName: string;
  channels: Record<string, { // key 是 channel.id
    enabled: boolean;
    quota: number;
    pricingStrategy: PricingStrategy;
    pricingAdjustment: number;
    apiConnected: boolean;
    apiStatus?: 'connected' | 'disconnected' | 'error';
  }>;
}

interface NewChannelForm {
  name: string;
  type: ChannelType;
  logo: string;
  color: string;
  description: string;
  features: string;
}

// ==================== 常量配置 ====================

const PLATFORM_TEMPLATES: Record<string, Channel> = {
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    type: 'content',
    logo: '/logos/xiaohongshu.jpg',
    color: '#FF2442',
    bgColor: 'bg-red-50',
    description: '生活方式分享平台，适合酒店种草和体验分享',
    features: ['笔记发布', '商品挂载', '私信咨询'],
  },
  xianyu: {
    id: 'xianyu',
    name: '闲鱼',
    type: 'c2c',
    logo: '/logos/xianyu.jpg',
    color: '#FF6B00',
    bgColor: 'bg-orange-50',
    description: '二手交易平台，适合尾房促销和特价房销售',
    features: ['商品发布', '价格议价', '即时消息'],
  },
  wechat: {
    id: 'wechat',
    name: '微信',
    type: 'private',
    logo: '/logos/wechat.jpg',
    color: '#07C160',
    bgColor: 'bg-green-50',
    description: '私域流量核心阵地，适合老客户维护',
    features: ['朋友圈', '私聊', '小程序', '公众号'],
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    type: 'content',
    logo: '/logos/douyin.jpg',
    color: '#000000',
    bgColor: 'bg-gray-100',
    description: '短视频平台，适合酒店展示和直播带货',
    features: ['短视频', '直播', '商品橱窗', '私信'],
  },
  mafengwo: {
    id: 'mafengwo',
    name: '马蜂窝',
    type: 'content',
    logo: '',
    color: '#FF9D00',
    bgColor: 'bg-amber-50',
    description: '旅游攻略平台，适合目的地酒店推荐',
    features: ['攻略发布', '酒店关联', '问答'],
  },
  qiongyou: {
    id: 'qiongyou',
    name: '穷游',
    type: 'content',
    logo: '',
    color: '#00A651',
    bgColor: 'bg-emerald-50',
    description: '出境游社区，适合国际酒店推广',
    features: ['游记发布', '酒店评价', '问答'],
  },
  zhuanzhuan: {
    id: 'zhuanzhuan',
    name: '转转',
    type: 'c2c',
    logo: '',
    color: '#FF4D4F',
    bgColor: 'bg-red-50',
    description: '二手交易平台，适合尾房清仓',
    features: ['商品发布', '价格议价', '即时消息'],
  },
};

const CHANNEL_TYPE_INFO: Record<ChannelType, { name: string; description: string; features: string[] }> = {
  content: {
    name: '内容种草类',
    description: '通过优质内容吸引用户，建立品牌认知后转化',
    features: ['笔记发布', '视频挂载', '种草转化'],
  },
  c2c: {
    name: 'C2C成交类',
    description: '直接发布商品，用户询价后成交',
    features: ['商品发布', '价格议价', '即时成交'],
  },
  private: {
    name: '私域运营类',
    description: '建立私域流量池，持续触达和复购',
    features: ['朋友圈', '私聊', '社群'],
  },
};

// ==================== 工具函数 ====================

const getPricingDisplay = (strategy: PricingStrategy, adjustment: number) => {
  switch (strategy) {
    case 'same':
      return { label: '与主价格一致', color: 'text-gray-600', bg: 'bg-gray-100' };
    case 'premium':
      return { label: `溢价 ${adjustment}%`, color: 'text-green-600', bg: 'bg-green-50' };
    case 'discount':
      return { label: `降价 ${Math.abs(adjustment)}%`, color: 'text-orange-600', bg: 'bg-orange-50' };
  }
};

// 生成默认配置
const createDefaultConfig = (channelIds: string[]): Record<string, HotelChannelConfig['channels'][string]> => {
  const config: Record<string, HotelChannelConfig['channels'][string]> = {};
  channelIds.forEach(id => {
    config[id] = {
      enabled: ['xiaohongshu', 'xianyu', 'wechat'].includes(id),
      quota: 20,
      pricingStrategy: id === 'xianyu' ? 'discount' : id === 'xiaohongshu' ? 'premium' : 'same',
      pricingAdjustment: id === 'xianyu' ? -5 : id === 'xiaohongshu' ? 10 : 0,
      apiConnected: false,
      apiStatus: 'disconnected',
    };
  });
  return config;
};

// ==================== 子组件 ====================

// 渠道卡片
function ChannelCard({
  channel,
  config,
  onToggle,
  onEdit,
  onDelete,
  isBatchMode = false,
  isSelected = false,
  onSelect,
}: {
  channel: Channel;
  config: HotelChannelConfig['channels'][string];
  onToggle: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const pricingDisplay = getPricingDisplay(config.pricingStrategy, config.pricingAdjustment);
  
  return (
    <div 
      className={`bg-white rounded-xl border overflow-hidden transition-all ${
        isBatchMode && isSelected 
          ? 'border-violet-500 ring-2 ring-violet-100' 
          : config.enabled 
            ? 'border-gray-200' 
            : 'border-gray-200 bg-gray-50/50'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          {/* 左侧：渠道信息 */}
          <div className="flex items-start gap-4">
            {isBatchMode && onSelect && (
              <button
                onClick={onSelect}
                className={`w-5 h-5 rounded border flex items-center justify-center mt-1 ${
                  isSelected 
                    ? 'bg-violet-600 border-violet-600 text-white' 
                    : 'border-gray-300 hover:border-violet-400'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            )}
            
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: `${channel.color}15` }}
            >
              {channel.logo ? (
                <img src={channel.logo} alt={channel.name} className="w-10 h-10 object-contain" />
              ) : (
                <div className="text-xl font-bold" style={{ color: channel.color }}>
                  {channel.name.charAt(0)}
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                {channel.isCustom && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                    自定义
                  </span>
                )}
                {!config.enabled && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                    未启用
                  </span>
                )}
                {config.apiConnected && config.apiStatus === 'connected' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    API已连接
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">{channel.description}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded ${pricingDisplay.bg} ${pricingDisplay.color}`}>
                  {pricingDisplay.label}
                </span>
                <span className="text-gray-600">
                  日配额: {config.quota} 间夜
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：操作 */}
          <div className="flex items-center gap-2">
            {config.enabled && (
              <>
                <button 
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </button>
                {!config.apiConnected && (
                  <button className="px-3 py-1.5 text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    连接API
                  </button>
                )}
              </>
            )}
            
            {channel.isCustom && onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {config.enabled ? (
                <ToggleRight className="w-6 h-6 text-violet-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 功能标签 */}
        {config.enabled && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            {channel.features.map((feature, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 批量配置面板
function BatchConfigPanel({
  selectedChannels,
  channels,
  onApply,
  onCancel,
}: {
  selectedChannels: string[];
  channels: Channel[];
  onApply: (config: Partial<HotelChannelConfig['channels'][string]>) => void;
  onCancel: () => void;
}) {
  const [config, setConfig] = useState({
    enabled: true,
    quota: 20,
    pricingStrategy: 'same' as PricingStrategy,
    pricingAdjustment: 0,
  });

  const selectedChannelNames = selectedChannels
    .map(id => channels.find(c => c.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">批量配置</h3>
          <span className="text-sm text-violet-600">
            已选择 {selectedChannels.length} 个渠道
          </span>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        将同时配置: {selectedChannelNames.join('、')}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">启用状态</label>
          <select
            value={config.enabled ? 'true' : 'false'}
            onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="true">启用</option>
            <option value="false">禁用</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日配额（间夜）</label>
          <input
            type="number"
            value={config.quota}
            onChange={(e) => setConfig({ ...config, quota: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">定价策略</label>
          <select
            value={config.pricingStrategy}
            onChange={(e) => setConfig({ ...config, pricingStrategy: e.target.value as PricingStrategy })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="same">与主价格一致</option>
            <option value="premium">溢价</option>
            <option value="discount">降价</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">调价幅度（%）</label>
          <input
            type="number"
            value={config.pricingAdjustment}
            onChange={(e) => setConfig({ ...config, pricingAdjustment: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-lg"
        >
          取消
        </button>
        <button
          onClick={() => onApply(config)}
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          应用配置
        </button>
      </div>
    </div>
  );
}

// 添加渠道弹窗
function AddChannelModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (channel: Channel) => void;
}) {
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customForm, setCustomForm] = useState<NewChannelForm>({
    name: '',
    type: 'content',
    logo: '',
    color: '#6366F1',
    description: '',
    features: '',
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (activeTab === 'template' && selectedTemplate) {
      const template = PLATFORM_TEMPLATES[selectedTemplate];
      if (template) {
        onAdd({ ...template, isCustom: false });
      }
    } else if (activeTab === 'custom') {
      const newChannel: Channel = {
        id: `custom-${Date.now()}`,
        name: customForm.name,
        type: customForm.type,
        logo: customForm.logo,
        color: customForm.color,
        bgColor: 'bg-gray-50',
        description: customForm.description,
        features: customForm.features.split(',').map(f => f.trim()).filter(Boolean),
        isCustom: true,
      };
      onAdd(newChannel);
    }
    onClose();
    setSelectedTemplate('');
    setCustomForm({ name: '', type: 'content', logo: '', color: '#6366F1', description: '', features: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">添加渠道</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Tab 切换 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('template')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'template' 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              从模板添加
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'custom' 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              自定义渠道
            </button>
          </div>

          {activeTab === 'template' ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PLATFORM_TEMPLATES).map(([id, channel]) => (
                <button
                  key={id}
                  onClick={() => setSelectedTemplate(id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedTemplate === id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${channel.color}15` }}
                    >
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <span style={{ color: channel.color }}>{channel.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{channel.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">渠道名称 *</label>
                  <input
                    type="text"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    placeholder="如：美团"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">渠道类型</label>
                  <select
                    value={customForm.type}
                    onChange={(e) => setCustomForm({ ...customForm, type: e.target.value as ChannelType })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="content">内容种草类</option>
                    <option value="c2c">C2C成交类</option>
                    <option value="private">私域运营类</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={customForm.logo}
                  onChange={(e) => setCustomForm({ ...customForm, logo: e.target.value })}
                  placeholder="https://example.com/logo.png（可选）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">主题色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customForm.color}
                      onChange={(e) => setCustomForm({ ...customForm, color: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-200"
                    />
                    <input
                      type="text"
                      value={customForm.color}
                      onChange={(e) => setCustomForm({ ...customForm, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">功能特性（用逗号分隔）</label>
                  <input
                    type="text"
                    value={customForm.features}
                    onChange={(e) => setCustomForm({ ...customForm, features: e.target.value })}
                    placeholder="商品发布, 价格议价"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渠道描述</label>
                <textarea
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                  placeholder="简要描述该渠道的特点和用途"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            disabled={activeTab === 'template' ? !selectedTemplate : !customForm.name}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加渠道
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function ChannelConfig() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  
  // 渠道列表（包含自定义添加的）
  const [channels, setChannels] = useState<Channel[]>([
    PLATFORM_TEMPLATES.xiaohongshu,
    PLATFORM_TEMPLATES.xianyu,
    PLATFORM_TEMPLATES.wechat,
    PLATFORM_TEMPLATES.douyin,
  ]);
  
  // 初始化时同步到 localStorage
  useMemo(() => {
    const platformData = channels.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      bgColor: c.bgColor,
      logo: c.logo,
      type: c.type,
    }));
    localStorage.setItem('shadow-bees-channel-config', JSON.stringify(platformData));
  }, []);
  
  // 各酒店的渠道配置
  const [hotelConfigs, setHotelConfigs] = useState<Record<string, HotelChannelConfig>>({});
  
  // 批量模式状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  // 添加渠道弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 编辑渠道弹窗
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  
  // 确保所有酒店都有配置
  const ensureHotelConfigs = () => {
    const newConfigs = { ...hotelConfigs };
    selectedHotels.forEach(hotel => {
      if (!newConfigs[hotel.id]) {
        newConfigs[hotel.id] = {
          hotelId: hotel.id,
          hotelName: hotel.name,
          channels: createDefaultConfig(channels.map(c => c.id)),
        };
      }
    });
    setHotelConfigs(newConfigs);
  };
  
  // 当选择的酒店变化时，确保配置存在
  useMemo(() => {
    ensureHotelConfigs();
  }, [selectedHotels.length]);
  
  // 获取当前显示的渠道配置（单酒店模式）
  const getSingleHotelConfig = (): HotelChannelConfig | null => {
    if (selectedHotels.length !== 1) return null;
    return hotelConfigs[selectedHotels[0].id] || null;
  };
  
  // 更新单个酒店的渠道配置
  const updateHotelChannel = (hotelId: string, channelId: string, updates: Partial<HotelChannelConfig['channels'][string]>) => {
    setHotelConfigs(prev => ({
      ...prev,
      [hotelId]: {
        ...prev[hotelId],
        channels: {
          ...prev[hotelId].channels,
          [channelId]: { ...prev[hotelId].channels[channelId], ...updates },
        },
      },
    }));
  };
  
  // 批量更新渠道配置（应用到所有选中的酒店）
  const batchUpdateChannels = (channelIds: string[], updates: Partial<HotelChannelConfig['channels'][string]>) => {
    setHotelConfigs(prev => {
      const newConfigs = { ...prev };
      selectedHotels.forEach(hotel => {
        if (!newConfigs[hotel.id]) {
          newConfigs[hotel.id] = {
            hotelId: hotel.id,
            hotelName: hotel.name,
            channels: createDefaultConfig(channels.map(c => c.id)),
          };
        }
        channelIds.forEach(channelId => {
          newConfigs[hotel.id].channels[channelId] = {
            ...newConfigs[hotel.id].channels[channelId],
            ...updates,
          };
        });
      });
      return newConfigs;
    });
    setBatchMode(false);
    setSelectedChannels([]);
  };
  
  // 切换渠道启用状态
  const toggleChannel = (hotelId: string, channelId: string) => {
    const config = hotelConfigs[hotelId]?.channels[channelId];
    if (config) {
      updateHotelChannel(hotelId, channelId, { enabled: !config.enabled });
    }
  };
  
  // 添加新渠道
  const handleAddChannel = (newChannel: Channel) => {
    const updatedChannels = [...channels, newChannel];
    setChannels(updatedChannels);
    
    // 同步到 localStorage，供账号管理页面读取
    const platformData = updatedChannels.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      bgColor: c.bgColor,
      logo: c.logo,
      type: c.type,
    }));
    localStorage.setItem('shadow-bees-channel-config', JSON.stringify(platformData));
    
    // 为所有已有配置的酒店添加该渠道的默认配置
    setHotelConfigs(prev => {
      const newConfigs = { ...prev };
      Object.keys(newConfigs).forEach(hotelId => {
        newConfigs[hotelId].channels[newChannel.id] = {
          enabled: false,
          quota: 20,
          pricingStrategy: 'same',
          pricingAdjustment: 0,
          apiConnected: false,
          apiStatus: 'disconnected',
        };
      });
      return newConfigs;
    });
  };
  
  // 删除自定义渠道
  const handleDeleteChannel = (channelId: string) => {
    const updatedChannels = channels.filter(c => c.id !== channelId);
    setChannels(updatedChannels);
    
    // 同步到 localStorage
    const platformData = updatedChannels.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      bgColor: c.bgColor,
      logo: c.logo,
      type: c.type,
    }));
    localStorage.setItem('shadow-bees-channel-config', JSON.stringify(platformData));
    
    // 从所有酒店配置中移除
    setHotelConfigs(prev => {
      const newConfigs = { ...prev };
      Object.keys(newConfigs).forEach(hotelId => {
        delete newConfigs[hotelId].channels[channelId];
      });
      return newConfigs;
    });
  };
  
  // 切换渠道选择（批量模式）
  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };
  
  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店配置渠道</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          渠道配置需要选择至少一家酒店。<br/>
          您可以为单酒店单独配置，或选中多家酒店进行批量配置。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  // 单酒店配置（用于后续扩展）
  void getSingleHotelConfig;

  return (
    <div className="space-y-6">
      <BatchOperationBar />
      
      {/* 头部信息 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
            <Building2 className="w-4 h-4" />
            <span>
              {selectedHotels.length === 1 
                ? `当前配置: ${selectedHotels[0].name}` 
                : `批量配置: ${selectedHotels.length} 家酒店`
              }
            </span>
          </div>
          
          {selectedHotels.length > 1 && (
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                setSelectedChannels([]);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                batchMode 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              {batchMode ? '退出批量' : '批量配置'}
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          添加渠道
        </button>
      </div>

      {/* 三类渠道说明 */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(CHANNEL_TYPE_INFO).map(([type, info]) => (
          <div key={type} className="bg-white p-4 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-1">{info.name}</h4>
            <p className="text-xs text-gray-500 mb-2">{info.description}</p>
            <div className="flex flex-wrap gap-1">
              {info.features.map(f => (
                <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 批量配置面板 */}
      {batchMode && selectedChannels.length > 0 && (
        <BatchConfigPanel
          selectedChannels={selectedChannels}
          channels={channels}
          onApply={(config) => batchUpdateChannels(selectedChannels, config)}
          onCancel={() => {
            setBatchMode(false);
            setSelectedChannels([]);
          }}
        />
      )}

      {/* 渠道列表 */}
      <div className="space-y-4">
        {channels.map((channel) => {
          // 单酒店模式：显示该酒店的配置
          // 批量模式：显示第一个选中酒店的配置作为参考
          const hotelId = selectedHotels[0]?.id;
          const config = hotelConfigs[hotelId]?.channels[channel.id] || {
            enabled: false,
            quota: 20,
            pricingStrategy: 'same',
            pricingAdjustment: 0,
            apiConnected: false,
            apiStatus: 'disconnected',
          };
          
          return (
            <ChannelCard
              key={channel.id}
              channel={channel}
              config={config}
              onToggle={() => {
                if (batchMode && selectedChannels.length > 0) {
                  // 批量模式：切换所有选中渠道的启用状态
                  batchUpdateChannels(selectedChannels, { enabled: !config.enabled });
                } else {
                  // 单酒店模式
                  toggleChannel(hotelId, channel.id);
                }
              }}
              onEdit={() => setEditingChannel(channel)}
              onDelete={channel.isCustom ? () => handleDeleteChannel(channel.id) : undefined}
              isBatchMode={batchMode}
              isSelected={selectedChannels.includes(channel.id)}
              onSelect={batchMode ? () => toggleChannelSelection(channel.id) : undefined}
            />
          );
        })}
      </div>

      {/* 添加渠道弹窗 */}
      <AddChannelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddChannel}
      />

      {/* 编辑渠道弹窗 */}
      {editingChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">编辑渠道 - {editingChannel.name}</h3>
              <button onClick={() => setEditingChannel(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">渠道名称</label>
                <input
                  type="text"
                  value={editingChannel.name}
                  onChange={(e) => setEditingChannel({...editingChannel, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingChannel.description}
                  onChange={(e) => setEditingChannel({...editingChannel, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingChannel(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  // 保存编辑
                  setChannels(prev => prev.map(c => c.id === editingChannel.id ? editingChannel : c));
                  setEditingChannel(null);
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置说明 */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">配置说明</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>单酒店模式：单独配置当前选中酒店的渠道参数</li>
              <li>批量模式：选中多家酒店后，可统一配置渠道（启用状态、配额、定价策略）</li>
              <li>自定义渠道：可添加系统预设之外的渠道（如美团、携程等）</li>
              <li>渠道配置保存后会自动应用到所选酒店的运营策略中</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
