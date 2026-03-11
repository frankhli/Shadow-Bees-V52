/**
 * Shadow-Bees V52 - 动态竞品数据生成器（按房型）
 * 
 * 3档酒店 × 3房型 = 9个价格
 * 价格衔接逻辑：低档套房最高价 ≈ 同档经济房最低价
 */

import type { Competitor, Event, RoomType } from '@/types';

// ============================================
// 各酒店类型价格配置（符合市场规律）
// ============================================

export interface HotelPriceConfig {
  id: string;
  name: string;
  brand: string;
  tier: 'economy' | 'comfort' | 'premium';
  distance: number;
  rating: number;
  // 三个房型的基础价格区间
  roomPrices: {
    budget: [number, number];    // 经济房（无窗/特价/床位）
    standard: [number, number];  // 标准房
    suite: [number, number];     // 套房/豪华房
  };
  inventoryRange: [number, number];
}

// 城市酒店（三里屯）价格配置
const sanlitunConfig: HotelPriceConfig[] = [
  // 低一档：经济型
  { id: 'eco-1', name: '如家精选工体店', brand: '如家', tier: 'economy', distance: 1.8, rating: 4.2, 
    roomPrices: { budget: [150, 190], standard: [200, 240], suite: [260, 320] }, inventoryRange: [5, 25] },
  { id: 'eco-2', name: '7天酒店三里屯店', brand: '7天', tier: 'economy', distance: 1.2, rating: 4.0,
    roomPrices: { budget: [140, 180], standard: [190, 230], suite: [250, 300] }, inventoryRange: [8, 30] },
  { id: 'eco-3', name: '汉庭酒店朝阳门店', brand: '汉庭', tier: 'economy', distance: 2.0, rating: 4.1,
    roomPrices: { budget: [155, 195], standard: [205, 245], suite: [265, 325] }, inventoryRange: [6, 22] },
  
  // 同档次：舒适型（我们对标）
  { id: 'com-1', name: '亚朵酒店三里屯店', brand: '亚朵', tier: 'comfort', distance: 0.8, rating: 4.7,
    roomPrices: { budget: [280, 340], standard: [350, 450], suite: [480, 620] }, inventoryRange: [2, 15] },
  { id: 'com-2', name: '桔子水晶三里屯店', brand: '桔子水晶', tier: 'comfort', distance: 1.2, rating: 4.6,
    roomPrices: { budget: [270, 330], standard: [340, 440], suite: [460, 600] }, inventoryRange: [3, 18] },
  { id: 'com-3', name: '全季酒店工体店', brand: '全季', tier: 'comfort', distance: 1.5, rating: 4.5,
    roomPrices: { budget: [260, 320], standard: [330, 430], suite: [450, 580] }, inventoryRange: [5, 20] },
  
  // 高一档：高端/奢华
  { id: 'pre-1', name: '北京三里屯CHAO酒店', brand: 'CHAO', tier: 'premium', distance: 0.5, rating: 4.8,
    roomPrices: { budget: [0, 0], standard: [650, 850], suite: [900, 1200] }, inventoryRange: [1, 8] },
  { id: 'pre-2', name: '北京瑜舍酒店', brand: '瑜舍', tier: 'premium', distance: 0.6, rating: 4.9,
    roomPrices: { budget: [0, 0], standard: [700, 900], suite: [1000, 1400] }, inventoryRange: [1, 6] },
];

// 郊区酒店（崇礼）价格配置
const chongliConfig: HotelPriceConfig[] = [
  { id: 'eco-1', name: '崇礼云顶之星青年旅舍', brand: '云顶', tier: 'economy', distance: 3.5, rating: 4.0,
    roomPrices: { budget: [80, 120], standard: [130, 180], suite: [200, 260] }, inventoryRange: [10, 40] },
  { id: 'eco-2', name: '太舞鹰巢国际青年旅舍', brand: '鹰巢', tier: 'economy', distance: 4.2, rating: 4.1,
    roomPrices: { budget: [85, 125], standard: [135, 185], suite: [210, 270] }, inventoryRange: [8, 35] },
  
  { id: 'com-1', name: '崇礼云顶大酒店', brand: '云顶', tier: 'comfort', distance: 3.5, rating: 4.5,
    roomPrices: { budget: [180, 240], standard: [280, 380], suite: [420, 550] }, inventoryRange: [3, 20] },
  { id: 'com-2', name: '太舞南山里酒店', brand: '南山里', tier: 'comfort', distance: 4.2, rating: 4.6,
    roomPrices: { budget: [190, 250], standard: [290, 390], suite: [440, 570] }, inventoryRange: [2, 18] },
  { id: 'com-3', name: '崇礼万龙滑雪场酒店', brand: '万龙', tier: 'comfort', distance: 5.0, rating: 4.4,
    roomPrices: { budget: [170, 230], standard: [270, 370], suite: [400, 530] }, inventoryRange: [4, 22] },
  
  { id: 'pre-1', name: '崇礼万怡酒店', brand: '万怡', tier: 'premium', distance: 5.0, rating: 4.7,
    roomPrices: { budget: [0, 0], standard: [450, 650], suite: [750, 950] }, inventoryRange: [1, 12] },
  { id: 'pre-2', name: '崇礼瑞意酒店', brand: '瑞意', tier: 'premium', distance: 4.8, rating: 4.8,
    roomPrices: { budget: [0, 0], standard: [500, 700], suite: [800, 1000] }, inventoryRange: [1, 8] },
];

