/**
 * Shadow-Bees V52 - 时间态三模式状态管理
 * 真正的业务逻辑实现 - 与 unifiedStore 深度联动
 */

import { create } from 'zustand';
import type { Transaction, Competitor, Hotel, Pricing, Inventory, Alert } from '@/types';
import { snapshots, type Snapshot, type SandboxVariables, defaultSandboxVariables } from '@/data/snapshots';
import { generateId } from '@/utils/helpers';

export type TimeMode = 'realtime' | 'history' | 'sandbox';

// ============================================
// 模式数据存储
// ============================================

export interface ModeData {
  hotel: Hotel | null;
  pricing: Pricing | null;
  inventory: Inventory | null;
  competitors: Competitor[];
  transactions: Transaction[];
  alerts: Alert[];
  timestamp: number;
}

// ============================================
// Store 类型定义
// ============================================

interface TimeModeStore {
  // 当前模式
  mode: TimeMode;
  
  // 三种模式的独立数据存储
  realtimeData: ModeData | null;
  historyData: ModeData | null;
  sandboxData: ModeData | null;
  
  // 实时模式状态
  realtime: {
    isLive: boolean;
    lastTransactionTime: number;
    nextTransactionDelay: number;
  };
  
  // 历史模式状态
  history: {
    currentSnapshot: Snapshot | null;
    playbackPosition: number;
    isPlaying: boolean;
    currentTimelineIndex: number;
    appliedEvents: Set<string>;
  };
  
  // 沙盘模式状态
  sandbox: {
    frozenBaseData: ModeData | null;
    variables: SandboxVariables;
  };
  
  // ===== Actions =====
  
  // 模式切换
  setMode: (mode: TimeMode, currentStoreData?: ModeData) => void;
  
  // 获取当前模式的显示数据
  getCurrentModeData: () => ModeData | null;
  
  // 更新当前模式的数据（由外部 store 调用）
  updateCurrentModeData: (data: Partial<ModeData>) => void;
  
  // 实时模式
  startRealtimeSimulation: (baseData: ModeData) => void;
  stopRealtimeSimulation: () => void;
  generateRealtimeTransaction: (basePrice: number) => Transaction | null;
  applyRealtimeFluctuations: () => void;
  
  // 历史模式
  loadSnapshot: (snapshotId: string) => void;
  playHistory: () => void;
  pauseHistory: () => void;
  seekHistory: (position: number) => ModeData | null;
  calculateHistoryData: () => ModeData | null;
  randomDisturbance: () => void;
  
  // 沙盘模式
  freezeCurrentState: (state: ModeData) => void;
  updateSandboxVariable: (key: keyof SandboxVariables, value: any) => ModeData | null;
  calculateSandboxResult: () => ModeData | null;
  resetSandbox: () => void;
}

// ============================================
// 辅助函数
// ============================================

const generateRandomTransaction = (basePrice: number): Transaction | null => {
  if (Math.random() > 0.3) return null;
  
  const platforms = ['xianyu', 'xiaohongshu', 'wechat'] as const;
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  
  const coefficients = { xianyu: 1.08, xiaohongshu: 1.0, wechat: 0.95 };
  const price = Math.round(basePrice * coefficients[platform]);
  
  return {
    id: generateId('TXN'),
    hotelId: 'current',
    roomType: '豪华大床房',
    platform,
    price,
    timestamp: new Date().toISOString(),
    orderNo: generateId('ORD'),
    status: 'paid',
    financials: {
      gross: price,
      serviceFee: Math.round(price * 0.06 * 100) / 100,
      net: Math.round(price * 0.94 * 100) / 100,
    },
  };
};

// 计算竞品价格波动
const fluctuateCompetitors = (competitors: Competitor[]): Competitor[] => {
  return competitors.map(c => {
    const change = (Math.random() - 0.5) * 0.1; // ±5%
    return {
      ...c,
      currentPrice: Math.round(c.currentPrice * (1 + change)),
    };
  });
};

// 应用时间轴事件
const applyTimelineEvent = (data: ModeData, event: any): ModeData => {
  const newData = { ...data, timestamp: Date.now() };
  
  switch (event.type) {
    case 'competitor_price_change':
      if (newData.competitors) {
        newData.competitors = newData.competitors.map(c => 
          c.id === event.competitorId 
            ? { ...c, currentPrice: event.newPrice }
            : c
        );
      }
      break;
      
    case 'event_trigger':
      // 添加事件预警
      if (newData.alerts) {
        newData.alerts = [...newData.alerts, {
          id: generateId('ALERT'),
          type: 'event',
          level: event.impact > 0.5 ? 'critical' : 'warning',
          message: `${event.name}: ${event.description}`,
          timestamp: new Date().toISOString(),
          requiresAction: event.impact > 0.5,
        }];
      }
      break;
      
    case 'inventory_change':
      if (newData.inventory) {
        newData.inventory = {
          ...newData.inventory,
          flexiblePool: {
            ...newData.inventory.flexiblePool,
            available: Math.max(0, newData.inventory.flexiblePool.available + event.change),
          },
        };
      }
      break;
  }
  
  return newData;
};

