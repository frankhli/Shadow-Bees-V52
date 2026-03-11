// @ts-nocheck

/**
 * Shadow-Bees Enterprise Edition - 集团代运营工作台
 * SSO模式 + 权限控制菜单
 * 
 * 导航分类（参照酒店端）：
 * 1. 经营中心 - 数据看板类
 * 2. 市场情报 - 事件/竞品
 * 3. 钱货盘点 - 定价/库存/订单
 * 4. 去卖货 - 内容/发布/私域/账号
 * 5. 渠道分析 - 渠道大盘/配置
 * 6. 客户咨询 - AI客服
 * 7. 策略中心 - 定价/运营策略
 * 8. 风控合规 - 风控/审计/对账
 * 9. 管理中心 - 客户/结算/工单
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, Permission, EnterpriseRole, ROLE_DISPLAY_NAMES } from './stores/authStore';
import { useEnterpriseStore } from './stores/enterpriseStore';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { logger } from './utils/logger';
import { DevTools } from './components/DevTools';
import { 
  Menu, ChevronDown, ChevronRight, LogOut, Bell, X,
  LayoutDashboard, Sparkles, BarChart3, GitMerge,
  Target, DollarSign, Globe, Calendar, ShoppingCart,
  Rocket, FileText, Share2, Users, PieChart, Settings,
  MessageSquare, Bot, TrendingUp, Eye, Shield, AlertTriangle,
  FileSearch, Wallet, Building2, Ticket, CreditCard,
  Layers, Activity, Radio, Headphones, Package, ImageIcon
} from 'lucide-react';
import { Logo } from '../components/Logo';

// 组件
import { HotelSelectorAdvanced } from './components/HotelSelectorAdvanced';

// 页面组件 - AI数据洞察
import { TodayOverview } from './pages/overview/TodayOverview';
import { DataDashboard } from './pages/overview/DataDashboard';
import { AIDashboard } from './pages/overview/AIDashboard';
import { HotelComparison } from './pages/overview/HotelComparison';
import { UniversalPricing } from './pages/finance/UniversalPricing';
import { ComplianceCenter } from './pages/risk';
import AuditLog from './pages/RiskCenter/AuditLog';
import { UnifiedInbox, ScriptLibrary, SmartDispatch, HumanAICollab } from './pages/aichat';
import { ChannelDashboard, ChannelConfig } from './pages/channels';
import { HotelWorkbench } from './pages/hotel-workbench';

import ChannelQuota from './pages/ChannelQuota';
import OrderManagement from './pages/OrderManagement';
import TicketCenter from './pages/TicketCenter';
import AccountPool from './pages/AccountCenter/AccountPool';
import PricingStrategy from './pages/StrategyCenter/PricingStrategy';
import ContentFactory from './pages/ContentCenter/ContentFactory';
import PublishStatus from './pages/ContentCenter/PublishStatus';
import PrivateDomain from './pages/ContentCenter/PrivateDomain';
import ImageLibraryManager from './pages/ContentCenter/ImageLibraryManager';
import EventsIntel from './pages/IntelligenceCenter/EventsIntel';
import CompetitorIntel from './pages/IntelligenceCenter/CompetitorIntel';
import RiskWarning from './pages/RiskCenter/RiskWarning';
import FinanceReconciliation from './pages/RiskCenter/FinanceReconciliation';
import CustomerManagement from './pages/Management/CustomerManagement';
import SettlementCenter from './pages/Management/SettlementCenter';

// ============================================
// 菜单配置（参照酒店端重新归类）
// ============================================

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  permissions: Permission[];
  highlight?: boolean;
  badge?: number | (() => number);
}

interface NavGroup {
  id: string;
  title: string;
  icon: any;
  permissions: Permission[];
  items: NavItem[];
}

// ============================================
// 菜单配置（7大AI业务模块，突出AI能力）
// ============================================

const allNavGroups: NavGroup[] = [
  {
    id: 'dashboard',
    title: 'AI数据洞察',
    icon: LayoutDashboard,
    permissions: [Permission.VIEW_OVERVIEW],
    items: [
      { id: 'today', label: '今日实况', path: '/today', icon: Activity, permissions: [Permission.VIEW_TODAY] },
      { id: 'dashboard', label: '数据大盘', path: '/dashboard', icon: BarChart3, permissions: [Permission.VIEW_DASHBOARD] },
      { id: 'ai-dashboard', label: 'AI效果看板', path: '/ai-dashboard', icon: Sparkles, permissions: [Permission.VIEW_AI_INSIGHT] },
      { id: 'comparison', label: '门店对比', path: '/comparison', icon: GitMerge, permissions: [Permission.VIEW_COMPARISON] },
    ],
  },
  {
    id: 'intelligence',
    title: 'AI市场情报',
    icon: Target,
    permissions: [Permission.VIEW_INTELLIGENCE],
    items: [
      { id: 'events', label: '事件情报', path: '/events', icon: Radio, permissions: [Permission.VIEW_EVENTS] },
      { id: 'competitors', label: '竞品监控', path: '/competitors', icon: Target, permissions: [Permission.VIEW_COMPETITORS] },
    ],
  },
  {
    id: 'operations',
    title: 'AI运营工具',
    icon: Rocket,
    permissions: [Permission.VIEW_REVENUE],
    items: [
      { id: 'pricing', label: '全域定价', path: '/pricing', icon: DollarSign, permissions: [Permission.VIEW_REVENUE, Permission.EDIT_PRICING] },
      { id: 'pricing-strategy', label: '定价策略', path: '/strategy/pricing', icon: TrendingUp, permissions: [Permission.VIEW_STRATEGY, Permission.MANAGE_STRATEGY] },
      { id: 'channel-quota', label: '渠道配额', path: '/channel-quota', icon: Package, permissions: [Permission.VIEW_REVENUE, Permission.EDIT_INVENTORY] },
      { id: 'orders', label: '非标渠道订单', path: '/orders', icon: ShoppingCart, permissions: [Permission.VIEW_ORDERS, Permission.MANAGE_ORDERS] },
      
    ],
  },
  {
    id: 'content',
    title: 'AI内容中心',
    icon: FileText,
    permissions: [Permission.VIEW_CONTENT],
    items: [
      { id: 'content-factory', label: 'AI内容工厂', path: '/content', icon: Sparkles, permissions: [Permission.VIEW_CONTENT, Permission.CREATE_CONTENT] },
      { id: 'image-library', label: '图片库管理', path: '/image-library', icon: ImageIcon, permissions: [Permission.VIEW_CONTENT, Permission.CREATE_CONTENT] },
      { id: 'publish', label: '发布管理', path: '/publish', icon: Share2, permissions: [Permission.VIEW_CONTENT, Permission.PUBLISH_CONTENT] },
      { id: 'private-domain', label: '私域运营', path: '/private-domain', icon: Users, permissions: [Permission.VIEW_CONTENT] },
    ],
  },
  {
    id: 'aichat',
    title: 'AI客服中心',
    icon: Headphones,
    permissions: [Permission.VIEW_SERVICE],
    items: [
      { id: 'aichat-dashboard', label: 'AI客服数据看板', path: '/aichat/dashboard', icon: BarChart3, permissions: [Permission.VIEW_SERVICE] },
      { id: 'aichat-inbox', label: '统一收件箱', path: '/aichat/inbox', icon: MessageSquare, permissions: [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE] },
      { id: 'aichat-collab', label: '人机协作', path: '/aichat/collab', icon: Bot, permissions: [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE], badge: () => {
        // 待处理AI建议数（人工待确认）
        return 5;
      }},
      { id: 'aichat-handoff', label: '人工转接', path: '/aichat/handoff', icon: Users, permissions: [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE], badge: () => {
        // 待分配转接数（人工待处理）
        return 3;
      }},
      { id: 'aichat-scripts', label: 'AI话术库', path: '/aichat/scripts', icon: Sparkles, permissions: [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE] },
      { id: 'aichat-dispatch', label: '智能分发', path: '/aichat/dispatch', icon: GitMerge, permissions: [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE] },
    ],
  },
  {
    id: 'channels',
    title: '渠道与账号',
    icon: PieChart,
    permissions: [Permission.VIEW_CHANNELS],
    items: [
      { id: 'channel-dashboard', label: '渠道大盘', path: '/channel-analytics/dashboard', icon: PieChart, permissions: [Permission.VIEW_CHANNELS] },
      { id: 'channel-config', label: '渠道配置', path: '/channel-analytics/config', icon: Settings, permissions: [Permission.VIEW_CHANNELS, Permission.MANAGE_CHANNELS] },
      { id: 'accounts', label: '账号管理', path: '/accounts/pool', icon: Users, permissions: [Permission.VIEW_ACCOUNTS, Permission.MANAGE_ACCOUNTS] },
    ],
  },
  {
    id: 'management',
    title: '风控与系统',
    icon: Shield,
    permissions: [Permission.VIEW_RISK, Permission.VIEW_MANAGEMENT],
    items: [
      { id: 'risk-warning', label: '风控预警', path: '/risk/warning', icon: AlertTriangle, permissions: [Permission.VIEW_RISK], badge: () => {
        // 模拟待处理严重/高危风险数量（实际应从store或API获取）
        return 4; // 严重1个 + 高危3个
      }},
      { id: 'risk-finance', label: '财务对账', path: '/risk/finance', icon: Wallet, permissions: [Permission.VIEW_RISK, Permission.MANAGE_RISK] },
      { id: 'risk-audit', label: '操作审计', path: '/risk/audit', icon: FileSearch, permissions: [Permission.VIEW_RISK, Permission.MANAGE_RISK] },
      { id: 'risk-compliance', label: '合规中心', path: '/risk/compliance-center', icon: Shield, permissions: [Permission.VIEW_RISK, Permission.MANAGE_RISK] },
      { id: 'customer-mgmt', label: '客户管理', path: '/management/customers', icon: Users, permissions: [Permission.VIEW_MANAGEMENT, Permission.MANAGE_CUSTOMERS] },
      { id: 'billing', label: '结算中心', path: '/billing', icon: CreditCard, permissions: [Permission.VIEW_MANAGEMENT, Permission.MANAGE_BILLING] },
      { id: 'tickets', label: '非标渠道工单', path: '/tickets', icon: Ticket, permissions: [Permission.VIEW_MANAGEMENT] },
    ],
  },
];

// ============================================
// 企业版布局组件
// ============================================

export function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['overview', 'revenue']);
  const [showHotelSelector, setShowHotelSelector] = useState(false);
  
  // 侧边栏滚动位置保持
  const sidebarScrollRef = useRef(0);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasAnyPermission, isGroupView, isSingleHotel } = useAuthStore();
  const { hotels, selectedHotelIds, selectMultipleHotels, loadHotels } = useEnterpriseStore();
  

  
  // 判断是否是集团视角（显示酒店选择器）
  const isGroupPerspective = useMemo(() => isGroupView(), [isGroupView]);
  
  // 使用滚动位置保持
  useScrollRestoration();

  // 根据权限过滤菜单
  const navGroups = useMemo(() => {
    return allNavGroups
      .filter(group => hasAnyPermission(group.permissions))
      .map(group => ({
        ...group,
        items: group.items.filter(item => hasAnyPermission(item.permissions))
      }))
      .filter(group => group.items.length > 0);
  }, [hasAnyPermission]);

  // 切换分组展开 - 保持侧边栏滚动位置
  const toggleGroup = (groupId: string) => {
    // 保存当前侧边栏滚动位置
    const sidebarNav = document.querySelector('aside nav');
    if (sidebarNav) {
      sidebarScrollRef.current = sidebarNav.scrollTop;
    }
    
    setExpandedGroups(prev => {
      const newGroups = prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      
      // 在状态更新后恢复滚动位置
      setTimeout(() => {
        const nav = document.querySelector('aside nav');
        if (nav) {
          nav.scrollTop = sidebarScrollRef.current;
        }
      }, 0);
      
      return newGroups;
    });
  };

  // 侧边栏内容
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white" style={{ height: '100vh' }}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={40} variant="icon-only" />
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-semibold text-gray-900 truncate">Shadow-Bees</div>
              <div className="text-xs text-gray-500 truncate">华美会企业版（嵌套AI模块）</div>
            </div>
          )}
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navGroups.map(group => {
          const GroupIcon = group.icon;
          const isExpanded = expandedGroups.includes(group.id);
          const isActive = group.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
          
          return (
            <div key={group.id} className="mb-2">
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'text-violet-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <GroupIcon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium text-sm">{group.title}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
              
              {/* 子菜单 */}
              {isExpanded && !collapsed && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                  {group.items.map(item => {
                    const ItemIcon = item.icon;
                    const isItemActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                    
                    return (
                      <button
                        key={item.id}
                        onClick={(e) => {
                          // 保存当前主内容区滚动位置
                          const main = document.querySelector('main');
                          const mainScrollTop = main?.scrollTop || 0;
                          
                          // 保存当前侧边栏滚动位置
                          const sidebarNav = document.querySelector('aside nav');
                          const sidebarScrollTop = sidebarNav?.scrollTop || 0;
                          
                          // 导航到新路径
                          navigate(item.path);
                          
                          // 在下一帧恢复滚动位置
                          requestAnimationFrame(() => {
                            // 恢复主内容区滚动位置
                            const mainEl = document.querySelector('main');
                            if (mainEl) {
                              mainEl.scrollTop = mainScrollTop;
                            }
                            // 恢复侧边栏滚动位置
                            const navEl = document.querySelector('aside nav');
                            if (navEl) {
                              navEl.scrollTop = sidebarScrollTop;
                            }
                          });
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                          isItemActive 
                            ? 'bg-violet-50 text-violet-600' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {(() => {
                          const badgeCount = typeof item.badge === 'function' ? item.badge() : item.badge;
                          if (badgeCount && badgeCount > 0) {
                            return (
                              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            );
                          }
                          if (item.highlight) {
                            return <span className="w-2 h-2 bg-red-500 rounded-full"></span>;
                          }
                          return null;
                        })()}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* 桌面侧边栏 - 固定位置，独立滚动 */}
      <aside 
        className={`hidden lg:block fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 overscroll-contain ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        style={{ overflow: 'hidden' }}
      >
        <SidebarContent />
      </aside>

      {/* 移动端侧边栏 */}
      {mobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setMobileOpen(false)} 
          />
          <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50 lg:hidden overscroll-contain"
            style={{ overflow: 'hidden' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* 主内容区 - 固定高度，独立滚动 */}
      <main 
        className={`flex-1 transition-all duration-300 overflow-y-auto overscroll-contain ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
        style={{ 
          height: '100vh',
          scrollBehavior: 'auto'
        }}
      >
        {/* 顶部 Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name || '管理员'}</div>
                  <div className="text-xs text-gray-500">{user?.role ? ROLE_DISPLAY_NAMES[user.role] : ''}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center">
                  <span className="text-violet-600 font-medium">{user?.name?.[0] || 'A'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 全局酒店筛选栏 - 仅集团视角显示 */}
        {isGroupPerspective && (
          <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">数据范围：</span>
                {selectedHotelIds.length > 0 ? (
                  <span className="text-sm font-medium text-gray-900">
                    已选 {selectedHotelIds.length} 家酒店
                  </span>
                ) : (
                  <span className="text-sm text-amber-600">未选择酒店</span>
                )}
                <button
                  onClick={() => setShowHotelSelector(true)}
                  className="ml-2 px-3 py-1 text-xs bg-violet-50 text-violet-600 rounded-full hover:bg-violet-100 transition-colors"
                >
                  {selectedHotelIds.length > 0 ? '修改' : '选择'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 单酒店视角 - 显示当前酒店名称 */}
        {!isGroupPerspective && selectedHotelIds.length === 1 && (
          <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">当前酒店：</span>
              <span className="text-sm font-medium text-gray-900">
                {hotels.find(h => h.id === selectedHotelIds[0])?.name || '加载中...'}
              </span>
            </div>
          </div>
        )}

        {/* 页面内容 */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      
      {/* 酒店选择器 - 右侧滑出面板 */}
      {showHotelSelector && (
        <>
          {/* 遮罩 */}
          <div 
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setShowHotelSelector(false)}
          />
          {/* 滑出面板 */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">选择酒店</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  共 {hotels.length} 家酒店，已选 {selectedHotelIds.length} 家
                </p>
              </div>
              <button
                onClick={() => setShowHotelSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 内容 */}
            <div className="flex-1 overflow-auto p-6">
              <HotelSelectorAdvanced
                selectedIds={selectedHotelIds}
                onChange={(ids) => {
                  selectMultipleHotels(ids);
                }}
                multiSelect={true}
              />
            </div>
            
            {/* 底部操作栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="text-sm text-gray-600">
                已选择 <span className="font-bold text-violet-600">{selectedHotelIds.length}</span> 家酒店
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => selectMultipleHotels([])}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  清空
                </button>
                <button
                  onClick={() => setShowHotelSelector(false)}
                  className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* 开发工具面板 */}
      <DevTools />
    </div>
  );
}

// ============================================
// 主应用组件
// ============================================

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { loginBySSO, isAuthenticated } = useAuthStore();
  const { loadHotels } = useEnterpriseStore();

  // SSO登录处理
  useEffect(() => {
    const init = async () => {
      const token = searchParams.get('token');
      const pmsToken = localStorage.getItem('pms_token');
      const pmsUserInfoStr = localStorage.getItem('pms_user_info');
      
      if (token) {
        try {
          await loginBySSO(token);
        } catch (error) {
          logger.error('SSO登录失败', error instanceof Error ? error : undefined);
        }
      } else if (pmsToken && pmsUserInfoStr) {
        try {
          const userInfo = JSON.parse(pmsUserInfoStr);
          await loginBySSO(pmsToken, {
            id: userInfo.id,
            name: userInfo.name,
            role: userInfo.role as EnterpriseRole,
            hotelIds: userInfo.hotelIds,
            regionIds: userInfo.regionIds,
            pmsToken,
          });
        } catch (error) {
          logger.error('SSO登录失败', error instanceof Error ? error : undefined);
        }
      }
      
      // 通过API加载酒店数据
      await loadHotels();
      
      setIsLoading(false)
    };
    
    init();
  }, [searchParams, loginBySSO, loadHotels]);

  // iframe SSO登录监听
  useEffect(() => {
    const handleSSOLogin = (event: any) => {
      if (event.detail?.token && !isAuthenticated) {
        loginBySSO(event.detail.token, event.detail.userInfo);
      }
    };

    window.addEventListener('sb:sso-login' as any, handleSSOLogin);
    return () => {
      window.removeEventListener('sb:sso-login' as any, handleSSOLogin);
    };
  }, [loginBySSO, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 未登录显示登录提示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Shadow-Bees 集团版</h1>
          <p className="mt-2 text-gray-500">请通过华美会PMS系统登录</p>
          
          <div className="mt-8 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">开发测试</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.GROUP_ADMIN })}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
              >
                集团管理员
              </button>
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.GROUP_OPERATOR })}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                集团运营
              </button>
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.HOTEL_MANAGER, hotelIds: ['hotel-001'] })}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                酒店店长
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EnterpriseLayout>
      <Routes>
        {/* AI数据洞察 */}
        <Route path="/" element={<TodayOverview />} />
        <Route path="/today" element={<TodayOverview />} />
        <Route path="/dashboard" element={<DataDashboard />} />
        <Route path="/ai-dashboard" element={<AIDashboard />} />
        <Route path="/comparison" element={<HotelComparison />} />

        {/* 市场情报 */}
        <Route path="/events" element={<EventsIntel />} />
        <Route path="/competitors" element={<CompetitorIntel />} />

        {/* 钱货盘点 */}
        <Route path="/pricing" element={<UniversalPricing />} />
        <Route path="/channel-quota" element={<ChannelQuota />} />
        <Route path="/orders" element={<OrderManagement />} />

        {/* 去卖货 */}
        <Route path="/image-library" element={<ImageLibraryManager />} />
        <Route path="/content" element={<ContentFactory />} />
        <Route path="/publish" element={<PublishStatus />} />
        <Route path="/private-domain" element={<PrivateDomain />} />
        <Route path="/accounts/pool" element={<AccountPool />} />
        <Route path="/accounts/assign" element={<AccountPool />} />
        <Route path="/accounts/status" element={<AccountPool />} />

        {/* 渠道分析 */}
        <Route path="/channel-analytics/dashboard" element={<ChannelDashboard />} />
        <Route path="/channel-analytics/config" element={<ChannelConfig />} />

        {/* 客户咨询 */}
        <Route path="/aichat/inbox" element={<UnifiedInbox />} />
        <Route path="/aichat/scripts" element={<ScriptLibrary />} />
        <Route path="/aichat/dispatch" element={<SmartDispatch />} />
        <Route path="/aichat/collab" element={<HumanAICollab />} />

        {/* 策略中心 */}
        <Route path="/strategy/pricing" element={<PricingStrategy />} />
        <Route path="/strategy/operation" element={<PricingStrategy />} />
        <Route path="/strategy/monitor" element={<PricingStrategy />} />
        

        {/* 风控合规 */}
        <Route path="/risk/compliance-center" element={<ComplianceCenter />} />
        <Route path="/risk/warning" element={<RiskWarning />} />
        <Route path="/risk/audit" element={<AuditLog />} />
        <Route path="/risk/finance" element={<FinanceReconciliation />} />

        {/* 管理中心 */}
        <Route path="/management/customers" element={<CustomerManagement />} />
        <Route path="/tickets" element={<TicketCenter />} />
        <Route path="/billing" element={<SettlementCenter />} />

        {/* 酒店操作台 */}
        <Route path="/hotel-workbench/:hotelId" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/pricing" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/inventory" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/orders" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/content" element={<HotelWorkbench />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EnterpriseLayout>
  );
}

export default App;
