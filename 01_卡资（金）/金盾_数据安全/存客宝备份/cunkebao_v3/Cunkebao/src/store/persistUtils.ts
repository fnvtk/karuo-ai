// src/store/persistUtils.ts

// 持久化存储键名常量
export const PERSIST_KEYS = {
  USER_STORE: "user-store",
  APP_STORE: "app-store",
  SETTINGS_STORE: "settings-store",
} as const;

// 存储类型
export type StorageType = "localStorage" | "sessionStorage";

// 持久化配置接口
export interface PersistConfig {
  key: string;
  storage: StorageType;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
  compress?: boolean;
  encrypt?: boolean;
  ttl?: number; // 生存时间（毫秒）
}

// 存储配置
export interface StorageConfig {
  compress: boolean;
  encrypt: boolean;
  ttl?: number;
}

// 默认配置
const DEFAULT_CONFIG: StorageConfig = {
  compress: false,
  encrypt: false,
};

// 获取存储实例
export function getStorage(type: StorageType): Storage {
  return type === "localStorage" ? localStorage : sessionStorage;
}

// 检查存储是否可用
export function isStorageAvailable(type: StorageType): boolean {
  try {
    const storage = getStorage(type);
    const testKey = "__storage_test__";
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// 简单的数据压缩（Base64编码）
function compressData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch {
    return JSON.stringify(data);
  }
}

// 简单的数据解压
function decompressData(compressedData: string): any {
  try {
    const jsonString = decodeURIComponent(atob(compressedData));
    return JSON.parse(jsonString);
  } catch {
    return JSON.parse(compressedData);
  }
}

// 简单的数据加密（XOR加密）
function encryptData(data: string, key: string = "default-key"): string {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return btoa(result);
}

// 简单的数据解密
function decryptData(
  encryptedData: string,
  key: string = "default-key",
): string {
  try {
    const data = atob(encryptedData);
    let result = "";
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    return result;
  } catch {
    return encryptedData;
  }
}

// 检查数据是否过期
function isDataExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}

// 安全地获取持久化数据
export function getPersistedData<T>(
  key: string,
  storage: StorageType,
  config: Partial<StorageConfig> = {},
): T | null {
  try {
    if (!isStorageAvailable(storage)) {
      console.warn(`Storage ${storage} is not available`);
      return null;
    }

    const storageInstance = getStorage(storage);
    const item = storageInstance.getItem(key);

    if (!item) return null;

    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let data: any;

    // 解析数据
    try {
      data = JSON.parse(item);
    } catch {
      return null;
    }

    // 检查TTL
    if (
      data.timestamp &&
      finalConfig.ttl &&
      isDataExpired(data.timestamp, finalConfig.ttl)
    ) {
      removePersistedData(key, storage);
      return null;
    }

    let value = data.value;

    // 解密
    if (finalConfig.encrypt && typeof value === "string") {
      value = decryptData(value);
    }

    // 解压
    if (finalConfig.compress && typeof value === "string") {
      value = decompressData(value);
    }

    return value;
  } catch (error) {
    console.warn(`Failed to get persisted data for key ${key}:`, error);
    return null;
  }
}

// 安全地设置持久化数据
export function setPersistedData<T>(
  key: string,
  data: T,
  storage: StorageType,
  config: Partial<StorageConfig> = {},
): boolean {
  try {
    if (!isStorageAvailable(storage)) {
      console.warn(`Storage ${storage} is not available`);
      return false;
    }

    const storageInstance = getStorage(storage);
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    let value: any = data;

    // 压缩
    if (finalConfig.compress) {
      value = compressData(value);
    }

    // 加密
    if (finalConfig.encrypt && typeof value === "string") {
      value = encryptData(value);
    }

    const storageData = {
      value,
      timestamp: Date.now(),
      config: finalConfig,
    };

    storageInstance.setItem(key, JSON.stringify(storageData));
    return true;
  } catch (error) {
    console.warn(`Failed to set persisted data for key ${key}:`, error);
    return false;
  }
}

