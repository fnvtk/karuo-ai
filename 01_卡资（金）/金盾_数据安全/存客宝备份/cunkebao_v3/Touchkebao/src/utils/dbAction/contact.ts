import { Contact, contactUnifiedService } from "@/utils/db";
import { ContactGroupByLabel } from "@/pages/pc/ckbox/data";

/**
 * 联系人数据管理器
 * 负责联系人相关的数据库操作和业务逻辑
 */
export class ContactManager {
  /**
   * 获取用户的所有联系人
   */
  static async getUserContacts(userId: number): Promise<Contact[]> {
    try {
      const contacts = await contactUnifiedService.findWhere("userId", userId);
      return contacts;
    } catch (error) {
      console.error("获取用户联系人失败:", error);
      return [];
    }
  }

  /**
   * 根据客服ID获取联系人
   */
  static async getContactsByCustomer(
    userId: number,
    customerId: number,
  ): Promise<Contact[]> {
    try {
      const contacts = await contactUnifiedService.findWhereMultiple([
        { field: "userId", operator: "equals", value: userId },
        { field: "wechatAccountId", operator: "equals", value: customerId },
      ]);
      return contacts;
    } catch (error) {
      console.error("根据客服获取联系人失败:", error);
      return [];
    }
  }

  /**
   * 搜索联系人
   * 支持搜索昵称、备注名、微信号
   */
  static async searchContacts(
    userId: number,
    keyword: string,
  ): Promise<Contact[]> {
    try {
      const contacts = await contactUnifiedService.findWhere("userId", userId);
      const lowerKeyword = keyword.toLowerCase();

      return contacts.filter(contact => {
        const nickname = (contact.nickname || "").toLowerCase();
        const conRemark = (contact.conRemark || "").toLowerCase();
        const wechatId = (contact.wechatId || "").toLowerCase();
        return (
          nickname.includes(lowerKeyword) ||
          conRemark.includes(lowerKeyword) ||
          wechatId.includes(lowerKeyword)
        );
      });
    } catch (error) {
      console.error("搜索联系人失败:", error);
      return [];
    }
  }

  /**
   * 添加联系人
   */
  static async addContact(contact: Contact): Promise<void> {
    try {
      await contactUnifiedService.create(contact);
    } catch (error) {
      console.error("添加联系人失败:", error);
      throw error;
    }
  }

  /**
   * 批量添加联系人
   */
  static async addContacts(contacts: Contact[]): Promise<void> {
    try {
      await contactUnifiedService.createMany(contacts);
    } catch (error) {
      console.error("批量添加联系人失败:", error);
      throw error;
    }
  }

  /**
   * 更新联系人
   */
  static async updateContact(contact: Contact): Promise<void> {
    try {
      await contactUnifiedService.update(contact.serverId, contact);
    } catch (error) {
      console.error("更新联系人失败:", error);
      throw error;
    }
  }

  /**
   * 删除联系人
   */
  static async deleteContact(contactId: number): Promise<void> {
    try {
      // 这里需要根据实际的ID字段来删除
      // 假设contactId对应的是id字段
      const contacts = await contactUnifiedService.findWhere("id", contactId);
      if (contacts.length > 0) {
        await contactUnifiedService.delete(contacts[0].serverId);
      }
    } catch (error) {
      console.error("删除联系人失败:", error);
      throw error;
    }
  }

