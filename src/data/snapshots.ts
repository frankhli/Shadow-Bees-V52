/**
 * Shadow-Bees V52 - 历史回放快照数据
 * 用于历史回放模式的时间轴演示
 */

// 类型定义用于文档目的，实际快照数据使用内联类型

// ============================================
// 周杰伦演唱会事件快照 (2026-02-14)
// ============================================

export interface Snapshot {
  id: string;
  name: string;
  timestamp: string;
  description: string;
  initialState: {
    pricing: {
      basePrice: number;
      competitorAvg: number;
      mode: 'scalper' | 'dynamic' | 'clearance';
    };
    inventory: {
      otaAvailable: number;
      flexibleAvailable: number;
    };
  };
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string; // 相对时间，如 "14:00"
  type: 'transaction' | 'price_change' | 'inventory_change' | 'event_trigger';
  data: any;
  description: string;
}

export const concertSnapshot: Snapshot = {
  id: 'snapshot-concert-20260214',
  name: '周杰伦演唱会 (2026-02-14)',
  timestamp: '2026-02-14T14:00:00Z',
  description: '工体演唱会当天，从下午2点到晚上10点的完整演变',
  initialState: {
    pricing: {
      basePrice: 580,
      competitorAvg: 680,
      mode: 'dynamic',
    },
    inventory: {
      otaAvailable: 2,
      flexibleAvailable: 4,
    },
  },
  timeline: [
    {
      time: '14:00',
      type: 'transaction',
      data: { platform: 'xianyu', price: 626, roomType: '豪华大床房' },
      description: '闲鱼成交1单，¥626',
    },
    {
      time: '14:30',
      type: 'price_change',
      data: { competitor: '亚朵', oldPrice: 880, newPrice: 950 },
      description: '亚朵涨价至¥950，市场供给紧张',
    },
    {
      time: '15:00',
      type: 'inventory_change',
      data: { otaAvailable: 0, flexibleAvailable: 4 },
      description: 'OTA售罄，灵活库存启动',
    },
    {
      time: '15:30',
      type: 'transaction',
      data: { platform: 'xiaohongshu', price: 750, roomType: '豪华大床房' },
      description: '小红书成交1单，黄牛价¥750',
    },
    {
      time: '16:00',
      type: 'event_trigger',
      data: { event: 'concert_start', intensity: 'high' },
      description: '演唱会开始，需求激增',
    },
    {
      time: '16:30',
      type: 'price_change',
      data: { basePrice: 580, newBasePrice: 720, mode: 'scalper' },
      description: '系统自动切换至黄牛模式，建议价¥720',
    },
    {
      time: '17:00',
      type: 'transaction',
      data: { platform: 'wechat', price: 684, roomType: '豪华大床房' },
      description: '微信成交1单，¥684',
    },
    {
      time: '17:30',
      type: 'transaction',
      data: { platform: 'xianyu', price: 780, roomType: '豪华大床房' },
      description: '闲鱼成交1单，黄牛价¥780',
    },
    {
      time: '18:00',
      type: 'inventory_change',
      data: { flexibleAvailable: 1 },
      description: '灵活库存仅剩1间',
    },
    {
      time: '19:00',
      type: 'transaction',
      data: { platform: 'xiaohongshu', price: 800, roomType: '豪华大床房' },
      description: '小红书成交最后1单，¥800',
    },
    {
      time: '20:00',
      type: 'inventory_change',
      data: { flexibleAvailable: 0 },
      description: '全部售罄',
    },
    {
      time: '22:00',
      type: 'event_trigger',
      data: { event: 'concert_end', intensity: 'low' },
      description: '演唱会结束，需求回落',
    },
  ],
};

// ============================================
// 高铁站快照 (2026-02-15)
// ============================================

export const trainSnapshot: Snapshot = {
  id: 'snapshot-train-20260215',
  name: '北京南站高铁晚点 (2026-02-15)',
  timestamp: '2026-02-15T18:00:00Z',
  description: '受天气影响，多趟列车晚点，临时住宿需求激增',
  initialState: {
    pricing: {
      basePrice: 480,
      competitorAvg: 550,
      mode: 'clearance',
    },
    inventory: {
      otaAvailable: 8,
      flexibleAvailable: 4,
    },
  },
  timeline: [
    {
      time: '18:00',
      type: 'event_trigger',
      data: { event: 'train_delay', intensity: 'medium' },
      description: '高铁晚点公告发布',
    },
    {
      time: '18:15',
      type: 'transaction',
      data: { platform: 'wechat', price: 456, roomType: '标准双床房' },
      description: '微信成交2单，尾货价',
    },
    {
      time: '18:30',
      type: 'price_change',
      data: { basePrice: 480, newBasePrice: 580, mode: 'dynamic' },
      description: '需求激增，价格上调',
    },
    {
      time: '19:00',
      type: 'transaction',
      data: { platform: 'xianyu', price: 626, roomType: '豪华大床房' },
      description: '闲鱼成交1单',
    },
    {
      time: '20:00',
      type: 'inventory_change',
      data: { otaAvailable: 3, flexibleAvailable: 2 },
      description: '库存紧张',
    },
    {
      time: '21:00',
      type: 'price_change',
      data: { basePrice: 580, newBasePrice: 650, mode: 'scalper' },
      description: '切换至黄牛模式',
    },
  ],
};

// ============================================
// 所有快照列表
// ============================================

export const snapshots: Snapshot[] = [concertSnapshot, trainSnapshot];

// ============================================
// 沙盘模拟初始变量
// ============================================

export interface SandboxVariables {
  competitorPriceAdjustment: number; // -20% to +20%
  inventoryAdjustment: number; // -5 to +5 rooms
  eventIntensity: 'none' | 'low' | 'medium' | 'high';
  demandMultiplier: number; // 0.5 to 2.0
}

export const defaultSandboxVariables: SandboxVariables = {
  competitorPriceAdjustment: 0,
  inventoryAdjustment: 0,
  eventIntensity: 'none',
  demandMultiplier: 1.0,
};
