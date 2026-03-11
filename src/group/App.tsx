/**
 * Shadow-Bees V52 - 集团视角入口（UX增强版）
 * 8个核心页面：每日简报、AI价值、门店全景、渠道分析、策略中心、运营中心、库存日历、财务合规、系统设置
 */

import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import {
  DataOverview,
  AIInsight,
  HotelComparison,
  StrategyCenter,
  OperationsCenter,
  Settings,
  Tickets,
} from './pages';
import { ChannelAnalysis } from './pages/ChannelAnalysis';
import InventoryCalendar from './pages/InventoryCalendar';
import FinanceCompliance from './pages/FinanceCompliance';
import { SystemLogin } from '@/components/SystemLogin';
import { SystemBootSequence } from '@/components/SystemBootSequence';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

// 键盘快捷键和命令面板包装器
function UXEnhancements() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // 启动全局快捷键监听
  useGlobalHotkeys();
  
  // 使用配置的快捷键（从 store 读取）
  useConfiguredHotkeys({ appType: 'group' });

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
        appType="group"
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)}
      />

      {/* 快捷键帮助 */}
      <ShortcutHelp
        appType="group"
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
      />
    </>
  );
}

function App() {
  const [authState, setAuthState] = useState<'boot' | 'login' | null>('boot');

  useEffect(() => {
    try {
      const isLoggedIn = sessionStorage.getItem('sb_group_logged_in');
      if (isLoggedIn) {
        setAuthState(null);
      }
    } catch (e) {
      console.warn('Storage not available');
    }
  }, []);

  const handleBootComplete = () => {
    setAuthState('login');
  };

  const handleLogin = (userId: string, role: string) => {
    try {
      sessionStorage.setItem('sb_group_logged_in', 'true');
      sessionStorage.setItem('sb_group_user_id', userId);
      sessionStorage.setItem('sb_group_user_role', role);
    } catch (e) {
      console.warn('Storage not available');
    }
    setAuthState(null);
    toast.success('登录成功', '欢迎回到集团管理平台');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
        {/* 系统启动动画 */}
        <SystemBootSequence
          type="group"
          isVisible={authState === 'boot'}
          onComplete={handleBootComplete}
        />
        
        {/* 系统登录页面 */}
        <SystemLogin
          type="group"
          isVisible={authState === 'login'}
          onLogin={handleLogin}
        />
        
        {/* Toast 容器 */}
        <ToastContainer position="top-right" />
        
        {authState === null && (
          <Layout>
            <Routes>
              <Route path="/" element={<DataOverview />} />
              <Route path="/ai" element={<AIInsight />} />
              <Route path="/hotels" element={<HotelComparison />} />
              <Route path="/channels" element={<ChannelAnalysis />} />
              <Route path="/strategy" element={<StrategyCenter />} />
              <Route path="/operations" element={<OperationsCenter />} />
              <Route path="/inventory" element={<InventoryCalendar />} />
              <Route path="/finance" element={<FinanceCompliance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets" element={<Tickets />} />
            </Routes>
          </Layout>
        )}

        {/* UX 增强功能 */}
        <UXEnhancements />
      </div>
    </ErrorBoundary>
  );
}

export default App;
