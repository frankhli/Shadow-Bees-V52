/**
 * TicketSyncService - 工单实时同步服务
 * 
 * 实现方案：
 * 1. BroadcastChannel API（主方案）- 现代浏览器支持
 * 2. localStorage 事件（降级方案）- 兼容性更好
 * 
 * 后期迁移：
 * 只需替换本文件的通信实现，业务代码无需修改
 */

import type { Ticket, TicketMessage } from '@/types';

// 同步消息类型
export type SyncMessage =
  // 工单相关
  | { type: 'TICKET_CREATED'; ticket: Ticket; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'TICKET_UPDATED'; ticketId: string; updates: Partial<Ticket>; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'TICKET_MESSAGE'; ticketId: string; message: TicketMessage; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'TICKET_RESOLVED'; ticketId: string; data: {
      rating?: number;
      responseSpeed?: 'fast' | 'normal' | 'slow';
      resolutionEffect?: 'full' | 'partial' | 'none';
      ratingTags?: string[];
      feedback?: string;
    }; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'TICKET_URGENT'; ticketId: string; urgentCount: number; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'TICKET_ASSIGNED'; ticketId: string; assignedTo: string; assignedToName: string; timestamp: number; source: 'admin' }
  | { type: 'TICKET_READ'; ticketId: string; readAt: string; timestamp: number; source: 'admin' }
  // 全量同步
  | { type: 'SYNC_REQUEST'; timestamp: number; source: 'hotel' | 'admin' }
  | { type: 'SYNC_RESPONSE'; tickets: Ticket[]; timestamp: number; source: 'hotel' | 'admin' };

// 消息监听器类型
type MessageListener = (message: SyncMessage) => void;

// 浏览器兼容性检测
const isBroadcastChannelSupported = () => typeof BroadcastChannel !== 'undefined';

class TicketSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MessageListener> = new Set();
  private channelName = 'shadowbees_ticket_sync';
  private storageKey = 'shadowbees_ticket_sync';
  private lastMessageTimestamp = 0;
  private currentSource: 'hotel' | 'admin' | 'group';

  constructor(source: 'hotel' | 'admin' | 'group') {
    this.currentSource = source;
    this.init();
  }

  /**
   * 初始化通信通道
   */
  private init() {
    if (isBroadcastChannelSupported()) {
      // 使用 BroadcastChannel（推荐）
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        console.log('[TicketSync] BroadcastChannel initialized');
      } catch (error) {
        console.warn('[TicketSync] BroadcastChannel failed, falling back to localStorage');
        this.initLocalStorageFallback();
      }
    } else {
      // 降级到 localStorage
      this.initLocalStorageFallback();
    }
  }

  /**
   * localStorage 降级方案
   */
  private initLocalStorageFallback() {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as SyncMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('[TicketSync] Failed to parse localStorage message:', error);
        }
      }
    });
    console.log('[TicketSync] localStorage fallback initialized');
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: SyncMessage) {
    // 忽略自己发送的消息（通过时间戳去重）
    if (message.timestamp <= this.lastMessageTimestamp) {
      return;
    }
    
    // 忽略同源消息（自己发出的）
    if (message.source === this.currentSource) {
      return;
    }

    this.lastMessageTimestamp = message.timestamp;
    
    console.log(`[TicketSync] Received ${message.type} from ${message.source}`, message);
    
    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('[TicketSync] Listener error:', error);
      }
    });
  }

  /**
   * 发送消息
   */
  public broadcast(message: { type: string; timestamp?: number; [key: string]: any }) {
    const fullMessage = {
      ...message,
      source: this.currentSource,
    };

    // 更新时间戳
    this.lastMessageTimestamp = message.timestamp || Date.now();

    if (this.channel) {
      // BroadcastChannel 方式
      this.channel.postMessage(fullMessage);
    } else {
      // localStorage 方式
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(fullMessage));
        // 立即清空，避免重复触发
        setTimeout(() => {
          localStorage.removeItem(this.storageKey);
        }, 100);
      } catch (error) {
        console.error('[TicketSync] Failed to send via localStorage:', error);
      }
    }

    console.log(`[TicketSync] Broadcast ${fullMessage.type} as ${this.currentSource}`);
  }

  /**
   * 订阅消息
   * @returns 取消订阅函数
   */
  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 请求全量同步
   */
  public requestSync() {
    this.broadcast({
      type: 'SYNC_REQUEST',
      timestamp: Date.now(),
    });
  }

  /**
   * 响应全量同步
   */
  public respondSync(tickets: Ticket[]) {
    this.broadcast({
      type: 'SYNC_RESPONSE',
      tickets,
      timestamp: Date.now(),
    });
  }

  /**
   * 销毁服务
   */
  public destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

// 单例实例
let hotelSyncInstance: TicketSyncService | null = null;
let adminSyncInstance: TicketSyncService | null = null;
let groupSyncInstance: TicketSyncService | null = null;

/**
 * 获取酒店端同步服务实例
 */
export function getHotelTicketSync(): TicketSyncService {
  if (!hotelSyncInstance) {
    hotelSyncInstance = new TicketSyncService('hotel');
  }
  return hotelSyncInstance;
}

/**
 * 获取管理端同步服务实例
 */
export function getAdminTicketSync(): TicketSyncService {
  if (!adminSyncInstance) {
    adminSyncInstance = new TicketSyncService('admin');
  }
  return adminSyncInstance;
}

/**
 * 获取集团端同步服务实例
 */
export function getGroupTicketSync(): TicketSyncService {
  if (!groupSyncInstance) {
    groupSyncInstance = new TicketSyncService('group');
  }
  return groupSyncInstance;
}

/**
 * 销毁同步服务（用于测试和清理）
 */
export function destroyTicketSync() {
  if (hotelSyncInstance) {
    hotelSyncInstance.destroy();
    hotelSyncInstance = null;
  }
  if (adminSyncInstance) {
    adminSyncInstance.destroy();
    adminSyncInstance = null;
  }
  if (groupSyncInstance) {
    groupSyncInstance.destroy();
    groupSyncInstance = null;
  }
}

export { TicketSyncService };
export default TicketSyncService;
