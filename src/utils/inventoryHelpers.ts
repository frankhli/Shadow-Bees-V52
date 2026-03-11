/**
 * Shadow-Bees V52 - 库存日历辅助函数
 * 从库存日历获取准确的占用数据（支持跨天订单）
 */

import type { DailyInventory, Platform } from '@/types';

export interface TodayOccupancy {
  // 总计
  totalRooms: number;
  totalAvailable: number;
  totalOccupied: number;
  occupancyRate: number;
  
  // 按房型
  byRoomType: Record<string, {
    total: number;
    available: number;
    occupied: number;
    checkedIn: number;  // 在住
    arriving: number;   // 今日预抵
  }>;
  
  // 按平台（基于日历中各平台的占用，需要配合交易记录）
  byPlatform: Record<Platform, {
    sold: number;
  }>;
}

/**
 * 从库存日历获取今日实际占用数据
 * 
 * 注意：由于日历只记录占用数量，不记录平台来源，
 * 平台分布数据仍需要从交易记录推算
 */
export function getTodayOccupancyFromCalendar(
  calendar: Record<string, DailyInventory> | null
): TodayOccupancy {
  const today = new Date().toISOString().split('T')[0];
  const todayInv = calendar?.[today];
  
  if (!todayInv) {
    return {
      totalRooms: 0,
      totalAvailable: 0,
      totalOccupied: 0,
      occupancyRate: 0,
      byRoomType: {},
      byPlatform: { xianyu: { sold: 0 }, xiaohongshu: { sold: 0 }, wechat: { sold: 0 } },
    };
  }
  
  // 按房型统计
  const byRoomType: TodayOccupancy['byRoomType'] = {};
  Object.entries(todayInv.byRoomType).forEach(([roomTypeId, roomInv]) => {
    const occupied = roomInv.occupied.checkedIn + roomInv.occupied.arriving;
    byRoomType[roomTypeId] = {
      total: roomInv.total,
      available: roomInv.available,
      occupied,
      checkedIn: roomInv.occupied.checkedIn,
      arriving: roomInv.occupied.arriving,
    };
  });
  
  return {
    totalRooms: todayInv.summary.totalRooms,
    totalAvailable: todayInv.summary.totalAvailable,
    totalOccupied: todayInv.summary.totalRooms - todayInv.summary.totalAvailable,
    occupancyRate: todayInv.summary.occupancyRate,
    byRoomType,
    // 平台数据需要从交易记录统计，这里返回空
    byPlatform: { xianyu: { sold: 0 }, xiaohongshu: { sold: 0 }, wechat: { sold: 0 } },
  };
}

/**
 * 计算今日平台销量（基于交易记录 + 日历校验）
 * 
 * 逻辑：
 * 1. 从交易记录统计各平台今日入住的订单数
 * 2. 但订单数不等于间夜数，一个订单可能占多天
 * 3. 这里统计的是"今日新入住"的订单数，不是总间夜数
 */
export function calculateTodayPlatformSales(
  transactions: any[],
  _calendar: Record<string, DailyInventory> | null
): Record<Platform, { sold: number; revenue: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  const result: Record<Platform, { sold: number; revenue: number }> = {
    xianyu: { sold: 0, revenue: 0 },
    xiaohongshu: { sold: 0, revenue: 0 },
    wechat: { sold: 0, revenue: 0 },
  };
  
  transactions.forEach(t => {
    // 只统计今日入住的订单
    if (t.checkInDate === today && ['checked_in', 'checked_out', 'invoiced'].includes(t.status)) {
      const platform = t.platform as Platform;
      if (result[platform]) {
        result[platform].sold += 1;
        result[platform].revenue += t.price || 0;
      }
    }
  });
  
  return result;
}

/**
 * 计算今日房型销量（基于库存日历）
 * 
 * 返回的是今日实际被占用的房间数（checkedIn + arriving）
 */
export function calculateTodayRoomTypeSales(
  calendar: Record<string, DailyInventory> | null,
  roomTypes: { id: string; name: string }[]
): Record<string, { occupied: number; checkedIn: number; arriving: number }> {
  const today = new Date().toISOString().split('T')[0];
  const todayInv = calendar?.[today];
  
  const result: Record<string, { occupied: number; checkedIn: number; arriving: number }> = {};
  
  // 按房型名称建立映射
  const roomNameToId: Record<string, string> = {};
  roomTypes.forEach(r => {
    roomNameToId[r.name] = r.id;
  });
  
  if (!todayInv) {
    return result;
  }
  
  Object.entries(todayInv.byRoomType).forEach(([roomTypeId, roomInv]) => {
    result[roomTypeId] = {
      occupied: roomInv.occupied.checkedIn + roomInv.occupied.arriving,
      checkedIn: roomInv.occupied.checkedIn,
      arriving: roomInv.occupied.arriving,
    };
  });
  
  return result;
}

/**
 * 计算日期范围内的总间夜数
 * 
 * 用于统计一段时间内的总销售间夜（不是订单数）
 */
export function calculateTotalRoomNights(
  calendar: Record<string, DailyInventory> | null,
  startDate: string,
  endDate: string
): number {
  if (!calendar) return 0;
  
  let total = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayInv = calendar[dateStr];
    if (dayInv) {
      // 该日总占用 = 总房数 - 可售
      total += dayInv.summary.totalRooms - dayInv.summary.totalAvailable;
    }
  }
  
  return total;
}

/**
 * 获取指定日期的库存状态
 */
export function getInventoryStatusForDate(
  calendar: Record<string, DailyInventory> | null,
  date: string
): DailyInventory['summary'] | null {
  return calendar?.[date]?.summary || null;
}

/**
 * 检查指定日期是否有足够库存
 */
export function hasEnoughInventory(
  calendar: Record<string, DailyInventory> | null,
  roomTypeId: string,
  checkInDate: string,
  checkOutDate: string,
  quantity: number = 1
): boolean {
  if (!calendar) return false;
  
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayInv = calendar[dateStr];
    if (!dayInv) return false;
    
    const roomInv = dayInv.byRoomType[roomTypeId];
    if (!roomInv || roomInv.available < quantity) {
      return false;
    }
  }
  
  return true;
}
