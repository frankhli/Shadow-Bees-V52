/**
 * Shadow-Bees Enterprise Edition - 集团代运营工作台
 * SSO模式 + 权限控制菜单
 */

import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { EnterpriseLayout } from './Layout';
import { useAuthStore, EnterpriseRole } from './stores/authStore';
import { Logo } from '../components/Logo';
import { useEnterpriseStore } from './stores/enterpriseStore';
import { hotelApi } from './api';
import type { Hotel } from './api/types';
import { logger } from './utils/logger';
import { FullScreen as LoadingFullScreen } from './components/Loading';

// 页面组件 - AI数据洞察
import { TodayOverview } from './pages/overview/TodayOverview';
import { DataDashboard } from './pages/overview/DataDashboard';
import { AIDashboard } from './pages/overview/AIDashboard';
import { HotelComparison } from './pages/overview/HotelComparison';
import { UniversalPricing } from './pages/finance/UniversalPricing';
import { ComplianceCenter } from './pages/risk/ComplianceCenter';
import { UnifiedInbox, ScriptLibrary, SmartDispatch, HumanHandoff, HumanAICollab, AIChatDashboard } from './pages/aichat';
import { ChannelDashboard, ChannelConfig } from './pages/channels';
// ★ 企业版核心功能
import { HotelWorkbench } from './pages/hotel-workbench';

