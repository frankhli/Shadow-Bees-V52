/**
 * InventorySyncService - 库存同步服务
 * 
 * 功能：
 * 1. 酒店端库存变化 → 实时同步到管理端
 * 2. 管理端库存调整 → 实时同步到酒店端
 * 3. 房态占用/释放 → 双向同步
 * 
 * 使用方式：
 * - 酒店端：import { getHotelInventorySync } from '@/services/inventorySync'
 * - 管理端：import { getAdminInventorySync } from '@/services/inventorySync'
 */

import { getHotelSync, getAdminSync, type InventorySyncMessage } from './unifiedSync';
import type { Inventory, DailyInventory } from '@/types';

// 库存变化监听器
type InventoryChangeListener = (params: {
  hotelId: string;
  type: 'updated' | 'occupied' | 'released';
  data: Partial<Inventory> | { date: string; dailyInventory: DailyInventory };
  timestamp: number;
}) => void;

// 房态变化监听器
type RoomStatusListener = (params: {
  hotelId: string;
  roomTypeId: string;
  date: string;
  orderId: string;
  type: 'occupied' | 'released';
  timestamp: number;
}) => void;

class InventorySyncService {
  private syncService: ReturnType<typeof getHotelSync> | ReturnType<typeof getAdminSync>;
  private listeners: Set<InventoryChangeListener> = new Set();
  private roomListeners: Set<RoomStatusListener> = new Set();
  private unsubscribe: (() => void) | null = null;

  constructor(source: 'hotel' | 'admin') {
    this.syncService = source === 'hotel' ? getHotelSync() : getAdminSync();
    this.initListener();
  }

  /**
   * 初始化库存消息监听
   */
  private initListener() {
    this.unsubscribe = this.syncService.subscribe((message) => {
      if (!this.isInventoryMessage(message)) return;

      switch (message.type) {
        case 'INVENTORY_UPDATED':
          this.notifyListeners({
            hotelId: message.hotelId,
            type: 'updated',
            data: message.inventory,
            timestamp: message.timestamp,
          });
          break;

        case 'DAILY_INVENTORY_UPDATED':
          this.notifyListeners({
            hotelId: message.hotelId,
            type: 'updated',
            data: { date: message.date, dailyInventory: message.dailyInventory },
            timestamp: message.timestamp,
          });
          break;

        case 'ROOM_OCCUPIED':
          this.notifyRoomListeners({
            hotelId: message.hotelId,
            roomTypeId: message.roomTypeId,
            date: message.date,
            orderId: message.orderId,
            type: 'occupied',
            timestamp: message.timestamp,
          });
          break;

        case 'ROOM_RELEASED':
          this.notifyRoomListeners({
            hotelId: message.hotelId,
            roomTypeId: message.roomTypeId,
            date: message.date,
            orderId: message.orderId,
            type: 'released',
            timestamp: message.timestamp,
          });
          break;
      }
    });
  }

  /**
   * 类型守卫：检查是否为库存消息
   */
  private isInventoryMessage(message: any): message is InventorySyncMessage {
    return ['INVENTORY_UPDATED', 'DAILY_INVENTORY_UPDATED', 'ROOM_OCCUPIED', 'ROOM_RELEASED'].includes(message?.type);
  }

  /**
   * 通知库存监听器
   */
  private notifyListeners(params: Parameters<InventoryChangeListener>[0]) {
    this.listeners.forEach((listener) => {
      try {
        listener(params);
      } catch (error) {
        console.error('[InventorySync] Error in listener:', error);
      }
    });
  }

  /**
   * 通知房态监听器
   */
  private notifyRoomListeners(params: Parameters<RoomStatusListener>[0]) {
    this.roomListeners.forEach((listener) => {
      try {
        listener(params);
      } catch (error) {
        console.error('[InventorySync] Error in room listener:', error);
      }
    });
  }

  // ============================================
  // 公共 API：发送库存变化
  // ============================================

  /**
   * 广播库存更新（全量或增量）
   */
  broadcastInventoryUpdate(hotelId: string, inventory: Partial<Inventory>) {
    (this.syncService as any).broadcast({
      type: 'INVENTORY_UPDATED',
      hotelId,
      inventory,
      timestamp: Date.now(),
    });
  }

  /**
   * 广播某日库存更新
   */
  broadcastDailyInventoryUpdate(hotelId: string, date: string, dailyInventory: DailyInventory) {
    (this.syncService as any).broadcast({
      type: 'DAILY_INVENTORY_UPDATED',
      hotelId,
      date,
      dailyInventory,
      timestamp: Date.now(),
    });
  }

  /**
   * 广播房间被占用
   */
  broadcastRoomOccupied(hotelId: string, roomTypeId: string, date: string, orderId: string) {
    (this.syncService as any).broadcast({
      type: 'ROOM_OCCUPIED',
      hotelId,
      roomTypeId,
      date,
      orderId,
      timestamp: Date.now(),
    });
  }

  /**
   * 广播房间被释放
   */
  broadcastRoomReleased(hotelId: string, roomTypeId: string, date: string, orderId: string) {
    (this.syncService as any).broadcast({
      type: 'ROOM_RELEASED',
      hotelId,
      roomTypeId,
      date,
      orderId,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // 公共 API：订阅库存变化
  // ============================================

  /**
   * 订阅库存变化
   */
  subscribe(listener: InventoryChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 订阅特定酒店的库存变化
   */
  subscribeToHotel(hotelId: string, listener: InventoryChangeListener): () => void {
    const wrappedListener: InventoryChangeListener = (params) => {
      if (params.hotelId === hotelId) {
        listener(params);
      }
    };
    return this.subscribe(wrappedListener);
  }

  /**
   * 订阅房态变化（占用/释放）
   */
  subscribeToRoomStatus(listener: RoomStatusListener): () => void {
    this.roomListeners.add(listener);
    return () => {
      this.roomListeners.delete(listener);
    };
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.unsubscribe?.();
    this.listeners.clear();
    this.roomListeners.clear();
  }
}

// ============================================
// 单例实例
// ============================================

let hotelInventorySync: InventorySyncService | null = null;
let adminInventorySync: InventorySyncService | null = null;

export const getHotelInventorySync = (): InventorySyncService => {
  if (!hotelInventorySync) {
    hotelInventorySync = new InventorySyncService('hotel');
  }
  return hotelInventorySync;
};

export const getAdminInventorySync = (): InventorySyncService => {
  if (!adminInventorySync) {
    adminInventorySync = new InventorySyncService('admin');
  }
  return adminInventorySync;
};

// 清理函数（用于测试）
export const resetInventorySync = () => {
  hotelInventorySync?.destroy();
  adminInventorySync?.destroy();
  hotelInventorySync = null;
  adminInventorySync = null;
};

export default InventorySyncService;
