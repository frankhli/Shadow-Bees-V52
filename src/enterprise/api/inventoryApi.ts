/**
 * 库存相关API
 */

import type {
  ApiResponse,
  UpdateInventoryRequest,
  BatchUpdateInventoryRequest,
} from './types';
import { getRoomTypesForHotel, generateInventoryData, type InventoryData } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 内存中的库存缓存
const inventoryCache: Map<string, InventoryData> = new Map();

// 获取缓存key
function getCacheKey(hotelId: string, roomTypeId: string, date: string): string {
  return `${hotelId}-${roomTypeId}-${date}`;
}

/**
 * 获取酒店库存信息
 */
export async function getHotelInventory(
  hotelId: string,
  startDate?: string,
  days: number = 30
): Promise<ApiResponse<InventoryData[]>> {
  await delay();
  
  const start = startDate || new Date().toISOString().split('T')[0];
  const inventory = generateInventoryData(hotelId, start, days);
  
  // 更新缓存
  inventory.forEach(item => {
    const key = getCacheKey(hotelId, item.roomTypeId, item.date);
    inventoryCache.set(key, item);
  });
  
  return {
    success: true,
    data: inventory,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取指定日期范围的库存
 */
export async function getInventoryByDateRange(
  hotelId: string,
  roomTypeId: string,
  startDate: string,
  endDate: string
): Promise<ApiResponse<InventoryData[]>> {
  await delay();
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const inventory = generateInventoryData(hotelId, startDate, days);
  const filtered = inventory.filter(item => item.roomTypeId === roomTypeId);
  
  return {
    success: true,
    data: filtered,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新库存
 */
export async function updateInventory(
  request: UpdateInventoryRequest
): Promise<ApiResponse<InventoryData>> {
  await delay(500);
  
  const { hotelId, roomTypeId, date, availableRooms } = request;
  const key = getCacheKey(hotelId, roomTypeId, date);
  
  const existing = inventoryCache.get(key);
  if (!existing) {
    return {
      success: false,
      data: null as any,
      message: '库存记录不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 库存关联逻辑：available = total - sold - blocked
  const newAvailable = Math.max(0, Math.min(availableRooms, existing.total - existing.sold));
  const newBlocked = existing.total - existing.sold - newAvailable;
  
  const updated: InventoryData = {
    ...existing,
    available: newAvailable,
    blocked: newBlocked,
    status: newAvailable === 0 ? 'close' : newAvailable <= 5 ? 'limit' : 'open',
  };
  
  inventoryCache.set(key, updated);
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量更新库存
 */
export async function batchUpdateInventory(
  request: BatchUpdateInventoryRequest
): Promise<ApiResponse<{ jobId: string; status: string; results: any[] }>> {
  await delay(1500);
  
  const { hotelIds, adjustment } = request;
  const jobId = `inv-job-${Date.now()}`;
  const results: any[] = [];
  
  hotelIds.forEach(hotelId => {
    const roomTypes = getRoomTypesForHotel(hotelId);
    
    roomTypes.forEach(rt => {
      // 获取该房型未来30天的库存
      const inventory = generateInventoryData(hotelId, new Date().toISOString().split('T')[0], 30)
        .filter(item => item.roomTypeId === rt.id);
      
      inventory.forEach(item => {
        const key = getCacheKey(hotelId, rt.id, item.date);
        let newAvailable = item.available;
        
        switch (adjustment.type) {
          case 'set':
            newAvailable = adjustment.value;
            break;
          case 'add':
            newAvailable = Math.min(item.total, item.available + adjustment.value);
            break;
          case 'close':
            newAvailable = 0;
            break;
          case 'open':
            newAvailable = item.total - item.sold;
            break;
        }
        
        const updated: InventoryData = {
          ...item,
          available: newAvailable,
          blocked: item.total - item.sold - newAvailable,
          status: newAvailable === 0 ? 'close' : newAvailable <= 5 ? 'limit' : 'open',
        };
        
        inventoryCache.set(key, updated);
      });
    });
    
    results.push({ hotelId, success: true });
  });
  
  return {
    success: true,
    data: {
      jobId,
      status: 'completed',
      results,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 关房（将可用库存设为0）
 */
export async function closeRoom(
  hotelId: string,
  roomTypeId: string,
  date: string,
  reason?: string
): Promise<ApiResponse<InventoryData>> {
  return updateInventory({
    hotelId,
    roomTypeId,
    date,
    availableRooms: 0,
    reason,
  });
}

/**
 * 开房（恢复可用库存）
 */
export async function openRoom(
  hotelId: string,
  roomTypeId: string,
  date: string
): Promise<ApiResponse<InventoryData>> {
  const key = getCacheKey(hotelId, roomTypeId, date);
  const existing = inventoryCache.get(key);
  
  if (!existing) {
    return {
      success: false,
      data: null as any,
      message: '库存记录不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 开房：恢复所有未售房间
  const newAvailable = existing.total - existing.sold;
  
  return updateInventory({
    hotelId,
    roomTypeId,
    date,
    availableRooms: newAvailable,
  });
}

/**
 * 订单创建时减少库存（内部方法，订单API会调用）
 */
export function deductInventory(
  hotelId: string,
  roomTypeId: string,
  date: string,
  quantity: number = 1
): boolean {
  const key = getCacheKey(hotelId, roomTypeId, date);
  const existing = inventoryCache.get(key);
  
  if (!existing || existing.available < quantity) {
    return false;
  }
  
  const updated: InventoryData = {
    ...existing,
    available: existing.available - quantity,
    sold: existing.sold + quantity,
    status: existing.available - quantity <= 5 ? 'limit' : 'open',
  };
  
  inventoryCache.set(key, updated);
  return true;
}

/**
 * 订单取消时恢复库存（内部方法，订单API会调用）
 */
export function restoreInventory(
  hotelId: string,
  roomTypeId: string,
  date: string,
  quantity: number = 1
): boolean {
  const key = getCacheKey(hotelId, roomTypeId, date);
  const existing = inventoryCache.get(key);
  
  if (!existing) {
    return false;
  }
  
  const newAvailable = Math.min(existing.total, existing.available + quantity);
  const newSold = Math.max(0, existing.sold - quantity);
  
  const updated: InventoryData = {
    ...existing,
    available: newAvailable,
    sold: newSold,
    status: newAvailable === 0 ? 'close' : newAvailable <= 5 ? 'limit' : 'open',
  };
  
  inventoryCache.set(key, updated);
  return true;
}

/**
 * 获取实时库存状态
 */
export async function getInventoryStatus(
  hotelId: string
): Promise<ApiResponse<{ roomTypeId: string; roomTypeName: string; totalAvailable: number; status: string }[]>> {
  await delay();
  
  const roomTypes = getRoomTypesForHotel(hotelId);
  const today = new Date().toISOString().split('T')[0];
  
  const status = roomTypes.map(rt => {
    const key = getCacheKey(hotelId, rt.id, today);
    const inventory = inventoryCache.get(key);
    
    return {
      roomTypeId: rt.id,
      roomTypeName: rt.name,
      totalAvailable: inventory?.available || rt.roomCount,
      status: inventory?.status || 'open',
    };
  });
  
  return {
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  };
}
