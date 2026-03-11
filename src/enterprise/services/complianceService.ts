/**
 * 合规检测服务
 * 
 * 功能：
 * 1. 内容实时合规检测（违禁词、广告法、平台规则）
 * 2. 与AI内容工厂、AI客服实时同步
 * 3. 违规拦截、预警、自动修正建议
 * 4. 检测事件广播（供合规中心实时展示）
 * 
 * 使用方式：
 * - 内容工厂：生成内容前/发布前调用
 * - AI客服：回复发送前调用
 * - 合规中心：订阅检测事件，实时展示
 */

import { useComplianceStore } from '../stores/complianceStore';

// ============================================
// 类型定义
// ============================================

export type PlatformType = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin' | 'all';
export type ContentType = 'text' | 'image' | 'video' | 'chat' | 'moments' | 'post';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'pass';

export interface ComplianceRule {
  id: string;
  platform: PlatformType;
  category: 'forbidden_word' | 'ad_law' | 'platform_rule' | 'privacy' | 'sensitive';
  name: string;
  description: string;
  patterns: string[]; // 匹配模式（正则或关键词）
  riskLevel: RiskLevel;
  autoBlock: boolean; // 是否自动拦截
  suggestion?: string; // 修正建议
}

export interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  category: ComplianceRule['category'];
  riskLevel: RiskLevel;
  matchedText: string; // 匹配到的文本
  position: { start: number; end: number }; // 位置
  suggestion: string; // 修改建议
}

export interface ComplianceCheckResult {
  contentId: string;
  passed: boolean;
  riskLevel: RiskLevel;
  violations: ComplianceViolation[];
  processedContent?: string; // 自动处理后的内容
  checkTime: Date;
  duration: number; // 检测耗时(ms)
}

export interface ComplianceCheckRequest {
  contentId: string;
  content: string;
  platform: PlatformType;
  contentType: ContentType;
  hotelId?: string;
  hotelName?: string;
  source: 'content_factory' | 'ai_chat' | 'manual';
  metadata?: Record<string, any>;
}

export interface ComplianceEvent {
  id: string;
  timestamp: Date;
  type: 'check_started' | 'check_completed' | 'violation_found' | 'content_blocked' | 'content_modified';
  source: 'content_factory' | 'ai_chat' | 'manual';
  contentId: string;
  platform: PlatformType;
  hotelId?: string;
  hotelName?: string;
  content?: string; // 检测的内容预览
  result?: ComplianceCheckResult;
  violation?: ComplianceViolation;
  reason?: string; // 拦截原因
  message?: string; // 事件消息
}

// ============================================
// 合规规则库（与合规中心同步）
// ============================================

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // === 违禁词规则 ===
  {
    id: 'rule_fw_001',
    platform: 'all',
    category: 'forbidden_word',
    name: '极限词检测',
    description: '广告法禁止使用的极限词汇',
    patterns: ['最便宜', '最低价', '全网最低', '第一', '唯一', '最好', '顶级', '国家级'],
    riskLevel: 'high',
    autoBlock: false,
    suggestion: '使用"优惠价格"、"推荐"等替代',
  },
  {
    id: 'rule_fw_002',
    platform: 'all',
    category: 'forbidden_word',
    name: '绝对化用语',
    description: '广告法禁止的绝对化用语',
    patterns: ['绝对', '百分百', '保证', '承诺', '肯定'],
    riskLevel: 'medium',
    autoBlock: false,
    suggestion: '使用"优质"、"精选"等相对化表述',
  },
  {
    id: 'rule_fw_003',
    platform: 'xianyu',
    category: 'forbidden_word',
    name: '闲鱼定金规则',
    description: '闲鱼禁止定金不退等表述',
    patterns: ['定金不退', '订金不退', '预付款不退'],
    riskLevel: 'high',
    autoBlock: true,
    suggestion: '明确标注退改政策',
  },
  {
    id: 'rule_fw_004',
    platform: 'xiaohongshu',
    category: 'forbidden_word',
    name: '小红书导流词',
    description: '小红书禁止的外部导流词汇',
    patterns: ['微信', 'VX', '加我', '私聊', '转账', '支付宝', '二维码'],
    riskLevel: 'critical',
    autoBlock: true,
    suggestion: '使用平台内私信功能',
  },
  {
    id: 'rule_fw_005',
    platform: 'wechat',
    category: 'forbidden_word',
    name: '微信营销限制词',
    description: '微信禁止的过度营销词汇',
    patterns: ['群发', '刷屏', '诱导分享', '助力', '砍价'],
    riskLevel: 'high',
    autoBlock: false,
    suggestion: '减少营销性表述',
  },
  
  // === 广告法规则 ===
  {
    id: 'rule_ad_001',
    platform: 'all',
    category: 'ad_law',
    name: '价格凭证缺失',
    description: '宣称原价需有凭证支持',
    patterns: ['原价', '专柜价', '吊牌价[^（]*(?![（（]附[^）]*凭证[^）]*[）)])'],
    riskLevel: 'medium',
    autoBlock: false,
    suggestion: '添加"（附购买凭证）"或删除原价表述',
  },
  {
    id: 'rule_ad_002',
    platform: 'all',
    category: 'ad_law',
    name: '退改政策缺失',
    description: '需明示退改政策',
    patterns: ['(?<!退改政策[：:][^。]{3,50})预订'],
    riskLevel: 'medium',
    autoBlock: false,
    suggestion: '添加退改政策说明',
  },
  
  // === 隐私保护规则 ===
  {
    id: 'rule_pr_001',
    platform: 'all',
    category: 'privacy',
    name: '客户信息泄露',
    description: '禁止在公开场合透露客户隐私',
    patterns: ['1[3-9]\\d{9}', '\\d{18}', '\\d{6}\\d{6}\\d{4}'],
    riskLevel: 'critical',
    autoBlock: true,
    suggestion: '删除或脱敏处理客户信息',
  },
  
  // === 敏感内容规则 ===
  {
    id: 'rule_sc_001',
    platform: 'all',
    category: 'sensitive',
    name: '政治敏感词',
    description: '政治敏感内容',
    patterns: ['敏感词占位'], // 实际使用需要更完善的词库
    riskLevel: 'critical',
    autoBlock: true,
    suggestion: '删除敏感内容',
  },
];

