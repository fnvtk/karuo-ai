import { createPersistStore } from "@/store/createPersistStore";

export interface AppState {
  // 应用状态
  isLoading: boolean;
  isOnline: boolean;
  lastActiveTime: number;

  // 主题设置
  theme: "light" | "dark" | "auto";

  // 缓存设置
  cacheEnabled: boolean;
  cacheExpiry: number; // 缓存过期时间（毫秒）

  // 调试设置
  debugMode: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
}

interface AppStoreState {
  app: AppState;
  setAppState: (app: Partial<AppState>) => void;
  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  setTheme: (theme: AppState["theme"]) => void;
  setDebugMode: (debug: boolean) => void;
  updateLastActiveTime: () => void;
  resetAppState: () => void;
}

// 默认应用状态
const defaultAppState: AppState = {
  isLoading: false,
  isOnline: navigator.onLine,
  lastActiveTime: Date.now(),
  theme: "auto",
  cacheEnabled: true,
  cacheExpiry: 24 * 60 * 60 * 1000, // 24小时
  debugMode: false,
  logLevel: "info",
};

export const useAppStore = createPersistStore<AppStoreState>(
  (set, get) => ({
    app: defaultAppState,

    setAppState: newAppState =>
      set(state => ({
        app: { ...state.app, ...newAppState },
      })),

    setLoading: loading =>
      set(state => ({
        app: { ...state.app, isLoading: loading },
      })),

    setOnline: online =>
      set(state => ({
        app: { ...state.app, isOnline: online },
      })),

    setTheme: theme =>
      set(state => ({
        app: { ...state.app, theme },
      })),

    setDebugMode: debug =>
      set(state => ({
        app: { ...state.app, debugMode: debug },
      })),

    updateLastActiveTime: () =>
      set(state => ({
        app: { ...state.app, lastActiveTime: Date.now() },
      })),

    resetAppState: () => set({ app: defaultAppState }),
  }),
  {
    name: "app-store",
    partialize: state => ({
      app: state.app,
    }),
    onRehydrateStorage: () => state => {
      console.log("App store hydrated:", state);
    },
  },
);

// 应用状态工具函数
export const getAppState = (): AppState => {
  const { app } = useAppStore.getState();
  return app;
};

export const setAppLoading = (loading: boolean): void => {
  const { setLoading } = useAppStore.getState();
  setLoading(loading);
};

export const setAppTheme = (theme: AppState["theme"]): void => {
  const { setTheme } = useAppStore.getState();
  setTheme(theme);
};

export const toggleDebugMode = (): void => {
  const { app, setDebugMode } = useAppStore.getState();
  setDebugMode(!app.debugMode);
};

// 监听网络状态变化
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const { setOnline } = useAppStore.getState();
    setOnline(true);
  });

  window.addEventListener("offline", () => {
    const { setOnline } = useAppStore.getState();
    setOnline(false);
  });

  // 监听用户活动
  const updateLastActive = () => {
    const { updateLastActiveTime } = useAppStore.getState();
    updateLastActiveTime();
  };

  ["mousedown", "mousemove", "keypress", "scroll", "touchstart"].forEach(
    event => {
      document.addEventListener(event, updateLastActive, true);
    },
  );
}
