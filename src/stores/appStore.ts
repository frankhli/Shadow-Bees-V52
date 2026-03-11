import { create } from 'zustand';
import type { Hotel, RoomType, Competitor, Event, Pricing, Inventory, Transaction, ContentItem, Alert, User, ThemeType, PricingMode, TimeMode } from '@/types';
import { hotels, competitorsMap, eventsMap } from '@/data/hotels';

// ============================================
// App State 类型定义
// ============================================

interface AppState {
  // 当前状态
  currentHotel: Hotel;
  currentRoomType: RoomType;
  currentTheme: ThemeType;
  currentMode: PricingMode;
  timeMode: TimeMode;
  
  // 数据
  competitors: Competitor[];
  events: Event[];
  pricing: Pricing | null;
  inventory: Inventory;
  transactions: Transaction[];
  contents: ContentItem[];
  alerts: Alert[];
  user: User;
  
  // UI状态
  isLoading: boolean;
  loadingText: string;
  currentTime: string;
  
  // Actions
  setCurrentHotel: (hotel: Hotel) => void;
  setCurrentRoomType: (roomType: RoomType) => void;
  setTimeMode: (mode: TimeMode) => void;
  setPricing: (pricing: Pricing) => void;
  updateBasePrice: (price: number) => void;
  addTransaction: (transaction: Transaction) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  setLoading: (loading: boolean, text?: string) => void;
  updateCurrentTime: () => void;
  
  // 联动Actions
  switchHotel: (hotelId: string) => Promise<void>;
  switchRoomType: (roomTypeId: string) => Promise<void>;
  switchTimeMode: (mode: TimeMode) => void;
  
  // 库存与事件联动
  checkInventoryAndAutoOffline: () => void;
  simulateEventImpact: () => void;
}

// ============================================
// 初始状态
// ============================================

const initialHotel = hotels[0];
const initialRoomType = initialHotel.roomTypes[0];

const initialInventory: Inventory = {
  total: 20,
  sold: 14,
  available: 6,
  otaPool: {
    total: 16,
    sold: 14,
    available: 2,
  },
  flexiblePool: {
    total: 4,
    sold: 0,
    available: 4,
    preoccupied: 0,
    maxAllocation: 4,
    platforms: {
      xianyu: { allocated: 2, sold: 0, available: 2 },
      xiaohongshu: { allocated: 1, sold: 0, available: 1 },
      wechat: { allocated: 1, sold: 0, available: 1 },
    },
  },
  byRoomType: {},
};

const initialPricing: Pricing = {
  basePrice: 580,
  roomBasePrices: {
    'room-economy': 320,
    'room-standard': 580,
    'room-suite': 950,
  },
  competitorAvg: 680,
  adjustments: { location: 0.04, quality: 0.03 },
  platformPrices: {
    xianyu: { price: 626, coefficient: 1.08, riskDeposit: 0.15 },
    xiaohongshu: { price: 580, coefficient: 1.0, riskDeposit: 0.20 },
    wechat: { price: 551, coefficient: 0.95, riskDeposit: 0.08 },
  },
  floorPrice: 420,
  ceilingPrice: 800,
  mode: 'clearance',
  deviation: -14.7,
};

const initialUser: User = {
  id: 'owner-001',
  name: '张老板',
  role: 'owner',
  permissions: {
    canChangeFloorPrice: true,
    canChangePrice: true,
    canSwitchHotel: true,
    canSwitchTimeMode: true,
    canInitHotel: true,
    canApprove: true,
    canViewAudit: true,
    canViewFinance: true,
  },
};

