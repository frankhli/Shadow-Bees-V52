/**
 * Shadow-Bees V52 - 集团异常中心
 * 异常聚合、处理、追踪
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Building2,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

export function AnomalyCenter() {
  const { anomalies, hotels } = useGroupStore();

  const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
  const warningAnomalies = anomalies.filter(a => a.level === 'warning');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">异常中心</h1>
          <p className="text-text-secondary text-sm mt-1">
            集团旗下酒店异常监控与处理 · 共 {anomalies.length} 项异常
          </p>
        </div>
        <div className="flex items-center gap-3">
          {criticalAnomalies.length > 0 && (
            <div className="px-3 py-1.5 bg-neon-red/10 rounded-lg border border-neon-red/30">
              <span className="text-neon-red text-sm font-medium">
                🔴 {criticalAnomalies.length} 个严重异常
              </span>
            </div>
          )}
          {warningAnomalies.length > 0 && (
            <div className="px-3 py-1.5 bg-neon-amber/10 rounded-lg border border-neon-amber/30">
              <span className="text-neon-amber text-sm font-medium">
                ⚠️ {warningAnomalies.length} 个警告
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '待处理', value: anomalies.filter(a => a.status === 'pending').length, color: '#FF4757', icon: AlertOctagon },
          { label: '处理中', value: anomalies.filter(a => a.status === 'processing').length, color: '#FFB800', icon: Clock },
          { label: '已解决', value: anomalies.filter(a => a.status === 'resolved').length, color: '#00E396', icon: CheckCircle },
          { label: '今日新增', value: 3, color: '#A855F7', icon: AlertTriangle },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface rounded-xl border border-border-color p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 筛选栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索异常或酒店..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select className="px-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none">
            <option value="all">全部类型</option>
            <option value="pricing">定价</option>
            <option value="inventory">库存</option>
            <option value="content">内容</option>
            <option value="service">客服</option>
          </select>
          <select className="px-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none">
            <option value="all">全部酒店</option>
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 异常列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface rounded-xl border border-border-color overflow-hidden"
      >
        <div className="p-4 border-b border-border-color">
          <h3 className="font-semibold">异常列表</h3>
        </div>
        <div className="divide-y divide-border-color">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="p-4 hover:bg-surface-hover transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {anomaly.level === 'critical' ? (
                    <AlertOctagon className="w-5 h-5 text-neon-red flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-neon-amber flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{anomaly.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        anomaly.type === 'pricing' ? 'bg-purple-400/10 text-purple-400' :
                        anomaly.type === 'inventory' ? 'bg-cyan-400/10 text-cyan-400' :
                        anomaly.type === 'content' ? 'bg-amber-400/10 text-amber-400' :
                        'bg-pink-400/10 text-pink-400'
                      }`}>
                        {anomaly.type === 'pricing' ? '定价' :
                         anomaly.type === 'inventory' ? '库存' :
                         anomaly.type === 'content' ? '内容' : '客服'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">{anomaly.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {anomaly.hotelName}
                      </span>
                      <span>{new Date(anomaly.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    anomaly.status === 'pending' ? 'bg-neon-red/10 text-neon-red' :
                    anomaly.status === 'processing' ? 'bg-neon-amber/10 text-neon-amber' :
                    'bg-neon-green/10 text-neon-green'
                  }`}>
                    {anomaly.status === 'pending' ? '待处理' :
                     anomaly.status === 'processing' ? '处理中' : '已解决'}
                  </span>
                  <button 
                    onClick={() => alert(`处理异常: ${anomaly.title}`)}
                    className="px-3 py-1.5 text-xs bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
                  >
                    处理
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default AnomalyCenter;
