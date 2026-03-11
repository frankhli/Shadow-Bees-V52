/**
 * Shadow-Bees V52 - 市场情报
 * 区域事件、竞品监控、机会预警
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Target,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// 事件类型配置
const eventTypeConfig = {
  concert: { label: '演唱会', color: '#A855F7', bgColor: 'bg-purple-500/10', icon: '🎤' },
  exhibition: { label: '展会', color: '#00E396', bgColor: 'bg-green-500/10', icon: '🏢' },
  sports: { label: '赛事', color: '#FFB800', bgColor: 'bg-amber-500/10', icon: '🏆' },
  holiday: { label: '节假日', color: '#FF6B6B', bgColor: 'bg-red-500/10', icon: '🎉' },
};

// 模拟事件数据
const mockEvents = [
  { id: '1', name: '周杰伦演唱会', type: 'concert', location: '鸟巢', date: '2026-03-15', affectedHotels: ['三里屯店', '亚运村店'], priceImpact: '+30%' },
  { id: '2', name: '国际车展', type: 'exhibition', location: '国展中心', date: '2026-03-20', affectedHotels: ['国贸店', '望京店'], priceImpact: '+20%' },
  { id: '3', name: '春节假期', type: 'holiday', location: '全市', date: '2026-02-08', affectedHotels: ['全部门店'], priceImpact: '+35%' },
];

// 模拟竞品数据
const mockCompetitors = [
  { id: '1', name: '亚朵酒店·三里屯店', distance: '0.5km', ourPrice: 580, theirPrice: 620, occupancy: 92 },
  { id: '2', name: '全季酒店·国贸店', distance: '0.8km', ourPrice: 520, theirPrice: 480, occupancy: 85 },
  { id: '3', name: '桔子酒店·望京店', distance: '1.2km', ourPrice: 460, theirPrice: 440, occupancy: 78 },
];

export function Market() {
  useGroupStore();
  const [activeTab, setActiveTab] = useState<'events' | 'competitors' | 'opportunities'>('events');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">市场情报</h1>
          <p className="text-text-secondary text-sm mt-1">
            区域事件监控 · 竞品价格追踪 · 市场机会预警
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
          { key: 'events', label: '区域事件', icon: Calendar },
          { key: 'competitors', label: '竞品监控', icon: Building2 },
          { key: 'opportunities', label: '机会预警', icon: Target },
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
        {activeTab === 'events' && (
          <motion.div
            key="events"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 事件地图概览 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-semibold">区域事件地图</h3>
                <p className="text-xs text-text-secondary">未来30天 · {mockEvents.length} 个重大事件</p>
              </div>
            </div>
            
            {/* 模拟地图 */}
            <div className="h-64 bg-bg-tertiary rounded-xl border border-border-color relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-text-secondary">
                  <Radar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>事件地图加载中...</p>
                </div>
              </div>
              {/* 事件标记 */}
              {mockEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    background: eventTypeConfig[event.type as keyof typeof eventTypeConfig].bgColor,
                    left: `${20 + index * 30}%`,
                    top: `${30 + index * 15}%`,
                  }}
                  title={event.name}
                >
                  {eventTypeConfig[event.type as keyof typeof eventTypeConfig].icon}
                </div>
              ))}
            </div>
          </div>

          {/* 事件列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color">
              <h3 className="font-semibold">即将发生的事件</h3>
            </div>
            <div className="divide-y divide-border-color">
              {mockEvents.map((event) => {
                const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig];
                return (
                  <div key={event.id} className="p-4 hover:bg-surface-hover transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center text-xl`}>
                          {config.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{event.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor}`} style={{ color: config.color }}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mt-1">
                            📍 {event.location} · 📅 {event.date}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            影响门店: {event.affectedHotels.join('、')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-neon-green font-semibold">{event.priceImpact}</div>
                        <button
                          onClick={() => alert(`查看 ${event.name} 的定价建议`)}
                          className="text-xs text-neon-purple hover:underline mt-1"
                        >
                          查看建议
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </motion.div>
        )}

        {activeTab === 'competitors' && (
          <motion.div
            key="competitors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-surface rounded-xl border border-border-color overflow-hidden"
          >
          <div className="p-4 border-b border-border-color flex items-center justify-between">
            <h3 className="font-semibold">周边竞品监控</h3>
            <span className="text-xs text-text-secondary">实时更新</span>
          </div>
          <div className="divide-y divide-border-color">
            {mockCompetitors.map((comp) => (
              <div key={comp.id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{comp.name}</h4>
                    <p className="text-xs text-text-secondary mt-1">
                      📍 距离 {comp.distance} · 🏨 入住率 {comp.occupancy}%
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-text-muted">我们:</span>
                        <span className="font-semibold ml-1">¥{comp.ourPrice}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-text-muted">竞品:</span>
                        <span className="font-semibold ml-1">¥{comp.theirPrice}</span>
                      </div>
                      <div className={`text-sm font-medium ${comp.ourPrice < comp.theirPrice ? 'text-neon-green' : 'text-neon-red'}`}>
                        {comp.ourPrice < comp.theirPrice ? '↓' : '↑'} ¥{Math.abs(comp.ourPrice - comp.theirPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </motion.div>
        )}

        {activeTab === 'opportunities' && (
          <motion.div
            key="opportunities"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-neon-purple" />
              <span className="font-semibold text-neon-purple">🔥 紧急机会</span>
            </div>
            <p className="text-sm">周杰伦演唱会加场，周边酒店已售罄，建议立即提价</p>
            <button
              onClick={() => alert('定价策略已下发到各门店')}
              className="mt-2 px-3 py-1.5 text-xs bg-neon-purple text-white rounded-lg"
            >
              一键下发定价策略
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h3 className="font-semibold">优化建议</h3>
                <p className="text-xs text-text-secondary">基于AI分析的市场机会</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-neon-purple flex-shrink-0 mt-0.5" />
                <span>望京店闲鱼标题可优化，参考竞品TOP3写法，预计曝光提升 25%</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-neon-purple flex-shrink-0 mt-0.5" />
                <span>三里屯店周末定价偏低，建议上调 15% 以匹配市场需求</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-neon-purple flex-shrink-0 mt-0.5" />
                <span>国贸店小红书内容互动率低，建议增加视频类内容</span>
              </li>
            </ul>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Market;
