/**
 * 发布速率限制组件
 * 控制各平台发布频率，避免触发限流
 */

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, Ban, Calendar } from 'lucide-react';
import type { PublishRateLimit, Platform } from '@/types/risk';

interface PublishRateLimiterProps {
  platform: Platform;
  hotelId: string;
  onCanPublish?: (canPublish: boolean, limit: PublishRateLimit) => void;
  className?: string;
}

// 平台限制配置
const PLATFORM_LIMITS: Record<Platform, { dailyLimit: number; minInterval: number }> = {
  xiaohongshu: { dailyLimit: 3, minInterval: 4 * 60 * 60 * 1000 },
  xianyu: { dailyLimit: 5, minInterval: 2 * 60 * 60 * 1000 },
  wechat: { dailyLimit: 2, minInterval: 8 * 60 * 60 * 1000 },
};

// 模拟今日发布记录
const MOCK_TODAY_PUBLISHES: Record<string, string[]> = {
  xiaohongshu: [
    new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),  // 6小时前
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),  // 2小时前
  ],
  xianyu: [
    new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),  // 1小时前
  ],
  wechat: [],
};

export function PublishRateLimiter({
  platform,
  hotelId,
  onCanPublish,
  className = ''
}: PublishRateLimiterProps) {
  const [limit, setLimit] = useState<PublishRateLimit | null>(null);

  const checkRateLimit = useCallback((): PublishRateLimit => {
    const config = PLATFORM_LIMITS[platform];
    const todayPublishes = MOCK_TODAY_PUBLISHES[platform] || [];
    
    const now = Date.now();
    const todayCount = todayPublishes.length;
    const remainingQuota = Math.max(0, config.dailyLimit - todayCount);
    
    // 计算下一次可发布时间
    let nextAvailableTime: string | undefined;
    if (todayPublishes.length > 0) {
      const lastPublish = new Date(todayPublishes[todayPublishes.length - 1]).getTime();
      const nextAvailable = lastPublish + config.minInterval;
      if (nextAvailable > now) {
        nextAvailableTime = new Date(nextAvailable).toISOString();
      }
    }
    
    const canPublish = remainingQuota > 0 && !nextAvailableTime;

    return {
      platform,
      dailyQuota: config.dailyLimit,
      remainingQuota,
      nextAvailableTime,
      canPublish
    };
  }, [platform, hotelId]);

  useEffect(() => {
    const limitResult = checkRateLimit();
    setLimit(limitResult);
    onCanPublish?.(limitResult.canPublish, limitResult);
  }, [checkRateLimit, onCanPublish]);

  if (!limit) return null;

  const { remainingQuota, nextAvailableTime, canPublish, dailyQuota } = limit;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 配额状态 */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${
        canPublish 
          ? 'bg-neon-green/10 border-neon-green/30' 
          : remainingQuota === 0
          ? 'bg-neon-red/10 border-neon-red/30'
          : 'bg-neon-amber/10 border-neon-amber/30'
      }`}>
        <div className="flex items-center gap-2">
          {canPublish ? (
            <CheckCircle size={18} className="text-neon-green" />
          ) : remainingQuota === 0 ? (
            <Ban size={18} className="text-neon-red" />
          ) : (
            <Clock size={18} className="text-neon-amber" />
          )}
          <div>
            <div className={`text-sm font-medium ${
              canPublish ? 'text-neon-green' : remainingQuota === 0 ? 'text-neon-red' : 'text-neon-amber'
            }`}>
              {canPublish 
                ? '可以发布' 
                : remainingQuota === 0 
                ? '今日配额已用完' 
                : '需等待冷却时间'}
            </div>
            <div className="text-xs text-text-secondary">
              今日已发 {dailyQuota - remainingQuota}/{dailyQuota} 条
            </div>
          </div>
        </div>

        {/* 配额可视化 */}
        <div className="flex gap-1">
          {Array.from({ length: dailyQuota }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-6 rounded ${
                i < (dailyQuota - remainingQuota)
                  ? 'bg-bg-tertiary'
                  : canPublish
                  ? 'bg-neon-green'
                  : 'bg-neon-amber/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 冷却时间提醒 */}
      {nextAvailableTime && (
        <div className="p-2 bg-neon-amber/10 border border-neon-amber/20 rounded text-sm">
          <div className="flex items-center gap-2 text-neon-amber">
            <Clock size={14} />
            <span>
              下次可发布时间: {new Date(nextAvailableTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {platform === 'wechat' ? '微信建议每天不超过2条，避免用户疲劳' : ''}
            {platform === 'xiaohongshu' ? '小红书建议保持4小时间隔，提高推荐概率' : ''}
            {platform === 'xianyu' ? '闲鱼建议保持2小时间隔，降低被限流风险' : ''}
          </div>
        </div>
      )}

      {/* 配额用完提示 */}
      {remainingQuota === 0 && (
        <div className="p-2 bg-neon-cyan/10 border border-neon-cyan/20 rounded text-sm">
          <div className="flex items-center gap-2 text-neon-cyan">
            <Calendar size={14} />
            <span>今日配额已用完，建议明日 {platform === 'wechat' ? '9:00-11:00' : '10:00-12:00'} 再发布</span>
          </div>
        </div>
      )}
    </div>
  );
}
