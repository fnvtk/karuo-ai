/**
 * 缓存工具类 - 支持TTL和IndexedDB
 *
 * 功能：
 * 1. 支持TTL（生存时间）机制
 * 2. 支持IndexedDB存储（大容量数据）
 * 3. 支持localStorage存储（小容量数据）
 * 4. 自动清理过期缓存
 * 5. 支持缓存失效机制
 *
 * 使用场景：
 * - 分组列表缓存（TTL: 30分钟）
 * - 分组联系人缓存（TTL: 1小时）
 * - 分组统计缓存（TTL: 30分钟）
 * - 会话列表缓存（TTL: 1小时）
 */

import Dexie, { Table } from "dexie";

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  key: string; // 缓存键
  data: T; // 缓存数据
  lastUpdate: number; // 最后更新时间（时间戳）
  ttl: number; // 生存时间（毫秒）
  version?: number; // 版本号（用于数据迁移）
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl?: number; // 默认TTL（毫秒）
  storage?: "indexeddb" | "localStorage"; // 存储类型
  version?: number; // 版本号
}

/**
 * IndexedDB缓存表结构
 */
interface CacheTable {
  key: string; // 主键
  data: any; // 缓存数据
  lastUpdate: number; // 最后更新时间
  ttl: number; // 生存时间
  version?: number; // 版本号
}

/**
 * 缓存数据库类
 */
class CacheDatabase extends Dexie {
  cache!: Table<CacheTable>;

  constructor() {
    super("CacheDatabase");
    this.version(1).stores({
      cache: "key, lastUpdate, ttl",
    });
  }
}

/**
 * 缓存工具类
 */
class CacheManager {
  private db: CacheDatabase;
  private defaultTTL: number;
  private defaultStorage: "indexeddb" | "localStorage";

