/**
 * 开发工具面板
 * 
 * 仅在开发环境显示，提供：
 * - Mock数据开关
 * - 用户角色切换
 * - 性能报告查看
 * - 快速导航
 */

import { useState } from 'react';
import { Wrench, X, Database, User, Activity } from 'lucide-react';
import { useAuthStore, EnterpriseRole } from '../stores/authStore';
import { getMockConfig, setMockConfig } from '../utils/mockManager';
import { getPerformanceReport } from '../utils/performanceMonitor';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mock' | 'user' | 'perf'>('mock');
  const { user, loginBySSO } = useAuthStore();
  
  // 只在开发环境显示
  if (!import.meta.env.DEV) return null;

  const mockConfig = getMockConfig();
  const perfReport = getPerformanceReport();

  const roles = [
    { id: EnterpriseRole.GROUP_ADMIN, name: '集团管理员' },
    { id: EnterpriseRole.GROUP_OPERATOR, name: '集团运营' },
    { id: EnterpriseRole.HOTEL_MANAGER, name: '酒店店长' },
  ];

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-violet-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-violet-700 transition-colors"
        title="开发工具"
      >
        <Wrench className="w-5 h-5" />
      </button>

      {/* 面板 */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="font-medium text-gray-900">开发工具</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'mock', icon: Database, label: 'Mock' },
              { id: 'user', icon: User, label: '用户' },
              { id: 'perf', icon: Activity, label: '性能' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-violet-600 bg-violet-50 border-b-2 border-violet-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="p-4 max-h-80 overflow-auto">
            {activeTab === 'mock' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mockConfig.enabled}
                    onChange={(e) => setMockConfig({ enabled: e.target.checked })}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm">启用Mock数据</span>
                </label>
                
                <div>
                  <label className="text-xs text-gray-500">模拟延迟: {mockConfig.delay}ms</label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={mockConfig.delay}
                    onChange={(e) => setMockConfig({ delay: Number(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">错误率: {(mockConfig.errorRate * 100).toFixed(0)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={mockConfig.errorRate}
                    onChange={(e) => setMockConfig({ errorRate: Number(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>
              </div>
            )}

            {activeTab === 'user' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">当前角色: {user?.role || '未登录'}</p>
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => loginBySSO('mock_token', { role: role.id })}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-violet-50 hover:text-violet-600 transition-colors"
                  >
                    切换为: {role.name}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'perf' && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">页面加载:</span>
                  <span>{perfReport.pageLoadTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">API调用数:</span>
                  <span>{perfReport.apiStats.reduce((sum, s) => sum + s.count, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">错误数:</span>
                  <span className={perfReport.errorCount > 0 ? 'text-red-500' : ''}>
                    {perfReport.errorCount}
                  </span>
                </div>
                
                {perfReport.apiStats.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">API平均响应时间:</p>
                    {perfReport.apiStats.slice(0, 3).map((stat) => (
                      <div key={stat.name} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate flex-1">{stat.name}</span>
                        <span>{stat.avg.toFixed(0)}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
