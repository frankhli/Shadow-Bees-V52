/**
 * Shadow-Bees V52 - 科技风图标系统
 * Cyberpunk / Neon 风格统一图标映射
 */

import {
  Flame,
  Crown,
  Heart,
  Mic,
  Wallet,
  AlertTriangle,
  HelpCircle,
  CreditCard,
  FileText,
  TrendingDown,
  TrendingUp,
  Target,
  Zap,
  Lock,
  User,
  Briefcase,
  Bot,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// 科技风配色系统
// ============================================
export const neonColors = {
  cyan: '#00F0FF',      // 主色 - 霓虹青
  purple: '#A855F7',    // 辅助 - 电光紫
  pink: '#FF0080',      // 强调 - 赛博粉
  yellow: '#FFD700',    // 警示 - 霓虹金
  red: '#FF4444',       // 危险 - 警报红
  green: '#00E396',     // 成功 - 毒液绿
  orange: '#FF6B35',    // 警告 - 熔岩橙
  blue: '#3B82F6',      // 信息 - 电光蓝
};

// ============================================
// 内容模板图标
// ============================================
export const templateIcons: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  urgent: { 
    icon: Flame, 
    color: neonColors.red, 
    bgColor: 'rgba(255, 68, 68, 0.15)' 
  },
  value: { 
    icon: Crown, 
    color: neonColors.yellow, 
    bgColor: 'rgba(255, 215, 0, 0.15)' 
  },
  story: { 
    icon: Heart, 
    color: neonColors.pink, 
    bgColor: 'rgba(255, 0, 128, 0.15)' 
  },
  event: { 
    icon: Mic, 
    color: neonColors.purple, 
    bgColor: 'rgba(168, 85, 247, 0.15)' 
  },
};

// ============================================
// 客服问题类型图标
// ============================================
export const issueTypeIcons: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  bargain: { 
    icon: Wallet, 
    color: neonColors.yellow, 
    bgColor: 'rgba(255, 215, 0, 0.15)',
    label: '议价' 
  },
  complaint: { 
    icon: AlertTriangle, 
    color: neonColors.red, 
    bgColor: 'rgba(255, 68, 68, 0.15)',
    label: '投诉' 
  },
  inquiry: { 
    icon: HelpCircle, 
    color: neonColors.cyan, 
    bgColor: 'rgba(0, 240, 255, 0.15)',
    label: '咨询' 
  },
  refund: { 
    icon: CreditCard, 
    color: neonColors.purple, 
    bgColor: 'rgba(168, 85, 247, 0.15)',
    label: '退款' 
  },
  other: { 
    icon: FileText, 
    color: neonColors.blue, 
    bgColor: 'rgba(59, 130, 246, 0.15)',
    label: '其他' 
  },
};

// ============================================
// 竞品档次图标
// ============================================
export const tierIcons: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string; desc: string }> = {
  economy: { 
    icon: TrendingDown, 
    color: neonColors.green, 
    bgColor: 'rgba(0, 227, 150, 0.15)',
    label: '低档竞品',
    desc: '经济型酒店'
  },
  comfort: { 
    icon: Target, 
    color: neonColors.cyan, 
    bgColor: 'rgba(0, 240, 255, 0.15)',
    label: '同档竞品',
    desc: '舒适型酒店'
  },
  premium: { 
    icon: TrendingUp, 
    color: neonColors.purple, 
    bgColor: 'rgba(168, 85, 247, 0.15)',
    label: '高档竞品',
    desc: '高端/豪华酒店'
  },
};

// ============================================
// 库存状态图标
// ============================================
export const inventoryStatusIcons: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  locked: { icon: Lock, color: neonColors.red, label: '已关房' },
  hot: { icon: Zap, color: neonColors.yellow, label: '热销中' },
};

// ============================================
// 客户头像图标（替代emoji）
// ============================================
export const avatarIcons: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  male: { icon: User, color: neonColors.cyan, bgColor: 'rgba(0, 240, 255, 0.2)' },
  female: { icon: User, color: neonColors.pink, bgColor: 'rgba(255, 0, 128, 0.2)' },
  business: { icon: Briefcase, color: neonColors.purple, bgColor: 'rgba(168, 85, 247, 0.2)' },
  ai: { icon: Bot, color: neonColors.green, bgColor: 'rgba(0, 227, 150, 0.2)' },
};

// ============================================
// 通用科技风图标组件props
// ============================================
export const iconProps = {
  strokeWidth: 1.5,
  size: 20,
};

export const largeIconProps = {
  strokeWidth: 1.5,
  size: 28,
};

export const smallIconProps = {
  strokeWidth: 2,
  size: 16,
};
