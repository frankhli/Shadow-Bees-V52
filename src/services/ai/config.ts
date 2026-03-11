/**
 * AI服务配置文件
 * 
 * 切换AI实现只需要改这里，业务代码0改动
 */

import type { AIServiceConfig } from './types';

// 当前使用的AI provider
// 'rule' - 规则引擎（当前）
// 'deepseek' - DeepSeek 大模型（预留）
// 'openai' - OpenAI GPT（预留）
// 'local' - 本地部署模型（预留）
export const AI_PROVIDER: AIServiceConfig['provider'] = 'rule';

// 模型配置
export const AI_CONFIG: AIServiceConfig = {
  provider: AI_PROVIDER,
  model: 'default',
  temperature: 0.7,        // 创造性 0-1
  maxTokens: 500,          // 最大回复长度
  timeout: 10000,          // 超时时间(ms)
  cacheEnabled: true,      // 是否启用缓存
  fallbackToRule: true,    // 大模型失败时回退到规则引擎
};

// 各provider详细配置
export const PROVIDER_CONFIG = {
  rule: {
    name: '规则引擎',
    description: '基于规则的AI客服（当前使用）',
    cost: '免费',
    features: ['快速响应', '确定性高', '成本低'],
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek-V3 大模型',
    cost: '1元/百万token',
    features: ['中文优秀', '性价比高', '支持长上下文'],
    apiKey: '',
    baseURL: 'https://api.deepseek.com/v1',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o / GPT-3.5',
    cost: '较高',
    features: ['效果最佳', '功能最全', '英文强'],
    apiKey: '',
  },
  local: {
    name: '本地模型',
    description: '私有化部署',
    cost: '硬件成本',
    features: ['数据安全', '无网络依赖', '一次性投入'],
  },
};

// 功能开关
export const AI_FEATURES = {
  // 是否启用意图分析面板（调试用）
  showIntentPanel: true,
  
  // 是否启用流式输出（大模型时体验更好）
  enableStreaming: false,
  
  // 是否自动转人工
  autoHandover: true,
  
  // 议价轮次阈值
  bargainThreshold: 4,
  
  // 情绪阈值（低于此值建议转人工）
  sentimentThreshold: -0.5,
};
