/**
 * 数据索引工具类
 * 用于快速构建和查询按账号ID分组的数据索引
 *
 * 性能优化：
 * - 使用Map索引，O(1)时间复杂度获取数据
 * - 支持增量更新，避免全量重建
 * - 支持批量构建，一次性处理大量数据
 */

import { ChatSession } from "@/utils/db";
import { Contact } from "@/utils/db";

/**
 * 数据索引管理器
 * 用于管理会话和联系人的索引结构
 */
export class DataIndexManager {
  // 会话索引：accountId → ChatSession[]
  private sessionIndex: Map<number, ChatSession[]>;

  // 联系人索引：accountId → Contact[]
  private contactIndex: Map<number, Contact[]>;

  constructor() {
    this.sessionIndex = new Map();
    this.contactIndex = new Map();
  }

  /**
   * 构建索引（数据加载时调用）
   * 时间复杂度：O(n)，n为数据总量，只执行一次
   *
   * @param sessions 会话列表
   * @param contacts 联系人列表
   */
  buildIndexes(sessions: ChatSession[], contacts: Contact[]): void {
    // 清空现有索引
    this.sessionIndex.clear();
    this.contactIndex.clear();

    // 构建会话索引
    sessions.forEach(session => {
      const accountId = session.wechatAccountId;
      if (!this.sessionIndex.has(accountId)) {
        this.sessionIndex.set(accountId, []);
      }
      this.sessionIndex.get(accountId)!.push(session);
    });

    // 构建联系人索引
    contacts.forEach(contact => {
      const accountId = contact.wechatAccountId;
      if (!this.contactIndex.has(accountId)) {
        this.contactIndex.set(accountId, []);
      }
      this.contactIndex.get(accountId)!.push(contact);
    });
  }

  /**
   * 获取指定账号的会话列表
   * 时间复杂度：O(1)
   *
   * @param accountId 账号ID，0表示"全部"
   * @returns 会话列表
   */
  getSessionsByAccount(accountId: number): ChatSession[] {
    if (accountId === 0) {
      // "全部"：需要合并所有账号的数据
      const allSessions: ChatSession[] = [];
      this.sessionIndex.forEach(sessions => {
        allSessions.push(...sessions);
      });
      return allSessions;
    }

    return this.sessionIndex.get(accountId) || [];
  }

  /**
   * 获取指定账号的联系人列表
   * 时间复杂度：O(1)
   *
   * @param accountId 账号ID，0表示"全部"
   * @returns 联系人列表
   */
  getContactsByAccount(accountId: number): Contact[] {
    if (accountId === 0) {
      // "全部"：需要合并所有账号的数据
      const allContacts: Contact[] = [];
      this.contactIndex.forEach(contacts => {
        allContacts.push(...contacts);
      });
      return allContacts;
    }

    return this.contactIndex.get(accountId) || [];
  }

  /**
   * 增量更新：添加会话到索引
   * 时间复杂度：O(1)
   *
   * @param session 会话数据
   */
  addSession(session: ChatSession): void {
    const accountId = session.wechatAccountId;
    if (!this.sessionIndex.has(accountId)) {
      this.sessionIndex.set(accountId, []);
    }
    this.sessionIndex.get(accountId)!.push(session);
  }

  /**
   * 增量更新：添加联系人到索引
   * 时间复杂度：O(1)
   *
   * @param contact 联系人数据
   */
  addContact(contact: Contact): void {
    const accountId = contact.wechatAccountId;
    if (!this.contactIndex.has(accountId)) {
      this.contactIndex.set(accountId, []);
    }
    this.contactIndex.get(accountId)!.push(contact);
  }

  /**
   * 更新会话（如果已存在）
   * 时间复杂度：O(n)，n为当前账号的会话数量
   *
   * @param session 会话数据
   */
  updateSession(session: ChatSession): void {
    const accountId = session.wechatAccountId;
    const sessions = this.sessionIndex.get(accountId);
    if (sessions) {
      const index = sessions.findIndex(
        s => s.id === session.id && s.type === session.type,
      );
      if (index !== -1) {
        sessions[index] = session;
      } else {
        // 不存在则添加
        this.addSession(session);
      }
    } else {
      // 账号不存在，创建新索引
      this.addSession(session);
    }
  }

