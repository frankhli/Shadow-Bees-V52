import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfig: CacheModuleOptions = {
  store: async () => {
    // 如果配置了 Redis，使用 Redis；否则使用内存缓存
    if (process.env.REDIS_URL) {
      return redisStore({
        url: process.env.REDIS_URL,
        ttl: 60 * 1000, // 默认 60 秒
      });
    }
    // 开发环境使用内存缓存
    return undefined;
  },
  ttl: 60 * 1000, // 默认缓存 60 秒
  max: 100, // 内存缓存最大条目数
};

// 缓存键生成器 - 按酒店隔离
export const createHotelCacheKey = (hotelId: string, key: string): string => {
  return `hotel:${hotelId}:${key}`;
};

// 缓存时间配置（秒）
export const CACHE_TTL = {
  HOTEL_OVERVIEW: 30,      // 今日概览 30 秒
  ROOM_STATUS: 10,         // 房态 10 秒（实时性高）
  INVENTORY_BOARD: 60,     // 库存看板 60 秒
  PRICING_PANEL: 30,       // 定价面板 30 秒
  PENDING_ORDERS: 10,      // 待处理订单 10 秒
  HOTEL_LIST: 300,         // 酒店列表 5 分钟
  USER_INFO: 600,          // 用户信息 10 分钟
} as const;
