/**
 * UnifiedSync - 统一通信层
 * 
 * 设计原则：
 * 1. 当前使用 BroadcastChannel（同浏览器多标签通信）
 * 2. 未来可无缝替换为 WebSocket（服务器部署）
 * 3. 业务代码无需感知底层实现
 * 
 * 消息协议：
 * - 所有消息包含 source: 'hotel' | 'admin' 标识来源
 * - 所有消息包含 timestamp 用于排序和去重
 * - 消息类型命名规范：DOMAIN_ACTION（如 INVENTORY_UPDATED）
 */

import type { Transaction, ContentItem, Inventory, DailyInventory } from '@/types';

// ============================================
// 消息类型定义
// ============================================

export type SyncSource = 'hotel' | 'admin';

// 库存相关消息
export type InventorySyncMessage =
  | { type: 'INVENTORY_UPDATED'; hotelId: string; inventory: Partial<Inventory>; timestamp: number; source: SyncSource }
  | { type: 'DAILY_INVENTORY_UPDATED'; hotelId: string; date: string; dailyInventory: DailyInventory; timestamp: number; source: SyncSource }
  | { type: 'ROOM_OCCUPIED'; hotelId: string; roomTypeId: string; date: string; orderId: string; timestamp: number; source: SyncSource }
  | { type: 'ROOM_RELEASED'; hotelId: string; roomTypeId: string; date: string; orderId: string; timestamp: number; source: SyncSource };

// 订单相关消息
export type OrderSyncMessage =
  | { type: 'ORDER_CREATED'; hotelId: string; order: Transaction; timestamp: number; source: SyncSource }
  | { type: 'ORDER_STATUS_CHANGED'; hotelId: string; orderId: string; status: string; oldStatus: string; timestamp: number; source: SyncSource }
  | { type: 'ORDER_CANCELLED'; hotelId: string; orderId: string; reason?: string; timestamp: number; source: SyncSource };

// 内容相关消息
export type ContentSyncMessage =
  | { type: 'CONTENT_SUBMITTED'; hotelId: string; content: ContentItem; timestamp: number; source: SyncSource }
  | { type: 'CONTENT_PUBLISHED'; hotelId: string; hotelName: string; content: ContentItem; timestamp: number; source: SyncSource }
  | { type: 'CONTENT_STATUS_CHANGED'; hotelId: string; contentId: string; status: string; timestamp: number; source: SyncSource }
  | { type: 'CONTENT_STATS_UPDATED'; hotelId: string; contentId: string; stats: { impressions: number; clicks: number; conversions: number }; timestamp: number; source: SyncSource };

// 经营数据消息（批量，减少通信频率）
export type StatsSyncMessage =
  | { type: 'DAILY_STATS_UPDATED'; hotelId: string; stats: { revenue: number; orders: number; occupancyRate: number; date: string }; timestamp: number; source: SyncSource }
  | { type: 'REALTIME_STATS'; hotelId: string; stats: { todayRevenue: number; todayOrders: number; currentOccupancy: number }; timestamp: number; source: SyncSource };

// 统一消息类型
export type UnifiedSyncMessage = 
  | InventorySyncMessage 
  | OrderSyncMessage 
  | ContentSyncMessage 
  | StatsSyncMessage;

// ============================================
// 类型守卫函数
// ============================================

export const isInventoryMessage = (msg: UnifiedSyncMessage): msg is InventorySyncMessage =>
  ['INVENTORY_UPDATED', 'DAILY_INVENTORY_UPDATED', 'ROOM_OCCUPIED', 'ROOM_RELEASED'].includes(msg.type);

export const isOrderMessage = (msg: UnifiedSyncMessage): msg is OrderSyncMessage =>
  ['ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED'].includes(msg.type);

export const isContentMessage = (msg: UnifiedSyncMessage): msg is ContentSyncMessage =>
  ['CONTENT_SUBMITTED', 'CONTENT_STATUS_CHANGED', 'CONTENT_STATS_UPDATED'].includes(msg.type);

export const isStatsMessage = (msg: UnifiedSyncMessage): msg is StatsSyncMessage =>
  ['DAILY_STATS_UPDATED', 'REALTIME_STATS'].includes(msg.type);

// ============================================
// 统一同步服务
// ============================================

type MessageListener = (message: UnifiedSyncMessage) => void;
type FilterFn = (message: UnifiedSyncMessage) => boolean;

const CHANNEL_NAME = 'shadow-bees-unified-sync';
const STORAGE_KEY = 'shadow-bees-unified-sync';

class UnifiedSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<{ listener: MessageListener; filter?: FilterFn }> = new Set();
  private source: SyncSource;
  private lastMessageTimestamp = 0;
  private messageHistory: Map<string, number> = new Map(); // 用于去重
  private isWebSocketMode = false; // 未来切换到 WebSocket 时改为 true

  constructor(source: SyncSource) {
    this.source = source;
    this.init();
  }

  /**
   * 初始化通信通道
   */
  private init() {
    if (typeof window === 'undefined') return;

    // 检测 BroadcastChannel 支持
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        console.log('[UnifiedSync] BroadcastChannel initialized');
      } catch (error) {
        console.warn('[UnifiedSync] BroadcastChannel failed, falling back to localStorage');
        this.initLocalStorageFallback();
      }
    } else {
      this.initLocalStorageFallback();
    }

    // 未来：如果切换到 WebSocket 模式
    if (this.isWebSocketMode) {
      this.initWebSocket();
    }
  }

  /**
   * localStorage 降级方案（兼容性更好）
   */
  private initLocalStorageFallback() {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as UnifiedSyncMessage;
          this.handleMessage(message);
        } catch (e) {
          console.error('[UnifiedSync] Failed to parse message:', e);
        }
      }
    });
    console.log('[UnifiedSync] localStorage fallback initialized');
  }

  /**
   * 未来：WebSocket 实现
   * 当前占位，实际部署时实现
   */
  private initWebSocket() {
    // TODO: WebSocket 连接逻辑
    // const ws = new WebSocket('wss://api.shadowbees.com/sync');
    // ws.onmessage = (event) => {
    //   const message = JSON.parse(event.data);
    //   this.handleMessage(message);
    // };
    console.log('[UnifiedSync] WebSocket mode (not implemented yet)');
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: UnifiedSyncMessage) {
    // 不处理自己发送的消息
    if (message.source === this.source) return;

    // 去重检查（基于消息类型+ID+时间戳）
    const dedupKey = `${message.type}-${message.hotelId}-${message.timestamp}`;
    if (this.messageHistory.has(dedupKey)) {
      return;
    }
    this.messageHistory.set(dedupKey, Date.now());

    // 清理过期历史（保留5分钟）
    const now = Date.now();
    for (const [key, ts] of this.messageHistory.entries()) {
      if (now - ts > 5 * 60 * 1000) {
        this.messageHistory.delete(key);
      }
    }

    // 更新最后消息时间
    this.lastMessageTimestamp = Math.max(this.lastMessageTimestamp, message.timestamp);

    // 通知监听器
    this.notifyListeners(message);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(message: UnifiedSyncMessage) {
    this.listeners.forEach(({ listener, filter }) => {
      try {
        if (!filter || filter(message)) {
          listener(message);
        }
      } catch (error) {
        console.error('[UnifiedSync] Error in listener:', error);
      }
    });
  }

  /**
   * 订阅消息
   * @param listener 消息监听器
   * @param filter 可选的消息过滤器
   * @returns 取消订阅函数
   */
  subscribe(listener: MessageListener, filter?: FilterFn): () => void {
    const entry = { listener, filter };
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  /**
   * 订阅特定酒店的消息
   */
  subscribeToHotel(hotelId: string, listener: MessageListener): () => void {
    return this.subscribe(listener, (msg) => msg.hotelId === hotelId);
  }

  /**
   * 订阅特定类型的消息
   */
  subscribeToType<T extends UnifiedSyncMessage['type']>(
    types: T[],
    listener: (message: UnifiedSyncMessage & { type: T }) => void
  ): () => void {
    return this.subscribe((msg) => {
      if (types.includes(msg.type as T)) {
        listener(msg as UnifiedSyncMessage & { type: T });
      }
    });
  }

  /**
   * 广播消息
   */
  broadcast(message: Omit<UnifiedSyncMessage, 'source' | 'timestamp'>): void {
    const fullMessage = {
      ...message,
      source: this.source,
      timestamp: Date.now(),
    } as UnifiedSyncMessage;

    // BroadcastChannel 发送
    if (this.channel) {
      this.channel.postMessage(fullMessage);
    }

    // localStorage 降级（用于兼容）
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullMessage));
      } catch (e) {
        // localStorage 可能不可用
      }
    }

    // 未来：WebSocket 发送
    if (this.isWebSocketMode) {
      // ws.send(JSON.stringify(fullMessage));
    }

    // 记录到历史（避免自己接收时重复处理）
    const dedupKey = `${fullMessage.type}-${fullMessage.hotelId}-${fullMessage.timestamp}`;
    this.messageHistory.set(dedupKey, Date.now());
  }

  /**
   * 获取最后消息时间戳
   */
  getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.messageHistory.clear();
  }
}

// ============================================
// 单例实例
// ============================================

let hotelSyncInstance: UnifiedSyncService | null = null;
let adminSyncInstance: UnifiedSyncService | null = null;

export const getHotelSync = (): UnifiedSyncService => {
  if (!hotelSyncInstance) {
    hotelSyncInstance = new UnifiedSyncService('hotel');
  }
  return hotelSyncInstance;
};

export const getAdminSync = (): UnifiedSyncService => {
  if (!adminSyncInstance) {
    adminSyncInstance = new UnifiedSyncService('admin');
  }
  return adminSyncInstance;
};

// 用于测试的清理函数
export const resetSyncInstances = () => {
  hotelSyncInstance?.destroy();
  adminSyncInstance?.destroy();
  hotelSyncInstance = null;
  adminSyncInstance = null;
};

export default UnifiedSyncService;