  /**
   * 更新联系人（如果已存在）
   * 时间复杂度：O(n)，n为当前账号的联系人数量
   *
   * @param contact 联系人数据
   */
  updateContact(contact: Contact): void {
    const accountId = contact.wechatAccountId;
    const contacts = this.contactIndex.get(accountId);
    if (contacts) {
      const index = contacts.findIndex(c => c.id === contact.id);
      if (index !== -1) {
        contacts[index] = contact;
      } else {
        // 不存在则添加
        this.addContact(contact);
      }
    } else {
      // 账号不存在，创建新索引
      this.addContact(contact);
    }
  }

  /**
   * 删除会话
   * 时间复杂度：O(n)，n为当前账号的会话数量
   *
   * @param sessionId 会话ID
   * @param type 会话类型
   * @param accountId 账号ID
   */
  removeSession(
    sessionId: number,
    type: ChatSession["type"],
    accountId: number,
  ): void {
    const sessions = this.sessionIndex.get(accountId);
    if (sessions) {
      const index = sessions.findIndex(
        s => s.id === sessionId && s.type === type,
      );
      if (index !== -1) {
        sessions.splice(index, 1);
      }
    }
  }

  /**
   * 删除联系人
   * 时间复杂度：O(n)，n为当前账号的联系人数量
   *
   * @param contactId 联系人ID
   * @param accountId 账号ID
   */
  removeContact(contactId: number, accountId: number): void {
    const contacts = this.contactIndex.get(accountId);
    if (contacts) {
      const index = contacts.findIndex(c => c.id === contactId);
      if (index !== -1) {
        contacts.splice(index, 1);
      }
    }
  }

  /**
   * 清空所有索引
   */
  clear(): void {
    this.sessionIndex.clear();
    this.contactIndex.clear();
  }

  /**
   * 获取索引统计信息（用于调试和监控）
   */
  getStats(): {
    sessionCount: number;
    contactCount: number;
    accountCount: number;
    sessionsByAccount: Map<number, number>;
    contactsByAccount: Map<number, number>;
  } {
    let sessionCount = 0;
    let contactCount = 0;
    const sessionsByAccount = new Map<number, number>();
    const contactsByAccount = new Map<number, number>();

    this.sessionIndex.forEach((sessions, accountId) => {
      sessionCount += sessions.length;
      sessionsByAccount.set(accountId, sessions.length);
    });

    this.contactIndex.forEach((contacts, accountId) => {
      contactCount += contacts.length;
      contactsByAccount.set(accountId, contacts.length);
    });

    const accountCount = new Set([
      ...this.sessionIndex.keys(),
      ...this.contactIndex.keys(),
    ]).size;

    return {
      sessionCount,
      contactCount,
      accountCount,
      sessionsByAccount,
      contactsByAccount,
    };
  }

  /**
   * 获取所有账号ID
   */
  getAllAccountIds(): number[] {
    const accountIds = new Set<number>();
    this.sessionIndex.forEach((_, accountId) => {
      accountIds.add(accountId);
    });
    this.contactIndex.forEach((_, accountId) => {
      accountIds.add(accountId);
    });
    return Array.from(accountIds);
  }

  /**
   * 检查索引是否为空
   */
  isEmpty(): boolean {
    return this.sessionIndex.size === 0 && this.contactIndex.size === 0;
  }
}

/**
 * 创建数据索引管理器实例
 */
export function createDataIndexManager(): DataIndexManager {
  return new DataIndexManager();
}

/**
 * 全局单例（可选，如果需要全局共享索引）
 */
let globalIndexManager: DataIndexManager | null = null;

/**
 * 获取全局数据索引管理器
 */
export function getGlobalDataIndexManager(): DataIndexManager {
  if (!globalIndexManager) {
    globalIndexManager = new DataIndexManager();
  }
  return globalIndexManager;
}

/**
 * 重置全局数据索引管理器
 */
export function resetGlobalDataIndexManager(): void {
  globalIndexManager = null;
}
