// 缓存清理工具，统一处理浏览器存储与 Zustand store
import { clearAllPersistedData } from "@/store";
import { useUserStore } from "@/store/module/user";
import { useAppStore } from "@/store/module/app";
import { useSettingsStore } from "@/store/module/settings";

const isBrowser = typeof window !== "undefined";

const safeStorageClear = (storage?: Storage) => {
  if (!storage) return;
  try {
    storage.clear();
  } catch (error) {
    console.warn("清理存储失败:", error);
  }
};

export const clearBrowserStorage = () => {
  if (!isBrowser) return;
  safeStorageClear(window.localStorage);
  safeStorageClear(window.sessionStorage);
  // 清理自定义持久化数据
  try {
    clearAllPersistedData();
  } catch (error) {
    console.warn("清理持久化 store 失败:", error);
  }
};

export const clearAllIndexedDB = async (): Promise<void> => {
  if (!isBrowser || !window.indexedDB || !indexedDB.databases) return;

  const databases = await indexedDB.databases();
  const deleteJobs = databases
    .map(db => db.name)
    .filter((name): name is string => Boolean(name))
    .map(
      name =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () =>
            reject(new Error(`删除数据库 ${name} 失败`));
          request.onblocked = () => {
            setTimeout(() => {
              const retry = indexedDB.deleteDatabase(name);
              retry.onsuccess = () => resolve();
              retry.onerror = () =>
                reject(new Error(`删除数据库 ${name} 失败`));
            }, 100);
          };
        }),
    );

  await Promise.allSettled(deleteJobs);
};

export const resetAllStores = () => {
  const userStore = useUserStore.getState();
  const appStore = useAppStore.getState();
  const settingsStore = useSettingsStore.getState();

  userStore?.clearUser?.();
  appStore?.resetAppState?.();
  settingsStore?.resetSettings?.();
};

export const clearApplicationCache = async () => {
  clearBrowserStorage();
  await clearAllIndexedDB();
  resetAllStores();
};

