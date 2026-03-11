/**
 * 定价数据收集器（管理端）
 * 负责接收酒店端改价事件，并收集完整上下文数据
 */



// ============================================================
// 数据类型定义（定价分析完整模型）
// ============================================================

export interface PricingDecisionEvent {
  id: string;
  hotelId: string;
  timestamp: string;
  
  // 基础改价信息
  priceChange: {
    roomTypeId: string;
    channel?: string;
    oldPrice: number;
    newPrice: number;
    trigger: 'manual' | 'auto' | 'approval' | 'bulk';
    userId?: string;
    userRole?: string;
  };

  // 时间维度
  temporalContext: {
    dayOfWeek: number;
    hourOfDay: number;
    daysToCheckIn: number;
    isHoliday: boolean;
    holidayName?: string;
    season: 'peak' | 'shoulder' | 'low';
  };

  // 酒店当前状态（收集时快照）
  hotelSnapshot: {
    roomTypeName: string;
    floorPrice: number;
    ceilingPrice: number;
    totalInventory: number;
    currentInventory: number;
    inventoryStatus: 'abundant' | 'normal' | 'tight' | 'soldout';
  };

  // 渠道定价（各渠道当前价格）
  channelPricing: Record<string, {
    basePrice: number;
    floorPrice: number;
    coefficient: number;
    netRevenue: number;
    inventory: {
      allocated: number;
      sold: number;
      available: number;
    };
  }>;

  // 竞品情报（收集时）
  competitorSnapshot: {
    directCompetitors: Array<{
      name: string;
      distance: number;
      price: number;
      inventory: number;
      status: string;
    }>;
    marketAvgPrice: number;
    marketMinPrice: number;
    marketMaxPrice: number;
  };

  // 事件影响
  eventContext: {
    activeEvents: Array<{
      name: string;
      type: string;
      intensity: 'low' | 'medium' | 'high';
      impactFactor: number;
    }>;
    weather?: {
      condition: string;
      impactMultiplier: number;
    };
  };

  // 内容表现（如适用）
  contentPerformance?: {
    totalImpressions: number;
    totalClicks: number;
    conversionRate: number;
    heatTrend: 'rising' | 'stable' | 'falling';
  };

  // AI建议（如有）
  aiSuggestion?: {
    suggestedPrice: number;
    confidence: number;
    reasoning: string;
  };

  // 处理状态
  processingStatus: 'pending' | 'collected' | 'outstanding' | 'completed';
  outcome?: PricingOutcome;
}

export interface PricingOutcome {
  eventId: string;
  collectedAt: string;
  outcomeTimestamp: string;
  
  // 72小时成交结果
  result72h: {
    sold: boolean;
    transactionPrice?: number;
    transactionTime?: string;
    timeToSold?: number; // 小时
  };

  // 各渠道表现
  channelResults: Record<string, {
    sold: boolean;
    quantity: number;
    revenue: number;
    netRevenue: number;
  }>;

  // 学习标签
  learningLabels: {
    pricingWasOptimal: boolean;
    optimalPriceDelta: number;
    channelSelectionOptimal: boolean;
    opportunityCost: number;
    aiSuggestionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    shouldHaveAcceptedAi: boolean;
  };
}

// ============================================================
// BroadcastChannel 通信协议
// ============================================================

const PRICING_SYNC_CHANNEL = 'pricing_analytics_sync';


interface PriceChangeNotification {
  type: 'PRICE_CHANGE' | 'BATCH_PRICE_CHANGE';
  eventId: string;
  hotelId: string;
  timestamp: string;
  data: {
    roomTypeId: string;
    oldPrice: number;
    newPrice: number;
    trigger: string;
    userId?: string;
    userRole?: string;
  };
}

// ============================================================
// IndexedDB 存储
// ============================================================

const DB_NAME = 'ShadowBeesAdminDB';
const DB_VERSION = 1;
const STORE_NAME = 'pricing_events';

class PricingDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('hotelId', 'hotelId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('processingStatus', 'processingStatus', { unique: false });
        }
      };
    });
  }

  async addEvent(event: PricingDecisionEvent): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateEvent(event: PricingDecisionEvent): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOutcomes(hotelId: string): Promise<PricingDecisionEvent[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('processingStatus');
      const request = index.getAll('collected');
      
      request.onsuccess = () => {
        const events = request.result.filter((e: PricingDecisionEvent) => 
          e.hotelId === hotelId && 
          new Date(e.timestamp).getTime() < Date.now() - 72 * 60 * 60 * 1000
        );
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getEventsByHotel(hotelId: string, limit: number = 100): Promise<PricingDecisionEvent[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('hotelId');
      const request = index.openCursor(hotelId, 'prev');
      
      const events: PricingDecisionEvent[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================
// 主收集器类
// ============================================================

export class PricingDataCollector {
  private channel: BroadcastChannel | null = null;
  private unifiedChannel: BroadcastChannel | null = null; // 新增：监听unifiedSync
  private db: PricingDatabase;
  private isCollecting = false;

  // 已连接的酒店页面引用


  constructor() {
    this.db = new PricingDatabase();
    if (typeof BroadcastChannel !== 'undefined') {
      // 原有通道（保留兼容性）
      this.channel = new BroadcastChannel(PRICING_SYNC_CHANNEL);
      this.setupListeners();
      
      // 新增：监听unifiedSync通道（酒店端实际使用的）
      this.unifiedChannel = new BroadcastChannel('shadow-bees-unified-sync');
      this.setupUnifiedListeners();
    }
  }

  async init(): Promise<void> {
    await this.db.init();
    console.log('[PricingDataCollector] Initialized');
  }

  private setupListeners(): void {
    if (!this.channel) return;

    // 监听酒店端改价事件（原有通道）
    this.channel.onmessage = async (event) => {
      const message = event.data as PriceChangeNotification;
      
      if (message.type === 'PRICE_CHANGE' || message.type === 'BATCH_PRICE_CHANGE') {
        await this.handlePriceChange(message);
      }
    };
  }
  
  /**
   * 新增：监听unifiedSync通道的改价事件
   * 酒店端实际使用这个通道发送PRICE_CHANGED事件
   */
  private setupUnifiedListeners(): void {
    if (!this.unifiedChannel) return;
    
    this.unifiedChannel.onmessage = async (event) => {
      const message = event.data;
      
      // 监听酒店端发送的PRICE_CHANGED事件
      if (message.type === 'PRICE_CHANGED') {
        console.log('[PricingDataCollector] Received PRICE_CHANGED from unifiedSync:', message);
        
        // 转换为内部格式处理
        const notification: PriceChangeNotification = {
          type: 'PRICE_CHANGE',
          eventId: `pricing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          hotelId: message.hotelId,
          timestamp: new Date(message.timestamp).toISOString(),
          data: {
            roomTypeId: message.roomTypeId,
            oldPrice: message.oldPrice,
            newPrice: message.newPrice,
            trigger: message.reason?.includes('AI') ? 'auto' : 'manual',
            userId: message.userId,
            userRole: message.userRole,
          },
        };
        
        await this.handlePriceChange(notification);
      }
    };
    
    console.log('[PricingDataCollector] UnifiedSync listener setup complete');
  }

  /**
   * 处理改价通知
   * 1. 收集完整上下文数据
   * 2. 存储到数据库
   */
  private async handlePriceChange(notification: PriceChangeNotification): Promise<void> {
    if (this.isCollecting) return;
    this.isCollecting = true;

    try {
      console.log('[PricingDataCollector] Received price change:', notification);

      // 构建完整事件数据
      const fullEvent = await this.collectFullData(notification);
      
      // 存储
      await this.db.addEvent(fullEvent);
      
      console.log('[PricingDataCollector] Event collected and stored:', fullEvent.id);
    } catch (error) {
      console.error('[PricingDataCollector] Failed to collect data:', error);
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * 收集完整上下文数据
   * 通过读取酒店端保存的 localStorage 快照
   */
  private async collectFullData(
    notification: PriceChangeNotification
  ): Promise<PricingDecisionEvent> {
    const now = new Date();
    const timestamp = notification.timestamp;
    
    // 从酒店端的 localStorage 读取快照（同源策略允许访问）
    const snapshot = this.readHotelSnapshot(notification.eventId, notification.hotelId);
    
    // 从快照提取数据
    const roomType = snapshot?.roomType || {};
    const pricing = snapshot?.pricing || {};
    const inventory = snapshot?.inventory || {};
    const competitors = snapshot?.competitors || [];
    const events = snapshot?.events || [];
    const contents = snapshot?.contents || [];
    
    // 计算库存状态
    const roomTypeInventory = inventory.byRoomType?.[notification.data.roomTypeId];
    const currentInventory = roomTypeInventory?.available || 0;
    const totalInventory = roomTypeInventory?.total || 0;
    const inventoryStatus = this.calculateInventoryStatus(currentInventory, totalInventory);
    
    // 计算竞品统计
    const competitorStats = this.calculateCompetitorStats(competitors);
    
    return {
      id: notification.eventId,
      hotelId: notification.hotelId,
      timestamp,
      
      priceChange: {
        roomTypeId: notification.data.roomTypeId,
        oldPrice: notification.data.oldPrice,
        newPrice: notification.data.newPrice,
        trigger: notification.data.trigger as any,
        userId: notification.data.userId,
        userRole: notification.data.userRole,
      },

      temporalContext: {
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
        daysToCheckIn: 0, // 未来可从订单系统计算
        isHoliday: this.checkIsHoliday(now),
        season: this.getSeason(now),
      },

      hotelSnapshot: {
        roomTypeName: roomType.name || '',
        floorPrice: roomType.floorPrice || 0,
        ceilingPrice: roomType.ceilingPrice || 0,
        totalInventory,
        currentInventory,
        inventoryStatus,
      },

      channelPricing: this.extractChannelPricing(pricing),

      competitorSnapshot: {
        directCompetitors: competitors.slice(0, 5).map((c: any) => ({
          name: c.name,
          distance: c.distance,
          price: c.currentPrice,
          inventory: c.inventory,
          status: c.status,
        })),
        marketAvgPrice: competitorStats.avg,
        marketMinPrice: competitorStats.min,
        marketMaxPrice: competitorStats.max,
      },

      eventContext: {
        activeEvents: events.map((e: any) => ({
          name: e.name,
          type: e.type,
          intensity: e.intensity,
          impactFactor: this.calculateEventImpact(e),
        })),
      },

      contentPerformance: this.calculateContentPerformance(contents),

      processingStatus: 'collected',
    };
  }

  /**
   * 从 localStorage 读取酒店端保存的快照
   */
  private readHotelSnapshot(eventId: string, _hotelId: string): any | null {
    try {
      // 尝试读取事件特定的快照
      const snapshotKey = `sb_pricing_snapshot_${eventId}`;
      const snapshotData = localStorage.getItem(snapshotKey);
      if (snapshotData) {
        return JSON.parse(snapshotData);
      }
      
      // 回退到读取统一 store 数据
      const storeData = localStorage.getItem('sb_unified_store');
      if (storeData) {
        return JSON.parse(storeData);
      }
      
      return null;
    } catch (error) {
      console.warn('[PricingDataCollector] Failed to read hotel snapshot:', error);
      return null;
    }
  }

  private calculateInventoryStatus(available: number, total: number): 'abundant' | 'normal' | 'tight' | 'soldout' {
    if (available === 0) return 'soldout';
    if (available < total * 0.1) return 'tight';
    if (available < total * 0.3) return 'normal';
    return 'abundant';
  }

  private calculateCompetitorStats(competitors: any[]): { avg: number; min: number; max: number } {
    if (!competitors || competitors.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }
    const prices = competitors.map(c => c.currentPrice).filter(p => p > 0);
    if (prices.length === 0) return { avg: 0, min: 0, max: 0 };
    
    return {
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  private checkIsHoliday(date: Date): boolean {
    // TODO: 连接节假日 API 或本地配置
    const day = date.getDay();
    return day === 0 || day === 6; // 周末视为节假日
  }

  private getSeason(date: Date): 'peak' | 'shoulder' | 'low' {
    const month = date.getMonth() + 1;
    if (month >= 7 && month <= 8) return 'peak'; // 暑假
    if (month >= 1 && month <= 2) return 'peak'; // 春节
    if (month >= 10 && month <= 11) return 'peak'; // 国庆后
    if (month >= 4 && month <= 6) return 'shoulder'; // 春夏
    return 'low';
  }

  private calculateEventImpact(event: { intensity?: 'low' | 'medium' | 'high' }): number {
    const intensityMap: Record<string, number> = { low: 1.05, medium: 1.15, high: 1.3 };
    return intensityMap[event.intensity || ''] || 1.0;
  }

  private extractChannelPricing(pricing: any): Record<string, any> {
    if (!pricing?.platformPrices) return {};
    
    const result: Record<string, any> = {};
    Object.entries(pricing.platformPrices).forEach(([platform, data]: [string, any]) => {
      result[platform] = {
        basePrice: data.price,
        floorPrice: pricing.floorPrice,
        coefficient: data.coefficient,
        netRevenue: Math.round(data.price * (1 - data.riskDeposit)),
        inventory: { allocated: 0, sold: 0, available: 0 }, // 从 inventory 补充
      };
    });
    return result;
  }

  private calculateContentPerformance(contents: any[]): any {
    if (!contents || contents.length === 0) return undefined;
    
    const totalImpressions = contents.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = contents.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const conversionRate = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    
    return {
      totalImpressions,
      totalClicks,
      conversionRate,
      heatTrend: 'stable', // TODO: 计算趋势
    };
  }

  /**
   * 计算72小时后的成交结果
   * 定时任务调用（每日凌晨执行）
   */
  async calculateOutcomes(hotelId: string): Promise<void> {
    const pendingEvents = await this.db.getPendingOutcomes(hotelId);
    
    for (const event of pendingEvents) {
      // TODO: 查询实际成交数据，计算结果
      const outcome = await this.calculateSingleOutcome(event);
      
      event.outcome = outcome;
      event.processingStatus = 'completed';
      
      await this.db.updateEvent(event);
    }
    
    console.log(`[PricingDataCollector] Calculated ${pendingEvents.length} outcomes`);
  }

  private async calculateSingleOutcome(event: PricingDecisionEvent): Promise<PricingOutcome> {
    // TODO: 实际查询订单系统获取成交结果
    
    return {
      eventId: event.id,
      collectedAt: event.timestamp,
      outcomeTimestamp: new Date().toISOString(),
      
      result72h: {
        sold: false, // TODO: 查询实际成交
      },
      
      channelResults: {},
      
      learningLabels: {
        pricingWasOptimal: false,
        optimalPriceDelta: 0,
        channelSelectionOptimal: false,
        opportunityCost: 0,
        aiSuggestionQuality: 'fair',
        shouldHaveAcceptedAi: false,
      },
    };
  }

  /**
   * 获取酒店定价历史
   */
  async getHotelPricingHistory(hotelId: string): Promise<PricingDecisionEvent[]> {
    return this.db.getEventsByHotel(hotelId);
  }
  
  /**
   * 获取所有定价事件（用于知识沉淀页面）
   */
  async getAllEvents(limit: number = 1000): Promise<PricingDecisionEvent[]> {
    await this.db.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db['db']!.transaction(['pricing_events'], 'readonly');
      const store = transaction.objectStore('pricing_events');
      const request = store.openCursor(null, 'prev'); // 倒序
      
      const events: PricingDecisionEvent[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// 单例导出
export const pricingDataCollector = new PricingDataCollector();
