/**
 * 配置管理中心
 * 管理端：创建、编辑、推送配置到酒店端
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Users, Send,
  History, FileJson, Tag, Clock, CheckCircle2, XCircle,
  Loader2, WifiOff, Plus,
  Eye, Server, Brain, Download
} from 'lucide-react';
import { Button } from '../../components/ui';
import { toast } from '@/components/ux';
import type { ConfigPackage } from '../../../types/remoteConfig';

// 模拟酒店列表
const mockHotels = [
  { id: 'sanlitun', name: '三里屯潮流酒店', city: '北京', type: '自主型', online: true, currentVersion: '1.0.0' },
  { id: 'chongli', name: '崇礼星空酒店', city: '张家口', type: '信任型', online: true, currentVersion: '1.0.0' },
  { id: 'dali', name: '大理洱海酒店', city: '大理', type: '混合型', online: false, currentVersion: '0.9.5' },
];

// 模拟配置历史（多个版本供测试）
const mockConfigHistory: ConfigPackage[] = [
  {
    id: 'cfg-001',
    version: '1.0.0',
    name: '初始定价算法',
    description: '基础动态定价策略，适配商务酒店',
    content: {
      priceMultipliers: { baseMarkup: 1.1, eventMultiplier: 1.3, inventoryMultiplier: 1.2 },
      inventoryThresholds: { tight: 0.1, normal: 0.3, abundant: 0.5 },
    },
    target: { type: 'all' },
    metadata: {
      createdBy: '系统管理员',
      createdAt: '2024-02-01T10:00:00Z',
      forceUpdate: false,
      restartRequired: false,
    },
  },
  {
    id: 'cfg-002',
    version: '1.1.0',
    name: '优化事件响应策略',
    description: '根据春节数据优化，演唱会期间涨价幅度从2x降至1.7x',
    content: {
      priceMultipliers: { baseMarkup: 1.15, eventMultiplier: 1.5, inventoryMultiplier: 1.2 },
      inventoryThresholds: { tight: 0.15, normal: 0.35, abundant: 0.5 },
    },
    target: { type: 'gray', grayPercent: 30 },
    metadata: {
      createdBy: '算法工程师',
      createdAt: '2024-02-10T14:30:00Z',
      forceUpdate: false,
      restartRequired: false,
    },
  },
  {
    id: 'cfg-003',
    version: '1.2.0',
    name: '新增内容质量因子',
    description: '小红书优质内容可支撑15-20%溢价，当前未充分利用',
    content: {
      priceMultipliers: { baseMarkup: 1.2, eventMultiplier: 1.6, inventoryMultiplier: 1.25 },
      inventoryThresholds: { tight: 0.12, normal: 0.32, abundant: 0.5 },
      channelStrategy: {
        xiaohongshu: { markup: 1.15, allocation: 0.35 },
        wechat: { markup: 1.1, allocation: 0.35 },
        xianyu: { markup: 1.05, allocation: 0.3 },
      },
    },
    target: { type: 'all' },
    metadata: {
      createdBy: '产品总监',
      createdAt: '2024-02-15T09:00:00Z',
      forceUpdate: false,
      restartRequired: false,
    },
  },
  {
    id: 'cfg-004',
    version: '1.3.0',
    name: '智能库存释放策略',
    description: '高价房型提前48小时释放库存给灵活渠道，而非24小时',
    content: {
      priceMultipliers: { baseMarkup: 1.25, eventMultiplier: 1.7, inventoryMultiplier: 1.3 },
      inventoryThresholds: { tight: 0.1, normal: 0.3, abundant: 0.5 },
    },
    target: { type: 'all' },
    metadata: {
      createdBy: '收益管理团队',
      createdAt: '2024-02-20T16:00:00Z',
      forceUpdate: false,
      restartRequired: false,
    },
  },
  {
    id: 'cfg-005',
    version: '2.0.0',
    name: 'AI定价引擎2.0',
    description: '全新算法架构，支持多维度实时调价，预计收益提升12%',
    content: {
      priceMultipliers: { baseMarkup: 1.3, eventMultiplier: 1.8, inventoryMultiplier: 1.4 },
      inventoryThresholds: { tight: 0.08, normal: 0.25, abundant: 0.5 },
    },
    target: { type: 'gray', grayPercent: 20 },
    metadata: {
      createdBy: '首席算法科学家',
      createdAt: '2024-03-01T10:00:00Z',
      forceUpdate: false,
      restartRequired: true,
    },
  },
];

interface PushStatus {
  hotelId: string;
  status: 'pending' | 'sending' | 'success' | 'failed' | 'offline';
  progress?: number;
  error?: string;
}

// 推送记录类型
interface PushRecord {
  id: string;
  configId: string;
  configName: string;
  configVersion: string;
  targetHotelId: string;
  targetHotelName: string;
  pushedAt: string;
  pushedBy: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
}

// 版本历史记录类型
interface VersionHistoryRecord {
  id: string;
  version: string;
  configId: string;
  modifiedAt: string;
  modifiedBy: string;
  changeDescription: string;
  action: 'create' | 'update' | 'delete';
}

// Mock 推送记录数据
const mockPushRecords: PushRecord[] = [
  {
    id: 'push-001',
    configId: 'cfg-005',
    configName: 'AI定价引擎2.0',
    configVersion: '2.0.0',
    targetHotelId: 'sanlitun',
    targetHotelName: '三里屯潮流酒店',
    pushedAt: '2024-03-01T11:30:00Z',
    pushedBy: '系统管理员',
    status: 'success',
  },
  {
    id: 'push-002',
    configId: 'cfg-005',
    configName: 'AI定价引擎2.0',
    configVersion: '2.0.0',
    targetHotelId: 'chongli',
    targetHotelName: '崇礼星空酒店',
    pushedAt: '2024-03-01T11:35:00Z',
    pushedBy: '系统管理员',
    status: 'success',
  },
  {
    id: 'push-003',
    configId: 'cfg-004',
    configName: '智能库存释放策略',
    configVersion: '1.3.0',
    targetHotelId: 'dali',
    targetHotelName: '大理洱海酒店',
    pushedAt: '2024-02-20T17:00:00Z',
    pushedBy: '产品总监',
    status: 'failed',
    errorMessage: '酒店端离线，推送超时',
  },
  {
    id: 'push-004',
    configId: 'cfg-004',
    configName: '智能库存释放策略',
    configVersion: '1.3.0',
    targetHotelId: 'sanlitun',
    targetHotelName: '三里屯潮流酒店',
    pushedAt: '2024-02-20T16:30:00Z',
    pushedBy: '收益管理团队',
    status: 'success',
  },
  {
    id: 'push-005',
    configId: 'cfg-003',
    configName: '新增内容质量因子',
    configVersion: '1.2.0',
    targetHotelId: 'chongli',
    targetHotelName: '崇礼星空酒店',
    pushedAt: '2024-02-15T10:00:00Z',
    pushedBy: '算法工程师',
    status: 'success',
  },
  {
    id: 'push-006',
    configId: 'cfg-003',
    configName: '新增内容质量因子',
    configVersion: '1.2.0',
    targetHotelId: 'sanlitun',
    targetHotelName: '三里屯潮流酒店',
    pushedAt: '2024-02-15T09:30:00Z',
    pushedBy: '产品总监',
    status: 'success',
  },
];

// Mock 版本历史记录数据
const mockVersionHistory: VersionHistoryRecord[] = [
  {
    id: 'vh-001',
    version: '2.0.0',
    configId: 'cfg-005',
    modifiedAt: '2024-03-01T10:00:00Z',
    modifiedBy: '首席算法科学家',
    changeDescription: '全新算法架构，支持多维度实时调价，预计收益提升12%',
    action: 'create',
  },
  {
    id: 'vh-002',
    version: '1.3.0',
    configId: 'cfg-004',
    modifiedAt: '2024-02-20T16:00:00Z',
    modifiedBy: '收益管理团队',
    changeDescription: '高价房型提前48小时释放库存给灵活渠道，而非24小时',
    action: 'create',
  },
  {
    id: 'vh-003',
    version: '1.2.0',
    configId: 'cfg-003',
    modifiedAt: '2024-02-15T09:00:00Z',
    modifiedBy: '产品总监',
    changeDescription: '小红书优质内容可支撑15-20%溢价，当前未充分利用',
    action: 'create',
  },
  {
    id: 'vh-004',
    version: '1.2.0',
    configId: 'cfg-003',
    modifiedAt: '2024-02-15T14:30:00Z',
    modifiedBy: '算法工程师',
    changeDescription: '修复微信渠道分配比例计算错误',
    action: 'update',
  },
  {
    id: 'vh-005',
    version: '1.1.0',
    configId: 'cfg-002',
    modifiedAt: '2024-02-10T14:30:00Z',
    modifiedBy: '算法工程师',
    changeDescription: '根据春节数据优化，演唱会期间涨价幅度从2x降至1.7x',
    action: 'create',
  },
  {
    id: 'vh-006',
    version: '1.1.0',
    configId: 'cfg-002',
    modifiedAt: '2024-02-11T09:00:00Z',
    modifiedBy: '产品总监',
    changeDescription: '调整灰度发布比例为30%',
    action: 'update',
  },
  {
    id: 'vh-007',
    version: '1.0.0',
    configId: 'cfg-001',
    modifiedAt: '2024-02-01T10:00:00Z',
    modifiedBy: '系统管理员',
    changeDescription: '基础动态定价策略，适配商务酒店',
    action: 'create',
  },
];

export default function ConfigManager() {
  const [configs, setConfigs] = useState<ConfigPackage[]>(mockConfigHistory);
  const [selectedConfig, setSelectedConfig] = useState<ConfigPackage | null>(null);
  const [, setIsCreating] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus[]>([]);
  const [activeTab, setActiveTab] = useState<'configs' | 'push' | 'history'>('configs');
  const [pendingKnowledgeConfigs, setPendingKnowledgeConfigs] = useState<ConfigPackage[]>([]);

  // 检查从知识库导入的待处理配置
  useEffect(() => {
    const checkPendingConfigs = () => {
      try {
        const pending = JSON.parse(localStorage.getItem('sb_pending_configs') || '[]');
        if (pending.length > 0) {
          setPendingKnowledgeConfigs(pending);
        }
      } catch {
        // 忽略错误
      }
    };
    
    checkPendingConfigs();
    // 每5秒检查一次
    const interval = setInterval(checkPendingConfigs, 5000);
    return () => clearInterval(interval);
  }, []);

  // 导入知识库配置
  const handleImportKnowledgeConfig = (config: ConfigPackage) => {
    // 添加到配置列表
    setConfigs(prev => [config, ...prev]);
    
    // 从待处理列表移除
    const updatedPending = pendingKnowledgeConfigs.filter(c => c.id !== config.id);
    setPendingKnowledgeConfigs(updatedPending);
    localStorage.setItem('sb_pending_configs', JSON.stringify(updatedPending));
    
    toast.success(`配置"${config.name}"已导入`);
  };

  // 推送配置到酒店端
  const handlePushConfig = async (config: ConfigPackage, targetHotels: string[]) => {
    setPushModalOpen(true);
    
    // 立即保存配置到 localStorage（这样酒店端随时能看到）
    localStorage.setItem('sb_remote_config_pending', JSON.stringify(config));
    
    // 立即通过 BroadcastChannel 通知（实时推送）
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('hotel_config_sync');
      channel.postMessage({
        type: 'CONFIG_PUSH',
        config,
        timestamp: new Date().toISOString(),
      });
      channel.close();
    }
    
    // 初始化推送状态
    const initialStatus: PushStatus[] = targetHotels.map(hotelId => {
      const hotel = mockHotels.find(h => h.id === hotelId);
      return {
        hotelId,
        status: hotel?.online ? 'pending' : 'offline',
        progress: 0,
      };
    });
    setPushStatus(initialStatus);

    // 模拟推送过程
    for (let i = 0; i < targetHotels.length; i++) {
      const hotelId = targetHotels[i];
      const hotel = mockHotels.find(h => h.id === hotelId);
      
      if (!hotel?.online) continue;

      // 更新状态：发送中
      setPushStatus(prev => prev.map(s => 
        s.hotelId === hotelId ? { ...s, status: 'sending', progress: 0 } : s
      ));

      // 模拟传输进度
      await new Promise(resolve => setTimeout(resolve, 500));
      setPushStatus(prev => prev.map(s => 
        s.hotelId === hotelId ? { ...s, progress: 50 } : s
      ));

      await new Promise(resolve => setTimeout(resolve, 500));
      setPushStatus(prev => prev.map(s => 
        s.hotelId === hotelId ? { ...s, progress: 100, status: 'success' } : s
      ));
    }
  };

  // 渲染配置列表
  const renderConfigList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">配置版本列表</h3>
        <Button
          size="sm"
          onClick={() => setIsCreating(true)}
          className="bg-neon-cyan text-black hover:bg-neon-cyan/90"
        >
          <Plus size={16} className="mr-1" />
          新建配置
        </Button>
      </div>

      {/* 来自知识库的待处理配置 */}
      {pendingKnowledgeConfigs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-neon-cyan">
            <Brain size={18} />
            <span className="font-medium">来自AI知识沉淀</span>
            <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20">
              {pendingKnowledgeConfigs.length} 个待导入
            </span>
          </div>
          
          {pendingKnowledgeConfigs.map((config) => (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-neon-cyan/5 rounded-xl border border-neon-cyan/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={16} className="text-neon-cyan" />
                    <span className="font-semibold">{config.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan">
                      v{config.version}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      知识库
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{config.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>基于 {config.sourceInfo?.caseCount} 个成功案例</span>
                    <span>生成于 {new Date(config.sourceInfo?.generatedAt || '').toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedConfig(config)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleImportKnowledgeConfig(config)}
                    className="bg-neon-cyan text-black hover:bg-neon-cyan/90"
                  >
                    <Download size={16} className="mr-1" />
                    导入
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          
          <div className="border-t border-gray-800 pt-4">
            <span className="text-sm text-gray-500">已保存的配置</span>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {configs.map((config) => (
          <motion.div
            key={config.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 bg-bg-secondary rounded-xl border ${
              selectedConfig?.id === config.id 
                ? 'border-neon-cyan' 
                : 'border-border-color hover:border-gray-600'
            } cursor-pointer transition-all`}
            onClick={() => setSelectedConfig(config)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={16} className="text-neon-cyan" />
                  <span className="font-semibold">{config.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan">
                    v{config.version}
                  </span>
                  {config.target.type === 'gray' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      灰度 {config.target.grayPercent}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary mb-2">{config.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(config.metadata.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {config.metadata.createdBy}
                  </span>
                  {config.metadata.forceUpdate && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      强制更新
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConfig(config);
                    setPushModalOpen(true);
                  }}
                  className="text-neon-cyan hover:bg-neon-cyan/10"
                >
                  <Send size={16} className="mr-1" />
                  推送
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 查看详情
                  }}
                >
                  <Eye size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // 渲染推送记录列表
  const renderPushRecords = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">推送记录</h3>
        <span className="text-sm text-text-secondary">
          共 {mockPushRecords.length} 条记录
        </span>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-primary border-b border-border-color">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">推送时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">目标酒店</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">配置项</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">推送人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {mockPushRecords.map((record) => (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-bg-primary/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-500" />
                    {new Date(record.pushedAt).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium">{record.targetHotelName}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{record.configName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan">
                      v{record.configVersion}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {record.pushedBy}
                </td>
                <td className="px-4 py-3 text-sm">
                  {record.status === 'success' && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 size={14} />
                      成功
                    </span>
                  )}
                  {record.status === 'failed' && (
                    <span className="flex items-center gap-1 text-red-400" title={record.errorMessage}>
                      <XCircle size={14} />
                      失败
                    </span>
                  )}
                  {record.status === 'pending' && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Loader2 size={14} className="animate-spin" />
                      推送中
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染版本历史列表
  const renderVersionHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">版本历史</h3>
        <span className="text-sm text-text-secondary">
          共 {mockVersionHistory.length} 条记录
        </span>
      </div>

      <div className="space-y-3">
        {mockVersionHistory.map((record, index) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 bg-bg-secondary rounded-xl border border-border-color hover:border-gray-600 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan font-medium">
                    v{record.version}
                  </span>
                  {record.action === 'create' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                      创建
                    </span>
                  )}
                  {record.action === 'update' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      更新
                    </span>
                  )}
                  {record.action === 'delete' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                      删除
                    </span>
                  )}
                </div>
                <p className="text-sm text-white mb-2">{record.changeDescription}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(record.modifiedAt).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {record.modifiedBy}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // 渲染推送弹窗
  const renderPushModal = () => {
    if (!pushModalOpen || !selectedConfig) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#141B2D] rounded-xl border border-[#2D3A55] p-6 w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Send className="text-neon-cyan" size={20} />
              推送配置
            </h3>
            <button
              onClick={() => setPushModalOpen(false)}
              className="p-1 hover:bg-gray-800 rounded"
            >
              <XCircle size={20} />
            </button>
          </div>

          {/* 配置信息 */}
          <div className="p-4 bg-[#0A0E1A] rounded-lg mb-4 border border-[#2D3A55]/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{selectedConfig.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan">
                v{selectedConfig.version}
              </span>
            </div>
            <p className="text-sm text-text-secondary">{selectedConfig.description}</p>
          </div>

          {/* 目标酒店选择 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-3 text-white">选择目标酒店</h4>
            <div className="space-y-2">
              {mockHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="flex items-center justify-between p-3 bg-[#0A0E1A] rounded-lg border border-[#2D3A55]/30 hover:border-[#2D3A55] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-600"
                      defaultChecked={hotel.online}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{hotel.name}</span>
                        {!hotel.online && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                            离线
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {hotel.city} · 当前版本 v{hotel.currentVersion}
                      </div>
                    </div>
                  </div>
                  
                  {/* 推送状态 */}
                  {pushStatus.find(s => s.hotelId === hotel.id)?.status && (
                    <div className="flex items-center gap-2">
                      {pushStatus.find(s => s.hotelId === hotel.id)?.status === 'sending' && (
                        <>
                          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neon-cyan transition-all"
                              style={{ width: `${pushStatus.find(s => s.hotelId === hotel.id)?.progress}%` }}
                            />
                          </div>
                          <Loader2 size={16} className="animate-spin text-neon-cyan" />
                        </>
                      )}
                      {pushStatus.find(s => s.hotelId === hotel.id)?.status === 'success' && (
                        <CheckCircle2 size={16} className="text-green-400" />
                      )}
                      {pushStatus.find(s => s.hotelId === hotel.id)?.status === 'failed' && (
                        <XCircle size={16} className="text-red-400" />
                      )}
                      {pushStatus.find(s => s.hotelId === hotel.id)?.status === 'offline' && (
                        <WifiOff size={16} className="text-gray-500" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setPushModalOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => handlePushConfig(selectedConfig, mockHotels.filter(h => h.online).map(h => h.id))}
              className="bg-neon-cyan text-black hover:bg-neon-cyan/90"
            >
              <Send size={16} className="mr-1" />
              开始推送
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server className="text-neon-cyan" size={24} />
            配置管理中心
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            管理定价算法配置，远程推送到酒店端
          </p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 border-b border-border-color">
        {[
          { key: 'configs', label: '配置列表', icon: FileJson },
          { key: 'push', label: '推送记录', icon: Send },
          { key: 'history', label: '版本历史', icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      {activeTab === 'configs' && renderConfigList()}
      {activeTab === 'push' && renderPushRecords()}
      {activeTab === 'history' && renderVersionHistory()}

      {/* 推送弹窗 */}
      {renderPushModal()}
    </div>
  );
}
