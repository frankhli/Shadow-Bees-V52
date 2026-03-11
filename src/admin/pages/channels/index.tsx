/**
 * SaaS运营后台 - 渠道效能分析中心（真实数据版）
 * 使用 store.contentItems 作为内容数据源
 */

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  ShoppingCart,
  Crown,
  RefreshCw,
} from 'lucide-react';
import { PlatformLogo } from '../../components/PlatformLogo';
import { useAdminStore, type Platform, type ContentItem } from '../../stores/adminStore';

// 平台配置
const platformConfig: Record<Platform, { 
  name: string; 
  color: string; 
  bgColor: string;
  desc: string;
}> = {
  xianyu: { 
    name: '闲鱼', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-400/10',
    desc: '二手交易平台，价格敏感用户',
  },
  xiaohongshu: { 
    name: '小红书', 
    color: 'text-red-400', 
    bgColor: 'bg-red-400/10',
    desc: '生活方式社区，注重体验分享',
  },
  wechat: { 
    name: '微信', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    desc: '社交平台，私域流量场景',
  },
};

export default function ChannelAnalyticsPage() {
  const { hotels, contentItems, setContentItems } = useAdminStore();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  
  // 强制刷新内容数据（解决持久化缓存问题）
  const handleRefreshContent = () => {
    // 重新加载 mockContentItems
    const freshContentItems = JSON.parse(JSON.stringify([
      {
        id: 'CNT-001',
        hotelId: 'sanlitun',
        hotelName: '三里屯潮流酒店',
        platform: 'xianyu',
        title: '【限时特惠】三里屯舒适标准房，性价比之选',
        price: 340,
        author: '张老板',
        status: 'approved',
        aiScore: 95,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        stats: {
          impressions: 12500,
          clicks: 680,
          inquiries: 45,
          conversions: 12,
          ctr: 5.44,
          conversionRate: 8.82,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-002',
        hotelId: 'chongli',
        hotelName: '崇礼星空酒店',
        platform: 'xiaohongshu',
        title: '🏔️ 崇礼滑雪住宿攻略｜星空酒店实测',
        price: 630,
        author: '王经理',
        status: 'approved',
        aiScore: 88,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        stats: {
          impressions: 25800,
          clicks: 1520,
          inquiries: 98,
          conversions: 23,
          ctr: 5.89,
          conversionRate: 9.21,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-003',
        hotelId: 'dali',
        hotelName: '大理洱海酒店',
        platform: 'wechat',
        title: '🌅 大理洱海日出最佳观景点｜这家酒店无敌了',
        price: 685,
        author: '陈女士',
        status: 'approved',
        aiScore: 78,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        stats: {
          impressions: 45200,
          clicks: 3200,
          inquiries: 156,
          conversions: 34,
          ctr: 7.08,
          conversionRate: 10.63,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-004',
        hotelId: 'sanlitun',
        hotelName: '三里屯潮流酒店',
        platform: 'xiaohongshu',
        title: '北京三里屯｜潮人必住的宝藏酒店',
        price: 565,
        author: '张老板',
        status: 'approved',
        aiScore: 92,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        stats: {
          impressions: 18900,
          clicks: 980,
          inquiries: 62,
          conversions: 15,
          ctr: 5.19,
          conversionRate: 7.65,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-005',
        hotelId: 'chongli',
        hotelName: '崇礼星空酒店',
        platform: 'xianyu',
        title: '【滑雪季】崇礼雪场青旅床位 低至80元',
        price: 115,
        author: '王经理',
        status: 'flagged',
        aiScore: 45,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        stats: {
          impressions: 3200,
          clicks: 120,
          inquiries: 8,
          conversions: 2,
          ctr: 3.75,
          conversionRate: 6.67,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-006',
        hotelId: 'dali',
        hotelName: '大理洱海酒店',
        platform: 'xiaohongshu',
        title: '🌸 大理春日限定｜洱海边的浪漫民宿',
        price: 720,
        author: '陈女士',
        status: 'approved',
        aiScore: 90,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        stats: {
          impressions: 32100,
          clicks: 2150,
          inquiries: 128,
          conversions: 28,
          ctr: 6.70,
          conversionRate: 8.37,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-007',
        hotelId: 'sanlitun',
        hotelName: '三里屯潮流酒店',
        platform: 'wechat',
        title: '🔥 三里屯夜生活｜住这里才是正确打开方式',
        price: 420,
        author: '张老板',
        status: 'approved',
        aiScore: 85,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        stats: {
          impressions: 28500,
          clicks: 1680,
          inquiries: 89,
          conversions: 19,
          ctr: 5.89,
          conversionRate: 7.74,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
      {
        id: 'CNT-008',
        hotelId: 'chongli',
        hotelName: '崇礼星空酒店',
        platform: 'wechat',
        title: '❄️ 崇礼滑雪vlog｜星空酒店沉浸式体验',
        price: 580,
        author: '王经理',
        status: 'approved',
        aiScore: 87,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        stats: {
          impressions: 38500,
          clicks: 2680,
          inquiries: 145,
          conversions: 31,
          ctr: 6.96,
          conversionRate: 8.21,
          updateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
    ]));
    setContentItems(freshContentItems);
  };

  // 生成平台级效能数据（基于真实内容数据）
  const platformMetrics = useMemo(() => {
    const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
    
    return platforms.map(platform => {
      // 获取该平台的内容
      const platformContents = contentItems.filter(c => c.platform === platform);
      
      // 从酒店数据获取平台指标
      const platformOrders: { price: number; platform: Platform }[] = [];
      
      hotels.forEach(hotel => {
        const metrics = hotel.platformMetrics.find(m => m.platform === platform);
        if (metrics) {
          // 生成对应订单
          for (let i = 0; i < metrics.conversions; i++) {
            platformOrders.push({
              price: metrics.revenue / metrics.conversions,
              platform,
            });
          }
        }
      });
      
      // 计算真实内容数据
      const totalImpressions = platformContents.reduce((sum, c) => sum + (c.stats?.impressions || 0), 0);
      const totalClicks = platformContents.reduce((sum, c) => sum + (c.stats?.clicks || 0), 0);
      const totalInquiries = platformContents.reduce((sum, c) => sum + (c.stats?.inquiries || 0), 0);
      const totalConversions = platformContents.reduce((sum, c) => sum + (c.stats?.conversions || 0), 0);
      const totalRevenue = platformOrders.reduce((sum, o) => sum + o.price, 0);
      
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const avgPrice = platformOrders.length > 0 ? totalRevenue / platformOrders.length : 0;
      
      // 找出该平台的TOP酒店
      const hotelPerformance = hotels.map(h => {
        const m = h.platformMetrics.find(pm => pm.platform === platform);
        return { hotel: h, conversions: m?.conversions || 0 };
      }).sort((a, b) => b.conversions - a.conversions);
      
      return {
        platform,
        contentCount: platformContents.length,
        totalImpressions,
        totalClicks,
        totalInquiries,
        totalConversions,
        totalRevenue,
        avgCtr: Math.round(avgCtr * 100) / 100,
        avgConversionRate: Math.round(avgConversionRate * 100) / 100,
        avgPrice: Math.round(avgPrice),
        topHotels: hotelPerformance.slice(0, 3).map(h => h.hotel.name),
      };
    });
  }, [hotels, contentItems]);

  // 生成真实内容排行榜（基于 store.contentItems）
  const contentLeaderboard = useMemo(() => {
    return contentItems
      .filter(c => c.stats) // 只包含有数据的内容
      .map(content => {
        const conversionRate = content.stats?.conversionRate || 0;
        return {
          ...content,
          conversionRate,
        };
      })
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
  }, [contentItems]);

  // 过滤后的平台数据
  const filteredMetrics = selectedPlatform === 'all' 
    ? platformMetrics 
    : platformMetrics.filter(m => m.platform === selectedPlatform);

  // 总体数据
  const overallStats = useMemo(() => {
    const totalContent = contentItems.length;
    const totalRevenue = platformMetrics.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalConversions = platformMetrics.reduce((sum, p) => sum + p.totalConversions, 0);
    const avgConversionRate = platformMetrics.reduce((sum, p) => sum + p.avgConversionRate, 0) / platformMetrics.length;
    
    return {
      totalContent,
      totalRevenue,
      totalConversions,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100,
    };
  }, [platformMetrics, contentItems]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">渠道效能</h1>
          <p className="text-gray-400 text-sm mt-1">
            基于真实内容数据 · 共 {overallStats.totalContent} 条内容
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            有数据: {contentItems.filter(c => c.stats).length} / 总数: {contentItems.length}
          </span>
          <button
            onClick={handleRefreshContent}
            className="px-3 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm hover:border-neon-cyan flex items-center gap-2"
          >
            <RefreshCw size={16} />
            刷新数据
          </button>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value as Platform | 'all')}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部平台</option>
            <option value="xianyu">闲鱼</option>
            <option value="xiaohongshu">小红书</option>
            <option value="wechat">微信</option>
          </select>
        </div>
      </div>

      {/* 总体概览 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总内容数</span>
            <BarChart3 size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{overallStats.totalContent}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总销售额</span>
            <Target size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">¥{(overallStats.totalRevenue / 10000).toFixed(1)}万</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总订单数</span>
            <ShoppingCart size={18} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold mt-2">{overallStats.totalConversions}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">平均转化率</span>
            <TrendingUp size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2">{overallStats.avgConversionRate}%</p>
        </div>
      </div>

      {/* 平台对比 */}
      <div className="grid grid-cols-3 gap-4">
        {filteredMetrics.map((metrics) => (
          <PlatformCard key={metrics.platform} metrics={metrics} />
        ))}
      </div>

      {/* 内容排行榜 */}
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Award size={20} className="text-neon-amber" />
            内容效能排行榜
            <span className="text-sm font-normal text-gray-400">(基于真实内容数据)</span>
          </h3>
        </div>

        <div className="space-y-3">
          {contentLeaderboard.length > 0 ? (
            contentLeaderboard.map((content, index) => (
              <ContentRankCard key={content.id} content={content} rank={index + 1} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-2">暂无内容数据</p>
              <p className="text-xs text-gray-500">
                总数: {contentItems.length} | 有stats: {contentItems.filter(c => c.stats).length}
              </p>
              <button
                onClick={handleRefreshContent}
                className="mt-4 px-4 py-2 bg-neon-purple/10 text-neon-purple rounded-lg text-sm hover:bg-neon-purple/20"
              >
                点击刷新数据
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 平台指标类型
interface PlatformMetrics {
  platform: Platform;
  contentCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalInquiries: number;
  totalConversions: number;
  totalRevenue: number;
  avgCtr: number;
  avgConversionRate: number;
  avgPrice: number;
  topHotels: string[];
}

// 平台卡片组件
function PlatformCard({ metrics }: { metrics: PlatformMetrics }) {
  const config = platformConfig[metrics.platform];
  
  return (
    <div className={`p-5 rounded-xl border ${config.bgColor} border-gray-800`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-[#0B0F19]`}>
          <PlatformLogo platform={metrics.platform} size={24} />
        </div>
        <div>
          <h3 className={`font-medium ${config.color}`}>{config.name}</h3>
          <p className="text-xs text-gray-400">{config.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-[#0B0F19] rounded-lg">
          <p className="text-xs text-gray-400">内容数</p>
          <p className="text-lg font-bold">{metrics.contentCount}</p>
        </div>
        <div className="p-3 bg-[#0B0F19] rounded-lg">
          <p className="text-xs text-gray-400">销售额</p>
          <p className="text-lg font-bold text-neon-green">¥{(metrics.totalRevenue / 1000).toFixed(0)}k</p>
        </div>
        <div className="p-3 bg-[#0B0F19] rounded-lg">
          <p className="text-xs text-gray-400">点击率</p>
          <p className="text-lg font-bold">{metrics.avgCtr}%</p>
        </div>
        <div className="p-3 bg-[#0B0F19] rounded-lg">
          <p className="text-xs text-gray-400">转化率</p>
          <p className="text-lg font-bold">{metrics.avgConversionRate}%</p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-400 mb-2">TOP酒店</p>
        <div className="flex flex-wrap gap-1">
          {metrics.topHotels.map((name, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-[#0B0F19] rounded">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 内容排名卡片组件
function ContentRankCard({ content, rank }: { content: ContentItem & { conversionRate: number }; rank: number }) {
  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-gray-300',
    3: 'text-amber-600',
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-colors">
      {/* 排名 */}
      <div className="w-8 text-center">
        {rank <= 3 ? (
          <Crown size={20} className={rankColors[rank]} />
        ) : (
          <span className="text-gray-500 font-medium">{rank}</span>
        )}
      </div>

      {/* 平台图标 */}
      <PlatformLogo platform={content.platform} size={24} />

      {/* 内容信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{content.title}</p>
          {content.subtype && (
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              content.subtype === 'moments' ? 'bg-green-500/20 text-green-400' :
              content.subtype === 'group' ? 'bg-blue-500/20 text-blue-400' :
              content.subtype === 'private' ? 'bg-purple-500/20 text-purple-400' :
              'bg-orange-500/20 text-orange-400'
            }`}>
              {content.subtype === 'moments' ? '朋友圈' :
               content.subtype === 'group' ? '微信群' :
               content.subtype === 'private' ? '私聊' : '视频号'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">{content.hotelName}</p>
      </div>

      {/* 数据指标 */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="text-xs text-gray-400">曝光</p>
          <p className="font-medium">{(content.stats?.impressions || 0).toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">点击</p>
          <p className="font-medium">{(content.stats?.clicks || 0).toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">转化</p>
          <p className="font-medium">{content.stats?.conversions || 0}</p>
        </div>
        <div className="text-center w-16">
          <p className="text-xs text-gray-400">转化率</p>
          <p className={`font-bold ${content.conversionRate > 2 ? 'text-neon-green' : 'text-neon-amber'}`}>
            {content.conversionRate.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
