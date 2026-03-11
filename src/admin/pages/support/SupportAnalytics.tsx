/**
 * SaaS运营后台 - 工单分析
 * 工单数据分析、趋势、效率分析
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Clock,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import { Button, useToast } from '../../components/ui';
import { Card } from '@/components/ui/card';




export default function SupportAnalyticsPage() {
  const { tickets } = useAdminStore();
  const navigate = useNavigate();
  const { success } = useToast();
  const [timeRange, setTimeRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('volume');

  // 统计数据 - 基于真实工单
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'open').length;
    const processing = tickets.filter(t => t.status === 'processing').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    
    return [
      { label: '工单总数', value: total, icon: BarChart3, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
      { label: '待处理', value: pending, icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      { label: '处理中', value: processing, icon: Target, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
      { label: '已解决', value: resolved, icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
    ];
  }, [tickets]);

  // 工单类型分布 - 基于真实数据
  const ticketTypes = useMemo(() => {
    const counts: Record<string, number> = { tech: 0, business: 0, consult: 0, other: 0 };
    tickets.forEach(t => {
      if (counts[t.type] !== undefined) {
        counts[t.type]++;
      } else {
        counts.other++;
      }
    });
    return [
      { id: 'tech', name: '技术问题', count: counts.tech, color: '#3B82F6' },
      { id: 'business', name: '业务咨询', count: counts.business, color: '#10B981' },
      { id: 'consult', name: '功能咨询', count: counts.consult, color: '#F59E0B' },
      { id: 'other', name: '其他', count: counts.other, color: '#6B7280' },
    ].filter(t => t.count > 0);
  }, [tickets]);

  // 趋势数据 - 基于工单创建时间
  const trendData = useMemo(() => {
    const days = parseInt(timeRange) === 7 ? 7 : 14;
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        created: 0,
        resolved: 0,
        dateStr: date.toISOString().split('T')[0],
      };
    });

    tickets.forEach(t => {
      const ticketDate = t.createdAt.split('T')[0];
      const dayData = data.find(d => d.dateStr === ticketDate);
      if (dayData) {
        dayData.created++;
      }
      if (t.resolvedAt) {
        const resolvedDate = t.resolvedAt.split('T')[0];
        const resolvedDay = data.find(d => d.dateStr === resolvedDate);
        if (resolvedDay) {
          resolvedDay.resolved++;
        }
      }
    });

    return data;
  }, [tickets, timeRange]);

  // 优先级分布 - 基于真实数据
  const priorityData = useMemo(() => {
    const counts = {
      urgent: tickets.filter(t => t.priority === 'urgent').length,
      high: tickets.filter(t => t.priority === 'high').length,
      medium: tickets.filter(t => t.priority === 'medium').length,
      low: tickets.filter(t => t.priority === 'low').length,
    };
    return [
      { name: '紧急', value: counts.urgent, color: '#EF4444' },
      { name: '高', value: counts.high, color: '#F97316' },
      { name: '中', value: counts.medium, color: '#F59E0B' },
      { name: '低', value: counts.low, color: '#3B82F6' },
    ];
  }, [tickets]);

  // 客服绩效 - 基于工单的 assignedTo
  const agentPerformance = useMemo(() => {
    const agentMap: Record<string, { name: string; resolved: number; avgTime: number; totalTime: number }> = {};
    
    tickets.forEach(t => {
      if (t.assignedTo) {
        if (!agentMap[t.assignedTo]) {
          agentMap[t.assignedTo] = { 
            name: t.assignedToName || t.assignedTo, 
            resolved: 0, 
            avgTime: 0,
            totalTime: 0,
          };
        }
        if (t.status === 'resolved' || t.status === 'closed') {
          agentMap[t.assignedTo].resolved++;
          if (t.resolvedAt) {
            const created = new Date(t.createdAt).getTime();
            const resolved = new Date(t.resolvedAt).getTime();
            agentMap[t.assignedTo].totalTime += (resolved - created) / (1000 * 60 * 60); // hours
          }
        }
      }
    });

    return Object.values(agentMap).map(a => ({
      name: a.name,
      resolved: a.resolved,
      avgTime: a.resolved > 0 ? Math.round((a.totalTime / a.resolved) * 10) / 10 : 0,
      satisfaction: 95 + Math.floor(Math.random() * 5), // 模拟满意度
    })).sort((a, b) => b.resolved - a.resolved);
  }, [tickets]);

  // 计算平均处理时长
  const avgProcessTime = useMemo(() => {
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    if (resolvedTickets.length === 0) return 0;
    
    const totalHours = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const resolved = new Date(t.resolvedAt!).getTime();
      return sum + (resolved - created) / (1000 * 60 * 60);
    }, 0);
    
    return Math.round((totalHours / resolvedTickets.length) * 10) / 10;
  }, [tickets]);

  // 计算平均首次响应时间
  const avgFirstResponse = useMemo(() => {
    const ticketsWithResponse = tickets.filter(t => 
      t.messages.some(m => m.sender === 'admin')
    );
    if (ticketsWithResponse.length === 0) return 0;
    
    const totalMinutes = ticketsWithResponse.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const firstResponse = t.messages.find(m => m.sender === 'admin');
      if (firstResponse) {
        const responseTime = new Date(firstResponse.timestamp).getTime();
        return sum + (responseTime - created) / (1000 * 60);
      }
      return sum;
    }, 0);
    
    return Math.round(totalMinutes / ticketsWithResponse.length);
  }, [tickets]);

  // 处理导出
  const handleExport = () => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'open').length;
    const processing = tickets.filter(t => t.status === 'processing').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    
    const csvContent = [
      ['工单分析报告', '', '', ''],
      ['导出时间', new Date().toLocaleString('zh-CN'), '', ''],
      ['', '', '', ''],
      ['统计项', '数值', '', ''],
      ['工单总数', total, '', ''],
      ['待处理', pending, '', ''],
      ['处理中', processing, '', ''],
      ['已解决', resolved, '', ''],
      ['', '', '', ''],
      ['工单ID', '标题', '状态', '优先级', '类型', '创建时间', '处理人'],
      ...tickets.map(t => [
        t.id,
        t.title,
        t.status,
        t.priority,
        t.type,
        new Date(t.createdAt).toLocaleString('zh-CN'),
        t.assignedToName || t.assignedTo || '未分配'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `工单分析报告_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    success('分析报告已导出');
  };

  const handleViewAll = () => {
    navigate('/admin/support/tickets');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">工单分析</h1>
          <p className="text-gray-400 mt-1">工单数据分析与效率评估</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
          >
            <option value="7">近7天</option>
            <option value="30">近30天</option>
            <option value="90">近90天</option>
          </select>
          <Button variant="secondary" icon={<Download />} onClick={handleExport}>
            导出分析
          </Button>
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon size={24} className={stat.color} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 趋势图 + 分布 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 工单趋势 */}
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">工单趋势</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMetric('volume')}
                className={`px-3 py-1 rounded-lg text-sm ${selectedMetric === 'volume' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'}`}
              >
                数量
              </button>
              <button
                onClick={() => setSelectedMetric('time')}
                className={`px-3 py-1 rounded-lg text-sm ${selectedMetric === 'time' ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'}`}
              >
                处理时长
              </button>
            </div>
          </div>
          <div className="h-56 flex items-end gap-2">
            {trendData.map((day, index) => {
              const maxValue = Math.max(...trendData.flatMap(d => [d.created, d.resolved]), 1);
              const createdHeight = maxValue > 0 ? (day.created / maxValue) * 100 : 0;
              const resolvedHeight = maxValue > 0 ? (day.resolved / maxValue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 h-48 items-end">
                    <div
                      className="flex-1 bg-blue-500/60 rounded-t transition-all min-h-[4px]"
                      style={{ height: `${Math.max(createdHeight, 4)}%` }}
                      title={`新建: ${day.created}`}
                    />
                    <div
                      className="flex-1 bg-emerald-500/60 rounded-t transition-all min-h-[4px]"
                      style={{ height: `${Math.max(resolvedHeight, 4)}%` }}
                      title={`解决: ${day.resolved}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{day.date}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-gray-400 text-sm">新建工单</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-gray-400 text-sm">已解决</span>
            </div>
          </div>
        </Card>

        {/* 工单类型分布 */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">工单类型分布</h3>
          <div className="space-y-3">
            {ticketTypes.map((type) => (
              <div key={type.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300 text-sm">{type.name}</span>
                  <span className="text-white font-medium">{type.count}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${(type.count / Math.max(tickets.length, 1)) * 100}%`, 
                      backgroundColor: type.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 客服绩效 + 优先级分布 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 客服绩效 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">客服绩效排行</h3>
            <Button variant="ghost" size="sm" onClick={handleViewAll}>查看全部</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">客服</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">解决数</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">平均时长</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.length > 0 ? agentPerformance.map((agent, index) => (
                  <tr key={agent.name} className="border-b border-gray-800">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-white">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-white">{agent.resolved}</td>
                    <td className="py-3 px-2 text-white">{agent.avgTime}h</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 优先级分布 */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">优先级分布</h3>
          <div className="space-y-4">
            {priorityData.map((priority) => (
              <div key={priority.name} className="flex items-center gap-4">
                <div className="w-16 text-gray-300 text-sm">{priority.name}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-700 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(priority.value / Math.max(tickets.length, 1)) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                      style={{ backgroundColor: priority.color }}
                    >
                      {priority.value > 0 && priority.value}
                    </motion.div>
                  </div>
                </div>
                <div className="w-12 text-right text-gray-400 text-sm">
                  {((priority.value / Math.max(tickets.length, 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">平均处理时长</span>
              <span className="text-white font-medium">{avgProcessTime} 小时</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">首次响应平均</span>
              <span className="text-emerald-400 font-medium">{avgFirstResponse} 分钟</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
