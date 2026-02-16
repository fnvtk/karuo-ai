# Store 持久化使用指南

## 概述

本项目使用 Zustand 作为状态管理库，并实现了完整的持久化功能。所有 store 都支持数据持久化，确保用户数据在页面刷新后不会丢失。

## 🚀 新功能特性

### 高级持久化功能

- **数据压缩**: 减少存储空间占用
- **数据加密**: 保护敏感数据安全
- **TTL支持**: 自动过期机制
- **批量操作**: 提高性能
- **存储监控**: 实时监控存储使用情况
- **数据迁移**: 版本管理和数据升级
- **备份恢复**: 完整的数据备份和恢复功能

## 已实现的持久化 Store

### 1. User Store (`user.ts`)

- **存储内容**: 用户信息、登录状态、token
- **存储位置**: localStorage
- **持久化键**: `user-store`

```typescript
import { useUserStore } from "@/store";

// 使用用户状态
const { user, isLoggedIn, login, logout } = useUserStore();

// 登录
login(token, userInfo, deviceTotal);

// 登出
logout();
```

### 2. App Store (`app.ts`)

- **存储内容**: 应用状态、主题设置、调试模式等
- **存储位置**: localStorage
- **持久化键**: `app-store`

```typescript
import { useAppStore } from "@/store";

// 使用应用状态
const { app, setTheme, setDebugMode } = useAppStore();

// 设置主题
setTheme("dark");

// 切换调试模式
setDebugMode(true);
```

### 3. Settings Store (`settings.ts`)

- **存储内容**: 应用设置、语言、时区等
- **存储位置**: localStorage
- **持久化键**: `settings-store`

```typescript
import { useSettingsStore } from "@/store";

// 使用设置状态
const { settings, updateSetting } = useSettingsStore();

// 更新设置
updateSetting("language", "en-US");
```

## 创建新的持久化 Store

### 基础持久化 Store

```typescript
import { createPersistStore } from "@/store";

interface MyState {
  data: any[];
  loading: boolean;
  setData: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useMyStore = createPersistStore<MyState>(
  set => ({
    data: [],
    loading: false,
    setData: data => set({ data }),
    setLoading: loading => set({ loading }),
  }),
  {
    name: "my-store",
    partialize: state => ({
      data: state.data,
    }),
    onRehydrateStorage: () => state => {
      console.log("My store hydrated:", state);
    },
  },
);
```

### 便利函数创建 Store

```typescript
import {
  createLocalStorageStore,
  createSessionStorageStore,
  createEncryptedStore,
  createCompressedStore,
  createTTLStore,
} from "@/store";

// 创建 localStorage 持久化 store
export const useLocalStore = createLocalStorageStore(
  set => ({
    // state and actions
  }),
  "local-store",
  state => ({
    /* partialize */
  }),
  { ttl: 24 * 60 * 60 * 1000 }, // 24小时TTL
);

// 创建 sessionStorage 持久化 store
export const useSessionStore = createSessionStorageStore(
  set => ({
    // state and actions
  }),
  "session-store",
  state => ({
    /* partialize */
  }),
);

// 创建加密持久化 store
export const useEncryptedStore = createEncryptedStore(
  set => ({
    // state and actions
  }),
  "encrypted-store",
  "your-secret-key",
  state => ({
    /* partialize */
  }),
);

// 创建压缩持久化 store
export const useCompressedStore = createCompressedStore(
  set => ({
    // state and actions
  }),
  "compressed-store",
  state => ({
    /* partialize */
  }),
);

// 创建TTL持久化 store
export const useTTLStore = createTTLStore(
  set => ({
    // state and actions
  }),
  "ttl-store",
  24 * 60 * 60 * 1000, // 24小时TTL
  state => ({
    /* partialize */
  }),
);
```

## 高级持久化功能

### 数据压缩

```typescript
// 启用压缩以减少存储空间
const useCompressedStore = createPersistStore(createState, {
  name: "compressed-store",
  compress: true, // 启用压缩
});
```

### 数据加密

```typescript
// 启用加密以保护敏感数据
const useEncryptedStore = createPersistStore(createState, {
  name: "encrypted-store",
  encrypt: true,
  encryptionKey: "your-secret-key",
});
```

