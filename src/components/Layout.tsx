/**
 * Shadow-Bees V52 - 布局组件
 * 完整功能版 - 移除顶部房型切换
 */

import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Radar,
  DollarSign,
  Rocket,
  MessageCircle,
  Package,
  Settings,
  ChevronRight,
  Building2,
  Clock,
  History,
  Gamepad2,
  Mountain,
  Palmtree,
  Landmark,
  Zap,
  Activity,
  TrendingDown,
  User,
  Ticket,
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { useHotelTicketSync } from '@/hooks/useTicketSync';
import { useHotelRefundSync } from '@/hooks/useRefundSync';
import { DateRangeModal } from '@/components/DateRangeModal';
import { Logo } from '@/components/Logo';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { Tooltip } from '@/components/ui/Tooltip';
import { themeColors, modeDetails } from '@/utils/helpers';
import { hotels } from '@/data/hotels';
import type { TimeMode } from '@/stores/unifiedStore';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavChild {
  label: string;
  path: string;
  isCustom?: boolean;
  children?: NavChild[];
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  path: string;
  children?: NavChild[];
}

// 导航配置
const navItems: NavItem[] = [
  { 
    id: 'overview', 
    icon: LayoutDashboard, 
    label: '经营概览', 
    path: '/',
    children: [
      { label: '今日', path: '/?range=today' },
      { label: '本周', path: '/?range=week' },
      { label: '本月', path: '/?range=month' },
      { label: '自定义日期', path: '/?range=custom', isCustom: true },
    ],
  },
  {
    id: 'market',
    icon: Radar,
    label: '市场情报',
    path: '/market',
    children: [
      { label: '事件情报', path: '/market?tab=events' },
      { label: '竞品分析', path: '/market?tab=competitors' },
    ],
  },
  { 
    id: 'pricing', 
    icon: DollarSign, 
    label: '收益管理', 
    path: '/pricing',
    children: [
      { label: '实时定价', path: '/pricing?tab=platform' },
      { label: '未来预测', path: '/pricing?tab=future' },
      { label: '价格审批', path: '/pricing?tab=approval' },
    ],
  },
  {
    id: 'content',
    icon: Rocket,
    label: '去卖货',
    path: '/content',
    children: [
      { label: '内容工厂', path: '/content' },
      { label: '公域发布', path: '/publish' },
      { label: '私域运营', path: '/private' },
      { label: '风控中心', path: '/risk' },
    ],
  },
  {
    id: 'service',
    icon: MessageCircle,
    label: '客户咨询',
    path: '/service',
    children: [
      { label: 'AI能力演示', path: '/service' },
      { label: '人工工作台', path: '/service/human' },
    ],
  },
  {
    id: 'inventory',
    icon: Package,
    label: '钱货盘点',
    path: '/inventory',
    children: [
      { label: '库存与房态', path: '/inventory' },
      { label: '订单管理', path: '/orders' },
      { label: '财务合规', path: '/finance' },
    ],
  },
  {
    id: 'support',
    icon: Ticket,
    label: '工单支持',
    path: '/support',
  },
  {
    id: 'settings',
    icon: Settings,
    label: '系统设置',
    path: '/settings',
    children: [
      { label: '系统概览', path: '/settings?tab=overview' },
      { label: '酒店初始化', path: '/settings?tab=init' },
      { label: '系统偏好', path: '/settings?tab=preferences' },
      { label: '快捷键', path: '/settings?tab=shortcuts' },
      { label: '数据管理', path: '/settings?tab=data' },
      { label: '账号切换与退出', path: '/settings?tab=user' },
      { label: '权限管理', path: '/settings?tab=permissions' },
      { label: '审计日志', path: '/settings?tab=audit' },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 初始化工单同步
  useHotelTicketSync();
  
  // 初始化退款同步
  useHotelRefundSync();
  
  const { 
    currentHotel, 
    currentTheme, 
    currentMode, 
    timeMode, 
    tempHotels,
    isLoading, // 全局 Loading 状态
    loadingText, // Loading 提示文字
    switchHotel, 
    switchTimeMode,
    currentTime,
    user 
  } = useUnifiedStore();
  
  // 读取系统偏好设置
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('shadowBeesPreferences');
    return saved ? JSON.parse(saved) : {
      sidebarCollapsed: false,
      compactMode: false,
    };
  });
  
  // 监听设置变化（跨标签页）
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'shadowBeesPreferences') {
        const saved = localStorage.getItem('shadowBeesPreferences');
        if (saved) {
          setPreferences(JSON.parse(saved));
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  
  // 监听设置变化（同一标签页内）
  useEffect(() => {
    const handlePreferencesChanged = (e: CustomEvent) => {
      if (e.detail && e.detail.preferences) {
        setPreferences(e.detail.preferences);
      }
    };
    window.addEventListener('preferencesChanged', handlePreferencesChanged as EventListener);
    return () => window.removeEventListener('preferencesChanged', handlePreferencesChanged as EventListener);
  }, []);
  
  // 组合酒店列表（原始 + 临时）
  const allHotels = useMemo(() => [...hotels, ...tempHotels], [tempHotels]);
  
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [expandedChildNav, setExpandedChildNav] = useState<string | null>(null);
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  
  // 日期选择弹窗状态
  const [showDateModal, setShowDateModal] = useState(false);
  const [customNavPath, setCustomNavPath] = useState('');
  
  // 系统更新检测
  const [hasSystemUpdate, setHasSystemUpdate] = useState(false);
  
  useEffect(() => {
    const checkUpdate = () => {
      const pending = localStorage.getItem('sb_remote_config_pending');
      const currentVersion = localStorage.getItem('sb_config_version') || '1.0.0';
      console.log('[Layout] Check update:', { pending: !!pending, currentVersion });
      if (pending) {
        const config = JSON.parse(pending);
        const hasUpdate = config.version !== currentVersion;
        console.log('[Layout] Has update:', hasUpdate, 'new version:', config.version);
        setHasSystemUpdate(hasUpdate);
      } else {
        setHasSystemUpdate(false);
      }
    };
    
    checkUpdate();
    
    // 监听配置推送
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('hotel_config_sync');
      channel.onmessage = (event) => {
        if (event.data.type === 'CONFIG_PUSH') {
          checkUpdate();
        }
      };
    }
    
    // 监听 storage 变化
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sb_remote_config_pending') {
        checkUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    // 轮询检查
    const interval = setInterval(checkUpdate, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const theme = themeColors[currentTheme] || themeColors.cyan;
  const mode = modeDetails[currentMode] || modeDetails.dynamic;

  // 检查路径是否激活（精确匹配）
  const isActive = (path: string) => {
    // 对于带查询参数的路径，只比较路径部分
    const pathWithoutQuery = path.split('?')[0];
    if (location.pathname === pathWithoutQuery) {
      // 如果有查询参数，还需要检查查询参数是否匹配
      if (path.includes('?')) {
        const searchParams = new URLSearchParams(location.search);
        const pathParams = new URLSearchParams(path.split('?')[1] || '');
        // 检查关键参数是否匹配
        for (const [key, value] of pathParams) {
          if (searchParams.get(key) !== value) return false;
        }
        return true;
      }
      return true;
    }
    return false;
  };
  
  // Note: isParentActive function removed - was not used
  
  // 处理导航点击，自定义范围需要弹窗
  const handleNavClick = (child: any) => {
    if (child.isCustom) {
      setCustomNavPath(child.path.split('?')[0]); // 获取基础路径
      setShowDateModal(true);
    }
  };
  
  // 确认自定义日期范围
  const handleCustomDateConfirm = (startDate: string, endDate: string) => {
    navigate(`${customNavPath}?range=custom&start=${startDate}&end=${endDate}`);
  };

  const handleTimeModeChange = (mode: TimeMode) => {
    switchTimeMode(mode);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧导航 */}
      <aside className={`${preferences.sidebarCollapsed ? 'w-20' : 'w-64'} bg-bg-secondary border-r border-border-color flex flex-col transition-all duration-300`}>
        {/* Logo区域 */}
        <div className={`h-[72px] border-b border-border-color flex items-center ${preferences.sidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}>
          <Logo size={40} showText={!preferences.sidebarCollapsed} variant="default" />
        </div>

        {/* 导航菜单 - 层级化可折叠，与管理端保持一致 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            // 展开状态只由用户点击控制，不自动展开
            const isExpanded = expandedNav === item.id;
            // 父菜单高亮只在其路径精确匹配时
            const itemActive = isActive(item.path);

            return (
              <div key={item.id}>
                {/* 主菜单项 */}
                <button
                  onClick={() => {
                    if (hasChildren && !preferences.sidebarCollapsed) {
                      setExpandedNav(isExpanded ? null : item.id);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full flex items-center ${preferences.sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all ${
                    itemActive
                      ? 'bg-neon-cyan/20 text-neon-cyan border-l-2 border-neon-cyan'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                  }`}
                  title={preferences.sidebarCollapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {/* 系统更新红点 */}
                    {item.id === 'settings' && hasSystemUpdate && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  {!preferences.sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {hasChildren && (
                        <ChevronRight
                          size={16}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                      {/* 系统更新徽标 */}
                      {item.id === 'settings' && hasSystemUpdate && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-500 text-text-primary rounded-full">
                          更新
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* 子菜单 - 侧边栏收起时不显示 */}
                {hasChildren && isExpanded && !preferences.sidebarCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 mt-1 space-y-1 overflow-hidden"
                  >
                    {item.children!.map((child) => {
                      const hasGrandChildren = child.children && child.children.length > 0;
                      const isChildExpanded = expandedChildNav === `${item.id}-${child.label}`;
                      // 子菜单高亮只精确匹配当前路径
                      const childActive = isActive(child.path);
                      
                      return (
                        <div key={child.path}>
                          {/* 二级菜单项 */}
                          {hasGrandChildren ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedChildNav(isChildExpanded ? null : `${item.id}-${child.label}`);
                              }}
                              className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                                childActive ? 'text-neon-cyan bg-neon-cyan/15' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                              }`}
                            >
                              <span>{child.label}</span>
                              <ChevronRight
                                size={14}
                                className={`transition-transform duration-200 ${isChildExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          ) : child.isCustom ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavClick(child);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${
                                isActive(child.path) ? 'text-neon-cyan bg-neon-cyan/15' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                              }`}
                            >
                              {child.label}
                            </button>
                          ) : (
                            <Link
                              to={child.path}
                              onClick={(e) => e.stopPropagation()}
                              className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                                isActive(child.path) ? 'text-neon-cyan bg-neon-cyan/15' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                              }`}
                            >
                              {child.label}
                            </Link>
                          )}
                          
                          {/* 三级菜单（子子标签） */}
                          {hasGrandChildren && isChildExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-4 mt-1 space-y-1 overflow-hidden"
                            >
                              {child.children!.map((grandChild: any) => (
                                grandChild.isCustom ? (
                                  <button
                                    key={grandChild.path}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavClick(grandChild);
                                    }}
                                    className={`block w-full text-left px-4 py-1.5 text-xs rounded-lg transition-colors ${
                                      isActive(grandChild.path) ? 'text-neon-cyan bg-neon-cyan/15' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                                    }`}
                                  >
                                    {grandChild.label}
                                  </button>
                                ) : (
                                  <Link
                                    key={grandChild.path}
                                    to={grandChild.path}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`block px-4 py-1.5 text-xs rounded-lg transition-colors ${
                                      isActive(grandChild.path) ? 'text-neon-cyan bg-neon-cyan/15' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                                    }`}
                                  >
                                    {grandChild.label}
                                  </Link>
                                )
                              ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 用户信息 - 点击进入设置的用户切换 */}
        <Link 
          to="/settings?tab=user"
          className={`mx-4 mb-3 p-3 rounded-xl bg-bg-tertiary border border-border-color hover:border-neon-cyan/50 hover:bg-bg-secondary transition-all group ${preferences.sidebarCollapsed ? 'flex justify-center' : ''}`}
          title={preferences.sidebarCollapsed ? `${user.name} (${user.role === 'owner' ? '业主' : user.role === 'manager' ? '店长' : '员工'})` : undefined}
        >
          <div className={`flex items-center ${preferences.sidebarCollapsed ? '' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors flex-shrink-0">
              <User size={20} className="text-neon-cyan" />
            </div>
            {!preferences.sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-text-secondary">
                    {user.role === 'owner' ? '业主' : user.role === 'manager' ? '店长' : '员工'}
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-secondary group-hover:text-neon-cyan transition-colors" />
              </>
            )}
          </div>
        </Link>
        

      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 - 移除房型切换 */}
        <header
          className="h-16 border-b border-border-color flex items-center justify-between px-6"
          style={{ background: `${theme.primary}08` }}
        >
          {/* 左侧：酒店切换 */}
          <div className="relative">
            <button
              onClick={() => setShowHotelDropdown(!showHotelDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary border border-border-color hover:border-neon-cyan/50 transition-all"
            >
              <Building2 size={18} style={{ color: theme.primary }} />
              <span className="font-medium">{currentHotel.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">
                {currentHotel.tier === 'economy' ? '经济型' : currentHotel.tier === 'premium' ? '高档型' : '舒适型'}
              </span>
              <ChevronRight
                size={16}
                className={`transition-transform ${showHotelDropdown ? 'rotate-90' : ''}`}
              />
            </button>

            {showHotelDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-2 w-72 bg-bg-secondary border border-border-color rounded-xl shadow-xl z-50"
              >
                {allHotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => {
                      switchHotel(hotel.id);
                      setShowHotelDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      hotel.id === currentHotel.id ? 'bg-bg-tertiary' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ background: `${themeColors[hotel.theme]?.primary || '#00F0FF'}20` }}
                    >
                      {hotel.type === 'city' ? (
                        <Landmark size={20} style={{ color: themeColors[hotel.theme]?.primary || '#00F0FF' }} />
                      ) : hotel.type === 'suburb' ? (
                        <Mountain size={20} style={{ color: themeColors[hotel.theme]?.primary || '#00F0FF' }} />
                      ) : (
                        <Palmtree size={20} style={{ color: themeColors[hotel.theme]?.primary || '#00F0FF' }} />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{hotel.name}</span>
                        <span className="text-[10px] px-1 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan">
                          {hotel.tier === 'economy' ? '经济型' : hotel.tier === 'premium' ? '高档型' : '舒适型'}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {hotel.location.city} · {hotel.type === 'city' ? '城市' : hotel.type === 'suburb' ? '郊区' : '景区'}
                      </div>
                    </div>
                    {hotel.id === currentHotel.id && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ background: themeColors[hotel.theme]?.primary || '#00F0FF', boxShadow: `0 0 8px ${themeColors[hotel.theme]?.primary || '#00F0FF'}` }}
                      />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* 中间：时间态切换 */}
          <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1 border border-border-color">
            {[
              { id: 'realtime', icon: Clock, label: '实时推演', color: '#00E396' },
              { id: 'history', icon: History, label: '历史回放', color: '#A855F7' },
              { id: 'sandbox', icon: Gamepad2, label: '沙盘模拟', color: '#FFB800' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = timeMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTimeModeChange(item.id as TimeMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    isActive
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  style={{
                    background: isActive ? `${item.color}20` : 'transparent',
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? item.color : 'currentColor' }} />
                  <span style={{ color: isActive ? item.color : 'inherit' }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 右侧：模式、时间、用户、设置 */}
          <div className="flex items-center gap-4">
            {/* 当前定价模式 */}
            <motion.div
              key={currentMode}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: `${mode.color}20`, border: `1px solid ${mode.color}` }}
            >
              {currentMode === 'scalper' ? (
                <Zap size={14} style={{ color: mode.color }} />
              ) : currentMode === 'dynamic' ? (
                <Activity size={14} style={{ color: mode.color }} />
              ) : (
                <TrendingDown size={14} style={{ color: mode.color }} />
              )}
              <span style={{ color: mode.color }}>{mode.label}</span>
            </motion.div>

            {/* 实时时间 */}
            <div 
              className="font-mono text-lg font-bold"
              style={{ color: theme.primary, textShadow: `0 0 10px ${theme.primary}40` }}
            >
              {currentTime}
            </div>

            {/* 设置按钮 */}
            <Tooltip content={hasSystemUpdate ? "系统设置（有更新）" : "系统设置"} position="bottom">
              <Link
                to="/settings"
                className="relative p-2 rounded-lg bg-bg-tertiary border border-border-color hover:border-neon-cyan transition-all flex items-center justify-center"
              >
                <Settings size={20} />
                {/* 系统更新红点 */}
                {hasSystemUpdate && (
                  <>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] bg-red-500 text-text-primary rounded-full font-bold">
                      新
                    </span>
                  </>
                )}
              </Link>
            </Tooltip>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* 全局 Loading 遮罩 - 使用蜜蜂Logo动画 */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-primary/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
            >
              {/* 动画Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <AnimatedLogo size={64} animate={true} />
              </motion.div>

              {/* 飞行轨迹装饰 */}
              <div className="relative w-40 h-1.5 mb-6">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent rounded-full"
                  animate={{
                    scaleX: [0.5, 1, 0.5],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* 飞行粒子 */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neon-cyan"
                    animate={{
                      x: [-20, 160],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>

              {/* 加载文字 */}
              <motion.p 
                className="text-text-secondary text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {loadingText || '加载中...'}
              </motion.p>

              {/* 进度条 */}
              <div className="mt-4 w-40 h-0.5 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '100%', '0%'] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </motion.div>
          )}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
        
        {/* Toast 全局提示 */}
        <ToastProvider />

        {/* 底部 Footer - 不明显的 DOOMESEE 归属 */}
        <footer className="px-6 py-3 border-t border-border-color/30 bg-bg-secondary/50">
          <div className="flex items-center justify-between text-[10px] text-text-secondary/40">
            <span>© 2026 Shadow-Bees</span>
            <div className="flex items-center gap-1.5">
              <img src="/logo.jpg" alt="" className="h-3 w-auto opacity-40" />
              <span>DOOMESEE</span>
            </div>
          </div>
        </footer>
        
        {/* 自定义日期选择弹窗 */}
        <DateRangeModal
          isOpen={showDateModal}
          onClose={() => setShowDateModal(false)}
          onConfirm={handleCustomDateConfirm}
        />
      </div>
    </div>
  );
}

