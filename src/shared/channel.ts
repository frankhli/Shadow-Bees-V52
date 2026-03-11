/**
 * Shadow-Bees V52 - 跨端通信通道 (BroadcastChannel)
 * 用于管理端 ↔ 集团端 ↔ 酒店端的数据同步和联动
 * 为未来 WebSocket 实时通信做准备
 */

// ============================================
// 消息类型定义
// ============================================

export type ChannelMessageType = 
  // 集团联动
  | 'GROUP_SELECT'        // 管理端选择集团
  | 'GROUP_SYNC'          // 集团数据同步
  | 'GROUP_FOCUS'         // 聚焦到指定集团
  
  // 酒店联动
  | 'HOTEL_SELECT'        // 选择酒店
  | 'HOTEL_FOCUS'         // 聚焦到指定酒店
  
  // 数据变更
  | 'DATA_UPDATE'         // 数据更新通知
  | 'CONFIG_CHANGE'       // 配置变更
  
  // 策略联动
  | 'STRATEGY_APPLY'      // 策略应用
  | 'STRATEGY_UPDATE'     // 策略更新
  
  // 工单联动
  | 'TICKET_CREATE'       // 创建工单
  | 'TICKET_UPDATE'       // 工单更新
  
  // 实时数据 (为 WebSocket 做准备)
  | 'REALTIME_METRICS'    // 实时指标
  | 'REALTIME_ALERT'      // 实时告警
  | 'PING'                // 心跳
  | 'PONG';               // 心跳响应

export type ChannelSource = 'admin' | 'group' | 'hotel' | 'system';

export interface ChannelMessage<T = unknown> {
  id: string;                    // 消息唯一ID
  type: ChannelMessageType;      // 消息类型
  source: ChannelSource;         // 消息来源
  target?: ChannelSource;        // 目标端 (可选，不指定则广播)
  timestamp: number;             // 发送时间戳
  payload: T;                    // 消息数据
  meta?: {
    groupId?: string;           // 关联集团ID
    hotelId?: string;           // 关联酒店ID
    userId?: string;            // 操作用户ID
    correlationId?: string;     // 关联消息ID (用于请求-响应模式)
  };
}

// ============================================
// 具体消息载荷类型
// ============================================

/** 集团选择消息 */
export interface GroupSelectPayload {
  groupId: string;
  groupName: string;
  action: 'view' | 'edit' | 'focus';
  sourcePage?: string;          // 来源页面 (如 '/customers', '/dashboard')
  context?: {
    customerId?: string;        // 关联的客户ID (admin端)
    regionCount?: number;
    hotelCount?: number;
  };
}

/** 酒店选择消息 */
export interface HotelSelectPayload {
  hotelId: string;
  hotelName: string;
  groupId: string;
  action: 'view' | 'compare' | 'focus';
}

/** 数据更新消息 */
export interface DataUpdatePayload {
  entity: 'customer' | 'hotel' | 'group' | 'strategy' | 'ticket' | 'anomaly';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, { old: unknown; new: unknown }>;
  summary?: string;
}

/** 策略应用消息 */
export interface StrategyApplyPayload {
  strategyId: string;
  strategyName: string;
  groupId: string;
  hotelIds?: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  progress?: number;
}

/** 实时指标消息 (为 WebSocket 做准备) */
export interface RealtimeMetricsPayload {
  groupId?: string;
  hotelId?: string;
  metrics: {
    gmv?: number;
    occupancy?: number;
    revpar?: number;
    orders?: number;
    timestamp: number;
  };
}

// ============================================
// BroadcastChannel 管理器
// ============================================

const CHANNEL_NAME = 'shadow-bees-v52';

class ChannelManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<ChannelMessageType, Set<(msg: ChannelMessage) => void>> = new Map();
  private isConnected = false;
  private messageQueue: ChannelMessage[] = [];
  private reconnectTimer: number | null = null;

  // 统计信息
  private stats = {
    sent: 0,
    received: 0,
    errors: 0,
    lastPing: 0,
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
        this.channel.onmessageerror = (error) => {
          console.error('[Channel] Message error:', error);
          this.stats.errors++;
        };
        this.isConnected = true;
        
        // 处理队列中的消息
        this.flushQueue();
        
        console.log('[Channel] BroadcastChannel initialized');
      } else {
        console.warn('[Channel] BroadcastChannel not supported, using localStorage fallback');
        this.initLocalStorageFallback();
      }
    } catch (error) {
      console.error('[Channel] Initialization failed:', error);
      this.initLocalStorageFallback();
    }
  }

  /** localStorage 降级方案 */
  private initLocalStorageFallback() {
    window.addEventListener('storage', (e) => {
      if (e.key === CHANNEL_NAME && e.newValue) {
        try {
          const message = JSON.parse(e.newValue) as ChannelMessage;
          this.handleMessage(message);
        } catch {
          // 解析失败忽略
        }
      }
    });
    this.isConnected = true;
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.sendMessage(msg);
    }
  }

  private handleMessage(message: ChannelMessage) {
    console.log('[Channel] Received message:', message.type, 'from', message.source);
    
    // 忽略自己发送的消息
    if (message.source === this.getCurrentSource()) {
      console.log('[Channel] Ignoring own message');
      return;
    }

    this.stats.received++;

    // 触发对应类型的监听器
    const typeListeners = this.listeners.get(message.type);
    if (typeListeners) {
      typeListeners.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error('[Channel] Listener error:', error);
        }
      });
    }

    // 触发通配符监听器
    const wildcardListeners = this.listeners.get('*' as ChannelMessageType);
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error('[Channel] Wildcard listener error:', error);
        }
      });
    }
  }

  private getCurrentSource(): ChannelSource {
    // 根据当前 URL 判断来源
    const path = window.location.pathname;
    if (path.startsWith('/admin') || path.includes('admin')) return 'admin';
    if (path.startsWith('/group') || path.includes('group')) return 'group';
    return 'hotel';
  }

  private sendMessage(message: ChannelMessage) {
    if (!this.isConnected) {
      this.messageQueue.push(message);
      return;
    }

    try {
      if (this.channel) {
        this.channel.postMessage(message);
      } else {
        // localStorage fallback
        localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));
        setTimeout(() => localStorage.removeItem(CHANNEL_NAME), 100);
      }
      this.stats.sent++;
    } catch (error) {
      console.error('[Channel] Send failed:', error);
      this.stats.errors++;
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  /**
   * 发送消息
   */
  send<T>(type: ChannelMessageType, payload: T, meta?: ChannelMessage<T>['meta']) {
    const message: ChannelMessage<T> = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source: this.getCurrentSource(),
      timestamp: Date.now(),
      payload,
      meta,
    };

    this.sendMessage(message);
    return message.id;
  }

  /**
   * 订阅消息
   */
  on<T>(type: ChannelMessageType | '*', callback: (msg: ChannelMessage<T>) => void) {
    const key = type as ChannelMessageType;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as (msg: ChannelMessage) => void);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(key)?.delete(callback as (msg: ChannelMessage) => void);
    };
  }

  /**
   * 订阅一次性消息
   */
  once<T>(type: ChannelMessageType, callback: (msg: ChannelMessage<T>) => void) {
    const unsubscribe = this.on<T>(type, (msg) => {
      unsubscribe();
      callback(msg);
    });
    return unsubscribe;
  }

  /**
   * 发送心跳
   */
  ping() {
    this.send('PING', { timestamp: Date.now() });
    this.stats.lastPing = Date.now();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 销毁通道
   */
  destroy() {
    this.listeners.clear();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.isConnected = false;
  }
}

// ============================================
// 单例导出
// ============================================

export const channelManager = new ChannelManager();

// ============================================
// 便捷 Hook (用于 React)
// ============================================

import { useEffect, useCallback, useState } from 'react';

export function useChannelMessage<T>(
  type: ChannelMessageType | '*',
  callback: (payload: T, meta: ChannelMessage<T>['meta']) => void
) {
  useEffect(() => {
    return channelManager.on<T>(type, (msg) => {
      callback(msg.payload, msg.meta);
    });
  }, [type, callback]);
}

export function useChannelGroupSync() {
  const [focusedGroup, setFocusedGroup] = useState<GroupSelectPayload | null>(null);

  useEffect(() => {
    return channelManager.on<GroupSelectPayload>('GROUP_SELECT', (msg) => {
      setFocusedGroup(msg.payload);
    });
  }, []);

  const selectGroup = useCallback((payload: GroupSelectPayload) => {
    channelManager.send('GROUP_SELECT', payload);
  }, []);

  const focusGroup = useCallback((groupId: string, groupName: string) => {
    channelManager.send('GROUP_FOCUS', { groupId, groupName, action: 'focus' });
  }, []);

  return { focusedGroup, selectGroup, focusGroup };
}

export function useChannelHotelSync() {
  const [focusedHotel, setFocusedHotel] = useState<HotelSelectPayload | null>(null);

  useEffect(() => {
    return channelManager.on<HotelSelectPayload>('HOTEL_SELECT', (msg) => {
      setFocusedHotel(msg.payload);
    });
  }, []);

  const selectHotel = useCallback((payload: HotelSelectPayload) => {
    channelManager.send('HOTEL_SELECT', payload);
  }, []);

  return { focusedHotel, selectHotel };
}

// ============================================
// 工具函数
// ============================================

/** 生成消息ID */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 等待响应 */
export function waitForResponse<T>(
  requestId: string,
  timeout = 5000
): Promise<ChannelMessage<T>> {
  return new Promise((resolve, reject) => {
    const unsubscribe = channelManager.on<T>('*', (msg) => {
      if (msg.meta?.correlationId === requestId) {
        unsubscribe();
        resolve(msg);
      }
    });

    setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for response to ${requestId}`));
    }, timeout);
  });
}