// 新增页面
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
import AuditLog from './pages/RiskCenter/AuditLog';
import FinanceReconciliation from './pages/RiskCenter/FinanceReconciliation';
import CustomerManagement from './pages/Management/CustomerManagement';
import SettlementCenter from './pages/Management/SettlementCenter';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { loginBySSO, isAuthenticated, user } = useAuthStore();
  const { setHotels, selectMultipleHotels } = useEnterpriseStore();

  // SSO登录处理
  useEffect(() => {
    const init = async () => {
      // 从URL获取token（华美会跳转过来）
      const token = searchParams.get('token');
      
      // 检查localStorage中是否有PMS登录信息（iframe通信存储的）
      const pmsToken = localStorage.getItem('pms_token');
      const pmsUserInfoStr = localStorage.getItem('pms_user_info');
      
      if (token) {
        // URL参数登录
        try {
          await loginBySSO(token);
        } catch (error) {
          logger.error('SSO登录失败', error instanceof Error ? error : undefined);
        }
      } else if (pmsToken && pmsUserInfoStr) {
        // iframe内SSO登录
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
      
      setIsLoading(false);
    };
    
    init();
  }, [searchParams, loginBySSO]);
  
  // 加载酒店数据并根据用户角色设置选中状态
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const loadHotelsAndSetSelection = async () => {
      try {
        const response = await hotelApi.getHotels({ page: 1, pageSize: 100 });
        if (response.success) {
          setHotels(response.data.list);
          
          // 根据用户角色决定默认选中的酒店
          const isGroupLevel = user.dataScope === 'all' || user.dataScope === 'region';
          
          if (isGroupLevel) {
            // 集团视角：默认选中所有酒店（或前50家）
            const hotelsToSelect = response.data.list.slice(0, 50).map((h: Hotel) => h.id);
            selectMultipleHotels(hotelsToSelect);
          } else if (user.hotelIds && user.hotelIds.length > 0 && !user.hotelIds.includes('all')) {
            // 单酒店视角：只选中自己有权限的酒店
            const availableHotels = response.data.list.map((h: Hotel) => h.id);
            const hotelsToSelect = user.hotelIds.filter(id => availableHotels.includes(id));
            selectMultipleHotels(hotelsToSelect);
          } else {
            // 默认选中第一家酒店（兜底）
            selectMultipleHotels(response.data.list.slice(0, 1).map((h: Hotel) => h.id));
          }
        }
      } catch (error) {
        logger.error('加载酒店失败', error instanceof Error ? error : undefined);
      }
    };
    
    loadHotelsAndSetSelection();
  }, [isAuthenticated, user, setHotels, selectMultipleHotels]);

  // 监听SSO登录事件（来自iframe通信）
  useEffect(() => {
    const handleSSOLogin = async (event: CustomEvent) => {
      const { token, userInfo } = event.detail;
      if (token && !isAuthenticated) {
        try {
          await loginBySSO(token, userInfo);
        } catch (error) {
          logger.error('SSO登录失败', error instanceof Error ? error : undefined);
        }
      }
    };

    window.addEventListener('sb:sso-login' as any, handleSSOLogin);
    return () => {
      window.removeEventListener('sb:sso-login' as any, handleSSOLogin);
    };
  }, [loginBySSO, isAuthenticated]);

  if (isLoading) {
    return <LoadingFullScreen text="正在初始化..." subText="加载企业版工作台" />;
  }

  // 未登录显示登录提示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo size={64} variant="icon-only" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Shadow-Bees</h1>
          <p className="text-sm text-violet-600 font-medium">华美会企业版（嵌套AI模块）</p>
          <p className="mt-2 text-gray-500">请通过华美会PMS系统登录</p>
          
          <div className="mt-8 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">开发测试</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.GROUP_ADMIN })}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm flex flex-col items-center leading-tight"
              >
                <span>华美会PMS</span>
                <span className="text-xs opacity-90">管理员</span>
              </button>
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.GROUP_OPERATOR })}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex flex-col items-center leading-tight"
              >
                <span>华美会PMS</span>
                <span className="text-xs text-gray-500">运营</span>
              </button>
              <button 
                onClick={() => loginBySSO('mock_token', { role: EnterpriseRole.HOTEL_MANAGER, hotelIds: ['hotel-001'] })}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex flex-col items-center leading-tight"
              >
                <span>酒店</span>
                <span className="text-xs text-gray-500">店长</span>
              </button>
            </div>
          </div>

          {/* 角色权限说明 */}
          <div className="mt-6 text-left">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">角色权限说明</p>
            <div className="space-y-2">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-violet-600"></div>
                  <span className="text-sm font-medium text-gray-900">华美会PMS 管理员</span>
                </div>
                <p className="text-xs text-gray-500 pl-4">全部权限：数据洞察、市场情报、收益管理、内容中心、AI客服、渠道分析、风控合规、客户管理、结算中心</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm font-medium text-gray-900">华美会PMS 运营</span>
                </div>
                <p className="text-xs text-gray-500 pl-4">运营权限：数据查看、内容发布、AI客服回复、渠道管理、工单处理，无定价审批和结算权限</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-sm font-medium text-gray-900">酒店 店长</span>
                </div>
                <p className="text-xs text-gray-500 pl-4">单店权限：查看本店数据、本店订单管理、本店内容发布、本店AI客服，无集团级功能</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-500 mb-2">iframe嵌入测试代码：</p>
            <pre className="text-xs text-gray-600 overflow-x-auto">
{`<iframe 
  src="http://localhost:5173/enterprise"
  style="width: 100%; border: none;"
/>`}
            </pre>
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
        <Route path="/ai-insight" element={<Navigate to="/ai-dashboard" replace />} />
        <Route path="/comparison" element={<HotelComparison />} />

        {/* 情报中心 */}
        <Route path="/events" element={<EventsIntel />} />
        <Route path="/competitors" element={<CompetitorIntel />} />

        {/* 收益中心 - 全域定价整合版 */}
        <Route path="/pricing" element={<UniversalPricing />} />
        <Route path="/channel-quota" element={<ChannelQuota />} />
        <Route path="/inventory" element={<Navigate to="/channel-quota" replace />} />
        <Route path="/pricing/universal" element={<Navigate to="/pricing" replace />} />

        {/* 订单中心 */}
        <Route path="/orders" element={<OrderManagement />} />
        <Route path="/channel-efficiency" element={<div>渠道效能开发中...</div>} />

        {/* 渠道中心 */}
        <Route path="/channel-analytics/dashboard" element={<ChannelDashboard />} />
        <Route path="/channel-analytics/config" element={<ChannelConfig />} />
        {/* 旧版路由重定向 */}
        <Route path="/channels" element={<Navigate to="/channel-analytics/dashboard" replace />} />
        <Route path="/channel-price" element={<Navigate to="/channel-analytics/config" replace />} />

        {/* 内容中心 */}
        <Route path="/content" element={<ContentFactory />} />
        <Route path="/content/factory" element={<ContentFactory />} />
        <Route path="/image-library" element={<ImageLibraryManager />} />
        <Route path="/publish" element={<PublishStatus />} />
        <Route path="/private-domain" element={<PrivateDomain />} />

        {/* AI客服中心 */}
        <Route path="/aichat/inbox" element={<UnifiedInbox />} />
        <Route path="/aichat/dashboard" element={<AIChatDashboard />} />
        <Route path="/aichat/handoff" element={<HumanHandoff />} />
        <Route path="/aichat/scripts" element={<ScriptLibrary />} />
        <Route path="/aichat/dispatch" element={<SmartDispatch />} />
        <Route path="/aichat/collab" element={<HumanAICollab />} />
        {/* 旧版路由重定向 */}
        <Route path="/ai-chat" element={<Navigate to="/aichat/inbox" replace />} />
        <Route path="/human-service" element={<Navigate to="/aichat/collab" replace />} />

        {/* 策略中心 */}
        <Route path="/strategy/pricing" element={<PricingStrategy />} />
        <Route path="/strategy/operation" element={<PricingStrategy />} />
        <Route path="/strategy/monitor" element={<PricingStrategy />} />

        {/* 风控中心 */}
        <Route path="/risk/compliance-center" element={<ComplianceCenter />} />
        <Route path="/risk/warning" element={<RiskWarning />} />
        <Route path="/risk/audit" element={<AuditLog />} />
        <Route path="/risk/finance" element={<FinanceReconciliation />} />
        {/* 旧版路由重定向 */}
        <Route path="/risk/warning" element={<Navigate to="/risk/compliance-center" replace />} />
        <Route path="/risk/compliance" element={<Navigate to="/risk/compliance-center" replace />} />
        <Route path="/risk/audit" element={<AuditLog />} />

        {/* 账号中心 */}
        <Route path="/accounts/pool" element={<AccountPool />} />
        <Route path="/accounts/assign" element={<AccountPool />} />
        <Route path="/accounts/status" element={<AccountPool />} />

        {/* 管理中心 */}
        <Route path="/management/customers" element={<CustomerManagement />} />
        <Route path="/tickets" element={<TicketCenter />} />
        <Route path="/billing" element={<SettlementCenter />} />

        {/* ★ 企业版核心功能：酒店操作台 */}
        <Route path="/hotel-workbench/:hotelId" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/pricing" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/inventory" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/orders" element={<HotelWorkbench />} />
        <Route path="/hotel-workbench/:hotelId/content" element={<HotelWorkbench />} />

        

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EnterpriseLayout>
  );
}

export default App;
