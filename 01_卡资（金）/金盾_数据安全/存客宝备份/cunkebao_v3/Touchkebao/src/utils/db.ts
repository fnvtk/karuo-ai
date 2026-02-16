/**
 * 数据库工具类 - 使用serverId作为主键的优化架构
 *
 * 架构设计：
 * 1. 使用serverId作为数据库主键，直接对应接口返回的id字段
 * 2. 保留原始的id字段，用于存储接口数据的完整性
 * 3. 添加userId字段实现多用户数据隔离
 * 4. 统一会话表和联系人表，兼容好友和群聊
 *
 * 优势：
 * - 直接使用服务器ID作为主键，避免ID冲突
 * - 通过userId实现多用户数据隔离
 * - 统一的会话和联系人表结构，兼容好友和群聊
 * - 支持复合索引，提高查询性能
 * - 支持用户登录记录和自动清理
 */

import Dexie, { Table } from "dexie";
import { getPersistedData, PERSIST_KEYS } from "@/store/persistUtils";
const DB_NAME_PREFIX = "CunkebaoDatabase";

// ==================== 用户登录记录 ====================
export interface UserLoginRecord {
  serverId: string; // 主键: user_${userId}
  userId: number; // 用户ID
  lastLoginTime: string; // 最后登录时间
  loginCount: number; // 登录次数
  createTime: string; // 首次登录时间
  lastActiveTime: string; // 最后活跃时间
}

// ==================== 统一会话表（兼容好友和群聊） ====================
export interface ChatSession {
  serverId: string; // 主键
  userId: number; // 用户ID（数据隔离）
  id: number; // 原始ID
  type: "friend" | "group"; // 类型：好友或群聊

  // 通用字段
  wechatAccountId: number; // 所属客服账号
  nickname: string; // 显示名称
  conRemark?: string; // 备注名
  avatar: string; // 头像
  content: string; // 最新消息内容
  lastUpdateTime: string; // 最后更新时间
  aiType?: number; // AI类型（0=普通，1=AI辅助）
  config: {
    unreadCount: number; // 未读数量
    top: number; // 是否置顶（1=置顶，0=非置顶）
  };
  sortKey: string; // 预计算排序键

  // 好友特有字段（type='friend'时有效）
  wechatFriendId?: number; // 好友ID
  wechatId?: string; // 微信号
  alias?: string; // 别名

  // 群聊特有字段（type='group'时有效）
  chatroomId?: string; // 群聊ID
  chatroomOwner?: string; // 群主
  selfDisplayName?: string; // 群内昵称
  notice?: string; // 群公告
  phone?: string; // 联系人电话
  region?: string; // 联系人地区
  extendFields?: string; // 扩展字段（JSON 字符串）
}

// ==================== 统一联系人表（兼容好友和群聊） ====================
export interface Contact {
  serverId: string; // 主键
  userId: number; // 用户ID（数据隔离）
  id: number; // 原始ID
  type: "friend" | "group"; // 类型：好友或群聊

  // 通用字段
  wechatAccountId: number; // 所属客服账号
  nickname: string; // 显示名称
  conRemark?: string; // 备注名
  avatar: string; // 头像
  lastUpdateTime: string; // 最后更新时间
  aiType?: number; // AI类型（0=普通，1=AI辅助）
  config?: any; // 配置信息
  sortKey: string; // 预计算排序键
  searchKey: string; // 预计算搜索键

  // 好友特有字段（type='friend'时有效）
  wechatFriendId?: number; // 好友ID
  wechatId?: string; // 微信号
  alias?: string; // 别名
  gender?: number; // 性别
  groupId?: number; // 标签ID（分组）
  region?: string; // 地区
  signature?: string; // 个性签名
  phone?: string; // 手机号
  quanPin?: string; // 全拼
  extendFields?: string; // 扩展字段（JSON 字符串）

  // 群聊特有字段（type='group'时有效）
  chatroomId?: string; // 群聊ID
  chatroomOwner?: string; // 群主
  selfDisplayName?: string; // 群内昵称
  notice?: string; // 群公告
  memberCount?: number; // 群成员数量
}

// ==================== 联系人标签映射表 ====================
export interface ContactLabelMap {
  serverId: string; // 主键: ${contactId}_${labelId}
  userId: number; // 用户ID（数据隔离）
  labelId: number; // 标签ID
  contactId: number; // 联系人ID
  contactType: "friend" | "group"; // 联系人类型
  sortKey: string; // 预计算排序键
  searchKey: string; // 预计算搜索键

  // 列表展示必需字段（轻量）
  avatar: string;
  nickname: string;
  conRemark?: string;
  unreadCount: number;
  lastUpdateTime: string;
}

