import { createPersistStore } from "@/store/createPersistStore";
import { Toast } from "antd-mobile";
import { databaseManager } from "@/utils/db";

const STORE_CACHE_KEYS = [
  "user-store",
  "app-store",
  "settings-store",
  "websocket-store",
  "ckchat-store",
  "wechat-storage",
  "contacts-storage",
  "message-storage",
  "customer-storage",
];

const allStorages = (): Storage[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const storages: Storage[] = [];
  try {
    storages.push(window.localStorage);
  } catch (error) {
    console.warn("无法访问 localStorage:", error);
  }
  try {
    storages.push(window.sessionStorage);
  } catch (error) {
    console.warn("无法访问 sessionStorage:", error);
  }
  return storages;
};

const clearStoreCaches = () => {
  const storages = allStorages();
  if (!storages.length) {
    return;
  }
  STORE_CACHE_KEYS.forEach(key => {
    storages.forEach(storage => {
      try {
        storage.removeItem(key);
      } catch (error) {
        console.warn(`清理持久化数据失败: ${key}`, error);
      }
    });
  });
};

export interface User {
  id: number;
  account: string;
  username: string;
  phone: string;
  avatar: string;
  isAdmin: number;
  companyId: number;
  typeId: number;
  status: number;
  s2_accountId: string;
  createTime: string;
  updateTime: string | null;
  tokens: number;
  lastLoginIp: string;
  lastLoginTime: number;
}

interface UserState {
  user: User | null;
  token: string | null;
  token2: string | null;
  isLoggedIn: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setToken2: (token2: string) => void;
  clearUser: () => void;
  login: (token: string, userInfo: User) => Promise<void>;
  login2: (token2: string) => void;
  logout: () => void;
}

export const useUserStore = createPersistStore<UserState>(
  set => ({
    user: null,
    token: null,
    token2: null,
    isLoggedIn: false,
    setUser: user => {
      set({ user, isLoggedIn: true });
      databaseManager.ensureDatabase(user.id).catch(error => {
        console.warn("Failed to initialize database for user:", error);
      });
    },
    setToken: token => set({ token }),
    setToken2: token2 => set({ token2 }),
    clearUser: () => {
      databaseManager.closeCurrentDatabase().catch(error => {
        console.warn("Failed to close database on clearUser:", error);
      });
      clearStoreCaches();
      set({ user: null, token: null, token2: null, isLoggedIn: false });
    },
    login: async (token, userInfo) => {
      clearStoreCaches();

      // 清除旧的双token缓存
      localStorage.removeItem("token2");

      // 只将token存储到localStorage
      localStorage.setItem("token", token);

      // 用户信息存储在状态管理中
      const user: User = {
        id: userInfo.id,
        account: userInfo.account,
        username: userInfo.username,
        phone: userInfo.phone,
        avatar: userInfo.avatar,
        isAdmin: userInfo.isAdmin,
        companyId: userInfo.companyId,
        typeId: userInfo.typeId,
        status: userInfo.status,
        s2_accountId: userInfo.s2_accountId,
        createTime: userInfo.createTime,
        updateTime: userInfo.updateTime,
        tokens: userInfo.tokens,
        lastLoginIp: userInfo.lastLoginIp,
        lastLoginTime: userInfo.lastLoginTime,
      };
      try {
        await databaseManager.ensureDatabase(user.id);
      } catch (error) {
        console.error("Failed to initialize user database:", error);
      }
      set({ user, token, isLoggedIn: true });

      Toast.show({ content: "登录成功", position: "top" });
      window.location.href = "/pc/weChat";
    },
    login2: token2 => {
      localStorage.setItem("token2", token2);

      set({ token2, isLoggedIn: true });
    },
    logout: () => {
      // 清除localStorage中的token
      localStorage.removeItem("token");
      localStorage.removeItem("token2");
      databaseManager.closeCurrentDatabase().catch(error => {
        console.warn("Failed to close user database on logout:", error);
      });
      clearStoreCaches();
      set({ user: null, token: null, token2: null, isLoggedIn: false });
    },
  }),
  {
    name: "user-store",
    partialize: state => ({
      user: state.user,
      token: state.token,
      token2: state.token2,
      isLoggedIn: state.isLoggedIn,
    }),
    onRehydrateStorage: () => state => {
      if (state?.user?.id) {
        databaseManager.ensureDatabase(state.user!.id).catch(error => {
          console.warn("Failed to restore user database:", error);
        });
      }
    },
  },
);
