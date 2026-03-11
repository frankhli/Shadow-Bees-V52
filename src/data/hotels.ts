import type { Hotel, Competitor, Event } from '@/types';

// ============================================
// 三酒店定义 - 每种酒店3种价格差异明显的房型
// ============================================

export const hotels: Hotel[] = [
  {
    id: 'sanlitun',
    name: '三里屯潮流酒店',
    type: 'city',
    tier: 'comfort',
    theme: 'cyan',
    location: {
      city: '北京',
      address: '朝阳区三里屯路XX号',
      coordinates: { lat: 39.9362, lng: 116.4575 },
      distanceToEvent: 300,
      monitoringRadius: 8,  // 城市中心：覆盖8km商圈范围（三里屯-工体-朝阳门商圈）
    },
    roomTypes: [
      {
        id: 'budget-no-window',
        name: '经济特价房(无窗)',
        floorPrice: 150,
        ceilingPrice: 280,
        currentPrice: 215,
        totalInventory: 15,
        otaAllocation: 12,
        flexibleAllocation: 3,
      },
      {
        id: 'standard-room',
        name: '舒适标准房',
        floorPrice: 260,
        ceilingPrice: 420,
        currentPrice: 340,
        totalInventory: 35,
        otaAllocation: 28,
        flexibleAllocation: 7,
      },
      {
        id: 'luxury-suite',
        name: '行政豪华套房',
        floorPrice: 450,
        ceilingPrice: 680,
        currentPrice: 565,
        totalInventory: 8,
        otaAllocation: 6,
        flexibleAllocation: 2,
      },
    ],
    defaultMode: 'clearance',
    eventTypes: ['entertainment', 'transport'],
    flexibleInventoryRate: 0.15,
    priceRange: { normal: [350, 550], peak: [550, 750] },
    scriptStrategy: '促销紧迫话术',
  },
  {
    id: 'chongli',
    name: '崇礼星空酒店',
    type: 'suburb',
    tier: 'comfort',
    theme: 'violet',
    location: {
      city: '张家口',
      address: '崇礼区雪场路XX号',
      coordinates: { lat: 40.911, lng: 115.456 },
      distanceToEvent: 500,
      monitoringRadius: 50,  // 郊区：扩大至50km（竞品稀疏，需覆盖周边县城及景区）
    },
    roomTypes: [
      {
        id: 'dorm-bed',
        name: '雪场青旅床位',
        floorPrice: 80,
        ceilingPrice: 150,
        currentPrice: 115,
        totalInventory: 30,
        otaAllocation: 24,
        flexibleAllocation: 6,
      },
      {
        id: 'mountain-view',
        name: '雪山标准间',
        floorPrice: 240,
        ceilingPrice: 420,
        currentPrice: 330,
        totalInventory: 25,
        otaAllocation: 20,
        flexibleAllocation: 5,
      },
      {
        id: 'star-suite',
        name: '星空观景套房',
        floorPrice: 480,
        ceilingPrice: 780,
        currentPrice: 630,
        totalInventory: 6,
        otaAllocation: 4,
        flexibleAllocation: 2,
      },
    ],
    defaultMode: 'scalper',
    eventTypes: ['astronomical', 'weather'],
    flexibleInventoryRate: 0.15,
    priceRange: { normal: [400, 600], peak: [700, 900] },
    scriptStrategy: '紧迫稀缺话术',
  },
  {
    id: 'dali',
    name: '大理洱海酒店',
    type: 'tourist',
    tier: 'comfort',
    theme: 'amber',
    location: {
      city: '大理',
      address: '古城区洱海西路XX号',
      coordinates: { lat: 25.696, lng: 100.168 },
      distanceToEvent: 200,
      monitoringRadius: 30,  // 景区：扩大至30km（覆盖洱海环湖及古城周边住宿集群）
    },
    roomTypes: [
      {
        id: 'courtyard-budget',
        name: '庭院经济房(背街)',
        floorPrice: 160,
        ceilingPrice: 280,
        currentPrice: 220,
        totalInventory: 15,
        otaAllocation: 12,
        flexibleAllocation: 3,
      },
      {
        id: 'lake-view-standard',
        name: '湖景标准房',
        floorPrice: 280,
        ceilingPrice: 480,
        currentPrice: 380,
        totalInventory: 25,
        otaAllocation: 20,
        flexibleAllocation: 5,
      },
      {
        id: 'erhai-premium-suite',
        name: '洱海全景豪华套房',
        floorPrice: 520,
        ceilingPrice: 850,
        currentPrice: 685,
        totalInventory: 6,
        otaAllocation: 4,
        flexibleAllocation: 2,
      },
    ],
    defaultMode: 'dynamic',
    eventTypes: ['social', 'seasonal'],
    flexibleInventoryRate: 0.15,
    priceRange: { normal: [400, 650], peak: [750, 1050] },
    scriptStrategy: '价值对比话术',
  },
];

