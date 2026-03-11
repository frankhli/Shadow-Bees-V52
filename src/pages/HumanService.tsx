import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, User, Bot, Clock, 
  MessageSquare, Phone, UserCircle, X, AlertTriangle,
  RefreshCw, Ticket, FileText
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { toast } from '@/components/ux';
// import { aiAgentService } from '@/services/aiAgentService';
import type { Platform, TicketType } from '@/types';
import { issueTypeIcons, avatarIcons } from '@/utils/iconTheme';

// 转人工请求类型
interface HandoverRequest {
  id: string;
  platform: Platform;
  platformName: string;
  customerName: string;
  customerAvatar: string;
  issueType: 'bargain' | 'complaint' | 'inquiry' | 'refund' | 'other';
  issueTitle: string;
  issueDesc: string;
  waitTime: number; // 等待秒数
  priority: 'high' | 'medium' | 'low';
  status: 'waiting' | 'processing' | 'resolved';
  messages: Message[];
  createdAt: Date;
}

interface Message {
  id: string;
  role: 'customer' | 'ai' | 'human';
  content: string;
  timestamp: Date;
}

// 平台配置
const platformConfig: Record<Platform, { name: string; color: string; logo: string }> = {
  xianyu: { name: '闲鱼', color: '#FFD700', logo: '/logos/xianyu.jpg' },
  xiaohongshu: { name: '小红书', color: '#FF2442', logo: '/logos/xiaohongshu.jpg' },
  wechat: { name: '微信', color: '#07C160', logo: '/logos/wechat.jpg' },
};

// 问题类型配置（使用科技风图标）
const issueTypeConfig = {
  bargain: { ...issueTypeIcons.bargain },
  complaint: { ...issueTypeIcons.complaint },
  inquiry: { ...issueTypeIcons.inquiry },
  refund: { ...issueTypeIcons.refund },
  other: { ...issueTypeIcons.other },
};