### TTL (Time To Live)

```typescript
// 设置数据自动过期时间
const useTTLStore = createPersistStore(createState, {
  name: "ttl-store",
  ttl: 24 * 60 * 60 * 1000, // 24小时后自动过期
});
```

### 数据迁移

```typescript
// 版本管理和数据迁移
const useMigratedStore = createPersistStore(createState, {
  name: "migrated-store",
  version: 2,
  migrate: (persistedState, version) => {
    if (version === 1) {
      // 从版本1迁移到版本2
      return {
        ...persistedState,
        newField: "default-value",
      };
    }
    return persistedState;
  },
});
```

## 持久化工具函数

### 数据管理

```typescript
import {
  getPersistedData,
  setPersistedData,
  removePersistedData,
  clearAllPersistedData,
  getStorageUsage,
  cleanupExpiredData,
} from "@/store";

// 获取持久化数据
const data = getPersistedData("user-store", "localStorage");

// 设置持久化数据（带配置）
setPersistedData("my-key", { value: "test" }, "localStorage", {
  compress: true,
  encrypt: true,
  ttl: 24 * 60 * 60 * 1000,
});

// 移除持久化数据
removePersistedData("my-key", "localStorage");

// 清除所有持久化数据
clearAllPersistedData();

// 获取存储使用情况
const usage = getStorageUsage("localStorage");
console.log(
  `使用: ${usage.used} bytes, 总计: ${usage.total} bytes, 使用率: ${usage.percentage}%`,
);

// 清理过期数据
const cleanedCount = cleanupExpiredData();
console.log(`清理了 ${cleanedCount} 个过期数据`);
```

### 批量操作

```typescript
import {
  batchSetPersistedData,
  batchGetPersistedData,
  batchMigrateData,
} from "@/store";

// 批量设置数据
const results = batchSetPersistedData(
  {
    key1: { value: "data1" },
    key2: { value: "data2" },
    key3: { value: "data3" },
  },
  "localStorage",
  { compress: true },
);

// 批量获取数据
const data = batchGetPersistedData(["key1", "key2", "key3"], "localStorage");

// 批量迁移数据
const migrationResults = batchMigrateData({
  "user-store": oldData => ({ ...oldData, version: "2.0" }),
  "app-store": oldData => ({ ...oldData, newField: "default" }),
});
```

### 数据迁移

```typescript
import { migratePersistedData } from "@/store";

// 迁移数据
migratePersistedData("user-store", "localStorage", oldData => {
  // 转换旧数据格式到新格式
  return {
    ...oldData,
    newField: "default-value",
  };
});
```

### 数据备份和恢复

```typescript
import {
  backupPersistedData,
  restorePersistedData,
  exportPersistedData,
  importPersistedData,
} from "@/store";

// 备份所有持久化数据
const backup = backupPersistedData();

// 恢复持久化数据
restorePersistedData(backup);

// 导出备份数据为JSON字符串
const jsonData = exportPersistedData();

// 从JSON字符串导入备份数据
const success = importPersistedData(jsonData);
```

## Store 状态管理

### 获取 Store 状态

```typescript
import {
  getStores,
  getUserStore,
  getAppStore,
  getSettingsStore,
} from "@/store";

// 获取所有store状态
const allStores = getStores();

// 获取特定store状态
const userState = getUserStore();
const appState = getAppStore();
const settingsState = getSettingsStore();
```

### Store 订阅

```typescript
import {
  subscribeToUserStore,
  subscribeToAppStore,
  subscribeToSettingsStore,
  subscribeToAllStores,
} from "@/store";

// 订阅单个store
const unsubscribeUser = subscribeToUserStore(state => {
  console.log("User store changed:", state);
});

// 订阅所有store
const unsubscribeAll = subscribeToAllStores(state => {
  console.log("Any store changed:", state);
});

// 取消订阅
unsubscribeUser();
unsubscribeAll();
```

## 配置选项

### PersistConfig 接口

