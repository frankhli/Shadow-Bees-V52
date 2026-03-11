/**
 * 平台Logo组件 - 显示闲鱼/小红书/微信真实logo
 */

import type { Platform } from '../stores/adminStore';

interface PlatformLogoProps {
  platform: Platform;
  size?: number;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

const platformConfig: Record<Platform, {
  name: string;
  logo: string;
  color: string;
  bgColor: string;
}> = {
  xianyu: {
    name: '闲鱼',
    logo: '/logos/xianyu.jpg',
    color: '#FFD700',
    bgColor: 'bg-yellow-400/10',
  },
  xiaohongshu: {
    name: '小红书',
    logo: '/logos/xiaohongshu.jpg',
    color: '#FF2442',
    bgColor: 'bg-red-400/10',
  },
  wechat: {
    name: '微信',
    logo: '/logos/wechat.jpg',
    color: '#07C160',
    bgColor: 'bg-green-500/10',
  },
};

export function PlatformLogo({ 
  platform, 
  size = 24, 
  className = '',
  showName = false,
  nameClassName = '',
}: PlatformLogoProps) {
  const config = platformConfig[platform];
  
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={config.logo}
        alt={config.name}
        width={size}
        height={size}
        className="rounded object-contain flex-shrink-0"
        style={{ 
          minWidth: size, 
          minHeight: size,
          width: size,
          height: size,
        }}
      />
      {showName && (
        <span className={nameClassName} style={{ color: config.color }}>
          {config.name}
        </span>
      )}
    </span>
  );
}

export function PlatformBadge({ 
  platform, 
  size = 20,
  className = '',
}: PlatformLogoProps) {
  const config = platformConfig[platform];
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.bgColor} ${className}`}
    >
      <img
        src={config.logo}
        alt={config.name}
        width={size}
        height={size}
        className="rounded object-contain flex-shrink-0"
        style={{ 
          minWidth: size, 
          minHeight: size,
          width: size,
          height: size,
        }}
      />
      <span style={{ color: config.color }}>{config.name}</span>
    </span>
  );
}

export function PlatformIcon({ 
  platform, 
  size = 24, 
  className = '',
}: PlatformLogoProps) {
  const config = platformConfig[platform];
  
  return (
    <img
      src={config.logo}
      alt={config.name}
      width={size}
      height={size}
      className={`rounded object-contain flex-shrink-0 ${className}`}
      style={{ 
        minWidth: size, 
        minHeight: size,
        width: size,
        height: size,
      }}
    />
  );
}

export { platformConfig };
export default PlatformLogo;
