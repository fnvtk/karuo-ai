// 导出所有store模块
export * from "./module/user";
export * from "./module/app";
export * from "./module/settings";
export * from "./module/websocket/websocket";

// 导入store实例
import { useUserStore } from "./module/user";
import { useAppStore } from "./module/app";
import { useSettingsStore } from "./module/settings";
import { useWebSocketStore } from "./module/websocket/websocket";

// 导出持久化store创建函数
export {
  createPersistStore,
  createLocalStorageStore,
  createSessionStorageStore,
  createEncryptedStore,
  createCompressedStore,
  createTTLStore,
} from "./createPersistStore";

// 导出持久化工具函数
export * from "./persistUtils";

// 导入工具函数
import {
  clearAllPersistedData as clearAllData,
  PERSIST_KEYS,
} from "./persistUtils";

// Store类型定义
export interface StoreState {
  user: ReturnType<typeof useUserStore.getState>;
  app: ReturnType<typeof useAppStore.getState>;
  settings: ReturnType<typeof useSettingsStore.getState>;
  websocket: ReturnType<typeof useWebSocketStore.getState>;
}

// 便利的store访问函数
export const getStores = (): StoreState => ({
  user: useUserStore.getState(),
  app: useAppStore.getState(),
  settings: useSettingsStore.getState(),
  websocket: useWebSocketStore.getState(),
});

// 获取特定store状态
export const getUserStore = () => useUserStore.getState();
export const getAppStore = () => useAppStore.getState();
export const getSettingsStore = () => useSettingsStore.getState();
export const getWebSocketStore = () => useWebSocketStore.getState();

// 清除所有持久化数据（使用工具函数）
export const clearAllPersistedData = clearAllData;

// 获取所有持久化键名
export const getPersistKeys = () => Object.values(PERSIST_KEYS);

// Store状态监听器
export const subscribeToUserStore = useUserStore.subscribe;
export const subscribeToAppStore = useAppStore.subscribe;
export const subscribeToSettingsStore = useSettingsStore.subscribe;
export const subscribeToWebSocketStore = useWebSocketStore.subscribe;

// 组合订阅函数
export const subscribeToAllStores = (callback: (state: StoreState) => void) => {
  const unsubscribeUser = useUserStore.subscribe(() => {
    callback(getStores());
  });
  const unsubscribeApp = useAppStore.subscribe(() => {
    callback(getStores());
  });
  const unsubscribeSettings = useSettingsStore.subscribe(() => {
    callback(getStores());
  });
  const unsubscribeWebSocket = useWebSocketStore.subscribe(() => {
    callback(getStores());
  });

  return () => {
    unsubscribeUser();
    unsubscribeApp();
    unsubscribeSettings();
    unsubscribeWebSocket();
  };
};