```typescript
interface PersistConfig {
  name: string; // 存储键名
  partialize?: (state: T) => any; // 选择性持久化
  storage?: Storage; // 存储类型 (localStorage/sessionStorage)
  version?: number; // 版本号，用于数据迁移
  migrate?: (persistedState: any, version: number) => any; // 迁移函数
  onRehydrateStorage?: (state: any) => void; // 重新水合回调
  skipHydration?: boolean; // 跳过水合
  compress?: boolean; // 启用压缩
  encrypt?: boolean; // 启用加密
  ttl?: number; // 生存时间（毫秒）
  encryptionKey?: string; // 加密密钥
}
```

### StorageConfig 接口

```typescript
interface StorageConfig {
  compress: boolean; // 是否压缩
  encrypt: boolean; // 是否加密
  ttl?: number; // 生存时间
}
```

## 最佳实践

### 1. 选择性持久化

只持久化必要的数据，避免存储过大的状态：

```typescript
partialize: state => ({
  user: state.user,
  token: state.token,
  // 不持久化临时状态
  // loading: state.loading,
});
```

### 2. 数据迁移

当数据结构发生变化时，使用迁移函数：

```typescript
{
  name: "user-store",
  version: 2,
  migrate: (persistedState, version) => {
    if (version === 1) {
      // 从版本1迁移到版本2
      return {
        ...persistedState,
        newField: "default-value",
      };
    }
    return persistedState;
  },
}
```

### 3. 错误处理

持久化操作会自动处理错误，但可以添加自定义错误处理：

```typescript
onRehydrateStorage: () => state => {
  if (state) {
    console.log("Store hydrated successfully");
  } else {
    console.warn("Failed to hydrate store");
  }
},
```

### 4. 存储空间管理

定期清理不需要的持久化数据：

```typescript
// 检查数据大小
const size = getPersistedDataSize("user-store", "localStorage");
if (size > 1024 * 1024) {
  // 1MB
  console.warn("Persisted data is too large");
}

// 监控存储使用情况
const usage = getStorageUsage("localStorage");
if (usage.percentage > 80) {
  console.warn("Storage usage is high:", usage.percentage + "%");
}
```

### 5. 性能优化

使用批量操作提高性能：

```typescript
// 批量设置数据
const results = batchSetPersistedData(
  {
    key1: data1,
    key2: data2,
    key3: data3,
  },
  "localStorage",
);

// 批量获取数据
const data = batchGetPersistedData(["key1", "key2", "key3"], "localStorage");
```

### 6. 安全考虑

对敏感数据使用加密：

```typescript
// 加密敏感数据
const useSensitiveStore = createEncryptedStore(
  createState,
  "sensitive-store",
  "your-secret-key",
  partialize,
);
```

## 注意事项

1. **存储限制**: localStorage 通常有 5-10MB 限制
2. **同步操作**: 持久化操作是同步的，避免阻塞主线程
3. **隐私模式**: 在隐私模式下，存储可能不可用
4. **数据安全**: 敏感数据应该加密后再存储
5. **版本管理**: 及时更新版本号，确保数据迁移正常工作
6. **压缩权衡**: 压缩可以减少存储空间，但会增加CPU开销
7. **TTL设置**: 合理设置TTL，避免数据过期影响用户体验
8. **错误恢复**: 实现错误恢复机制，处理存储失败的情况

## 实际应用场景

### 电商购物车

```typescript
const useCartStore = createLocalStorageStore(
  createCartState,
  "cart-store",
  state => ({ items: state.items, total: state.total }),
  { ttl: 30 * 24 * 60 * 60 * 1000 }, // 30天TTL
);
```

### 用户偏好设置

```typescript
const usePreferencesStore = createEncryptedStore(
  createPreferencesState,
  "preferences-store",
  "user-secret-key",
  state => ({ theme: state.theme, language: state.language }),
);
```

### 临时会话数据

```typescript
const useSessionStore = createTTLStore(
  createSessionState,
  "session-store",
  24 * 60 * 60 * 1000, // 24小时TTL
  state => ({ sessionId: state.sessionId, lastActivity: state.lastActivity }),
);
```

### 大数据缓存

```typescript
const useCacheStore = createCompressedStore(
  createCacheState,
  "cache-store",
  state => ({ data: state.data, timestamp: state.timestamp }),
);
```
