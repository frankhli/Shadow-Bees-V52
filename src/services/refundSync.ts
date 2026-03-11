/**
 * 退款同步服务
 * 
 * 业务流程：
 * 1. 用户在闲鱼/微信/小红书申请退款
 * 2. 酒店端直接处理（同意/拒绝/完成）
 * 3. 处理结果同步到管理端（单向，仅用于监控）
 * 
 * 管理端不干预退款审批，只做记录和统计
 */

import type { Refund } from '@/admin/stores/adminStore';

export type RefundSyncMessage =
  // 酒店端 → 管理端：退款申请录入
  | { type: 'REFUND_REQUESTED'; refund: Refund; timestamp: number; source: 'hotel' | 'admin' }
  // 酒店端 → 管理端：退款状态更新（同意/拒绝/完成）
  | { type: 'REFUND_STATUS_UPDATED'; refund: Refund; timestamp: number; source: 'hotel' | 'admin' }
  // 管理端审批退款
  | { type: 'REFUND_APPROVED'; refundId: string; orderId: string; timestamp: number; source: 'admin' }
  // 管理端拒绝退款
  | { type: 'REFUND_REJECTED'; refundId: string; orderId: string; reason: string; timestamp: number; source: 'admin' };

type SyncListener = (message: RefundSyncMessage) => void;

const CHANNEL_NAME = 'shadow-bees-refund-sync';

class RefundSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
  private source: 'hotel' | 'admin';

  constructor(source: 'hotel' | 'admin') {
    this.source = source;
    this.initChannel();
  }

  private initChannel() {
    if (typeof window === 'undefined') return;

    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        const message = event.data as RefundSyncMessage;
        // 只处理来自另一端的消息
        if (message.source !== this.source) {
          this.notifyListeners(message);
        }
      };
    } catch (error) {
      console.warn('BroadcastChannel not supported, falling back to localStorage');
      this.initLocalStorageFallback();
    }
  }

  private initLocalStorageFallback() {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      if (event.key === CHANNEL_NAME) {
        try {
          const message = JSON.parse(event.newValue || '{}') as RefundSyncMessage;
          if (message.source !== this.source) {
            this.notifyListeners(message);
          }
        } catch (e) {
          console.error('Failed to parse sync message:', e);
        }
      }
    });
  }

  private notifyListeners(message: RefundSyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  broadcast(message: Omit<RefundSyncMessage, 'source' | 'timestamp'>): void {
    const fullMessage = { 
      ...message, 
      source: this.source,
      timestamp: Date.now(),
    } as unknown as RefundSyncMessage;

    // BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(fullMessage);
      } catch (error) {
        console.error('BroadcastChannel error:', error);
      }
    }

    // localStorage fallback
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CHANNEL_NAME, JSON.stringify(fullMessage));
      } catch (error) {
        console.error('localStorage sync error:', error);
      }
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

// 单例实例
let hotelRefundSyncInstance: RefundSyncService | null = null;
let adminRefundSyncInstance: RefundSyncService | null = null;

export function getHotelRefundSync(): RefundSyncService {
  if (!hotelRefundSyncInstance) {
    hotelRefundSyncInstance = new RefundSyncService('hotel');
  }
  return hotelRefundSyncInstance;
}

export function getAdminRefundSync(): RefundSyncService {
  if (!adminRefundSyncInstance) {
    adminRefundSyncInstance = new RefundSyncService('admin');
  }
  return adminRefundSyncInstance;
}

// 用于测试重置
export function resetRefundSync(): void {
  hotelRefundSyncInstance?.destroy();
  adminRefundSyncInstance?.destroy();
  hotelRefundSyncInstance = null;
  adminRefundSyncInstance = null;
}
