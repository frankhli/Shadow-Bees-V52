/**
 * Shadow-Bees V52 - 运营中心
 * 门店健康度监控、培训追踪、运营风险管理
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Building2,
  Zap,
  Search,
} from 'lucide-react';
import { useGroupStore, type HotelInGroup } from '../stores/groupStore';
import { useNavigate } from 'react-router-dom';
import { Heatmap } from '../components/Heatmap';

// ============================================
// 类型定义
// ============================================

interface HealthScoreCardProps {
  hotel: HotelInGroup;
  onClick?: () => void;
}

interface TrainingModule {
  id: string;
  name: string;
  type: 'required' | 'optional';
  completedCount: number;
  totalCount: number;
  avgScore: number;
}

interface RiskAlert {
  id: string;
  hotelId: string;
  hotelName: string;
  type: 'churn' | 'adoption' | 'engagement' | 'satisfaction';
  severity: 'high' | 'medium' | 'low';
  message: string;
  daysOpen: number;
}

// ============================================
// 子组件
// ============================================

function HealthScoreCard({ hotel, onClick }: HealthScoreCardProps) {
  // 计算综合健康度
  const healthScore = useMemo(() => {
    const businessScore = hotel.gmv > 50000 ? 100 : hotel.gmv > 30000 ? 80 : 60;
    const operationScore = (hotel.contentScore + hotel.serviceScore) / 2;
    const systemScore = hotel.systemUsage.dataCompleteness * 100;
    const aiScore = hotel.aiResolutionRate;
    return Math.round((businessScore + operationScore + systemScore + aiScore) / 4);
  }, [hotel]);

  const statusColors = {
    healthy: { bg: 'bg-neon-green/10', border: 'border-neon-green/30', text: 'text-neon-green', icon: CheckCircle },
    warning: { bg: 'bg-neon-amber/10', border: 'border-neon-amber/30', text: 'text-neon-amber', icon: AlertCircle },
    critical: { bg: 'bg-neon-red/10', border: 'border-neon-red/30', text: 'text-neon-red', icon: XCircle },
  };

  const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
  const style = statusColors[status];
  const Icon = style.icon;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${style.bg} ${style.border}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium">{hotel.name}</h4>
          <p className="text-xs text-text-secondary">{hotel.manager}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center`}>
          <span className={`text-xl font-bold ${style.text}`}>{healthScore}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">经营</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
              <div 
                className={`h-full ${hotel.gmv > 50000 ? 'bg-neon-green' : hotel.gmv > 30000 ? 'bg-neon-amber' : 'bg-neon-red'}`}
                style={{ width: `${Math.min(hotel.gmv / 60000 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">系统</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-purple"
                style={{ width: `${hotel.systemUsage.dataCompleteness * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">AI</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
              <div 
                className={`h-full ${hotel.aiResolutionRate > 80 ? 'bg-neon-green' : 'bg-neon-amber'}`}
                style={{ width: `${hotel.aiResolutionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-color">
        <Icon className={`w-4 h-4 ${style.text}`} />
        <span className={`text-xs ${style.text}`}>
          {status === 'healthy' ? '健康' : status === 'warning' ? '需关注' : '高风险'}
        </span>
        {hotel.systemUsage.loginFrequency < 5 && (
          <span className="text-xs text-neon-red ml-auto">低活跃</span>
        )}
      </div>
    </motion.div>
  );
}

function TrainingProgress({ hotels }: { hotels: HotelInGroup[] }) {
  const modules: TrainingModule[] = [
    { id: 'basic', name: '系统基础操作', type: 'required', completedCount: hotels.filter(h => h.training.completed).length, totalCount: hotels.length, avgScore: 85 },
    { id: 'content', name: 'AI内容生成', type: 'required', completedCount: hotels.filter(h => h.systemUsage.featureUsage.aiContent > 0.5).length, totalCount: hotels.length, avgScore: 78 },
    { id: 'service', name: 'AI客服配置', type: 'required', completedCount: hotels.filter(h => h.systemUsage.featureUsage.aiService > 0.5).length, totalCount: hotels.length, avgScore: 72 },
    { id: 'pricing', name: '智能定价策略', type: 'optional', completedCount: hotels.filter(h => h.systemUsage.featureUsage.aiPricing > 0.3).length, totalCount: hotels.length, avgScore: 65 },
  ];

  return (
    <div className="space-y-4">
      {modules.map((module) => {
        const progress = Math.round((module.completedCount / module.totalCount) * 100);
        return (
          <div key={module.id} className="p-4 rounded-xl bg-surface border border-border-color">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{module.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  module.type === 'required' ? 'bg-neon-red/10 text-neon-red' : 'bg-text-muted/10 text-text-muted'
                }`}>
                  {module.type === 'required' ? '必修' : '选修'}
                </span>
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${progress >= 80 ? 'bg-neon-green' : progress >= 50 ? 'bg-neon-amber' : 'bg-neon-red'}`}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{module.completedCount}/{module.totalCount} 家门店完成</span>
              <span>平均分 {module.avgScore}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RiskAlertCard({ alert, onResolve }: { alert: RiskAlert; onResolve: () => void }) {
  const colors = {
    high: { bg: 'bg-neon-red/10', border: 'border-neon-red/30', text: 'text-neon-red' },
    medium: { bg: 'bg-neon-amber/10', border: 'border-neon-amber/30', text: 'text-neon-amber' },
    low: { bg: 'bg-neon-blue/10', border: 'border-neon-blue/30', text: 'text-neon-blue' },
  };
  const style = colors[alert.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle className={`w-5 h-5 ${style.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{alert.hotelName}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                {alert.severity === 'high' ? '高风险' : alert.severity === 'medium' ? '中风险' : '低风险'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">{alert.message}</p>
            <p className="text-xs text-text-muted mt-2">
              已持续 {alert.daysOpen} 天
            </p>
          </div>
        </div>
        <button
          onClick={onResolve}
          className="px-3 py-1.5 text-xs bg-surface border border-border-color rounded-lg hover:bg-surface-hover transition-colors"
        >
          标记处理
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// 主页面
// ============================================

export function OperationsCenter() {
  const { hotels, getTrainingCompletionRate } = useGroupStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'health' | 'training' | 'renewal'>('health');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  // 计算健康度统计
  const healthStats = useMemo(() => {
    const calculateScore = (hotel: HotelInGroup) => {
      const businessScore = hotel.gmv > 50000 ? 100 : hotel.gmv > 30000 ? 80 : 60;
      const operationScore = (hotel.contentScore + hotel.serviceScore) / 2;
      const systemScore = hotel.systemUsage.dataCompleteness * 100;
      const aiScore = hotel.aiResolutionRate;
      return Math.round((businessScore + operationScore + systemScore + aiScore) / 4);
    };

    const scores = hotels.map(calculateScore);
    const healthy = scores.filter(s => s >= 80).length;
    const warning = scores.filter(s => s >= 60 && s < 80).length;
    const critical = scores.filter(s => s < 60).length;

    return { healthy, warning, critical, avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) };
  }, [hotels]);

  // 过滤酒店
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      if (searchQuery && !hotel.name.includes(searchQuery) && !hotel.manager.includes(searchQuery)) {
        return false;
      }
      if (filterStatus !== 'all') {
        const score = Math.round((
          (hotel.gmv > 50000 ? 100 : hotel.gmv > 30000 ? 80 : 60) +
          (hotel.contentScore + hotel.serviceScore) / 2 +
          hotel.systemUsage.dataCompleteness * 100 +
          hotel.aiResolutionRate
        ) / 4);
        const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
        if (status !== filterStatus) return false;
      }
      return true;
    });
  }, [hotels, searchQuery, filterStatus]);

  // 模拟风险预警
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([
    { id: '1', hotelId: 'h1', hotelName: '亚运村店', type: 'churn', severity: 'high', message: '连续7天未登录系统，经理电话沟通无响应', daysOpen: 7 },
    { id: '2', hotelId: 'h2', hotelName: '望京店', type: 'adoption', severity: 'medium', message: 'AI功能使用率连续30天下降，从85%降至52%', daysOpen: 5 },
    { id: '3', hotelId: 'h3', hotelName: '三里屯店', type: 'engagement', severity: 'low', message: '数据同步延迟超过24小时，可能影响定价策略', daysOpen: 2 },
  ]);

  const handleResolveAlert = (alertId: string) => {
    setRiskAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const trainingRate = getTrainingCompletionRate();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">运营中心</h1>
          <p className="text-text-secondary text-sm mt-1">
            追踪门店健康度 · 预警运营风险 · 推进培训落地
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-color text-sm">
            <Activity className="w-4 h-4 text-neon-purple" />
            <span>平均健康度</span>
            <span className="font-bold text-neon-purple">{healthStats.avgScore}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-color text-sm">
            <GraduationCap className="w-4 h-4 text-neon-green" />
            <span>培训完成率</span>
            <span className="font-bold text-neon-green">{trainingRate}%</span>
          </div>
        </div>
      </motion.div>

      {/* 健康度概览卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl bg-neon-green/5 border border-neon-green/20 text-center cursor-pointer hover:bg-neon-green/10 transition-colors"
          onClick={() => setFilterStatus('healthy')}
        >
          <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-neon-green" />
          </div>
          <p className="text-3xl font-bold text-neon-green">{healthStats.healthy}</p>
          <p className="text-sm text-text-secondary mt-1">健康门店</p>
          <p className="text-xs text-text-muted mt-1">健康度 ≥80</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-xl bg-neon-amber/5 border border-neon-amber/20 text-center cursor-pointer hover:bg-neon-amber/10 transition-colors"
          onClick={() => setFilterStatus('warning')}
        >
          <div className="w-16 h-16 rounded-full bg-neon-amber/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-8 h-8 text-neon-amber" />
          </div>
          <p className="text-3xl font-bold text-neon-amber">{healthStats.warning}</p>
          <p className="text-sm text-text-secondary mt-1">需关注</p>
          <p className="text-xs text-text-muted mt-1">健康度 60-79</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-xl bg-neon-red/5 border border-neon-red/20 text-center cursor-pointer hover:bg-neon-red/10 transition-colors"
          onClick={() => setFilterStatus('critical')}
        >
          <div className="w-16 h-16 rounded-full bg-neon-red/10 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-8 h-8 text-neon-red" />
          </div>
          <p className="text-3xl font-bold text-neon-red">{healthStats.critical}</p>
          <p className="text-sm text-text-secondary mt-1">高风险</p>
          <p className="text-xs text-text-muted mt-1">健康度 &lt;60</p>
        </motion.div>
      </div>

      {/* Tab切换 */}
      <div className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit">
        {[
          { key: 'health', label: '门店健康度', icon: Activity },
          { key: 'training', label: '培训管理', icon: GraduationCap },
          { key: 'renewal', label: '运营风险', icon: AlertTriangle },
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
            {tab.key === 'renewal' && riskAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-neon-red text-white rounded-full">
                {riskAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {activeTab === 'health' && (
          <motion.div
            key="health"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 热力图 - 门店健康度分布 */}
            <div className="p-5 rounded-xl bg-surface border border-border-color">
              <Heatmap
                title="门店健康度分布（按 GMV）"
                data={filteredHotels.map(h => ({
                  id: h.id,
                  label: h.name,
                  value: h.gmv,
                  subLabel: h.region,
                }))}
                colorScheme="green"
                onItemClick={(item) => navigate(`/hotels?hotel=${item.id}`)}
              />
            </div>

            {/* 搜索和过滤 */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="搜索门店或经理..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple outline-none appearance-none"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple outline-none appearance-none"
              >
                <option value="all">全部状态</option>
                <option value="healthy">健康</option>
                <option value="warning">需关注</option>
                <option value="critical">高风险</option>
              </select>
            </div>

            {/* 门店健康度卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHotels.map((hotel) => (
                <HealthScoreCard 
                  key={hotel.id} 
                  hotel={hotel} 
                  onClick={() => navigate(`/hotels?hotel=${hotel.id}`)}
                />
              ))}
            </div>

            {filteredHotels.length === 0 && (
              <div className="p-12 text-center text-text-secondary">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>未找到匹配的门店</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div
            key="training"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <h3 className="font-semibold mb-4">培训课程进度</h3>
              <TrainingProgress hotels={hotels} />
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-surface border border-border-color">
                <h3 className="font-semibold mb-4">待培训名单</h3>
                <div className="space-y-2">
                  {hotels.filter(h => !h.training.completed).slice(0, 5).map((hotel) => (
                    <div key={hotel.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
                      <div>
                        <p className="font-medium text-sm">{hotel.name}</p>
                        <p className="text-xs text-text-secondary">{hotel.manager}</p>
                      </div>
                      <button 
                        onClick={() => alert(`已向店长 ${hotel.manager} 发送培训提醒\n\n提醒内容：请尽快完成AI系统培训课程`)}
                        className="px-3 py-1 text-xs bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90"
                      >
                        提醒
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-neon-purple" />
                  培训建议
                </h3>
                <p className="text-sm text-text-secondary">
                  AI定价策略培训完成率仅 65%，建议本周安排专场培训
                </p>
                <button 
                  onClick={() => {
                    const untrainedHotels = hotels.filter(h => !h.training.completed);
                    const trainingPlan = {
                      计划名称: `AI系统培训计划-${new Date().toLocaleDateString()}`,
                      创建时间: new Date().toLocaleString(),
                      培训内容: [
                        'AI定价策略培训 - 掌握动态定价和竞品分析',
                        '内容生成工具使用 - 学会AI文案和图片生成',
                        '智能客服配置 - 设置自动回复和知识库',
                        '数据分析看板 - 理解经营数据和AI价值报表'
                      ],
                      目标门店数: untrainedHotels.length,
                      参与门店: untrainedHotels.map(h => ({
                        名称: h.name,
                        经理: h.manager,
                        区域: h.region,
                        当前AI使用率: `${Math.round(h.aiResolutionRate)}%`
                      })),
                      预计完成时间: '7天内',
                      负责人: '集团运营部'
                    };
                    console.table(trainingPlan);
                    console.table(trainingPlan.参与门店);
                    alert(`培训计划创建成功！\n\n计划包含 ${untrainedHotels.length} 家门店\n预计7天内完成\n\n数据已导出至控制台(F12)`);
                  }}
                  className="mt-3 px-4 py-2 text-sm bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90"
                >
                  创建培训计划
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'renewal' && (
          <motion.div
            key="renewal"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 风险统计 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border-color text-center">
                <p className="text-2xl font-bold text-neon-green">{hotels.filter(h => h.healthLevel === 'healthy').length}</p>
                <p className="text-xs text-text-secondary mt-1">健康门店</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border-color text-center">
                <p className="text-2xl font-bold text-neon-amber">{hotels.filter(h => h.healthLevel === 'warning').length}</p>
                <p className="text-xs text-text-secondary mt-1">需关注</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border-color text-center">
                <p className="text-2xl font-bold text-neon-purple">{Math.round(healthStats.avgScore)}%</p>
                <p className="text-xs text-text-secondary mt-1">平均健康度</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border-color text-center">
                <p className="text-2xl font-bold">{trainingRate}%</p>
                <p className="text-xs text-text-secondary mt-1">培训完成率</p>
              </div>
            </div>

            {/* 风险预警列表 */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-neon-red" />
                运营风险预警
                <span className="px-2 py-0.5 text-xs bg-neon-red/10 text-neon-red rounded-full">
                  {riskAlerts.length} 条
                </span>
              </h3>
              
              {riskAlerts.map((alert) => (
                <RiskAlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onResolve={() => handleResolveAlert(alert.id)}
                />
              ))}

              {riskAlerts.length === 0 && (
                <div className="p-8 text-center text-text-secondary">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-neon-green" />
                  <p>太好了！暂无运营风险预警</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OperationsCenter;
