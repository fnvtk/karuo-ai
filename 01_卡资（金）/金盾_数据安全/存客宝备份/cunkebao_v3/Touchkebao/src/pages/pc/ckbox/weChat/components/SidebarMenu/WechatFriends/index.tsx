import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  List,
  Avatar,
  Skeleton,
  Modal,
  Form,
  Input,
  Select,
  message,
} from "antd";
import dayjs from "dayjs";
import styles from "./com.module.scss";
import { Contact, ChatSession } from "@/utils/db";
import { ContactManager, MessageManager } from "@/utils/dbAction";
import { ContactGroupByLabel } from "@/pages/pc/ckbox/data";
import { useContactStore } from "@weChatStore/contacts";
import { useContactStoreNew } from "@/store/module/weChat/contacts.new";
import { useCustomerStore } from "@weChatStore/customer";
import { useUserStore } from "@storeModule/user";
import {
  syncContactsFromServer,
  getCountLables,
  getGroupStatistics,
  getContactsByGroup,
} from "./extend";
import { VirtualContactList } from "@/components/VirtualContactList";
import { ContactGroup } from "@/store/module/weChat/contacts.data";
import { GroupContextMenu } from "@/components/GroupContextMenu";
import { ContactContextMenu } from "@/components/ContactContextMenu";

