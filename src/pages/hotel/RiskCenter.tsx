/**
 * 风控中心 - Hotel端
 * 展示各平台账户健康度和风控规则
 */

import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, AlertCircle, CheckCircle, 
  RefreshCw, BookOpen, Ban, Clock, XCircle
} from 'lucide-react';
import { AccountHealthCard } from '@/components/risk/AccountHealthCard';
import { riskService } from '@/services/riskService';
import { PlatformLogo } from '@/components/PlatformLogo';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { toast } from '@/components/ux';
import type { PlatformHealth } from '@/types/risk';

export type Platform = 'xiaohongshu' | 'xianyu' | 'wechat';

// 风控规则说明
const RISK_RULES = [
  {
    platform: 'xiaohongshu' as Platform,
    name: '小红书',
    color: 'text-neon-pink',
    rules: [
      { title: '引流限制', desc: '禁止直接留微信、二维码，可用"丝❤"替代', level: 'high' },
      { title: '价格话术', desc: '禁用"最低价"，改用"优惠价"或"内部价"', level: 'medium' },
      { title: '发布频率', desc: '每天最多3条，间隔至少4小时', level: 'medium' },
      { title: '内容质量', desc: '避免硬广，保持种草风格', level: 'low' },
    ]
  },
  {
    platform: 'xianyu' as Platform,
    name: '闲鱼',
    color: 'text-neon-yellow',
    rules: [
      { title: '虚拟商品', desc: '不要出现"券""票"字样，用"代订"替代', level: 'high' },
      { title: '价格底线', desc: '不得低于PMS底价70%，否则限流', level: 'high' },
      { title: '联系方式', desc: '禁止直接留微信，引导站内沟通', level: 'high' },
      { title: '发布频率', desc: '每天最多5条，间隔至少2小时', level: 'medium' },
    ]
  },
  {
    platform: 'wechat' as Platform,
    name: '微信',
    color: 'text-neon-green',
    rules: [
      { title: '广告频率', desc: '朋友圈每天最多2条广告内容', level: 'medium' },
      { title: '内容形式', desc: '多用软营销，分享>推销', level: 'low' },
      { title: '群发限制', desc: '微信群发每月4次，谨慎使用', level: 'medium' },
      { title: '账号安全', desc: '避免频繁加好友或被举报', level: 'high' },
    ]
  },
];

// 最近风控事件（静态演示数据）
const RECENT_EVENTS = [
  { time: '10分钟前', platform: 'xiaohongshu', type: 'warning', message: '检测到敏感词"微信"，已建议替换' },
  { time: '1小时前', platform: 'xianyu', type: 'success', message: '价格合规检查通过' },
  { time: '3小时前', platform: 'wechat', type: 'info', message: '今日发布配额已用完' },
  { time: '昨天', platform: 'xiaohongshu', type: 'error', message: '内容被平台限流，相似度过高' },
];

