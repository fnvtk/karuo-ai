import { createPersistStore } from "@/store/createPersistStore";
import { Toast } from "antd-mobile";

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
  lastLoginIp: string;
  lastLoginTime: number;
  deviceTotal: number; // 设备总数
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
  login: (token: string, userInfo: User, deviceTotal: number) => void;
  login2: (token2: string) => void;
  logout: () => void;
}

export const useUserStore = createPersistStore<UserState>(
  set => ({
    user: null,
    token: null,
    token2: null,
    isLoggedIn: false,
    setUser: user => set({ user, isLoggedIn: true }),
    setToken: token => set({ token }),
    setToken2: token2 => set({ token2 }),
    clearUser: () =>
      set({ user: null, token: null, token2: null, isLoggedIn: false }),
    login: (token, userInfo, deviceTotal) => {
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
        lastLoginIp: userInfo.lastLoginIp,
        lastLoginTime: userInfo.lastLoginTime,
        deviceTotal: deviceTotal,
      };
      set({ user, token, isLoggedIn: true });

      Toast.show({ content: "登录成功", position: "top" });

      // 根据设备数量判断跳转
      if (deviceTotal > 0) {
        window.location.href = "/";
      } else {
        // 没有设备，跳转到引导页面
        window.location.href = "/guide";
      }
    },
    login2: token2 => {
      localStorage.setItem("token2", token2);

      set({ token2, isLoggedIn: true });
    },
    logout: () => {
      // 清除localStorage中的token
      localStorage.removeItem("token");
      localStorage.removeItem("token2");
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
      // console.log("User store hydrated:", state);
    },
  },
);