  constructor(config: CacheConfig = {}) {
    this.db = new CacheDatabase();
    this.defaultTTL = config.ttl || 30 * 60 * 1000; // 默认30分钟
    this.defaultStorage = config.storage || "indexeddb";
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid<T>(item: CacheItem<T>): boolean {
    if (!item || !item.lastUpdate || !item.ttl) {
      return false;
    }
    const now = Date.now();
    return now - item.lastUpdate < item.ttl;
  }

  /**
   * 从IndexedDB获取缓存
   */
  private async getFromIndexedDB<T>(key: string): Promise<CacheItem<T> | null> {
    try {
      const record = await this.db.cache.get(key);
      if (!record) {
        return null;
      }

      const item: CacheItem<T> = {
        key: record.key,
        data: record.data,
        lastUpdate: record.lastUpdate,
        ttl: record.ttl,
        version: record.version,
      };

      // 检查是否过期
      if (!this.isCacheValid(item)) {
        // 删除过期缓存
        await this.db.cache.delete(key);
        return null;
      }

      return item;
    } catch (error) {
      console.error(`Failed to get cache from IndexedDB for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 从localStorage获取缓存
   */
  private getFromLocalStorage<T>(key: string): CacheItem<T> | null {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(item);

      // 检查是否过期
      if (!this.isCacheValid(cacheItem)) {
        // 删除过期缓存
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheItem;
    } catch (error) {
      console.error(`Failed to get cache from localStorage for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 保存到IndexedDB
   */
  private async saveToIndexedDB<T>(
    key: string,
    data: T,
    ttl: number,
    version?: number,
  ): Promise<void> {
    try {
      await this.db.cache.put({
        key,
        data,
        lastUpdate: Date.now(),
        ttl,
        version,
      });
    } catch (error) {
      console.error(`Failed to save cache to IndexedDB for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 保存到localStorage
   */
  private saveToLocalStorage<T>(
    key: string,
    data: T,
    ttl: number,
    version?: number,
  ): void {
    try {
      const cacheItem: CacheItem<T> = {
        key,
        data,
        lastUpdate: Date.now(),
        ttl,
        version,
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Failed to save cache to localStorage for key ${key}:`, error);
      // localStorage可能已满，尝试清理过期缓存
      this.cleanExpiredCache("localStorage");
      throw error;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.defaultStorage === "indexeddb") {
      const item = await this.getFromIndexedDB<T>(key);
      return item ? item.data : null;
    } else {
      const item = this.getFromLocalStorage<T>(key);
      return item ? item.data : null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    data: T,
    ttl?: number,
    version?: number,
  ): Promise<void> {
    const cacheTTL = ttl || this.defaultTTL;

    if (this.defaultStorage === "indexeddb") {
      await this.saveToIndexedDB(key, data, cacheTTL, version);
    } else {
      this.saveToLocalStorage(key, data, cacheTTL, version);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.defaultStorage === "indexeddb") {
        await this.db.cache.delete(key);
      } else {
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  /**
   * 检查缓存是否存在且有效
   */
  async has(key: string): Promise<boolean> {
    const item =
      this.defaultStorage === "indexeddb"
        ? await this.getFromIndexedDB(key)
        : this.getFromLocalStorage(key);
    return item !== null && this.isCacheValid(item);
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(storage?: "indexeddb" | "localStorage"): Promise<void> {
    const targetStorage = storage || this.defaultStorage;

    if (targetStorage === "indexeddb") {
      try {
        const now = Date.now();
        const expiredKeys: string[] = [];

        await this.db.cache.each(record => {
          if (now - record.lastUpdate >= record.ttl) {
            expiredKeys.push(record.key);
          }
        });

        await Promise.all(expiredKeys.map(key => this.db.cache.delete(key)));

        if (expiredKeys.length > 0) {
          console.log(`Cleaned ${expiredKeys.length} expired cache items from IndexedDB`);
        }
      } catch (error) {
        console.error("Failed to clean expired cache from IndexedDB:", error);
      }
    } else {
      try {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("cache_")) {
            try {
              const item: CacheItem<any> = JSON.parse(localStorage.getItem(key)!);
              if (now - item.lastUpdate >= item.ttl) {
                keysToDelete.push(key);
              }
            } catch {
              // 无效的缓存项，也删除
              keysToDelete.push(key);
            }
          }
        }

        keysToDelete.forEach(key => localStorage.removeItem(key));

        if (keysToDelete.length > 0) {
          console.log(`Cleaned ${keysToDelete.length} expired cache items from localStorage`);
        }
      } catch (error) {
        console.error("Failed to clean expired cache from localStorage:", error);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(storage?: "indexeddb" | "localStorage"): Promise<void> {
    const targetStorage = storage || this.defaultStorage;

    if (targetStorage === "indexeddb") {
      try {
        await this.db.cache.clear();
      } catch (error) {
        console.error("Failed to clear IndexedDB cache:", error);
      }
    } else {
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("cache_")) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.error("Failed to clear localStorage cache:", error);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(storage?: "indexeddb" | "localStorage"): Promise<{
    total: number;
    valid: number;
    expired: number;
    totalSize: number; // 字节
  }> {
    const targetStorage = storage || this.defaultStorage;
    const now = Date.now();

    if (targetStorage === "indexeddb") {
      try {
        let total = 0;
        let valid = 0;
        let expired = 0;
        let totalSize = 0;

        await this.db.cache.each(record => {
          total++;
          const size = JSON.stringify(record).length;
          totalSize += size;

          if (now - record.lastUpdate < record.ttl) {
            valid++;
          } else {
            expired++;
          }
        });

        return { total, valid, expired, totalSize };
      } catch (error) {
        console.error("Failed to get cache stats from IndexedDB:", error);
        return { total: 0, valid: 0, expired: 0, totalSize: 0 };
      }
    } else {
      try {
        let total = 0;
        let valid = 0;
        let expired = 0;
        let totalSize = 0;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("cache_")) {
            total++;
            const item = localStorage.getItem(key);
            if (item) {
              totalSize += item.length;
              try {
                const cacheItem: CacheItem<any> = JSON.parse(item);
                if (now - cacheItem.lastUpdate < cacheItem.ttl) {
                  valid++;
                } else {
                  expired++;
                }
              } catch {
                expired++;
              }
            }
          }
        }

        return { total, valid, expired, totalSize };
      } catch (error) {
        console.error("Failed to get cache stats from localStorage:", error);
        return { total: 0, valid: 0, expired: 0, totalSize: 0 };
      }
    }
  }
}

// 创建默认缓存管理器实例
export const cacheManager = new CacheManager({
  ttl: 30 * 60 * 1000, // 默认30分钟
  storage: "indexeddb",
});

// 创建分组列表缓存管理器（TTL: 30分钟）
export const groupListCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30分钟
  storage: "indexeddb",
});

// 创建分组联系人缓存管理器（TTL: 1小时）
export const groupContactsCache = new CacheManager({
  ttl: 60 * 60 * 1000, // 1小时
  storage: "indexeddb",
});

// 创建分组统计缓存管理器（TTL: 30分钟）
export const groupStatsCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30分钟
  storage: "indexeddb",
});

// 创建会话列表缓存管理器（TTL: 1小时）
export const sessionListCache = new CacheManager({
  ttl: 60 * 60 * 1000, // 1小时
  storage: "indexeddb",
});

// 定期清理过期缓存（每小时执行一次）
if (typeof window !== "undefined") {
  setInterval(() => {
    cacheManager.cleanExpiredCache().catch(console.error);
    groupListCache.cleanExpiredCache().catch(console.error);
    groupContactsCache.cleanExpiredCache().catch(console.error);
    groupStatsCache.cleanExpiredCache().catch(console.error);
    sessionListCache.cleanExpiredCache().catch(console.error);
  }, 60 * 60 * 1000); // 每小时
}