// ============================================
// Store 实现
// ============================================

export const useTimeModeStore = create<TimeModeStore>((set, get) => ({
  // 初始状态
  mode: 'realtime',
  
  realtimeData: null,
  historyData: null,
  sandboxData: null,
  
  realtime: {
    isLive: false,
    lastTransactionTime: Date.now(),
    nextTransactionDelay: 5000,
  },
  
  history: {
    currentSnapshot: null,
    playbackPosition: 0,
    isPlaying: false,
    currentTimelineIndex: 0,
    appliedEvents: new Set(),
  },
  
  sandbox: {
    frozenBaseData: null,
    variables: { ...defaultSandboxVariables },
  },
  
  // ===== 模式切换 =====
  
  setMode: (mode, currentStoreData) => {
    const { stopRealtimeSimulation } = get();
    
    // 停止当前模式的模拟
    stopRealtimeSimulation();
    
    // 如果有当前 store 数据，保存到旧模式
    if (currentStoreData) {
      const oldMode = get().mode;
      if (oldMode === 'realtime') {
        set({ realtimeData: currentStoreData });
      } else if (oldMode === 'history') {
        set({ historyData: currentStoreData });
      } else if (oldMode === 'sandbox') {
        set({ sandboxData: currentStoreData });
      }
    }
    
    // 切换到新模式
    set({ mode });
    
    // 如果新模式有缓存数据，返回给 unifiedStore
    if (mode === 'realtime') {
      if (get().realtimeData && currentStoreData) {
        // 基于当前数据启动实时模式
        get().startRealtimeSimulation(currentStoreData);
      }
    } else if (mode === 'history') {
      // 历史模式需要手动加载快照
    } else if (mode === 'sandbox') {
      if (!get().sandbox.frozenBaseData && currentStoreData) {
        get().freezeCurrentState(currentStoreData);
      }
    }
  },
  
  // 获取当前模式的显示数据
  getCurrentModeData: () => {
    const { mode, realtimeData, historyData, sandboxData } = get();
    switch (mode) {
      case 'realtime': return realtimeData;
      case 'history': return historyData;
      case 'sandbox': return sandboxData;
      default: return null;
    }
  },
  
  // 更新当前模式的数据
  updateCurrentModeData: (data) => {
    const { mode } = get();
    if (mode === 'realtime') {
      set({ realtimeData: { ...get().realtimeData!, ...data, timestamp: Date.now() } });
    } else if (mode === 'history') {
      set({ historyData: { ...get().historyData!, ...data, timestamp: Date.now() } });
    } else if (mode === 'sandbox') {
      set({ sandboxData: { ...get().sandboxData!, ...data, timestamp: Date.now() } });
    }
  },
  
  // ===== 实时模式 =====
  
  startRealtimeSimulation: (baseData) => {
    // 保存初始状态
    set({ 
      realtimeData: { ...baseData, timestamp: Date.now() },
      realtime: {
        isLive: true,
        lastTransactionTime: Date.now(),
        nextTransactionDelay: 3000 + Math.random() * 4000,
      },
    });
    
    // 启动定时器
    const interval = setInterval(() => {
      const { mode, realtime, realtimeData } = get();
      if (mode !== 'realtime' || !realtime.isLive || !realtimeData) {
        clearInterval(interval);
        return;
      }
      
      // 1. 随机生成成交
      const roomType = realtimeData.hotel?.roomTypes[0];
      if (roomType) {
        const transaction = generateRandomTransaction(roomType.currentPrice);
        if (transaction) {
          const newTransactions = [transaction, ...(realtimeData.transactions || [])].slice(0, 20);
          set({
            realtimeData: {
              ...realtimeData,
              transactions: newTransactions,
              timestamp: Date.now(),
            },
          });
        }
      }
      
      // 2. 竞品价格波动（5%概率）
      if (Math.random() < 0.05 && realtimeData.competitors) {
        set({
          realtimeData: {
            ...realtimeData,
            competitors: fluctuateCompetitors(realtimeData.competitors),
            timestamp: Date.now(),
          },
        });
      }
      
      // 3. 库存自然消耗（随机）
      if (realtimeData.inventory && Math.random() < 0.3) {
        const inventory = realtimeData.inventory;
        const pool = Math.random() > 0.5 ? 'ota' : 'flexible';
        const currentAvailable = (inventory[pool as keyof Inventory] as any).available;
        if (currentAvailable > 0) {
          set({
            realtimeData: {
              ...realtimeData,
              inventory: {
                ...inventory,
                [pool]: {
                  ...(inventory[pool as keyof Inventory] as any),
                  available: currentAvailable - 1,
                  sold: (inventory[pool as keyof Inventory] as any).sold + 1,
                },
              },
              timestamp: Date.now(),
            },
          });
        }
      }
      
    }, 3000);
    
    (window as any).__realtimeInterval = interval;
  },
  
  stopRealtimeSimulation: () => {
    set({ realtime: { ...get().realtime, isLive: false } });
    if ((window as any).__realtimeInterval) {
      clearInterval((window as any).__realtimeInterval);
    }
  },
  
  generateRealtimeTransaction: (basePrice) => generateRandomTransaction(basePrice),
  
  applyRealtimeFluctuations: () => {
    const { realtimeData } = get();
    if (!realtimeData) return;
    
    set({
      realtimeData: {
        ...realtimeData,
        competitors: fluctuateCompetitors(realtimeData.competitors || []),
        timestamp: Date.now(),
      },
    });
  },
  
  // ===== 历史模式 =====
  
  loadSnapshot: (snapshotId) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      // 初始化历史数据为快照的初始状态
      // Note: snapshot.initialState 是简化格式，需要转换为完整的 ModeData
      const initialState = snapshot.initialState as any;
      
      // 创建空的初始数据结构
      const initialData: ModeData = {
        hotel: null,
        pricing: initialState.pricing ? {
          basePrice: initialState.pricing.basePrice,
          roomBasePrices: {},
          competitorAvg: initialState.pricing.competitorAvg,
          adjustments: { location: 1, quality: 1 },
          platformPrices: {
            xianyu: { price: Math.round(initialState.pricing.basePrice * 1.08), coefficient: 1.08, riskDeposit: 100 },
            xiaohongshu: { price: initialState.pricing.basePrice, coefficient: 1.0, riskDeposit: 200 },
            wechat: { price: Math.round(initialState.pricing.basePrice * 0.95), coefficient: 0.95, riskDeposit: 50 },
          },
          mode: initialState.pricing.mode,
          floorPrice: Math.round(initialState.pricing.basePrice * 0.8),
          ceilingPrice: Math.round(initialState.pricing.basePrice * 1.5),
          deviation: 0,
        } : null,
        inventory: initialState.inventory ? {
          total: 100,
          sold: 0,
          available: (initialState.inventory.otaAvailable || 0) + (initialState.inventory.flexibleAvailable || 0),
          otaPool: {
            total: 60,
            sold: 60 - (initialState.inventory.otaAvailable || 0),
            available: initialState.inventory.otaAvailable || 0,
          },
          flexiblePool: {
            total: 40,
            sold: 40 - (initialState.inventory.flexibleAvailable || 0),
            available: initialState.inventory.flexibleAvailable || 0,
            preoccupied: 0,
            maxAllocation: 40,
            platforms: {
              xianyu: { allocated: 15, sold: 0, available: 15 },
              xiaohongshu: { allocated: 15, sold: 0, available: 15 },
              wechat: { allocated: 10, sold: 0, available: 10 },
            },
          },
          byRoomType: {},
        } : null,
        competitors: initialState.competitors || [],
        transactions: [],
        alerts: [],
        timestamp: Date.now(),
      };
      
      set({
        history: {
          currentSnapshot: snapshot,
          playbackPosition: 0,
          isPlaying: false,
          currentTimelineIndex: 0,
          appliedEvents: new Set(),
        },
        historyData: initialData,
      });
    }
  },
  
  calculateHistoryData: () => {
    const { history, historyData } = get();
    if (!history.currentSnapshot || !historyData) return null;
    
    const { timeline } = history.currentSnapshot;
    const currentIndex = Math.floor((history.playbackPosition / 100) * timeline.length);
    
    // 应用到当前索引的所有事件
    let newData = { ...historyData };
    for (let i = 0; i <= currentIndex && i < timeline.length; i++) {
      const event = timeline[i];
      if (!history.appliedEvents.has(event.time)) {
        newData = applyTimelineEvent(newData, event);
      }
    }
    
    return newData;
  },
  
  playHistory: () => {
    set({ history: { ...get().history, isPlaying: true } });
    
    const interval = setInterval(() => {
      const { history, mode } = get();
      if (mode !== 'history' || !history.isPlaying) {
        clearInterval(interval);
        return;
      }
      
      const newPosition = history.playbackPosition + 1;
      if (newPosition >= 100) {
        set({ history: { ...history, isPlaying: false, playbackPosition: 100 } });
        clearInterval(interval);
        return;
      }
      
      // 更新播放位置并重新计算数据
      set({ history: { ...history, playbackPosition: newPosition } });
      const newData = get().calculateHistoryData();
      if (newData) {
        set({ historyData: newData });
      }
    }, 200);
    
    (window as any).__historyInterval = interval;
  },
  
  pauseHistory: () => {
    set({ history: { ...get().history, isPlaying: false } });
    if ((window as any).__historyInterval) {
      clearInterval((window as any).__historyInterval);
    }
  },
  
  seekHistory: (position) => {
    const { history } = get();
    if (!history.currentSnapshot) return null;
    
    set({ 
      history: { 
        ...history, 
        playbackPosition: position,
        appliedEvents: new Set(), // 重置已应用事件
      } 
    });
    
    const newData = get().calculateHistoryData();
    if (newData) {
      set({ historyData: newData });
    }
    return newData;
  },
  
  randomDisturbance: () => {
    const { history } = get();
    if (!history.currentSnapshot) return;
    
    const shuffledTimeline = [...history.currentSnapshot.timeline]
      .sort(() => Math.random() - 0.5);
    
    set({
      history: {
        ...history,
        currentSnapshot: {
          ...history.currentSnapshot,
          timeline: shuffledTimeline,
        },
        appliedEvents: new Set(),
        playbackPosition: 0,
      },
    });
  },
  
  // ===== 沙盘模式 =====
  
  freezeCurrentState: (state) => {
    set({
      sandbox: {
        frozenBaseData: { ...state, timestamp: Date.now() },
        variables: { ...defaultSandboxVariables },
      },
      sandboxData: { ...state, timestamp: Date.now() },
    });
  },
  
  updateSandboxVariable: (key, value) => {
    const { sandbox } = get();
    const newVariables = { ...sandbox.variables, [key]: value };
    
    set({
      sandbox: {
        ...sandbox,
        variables: newVariables,
      },
    });
    
    return get().calculateSandboxResult();
  },
  
  calculateSandboxResult: () => {
    const { sandbox, sandboxData } = get();
    if (!sandbox.frozenBaseData || !sandboxData) return null;
    
    const { variables } = sandbox;
    const baseData = sandbox.frozenBaseData;
    
    // 计算调整后的竞品价格
    const adjustedCompetitors = baseData.competitors.map(c => ({
      ...c,
      currentPrice: Math.round(c.currentPrice * (1 + variables.competitorPriceAdjustment / 100)),
    }));
    
    const newCompetitorAvg = adjustedCompetitors.reduce((sum, c) => sum + c.currentPrice, 0) / adjustedCompetitors.length;
    
    // 计算事件影响
    const eventMultiplier = variables.eventIntensity === 'high' ? 1.2 :
                            variables.eventIntensity === 'medium' ? 1.1 :
                            variables.eventIntensity === 'low' ? 1.05 : 1;
    
    // 计算建议价格（基于 basePrice 或竞品均价）
    const basePrice = baseData.pricing?.basePrice || newCompetitorAvg;
    const simulatedPrice = Math.round(basePrice * eventMultiplier);
    
    // 更新平台价格
    const updatedPricing = baseData.pricing ? {
      ...baseData.pricing,
      basePrice: simulatedPrice,
      competitorAvg: Math.round(newCompetitorAvg),
      platformPrices: {
        xianyu: { price: Math.round(simulatedPrice * 1.08), coefficient: 1.08, riskDeposit: 100 },
        xiaohongshu: { price: simulatedPrice, coefficient: 1.0, riskDeposit: 200 },
        wechat: { price: Math.round(simulatedPrice * 0.95), coefficient: 0.95, riskDeposit: 150 },
      },
    } : null;
    
    const newData: ModeData = {
      ...sandboxData,
      competitors: adjustedCompetitors,
      pricing: updatedPricing,
      timestamp: Date.now(),
    };
    
    set({ sandboxData: newData });
    return newData;
  },
  
  resetSandbox: () => {
    const { sandbox } = get();
    if (sandbox.frozenBaseData) {
      set({
        sandboxData: { ...sandbox.frozenBaseData },
        sandbox: {
          ...sandbox,
          variables: { ...defaultSandboxVariables },
        },
      });
    }
  },
}));

// ============================================
// 时间格式化
// ============================================

export const formatPlaybackTime = (position: number, totalEvents: number): string => {
  if (totalEvents === 0) return '00:00';
  const currentIndex = Math.floor((position / 100) * totalEvents);
  const hour = 14 + Math.floor(currentIndex / 2);
  const minute = (currentIndex % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};