interface WechatFriendsProps {
  selectedContactId?: Contact;
}
const ContactListSimple: React.FC<WechatFriendsProps> = ({
  selectedContactId,
}) => {
  // 基础状态（保留用于向后兼容和搜索模式）
  const [contactGroups, setContactGroups] = useState<ContactGroupByLabel[]>([]);
  const [labels, setLabels] = useState<ContactGroupByLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // 初始化状态

  // 注意：以下状态已由新架构的ContactStore管理，保留仅用于向后兼容
  // activeKey, groupData 等已不再使用，但保留以避免破坏现有功能
  const [activeKey] = useState<string[]>([]); // 已废弃，由expandedGroups替代
  const [groupData] = useState<{
    contacts: { [groupKey: string]: Contact[] };
    pages: { [groupKey: string]: number };
    loading: { [groupKey: string]: boolean };
    hasMore: { [groupKey: string]: boolean };
  }>({
    contacts: {},
    pages: {},
    loading: {},
    hasMore: {},
  });

  // 使用新的 contacts store（保留原有，用于向后兼容）
  const { setCurrentContact: setOldCurrentContact } = useContactStore();

  // 使用新架构的ContactStore（包括搜索功能）
  const {
    groups: newGroups,
    expandedGroups,
    groupData: newGroupData,
    selectedAccountId,
    toggleGroup,
    loadGroupContacts,
    loadMoreGroupContacts,
    setGroups,
    switchAccount,
    updateContactRemark,
    // 搜索相关
    searchResults,
    isSearchMode,
    searchLoading,
  } = useContactStoreNew();

  // 统一使用新架构的setCurrentContact（如果新架构有的话，否则使用旧的）
  const setCurrentContact = setOldCurrentContact;

  // 获取用户和客服信息
  const currentUser = useUserStore(state => state.user);
  const currentCustomer = useCustomerStore(state => state.currentCustomer);

  // 虚拟列表容器引用
  const virtualListRef = useRef<HTMLDivElement>(null);

  // 右键菜单状态
  const [groupContextMenu, setGroupContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    group?: ContactGroup;
    groupType?: 1 | 2;
  }>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [contactContextMenu, setContactContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    contact?: Contact;
  }>({
    visible: false,
    x: 0,
    y: 0,
  });

  // 分组弹窗相关状态
  const [groupForm] = Form.useForm<{
    groupName: string;
    groupMemo: string;
    sort: number;
    groupType: 1 | 2;
  }>();
  const [addGroupVisible, setAddGroupVisible] = useState(false);
  const [editGroupVisible, setEditGroupVisible] = useState(false);
  const [deleteGroupVisible, setDeleteGroupVisible] = useState(false);
  const [groupModalLoading, setGroupModalLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | undefined>();
  const [currentGroupTypeForAdd, setCurrentGroupTypeForAdd] = useState<1 | 2>(
    1,
  );

  // 生成分组Key的函数
  const getGroupKey = useCallback(
    (groupId: number, groupType: 1 | 2, accountId: number) => {
      return `${groupId}_${groupType}_${accountId}`;
    },
    [],
  );

  // 处理分组操作完成
  const handleGroupOperationComplete = useCallback(async () => {
    // 重新加载分组列表
    try {
      const labelList = await getCountLables();
      setLabels(labelList);
      const contactGroups: ContactGroup[] = labelList.map(
        (label: ContactGroupByLabel) => ({
          id: label.id,
          groupName: label.groupName,
          groupType: label.groupType as 1 | 2,
          count: label.count,
          sort: label.sort,
          groupMemo: label.groupMemo,
        }),
      );
      setGroups(contactGroups);
    } catch (error) {
      console.error("重新加载分组列表失败:", error);
    }
  }, [setGroups]);

  // 处理分组右键菜单
  const handleGroupContextMenu = useCallback(
    (e: React.MouseEvent, group: ContactGroup) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果已经有菜单打开，先关闭它，然后在下一个渲染周期打开新菜单
      if (groupContextMenu.visible) {
        setGroupContextMenu({
          visible: false,
          x: 0,
          y: 0,
        });
        // 使用 requestAnimationFrame 确保关闭操作先执行，然后再打开新菜单
        // 这样可以避免菜单闪烁，提供更流畅的体验
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setGroupContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              group,
              groupType: group.groupType,
            });
          });
        });
      } else {
        // 如果没有菜单打开，直接打开新菜单
        setGroupContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          group,
          groupType: group.groupType,
        });
      }
    },
    [groupContextMenu.visible],
  );

  // 处理遮罩层右键事件：根据鼠标位置找到对应的群组并打开菜单
  const handleOverlayContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // 菜单已经关闭，现在需要找到鼠标位置下的群组元素
      // 使用 setTimeout 确保遮罩层已经移除，DOM 更新完成
      setTimeout(() => {
        // 获取当前要显示的群组列表（优先使用新架构的groups）
        const currentDisplayGroups =
          newGroups.length > 0
            ? newGroups
            : contactGroups.map((g: ContactGroupByLabel) => ({
                id: g.id,
                groupName: g.groupName,
                groupType: g.groupType as 1 | 2,
                count: g.count,
                sort: g.sort,
                groupMemo: g.groupMemo,
              }));

        // 方法1：尝试通过 data-group-key 属性直接找到群组元素
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element) return;

        // 向上查找群组头部元素
        let groupElement: HTMLElement | null = element as HTMLElement;
        while (groupElement) {
          // 检查是否有 data-group-key 属性
          const groupKey = groupElement.getAttribute('data-group-key');
          if (groupKey) {
            // 解析 groupKey 获取群组信息
            const [groupId, groupType] = groupKey.split('_').map(Number);
            const group = currentDisplayGroups.find(
              g => g.id === groupId && g.groupType === groupType
            );
            if (group) {
              // 创建合成事件并触发群组右键菜单
              const syntheticEvent = {
                ...e,
                preventDefault: () => {},
                stopPropagation: () => {},
                clientX: e.clientX,
                clientY: e.clientY,
              } as React.MouseEvent;
              handleGroupContextMenu(syntheticEvent, group);
              return;
            }
          }
          groupElement = groupElement.parentElement;
        }

        // 方法2：如果方法1失败，遍历所有群组，检查鼠标位置是否在群组头部范围内
        for (const group of currentDisplayGroups) {
          const groupKey = getGroupKey(group.id, group.groupType, selectedAccountId);
          const groupHeaderElement = document.querySelector(
            `[data-group-key="${groupKey}"]`
          ) as HTMLElement;
          if (groupHeaderElement) {
            const rect = groupHeaderElement.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              const syntheticEvent = {
                ...e,
                preventDefault: () => {},
                stopPropagation: () => {},
                clientX: e.clientX,
                clientY: e.clientY,
              } as React.MouseEvent;
              handleGroupContextMenu(syntheticEvent, group);
              return;
            }
          }
        }
      }, 50); // 给足够的时间让遮罩层移除
    },
    [newGroups, contactGroups, selectedAccountId, getGroupKey, handleGroupContextMenu],
  );

  // 打开新增分组弹窗
  const handleOpenAddGroupModal = useCallback(
    (groupType: 1 | 2) => {
      setCurrentGroupTypeForAdd(groupType);
      groupForm.resetFields();
      groupForm.setFieldsValue({
        groupName: "",
        groupMemo: "",
        sort: 0,
        groupType: groupType || 1, // 默认使用右键菜单传过来的类型，如果没有则默认为1（好友分组）
      });
      setAddGroupVisible(true);
    },
    [groupForm],
  );

  // 打开编辑分组弹窗
  const handleOpenEditGroupModal = useCallback(
    (group: ContactGroup) => {
      setEditingGroup(group);
      groupForm.resetFields();
      groupForm.setFieldsValue({
        groupName: group.groupName,
        groupMemo: group.groupMemo || "",
        sort: group.sort || 0,
      });
      setEditGroupVisible(true);
    },
    [groupForm],
  );

  // 打开删除分组确认弹窗
  const handleOpenDeleteGroupModal = useCallback((group: ContactGroup) => {
    setEditingGroup(group);
    setDeleteGroupVisible(true);
  }, []);

  // 提交新增分组
  const handleSubmitAddGroup = useCallback(async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupModalLoading(true);

      await useContactStoreNew.getState().addGroup({
        groupName: values.groupName,
        groupMemo: values.groupMemo || "",
        groupType: values.groupType || 1, // 必填，默认1（好友分组）
        sort: values.sort || 0,
      });

      message.success("新增分组成功");
      setAddGroupVisible(false);
      groupForm.resetFields();
      await handleGroupOperationComplete();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      console.error("新增分组失败:", error);
      message.error(error?.message || "新增分组失败");
    } finally {
      setGroupModalLoading(false);
    }
  }, [groupForm, currentGroupTypeForAdd, handleGroupOperationComplete]);

  // 提交编辑分组
  const handleSubmitEditGroup = useCallback(async () => {
    if (!editingGroup) return;
    try {
      const values = await groupForm.validateFields();
      setGroupModalLoading(true);

      await useContactStoreNew.getState().updateGroup({
        ...editingGroup,
        groupName: values.groupName,
        groupMemo: values.groupMemo || "",
        sort: values.sort || 0,
      });

      message.success("编辑分组成功");
      setEditGroupVisible(false);
      groupForm.resetFields();
      await handleGroupOperationComplete();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      console.error("编辑分组失败:", error);
      message.error(error?.message || "编辑分组失败");
    } finally {
      setGroupModalLoading(false);
    }
  }, [groupForm, editingGroup, handleGroupOperationComplete]);

  // 确认删除分组
  const handleConfirmDeleteGroup = useCallback(async () => {
    if (!editingGroup) return;
    try {
      setGroupModalLoading(true);

      await useContactStoreNew
        .getState()
        .deleteGroup(editingGroup.id, editingGroup.groupType);

      message.success("删除分组成功");
      setDeleteGroupVisible(false);
      await handleGroupOperationComplete();
    } catch (error: any) {
      console.error("删除分组失败:", error);
      message.error(error?.message || "删除分组失败");
    } finally {
      setGroupModalLoading(false);
    }
  }, [editingGroup, handleGroupOperationComplete]);

  // 处理联系人右键菜单
  const handleContactContextMenu = useCallback(
    (e: React.MouseEvent, contact: Contact) => {
      e.preventDefault();
      e.stopPropagation();
      setContactContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        contact,
      });
    },
    [],
  );

  // 处理联系人操作完成
  const handleContactOperationComplete = useCallback(() => {
    // 操作完成后，可能需要刷新相关分组的数据
    // 这里可以根据需要实现
  }, []);

  // 处理修改备注：直接使用联系人自身的分组信息，不再遍历分组数据
  const handleUpdateRemark = useCallback(
    async (contact: Contact, remark: string) => {
      // 联系人上已经带有 groupId 与 type 信息
      const groupId = contact.groupId ?? 0;
      const groupType: 1 | 2 = contact.type === "group" ? 2 : 1;

      try {
        await updateContactRemark(contact.id, groupId, groupType, remark);
      } catch (error) {
        console.error("更新联系人备注失败:", error);
        message.error("更新备注失败，请稍后重试");
      }
    },
    [updateContactRemark],
  );

  // 从服务器同步数据（静默同步，不显示提示）
  const syncWithServer = useCallback(
    async (userId: number) => {
      try {
        await syncContactsFromServer(userId);
        // 同步完成后，重新加载分组统计
        if (labels.length > 0) {
          const groupStats = await getGroupStatistics(
            userId,
            labels,
            currentCustomer?.id,
          );
          setContactGroups(groupStats);
        }
      } catch (error) {
        console.error("同步联系人失败:", error);
      }
    },
    [labels, currentCustomer?.id],
  );

  // 获取标签列表
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const labelList = await getCountLables();
        setLabels(labelList);
      } catch (error) {
        console.error("获取标签列表失败:", error);
      }
    };

    loadLabels();
  }, []);

  // 同步账号切换到新架构的ContactStore
  useEffect(() => {
    const accountId = currentCustomer?.id || 0;
    if (accountId !== selectedAccountId) {
      switchAccount(accountId);
    }
  }, [currentCustomer, selectedAccountId, switchAccount]);

  // 初始化数据加载：先读取本地数据库，再静默同步
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) return;

      try {
        // 检查本地数据库是否有数据
        const localContacts = await ContactManager.getUserContacts(
          currentUser.id,
        );

        if (localContacts && localContacts.length > 0) {
          // 有本地数据，直接显示（不显示 loading）
          // 后台静默同步
          syncWithServer(currentUser.id);
        } else {
          // 没有本地数据，显示骨架屏并从服务器获取
          setLoading(true);
          await syncWithServer(currentUser.id);
          setLoading(false);
        }
      } catch (error) {
        console.error("加载联系人数据失败:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.id, syncWithServer]);

  // 获取分组统计信息（只获取数量，不加载联系人数据）
  useEffect(() => {
    const loadGroupStats = async () => {
      if (!currentUser?.id || labels.length === 0) return;

      try {
        // 先检查本地数据库是否有数据
        const localContacts = await ContactManager.getUserContacts(
          currentUser.id,
        );

        if (localContacts && localContacts.length > 0) {
          // 有本地数据，直接加载分组统计（不显示骨架屏）
          const groupStats = await getGroupStatistics(
            currentUser.id,
            labels,
            currentCustomer?.id,
          );
          setContactGroups(groupStats);
          setInitializing(false); // 初始化完成
        } else {
          // 没有本地数据，显示骨架屏
          setLoading(true);
          const groupStats = await getGroupStatistics(
            currentUser.id,
            labels,
            currentCustomer?.id,
          );
          setContactGroups(groupStats);
          setLoading(false);
          setInitializing(false); // 初始化完成
        }
      } catch (error) {
        console.error("获取分组统计失败:", error);
        setLoading(false);
        setInitializing(false); // 即使失败也标记为完成
      }
    };

    loadGroupStats();
  }, [currentUser?.id, labels, currentCustomer?.id]);

  // 注意：以下函数已由新架构的ContactStore方法替代（toggleGroup, loadGroupContacts, loadMoreGroupContacts）
  // 保留这些函数仅用于向后兼容，实际已不再使用
  // 当分组展开时，加载该分组的第一页数据（已废弃）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGroupExpand = useCallback(async (groupKey: string) => {
    // 此函数已废弃，请使用新架构的toggleGroup方法
    console.warn("handleGroupExpand已废弃，请使用toggleGroup");
  }, []);

  // 加载更多联系人（已废弃）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLoadMore = useCallback(async (groupKey: string) => {
    // 此函数已废弃，请使用新架构的loadMoreGroupContacts方法
    console.warn("handleLoadMore已废弃，请使用loadMoreGroupContacts");
  }, []);

  // 联系人点击处理
  const onContactClick = async (contact: Contact) => {
    if (!currentUser?.id) return;

    try {
      // 1. 查询数据库是否存在该联系人的会话
      const existingSession = await MessageManager.getSessionByContactId(
        currentUser.id,
        contact.id,
        contact.type,
      );

      const currentTime = dayjs().format(); // 当前时间

      if (!existingSession) {
        // === 场景1：会话不存在，创建新会话并插入数据库 ===

        const newSession: ChatSession = {
          serverId: `${contact.type}_${contact.id}`,
          userId: currentUser.id,
          id: contact.id,
          type: contact.type,
          wechatAccountId: contact.wechatAccountId,
          nickname: contact.nickname,
          conRemark: contact.conRemark || "",
          avatar: contact.avatar,
          content: "",
          lastUpdateTime: currentTime, // 使用当前时间
          config: {
            unreadCount: 0,
            top: contact.config?.top === true ? 1 : 0, // boolean → number
          },
          sortKey: "",
          wechatId: contact.wechatId,
        };

        // 插入数据库（等待完成）
        await MessageManager.createSession(currentUser.id, newSession);
        console.log(`创建新会话: ${contact.nickname || contact.wechatId}`);
      } else {
        // === 场景2：会话已存在，更新 lastUpdateTime ===

        await MessageManager.updateSessionTime(
          currentUser.id,
          contact.id,
          contact.type,
          currentTime, // 更新为当前时间
        );
        console.log(
          `更新会话时间: ${contact.nickname || contact.wechatId} -> ${currentTime}`,
        );
      }

      // 3. 数据库操作完成后，触发 UI 更新
      setCurrentContact(contact);
    } catch (error) {
      console.error("处理联系人点击失败:", error);
    }
  };
  // 渲染联系人项（用于虚拟滚动）
  const renderContactItem = useCallback(
    (contact: Contact, groupIndex: number, contactIndex: number) => {
      // 判断是否为群组
      const isGroup = contact.type === "group";
      const avatar = contact.avatar;
      const name = contact.conRemark || contact.nickname;

      return (
        <div
          key={contact.id}
          onClick={() => onContactClick(contact)}
          className={`${styles.contractItem} ${contact.id === selectedContactId?.id ? styles.selected : ""}`}
        >
          <div className={styles.avatarContainer}>
            <Avatar
              src={avatar}
              icon={!avatar && <span>{contact.nickname?.charAt(0) || ""}</span>}
              className={styles.avatar}
            />
          </div>
          <div className={styles.contractInfo}>
            <div className={styles.name}>{name}</div>
            {isGroup && <div className={styles.groupInfo}>群聊</div>}
          </div>
        </div>
      );
    },
    [selectedContactId, onContactClick],
  );

  // 渲染分组头部（用于虚拟滚动）
  const renderGroupHeader = useCallback(
    (group: ContactGroup, isExpanded: boolean) => {
      const displayCount =
        typeof group.count === "number" && group.count >= 0 ? group.count : "-";
      return (
        <div className={styles.groupHeader}>
          <span>{group.groupName}</span>
          <span className={styles.contactCount}>{displayCount}</span>
        </div>
      );
    },
    [],
  );

  // 渲染骨架屏
  const renderSkeleton = () => (
    <div className={styles.skeletonContainer}>
      {Array(10)
        .fill(null)
        .map((_, index) => (
          <div key={`skeleton-${index}`} className={styles.skeletonItem}>
            <Skeleton.Avatar active size="large" shape="circle" />
            <div className={styles.skeletonInfo}>
              <Skeleton.Input active size="small" style={{ width: "60%" }} />
            </div>
          </div>
        ))}
    </div>
  );

  const containerHeight = undefined; // 不限制高度，使用内容总高度

  // 处理分组展开/折叠（使用新架构的方法）
  const handleGroupToggle = useCallback(
    async (groupId: number, groupType: 1 | 2) => {
      await toggleGroup(groupId, groupType);
    },
    [toggleGroup],
  );

  // 处理分组内加载更多（使用新架构的方法）
  const handleGroupLoadMore = useCallback(
    async (groupId: number, groupType: 1 | 2) => {
      await loadMoreGroupContacts(groupId, groupType);
    },
    [loadMoreGroupContacts],
  );

  // 决定使用哪个数据源：优先使用新架构的groups，否则使用原有的contactGroups
  const displayGroups =
    newGroups.length > 0
      ? newGroups
      : contactGroups.map((g: ContactGroupByLabel) => ({
          id: g.id,
          groupName: g.groupName,
          groupType: g.groupType as 1 | 2,
          count: g.count,
          sort: g.sort,
          groupMemo: g.groupMemo,
        }));

  return (
    <div className={styles.contractListSimple} ref={virtualListRef}>
      {loading || initializing ? (
        // 加载状态：显示骨架屏（初始化或首次无本地数据时显示）
        renderSkeleton()
      ) : isSearchMode ? (
        // 搜索模式：直接显示搜索结果列表（保留原有List组件）
        <>
          <div className={styles.header}>搜索结果</div>
          <List
            className={styles.list}
            dataSource={searchResults}
            renderItem={(contact: Contact) => renderContactItem(contact, 0, 0)}
          />
          {searchResults.length === 0 && (
            <div className={styles.noResults}>未找到匹配的联系人</div>
          )}
        </>
      ) : (
        // 正常模式：使用虚拟滚动显示分组列表
        <>
          {displayGroups.length > 0 ? (
            <VirtualContactList
              groups={displayGroups}
              expandedGroups={expandedGroups}
              groupData={newGroupData}
              getGroupKey={getGroupKey}
              selectedAccountId={selectedAccountId}
              containerHeight={containerHeight}
              selectedContactId={selectedContactId?.id}
              renderGroupHeader={renderGroupHeader}
              renderContact={renderContactItem}
              onGroupToggle={handleGroupToggle}
              onContactClick={onContactClick}
              onGroupContextMenu={handleGroupContextMenu}
              onContactContextMenu={handleContactContextMenu}
              onGroupLoadMore={handleGroupLoadMore}
              className={styles.virtualList}
            />
          ) : (
            <div className={styles.noResults}>暂无联系人</div>
          )}
        </>
      )}

      {/* 分组右键菜单 */}
      <GroupContextMenu
        group={groupContextMenu.group}
        groupType={groupContextMenu.groupType || 1}
        x={groupContextMenu.x}
        y={groupContextMenu.y}
        visible={groupContextMenu.visible}
        onClose={() => setGroupContextMenu({ visible: false, x: 0, y: 0 })}
        onComplete={handleGroupOperationComplete}
        onAddClick={handleOpenAddGroupModal}
        onEditClick={handleOpenEditGroupModal}
        onDeleteClick={handleOpenDeleteGroupModal}
        onOverlayContextMenu={handleOverlayContextMenu}
      />

      {/* 联系人右键菜单 */}
      {contactContextMenu.contact && (
        <ContactContextMenu
          contact={contactContextMenu.contact}
          groups={displayGroups}
          x={contactContextMenu.x}
          y={contactContextMenu.y}
          visible={contactContextMenu.visible}
          onClose={() =>
            setContactContextMenu(prev => ({
              ...prev,
              visible: false,
            }))
          }
          onComplete={handleContactOperationComplete}
          onUpdateRemark={handleUpdateRemark}
          onMoveGroup={async (contact, targetGroupId) => {
            const fromGroupId = contact.groupId ?? 0;
            const groupType: 1 | 2 = contact.type === "group" ? 2 : 1;
            try {
              await useContactStoreNew
                .getState()
                .moveContactToGroup(
                  contact.id,
                  fromGroupId,
                  targetGroupId,
                  groupType,
                );
            } catch (error) {
              console.error("移动分组失败:", error);
              message.error("移动分组失败，请稍后重试");
            }
          }}
        />
      )}

      {/* 新增分组弹窗 */}
      <Modal
        title="新增分组"
        open={addGroupVisible}
        onOk={handleSubmitAddGroup}
        onCancel={() => {
          setAddGroupVisible(false);
          groupForm.resetFields();
        }}
        confirmLoading={groupModalLoading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="groupType"
            label="分组类型"
            rules={[{ required: true, message: "请选择分组类型" }]}
            initialValue={currentGroupTypeForAdd || 1}
          >
            <Select placeholder="请选择分组类型">
              <Select.Option value={1}>好友分组</Select.Option>
              <Select.Option value={2}>群分组</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="groupName"
            label="分组名称"
            rules={[{ required: true, message: "请输入分组名称" }]}
          >
            <Input placeholder="请输入分组名称" maxLength={20} />
          </Form.Item>
          <Form.Item name="groupMemo" label="分组备注">
            <Input.TextArea
              placeholder="请输入分组备注（可选）"
              rows={3}
              maxLength={100}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <Input type="number" placeholder="排序值（数字越小越靠前）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑分组弹窗 */}
      <Modal
        title="编辑分组"
        open={editGroupVisible}
        onOk={handleSubmitEditGroup}
        onCancel={() => {
          setEditGroupVisible(false);
          groupForm.resetFields();
        }}
        confirmLoading={groupModalLoading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="groupName"
            label="分组名称"
            rules={[{ required: true, message: "请输入分组名称" }]}
          >
            <Input placeholder="请输入分组名称" maxLength={20} />
          </Form.Item>
          <Form.Item name="groupMemo" label="分组备注">
            <Input.TextArea
              placeholder="请输入分组备注（可选）"
              rows={3}
              maxLength={100}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" placeholder="排序值（数字越小越靠前）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 删除分组确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteGroupVisible}
        onOk={handleConfirmDeleteGroup}
        onCancel={() => setDeleteGroupVisible(false)}
        confirmLoading={groupModalLoading}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除分组 "{editingGroup?.groupName}" 吗？</p>
        <p style={{ color: "#999", fontSize: "12px" }}>
          删除后，该分组下的联系人将移动到默认分组
        </p>
      </Modal>
    </div>
  );
};

export default ContactListSimple;