// 数据库类
class CunkebaoDatabase extends Dexie {
  // ==================== 统一表结构 ====================
  chatSessions!: Table<ChatSession>; // 统一会话表
  contactsUnified!: Table<Contact>; // 统一联系人表
  contactLabelMap!: Table<ContactLabelMap>; // 联系人标签映射表
  userLoginRecords!: Table<UserLoginRecord>; // 用户登录记录表

  constructor(dbName: string) {
    super(dbName);

    this.version(1).stores({
      // 会话表索引：支持按用户、类型、时间、置顶等查询
      chatSessions:
        "serverId, userId, id, type, wechatAccountId, [userId+type], [userId+wechatAccountId], [userId+lastUpdateTime], [userId+aiType], sortKey, nickname, conRemark, avatar, content, lastUpdateTime, aiType, phone, region",

      // 联系人表索引：支持按用户、类型、标签、搜索等查询
      contactsUnified:
        "serverId, userId, id, type, wechatAccountId, [userId+type], [userId+wechatAccountId], [userId+aiType], sortKey, searchKey, nickname, conRemark, avatar, lastUpdateTime, groupId, aiType, phone, region",

      // 联系人标签映射表索引：支持按用户、标签、联系人、类型查询
      contactLabelMap:
        "serverId, userId, labelId, contactId, contactType, [userId+labelId], [userId+contactId], [userId+labelId+sortKey], sortKey, searchKey, avatar, nickname, conRemark, unreadCount, lastUpdateTime",

      // 用户登录记录表索引：支持按用户ID、登录时间查询
      userLoginRecords:
        "serverId, userId, lastLoginTime, loginCount, createTime, lastActiveTime",
    });

    this.version(2)
      .stores({
        chatSessions:
          "serverId, userId, id, type, wechatAccountId, [userId+type], [userId+wechatAccountId], [userId+lastUpdateTime], [userId+aiType], sortKey, nickname, conRemark, avatar, content, lastUpdateTime, aiType, phone, region, extendFields",
        contactsUnified:
          "serverId, userId, id, type, wechatAccountId, [userId+type], [userId+wechatAccountId], [userId+aiType], sortKey, searchKey, nickname, conRemark, avatar, lastUpdateTime, groupId, aiType, phone, region, extendFields",
        contactLabelMap:
          "serverId, userId, labelId, contactId, contactType, [userId+labelId], [userId+contactId], [userId+labelId+sortKey], sortKey, searchKey, avatar, nickname, conRemark, unreadCount, lastUpdateTime",
        userLoginRecords:
          "serverId, userId, lastLoginTime, loginCount, createTime, lastActiveTime",
      })
      .upgrade(async tx => {
        await tx
          .table("chatSessions")
          .toCollection()
          .modify(session => {
            if (!("extendFields" in session) || session.extendFields == null) {
              session.extendFields = "{}";
            } else if (typeof session.extendFields !== "string") {
              session.extendFields = JSON.stringify(session.extendFields);
            }
          });

        await tx
          .table("contactsUnified")
          .toCollection()
          .modify(contact => {
            if (!("extendFields" in contact) || contact.extendFields == null) {
              contact.extendFields = "{}";
            } else if (typeof contact.extendFields !== "string") {
              contact.extendFields = JSON.stringify(contact.extendFields);
            }
          });
      });
  }
}

class DatabaseManager {
  private currentDb: CunkebaoDatabase | null = null;
  private currentUserId: number | null = null;

  private getDatabaseName(userId: number) {
    return `${DB_NAME_PREFIX}_${userId}`;
  }

  private async openDatabase(dbName: string) {
    const instance = new CunkebaoDatabase(dbName);
    await instance.open();
    return instance;
  }

  async ensureDatabase(userId: number) {
    if (userId === undefined || userId === null) {
      throw new Error("Invalid userId provided for database initialization");
    }

    if (
      this.currentDb &&
      this.currentUserId === userId &&
      this.currentDb.isOpen()
    ) {
      return this.currentDb;
    }

    await this.closeCurrentDatabase();

    const dbName = this.getDatabaseName(userId);
    this.currentDb = await this.openDatabase(dbName);
    this.currentUserId = userId;

    return this.currentDb;
  }

