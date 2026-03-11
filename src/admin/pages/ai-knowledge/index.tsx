/**
 * AI知识沉淀 - 管理端算法知识库（完整版）
 * 
 * 商业功能：
 * 1. 展示所有AI决策案例（定价+内容+客服）
 * 2. 运营人员选择成功案例
 * 3. 一键生成配置包
 * 4. 预览并导入ConfigManager
 * 5. 推送到酒店端
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, FileText, MessageSquare,
  CheckCircle, Database, Search,
  Percent, Award, Lightbulb, X,
  RefreshCw, AlertTriangle, Plus, Settings,
  Save,
} from 'lucide-react';
import { PageSkeleton } from '@/components/ux/Skeleton';
import { toast } from '@/components/ux';
import { unifiedKnowledgeService, type UnifiedCase, type KnowledgeStats, type QueryParams } from '@/admin/services/unifiedKnowledgeService';
import { strategyGenerator, type StrategyGenerateParams } from '@/admin/services/strategyGenerator';
import type { ConfigPackage } from '@/types/remoteConfig';

// ============================================
// 主组件
// ============================================

export default function AIKnowledgePage() {
  // 状态管理
  const [activeTab, setActiveTab] = useState<QueryParams['type'] | 'all'>('pricing');
  const [isLoading, setIsLoading] = useState(true);
  const [cases, setCases] = useState<UnifiedCase[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueryParams['status'] | 'all'>('all');
  
  // 弹窗状态
  const [detailCase, setDetailCase] = useState<UnifiedCase | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<ConfigPackage | null>(null);
  const [configPreview, setConfigPreview] = useState<ReturnType<typeof strategyGenerator.previewConfig> | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await unifiedKnowledgeService.init();
      
      const [casesData, statsData] = await Promise.all([
        unifiedKnowledgeService.queryCases({
          type: activeTab === 'all' ? undefined : activeTab,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 100,
        }),
        unifiedKnowledgeService.getStats(),
      ]);

      setCases(casesData);
      setStats(statsData);
    } catch (error) {
      console.error('[AIKnowledge] Failed to load:', error);
      toast.error('数据加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 筛选案例
  const filteredCases = cases.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.hotelName.toLowerCase().includes(query) ||
      c.tags.some(t => t.toLowerCase().includes(query)) ||
      c.aiDecision.reasoning.toLowerCase().includes(query)
    );
  });

  // 选择案例
  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCases.size === filteredCases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(filteredCases.map(c => c.id)));
    }
  };

  // 生成配置
  const handleGenerateConfig = () => {
    if (selectedCases.size === 0) {
      toast.error('请至少选择一个案例');
      return;
    }

    const selectedCaseList = cases.filter(c => selectedCases.has(c.id));
    
    const params: StrategyGenerateParams = {
      name: `AI策略配置 ${new Date().toLocaleDateString()}`,
      caseIds: Array.from(selectedCases),
      targetType: 'gray',
      grayPercent: 20,
    };

    try {
      const config = strategyGenerator.generateConfig(selectedCaseList, params);
      const preview = strategyGenerator.previewConfig(config);
      
      setGeneratedConfig(config);
      setConfigPreview(preview);
      setShowGenerateModal(true);
      
      toast.success(`已生成配置，基于${selectedCases.size}个案例`);
    } catch (error) {
      console.error('[AIKnowledge] Generate failed:', error);
      toast.error('配置生成失败');
    }
  };

  // 导入到ConfigManager
  const handleImportToConfigManager = () => {
    if (!generatedConfig) return;

    // 保存到localStorage，ConfigManager可以读取
    const pendingConfigs = JSON.parse(localStorage.getItem('sb_pending_configs') || '[]');
    pendingConfigs.push(generatedConfig);
    localStorage.setItem('sb_pending_configs', JSON.stringify(pendingConfigs));

    toast.success('配置已发送到配置管理中心');
    setShowGenerateModal(false);
    setSelectedCases(new Set());
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="text-neon-cyan" size={28} />
            AI知识沉淀
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            分析成功案例，提炼策略，生成配置下发到酒店端
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm hover:border-gray-500"
          >
            <RefreshCw size={16} />
            刷新
          </button>
          
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={selectedCases.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings size={16} />
            生成配置 {selectedCases.size > 0 && `(${selectedCases.size})`}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<Database className="text-neon-cyan" />}
            label="总案例数"
            value={stats.totalCases}
            subValue={`定价${stats.byType.pricing} 内容${stats.byType.content} 客服${stats.byType.service}`}
          />
          <StatCard
            icon={<CheckCircle className="text-neon-green" />}
            label="成功率"
            value={`${Math.round((stats.byStatus.success / stats.totalCases) * 100)}%`}
            subValue={`${stats.byStatus.success}个成功`}
          />
          <StatCard
            icon={<Percent className="text-neon-purple" />}
            label="采纳率"
            value={`${Math.round(stats.acceptanceRate * 100)}%`}
            trend="行业平均65%"
          />
          <StatCard
            icon={<Award className="text-neon-amber" />}
            label="高价值案例"
            value={stats.learningValueDistribution.high}
            subValue="学习值80+"
          />
        </div>
      )}

      {/* 类型切换 + 筛选 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'pricing'}
            onClick={() => setActiveTab('pricing')}
            icon={<TrendingUp />}
            label="定价AI"
            count={stats?.byType.pricing}
          />
          <TabButton
            active={activeTab === 'content'}
            onClick={() => setActiveTab('content')}
            icon={<FileText />}
            label="内容AI"
            count={stats?.byType.content}
          />
          <TabButton
            active={activeTab === 'service'}
            onClick={() => setActiveTab('service')}
            icon={<MessageSquare />}
            label="客服AI"
            count={stats?.byType.service}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索酒店、标签..."
              className="pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm w-64"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-[#151B2B] border border-gray-800 rounded-lg text-sm"
          >
            <option value="all">全部状态</option>
            <option value="success">✅ 成功</option>
            <option value="failure">❌ 失败</option>
            <option value="pending">⏳ 追踪中</option>
          </select>
        </div>
      </div>

      {/* 批量操作栏 */}
      {filteredCases.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-[#151B2B] rounded-lg border border-gray-800">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedCases.size === filteredCases.length && filteredCases.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-600"
            />
            <span className="text-sm text-gray-400">
              已选择 {selectedCases.size} 个案例
            </span>
          </div>
          
          {selectedCases.size > 0 && (
            <button
              onClick={handleGenerateConfig}
              className="flex items-center gap-2 px-4 py-1.5 bg-neon-cyan text-black rounded-lg text-sm font-medium hover:bg-neon-cyan/90"
            >
              <Plus size={16} />
              生成配置
            </button>
          )}
        </div>
      )}

      {/* 案例列表 */}
      <div className="grid grid-cols-2 gap-4">
        {filteredCases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            caseItem={caseItem}
            isSelected={selectedCases.has(caseItem.id)}
            onSelect={() => toggleCaseSelection(caseItem.id)}
            onViewDetail={() => setDetailCase(caseItem)}
          />
        ))}
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-12">
          <Database size={48} className="mx-auto mb-4 opacity-30 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">暂无数据</h3>
          <p className="text-sm text-gray-500 mb-4">当前知识库为空，数据将自动收集：</p>
          <div className="max-w-md mx-auto text-left text-sm text-gray-500 space-y-2 bg-[#151B2B] p-4 rounded-lg">
            <p>• <span className="text-neon-cyan">定价AI：</span>酒店端调整价格时自动记录</p>
            <p>• <span className="text-neon-purple">内容AI：</span>生成营销文案时自动记录</p>
            <p>• <span className="text-neon-green">客服AI：</span>客服对话回复时自动记录</p>
            <p className="pt-2 border-t border-gray-800 text-xs">
              提示：确保酒店端和管理端在同一浏览器打开，BroadcastChannel才能通信
            </p>
          </div>
        </div>
      )}

      {/* 详情抽屉 */}
      <AnimatePresence>
        {detailCase && (
          <CaseDetailDrawer
            caseItem={detailCase}
            onClose={() => setDetailCase(null)}
          />
        )}
      </AnimatePresence>

      {/* 生成配置弹窗 */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateConfigModal
            config={generatedConfig}
            preview={configPreview}
            selectedCount={selectedCases.size}
            onClose={() => setShowGenerateModal(false)}
            onImport={handleImportToConfigManager}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 子组件
// ============================================

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
        active
          ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan'
          : 'bg-[#151B2B] border-gray-800 text-gray-400 hover:border-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800">
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, subValue, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: string;
}) {
  return (
    <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
      {trend && <div className="text-xs text-neon-green mt-1">{trend}</div>}
    </div>
  );
}

