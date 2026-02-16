import React, { useEffect } from "react";
import { Layout } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import ChatWindow from "./components/ChatWindow/index";
import SidebarMenu from "./components/SidebarMenu/index";
import CustomerList from "./components/CustomerList";
import PageSkeleton from "./components/Skeleton";
import styles from "./index.module.scss";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { useUserStore } from "@/store/module/user";
import { useCkChatStore } from "@/store/module/ckchat/ckchat";
import { useWeChatStore } from "@/store/module/weChat/weChat";

const { Content, Sider } = Layout;

const CkboxPage: React.FC = () => {
  const currentContract = useWeChatStore(state => state.currentContract);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const { token2 } = useUserStore.getState();
    const { getAccountId } = useCkChatStore.getState();
    const { connect } = useWebSocketStore.getState();

    connect({
      accessToken: token2,
      accountId: Number(getAccountId()),
      client: "kefu-client",
      cmdType: "CmdSignIn",
      seq: +new Date(),
    });
  }, []);

  return (
    <PageSkeleton loading={false}>
      <Layout className={styles.ckboxLayout}>
        <Layout>
          {/* 垂直侧边栏 */}

          <Sider width={80} className={styles.verticalSider}>
            <CustomerList />
          </Sider>

          {/* 左侧联系人边栏 */}
          <Sider width={280} className={styles.sider}>
            <SidebarMenu />
          </Sider>

          {/* 主内容区 */}
          <Content className={styles.mainContent}>
            {currentContract ? (
              <div className={styles.chatContainer}>
                <ChatWindow contract={currentContract} />
              </div>
            ) : (
              <div className={styles.welcomeScreen}>
                <div className={styles.welcomeContent}></div>
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </PageSkeleton>
  );
};

export default CkboxPage;
