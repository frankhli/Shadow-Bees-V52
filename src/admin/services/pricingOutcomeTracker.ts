/**
 * 定价结果追踪器（管理端）
 * 72小时后计算改价事件的成交结果和学习标签
 */

import { type PricingDecisionEvent, type PricingOutcome } from './pricingDataCollector';

// ============================================================
// 结果追踪配置
// ============================================================

const OUTCOME_CALCULATION_DELAY = 72 * 60 * 60 * 1000; // 72小时
const CHECK_INTERVAL = 60 * 60 * 1000; // 每小时检查一次

// ============================================================
// 模拟订单数据（实际项目中从后端 API 获取）
// ============================================================

interface OrderRecord {
  orderId: string;
  hotelId: string;
  roomTypeId: string;
  price: number;
  channel: string;
  createdAt: string; // 订单创建时间
  checkInDate: string;
  status: 'paid' | 'cancelled' | 'refunded';
}

// 模拟订单数据库
class OrderDatabase {
  private orders: Map<string, OrderRecord[]> = new Map();

  constructor() {
    this.loadMockOrders();
  }

  private loadMockOrders() {
    // 模拟一些历史订单数据
    const mockOrders: OrderRecord[] = [
      {
        orderId: 'ORD-001',
        hotelId: 'hotel-001',
        roomTypeId: 'room-001',
        price: 380,
        channel: 'xiaohongshu',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        checkInDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'paid',
      },
      {
        orderId: 'ORD-002',
        hotelId: 'hotel-001',
        roomTypeId: 'room-001',
        price: 420,
        channel: 'wechat',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        checkInDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'paid',
      },
    ];

    // 按酒店分组
    mockOrders.forEach(order => {
      const existing = this.orders.get(order.hotelId) || [];
      existing.push(order);
      this.orders.set(order.hotelId, existing);
    });
  }

  // 查询改价后 72 小时内的订单
  async queryOrdersAfterPriceChange(
    hotelId: string,
    priceChangeTime: string,
    roomTypeId: string
  ): Promise<OrderRecord[]> {
    const hotelOrders = this.orders.get(hotelId) || [];
    const changeTime = new Date(priceChangeTime).getTime();
    const endTime = changeTime + OUTCOME_CALCULATION_DELAY;

    return hotelOrders.filter(order => {
      const orderTime = new Date(order.createdAt).getTime();
      return (
        order.roomTypeId === roomTypeId &&
        orderTime >= changeTime &&
        orderTime <= endTime &&
        order.status === 'paid'
      );
    });
  }

  // 查询同期竞品成交情况（用于对比）
  async queryCompetitorOrders(
    _hotelId: string,
    _timeRange: [string, string]
  ): Promise<{ avgPrice: number; totalOrders: number }> {
    // 模拟竞品数据
    return {
      avgPrice: 350 + Math.random() * 100,
      totalOrders: Math.floor(Math.random() * 20) + 5,
    };
  }
}

// ============================================================
// 结果计算器
// ============================================================

export class PricingOutcomeTracker {
  private orderDB: OrderDatabase;
  private isRunning = false;
  private checkTimer: number | null = null;

  constructor() {
    this.orderDB = new OrderDatabase();
  }

  /**
   * 启动定时检查任务
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // 立即执行一次
    this.checkPendingOutcomes();

    // 每小时检查一次
    this.checkTimer = window.setInterval(() => {
      this.checkPendingOutcomes();
    }, CHECK_INTERVAL);

    console.log('[PricingOutcomeTracker] Started');
  }

  /**
   * 停止定时检查
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * 检查所有待计算结果的事件
   */
  private async checkPendingOutcomes(): Promise<void> {
    try {
      // 从 IndexedDB 获取所有需要计算结果的事件
      const pendingEvents = await this.getPendingEvents();
      
      console.log(`[PricingOutcomeTracker] Checking ${pendingEvents.length} pending events`);

      for (const event of pendingEvents) {
        const outcome = await this.calculateOutcome(event);
        await this.saveOutcome(event.id, outcome);
      }
    } catch (error) {
      console.error('[PricingOutcomeTracker] Error checking outcomes:', error);
    }
  }

