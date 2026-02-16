import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatSession } from "@/utils/db";
import { Message, MessageState, SessionsUpdater } from "./message.data";
import { sessionListCache } from "@/utils/cache";
import { performanceMonitor } from "@/utils/performance";

const computeSortKey = (session: ChatSession) => {
  const isTop = session.config?.top ? 1 : 0;
  const timestamp = new Date(session.lastUpdateTime || new Date()).getTime();
  const displayName = (
    session.conRemark ||
    session.nickname ||
    (session as any).wechatId ||
    ""
  ).toLowerCase();

  return `${isTop}|${timestamp}|${displayName}`;
};

const normalizeSessions = (sessions: ChatSession[]) => {
  if (!Array.isArray(sessions)) {
    return [];
  }

  return [...sessions]
    .map(session => ({
      ...session,
      sortKey: computeSortKey(session),
    }))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
};

const resolveUpdater = (
  updater: SessionsUpdater,
  previous: ChatSession[],
): ChatSession[] => {
  if (typeof updater === "function") {
    return updater(previous);
  }
  return updater;
};

/**
 * 会话列表状态管理Store
 * 职责：只管理状态，不存储会话列表数据
 * 数据存储在：组件state + IndexedDB
 */
export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      // ==================== 新增状态管理 ====================
      loading: false,
      refreshing: false,
      lastRefreshTime: null,
      hasLoadedOnce: false,

      setLoading: (loading: boolean) => set({ loading }),
      setRefreshing: (refreshing: boolean) => set({ refreshing }),
      setHasLoadedOnce: (loaded: boolean) => set({ hasLoadedOnce: loaded }),
      resetLoadState: () =>
        set({
          hasLoadedOnce: false,
          loading: false,
          refreshing: false,
          sessions: [],
        }),

      // ==================== 保留原有接口（向后兼容） ====================
      messageList: [],
      currentMessage: null,
      updateMessageList: (messageList: Message[]) => set({ messageList }),
      updateCurrentMessage: (message: Message) =>
        set({ currentMessage: message }),
      updateMessageStatus: (messageId: number, status: string) =>
        set({
          messageList: get().messageList.map(message =>
            message.id === messageId ? { ...message, status } : message,
          ),
        }),

      // ==================== 会话数据接口 ====================
      sessions: [],
      setSessions: (updater: SessionsUpdater) =>
        set(state => ({
          sessions: normalizeSessions(resolveUpdater(updater, state.sessions)),
          lastRefreshTime: new Date().toISOString(),
        })),
      upsertSession: (session: ChatSession) =>
        set(state => {
          const next = [...state.sessions];
          const index = next.findIndex(
            s => s.id === session.id && s.type === session.type,
          );

          if (index > -1) {
            next[index] = session;
          } else {
            next.push(session);
          }
          return {
            sessions: normalizeSessions(next),
            lastRefreshTime: new Date().toISOString(),
          };
        }),
      removeSessionById: (sessionId: number, type: ChatSession["type"]) =>
        set(state => ({
          sessions: normalizeSessions(
            state.sessions.filter(
              s => !(s.id === sessionId && s.type === type),
            ),
          ),
          lastRefreshTime: new Date().toISOString(),
        })),
      clearSessions: () =>
        set({
          sessions: [],
          lastRefreshTime: new Date().toISOString(),
        }),

      // ==================== 新架构：索引和缓存（阶段1.2） ====================
      allSessions: [],
      sessionIndex: new Map<number, ChatSession[]>(),
      filteredSessionsCache: new Map<number, ChatSession[]>(),
      cacheValid: new Map<number, boolean>(),
      selectedAccountId: 0, // 0表示"全部"
      searchKeyword: "",
      sortBy: "time" as "time" | "unread" | "name",

      /**
       * 构建索引（数据加载时调用）
       * 时间复杂度：O(n)，只执行一次
       */
      buildIndexes: (sessions: ChatSession[]) => {
        const sessionIndex = new Map<number, ChatSession[]>();

        sessions.forEach(session => {
          const accountId = session.wechatAccountId;
          if (!sessionIndex.has(accountId)) {
            sessionIndex.set(accountId, []);
          }
          sessionIndex.get(accountId)!.push(session);
        });

        set({
          allSessions: sessions,
          sessionIndex,
          // 失效所有缓存
          cacheValid: new Map(),
        });
      },

      /**
       * 设置全部会话数据并构建索引（带缓存）
       */
      setAllSessions: async (sessions: ChatSession[]) => {
        const normalized = normalizeSessions(sessions);
        get().buildIndexes(normalized);

        // 缓存会话列表
        const accountId = get().selectedAccountId;
        const cacheKey = `sessions_${accountId}`;
        await sessionListCache.set(cacheKey, normalized);
      },

      /**
       * 从缓存加载会话列表
       */
      loadSessionsFromCache: async (accountId: number) => {
        const cacheKey = `sessions_${accountId}`;
        const cached = await sessionListCache.get<ChatSession[]>(cacheKey);
        if (cached && cached.length > 0) {
          // 立即显示缓存数据
          get().buildIndexes(cached);
          get().switchAccount(accountId);
          return cached;
        }
        return null;
      },

      /**
       * 切换账号（使用索引快速过滤）
       * 时间复杂度：O(1) 获取 + O(n) 过滤（n是当前账号的数据量，不是全部数据量）
       */
      switchAccount: (accountId: number) => {
        const currentState = get(); // 在外部获取state，用于metadata
        return performanceMonitor.measure(
          `SessionStore.switchAccount(${accountId})`,
          () => {
            const state = get();

            // 1. 检查缓存（O(1) - 最快，< 1ms）
            if (
              state.filteredSessionsCache.has(accountId) &&
              state.cacheValid.get(accountId)
            ) {
              const cached = state.filteredSessionsCache.get(accountId)!;
              set({
                sessions: cached,
                selectedAccountId: accountId,
              });
              return cached;
            }

            // 2. 使用索引快速获取（O(1) - 次快，< 1ms）
            let filteredSessions: ChatSession[];
            if (accountId === 0) {
              // "全部"：返回所有会话
              filteredSessions = state.allSessions;
            } else {
              // 特定账号：从索引获取（O(1)，不遍历全部数据）
              filteredSessions = state.sessionIndex.get(accountId) || [];
            }

            // 3. 应用搜索和排序（如果需要）
            if (state.searchKeyword) {
              filteredSessions = filteredSessions.filter(s =>
                (s.conRemark || s.nickname || (s as any).wechatId || "")
                  .toLowerCase()
                  .includes(state.searchKeyword.toLowerCase()),
              );
            }

            if (state.sortBy !== "time") {
              // 排序逻辑（可以根据需要扩展）
              filteredSessions = normalizeSessions(filteredSessions);
            } else {
              // 默认按时间排序
              filteredSessions = normalizeSessions(filteredSessions);
            }

            // 4. 缓存结果（避免下次切换时重复计算）
            const newCache = new Map(state.filteredSessionsCache);
            newCache.set(accountId, filteredSessions);
            const newCacheValid = new Map(state.cacheValid);
            newCacheValid.set(accountId, true);

            set({
              sessions: filteredSessions,
              selectedAccountId: accountId,
              filteredSessionsCache: newCache,
              cacheValid: newCacheValid,
            });

            return filteredSessions;
          },
          { accountId, sessionCount: currentState.allSessions.length },
        );
      },

      /**
       * 新增会话（增量更新索引）
       */
      addSession: (session: ChatSession) => {
        try {
          const state = get();

          // 边界检查：确保session有效
          if (!session || !session.id) {
            console.warn("addSession: 无效的会话数据", session);
            return;
          }

          // 检查是否已存在（避免重复添加）
          const existingIndex = state.allSessions.findIndex(
            s => s.id === session.id && s.type === session.type,
          );
          if (existingIndex >= 0) {
            // 已存在，更新而不是添加
            const allSessions = [...state.allSessions];
            allSessions[existingIndex] = session;

            // 更新索引
            const accountId = session.wechatAccountId || 0;
            const sessionIndex = new Map(state.sessionIndex);
            const accountSessions = sessionIndex.get(accountId) || [];
            const indexInAccount = accountSessions.findIndex(
              s => s.id === session.id && s.type === session.type,
            );
            if (indexInAccount >= 0) {
              accountSessions[indexInAccount] = session;
            } else {
              accountSessions.push(session);
            }
            sessionIndex.set(accountId, accountSessions);

            // 失效缓存
            const cacheValid = new Map(state.cacheValid);
            cacheValid.set(accountId, false);
            cacheValid.set(0, false);

            set({
              allSessions,
              sessionIndex,
              cacheValid,
            });

            // 如果当前显示的是该账号，重新过滤
            if (state.selectedAccountId === accountId || state.selectedAccountId === 0) {
              get().switchAccount(state.selectedAccountId);
            }
            return;
          }

          // 1. 添加到全部数据
          const allSessions = [...state.allSessions, session];

          // 2. 更新索引（O(1)）
          const accountId = session.wechatAccountId || 0;
          const sessionIndex = new Map(state.sessionIndex);
          if (!sessionIndex.has(accountId)) {
            sessionIndex.set(accountId, []);
          }
          sessionIndex.get(accountId)!.push(session);

          // 3. 失效缓存（如果当前显示的是该账号）
          const cacheValid = new Map(state.cacheValid);
          if (state.selectedAccountId === accountId || state.selectedAccountId === 0) {
            cacheValid.set(accountId, false);
            cacheValid.set(0, false); // "全部"的缓存也失效
          }

          set({
            allSessions,
            sessionIndex,
            cacheValid,
          });

          // 4. 如果当前显示的是该账号，重新过滤
          if (state.selectedAccountId === accountId || state.selectedAccountId === 0) {
            get().switchAccount(state.selectedAccountId);
          }
        } catch (error) {
          console.error("addSession失败:", error, session);
        }
      },

      /**
       * 设置搜索关键词
       */
      setSearchKeyword: (keyword: string) => {
        set({ searchKeyword: keyword });
        // 失效缓存，重新过滤
        get().invalidateCache();
        get().switchAccount(get().selectedAccountId);
      },

      /**
       * 设置排序方式
       */
      setSortBy: (sortBy: "time" | "unread" | "name") => {
        set({ sortBy });
        // 失效缓存，重新过滤
        get().invalidateCache();
        get().switchAccount(get().selectedAccountId);
      },

      /**
       * 失效缓存（数据更新时调用）
       */
      invalidateCache: (accountId?: number) => {
        const cacheValid = new Map(get().cacheValid);
        if (accountId !== undefined) {
          cacheValid.set(accountId, false);
        } else {
          // 失效所有缓存
          cacheValid.forEach((_, key) => {
            cacheValid.set(key, false);
          });
        }
        set({ cacheValid });
      },
    }),
    {
      name: "message-storage",
      partialize: state => {
        // Map类型需要转换为数组才能持久化
        const sessionIndexArray = Array.from(state.sessionIndex.entries());
        const filteredSessionsCacheArray = Array.from(
          state.filteredSessionsCache.entries(),
        );
        const cacheValidArray = Array.from(state.cacheValid.entries());

        return {
          // 只持久化必要的状态，不持久化数据
          lastRefreshTime: state.lastRefreshTime,
          hasLoadedOnce: state.hasLoadedOnce,
          // 保留原有持久化字段（向后兼容）
          messageList: [],
          currentMessage: null,
          // 新架构字段（Map转换为数组）
          selectedAccountId: state.selectedAccountId,
          searchKeyword: state.searchKeyword,
          sortBy: state.sortBy,
          sessionIndex: sessionIndexArray,
          filteredSessionsCache: filteredSessionsCacheArray,
          cacheValid: cacheValidArray,
        };
      },
      // 恢复时，将数组转换回Map
      onRehydrateStorage: () => (state: any, error: any) => {
        if (error) {
          console.error("MessageStore rehydration error:", error);
          return;
        }
        if (state) {
          if (Array.isArray(state.sessionIndex)) {
            state.sessionIndex = new Map(state.sessionIndex);
          }
          if (Array.isArray(state.filteredSessionsCache)) {
            state.filteredSessionsCache = new Map(state.filteredSessionsCache);
          }
          if (Array.isArray(state.cacheValid)) {
            state.cacheValid = new Map(state.cacheValid);
          }
        }
      },
    },
  ),
);
/**
 * 更新当前选中的消息
 * @param message 消息
 * @returns void
 */
