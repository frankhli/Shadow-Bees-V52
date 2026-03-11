/**
 * 风控管理 - 管理端Dashboard
 * 全平台风控总览，酒店账户监控
 */

import { useState } from 'react';
import { 
  Shield, Search, ChevronRight, Activity,
  AlertCircle, Building2
} from 'lucide-react';
import { PlatformLogo } from '@/admin/components/PlatformLogo';

export type Platform = 'xiaohongshu' | 'xianyu' | 'wechat';

// 模拟酒店风控数据
const MOCK_HOTELS_RISK = [
  { 
    id: 'H001', 
    name: '北京三里屯精品酒店', 
    score: 92, 
    status: 'healthy' as const,
    platforms: { xiaohongshu: 95, xianyu: 88, wechat: 94 },
    violations: 0,
    lastCheck: '2分钟前'
  },
  { 
    id: 'H002', 
    name: '上海外滩景观酒店', 
    score: 78, 
    status: 'warning' as const,
    platforms: { xiaohongshu: 65, xianyu: 85, wechat: 82 },
    violations: 2,
    lastCheck: '15分钟前'
  },
  { 
    id: 'H003', 
    name: '成都春熙路酒店', 
    score: 45, 
    status: 'danger' as const,
    platforms: { xiaohongshu: 35, xianyu: 52, wechat: 48 },
    violations: 8,
    lastCheck: '1小时前'
  },
  { 
    id: 'H004', 
    name: '深圳南山商务酒店', 
    score: 88, 
    status: 'healthy' as const,
    platforms: { xiaohongshu: 90, xianyu: 85, wechat: 88 },
    violations: 1,
    lastCheck: '30分钟前'
  },
  { 
    id: 'H005', 
    name: '杭州西湖度假酒店', 
    score: 72, 
    status: 'warning' as const,
    platforms: { xiaohongshu: 70, xianyu: 75, wechat: 70 },
    violations: 3,
    lastCheck: '45分钟前'
  },
];

// 风控事件统计
const RISK_STATS = {
  totalHotels: 156,
  healthy: 89,
  warning: 45,
  danger: 22,
  todayViolations: 23,
  todayBlocked: 67,
};

// 平台分布
const PLATFORM_DISTRIBUTION = [
  { platform: 'xiaohongshu' as Platform, name: '小红书', healthy: 120, warning: 28, danger: 8 },
  { platform: 'xianyu' as Platform, name: '闲鱼', healthy: 134, warning: 18, danger: 4 },
  { platform: 'wechat' as Platform, name: '微信', healthy: 145, warning: 9, danger: 2 },
];

