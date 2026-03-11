/**
 * 平台 Logo 组件
 * 使用真实平台 logo 图片替代图标
 */

import type { Platform } from '@/types';

interface PlatformLogoProps {
  platform: Platform;
  size?: number;
  className?: string;
}

const platformConfig: Record<Platform, {
  src: string;
  alt: string;
  bgColor: string;
}> = {
  xianyu: {
    src: '/logos/xianyu.jpg',
    alt: '闲鱼',
    bgColor: '#FFDA44',
  },
  xiaohongshu: {
    src: '/logos/xiaohongshu.jpg',
    alt: '小红书',
    bgColor: '#FF2442',
  },
  wechat: {
    src: '/logos/wechat.jpg',
    alt: '微信',
    bgColor: '#07C160',
  },
};

export function PlatformLogo({ platform, size = 24, className = '' }: PlatformLogoProps) {
  const config = platformConfig[platform];
  
  return (
    <img
      src={config.src}
      alt={config.alt}
      width={size}
      height={size}
      className={`rounded object-contain flex-shrink-0 ${className}`}
      style={{ 
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
      }}
    />
  );
}

// 平台徽章组件（带背景色和名称）
export function PlatformBadge({ 
  platform, 
  size = 20, 
  className = '' 
}: PlatformLogoProps) {
  const config = platformConfig[platform];
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${className}`}
      style={{ backgroundColor: `${config.bgColor}20` }}
    >
      <img
        src={config.src}
        alt={config.alt}
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
      <span style={{ color: config.bgColor }}>{config.alt}</span>
    </span>
  );
}

export function PlatformLogoWithName({ 
  platform, 
  size = 20, 
  showName = true,
  className = '' 
}: PlatformLogoProps & { showName?: boolean }) {
  const config = platformConfig[platform];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PlatformLogo platform={platform} size={size} />
      {showName && (
        <span className="text-sm font-medium">{config.alt}</span>
      )}
    </div>
  );
}

export { platformConfig };
