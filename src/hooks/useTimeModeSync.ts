/**
 * 时间态三模式数据同步钩子
 * 将 timeModeStore 的数据同步到 unifiedStore
 */

import { useEffect, useRef } from 'react';
import { useTimeModeStore, type ModeData } from '@/stores/timeModeStore';
import { useUnifiedStore } from '@/stores/unifiedStore';

export function useTimeModeSync() {
  const { 
    mode, 
    getCurrentModeData,
    realtime,
    history,
    sandbox,
  } = useTimeModeStore();
  
  const unifiedStore = useUnifiedStore();
  const prevModeRef = useRef(mode);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 当模式切换时，保存/恢复状态
  useEffect(() => {
    // 构建当前 unifiedStore 的 ModeData
    const currentData: ModeData = {
      hotel: unifiedStore.currentHotel,
      pricing: unifiedStore.pricing,
      inventory: unifiedStore.inventory,
      competitors: unifiedStore.competitors,
      transactions: unifiedStore.transactions,
      alerts: unifiedStore.alerts,
      timestamp: Date.now(),
    };
    
    // 如果模式变化了
    if (prevModeRef.current !== mode) {
      // 保存旧模式的数据
      useTimeModeStore.getState().updateCurrentModeData(currentData);
      
      // 获取新模式的数据
      const newModeData = getCurrentModeData();
      
      if (newModeData) {
        // 应用新模式的数据到 unifiedStore
        unifiedStore.initHotel(newModeData.hotel!);
        // Note: 其他字段需要通过 unifiedStore 的 actions 来更新
      }
      
      prevModeRef.current = mode;
    }
  }, [mode, unifiedStore, getCurrentModeData]);
  
  // 实时模式：定时同步数据
  useEffect(() => {
    if (mode === 'realtime' && realtime.isLive) {
      // 启动实时模拟
      const currentData: ModeData = {
        hotel: unifiedStore.currentHotel,
        pricing: unifiedStore.pricing,
        inventory: unifiedStore.inventory,
        competitors: unifiedStore.competitors,
        transactions: unifiedStore.transactions,
        alerts: unifiedStore.alerts,
        timestamp: Date.now(),
      };
      
      useTimeModeStore.getState().startRealtimeSimulation(currentData);
      
      // 每100ms检查 timeModeStore 的数据变化并同步到 unifiedStore
      intervalRef.current = setInterval(() => {
        const modeData = getCurrentModeData();
        if (modeData) {
          // 同步成交记录
          if (modeData.transactions.length > unifiedStore.transactions.length) {
            const newTransactions = modeData.transactions.slice(0, modeData.transactions.length - unifiedStore.transactions.length);
            newTransactions.forEach(tx => {
              unifiedStore.addTransaction(tx);
            });
          }
          
          // 同步竞品价格
          if (modeData.competitors.length > 0) {
            const hasChanges = modeData.competitors.some((c, i) => 
              c.currentPrice !== unifiedStore.competitors[i]?.currentPrice
            );
            if (hasChanges) {
              useUnifiedStore.setState({ competitors: modeData.competitors });
            }
          }
          
          // 同步库存
          if (modeData.inventory) {
            useUnifiedStore.setState({ inventory: modeData.inventory });
          }
        }
      }, 100);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mode, realtime.isLive, unifiedStore, getCurrentModeData]);
  
  // 历史模式：当播放位置变化时同步
  useEffect(() => {
    if (mode === 'history' && history.currentSnapshot) {
      const modeData = getCurrentModeData();
      if (modeData) {
        // 应用历史数据到 unifiedStore
        useUnifiedStore.setState({
          competitors: modeData.competitors,
          inventory: modeData.inventory || unifiedStore.inventory,
          pricing: modeData.pricing || unifiedStore.pricing,
          transactions: modeData.transactions,
          alerts: modeData.alerts,
        });
      }
    }
  }, [mode, history.playbackPosition, history.currentSnapshot, getCurrentModeData]);
  
  // 沙盘模式：当变量变化时同步
  useEffect(() => {
    if (mode === 'sandbox' && sandbox.frozenBaseData) {
      const modeData = getCurrentModeData();
      if (modeData) {
        useUnifiedStore.setState({
          competitors: modeData.competitors,
          pricing: modeData.pricing || unifiedStore.pricing,
        });
      }
    }
  }, [mode, sandbox.variables, sandbox.frozenBaseData, getCurrentModeData]);
}
