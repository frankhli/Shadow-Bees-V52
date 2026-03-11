/**
 * 集团端 - 财务合规中心
 * 功能：发票管理、税务合规、审计跟踪
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  AlertOctagon,
  Clock,
  Percent,
  BarChart3,
  PieChart,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useGroupStore, type TimeRange } from '../stores/groupStore';

// 类型定义
interface TaxCompliance {
  vatRate: number;
  lastDeclarationDate: string;
  nextDeclarationDate: string;
  status: 'compliant' | 'warning' | 'overdue';
  riskItems: string[];
}

interface AuditLog {
  id: string;
  timestamp: string;
  hotelName: string;
  operation: string;
  operator: string;
  amount?: number;
  status: 'normal' | 'warning' | 'critical';
}

// ==================== 组件 ====================

function StatCard({ title, value, subtext, change, icon: Icon, color, onClick }: {
  title: string;
  value: string;
  subtext: string;
  change?: number;
  icon: any;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`p-5 rounded-xl bg-surface border border-border-color ${onClick ? 'cursor-pointer hover:border-neon-purple/50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-text-muted mt-1">{subtext}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}% 环比</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

function InvoiceTypeCard({ type, count, amount, color, totalAmount }: {
  type: string;
  count: number;
  amount: number;
  color: string;
  totalAmount: number;
}) {
  const typeLabels: Record<string, string> = {
    vat: '增值税专用发票',
    normal: '增值税普通发票',
    electronic: '电子普通发票',
  };

  return (
    <div className="p-4 rounded-lg bg-surface-hover">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium">{typeLabels[type] || type}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold">{count}张</p>
          <p className="text-xs text-text-muted">¥{(amount / 10000).toFixed(1)}万</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">占比</p>
          <p className="text-sm font-medium">{((amount / totalAmount) * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

function TaxStatusCard({ compliance }: { compliance: TaxCompliance }) {
  const statusConfig = {
    compliant: { label: '合规', color: 'text-neon-green', bg: 'bg-neon-green/10', icon: CheckCircle },
    warning: { label: '预警', color: 'text-neon-amber', bg: 'bg-neon-amber/10', icon: AlertTriangle },
    overdue: { label: '逾期', color: 'text-neon-red', bg: 'bg-neon-red/10', icon: AlertOctagon },
  };

  const config = statusConfig[compliance.status];
  const Icon = config.icon;

  // 计算距离下次申报的天数
  const daysUntilNext = Math.ceil(
    (new Date(compliance.nextDeclarationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-5 rounded-xl bg-surface border border-border-color">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Percent className="w-5 h-5 text-neon-purple" />
          税务合规状态
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full ${config.bg} ${config.color} flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
          <span className="text-sm text-text-secondary">当前税率</span>
          <span className="font-medium">{compliance.vatRate}%</span>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
          <span className="text-sm text-text-secondary">上次申报</span>
          <span className="font-medium">{compliance.lastDeclarationDate}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
          <span className="text-sm text-text-secondary">下次申报</span>
          <div className="text-right">
            <span className="font-medium">{compliance.nextDeclarationDate}</span>
            <p className={`text-xs ${daysUntilNext <= 7 ? 'text-neon-red' : 'text-text-muted'}`}>
              {daysUntilNext > 0 ? `还剩${daysUntilNext}天` : '已逾期'}
            </p>
          </div>
        </div>
      </div>

      {compliance.riskItems.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-neon-red/5 border border-neon-red/20">
          <p className="text-xs text-neon-red font-medium mb-2">⚠️ 风险提示</p>
          <ul className="space-y-1">
            {compliance.riskItems.map((item: string, idx: number) => (
              <li key={idx} className="text-xs text-text-secondary">• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="rounded-xl bg-surface border border-border-color overflow-hidden">
      <div className="p-4 border-b border-border-color flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-neon-purple" />
          审计日志
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('搜索审计日志\n\n支持按以下维度搜索：\n- 操作类型\n- 操作人\n- 门店名称\n- 金额范围')}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            onClick={() => alert('筛选审计日志\n\n筛选条件：\n- 时间范围\n- 操作类型\n- 状态（正常/警告/异常）\n- 金额范围')}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => alert(`导出审计日志\n\n导出内容：\n- 操作时间\n- 门店名称\n- 操作类型\n- 操作人\n- 金额\n- 状态\n\n格式：Excel/CSV`)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">时间</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">门店</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">操作类型</th>
              <th className="px-4 py-3 text-left text-text-secondary font-medium">操作人</th>
              <th className="px-4 py-3 text-right text-text-secondary font-medium">金额</th>
              <th className="px-4 py-3 text-center text-text-secondary font-medium">状态</th>
              <th className="px-4 py-3 text-center text-text-secondary font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-hover/50">
                <td className="px-4 py-3 text-text-secondary">{log.timestamp}</td>
                <td className="px-4 py-3 font-medium">{log.hotelName}</td>
                <td className="px-4 py-3">{log.operation}</td>
                <td className="px-4 py-3 text-text-secondary">{log.operator}</td>
                <td className="px-4 py-3 text-right">
                  {log.amount ? `¥${log.amount.toLocaleString()}` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    log.status === 'normal' ? 'bg-neon-green/10 text-neon-green' :
                    log.status === 'warning' ? 'bg-neon-amber/10 text-neon-amber' :
                    'bg-neon-red/10 text-neon-red'
                  }`}>
                    {log.status === 'normal' ? '正常' : log.status === 'warning' ? '警告' : '异常'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => alert(`审计详情\n\n操作时间：${log.timestamp}\n门店：${log.hotelName}\n操作：${log.operation}\n操作人：${log.operator}\n金额：${log.amount ? `¥${log.amount.toLocaleString()}` : '-'}\n状态：${log.status === 'normal' ? '正常' : log.status === 'warning' ? '警告' : '异常'}`)}
                    className="p-1 text-text-secondary hover:text-neon-purple rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function FinanceCompliance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'tax' | 'audit'>('overview');
  const { financeStats, selectedTimeRange, setTimeRange, timeRangeLabel } = useGroupStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 使用 store 中的真实数据
  const invoiceStats = financeStats.invoiceStats;
  const taxCompliance = financeStats.taxCompliance;
  const auditLogs = financeStats.auditLogs;

  const tabs = [
    { id: 'overview', label: '总览', icon: BarChart3 },
    { id: 'invoices', label: '发票管理', icon: Receipt },
    { id: 'tax', label: '税务合规', icon: Percent },
    { id: 'audit', label: '审计跟踪', icon: FileText },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 + 时间切换 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-7 h-7 text-neon-purple" />
            财务合规中心
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {timeRangeLabel}财务合规 · 发票管理 · 税务合规 · 审计跟踪
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 时间切换 */}
          <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
            {(['today', 'week', 'month', 'year'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-neon-purple text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {range === 'today' ? '今日' : range === 'week' ? '本周' : range === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-color text-sm hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </motion.div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-neon-purple text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 内容区域 - 带动画 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* 核心统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="本月发票总额"
              value={`¥${(invoiceStats.totalAmount / 10000).toFixed(1)}万`}
              subtext={`共${invoiceStats.totalCount}张发票`}
              change={12.5}
              icon={Receipt}
              color="#A855F7"
            />
            <StatCard
              title="待开发票"
              value={`${invoiceStats.pendingCount}张`}
              subtext={`金额¥${(invoiceStats.pendingAmount / 10000).toFixed(1)}万`}
              icon={Clock}
              color="#FFB800"
            />
            <StatCard
              title="异常票据"
              value={`${invoiceStats.abnormalCount}张`}
              subtext="需人工审核"
              icon={AlertTriangle}
              color="#FF4444"
            />
            <StatCard
              title="增值税率"
              value={`${taxCompliance.vatRate}%`}
              subtext="当前适用税率"
              icon={Percent}
              color="#00E396"
            />
          </div>

          {/* 发票类型分布 + 税务状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-border-color">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-neon-purple" />
                发票类型分布
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {invoiceStats.byType.map((item) => (
                  <InvoiceTypeCard
                    key={item.type}
                    type={item.type}
                    count={item.count}
                    amount={item.amount}
                    totalAmount={invoiceStats.totalAmount}
                    color={item.type === 'vat' ? '#A855F7' : item.type === 'normal' ? '#00A8FF' : '#FFB800'}
                  />
                ))}
              </div>
              
              <div className="mt-6 flex items-center justify-between p-4 rounded-lg bg-surface-hover">
                <div>
                  <p className="text-sm text-text-secondary">电子发票占比</p>
                  <p className="text-lg font-bold">{((invoiceStats.byType[2].count / invoiceStats.totalCount) * 100).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">较上月</p>
                  <p className="text-neon-green flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +8.2%
                  </p>
                </div>
              </div>
            </div>

            <TaxStatusCard compliance={taxCompliance} />
          </div>

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '批量开票', icon: Receipt, color: '#A855F7' },
              { label: '发票查验', icon: Search, color: '#00A8FF' },
              { label: '税务申报', icon: FileText, color: '#00E396' },
              { label: '导出报表', icon: Download, color: '#FFB800' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="p-4 rounded-xl bg-surface border border-border-color hover:border-neon-purple/50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${action.color}20` }}>
                      <Icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-neon-purple transition-colors" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
          </motion.div>
        )}

        {activeTab === 'invoices' && (
          <motion.div
            key="invoices"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="p-8 text-center text-text-secondary"
          >
            <Receipt className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <p className="text-lg font-medium">发票管理模块</p>
            <p className="text-sm mt-2">功能开发中，敬请期待...</p>
          </motion.div>
        )}

        {activeTab === 'tax' && (
          <motion.div
            key="tax"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="p-8 text-center text-text-secondary"
          >
            <Percent className="w-16 h-16 mx-auto mb-4 text-text-muted" />
            <p className="text-lg font-medium">税务合规模块</p>
            <p className="text-sm mt-2">功能开发中，敬请期待...</p>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <AuditLogTable logs={auditLogs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