// ============================================
// 竞品数据 - 按档次分组（经济型/舒适型/高端型）
// 每个档次至少3家酒店，显示多平台价格
// ============================================

export interface CompetitorRoomType {
  id: string;
  name: string;
  price: number;
  inventory: number;
  status: 'soldout' | 'tight' | 'normal' | 'available';
}

export interface CompetitorWithTier extends Competitor {
  tier: 'economy' | 'comfort' | 'premium' | 'luxury';  // 经济/舒适/高端/奢华
  tierLabel: string;
  platformPrices: {
    xiecheng: number;  // 携程
    meituan: number;   // 美团
    gaode: number;     // 高德
    feizhu: number;    // 飞猪
  };
  roomTypes?: CompetitorRoomType[];  // 各房型详细价格（可选，用于房型映射）
}

// 按档次分组的竞品数据
export const competitorsByTier: Record<string, {
  economy: CompetitorWithTier[];   // 低一档：经济型
  comfort: CompetitorWithTier[];   // 同档次：舒适型（我们对标）
  premium: CompetitorWithTier[];   // 高一档：高端型
  luxury?: CompetitorWithTier[];   // 奢华型（仅参考）
}> = {
  sanlitun: {
    // 低一档：经济型（如家、7天、汉庭）
    economy: [
      {
        id: 'eco-1',
        name: '如家精选工体店',
        brand: '如家',
        logoUrl: '',
        distance: 1.8,
        rating: 4.2,
        currentPrice: 220,
        inventory: 20,
        status: 'available',
        platform: '携程',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 220, meituan: 215, gaode: 210, feizhu: 225 },
        roomTypes: [
          { id: 'eco1-1', name: '特价大床房(无窗)', price: 180, inventory: 8, status: 'available' },
          { id: 'eco1-2', name: '标准大床房', price: 220, inventory: 12, status: 'available' },
        ],
      },
      {
        id: 'eco-2',
        name: '7天酒店三里屯店',
        brand: '7天',
        logoUrl: '',
        distance: 1.2,
        rating: 4.0,
        currentPrice: 180,
        inventory: 25,
        status: 'available',
        platform: '美团',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 180, meituan: 175, gaode: 170, feizhu: 185 },
        roomTypes: [
          { id: 'eco2-1', name: '经济房(无窗)', price: 150, inventory: 10, status: 'available' },
          { id: 'eco2-2', name: '自主大床房', price: 180, inventory: 15, status: 'available' },
        ],
      },
      {
        id: 'eco-3',
        name: '汉庭酒店朝阳门店',
        brand: '汉庭',
        logoUrl: '',
        distance: 2.0,
        rating: 4.1,
        currentPrice: 200,
        inventory: 18,
        status: 'available',
        platform: '携程',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 200, meituan: 195, gaode: 190, feizhu: 205 },
        roomTypes: [
          { id: 'eco3-1', name: '特价房', price: 170, inventory: 6, status: 'available' },
          { id: 'eco3-2', name: '高级大床房', price: 200, inventory: 12, status: 'available' },
        ],
      },
    ],
    // 同档次：舒适型（亚朵、桔子、全季 - 我们对标）
    comfort: [
      {
        id: 'com-1',
        name: '亚朵酒店三里屯店',
        brand: '亚朵',
        logoUrl: '',
        distance: 0.8,
        rating: 4.7,
        currentPrice: 420,
        inventory: 5,
        status: 'tight',
        platform: '携程',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 420, meituan: 415, gaode: 410, feizhu: 425 },
        roomTypes: [
          { id: 'com1-1', name: '雅致大床房', price: 380, inventory: 3, status: 'tight' },
          { id: 'com1-2', name: '行政大床房', price: 420, inventory: 2, status: 'soldout' },
          { id: 'com1-3', name: '几木套房', price: 680, inventory: 1, status: 'available' },
        ],
      },
      {
        id: 'com-2',
        name: '桔子水晶三里屯店',
        brand: '桔子水晶',
        logoUrl: '',
        distance: 1.2,
        rating: 4.6,
        currentPrice: 380,
        inventory: 8,
        status: 'normal',
        platform: '美团',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 380, meituan: 375, gaode: 370, feizhu: 385 },
        roomTypes: [
          { id: 'com2-1', name: '商务大床房', price: 350, inventory: 5, status: 'normal' },
          { id: 'com2-2', name: '豪华大床房', price: 380, inventory: 3, status: 'tight' },
          { id: 'com2-3', name: '行政套房', price: 620, inventory: 2, status: 'available' },
        ],
      },
      {
        id: 'com-3',
        name: '全季酒店工体店',
        brand: '全季',
        logoUrl: '',
        distance: 1.5,
        rating: 4.5,
        currentPrice: 350,
        inventory: 15,
        status: 'available',
        platform: '携程',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 350, meituan: 345, gaode: 340, feizhu: 355 },
        roomTypes: [
          { id: 'com3-1', name: '零压大床房', price: 330, inventory: 8, status: 'available' },
          { id: 'com3-2', name: '高级大床房', price: 350, inventory: 7, status: 'available' },
          { id: 'com3-3', name: '商务套房', price: 550, inventory: 2, status: 'available' },
        ],
      },
      {
        id: 'com-4',
        name: '维也纳国际酒店',
        brand: '维也纳',
        logoUrl: '',
        distance: 1.3,
        rating: 4.4,
        currentPrice: 330,
        inventory: 12,
        status: 'normal',
        platform: '美团',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 330, meituan: 325, gaode: 320, feizhu: 335 },
        roomTypes: [
          { id: 'com4-1', name: '标准大床房', price: 300, inventory: 7, status: 'available' },
          { id: 'com4-2', name: '豪华大床房', price: 330, inventory: 5, status: 'normal' },
          { id: 'com4-3', name: '行政套房', price: 580, inventory: 2, status: 'available' },
        ],
      },
    ],
    // 高一档：高端型（希尔顿、万豪、洲际）
    premium: [
      {
        id: 'pre-1',
        name: '北京希尔顿酒店',
        brand: '希尔顿',
        logoUrl: '',
        distance: 2.5,
        rating: 4.8,
        currentPrice: 780,
        inventory: 3,
        status: 'tight',
        platform: '携程',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 780, meituan: 770, gaode: 760, feizhu: 790 },
        roomTypes: [
          { id: 'pre1-1', name: '高级客房', price: 680, inventory: 2, status: 'tight' },
          { id: 'pre1-2', name: '豪华客房', price: 780, inventory: 1, status: 'soldout' },
          { id: 'pre1-3', name: '行政套房', price: 1280, inventory: 1, status: 'available' },
        ],
      },
      {
        id: 'pre-2',
        name: '北京万豪酒店',
        brand: '万豪',
        logoUrl: '',
        distance: 3.0,
        rating: 4.8,
        currentPrice: 850,
        inventory: 4,
        status: 'tight',
        platform: '飞猪',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 850, meituan: 840, gaode: 830, feizhu: 860 },
        roomTypes: [
          { id: 'pre2-1', name: '豪华大床房', price: 780, inventory: 2, status: 'tight' },
          { id: 'pre2-2', name: '行政大床房', price: 850, inventory: 2, status: 'tight' },
          { id: 'pre2-3', name: '行政套房', price: 1380, inventory: 1, status: 'available' },
        ],
      },
      {
        id: 'pre-3',
        name: '北京洲际酒店',
        brand: '洲际',
        logoUrl: '',
        distance: 3.2,
        rating: 4.9,
        currentPrice: 920,
        inventory: 2,
        status: 'soldout',
        platform: '携程',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 920, meituan: 910, gaode: 900, feizhu: 930 },
        roomTypes: [
          { id: 'pre3-1', name: '洲际高级房', price: 820, inventory: 1, status: 'soldout' },
          { id: 'pre3-2', name: '洲际豪华房', price: 920, inventory: 1, status: 'soldout' },
          { id: 'pre3-3', name: '洲际套房', price: 1580, inventory: 1, status: 'available' },
        ],
      },
    ],
    // 奢华型（仅参考，不作为定价依据）
    luxury: [
      {
        id: 'lux-1',
        name: '北京四季酒店',
        brand: '四季',
        logoUrl: '',
        distance: 4.0,
        rating: 4.9,
        currentPrice: 1800,
        inventory: 1,
        status: 'available',
        platform: '携程',
        tier: 'luxury',
        tierLabel: '奢华型',
        platformPrices: { xiecheng: 1800, meituan: 1780, gaode: 1760, feizhu: 1820 },
      },
    ],
  },
  chongli: {
    economy: [
      {
        id: 'eco-1',
        name: '崇礼青年旅舍',
        brand: '青旅',
        logoUrl: '',
        distance: 1.5,
        rating: 4.0,
        currentPrice: 80,
        inventory: 30,
        status: 'available',
        platform: '美团',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 80, meituan: 75, gaode: 78, feizhu: 82 },
      },
      {
        id: 'eco-2',
        name: '雪场快捷酒店',
        brand: '本地',
        logoUrl: '',
        distance: 0.8,
        rating: 3.9,
        currentPrice: 120,
        inventory: 25,
        status: 'available',
        platform: '携程',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 120, meituan: 115, gaode: 118, feizhu: 125 },
      },
      {
        id: 'eco-3',
        name: '7天酒店崇礼店',
        brand: '7天',
        logoUrl: '',
        distance: 2.0,
        rating: 4.1,
        currentPrice: 150,
        inventory: 20,
        status: 'available',
        platform: '美团',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 150, meituan: 145, gaode: 148, feizhu: 155 },
      },
    ],
    comfort: [
      {
        id: 'com-1',
        name: '云顶大酒店',
        brand: '云顶',
        logoUrl: '',
        distance: 1.0,
        rating: 4.5,
        currentPrice: 380,
        inventory: 5,
        status: 'tight',
        platform: '官网',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 380, meituan: 375, gaode: 370, feizhu: 385 },
      },
      {
        id: 'com-2',
        name: '万龙滑雪场酒店',
        brand: '万龙',
        logoUrl: '',
        distance: 2.5,
        rating: 4.4,
        currentPrice: 320,
        inventory: 15,
        status: 'available',
        platform: '美团',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 320, meituan: 315, gaode: 310, feizhu: 325 },
      },
      {
        id: 'com-3',
        name: '太舞度假酒店',
        brand: '太舞',
        logoUrl: '',
        distance: 3.0,
        rating: 4.6,
        currentPrice: 420,
        inventory: 8,
        status: 'normal',
        platform: '携程',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 420, meituan: 415, gaode: 410, feizhu: 425 },
      },
      {
        id: 'com-4',
        name: '富龙假日酒店',
        brand: '假日',
        logoUrl: '',
        distance: 2.2,
        rating: 4.3,
        currentPrice: 350,
        inventory: 12,
        status: 'available',
        platform: '飞猪',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 350, meituan: 345, gaode: 340, feizhu: 355 },
      },
    ],
    premium: [
      {
        id: 'pre-1',
        name: '崇礼凯悦酒店',
        brand: '凯悦',
        logoUrl: '',
        distance: 3.5,
        rating: 4.8,
        currentPrice: 680,
        inventory: 3,
        status: 'tight',
        platform: '携程',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 680, meituan: 670, gaode: 660, feizhu: 690 },
      },
      {
        id: 'pre-2',
        name: '崇礼威斯汀酒店',
        brand: '威斯汀',
        logoUrl: '',
        distance: 4.0,
        rating: 4.7,
        currentPrice: 750,
        inventory: 4,
        status: 'normal',
        platform: '飞猪',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 750, meituan: 740, gaode: 730, feizhu: 760 },
      },
      {
        id: 'pre-3',
        name: '云顶丽苑套房酒店',
        brand: '丽苑',
        logoUrl: '',
        distance: 1.2,
        rating: 4.8,
        currentPrice: 820,
        inventory: 2,
        status: 'soldout',
        platform: '官网',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 820, meituan: 810, gaode: 800, feizhu: 830 },
      },
    ],
  },
  dali: {
    economy: [
      {
        id: 'eco-1',
        name: '大理古城青旅',
        brand: '青旅',
        logoUrl: '',
        distance: 0.3,
        rating: 4.1,
        currentPrice: 60,
        inventory: 40,
        status: 'available',
        platform: '美团',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 60, meituan: 55, gaode: 58, feizhu: 65 },
      },
      {
        id: 'eco-2',
        name: '如家酒店大理店',
        brand: '如家',
        logoUrl: '',
        distance: 1.5,
        rating: 4.2,
        currentPrice: 140,
        inventory: 22,
        status: 'available',
        platform: '携程',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 140, meituan: 135, gaode: 138, feizhu: 145 },
      },
      {
        id: 'eco-3',
        name: '7天优品大理古城店',
        brand: '7天',
        logoUrl: '',
        distance: 1.0,
        rating: 4.0,
        currentPrice: 120,
        inventory: 28,
        status: 'available',
        platform: '美团',
        tier: 'economy',
        tierLabel: '经济型',
        platformPrices: { xiecheng: 120, meituan: 115, gaode: 118, feizhu: 125 },
      },
    ],
    comfort: [
      {
        id: 'com-1',
        name: '大理古城亚朵',
        brand: '亚朵',
        logoUrl: '',
        distance: 0.5,
        rating: 4.6,
        currentPrice: 360,
        inventory: 8,
        status: 'available',
        platform: '携程',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 360, meituan: 355, gaode: 350, feizhu: 365 },
      },
      {
        id: 'com-2',
        name: '洱海一号度假酒店',
        brand: '本地',
        logoUrl: '',
        distance: 0.3,
        rating: 4.5,
        currentPrice: 320,
        inventory: 12,
        status: 'normal',
        platform: '飞猪',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 320, meituan: 315, gaode: 310, feizhu: 325 },
      },
      {
        id: 'com-3',
        name: '大理实力希尔顿花园',
        brand: '希尔顿花园',
        logoUrl: '',
        distance: 2.0,
        rating: 4.7,
        currentPrice: 420,
        inventory: 10,
        status: 'available',
        platform: '携程',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 420, meituan: 415, gaode: 410, feizhu: 425 },
      },
      {
        id: 'com-4',
        name: '大理悦云雅阁酒店',
        brand: '雅阁',
        logoUrl: '',
        distance: 1.2,
        rating: 4.4,
        currentPrice: 340,
        inventory: 15,
        status: 'available',
        platform: '美团',
        tier: 'comfort',
        tierLabel: '舒适型',
        platformPrices: { xiecheng: 340, meituan: 335, gaode: 330, feizhu: 345 },
      },
    ],
    premium: [
      {
        id: 'pre-1',
        name: '大理铂尔曼酒店',
        brand: '铂尔曼',
        logoUrl: '',
        distance: 2.5,
        rating: 4.8,
        currentPrice: 680,
        inventory: 4,
        status: 'tight',
        platform: '携程',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 680, meituan: 670, gaode: 660, feizhu: 690 },
      },
      {
        id: 'pre-2',
        name: '大理英迪格酒店',
        brand: '英迪格',
        logoUrl: '',
        distance: 1.8,
        rating: 4.7,
        currentPrice: 720,
        inventory: 3,
        status: 'normal',
        platform: '飞猪',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 720, meituan: 710, gaode: 700, feizhu: 730 },
      },
      {
        id: 'pre-3',
        name: '大理海景度假酒店',
        brand: '本地高端',
        logoUrl: '',
        distance: 0.4,
        rating: 4.8,
        currentPrice: 880,
        inventory: 2,
        status: 'soldout',
        platform: '携程',
        tier: 'premium',
        tierLabel: '高端型',
        platformPrices: { xiecheng: 880, meituan: 870, gaode: 860, feizhu: 890 },
      },
    ],
    luxury: [
      {
        id: 'lux-1',
        name: '大理松云悬崖酒店',
        brand: '松云',
        logoUrl: '',
        distance: 3.0,
        rating: 4.9,
        currentPrice: 2200,
        inventory: 1,
        status: 'available',
        platform: '携程',
        tier: 'luxury',
        tierLabel: '奢华型',
        platformPrices: { xiecheng: 2200, meituan: 2180, gaode: 2160, feizhu: 2220 },
      },
    ],
  },
};

