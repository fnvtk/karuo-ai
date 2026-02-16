/**
 * 会话列表数据库操作管理器
 * 职责：
 * 1. 会话数据的增删改查
 * 2. 增量同步逻辑（对比本地和服务器数据）
 * 3. 好友/群聊数据转换为统一格式
 * 4. 提供回调机制通知组件更新
 */

import Dexie from "dexie";
import { db, chatSessionService, ChatSession } from "../db";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";

const serializeExtendFields = (value: any) => {
  if (typeof value === "string") {
    return value.trim() ? value : "{}";
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("序列化 extendFields 失败:", error);
    }
  }
  return "{}";
};

interface SessionUpdatePayload {
  userId: number;
  sessions: ChatSession[];
}

export class MessageManager {
  private static updateCallbacks = new Set<
    (payload: SessionUpdatePayload) => void
  >();

  // ==================== 回调管理 ====================

  /**
   * 注册会话更新回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  static onSessionsUpdate(callback: (payload: SessionUpdatePayload) => void) {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * 触发所有注册的回调
   * @param userId 用户ID
   */
  private static async triggerCallbacks(userId: number) {
    try {
      const sessions = await this.getUserSessions(userId);
      this.updateCallbacks.forEach(callback => {
        try {
          callback({ userId, sessions });
        } catch (error) {
          console.error("会话更新回调执行失败:", error);
        }
      });
    } catch (error) {
      console.error("触发回调失败:", error);
    }
  }

  // ==================== 数据转换 ====================

  /**
   * 生成会话排序键（微信排序方式）
   * @param session 会话数据
   * @returns 排序键
   */
  private static generateSortKey(session: any): string {
    // 1. 置顶标识：置顶为1，普通为0（降序时置顶在前）
    const isTop = session.config?.top ? 1 : 0;

    // 2. 时间戳：直接使用时间戳，数值越大表示越新
    const timestamp = new Date(session.lastUpdateTime || new Date()).getTime();

    // 3. 显示名称：用于稳定排序
    const displayName = (
      session.conRemark ||
      session.nickname ||
      ""
    ).toLowerCase();

    // 格式：置顶标识|时间戳|显示名称
    // 降序排序：置顶(1)在前，时间大的在前，名称小的在前
    return `${isTop}|${timestamp}|${displayName}`;
  }

  /**
   * 转换好友会话为统一格式
   * @param friend 好友数据
   * @param userId 用户ID
   * @returns 统一会话格式
   */
  private static convertFriendToChatSession(
    friend: ContractData,
    userId: number,
  ): ChatSession {
    return {
      serverId: `friend_${friend.id}`,
      userId,
      id: friend.id!,
      type: "friend",
      wechatAccountId: friend.wechatAccountId,
      nickname: friend.nickname,
      conRemark: friend.conRemark,
      avatar: friend.avatar || "",
      content: (friend as any).content || "",
      lastUpdateTime: friend.lastUpdateTime || new Date().toISOString(),
      aiType: (friend as any).aiType ?? 0, // AI类型，默认为0（普通）
      phone: (friend as any).phone ?? "",
      region: (friend as any).region ?? "",
      config: {
        unreadCount: friend.config?.unreadCount || 0,
        top: (friend.config as any)?.top || false,
      },
      sortKey: this.generateSortKey(friend),
      wechatFriendId: friend.id,
      wechatId: friend.wechatId,
      alias: friend.alias,
      extendFields: serializeExtendFields((friend as any).extendFields),
    };
  }

