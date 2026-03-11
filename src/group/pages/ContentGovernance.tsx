/**
 * Shadow-Bees V52 - 集团内容运营中心
 * 内容矩阵看板、Campaign管理、素材库
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Calendar,
  Image,
  Video,
  FileText,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Upload,
  FolderOpen,
  Users,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// 平台配置
const platformConfig = {
  xiaohongshu: { name: '小红书', color: '#FF2442', icon: '🔴' },
  wechat: { name: '微信', color: '#07C160', icon: '💬' },
  xianyu: { name: '闲鱼', color: '#FFDD00', icon: '🐟' },
};

// 内容状态
const contentStatusConfig = {
  published: { label: '已发布', color: 'text-neon-green', bgColor: 'bg-neon-green/10' },
  scheduled: { label: '待发布', color: 'text-neon-amber', bgColor: 'bg-neon-amber/10' },
  draft: { label: '草稿', color: 'text-text-muted', bgColor: 'bg-surface-hover' },
  reviewing: { label: '审核中', color: 'text-neon-purple', bgColor: 'bg-neon-purple/10' },
};

// ============================================
// 内容矩阵日历
// ============================================

function ContentCalendar({ hotels }: { hotels: { id: string; name: string; content: { date: string; platform: string; status: string; views?: number }[] }[] }) {
  const dates = ['2/15', '2/16', '2/17', '2/18', '2/19', '2/20', '2/21'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary sticky left-0 bg-surface">酒店</th>
            {dates.map((date) => (
              <th key={date} className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[80px]">
                {date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color">
          {hotels.map((hotel) => (
            <tr key={hotel.id} className="hover:bg-surface-hover">
              <td className="px-3 py-3 text-sm font-medium sticky left-0 bg-inherit">{hotel.name}</td>
              {dates.map((date) => {
                const contents = hotel.content.filter((c) => c.date === date);
                return (
                  <td key={date} className="px-2 py-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {contents.map((content, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.2 }}
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer ${
                            contentStatusConfig[content.status as keyof typeof contentStatusConfig]?.bgColor
                          }`}
                          title={`${platformConfig[content.platform as keyof typeof platformConfig]?.name} ${content.views ? `· ${content.views}阅读` : ''}`}
                        >
                          {platformConfig[content.platform as keyof typeof platformConfig]?.icon}
                        </motion.div>
                      ))}
                      {contents.length === 0 && (
                        <div className="w-6 h-6 rounded border border-dashed border-border-color" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Campaign卡片
// ============================================

function CampaignCard({ campaign, index }: { campaign: { id: string; name: string; theme: string; startDate: string; endDate: string; progress: number; status: string; targetHotels: string[] }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-surface rounded-xl border border-border-color p-4 hover:border-neon-purple/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{campaign.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${campaign.status === 'active' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-amber/10 text-neon-amber'}`}>
              {campaign.status === 'active' ? '进行中' : '策划中'}
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">{campaign.theme}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-neon-purple">{campaign.progress}%</div>
          <div className="text-xs text-text-secondary">完成度</div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-surface-hover rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${campaign.progress}%` }}
          transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-neon-purple to-purple-400"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {campaign.startDate} - {campaign.endDate}
          </span>
          <span>{campaign.targetHotels.length} 家门店参与</span>
        </div>
        <button 
          onClick={() => alert(`查看活动详情: ${campaign.name}`)}
          className="text-neon-purple hover:underline"
        >查看详情</button>
      </div>
    </motion.div>
  );
}

// ============================================
// 素材包卡片
// ============================================

function AssetPackageCard({ pkg, index }: { pkg: { id: string; name: string; count: number; type: string; updateTime: string }; index: number }) {
  const typeIcons = {
    image: Image,
    video: Video,
    template: FileText,
  };
  const Icon = typeIcons[pkg.type as keyof typeof typeIcons] || FolderOpen;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-surface rounded-xl border border-border-color p-4 cursor-pointer hover:border-neon-purple/30 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center mb-3 group-hover:bg-neon-purple/20 transition-colors">
        <Icon className="w-6 h-6 text-neon-purple" />
      </div>
      <h4 className="font-medium text-sm mb-1">{pkg.name}</h4>
      <p className="text-xs text-text-secondary">{pkg.count} 个素材</p>
      <p className="text-xs text-text-muted mt-2">更新于 {pkg.updateTime}</p>
      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => alert(`下载素材包: ${pkg.name}`)}
          className="flex-1 py-1.5 text-xs bg-neon-purple text-white rounded-lg"
        >下载</button>
        <button 
          onClick={() => alert(`预览素材包: ${pkg.name}`)}
          className="flex-1 py-1.5 text-xs border border-border-color rounded-lg hover:bg-surface-hover"
        >预览</button>
      </div>
    </motion.div>
  );
}

// ============================================
// 爆款内容卡片
// ============================================

function ViralContentCard({ content, index }: { content: { title: string; hotel: string; platform: string; views: number; likes: number; comments: number; shares: number; touches?: number; replies?: number; conversions?: number }; index: number }) {
  const isWechat = content.platform === 'wechat';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-surface-hover hover:bg-surface border border-transparent hover:border-neon-purple/30 transition-all cursor-pointer"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
        {platformConfig[content.platform as keyof typeof platformConfig]?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="font-medium text-sm truncate">{content.title}</h5>
        <p className="text-xs text-text-secondary">{content.hotel}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
          {isWechat ? (
            // 私域指标
            <>
              <span className="flex items-center gap-1" title="触达客户数">
                <Users className="w-3 h-3" />
                {content.touches || Math.floor(content.views / 10)}人
              </span>
              <span className="flex items-center gap-1" title="回复数">
                <MessageCircle className="w-3 h-3" />
                {content.replies || Math.floor(content.comments * 2)}人
              </span>
              <span className="flex items-center gap-1" title="私域成交">
                <TrendingUp className="w-3 h-3" />
                {content.conversions || Math.floor(content.likes / 10)}单
              </span>
            </>
          ) : (
            // 公域指标
            <>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {(content.views / 1000).toFixed(1)}k
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {content.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {content.comments}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                {content.shares}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className="text-xs px-2 py-1 rounded bg-neon-green/10 text-neon-green">🔥 爆款</span>
      </div>
    </motion.div>
  );
}

// ============================================
// 主页面
// ============================================

export function ContentGovernance() {
  const { hotels, campaigns } = useGroupStore();
  const [activeTab, setActiveTab] = useState<'matrix' | 'campaign' | 'assets' | 'analytics'>('matrix');

  // Mock数据 - 内容日历
  const contentCalendarData = hotels.slice(0, 5).map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    content: [
      { date: '2/15', platform: 'xiaohongshu', status: 'published', views: 1200 },
      { date: '2/15', platform: 'xianyu', status: 'published', views: 800 },
      { date: '2/16', platform: 'wechat', status: 'published', views: 5600 },
      { date: '2/17', platform: 'xiaohongshu', status: 'scheduled' },
      { date: '2/17', platform: 'xiaohongshu', status: 'scheduled' },
      { date: '2/18', platform: 'xianyu', status: 'draft' },
    ],
  }));

  // Mock数据 - 素材包
  const assetPackages = [
    { id: '1', name: '春节主题素材包', count: 128, type: 'image', updateTime: '2月10日' },
    { id: '2', name: '演唱会热点素材', count: 45, type: 'image', updateTime: '2月15日' },
    { id: '3', name: '小红书图文模板', count: 12, type: 'template', updateTime: '2月8日' },
    { id: '4', name: '微信视频脚本', count: 8, type: 'video', updateTime: '2月12日' },
    { id: '5', name: '闲鱼转让文案', count: 20, type: 'template', updateTime: '2月5日' },
    { id: '6', name: '春季促销素材', count: 36, type: 'image', updateTime: '2月14日' },
  ];

  // Mock数据 - 爆款内容
  const viralContents = [
    { title: '💔含泪转让｜周杰伦演唱会酒店｜离场馆步行5分钟', hotel: '三里屯精品店', platform: 'xiaohongshu', views: 23000, likes: 2340, comments: 156, shares: 89 },
    { title: '工体旁¥300的酒店长什么样？', hotel: '国贸商务店', platform: 'wechat', views: 128000, likes: 5600, comments: 423, shares: 234 },
    { title: '程序员专属｜望京性价比酒店｜近地铁', hotel: '望京科技店', platform: 'xianyu', views: 8900, likes: 120, comments: 45, shares: 12 },
  ];

  // 统计数据
  const stats = {
    todayPublished: 23,
    thisWeekPublished: 156,
    viralCount: 12,
    avgEngagement: 8.5,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">集团内容运营中心</h1>
          <p className="text-text-secondary text-sm mt-1">
            统筹集团旗下内容策略 · 素材共享 · 爆款复制
          </p>
        </div>
        <button 
          onClick={() => alert('新建Campaign功能开发中...')}
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-xl hover:bg-neon-purple/90 transition-colors shadow-lg shadow-neon-purple/25"
        >
          <Plus className="w-4 h-4" />
          新建Campaign
        </button>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '今日发布', value: stats.todayPublished, subtext: '篇内容', icon: FileText, color: '#A855F7' },
          { label: '本周发布', value: stats.thisWeekPublished, subtext: '篇内容', icon: Calendar, color: '#00E396' },
          { label: '爆款内容', value: stats.viralCount, subtext: '篇点赞500+', icon: TrendingUp, color: '#FFB800' },
          { label: '平均互动率', value: `${stats.avgEngagement}%`, subtext: '高于行业均值', icon: Heart, color: '#FF6B6B' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface rounded-xl border border-border-color p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-text-muted mt-1">{stat.subtext}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab切换 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit"
      >
        {[
          { key: 'matrix', label: '内容矩阵', icon: Calendar },
          { key: 'campaign', label: 'Campaign', icon: Rocket },
          { key: 'assets', label: '素材库', icon: Image },
          { key: 'analytics', label: '数据分析', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab内容 */}
      <AnimatePresence mode="wait">
        {activeTab === 'matrix' && (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 内容日历 */}
            <div className="bg-surface rounded-xl border border-border-color p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">内容发布矩阵</h3>
                  <p className="text-xs text-text-secondary mt-1">近7天各店内容发布计划与执行情况</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {Object.entries(contentStatusConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${config.bgColor}`} />
                      <span className="text-text-secondary">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ContentCalendar hotels={contentCalendarData} />
            </div>

            {/* 爆款内容 */}
            <div className="bg-surface rounded-xl border border-border-color p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">🔥 本周爆款内容 TOP3</h3>
                <button 
              onClick={() => alert('查看全部爆款内容')}
              className="text-sm text-neon-purple hover:underline"
            >查看全部</button>
              </div>
              <div className="space-y-2">
                {viralContents.map((content, index) => (
                  <ViralContentCard key={index} content={content} index={index} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'campaign' && (
          <motion.div
            key="campaign"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {campaigns.map((campaign, index) => (
              <CampaignCard key={campaign.id} campaign={campaign} index={index} />
            ))}
            <button 
              onClick={() => alert('新建Campaign功能开发中...')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border-color hover:border-neon-purple/50 transition-colors text-text-secondary hover:text-neon-purple"
            >
              <Plus className="w-8 h-8" />
              <span>新建 Campaign</span>
            </button>
          </motion.div>
        )}

        {activeTab === 'assets' && (
          <motion.div
            key="assets"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-surface rounded-xl border border-border-color p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">集团素材库</h3>
                  <p className="text-xs text-text-secondary mt-1">标准化素材 · 全集团共享</p>
                </div>
                <button 
                  onClick={() => alert('上传素材功能开发中...')}
                  className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-lg text-sm"
                >
                  <Upload className="w-4 h-4" />
                  上传素材
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {assetPackages.map((pkg, index) => (
                  <AssetPackageCard key={pkg.id} pkg={pkg} index={index} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-surface rounded-xl border border-border-color p-5"
          >
            <h3 className="font-semibold mb-4">内容数据分析</h3>
            <div className="flex items-center justify-center h-64 text-text-secondary">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>数据分析功能开发中</p>
                <p className="text-sm mt-1">敬请期待</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContentGovernance;
