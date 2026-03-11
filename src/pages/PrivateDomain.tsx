/**
 * Shadow-Bees V52 - 私域运营页面
 * 专注于微信生态运营：内容日历、任务看板、私域统计
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, CheckCircle2, Clock, MessageCircle, Users, 
  TrendingUp, Copy, Send, UserPlus, MessageSquare,
  Camera, Mic, Bell, Check
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { formatPrice } from '@/utils/helpers';
import { useToast } from '@/components/ui/Toast';
import type { ContentItem, VideoScript, GroupScript, PrivateChatScript } from '@/types';

// 私域内容类型
type WechatContentType = 'moments' | 'group' | 'private' | 'channels';

// 任务状态
type TaskStatus = 'pending' | 'completed' | 'overdue';

// 私域内容项
interface PrivateContent {
  id: string;
  type: WechatContentType;
  subtype: string;
  title: string;
  content: string;
  scheduledTime?: string;
  publishedAt?: string;
  status: 'draft' | 'scheduled' | 'published';
  images?: string[];
  // === 私域专属指标（替代公域曝光/点击）===
  performance?: {
    touches?: number;     // 触达客户数
    replies?: number;     // 回复数
    conversions?: number; // 私域成交数
  };
  // 扩展详情
  videoScript?: VideoScript;
  groupScript?: GroupScript;
  privateScript?: PrivateChatScript;
  // 原始 ContentItem 引用
  sourceContent?: ContentItem;
}

// 运营任务
interface OperationTask {
  id: string;
  type: 'content' | 'followup' | 'group' | 'reminder';
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
}

// 客户回访记录
interface FollowUpRecord {
  id: string;
  customerName: string;
  lastStayDate: string;
  followUpCount: number;
  status: 'pending' | 'completed';
  notes?: string;
}

// 从 ContentItem 转换为 PrivateContent 格式
const convertToPrivateContent = (content: ContentItem): PrivateContent => {
  // 优先使用保存的 subtype（权威来源）
  const type: WechatContentType = content.subtype || 'moments';
  let subtypeLabel = '图文';
  
  // 根据 type 和脚本数据确定显示标签
  switch (type) {
    case 'group':
      subtypeLabel = content.groupScript?.type === 'flashsale' ? '闪购' : 
                    content.groupScript?.type === 'welcome' ? '欢迎语' :
                    content.groupScript?.type === 'interaction' ? '互动' : '群公告';
      break;
    case 'private':
      subtypeLabel = content.privateScript?.type === 'welcome' ? '新好友' :
                    content.privateScript?.type === 'followup' ? '回访' :
                    content.privateScript?.type === 'rebooking' ? '复购' : '私聊';
      break;
    case 'channels':
      subtypeLabel = '视频号';
      break;
    case 'moments':
    default:
      // 根据内容特征判断朋友圈子类型
      if (content.content?.includes('早安') || content.content?.includes('☀️')) {
        subtypeLabel = '早安';
      } else if (content.content?.includes('好评') || content.content?.includes('💚')) {
        subtypeLabel = '晒单';
      } else if (content.content?.includes('闪购') || content.content?.includes('⚡️')) {
        subtypeLabel = '闪购';
      } else {
        subtypeLabel = '朋友圈';
      }
      break;
  }
  
  return {
    id: content.id,
    type,
    subtype: subtypeLabel,
    title: content.title,
    content: content.content,
    publishedAt: content.publishedAt || content.createdAt,
    status: content.status === 'published' ? 'published' : 'draft',
    images: content.images,
    // === 使用私域专属指标 ===
    performance: {
      touches: content.performance?.touches ?? 0,
      replies: content.performance?.replies ?? 0,
      conversions: content.performance?.privateConversions ?? 0,
    },
    // 保存扩展数据用于详情展示
    videoScript: content.videoScript,
    groupScript: content.groupScript,
    privateScript: content.privateScript,
    // 保留原始引用
    sourceContent: content,
  };
};

// 模拟数据 - 私域内容库（仅作为示例，实际从 store 读取）
const mockPrivateContents: PrivateContent[] = [
  {
    id: 'pc-001',
    type: 'moments',
    subtype: '早安',
    title: '早安问候+房价信息',
    content: '☀️ 早安！北京今天晴 18°C\n\n🏨 今日房源充足\n提前预订享早鸟价\n\n💰 今日房价：\n• 大床房 ¥329（原价¥399）\n• 双床房 ¥359（原价¥429）\n\n📍 三里屯步行5分钟',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'published',
    images: ['room1', 'price1'],
    performance: { touches: 156, replies: 12, conversions: 3 }
  },
  {
    id: 'pc-002',
    type: 'group',
    subtype: '闪购',
    title: '今晚闪购-群内专属',
    content: '⚡️ 【群内专属闪购】⚡️\n\n🕘 今晚还剩最后3间！\n\n📅 日期：今晚入住\n🛏️ 房型：豪华大床房\n💰 群内专享：¥299\n📱 携程价：¥459',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: 'published',
    performance: { touches: 45, replies: 8, conversions: 2 }
  },
  {
    id: 'pc-003',
    type: 'moments',
    subtype: '晒单',
    title: '客人好评展示',
    content: '💚 收到客人的好评，开心一整天\n\n"房间很干净，位置也方便，\n下次来看演唱会还住这里！"\n\n感谢每一位选择我们的朋友',
    scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: 'scheduled',
    images: ['review1', 'room2']
  },
  {
    id: 'pc-004',
    type: 'private',
    subtype: '回访',
    title: '入住后回访',
    content: 'Hi，昨晚休息得怎么样？\n\n希望我们的房间和服务让您满意\n\n🎁 感谢您的支持：\n下次入住报暗号【老朋友】\n享专属回头客价',
    status: 'draft'
  }
];

// 模拟任务数据
const mockTasks: OperationTask[] = [
  {
    id: 'task-001',
    type: 'content',
    title: '发布早安朋友圈',
    description: '今日房价+天气+早鸟优惠',
    deadline: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30分钟后
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-002',
    type: 'followup',
    title: '回访昨日离店客人',
    description: '5位客人待回访：张先生、李女士...',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: 'pending',
    priority: 'medium'
  },
  {
    id: 'task-003',
    type: 'group',
    title: '晚间群内闪购',
    description: '今晚剩余房源群内特价',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-004',
    type: 'reminder',
    title: '老客户生日关怀',
    description: '3位老客户本月生日，准备专属福利',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: 'pending',
    priority: 'low'
  }
];

// 模拟客户回访数据
const mockFollowUps: FollowUpRecord[] = [
  { id: 'fu-001', customerName: '张先生', lastStayDate: '2026-02-20', followUpCount: 0, status: 'pending' },
  { id: 'fu-002', customerName: '李女士', lastStayDate: '2026-02-19', followUpCount: 0, status: 'pending' },
  { id: 'fu-003', customerName: '王总', lastStayDate: '2026-02-18', followUpCount: 1, status: 'completed', notes: '已发送优惠券' },
  { id: 'fu-004', customerName: '赵小姐', lastStayDate: '2026-02-17', followUpCount: 0, status: 'pending' },
  { id: 'fu-005', customerName: '刘先生', lastStayDate: '2026-02-15', followUpCount: 0, status: 'pending' }
];

// 快捷文案模板
const quickTemplates = {
  morning: [
    '☀️ 早安！{{city}}今天{{weather}} {{temp}}°C\n\n🏨 今日房源充足\n提前预订享早鸟价\n\n💰 今日房价：\n• 大床房 ¥{{price1}}（原价¥{{original1}}）\n• 双床房 ¥{{price2}}（原价¥{{original2}}）',
    '🌅 新的一天，新的出发\n\n我们的房间已准备好\n等待您的到来\n\n✨ 今日特价：¥{{price}}起\n📞 预订从速'
  ],
  flashsale: [
    '⚡️ 【群内专属闪购】⚡️\n\n🕘 今晚还剩最后{{count}}间！\n\n🛏️ 房型：{{roomType}}\n💰 群内专享：¥{{price}}\n📱 平台价：¥{{platformPrice}}\n\n⏰ {{time}}前有效',
    '🔥 紧急清房 🔥\n\n今晚{{roomType}}还有{{count}}间\n群内专属价：¥{{price}}\n\n手慢无！回复【预订】锁定'
  ],
  followup: [
    'Hi {{name}}，昨晚休息得怎么样？\n\n希望我们的房间和服务让您满意\n\n🎁 感谢您的支持：\n下次入住报暗号【老朋友】\n享专属回头客价',
    '{{name}}您好，感谢您选择我们！\n\n如果满意的话，欢迎推荐给朋友\n推荐成功送您免费升级房型的机会～'
  ]
};

export default function PrivateDomain() {
  const { contents, transactions, publishContent } = useUnifiedStore();
  const toast = useToast();
  
  // 视图切换：日历/任务/统计/草稿箱
  const [activeView, setActiveView] = useState<'calendar' | 'tasks' | 'stats' | 'drafts'>('calendar');
  const [selectedContentType, setSelectedContentType] = useState<WechatContentType | 'all'>('all');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  
  // 所有私域内容
  const allPrivateContents = useMemo(() => {
    const realPrivateContents = contents
      .filter(c => c.platform === 'wechat')
      .map(convertToPrivateContent);
    return realPrivateContents.length > 0 ? realPrivateContents : mockPrivateContents;
  }, [contents]);
  
  // 草稿内容（待发布）
  const draftContents = useMemo(() => {
    return allPrivateContents.filter(c => c.status === 'draft');
  }, [allPrivateContents]);
  
  // 已发布内容
  const publishedContents = useMemo(() => {
    return allPrivateContents.filter(c => c.status === 'published');
  }, [allPrivateContents]);
  
  // 过滤后的内容（用于日历视图）
  const filteredContents = useMemo(() => {
    const contentsToShow = activeView === 'drafts' ? draftContents : publishedContents;
    if (selectedContentType === 'all') return contentsToShow;
    return contentsToShow.filter(c => c.type === selectedContentType);
  }, [publishedContents, draftContents, selectedContentType, activeView]);
  
  // 发布草稿内容
  const handlePublish = async (contentId: string) => {
    setPublishingId(contentId);
    
    // 模拟发布过程（实际应调用微信API或用户手动操作）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 更新状态为已发布
    publishContent(contentId);
    
    setPublishingId(null);
    toast.success('发布成功', '内容已发布到私域渠道');
  };
  
  // 复制内容并标记为已发布
  const handleCopyAndPublish = (content: PrivateContent) => {
    navigator.clipboard.writeText(`${content.title}\n\n${content.content}`);
    handlePublish(content.id);
  };
  
  // 统计数据（使用私域专属指标）
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 从真实数据计算
    const wechatContents = contents.filter(c => c.platform === 'wechat');
    const publishedContents = wechatContents.filter(c => c.status === 'published');
    
    // 今日发布
    const todayPublished = publishedContents.filter(c => 
      (c.publishedAt || '').startsWith(todayStr)
    ).length;
    
    // 草稿箱待发布
    const draftCount = wechatContents.filter(c => c.status === 'draft').length;
    
    // 私域总触达（累加 touches）
    const totalTouches = publishedContents.reduce((sum, c) => 
      sum + (c.performance?.touches || 0), 0
    );
    
    // 私域回复数
    const totalReplies = publishedContents.reduce((sum, c) => 
      sum + (c.performance?.replies || 0), 0
    );
    
    // 私域归因成交
    const privateDeals = transactions.filter(t => 
      t.platform === 'wechat' && t.status !== 'refunded'
    );
    
    // 私域成交数（累加 privateConversions）
    const privateConversions = publishedContents.reduce((sum, c) => 
      sum + (c.performance?.privateConversions || 0), 0
    );
    
    // 待回访客户（模拟数据）
    const pendingFollowUps = mockFollowUps.filter(f => f.status === 'pending').length;
    
    return {
      todayPublished,
      draftCount,
      totalTouches,
      totalReplies,
      replyRate: totalTouches > 0 ? ((totalReplies / totalTouches) * 100).toFixed(1) : '0',
      privateDeals: privateDeals.length,
      privateGMV: privateDeals.reduce((sum, t) => sum + t.price, 0),
      privateConversions,
      totalWechatContents: wechatContents.length,
      pendingFollowUps
    };
  }, [contents, transactions]);
  
  // 复制文案
  const copyTemplate = (type: keyof typeof quickTemplates, index: number) => {
    const template = quickTemplates[type][index];
    navigator.clipboard.writeText(template);
    setCopiedTemplate(`${type}-${index}`);
    setTimeout(() => setCopiedTemplate(null), 2000);
    toast.success('文案已复制', '快去粘贴发布吧');
  };
  
  // 获取内容类型图标
  const getContentTypeIcon = (type: WechatContentType) => {
    switch (type) {
      case 'moments': return Camera;
      case 'group': return Users;
      case 'private': return MessageSquare;
      case 'channels': return Mic;
      default: return MessageCircle;
    }
  };
  
  // 获取内容类型名称
  const getContentTypeName = (type: WechatContentType) => {
    switch (type) {
      case 'moments': return '朋友圈';
      case 'group': return '微信群';
      case 'private': return '私聊';
      case 'channels': return '视频号';
      default: return '未知';
    }
  };
  
  // 获取任务类型图标
  const getTaskTypeIcon = (type: OperationTask['type']) => {
    switch (type) {
      case 'content': return Camera;
      case 'followup': return UserPlus;
      case 'group': return Users;
      case 'reminder': return Bell;
      default: return CheckCircle2;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">私域运营</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-neon-green/10 text-neon-green border border-neon-green/30">
              微信生态
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            朋友圈 · 微信群 · 私聊话术 · 视频号
          </p>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-bg-secondary rounded-xl p-1 border border-border-color">
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'calendar'
                ? 'bg-neon-green/20 text-neon-green'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Calendar size={16} />
            <span>内容日历</span>
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'tasks'
                ? 'bg-neon-amber/20 text-neon-amber'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>任务看板</span>
            {stats.draftCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-neon-amber text-bg-primary text-xs rounded-full">
                {stats.draftCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('stats')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'stats'
                ? 'bg-neon-cyan/20 text-neon-cyan'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingUp size={16} />
            <span>运营统计</span>
          </button>
          <button
            onClick={() => setActiveView('drafts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'drafts'
                ? 'bg-neon-purple/20 text-neon-purple'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Clock size={16} />
            <span>草稿箱</span>
            {stats.draftCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-neon-purple text-text-primary text-xs rounded-full">
                {stats.draftCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 数据概览卡片 - 私域专属指标 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
              <Users size={20} className="text-neon-green" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.totalTouches.toLocaleString()}</div>
              <div className="text-xs text-text-secondary">客户触达</div>
            </div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <MessageSquare size={20} className="text-neon-cyan" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.totalReplies.toLocaleString()}</div>
              <div className="text-xs text-text-secondary">客户回复 ({stats.replyRate}%)</div>
            </div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-amber/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-neon-amber" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.privateConversions}</div>
              <div className="text-xs text-text-secondary">私域成交</div>
            </div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-neon-purple" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{formatPrice(stats.privateGMV)}</div>
              <div className="text-xs text-text-secondary">私域GMV</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 视图1：内容日历 ===== */}
      {activeView === 'calendar' && (
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：内容列表 */}
          <div className="col-span-8 space-y-6">
            {/* 过滤器 */}
            <div className="flex items-center gap-2">
              {(['all', 'moments', 'group', 'private', 'channels'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedContentType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedContentType === type
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                      : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-neon-green/50'
                  }`}
                >
                  {type === 'all' ? '全部' : getContentTypeName(type)}
                </button>
              ))}
            </div>
            
            {/* 内容列表 */}
            <div className="space-y-4">
              {filteredContents.length === 0 ? (
                <div className="text-center py-12 text-text-secondary bg-bg-secondary rounded-xl border border-border-color">
                  <div className="text-4xl mb-4">📅</div>
                  <div className="text-lg mb-2">暂无内容安排</div>
                  <div className="text-sm">去「内容工厂」创建私域内容</div>
                </div>
              ) : (
                filteredContents.map((content) => {
                  const Icon = getContentTypeIcon(content.type);
                  return (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-bg-secondary rounded-xl border border-border-color p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            content.type === 'moments' ? 'bg-neon-green/10' :
                            content.type === 'group' ? 'bg-neon-amber/10' :
                            content.type === 'private' ? 'bg-neon-cyan/10' :
                            'bg-neon-purple/10'
                          }`}>
                            <Icon size={20} className={
                              content.type === 'moments' ? 'text-neon-green' :
                              content.type === 'group' ? 'text-neon-amber' :
                              content.type === 'private' ? 'text-neon-cyan' :
                              'text-neon-purple'
                            } />
                          </div>
                          <div>
                            <div className="font-medium">{content.title}</div>
                            <div className="text-xs text-text-secondary flex items-center gap-2">
                              <span>{getContentTypeName(content.type)}</span>
                              <span>·</span>
                              <span>{content.subtype}</span>
                              {content.scheduledTime && (
                                <>
                                  <span>·</span>
                                  <Clock size={12} />
                                  <span>定时 {new Date(content.scheduledTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          content.status === 'published' 
                            ? 'bg-neon-green/20 text-neon-green' 
                            : content.status === 'scheduled'
                            ? 'bg-neon-amber/20 text-neon-amber'
                            : 'bg-bg-tertiary text-text-secondary'
                        }`}>
                          {content.status === 'published' ? '已发布' : content.status === 'scheduled' ? '待发布' : '草稿'}
                        </span>
                      </div>
                      
                      <div className="bg-bg-tertiary rounded-lg p-3 text-sm text-text-secondary whitespace-pre-line">
                        {content.content}
                      </div>
                      
                      {/* 群运营脚本详情 */}
                      {content.groupScript && (
                        <div className="mt-3 p-3 bg-neon-amber/10 border border-neon-amber/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={14} className="text-neon-amber" />
                            <span className="text-xs font-medium text-neon-amber">
                              群运营脚本 · {content.groupScript.type === 'welcome' ? '欢迎语' : content.groupScript.type === 'flashsale' ? '闪购' : content.groupScript.type === 'interaction' ? '互动' : '公告'}
                            </span>
                            {content.groupScript.atAll && (
                              <span className="px-1.5 py-0.5 bg-neon-red/20 text-neon-red text-xs rounded">@所有人</span>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary whitespace-pre-line">
                            {content.groupScript.content}
                          </div>
                        </div>
                      )}
                      
                      {/* 私聊话术详情 */}
                      {content.privateScript && (
                        <div className="mt-3 p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={14} className="text-neon-cyan" />
                            <span className="text-xs font-medium text-neon-cyan">
                              私聊话术 · {content.privateScript.type === 'welcome' ? '新好友' : content.privateScript.type === 'followup' ? '回访' : content.privateScript.type === 'rebooking' ? '复购' : '咨询'}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary whitespace-pre-line">
                            {content.privateScript.content}
                          </div>
                        </div>
                      )}
                      
                      {/* 视频脚本详情 */}
                      {content.videoScript && (
                        <div className="mt-3 p-3 bg-neon-purple/10 border border-neon-purple/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Mic size={14} className="text-neon-purple" />
                            <span className="text-xs font-medium text-neon-purple">
                              视频脚本 · {content.videoScript.totalDuration}秒
                            </span>
                          </div>
                          <div className="space-y-1">
                            {content.videoScript.scenes.slice(0, 3).map((scene, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <span className="text-neon-purple font-mono">{scene.startTime}-{scene.endTime}s</span>
                                <span className="text-text-secondary">{scene.shot}</span>
                              </div>
                            ))}
                            {content.videoScript.scenes.length > 3 && (
                              <div className="text-xs text-text-secondary">
                                ...还有 {content.videoScript.scenes.length - 3} 个场景
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-text-secondary">
                            <span className="text-neon-purple">BGM:</span> {content.videoScript.bgmRecommendation}
                          </div>
                        </div>
                      )}
                      
                      {/* 私域指标 或 发布操作 */}
                      {content.status === 'draft' ? (
                        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-border-color">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${content.title}\n\n${content.content}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Copy size={14} />
                            复制内容
                          </button>
                          <button
                            onClick={() => handleCopyAndPublish(content)}
                            disabled={publishingId === content.id}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-lg text-sm hover:bg-neon-green/30 transition-colors disabled:opacity-50"
                          >
                            {publishingId === content.id ? (
                              <>
                                <Clock size={14} className="animate-spin" />
                                发布中...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                复制并标记已发布
                              </>
                            )}
                          </button>
                        </div>
                      ) : content.performance && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-color">
                          {/* 私域专属指标 */}
                          <div className="flex items-center gap-1 text-xs text-text-secondary" title="触达客户数">
                            <Users size={14} />
                            <span>{content.performance.touches || 0} 触达</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-secondary" title="回复数">
                            <MessageSquare size={14} />
                            <span>{content.performance.replies || 0} 回复</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-text-secondary" title="私域成交数">
                            <CheckCircle2 size={14} />
                            <span>{content.performance.conversions || 0} 成交</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* 右侧：快捷文案 */}
          <div className="col-span-4 space-y-6">
            <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Copy size={16} className="text-neon-green" />
                快捷文案模板
              </h3>
              
              {/* 早安模板 */}
              <div className="mb-4">
                <div className="text-xs text-text-secondary mb-2">早安问候</div>
                {quickTemplates.morning.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('morning', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-text-secondary mb-2 hover:bg-neon-green/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `morning-${idx}` ? (
                        <Check size={16} className="text-neon-green flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-text-secondary group-hover:text-neon-green flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 闪购模板 */}
              <div className="mb-4">
                <div className="text-xs text-text-secondary mb-2">群内闪购</div>
                {quickTemplates.flashsale.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('flashsale', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-text-secondary mb-2 hover:bg-neon-amber/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `flashsale-${idx}` ? (
                        <Check size={16} className="text-neon-amber flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-text-secondary group-hover:text-neon-amber flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 回访模板 */}
              <div>
                <div className="text-xs text-text-secondary mb-2">客户回访</div>
                {quickTemplates.followup.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('followup', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-text-secondary mb-2 hover:bg-neon-cyan/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `followup-${idx}` ? (
                        <Check size={16} className="text-neon-cyan flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-text-secondary group-hover:text-neon-cyan flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 视图2：任务看板 ===== */}
      {activeView === 'tasks' && (
        <div className="grid grid-cols-2 gap-6">
          {/* 左侧：运营任务 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-neon-amber" />
              今日待办
            </h3>
            
            <div className="space-y-3">
              {mockTasks.map((task) => {
                const Icon = getTaskTypeIcon(task.type);
                const deadline = new Date(task.deadline);
                const isOverdue = deadline < new Date() && task.status === 'pending';
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all ${
                      task.status === 'completed'
                        ? 'bg-bg-tertiary border-border-color opacity-60'
                        : isOverdue
                        ? 'bg-neon-red/10 border-neon-red/30'
                        : task.priority === 'high'
                        ? 'bg-neon-amber/10 border-neon-amber/30'
                        : 'bg-bg-tertiary border-border-color'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-neon-green/20' :
                          isOverdue ? 'bg-neon-red/20' :
                          task.priority === 'high' ? 'bg-neon-amber/20' :
                          'bg-bg-secondary'
                        }`}>
                          <Icon size={16} className={
                            task.status === 'completed' ? 'text-neon-green' :
                            isOverdue ? 'text-neon-red' :
                            task.priority === 'high' ? 'text-neon-amber' :
                            'text-text-secondary'
                          } />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${
                            task.status === 'completed' ? 'line-through text-text-secondary' : ''
                          }`}>
                            {task.title}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">{task.description}</div>
                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                            isOverdue ? 'text-neon-red' : 'text-text-secondary'
                          }`}>
                            <Clock size={12} />
                            {isOverdue ? '已逾期' : '截止'} {deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      
                      {task.status === 'pending' && (
                        <button className="px-3 py-1 bg-neon-green/20 text-neon-green text-xs rounded hover:bg-neon-green/30 transition-all">
                          完成
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 右侧：客户回访 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-neon-cyan" />
              客户回访
              <span className="ml-auto text-xs text-text-secondary">
                待回访 {stats.pendingFollowUps} 人
              </span>
            </h3>
            
            <div className="space-y-3">
              {mockFollowUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className={`p-4 rounded-lg border transition-all ${
                    followUp.status === 'completed'
                      ? 'bg-bg-tertiary border-border-color opacity-60'
                      : 'bg-bg-tertiary border-border-color hover:border-neon-cyan/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center">
                        <span className="text-neon-cyan font-medium">{followUp.customerName[0]}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{followUp.customerName}</div>
                        <div className="text-xs text-text-secondary">
                          上次入住：{followUp.lastStayDate}
                        </div>
                        {followUp.notes && (
                          <div className="text-xs text-neon-green mt-0.5">{followUp.notes}</div>
                        )}
                      </div>
                    </div>
                    
                    {followUp.status === 'pending' ? (
                      <button className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan text-xs rounded hover:bg-neon-cyan/30 transition-all flex items-center gap-1">
                        <Send size={12} />
                        去回访
                      </button>
                    ) : (
                      <span className="text-xs text-neon-green flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {stats.pendingFollowUps === 0 && (
              <div className="text-center py-8 text-text-secondary">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-neon-green" />
                <div className="text-sm">今日回访任务已完成</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 视图3：运营统计 ===== */}
      {activeView === 'stats' && (
        <div className="grid grid-cols-2 gap-6">
          {/* 分渠道统计 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h3 className="font-medium mb-4">分渠道发布统计</h3>
            
            <div className="space-y-4">
              {/* 使用真实的微信内容数据 */}
              {(['moments', 'group', 'private', 'channels'] as WechatContentType[]).map((type) => {
                // 从真实 contents 统计（转换后的）
                const realWechatContents = contents
                  .filter(c => c.platform === 'wechat')
                  .map(convertToPrivateContent);
                const count = realWechatContents.filter(c => c.type === type).length 
                  || mockPrivateContents.filter(c => c.type === type).length;
                const published = realWechatContents.filter(c => c.type === type && c.status === 'published').length
                  || mockPrivateContents.filter(c => c.type === type && c.status === 'published').length;
                const Icon = getContentTypeIcon(type);
                
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        type === 'moments' ? 'bg-neon-green/10' :
                        type === 'group' ? 'bg-neon-amber/10' :
                        type === 'private' ? 'bg-neon-cyan/10' :
                        'bg-neon-purple/10'
                      }`}>
                        <Icon size={20} className={
                          type === 'moments' ? 'text-neon-green' :
                          type === 'group' ? 'text-neon-amber' :
                          type === 'private' ? 'text-neon-cyan' :
                          'text-neon-purple'
                        } />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{getContentTypeName(type)}</div>
                        <div className="text-xs text-text-secondary">
                          已发布 {published} / 总计 {count}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono">
                        {count > 0 ? Math.round((published / count) * 100) : 0}%
                      </div>
                      <div className="text-xs text-text-secondary">完成率</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 私域转化漏斗（简化版） */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h3 className="font-medium mb-4">私域转化概览</h3>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-neon-green/10 rounded-lg border border-neon-green/30">
                <div className="text-3xl font-mono font-bold text-neon-green">{stats.privateDeals}</div>
                <div className="text-sm text-text-secondary mt-1">私域成交订单</div>
              </div>
              
              <div className="text-center p-4 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30">
                <div className="text-3xl font-mono font-bold text-neon-cyan">{formatPrice(stats.privateGMV)}</div>
                <div className="text-sm text-text-secondary mt-1">私域贡献GMV</div>
              </div>
              
              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-sm text-text-secondary mb-2">说明</div>
                <div className="text-xs text-text-secondary space-y-1">
                  <p>• 私域成交通过专属优惠码归因</p>
                  <p>• 包含朋友圈、微信群、私聊转化的订单</p>
                  <p>• 建议每日保持3-5条朋友圈发布</p>
                  <p>• 群内闪购建议每周2-3次</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
