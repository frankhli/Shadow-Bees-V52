/**
 * Shadow-Bees 企业版数据缓存配置
 * 用于提升大数据量场景下的性能（1000+酒店）
 */

/**
 * 缓存键名前缀
 */
export const CACHE_KEY_PREFIX = 'sb_enterprise_';

/**
 * 缓存过期时间配置（毫秒）
 */
export const CACHE_EXPIRY = {
  // 酒店列表 - 5分钟
  HOTELS: 5 * 60 * 1000,
  
  // 酒店详情 - 10分钟
  HOTEL_DETAIL: 10 * 60 * 1000,
  
  // 订单数据 - 30秒
  ORDERS: 30 * 1000,
  
  // 库存数据 - 1分钟
  INVENTORY: 60 * 1000,
  
  // 价格数据 - 2分钟
  PRICING: 2 * 60 * 1000,
  
  // 数据看板 - 1分钟
  DASHBOARD: 60 * 1000,
  
  // 用户权限 - 15分钟
  PERMISSIONS: 15 * 60 * 1000,
  
  // 内容数据 - 5分钟
  CONTENT: 5 * 60 * 1000,
  
  // 客服数据 - 30秒
  SERVICE: 30 * 1000,
  
  // 渠道数据 - 5分钟
  CHANNELS: 5 * 60 * 1000,
};

/**
 * 缓存配置接口（供未来扩展使用）
 * 注意：此类型当前未被直接引用，但定义了缓存配置的契约
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CacheConfig = {
  key: string;
  expiry: number;
  maxEntries?: number; // 最大条目数（用于LRU缓存）
};

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * 内存缓存管理器（带LRU淘汰）
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;
  
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }
  
  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > entry.timestamp + entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // 移动到末尾（LRU）
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data as T;
  }
  
  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, expiry: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
    });
  }
  
  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * 清理过期缓存
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

/**
 * 全局内存缓存实例
 */
export const memoryCache = new MemoryCache(200);

/**
 * LocalStorage 缓存管理器
 */
export const localStorageCache = {
  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = CACHE_KEY_PREFIX + key;
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }
      
      const entry: CacheEntry<T> = JSON.parse(item);
      
      // 检查是否过期
      if (Date.now() > entry.timestamp + entry.expiry) {
        localStorage.removeItem(fullKey);
        return null;
      }
      
      return entry.data;
    } catch {
      return null;
    }
  },
  
  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, expiry: number): void {
    try {
      const fullKey = CACHE_KEY_PREFIX + key;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry,
      };
      
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch (error) {
      // 如果存储失败（如超出配额），清理过期缓存后重试
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanExpired();
        try {
          const fullKey = CACHE_KEY_PREFIX + key;
          localStorage.setItem(fullKey, JSON.stringify({
            data,
            timestamp: Date.now(),
            expiry,
          }));
        } catch {
          // 存储失败，静默处理
        }
      }
    }
  },
  
  /**
   * 删除缓存
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
    } catch {
      // ignore
    }
  },
  
  /**
   * 清空所有缓存
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  },
  
  /**
   * 清理过期缓存
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const entry: CacheEntry<unknown> = JSON.parse(localStorage.getItem(key) || '{}');
            if (now > entry.timestamp + entry.expiry) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });
    } catch {
      // ignore
    }
    
    return cleaned;
  },
};

/**
 * 带缓存的数据获取 Hook 工厂函数
 */
export function createCachedFetcher<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  cacheExpiry: number,
  useMemory = true
) {
  return async (): Promise<T> => {
    // 先尝试从内存缓存获取
    if (useMemory) {
      const cached = memoryCache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }
    
    // 再尝试从 LocalStorage 获取
    const localCached = localStorageCache.get<T>(cacheKey);
    if (localCached !== null) {
      // 同步到内存缓存
      if (useMemory) {
        memoryCache.set(cacheKey, localCached, cacheExpiry);
      }
      return localCached;
    }
    
    // 从接口获取
    const data = await fetcher();
    
    // 保存到缓存
    if (useMemory) {
      memoryCache.set(cacheKey, data, cacheExpiry);
    }
    localStorageCache.set(cacheKey, data, cacheExpiry);
    
    return data;
  };
}

/**
 * 缓存刷新函数
 */
export async function refreshCache<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  cacheExpiry: number
): Promise<T> {
  // 清除缓存
  memoryCache.delete(cacheKey);
  localStorageCache.delete(cacheKey);
  
  // 重新获取
  const data = await fetcher();
  
  // 保存到新缓存
  memoryCache.set(cacheKey, data, cacheExpiry);
  localStorageCache.set(cacheKey, data, cacheExpiry);
  
  return data;
}

/**
 * 缓存键生成器
 */
export function generateCacheKey(base: string, params?: Record<string, unknown>): string {
  if (!params) {
    return base;
  }
  
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  
  return `${base}_${paramStr}`;
}
