/**
 * Admin Portal Entry Point
 * SaaS运营后台入口
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { adminRouter } from './routes';
import { initTicketSyncSubscription, initContentSyncSubscription } from './stores/adminStore';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './styles.css';

// 初始化工单同步订阅
initTicketSyncSubscription();

// 初始化内容同步订阅（接收酒店端发布的内容）
initContentSyncSubscription();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary onReset={() => window.location.reload()}>
      <RouterProvider router={adminRouter} />
    </ErrorBoundary>
  </StrictMode>
);