  getCurrentDatabase(): CunkebaoDatabase {
    if (!this.currentDb) {
      throw new Error("Database has not been initialized for the current user");
    }
    return this.currentDb;
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  isInitialized(): boolean {
    return !!this.currentDb && this.currentDb.isOpen();
  }

  async closeCurrentDatabase() {
    if (this.currentDb) {
      try {
        this.currentDb.close();
      } catch (error) {
        console.warn("Failed to close current database:", error);
      }
      this.currentDb = null;
    }
    this.currentUserId = null;
  }
}

export const databaseManager = new DatabaseManager();

let pendingDatabaseRestore: Promise<CunkebaoDatabase | null> | null = null;

async function restoreDatabaseFromPersistedState() {
  if (typeof window === "undefined") {
    return null;
  }

  const persistedData = getPersistedData<string | Record<string, any>>(
    PERSIST_KEYS.USER_STORE,
    "localStorage",
  );

  if (!persistedData) {
    return null;
  }

  let parsed: any = persistedData;

  if (typeof persistedData === "string") {
    try {
      parsed = JSON.parse(persistedData);
    } catch (error) {
      console.warn("Failed to parse persisted user-store value:", error);
      return null;
    }
  }

  const state = parsed?.state ?? parsed;
  const userId = state?.user?.id;

  if (!userId) {
    return null;
  }

  try {
    return await databaseManager.ensureDatabase(userId);
  } catch (error) {
    console.warn("Failed to initialize database from persisted user:", error);
    return null;
  }
}

export async function initializeDatabaseFromPersistedUser() {
  if (databaseManager.isInitialized()) {
    return databaseManager.getCurrentDatabase();
  }

  if (!pendingDatabaseRestore) {
    pendingDatabaseRestore = restoreDatabaseFromPersistedState().finally(() => {
      pendingDatabaseRestore = null;
    });
  }

  return pendingDatabaseRestore;
}

const dbProxy = new Proxy({} as CunkebaoDatabase, {
  get(_target, prop: string | symbol) {
    const currentDb = databaseManager.getCurrentDatabase();
    const value = (currentDb as any)[prop];
    if (typeof value === "function") {
      return value.bind(currentDb);
    }
    return value;
  },
});

export const db = dbProxy;

// 简单的数据库操作类
export class DatabaseService<T> {
  constructor(private readonly tableAccessor: () => Table<T>) {}

  private get table(): Table<T> {
    return this.tableAccessor();
  }

  // 基础 CRUD 操作 - 使用serverId作为主键
  async create(data: Omit<T, "serverId">): Promise<string | number> {
    return await this.table.add(this.prepareDataForWrite(data) as T);
  }

  // 创建数据（直接使用接口数据）
  // 接口数据的id字段直接作为serverId主键，原id字段保留
  async createWithServerId(data: any): Promise<string | number> {
    const dataToInsert = this.prepareDataForWrite({
      ...data,
      serverId: data.id, // 使用接口的id作为serverId主键
      phone: data.phone ?? "",
      region: data.region ?? "",
    });
    return await this.table.add(dataToInsert as T);
  }

  // 根据原始ID查询（用户友好的查询方法）
  async findById(id: string | number): Promise<T | undefined> {
    return await this.table.where("id").equals(id).first();
  }

  // 根据serverId查询（内部主键查询）
  async findByPrimaryKey(serverId: string | number): Promise<T | undefined> {
    return await this.table.get(serverId);
  }

  async findAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  async update(serverId: string | number, data: Partial<T>): Promise<number> {
    return await this.table.update(
      serverId,
      this.prepareDataForWrite(data) as any,
    );
  }

  async updateMany(
    dataList: { serverId: string | number; data: Partial<T> }[],
  ): Promise<number> {
    return await this.table.bulkUpdate(
      dataList.map(item => ({
        key: item.serverId,
        changes: this.prepareDataForWrite(item.data) as any,
      })),
    );
  }

  async createMany(
    dataList: Omit<T, "serverId">[],
  ): Promise<(string | number)[]> {
    const processed = dataList.map(item => this.prepareDataForWrite(item));
    return await this.table.bulkAdd(processed as T[], { allKeys: true });
  }

  // 批量创建数据（直接使用接口数据）
  // 接口数据的id字段直接作为serverId主键
  async createManyWithServerId(dataList: any[]): Promise<(string | number)[]> {
    // 检查是否存在重复的serverId
    const serverIds = dataList.map(item => item.id);
    const existingData = await this.table
      .where("serverId")
      .anyOf(serverIds)
      .toArray();
    const existingServerIds = new Set(
      existingData.map((item: any) => item.serverId),
    );

    // 过滤掉已存在的数据
    const newData = dataList.filter(item => !existingServerIds.has(item.id));

    if (newData.length === 0) {
      // console.log("所有数据都已存在，跳过插入");
      return [];
    }

    const processedData = newData.map(item =>
      this.prepareDataForWrite({
        ...item,
        serverId: item.id, // 使用接口的id作为serverId主键
        phone: item.phone ?? "",
        region: item.region ?? "",
      }),
    );

    return await this.table.bulkAdd(processedData as T[], { allKeys: true });
  }

  async delete(serverId: string | number): Promise<void> {
    await this.table.delete(serverId);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }

  // 条件查询
  async findWhere(field: keyof T, value: any): Promise<T[]> {
    return await this.table
      .where(field as string)
      .equals(value)
      .toArray();
  }

