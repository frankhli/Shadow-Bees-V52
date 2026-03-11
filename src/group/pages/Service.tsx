/**
 * Shadow-Bees V52 - 客户咨询
 * 客服数据看板、话术库管理、客诉处理
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Headphones,
  ThumbsUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// 模拟话术库数据
const mockScripts = [
  { id: '1', category: '价格咨询', content: '您好，我们酒店的价格是根据市场行情动态调整的，当前价格已经是最优惠的了。', usage: 128, rating: 4.8 },
  { id: '2', category: '位置咨询', content: '我们酒店位于市中心，距离地铁站步行5分钟，周边有多个商圈。', usage: 96, rating: 4.9 },
  { id: '3', category: '发票问题', content: '我们可以提供增值税普通发票，请在离店时向前台索取。', usage: 85, rating: 4.7 },
  { id: '4', category: '退改政策', content: '入住前一天可免费取消，当天取消需收取首晚房费。', usage: 72, rating: 4.6 },
];

// 模拟客诉数据
const mockComplaints = [
  { id: '1', hotel: '三里屯精品店', customer: '张先生', issue: '房间卫生问题', status: 'pending', time: '2小时前', priority: 'high' },
  { id: '2', hotel: '国贸商务店', customer: '李女士', issue: '空调故障', status: 'processing', time: '4小时前', priority: 'medium' },
  { id: '3', hotel: '望京科技店', customer: '王先生', issue: '噪音投诉', status: 'resolved', time: '1天前', priority: 'low' },
];

export function Service() {
  const [activeTab, setActiveTab] = useState<'data' | 'scripts' | 'complaints'>('data');
  const { hotels } = useGroupStore();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">客户咨询</h1>
          <p className="text-text-secondary text-sm mt-1">
            客服数据分析 · 话术库管理 · 客诉处理
          </p>
        </div>
      </motion.div>

      {/* Tab切换 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit"
      >
        {[
          { key: 'data', label: '客服数据', icon: TrendingUp },
          { key: 'scripts', label: '话术库', icon: FileText },
          { key: 'complaints', label: '客诉管理', icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab 内容区域 */}
      <AnimatePresence mode="wait">
        {activeTab === 'data' && (
          <motion.div
            key="data"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '总会话数', value: '12,856', change: '+23%', icon: MessageCircle, color: '#A855F7' },
              { label: 'AI解决率', value: '87.3%', change: '+5.2%', icon: Headphones, color: '#00E396' },
              { label: '满意度', value: '4.6', subtext: '/5.0', change: '+0.3', icon: ThumbsUp, color: '#FFB800' },
              { label: '平均响应', value: '18s', change: '-3s', icon: Clock, color: '#00A8FF' },
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
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                      {stat.subtext && <span className="text-sm text-text-muted">{stat.subtext}</span>}
                    </div>
                    <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-neon-green' : 'text-neon-green'}`}>
                      {stat.change} 较上月
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 各店客服质量排行 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold">各店客服质量排行</h3>
            </div>
            <div className="divide-y divide-border-color">
              {hotels.slice(0, 5).map((hotel, index) => (
                  <div key={hotel.id} className="p-4 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-sm font-bold text-text-secondary">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{hotel.name}</h4>
                          <p className="text-xs text-text-secondary mt-1">店长: {hotel.manager}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-text-muted text-xs">满意度</p>
                          <p className="font-semibold text-neon-purple">{hotel.serviceScore}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-text-muted text-xs">AI解决率</p>
                          <p className="font-semibold text-neon-green">{hotel.aiResolutionRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-text-muted text-xs">会话数</p>
                          <p className="font-semibold">{Math.floor(Math.random() * 500 + 800)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

        {activeTab === 'scripts' && (
          <motion.div
            key="scripts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 操作栏 */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索话术..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none"
              />
            </div>
            <button 
              onClick={() => alert('新建话术')}
              className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建话术
            </button>
          </div>

          {/* 话术列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold">标准话术 ({mockScripts.length})</h3>
            </div>
            <div className="divide-y divide-border-color">
              {mockScripts.map((script) => (
                <div key={script.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-neon-purple/10 text-neon-purple">
                          {script.category}
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          使用 {script.usage} 次
                        </span>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          评分 {script.rating}
                        </span>
                      </div>
                      <p className="text-sm">{script.content}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={() => alert('编辑话术')}
                        className="px-3 py-1.5 text-xs border border-border-color rounded-lg hover:bg-surface-hover transition-colors"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => alert('下发话术')}
                        className="px-3 py-1.5 text-xs text-neon-purple border border-neon-purple/30 rounded-lg hover:bg-neon-purple/5 transition-colors"
                      >
                        下发
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

        {activeTab === 'complaints' && (
          <motion.div
            key="complaints"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 统计 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '待处理', value: mockComplaints.filter(c => c.status === 'pending').length, color: '#FF4757', icon: AlertTriangle },
              { label: '处理中', value: mockComplaints.filter(c => c.status === 'processing').length, color: '#FFB800', icon: Clock },
              { label: '已解决', value: mockComplaints.filter(c => c.status === 'resolved').length, color: '#00E396', icon: CheckCircle },
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

          {/* 客诉列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold">客诉列表</h3>
            </div>
            <div className="divide-y divide-border-color">
              {mockComplaints.map((complaint) => (
                <div key={complaint.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{complaint.issue}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          complaint.priority === 'high' ? 'bg-neon-red/10 text-neon-red' :
                          complaint.priority === 'medium' ? 'bg-neon-amber/10 text-neon-amber' :
                          'bg-neon-green/10 text-neon-green'
                        }`}>
                          {complaint.priority === 'high' ? '高' : complaint.priority === 'medium' ? '中' : '低'}优先级
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          complaint.status === 'pending' ? 'bg-neon-red/10 text-neon-red' :
                          complaint.status === 'processing' ? 'bg-neon-amber/10 text-neon-amber' :
                          'bg-neon-green/10 text-neon-green'
                        }`}>
                          {complaint.status === 'pending' ? '待处理' : complaint.status === 'processing' ? '处理中' : '已解决'}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {complaint.hotel} · {complaint.customer} · <Clock className="w-3 h-3 inline" /> {complaint.time}
                      </p>
                    </div>
                    {complaint.status !== 'resolved' && (
                      <button 
                        onClick={() => alert('处理客诉')}
                        className="px-3 py-1.5 text-xs bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
                      >
                        处理
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default Service;
