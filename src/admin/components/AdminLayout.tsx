/**
 * Admin Layout - 运营后台布局 (UX增强版)
 */

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  ShoppingCart,
  Database,
  CheckCircle,
  AlertOctagon,
  Info,
  UserCircle,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { useAdminTicketSync } from '@/hooks/useTicketSync';
import { useAdminRefundSync } from '@/hooks/useRefundSync';
import { useAdminDataSync } from '@/hooks/useDataSync';
import { ToastContainer as LegacyToastContainer, useToastStore } from './ui';
import { Logo, LogoSmall, LogoLarge } from '../../components/Logo';
import { Tooltip } from '../../components/ui/Tooltip';
import { SystemLogin } from '../../components/SystemLogin';
import { SystemBootSequence } from '../../components/SystemBootSequence';
import { useChannelMessage } from '@/shared/channel';
import type { RealtimeMetricsPayload } from '@/shared/channel';

// UX 增强组件
import {
  CommandPalette,
  ShortcutHelp,
  ToastContainer,
  toast,
} from '@/components/ux';
import {
  useHotkeys,
  useGlobalHotkeys,
} from '@/hooks/useHotkeys';
import { useConfiguredHotkeys } from '@/hooks';

// 导航配置 - 层级化分类，与酒店端保持一致
interface NavChild {
  label: string;
  path: string;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  path: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: '数据与运营中心',
    path: '/',
  },
  {
    id: 'customers',
    icon: Users,
    label: '客户与服务中心',
    path: '/customers',
    children: [
      { label: '客户列表', path: '/customers' },
      { label: '客户成功', path: '/customers?tab=success' },
      { label: '培训管理', path: '/training' },
    ],
  },
  {
    id: 'algorithm-data',
    icon: Database,
    label: '数据与算法中心',
    path: '/warehouse',
    children: [
      { label: '数据仓库', path: '/warehouse' },
      { label: '算法与定价洞察', path: '/pricing-insights' },
      { label: 'AI知识沉淀', path: '/ai-knowledge' },
    ],
  },
  {
    id: 'monitor',
    icon: AlertTriangle,
    label: '异常与监控中心',
    path: '/anomalies',
    children: [
      { label: '异常监控', path: '/anomalies' },
      { label: '风控管理', path: '/risk' },
      { label: '订单监控', path: '/orders' },
      { label: '内容审核', path: '/content' },
      { label: '库存监控', path: '/inventory' },
      { label: '定价监控', path: '/pricing' },
      { label: '策略管控', path: '/strategy' },
    ],
  },
  {
    id: 'channels',
    icon: FileText,
    label: '渠道与运营中心',
    path: '/channels',
    children: [
      { label: '渠道效能', path: '/channels' },
      { label: '渠道分析', path: '/channels/analytics' },
      { label: '渠道对比', path: '/channels/compare' },
    ],
  },
  {
    id: 'support',
    icon: Bell,
    label: '工单与支持中心',
    path: '/support',
    children: [
      { label: '工单列表', path: '/support' },
      { label: 'SLA监控', path: '/support/sla' },
      { label: '工单分析', path: '/support/analytics' },
    ],
  },
  {
    id: 'finance',
    icon: ShoppingCart,
    label: '财务与结算中心',
    path: '/finance',
    children: [
      { label: '财务概览', path: '/finance' },
      { label: '对账管理', path: '/finance/reconciliation' },
      { label: '结算记录', path: '/finance/settlement' },
      { label: '发票管理', path: '/finance/invoice' },
    ],
  },
  {
    id: 'system',
    icon: Settings,
    label: '系统与配置中心',
    path: '/system',
    children: [
      { label: '基础配置', path: '/system?tab=basic' },
      { label: '配置下发', path: '/system?tab=config' },
      { label: '用户权限', path: '/system?tab=users' },
      { label: '通知设置', path: '/system?tab=notifications' },
      { label: '快捷键', path: '/system?tab=shortcuts' },
      { label: '日志审计', path: '/system?tab=logs' },
    ],
  },
];

// 通知类型配置
const notificationConfig = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  error: { icon: AlertOctagon, color: 'text-red-400', bgColor: 'bg-red-400/10' },
  info: { icon: Info, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
};

