/**
 * Shadow-Bees V52 - 集团收益管理
 * 实时定价看板、价格监控、审批中心
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// 模拟酒店定价数据
const mockHotelPricing = [
  { id: '1', name: '三里屯精品店', standard: 580, deluxe: 780, family: 680, suite: 1280, deviation: 0, status: 'normal' },
  { id: '2', name: '国贸商务店', standard: 620, deluxe: 820, family: null, suite: 1580, deviation: 5, status: 'normal' },
  { id: '3', name: '望京科技店', standard: 480, deluxe: 620, family: 580, suite: 980, deviation: -12, status: 'low' },
  { id: '4', name: '朝阳门店', standard: 520, deluxe: 680, family: 620, suite: 1080, deviation: 0, status: 'normal' },
  { id: '5', name: '亚运村店', standard: 450, deluxe: 580, family: 520, suite: 880, deviation: 8, status: 'high' },
];

// 模拟审批数据
const mockApprovals = [
  { id: '1', hotel: '三里屯精品店', type: '提价申请', from: 580, to: 680, reason: '演唱会期间需求激增', status: 'pending', time: '10分钟前' },
  { id: '2', hotel: '国贸商务店', type: '促销申请', from: 620, to: 520, reason: '周末特惠活动', status: 'approved', time: '1小时前' },
  { id: '3', hotel: '望京科技店', type: '调价申请', from: 480, to: 550, reason: '竞品价格上涨', status: 'rejected', time: '2小时前' },
];

export function Revenue() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'approval'>('pricing');
  const { hotels } = useGroupStore();

  const getDeviationColor = (deviation: number) => {
    if (deviation > 10) return 'text-neon-red';
    if (deviation < -10) return 'text-neon-amber';
    return 'text-neon-green';
  };

  const getDeviationBg = (deviation: number) => {
    if (deviation > 10) return 'bg-neon-red/10';
    if (deviation < -10) return 'bg-neon-amber/10';
    return 'bg-neon-green/10';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">集团收益</h1>
          <p className="text-text-secondary text-sm mt-1">
            实时定价监控 · 价格异常预警 · 审批管理
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
          { key: 'pricing', label: '实时定价', icon: DollarSign },
          { key: 'approval', label: '审批中心', icon: CheckCircle },
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

      {/* Tab内容 */}
      <AnimatePresence mode="wait">
        {activeTab === 'pricing' && (
          <motion.div
            key="pricing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: '监控酒店数', value: hotels.length, subtext: '家门店', icon: Building2, color: '#A855F7' },
              { label: '平均房价', value: '¥536', subtext: 'ADR', icon: DollarSign, color: '#00E396' },
              { label: '价格异常', value: '2', subtext: '家需关注', icon: AlertTriangle, color: '#FFB800' },
              { label: '实时入住率', value: '82%', subtext: '集团平均', icon: TrendingUp, color: '#00A8FF' },
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
                    <p className="text-xs text-text-muted mt-1">{stat.subtext}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 定价看板表格 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color flex items-center justify-between">
              <h3 className="font-semibold">实时定价看板</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-green" />
                  正常
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-amber" />
                  偏低
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-red" />
                  偏高
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="text-left text-xs font-medium text-text-secondary py-3 px-4">酒店</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">标准大床</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">豪华大床</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">家庭房</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">套房</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">偏离度</th>
                    <th className="text-center text-xs font-medium text-text-secondary py-3 px-4">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {mockHotelPricing.map((hotel) => (
                    <tr key={hotel.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-4 font-medium">{hotel.name}</td>
                      <td className="py-3 px-4 text-center">¥{hotel.standard}</td>
                      <td className="py-3 px-4 text-center">¥{hotel.deluxe}</td>
                      <td className="py-3 px-4 text-center">{hotel.family ? `¥${hotel.family}` : '-'}</td>
                      <td className="py-3 px-4 text-center">¥{hotel.suite}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-medium ${getDeviationColor(hotel.deviation)}`}>
                          {hotel.deviation > 0 ? '+' : ''}{hotel.deviation}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${getDeviationBg(hotel.deviation)} ${getDeviationColor(hotel.deviation)}`}>
                          {hotel.deviation > 10 ? '偏高' : hotel.deviation < -10 ? '偏低' : '正常'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </motion.div>
        )}

        {activeTab === 'approval' && (
          <motion.div
            key="approval"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-surface rounded-xl border border-border-color overflow-hidden"
          >
          <div className="p-4 border-b border-border-color">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">价格审批</h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs bg-neon-amber/10 text-neon-amber">
                  待审批 {mockApprovals.filter(a => a.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border-color">
            {mockApprovals.map((approval) => (
              <div key={approval.id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{approval.hotel}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        approval.status === 'pending' ? 'bg-neon-amber/10 text-neon-amber' :
                        approval.status === 'approved' ? 'bg-neon-green/10 text-neon-green' :
                        'bg-neon-red/10 text-neon-red'
                      }`}>
                        {approval.status === 'pending' ? '待审批' :
                         approval.status === 'approved' ? '已通过' : '已驳回'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {approval.type}: ¥{approval.from} → ¥{approval.to}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      原因: {approval.reason} · <Clock className="w-3 h-3 inline" /> {approval.time}
                    </p>
                  </div>
                  {approval.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => alert('已通过该申请')} className="px-3 py-1.5 text-xs bg-neon-green text-white rounded-lg hover:bg-neon-green/90 transition-colors">
                        通过
                      </button>
                      <button onClick={() => alert('已驳回该申请')} className="px-3 py-1.5 text-xs bg-neon-red text-white rounded-lg hover:bg-neon-red/90 transition-colors">
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Revenue;
