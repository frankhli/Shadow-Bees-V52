/**
 * AI配置适配器（酒店端）
 * 将 remoteConfig 下发的 ConfigPackage 应用到 AI 引擎
 * 
 * 使用方式：
 * 1. 在酒店端初始化时调用 aiConfigAdapter.init()
 * 2. 监听配置更新，自动应用新策略
 * 3. AI引擎读取适配后的配置
 */

import { remoteConfig } from '../remoteConfig';
import type { ConfigPackage } from '@/types/remoteConfig';

// ============================================
// 适配后的配置类型（AI引擎使用）
// ============================================

export interface AIPricingConfig {
  enabled: boolean;
  baseMarkup: number;
  eventMultiplier: number;
  inventoryMultiplier: number;
  inventoryThresholds: {
    tight: number;
    normal: number;
    abundant: number;
  };
  templates: Array<{
    id: string;
    name: string;
    strategy: 'scalper' | 'dynamic' | 'clearance';
    markupRange: [number, number];
    priceElasticity: number;
  }>;
}

export interface AIContentConfig {
  enabled: boolean;
  templates: Array<{
    platform: string;
    style: string;
    template: string;
    placeholders: string[];
    hashtags: string[];
  }>;
  guidelines: Record<string, {
    bestLength: { min: number; max: number };
    dos: string[];
    donts: string[];
  }>;
}

export interface AIServiceConfig {
  enabled: boolean;
  responses: Array<{
    intent: string;
    response: string;
    alternatives: string[];
    confidence: number;
  }>;
  escalationThreshold: number;
}

export interface AIEngineConfig {
  version: string;
  source: string;
  pricing: AIPricingConfig;
  content: AIContentConfig;
  service: AIServiceConfig;
}

// ============================================
// AI配置适配器
// ============================================

class AIConfigAdapter {
  private currentConfig: AIEngineConfig | null = null;
  private listeners: Set<(config: AIEngineConfig) => void> = new Set();

  /**
   * 初始化适配器
   * 1. 读取当前配置
   * 2. 监听配置更新
   */
  init() {
    // 立即应用当前配置
    const currentPackage = remoteConfig.getCurrentConfig();
    if (currentPackage) {
      this.applyConfigPackage(currentPackage);
    }

    // 监听配置更新
    remoteConfig.onConfigApplied((configPackage) => {
      console.log('[AIConfigAdapter] New config received:', configPackage.version);
      this.applyConfigPackage(configPackage);
    });

    console.log('[AIConfigAdapter] Initialized');
  }

  /**
   * 获取当前AI配置
   */
  getConfig(): AIEngineConfig {
    if (!this.currentConfig) {
      // 返回默认配置
      return this.getDefaultConfig();
    }
    return this.currentConfig;
  }

  /**
   * 订阅配置更新
   */
  onConfigUpdated(callback: (config: AIEngineConfig) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ============================================
  // 配置应用
  // ============================================

  private applyConfigPackage(pkg: ConfigPackage) {
    const adaptedConfig: AIEngineConfig = {
      version: pkg.version,
      source: pkg.source || 'manual',
      pricing: this.adaptPricingConfig(pkg),
      content: this.adaptContentConfig(pkg),
      service: this.adaptServiceConfig(pkg),
    };

    this.currentConfig = adaptedConfig;
    
    // 通知所有监听器
    this.listeners.forEach(cb => cb(adaptedConfig));
    
    console.log('[AIConfigAdapter] Config applied:', adaptedConfig);
  }

  private adaptPricingConfig(pkg: ConfigPackage): AIPricingConfig {
    const content = pkg.content;
    
    return {
      enabled: !!content.priceMultipliers,
      baseMarkup: content.priceMultipliers?.baseMarkup || 1.15,
      eventMultiplier: content.priceMultipliers?.eventMultiplier || 1.3,
      inventoryMultiplier: content.priceMultipliers?.inventoryMultiplier || 1.2,
      inventoryThresholds: content.inventoryThresholds || {
        tight: 0.1,
        normal: 0.3,
        abundant: 0.5,
      },
      templates: (content.templates || []).map(t => ({
        id: t.id,
        name: t.name,
        strategy: t.baseStrategy,
        markupRange: t.params.markupRange,
        priceElasticity: t.params.priceElasticity,
      })),
    };
  }

  private adaptContentConfig(pkg: ConfigPackage): AIContentConfig {
    const content = pkg.content;

    return {
      enabled: !!content.contentTemplates && content.contentTemplates.length > 0,
      templates: (content.contentTemplates || []).map(t => ({
        platform: t.platform,
        style: t.style,
        template: t.template,
        placeholders: t.placeholders,
        hashtags: t.hashtagRecommendations,
      })),
      guidelines: (content.contentGuidelines || []).reduce((acc, g) => {
        acc[g.platform] = {
          bestLength: { min: 50, max: 500 },
          dos: g.bestPractices || [],
          donts: [],
        };
        return acc;
      }, {} as AIContentConfig['guidelines']),
    };
  }

  private adaptServiceConfig(pkg: ConfigPackage): AIServiceConfig {
    const content = pkg.content;

    return {
      enabled: !!content.serviceResponses && content.serviceResponses.length > 0,
      responses: (content.serviceResponses || []).map(r => ({
        intent: r.intent,
        response: r.response,
        alternatives: r.alternativeResponses,
        confidence: r.performance.avgSatisfaction / 5, // 归一化到0-1
      })),
      escalationThreshold: content.serviceGuidelines?.[0]?.escalationThreshold || 0.6,
    };
  }

  private getDefaultConfig(): AIEngineConfig {
    return {
      version: '1.0.0',
      source: 'default',
      pricing: {
        enabled: true,
        baseMarkup: 1.15,
        eventMultiplier: 1.3,
        inventoryMultiplier: 1.2,
        inventoryThresholds: {
          tight: 0.1,
          normal: 0.3,
          abundant: 0.5,
        },
        templates: [],
      },
      content: {
        enabled: false,
        templates: [],
        guidelines: {},
      },
      service: {
        enabled: false,
        responses: [],
        escalationThreshold: 0.6,
      },
    };
  }
}

// ============================================
// 单例导出
// ============================================

export const aiConfigAdapter = new AIConfigAdapter();

import { useState, useEffect } from 'react';

// Hook for React
export function useAIConfig() {
  const [config, setConfig] = useState<AIEngineConfig>(aiConfigAdapter.getConfig());

  useEffect(() => {
    const unsubscribe = aiConfigAdapter.onConfigUpdated(setConfig);
    return () => { unsubscribe(); };
  }, []);

  return config;
}