export default function RiskCenter() {
  const [accountHealth, setAccountHealth] = useState<PlatformHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'history'>('overview');
  
  // 从 unifiedStore 获取当前酒店ID
  const { currentHotel } = useUnifiedStore();
  const hotelId = currentHotel?.id || 'hotel-001';

  // 加载账户健康度数据
  const loadAccountHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const platforms: Platform[] = ['xiaohongshu', 'xianyu', 'wechat'];
      const health = await Promise.all(
        platforms.map(p => riskService.getAccountHealth(p, hotelId))
      );
      setAccountHealth(health);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败，请重试';
      setError(errorMessage);
      toast.error('数据加载失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载 + 自动刷新
  useEffect(() => {
    loadAccountHealth();
    
    // 每5分钟自动刷新
    const interval = setInterval(() => {
      loadAccountHealth();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [hotelId]); // hotelId 变化时重新加载

  // 监听酒店切换事件
  useEffect(() => {
    const handleHotelChange = () => {
      loadAccountHealth();
    };
    
    window.addEventListener('hotel-changed', handleHotelChange);
    return () => window.removeEventListener('hotel-changed', handleHotelChange);
  }, []);

  const getAverageScore = () => {
    if (accountHealth.length === 0) return 0;
    return Math.round(accountHealth.reduce((sum, h) => sum + h.score, 0) / accountHealth.length);
  };

  const getOverallStatus = () => {
    const avg = getAverageScore();
    if (avg >= 85) return { text: '健康', color: 'text-neon-green', bg: 'bg-neon-green/20' };
    if (avg >= 70) return { text: '注意', color: 'text-neon-amber', bg: 'bg-neon-amber/20' };
    return { text: '风险', color: 'text-neon-red', bg: 'bg-neon-red/20' };
  };

  const status = getOverallStatus();
  
  // 获取今日统计数据（从 accountHealth 计算）
  const getTodayStats = () => {
    const totalQuota = accountHealth.reduce((sum, h) => sum + (h.remainingQuota || 0), 0);
    const totalViolations = accountHealth.reduce((sum, h) => sum + (h.violations || 0), 0);
    return {
      published: 6, // 模拟数据，实际应从后端获取
      quota: totalQuota,
      violations: totalViolations,
      blocked: 5, // 模拟数据，实际应从后端获取
    };
  };
  
  const stats = getTodayStats();

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield size={28} className="text-neon-cyan" />
            风控中心
          </h1>
          <p className="text-text-secondary mt-1">
            实时监控各平台账户健康度，规避限流风险
          </p>
        </div>
        <button
          onClick={loadAccountHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? '刷新中...' : '刷新'}</span>
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-neon-red/10 border border-neon-red/30 rounded-xl flex items-center gap-3">
          <XCircle size={20} className="text-neon-red" />
          <div className="flex-1">
            <div className="text-neon-red font-medium">加载失败</div>
            <div className="text-sm text-text-secondary">{error}</div>
          </div>
          <button
            onClick={loadAccountHealth}
            className="px-3 py-1.5 bg-neon-red/20 text-neon-red rounded-lg text-sm hover:bg-neon-red/30 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* 总体评分卡 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary mb-2">账户健康度</div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${status.color}`}>
              {getAverageScore()}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${status.bg} ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>

        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary mb-2">今日发布</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-neon-cyan">{stats.published}</span>
            <span className="text-text-secondary">/ {stats.quota + stats.published}条</span>
          </div>
        </div>

        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary mb-2">违规次数</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-neon-amber">{stats.violations}</span>
            <span className="text-text-secondary">本周</span>
          </div>
        </div>

        <div className="p-4 bg-bg-secondary rounded-xl border border-border-color">
          <div className="text-sm text-text-secondary mb-2">风控拦截</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-neon-green">{stats.blocked}</span>
            <span className="text-text-secondary">今日</span>
          </div>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-border-color">
        {[
          { key: 'overview', label: '账户概览', icon: Shield },
          { key: 'rules', label: '平台规则', icon: BookOpen },
          { key: 'history', label: '风控记录', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* 账户概览 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-bg-secondary rounded-xl animate-pulse" />
            ))
          ) : error ? (
            <div className="col-span-3 p-8 text-center text-text-secondary">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
              <p>数据加载失败</p>
              <button
                onClick={loadAccountHealth}
                className="mt-4 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/80 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : (
            accountHealth.map((health) => (
              <AccountHealthCard
                key={health.platform}
                health={health}
                onClick={() => setActiveTab('rules')}
              />
            ))
          )}
        </div>
      )}

      {/* 平台规则 */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {RISK_RULES.map(({ platform, name, color, rules }) => (
            <div key={platform} className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
              <div className="p-4 border-b border-border-color bg-bg-tertiary/50">
                <div className="flex items-center gap-3">
                  <PlatformLogo platform={platform} size={28} />
                  <span className={`font-medium ${color}`}>{name}</span>
                  <span className="text-text-secondary text-sm">平台规则</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-bg-tertiary/30 rounded-lg">
                    <div className={`mt-0.5 ${
                      rule.level === 'high' ? 'text-neon-red' :
                      rule.level === 'medium' ? 'text-neon-amber' : 'text-neon-green'
                    }`}>
                      {rule.level === 'high' ? <AlertCircle size={16} /> :
                       rule.level === 'medium' ? <AlertTriangle size={16} /> :
                       <CheckCircle size={16} />}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{rule.title}</div>
                      <div className="text-sm text-text-secondary mt-0.5">{rule.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 风控记录 */}
      {activeTab === 'history' && (
        <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
          <div className="p-4 border-b border-border-color">
            <h3 className="font-medium text-text-primary">最近风控事件</h3>
          </div>
          <div className="divide-y divide-border-color">
            {RECENT_EVENTS.map((event, idx) => (
              <div key={idx} className="p-4 flex items-start gap-3 hover:bg-bg-tertiary/30 transition-colors">
                <div className={`mt-0.5 ${
                  event.type === 'error' ? 'text-neon-red' :
                  event.type === 'warning' ? 'text-neon-amber' :
                  event.type === 'success' ? 'text-neon-green' :
                  'text-neon-cyan'
                }`}>
                  {event.type === 'error' ? <Ban size={16} /> :
                   event.type === 'warning' ? <AlertTriangle size={16} /> :
                   event.type === 'success' ? <CheckCircle size={16} /> :
                   <Clock size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{event.message}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                    <span>{event.time}</span>
                    <span>•</span>
                    <span className="flex items-center gap-2">
                      <PlatformLogo platform={event.platform as Platform} size={16} />
                      {event.platform === 'xiaohongshu' ? '小红书' :
                       event.platform === 'xianyu' ? '闲鱼' : '微信'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 合规提示 */}
      <div className="p-4 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl">
        <div className="flex items-start gap-3">
          <BookOpen size={20} className="text-neon-cyan flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-neon-cyan">合规建议</div>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              <li>• 发布前使用系统检测功能，提前发现敏感词和价格问题</li>
              <li>• 保持各平台发布间隔，避免触发频率限制</li>
              <li>• 定期查看账户健康度，及时处理违规提醒</li>
              <li>• 内容差异化运营，避免同质化导致限流</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
