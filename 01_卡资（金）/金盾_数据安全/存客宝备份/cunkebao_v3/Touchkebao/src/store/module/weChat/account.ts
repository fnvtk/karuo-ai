/**
 * 微信账号管理Store
 * 职责：管理微信账号列表、当前选中的账号、账号状态
 *
 * 根据新架构设计，将账号管理从CkChatStore中独立出来
 */

import { createPersistStore } from "@/store/createPersistStore";
import { KfUserListData } from "@/pages/pc/ckbox/data";

/**
 * 账号状态信息
 */
export interface AccountStatus {
  isOnline: boolean; // 是否在线
  lastSyncTime: number; // 最后同步时间（时间戳）
  lastActiveTime?: number; // 最后活跃时间（时间戳）
}

/**
 * 微信账号Store状态接口
 */
export interface WeChatAccountState {
  // ==================== 账号列表 ====================
  /** 微信账号列表 */
  accountList: KfUserListData[];

  // ==================== 当前选中的账号 ====================
  /** 当前选中的账号ID，0表示"全部" */
  selectedAccountId: number;

  // ==================== 账号状态 ====================
  /** 账号状态映射表：accountId -> AccountStatus */
  accountStatusMap: Map<number, AccountStatus>;

  // ==================== 操作方法 ====================
  /** 设置账号列表 */
  setAccountList: (accounts: KfUserListData[]) => void;

  /** 设置当前选中的账号 */
  setSelectedAccount: (accountId: number) => void;

  /** 更新账号状态 */
  updateAccountStatus: (
    accountId: number,
    status: Partial<AccountStatus>,
  ) => void;

  /** 获取账号状态 */
  getAccountStatus: (accountId: number) => AccountStatus | undefined;

  /** 获取当前选中的账号信息 */
  getSelectedAccount: () => KfUserListData | undefined;

  /** 根据ID获取账号信息 */
  getAccountById: (accountId: number) => KfUserListData | undefined;

  /** 清空账号列表 */
  clearAccountList: () => void;

  /** 添加账号 */
  addAccount: (account: KfUserListData) => void;

  /** 更新账号信息 */
  updateAccount: (accountId: number, account: Partial<KfUserListData>) => void;

  /** 删除账号 */
  removeAccount: (accountId: number) => void;
}

/**
 * 创建微信账号Store
 */
export const useWeChatAccountStore = createPersistStore<WeChatAccountState>(
  (set, get) => ({
    // ==================== 初始状态 ====================
    accountList: [],
    selectedAccountId: 0, // 0表示"全部"
    accountStatusMap: new Map<number, AccountStatus>(),

    // ==================== 操作方法 ====================
    /**
     * 设置账号列表
     */
    setAccountList: (accounts: KfUserListData[]) => {
      set({ accountList: accounts });

      // 初始化账号状态（如果不存在）
      const statusMap = new Map(get().accountStatusMap);
      accounts.forEach(account => {
        if (!statusMap.has(account.id)) {
          statusMap.set(account.id, {
            isOnline: account.isOnline || false,
            lastSyncTime: Date.now(),
            lastActiveTime: account.lastUpdateTime
              ? new Date(account.lastUpdateTime).getTime()
              : undefined,
          });
        }
      });
      set({ accountStatusMap: statusMap });
    },

    /**
     * 设置当前选中的账号
     * @param accountId 账号ID，0表示"全部"
     */
    setSelectedAccount: (accountId: number) => {
      set({ selectedAccountId: accountId });
    },

    /**
     * 更新账号状态
     */
    updateAccountStatus: (
      accountId: number,
      status: Partial<AccountStatus>,
    ) => {
      const statusMap = new Map(get().accountStatusMap);
      const currentStatus = statusMap.get(accountId) || {
        isOnline: false,
        lastSyncTime: Date.now(),
      };

      statusMap.set(accountId, {
        ...currentStatus,
        ...status,
      });

      set({ accountStatusMap: statusMap });
    },

    /**
     * 获取账号状态
     */
    getAccountStatus: (accountId: number) => {
      return get().accountStatusMap.get(accountId);
    },

    /**
     * 获取当前选中的账号信息
     */
    getSelectedAccount: () => {
      const { selectedAccountId, accountList } = get();
      if (selectedAccountId === 0) {
        return undefined; // "全部"时返回undefined
      }
      return accountList.find(account => account.id === selectedAccountId);
    },

    /**
     * 根据ID获取账号信息
     */
    getAccountById: (accountId: number) => {
      return get().accountList.find(account => account.id === accountId);
    },

    /**
     * 清空账号列表
     */
    clearAccountList: () => {
      set({
        accountList: [],
        selectedAccountId: 0,
        accountStatusMap: new Map(),
      });
    },

    /**
     * 添加账号
     */
    addAccount: (account: KfUserListData) => {
      const accountList = [...get().accountList, account];
      set({ accountList });

      // 初始化账号状态
      const statusMap = new Map(get().accountStatusMap);
      statusMap.set(account.id, {
        isOnline: account.isOnline || false,
        lastSyncTime: Date.now(),
        lastActiveTime: account.lastUpdateTime
          ? new Date(account.lastUpdateTime).getTime()
          : undefined,
      });
      set({ accountStatusMap: statusMap });
    },

    /**
     * 更新账号信息
     */
    updateAccount: (accountId: number, account: Partial<KfUserListData>) => {
      const accountList = get().accountList.map(acc =>
        acc.id === accountId ? { ...acc, ...account } : acc,
      );
      set({ accountList });

      // 如果更新了在线状态，同步更新状态映射
      if (account.isOnline !== undefined) {
        get().updateAccountStatus(accountId, {
          isOnline: account.isOnline,
        });
      }
    },

    /**
     * 删除账号
     */
    removeAccount: (accountId: number) => {
      const accountList = get().accountList.filter(acc => acc.id !== accountId);
      set({ accountList });

      // 清理账号状态
      const statusMap = new Map(get().accountStatusMap);
      statusMap.delete(accountId);
      set({ accountStatusMap: statusMap });

      // 如果删除的是当前选中的账号，切换到"全部"
      if (get().selectedAccountId === accountId) {
        set({ selectedAccountId: 0 });
      }
    },
  }),
  {
    name: "wechat-account-store",
    partialize: state => {
      // Map类型需要转换为数组才能持久化
      const accountStatusMapArray = Array.from(state.accountStatusMap.entries());
      return {
        accountList: state.accountList,
        selectedAccountId: state.selectedAccountId,
        accountStatusMap: accountStatusMapArray,
      };
    },
    // 恢复时，将数组转换回Map
    onRehydrateStorage: () => (state: any, error: any) => {
      if (error) {
        console.error("WeChatAccountStore rehydration error:", error);
        return;
      }
      if (state && Array.isArray(state.accountStatusMap)) {
        state.accountStatusMap = new Map(state.accountStatusMap);
      }
    },
  },
);