  /**
   * 转换群聊会话为统一格式
   * @param group 群聊数据
   * @param userId 用户ID
   * @returns 统一会话格式
   */
  private static convertGroupToChatSession(
    group: weChatGroup,
    userId: number,
  ): ChatSession {
    return {
      serverId: `group_${group.id}`,
      userId,
      id: group.id!,
      type: "group",
      wechatAccountId: group.wechatAccountId,
      nickname: group.nickname,
      conRemark: group.conRemark,
      avatar: group.chatroomAvatar || "",
      content: (group as any).content || "",
      lastUpdateTime: (group as any).lastUpdateTime || new Date().toISOString(),
      aiType: (group as any).aiType ?? 0, // AI类型，默认为0（普通）
      phone: (group as any).phone ?? "",
      region: (group as any).region ?? "",
      config: {
        unreadCount: (group.config as any)?.unreadCount || 0,
        top: (group.config as any)?.top || false,
      },
      sortKey: this.generateSortKey(group),
      chatroomId: group.chatroomId,
      chatroomOwner: group.chatroomOwner,
      selfDisplayName: group.selfDisplyName,
      notice: group.notice,
      extendFields: serializeExtendFields((group as any).extendFields),
    };
  }

  // ==================== 查询操作 ====================

  /**
   * 获取用户的所有会话（已排序）
   * @param userId 用户ID
   * @returns 会话列表
   */
  static async getUserSessions(userId: number): Promise<ChatSession[]> {
    try {
      // 按sortKey降序排序查询（置顶在前，最新的在前）
      const sessions = await db.chatSessions
        .where("userId")
        .equals(userId)
        .reverse()
        .sortBy("sortKey");

      return sessions;
    } catch (error) {
      console.error("获取用户会话失败:", error);
      return [];
    }
  }

  /**
   * 根据ID查找会话
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns 会话数据
   */
  static async getSessionById(
    userId: number,
    sessionId: number,
  ): Promise<ChatSession | undefined> {
    try {
      return await db.chatSessions
        .where(["userId", "id"])
        .equals([userId, sessionId])
        .first();
    } catch (error) {
      console.error("查找会话失败:", error);
      return undefined;
    }
  }

  // ==================== 同步操作 ====================

  /**
   * 判断会话是否需要更新
   * @param local 本地会话
   * @param server 服务器会话
   * @returns 是否需要更新
   */
  private static needsUpdate(local: ChatSession, server: ChatSession): boolean {
    const fieldsToCompare = [
      "content",
      "lastUpdateTime",
      "nickname",
      "conRemark",
      "avatar",
      "wechatAccountId", // 添加wechatAccountId比较
      "aiType", // 添加aiType比较
      "phone",
      "region",
      "extendFields",
      "wechatId", // 添加wechatId比较
      "alias", // 添加alias比较
    ];

    for (const field of fieldsToCompare) {
      if (
        JSON.stringify((local as any)[field]) !==
        JSON.stringify((server as any)[field])
      ) {
        return true;
      }
    }

    // 检查config对象
    if (
      local.config.unreadCount !== server.config.unreadCount ||
      local.config.top !== server.config.top
    ) {
      return true;
    }

    return false;
  }