// 兼容旧代码的导出
export const competitorsMap: Record<string, Competitor[]> = {
  sanlitun: competitorsByTier.sanlitun.comfort,
  chongli: competitorsByTier.chongli.comfort,
  dali: competitorsByTier.dali.comfort,
};

// ============================================
// 事件数据
// ============================================

export const eventsMap: Record<string, Event[]> = {
  sanlitun: [
    {
      id: 'e1',
      name: '周杰伦演唱会',
      type: 'entertainment',
      intensity: 'high',
      date: '2026-02-14',
      description: '工人体育场大型演唱会，预计观众5万人',
    },
    {
      id: 'e2',
      name: '北京南站高铁晚点',
      type: 'transport',
      intensity: 'medium',
      date: '2026-02-15',
      description: '受天气影响，多趟列车晚点',
    },
  ],
  chongli: [
    {
      id: 'e3',
      name: '双子座流星雨',
      type: 'astronomical',
      intensity: 'high',
      date: '2026-02-20',
      description: '年度最大流星雨，最佳观测时间22:00-04:00',
    },
    {
      id: 'e4',
      name: '崇礼滑雪季',
      type: 'weather',
      intensity: 'medium',
      date: '2026-02-01',
      description: '雪质最佳时期，滑雪场全开',
    },
  ],
  dali: [
    {
      id: 'e5',
      name: '三月街民族节',
      type: 'social',
      intensity: 'medium',
      date: '2026-04-15',
      description: '大理传统民族节日，游客激增',
    },
    {
      id: 'e6',
      name: '洱海樱花季',
      type: 'seasonal',
      intensity: 'low',
      date: '2026-03-20',
      description: '洱海周边樱花盛开，摄影旺季',
    },
  ],
};

