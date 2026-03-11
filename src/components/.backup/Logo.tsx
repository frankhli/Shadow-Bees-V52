/**
 * Shadow-Bees Logo 组件
 * 设计要点：
 * 1. 身体：收腰"8"字形 = 蜜蜂特征 + 隐藏字母S
 * 2. 配色：青紫渐变 + 蜂蜜金点缀
 * 3. 影子：多层模糊椭圆，营造跟随感
 * 4. 翅膀：一大一小不对称，更生动
 * 5. 触角：简化为小圆点，减少干扰
 */

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'default' | 'admin' | 'icon-only';
  className?: string;
  showVersion?: boolean;
}

// 获取系统版本号
function getSystemVersion(): string {
  if (typeof window === 'undefined') return 'v1.0.0';
  const configVersion = localStorage.getItem('sb_config_version');
  if (configVersion) return `v${configVersion}`;
  // 从 package.json 获取（构建时注入）
  return 'v1.0.0';
}

export function Logo({ 
  size = 48, 
  showText = true, 
  variant = 'default',
  className = '',
  showVersion = true
}: LogoProps) {
  const isIconOnly = variant === 'icon-only';
  const isAdmin = variant === 'admin';
  const version = getSystemVersion();
  
  // 配色方案
  const colors = {
    cyan: '#00D4FF',
    purple: '#A855F7',
    honey: '#FFB800',
    shadow: '#00D4FF',
  };

  const LogoSVG = () => (
    <svg 
      viewBox="0 0 48 48" 
      width={size} 
      height={size}
      className={className}
    >
      <defs>
        {/* 主渐变 - 青到紫 */}
        <linearGradient id="beeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.cyan} />
          <stop offset="100%" stopColor={colors.purple} />
        </linearGradient>
        
        {/* 翅膀渐变 - 更淡 */}
        <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.cyan} stopOpacity="0.4" />
          <stop offset="100%" stopColor={colors.purple} stopOpacity="0.4" />
        </linearGradient>
        
        {/* 影子渐变 */}
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.shadow} stopOpacity="0.15" />
          <stop offset="100%" stopColor={colors.shadow} stopOpacity="0" />
        </radialGradient>
        
        {/* 蜂蜜色点缀 */}
        <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.honey} />
          <stop offset="100%" stopColor="#FF9500" />
        </linearGradient>
      </defs>
      
      {/* ========== 影子层（多层营造深度） ========== */}
      {/* 最外层淡影 */}
      <ellipse 
        cx="26" cy="26" rx="18" ry="12" 
        fill="url(#shadowGrad)" 
        transform="rotate(-20 26 26)"
      />
      {/* 中层影子 */}
      <ellipse 
        cx="25" cy="25" rx="15" ry="10" 
        fill="none" 
        stroke={colors.shadow}
        strokeWidth="1"
        opacity="0.1"
        transform="rotate(-20 25 25)"
      />
      
      {/* ========== 翅膀（一大一小，不对称） ========== */}
      {/* 左上大翅膀 - 透明感 */}
      <ellipse 
        cx="10" cy="16" rx="9" ry="6" 
        fill="url(#wingGrad)" 
        transform="rotate(-30 10 16)"
      />
      {/* 右上小翅膀 - 点缀蜂蜜色 */}
      <ellipse 
        cx="38" cy="18" rx="6" ry="4" 
        fill="url(#wingGrad)" 
        transform="rotate(20 38 18)"
      />
      
      {/* ========== 蜜蜂身体（收腰8字形 = 隐藏S） ========== */}
      {/* 身体外轮廓 - 收腰设计 */}
      <path 
        d={`
          M 24 8
          C 32 8, 36 14, 36 20
          C 36 24, 34 26, 32 27
          C 34 28, 36 30, 36 34
          C 36 40, 32 44, 24 44
          C 16 44, 12 40, 12 34
          C 12 30, 14 28, 16 27
          C 14 26, 12 24, 12 20
          C 12 14, 16 8, 24 8
          Z
        `}
        fill="none"
        stroke="url(#beeGrad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* ========== 条纹（蜜蜂特征 + 对比） ========== */}
      {/* 上半部分条纹 - 深色系 */}
      <path 
        d="M 14 18 Q 24 16 34 18" 
        stroke="#1a1a2e" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M 13 23 Q 24 21 35 23" 
        stroke="#1a1a2e" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* 腰部连接处 - 蜂蜜色点缀 */}
      <circle cx="24" cy="27" r="2.5" fill="url(#honeyGrad)" />
      
      {/* 下半部分条纹 */}
      <path 
        d="M 14 32 Q 24 30 34 32" 
        stroke="#1a1a2e" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M 16 37 Q 24 35 32 37" 
        stroke="#1a1a2e" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* ========== 头部细节 ========== */}
      {/* 眼睛 - 简化为两个小圆点 */}
      <circle cx="20" cy="13" r="1.5" fill="url(#beeGrad)" />
      <circle cx="28" cy="13" r="1.5" fill="url(#beeGrad)" />
      
      {/* 触角 - 简化为小圆点 */}
      <circle cx="17" cy="10" r="1" fill={colors.honey} opacity="0.8" />
      <circle cx="31" cy="10" r="1" fill={colors.honey} opacity="0.8" />
      
      {/* ========== 尾针 ========== */}
      <path 
        d="M 24 44 L 24 48" 
        stroke="url(#beeGrad)" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <circle cx="24" cy="49" r="1.5" fill={colors.honey} />
      
      {/* ========== 隐含的S曲线（装饰性） ========== */}
      <path 
        d="M 30 12 Q 24 27 30 42" 
        fill="none"
        stroke={colors.cyan}
        strokeWidth="0.5"
        opacity="0.3"
        strokeDasharray="2 2"
      />
    </svg>
  );

  if (isIconOnly) {
    return <LogoSVG />;
  }

  return (
    <div className="flex items-center gap-3">
      <LogoSVG />
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold tracking-tight text-text-primary leading-none ${isAdmin ? 'text-base' : 'text-base'}`}>
              Shadow<span className="text-neon-cyan">-</span>Bees
            </span>
            {/* 版本号标签 */}
            {showVersion && !isAdmin && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                {version}
              </span>
            )}
          </div>
          <span className={`text-text-secondary mt-0.5 leading-none ${isAdmin ? 'text-[10px] text-text-muted' : 'text-[10px]'}`}>
            {isAdmin ? 'SaaS管理后台系统' : '酒店AI智能管理专家'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 小型 Logo（用于折叠菜单等场景）
 */
export function LogoSmall({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <defs>
        <linearGradient id="smallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      {/* 简化的蜜蜂身体 */}
      <path 
        d="M24 10 C30 10 34 15 34 20 C34 24 32 26 30 27 C32 28 34 30 34 34 C34 39 30 42 24 42 C18 42 14 39 14 34 C14 30 16 28 18 27 C16 26 14 24 14 20 C14 15 18 10 24 10 Z"
        fill="none"
        stroke="url(#smallGrad)"
        strokeWidth="2.5"
      />
      {/* 简化条纹 */}
      <path d="M15 19 h18 M14 24 h20 M15 33 h18" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
      {/* 翅膀 */}
      <ellipse cx="10" cy="16" rx="7" ry="4" fill="#00D4FF" opacity="0.3" transform="rotate(-30 10 16)" />
      <ellipse cx="38" cy="18" rx="5" ry="3" fill="#00D4FF" opacity="0.3" transform="rotate(20 38 18)" />
      {/* 蜂蜜点缀 */}
      <circle cx="24" cy="27" r="2" fill="#FFB800" />
    </svg>
  );
}

/**
 * 登录页大 Logo
 */
export function LogoLarge({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <defs>
        <linearGradient id="largeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="largeWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="largeShadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* 大影子 */}
      <ellipse cx="26" cy="26" rx="19" ry="13" fill="url(#largeShadowGrad)" transform="rotate(-20 26 26)" />
      
      {/* 翅膀 */}
      <ellipse cx="10" cy="16" rx="10" ry="7" fill="url(#largeWingGrad)" transform="rotate(-30 10 16)" />
      <ellipse cx="38" cy="18" rx="7" ry="5" fill="url(#largeWingGrad)" transform="rotate(20 38 18)" />
      
      {/* 身体 */}
      <path 
        d="M24 8 C32 8 36 14 36 20 C36 24 34 26 32 27 C34 28 36 30 36 34 C36 40 32 44 24 44 C16 44 12 40 12 34 C12 30 14 28 16 27 C14 26 12 24 12 20 C12 14 16 8 24 8 Z"
        fill="none"
        stroke="url(#largeGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
      
      {/* 条纹 */}
      <path d="M14 18 Q24 16 34 18" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M13 23 Q24 21 35 23" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="27" r="2.5" fill="#FFB800" />
      <path d="M14 32 Q24 30 34 32" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M16 37 Q24 35 32 37" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      
      {/* 眼睛 */}
      <circle cx="20" cy="13" r="1.5" fill="url(#largeGrad)" />
      <circle cx="28" cy="13" r="1.5" fill="url(#largeGrad)" />
      
      {/* 触角 */}
      <circle cx="17" cy="10" r="1" fill="#FFB800" />
      <circle cx="31" cy="10" r="1" fill="#FFB800" />
      
      {/* 尾针 */}
      <path d="M24 44 L24 48" stroke="url(#largeGrad)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="49" r="1.5" fill="#FFB800" />
    </svg>
  );
}

export default Logo;