// 安全地移除持久化数据
export function removePersistedData(
  key: string,
  storage: StorageType,
): boolean {
  try {
    if (!isStorageAvailable(storage)) {
      console.warn(`Storage ${storage} is not available`);
      return false;
    }

    const storageInstance = getStorage(storage);
    storageInstance.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove persisted data for key ${key}:`, error);
    return false;
  }
}

// 清除所有持久化数据
export function clearAllPersistedData(): void {
  Object.values(PERSIST_KEYS).forEach(key => {
    removePersistedData(key, "localStorage");
    removePersistedData(key, "sessionStorage");
  });
}

// 获取持久化数据大小
export function getPersistedDataSize(
  key: string,
  storage: StorageType,
): number {
  try {
    const data = getPersistedData(key, storage);
    return data ? JSON.stringify(data).length : 0;
  } catch {
    return 0;
  }
}

// 检查持久化数据是否存在
export function hasPersistedData(key: string, storage: StorageType): boolean {
  try {
    const storageInstance = getStorage(storage);
    return storageInstance.getItem(key) !== null;
  } catch {
    return false;
  }
}

// 获取所有持久化键
export function getAllPersistedKeys(storage: StorageType): string[] {
  try {
    const storageInstance = getStorage(storage);
    return Object.keys(storageInstance).filter(key =>
      Object.values(PERSIST_KEYS).includes(key as any),
    );
  } catch {
    return [];
  }
}

// 获取存储使用情况
export function getStorageUsage(storage: StorageType): {
  used: number;
  total: number;
  percentage: number;
} {
  try {
    const storageInstance = getStorage(storage);
    let used = 0;

    // 计算已使用空间
    for (let i = 0; i < storageInstance.length; i++) {
      const key = storageInstance.key(i);
      if (key) {
        used += storageInstance.getItem(key)?.length || 0;
      }
    }

    // 估算总空间（localStorage通常为5-10MB）
    const total =
      storage === "localStorage" ? 5 * 1024 * 1024 : 5 * 1024 * 1024;
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
}

// 清理过期数据
export function cleanupExpiredData(): number {
  let cleanedCount = 0;

  Object.values(PERSIST_KEYS).forEach(key => {
    ["localStorage", "sessionStorage"].forEach(storageType => {
      const data = getPersistedData(key, storageType as StorageType);
      if (data === null) {
        cleanedCount++;
      }
    });
  });

  return cleanedCount;
}

// 持久化数据迁移工具
export function migratePersistedData(
  key: string,
  storage: StorageType,
  migrateFn: (data: any) => any,
): boolean {
  try {
    const data = getPersistedData(key, storage);
    if (data) {
      const migratedData = migrateFn(data);
      return setPersistedData(key, migratedData, storage);
    }
    return false;
  } catch (error) {
    console.warn(`Failed to migrate persisted data for key ${key}:`, error);
    return false;
  }
}

// 批量迁移数据
export function batchMigrateData(
  migrationMap: Record<string, (data: any) => any>,
  storage: StorageType = "localStorage",
): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  Object.entries(migrationMap).forEach(([key, migrateFn]) => {
    results[key] = migratePersistedData(key, storage, migrateFn);
  });

  return results;
}

// 持久化数据备份和恢复
export function backupPersistedData(): Record<string, any> {
  const backup: Record<string, any> = {};

  Object.values(PERSIST_KEYS).forEach(key => {
    const localData = getPersistedData(key, "localStorage");
    const sessionData = getPersistedData(key, "sessionStorage");

    if (localData || sessionData) {
      backup[key] = {
        localStorage: localData,
        sessionStorage: sessionData,
      };
    }
  });

  return backup;
}

export function restorePersistedData(backup: Record<string, any>): void {
  Object.entries(backup).forEach(([key, data]) => {
    if (data.localStorage) {
      setPersistedData(key, data.localStorage, "localStorage");
    }
    if (data.sessionStorage) {
      setPersistedData(key, data.sessionStorage, "sessionStorage");
    }
  });
}

// 导出备份数据
export function exportPersistedData(): string {
  const backup = backupPersistedData();
  return JSON.stringify(backup, null, 2);
}

// 导入备份数据
export function importPersistedData(jsonData: string): boolean {
  try {
    const backup = JSON.parse(jsonData);
    restorePersistedData(backup);
    return true;
  } catch (error) {
    console.warn("Failed to import persisted data:", error);
    return false;
  }
}

// 性能优化的批量操作
export function batchSetPersistedData(
  dataMap: Record<string, any>,
  storage: StorageType = "localStorage",
  config: Partial<StorageConfig> = {},
): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  Object.entries(dataMap).forEach(([key, data]) => {
    results[key] = setPersistedData(key, data, storage, config);
  });

  return results;
}

export function batchGetPersistedData(
  keys: string[],
  storage: StorageType = "localStorage",
  config: Partial<StorageConfig> = {},
): Record<string, any> {
  const results: Record<string, any> = {};

  keys.forEach(key => {
    results[key] = getPersistedData(key, storage, config);
  });

  return results;
}