// ============================================
// 生成竞品未来价格数据（30天预测）
// ============================================

function generateFuturePrices(basePrice: number, events: Event[]): Record<string, { price: number; inventory: number; status: 'soldout' | 'tight' | 'normal' | 'available' }> {
  const futurePrices: Record<string, { price: number; inventory: number; status: 'soldout' | 'tight' | 'normal' | 'available' }> = {};
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 基础价格波动（随机 ±10%）
    let priceMultiplier = 0.9 + Math.random() * 0.2;
    
    // 周末加成
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      priceMultiplier += 0.15;
    }
    
    // 事件影响
    const dayEvents = events.filter(e => e.date === dateStr);
    dayEvents.forEach(e => {
      if (e.intensity === 'high') priceMultiplier += 0.25;
      else if (e.intensity === 'medium') priceMultiplier += 0.15;
      else priceMultiplier += 0.05;
    });
    
    const price = Math.round(basePrice * priceMultiplier);
    
    // 库存状态（基于价格和事件）
    let status: 'soldout' | 'tight' | 'normal' | 'available' = 'available';
    let inventory = 20;
    
    if (priceMultiplier > 1.3) {
      status = Math.random() > 0.7 ? 'soldout' : 'tight';
      inventory = status === 'soldout' ? 0 : Math.floor(Math.random() * 5) + 1;
    } else if (priceMultiplier > 1.15) {
      status = Math.random() > 0.5 ? 'tight' : 'normal';
      inventory = status === 'tight' ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 10) + 10;
    } else {
      inventory = Math.floor(Math.random() * 15) + 15;
    }
    
    futurePrices[dateStr] = { price, inventory, status };
  }
  
  return futurePrices;
}

// 为所有竞品生成未来价格
function addFuturePricesToCompetitors() {
  Object.keys(competitorsMap).forEach(hotelId => {
    const hotelEvents = eventsMap[hotelId] || [];
    competitorsMap[hotelId] = competitorsMap[hotelId].map(competitor => ({
      ...competitor,
      futurePrices: generateFuturePrices(competitor.currentPrice, hotelEvents),
    }));
  });
}

// 执行生成
addFuturePricesToCompetitors();