  /**
   * 同步联系人数据
   */
  static async syncContacts(
    userId: number,
    serverContacts: any[],
  ): Promise<void> {
    try {
      // 获取本地联系人
      const localContacts = await this.getUserContacts(userId);
      const localContactMap = new Map(localContacts.map(c => [c.serverId, c]));

      // 处理服务器联系人
      const contactsToAdd: Contact[] = [];
      const contactsToUpdate: Contact[] = [];

      for (const serverContact of serverContacts) {
        const localContact = localContactMap.get(serverContact.serverId);

        if (!localContact) {
          // 新增联系人
          contactsToAdd.push({
            ...serverContact,
            userId,
            serverId: serverContact.serverId,
            lastUpdateTime: new Date().toISOString(),
          });
        } else {
          // 检查是否需要更新
          if (this.isContactChanged(localContact, serverContact)) {
            contactsToUpdate.push({
              ...serverContact,
              userId,
              serverId: serverContact.serverId,
              lastUpdateTime: new Date().toISOString(),
            });
          }
        }
      }

      // 执行数据库操作
      if (contactsToAdd.length > 0) {
        await this.addContacts(contactsToAdd);
      }

      if (contactsToUpdate.length > 0) {
        for (const contact of contactsToUpdate) {
          await this.updateContact(contact);
        }
      }

      console.log(
        `同步联系人完成: 新增${contactsToAdd.length}个, 更新${contactsToUpdate.length}个`,
      );
    } catch (error) {
      console.error("同步联系人失败:", error);
      throw error;
    }
  }

  /**
   * 检查联系人是否发生变化
   */
  private static isContactChanged(local: Contact, server: any): boolean {
    return (
      local.nickname !== server.nickname ||
      local.conRemark !== server.conRemark ||
      local.avatar !== server.avatar ||
      local.wechatAccountId !== server.wechatAccountId ||
      (local.aiType ?? 0) !== (server.aiType ?? 0) || // 添加 aiType 比较
      (local.phone ?? "") !== (server.phone ?? "") ||
      (local.region ?? "") !== (server.region ?? "") ||
      (local.extendFields ?? "{}") !== (server.extendFields ?? "{}")
    );
  }

  /**
   * 获取联系人分组列表
   */
  static async getContactGroups(
    _userId: number,
    _customerId?: number,
  ): Promise<ContactGroupByLabel[]> {
    try {
      void _userId;
      void _customerId;
      // 这里应该根据实际的标签系统来实现
      // 暂时返回空数组，实际实现需要根据标签表来查询
      return [];
    } catch (error) {
      console.error("获取联系人分组失败:", error);
      return [];
    }
  }

  /**
   * 创建联系人分组
   */
  static async createContactGroup(
    group: Omit<ContactGroupByLabel, "id">,
  ): Promise<void> {
    try {
      // 这里应该调用标签相关的API
      console.log("创建联系人分组:", group);
    } catch (error) {
      console.error("创建联系人分组失败:", error);
      throw error;
    }
  }

  /**
   * 更新联系人分组
   */
  static async updateContactGroup(group: ContactGroupByLabel): Promise<void> {
    try {
      // 这里应该调用标签相关的API
      console.log("更新联系人分组:", group);
    } catch (error) {
      console.error("更新联系人分组失败:", error);
      throw error;
    }
  }

  /**
   * 删除联系人分组
   */
  static async deleteContactGroup(groupId: number): Promise<void> {
    try {
      // 这里应该调用标签相关的API
      console.log("删除联系人分组:", groupId);
    } catch (error) {
      console.error("删除联系人分组失败:", error);
      throw error;
    }
  }

  /**
   * 根据ID获取联系人
   */
  static async getContactById(
    userId: number,
    contactId: number,
  ): Promise<Contact | null> {
    try {
      const contacts = await contactUnifiedService.findWhereMultiple([
        { field: "userId", operator: "equals", value: userId },
        { field: "id", operator: "equals", value: contactId },
      ]);
      return contacts.length > 0 ? contacts[0] : null;
    } catch (error) {
      console.error("根据ID获取联系人失败:", error);
      return null;
    }
  }

  /**
   * 根据ID和类型获取联系人（用于消息列表查询完整联系人信息）
   */
  static async getContactByIdAndType(
    userId: number,
    contactId: number,
    type: "friend" | "group",
  ): Promise<Contact | null> {
    try {
      const contacts = await contactUnifiedService.findWhereMultiple([
        { field: "userId", operator: "equals", value: userId },
        { field: "id", operator: "equals", value: contactId },
        { field: "type", operator: "equals", value: type },
      ]);
      return contacts.length > 0 ? contacts[0] : null;
    } catch (error) {
      console.error("根据ID和类型获取联系人失败:", error);
      return null;
    }
  }