  /**
   * 增量同步会话数据
   * @param userId 用户ID
   * @param serverData 服务器数据
   * @param options 同步选项
   * @param options.skipDelete 是否跳过删除检查（用于分页增量同步）
   * @returns 同步结果统计
   */
  static async syncSessions(
    userId: number,
    serverData: {
      friends?: ContractData[];
      groups?: weChatGroup[];
    },
    options?: {
      skipDelete?: boolean; // 是否跳过删除检查（用于分页增量同步）
    },
  ): Promise<{
    added: number;
    updated: number;
    deleted: number;
  }> {
    return await db.transaction("rw", [db.chatSessions], async () => {
      // 1. 获取本地现有会话
      const localSessions = (await chatSessionService.findWhere(
        "userId",
        userId,
      )) as ChatSession[];
      const localSessionMap = new Map(
        localSessions.map(session => [session.serverId, session]),
      );

      // 2. 转换服务器数据为统一格式
      const serverSessions: ChatSession[] = [];

      // 处理好友会话
      if (serverData.friends) {
        const friends = serverData.friends
          .filter(f => (f.config as any)?.chat === true) // 只要开启会话的
          .map(friend => this.convertFriendToChatSession(friend, userId));
        serverSessions.push(...friends);
      }

      // 处理群聊会话
      if (serverData.groups) {
        const groups = serverData.groups
          .filter(g => (g.config as any)?.chat === true) // 只要开启会话的
          .map(group => this.convertGroupToChatSession(group, userId));
        serverSessions.push(...groups);
      }

      const serverSessionMap = new Map(
        serverSessions.map(session => [session.serverId, session]),
      );

      // 3. 计算差异
      const toAdd: ChatSession[] = [];
      const toUpdate: ChatSession[] = [];
      const toDelete: string[] = [];

      // 检查新增和更新
      for (const serverSession of serverSessions) {
        const localSession = localSessionMap.get(serverSession.serverId);

        if (!localSession) {
          toAdd.push(serverSession);
        } else {
          if (this.needsUpdate(localSession, serverSession)) {
            toUpdate.push(serverSession);
          }
        }
      }

      // 检查删除（仅在非增量同步模式下执行）
      if (!options?.skipDelete) {
        for (const localSession of localSessions) {
          if (!serverSessionMap.has(localSession.serverId)) {
            toDelete.push(localSession.serverId);
          }
        }
      }

      // 4. 执行同步操作
      let added = 0,
        updated = 0,
        deleted = 0;

      if (toAdd.length > 0) {
        await this.batchAddSessions(toAdd);
        added = toAdd.length;
      }

      if (toUpdate.length > 0) {
        await this.batchUpdateSessions(toUpdate);
        updated = toUpdate.length;
      }

      if (toDelete.length > 0) {
        await this.batchDeleteSessions(userId, toDelete);
        deleted = toDelete.length;
      }

      console.log(`会话同步完成: 新增${added}, 更新${updated}, 删除${deleted}`);

      // 5. 触发回调通知组件
      await this.triggerCallbacks(userId);

      return { added, updated, deleted };
    });
  }

  // ==================== 增删改操作 ====================

  /**
   * 批量新增会话
   * @param sessions 会话列表
   */
  private static async batchAddSessions(sessions: ChatSession[]) {
    if (sessions.length === 0) return;

    const dataToInsert = sessions.map(session => ({
      ...session,
      serverId: `${session.type}_${session.id}`,
    }));

    try {
      await db.chatSessions.bulkAdd(dataToInsert);
    } catch (error) {
      if (error instanceof Dexie.BulkError) {
        console.warn(
          `批量新增会话时检测到重复主键，切换为 bulkPut 以覆盖更新。错误详情:`,
          error,
        );
        await db.chatSessions.bulkPut(dataToInsert);
      } else {
        throw error;
      }
    }
  }

  /**
   * 批量更新会话
   * @param sessions 会话列表
   */
  private static async batchUpdateSessions(sessions: ChatSession[]) {
    if (sessions.length === 0) return;

    for (const session of sessions) {
      const serverId = `${session.type}_${session.id}`;
      await chatSessionService.update(serverId, session);
    }
  }

  /**
   * 批量删除会话
   * @param userId 用户ID
   * @param sessionIds 会话ID列表
   */
  private static async batchDeleteSessions(
    userId: number,
    serverIds: string[],
  ) {
    if (serverIds.length === 0) return;

    const serverIdSet = new Set(serverIds);

    await db.chatSessions
      .where("userId")
      .equals(userId)
      .and(session => serverIdSet.has(session.serverId))
      .delete();
  }

  /**
   * 新增单个会话
   * @param session 会话数据
   */
  static async addSession(session: ChatSession): Promise<void> {
    try {
      const dataToInsert = {
        ...session,
        serverId: `${session.type}_${session.id}`,
        sortKey: this.generateSortKey(session),
      };

      await db.chatSessions.add(dataToInsert);
      await this.triggerCallbacks(session.userId);
    } catch (error) {
      console.error("新增会话失败:", error);
      throw error;
    }
  }

