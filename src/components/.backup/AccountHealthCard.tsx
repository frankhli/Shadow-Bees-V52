/**
 * 账户健康度卡片组件
 * 展示各平台账户健康状态和评分
 */

import { Shield, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { PlatformLogo } from '@/components/PlatformLogo';
import type { PlatformHealth } from '@/types/risk';

interface AccountHealthCardProps {
  health: PlatformHealth;
  onClick?: () => void;
  className?: string;
}

export function AccountHealthCard({
  health,
  onClick,
  className = ''
}: AccountHealthCardProps) {
  const { platform, score, status, violations, remainingQuota, platformName } = health;

  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-neon-green';
      case 'warning': return 'text-neon-amber';
      case 'danger': return 'text-neon-red';
      default: return 'text-text-secondary';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'healthy': return 'bg-neon-green/10 border-neon-green/30';
      case 'warning': return 'bg-neon-amber/10 border-neon-amber/30';
      case 'danger': return 'bg-neon-red/10 border-neon-red/30';
      default: return 'bg-bg-tertiary border-border-color';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy': return '健康';
      case 'warning': return '注意';
      case 'danger': return '风险';
      default: return '未知';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border ${getStatusBg()} ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-all' : ''
      } ${className}`}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <PlatformLogo platform={platform} size={28} />
          <div>
            <div className="font-medium text-text-primary">{platformName}</div>
            <div className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>
        <div className={`text-2xl font-bold ${getStatusColor()}`}>
          {score}
        </div>
      </div>

      {/* 评分条 */}
      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? 'bg-neon-green' : score >= 50 ? 'bg-neon-amber' : 'bg-neon-red'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* 指标 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} className={violations > 0 ? 'text-neon-red' : 'text-neon-green'} />
          <span className="text-text-secondary">违规: </span>
          <span className={violations > 0 ? 'text-neon-red' : 'text-neon-green'}>
            {violations}次
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-neon-cyan" />
          <span className="text-text-secondary">余量: </span>
          <span className="text-text-primary">{remainingQuota}条</span>
        </div>
      </div>

      {/* 状态图标 */}
      <div className="absolute top-2 right-2">
        {status === 'healthy' && <CheckCircle size={16} className="text-neon-green" />}
        {status === 'warning' && <AlertTriangle size={16} className="text-neon-amber" />}
        {status === 'danger' && <Shield size={16} className="text-neon-red" />}
      </div>
    </div>
  );
}