  /**
   * 根据类型获取联系人
   */
  static async getContactsByType(
    userId: number,
    type: "friend" | "group",
  ): Promise<Contact[]> {
    try {
      const contacts = await contactUnifiedService.findWhereMultiple([
        { field: "userId", operator: "equals", value: userId },
        { field: "type", operator: "equals", value: type },
      ]);
      return contacts;
    } catch (error) {
      console.error("根据类型获取联系人失败:", error);
      return [];
    }
  }

  /**
   * 获取联系人统计信息
   */
  static async getContactStats(userId: number): Promise<{
    total: number;
    friends: number;
    groups: number;
    byCustomer: { [customerId: number]: number };
  }> {
    try {
      const contacts = await this.getUserContacts(userId);

      const stats = {
        total: contacts.length,
        friends: contacts.filter(c => c.type === "friend").length,
        groups: contacts.filter(c => c.type === "group").length,
        byCustomer: {} as { [customerId: number]: number },
      };

      // 按客服统计
      contacts.forEach(contact => {
        const customerId = contact.wechatAccountId;
        stats.byCustomer[customerId] = (stats.byCustomer[customerId] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("获取联系人统计失败:", error);
      return { total: 0, friends: 0, groups: 0, byCustomer: {} };
    }
  }

  /**
   * 获取指定分组的联系人数量（支持数据库级别的统计）
   */
  static async getContactCount(
    userId: number,
    type: "friend" | "group",
    customerId?: number,
    groupIds?: number[],
    exclude: boolean = false,
  ): Promise<number> {
    try {
      // console.log("getContactCount 调用参数:", {
      //   userId,
      //   type,
      //   customerId,
      //   groupIds,
      //   exclude,
      // });

      const conditions: any[] = [
        { field: "userId", operator: "equals", value: userId },
        { field: "type", operator: "equals", value: type },
      ];

      // 客服筛选
      if (customerId && customerId !== 0) {
        conditions.push({
          field: "wechatAccountId",
          operator: "equals",
          value: customerId,
        });
      }

      // 分组筛选
      if (groupIds && groupIds.length > 0) {
        if (exclude) {
          // 排除指定分组（未分组）
          conditions.push({
            field: "groupId",
            operator: "notIn",
            value: groupIds,
          });
        } else {
          // 包含指定分组
          conditions.push({
            field: "groupId",
            operator: "anyOf",
            value: groupIds,
          });
        }
      }

      // console.log("查询条件:", conditions);

      const contacts =
        await contactUnifiedService.findWhereMultiple(conditions);

      // console.log(
      //   `查询结果数量: ${contacts.length}, type: ${type}, groupIds: ${groupIds}`,
      // );

      return contacts.length;
    } catch (error) {
      console.error("获取联系人数量失败:", error);
      return 0;
    }
  }

  /**
   * 分页获取指定分组的联系人
   */
  static async getContactsByGroupPaginated(
    userId: number,
    type: "friend" | "group",
    customerId?: number,
    groupIds?: number[],
    exclude: boolean = false,
    offset: number = 0,
    limit: number = 20,
  ): Promise<Contact[]> {
    try {
      const conditions: any[] = [
        { field: "userId", operator: "equals", value: userId },
        { field: "type", operator: "equals", value: type },
      ];

      // 客服筛选
      if (customerId && customerId !== 0) {
        conditions.push({
          field: "wechatAccountId",
          operator: "equals",
          value: customerId,
        });
      }

      // 分组筛选
      if (groupIds && groupIds.length > 0) {
        if (exclude) {
          // 排除指定分组（未分组）
          conditions.push({
            field: "groupId",
            operator: "notIn",
            value: groupIds,
          });
        } else {
          // 包含指定分组
          conditions.push({
            field: "groupId",
            operator: "anyOf",
            value: groupIds,
          });
        }
      }

      // 查询数据
      const allContacts =
        await contactUnifiedService.findWhereMultiple(conditions);

      // 手动分页（IndexedDB 不支持原生的 offset/limit）
      return allContacts.slice(offset, offset + limit);
    } catch (error) {
      console.error("分页获取联系人失败:", error);
      return [];
    }
  }
}