  /**
   * 更新单个会话
   * @param session 会话数据
   */
  static async updateSession(
    session: Partial<ChatSession> & {
      userId: number;
      id: number;
      type: "friend" | "group";
    },
  ): Promise<void> {
    try {
      const serverId = `${session.type}_${session.id}`;
      const updateData = {
        ...session,
        sortKey: this.generateSortKey(session),
      };

      await chatSessionService.update(serverId, updateData);
      await this.triggerCallbacks(session.userId);
    } catch (error) {
      console.error("更新会话失败:", error);
      throw error;
    }
  }

  /**
   * 删除单个会话
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   */
  static async deleteSession(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      await chatSessionService.delete(serverId);
      await this.triggerCallbacks(userId);
    } catch (error) {
      console.error("删除会话失败:", error);
      throw error;
    }
  }

  // ==================== 特殊操作 ====================

  /**
   * 从联系人数据构建会话（发起新会话时使用）
   * @param contact 联系人数据（好友或群聊）
   * @param userId 用户ID
   * @returns 会话数据
   */
  static buildSessionFromContact(
    contact: ContractData | weChatGroup,
    userId: number,
  ): ChatSession {
    const isGroup = "chatroomId" in contact;

    if (isGroup) {
      // 群聊
      return this.convertGroupToChatSession(contact as weChatGroup, userId);
    } else {
      // 好友
      return this.convertFriendToChatSession(contact as ContractData, userId);
    }
  }

  /**
   * 更新会话的最新消息（WebSocket消息到达时使用）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param message 消息内容
   */
  static async updateSessionOnNewMessage(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
    message: {
      content: string;
    },
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      const session = (await chatSessionService.findByPrimaryKey(
        serverId,
      )) as ChatSession;

      if (session) {
        const updatedSession = {
          ...session,
          config: {
            ...session.config,
            unreadCount: (session.config?.unreadCount || 0) + 1,
          },
          content: message.content,
          lastUpdateTime: new Date().toISOString(),
        };

        updatedSession.sortKey = this.generateSortKey(updatedSession);

        await chatSessionService.update(serverId, updatedSession);
        await this.triggerCallbacks(userId);
      }
    } catch (error) {
      console.error("更新会话消息失败:", error);
    }
  }

  /**
   * 标记会话为已读
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   */
  static async markAsRead(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      const session = (await chatSessionService.findByPrimaryKey(
        serverId,
      )) as ChatSession;

      if (session && session.config.unreadCount > 0) {
        await chatSessionService.update(serverId, {
          config: {
            ...session.config,
            unreadCount: 0,
          },
        });
        // 不触发回调，因为只是已读状态变化，不需要重新排序
      }
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  }

  /**
   * 置顶/取消置顶会话
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param isPinned 是否置顶
   */
  static async togglePin(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
    isPinned: number,
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      const session = (await chatSessionService.findByPrimaryKey(
        serverId,
      )) as ChatSession;

      if (session) {
        const updatedSession = {
          ...session,
          config: {
            ...session.config,
            top: isPinned,
          },
        };

        updatedSession.sortKey = this.generateSortKey(updatedSession);

        await chatSessionService.update(serverId, updatedSession);
        await this.triggerCallbacks(userId);
      }
    } catch (error) {
      console.error("置顶操作失败:", error);
      throw error;
    }
  }

  /**
   * 更新会话时间（用于联系人点击时更新）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param newTime 新的时间
   */
  static async updateSessionTime(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
    newTime: string,
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      const session = (await chatSessionService.findByPrimaryKey(
        serverId,
      )) as ChatSession;

      if (session) {
        const updatedSession = {
          ...session,
          lastUpdateTime: newTime,
        };

        // 重新生成 sortKey（因为时间变了，排序会改变）
        updatedSession.sortKey = this.generateSortKey(updatedSession);

        await chatSessionService.update(serverId, updatedSession);
        await this.triggerCallbacks(userId);
      }
    } catch (error) {
      console.error("更新会话时间失败:", error);
      throw error;
    }
  }

  /**
   * 更新会话备注
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param remark 新备注
   */
  static async updateRemark(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
    remark: string,
  ): Promise<void> {
    try {
      const serverId = `${type}_${sessionId}`;
      const session = (await chatSessionService.findByPrimaryKey(
        serverId,
      )) as ChatSession;

      if (session) {
        const updatedSession = {
          ...session,
          conRemark: remark,
        };

        updatedSession.sortKey = this.generateSortKey(updatedSession);

        await chatSessionService.update(serverId, updatedSession);
        await this.triggerCallbacks(userId);
      }
    } catch (error) {
      console.error("更新备注失败:", error);
      throw error;
    }
  }

  // ==================== 批量操作优化 ====================

  private static updateBuffer: Array<{
    userId: number;
    sessionId: number;
    type: "friend" | "group";
    updates: Partial<ChatSession>;
  }> = [];
  private static bufferTimer: NodeJS.Timeout | null = null;

  /**
   * 批量更新会话（用于WebSocket消息批处理）
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param updates 更新内容
   */
  static batchUpdateSession(
    userId: number,
    sessionId: number,
    type: "friend" | "group",
    updates: Partial<ChatSession>,
  ): void {
    this.updateBuffer.push({ userId, sessionId, type, updates });

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }

    this.bufferTimer = setTimeout(async () => {
      await this.flushUpdateBuffer();
    }, 100); // 100ms批量处理
  }

  /**
   * 刷新更新缓冲区
   */
  private static async flushUpdateBuffer() {
    if (this.updateBuffer.length === 0) return;

    const buffer = [...this.updateBuffer];
    this.updateBuffer = [];

    try {
      await db.transaction("rw", [db.chatSessions], async () => {
        for (const item of buffer) {
          const serverId = `${item.type}_${item.sessionId}`;
          const session = (await chatSessionService.findByPrimaryKey(
            serverId,
          )) as ChatSession;

          if (session) {
            const updatedSession = {
              ...session,
              ...item.updates,
            };

            updatedSession.sortKey = this.generateSortKey(updatedSession);

            await chatSessionService.update(serverId, updatedSession);
          }
        }
      });

      // 触发回调
      const userIds = new Set(buffer.map(item => item.userId));
      for (const userId of userIds) {
        await this.triggerCallbacks(userId);
      }
    } catch (error) {
      console.error("批量更新会话失败:", error);
    }
  }

  // ==================== 清理操作 ====================

  /**
   * 清空指定用户的所有会话
   * @param userId 用户ID
   */
  static async clearUserSessions(userId: number): Promise<void> {
    try {
      await db.chatSessions.where("userId").equals(userId).delete();
      console.log(`用户 ${userId} 的会话数据已清空`);
    } catch (error) {
      console.error("清空用户会话失败:", error);
    }
  }

  /**
   * 根据联系人ID获取会话
   * @param userId 用户ID
   * @param contactId 联系人ID
   * @param type 类型（friend/group）
   */
  static async getSessionByContactId(
    userId: number,
    contactId: number,
    type: "friend" | "group",
  ): Promise<ChatSession | null> {
    try {
      const serverId = `${type}_${contactId}`;
      const session = await chatSessionService.findByPrimaryKey(serverId);
      return session as ChatSession | null;
    } catch (error) {
      console.error("根据联系人ID获取会话失败:", error);
      return null;
    }
  }

  /**
   * 创建新会话
   * @param userId 用户ID
   * @param session 会话数据
   */
  static async createSession(
    userId: number,
    session: ChatSession,
  ): Promise<void> {
    try {
      // 生成 sortKey
      const sessionWithSortKey = {
        ...session,
        sortKey: this.generateSortKey(session),
      };

      await chatSessionService.create(sessionWithSortKey);
      await this.triggerCallbacks(userId);
    } catch (error) {
      console.error("创建会话失败:", error);
      throw error;
    }
  }
}
