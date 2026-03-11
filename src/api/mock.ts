/**
 * Mock API 实现
 * 使用 localStorage 持久化，刷新数据不丢失
 * 与当前前端 Store 格式兼容
 * Version: 2.0 - 修复今日订单时间戳生成问题
 */

import type { Hotel, RoomType, Transaction, ContentItem, Alert } from '@/types';
import type { APIInterface, PricingData, DashboardStats, APIMode } from './index';
import { hotels as mockHotels } from '@/data/hotels';

// 生成唯一ID
const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 4)}`;

// 从 localStorage 读取或初始化
const getStorage = (key: string, defaultValue: any = null) => {
  try {
    const data = localStorage.getItem(`sb_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = (key: string, value: any) => {
  localStorage.setItem(`sb_${key}`, JSON.stringify(value));
};

// 初始化数据
// V2: 每次刷新都重新生成订单数据，确保今日订单时间戳正确
const initData = () => {
  // 始终重新生成订单，确保时间戳在合理范围内
  setStorage('hotels', mockHotels);
  setStorage('orders', generateMockOrders());
  setStorage('contents', generateMockContents());
  setStorage('initialized', true);
  setStorage('initTime', new Date().toISOString());
};

// 生成模拟订单
// V2: 修复时间戳生成，今日订单（前5条）时间戳在0点到当前时间之间
const generateMockOrders = (): Transaction[] => {
  const platforms = ['xianyu', 'xiaohongshu', 'wechat'] as const;
  const roomTypes = ['经济特价房(无窗)', '舒适标准房', '行政豪华套房'];
  const statuses = ['pending', 'paid', 'checked_in', 'checked_out', 'invoiced'] as const;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  return Array.from({ length: 15 }, (_, i) => {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const price = 200 + Math.floor(Math.random() * 400);
    
    // 生成时间戳：前5条是今日订单（0点到当前时间），其余是过去7天
    let timestamp: string;
    if (i < 5) {
      // 今日订单：时间戳在0点到当前时间之间
      const randomHour = Math.floor(Math.random() * (currentHour + 1));
      const randomMinute = randomHour === currentHour 
        ? Math.floor(Math.random() * (currentMinute + 1))
        : Math.floor(Math.random() * 60);
      const orderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), randomHour, randomMinute);
      timestamp = orderDate.toISOString();
    } else {
      // 过往订单：过去1-7天
      const daysAgo = 1 + Math.floor(Math.random() * 6);
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - daysAgo);
      orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      timestamp = orderDate.toISOString();
    }
    
    return {
      id: `ORD${String(i + 1).padStart(3, '0')}`,
      orderNo: `ORD${Date.now()}${i}`,
      hotelId: 'sanlitun',
      roomType: roomTypes[i % 3],
      platform,
      sourceContentId: `CNT${String((i % 5) + 1).padStart(3, '0')}`,
      guestName: `客户${i + 1}`,
      checkInDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + (1 + Math.random() * 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price,
      stayNights: 1 + Math.floor(Math.random() * 3),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp,
      financials: {
        gross: price,
        serviceFee: Math.round(price * 0.08),
        net: Math.round(price * 0.92),
      },
    } as Transaction;
  });
};