// 键盘快捷键和命令面板包装器
function UXEnhancements() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // 启动全局快捷键监听
  useGlobalHotkeys();
  
  // 使用配置的快捷键
  useConfiguredHotkeys({ appType: 'admin' });

  // 命令面板和帮助快捷键（这些需要直接控制 UI 状态）
  useHotkeys([
    {
      key: 'k',
      ctrl: true,
      description: '打开命令面板',
      handler: () => {
        setIsCommandPaletteOpen(true);
        return true;
      },
    },
  ], []);
  
  // 监听帮助快捷键事件
  useEffect(() => {
    const handleOpenHelp = () => setIsShortcutHelpOpen(true);
    window.addEventListener('open-shortcut-help', handleOpenHelp);
    return () => window.removeEventListener('open-shortcut-help', handleOpenHelp);
  }, []);

  return (
    <>
      {/* 命令面板 */}
      <CommandPalette
        appType="admin"
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)}
      />

      {/* 快捷键帮助 */}
      <ShortcutHelp
        appType="admin"
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
      />
    </>
  );
}

export default function AdminLayout() {
  // 初始化工单同步
  useAdminTicketSync();
  
  // 初始化退款同步
  useAdminRefundSync();
  
  // 初始化数据仓库同步（订单、内容、改价事件）
  useAdminDataSync();
  
  // 初始化AI知识收集器（监听酒店端AI事件）
  useEffect(() => {
    import('@/admin/services/aiKnowledgeCollector').then(() => {
      // 收集器在import时会自动初始化并监听BroadcastChannel
      console.log('[AdminLayout] AI Knowledge Collector initialized');
    });
  }, []);
  
  // 启动流程状态: 'boot' -> 'login' -> null(进入系统)
  const [authState, setAuthState] = useState<'boot' | 'login' | null>('boot');
  
  // 检查是否已登录
  useEffect(() => {
    try {
      const isLoggedIn = sessionStorage.getItem('sb_admin_logged_in');
      if (isLoggedIn) {
        setAuthState(null);
      }
    } catch (e) {
      console.warn('Storage not available');
    }
  }, []);

  // 启动动画完成
  const handleBootComplete = () => {
    setAuthState('login');
  };

  // 处理登录成功
  const handleLogin = (userId: string, role: string) => {
    try {
      sessionStorage.setItem('sb_admin_logged_in', 'true');
      sessionStorage.setItem('sb_admin_user_id', userId);
      sessionStorage.setItem('sb_admin_user_role', role);
    } catch (e) {
      console.warn('Storage not available');
    }
    
    // 根据登录用户名找到对应的系统用户并切换
    const targetUser = systemUsers.find(u => u.username === userId && u.status === 'active');
    if (targetUser) {
      switchUser(targetUser.id);
    }
    
    setAuthState(null);
    toast.success('登录成功', '欢迎回到管理后台');
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // 导航展开状态 - 与酒店端一致
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  
  const { adminUser, systemUsers, unreadCount, notifications, markNotificationRead, markAllNotificationsRead, logout, switchUser, realtimeMetrics, addRealtimeMetrics, selectedTimeRange } = useAdminStore();
  
  // 监听酒店端实时推演数据并同步到 store
  useChannelMessage<RealtimeMetricsPayload>('REALTIME_METRICS', (payload) => {
    console.log('[AdminLayout] Received realtime metrics:', payload);
    // 自定义时间范围不接收实时数据，使用 today 作为默认
    const timeRange = selectedTimeRange === 'custom' ? 'today' : selectedTimeRange;
    addRealtimeMetrics({
      gmv: payload.metrics.gmv || 0,
      orders: payload.metrics.orders || 0,
      timeRange,
      hotelId: payload.hotelId,
    });
  });
  const { toasts, removeToast } = useToastStore();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭通知面板和用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // 清除登录状态
    try {
      sessionStorage.removeItem('sb_admin_logged_in');
      sessionStorage.removeItem('sb_admin_user_id');
      sessionStorage.removeItem('sb_admin_user_role');
    } catch (e) {
      console.warn('Storage not available');
    }
    logout();
    setUserMenuOpen(false);
    // 回到启动动画，然后再进入登录页面
    setAuthState('boot');
  };
  
  const handleSwitchUser = (_userId: string) => {
    // 清除登录状态，重新登录
    try {
      sessionStorage.removeItem('sb_admin_logged_in');
      sessionStorage.removeItem('sb_admin_user_id');
      sessionStorage.removeItem('sb_admin_user_role');
    } catch (e) {
      console.warn('Storage not available');
    }
    setUserMenuOpen(false);
    // 回到启动动画，然后再进入登录页面
    setAuthState('boot');
  };

  // 处理通知点击
  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markNotificationRead(notification.id);
    setNotificationsOpen(false);
    
    // 根据通知类型跳转到对应页面
    if (notification.hotelId) {
      if (notification.title.includes('库存')) {
        navigate('/inventory');
      } else if (notification.title.includes('定价') || notification.title.includes('价格')) {
        navigate('/pricing');
      } else if (notification.title.includes('内容')) {
        navigate('/content');
      } else if (notification.title.includes('工单')) {
        navigate('/support');
      } else {
        navigate('/customers');
      }
    }
  };

  // 获取时间显示
  const getTimeDisplay = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  // 登录覆盖层
  const LoginOverlay = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, adminUser: currentUser } = useAdminStore();

    // 如果已登录，不显示覆盖层
    if (currentUser) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      setTimeout(() => {
        const result = login(username, password);
        if (!result.success) {
          setError(result.message || '登录失败');
        }
        setLoading(false);
      }, 500);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] bg-[#0B0F19] flex items-center justify-center"
      >
        <div className="w-full max-w-md p-8">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-5 w-fit">
              <LogoLarge size={112} />
            </div>
            {/* 纯文字标志 */}
            <h1 className="text-3xl font-light tracking-wide text-white">
              Shadow<span className="text-neon-cyan font-normal">-</span>Bees
            </h1>
            <p className="text-gray-500 mt-2 text-sm">SaaS管理后台系统</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">用户名</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full pl-10 pr-4 py-3 bg-[#151B2B] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-neon-cyan focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">密码</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="w-full pl-10 pr-4 py-3 bg-[#151B2B] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-neon-cyan focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 测试账号提示 */}
          <div className="mt-8 p-4 bg-[#151B2B] rounded-xl">
            <p className="text-sm text-gray-400 mb-3">测试账号（密码：用户名 + 123）：</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <code className="px-2 py-0.5 bg-gray-800 rounded">admin</code>
                <span>超级管理员</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <code className="px-2 py-0.5 bg-gray-800 rounded">op01</code>
                <span>运营小李</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <code className="px-2 py-0.5 bg-gray-800 rounded">finance01</code>
                <span>财务小张</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <code className="px-2 py-0.5 bg-gray-800 rounded">support01</code>
                <span>客服小王</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* 系统启动动画 */}
      <SystemBootSequence
        type="admin"
        isVisible={authState === 'boot'}
        onComplete={handleBootComplete}
      />
      
      {/* 系统登录页面 */}
      <SystemLogin
        type="admin"
        isVisible={authState === 'login'}
        onLogin={handleLogin}
      />
      
      <LoginOverlay />
      <div className="min-h-screen bg-[#0B0F19] text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-[#151B2B] border-r border-gray-800 flex flex-col"
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center px-4 border-b border-gray-800">
          {sidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <Logo size={40} showText={true} variant="admin" />
            </motion.div>
          ) : (
            <div className="mx-auto">
              <LogoSmall size={36} />
            </div>
          )}
        </div>

        {/* Navigation - 层级化可折叠菜单 */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedNav === item.id;
            // 检查当前路径是否匹配该菜单或其子菜单
            const currentFullPath = location.pathname + location.search;
            const currentHasQuery = location.search !== '';
            
            // 辅助函数：检查子菜单是否激活（考虑最精确匹配）
            const checkChildActive = (child: NavChild, allChildren: NavChild[]) => {
              const childPath = child.path;
              const childHasQuery = childPath.includes('?');
              const childBasePath = childPath.split('?')[0];
              
              // 1. 带查询参数的精确匹配
              if (childHasQuery) {
                return currentFullPath === childPath;
              }
              
              // 2. 不带查询参数的精确匹配
              if (!currentHasQuery && location.pathname === childBasePath) {
                return true;
              }
              
              // 3. 子路由匹配：但只有当没有更精确的子菜单匹配时才成立
              if (location.pathname.startsWith(childBasePath + '/')) {
                // 检查是否有其他子菜单更精确地匹配当前路径
                const hasMoreSpecificMatch = allChildren.some(otherChild => {
                  if (otherChild.path === childPath) return false;
                  const otherBasePath = otherChild.path.split('?')[0];
                  // 如果其他子菜单的路径是当前路径的前缀，且更长（更精确）
                  if (location.pathname.startsWith(otherBasePath + '/') || 
                      location.pathname === otherBasePath) {
                    return otherBasePath.length > childBasePath.length;
                  }
                  return false;
                });
                return !hasMoreSpecificMatch;
              }
              
              return false;
            };
            
            // 检查是否有子菜单被激活
            const hasActiveChild = hasChildren && item.children!.some(child => 
              checkChildActive(child, item.children!)
            );
            
            // 父菜单激活状态
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path + '/')) ||
              hasActiveChild;
            
            return (
              <div key={item.id}>
                {/* 主菜单项 */}
                <button
                  onClick={() => {
                    if (hasChildren && sidebarOpen) {
                      setExpandedNav(isExpanded ? null : item.id);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-neon-cyan/10 text-neon-cyan border-l-2 border-neon-cyan'
                      : 'text-gray-400 hover:text-white hover:bg-[#1E2538]'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon size={20} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm text-left">{item.label}</span>
                      {hasChildren && (
                        <ChevronRight
                          size={16}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                    </>
                  )}
                </button>
                
                {/* 子菜单 - 侧边栏收起时不显示 */}
                {hasChildren && isExpanded && sidebarOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 mt-1 space-y-1 overflow-hidden"
                  >
                    {item.children!.map((child) => {
                      // 精确匹配子菜单路径（考虑最精确匹配原则）
                      const currentFullPath = location.pathname + location.search;
                      const currentHasQuery = location.search !== '';
                      const childPath = child.path;
                      const childHasQuery = childPath.includes('?');
                      const childBasePath = childPath.split('?')[0];
                      const allChildren = item.children!;
                      
                      let isChildActive = false;
                      
                      if (childHasQuery) {
                        // 带查询参数的子菜单：必须完整匹配
                        isChildActive = currentFullPath === childPath;
                      } else if (!currentHasQuery && location.pathname === childBasePath) {
                        // 不带查询参数的精确匹配
                        isChildActive = true;
                      } else if (location.pathname.startsWith(childBasePath + '/')) {
                        // 子路由匹配：但只有当没有更精确的子菜单匹配时才成立
                        const hasMoreSpecificMatch = allChildren.some(otherChild => {
                          if (otherChild.path === childPath) return false;
                          const otherBasePath = otherChild.path.split('?')[0];
                          if (location.pathname.startsWith(otherBasePath + '/') || 
                              location.pathname === otherBasePath) {
                            return otherBasePath.length > childBasePath.length;
                          }
                          return false;
                        });
                        isChildActive = !hasMoreSpecificMatch;
                      }
                      
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={(e) => e.stopPropagation()}
                          className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                            isChildActive
                              ? 'text-neon-cyan bg-neon-cyan/5'
                              : 'text-gray-400 hover:text-white hover:bg-[#1E2538]/50'
                          }`}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-3 border-t border-gray-800">
          <Tooltip content={sidebarOpen ? "收起侧边栏" : "展开侧边栏"} position="right">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-[#1E2538] rounded-lg transition-all"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </Tooltip>
        </div>
        

      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-[#151B2B] border-b border-gray-800 flex items-center justify-between px-6">
          {/* Search */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索客户、工单、内容... (Cmd+K 打开命令面板)"
              className="w-full pl-10 pr-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* 实时数据接入指示器 */}
            {/* 实时数据接入指示器 - 根据当前时间范围显示 */}
            {(() => {
              // 自定义时间范围显示本月实时数据
              const realtimeKey = selectedTimeRange === 'today' ? 'today' : selectedTimeRange === 'week' ? 'thisWeek' : 'thisMonth';
              const currentRealtime = realtimeMetrics[realtimeKey];
              return currentRealtime.orders > 0 ? (
                <Tooltip content={`实时数据: ¥${currentRealtime.gmv.toLocaleString()} / ${currentRealtime.orders}单`} position="bottom">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-lg cursor-pointer hover:bg-neon-green/20 transition-colors">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
                    </span>
                    <span className="text-xs text-neon-green whitespace-nowrap">实时数据接入中</span>
                  </div>
                </Tooltip>
              ) : null;
            })()}
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <Tooltip content={`通知中心${unreadCount > 0 ? ` (${unreadCount}条未读)` : ''}`} position="bottom">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-gray-400 hover:text-white hover:bg-[#1E2538] rounded-lg transition-all"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-neon-red text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-[#151B2B] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                      <div>
                        <h3 className="font-medium">通知中心</h3>
                        <p className="text-xs text-gray-400">
                          {unreadCount > 0 ? `${unreadCount}条未读` : '全部已读'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllNotificationsRead()}
                          className="text-xs text-neon-cyan hover:underline"
                        >
                          全部已读
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => {
                          const config = notificationConfig[notification.type];
                          const Icon = config.icon;
                          
                          return (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full p-4 text-left hover:bg-[#1E2538] transition-all border-b border-gray-800 last:border-b-0 ${
                                !notification.read ? 'bg-[#1E2538]/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                                  <Icon size={16} className={config.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium text-sm ${!notification.read ? 'text-white' : 'text-gray-400'}`}>
                                      {notification.title}
                                    </p>
                                    {!notification.read && (
                                      <span className="w-2 h-2 bg-neon-cyan rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {getTimeDisplay(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell size={32} className="mx-auto mb-2 opacity-30" />
                          <p>暂无通知</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-800 bg-[#0B0F19]">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/system');
                        }}
                        className="w-full text-center text-sm text-gray-400 hover:text-white py-2"
                      >
                        通知设置
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 hover:bg-[#1E2538] rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {adminUser?.name.charAt(0)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{adminUser?.name}</p>
                  <p className="text-xs text-gray-400">
                    {adminUser?.role === 'super' ? '超级管理员' : adminUser?.role === 'finance' ? '财务' : adminUser?.role === 'support' ? '客服' : '运营'}
                  </p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-[#151B2B] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* 当前用户信息 */}
                    <div className="p-4 border-b border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                          <span className="text-white font-bold">
                            {adminUser?.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{adminUser?.name}</p>
                          <p className="text-xs text-gray-400">{adminUser?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* 切换用户 */}
                    <div className="max-h-48 overflow-y-auto">
                      <p className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">切换用户</p>
                      {systemUsers
                        .filter((u) => u.status === 'active' && u.id !== adminUser?.id)
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSwitchUser(user.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1E2538] transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <span className="text-sm">{user.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.role === 'super' ? '超级管理员' : user.role === 'finance' ? '财务' : user.role === 'support' ? '客服' : '运营'}</p>
                            </div>
                            <RefreshCw size={14} className="text-gray-500" />
                          </button>
                        ))}
                    </div>

                    {/* 退出登录 */}
                    <div className="p-2 border-t border-gray-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-6">
              <Outlet />
            </div>
            {/* 底部 Footer - 不明显的 DOOMESEE 归属 */}
            <footer className="px-6 py-4 border-t border-gray-800/30">
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span>© 2026 Shadow-Bees</span>
                <div className="flex items-center gap-2">
                  <span>by</span>
                  <img src="/logo.jpg" alt="" className="h-3 w-auto opacity-50" />
                  <span className="text-gray-500">DOOMESEE</span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* 旧版 Toast 容器（保持兼容） */}
      <LegacyToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 新版 Toast 容器 */}
      <ToastContainer position="top-right" />
      
      {/* UX 增强功能 */}
      <UXEnhancements />
    </div>
    </>
  );
}
