import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  Input,
  Button,
  Avatar,
  Checkbox,
  Empty,
  Spin,
  message,
  Pagination,
} from "antd";
import { SearchOutlined, CloseOutlined, UserOutlined } from "@ant-design/icons";
import styles from "./index.module.scss";
import { ContactManager } from "@/utils/dbAction";
import { useUserStore } from "@/store/module/user";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { Contact } from "@/utils/db";

interface PopChatRoomProps {
  visible: boolean;
  onCancel: () => void;
}

const PopChatRoom: React.FC<PopChatRoomProps> = ({ visible, onCancel }) => {
  const [searchValue, setSearchValue] = useState("");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showNameModal, setShowNameModal] = useState(false);
  const [chatroomName, setChatroomName] = useState("");
  const pageSize = 10;
  const MAX_SELECT_COUNT = 50; // 最多选择联系人数量
  const { sendCommand } = useWebSocketStore();
  const currentUserId = useUserStore(state => state.user?.id) || 0;
  const currentCustomer = useCustomerStore(state => state.currentCustomer);

  // 加载联系人数据（只加载好友，不包含群聊）
  const loadContacts = async () => {
    setLoading(true);
    try {
      const allContactsData =
        await ContactManager.getUserContacts(currentUserId);
      // 过滤出好友类型，排除群聊
      const friendsOnly = (allContactsData as Contact[]).filter(
        contact => contact.type === "friend",
      );
      setAllContacts(friendsOnly);
    } catch (err) {
      console.error("加载联系人数据失败:", err);
      message.error("加载联系人数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 重置状态
  useEffect(() => {
    if (visible) {
      setSearchValue("");
      setSelectedContacts([]);
      setPage(1);
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 过滤联系人 - 支持名称和拼音搜索
  const filteredContacts = useMemo(() => {
    if (!searchValue.trim()) return allContacts;

    const keyword = searchValue.toLowerCase();
    return allContacts.filter(contact => {
      const name = (contact.nickname || "").toLowerCase();
      const remark = (contact.conRemark || "").toLowerCase();
      const quanPin = (contact as any).quanPin?.toLowerCase?.() || "";
      const pinyin = (contact as any).pinyin?.toLowerCase?.() || "";
      return (
        name.includes(keyword) ||
        remark.includes(keyword) ||
        quanPin.includes(keyword) ||
        pinyin.includes(keyword)
      );
    });
  }, [allContacts, searchValue]);

  const paginatedContacts = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredContacts.slice(start, end);
  }, [filteredContacts, page]);

  const isContactSelected = useCallback(
    (contactId: number) => {
      return selectedContacts.some(contact => contact.id === contactId);
    },
    [selectedContacts],
  );

  const addContactsToSelection = (contacts: Contact[]) => {
    setSelectedContacts(prev => {
      const existingIds = new Set(prev.map(contact => contact.id));
      const additions = contacts.filter(
        contact => !existingIds.has(contact.id),
      );
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  };

  const removeContactsFromSelection = (contacts: Contact[]) => {
    if (contacts.length === 0) return;
    const removalIds = new Set(contacts.map(contact => contact.id));
    setSelectedContacts(prev =>
      prev.filter(contact => !removalIds.has(contact.id)),
    );
  };

  const isCurrentPageFullySelected = useMemo(() => {
    return (
      paginatedContacts.length > 0 &&
      paginatedContacts.every(contact => isContactSelected(contact.id))
    );
  }, [isContactSelected, paginatedContacts]);

  const isAllContactsFullySelected = useMemo(() => {
    return (
      filteredContacts.length > 0 &&
      filteredContacts.every(contact => isContactSelected(contact.id))
    );
  }, [filteredContacts, isContactSelected]);

  const handleToggleCurrentPageSelection = () => {
    if (isCurrentPageFullySelected) {
      removeContactsFromSelection(paginatedContacts);
    } else {
      const currentSelectedCount = selectedContacts.length;
      const remainingSlots = MAX_SELECT_COUNT - currentSelectedCount;

      if (remainingSlots <= 0) {
        message.warning(`最多只能选择${MAX_SELECT_COUNT}个联系人`);
        return;
      }

      // 获取当前页未选中的联系人
      const unselectedContacts = paginatedContacts.filter(
        contact => !isContactSelected(contact.id),
      );

      if (unselectedContacts.length > remainingSlots) {
        // 只选择前 remainingSlots 个未选中的联系人
        const contactsToAdd = unselectedContacts.slice(0, remainingSlots);
        addContactsToSelection(contactsToAdd);
        message.warning(
          `最多只能选择${MAX_SELECT_COUNT}个联系人，已选择前${remainingSlots}个`,
        );
      } else {
        addContactsToSelection(unselectedContacts);
      }
    }
  };

  const handleToggleAllContactsSelection = () => {
    if (isAllContactsFullySelected) {
      removeContactsFromSelection(filteredContacts);
    } else {
      const currentSelectedCount = selectedContacts.length;
      const remainingSlots = MAX_SELECT_COUNT - currentSelectedCount;

      if (remainingSlots <= 0) {
        message.warning(`最多只能选择${MAX_SELECT_COUNT}个联系人`);
        return;
      }

      if (filteredContacts.length > remainingSlots) {
        // 只选择前 remainingSlots 个未选中的联系人
        const unselectedContacts = filteredContacts.filter(
          contact => !isContactSelected(contact.id),
        );
        const contactsToAdd = unselectedContacts.slice(0, remainingSlots);
        addContactsToSelection(contactsToAdd);
        message.warning(
          `最多只能选择${MAX_SELECT_COUNT}个联系人，已选择前${remainingSlots}个`,
        );
      } else {
        addContactsToSelection(filteredContacts);
      }
    }
  };

  // 处理联系人选择
  const handleContactSelect = (contact: Contact) => {
    setSelectedContacts(prev => {
      if (isContactSelected(contact.id)) {
        return prev.filter(item => item.id !== contact.id);
      }
      // 检查是否超过50个限制
      if (prev.length >= MAX_SELECT_COUNT) {
        message.warning(`最多只能选择${MAX_SELECT_COUNT}个联系人`);
        return prev;
      }
      return [...prev, contact];
    });
  };

  // 移除已选择的联系人
  const handleRemoveSelected = (contactId: number) => {
    setSelectedContacts(prev =>
      prev.filter(contact => contact.id !== contactId),
    );
  };

  // 处理取消
  const handleCancel = () => {
    setSearchValue("");
    setSelectedContacts([]);
    setPage(1);
    setChatroomName("");
    setShowNameModal(false);
    onCancel();
  };

  // 处理创建群聊 - 先显示输入群名称的弹窗
  const handleCreateGroup = () => {
    if (selectedContacts.length === 0) {
      message.warning("请至少选择一个联系人");
      return;
    }

    if (!currentCustomer?.id) {
      message.error("请先选择客服账号");
      return;
    }

    // 显示输入群名称的弹窗
    setShowNameModal(true);
  };

  // 确认创建群聊
  const handleConfirmCreate = () => {
    if (!chatroomName.trim()) {
      message.warning("请输入群聊名称");
      return;
    }

    if (!currentCustomer?.id) {
      message.error("请先选择客服账号");
      return;
    }

    // 获取选中的好友ID列表
    const friendIds = selectedContacts.map(contact => contact.id);

    try {
      // 发送创建群聊命令
      sendCommand("CmdChatroomCreate", {
        wechatAccountId: currentCustomer.id,
        chatroomName: chatroomName.trim(),
        wechatFriendIds: friendIds,
      });

      message.success("群聊创建请求已发送");
      handleCancel();
    } catch (error) {
      console.error("创建群聊失败:", error);
      message.error("创建群聊失败，请重试");
    }
  };

  // 取消输入群名称
  const handleCancelNameInput = () => {
    setShowNameModal(false);
    setChatroomName("");
  };

  return (
    <>
      <Modal
        title="发起群聊"
        open={visible}
        onCancel={handleCancel}
        width="60%"
        className={styles.popChatRoomModal}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button
            key="create"
            type="primary"
            onClick={handleCreateGroup}
            disabled={selectedContacts.length === 0}
            loading={loading}
          >
            创建
            {selectedContacts.length > 0 && ` (${selectedContacts.length})`}
          </Button>,
        ]}
      >
        <div className={styles.modalContent}>
          {/* 搜索框 */}
          <div className={styles.searchContainer}>
            <Input
              placeholder="请输入昵称/微信号 搜索好友"
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className={styles.searchInput}
              disabled={loading}
              allowClear
            />
          </div>

          <div className={styles.contentBody}>
            {/* 左侧联系人列表 */}
            <div className={styles.contactList}>
              <div className={styles.listHeader}>
                <span>联系人 ({filteredContacts.length})</span>
                <div className={styles.headerActions}>
                  <Button
                    size="small"
                    className={`${styles.actionButton} ${styles.currentPageButton} ${
                      isCurrentPageFullySelected ? styles.deselectState : ""
                    }`}
                    onClick={handleToggleCurrentPageSelection}
                    disabled={loading || paginatedContacts.length === 0}
                  >
                    {isCurrentPageFullySelected
                      ? "取消全选当前页"
                      : "全选当前页"}
                  </Button>
                  <Button
                    size="small"
                    className={`${styles.actionButton} ${styles.allSelectButton} ${
                      isAllContactsFullySelected ? styles.deselectState : ""
                    }`}
                    onClick={handleToggleAllContactsSelection}
                    disabled={loading || filteredContacts.length === 0}
                  >
                    {isAllContactsFullySelected ? "取消全选所有" : "全选所有"}
                  </Button>
                  （全选最多50个）
                </div>
              </div>
              <div className={styles.listContent}>
                {loading ? (
                  <div className={styles.loadingContainer}>
                    <Spin size="large" />
                    <span>加载联系人中...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  paginatedContacts.map(contact => (
                    <div key={contact.id} className={styles.contactItem}>
                      <Checkbox
                        checked={isContactSelected(contact.id)}
                        onChange={() => handleContactSelect(contact)}
                      >
                        <div className={styles.contactInfo}>
                          <Avatar
                            size={32}
                            src={contact.avatar}
                            icon={<UserOutlined />}
                          />
                          <div className={styles.contactName}>
                            <div>{contact.nickname}</div>
                            {contact.conRemark && (
                              <div className={styles.conRemark}>
                                {contact.conRemark}
                              </div>
                            )}
                          </div>
                        </div>
                      </Checkbox>
                    </div>
                  ))
                ) : (
                  <Empty
                    description={
                      searchValue ? "未找到匹配的联系人" : "暂无联系人"
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
              {filteredContacts.length > 0 && (
                <div className={styles.paginationContainer}>
                  <Pagination
                    size="small"
                    current={page}
                    pageSize={pageSize}
                    total={filteredContacts.length}
                    onChange={p => setPage(p)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>

            {/* 右侧已选择列表 */}
            <div className={styles.selectedList}>
              <div className={styles.listHeader}>
                <span>已选联系人 ({selectedContacts.length})</span>
              </div>
              <div className={styles.listContent}>
                {selectedContacts.length > 0 ? (
                  selectedContacts.map(contact => (
                    <div key={contact.id} className={styles.selectedItem}>
                      <div className={styles.contactInfo}>
                        <Avatar
                          size={32}
                          src={contact.avatar}
                          icon={<UserOutlined />}
                        />
                        <div className={styles.contactName}>
                          <div>{contact.nickname}</div>
                          {contact.conRemark && (
                            <div className={styles.conRemark}>
                              {contact.conRemark}
                            </div>
                          )}
                        </div>
                      </div>
                      <CloseOutlined
                        className={styles.removeIcon}
                        onClick={() => handleRemoveSelected(contact.id)}
                      />
                    </div>
                  ))
                ) : (
                  <Empty
                    description="请选择联系人"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 输入群名称的弹窗 */}
      <Modal
        title="提示"
        open={showNameModal}
        onCancel={handleCancelNameInput}
        footer={[
          <Button key="cancel" onClick={handleCancelNameInput}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmCreate}>
            确定
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>请输入群聊名称。</div>
          <Input
            placeholder="请输入群聊名称"
            value={chatroomName}
            onChange={e => setChatroomName(e.target.value)}
            onPressEnter={handleConfirmCreate}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};

export default PopChatRoom;
