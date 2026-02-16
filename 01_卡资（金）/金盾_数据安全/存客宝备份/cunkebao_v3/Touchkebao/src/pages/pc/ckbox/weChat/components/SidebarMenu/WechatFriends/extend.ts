import { Contact } from "@/utils/db";
import { ContactManager } from "@/utils/dbAction";
import {
  getContactList,
  getGroupList,
  getLabelsListByGroup,
} from "@/pages/pc/ckbox/weChat/api";
import { ContactGroupByLabel } from "@/pages/pc/ckbox/data";

/**
 * 递归获取所有好友列表
 */
export const getAllFriends = async () => {
  try {
    let allFriends = [];
    let page = 1;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const result = await getContactList({ page, limit }, { debounceGap: 0 });
      const friendList = result?.list || [];

      if (
        !friendList ||
        !Array.isArray(friendList) ||
        friendList.length === 0
      ) {
        hasMore = false;
        break;
      }

      allFriends = [...allFriends, ...friendList];

      if (friendList.length === 0) {
        hasMore = false;
      } else {
        page = page + 1;
      }
    }
    return allFriends;
  } catch (error) {
    console.error("获取所有好友列表失败:", error);
    return [];
  }
};

/**
 * 递归获取所有群组列表
 */
export const getAllGroups = async () => {
  try {
    let allGroups = [];
    let page = 1;
    const limit = 500;
    let hasMore = true;

    while (hasMore) {
      const result = await getGroupList({ page, limit }, { debounceGap: 0 });
      const groupList = result?.list || [];

      if (!groupList || !Array.isArray(groupList) || groupList.length === 0) {
        hasMore = false;
        break;
      }

      allGroups = [...allGroups, ...groupList];

      if (groupList.length < limit) {
        hasMore = false;
      } else {
        // 获取最后一条数据的id作为下一次请求的page
        const lastGroup = groupList[groupList.length - 1];
        page = lastGroup.id;
      }
    }

    return allGroups;
  } catch (error) {
    console.error("获取所有群列表失败:", error);
    return [];
  }
};

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

/**
 * 将好友数据转换为统一的 Contact 格式
 */
export const convertFriendsToContacts = (
  friends: any[],
  userId: number,
): Contact[] => {
  return friends.map((friend: any) => ({
    serverId: `friend_${friend.id}`,
    userId,
    id: friend.id,
    type: "friend" as const,
    wechatAccountId: friend.wechatAccountId,
    wechatFriendId: friend.id,
    wechatId: friend.wechatId,
    nickname: friend.nickname || "",
    conRemark: friend.conRemark || "",
    avatar: friend.avatar || "",
    alias: friend.alias || "",
    gender: friend.gender,
    aiType: friend.aiType ?? 0,
    phone: friend.phone ?? "",
    region: friend.region ?? "",
    quanPin: friend.quanPin || "",
    signature: friend.signature || "",
    config: friend.config || {},
    groupId: friend.groupId, // 保留标签ID
    extendFields: serializeExtendFields(friend.extendFields),
    lastUpdateTime: new Date().toISOString(),
    sortKey: "",
    searchKey: "",
  }));
};

/**
 * 将群组数据转换为统一的 Contact 格式
 */
export const convertGroupsToContacts = (
  groups: any[],
  userId: number,
): Contact[] => {
  return groups.map((group: any) => ({
    serverId: `group_${group.id}`,
    userId,
    id: group.id,
    type: "group" as const,
    wechatAccountId: group.wechatAccountId,
    wechatId: group.chatroomId || "",
    chatroomId: group.chatroomId || "",
    chatroomOwner: group.chatroomOwner || "",
    nickname: group.nickname || "",
    conRemark: group.conRemark || "",
    avatar: group.chatroomAvatar || group.avatar || "",
    selfDisplayName: group.selfDisplyName || "",
    notice: group.notice || "",
    aiType: group.aiType ?? 0,
    phone: group.phone ?? "",
    region: group.region ?? "",
    config: group.config || {},
    groupId: group.groupId, // 保留标签ID
    extendFields: serializeExtendFields(group.extendFields),
    lastUpdateTime: new Date().toISOString(),
    sortKey: "",
    searchKey: "",
  }));
};

/**
 * 从服务器同步联系人数据
 */