export const updateCurrentMessage = (message: Message) =>
  useMessageStore.getState().updateCurrentMessage(message);
/**
 * 更新消息列表
 * @param messageList 消息列表
 * @returns void
 */
export const updateMessageList = (messageList: Message[]) =>
  useMessageStore.getState().updateMessageList(messageList);
/**
 * 获取当前选中的消息
 * @returns Message | null
 */
export const getCurrentMessage = () =>
  useMessageStore.getState().currentMessage;

/**
 * 更新消息状态
 * @param messageId 消息ID
 * @param status 状态
 * @returns void
 */
export const updateMessageStatus = (messageId: number, status: string) =>
  useMessageStore.getState().updateMessageStatus(messageId, status);

// ==================== 新增导出函数 ====================

/**
 * 设置加载状态
 * @param loading 加载状态
 */
export const setLoading = (loading: boolean) =>
  useMessageStore.getState().setLoading(loading);

/**
 * 设置同步状态
 * @param refreshing 同步状态
 */
export const setRefreshing = (refreshing: boolean) =>
  useMessageStore.getState().setRefreshing(refreshing);

/**
 * 设置已加载标识
 * @param loaded 是否已加载
 */
export const setHasLoadedOnce = (loaded: boolean) =>
  useMessageStore.getState().setHasLoadedOnce(loaded);

/**
 * 重置加载状态（用于登出或切换用户）
 */
export const resetLoadState = () => useMessageStore.getState().resetLoadState();
