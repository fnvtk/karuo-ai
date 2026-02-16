import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Layout,
  Button,
  Avatar,
  Space,
  Tooltip,
  Dropdown,
  message,
  Spin,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  RobotOutlined,
  DownOutlined,
  BellOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import styles from "./ChatWindow.module.scss";

// ✅ 核心组件保持同步加载（需要立即渲染）
import MessageEnter from "./components/MessageEnter";
import MessageRecord from "./components/MessageRecord";
import ChatRecordSearch from "./components/ChatRecordSearch";

// ✅ 非关键组件使用懒加载（减少初始包大小）
const ProfileCard = lazy(() => import("./components/ProfileCard"));
const FollowupReminderModal = lazy(() => import("./components/FollowupReminderModal"));
const TodoListModal = lazy(() => import("./components/TodoListModal"));

// 加载中的占位组件
const LoadingFallback = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
    <Spin size="small" />
  </div>
);
import { setFriendInjectConfig } from "@/pages/pc/ckbox/weChat/api";
import { useAISelectors, useUIStateSelectors } from "@/hooks/weChat/useWeChatSelectors";
import { useWeChatActions } from "@/hooks/weChat/useWeChatSelectors";
import { MessageManager } from "@/utils/dbAction/message";
import { ContactManager } from "@/utils/dbAction/contact";
import { useUserStore } from "@storeModule/user";
const { Header, Content } = Layout;

interface ChatWindowProps {
  contract: ContractData | weChatGroup;
}

const typeOptions = [
  { value: 0, label: "人工接待" },
  { value: 1, label: "AI辅助" },
  { value: 2, label: "AI接管" },
];

