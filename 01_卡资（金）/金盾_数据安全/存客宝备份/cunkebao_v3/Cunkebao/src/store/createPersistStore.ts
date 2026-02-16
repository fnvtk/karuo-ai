// src/store/createPersistStore.ts
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export interface PersistConfig {
  name: string;
  partialize?: (state: any) => any;
  storage?: Storage;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
  onRehydrateStorage?: (state: any) => void;
  skipHydration?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  ttl?: number; // 生存时间（毫秒）
  encryptionKey?: string;
}

// 默认配置
const DEFAULT_CONFIG = {
  storage: localStorage,
  version: 1,
  skipHydration: false,
  compress: false,
  encrypt: false,
};

// 简单的数据压缩
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

// 简单的数据加密
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

export function createPersistStore<T>(
  createState: (set: any, get: any) => T,
  config: PersistConfig,
) {
  const {
    name,
    partialize,
    storage = DEFAULT_CONFIG.storage,
    version = DEFAULT_CONFIG.version,
    migrate,
    onRehydrateStorage,
    skipHydration = DEFAULT_CONFIG.skipHydration,
    compress = DEFAULT_CONFIG.compress,
    encrypt = DEFAULT_CONFIG.encrypt,
    ttl,
    encryptionKey = "default-key",
  } = config;

  return create<T>()(
    persist(createState, {
      name,
      partialize,
      storage: {
        getItem: (name: string) => {
          try {
            const item = storage.getItem(name);
            if (!item) return null;

            let data: any;
            try {
              data = JSON.parse(item);
            } catch {
              return null;
            }

            // 检查TTL
            if (data.timestamp && ttl && isDataExpired(data.timestamp, ttl)) {
              storage.removeItem(name);
              return null;
            }

            let value = data.value;

            // 解密
            if (encrypt && typeof value === "string") {
              value = decryptData(value, encryptionKey);
            }

            // 解压
            if (compress && typeof value === "string") {
              value = decompressData(value);
            }

            return value;
          } catch (error) {
            console.warn(`Failed to get item ${name} from storage:`, error);
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          try {
            let processedValue = value;

            // 压缩
            if (compress) {
              processedValue = compressData(processedValue);
            }

            // 加密
            if (encrypt && typeof processedValue === "string") {
              processedValue = encryptData(processedValue, encryptionKey);
            }

            const storageData = {
              value: processedValue,
              timestamp: Date.now(),
              config: { compress, encrypt, ttl },
            };

            storage.setItem(name, JSON.stringify(storageData));
          } catch (error) {
            console.warn(`Failed to set item ${name} to storage:`, error);
          }
        },
        removeItem: (name: string) => {
          try {
            storage.removeItem(name);
          } catch (error) {
            console.warn(`Failed to remove item ${name} from storage:`, error);
          }
        },
      },
      version,
      migrate,
      onRehydrateStorage,
      skipHydration,
    } as PersistOptions<T>),
  );
}

// 便利函数：创建localStorage持久化store
export function createLocalStorageStore<T>(
  createState: (set: any, get: any) => T,
  name: string,
  partialize?: (state: T) => Partial<T>,
  options?: Partial<Omit<PersistConfig, "name" | "partialize" | "storage">>,
) {
  return createPersistStore(createState, {
    name,
    partialize,
    storage: localStorage,
    ...options,
  });
}

// 便利函数：创建sessionStorage持久化store
export function createSessionStorageStore<T>(
  createState: (set: any, get: any) => T,
  name: string,
  partialize?: (state: T) => Partial<T>,
  options?: Partial<Omit<PersistConfig, "name" | "partialize" | "storage">>,
) {
  return createPersistStore(createState, {
    name,
    partialize,
    storage: sessionStorage,
    ...options,
  });
}

// 便利函数：创建加密持久化store
export function createEncryptedStore<T>(
  createState: (set: any, get: any) => T,
  name: string,
  encryptionKey: string,
  partialize?: (state: T) => Partial<T>,
  options?: Partial<
    Omit<PersistConfig, "name" | "partialize" | "encrypt" | "encryptionKey">
  >,
) {
  return createPersistStore(createState, {
    name,
    partialize,
    encrypt: true,
    encryptionKey,
    ...options,
  });
}

// 便利函数：创建压缩持久化store
export function createCompressedStore<T>(
  createState: (set: any, get: any) => T,
  name: string,
  partialize?: (state: T) => Partial<T>,
  options?: Partial<Omit<PersistConfig, "name" | "partialize" | "compress">>,
) {
  return createPersistStore(createState, {
    name,
    partialize,
    compress: true,
    ...options,
  });
}

// 便利函数：创建带TTL的持久化store
export function createTTLStore<T>(
  createState: (set: any, get: any) => T,
  name: string,
  ttl: number, // 生存时间（毫秒）
  partialize?: (state: T) => Partial<T>,
  options?: Partial<Omit<PersistConfig, "name" | "partialize" | "ttl">>,
) {
  return createPersistStore(createState, {
    name,
    partialize,
    ttl,
    ...options,
  });
}
