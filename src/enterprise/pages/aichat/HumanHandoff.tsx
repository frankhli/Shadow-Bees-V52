/**
 * Shadow-Bees V52 - AI客服中心 - 人工转接队列（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. 待处理队列 + 处理中 + 已完成状态管理
 * 3. 批量分配客服
 * 4. 转接原因分析
 * 5. SLA超时提醒
 * 
 * 主题：企业版浅色主题
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCircle,
  Building2,
  Search,
  MoreHorizontal,
  Timer,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { aichatApi } from '../../api';

// ==================== 类型定义 ====================

type HandoffStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
type HandoffReason = 'ai_confidence_low' | 'user_request' | 'complaint' | 'complex_issue' | 'vip_customer';

interface HandoffRequest {
  id: string;
  guestName: string;
  guestPhone?: string;
  hotelId: string;
  hotelName: string;
  channel: string;
  reason: HandoffReason;
  status: HandoffStatus;
  originalMessage: string;
  aiSuggestion?: string;
  assignedTo?: string;
  assignedToName?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  slaDeadline: Date;
  tags: string[];
}

// ==================== 配置 ====================

const REASON_CONFIG: Record<HandoffReason, { label: string; color: string; desc: string }> = {
  ai_confidence_low: { label: 'AI置信度低', color: 'bg-yellow-100 text-yellow-700', desc: 'AI无法确定意图' },
  user_request: { label: '用户要求', color: 'bg-blue-100 text-blue-700', desc: '用户主动要求人工' },
  complaint: { label: '投诉处理', color: 'bg-red-100 text-red-700', desc: '投诉类消息' },
  complex_issue: { label: '复杂问题', color: 'bg-purple-100 text-purple-700', desc: '需要人工协调' },
  vip_customer: { label: 'VIP客户', color: 'bg-orange-100 text-orange-700', desc: '高价值客户' },
};

const STATUS_CONFIG: Record<HandoffStatus, { label: string; color: string; icon: any }> = {
  pending: { label: '待分配', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700', icon: UserCircle },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'bg-red-500 text-white' },
  high: { label: '高', color: 'bg-orange-500 text-white' },
  normal: { label: '普通', color: 'bg-blue-500 text-white' },
  low: { label: '低', color: 'bg-gray-400 text-white' },
};

// ==================== 子组件 ====================

// 分配弹窗
function AssignModal({
  isOpen,
  requests,
  onAssign,
  onClose,
}: {
  isOpen: boolean;
  requests: HandoffRequest[];
  onAssign: (staffId: string, staffName: string) => void;
  onClose: () => void;
}) {
  const [selectedStaff, setSelectedStaff] = useState('');
  
  const staffList = [
    { id: 'staff_001', name: '小王', role: '客服专员', workload: 3 },
    { id: 'staff_002', name: '小李', role: '客服专员', workload: 1 },
    { id: 'staff_003', name: '小张', role: '高级客服', workload: 0 },
    { id: 'staff_004', name: '小赵', role: '客服主管', workload: 2 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          分配客服
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          将选中的 {requests.length} 个请求分配给：
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
          {staffList.map(staff => (
            <button
              key={staff.id}
              onClick={() => setSelectedStaff(staff.id)}
              className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                selectedStaff === staff.id
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 hover:border-violet-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{staff.name}</div>
                  <div className="text-xs text-gray-500">{staff.role}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                当前负荷: <span className="font-medium">{staff.workload}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => {
              const staff = staffList.find(s => s.id === selectedStaff);
              if (staff) {
                onAssign(staff.id, staff.name);
              }
            }}
            disabled={!selectedStaff}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function HumanHandoff() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  const [requests, setRequests] = useState<HandoffRequest[]>([]);

  // 加载转接请求数据
  useEffect(() => {
    const loadRequests = async () => {
      if (selectedHotels.length === 0) {
        setRequests([]);
        return;
      }
      try {
        const hotelIds = selectedHotels.map(h => h.id);
        const response = await aichatApi.getHandoffRequests({ 
          page: 1, 
          pageSize: 20,
          hotelIds 
        });
        if (response.success) {
          setRequests(response.data.list);
        }
      } catch (error) {
        console.error('加载转接请求失败:', error);
      }
    };
    loadRequests();
  }, [selectedHotels]);
  const [filterStatus, setFilterStatus] = useState<HandoffStatus | 'all'>('all');
  const [filterHotel, setFilterHotel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // 获取选中酒店ID集合（转为Set便于查找）
  const selectedHotelIdSet = useMemo(() => 
    new Set(selectedHotels.map(h => h.id)),
    [selectedHotels]
  );

  // 过滤请求
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 酒店过滤
      if (!selectedHotelIdSet.has(req.hotelId)) return false;
      if (filterHotel !== 'all' && req.hotelId !== filterHotel) return false;
      
      // 状态过滤
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      
      // 搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.guestName.toLowerCase().includes(query) ||
          req.originalMessage.toLowerCase().includes(query) ||
          req.tags.some(t => t.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [requests, selectedHotelIdSet, filterHotel, filterStatus, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    const visible = requests.filter(r => selectedHotelIdSet.has(r.hotelId));
    return {
      total: visible.length,
      pending: visible.filter(r => r.status === 'pending').length,
      processing: visible.filter(r => r.status === 'processing').length,
      completed: visible.filter(r => r.status === 'completed').length,
      urgent: visible.filter(r => r.priority === 'urgent' && r.status !== 'completed').length,
    };
  }, [requests, selectedHotelIdSet]);

  // 检查SLA超时
  const isOverdue = (req: HandoffRequest) => {
    return new Date() > req.slaDeadline && req.status !== 'completed';
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  // 剩余SLA时间
  const getSlaRemaining = (req: HandoffRequest) => {
    const diff = Math.floor((req.slaDeadline.getTime() - Date.now()) / 1000);
    if (diff < 0) return '已超时';
    if (diff < 60) return `${diff}秒`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
    return `${Math.floor(diff / 3600)}小时`;
  };

  // 分配处理
  const handleAssign = (staffId: string, staffName: string) => {
    setRequests(prev => prev.map(req => {
      if (selectedRequests.has(req.id)) {
        return {
          ...req,
          status: 'processing',
          assignedTo: staffId,
          assignedToName: staffName,
          assignedAt: new Date(),
        };
      }
      return req;
    }));
    setSelectedRequests(new Set());
    setShowAssignModal(false);
    setBatchMode(false);
  };

  // 完成处理
  const handleComplete = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? { ...req, status: 'completed', completedAt: new Date() }
        : req
    ));
  };

  // 切换选择
  const toggleSelection = (id: string) => {
    setSelectedRequests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看转接队列</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          人工转接队列需要选择至少一家酒店才能查看。<br/>
          这里显示AI无法处理或用户要求人工服务的会话。
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
          <h1 className="text-2xl font-bold text-gray-900">人工转接队列</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `管理 ${selectedHotels[0].name} 的人工转接请求`
              : `管理 ${selectedHotels.length} 家酒店的人工转接请求`
            }
          </p>
        </div>
        <button
          onClick={() => {
            setBatchMode(!batchMode);
            if (batchMode) setSelectedRequests(new Set());
          }}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            batchMode 
              ? 'bg-violet-100 text-violet-700' 
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          {batchMode ? '退出批量' : '批量分配'}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">转接总数</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-sm text-gray-500">待分配</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.processing}</div>
              <div className="text-sm text-gray-500">处理中</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
              <div className="text-sm text-gray-500">已完成</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.urgent}</div>
              <div className="text-sm text-gray-500">紧急待处理</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          {batchMode && (
            <button
              onClick={() => {
                const selectable = filteredRequests
                  .filter(r => r.status === 'pending')
                  .map(r => r.id);
                if (selectedRequests.size === selectable.length) {
                  setSelectedRequests(new Set());
                } else {
                  setSelectedRequests(new Set(selectable));
                }
              }}
              className="px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg"
            >
              {selectedRequests.size === filteredRequests.filter(r => r.status === 'pending').length 
                ? '取消全选' 
                : '全选待分配'}
            </button>
          )}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客人姓名、消息内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {selectedHotels.length > 1 && (
            <select
              value={filterHotel}
              onChange={(e) => setFilterHotel(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <option value="all">全部酒店</option>
              {selectedHotels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as HandoffStatus | 'all')}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <option value="all">全部状态</option>
            <option value="pending">待分配</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      {/* 批量操作栏 */}
      {batchMode && selectedRequests.size > 0 && (
        <div className="bg-violet-50 p-4 rounded-xl border border-violet-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-violet-600" />
            <span className="text-violet-900 font-medium">
              已选择 {selectedRequests.size} 个待分配请求
            </span>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2"
          >
            <UserCircle className="w-4 h-4" />
            分配客服
          </button>
        </div>
      )}

      {/* 请求列表 */}
      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const statusConfig = STATUS_CONFIG[req.status];
          const reasonConfig = REASON_CONFIG[req.reason];
          const StatusIcon = statusConfig.icon;
          const overdue = isOverdue(req);
          
          return (
            <div 
              key={req.id} 
              className={`bg-white rounded-xl border transition-colors overflow-hidden ${
                selectedRequests.has(req.id) 
                  ? 'border-violet-500 ring-2 ring-violet-100' 
                  : overdue 
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* 选择框 */}
                  {batchMode && req.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedRequests.has(req.id)}
                      onChange={() => toggleSelection(req.id)}
                      className="mt-1 w-4 h-4 text-violet-600"
                    />
                  )}
                  
                  {/* 优先级 */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_CONFIG[req.priority].color}`}>
                    {PRIORITY_CONFIG[req.priority].label}
                  </div>

                  {/* 主要内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{req.guestName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {statusConfig.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${reasonConfig.color}`}>
                        {reasonConfig.label}
                      </span>
                      <span className="text-xs text-gray-400">{req.hotelName}</span>
                    </div>

                    {/* 原始消息 */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <p className="text-gray-700 text-sm">{req.originalMessage}</p>
                    </div>

                    {/* AI建议 */}
                    {req.aiSuggestion && (
                      <div className="bg-violet-50 p-3 rounded-lg mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-violet-600" />
                          <span className="text-xs font-medium text-violet-700">AI处理建议</span>
                        </div>
                        <p className="text-violet-700 text-sm">{req.aiSuggestion}</p>
                      </div>
                    )}

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {req.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          创建 {formatTime(req.createdAt)}
                        </span>
                        {req.assignedToName && (
                          <span className="flex items-center gap-1">
                            <UserCircle className="w-4 h-4" />
                            分配: {req.assignedToName}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                          <Timer className="w-4 h-4" />
                          SLA: {getSlaRemaining(req)}
                        </span>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {req.status === 'pending' && !batchMode && (
                          <button
                            onClick={() => {
                              setSelectedRequests(new Set([req.id]));
                              setShowAssignModal(true);
                            }}
                            className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm hover:bg-violet-200"
                          >
                            分配
                          </button>
                        )}
                        {req.status === 'processing' && (
                          <button
                            onClick={() => handleComplete(req.id)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                          >
                            完成
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredRequests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无转接请求</p>
            <p className="text-sm text-gray-400 mt-1">所有会话都在正常处理中</p>
          </div>
        )}
      </div>

      {/* 分配弹窗 */}
      <AssignModal
        isOpen={showAssignModal}
        requests={requests.filter(r => selectedRequests.has(r.id))}
        onAssign={handleAssign}
        onClose={() => setShowAssignModal(false)}
      />
    </div>
  );
}

export default HumanHandoff;
