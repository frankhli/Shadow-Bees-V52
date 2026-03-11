/**
 * Shadow-Bees V52 - AI客服中心 - 统一收件箱（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. 批量操作（多选、标记已读、转人工、分配酒店）
 * 3. 渠道配置同步（动态读取平台列表）
 * 4. 消息按酒店分组展示
 * 5. 批量操作确认与反馈
 * 
 * 主题：企业版浅色主题
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  CheckCircle2,
  Building2,
  MessageCircle,
  Send,
  Phone,
  ShoppingBag,
  BookOpen,
  Music,
  Map,
  Layers,
  CheckSquare,
  Square,
  UserCircle,
  ArrowRightLeft,
  Building,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from '../../../utils/dateUtils';
import { aichatApi } from '../../api';

// ==================== 类型定义 ====================

interface ChatMessage {
  id: string;
  channel: string;
  channelName: string;
  hotelId: string;
  hotelName: string;
  guestId: string;
  guestName: string;
  guestAvatar?: string;
  content: string;
  timestamp: Date;
  status: 'unread' | 'read' | 'replied' | 'ai_handled' | 'human_handled';
  priority: 'high' | 'medium' | 'low';
  hasOrder: boolean;
  orderId?: string;
  aiSuggestion?: string;
  assignedTo?: string;
}

interface PlatformInfo {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  logo?: string;
  iconType: string;
}

// ==================== 工具函数 ====================

// 从 localStorage 读取渠道配置（与账号管理保持一致）
const loadPlatformsFromChannelConfig = (): PlatformInfo[] => {
  try {
    const saved = localStorage.getItem('shadow-bees-channel-config');
    if (saved) {
      const channels = JSON.parse(saved);
      return channels.map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        bgColor: c.bgColor || 'bg-gray-50',
        logo: c.logo,
        iconType: c.type === 'c2c' ? 'shopping' : c.type === 'private' ? 'message-circle' : 'book',
      }));
    }
  } catch {
    // 读取失败使用默认
  }
  
  // 默认平台配置 - 匹配所有渠道
  return [
    { id: 'xiaohongshu', name: '小红书', color: '#FF2442', bgColor: 'bg-red-50', logo: '/logos/xiaohongshu.jpg', iconType: 'book' },
    { id: 'xianyu', name: '闲鱼', color: '#FF6B00', bgColor: 'bg-orange-50', logo: '/logos/xianyu.jpg', iconType: 'shopping' },
    { id: 'wechat', name: '微信', color: '#07C160', bgColor: 'bg-green-50', logo: '/logos/wechat.jpg', iconType: 'message-circle' },
    { id: 'douyin', name: '抖音', color: '#000000', bgColor: 'bg-gray-100', logo: '/logos/douyin.jpg', iconType: 'music' },
    { id: 'wechat_mini', name: '微信小程序', color: '#07C160', bgColor: 'bg-green-50', iconType: 'message-circle' },
    { id: 'wechat_official', name: '微信公众号', color: '#07C160', bgColor: 'bg-green-50', iconType: 'message-circle' },
    { id: 'app', name: 'App', color: '#6366F1', bgColor: 'bg-indigo-50', iconType: 'layers' },
    { id: 'phone', name: '电话', color: '#10B981', bgColor: 'bg-emerald-50', iconType: 'phone' },
    { id: 'web', name: '网站', color: '#3B82F6', bgColor: 'bg-blue-50', iconType: 'globe' },
  ];
};

// 渠道图标组件
function ChannelIcon({ type, className }: { type: string; className?: string }) {
  const iconClass = className || 'w-3 h-3';
  switch (type) {
    case 'shopping': return <ShoppingBag className={iconClass} />;
    case 'book': return <BookOpen className={iconClass} />;
    case 'message-circle': return <MessageCircle className={iconClass} />;
    case 'music': return <Music className={iconClass} />;
    case 'map': return <Map className={iconClass} />;
    case 'phone': return <Phone className={iconClass} />;
    case 'layers': return <Layers className={iconClass} />;
    case 'globe': return <Map className={iconClass} />;
    default: return <MessageCircle className={iconClass} />;
  }
}

// ==================== 子组件 ====================

// 批量操作确认弹窗
function BatchConfirmModal({
  isOpen,
  title,
  description,
  count,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  type = 'default',
}: {
  isOpen: boolean;
  title: string;
  description: string;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <span className="text-sm text-gray-600">影响消息数: </span>
          <span className="text-lg font-bold text-violet-600">{count}</span>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// 分配酒店弹窗
function AssignHotelModal({
  isOpen,
  hotels,
  onAssign,
  onClose,
}: {
  isOpen: boolean;
  hotels: any[];
  onAssign: (hotelId: string) => void;
  onClose: () => void;
}) {
  const [selectedHotelId, setSelectedHotelId] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[80vh] flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">分配给酒店</h3>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {hotels.map((hotel) => (
            <button
              key={hotel.id}
              onClick={() => setSelectedHotelId(hotel.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                selectedHotelId === hotel.id
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{hotel.name}</div>
                <div className="text-xs text-gray-500">{hotel.city}</div>
              </div>
              {selectedHotelId === hotel.id && (
                <CheckCircle2 className="w-5 h-5 text-violet-600" />
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (selectedHotelId) {
                onAssign(selectedHotelId);
                setSelectedHotelId('');
              }
            }}
            disabled={!selectedHotelId}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function UnifiedInbox() {
  const navigate = useNavigate();
  const { selectedHotelIds, hotels, getSelectedHotels } = useEnterpriseStore();
  const selectedHotels = useMemo(() => getSelectedHotels(), [hotels, selectedHotelIds]);

  // 渠道配置（从 localStorage 动态读取）
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  
  useEffect(() => {
    setPlatforms(loadPlatformsFromChannelConfig());
    
    // 监听 storage 变化
    const handleStorageChange = () => {
      setPlatforms(loadPlatformsFromChannelConfig());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 消息数据
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // 加载消息数据 - 当酒店选择变化时重新加载
  const loadMessages = async () => {
    if (selectedHotelIds.length === 0) {
      setMessages([]);
      return;
    }
    try {
      const response = await aichatApi.getMessages({ 
        page: 1, 
        pageSize: 50,
        hotelIds: selectedHotelIds 
      });
      if (response.success) {
        setMessages(response.data.list);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [selectedHotelIds]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  
  // 筛选状态
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedHotels, setExpandedHotels] = useState<string[]>([]);
  
  // 弹窗状态
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // 回复输入
  const [replyText, setReplyText] = useState('');

  // 获取平台配置
  const getPlatformConfig = (channelId: string): PlatformInfo => {
    return platforms.find(p => p.id === channelId) || {
      id: channelId,
      name: channelId,
      color: '#6366F1',
      bgColor: 'bg-gray-50',
      iconType: 'message-circle',
    };
  };

  // 过滤消息
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // 酒店过滤
      if (selectedHotelIds.length > 0) {
        if (!selectedHotelIds.includes(msg.hotelId)) return false;
      }
      // 渠道过滤
      if (filterChannel !== 'all' && msg.channel !== filterChannel) return false;
      // 状态过滤
      if (filterStatus !== 'all' && msg.status !== filterStatus) return false;
      // 优先级过滤
      if (filterPriority !== 'all' && msg.priority !== filterPriority) return false;
      // 搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          msg.guestName.toLowerCase().includes(query) ||
          msg.content.toLowerCase().includes(query) ||
          msg.hotelName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [messages, selectedHotelIds, filterChannel, filterStatus, filterPriority, searchQuery]);

  // 按酒店分组的消息
  const groupedMessages = useMemo(() => {
    const groups: Record<string, ChatMessage[]> = {};
    filteredMessages.forEach(msg => {
      if (!groups[msg.hotelId]) {
        groups[msg.hotelId] = [];
      }
      groups[msg.hotelId].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  // 统计（按当前筛选范围）
  const stats = useMemo(() => {
    const scopeMessages = selectedHotelIds.length > 0 
      ? messages.filter(m => selectedHotelIds.includes(m.hotelId))
      : messages;
    return {
      unread: scopeMessages.filter(m => m.status === 'unread').length,
      aiHandled: scopeMessages.filter(m => m.status === 'ai_handled').length,
      humanHandled: scopeMessages.filter(m => m.status === 'human_handled').length,
      highPriority: scopeMessages.filter(m => m.priority === 'high' && m.status === 'unread').length,
      total: scopeMessages.length,
    };
  }, [messages, selectedHotelIds]);

  // 切换消息选择
  const toggleMessageSelection = (messageId: string) => {
    setSelectedIds(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map(m => m.id));
    }
  };

  // 批量标记已读
  const handleBatchMarkRead = async () => {
    try {
      // TODO: 调用批量标记已读 API
      // const response = await aichatApi.batchMarkRead(selectedIds);
      // if (response.success) { ... }
      
      // 本地状态更新
      setMessages(prev => prev.map(m =>
        selectedIds.includes(m.id) ? { ...m, status: 'read' as const } : m
      ));
      setSelectedIds([]);
      setShowMarkReadModal(false);
    } catch (error) {
      console.error('批量标记已读失败:', error);
      alert('标记已读失败，请稍后重试');
    }
  };

  // 批量转人工
  const handleBatchTransfer = async () => {
    try {
      // TODO: 调用批量转人工 API
      // const response = await aichatApi.batchEscalateToHuman(selectedIds);
      // if (response.success) { ... }
      
      // 本地状态更新
      setMessages(prev => prev.map(m =>
        selectedIds.includes(m.id) 
          ? { ...m, status: 'human_handled' as const, assignedTo: '当前客服' } 
          : m
      ));
      setSelectedIds([]);
      setShowTransferModal(false);
    } catch (error) {
      console.error('批量转人工失败:', error);
      alert('转人工失败，请稍后重试');
    }
  };

  // 批量分配酒店
  const handleBatchAssign = async (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) return;
    
    try {
      // TODO: 调用批量分配酒店 API
      // const response = await aichatApi.batchAssignHotel(selectedIds, hotelId);
      // if (response.success) { ... }
      
      // 本地状态更新
      setMessages(prev => prev.map(m =>
        selectedIds.includes(m.id) 
          ? { ...m, hotelId: hotel.id, hotelName: hotel.name } 
          : m
      ));
      setSelectedIds([]);
      setShowAssignModal(false);
    } catch (error) {
      console.error('批量分配酒店失败:', error);
      alert('分配酒店失败，请稍后重试');
    }
  };

  // 处理AI回复
  const handleAIReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.aiSuggestion) {
      setReplyText(message.aiSuggestion);
    }
  };

  // 发送回复
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    
    try {
      // TODO: 调用发送消息 API
      // const response = await aichatApi.sendMessage({
      //   hotelId: selectedMessage.hotelId,
      //   hotelName: selectedMessage.hotelName,
      //   guestId: selectedMessage.guestId,
      //   guestName: selectedMessage.guestName,
      //   channel: selectedMessage.channel,
      //   channelName: selectedMessage.channelName,
      //   content: replyText.trim(),
      //   status: 'replied',
      //   priority: selectedMessage.priority,
      // });
      // if (response.success) { ... }
      
      // 本地状态更新
      setMessages(prev => prev.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, status: 'replied' as const }
          : m
      ));
      setReplyText('');
    } catch (error) {
      console.error('发送回复失败:', error);
      alert('发送失败，请稍后重试');
    }
  };

  // 转人工 - 调用API
  const handleEscalate = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    try {
      const response = await aichatApi.escalateToHuman(messageId, message.hotelId, '用户请求转人工');
      if (response.success) {
        // 更新本地状态
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, status: 'human_handled' as const, assignedTo: '当前客服' }
            : m
        ));
        // 显示成功提示
        alert('已转人工处理');
      } else {
        alert('转人工失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('转人工失败:', error);
      alert('转人工失败，请稍后重试');
    }
  };

  // 切换酒店分组展开
  const toggleHotelExpand = (hotelId: string) => {
    setExpandedHotels(prev =>
      prev.includes(hotelId)
        ? prev.filter(id => id !== hotelId)
        : [...prev, hotelId]
    );
  };

  // 获取状态标签
  const getStatusBadge = (status: ChatMessage['status']) => {
    switch (status) {
      case 'unread':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">未读</span>;
      case 'read':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">已读</span>;
      case 'replied':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">已回复</span>;
      case 'ai_handled':
        return <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">AI已处理</span>;
      case 'human_handled':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">人工处理</span>;
    }
  };

  // 获取优先级标签
  const getPriorityBadge = (priority: ChatMessage['priority']) => {
    switch (priority) {
      case 'high':
        return <span className="w-2 h-2 bg-red-500 rounded-full" title="高优先级" />;
      case 'medium':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full" title="中优先级" />;
      case 'low':
        return <span className="w-2 h-2 bg-gray-300 rounded-full" title="低优先级" />;
    }
  };

  // 空状态
  if (selectedHotelIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看消息</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          统一收件箱需要选择至少一家酒店才能展示消息。<br/>
          您可以选择单个酒店进行精细化处理，或选择多个酒店进行批量操作。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  // 获取当前选中的平台配置
  const selectedPlatform = selectedMessage ? getPlatformConfig(selectedMessage.channel) : null;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />

      {/* 头部统计与批量操作栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">统一收件箱</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
              <Building2 className="w-4 h-4" />
              <span>
                {selectedHotels.length === 1 
                  ? selectedHotels[0].name 
                  : `${selectedHotels.length} 家酒店`
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 批量模式切换 */}
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                batchMode 
                  ? 'bg-violet-100 text-violet-700' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              {batchMode ? '退出批量' : '批量操作'}
            </button>
            <button 
              onClick={loadMessages}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="刷新消息"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">总消息</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-600">{stats.unread}</div>
            <div className="text-xs text-red-600">未读</div>
          </div>
          <div className="text-center p-3 bg-violet-50 rounded-lg">
            <div className="text-xl font-bold text-violet-600">{stats.aiHandled}</div>
            <div className="text-xs text-violet-600">AI处理</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">{stats.humanHandled}</div>
            <div className="text-xs text-green-600">人工处理</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-600">{stats.highPriority}</div>
            <div className="text-xs text-orange-600">高优先级</div>
          </div>
        </div>

        {/* 批量操作栏 */}
        {batchMode && selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                已选择 <span className="font-bold text-violet-600">{selectedIds.length}</span> 条消息
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMarkReadModal(true)}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                标记已读
              </button>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-3 py-1.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center gap-1"
              >
                <UserCircle className="w-4 h-4" />
                转人工
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg flex items-center gap-1"
              >
                <ArrowRightLeft className="w-4 h-4" />
                分配酒店
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                取消选择
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户、消息内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          
          {/* 渠道筛选 - 动态从配置读取 */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部渠道</option>
            {platforms.map(platform => (
              <option key={platform.id} value={platform.id}>{platform.name}</option>
            ))}
          </select>
          
          {/* 状态筛选 */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部状态</option>
            <option value="unread">未读</option>
            <option value="read">已读</option>
            <option value="ai_handled">AI处理</option>
            <option value="human_handled">人工处理</option>
          </select>

          {/* 优先级筛选 */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* 左侧消息列表 */}
        <div className="w-[380px] min-w-[320px] flex flex-col bg-white rounded-xl border border-gray-200">
          {/* 批量模式表头 */}
          {batchMode && filteredMessages.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedIds.length === filteredMessages.length && filteredMessages.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-violet-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.length === filteredMessages.length && filteredMessages.length > 0 ? '取消全选' : '全选'}
              </button>
              <span className="text-xs text-gray-400">
                ({selectedIds.length}/{filteredMessages.length})
              </span>
            </div>
          )}

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                <p>暂无消息</p>
              </div>
            ) : selectedHotels.length > 1 ? (
              // 多酒店模式：按酒店分组显示
              Object.entries(groupedMessages).map(([hotelId, hotelMessages]) => {
                const hotel = hotels.find(h => h.id === hotelId);
                const isExpanded = expandedHotels.includes(hotelId);
                const unreadCount = hotelMessages.filter(m => m.status === 'unread').length;
                
                return (
                  <div key={hotelId} className="border-b border-gray-100 last:border-0">
                    {/* 酒店分组标题 */}
                    <button
                      onClick={() => toggleHotelExpand(hotelId)}
                      className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">{hotel?.name || '未知酒店'}</span>
                        <span className="text-xs text-gray-500">({hotelMessages.length})</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                            {unreadCount}未读
                          </span>
                        )}
                      </div>
                    </button>
                    
                    {/* 酒店消息列表 */}
                    {isExpanded && hotelMessages.map((message) => {
                      const platform = getPlatformConfig(message.channel);
                      const isSelected = selectedIds.includes(message.id);
                      
                      return (
                        <button
                          key={message.id}
                          onClick={() => {
                            if (batchMode) {
                              toggleMessageSelection(message.id);
                            } else {
                              setSelectedMessage(message);
                            }
                          }}
                          className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-violet-50' : ''
                          } ${message.status === 'unread' ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-violet-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 批量选择框 */}
                            {batchMode && (
                              <div 
                                className="mt-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMessageSelection(message.id);
                                }}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-violet-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                            )}
                            
                            {/* 优先级标记 */}
                            {!batchMode && <div className="mt-1">{getPriorityBadge(message.priority)}</div>}
                            
                            {/* 头像 */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                              {message.guestName.charAt(0)}
                            </div>
                            
                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900 truncate">
                                  {message.guestName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDistanceToNow(message.timestamp)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-1">
                                <span 
                                  className="px-1.5 py-0.5 text-xs text-white rounded flex items-center gap-1"
                                  style={{ backgroundColor: platform.color }}
                                >
                                  <ChannelIcon type={platform.iconType} /> {platform.name}
                                </span>
                                {message.hasOrder && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                    有订单
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 truncate">{message.content}</p>
                              
                              <div className="flex items-center justify-between mt-2">
                                {getStatusBadge(message.status)}
                                {message.aiSuggestion && (
                                  <span className="text-xs text-violet-600 flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    AI建议
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              // 单酒店模式：平铺显示
              filteredMessages.map((message) => {
                const platform = getPlatformConfig(message.channel);
                const isSelected = selectedIds.includes(message.id);
                
                return (
                  <button
                    key={message.id}
                    onClick={() => {
                      if (batchMode) {
                        toggleMessageSelection(message.id);
                      } else {
                        setSelectedMessage(message);
                      }
                    }}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-violet-50 border-violet-200' : ''
                    } ${message.status === 'unread' ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-violet-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 批量选择框 */}
                      {batchMode && (
                        <div 
                          className="mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessageSelection(message.id);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      )}
                      
                      {/* 优先级标记 */}
                      {!batchMode && <div className="mt-1">{getPriorityBadge(message.priority)}</div>}
                      
                      {/* 头像 */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {message.guestName.charAt(0)}
                      </div>
                      
                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {message.guestName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(message.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="px-1.5 py-0.5 text-xs text-white rounded flex items-center gap-1"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.logo ? (
                              <img src={platform.logo} alt={platform.name} className="w-3 h-3 object-contain rounded" />
                            ) : (
                              <ChannelIcon type={platform.iconType} />
                            )}
                            {platform.name}
                          </span>
                          {message.hasOrder && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              有订单
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate">{message.content}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          {getStatusBadge(message.status)}
                          {message.aiSuggestion && (
                            <span className="text-xs text-violet-600 flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              AI建议
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧聊天详情 */}
        {selectedMessage && selectedPlatform ? (
          <div className="flex-1 min-w-[500px] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 聊天头部 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white font-medium">
                    {selectedMessage.guestName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{selectedMessage.guestName}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="w-3 h-3" />
                      {selectedMessage.hotelName}
                      <span className="text-gray-300">|</span>
                      <span 
                        className="px-1.5 py-0.5 text-xs text-white rounded flex items-center gap-1"
                        style={{ backgroundColor: selectedPlatform.color }}
                      >
                        {selectedPlatform.logo ? (
                          <img src={selectedPlatform.logo} alt={selectedPlatform.name} className="w-3 h-3 object-contain rounded" />
                        ) : (
                          <ChannelIcon type={selectedPlatform.iconType} />
                        )}
                        {selectedPlatform.name}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedMessage.hasOrder && (
                    <button 
                      onClick={() => navigate(`/enterprise/orders/${selectedMessage.orderId}`)}
                      className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100"
                    >
                      查看订单 {selectedMessage.orderId}
                    </button>
                  )}
                  <button 
                    onClick={() => handleEscalate(selectedMessage.id)}
                    className="px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-lg hover:bg-orange-100"
                  >
                    转人工
                  </button>
                </div>
              </div>
            </div>

            {/* 聊天内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {/* 客户消息 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm">
                  {selectedMessage.guestName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="inline-block bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                    <p className="text-gray-800">{selectedMessage.content}</p>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {selectedMessage.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* AI建议 */}
              {selectedMessage.aiSuggestion && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-violet-50 border border-violet-200 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-violet-600 font-medium">AI建议</span>
                      </div>
                      <p className="text-gray-800">{selectedMessage.aiSuggestion}</p>
                    </div>
                    <div className="mt-1 flex gap-2">
                      <button 
                        onClick={() => handleAIReply(selectedMessage.id)}
                        className="text-xs text-violet-600 hover:text-violet-700"
                      >
                        使用此回复
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 历史记录标记 */}
              {selectedMessage.status !== 'unread' && (
                <div className="flex items-center justify-center">
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    {selectedMessage.status === 'ai_handled' ? 'AI已自动回复' : 
                     selectedMessage.status === 'human_handled' ? `已转人工处理 (${selectedMessage.assignedTo})` : 
                     '已回复'}
                  </span>
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="输入回复内容..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {selectedMessage.aiSuggestion && !replyText && (
                    <button
                      onClick={() => handleAIReply(selectedMessage.id)}
                      className="absolute right-3 top-3 px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded hover:bg-violet-200"
                    >
                      AI建议
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      // 如果有客户电话信息，跳转到拨号链接
                      // 否则显示提示
                      const phoneNumber = selectedMessage?.guestId; // 假设guestId可能是电话号码
                      if (phoneNumber && /^\d{11}$/.test(phoneNumber)) {
                        window.open(`tel:${phoneNumber}`, '_self');
                      } else {
                        alert('该客户未留下电话号码，无法直接拨打');
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                    title="拨打电话"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="p-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* 快捷操作 */}
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => {
                    setReplyText('您好！这是我们的价目表：\n\n标准间：¥398/晚\n豪华间：¥598/晚\n套房：¥998/晚\n\n如需预订，请告诉我入住日期和房型。');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  发送价目表
                </button>
                <button 
                  onClick={() => {
                    setReplyText('我们的地址是：\n\n📍 ' + selectedMessage.hotelName + '\n\n您可以通过高德地图或百度地图导航搜索酒店名称。如有需要，我可以发送更详细的路线指引。');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  发送定位
                </button>
                <button 
                  onClick={() => {
                    setReplyText('🎉 特别优惠通知\n\n现在预订可享受：\n- 连住2晚以上 9折优惠\n- 连住3晚以上 85折优惠\n- 免费升级房型（视房态）\n\n优惠码：SAVE2024\n\n数量有限，先到先得！');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  发送优惠
                </button>
                <button 
                  onClick={() => navigate('/enterprise/aichat/scripts')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  话术库
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
            <div className="text-center text-gray-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>选择左侧消息开始对话</p>
            </div>
          </div>
        )}
      </div>

      {/* 批量操作确认弹窗 */}
      <BatchConfirmModal
        isOpen={showMarkReadModal}
        title="批量标记已读"
        description="确定要将选中的消息标记为已读吗？"
        count={selectedIds.length}
        onConfirm={handleBatchMarkRead}
        onCancel={() => setShowMarkReadModal(false)}
        confirmText="确认标记"
      />

      <BatchConfirmModal
        isOpen={showTransferModal}
        title="批量转人工"
        description="确定要将选中的消息转给人工处理吗？"
        count={selectedIds.length}
        onConfirm={handleBatchTransfer}
        onCancel={() => setShowTransferModal(false)}
        confirmText="确认转人工"
        type="danger"
      />

      <AssignHotelModal
        isOpen={showAssignModal}
        hotels={hotels}
        onAssign={handleBatchAssign}
        onClose={() => setShowAssignModal(false)}
      />
    </div>
  );
}

export default UnifiedInbox;