export default function RiskDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'danger'>('all');

  const filteredHotels = MOCK_HOTELS_RISK.filter(hotel => {
    const matchesSearch = hotel.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || hotel.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2 py-1 bg-neon-green/20 text-neon-green text-xs rounded-full">健康</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-neon-amber/20 text-neon-amber text-xs rounded-full">注意</span>;
      case 'danger':
        return <span className="px-2 py-1 bg-neon-red/20 text-neon-red text-xs rounded-full">风险</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield size={28} className="text-neon-cyan" />
            风控管理
          </h1>
          <p className="text-text-secondary mt-1">
            全平台风控监控，实时预警风险酒店
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">监控酒店</div>
          <div className="text-2xl font-bold text-text-primary mt-1">{RISK_STATS.totalHotels}</div>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">健康</div>
          <div className="text-2xl font-bold text-neon-green">{RISK_STATS.healthy}</div>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">注意</div>
          <div className="text-2xl font-bold text-neon-amber">{RISK_STATS.warning}</div>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">风险</div>
          <div className="text-2xl font-bold text-neon-red">{RISK_STATS.danger}</div>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">今日违规</div>
          <div className="text-2xl font-bold text-neon-amber">{RISK_STATS.todayViolations}</div>
        </div>
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary">今日拦截</div>
          <div className="text-2xl font-bold text-neon-cyan">{RISK_STATS.todayBlocked}</div>
        </div>
      </div>

      {/* 平台分布 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORM_DISTRIBUTION.map(({ platform, name, healthy, warning, danger }) => (
          <div key={platform} className="p-4 bg-bg-secondary rounded-xl border border-border-color">
            <div className="flex items-center gap-3 mb-4">
              <PlatformLogo platform={platform} size={28} />
              <span className="font-medium text-text-primary">{name}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">健康</span>
                <span className="text-neon-green font-medium">{healthy}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">注意</span>
                <span className="text-neon-amber font-medium">{warning}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">风险</span>
                <span className="text-neon-red font-medium">{danger}</span>
              </div>
            </div>
            {/* 可视化条 */}
            <div className="flex h-2 rounded-full overflow-hidden mt-3">
              <div className="bg-neon-green" style={{ width: `${(healthy / (healthy + warning + danger)) * 100}%` }} />
              <div className="bg-neon-amber" style={{ width: `${(warning / (healthy + warning + danger)) * 100}%` }} />
              <div className="bg-neon-red" style={{ width: `${(danger / (healthy + warning + danger)) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* 酒店列表 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
        {/* 头部工具栏 */}
        <div className="p-4 border-b border-border-color flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-medium text-text-primary">酒店风控列表</h3>
          <div className="flex items-center gap-3">
            {/* 状态筛选 */}
            <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1">
              {(['all', 'healthy', 'warning', 'danger'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    filterStatus === status
                      ? 'bg-neon-cyan text-black font-medium'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {status === 'all' ? '全部' : status === 'healthy' ? '健康' : status === 'warning' ? '注意' : '风险'}
                </button>
              ))}
            </div>
            {/* 搜索 */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="搜索酒店..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-bg-tertiary border border-border-color rounded-lg text-sm focus:outline-none focus:border-neon-cyan w-48"
              />
            </div>
          </div>
        </div>

        {/* 列表 */}
        <div className="divide-y divide-border-color">
          {filteredHotels.map((hotel) => (
            <div key={hotel.id} className="p-4 hover:bg-bg-tertiary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-bg-tertiary rounded-lg flex items-center justify-center text-neon-cyan">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">{hotel.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(hotel.status)}
                      <span className="text-xs text-text-secondary">
                        {hotel.violations > 0 ? `${hotel.violations}个违规` : '无违规'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 平台评分 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-text-secondary">小红书</div>
                      <div className={`text-sm font-medium ${
                        hotel.platforms.xiaohongshu >= 80 ? 'text-neon-green' :
                        hotel.platforms.xiaohongshu >= 60 ? 'text-neon-amber' : 'text-neon-red'
                      }`}>
                        {hotel.platforms.xiaohongshu}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-text-secondary">闲鱼</div>
                      <div className={`text-sm font-medium ${
                        hotel.platforms.xianyu >= 80 ? 'text-neon-green' :
                        hotel.platforms.xianyu >= 60 ? 'text-neon-amber' : 'text-neon-red'
                      }`}>
                        {hotel.platforms.xianyu}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-text-secondary">微信</div>
                      <div className={`text-sm font-medium ${
                        hotel.platforms.wechat >= 80 ? 'text-neon-green' :
                        hotel.platforms.wechat >= 60 ? 'text-neon-amber' : 'text-neon-red'
                      }`}>
                        {hotel.platforms.wechat}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      hotel.score >= 80 ? 'text-neon-green' :
                      hotel.score >= 60 ? 'text-neon-amber' : 'text-neon-red'
                    }`}>
                      {hotel.score}
                    </div>
                    <div className="text-xs text-text-secondary">{hotel.lastCheck}</div>
                  </div>
                  
                  <ChevronRight size={18} className="text-text-tertiary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 风险提示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-neon-red/10 border border-neon-red/30 rounded-xl">
          <div className="flex items-center gap-2 text-neon-red mb-2">
            <AlertCircle size={18} />
            <span className="font-medium">高风险预警</span>
          </div>
          <p className="text-sm text-text-secondary">
            发现 {RISK_STATS.danger} 家酒店存在高风险，建议立即联系整改。主要问题：小红书引流违规、闲鱼价格异常。
          </p>
        </div>
        <div className="p-4 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl">
          <div className="flex items-center gap-2 text-neon-cyan mb-2">
            <Activity size={18} />
            <span className="font-medium">拦截统计</span>
          </div>
          <p className="text-sm text-text-secondary">
            今日系统已自动拦截 {RISK_STATS.todayBlocked} 条违规内容，有效避免了酒店账户被平台处罚。
          </p>
        </div>
      </div>
    </div>
  );
}
