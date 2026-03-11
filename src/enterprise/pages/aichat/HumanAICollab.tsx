/**
 * Shadow-Bees V52 - AI客服中心 - 人机协作（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. AI建议 + 人工确认/编辑的工作流
 * 3. 协作效率统计
 * 4. 多酒店协作会话汇总
 * 
 * 主题：企业版浅色主题
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Bot, 
  UserCircle, 
  MessageSquare, 
  ThumbsUp, 
  Edit3,
  Send,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Target,
  Building2,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { complianceService } from '../../services/complianceService';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { aichatApi } from '../../api';

// ==================== 类型定义 ====================

type SessionStatus = 'active' | 'completed' | 'pending';
type MessageType = 'guest' | 'ai_suggestion' | 'human_edited' | 'human_sent';

interface CollabMessage {
  id: string;
  type: MessageType;
  content: string;
  originalContent?: string;
  sender?: string;
  timestamp: Date;
  accepted?: boolean;
  edited?: boolean;
  confidence?: number; // AI置信度 (0-100)
}

interface CollabSession {
  id: string;
  guestName: string;
  guestPhone?: string;
  hotelId: string;
  hotelName: string;
  channel: string;
  messages: CollabMessage[];
  aiAccuracy: number;
  savedTime: number;
  status: SessionStatus;
  pendingSuggestions: number;
  lastActivity: Date;
}

// ==================== 主组件 ====================

export function HumanAICollab() {
  // 订阅 store 中的状态，确保 selectedHotelIds 变化时组件重新渲染
  const { hotels, selectedHotelIds: storeSelectedHotelIds } = useEnterpriseStore();
  
  // 使用 useMemo 计算选中的酒店，确保响应式更新
  const selectedHotels = useMemo(() => 
    hotels.filter(h => storeSelectedHotelIds.includes(h.id)),
    [hotels, storeSelectedHotelIds]
  );

  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CollabSession | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState<SessionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 自动模式配置
  const [autoMode, setAutoMode] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState(90); // 自动发送阈值（置信度>90%自动发送）
  
  // 合规检测状态
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState<string>('');

  // 加载会话数据
  useEffect(() => {
    const loadSessions = async () => {
      if (selectedHotels.length === 0) {
        setSessions([]);
        return;
      }
      try {
        const hotelIds = selectedHotels.map(h => h.id);
        const response = await aichatApi.getCollabSessions({ 
          page: 1, 
          pageSize: 20,
          hotelIds 
        });
        if (response.success) {
          setSessions(response.data.list);
          if (response.data.list.length > 0) {
            setSelectedSession(response.data.list[0]);
          }
        }
      } catch (error) {
        console.error('加载会话失败:', error);
      }
    };
    loadSessions();
  }, [selectedHotels]);

  // 获取选中酒店ID集合
  const selectedHotelIds = useMemo(() => 
    new Set(storeSelectedHotelIds),
    [storeSelectedHotelIds]
  );

  // 过滤会话
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // 酒店过滤
      if (!selectedHotelIds.has(session.hotelId)) return false;
      
      // 状态过滤
      if (filterStatus !== 'all' && session.status !== filterStatus) return false;
      
      // 搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          session.guestName.toLowerCase().includes(query) ||
          session.hotelName.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [sessions, selectedHotelIds, filterStatus, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    const visible = sessions.filter(s => selectedHotelIds.has(s.hotelId));
    const totalSuggestions = visible.reduce((sum, s) => sum + s.messages.filter(m => m.type === 'ai_suggestion').length, 0);
    const acceptedSuggestions = visible.reduce((sum, s) => sum + s.messages.filter(m => m.type === 'human_sent' && m.accepted).length, 0);
    
    return {
      totalSessions: visible.length,
      activeSessions: visible.filter(s => s.status === 'active').length,
      pendingSuggestions: visible.reduce((sum, s) => sum + s.pendingSuggestions, 0),
      aiAcceptRate: totalSuggestions > 0 ? Math.round((acceptedSuggestions / totalSuggestions) * 100) : 0,
      totalSavedTime: visible.reduce((sum, s) => sum + s.savedTime, 0),
      avgAccuracy: visible.length > 0 ? Math.round(visible.reduce((sum, s) => sum + s.aiAccuracy, 0) / visible.length) : 0,
    };
  }, [sessions, selectedHotelIds]);

  // 格式化时间
  const formatTime = (date: Date | string | undefined) => {
    if (!date) return '未知时间';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '无效时间';
    const diff = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  // 采纳AI建议
  const handleAcceptAI = async (messageId: string) => {
    if (!selectedSession) return;
    
    const message = selectedSession.messages.find(m => m.id === messageId);
    if (!message || message.type !== 'ai_suggestion') return;
    
    // 合规检测
    setCheckingCompliance(true);
    setComplianceError('');
    
    const platformMap: Record<string, 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin'> = {
      '闲鱼': 'xianyu',
      '小红书': 'xiaohongshu',
      '微信': 'wechat',
      '抖音': 'douyin',
    };
    
    const checkResult = await complianceService.check({
      content: message.content,
      contentId: messageId,
      platform: platformMap[selectedSession.channel] || 'xianyu',
      contentType: 'chat',
      hotelId: selectedSession.hotelId,
      hotelName: selectedSession.hotelName,
      source: 'ai_chat',
    });
    
    setCheckingCompliance(false);
    
    if (!checkResult.passed) {
      setComplianceError(`合规警告：检测到 ${checkResult.violations.length} 个违规问题，请编辑后发送`);
      return;
    }

    const newMessage: CollabMessage = {
      id: `m_${Date.now()}`,
      type: 'human_sent',
      content: message.content,
      originalContent: message.content,
      sender: '当前客服',
      timestamp: new Date(),
      accepted: true,
      edited: false,
    };

    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, newMessage],
      pendingSuggestions: Math.max(0, selectedSession.pendingSuggestions - 1),
    };

    setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
    setSelectedSession(updatedSession);
  };

  // 手动输入发送
  const handleManualSend = async () => {
    if (!selectedSession || !replyText.trim()) return;
    
    // 合规检测
    setCheckingCompliance(true);
    setComplianceError('');
    
    const platformMap: Record<string, 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin'> = {
      '闲鱼': 'xianyu',
      '小红书': 'xiaohongshu',
      '微信': 'wechat',
      '抖音': 'douyin',
    };
    
    const checkResult = await complianceService.check({
      content: replyText,
      contentId: `manual_${Date.now()}`,
      platform: platformMap[selectedSession.channel] || 'xianyu',
      contentType: 'chat',
      hotelId: selectedSession.hotelId,
      hotelName: selectedSession.hotelName,
      source: 'ai_chat',
    });
    
    setCheckingCompliance(false);
    
    if (!checkResult.passed) {
      setComplianceError(`合规警告：检测到 ${checkResult.violations.length} 个违规问题，请修改后发送`);
      return;
    }

    const newMessage: CollabMessage = {
      id: `m_${Date.now()}`,
      type: 'human_sent',
      content: replyText,
      sender: '当前客服',
      timestamp: new Date(),
      accepted: false,
      edited: false,
    };

    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, newMessage],
    };

    setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
    setSelectedSession(updatedSession);
    setReplyText('');
  };

  // 忽略AI建议
  const handleIgnoreAI = (messageId: string) => {
    if (!selectedSession) return;
    
    // 从会话中移除该AI建议
    const updatedSession = {
      ...selectedSession,
      messages: selectedSession.messages.filter(m => m.id !== messageId),
      pendingSuggestions: Math.max(0, selectedSession.pendingSuggestions - 1),
    };

    setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
    setSelectedSession(updatedSession);
  };

  // 编辑后发送
  const handleEditSend = async (messageId: string, editedContent: string) => {
    if (!selectedSession) return;
    
    const message = selectedSession.messages.find(m => m.id === messageId);
    if (!message || message.type !== 'ai_suggestion') return;
    
    // 合规检测
    setCheckingCompliance(true);
    setComplianceError('');
    
    const platformMap: Record<string, 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin'> = {
      '闲鱼': 'xianyu',
      '小红书': 'xiaohongshu',
      '微信': 'wechat',
      '抖音': 'douyin',
    };
    
    const checkResult = await complianceService.check({
      content: editedContent,
      contentId: messageId,
      platform: platformMap[selectedSession.channel] || 'xianyu',
      contentType: 'chat',
      hotelId: selectedSession.hotelId,
      hotelName: selectedSession.hotelName,
      source: 'ai_chat',
    });
    
    setCheckingCompliance(false);
    
    if (!checkResult.passed) {
      setComplianceError(`合规警告：检测到 ${checkResult.violations.length} 个违规问题，请修改后发送`);
      return;
    }

    const newMessage: CollabMessage = {
      id: `m_${Date.now()}`,
      type: 'human_sent',
      content: editedContent,
      originalContent: message.content,
      sender: '当前客服',
      timestamp: new Date(),
      accepted: true,
      edited: true,
    };

    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, newMessage],
      pendingSuggestions: Math.max(0, selectedSession.pendingSuggestions - 1),
    };

    setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
    setSelectedSession(updatedSession);
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看人机协作</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          人机协作页面需要选择至少一家酒店才能查看。<br/>
          这里展示 AI 建议与人工确认配合处理客服会话的工作流。
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
          <h1 className="text-2xl font-bold text-gray-900">人机协作</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `管理 ${selectedHotels[0].name} 的AI协作会话`
              : `管理 ${selectedHotels.length} 家酒店的AI协作会话`
            }
          </p>
        </div>
        
        {/* 自动模式切换 */}
        <div className="flex items-center gap-4">
          {autoMode && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
              <span>自动阈值</span>
              <select 
                value={autoThreshold}
                onChange={(e) => setAutoThreshold(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded px-2 py-0.5 text-sm"
              >
                <option value={85}>85%</option>
                <option value={90}>90%</option>
                <option value={95}>95%</option>
              </select>
            </div>
          )}
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              autoMode 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">{autoMode ? '自动模式开启' : '手动模式'}</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">总会话</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.activeSessions}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">进行中</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.pendingSuggestions}</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">待处理建议</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.aiAcceptRate}%</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">AI采纳率</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSavedTime}min</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">累计节省时间</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-fuchsia-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-fuchsia-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-gray-900">{stats.avgAccuracy}%</div>
              <div className="text-sm text-gray-500 whitespace-nowrap">平均准确率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客人姓名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as SessionStatus | 'all')}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <option value="all">全部状态</option>
            <option value="active">进行中</option>
            <option value="pending">待处理</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：会话列表 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">协作会话</h3>
            <span className="text-xs text-gray-500">{filteredSessions.length} 个会话</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedSession?.id === session.id ? 'bg-violet-50 border-l-4 border-violet-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{session.guestName}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      session.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : session.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {session.status === 'active' ? '进行中' : session.status === 'pending' ? '待处理' : '已完成'}
                    </span>
                  </div>
                  {session.pendingSuggestions > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {session.pendingSuggestions}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mb-2">{session.hotelName}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{session.channel}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-violet-600">AI {session.aiAccuracy}%</span>
                    <span className="text-green-600">省 {session.savedTime}min</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  活跃 {formatTime(session.lastActivity)}
                </div>
              </button>
            ))}
            
            {filteredSessions.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无协作会话</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：会话详情 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[700px]">
          {selectedSession ? (
            <>
              {/* 头部 */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{selectedSession.guestName}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {selectedSession.channel}
                    </span>
                    <span className="text-xs text-gray-400">{selectedSession.hotelName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-500" />
                    <span className="text-gray-600">AI准确率</span>
                    <span className="font-semibold text-violet-600">{selectedSession.aiAccuracy}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">节省</span>
                    <span className="font-semibold text-green-600">{selectedSession.savedTime}分钟</span>
                  </div>
                </div>
              </div>

              {/* 合规检测状态 */}
              {checkingCompliance && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在进行合规检测...
                  </div>
                </div>
              )}
              
              {complianceError && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    {complianceError}
                    <button 
                      onClick={() => setComplianceError('')}
                      className="ml-auto text-xs underline hover:no-underline"
                    >
                      知道了
                    </button>
                  </div>
                </div>
              )}
              
              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedSession.messages.map((message) => {
                  switch (message.type) {
                    case 'guest':
                      return (
                        <div key={message.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm">
                            {selectedSession.guestName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="inline-block bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
                              <p className="text-gray-800">{message.content}</p>
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        </div>
                      );
                    
                    case 'ai_suggestion':
                      const isAutoEligible = autoMode && message.confidence && message.confidence >= autoThreshold;
                      return (
                        <div key={message.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="flex-1">
                            <div className={`inline-block border rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] ${
                              isAutoEligible 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-violet-50 border-violet-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className={`w-3 h-3 ${isAutoEligible ? 'text-green-500' : 'text-violet-500'}`} />
                                <span className={`text-xs font-medium ${isAutoEligible ? 'text-green-600' : 'text-violet-600'}`}>
                                  AI建议 {message.confidence && `(置信度 ${message.confidence}%)`}
                                </span>
                                {isAutoEligible && (
                                  <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded-full">
                                    自动发送中
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-800">{message.content}</p>
                            </div>
                            {!isAutoEligible && (
                              <div className="mt-2 flex gap-2">
                                <button 
                                  onClick={() => handleAcceptAI(message.id)}
                                  className="px-3 py-1 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700"
                                >
                                  采纳发送
                                </button>
                                <button 
                                  onClick={() => {
                                    const edited = prompt('编辑后发送:', message.content);
                                    if (edited) handleEditSend(message.id, edited);
                                  }}
                                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
                                >
                                  编辑后发送
                                </button>
                                <button 
                                  onClick={() => handleIgnoreAI(message.id)}
                                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50"
                                >
                                  忽略
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    
                    case 'human_sent':
                      return (
                        <div key={message.id} className="flex gap-3 flex-row-reverse">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 flex flex-col items-end">
                            <div className="inline-block bg-blue-500 rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                              <p className="text-white">{message.content}</p>
                            </div>
                            {message.edited && (
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className="text-gray-500 flex items-center gap-1">
                                  <Edit3 className="w-3 h-3" />
                                  基于AI建议修改
                                </span>
                                {message.accepted && (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" />
                                    采纳
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">
                              {message.sender} · {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        </div>
                      );
                    
                    default:
                      return null;
                  }
                })}
              </div>

              {/* 输入框 */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="输入回复内容... 或直接采纳AI建议"
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button 
                      onClick={() => {
                        // 生成AI建议并添加到会话
                        const suggestion: CollabMessage = {
                          id: `ai_${Date.now()}`,
                          type: 'ai_suggestion',
                          content: `根据客人问题，建议回复：\n\n您好，感谢您的咨询。我们会尽快为您处理相关问题，请问还有其他可以帮助您的吗？`,
                          timestamp: new Date(),
                          confidence: 85,
                        };
                        const updatedSession = {
                          ...selectedSession,
                          messages: [...selectedSession.messages, suggestion],
                          pendingSuggestions: selectedSession.pendingSuggestions + 1,
                        };
                        setSessions(prev => prev.map(s => s.id === selectedSession.id ? updatedSession : s));
                        setSelectedSession(updatedSession);
                      }}
                      className="absolute right-3 top-3 px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded hover:bg-violet-200"
                    >
                      AI建议
                    </button>
                  </div>
                  <button 
                    onClick={handleManualSend}
                    disabled={!replyText.trim()}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    发送
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>选择左侧会话查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 协作模式说明 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">直接采纳</h4>
              <p className="text-sm text-gray-500">AI建议准确，一键发送</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            当AI建议准确率达到90%以上时，客服可直接点击"采纳发送"，无需修改。
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">编辑优化</h4>
              <p className="text-sm text-gray-500">基于建议修改后发送</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            客服在AI建议基础上添加个性化内容（如表情、图片链接），提升转化率。
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">人工处理</h4>
              <p className="text-sm text-gray-500">复杂问题人工回复</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            投诉、退款等敏感问题，或AI置信度低于70%时，转人工处理。
          </p>
        </div>
      </div>
    </div>
  );
}

export default HumanAICollab;