function CaseCard({ caseItem, isSelected, onSelect, onViewDetail }: {
  caseItem: UnifiedCase;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetail: () => void;
}) {
  const statusConfig = {
    success: { color: 'text-neon-green', bg: 'bg-neon-green/10', label: '成功' },
    failure: { color: 'text-neon-red', bg: 'bg-neon-red/10', label: '失败' },
    pending: { color: 'text-neon-amber', bg: 'bg-neon-amber/10', label: '追踪中' },
  };
  const status = statusConfig[caseItem.status];

  return (
    <motion.div
      className={`p-4 bg-[#151B2B] rounded-xl border transition-all cursor-pointer ${
        isSelected ? 'border-neon-cyan ring-1 ring-neon-cyan' : 'border-gray-800 hover:border-gray-700'
      }`}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="mt-1 w-4 h-4 rounded border-gray-600"
        />
        
        <div className="flex-1" onClick={onViewDetail}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <span className="text-xs text-gray-500">{caseItem.hotelName}</span>
            <span className="text-xs text-gray-500">
              {new Date(caseItem.timestamp).toLocaleDateString()}
            </span>
          </div>

          <p className="text-sm text-gray-300 line-clamp-2 mb-2">
            {caseItem.type === 'pricing' && `定价建议：¥${caseItem.aiDecision.suggestion.price || '-'}`}
            {caseItem.type === 'content' && caseItem.aiDecision.suggestion.title}
            {caseItem.type === 'service' && caseItem.aiDecision.suggestion.reply?.slice(0, 50)}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>置信度 {Math.round(caseItem.aiDecision.confidence * 100)}%</span>
              {caseItem.humanAction && (
                <span className={
                  caseItem.humanAction.action === 'accept' ? 'text-neon-green' :
                  caseItem.humanAction.action === 'modify' ? 'text-neon-amber' : 'text-neon-red'
                }>
                  {caseItem.humanAction.action === 'accept' ? '✓ 采纳' :
                   caseItem.humanAction.action === 'modify' ? '✎ 修改' : '✗ 拒绝'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Lightbulb size={12} className="text-neon-amber" />
              <span className="text-xs text-neon-amber">{caseItem.learningValue}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {caseItem.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CaseDetailDrawer({ caseItem, onClose }: {
  caseItem: UnifiedCase;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="relative w-[500px] h-full bg-[#0B0F19] border-l border-gray-800 overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0B0F19] border-b border-gray-800 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">案例详情</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#151B2B] rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* 基本信息 */}
          <Section title="基本信息">
            <InfoRow label="ID" value={caseItem.id} />
            <InfoRow label="酒店" value={caseItem.hotelName} />
            <InfoRow label="时间" value={new Date(caseItem.timestamp).toLocaleString()} />
            <InfoRow label="模型" value={caseItem.aiDecision.model} />
          </Section>

          {/* AI决策 */}
          <Section title="AI决策">
            <InfoRow label="置信度" value={`${Math.round(caseItem.aiDecision.confidence * 100)}%`} />
            <InfoRow label="推理" value={caseItem.aiDecision.reasoning} />
            <div className="mt-2 p-3 bg-[#151B2B] rounded-lg">
              <div className="text-xs text-gray-500 mb-1">建议内容</div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(caseItem.aiDecision.suggestion, null, 2)}
              </pre>
            </div>
          </Section>

          {/* 人工干预 */}
          {caseItem.humanAction && (
            <Section title="人工干预">
              <InfoRow label="操作" value={caseItem.humanAction.action} />
              <InfoRow label="操作人" value={caseItem.humanAction.userId || '-'} />
              {caseItem.humanAction.feedback && (
                <InfoRow label="反馈" value={caseItem.humanAction.feedback} />
              )}
            </Section>
          )}

          {/* 效果 */}
          {caseItem.outcome && (
            <Section title="效果追踪">
              <InfoRow label="结果" value={caseItem.outcome.success ? '✅ 成功' : '❌ 失败'} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(caseItem.outcome.metrics).map(([key, value]) => (
                  <div key={key} className="p-2 bg-[#151B2B] rounded">
                    <div className="text-xs text-gray-500">{key}</div>
                    <div className="text-sm text-neon-cyan">{value}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function GenerateConfigModal({ config, preview, selectedCount, onClose, onImport }: {
  config: ConfigPackage | null;
  preview: ReturnType<typeof strategyGenerator.previewConfig> | null;
  selectedCount: number;
  onClose: () => void;
  onImport: () => void;
}) {
  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#141B2D] rounded-xl border border-[#2D3A55] p-6 w-full max-w-md"
        >
          <div className="text-center">
            <Settings size={48} className="mx-auto mb-4 text-neon-cyan" />
            <h3 className="text-lg font-semibold mb-2">生成配置</h3>
            <p className="text-gray-400 text-sm mb-6">
              请先选择{selectedCount > 0 ? '更多' : ''}成功案例，系统将自动提炼策略参数
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2D3A55] rounded-lg text-sm"
            >
              知道了
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#141B2D] rounded-xl border border-[#2D3A55] w-full max-w-2xl max-h-[80vh] overflow-auto"
      >
        <div className="sticky top-0 bg-[#141B2D] border-b border-[#2D3A55] p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="text-neon-cyan" size={20} />
            配置预览
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 配置信息 */}
          <div className="p-4 bg-[#0A0E1A] rounded-lg border border-[#2D3A55]/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{config.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan">
                v{config.version}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                来自知识库
              </span>
            </div>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>

          {/* 效果预览 */}
          {preview && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#0A0E1A] rounded-lg">
                <div className="text-xs text-gray-500 mb-1">预计提升</div>
                <div className="text-lg font-bold text-neon-green">+{preview.estimatedImprovement.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-[#0A0E1A] rounded-lg">
                <div className="text-xs text-gray-500 mb-1">适用酒店</div>
                <div className="text-lg font-bold text-neon-cyan">{preview.applicableHotels}</div>
              </div>
              <div className="p-3 bg-[#0A0E1A] rounded-lg">
                <div className="text-xs text-gray-500 mb-1">风险等级</div>
                <div className={`text-lg font-bold ${
                  preview.riskLevel === 'low' ? 'text-neon-green' :
                  preview.riskLevel === 'medium' ? 'text-neon-amber' : 'text-neon-red'
                }`}>
                  {preview.riskLevel === 'low' ? '低' : preview.riskLevel === 'medium' ? '中' : '高'}
                </div>
              </div>
            </div>
          )}

          {/* 警告 */}
          {preview?.warnings && preview.warnings.length > 0 && (
            <div className="p-3 bg-neon-red/10 border border-neon-red/30 rounded-lg">
              <div className="flex items-center gap-2 text-neon-red text-sm mb-2">
                <AlertTriangle size={16} />
                风险提示
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                {preview.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 配置内容预览 */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">配置内容</div>
            <div className="p-3 bg-[#0A0E1A] rounded-lg max-h-48 overflow-auto">
              <pre className="text-xs text-gray-400">
                {JSON.stringify(config.content, null, 2)}
              </pre>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#2D3A55]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black rounded-lg font-medium hover:bg-neon-cyan/90"
            >
              <Save size={16} />
              导入配置中心
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}