// 生成模拟内容
const generateMockContents = (): ContentItem[] => {
  const platforms = ['xianyu', 'xiaohongshu', 'wechat'] as const;
  const templates = [
    '【限时特惠】舒适房型，性价比之选',
    '🏨 商务出差首选，交通便利',
    '✨ 豪华套房，尊享体验',
    '【周末特惠】家庭出游优选',
    '🔥 限时抢购！特价房型',
  ];
  
  const contents: ContentItem[] = [];
  let idCounter = 1;
  
  platforms.forEach((platform) => {
    for (let i = 0; i < 4; i++) {
      const price = 250 + Math.floor(Math.random() * 200);
      contents.push({
        id: `CNT${String(idCounter++).padStart(3, '0')}`,
        platform,
        title: templates[i % templates.length],
        content: `${templates[i % templates.length]}，现价¥${price}，立即预订享受优惠！`,
        price,
        status: 'published',
        performance: {
          impressions: 1000 + Math.floor(Math.random() * 5000),
          clicks: 50 + Math.floor(Math.random() * 300),
          inquiries: 10 + Math.floor(Math.random() * 50),
          conversions: Math.floor(Math.random() * 5),
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });
  
  return contents;
};

// 初始化
initData();

// Mock API 实现
export const mockAPI: APIInterface = {
  setMode(): void {},
  getMode(): APIMode { return 'mock'; },
  
  // BFF 接口 - 模拟实现
  async getTodayOverview(_hotelId: string): Promise<any> {
    await delay(200);
    return {
      today: { revenue: 15000, orderCount: 12, avgPrice: 450 },
      inventory: { occupancyRate: 0.72 },
    };
  },
  
  async getRoomStatus(_hotelId: string, date?: string): Promise<any> {
    await delay(150);
    return { date: date || new Date().toISOString().split('T')[0], available: 15, occupied: 25 };
  },
  
  async getInventoryBoard(_hotelId: string, days: number = 14): Promise<any> {
    await delay(200);
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      available: Math.floor(Math.random() * 20),
    }));
  },
  
  async getPricingPanel(_hotelId: string, _roomTypeId: string): Promise<any> {
    await delay(200);
    return {
      basePrice: 400,
      competitorAvg: 380,
      suggestions: [],
    };
  },
  
  async createQuickOrder(data: any): Promise<any> {
    await delay(300);
    return { id: generateId('ORD'), ...data, status: 'pending' };
  },
  
  async getPendingOrders(_hotelId: string, _limit: number = 20): Promise<any> {
    await delay(200);
    return [];
  },
  
  // 集团端 BFF
  async getDailyBriefing(_groupId: string, date?: string): Promise<any> {
    await delay(200);
    return { date: date || new Date().toISOString().split('T')[0], summary: '' };
  },
  
  async getHotelPanorama(_groupId: string, _sortBy: string = 'revenue'): Promise<any> {
    await delay(200);
    return { hotels: [] };
  },
  
  async getHotelComparison(_groupId: string, _metric: string = 'revenue', _period: string = '7d'): Promise<any> {
    await delay(200);
    return { comparison: [] };
  },
  
  async getChannelAnalysis(_groupId: string, _period: string = '30d'): Promise<any> {
    await delay(200);
    return { channels: [] };
  },
  
  // 管理端 BFF
  async getAdminDashboard(): Promise<any> {
    await delay(200);
    return { stats: {} };
  },
  
  async getCustomers(_page: number = 1, _limit: number = 20): Promise<any> {
    await delay(200);
    return { customers: [], total: 0 };
  },
  
  async getAuditQueue(_status: string = 'pending'): Promise<any> {
    await delay(200);
    return { items: [] };
  },
  
  // AI 服务
  async generateContent(_data: any): Promise<any> {
    await delay(500);
    return {
      title: 'Generated Title',
      content: 'Generated content...',
      hashtags: [],
    };
  },
  
  async calculatePricing(_data: any): Promise<any> {
    await delay(300);
    return { suggestedPrice: 450, confidence: 0.8 };
  },

  async getHotels(): Promise<Hotel[]> {
    await delay(200);
    return getStorage('hotels', mockHotels);
  },

  async getHotel(id: string): Promise<Hotel | null> {
    await delay(100);
    const hotels = getStorage('hotels', mockHotels);
    return hotels.find((h: Hotel) => h.id === id) || null;
  },

  async getRoomTypes(hotelId: string): Promise<RoomType[]> {
    await delay(150);
    const hotels = getStorage('hotels', mockHotels);
    const hotel = hotels.find((h: Hotel) => h.id === hotelId);
    return hotel?.roomTypes || [];
  },

  async getOrders(params?: { hotelId?: string; status?: string; limit?: number }): Promise<Transaction[]> {
    await delay(300);
    let orders = getStorage('orders', []);
    
    if (params?.hotelId) {
      orders = orders.filter((o: Transaction) => o.hotelId === params.hotelId);
    }
    if (params?.status) {
      orders = orders.filter((o: Transaction) => o.status === params.status);
    }
    if (params?.limit) {
      orders = orders.slice(0, params.limit);
    }
    
    return orders.sort((a: Transaction, b: Transaction) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  async createOrder(data: Partial<Transaction>): Promise<Transaction> {
    await delay(500);
    const orders = getStorage('orders', []);
    const newOrder: Transaction = {
      ...data,
      id: generateId('ORD'),
      timestamp: new Date().toISOString(),
    } as Transaction;
    orders.push(newOrder);
    setStorage('orders', orders);
    return newOrder;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await delay(200);
    const orders = getStorage('orders', []);
    const order = orders.find((o: Transaction) => o.id === orderId);
    if (order) {
      order.status = status as any;
      setStorage('orders', orders);
    }
  },

  async getPricing(_hotelId: string, _roomTypeId: string): Promise<PricingData> {
    await delay(250);
    const stats = { avg: 380 };
    
    return {
      basePrice: Math.round(stats.avg * 0.95),
      competitorAvg: stats.avg,
      platformPrices: {
        xianyu: { price: Math.round(stats.avg * 1.03), coefficient: 1.08, riskDeposit: 0.15 },
        xiaohongshu: { price: Math.round(stats.avg * 0.95), coefficient: 1.0, riskDeposit: 0.20 },
        wechat: { price: Math.round(stats.avg * 0.90), coefficient: 0.95, riskDeposit: 0.08 },
      },
      mode: 'dynamic',
    };
  },

  async updatePrice(hotelId: string, roomTypeId: string, price: number, reason: string): Promise<void> {
    await delay(300);
    // 记录到 localStorage 的审计日志
    const logs = getStorage('price_logs', []);
    logs.push({
      id: generateId('LOG'),
      hotelId,
      roomTypeId,
      newPrice: price,
      reason,
      triggeredBy: 'user',
      timestamp: new Date().toISOString(),
    });
    setStorage('price_logs', logs);
  },

  async getContents(_hotelId: string): Promise<ContentItem[]> {
    await delay(200);
    return getStorage('contents', generateMockContents());
  },

  async publishContent(contentId: string): Promise<void> {
    await delay(400);
    const contents = getStorage('contents', []);
    const content = contents.find((c: ContentItem) => c.id === contentId);
    if (content) {
      content.status = 'published';
      content.publishedAt = new Date().toISOString();
      setStorage('contents', contents);
    }
  },

  async getDashboardStats(hotelId: string, _range: string): Promise<DashboardStats> {
    await delay(300);
    const orders = await this.getOrders({ hotelId });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.financials?.gross || 0), 0);
    const confirmedOrders = orders.filter(o => ['paid', 'checked_in', 'checked_out'].includes(o.status));
    const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.financials?.gross || 0), 0);
    
    return {
      totalRevenue,
      confirmedRevenue,
      totalOrders: orders.length,
      confirmedOrders: confirmedOrders.length,
      avgPrice: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      occupancyRate: 65,
    };
  },

  async getAlerts(_hotelId: string): Promise<Alert[]> {
    await delay(150);
    return [
      {
        id: 'alert-1',
        level: 'info',
        type: 'status',
        message: '销售状态良好 👍 OTA已售45%，非标渠道还有空间',
        timestamp: new Date().toISOString(),
        requiresAction: false,
      },
    ];
  },
};

// 模拟网络延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


