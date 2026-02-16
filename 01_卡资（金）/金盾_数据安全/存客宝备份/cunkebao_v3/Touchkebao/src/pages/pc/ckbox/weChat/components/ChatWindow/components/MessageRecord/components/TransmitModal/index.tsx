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
import {
  SearchOutlined,
  CloseOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import styles from "./TransmitModal.module.scss";
import { ContactManager } from "@/utils/dbAction";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useContactStore } from "@/store/module/weChat/contacts";
import { useUserStore } from "@/store/module/user";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
const TransmitModal: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [allContacts, setAllContacts] = useState<
    (ContractData | weChatGroup)[]
  >([]);
  const [selectedWechatFriend, setSelectedWechatFriend] = useState<
    (ContractData | weChatGroup)[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { sendCommand } = useWebSocketStore.getState();
  const currentUserId = useUserStore(state => state.user?.id) || 0;

  // 从 Zustand store 获取更新方法
  const openTransmitModal = useContactStore(state => state.openTransmitModal);

  const setTransmitModal = useContactStore(state => state.setTransmitModal);
  const updateSelectedChatRecords = useWeChatStore(
    state => state.updateSelectedChatRecords,
  );

  const selectedChatRecords = useWeChatStore(
    state => state.selectedChatRecords,
  );

  // 加载联系人数据
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      // 从统一联系人表加载所有联系人
      const allContactsData =
        await ContactManager.getUserContacts(currentUserId);
      setAllContacts(allContactsData as any);
    } catch (err) {
      console.error("加载联系人数据失败:", err);
      message.error("加载联系人数据失败");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // 重置状态 - 只在 openTransmitModal 变为 true 时执行
  useEffect(() => {
    if (openTransmitModal) {
      setSearchValue("");
      setSelectedWechatFriend([]);
      setPage(1);
      loadContacts();
    }
    // 注意：loadContacts 已经在 useCallback 中稳定，但为了安全，我们只在 openTransmitModal 变化时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTransmitModal]);

  // 过滤联系人 - 支持名称和拼音搜索
  const filteredContacts = useMemo(() => {
    if (!searchValue.trim()) return allContacts;

    const keyword = searchValue.toLowerCase();
    return allContacts.filter(contact => {
      const name = (contact.nickname || "").toLowerCase();
      const quanPin = (contact as any).quanPin?.toLowerCase?.() || "";
      const pinyin = (contact as any).pinyin?.toLowerCase?.() || "";
      return (
        name.includes(keyword) ||
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

  // 处理联系人选择
  const handleContactSelect = (contact: ContractData | weChatGroup) => {
    setSelectedWechatFriend(prev => {
      if (isContactSelected(contact.id)) {
        return prev.filter(item => item.id !== contact.id);
      }
      return [...prev, contact];
    });
  };

  // 移除已选择的联系人
  const handleRemoveSelected = (contactId: number) => {
    setSelectedWechatFriend(prev =>
      prev.filter(contact => contact.id !== contactId),
    );
  };

  // 确认转发
  const handleConfirm = () => {
    for (const user of selectedWechatFriend) {
      for (const record of selectedChatRecords) {
        const params = {
          wechatAccountId: user.wechatAccountId,
          wechatChatroomId: user?.chatroomId ? user.id : 0,
          wechatFriendId: user?.chatroomId ? 0 : user.id,
          msgSubType: record.msgSubType,
          msgType: record.msgType,
          content: record.content,
        };
        sendCommand("CmdSendMessage", params);
      }
    }
    updateSelectedChatRecords([]);
    setTransmitModal(false);
  };

  // 检查联系人是否已选择
  const isContactSelected = (contactId: number) => {
    return selectedWechatFriend.some(contact => contact.id === contactId);
  };

  return (
    <Modal
      title="转发消息"
      open={openTransmitModal}
      onCancel={() => setTransmitModal(false)}
      width={"60%"}
      className={styles.transmitModal}
      footer={[
        <Button key="cancel" onClick={() => setTransmitModal(false)}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={selectedWechatFriend.length === 0}
          loading={loading}
        >
          确定
          {selectedWechatFriend.length > 0 &&
            ` (${selectedWechatFriend.length})`}
        </Button>,
      ]}
    >
      <div className={styles.modalContent}>
        {/* 搜索框 */}
        <div className={styles.searchContainer}>
          <Input
            placeholder="输入联系人或群名"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className={styles.searchInput}
            disabled={loading}
          />
        </div>

        <div className={styles.contentBody}>
          {/* 左侧联系人列表 */}
          <div className={styles.contactList}>
            <div className={styles.listHeader}>
              <span>联系人 ({filteredContacts.length})</span>
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
                          src={contact.avatar || contact.chatroomAvatar}
                          icon={
                            contact.type === "group" ? (
                              <TeamOutlined />
                            ) : (
                              <UserOutlined />
                            )
                          }
                        />
                        <div className={styles.contactName}>
                          <div>{contact.nickname}</div>
                          {contact.conRemark && (
                            <div className={styles.conRemark}>
                              {contact.conRemark}
                            </div>
                          )}
                        </div>
                        {contact.type === "group" && (
                          <TeamOutlined className={styles.groupIcon} />
                        )}
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
              <span>已选择 {selectedWechatFriend.length} 个联系人</span>
            </div>
            <div className={styles.listContent}>
              {selectedWechatFriend.length > 0 ? (
                selectedWechatFriend.map(contact => (
                  <div key={contact.id} className={styles.selectedItem}>
                    <div className={styles.contactInfo}>
                      <Avatar
                        size={32}
                        src={contact.avatar || contact.chatroomAvatar}
                        icon={
                          contact.type === "group" ? (
                            <TeamOutlined />
                          ) : (
                            <UserOutlined />
                          )
                        }
                      />
                      <div className={styles.contactName}>
                        <div>{contact.nickname}</div>
                        {contact.conRemark && (
                          <div className={styles.conRemark}>
                            {contact.conRemark}
                          </div>
                        )}
                      </div>
                      {contact.type === "group" && (
                        <TeamOutlined className={styles.groupIcon} />
                      )}
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
  );
};

export default TransmitModal;
