/**
 * 内容工厂适配器
 * 将酒店端的内容管理适配到企业版的酒店操作台
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText,
  Image,
  Video,
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../stores/enterpriseStore';

// 内容状态
type ContentStatus = 'draft' | 'pending' | 'published' | 'rejected';
type ContentType = 'image' | 'video' | 'article';

// 内容数据
interface Content {
  id: string;
  hotelId: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  platform: string;
  coverImage?: string;
  publishTime?: string;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: string;
  createdBy: string;
  aiGenerated: boolean;
}

interface ContentAdapterProps {
  hotelId: string;
  readOnly?: boolean;
  onPublish?: (contentId: string) => void;
  onDelete?: (contentId: string) => void;
}

// 状态配置
const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText },
  pending: { label: '审核中', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  published: { label: '已发布', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  rejected: { label: '未通过', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
};

// 平台配置
const PLATFORM_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  xiaohongshu: { name: '小红书', color: 'bg-red-500', icon: '📕' },
  xianyu: { name: '闲鱼', color: 'bg-yellow-500', icon: '🐟' },
  wechat: { name: '微信', color: 'bg-green-500', icon: '💬' },
  douyin: { name: '抖音', color: 'bg-black', icon: '🎵' },
};

export function ContentAdapter({ hotelId, readOnly = false, onPublish, onDelete }: ContentAdapterProps) {
  const { getHotelById } = useEnterpriseStore();
  const [_hotel, setHotel] = useState<EnterpriseHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const hotelData = getHotelById(hotelId);
    if (hotelData) {
      setHotel(hotelData);
    }
    setContents(getMockContents(hotelId));
    setLoading(false);
  }, [hotelId, getHotelById]);

  // 模拟内容数据
  function getMockContents(hotelId: string): Content[] {
    return [
      {
        id: 'CNT20240315001',
        hotelId,
        title: '北京三里屯店 | 春日特惠，限时8折！',
        type: 'image',
        status: 'published',
        platform: 'xiaohongshu',
        coverImage: 'https://picsum.photos/400/300?random=1',
        publishTime: '2024-03-15 10:30:00',
        stats: { views: 12580, likes: 892, comments: 156, shares: 234 },
        createdAt: '2024-03-14 16:00:00',
        createdBy: 'AI助手',
        aiGenerated: true,
      },
      {
        id: 'CNT20240314002',
        hotelId,
        title: '周末去哪儿？来这里感受城市绿洲',
        type: 'video',
        status: 'published',
        platform: 'douyin',
        coverImage: 'https://picsum.photos/400/300?random=2',
        publishTime: '2024-03-14 18:00:00',
        stats: { views: 56800, likes: 3240, comments: 489, shares: 1205 },
        createdAt: '2024-03-13 14:30:00',
        createdBy: 'AI助手',
        aiGenerated: true,
      },
      {
        id: 'CNT20240313003',
        hotelId,
        title: '行政套房体验 | 商务出行首选',
        type: 'article',
        status: 'pending',
        platform: 'wechat',
        stats: { views: 0, likes: 0, comments: 0, shares: 0 },
        createdAt: '2024-03-13 09:00:00',
        createdBy: 'AI助手',
        aiGenerated: true,
      },
      {
        id: 'CNT20240312004',
        hotelId,
        title: '闲鱼专享 | 尾房特价转让',
        type: 'image',
        status: 'published',
        platform: 'xianyu',
        coverImage: 'https://picsum.photos/400/300?random=3',
        publishTime: '2024-03-12 20:00:00',
        stats: { views: 3200, likes: 45, comments: 28, shares: 12 },
        createdAt: '2024-03-11 11:00:00',
        createdBy: 'AI助手',
        aiGenerated: true,
      },
      {
        id: 'CNT20240310005',
        hotelId,
        title: 'Rejected Content Example',
        type: 'image',
        status: 'rejected',
        platform: 'xiaohongshu',
        stats: { views: 0, likes: 0, comments: 0, shares: 0 },
        createdAt: '2024-03-10 10:00:00',
        createdBy: 'AI助手',
        aiGenerated: true,
      },
    ];
  }

  // 过滤内容
  const filteredContents = contents.filter(content => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!content.title.toLowerCase().includes(query)) return false;
    }
    if (statusFilter !== 'all' && content.status !== statusFilter) return false;
    if (platformFilter !== 'all' && content.platform !== platformFilter) return false;
    if (typeFilter !== 'all' && content.type !== typeFilter) return false;
    return true;
  });

  // 统计
  const stats = {
    total: contents.length,
    published: contents.filter(c => c.status === 'published').length,
    pending: contents.filter(c => c.status === 'pending').length,
    draft: contents.filter(c => c.status === 'draft').length,
    totalViews: contents.reduce((sum, c) => sum + c.stats.views, 0),
    totalLikes: contents.reduce((sum, c) => sum + c.stats.likes, 0),
  };

  // 状态标签
  function StatusTag({ status }: { status: ContentStatus }) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  // 平台标签
  function PlatformTag({ platform }: { platform: string }) {
    const config = PLATFORM_CONFIG[platform] || { name: platform, color: 'bg-gray-500', icon: '📄' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.name}</span>
      </span>
    );
  }

  // 类型图标
  function TypeIcon({ type }: { type: ContentType }) {
    switch (type) {
      case 'image': return <Image className="w-4 h-4 text-violet-600" />;
      case 'video': return <Video className="w-4 h-4 text-pink-600" />;
      case 'article': return <FileText className="w-4 h-4 text-blue-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部内容', value: stats.total, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: '已发布', value: stats.published, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
          { label: '审核中', value: stats.pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: '草稿', value: stats.draft, icon: FileText, color: 'bg-gray-50 text-gray-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 数据概览 */}
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-6 border border-violet-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">内容运营数据</h3>
            <p className="text-gray-600">AI 生成内容表现追踪</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-600">{stats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">总曝光</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">{stats.totalLikes.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">总点赞</div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        {/* 筛选 */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索内容标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContentStatus | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部平台</option>
            {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContentType | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">全部类型</option>
            <option value="image">图文</option>
            <option value="video">视频</option>
            <option value="article">文章</option>
          </select>
        </div>

        {/* 新建按钮 */}
        {!readOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <Sparkles className="w-4 h-4" />
            AI生成内容
          </button>
        )}
      </div>

      {/* 内容网格 */}
      <div className="grid grid-cols-3 gap-4">
        {filteredContents.map((content) => (
          <motion.div
            key={content.id}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => {
              setSelectedContent(content);
              setShowDetail(true);
            }}
          >
            {/* 封面 */}
            <div className="aspect-video bg-gray-100 relative">
              {content.coverImage ? (
                <img src={content.coverImage} alt={content.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100">
                  <TypeIcon type={content.type} />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <PlatformTag platform={content.platform} />
              </div>
              {content.aiGenerated && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-violet-600 text-white text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">{content.title}</h4>
                <StatusTag status={content.status} />
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {content.stats.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {content.stats.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {content.stats.comments}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{content.createdAt}</span>
                {!readOnly && content.status === 'draft' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish?.(content.id);
                    }}
                    className="text-sm text-violet-600 hover:text-violet-700"
                  >
                    发布
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredContents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">没有找到符合条件的内容</p>
        </div>
      )}

      {/* AI生成弹窗 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl w-full max-w-lg mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI生成内容</h3>
                  <p className="text-sm text-gray-500">选择内容类型和平台，AI将自动生成优质内容</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容主题</label>
                  <input
                    type="text"
                    placeholder="例如：春日特惠、周末推荐..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容类型</label>
                  <div className="flex gap-3">
                    {[
                      { type: 'image', label: '图文', icon: Image },
                      { type: 'video', label: '视频', icon: Video },
                      { type: 'article', label: '文章', icon: FileText },
                    ].map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">发布平台</label>
                  <div className="flex gap-3">
                    {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors"
                      >
                        <span>{config.icon}</span>
                        {config.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    alert('AI生成内容任务已提交，预计需要1-2分钟');
                  }}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  开始生成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {showDetail && selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl w-full max-w-2xl mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="relative aspect-video bg-gray-100">
                {selectedContent.coverImage ? (
                  <img src={selectedContent.coverImage} alt={selectedContent.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100">
                    <TypeIcon type={selectedContent.type} />
                  </div>
                )}
                <button
                  onClick={() => setShowDetail(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedContent.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <PlatformTag platform={selectedContent.platform} />
                      <StatusTag status={selectedContent.status} />
                      {selectedContent.aiGenerated && (
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI生成
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 数据 */}
                <div className="grid grid-cols-4 gap-4 py-4 border-y border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{selectedContent.stats.views.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <Eye className="w-3.5 h-3.5" /> 曝光
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">{selectedContent.stats.likes}</div>
                    <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <Heart className="w-3.5 h-3.5" /> 点赞
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedContent.stats.comments}</div>
                    <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <MessageCircle className="w-3.5 h-3.5" /> 评论
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedContent.stats.shares}</div>
                    <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
                      <Share2 className="w-3.5 h-3.5" /> 分享
                    </div>
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDetail(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    关闭
                  </button>
                  {!readOnly && selectedContent.status === 'draft' && (
                    <button
                      onClick={() => {
                        onPublish?.(selectedContent.id);
                        setShowDetail(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      立即发布
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => {
                        onDelete?.(selectedContent.id);
                        setShowDetail(false);
                      }}
                      className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContentAdapter;
