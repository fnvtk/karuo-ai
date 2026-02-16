// src/store/examples.ts
// 高级持久化使用示例

import {
  createLocalStorageStore,
  createSessionStorageStore,
  createEncryptedStore,
  createCompressedStore,
  createTTLStore,
  createPersistStore,
} from "./createPersistStore";

// 示例1: 基础localStorage持久化store
interface BasicState {
  count: number;
  name: string;
  increment: () => void;
  setName: (name: string) => void;
}

export const useBasicStore = createLocalStorageStore<BasicState>(
  set => ({
    count: 0,
    name: "",
    increment: () => set(state => ({ count: state.count + 1 })),
    setName: name => set({ name }),
  }),
  "basic-store",
  state => ({ count: state.count, name: state.name }), // 只持久化数据，不持久化方法
);

// 示例2: sessionStorage持久化store（会话级存储）
interface SessionState {
  sessionId: string;
  lastActivity: number;
  updateActivity: () => void;
}

export const useSessionStore = createSessionStorageStore<SessionState>(
  set => ({
    sessionId: "",
    lastActivity: Date.now(),
    updateActivity: () => set({ lastActivity: Date.now() }),
  }),
  "session-store",
  state => ({ sessionId: state.sessionId, lastActivity: state.lastActivity }),
);

// 示例3: 加密持久化store（敏感数据）
interface SensitiveState {
  apiKey: string;
  privateData: any;
  setApiKey: (key: string) => void;
  setPrivateData: (data: any) => void;
}

export const useSensitiveStore = createEncryptedStore<SensitiveState>(
  set => ({
    apiKey: "",
    privateData: null,
    setApiKey: key => set({ apiKey: key }),
    setPrivateData: data => set({ privateData: data }),
  }),
  "sensitive-store",
  "your-secret-key-here", // 加密密钥
  state => ({ apiKey: state.apiKey, privateData: state.privateData }),
);

// 示例4: 压缩持久化store（大数据）
interface LargeDataState {
  largeArray: number[];
  largeObject: Record<string, any>;
  addToArray: (item: number) => void;
  updateObject: (key: string, value: any) => void;
}

export const useLargeDataStore = createCompressedStore<LargeDataState>(
  set => ({
    largeArray: [],
    largeObject: {},
    addToArray: item =>
      set(state => ({ largeArray: [...state.largeArray, item] })),
    updateObject: (key, value) =>
      set(state => ({ largeObject: { ...state.largeObject, [key]: value } })),
  }),
  "large-data-store",
  state => ({ largeArray: state.largeArray, largeObject: state.largeObject }),
);

// 示例5: TTL持久化store（临时数据，自动过期）
interface TemporaryState {
  tempData: any;
  expiresAt: number;
  setTempData: (data: any, ttlMs: number) => void;
}

export const useTemporaryStore = createTTLStore<TemporaryState>(
  set => ({
    tempData: null,
    expiresAt: 0,
    setTempData: (data, ttlMs) =>
      set({ tempData: data, expiresAt: Date.now() + ttlMs }),
  }),
  "temporary-store",
  24 * 60 * 60 * 1000, // 24小时TTL
  state => ({ tempData: state.tempData, expiresAt: state.expiresAt }),
);

// 示例6: 高级配置持久化store
interface AdvancedState {
  complexData: {
    nested: {
      deep: {
        value: string;
      };
    };
    array: any[];
  };
  metadata: {
    version: string;
    createdAt: number;
    updatedAt: number;
  };
  updateComplexData: (data: any) => void;
  updateMetadata: (metadata: any) => void;
}

export const useAdvancedStore = createPersistStore<AdvancedState>(
  set => ({
    complexData: {
      nested: {
        deep: {
          value: "",
        },
      },
      array: [],
    },
    metadata: {
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    updateComplexData: data =>
      set(state => ({
        complexData: { ...state.complexData, ...data },
        metadata: { ...state.metadata, updatedAt: Date.now() },
      })),
    updateMetadata: metadata =>
      set(state => ({
        metadata: { ...state.metadata, ...metadata, updatedAt: Date.now() },
      })),
  }),
  {
    name: "advanced-store",
    partialize: state => ({
      complexData: state.complexData,
      metadata: state.metadata,
    }),
    version: 2,
    migrate: (persistedState, version) => {
      if (version === 1) {
        // 从版本1迁移到版本2
        return {
          ...persistedState,
          metadata: {
            version: "2.0.0",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };
      }
      return persistedState;
    },
    onRehydrateStorage: () => state => {
      console.log("Advanced store hydrated:", state);
    },
    compress: true, // 启用压缩
    ttl: 7 * 24 * 60 * 60 * 1000, // 7天TTL
  },
);

// 示例7: 购物车持久化store（电商场景）
interface CartState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  calculateTotal: () => void;
}

export const useCartStore = createLocalStorageStore<CartState>(
  (set, get) => ({
    items: [],
    total: 0,
    addItem: item => {
      const state = get();
      const existingItem = state.items.find(i => i.id === item.id);

      if (existingItem) {
        set({
          items: state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        });
      } else {
        set({ items: [...state.items, { ...item, quantity: 1 }] });
      }

      get().calculateTotal();
    },
    removeItem: id => {
      const state = get();
      set({ items: state.items.filter(i => i.id !== id) });
      get().calculateTotal();
    },
    updateQuantity: (id, quantity) => {
      const state = get();
      set({
        items: state.items.map(i =>
          i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i,
        ),
      });
      get().calculateTotal();
    },
    clearCart: () => set({ items: [], total: 0 }),
    calculateTotal: () => {
      const state = get();
      const total = state.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      set({ total });
    },
  }),
  "cart-store",
  state => ({ items: state.items, total: state.total }),
  {
    ttl: 30 * 24 * 60 * 60 * 1000, // 30天TTL
  },
);

// 示例8: 用户偏好设置store
interface PreferencesState {
  theme: "light" | "dark" | "auto";
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
  };
  setTheme: (theme: "light" | "dark" | "auto") => void;
  setLanguage: (language: string) => void;
  toggleNotification: (type: keyof PreferencesState["notifications"]) => void;
  updatePrivacy: (settings: Partial<PreferencesState["privacy"]>) => void;
}

export const usePreferencesStore = createEncryptedStore<PreferencesState>(
  set => ({
    theme: "auto",
    language: "zh-CN",
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
    setTheme: theme => set({ theme }),
    setLanguage: language => set({ language }),
    toggleNotification: type =>
      set(state => ({
        notifications: {
          ...state.notifications,
          [type]: !state.notifications[type],
        },
      })),
    updatePrivacy: settings =>
      set(state => ({
        privacy: { ...state.privacy, ...settings },
      })),
  }),
  "preferences-store",
  "user-preferences-key",
  state => ({
    theme: state.theme,
    language: state.language,
    notifications: state.notifications,
    privacy: state.privacy,
  }),
);

// 使用示例
export function useStoreExamples() {
  // 基础store使用
  const basic = useBasicStore();

  // 敏感数据store使用
  const sensitive = useSensitiveStore();

  // 购物车store使用
  const cart = useCartStore();

  // 偏好设置store使用
  const preferences = usePreferencesStore();

  return {
    basic,
    sensitive,
    cart,
    preferences,
  };
}
