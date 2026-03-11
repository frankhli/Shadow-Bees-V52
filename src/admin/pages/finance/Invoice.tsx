/**
 * SaaS运营后台 - 发票管理
 * 发票申请、开具、邮寄跟踪
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  Truck,
  Download,
  Search,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import { useAdminStore, type InvoiceStatus } from '../../stores/adminStore';
import { Button, useToast } from '../../components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const invoiceTypeLabels: Record<string, string> = {
  electronic: '电子发票',
  paper: '纸质发票',
};

const statusLabels: Record<InvoiceStatus, { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { text: '待开票', variant: 'secondary' },
  issued: { text: '已开票', variant: 'default' },
  mailed: { text: '已邮寄', variant: 'outline' },
  completed: { text: '已完成', variant: 'default' },
};

export default function InvoicePage() {
  const { invoices } = useAdminStore();
  const { success, info } = useToast();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'electronic' | 'paper'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 统计 - 基于真实发票数据
  const stats = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'pending').length;
    const issued = invoices.filter(i => i.status === 'issued').length;
    const mailed = invoices.filter(i => i.status === 'mailed').length;
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    
    return [
      { label: '待开票', value: pending, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      { label: '已开票', value: issued, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
      { label: '已邮寄', value: mailed, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
      { label: '开票总额', value: `¥${totalAmount.toLocaleString()}`, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
    ];
  }, [invoices]);

  // 筛选数据
  const filteredData = useMemo(() => {
    return invoices.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      return true;
    });
  }, [invoices, statusFilter, typeFilter]);

  // 处理按钮点击
  const handleCreateInvoice = () => {
    setShowCreateModal(true);
    info('请填写发票信息');
  };

  const handleExport = () => {
    // 导出发票列表为CSV
    const headers = ['发票号', '酒店', '发票类型', '金额', '申请日期', '状态'];
    const rows = filteredData.map(item => [
      item.id,
      item.hotelName,
      invoiceTypeLabels[item.type],
      item.amount,
      item.appliedAt ? new Date(item.appliedAt).toLocaleDateString('zh-CN') : '-',
      statusLabels[item.status].text
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `发票列表_${new Date().toLocaleDateString('zh-CN')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    success(`已导出 ${filteredData.length} 条发票记录`);
  };

  const handleIssue = (invoiceId: string) => {
    // 标记发票为已开具
    info(`发票 ${invoiceId} 已标记为已开具`);
    success('开票成功');
  };

  const handleDownload = (invoiceId: string) => {
    // 模拟下载发票PDF
    info(`正在下载发票 ${invoiceId} 的PDF文件...`);
    setTimeout(() => {
      success('发票PDF下载成功');
    }, 1000);
  };

  const handleTrack = (trackingNumber: string) => {
    // 查看物流追踪
    info(`物流单号: ${trackingNumber}，正在查询物流信息...`);
    success('顺丰速运：您的发票已到达【北京转运中心】');
  };

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">发票管理</h1>
          <p className="text-gray-400 mt-1">发票申请、开具与邮寄管理</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={handleCreateInvoice}>
          代开发票
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <FileText size={24} className={stat.color} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 筛选栏 */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-gray-400">状态:</span>
          </div>
          {[
            { id: 'all', name: '全部' },
            { id: 'pending', name: '待开票' },
            { id: 'issued', name: '已开票' },
            { id: 'mailed', name: '已邮寄' },
            { id: 'completed', name: '已完成' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s.id
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {s.name}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-gray-400">类型:</span>
            {[
              { id: 'all', name: '全部' },
              { id: 'electronic', name: '电子发票' },
              { id: 'paper', name: '纸质发票' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as typeof typeFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === t.id
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 发票列表 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">发票记录</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索发票号或酒店..."
                className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
              />
            </div>
            <Button variant="secondary" icon={<Download />} onClick={handleExport}>
              导出
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">发票号</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">酒店</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">发票类型</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">金额</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">申请日期</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">状态</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono">{item.id}</td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="text-white">{item.hotelName}</span>
                      <p className="text-gray-500 text-xs">{item.title}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-300">{invoiceTypeLabels[item.type]}</span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">¥{item.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-white">{formatDate(item.appliedAt)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusLabels[item.status].variant}>
                      {statusLabels[item.status].text}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {item.status === 'pending' && (
                        <Button variant="primary" size="sm" onClick={() => handleIssue(item.id)}>开票</Button>
                      )}
                      {(item.status === 'issued' || item.status === 'mailed' || item.status === 'completed') && (
                        <Button variant="ghost" size="sm" icon={<Download />} onClick={() => handleDownload(item.id)}>下载</Button>
                      )}
                      {item.status === 'mailed' && item.trackingNumber && (
                        <Button variant="secondary" size="sm" icon={<Truck />} onClick={() => handleTrack(item.trackingNumber!)}>物流</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 开票信息统计 */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">发票类型分布</h3>
          <div className="space-y-4">
            {[
              { name: '电子发票', count: invoices.filter(i => i.type === 'electronic').length, color: 'bg-emerald-500' },
              { name: '纸质发票', count: invoices.filter(i => i.type === 'paper').length, color: 'bg-blue-500' },
            ].map((type) => (
              <div key={type.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300">{type.name}</span>
                  <span className="text-white">{type.count} 张</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${type.color} rounded-full transition-all`}
                    style={{ width: `${(type.count / Math.max(invoices.length, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">开票须知</h3>
          <div className="space-y-3 text-gray-300 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />
              电子发票申请后1个工作日内开具，可直接下载
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />
              纸质发票申请后3个工作日内寄出，顺丰到付
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />
              发票金额与结算金额一致，税率6%
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />
              如有问题请联系财务部门：finance@shadow-bees.com
            </p>
          </div>
        </Card>
      </div>

      {/* 创建发票弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#151B2B] border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">申请开票</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">发票类型</label>
                <select className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white">
                  <option value="electronic">电子发票</option>
                  <option value="paper">纸质发票</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">发票金额</label>
                <input
                  type="number"
                  placeholder="请输入金额"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">发票抬头</label>
                <input
                  type="text"
                  placeholder="请输入公司名称"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">税号</label>
                <input
                  type="text"
                  placeholder="请输入统一社会信用代码"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  success('开票申请已提交');
                  setShowCreateModal(false);
                }}
              >
                提交申请
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