// ============================================
// 检测事件监听器
// ============================================

type EventListener = (event: ComplianceEvent) => void;

class ComplianceEventBus {
  private listeners: EventListener[] = [];
  
  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  emit(event: ComplianceEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Compliance event listener error:', e);
      }
    });
    
    // 同时同步到 Zustand store
    useComplianceStore.getState().addEvent(event);
  }
}

export const complianceEventBus = new ComplianceEventBus();

// ============================================
// 核心检测服务
// ============================================

class ComplianceService {
  private rules: ComplianceRule[] = [...COMPLIANCE_RULES];
  private enabled: boolean = true;
  private stats = {
    totalChecks: 0,
    blockedCount: 0,
    violationCount: 0,
  };
  
  // 更新规则（从合规中心同步）
  updateRules(rules: ComplianceRule[]): void {
    this.rules = rules;
    console.log('[ComplianceService] Rules updated:', rules.length);
  }
  
  // 启用/停用检测
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  // 获取检测统计
  getStats() {
    return { ...this.stats };
  }
  
  // 核心检测方法
  async check(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    const startTime = Date.now();
    const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 发送检测开始事件
    complianceEventBus.emit({
      id: `evt_${checkId}`,
      timestamp: new Date(),
      type: 'check_started',
      source: request.source,
      contentId: request.contentId,
      platform: request.platform,
      hotelId: request.hotelId,
      hotelName: request.hotelName,
    });
    
    if (!this.enabled) {
      return {
        contentId: request.contentId,
        passed: true,
        riskLevel: 'pass',
        violations: [],
        checkTime: new Date(),
        duration: Date.now() - startTime,
      };
    }
    
    // 执行检测
    const violations: ComplianceViolation[] = [];
    
    for (const rule of this.rules) {
      // 平台过滤
      if (rule.platform !== 'all' && rule.platform !== request.platform) {
        continue;
      }
      
      // 检测每个模式
      for (const pattern of rule.patterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          let match;
          
          while ((match = regex.exec(request.content)) !== null) {
            const violation: ComplianceViolation = {
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              riskLevel: rule.riskLevel,
              matchedText: match[0],
              position: { start: match.index, end: match.index + match[0].length },
              suggestion: rule.suggestion || '请修改违规内容',
            };
            
            violations.push(violation);
            
            // 发送违规发现事件
            complianceEventBus.emit({
              id: `evt_${checkId}_${violations.length}`,
              timestamp: new Date(),
              type: 'violation_found',
              source: request.source,
              contentId: request.contentId,
              platform: request.platform,
              hotelId: request.hotelId,
              hotelName: request.hotelName,
              violation,
            });
            
            // 自动拦截的违规
            if (rule.autoBlock) {
              complianceEventBus.emit({
                id: `evt_${checkId}_blocked`,
                timestamp: new Date(),
                type: 'content_blocked',
                source: request.source,
                contentId: request.contentId,
                platform: request.platform,
                hotelId: request.hotelId,
                hotelName: request.hotelName,
                violation,
              });
              this.stats.blockedCount++;
            }
          }
        } catch (e) {
          console.error(`[ComplianceService] Regex error in rule ${rule.id}:`, e);
        }
      }
    }
    