// ============================================
// Store 创建
// ============================================

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  currentHotel: initialHotel,
  currentRoomType: initialRoomType,
  currentTheme: initialHotel.theme,
  currentMode: initialHotel.defaultMode,
  timeMode: 'realtime',
  
  competitors: competitorsMap[initialHotel.id],
  events: eventsMap[initialHotel.id],
  pricing: initialPricing,
  inventory: initialInventory,
  transactions: [],
  contents: [],
  alerts: [
    {
      id: 'alert-1',
      level: 'warning',
      type: 'inventory',
      message: '库存紧张：仅剩2间，建议加速出货',
      timestamp: new Date().toISOString(),
      requiresAction: false,
    },
  ],
  user: initialUser,
  
  isLoading: false,
  loadingText: '',
  currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  
  // ============================================
  // 基础 Actions
  // ============================================
  
  setCurrentHotel: (hotel) => set({
    currentHotel: hotel,
    currentTheme: hotel.theme,
    currentMode: hotel.defaultMode,
  }),
  
  setCurrentRoomType: (roomType) => set({ currentRoomType: roomType }),
  
  setTimeMode: (mode) => set({ timeMode: mode }),
  
  setPricing: (pricing) => set({ pricing }),
  
  updateBasePrice: (price) => {
    const { pricing } = get();
    if (!pricing) return;
    
    // 计算分平台价格
    const platformPrices = {
      xianyu: {
        price: Math.round(price * 1.08),
        coefficient: 1.08,
        riskDeposit: 0.15,
      },
      xiaohongshu: {
        price: Math.round(price * 1.0),
        coefficient: 1.0,
        riskDeposit: 0.20,
      },
      wechat: {
        price: Math.round(price * 0.95),
        coefficient: 0.95,
        riskDeposit: 0.08,
      },
    };
    
    // 判断模式
    let mode: PricingMode = 'dynamic';
    const deviation = ((price - pricing.competitorAvg) / pricing.competitorAvg) * 100;
    if (price > pricing.competitorAvg * 1.2) {
      mode = 'scalper';
    } else if (price < pricing.competitorAvg * 0.9) {
      mode = 'clearance';
    }
    
    set({
      pricing: {
        ...pricing,
        basePrice: price,
        platformPrices,
        mode,
        deviation,
      },
    });
  },
  
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions].slice(0, 50),
  })),
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 10),
  })),
  
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id),
  })),
  
  setLoading: (loading, text = '') => set({
    isLoading: loading,
    loadingText: text,
  }),
  
  updateCurrentTime: () => set({
    currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  }),
  
  // ============================================
  // 联动 Actions
  // ============================================
  
  // 联动1: 酒店切换
  switchHotel: async (hotelId) => {
    const { setLoading, setCurrentHotel, checkInventoryAndAutoOffline } = get();
    
    setLoading(true, '正在加载新酒店数据...');
    
    // 500ms 延迟模拟加载
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const hotel = hotels.find((h) => h.id === hotelId);
    if (hotel) {
      setCurrentHotel(hotel);
      set({
        competitors: competitorsMap[hotelId] || [],
        events: eventsMap[hotelId] || [],
        currentRoomType: hotel.roomTypes[0],
      });
      // 切换酒店后检查库存状态
      checkInventoryAndAutoOffline();
    }
    
    setLoading(false);
  },
  
  // 联动7: 库存售罄自动下架
  checkInventoryAndAutoOffline: () => {
    const { inventory, contents, addAlert } = get();
    
    // 检查各平台库存
    const platforms = ['xianyu', 'xiaohongshu', 'wechat'] as const;
    
    platforms.forEach((platform) => {
      const platformInventory = inventory?.flexiblePool.platforms[platform];
      if (platformInventory && platformInventory.available === 0) {
        // 该平台售罄，自动下架相关内容
        const updatedContents = contents.map((content) => {
          if (content.platform === platform && content.status === 'published') {
            return { ...content, status: 'expired' as const };
          }
          return content;
        });
        
        set({ contents: updatedContents });
        
        // 添加预警
        addAlert({
          id: `alert-offline-${Date.now()}`,
          level: 'warning',
          type: 'inventory',
          message: `${platform} 平台库存已售罄，相关内容已自动下架`,
          timestamp: new Date().toISOString(),
          requiresAction: false,
        });
      }
    });
  },
  
  // 联动2: 房型切换
  switchRoomType: async (roomTypeId) => {
    const { setLoading, currentHotel, simulateEventImpact } = get();
    
    setLoading(true, '正在加载房型数据...');
    
    // 2秒骨架屏
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const roomType = currentHotel.roomTypes.find((r) => r.id === roomTypeId);
    if (roomType) {
      set({ currentRoomType: roomType });
      // 切换房型后模拟事件影响
      simulateEventImpact();
    }
    
    setLoading(false);
  },
  
  // 联动8: 事件触发联动（竞品价格波动、定价建议、模式切换）
  simulateEventImpact: () => {
    const { competitors, pricing, addAlert } = get();
    
    if (!pricing) return;
    
    // 模拟竞品价格波动
    const updatedCompetitors = competitors.map((comp) => ({
      ...comp,
      currentPrice: Math.round(comp.currentPrice * (1 + Math.random() * 0.1 - 0.05)),
    }));
    
    set({ competitors: updatedCompetitors });
    
    // 重新计算定价建议
    const newCompetitorAvg = updatedCompetitors.reduce((sum, c) => sum + c.currentPrice, 0) / updatedCompetitors.length;
    const suggestedPrice = Math.round(newCompetitorAvg * (1 + pricing.adjustments.location + pricing.adjustments.quality));
    
    // 判断是否需要切换模式
    let suggestedMode: PricingMode = pricing.mode;
    const priceRatio = suggestedPrice / newCompetitorAvg;
    
    if (priceRatio > 1.2) {
      suggestedMode = 'scalper';
    } else if (priceRatio < 0.9) {
      suggestedMode = 'clearance';
    } else {
      suggestedMode = 'dynamic';
    }
    
    // 添加预警提示
    if (suggestedMode !== pricing.mode) {
      addAlert({
        id: `alert-mode-${Date.now()}`,
        level: 'warning',
        type: 'pricing',
        message: `市场波动，建议切换至${suggestedMode === 'scalper' ? '黄牛' : suggestedMode === 'dynamic' ? '动态' : '尾货'}模式，建议价¥${suggestedPrice}`,
        timestamp: new Date().toISOString(),
        requiresAction: true,
      });
    }
  },
  
  // 联动3: 时间态切换
  switchTimeMode: (mode) => {
    const state = get();
    
    if (mode === 'realtime') {
      // 切换到实时推演：清空历史/沙盘数据，恢复实时数据流
      set({ 
        timeMode: mode,
        transactions: [], // 清空历史成交
        alerts: [{
          id: `alert-${Date.now()}`,
          level: 'info',
          type: 'timeMode',
          message: '已切换到实时推演模式，数据流已恢复',
          timestamp: new Date().toISOString(),
          requiresAction: false,
        }],
      });
    } else if (mode === 'history') {
      // 切换到历史回放：保存当前状态，加载历史快照
      set({ 
        timeMode: mode,
        transactions: state.transactions.slice(0, 10), // 保留部分历史记录用于回放
        alerts: [{
          id: `alert-${Date.now()}`,
          level: 'info',
          type: 'timeMode',
          message: '已切换到历史回放模式，显示预录数据快照',
          timestamp: new Date().toISOString(),
          requiresAction: false,
        }],
      });
    } else if (mode === 'sandbox') {
      // 切换到沙盘模拟：冻结当前状态，允许手动调整
      set({ 
        timeMode: mode,
        alerts: [{
          id: `alert-${Date.now()}`,
          level: 'warning',
          type: 'timeMode',
          message: '已切换到沙盘模拟模式，当前状态已冻结，可手动调整变量',
          timestamp: new Date().toISOString(),
          requiresAction: false,
        }],
      });
    }
  },
}));
