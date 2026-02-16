/**
 * MessageList组件 - 虚拟滚动版本（示例）
 * 展示如何集成VirtualSessionList组件
 *
 * 注意：这是一个示例文件，用于展示集成方式
 * 实际改造时，应该直接修改原有的index.tsx文件
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Modal, Input, message } from "antd";
import {
  PushpinOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import styles from "./com.module.scss";
import { VirtualSessionList } from "@/components/VirtualSessionList";
import { ChatSession } from "@/utils/db";
import { useMessageStore } from "@weChatStore/message";
import { useCustomerStore } from "@weChatStore/customer";
import { useWeChatStore } from "@weChatStore/weChat";
import { useUserStore } from "@storeModule/user";
import { useContactStore } from "@weChatStore/contacts";
import { formatWechatTime } from "@/utils/common";
import { messageFilter } from "@/utils/filter";
import { UserOutlined, TeamOutlined } from "@ant-design/icons";
import { Avatar, Badge } from "antd";

/**
 * 会话项组件（用于虚拟滚动）
 */
const SessionItem: React.FC<{
  session: ChatSession;
  isActive: boolean;
}> = React.memo(({ session, isActive }) => {
  return (
    <div
      className={`${styles.messageItem} ${isActive ? styles.active : ""} ${
        (session.config as any)?.top ? styles.pinned : ""
      }`}
    >
      <div className={styles.messageInfo}>
        <Badge count={session.config.unreadCount || 0} size="small">
          <Avatar
            size={48}
            src={session.avatar}
            icon={
              session?.type === "group" ? <TeamOutlined /> : <UserOutlined />
            }
          />
        </Badge>
        <div className={styles.messageDetails}>
          <div className={styles.messageHeader}>
            <div className={styles.messageName}>
              {session.conRemark || session.nickname || session.wechatId}
            </div>
            <div className={styles.messageTime}>
              {formatWechatTime(session?.lastUpdateTime)}
            </div>
          </div>
          <div className={styles.messageContent}>
            {messageFilter(session.content)}
          </div>
        </div>
      </div>
    </div>
  );
});

SessionItem.displayName = "SessionItem";

/**
 * MessageList组件 - 虚拟滚动版本
 */
const MessageListVirtual: React.FC = () => {
  const searchKeyword = useContactStore(state => state.searchKeyword);
  const { setCurrentContact, currentContract } = useWeChatStore();
  const { currentCustomer } = useCustomerStore();
  const { user } = useUserStore();
  const currentUserId = user?.id || 0;

  // 使用新的SessionStore
  const {
    sessions,
    selectedAccountId,
    switchAccount,
    setSearchKeyword,
    setAllSessions,
  } = useMessageStore();

  // 当前显示的会话列表（从新架构的SessionStore获取）
  const displayedSessions = useMemo(() => {
    // 如果currentCustomer存在，使用其ID；否则使用selectedAccountId
    const accountId = currentCustomer?.id || selectedAccountId || 0;

    // 使用新架构的switchAccount方法快速过滤
    if (accountId !== selectedAccountId) {
      // 账号切换，调用switchAccount
      switchAccount(accountId);
    }

    return sessions; // sessions已经是过滤后的数据
  }, [sessions, currentCustomer, selectedAccountId, switchAccount]);

  // 右键菜单相关状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    session: ChatSession | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    session: null,
  });

  // 修改备注相关状态
  const [editRemarkModal, setEditRemarkModal] = useState<{
    visible: boolean;
    session: ChatSession | null;
    remark: string;
  }>({
    visible: false,
    session: null,
    remark: "",
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 点击会话
  const handleItemClick = useCallback(
    (session: ChatSession) => {
      setCurrentContact(session as any);
      // 标记为已读等逻辑...
    },
    [setCurrentContact],
  );

  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, session: ChatSession) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        session,
      });
    },
    [],
  );

  // 隐藏右键菜单
  const hideContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      session: null,
    });
  }, []);

  // 渲染会话项（用于虚拟滚动）
  const renderSessionItem = useCallback(
    (session: ChatSession, index: number) => {
      const isActive =
        !!currentContract && currentContract.id === session.id;
      return <SessionItem session={session} isActive={isActive} />;
    },
    [currentContract],
  );

  // 点击外部隐藏菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.visible, hideContextMenu]);

  // 同步搜索关键词到SessionStore
  useEffect(() => {
    if (searchKeyword) {
      setSearchKeyword(searchKeyword);
    }
  }, [searchKeyword, setSearchKeyword]);

  return (
    <div className={styles.messageList}>
      {/* 使用虚拟滚动列表 */}
      <VirtualSessionList
        sessions={displayedSessions}
        containerHeight={600} // 根据实际容器高度调整
        selectedSessionId={currentContract?.id}
        renderItem={renderSessionItem}
        onItemClick={handleItemClick}
        onItemContextMenu={handleContextMenu}
        className={styles.virtualList}
      />

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.session && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          <div className={styles.menuItem}>置顶</div>
          <div className={styles.menuItem}>修改备注</div>
          <div className={styles.menuItem}>删除</div>
        </div>
      )}

      {/* 修改备注Modal */}
      <Modal
        title="修改备注"
        open={editRemarkModal.visible}
        onOk={() => {
          // 保存备注逻辑...
          setEditRemarkModal({
            visible: false,
            session: null,
            remark: "",
          });
        }}
        onCancel={() =>
          setEditRemarkModal({
            visible: false,
            session: null,
            remark: "",
          })
        }
      >
        <Input
          value={editRemarkModal.remark}
          onChange={e =>
            setEditRemarkModal(prev => ({
              ...prev,
              remark: e.target.value,
            }))
          }
          placeholder="请输入备注"
        />
      </Modal>
    </div>
  );
};

export default MessageListVirtual;
