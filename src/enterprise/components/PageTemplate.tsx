/**
 * 页面模板 - 统一页面结构
 */
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageTemplate({ title, subtitle, children, actions }: PageTemplateProps) {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-text-secondary text-sm mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </motion.div>

      {/* 页面内容 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
}

export function StatCard({ title, value, subtext, trend, trendValue, icon }: StatCardProps) {
  return (
    <div className="enterprise-stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary">{title}</span>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={`text-xs ${
              trend === 'up' ? 'text-neon-green' : 
              trend === 'down' ? 'text-neon-red' : 
              'text-text-muted'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'} {trendValue}
            </span>
          )}
          {subtext && <span className="text-xs text-text-secondary">{subtext}</span>}
        </div>
      )}
    </div>
  );
}

// 工作台布局（数据区+操作区）
interface WorkbenchLayoutProps {
  dataArea: ReactNode;
  operationArea: ReactNode;
  dataWidth?: string;
}

export function WorkbenchLayout({ dataArea, operationArea, dataWidth = '70%' }: WorkbenchLayoutProps) {
  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* 数据区 */}
      <div style={{ width: dataWidth }} className="flex flex-col gap-4">
        {dataArea}
      </div>
      {/* 操作区 */}
      <div style={{ width: `calc(100% - ${dataWidth} - 1.5rem)` }} className="flex flex-col gap-4">
        {operationArea}
      </div>
    </div>
  );
}
