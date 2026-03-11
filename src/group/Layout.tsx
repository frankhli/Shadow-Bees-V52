/**
 * Shadow-Bees V52 - 集团视角布局组件（简化版）
 * 5个核心入口：数据总览、AI效能、门店运营、策略中心、系统设置
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Building2,
  BarChart3,
  Rocket,
  Settings,
  ChevronRight,
  Users,
  LogOut,
  Menu,
  X,
  Activity,
  CalendarDays,
  Receipt,
  TicketCheck,
} from 'lucide-react';
import { useGroupStore } from './stores/groupStore';
import { Logo } from '@/components/Logo';
import { ToastProvider } from './components/Toast';
import { GroupChannelReceiver } from './components/GroupChannelReceiver';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  path: string;
  description?: string;
}

// 核心导航 - 8个入口（分层组织）
const navItems: NavItem[] = [
  // 📊 经营视图
  {
    id: 'overview',
    icon: LayoutDashboard,
    label: '每日简报',
    path: '/',
    description: 'CEO仪表盘',
  },
  {
    id: 'ai',
    icon: Brain,
    label: 'AI价值',
    path: '/ai',
    description: 'ROI计算与价值证明',
  },
  {
    id: 'hotels',
    icon: Building2,
    label: '门店全景',
    path: '/hotels',
    description: '多维度门店管理',
  },
  // 📈 市场与渠道
  {
    id: 'channels',
    icon: BarChart3,
    label: '渠道分析',
    path: '/channels',
    description: '小红书/闲鱼/微信效能',
  },
  {
    id: 'strategy',
    icon: Rocket,
    label: '策略中心',
    path: '/strategy',
    description: '策略执行与市场情报',
  },
  // ⚙️ 运营与资源
  {
    id: 'operations',
    icon: Activity,
    label: '运营中心',
    path: '/operations',
    description: '门店健康度与培训追踪',
  },
  {
    id: 'tickets',
    icon: TicketCheck,
    label: '集团工单',
    path: '/tickets',
    description: '跨店工单分派与SLA监控',
  },
  {
    id: 'inventory',
    icon: CalendarDays,
    label: '库存日历',
    path: '/inventory',
    description: '房态总览与库存预警',
  },
  {
    id: 'finance',
    icon: Receipt,
    label: '财务合规',
    path: '/finance',
    description: '发票税务与审计跟踪',
  },
  // 🔧 系统
  {
    id: 'settings',
    icon: Settings,
    label: '系统设置',
    path: '/settings',
    description: '组织与权限',
  },
];

const sidebarVariants = {
  expanded: { width: 240 },
  collapsed: { width: 72 },
};

const navItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentGroup, currentUser } = useGroupStore();

  const handleLogout = () => {
    sessionStorage.removeItem('sb_group_logged_in');
    sessionStorage.removeItem('sb_group_user_id');
    sessionStorage.removeItem('sb_group_user_role');
    navigate('/');
    window.location.reload();
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* 桌面端侧边栏 */}
      <motion.aside
        variants={sidebarVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        initial="expanded"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-bg-secondary border-r border-border-color z-20"
      >
        {/* Logo区域 */}
        <div className="h-[72px] border-b border-border-color flex items-center px-4 overflow-hidden">
          {isExpanded ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size={40} showText={false} />
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-semibold tracking-tight text-white text-[15px]">
                    Shadow<span className="text-neon-purple">-</span>Bees
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30 flex-shrink-0">
                    集团版
                  </span>
                </div>
                <span className="text-[11px] text-text-secondary mt-1">集团智能管理平台</span>
              </div>
            </div>
          ) : (
            <Logo size={40} showText={false} />
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <motion.div
                key={item.id}
                variants={navItemVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                    ${active 
                      ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple' 
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-neon-purple' : ''}`} />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium whitespace-nowrap">{item.label}</p>
                        <p className="text-[10px] text-text-muted truncate">{item.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-border-color space-y-2">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 rounded-xl bg-surface-hover"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium truncate">{currentUser?.name}</div>
                    <div className="text-xs text-text-muted truncate">{currentUser?.role}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-xl transition-colors"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
            {isExpanded && <span>收起菜单</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-neon-red hover:bg-neon-red/5 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isExpanded && <span>退出登录</span>}
          </button>
        </div>
      </motion.aside>

      {/* 移动端顶部栏 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bg-secondary border-b border-border-color z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Logo size={36} showText={false} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold">Shadow-Bees</span>
              <span className="px-1 py-0.5 text-[8px] font-medium rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30">
                集团版
              </span>
            </div>
            <div className="text-xs text-text-muted">{currentGroup?.name}</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-surface-hover"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-bg-secondary z-20 overflow-y-auto p-4"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl mb-2
                    ${active 
                      ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30' 
                      : 'text-text-secondary'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <span className="font-medium block">{item.label}</span>
                    <span className="text-xs text-text-muted">{item.description}</span>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 - 带页面过渡动画 */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-16">
        {/* 管理端同步接收器 */}
        <GroupChannelReceiver 
          enabled={true}
          autoNavigate={true}
          showNotification={true}
        />
        <ToastProvider>
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ 
                  duration: 0.35, 
                  ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuad
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </ToastProvider>
      </main>
    </div>
  );
}