  // 根据服务器ID查询（兼容性方法）
  async findByServerId(serverId: any): Promise<T | undefined> {
    return await this.table.get(serverId);
  }

  // 根据原始ID批量查询
  async findByIds(ids: (string | number)[]): Promise<T[]> {
    return await this.table.where("id").anyOf(ids).toArray();
  }

  // 多值查询（IN 查询）
  async findWhereIn(field: keyof T, values: any[]): Promise<T[]> {
    return await this.table
      .where(field as string)
      .anyOf(values)
      .toArray();
  }

  // 范围查询
  async findWhereBetween(field: keyof T, min: any, max: any): Promise<T[]> {
    return await this.table
      .where(field as string)
      .between(min, max)
      .toArray();
  }

  // 模糊查询（以指定字符串开头）
  async findWhereStartsWith(field: keyof T, prefix: string): Promise<T[]> {
    return await this.table
      .where(field as string)
      .startsWith(prefix)
      .toArray();
  }

  // 不等于查询
  async findWhereNot(field: keyof T, value: any): Promise<T[]> {
    return await this.table
      .where(field as string)
      .notEqual(value)
      .toArray();
  }

  // 大于查询
  async findWhereGreaterThan(field: keyof T, value: any): Promise<T[]> {
    return await this.table
      .where(field as string)
      .above(value)
      .toArray();
  }

  // 小于查询
  async findWhereLessThan(field: keyof T, value: any): Promise<T[]> {
    return await this.table
      .where(field as string)
      .below(value)
      .toArray();
  }

  // 复合条件查询
  async findWhereMultiple(
    conditions: {
      field: keyof T;
      operator:
        | "equals"
        | "notEqual"
        | "above"
        | "below"
        | "aboveOrEqual"
        | "belowOrEqual"
        | "startsWith"
        | "anyOf"
        | "notIn"
        | "between"
        | "contains";
      value: any;
      value2?: any; // 用于 between 操作符
    }[],
  ): Promise<T[]> {
    let collection = this.table.toCollection();

    for (const condition of conditions) {
      const { field, operator, value, value2 } = condition;
      collection = collection.and(item => {
        const fieldValue = (item as any)[field];
        switch (operator) {
          case "equals":
            return fieldValue === value;
          case "notEqual":
            return fieldValue !== value;
          case "above":
            return fieldValue > value;
          case "below":
            return fieldValue < value;
          case "aboveOrEqual":
            return fieldValue >= value;
          case "belowOrEqual":
            return fieldValue <= value;
          case "startsWith":
            return (
              typeof fieldValue === "string" && fieldValue.startsWith(value)
            );
          case "contains":
            return typeof fieldValue === "string" && fieldValue.includes(value);
          case "anyOf":
            return Array.isArray(value) && value.includes(fieldValue);
          case "notIn":
            return Array.isArray(value) && !value.includes(fieldValue);
          case "between":
            return fieldValue >= value && fieldValue <= (value2 ?? value);
          default:
            return true;
        }
      });
    }

    return await collection.toArray();
  }

  // 分页查询
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const total = await this.table.count();
    const data = await this.table.offset(offset).limit(limit).toArray();

    return { data, total, page, limit };
  }

  // 排序查询
  async findAllSorted(
    field: keyof T,
    direction: "asc" | "desc" = "asc",
  ): Promise<T[]> {
    const collection = this.table.orderBy(field as string);
    return direction === "desc"
      ? await collection.reverse().toArray()
      : await collection.toArray();
  }

  // 统计
  async count(): Promise<number> {
    return await this.table.count();
  }

  // 条件统计
  async countWhere(field: keyof T, value: any): Promise<number> {
    return await this.table
      .where(field as string)
      .equals(value)
      .count();
  }

  private prepareDataForWrite(data: any) {
    if (!data || typeof data !== "object") {
      return data;
    }

    const prepared = { ...data };

    if ("extendFields" in prepared) {
      const value = prepared.extendFields;
      if (typeof value === "string" && value.trim() !== "") {
        prepared.extendFields = value;
      } else if (value && typeof value === "object") {
        prepared.extendFields = JSON.stringify(value);
      } else {
        prepared.extendFields = "{}";
      }
    }

    return prepared;
  }
}

// 创建统一表的服务实例
export const chatSessionService = new DatabaseService<ChatSession>(
  () => databaseManager.getCurrentDatabase().chatSessions,
);
export const contactUnifiedService = new DatabaseService<Contact>(
  () => databaseManager.getCurrentDatabase().contactsUnified,
);
export const contactLabelMapService = new DatabaseService<ContactLabelMap>(
  () => databaseManager.getCurrentDatabase().contactLabelMap,
);
export const userLoginRecordService = new DatabaseService<UserLoginRecord>(
  () => databaseManager.getCurrentDatabase().userLoginRecords,
);

// 默认导出数据库实例
export default db;