// 模拟生成转人工请求
const generateMockHandoverRequests = (): HandoverRequest[] => [
  {
    id: 'REQ001',
    platform: 'xianyu',
    platformName: '闲鱼',
    customerName: '王先生',
    customerAvatar: 'male',
    issueType: 'bargain',
    issueTitle: '多次议价未成交',
    issueDesc: '客户连续5次要求降价，AI已无法应对，需人工介入谈价策略',
    waitTime: 180,
    priority: 'medium',
    status: 'waiting',
    createdAt: new Date(Date.now() - 180000),
    messages: [
      { id: '1', role: 'customer', content: '这房间能便宜点吗？', timestamp: new Date(Date.now() - 300000) },
      { id: '2', role: 'ai', content: '不好意思，价格系统自动生成，不接受议价。', timestamp: new Date(Date.now() - 290000) },
      { id: '3', role: 'customer', content: '便宜50块我就订了', timestamp: new Date(Date.now() - 280000) },
      { id: '4', role: 'ai', content: '现在已经是底价了，别家更贵。', timestamp: new Date(Date.now() - 270000) },
      { id: '5', role: 'customer', content: '我诚心要，你让点价呗', timestamp: new Date(Date.now() - 260000) },
      { id: '6', role: 'ai', content: '价格随时波动，现在不订等下就没了。', timestamp: new Date(Date.now() - 250000) },
      { id: '7', role: 'customer', content: '你这人怎么不懂变通，找你们经理来', timestamp: new Date(Date.now() - 240000) },
      { id: '8', role: 'ai', content: '抱歉给您带来不好的体验，我为您转接人工客服处理。', timestamp: new Date(Date.now() - 180000) },
    ],
  },
  {
    id: 'REQ002',
    platform: 'xiaohongshu',
    platformName: '小红书',
    customerName: '李女士',
    customerAvatar: 'female',
    issueType: 'complaint',
    issueTitle: '房间与描述不符',
    issueDesc: '客户反馈实际房间与图片差距大，要求退款并投诉，需紧急处理',
    waitTime: 60,
    priority: 'high',
    status: 'waiting',
    createdAt: new Date(Date.now() - 60000),
    messages: [
      { id: '1', role: 'customer', content: '你们这是欺诈！房间跟图片完全不一样！', timestamp: new Date(Date.now() - 120000) },
      { id: '2', role: 'ai', content: '非常抱歉给您带来不好的体验，我马上为您转接人工客服，会有专人帮您处理。', timestamp: new Date(Date.now() - 60000) },
    ],
  },
  {
    id: 'REQ003',
    platform: 'wechat',
    platformName: '微信',
    customerName: '张先生',
    customerAvatar: 'business',
    issueType: 'inquiry',
    issueTitle: '团建预订咨询',
    issueDesc: '客户需要预订10间房用于团建，有特殊需求，AI无法处理复杂场景',
    waitTime: 300,
    priority: 'low',
    status: 'waiting',
    createdAt: new Date(Date.now() - 300000),
    messages: [
      { id: '1', role: 'customer', content: '我想订10间房，公司团建用', timestamp: new Date(Date.now() - 400000) },
      { id: '2', role: 'ai', content: '有的，我们房间设施齐全，位置优越。您需要什么房型？', timestamp: new Date(Date.now() - 390000) },
      { id: '3', role: 'customer', content: '需要5间双床5间大床，周五入住周日退房，能开发票吗？', timestamp: new Date(Date.now() - 380000) },
      { id: '4', role: 'ai', content: '这个问题我记录一下，帮您转人工确认。', timestamp: new Date(Date.now() - 300000) },
    ],
  },
  {
    id: 'REQ004',
    platform: 'xianyu',
    platformName: '闲鱼',
    customerName: '赵女士',
    customerAvatar: 'female',
    issueType: 'refund',
    issueTitle: '行程变更申请退款',
    issueDesc: '客户因航班取消无法入住，申请全额退款，需核实订单信息后处理',
    waitTime: 420,
    priority: 'medium',
    status: 'waiting',
    createdAt: new Date(Date.now() - 420000),
    messages: [
      { id: '1', role: 'customer', content: '我航班取消了，去不了了，能退款吗？', timestamp: new Date(Date.now() - 500000) },
      { id: '2', role: 'ai', content: '抱歉给您带来不好的体验，我为您转接人工客服处理。', timestamp: new Date(Date.now() - 420000) },
    ],
  },
];

// 格式化等待时间
const formatWaitTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
};