export const syncContactsFromServer = async (userId: number) => {
  try {
    // 递归获取好友列表
    const friends = await getAllFriends();

    // 递归获取群组列表
    const groups = await getAllGroups();

    // 转换为统一的 Contact 格式
    const friendContacts = convertFriendsToContacts(friends, userId);
    const groupContacts = convertGroupsToContacts(groups, userId);
    const allContacts = [...friendContacts, ...groupContacts];

    // 同步到数据库
    await ContactManager.syncContacts(userId, allContacts);

    // 重新从数据库读取
    const updatedContacts = await ContactManager.getUserContacts(userId);
    return updatedContacts;
  } catch (error) {
    console.error("同步联系人失败:", error);
    throw error;
  }
};

/**
 * 根据客服筛选联系人
 */
export const filterContactsByCustomer = (
  contacts: Contact[],
  customerId: number | undefined,
): Contact[] => {
  if (!customerId || customerId === 0) {
    return contacts;
  }
  return contacts.filter(contact => contact.wechatAccountId === customerId);
};

/**
 * 获取标签列表（分组列表）
 */
export const getCountLables = async (): Promise<ContactGroupByLabel[]> => {
  try {
    const result = await getLabelsListByGroup({});
    const labelsRes = result?.list || [];

    return [
      {
        id: 0,
        groupName: "默认群分组",
        groupType: 2,
      },
      ...labelsRes,
      {
        id: 0,
        groupName: "未分组",
        groupType: 1,
      },
    ];
  } catch (error) {
    console.error("获取标签列表失败:", error);
    return [];
  }
};

/**
 * 获取分组统计信息（只获取数量，不获取详细数据）
 */
export const getGroupStatistics = async (
  userId: number,
  labels: ContactGroupByLabel[],
  customerId?: number,
): Promise<ContactGroupByLabel[]> => {
  // 分别提取好友标签和群标签的ID
  const friendGroupIds = labels
    .filter(item => item.id !== 0 && Number(item.groupType) === 1)
    .map(item => item.id);

  const chatGroupIds = labels
    .filter(item => item.id !== 0 && Number(item.groupType) === 2)
    .map(item => item.id);

  const groupedData: ContactGroupByLabel[] = [];

  for (const label of labels) {
    let count = 0;

    if (Number(label.groupType) === 1) {
      // 好友分组
      if (label.id === 0) {
        // 未分组：不属于任何好友标签的好友
        count = await ContactManager.getContactCount(
          userId,
          "friend",
          customerId,
          friendGroupIds, // 只排除好友标签
          true, // 排除已分组的
        );
      } else {
        // 指定标签的好友
        count = await ContactManager.getContactCount(
          userId,
          "friend",
          customerId,
          [label.id],
          false, // 包含指定分组
        );
      }
    } else if (Number(label.groupType) === 2) {
      // 群组分组
      if (label.id === 0) {
        // 默认群分组：不属于任何群标签的群
        count = await ContactManager.getContactCount(
          userId,
          "group",
          customerId,
          chatGroupIds, // 只排除群标签
          true, // 排除已分组的
        );
      } else {
        // 指定标签的群
        count = await ContactManager.getContactCount(
          userId,
          "group",
          customerId,
          [label.id],
          false, // 包含指定分组
        );
      }
    }

    groupedData.push({
      ...label,
      contacts: [], // 不加载数据，只返回统计信息
      count, // 添加统计数量
    });
  }

  return groupedData;
};

/**
 * 分页获取指定分组的联系人
 */
export const getContactsByGroup = async (
  userId: number,
  label: ContactGroupByLabel,
  realGroupIds: number[],
  customerId?: number,
  page: number = 1,
  pageSize: number = 20,
): Promise<Contact[]> => {
  const offset = (page - 1) * pageSize;

  if (Number(label.groupType) === 1) {
    // 好友分组
    if (label.id === 0) {
      // 未分组的好友
      return await ContactManager.getContactsByGroupPaginated(
        userId,
        "friend",
        customerId,
        realGroupIds,
        true, // 排除已分组的
        offset,
        pageSize,
      );
    } else {
      // 指定标签的好友
      return await ContactManager.getContactsByGroupPaginated(
        userId,
        "friend",
        customerId,
        [label.id],
        false, // 包含指定分组
        offset,
        pageSize,
      );
    }
  } else if (Number(label.groupType) === 2) {
    // 群组分组
    if (label.id === 0) {
      // 默认群分组
      return await ContactManager.getContactsByGroupPaginated(
        userId,
        "group",
        customerId,
        realGroupIds,
        true, // 排除已分组的
        offset,
        pageSize,
      );
    } else {
      // 指定标签的群
      return await ContactManager.getContactsByGroupPaginated(
        userId,
        "group",
        customerId,
        [label.id],
        false, // 包含指定分组
        offset,
        pageSize,
      );
    }
  }

  return [];
};