// 景区酒店（大理）价格配置
const daliConfig: HotelPriceConfig[] = [
  { id: 'eco-1', name: '大理古城洱海门客栈', brand: '客栈', tier: 'economy', distance: 2.5, rating: 4.2,
    roomPrices: { budget: [100, 140], standard: [150, 200], suite: [220, 280] }, inventoryRange: [5, 20] },
  { id: 'eco-2', name: '大理慢屋民宿', brand: '民宿', tier: 'economy', distance: 3.0, rating: 4.3,
    roomPrices: { budget: [110, 150], standard: [160, 210], suite: [230, 290] }, inventoryRange: [4, 15] },
  
  { id: 'com-1', name: '大理英迪格酒店', brand: '英迪格', tier: 'comfort', distance: 1.8, rating: 4.6,
    roomPrices: { budget: [260, 340], standard: [380, 520], suite: [580, 750] }, inventoryRange: [2, 15] },
  { id: 'com-2', name: '大理铂尔曼酒店', brand: '铂尔曼', tier: 'comfort', distance: 2.2, rating: 4.7,
    roomPrices: { budget: [270, 350], standard: [390, 530], suite: [600, 780] }, inventoryRange: [2, 12] },
  { id: 'com-3', name: '大理实力希尔顿花园', brand: '希尔顿', tier: 'comfort', distance: 2.5, rating: 4.5,
    roomPrices: { budget: [250, 330], standard: [370, 510], suite: [560, 720] }, inventoryRange: [3, 18] },
  
  { id: 'pre-1', name: '大理洱海天域酒店', brand: '天域', tier: 'premium', distance: 1.5, rating: 4.8,
    roomPrices: { budget: [0, 0], standard: [550, 750], suite: [850, 1100] }, inventoryRange: [1, 10] },
  { id: 'pre-2', name: '大理海纳尔云墅', brand: '云墅', tier: 'premium', distance: 2.0, rating: 4.9,
    roomPrices: { budget: [0, 0], standard: [600, 800], suite: [900, 1200] }, inventoryRange: [1, 6] },
];

const hotelConfigs: Record<string, HotelPriceConfig[]> = {
  sanlitun: sanlitunConfig,
  chongli: chongliConfig,
  dali: daliConfig,
};