export default function HumanService() {
  const [requests, setRequests] = useState<HandoverRequest[]>(generateMockHandoverRequests());
  const [selectedRequest, setSelectedRequest] = useState<HandoverRequest | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 获取 unifiedStore 中的工单相关方法
  const { addTicket, currentHotel, user } = useUnifiedStore();

  // 自动更新等待时间
  useEffect(() => {
    const timer = setInterval(() => {
      setRequests(prev => prev.map(req => ({
        ...req,
        waitTime: req.status === 'waiting' ? req.waitTime + 1 : req.waitTime
      })));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedRequest?.messages]);

  // 接入处理
  const handleAccept = (request: HandoverRequest) => {
    setRequests(prev => prev.map(r => 
      r.id === request.id ? { ...r, status: 'processing' } : r
    ));
    setSelectedRequest({ ...request, status: 'processing' });
  };

  // 智能生成客户回复
  const generateCustomerReply = (humanReply: string, issueType: string): string => {
    const lowerReply = humanReply.toLowerCase();
    
    // 根据问题类型和客服回复生成合适的客户回复
    if (issueType === 'bargain') {
      if (lowerReply.includes('便宜') || lowerReply.includes('优惠') || lowerReply.includes('折扣') || lowerReply.includes('少')) {
        return '那能便宜多少？我还是觉得有点贵...';
      }
      if (lowerReply.includes('最低') || lowerReply.includes('底价') || lowerReply.includes('不能')) {
        return '真的不能再便宜点吗？我是诚心想要的';
      }
      if (lowerReply.includes('送') || lowerReply.includes('早餐') || lowerReply.includes('延迟')) {
        return '那也行吧，那你帮我备注一下，我这就去下单';
      }
      if (lowerReply.includes('订') || lowerReply.includes('下单') || lowerReply.includes('可以')) {
        return '好的，那我现在就下单，谢谢！';
      }
      return '我再考虑一下吧，主要是价格还是有点超预算';
    }
    
    if (issueType === 'complaint') {
      if (lowerReply.includes('抱歉') || lowerReply.includes('对不起') || lowerReply.includes('抱歉')) {
        return '那你们打算怎么处理？给个说法';
      }
      if (lowerReply.includes('退') || lowerReply.includes('补偿') || lowerReply.includes('赔')) {
        return '退款什么时候能到账？我需要具体时间';
      }
      if (lowerReply.includes('核实') || lowerReply.includes('查') || lowerReply.includes('确认')) {
        return '好的，你尽快查清楚给我回复';
      }
      return '你们这服务太差了，我要投诉到平台去';
    }
    
    if (issueType === 'refund') {
      if (lowerReply.includes('可以退') || lowerReply.includes('同意') || lowerReply.includes('没问题')) {
        return '那退款大概什么时候到账？';
      }
      if (lowerReply.includes('不能退') || lowerReply.includes('不符合') || lowerReply.includes('不行')) {
        return '为什么不能退？我确实有特殊情况啊';
      }
      if (lowerReply.includes('审核') || lowerReply.includes('申请') || lowerReply.includes('提交')) {
        return '好的，我已经提交了，麻烦尽快处理';
      }
      return '那到底能不能退？给个准话';
    }
    
    if (issueType === 'inquiry') {
      if (lowerReply.includes('有') || lowerReply.includes('可以') || lowerReply.includes('支持')) {
        return '那具体怎么操作？需要我提供什么信息？';
      }
      if (lowerReply.includes('没有') || lowerReply.includes('不支持') || lowerReply.includes('不行')) {
        return '这样啊，那有没有其他方案？';
      }
      if (lowerReply.includes('电话') || lowerReply.includes('联系') || lowerReply.includes('加')) {
        return '好的，我的电话是138xxxx1234，你们什么时候打？';
      }
      return '明白了，我再考虑考虑';
    }
    
    // 通用回复
    const commonReplies = [
      '好的，明白了，谢谢！',
      '那我现在就下单可以吗？',
      '还有其他的问题想咨询一下',
      '好的，麻烦你了',
      '我再考虑一下，稍后联系你',
    ];
    return commonReplies[Math.floor(Math.random() * commonReplies.length)];
  };

  // 发送人工回复
  const handleSendReply = () => {
    if (!replyInput.trim() || !selectedRequest) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'human',
      content: replyInput,
      timestamp: new Date(),
    };

    const updatedRequest = {
      ...selectedRequest,
      messages: [...selectedRequest.messages, newMessage],
    };

    setSelectedRequest(updatedRequest);
    setRequests(prev => prev.map(r => 
      r.id === selectedRequest.id ? updatedRequest : r
    ));
    setReplyInput('');

    // 模拟客户回复（根据上下文智能生成）
    setIsProcessing(true);
    setTimeout(() => {
      const replyContent = generateCustomerReply(replyInput, selectedRequest.issueType);
      const customerReply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'customer',
        content: replyContent,
        timestamp: new Date(),
      };
      const finalRequest = {
        ...updatedRequest,
        messages: [...updatedRequest.messages, customerReply],
      };
      setSelectedRequest(finalRequest);
      setRequests(prev => prev.map(r => 
        r.id === selectedRequest.id ? finalRequest : r
      ));
      setIsProcessing(false);
    }, 1500 + Math.random() * 1000);
  };

  // 标记已解决
  const handleResolve = () => {
    if (!selectedRequest) return;
    setRequests(prev => prev.map(r => 
      r.id === selectedRequest.id ? { ...r, status: 'resolved' } : r
    ));
    setSelectedRequest(null);
  };

  // 统计
  const stats = {
    waiting: requests.filter(r => r.status === 'waiting').length,
    processing: requests.filter(r => r.status === 'processing').length,
    highPriority: requests.filter(r => r.status === 'waiting' && r.priority === 'high').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-din">人工工作台</h1>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg border border-border-color">
            <Clock size={16} className="text-neon-cyan" />
            <span>待接入: <span className="text-neon-cyan font-bold">{stats.waiting}</span></span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg border border-border-color">
            <UserCircle size={16} className="text-neon-purple" />
            <span>处理中: <span className="text-neon-purple font-bold">{stats.processing}</span></span>
          </div>
          {stats.highPriority > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/50">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-red-500">紧急: <span className="font-bold">{stats.highPriority}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* 左侧：转人工列表 */}
        <div className="col-span-4 bg-bg-secondary rounded-xl border border-border-color flex flex-col">
          <div className="p-4 border-b border-border-color">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <RefreshCw size={14} />
              <span>实时更新</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {requests.filter(r => r.status !== 'resolved').map((request) => {
              const platform = platformConfig[request.platform];
              const issue = issueTypeConfig[request.issueType];
              
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedRequest?.id === request.id
                      ? 'bg-neon-cyan/10 border-neon-cyan'
                      : 'bg-bg-tertiary border-border-color hover:border-neon-cyan/50'
                  } ${request.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={platform.logo} 
                        alt={platform.name}
                        className="w-7 h-7 rounded object-contain"
                      />
                      <span className="font-medium">{platform.name}</span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
                        style={{ background: issue.bgColor, color: issue.color }}
                      >
                        <issue.icon size={12} strokeWidth={2} />
                        {issue.label}
                      </span>
                    </div>
                    <span className={`text-xs ${request.waitTime > 300 ? 'text-red-500' : 'text-text-secondary'}`}>
                      等待 {formatWaitTime(request.waitTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: avatarIcons[request.customerAvatar as keyof typeof avatarIcons]?.bgColor || 'rgba(128,128,128,0.2)' }}
                    >
                      {(() => {
                        const AvatarIcon = avatarIcons[request.customerAvatar as keyof typeof avatarIcons]?.icon || User;
                        return <AvatarIcon size={14} strokeWidth={2} style={{ color: avatarIcons[request.customerAvatar as keyof typeof avatarIcons]?.color || '#888' }} />;
                      })()}
                    </div>
                    <span className="text-sm">{request.customerName}</span>
                  </div>
                  
                  <div className="text-sm font-medium mb-1">{request.issueTitle}</div>
                  <div className="text-xs text-text-secondary line-clamp-2">{request.issueDesc}</div>
                  
                  {request.status === 'waiting' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAccept(request); }}
                      className="mt-3 w-full py-2 bg-neon-cyan text-bg-primary rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                    >
                      接入处理
                    </button>
                  )}
                  {request.status === 'processing' && (
                    <div className="mt-3 w-full py-2 bg-neon-purple/20 text-neon-purple rounded-lg text-sm text-center">
                      处理中
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {requests.filter(r => r.status !== 'resolved').length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <div className="text-4xl mb-4">✅</div>
                <div>暂无待处理请求</div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：对话详情 */}
        <div className="col-span-8 bg-bg-secondary rounded-xl border border-border-color flex flex-col">
          {selectedRequest ? (
            <>
              {/* 头部信息 */}
              <div className="p-4 border-b border-border-color">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.bgColor || 'rgba(128,128,128,0.2)' }}
                    >
                      {(() => {
                        const AvatarIcon = avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.icon || User;
                        return <AvatarIcon size={20} strokeWidth={1.5} style={{ color: avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.color || '#888' }} />;
                      })()}
                    </div>
                    <div>
                      <div className="font-medium">{selectedRequest.customerName}</div>
                      <div className="text-xs text-text-secondary flex items-center gap-2">
                        <span className="flex items-center gap-1.5">
                          <img 
                            src={platformConfig[selectedRequest.platform].logo} 
                            alt={platformConfig[selectedRequest.platform].name}
                            className="w-5 h-5 rounded object-contain"
                          />
                          {selectedRequest.platformName}
                        </span>
                        <span>•</span>
                        <span 
                          className="flex items-center gap-1"
                          style={{ color: issueTypeConfig[selectedRequest.issueType].color }}
                        >
                          {(() => {
                            const IssueIcon = issueTypeConfig[selectedRequest.issueType].icon;
                            return <IssueIcon size={12} strokeWidth={2} />;
                          })()}
                          {issueTypeConfig[selectedRequest.issueType].label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRequest.status === 'processing' && (
                      <>
                        <button
                          onClick={() => setShowTicketModal(true)}
                          className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/30 transition-all flex items-center gap-1.5"
                        >
                          <Ticket size={14} />
                          转工单
                        </button>
                        <button
                          onClick={handleResolve}
                          className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg text-sm hover:bg-green-500/30 transition-all"
                        >
                          标记已解决
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-2 hover:bg-bg-tertiary rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="text-center text-xs text-text-secondary py-2">
                  —— 以上为AI对话记录 ——
                </div>
                
                {selectedRequest.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'customer' ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'customer' 
                        ? '' 
                        : msg.role === 'ai'
                        ? 'bg-bg-tertiary border border-border-color'
                        : 'bg-neon-cyan text-bg-primary'
                    }`}
                    style={msg.role === 'customer' ? { 
                      background: avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.bgColor || 'rgba(168, 85, 247, 0.3)' 
                    } : {}}
                    >
                      {msg.role === 'customer' ? (
                        (() => {
                          const AvatarIcon = avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.icon || User;
                          return <AvatarIcon size={18} strokeWidth={1.5} style={{ color: avatarIcons[selectedRequest.customerAvatar as keyof typeof avatarIcons]?.color || '#A855F7' }} />;
                        })()
                      ) : msg.role === 'ai' ? (
                        <Bot size={18} className="text-neon-cyan" />
                      ) : (
                        <User size={18} />
                      )}
                    </div>
                    <div className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.role === 'customer'
                        ? 'bg-bg-tertiary border border-border-color rounded-tl-sm'
                        : msg.role === 'ai'
                        ? 'bg-bg-tertiary border border-border-color rounded-tr-sm'
                        : 'bg-neon-cyan text-bg-primary rounded-tr-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className={`text-xs mt-2 ${msg.role === 'human' ? 'text-bg-primary/60' : 'text-text-secondary'}`}>
                        {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isProcessing && (
                  <div className="flex items-center gap-2 text-text-secondary text-sm py-2">
                    <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="ml-2">客户正在输入...</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* 人工回复区 */}
              {selectedRequest.status === 'processing' && (
                <div className="p-4 border-t border-border-color">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="输入人工回复..."
                      className="flex-1 px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none transition-all"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!replyInput.trim()}
                      className="px-6 py-3 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                      发送
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    {/* 快捷回复按钮 */}
                    <div className="relative group">
                      <button
                        className="flex items-center gap-1 text-text-secondary hover:text-neon-cyan transition-colors"
                      >
                        <MessageSquare size={12} />
                        快捷回复
                      </button>
                      {/* 快捷回复下拉菜单 */}
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-bg-secondary border border-border-color rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                        <div className="p-2">
                          <div className="text-xs text-text-hint px-2 py-1 mb-1">议价场景</div>
                          {[
                            { text: '抱歉，价格已经是底价了，但我们可以送您早餐', tag: '底价' },
                            { text: '您可以再考虑一下，这个房型确实比较抢手', tag: '建议' },
                            { text: '我帮您申请一下延迟退房，这样更划算', tag: '福利' },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => setReplyInput(item.text)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-neon-cyan/10 hover:text-neon-cyan rounded-lg transition-all flex items-center justify-between"
                            >
                              <span className="truncate">{item.text}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-hint flex-shrink-0 ml-2">{item.tag}</span>
                            </button>
                          ))}
                          <div className="text-xs text-text-hint px-2 py-1 mb-1 mt-2 border-t border-border-color">通用回复</div>
                          {[
                            { text: '您好，有什么可以帮您的？', tag: '开场' },
                            { text: '好的，我这就为您处理', tag: '确认' },
                            { text: '感谢您的理解，祝您入住愉快！', tag: '结束' },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => setReplyInput(item.text)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-neon-cyan/10 hover:text-neon-cyan rounded-lg transition-all flex items-center justify-between"
                            >
                              <span className="truncate">{item.text}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary rounded text-text-hint flex-shrink-0 ml-2">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 电话回访按钮 */}
                    <button
                      onClick={() => {
                        const phoneMessage: Message = {
                          id: Date.now().toString(),
                          role: 'human',
                          content: `【系统】已发起电话回访，客户电话：138****${Math.floor(1000 + Math.random() * 9000)}，预计3分钟内拨打`,
                          timestamp: new Date(),
                        };
                        const updatedRequest = {
                          ...selectedRequest,
                          messages: [...selectedRequest.messages, phoneMessage],
                        };
                        setSelectedRequest(updatedRequest);
                        setRequests(prev => prev.map(r => 
                          r.id === selectedRequest.id ? updatedRequest : r
                        ));
                      }}
                      className="flex items-center gap-1 text-text-secondary hover:text-neon-cyan transition-colors"
                    >
                      <Phone size={12} />
                      电话回访
                    </button>
                    
                    {/* 常用操作 */}
                    <button
                      onClick={() => setReplyInput('请稍等，我帮您查询一下')}
                      className="flex items-center gap-1 text-text-secondary hover:text-neon-cyan transition-colors"
                    >
                      <Clock size={12} />
                      请稍等
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <div className="text-6xl mb-4">👈</div>
                <div className="text-lg mb-2">选择左侧请求开始处理</div>
                <div className="text-sm">点击"接入处理"即可与客户对话</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 转工单弹窗 */}
      <CreateTicketFromChatModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        request={selectedRequest}
        onSubmit={(ticketData) => {
          // 创建工单
          const ticketId = `TKT-${Date.now()}`;
          const newTicket = {
            hotelId: currentHotel?.id || 'hotel-001',
            hotelName: currentHotel?.name || '未知酒店',
            type: ticketData.type,
            title: ticketData.title,
            description: ticketData.description,
            status: 'open' as const,
            priority: 'medium' as const,
            contactName: user?.name || '客服',
            contactPhone: '',
            source: 'manual' as const,
            tags: ['人工工作台', selectedRequest?.platformName || ''],
            messages: [] as any[],
          };
          
          addTicket(newTicket);
          
          // 添加第一条消息（对话记录）
          const { addTicketMessage } = useUnifiedStore.getState();
          addTicketMessage(ticketId, {
            sender: 'hotel',
            senderName: user?.name || '客服',
            content: `【从人工工作台转交】\n客户：${selectedRequest?.customerName}\n平台：${selectedRequest?.platformName}\n问题：${selectedRequest?.issueTitle}\n\n对话记录摘要：\n${selectedRequest?.messages.map(m => `${m.role === 'customer' ? '客户' : m.role === 'ai' ? 'AI' : '人工'}：${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''}`).join('\n')}`,
          });
          
          // 标记原请求为已解决
          if (selectedRequest) {
            setRequests(prev => prev.map(r => 
              r.id === selectedRequest.id ? { ...r, status: 'resolved' } : r
            ));
            setSelectedRequest(null);
          }
          
          setShowTicketModal(false);
          toast.success('工单创建成功', '问题已转交给平台运营团队处理');
        }}
      />
    </div>
  );
}
// ... existing code ...

// 转工单弹窗组件
interface CreateTicketFromChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HandoverRequest | null;
  onSubmit: (data: { type: TicketType; title: string; description: string }) => void;
}

function CreateTicketFromChatModal({ isOpen, onClose, request, onSubmit }: CreateTicketFromChatModalProps) {
  const [type, setType] = useState<TicketType>('tech');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // 根据请求内容自动填充
  useEffect(() => {
    if (request) {
      setTitle(`【${request.platformName}】${request.issueTitle}`);
      setDescription(`客户：${request.customerName}\n平台：${request.platformName}\n问题描述：${request.issueDesc}\n\n对话记录摘要：\n${request.messages.slice(-3).map(m => `${m.role === 'customer' ? '客户' : m.role === 'ai' ? 'AI' : '人工'}：${m.content}`).join('\n')}`);
    }
  }, [request]);
  
  if (!isOpen || !request) return null;
  
  const ticketTypeOptions: { value: TicketType; label: string; desc: string }[] = [
    { value: 'tech', label: '技术问题', desc: '系统故障、数据异常等技术支持' },
    { value: 'business', label: '业务申请', desc: '渠道开通、账期调整等商务需求' },
    { value: 'consult', label: '使用咨询', desc: '功能使用、操作指导等咨询问题' },
  ];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-bg-secondary rounded-xl border border-border-color w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="p-4 border-b border-border-color flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket size={20} className="text-neon-cyan" />
              <h3 className="font-semibold">转交工单</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded-lg">
              <X size={18} />
            </button>
          </div>
          
          {/* 内容 */}
          <div className="p-4 space-y-4">
            {/* 客户信息摘要 */}
            <div className="p-3 bg-bg-tertiary rounded-lg text-sm">
              <div className="flex items-center gap-2 text-text-secondary mb-2">
                <UserCircle size={14} />
                <span>客户信息</span>
              </div>
              <div className="font-medium">{request.customerName}</div>
              <div className="text-text-secondary text-xs mt-1">
                {request.platformName} · {request.issueTitle}
              </div>
            </div>
            
            {/* 工单类型 */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">工单类型</label>
              <div className="grid grid-cols-3 gap-2">
                {ticketTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setType(option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      type === option.value
                        ? 'border-neon-cyan bg-neon-cyan/10'
                        : 'border-border-color hover:border-neon-cyan/50'
                    }`}
                  >
                    <div className={`text-sm font-medium ${type === option.value ? 'text-neon-cyan' : ''}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 工单标题 */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">工单标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none"
                placeholder="简要描述问题"
              />
            </div>
            
            {/* 问题描述 */}
            <div>
              <label className="block text-sm text-text-secondary mb-2">详细描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none resize-none"
                placeholder="详细描述问题，包括对话记录..."
              />
            </div>
            
            {/* 提示 */}
            <div className="p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg text-sm text-text-secondary">
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-neon-cyan mt-0.5" />
                <div>
                  <div className="text-neon-cyan font-medium">转交说明</div>
                  <div className="mt-1">提交后，该客户对话将标记为已解决，平台运营团队会在工单中心跟进处理。</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 底部按钮 */}
          <div className="p-4 border-t border-border-color flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-all"
            >
              取消
            </button>
            <button
              onClick={() => onSubmit({ type, title, description })}
              disabled={!title.trim() || !description.trim()}
              className="flex-1 px-4 py-2 bg-neon-cyan text-bg-primary rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交工单
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