    // 确定整体风险等级
    const riskLevel = this.calculateRiskLevel(violations);
    const passed = riskLevel !== 'critical' && !violations.some(v => 
      this.rules.find(r => r.id === v.ruleId)?.autoBlock
    );
    
    this.stats.totalChecks++;
    this.stats.violationCount += violations.length;
    
    const result: ComplianceCheckResult = {
      contentId: request.contentId,
      passed,
      riskLevel,
      violations,
      checkTime: new Date(),
      duration: Date.now() - startTime,
    };
    
    // 发送检测完成事件
    complianceEventBus.emit({
      id: `evt_${checkId}_completed`,
      timestamp: new Date(),
      type: 'check_completed',
      source: request.source,
      contentId: request.contentId,
      platform: request.platform,
      hotelId: request.hotelId,
      hotelName: request.hotelName,
      result,
    });
    
    return result;
  }
  
  // 快速检测（用于实时输入提示）
  async quickCheck(content: string, platform: PlatformType): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    for (const rule of this.rules) {
      if (rule.platform !== 'all' && rule.platform !== platform) continue;
      
      for (const pattern of rule.patterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          let match;
          
          while ((match = regex.exec(content)) !== null) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              category: rule.category,
              riskLevel: rule.riskLevel,
              matchedText: match[0],
              position: { start: match.index, end: match.index + match[0].length },
              suggestion: rule.suggestion || '请修改违规内容',
            });
          }
        } catch (e) {
          // 忽略正则错误
        }
      }
    }
    
    return violations;
  }
  
  // 自动修复建议
  async suggestFix(content: string, violations: ComplianceViolation[]): Promise<string> {
    let fixed = content;
    
    // 按位置倒序处理，避免位置偏移
    const sorted = [...violations].sort((a, b) => b.position.start - a.position.start);
    
    for (const v of sorted) {
      const before = fixed.substring(0, v.position.start);
      const after = fixed.substring(v.position.end);
      
      // 简单的替换逻辑（实际可以更智能）
      let replacement = '[建议修改]';
      if (v.category === 'forbidden_word') {
        replacement = '***';
      } else if (v.category === 'privacy') {
        replacement = v.matchedText.replace(/./g, '*');
      }
      
      fixed = before + replacement + after;
    }
    
    return fixed;
  }
  
  private calculateRiskLevel(violations: ComplianceViolation[]): RiskLevel {
    if (violations.some(v => v.riskLevel === 'critical')) return 'critical';
    if (violations.some(v => v.riskLevel === 'high')) return 'high';
    if (violations.some(v => v.riskLevel === 'medium')) return 'medium';
    if (violations.length > 0) return 'low';
    return 'pass';
  }
}

// 单例导出
export const complianceService = new ComplianceService();

// ============================================
// React Hook - 用于组件订阅合规事件
// ============================================

import { useEffect, useState, useCallback } from 'react';

export function useComplianceEvents(filter?: {
  source?: 'content_factory' | 'ai_chat' | 'manual';
  hotelId?: string;
  type?: ComplianceEvent['type'];
}) {
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const store = useComplianceStore();
  
  useEffect(() => {
    // 初始加载历史事件
    let filtered = store.events;
    if (filter?.source) {
      filtered = filtered.filter(e => e.source === filter.source);
    }
    if (filter?.hotelId) {
      filtered = filtered.filter(e => e.hotelId === filter.hotelId);
    }
    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }
    setEvents(filtered.slice(-100)); // 最近100条
    
    // 订阅新事件
    const unsubscribe = complianceEventBus.subscribe((event) => {
      if (filter?.source && event.source !== filter.source) return;
      if (filter?.hotelId && event.hotelId !== filter.hotelId) return;
      if (filter?.type && event.type !== filter.type) return;
      
      setEvents(prev => [...prev.slice(-99), event]);
    });
    
    return unsubscribe;
  }, [filter?.source, filter?.hotelId, filter?.type]);
  
  return events;
}

// 实时检测 Hook（用于输入框）
export function useRealtimeCompliance(platform: PlatformType, _delay: number = 500) {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  
  const check = useCallback(async (content: string) => {
    if (!content.trim()) {
      setViolations([]);
      return [];
    }
    
    setIsChecking(true);
    const result = await complianceService.quickCheck(content, platform);
    setViolations(result);
    setIsChecking(false);
    return result;
  }, [platform]);
  
  return { violations, isChecking, check };
}

export default complianceService;
