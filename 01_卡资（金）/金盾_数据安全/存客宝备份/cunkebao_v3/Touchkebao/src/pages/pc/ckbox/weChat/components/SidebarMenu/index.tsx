import React, { useState, useEffect, useRef } from "react";
import { Input, Skeleton, Button, Dropdown, MenuProps } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  UserAddOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import WechatFriends from "./WechatFriends";
import MessageList from "./MessageList/index";
import FriendsCircle from "./FriendsCicle";
import AddFriends from "./AddFriends";
import PopChatRoom from "./PopChatRoom";
import styles from "./SidebarMenu.module.scss";
import { useContactStore } from "@/store/module/weChat/contacts";
import { useContactStoreNew } from "@/store/module/weChat/contacts.new";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useUserStore } from "@/store/module/user";
import { MessageManager } from "@/utils/dbAction/message";
interface SidebarMenuProps {
  loading?: boolean;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({ loading = false }) => {
  const {
    searchKeyword: oldSearchKeyword,
    setSearchKeyword: setOldSearchKeyword,
    clearSearchKeyword,
    currentContact,
  } = useContactStore();

  // 使用新架构的ContactStore进行搜索
  const contactStoreNew = useContactStoreNew();
  const { searchKeyword, searchContacts, clearSearch } = contactStoreNew;

  const currentCustomer = useCustomerStore(state => state.currentCustomer);
  const { setCurrentContact } = useWeChatStore();
  const { user } = useUserStore();
  const currentUserId = user?.id || 0;

  const [activeTab, setActiveTab] = useState("chats");
  const [switchingTab, setSwitchingTab] = useState(false); // tab切换加载状态
  const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false);
  const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] =
    useState(false);

  // 监听 currentContact 变化，自动切换到聊天tab并选中会话
  useEffect(() => {
    if (!currentContact || !currentUserId) return;

    const handleContactSelection = async () => {
      try {
        setSwitchingTab(true);

        // 2. 从数据库中查找该联系人对应的会话
        const session = await MessageManager.getSessionByContactId(
          currentUserId,
          currentContact.id,
          currentContact.type,
        );

        if (session) {
          // 3. 直接选中该会话
          setCurrentContact(session as any, true);
        }

        // 4. 关闭加载状态
        setSwitchingTab(false);
      } catch (error) {
        console.error("处理联系人选中失败:", error);
        setSwitchingTab(false);
      }
    };

    handleContactSelection();
  }, [currentContact, currentUserId, setCurrentContact]);

  // 搜索防抖处理
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (value: string) => {
    // 同时更新旧架构（向后兼容）
    setOldSearchKeyword(value);

    // 清除之前的防抖定时器
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // 如果关键词为空，立即清除搜索
    if (!value.trim()) {
      clearSearch();
      return;
    }

    // 防抖：300ms后执行搜索
    searchDebounceRef.current = setTimeout(() => {
      searchContacts(value);
    }, 300);
  };

  const handleClearSearch = () => {
    // 清除防抖定时器
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    // 清除旧架构的搜索
    clearSearchKeyword();
    // 清除新架构的搜索
    clearSearch();
  };

  // 组件卸载时清除防抖定时器
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // 下拉菜单项
  const menuItems: MenuProps["items"] = [
    {
      key: "addFriend",
      label: "添加好友",
      icon: <UserAddOutlined />,
      onClick: () => {
        setIsAddFriendModalVisible(true);
      },
    },
    {
      key: "createGroup",
      label: "发起群聊",
      icon: <TeamOutlined />,
      onClick: () => {
        setIsCreateGroupModalVisible(true);
      },
    },
  ];

  // 渲染骨架屏
  const renderSkeleton = () => (
    <div className={styles.skeletonContainer}>
      <div className={styles.searchBarSkeleton}>
        <Skeleton.Input active size="small" block />
      </div>
      <div className={styles.tabsContainerSkeleton}>
        <Skeleton.Button
          active
          size="small"
          shape="square"
          style={{ width: "30%" }}
        />
        <Skeleton.Button
          active
          size="small"
          shape="square"
          style={{ width: "30%" }}
        />
        <Skeleton.Button
          active
          size="small"
          shape="square"
          style={{ width: "30%" }}
        />
      </div>
      <div className={styles.contactListSkeleton}>
        {Array(8)
          .fill(null)
          .map((_, index) => (
            <div
              key={`contact-skeleton-${index}`}
              className={styles.contactItemSkeleton}
            >
              <Skeleton.Avatar active size="large" shape="circle" />
              <div className={styles.contactInfoSkeleton}>
                <Skeleton.Input active size="small" style={{ width: "60%" }} />
                <Skeleton.Input active size="small" style={{ width: "80%" }} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  // 渲染Header部分，包含搜索框和标签页切换
  const renderHeader = () => (
    <div className={styles.headerContainer}>
      {/* 搜索栏 */}
      <div className={styles.searchBar}>
        <Input
          placeholder="搜索客户..."
          prefix={<SearchOutlined />}
          value={searchKeyword || oldSearchKeyword}
          onChange={e => handleSearch(e.target.value)}
          onClear={handleClearSearch}
          allowClear
        />
        {currentCustomer && (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="primary" icon={<PlusOutlined />}></Button>
          </Dropdown>
        )}
      </div>

      {/* 标签页切换 */}
      <div className={styles.tabsContainer}>
        <div
          className={`${styles.tabItem} ${activeTab === "chats" ? styles.active : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          <span>聊天</span>
        </div>
        <div
          className={`${styles.tabItem} ${activeTab === "contracts" ? styles.active : ""}`}
          onClick={async () => {
            setActiveTab("contracts");
            try {
              const accountId = currentCustomer?.id || 0;
              // 每次切到联系人标签时，强制从接口刷新一次分组列表（通过全局 store 调用，避免 hook 实例问题）
              await useContactStoreNew
                .getState()
                .loadGroupsFromAPI(accountId);
            } catch (error) {
              console.error("刷新联系人分组失败:", error);
            }
          }}
        >
          <span>联系人</span>
        </div>
        {currentCustomer && currentCustomer.id !== 0 && (
          <div
            className={`${styles.tabItem} ${activeTab === "friendsCicle" ? styles.active : ""}`}
            onClick={() => setActiveTab("friendsCicle")}
          >
            <span>朋友圈</span>
          </div>
        )}
      </div>
    </div>
  );

  const tabContentCacheRef = useRef<Record<string, React.ReactNode>>({});

  const getTabContent = (tabKey: string) => {
    if (!tabContentCacheRef.current[tabKey]) {
      switch (tabKey) {
        case "chats":
          tabContentCacheRef.current[tabKey] = <MessageList />;
          break;
        case "contracts":
          tabContentCacheRef.current[tabKey] = <WechatFriends />;
          break;
        case "friendsCicle":
          tabContentCacheRef.current[tabKey] = <FriendsCircle />;
          break;
        default:
          tabContentCacheRef.current[tabKey] = null;
      }
    }
    return tabContentCacheRef.current[tabKey];
  };

  // 渲染内容部分
  const renderContent = () => {
    // 如果正在切换tab到聊天，显示骨架屏
    if (switchingTab && activeTab === "chats") {
      return renderSkeleton();
    }

    const availableTabs = ["chats", "contracts"];
    if (currentCustomer && currentCustomer.id !== 0) {
      availableTabs.push("friendsCicle");
    }

    return (
      <>
        {availableTabs.map(tabKey => (
          <div
            key={tabKey}
            style={{
              display: activeTab === tabKey ? "block" : "none",
              height: "100%",
            }}
            aria-hidden={activeTab !== tabKey}
          >
            {getTabContent(tabKey)}
          </div>
        ))}
      </>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  return (
    <div className={styles.sidebarMenu}>
      {renderHeader()}
      <div className={styles.contentContainer}>{renderContent()}</div>
      {/* 添加好友弹窗 */}
      <AddFriends
        visible={isAddFriendModalVisible}
        onCancel={() => setIsAddFriendModalVisible(false)}
      />
      {/* 发起群聊弹窗 */}
      <PopChatRoom
        visible={isCreateGroupModalVisible}
        onCancel={() => setIsCreateGroupModalVisible(false)}
      />
    </div>
  );
};

export default SidebarMenu;
