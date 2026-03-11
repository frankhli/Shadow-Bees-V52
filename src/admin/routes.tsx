/**
 * Admin Routes - 运营后台路由配置
 * 使用 HashRouter 适配独立入口
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/customers'));
const Content = lazy(() => import('./pages/content'));
const System = lazy(() => import('./pages/system'));
const Finance = lazy(() => import('./pages/finance'));
const Reconciliation = lazy(() => import('./pages/finance/Reconciliation'));
const Settlement = lazy(() => import('./pages/finance/Settlement'));
const Invoice = lazy(() => import('./pages/finance/Invoice'));
const Support = lazy(() => import('./pages/support'));
const SLAMonitor = lazy(() => import('./pages/support/SLAMonitor'));
const SupportAnalytics = lazy(() => import('./pages/support/SupportAnalytics'));
const AnomalyCenter = lazy(() => import('./pages/anomalies'));
const RiskDashboard = lazy(() => import('../pages/admin/risk/Dashboard'));
const PricingMonitor = lazy(() => import('./pages/pricing'));
const PricingInsights = lazy(() => import('./pages/pricing-insights'));
const InventoryMonitor = lazy(() => import('./pages/inventory'));
const OrderMonitor = lazy(() => import('./pages/orders'));
const ChannelAnalytics = lazy(() => import('./pages/channels'));
const ChannelAnalysis = lazy(() => import('./pages/channels/ChannelAnalysis'));
const ChannelCompare = lazy(() => import('./pages/channels/ChannelCompare'));
const DataWarehouse = lazy(() => import('./pages/warehouse'));
const AIKnowledge = lazy(() => import('./pages/ai-knowledge'));
const TrainingManagement = lazy(() => import('./pages/training'));
const StrategyManagement = lazy(() => import('./pages/strategy'));

// Loading fallback
const PageLoader = () => (
  <div className="h-96 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
  </div>
);

// Error page
const ErrorPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-neon-cyan mb-4">404</h1>
      <p className="text-gray-400 mb-6">页面未找到</p>
      <a 
        href="/#/" 
        className="px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all inline-block"
      >
        返回首页
      </a>
    </div>
  </div>
);

export const adminRouter = createHashRouter([
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },

      {
        path: 'customers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Customers />
          </Suspense>
        ),
      },
      {
        path: 'finance',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Finance />
          </Suspense>
        ),
      },
      {
        path: 'finance/reconciliation',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reconciliation />
          </Suspense>
        ),
      },
      {
        path: 'finance/settlement',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Settlement />
          </Suspense>
        ),
      },
      {
        path: 'finance/invoice',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Invoice />
          </Suspense>
        ),
      },
      {
        path: 'content',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Content />
          </Suspense>
        ),
      },
      {
        path: 'anomalies',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AnomalyCenter />
          </Suspense>
        ),
      },
      {
        path: 'risk',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RiskDashboard />
          </Suspense>
        ),
      },
      {
        path: 'pricing-insights',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PricingInsights />
          </Suspense>
        ),
      },
      {
        path: 'pricing',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PricingMonitor />
          </Suspense>
        ),
      },
      {
        path: 'inventory',
        element: (
          <Suspense fallback={<PageLoader />}>
            <InventoryMonitor />
          </Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <Suspense fallback={<PageLoader />}>
            <OrderMonitor />
          </Suspense>
        ),
      },
      {
        path: 'channels',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChannelAnalytics />
          </Suspense>
        ),
      },
      {
        path: 'channels/analytics',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChannelAnalysis />
          </Suspense>
        ),
      },
      {
        path: 'channels/compare',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChannelCompare />
          </Suspense>
        ),
      },
      {
        path: 'warehouse',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DataWarehouse />
          </Suspense>
        ),
      },
      {
        path: 'ai-knowledge',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AIKnowledge />
          </Suspense>
        ),
      },
      {
        path: 'support',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Support />
          </Suspense>
        ),
      },
      {
        path: 'support/sla',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SLAMonitor />
          </Suspense>
        ),
      },
      {
        path: 'support/analytics',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SupportAnalytics />
          </Suspense>
        ),
      },
      {
        path: 'training',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TrainingManagement />
          </Suspense>
        ),
      },
      {
        path: 'strategy',
        element: (
          <Suspense fallback={<PageLoader />}>
            <StrategyManagement />
          </Suspense>
        ),
      },
      {
        path: 'system',
        element: (
          <Suspense fallback={<PageLoader />}>
            <System />
          </Suspense>
        ),
      },

      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default adminRouter;
