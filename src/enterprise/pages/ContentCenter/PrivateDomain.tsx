/**
 * Shadow-Bees V52 - 私域运营页面
 * 专注于微信生态运营：内容日历、任务看板、私域统计
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, CheckCircle2, Clock, MessageCircle, Users, 
  TrendingUp, Copy, Send, UserPlus, MessageSquare,
  Camera, Mic, Bell, Check
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { contentApi } from '../../api';
import { useToast } from '../../../components/ui/Toast';
import { MOCK_WECHAT_GROUPS, MOCK_VIDEO_CHANNELS } from '../../api/mockData';
import type { WechatGroup, VideoChannel } from '../../api/types';

// 格式化价格
const formatPrice = (price: number) => `¥${price}`;

// 模拟 transactions - 私域渠道订单数据
const mockTransactions: any[] = [
  { id: 't-001', platform: 'wechat', status: 'completed', price: 299, createdAt: '2026-03-08T10:00:00Z' },
  { id: 't-002', platform: 'wechat', status: 'completed', price: 359, createdAt: '2026-03-08T14:30:00Z' },
  { id: 't-003', platform: 'wechat', status: 'completed', price: 299, createdAt: '2026-03-07T20:00:00Z' },
  { id: 't-004', platform: 'wechat', status: 'completed', price: 329, createdAt: '2026-03-07T09:00:00Z' },
  { id: 't-005', platform: 'xiaohongshu', status: 'completed', price: 580, createdAt: '2026-03-08T11:00:00Z' },
  { id: 't-006', platform: 'wechat', status: 'refunded', price: 299, createdAt: '2026-03-06T10:00:00Z' }, // 退款的不计入
];

// 私域内容类型
type WechatContentType = 'moments' | 'group' | 'private' | 'channels';

// 任务状态
type TaskStatus = 'pending' | 'completed' | 'overdue';

// 脚本类型定义
interface VideoScript {
  totalDuration: number;
  scenes: Array<{
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    shot: string;
    subtitle: string;
  }>;
  bgmRecommendation: string;
  materials: Array<{
    type: string;
    description: string;
    count: number;
    tips: string;
  }>;
}

interface GroupScript {
  type: 'welcome' | 'flashsale' | 'interaction' | 'announcement';
  title: string;
  content: string;
  atAll: boolean;
}

interface PrivateChatScript {
  type: 'welcome' | 'booking' | 'reminder' | 'followup' | 'rebooking';
  title: string;
  content: string;
}

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

// 从 API PrivateContent 转换为组件使用的 PrivateContent 格式
const convertToPrivateContent = (content: any): PrivateContent => {
  // 将 API 的 platform/type 映射到组件的 type
  let type: WechatContentType = 'moments';
  let subtypeLabel = content.type || '图文';
  
  // 根据 platform 判断类型
  const platform = content.platform || '';
  if (platform.includes('朋友圈') || platform.includes('moments') || platform.includes('微信')) {
    type = 'moments';
  } else if (platform.includes('群') || platform.includes('group')) {
    type = 'group';
  } else if (platform.includes('私聊') || platform.includes('private')) {
    type = 'private';
  } else if (platform.includes('视频号') || platform.includes('channels')) {
    type = 'channels';
  }
  
  // 根据内容特征判断子类型
  const contentText = content.content || '';
  if (contentText.includes('早安') || contentText.includes('☀️') || contentText.includes('早上好')) {
    subtypeLabel = '早安';
  } else if (contentText.includes('好评') || contentText.includes('💚') || contentText.includes('感谢')) {
    subtypeLabel = '晒单';
  } else if (contentText.includes('闪购') || contentText.includes('⚡️') || contentText.includes('限时')) {
    subtypeLabel = '闪购';
  } else if (contentText.includes('特惠') || contentText.includes('优惠') || contentText.includes('折扣')) {
    subtypeLabel = '特惠';
  } else if (contentText.includes('周末')) {
    subtypeLabel = '周末活动';
  }
  
  // 处理 status 字段，支持多种格式
  let status: 'draft' | 'scheduled' | 'published' = 'draft';
  if (content.status === 'published' || content.status === '已发布') {
    status = 'published';
  } else if (content.status === 'scheduled' || content.status === '待发布') {
    status = 'scheduled';
  }
  
  return {
    id: content.id,
    type,
    subtype: subtypeLabel,
    title: content.title || '无标题',
    content: content.content || '',
    publishedAt: content.publishedAt || content.createdAt,
    status,
    images: content.images,
    // === 使用私域专属指标 ===
    performance: {
      touches: content.metrics?.views ?? content.metrics?.touches ?? content.performance?.touches ?? 0,
      replies: content.metrics?.comments ?? content.metrics?.replies ?? content.performance?.replies ?? 0,
      conversions: content.performance?.conversions ?? content.performance?.privateConversions ?? 0,
    },
    // 保存扩展数据用于详情展示
    videoScript: content.videoScript,
    groupScript: content.groupScript,
    privateScript: content.privateScript,
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
    description: '5位客人待回访：张先生、李女士、王先生、赵小姐、刘先生',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: 'pending',
    priority: 'medium'
  },
  {
    id: 'task-003',
    type: 'group',
    title: '晚间群内闪购',
    description: '今晚剩余房源群内特价（豪华大床房3间、双床房2间）',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-004',
    type: 'reminder',
    title: '老客户生日关怀',
    description: '3位老客户本月生日，准备专属福利（VIP卡、房型升级券）',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: 'pending',
    priority: 'low'
  },
  {
    id: 'task-005',
    type: 'content',
    title: '回复客户评论',
    description: '携程、美团、飞猪共8条新评论待回复',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-006',
    type: 'content',
    title: '发布周末特惠活动',
    description: '本周末特惠房源推广，提前预热',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    status: 'pending',
    priority: 'medium'
  },
  {
    id: 'task-007',
    type: 'followup',
    title: '跟进意向客户',
    description: '3位咨询过但未下单的客户需要跟进',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-008',
    type: 'reminder',
    title: '更新房态库存',
    description: '同步PMS系统房态，确保各渠道库存一致',
    deadline: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15分钟后
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'task-009',
    type: 'group',
    title: '组织群内互动',
    description: '老客户群内发起话题互动，提升群活跃度',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    status: 'pending',
    priority: 'low'
  },
  {
    id: 'task-010',
    type: 'content',
    title: '拍摄酒店环境素材',
    description: '新装修的餐厅和健身房需要拍摄照片/视频用于推广',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2天后
    status: 'pending',
    priority: 'medium'
  }
];

// 模拟客户回访数据
const mockFollowUps: FollowUpRecord[] = [
  { id: 'fu-001', customerName: '张先生', lastStayDate: '2026-03-07', followUpCount: 0, status: 'pending' },
  { id: 'fu-002', customerName: '李女士', lastStayDate: '2026-03-07', followUpCount: 0, status: 'pending' },
  { id: 'fu-003', customerName: '王总', lastStayDate: '2026-03-06', followUpCount: 1, status: 'completed', notes: '已发送优惠券' },
  { id: 'fu-004', customerName: '赵小姐', lastStayDate: '2026-03-06', followUpCount: 0, status: 'pending' },
  { id: 'fu-005', customerName: '刘先生', lastStayDate: '2026-03-05', followUpCount: 0, status: 'pending' },
  { id: 'fu-006', customerName: '陈女士', lastStayDate: '2026-03-05', followUpCount: 0, status: 'pending' },
  { id: 'fu-007', customerName: '周经理', lastStayDate: '2026-03-04', followUpCount: 1, status: 'completed', notes: '已推荐协议价' },
  { id: 'fu-008', customerName: '吴先生', lastStayDate: '2026-03-04', followUpCount: 0, status: 'pending' }
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
  const { selectedHotelIds } = useEnterpriseStore();
  const [apiContents, setApiContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  
  // 视图切换：日历/任务/统计/草稿箱
  const [activeView, setActiveView] = useState<'calendar' | 'tasks' | 'stats' | 'drafts'>('calendar');
  const [selectedContentType, setSelectedContentType] = useState<WechatContentType | 'all'>('all');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  
  // 加载私域内容数据
  useEffect(() => {
    const loadPrivateContents = async () => {
      setIsLoading(true);
      try {
        // 如果有选中的酒店，使用第一个酒店ID；否则不传hotelId获取所有数据
        const params: any = { page: 1, pageSize: 50 };
        if (selectedHotelIds.length > 0) {
          params.hotelId = selectedHotelIds[0];
        }
        const response = await contentApi.getPrivateContents(params);
        if (response.success) {
          setApiContents(response.data.list);
        }
      } catch (error) {
        console.error('加载私域内容失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPrivateContents();
  }, [selectedHotelIds]);
  
  // 获取微信群数据（根据选中的酒店过滤）
  const wechatGroups = useMemo<WechatGroup[]>(() => {
    if (selectedHotelIds.length === 0) return MOCK_WECHAT_GROUPS;
    return MOCK_WECHAT_GROUPS.filter(g => selectedHotelIds.includes(g.hotelId));
  }, [selectedHotelIds]);
  
  // 获取视频号数据（根据选中的酒店过滤）
  const videoChannels = useMemo<VideoChannel[]>(() => {
    if (selectedHotelIds.length === 0) return MOCK_VIDEO_CHANNELS;
    return MOCK_VIDEO_CHANNELS.filter(v => selectedHotelIds.includes(v.hotelId));
  }, [selectedHotelIds]);
  
  // 所有私域内容
  const allPrivateContents = useMemo<PrivateContent[]>(() => {
    // 如果还在加载中且没有API数据，直接显示mock数据
    if (isLoading && apiContents.length === 0) {
      return mockPrivateContents;
    }
    
    // 将API数据转换为组件格式（不过滤，显示所有私域内容）
    const realPrivateContents: PrivateContent[] = apiContents
      .map((c: any) => convertToPrivateContent(c));
    
    // 如果API返回数据，优先使用；否则使用mock数据
    return realPrivateContents.length > 0 ? realPrivateContents : mockPrivateContents;
  }, [apiContents, isLoading]);
  
  // 草稿内容（待发布）
  const draftContents = useMemo(() => {
    return allPrivateContents.filter((c: PrivateContent) => c.status === 'draft');
  }, [allPrivateContents]);
  
  // 已发布内容
  const publishedContents = useMemo(() => {
    return allPrivateContents.filter((c: PrivateContent) => c.status === 'published');
  }, [allPrivateContents]);
  
  // 过滤后的内容（用于日历视图）
  const filteredContents = useMemo(() => {
    const contentsToShow = activeView === 'drafts' ? draftContents : publishedContents;
    if (selectedContentType === 'all') return contentsToShow;
    return contentsToShow.filter((c: PrivateContent) => c.type === selectedContentType);
  }, [publishedContents, draftContents, selectedContentType, activeView]);
  
  // 发布草稿内容（模拟实现）
  const handlePublish = async (contentId: string) => {
    setPublishingId(contentId);
    
    // 模拟发布过程（实际应调用微信API或用户手动操作）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 实际应该更新 store 中的内容状态
    // publishContent(contentId);
    
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
    const wechatContents = apiContents.filter((c: any) => 
      c.platform === 'wechat' || c.platform?.includes('微信')
    );
    const publishedContents = wechatContents.filter((c: any) => c.status === 'published');
    
    // 今日发布
    const todayPublished = publishedContents.filter((c: any) => 
      (c.publishedAt || '').startsWith(todayStr)
    ).length;
    
    // 草稿箱待发布
    const draftCount = wechatContents.filter((c: any) => c.status === 'draft').length;
    
    // 私域总触达（累加 touches）
    const totalTouches = publishedContents.reduce((sum: number, c: any) => 
      sum + (c.metrics?.views || c.performance?.touches || 0), 0
    );
    
    // 私域回复数
    const totalReplies = publishedContents.reduce((sum: number, c: any) => 
      sum + (c.metrics?.comments || c.performance?.replies || 0), 0
    );
    
    // 私域归因成交（使用模拟交易数据）
    const privateDeals = mockTransactions.filter((t: any) => 
      t.platform === 'wechat' && t.status !== 'refunded'
    );
    
    // 私域成交数（优先从内容 performance 累加，否则从交易数据计算）
    const conversionsFromContents = publishedContents.reduce((sum: number, c: any) => 
      sum + (c.performance?.conversions || c.performance?.privateConversions || c.metrics?.conversions || 0), 0
    );
    const privateConversions = conversionsFromContents > 0 ? conversionsFromContents : privateDeals.length;
    
    // 待回访客户（模拟数据）
    const pendingFollowUps = mockFollowUps.filter(f => f.status === 'pending').length;
    
    // 私域GMV：从交易数据计算，如果没有交易数据则按平均客单价300估算
    const gmvFromTransactions = privateDeals.reduce((sum: number, t: any) => sum + (t.price || 0), 0);
    const privateGMV = gmvFromTransactions > 0 ? gmvFromTransactions : privateConversions * 300;
    
    // 待办任务数（高优先级 + 逾期任务）
    const pendingTasks = mockTasks.filter(t => t.status === 'pending').length;
    const urgentTasks = mockTasks.filter(t => t.status === 'pending' && (t.priority === 'high' || new Date(t.deadline) < new Date())).length;
    
    return {
      todayPublished,
      draftCount,
      totalTouches,
      totalReplies,
      replyRate: totalTouches > 0 ? ((totalReplies / totalTouches) * 100).toFixed(1) : '0',
      privateDeals: privateDeals.length,
      privateGMV,
      privateConversions,
      totalWechatContents: wechatContents.length,
      pendingFollowUps,
      pendingTasks,
      urgentTasks
    };
  }, [apiContents]);
  
  // 复制文案
  const copyTemplate = (type: keyof typeof quickTemplates, index: number) => {
    const template = quickTemplates[type][index];
    navigator.clipboard.writeText(template);
    setCopiedTemplate(`${type}-${index}`);
    setTimeout(() => setCopiedTemplate(null), 2000);
    toast.success('复制成功', '文案已复制，快去粘贴发布吧');
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

  // 未选择酒店时的空状态
  if (selectedHotelIds.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <Users className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            请在顶部酒店选择器中至少选择一家酒店，管理私域运营内容
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 批量操作提示 */}
      <BatchOperationBar />
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">私域运营</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
              微信生态
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            朋友圈 · 微信群 · 私聊话术 · 视频号
          </p>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'calendar'
                ? 'bg-emerald-100 text-emerald-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Calendar size={16} />
            <span>内容日历</span>
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'tasks'
                ? 'bg-amber-100 text-amber-600'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>任务看板</span>
            {stats.pendingTasks > 0 && (
              <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                stats.urgentTasks > 0 
                  ? 'bg-neon-red text-white' 
                  : 'bg-amber-500 text-white'
              }`}>
                {stats.pendingTasks > 99 ? '99+' : stats.pendingTasks}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('stats')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all ${
              activeView === 'stats'
                ? 'bg-neon-cyan/20 text-neon-cyan'
                : 'text-gray-500 hover:text-gray-900'
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
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock size={16} />
            <span>草稿箱</span>
            {stats.draftCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-neon-purple text-gray-900 text-xs rounded-full">
                {stats.draftCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 数据概览卡片 - 私域专属指标 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.totalTouches.toLocaleString()}</div>
              <div className="text-xs text-gray-500">客户触达</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
              <MessageSquare size={20} className="text-neon-cyan" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.totalReplies.toLocaleString()}</div>
              <div className="text-xs text-gray-500">客户回复 ({stats.replyRate}%)</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-amber/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{stats.privateConversions}</div>
              <div className="text-xs text-gray-500">私域成交</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-neon-purple" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold">{formatPrice(stats.privateGMV)}</div>
              <div className="text-xs text-gray-500">私域GMV</div>
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
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-neon-green/50'
                  }`}
                >
                  {type === 'all' ? '全部' : getContentTypeName(type)}
                </button>
              ))}
            </div>
            
            {/* 内容列表 */}
            <div className="space-y-4">
              {/* 微信群列表 */}
              {selectedContentType === 'group' && (
                <>
                  {wechatGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <div className="text-lg mb-2">暂无微信群</div>
                      <div className="text-sm">请先在客户端创建或绑定微信群</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {wechatGroups.map((group) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-100 rounded-xl border border-gray-200 p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Users size={24} className="text-amber-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{group.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>群主：{group.ownerName}</span>
                                  <span>·</span>
                                  <span>创建于 {new Date(group.createdAt).toLocaleDateString('zh-CN')}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              group.status === 'active' ? 'bg-green-100 text-green-600' :
                              group.status === 'full' ? 'bg-amber-100 text-amber-600' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {group.status === 'active' ? '运营中' : group.status === 'full' ? '已满员' : '休眠中'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-gray-900">{group.memberCount}</div>
                              <div className="text-xs text-gray-500">群成员</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-amber-600">{group.dailyMessages || 0}</div>
                              <div className="text-xs text-gray-500">日均消息</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-green-600">{group.conversionRate || 0}%</div>
                              <div className="text-xs text-gray-500">转化率</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {group.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-white rounded text-xs text-gray-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">
                              最后活跃：{new Date(group.lastActivityAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* 视频号列表 */}
              {selectedContentType === 'channels' && (
                <>
                  {videoChannels.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                      <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <div className="text-lg mb-2">暂无视频号</div>
                      <div className="text-sm">请先创建或绑定视频号账号</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {videoChannels.map((channel) => (
                        <motion.div
                          key={channel.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-100 rounded-xl border border-gray-200 p-5"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Camera size={24} className="text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{channel.name}</div>
                                <div className="text-xs text-gray-500">
                                  创建于 {new Date(channel.createdAt).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              channel.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {channel.status === 'active' ? '运营中' : '已停用'}
                            </span>
                          </div>
                          
                          {/* 统计数据 */}
                          <div className="grid grid-cols-5 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-gray-900">{(channel.followerCount / 1000).toFixed(1)}K</div>
                              <div className="text-xs text-gray-500">粉丝数</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-purple-600">{channel.totalVideos}</div>
                              <div className="text-xs text-gray-500">总视频</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-gray-900">{(channel.totalViews / 10000).toFixed(1)}万</div>
                              <div className="text-xs text-gray-500">总播放</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-green-600">+{channel.monthlyNewVideos}</div>
                              <div className="text-xs text-gray-500">本月新增</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-blue-600">{(channel.monthlyViews / 10000).toFixed(1)}万</div>
                              <div className="text-xs text-gray-500">本月播放</div>
                            </div>
                          </div>
                          
                          {/* 最近视频 */}
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">最近发布</div>
                            <div className="space-y-2">
                              {channel.recentVideos.map((video) => (
                                <div key={video.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <Camera size={16} className="text-gray-400" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 line-clamp-1">{video.title}</div>
                                      <div className="text-xs text-gray-500">
                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} · 
                                        {new Date(video.publishedAt).toLocaleDateString('zh-CN')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <TrendingUp size={12} />
                                      {(video.views / 1000).toFixed(1)}K
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 size={12} />
                                      {video.likes}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {/* 普通内容列表（朋友圈、私聊或全部） */}
              {(selectedContentType === 'all' || selectedContentType === 'moments' || selectedContentType === 'private') && (
                <>
                  {filteredContents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                      <div className="text-4xl mb-4">📅</div>
                      <div className="text-lg mb-2">暂无内容安排</div>
                      <div className="text-sm">去「内容工厂」创建私域内容</div>
                    </div>
                  ) : (
                    filteredContents.map((content: PrivateContent) => {
                  const Icon = getContentTypeIcon(content.type);
                  return (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-100 rounded-xl border border-gray-200 p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            content.type === 'moments' ? 'bg-emerald-50' :
                            content.type === 'group' ? 'bg-neon-amber/10' :
                            content.type === 'private' ? 'bg-neon-cyan/10' :
                            'bg-neon-purple/10'
                          }`}>
                            <Icon size={20} className={
                              content.type === 'moments' ? 'text-emerald-600' :
                              content.type === 'group' ? 'text-amber-600' :
                              content.type === 'private' ? 'text-neon-cyan' :
                              'text-neon-purple'
                            } />
                          </div>
                          <div>
                            <div className="font-medium">{content.title}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
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
                            ? 'bg-emerald-100 text-emerald-600' 
                            : content.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-bg-tertiary text-gray-500'
                        }`}>
                          {content.status === 'published' ? '已发布' : content.status === 'scheduled' ? '待发布' : '草稿'}
                        </span>
                      </div>
                      
                      <div className="bg-bg-tertiary rounded-lg p-3 text-sm text-gray-500 whitespace-pre-line">
                        {content.content}
                      </div>
                      
                      {/* 群运营脚本详情 */}
                      {content.groupScript && (
                        <div className="mt-3 p-3 bg-neon-amber/10 border border-neon-amber/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={14} className="text-amber-600" />
                            <span className="text-xs font-medium text-amber-600">
                              群运营脚本 · {content.groupScript.type === 'welcome' ? '欢迎语' : content.groupScript.type === 'flashsale' ? '闪购' : content.groupScript.type === 'interaction' ? '互动' : '公告'}
                            </span>
                            {content.groupScript.atAll && (
                              <span className="px-1.5 py-0.5 bg-neon-red/20 text-neon-red text-xs rounded">@所有人</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-pre-line">
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
                          <div className="text-xs text-gray-500 whitespace-pre-line">
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
                            {content.videoScript.scenes.slice(0, 3).map((scene: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <span className="text-neon-purple font-mono">{scene.startTime}-{scene.endTime}s</span>
                                <span className="text-gray-500">{scene.shot}</span>
                              </div>
                            ))}
                            {content.videoScript.scenes.length > 3 && (
                              <div className="text-xs text-gray-500">
                                ...还有 {content.videoScript.scenes.length - 3} 个场景
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="text-neon-purple">BGM:</span> {content.videoScript.bgmRecommendation}
                          </div>
                        </div>
                      )}
                      
                      {/* 私域指标 或 发布操作 */}
                      {content.status === 'draft' ? (
                        <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => navigator.clipboard.writeText(`${content.title}\n\n${content.content}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            <Copy size={14} />
                            复制内容
                          </button>
                          <button
                            onClick={() => handleCopyAndPublish(content)}
                            disabled={publishingId === content.id}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-sm hover:bg-neon-green/30 transition-colors disabled:opacity-50"
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
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          {/* 私域专属指标 */}
                          <div className="flex items-center gap-1 text-xs text-gray-500" title="触达客户数">
                            <Users size={14} />
                            <span>{content.performance.touches || 0} 触达</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500" title="回复数">
                            <MessageSquare size={14} />
                            <span>{content.performance.replies || 0} 回复</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500" title="私域成交数">
                            <CheckCircle2 size={14} />
                            <span>{content.performance.conversions || 0} 成交</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
                </>
              )}
            </div>
          </div>
          
          {/* 右侧：快捷文案 */}
          <div className="col-span-4 space-y-6">
            <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Copy size={16} className="text-emerald-600" />
                快捷文案模板
              </h3>
              
              {/* 早安模板 */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">早安问候</div>
                {quickTemplates.morning.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('morning', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-gray-500 mb-2 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `morning-${idx}` ? (
                        <Check size={16} className="text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-gray-500 group-hover:text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 闪购模板 */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">群内闪购</div>
                {quickTemplates.flashsale.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('flashsale', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-gray-500 mb-2 hover:bg-neon-amber/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `flashsale-${idx}` ? (
                        <Check size={16} className="text-amber-600 flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-gray-500 group-hover:text-amber-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {/* 回访模板 */}
              <div>
                <div className="text-xs text-gray-500 mb-2">客户回访</div>
                {quickTemplates.followup.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => copyTemplate('followup', idx)}
                    className="w-full text-left p-3 bg-bg-tertiary rounded-lg text-sm text-gray-500 mb-2 hover:bg-neon-cyan/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="line-clamp-2">{template.substring(0, 50)}...</span>
                      {copiedTemplate === `followup-${idx}` ? (
                        <Check size={16} className="text-neon-cyan flex-shrink-0" />
                      ) : (
                        <Copy size={16} className="text-gray-500 group-hover:text-neon-cyan flex-shrink-0" />
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
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 size={18} className="text-amber-600" />
                今日待办
                <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full">
                  {mockTasks.filter(t => t.status === 'pending').length} 待办
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-red"></span>
                  逾期
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  高优
                </span>
              </div>
            </div>
            
            {/* 重点关注区域 - 高优先级或逾期任务 */}
            {mockTasks.filter(t => t.status === 'pending' && (t.priority === 'high' || new Date(t.deadline) < new Date())).length > 0 && (
              <div className="mb-4 p-3 bg-neon-red/5 border border-neon-red/20 rounded-lg">
                <div className="text-xs text-neon-red font-medium mb-2 flex items-center gap-1">
                  <Bell size={12} />
                  需要关注
                </div>
                <div className="space-y-2">
                  {mockTasks
                    .filter(t => t.status === 'pending' && (t.priority === 'high' || new Date(t.deadline) < new Date()))
                    .slice(0, 3)
                    .map(task => (
                      <div key={task.id} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          new Date(task.deadline) < new Date() ? 'bg-neon-red' : 'bg-amber-500'
                        }`}></span>
                        <span className="truncate flex-1">{task.title}</span>
                        <span className="text-gray-400">
                          {new Date(task.deadline) < new Date() ? '已逾期' : '高优先级'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {mockTasks
                .filter(t => t.status === 'pending')
                .sort((a, b) => {
                  // 按优先级和截止时间排序：逾期 > 高优先级 > 其他
                  const aOverdue = new Date(a.deadline) < new Date();
                  const bOverdue = new Date(b.deadline) < new Date();
                  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
                  if (a.priority === 'high' && b.priority !== 'high') return -1;
                  if (b.priority === 'high' && a.priority !== 'high') return 1;
                  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                })
                .map((task) => {
                  const Icon = getTaskTypeIcon(task.type);
                  const deadline = new Date(task.deadline);
                  const isOverdue = deadline < new Date();
                  
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isOverdue
                          ? 'bg-neon-red/10 border-neon-red/30 shadow-sm'
                          : task.priority === 'high'
                          ? 'bg-amber-50 border-amber-200 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isOverdue ? 'bg-neon-red/20' :
                            task.priority === 'high' ? 'bg-amber-100' :
                            'bg-gray-100'
                          }`}>
                            <Icon size={16} className={
                              isOverdue ? 'text-neon-red' :
                              task.priority === 'high' ? 'text-amber-600' :
                              'text-gray-500'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {task.title}
                              </span>
                              {/* 优先级标签 */}
                              {task.priority === 'high' && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded">
                                  高优
                                </span>
                              )}
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 bg-neon-red/10 text-neon-red text-[10px] rounded">
                                  逾期
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>
                            <div className={`text-xs mt-1 flex items-center gap-1 ${
                              isOverdue ? 'text-neon-red' : 'text-gray-400'
                            }`}>
                              <Clock size={12} />
                              {isOverdue ? '已逾期' : '截止'} {deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        
                        <button className="px-3 py-1.5 bg-emerald-100 text-emerald-600 text-xs rounded hover:bg-emerald-200 transition-all ml-2">
                          完成
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* 已完成任务折叠 */}
            {mockTasks.filter(t => t.status === 'completed').length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-400 mb-2">
                  已完成 {mockTasks.filter(t => t.status === 'completed').length} 项
                </div>
              </div>
            )}
          </div>
          
          {/* 右侧：客户回访 */}
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <UserPlus size={18} className="text-neon-cyan" />
                客户回访
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan text-xs rounded-full">
                  待回访 {stats.pendingFollowUps} 人
                </span>
              </div>
            </div>
            
            {/* 待回访客户提示 */}
            {mockFollowUps.filter(f => f.status === 'pending').length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                  <Bell size={12} />
                  今日待回访提醒
                </div>
                <div className="text-xs text-amber-600">
                  还有 {mockFollowUps.filter(f => f.status === 'pending').length} 位客户需要回访，建议优先联系昨日离店客户
                </div>
              </div>
            )}
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {mockFollowUps
                .filter(f => f.status === 'pending')
                .sort((a, b) => new Date(b.lastStayDate).getTime() - new Date(a.lastStayDate).getTime())
                .map((followUp) => (
                  <div
                    key={followUp.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white hover:border-neon-cyan/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium">{followUp.customerName[0]}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{followUp.customerName}</span>
                            {/* 离店天数标签 */}
                            {(() => {
                              const daysSince = Math.floor((new Date().getTime() - new Date(followUp.lastStayDate).getTime()) / (1000 * 60 * 60 * 24));
                              if (daysSince <= 1) {
                                return <span className="px-1.5 py-0.5 bg-neon-red/10 text-neon-red text-[10px] rounded">昨日离店</span>;
                              } else if (daysSince <= 3) {
                                return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded">{daysSince}天前</span>;
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-xs text-gray-500">
                            上次入住：{followUp.lastStayDate}
                          </div>
                          {followUp.followUpCount > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              已回访 {followUp.followUpCount} 次
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs rounded hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center gap-1">
                        <Send size={12} />
                        去回访
                      </button>
                    </div>
                  </div>
                ))}
              
              {/* 已完成的回访 */}
              {mockFollowUps.filter(f => f.status === 'completed').length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-400 mb-2">
                    已完成回访 {mockFollowUps.filter(f => f.status === 'completed').length} 人
                  </div>
                  {mockFollowUps
                    .filter(f => f.status === 'completed')
                    .map((followUp) => (
                      <div
                        key={followUp.id}
                        className="p-3 rounded-lg border border-gray-100 bg-gray-50 opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 text-sm">{followUp.customerName[0]}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-500">{followUp.customerName}</div>
                            {followUp.notes && (
                              <div className="text-xs text-emerald-600">{followUp.notes}</div>
                            )}
                          </div>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            
            {stats.pendingFollowUps === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
                <div className="text-sm">今日回访任务已完成</div>
                <div className="text-xs text-gray-400 mt-1">继续保持良好的客户关系！</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 视图3：运营统计 ===== */}
      {activeView === 'stats' && (
        <div className="grid grid-cols-2 gap-6">
          {/* 分渠道统计 */}
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium mb-4">分渠道发布统计</h3>
            
            <div className="space-y-4">
              {/* 使用真实的微信内容数据 */}
              {(['moments', 'group', 'private', 'channels'] as WechatContentType[]).map((type) => {
                // 从真实 apiContents 统计（转换后的）
                const realWechatContents: PrivateContent[] = apiContents
                  .filter((c: any) => c.platform === 'wechat' || c.platform?.includes('微信'))
                  .map((c: any) => convertToPrivateContent(c));
                const count = realWechatContents.filter((c: PrivateContent) => c.type === type).length 
                  || mockPrivateContents.filter((c: PrivateContent) => c.type === type).length;
                const published = realWechatContents.filter((c: PrivateContent) => c.type === type && c.status === 'published').length
                  || mockPrivateContents.filter((c: PrivateContent) => c.type === type && c.status === 'published').length;
                const Icon = getContentTypeIcon(type);
                
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        type === 'moments' ? 'bg-emerald-50' :
                        type === 'group' ? 'bg-neon-amber/10' :
                        type === 'private' ? 'bg-neon-cyan/10' :
                        'bg-neon-purple/10'
                      }`}>
                        <Icon size={20} className={
                          type === 'moments' ? 'text-emerald-600' :
                          type === 'group' ? 'text-amber-600' :
                          type === 'private' ? 'text-neon-cyan' :
                          'text-neon-purple'
                        } />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{getContentTypeName(type)}</div>
                        <div className="text-xs text-gray-500">
                          已发布 {published} / 总计 {count}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono">
                        {count > 0 ? Math.round((published / count) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">完成率</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 私域转化漏斗（简化版） */}
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium mb-4">私域转化概览</h3>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-3xl font-mono font-bold text-emerald-600">{stats.privateConversions}</div>
                <div className="text-sm text-gray-500 mt-1">私域成交订单</div>
              </div>
              
              <div className="text-center p-4 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30">
                <div className="text-3xl font-mono font-bold text-neon-cyan">{formatPrice(stats.privateGMV)}</div>
                <div className="text-sm text-gray-500 mt-1">私域贡献GMV</div>
              </div>
              
              <div className="p-4 bg-bg-tertiary rounded-lg">
                <div className="text-sm text-gray-500 mb-2">说明</div>
                <div className="text-xs text-gray-500 space-y-1">
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
