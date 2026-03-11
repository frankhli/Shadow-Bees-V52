/**
 * 合规中心 Store
 * 
 * 功能：
 * 1. 存储实时检测事件
 * 2. 统计拦截/违规数据
 * 3. 与合规中心页面实时同步
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComplianceEvent, ComplianceRule } from '../services/complianceService';

interface ComplianceStats {
  totalChecks: number;
  passedCount: number;
  blockedCount: number;
  warningCount: number;
  todayChecks: number;
  todayViolations: number;
  totalBlocks: number; // 总拦截数
  violationsToday: number; // 今日违规数
  byPlatform: Record<string, { checks: number; violations: number }>;
  bySource: Record<string, { checks: number; violations: number }>;
}

interface ComplianceState {
  // 事件历史
  events: ComplianceEvent[];
  
  // 统计数据
  stats: ComplianceStats;
  
  // 规则配置（从合规中心同步）
  rules: ComplianceRule[];
  
  // 实时拦截记录（最近50条）
  recentBlocks: ComplianceEvent[];
  
  // 检测开关
  enabled: boolean;
  
  // 动作
  addEvent: (event: ComplianceEvent) => void;
  setRules: (rules: ComplianceRule[]) => void;
  setEnabled: (enabled: boolean) => void;
  clearEvents: () => void;
  getViolationsByHotel: (hotelId: string) => ComplianceEvent[];
  getBlocksByHotel: (hotelId: string) => ComplianceEvent[];
}

export const useComplianceStore = create<ComplianceState>()(
  persist(
    (set, get) => ({
      events: [],
      stats: {
        totalChecks: 0,
        passedCount: 0,
        blockedCount: 0,
        warningCount: 0,
        todayChecks: 0,
        todayViolations: 0,
        totalBlocks: 0,
        violationsToday: 0,
        byPlatform: {},
        bySource: {},
      },
      rules: [],
      recentBlocks: [],
      enabled: true,
      
      addEvent: (event: ComplianceEvent) => {
        set((state) => {
          const newEvents = [...state.events, event].slice(-1000); // 保留最近1000条
          
          // 更新统计
          const newStats = { ...state.stats };
          const today = new Date().toDateString();
          const eventDate = event.timestamp.toDateString();
          
          if (event.type === 'check_completed' && event.result) {
            newStats.totalChecks++;
            if (eventDate === today) {
              newStats.todayChecks++;
            }
            
            if (event.result.passed) {
              newStats.passedCount++;
            } else {
              newStats.warningCount++;
              if (eventDate === today) {
                newStats.todayViolations++;
              }
            }
            
            // 按平台统计
            const platform = event.platform || 'unknown';
            if (!newStats.byPlatform[platform]) {
              newStats.byPlatform[platform] = { checks: 0, violations: 0 };
            }
            newStats.byPlatform[platform].checks++;
            if (!event.result.passed) {
              newStats.byPlatform[platform].violations++;
            }
            
            // 按来源统计
            const source = event.source || 'unknown';
            if (!newStats.bySource[source]) {
              newStats.bySource[source] = { checks: 0, violations: 0 };
            }
            newStats.bySource[source].checks++;
            if (!event.result.passed) {
              newStats.bySource[source].violations++;
            }
          }
          
          if (event.type === 'content_blocked') {
            newStats.blockedCount++;
            newStats.totalBlocks = (newStats.totalBlocks || 0) + 1;
            if (eventDate === today) {
              newStats.violationsToday = (newStats.violationsToday || 0) + 1;
            }
          }
          
          // 更新拦截记录
          let newBlocks = state.recentBlocks;
          if (event.type === 'content_blocked') {
            newBlocks = [event, ...state.recentBlocks].slice(0, 50);
          }
          
          return {
            events: newEvents,
            stats: newStats,
            recentBlocks: newBlocks,
          };
        });
      },
      
      setRules: (rules: ComplianceRule[]) => {
        set({ rules });
      },
      
      setEnabled: (enabled: boolean) => {
        set({ enabled });
      },
      
      clearEvents: () => {
        set({
          events: [],
          recentBlocks: [],
          stats: {
            totalChecks: 0,
            passedCount: 0,
            blockedCount: 0,
            warningCount: 0,
            todayChecks: 0,
            todayViolations: 0,
            totalBlocks: 0,
            violationsToday: 0,
            byPlatform: {},
            bySource: {},
          },
        });
      },
      
      getViolationsByHotel: (hotelId: string) => {
        return get().events.filter(
          e => e.hotelId === hotelId && 
          (e.type === 'violation_found' || (e.type === 'check_completed' && e.result && !e.result.passed))
        );
      },
      
      getBlocksByHotel: (hotelId: string) => {
        return get().events.filter(
          e => e.hotelId === hotelId && e.type === 'content_blocked'
        );
      },
    }),
    {
      name: 'compliance-storage',
      partialize: (state) => ({
        stats: state.stats,
        rules: state.rules,
        enabled: state.enabled,
        // 不持久化事件，避免数据过大
      }),
    }
  )
);

export default useComplianceStore;