// ============================================
// 工具函数
// ============================================

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function seededInt(seed: string, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function calculateEventMultiplier(events: Event[]): number {
  if (!events || events.length === 0) return 1.0;
  let multiplier = 1.0;
  events.forEach(e => {
    switch (e.intensity) {
      case 'high': multiplier += 0.25; break;
      case 'medium': multiplier += 0.12; break;
      case 'low': multiplier += 0.05; break;
    }
  });
  return Math.min(multiplier, 1.5);
}

// ============================================
// 按房型生成竞品数据（核心）
// ============================================

export interface CompetitorInfo {
  id: string;
  name: string;
  brand: string;
  price: number;
  inventory: number;
  status: 'soldout' | 'tight' | 'normal' | 'available';
  distance: number;
  rating: number;
}

export interface RoomTypeCompetitorData {
  tier: 'economy' | 'comfort' | 'premium';
  tierLabel: string;
  competitors: CompetitorInfo[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  soldoutCount: number;
  tightCount: number;
}

export interface DailyCompetitorData {
  date: string;
  byRoomType: {
    budget: RoomTypeCompetitorData;    // 经济房
    standard: RoomTypeCompetitorData;  // 标准房
    suite: RoomTypeCompetitorData;     // 套房
  };
}

/**
 * 生成单日的竞品数据（按房型分别计算）
 */
export function generateDailyCompetitorDataByRoomType(
  hotelId: string,
  date: string,
  events: Event[]
): DailyCompetitorData {
  const configs = hotelConfigs[hotelId] || [];
  const dayEvents = events.filter(e => e.date === date);
  const eventMultiplier = calculateEventMultiplier(dayEvents);
  
  const dateObj = new Date(date);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const weekendMultiplier = isWeekend ? 1.15 : 1.0;

  // 初始化三个房型的数据结构
  const byRoomType: Record<'budget' | 'standard' | 'suite', RoomTypeCompetitorData> = {
    budget: { tier: 'economy', tierLabel: '经济型', competitors: [], avgPrice: 0, minPrice: 0, maxPrice: 0, soldoutCount: 0, tightCount: 0 },
    standard: { tier: 'comfort', tierLabel: '舒适型', competitors: [], avgPrice: 0, minPrice: 0, maxPrice: 0, soldoutCount: 0, tightCount: 0 },
    suite: { tier: 'premium', tierLabel: '高端型', competitors: [], avgPrice: 0, minPrice: 0, maxPrice: 0, soldoutCount: 0, tightCount: 0 },
  };

  // 按房型生成竞品数据
  (['budget', 'standard', 'suite'] as const).forEach(roomType => {
    const roomTypeData = byRoomType[roomType];
    
    configs.forEach(config => {
      // 如果该酒店没有这个房型（如高端酒店可能没有经济房），跳过
      const priceRange = config.roomPrices[roomType];
      if (priceRange[0] === 0 && priceRange[1] === 0) return;

      const priceSeed = `${hotelId}-${config.id}-${roomType}-${date}`;
      const basePrice = seededInt(priceSeed, priceRange[0], priceRange[1]);
      const adjustedPrice = Math.round(basePrice * eventMultiplier * weekendMultiplier);
      
      const inventorySeed = `${hotelId}-${config.id}-inv-${roomType}-${date}`;
      const inventory = seededInt(inventorySeed, config.inventoryRange[0], config.inventoryRange[1]);
      
      // 判断状态
      const maxInv = config.inventoryRange[1];
      const occupancyRate = (maxInv - inventory) / maxInv;
      let status: 'soldout' | 'tight' | 'normal' | 'available' = 'available';
      if (inventory === 0) status = 'soldout';
      else if (occupancyRate > 0.85) status = 'tight';
      else if (occupancyRate > 0.5) status = 'normal';
      
      roomTypeData.competitors.push({
        id: config.id,
        name: config.name,
        brand: config.brand,
        price: adjustedPrice,
        inventory,
        status,
        distance: config.distance,
        rating: config.rating,
      });
    });

    // 计算该房型的统计
    const prices = roomTypeData.competitors.map(c => c.price);
    if (prices.length > 0) {
      roomTypeData.avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      roomTypeData.minPrice = Math.min(...prices);
      roomTypeData.maxPrice = Math.max(...prices);
      roomTypeData.soldoutCount = roomTypeData.competitors.filter(c => c.status === 'soldout').length;
      roomTypeData.tightCount = roomTypeData.competitors.filter(c => c.status === 'tight').length;
    }
  });

  return {
    date,
    byRoomType,
  };
}

// ============================================
// 按档次生成完整酒店数据（用于详情列表）
// ============================================

export interface HotelWithRoomPrices {
  id: string;
  name: string;
  brand: string;
  tier: 'economy' | 'comfort' | 'premium';
  distance: number;
  rating: number;
  // 三个房型的价格和状态
  prices: {
    budget: { price: number; status: 'soldout' | 'tight' | 'normal' | 'available' } | null;
    standard: { price: number; status: 'soldout' | 'tight' | 'normal' | 'available' } | null;
    suite: { price: number; status: 'soldout' | 'tight' | 'normal' | 'available' } | null;
  };
}

/**
 * 生成按档次分组的完整酒店数据（包含三个房型价格）
 */
export function generateHotelsByTier(
  hotelId: string,
  date: string,
  events: Event[]
): {
  economy: HotelWithRoomPrices[];
  comfort: HotelWithRoomPrices[];
  premium: HotelWithRoomPrices[];
} {
  const configs = hotelConfigs[hotelId] || sanlitunConfig;
  const dayEvents = events.filter(e => e.date === date);
  const eventMultiplier = calculateEventMultiplier(dayEvents);
  
  const dateObj = new Date(date);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const weekendMultiplier = isWeekend ? 1.15 : 1.0;

  const result: {
    economy: HotelWithRoomPrices[];
    comfort: HotelWithRoomPrices[];
    premium: HotelWithRoomPrices[];
  } = {
    economy: [],
    comfort: [],
    premium: [],
  };

  configs.forEach(config => {
    const hotel: HotelWithRoomPrices = {
      id: config.id,
      name: config.name,
      brand: config.brand,
      tier: config.tier,
      distance: config.distance,
      rating: config.rating,
      prices: {
        budget: null,
        standard: null,
        suite: null,
      },
    };

    // 计算每个房型的价格和状态
    (['budget', 'standard', 'suite'] as const).forEach(roomType => {
      const priceRange = config.roomPrices[roomType];
      if (priceRange[0] === 0 && priceRange[1] === 0) return;

      const priceSeed = `${hotelId}-${config.id}-${roomType}-${date}`;
      const basePrice = seededInt(priceSeed, priceRange[0], priceRange[1]);
      const adjustedPrice = Math.round(basePrice * eventMultiplier * weekendMultiplier);
      
      const inventorySeed = `${hotelId}-${config.id}-inv-${roomType}-${date}`;
      const inventory = seededInt(inventorySeed, config.inventoryRange[0], config.inventoryRange[1]);
      
      const maxInv = config.inventoryRange[1];
      const occupancyRate = (maxInv - inventory) / maxInv;
      let status: 'soldout' | 'tight' | 'normal' | 'available' = 'available';
      if (inventory === 0) status = 'soldout';
      else if (occupancyRate > 0.85) status = 'tight';
      else if (occupancyRate > 0.5) status = 'normal';

      hotel.prices[roomType] = { price: adjustedPrice, status };
    });

    result[config.tier].push(hotel);
  });

  // 按距离排序
  (Object.keys(result) as Array<keyof typeof result>).forEach(tier => {
    result[tier].sort((a, b) => a.distance - b.distance);
  });

  return result;
}

// ============================================
// 为Store生成兼容的竞品列表
// ============================================

export function generateDailyCompetitorData(
  hotelId: string,
  date: string,
  events: Event[],
  currentRoomType?: RoomType | null
): Competitor[] {
  const data = generateDailyCompetitorDataByRoomType(hotelId, date, events);
  
  // 判断当前房型类别
  const getRoomCategory = (roomTypeName: string): 'budget' | 'standard' | 'suite' => {
    const name = roomTypeName.toLowerCase();
    if (name.includes('经济') || name.includes('特价') || name.includes('无窗') || name.includes('青旅') || name.includes('床位')) return 'budget';
    if (name.includes('豪华') || name.includes('套房') || name.includes('观景') || name.includes('全景')) return 'suite';
    return 'standard';
  };
  
  const category = currentRoomType ? getRoomCategory(currentRoomType.name) : 'standard';
  const roomTypeData = data.byRoomType[category];
  
  // 转换为Store需要的格式
  return roomTypeData.competitors.map(c => ({
    id: c.id,
    name: c.name,
    brand: c.brand,
    logoUrl: '',
    distance: c.distance,
    rating: c.rating,
    currentPrice: c.price,
    inventory: c.inventory,
    status: c.status,
    platform: '携程',
    tier: category === 'budget' ? 'economy' : category === 'suite' ? 'premium' : 'comfort',
    tierLabel: roomTypeData.tierLabel,
  } as Competitor));
}

// ============================================
// 计算竞品统计（按房型）
// ============================================

export interface CompetitorStatsByRoomType {
  budget: { avg: number; min: number; max: number; soldoutCount: number; tightCount: number; availableCount: number };
  standard: { avg: number; min: number; max: number; soldoutCount: number; tightCount: number; availableCount: number };
  suite: { avg: number; min: number; max: number; soldoutCount: number; tightCount: number; availableCount: number };
}

export function calculateCompetitorStatsByRoomType(
  data: DailyCompetitorData
): CompetitorStatsByRoomType {
  const stats = {} as CompetitorStatsByRoomType;
  
  (['budget', 'standard', 'suite'] as const).forEach(roomType => {
    const roomData = data.byRoomType[roomType];
    const totalCount = roomData.competitors.length;
    
    stats[roomType] = {
      avg: roomData.avgPrice,
      min: roomData.minPrice,
      max: roomData.maxPrice,
      soldoutCount: roomData.soldoutCount,
      tightCount: roomData.tightCount,
      availableCount: totalCount - roomData.soldoutCount - roomData.tightCount,
    };
  });
  
  return stats;
}

// 兼容旧的统计函数
export function calculateCompetitorStats(competitors: Competitor[]) {
  if (!competitors || competitors.length === 0) {
    return { avg: 0, min: 0, max: 0, soldoutCount: 0, tightCount: 0, availableCount: 0 };
  }
  
  const prices = competitors.map(c => c.currentPrice).filter(p => p > 0);
  return {
    avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    soldoutCount: competitors.filter(c => c.status === 'soldout').length,
    tightCount: competitors.filter(c => c.status === 'tight').length,
    availableCount: competitors.filter(c => c.status === 'available' || c.status === 'normal').length,
  };
}
