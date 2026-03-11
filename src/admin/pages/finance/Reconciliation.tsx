/**
 * SaaS运营后台 - 对账管理
 * 多渠道对账、差异分析
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  AlertCircle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useAdminStore, type OTAChannel } from '../../stores/adminStore';
import { Button, useToast } from '../../components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const channels: { id: OTAChannel; name: string }[] = [
  { id: 'ctrip', name: '携程' },
  { id: 'meituan', name: '美团' },
  { id: 'fliggy', name: '飞猪' },
];

export default function ReconciliationPage() {
  const { otaOrders } = useAdminStore();
  const [selectedChannel, setSelectedChannel] = useState<OTAChannel | 'all'>('all');
  const [dateRange, setDateRange] = useState('7');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const { success, info } = useToast();

  // 从真实 OTA 订单数据计算统计
  const stats = useMemo(() => {
    const matched = otaOrders.filter(r => r.status === 'matched').length;
    const exception = otaOrders.filter(r => r.status === 'exception').length;
    const pending = otaOrders.filter(r => r.status === 'pending').length;
    const totalDiff = otaOrders.reduce((sum, r) => sum + (r.differenceAmount || 0), 0);
    
    return [
      { label: '已对账', value: matched, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
      { label: '异常待处理', value: exception, color: 'text-red-400', bgColor: 'bg-red-400/10' },
      { label: '待对账', value: pending, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
      { label: '差异金额', value: `¥${totalDiff.toLocaleString()}`, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
    ];
  }, [otaOrders]);

  // 筛选数据
  const filteredData = useMemo(() => {
    if (selectedChannel === 'all') return otaOrders;
    return otaOrders.filter(r => r.channel === selectedChannel);
  }, [otaOrders, selectedChannel]);

  // 获取异常数据
  const exceptionData = useMemo(() => {
    return otaOrders.filter(r => r.status === 'exception');
  }, [otaOrders]);

  // 处理按钮点击
  // 1. handleExport - 导出对账数据为CSV
  const handleExport = () => {
    const headers = ['对账单号', '渠道', '酒店', 'OTA金额', '系统金额', '差异', '状态', '日期'];
    const rows = filteredData.map(item => [
      item.id,
      channels.find(c => c.id === item.channel)?.name || item.channel,
      item.hotelName,
      item.otaAmount,
      item.systemAmount,
      item.differenceAmount || 0,
      item.status === 'matched' ? '已对账' : item.status === 'exception' ? '异常' : '待对账',
      new Date(item.checkInDate).toLocaleDateString('zh-CN'),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `对账单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    success('导出成功', `已导出 ${rows.length} 条对账记录`);
  };

  // 2. handleReconcile - 执行对账（模拟处理）
  const handleReconcile = () => {
    if (isReconciling) return;
    setIsReconciling(true);
    info('对账中', '正在重新执行对账，请稍候...');
    
    setTimeout(() => {
      setIsReconciling(false);
      success('对账完成', '已成功完成对账，发现 ' + exceptionData.length + ' 条异常记录');
    }, 2000);
  };

  // 3. handleFilter - 打开/关闭高级筛选
  const handleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
    info(isFilterOpen ? '筛选已关闭' : '高级筛选', '筛选功能已' + (isFilterOpen ? '关闭' : '开启'));
  };

  // 4. handleDetails - 查看详情（toast提示）
  const handleDetails = () => {
    info('查看详情', '对账详情功能：显示订单明细、差异分析和对账历史');
  };

  // 5. handleProcess - 处理异常（toast提示）
  const handleProcess = () => {
    info('处理异常', '异常处理功能：支持差异调整、手动核销和标记忽略');
  };

  // 获取差异原因
  const getDiffReason = (order: typeof otaOrders[0]) => {
    if (!order.differenceType) return '-';
    const reasons: Record<string, string> = {
      amount_mismatch: '金额不匹配',
      status_mismatch: '状态不一致',
      missing_order: '订单缺失',
    };
    return reasons[order.differenceType] || order.notes || '差异';
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">对账管理</h1>
          <p className="text-gray-400 mt-1">多渠道对账与差异分析</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<RefreshCw />} onClick={handleReconcile}>
            重新对账
          </Button>
          <Button variant="primary" icon={<Download />} onClick={handleExport}>
            导出对账单
          </Button>
        </div>
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
            <Building2 size={18} className="text-gray-400" />
            <span className="text-gray-400">渠道:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedChannel('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedChannel === 'all'
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              全部
            </button>
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChannel(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedChannel === c.id
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-gray-700" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
          >
            <option value="7">近7天</option>
            <option value="30">近30天</option>
            <option value="90">近90天</option>
          </select>
        </div>
      </Card>

      {/* 对账列表 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">对账记录</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索对账单号..."
                className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
              />
            </div>
            <Button variant="secondary" icon={<Filter />} onClick={handleFilter}>
              筛选
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">对账单号</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">渠道</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">酒店</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">OTA金额</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">系统金额</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">差异</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">状态</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-white font-mono">{item.id}</td>
                  <td className="py-3 px-4">
                    <span className="text-white">
                      {channels.find(c => c.id === item.channel)?.name || item.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white">{item.hotelName}</td>
                  <td className="py-3 px-4 text-white">¥{item.otaAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-white">¥{item.systemAmount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    {item.differenceAmount ? (
                      <span className="text-red-400">¥{item.differenceAmount.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.status === 'matched' && <Badge variant="default">已对账</Badge>}
                    {item.status === 'exception' && <Badge variant="destructive">异常</Badge>}
                    {item.status === 'pending' && <Badge variant="secondary">待对账</Badge>}
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" icon={<ArrowRight />} onClick={handleDetails}>
                      详情
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 异常处理 */}
      {exceptionData.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-red-400" />
              待处理异常
            </h3>
            <Badge variant="destructive">{exceptionData.length} 条</Badge>
          </div>
          <div className="space-y-3">
            {exceptionData.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{item.id}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-300">{channels.find(c => c.id === item.channel)?.name || item.channel}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-300">{item.hotelName}</span>
                  </div>
                  <p className="text-red-400 text-sm mt-1">{getDiffReason(item)}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold">¥{(item.differenceAmount || 0).toLocaleString()}</p>
                  <p className="text-gray-400 text-xs">差异金额</p>
                </div>
                <Button variant="primary" size="sm" onClick={handleProcess}>
                  处理
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