  /**
   * 获取待计算结果的事件
   */
  private async getPendingEvents(): Promise<PricingDecisionEvent[]> {
    // 从 IndexedDB 查询
    const DB_NAME = 'ShadowBeesAdminDB';
    const STORE_NAME = 'pricing_events';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getAll = store.getAll();

        getAll.onsuccess = () => {
          const events = getAll.result.filter((e: PricingDecisionEvent) => {
            // 筛选已收集且超过72小时的事件
            const eventTime = new Date(e.timestamp).getTime();
            const isOver72h = Date.now() - eventTime > OUTCOME_CALCULATION_DELAY;
            return e.processingStatus === 'collected' && isOver72h;
          });
          resolve(events);
        };

        getAll.onerror = () => reject(getAll.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 计算单个事件的结果
   */
  private async calculateOutcome(event: PricingDecisionEvent): Promise<PricingOutcome> {
    const { hotelId, priceChange, timestamp } = event;

    // 1. 查询改价后72小时内的订单
    const orders = await this.orderDB.queryOrdersAfterPriceChange(
      hotelId,
      timestamp,
      priceChange.roomTypeId
    );

    // 2. 计算成交结果
    const sold = orders.length > 0;
    const firstOrder = orders[0];
    
    // 3. 计算时间到成交
    let timeToSold: number | undefined;
    if (firstOrder) {
      const changeTime = new Date(timestamp).getTime();
      const orderTime = new Date(firstOrder.createdAt).getTime();
      timeToSold = Math.round((orderTime - changeTime) / (1000 * 60 * 60)); // 小时
    }

    // 4. 按渠道统计结果
    const channelResults: Record<string, { sold: boolean; quantity: number; revenue: number; netRevenue: number }> = {};
    
    // 初始化所有渠道
    Object.keys(event.channelPricing).forEach(channel => {
      channelResults[channel] = { sold: false, quantity: 0, revenue: 0, netRevenue: 0 };
    });

    // 统计实际成交
    orders.forEach(order => {
      const channel = order.channel || 'unknown';
      if (!channelResults[channel]) {
        channelResults[channel] = { sold: false, quantity: 0, revenue: 0, netRevenue: 0 };
      }
      channelResults[channel].sold = true;
      channelResults[channel].quantity += 1;
      channelResults[channel].revenue += order.price;
      // 扣除渠道成本后的净收益
      const channelCost = event.channelPricing[channel]?.netRevenue || order.price * 0.85;
      channelResults[channel].netRevenue += channelCost;
    });

    // 5. 计算学习标签
    const learningLabels = this.calculateLearningLabels(
      event,
      orders,
      channelResults
    );

    return {
      eventId: event.id,
      collectedAt: timestamp,
      outcomeTimestamp: new Date().toISOString(),
      result72h: {
        sold,
        transactionPrice: firstOrder?.price,
        transactionTime: firstOrder?.createdAt,
        timeToSold,
      },
      channelResults,
      learningLabels,
    };
  }

  /**
   * 计算学习标签（算法优化的关键）
   */
  private calculateLearningLabels(
    event: PricingDecisionEvent,
    orders: OrderRecord[],
    channelResults: Record<string, any>
  ): PricingOutcome['learningLabels'] {
    const { priceChange, aiSuggestion } = event;
    const actualPrice = priceChange.newPrice;
    const suggestedPrice = aiSuggestion?.suggestedPrice;

    // 1. 评估价格是否最优
    // 如果没有成交，可能定价过高；如果很快成交，可能定价偏低
    let pricingWasOptimal = false;
    let optimalPriceDelta = 0;

    if (orders.length === 0) {
      // 未成交，可能定价过高
      pricingWasOptimal = false;
      optimalPriceDelta = -actualPrice * 0.1; // 建议降低10%
    } else {
      const avgTimeToSold = orders.reduce((sum, o) => {
        const changeTime = new Date(event.timestamp).getTime();
        const orderTime = new Date(o.createdAt).getTime();
        return sum + (orderTime - changeTime);
      }, 0) / orders.length;

      // 如果在6小时内成交，说明定价偏低
      if (avgTimeToSold < 6 * 60 * 60 * 1000) {
        pricingWasOptimal = false;
        optimalPriceDelta = actualPrice * 0.15; // 建议涨价15%
      } else if (avgTimeToSold > 48 * 60 * 60 * 1000) {
        // 超过48小时才成交，说明定价偏高
        pricingWasOptimal = false;
        optimalPriceDelta = -actualPrice * 0.08;
      } else {
        pricingWasOptimal = true;
        optimalPriceDelta = 0;
      }
    }

    // 2. 评估渠道选择
    // 找出实际成交渠道和最优渠道
    let maxNetRevenue = 0;
    let actualChannelNetRevenue = 0;

    Object.entries(channelResults).forEach(([_, result]) => {
      if (result.netRevenue > maxNetRevenue) {
        maxNetRevenue = result.netRevenue;
      }
      if (result.sold) {
        actualChannelNetRevenue += result.netRevenue;
      }
    });

    const channelSelectionOptimal = actualChannelNetRevenue >= maxNetRevenue * 0.9;
    const opportunityCost = maxNetRevenue - actualChannelNetRevenue;

    // 3. 评估 AI 建议质量
    let aiSuggestionQuality: PricingOutcome['learningLabels']['aiSuggestionQuality'] = 'fair';
    let shouldHaveAcceptedAi = false;

    if (suggestedPrice) {
      const priceDiff = Math.abs(suggestedPrice - actualPrice);
      const priceDiffPercent = priceDiff / actualPrice;

      if (orders.length > 0) {
        // 成交了，检查 AI 建议是否更好
        const actualRevenue = orders.reduce((sum, o) => sum + o.price, 0);
        // 假设按 AI 建议价也能成交
        const hypotheticalAiRevenue = suggestedPrice * orders.length;

        if (priceDiffPercent < 0.05) {
          aiSuggestionQuality = 'excellent';
          shouldHaveAcceptedAi = true;
        } else if (hypotheticalAiRevenue > actualRevenue) {
          aiSuggestionQuality = 'good';
          shouldHaveAcceptedAi = true;
        } else {
          aiSuggestionQuality = 'fair';
          shouldHaveAcceptedAi = false;
        }
      } else {
        // 未成交
        if (suggestedPrice < actualPrice) {
          // AI 建议更低价格，可能促进成交
          aiSuggestionQuality = 'poor'; // 实际定价未听 AI 建议导致未成交
          shouldHaveAcceptedAi = true;
        }
      }
    }

    return {
      pricingWasOptimal,
      optimalPriceDelta: Math.round(optimalPriceDelta),
      channelSelectionOptimal,
      opportunityCost: Math.round(opportunityCost),
      aiSuggestionQuality,
      shouldHaveAcceptedAi,
    };
  }

  /**
   * 保存计算结果到数据库
   */
  private async saveOutcome(eventId: string, outcome: PricingOutcome): Promise<void> {
    const DB_NAME = 'ShadowBeesAdminDB';
    const STORE_NAME = 'pricing_events';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getReq = store.get(eventId);
        getReq.onsuccess = () => {
          const event = getReq.result;
          if (event) {
            event.outcome = outcome;
            event.processingStatus = 'completed';
            store.put(event);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 手动触发结果计算（用于测试）
   */
  async forceCalculateOutcome(eventId: string): Promise<void> {
    const DB_NAME = 'ShadowBeesAdminDB';
    const STORE_NAME = 'pricing_events';

    const event = await new Promise<PricingDecisionEvent>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(eventId);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      };
    });

    if (event) {
      const outcome = await this.calculateOutcome(event);
      await this.saveOutcome(eventId, outcome);
      console.log(`[PricingOutcomeTracker] Force calculated outcome for ${eventId}`);
    }
  }
}

// 单例导出
export const pricingOutcomeTracker = new PricingOutcomeTracker();
