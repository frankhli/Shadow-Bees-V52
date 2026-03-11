/**
 * Shadow-Bees V52 - 酒店端主应用
 * 优化版：添加路由懒加载、错误边界、键盘快捷键、命令面板
 */

import { useEffect, lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useUnifiedStore, demoUsers } from '@/stores/unifiedStore';
import { Layout } from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SystemLogin } from '@/components/SystemLogin';
import { SystemBootSequence } from '@/components/SystemBootSequence';
import { useTimeModeSync } from '@/hooks/useTimeModeSync';

// UX 增强组件
import {
  CommandPalette,
  ShortcutHelp,
  ToastContainer,
  toast,
  NetworkStatusBar,
  useGlobalErrorHandler,
} from '@/components/ux';
import {
  useHotkeys,
  useGlobalHotkeys,
} from '@/hooks/useHotkeys';
import { useConfiguredHotkeys } from '@/hooks';

// 懒加载页面 - 优化首屏加载速度
const TodayOverview = lazy(() => import('@/pages/TodayOverview'));
const MarketIntelligence = lazy(() => import('@/pages/MarketIntelligence'));
const PricingDecision = lazy(() => import('@/pages/PricingDecision'));
const ContentFactory = lazy(() => import('@/pages/ContentFactory'));
const PublishStatus = lazy(() => import('@/pages/PublishStatus'));
const PrivateDomain = lazy(() => import('@/pages/PrivateDomain'));
const AIChatDemo = lazy(() => import('@/pages/AIChatDemo'));
const HumanService = lazy(() => import('@/pages/HumanService'));
const InventoryAndRoomStatus = lazy(() => import('@/pages/InventoryAndRoomStatus'));
const FinanceCompliance = lazy(() => import('@/pages/FinanceCompliance'));
const SystemSettings = lazy(() => import('@/pages/SystemSettings'));
const OrderManagement = lazy(() => import('@/pages/OrderManagement'));
const RiskCenter = lazy(() => import('@/pages/hotel/RiskCenter'));

// 同步导入组件（较小的组件不需要懒加载）
import { TicketCenter } from '@/components/ticket/TicketCenter';

// 页面加载占位符
const PageLoader = () => (
  <div className="h-96 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
  </div>
);

// 键盘快捷键和命令面板包装器
function UXEnhancements() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // 启动全局快捷键监听
  useGlobalHotkeys();
  
  // 使用配置的快捷键（从 store 读取）
  useConfiguredHotkeys({ appType: 'hotel' });

  // 命令面板快捷键
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
        appType="hotel"
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)}
      />

      {/* 快捷键帮助 */}
      <ShortcutHelp
        appType="hotel"
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
      />
    </>
  );
}

function App() {
  const { isLoading, loadingText, updateCurrentTime, startRealtimeSimulation } = useUnifiedStore();
  
  // 启动全局错误处理
  useGlobalErrorHandler();
  
  // 启动时间态三模式数据同步
  useTimeModeSync();
  
  // 启动流程状态: 'boot' -> 'login' -> null(进入系统)
  const [authState, setAuthState] = useState<'boot' | 'login' | null>('boot');
  
  // 检查是否已登录
  useEffect(() => {
    try {
      const isLoggedIn = sessionStorage.getItem('sb_hotel_logged_in');
      const switchTarget = sessionStorage.getItem('sb_hotel_switch_target');
      
      if (switchTarget) {
        // 有切换目标，自动登录为新角色
        sessionStorage.removeItem('sb_hotel_switch_target');
        const targetUser = demoUsers.find(u => u.role === switchTarget);
        if (targetUser) {
          handleLogin(targetUser.id, switchTarget);
          return;
        }
      }
      
      if (isLoggedIn) {
        // 已登录，跳过启动动画直接进入系统
        setAuthState(null);
      }
      // 未登录时保持 'boot' 状态，显示启动动画
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
      sessionStorage.setItem('sb_hotel_logged_in', 'true');
      sessionStorage.setItem('sb_hotel_user_id', userId);
      sessionStorage.setItem('sb_hotel_user_role', role);
    } catch (e) {
      console.warn('Storage not available');
    }
    
    // 根据角色找到对应的用户并切换到该用户
    const targetUser = demoUsers.find(u => u.role === role);
    if (targetUser) {
      useUnifiedStore.getState().switchUser(targetUser);
    }
    
    setAuthState(null);
    
    // 登录成功提示
    toast.success('登录成功', `欢迎回来，${targetUser?.name || '用户'}`);
  };

  // 时间更新
  useEffect(() => {
    const timer = setInterval(() => {
      updateCurrentTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [updateCurrentTime]);
  
  // 启动实时模拟
  useEffect(() => {
    startRealtimeSimulation();
  }, [startRealtimeSimulation]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
        {/* 系统启动动画 */}
        <SystemBootSequence
          type="hotel"
          isVisible={authState === 'boot'}
          onComplete={handleBootComplete}
        />
        
        {/* 系统登录页面 */}
        <SystemLogin
          type="hotel"
          isVisible={authState === 'login'}
          onLogin={handleLogin}
        />
        
        {/* Loading 遮罩 */}
        {isLoading && <LoadingScreen text={loadingText} />}

        {/* 网络状态提示 */}
        <NetworkStatusBar />

        {/* Toast 容器 */}
        <ToastContainer position="top-right" />

        {/* 主布局 */}
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<TodayOverview />} />
              <Route path="/market" element={<MarketIntelligence />} />
              <Route path="/pricing" element={<PricingDecision />} />
              <Route path="/content" element={<ContentFactory />} />
              <Route path="/publish" element={<PublishStatus />} />
              <Route path="/private" element={<PrivateDomain />} />
              <Route path="/service" element={<AIChatDemo />} />
              <Route path="/service/human" element={<HumanService />} />
              <Route path="/inventory" element={<InventoryAndRoomStatus />} />
              <Route path="/orders" element={<OrderManagement />} />
              <Route path="/finance" element={<FinanceCompliance />} />
              <Route path="/risk" element={<RiskCenter />} />
              <Route path="/support" element={<TicketCenter />} />
              <Route path="/settings" element={<SystemSettings />} />
            </Routes>
          </Suspense>
        </Layout>

        {/* UX 增强功能 */}
        <UXEnhancements />
      </div>
    </ErrorBoundary>
  );
}

export default App;