const ChatWindowComponent: React.FC<ChatWindowProps> = ({ contract }) => {
  // ✅ 使用优化的 selector（合并多个 selector，减少重渲染）
  const { aiQuoteMessageContent } = useAISelectors();
  const { showChatRecordModel } = useUIStateSelectors();
  const { updateAiQuoteMessageContent, setCurrentContact } = useWeChatActions();

  // ✅ 使用 selector 避免 getSnapshot 警告
  const currentUserId = useUserStore(state => state.user?.id) || 0;

  const [showProfile, setShowProfile] = useState(true);
  const [followupModalVisible, setFollowupModalVisible] = useState(false);
  const [todoModalVisible, setTodoModalVisible] = useState(false);

  const onToggleProfile = useCallback(() => {
    setShowProfile(prev => !prev);
  }, []);

  const handleFollowupClick = useCallback(() => {
    setFollowupModalVisible(true);
  }, []);

  const handleFollowupModalClose = useCallback(() => {
    setFollowupModalVisible(false);
  }, []);

  const handleTodoClick = useCallback(() => {
    setTodoModalVisible(true);
  }, []);

  const handleTodoModalClose = useCallback(() => {
    setTodoModalVisible(false);
  }, []);

  const [currentConfig, setCurrentConfig] = useState(
    typeOptions.find(option => option.value === aiQuoteMessageContent) ||
      typeOptions[0],
  );

  useEffect(() => {
    const found =
      typeOptions.find(option => option.value === aiQuoteMessageContent) ||
      typeOptions[0];
    setCurrentConfig(found);
  }, [aiQuoteMessageContent]);

  // 处理配置选择
  const handleConfigChange = useCallback(
    async (option: { value: number; label: string }) => {
      setCurrentConfig({
        value: option.value,
        label: option.label,
      });

      try {
        // 1. 保存配置到后端
        await setFriendInjectConfig({
          type: option.value,
          wechatAccountId: contract.wechatAccountId,
          friendId: contract.id,
        });

        // 2. 更新 Store 中的 AI 配置状态
        updateAiQuoteMessageContent(option.value);

        // 3. 确定联系人类型
        const contactType: "friend" | "group" = contract.chatroomId
          ? "group"
          : "friend";
        const aiType = option.value;

        console.log(
          `开始更新 aiType: contactId=${contract.id}, type=${contactType}, aiType=${aiType}`,
        );

        // 4. 更新会话列表数据库的 aiType
        await MessageManager.updateSession({
          userId: currentUserId,
          id: contract.id!,
          type: contactType,
          aiType: aiType,
        });
        console.log("✅ 会话列表数据库 aiType 更新成功");

        // 5. 更新联系人数据库的 aiType
        const contactInDb = await ContactManager.getContactByIdAndType(
          currentUserId,
          contract.id!,
          contactType,
        );

        if (contactInDb) {
          await ContactManager.updateContact({
            ...contactInDb,
            aiType: aiType,
          });
          console.log("✅ 联系人数据库 aiType 更新成功");
        } else {
          console.warn("⚠️ 联系人数据库中未找到该联系人");
        }

        // 6. 更新 Store 中的 currentContract（通过重新设置）
        const updatedContract = {
          ...contract,
          aiType: aiType,
        };
        setCurrentContact(updatedContract);
        console.log("✅ Store currentContract aiType 更新成功");

        message.success(`已切换为${option.label}`);
      } catch (error) {
        console.error("更新 AI 配置失败:", error);
        message.error("配置更新失败，请重试");
      }
    },
    [contract, currentUserId, setCurrentContact, updateAiQuoteMessageContent],
  );

  const aiTypeMenuItems = useMemo(
    () =>
      typeOptions.map(option => ({
        key: option.value,
        label: option.label,
        onClick: () => handleConfigChange(option),
      })),
    [handleConfigChange],
  );

  return (
    <Layout className={styles.chatWindow}>
      {/* 聊天主体区域 */}
      <Layout className={styles.chatMain}>
        {/* 聊天头部 */}
        <Header className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <Avatar
              size={40}
              src={contract.avatar || contract.chatroomAvatar}
              icon={
                contract.type === "group" ? <TeamOutlined /> : <UserOutlined />
              }
            />
            <div className={styles.chatHeaderDetails}>
              <div className={styles.chatHeaderName}>
                {contract.conRemark || contract.nickname}
              </div>
            </div>
          </div>
          <Space>
            {!contract.chatroomId && (
              <Dropdown
                menu={{
                  items: aiTypeMenuItems,
                }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button type="default" icon={<RobotOutlined />}>
                  {currentConfig.label}
                  <DownOutlined />
                </Button>
              </Dropdown>
            )}

            <Tooltip title="个人资料">
              <Button onClick={onToggleProfile} icon={<UserOutlined />}>
                客户信息
              </Button>
            </Tooltip>
          </Space>
        </Header>
        <div className={styles.extend}>
          {showChatRecordModel ? (
            <ChatRecordSearch />
          ) : (
            <>
              <Button icon={<BellOutlined />} onClick={handleFollowupClick}>
                跟进提醒
              </Button>
              <Button icon={<CheckSquareOutlined />} onClick={handleTodoClick}>
                待办事项
              </Button>
            </>
          )}
        </div>

        {/* 聊天内容 */}
        <Content className={styles.chatContent}>
          <MessageRecord contract={contract} />
        </Content>

        {/* 消息输入组件 */}
        <MessageEnter contract={contract} />
      </Layout>

      {/* 右侧个人资料卡片 - 懒加载 */}
      {showProfile && (
        <Suspense fallback={<div style={{ padding: "20px", textAlign: "center" }}>加载中...</div>}>
          <ProfileCard contract={contract} />
        </Suspense>
      )}

      {/* 跟进提醒模态框 - 懒加载 */}
      {followupModalVisible && (
        <Suspense fallback={null}>
          <FollowupReminderModal
            visible={followupModalVisible}
            onClose={handleFollowupModalClose}
            recipientName={contract.nickname || contract.name}
            friendId={contract.id?.toString()}
          />
        </Suspense>
      )}

      {/* 待办事项模态框 - 懒加载 */}
      {todoModalVisible && (
        <Suspense fallback={null}>
          <TodoListModal
            visible={todoModalVisible}
            onClose={handleTodoModalClose}
            clientName={contract.nickname || contract.name}
            friendId={contract.id?.toString()}
          />
        </Suspense>
      )}
    </Layout>
  );
};

// ✅ 使用 React.memo 优化 ChatWindow 组件，避免不必要的重渲染
const ChatWindow = React.memo(
  ChatWindowComponent,
  (prev, next) => {
    // 只有当联系人 ID 变化时才重新渲染
    return prev.contract.id === next.contract.id;
  },
);

ChatWindow.displayName = "ChatWindow";

export default ChatWindow;
