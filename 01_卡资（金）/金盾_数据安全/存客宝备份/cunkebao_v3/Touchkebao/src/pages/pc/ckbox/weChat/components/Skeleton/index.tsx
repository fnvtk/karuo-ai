import React from "react";
import { Skeleton, Layout, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import styles from "./index.module.scss";
import pageStyles from "../../index.module.scss";

const { Header, Content, Sider } = Layout;

interface PageSkeletonProps {
  loading: boolean;
  children: React.ReactNode;
}

/**
 * 页面骨架屏组件
 * 在数据加载完成前显示骨架屏
 */
const PageSkeleton: React.FC<PageSkeletonProps> = ({ loading, children }) => {
  if (!loading) return <>{children}</>;

  const antIcon = <LoadingOutlined style={{ fontSize: 16 }} spin />;

  return (
    <Layout className={pageStyles.ckboxLayout}>
      {/* 顶部标题栏骨架 */}
      <Header className={pageStyles.header}>
        <div className={styles.headerSkeleton}>
          <div className={styles.headerLeft}>
            <Skeleton.Avatar active size="small" shape="circle" />
            <Skeleton.Input active size="small" style={{ width: "80px" }} />
          </div>
          <div className={styles.headerCenter}>
            <Skeleton.Input active size="small" style={{ width: "200px" }} />
          </div>
          <div className={styles.headerRight}>
            <Skeleton.Button active size="small" style={{ width: "60px" }} />
          </div>
        </div>
      </Header>

      <Layout>
        {/* 左侧联系人列表骨架 */}
        <Sider width={280} className={pageStyles.sider}>
          <div className={styles.siderContent}>
            {/* 搜索框 */}
            <div className={styles.searchBox}>
              <Skeleton.Input active size="large" block />
            </div>

            {/* 标签栏 */}
            <div className={styles.tabBar}>
              <Skeleton.Button active size="small" style={{ width: "60px" }} />
              <Skeleton.Button active size="small" style={{ width: "60px" }} />
              <Skeleton.Button active size="small" style={{ width: "60px" }} />
            </div>

            {/* 联系人列表 */}
            <div className={styles.contactList}>
              {Array(10)
                .fill(null)
                .map((_, index) => (
                  <div key={`contact-${index}`} className={styles.contactItem}>
                    <Skeleton.Avatar active size="large" shape="circle" />
                    <div className={styles.contactInfo}>
                      <Skeleton.Input
                        active
                        size="small"
                        style={{ width: "80px" }}
                      />
                      <Skeleton.Input
                        active
                        size="small"
                        style={{ width: "120px" }}
                      />
                    </div>
                    <div className={styles.contactTime}>
                      <Skeleton.Input
                        active
                        size="small"
                        style={{ width: "40px" }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Sider>

        {/* 主聊天区域骨架 */}
        <Content className={styles.chatContent}>
          {/* 聊天头部 */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <Skeleton.Avatar active size="large" shape="circle" />
              <Skeleton.Input active size="small" style={{ width: "100px" }} />
            </div>
            <div className={styles.chatHeaderRight}>
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
            </div>
          </div>

          {/* 消息区域 */}
          <div className={styles.messageArea}>
            <div className={styles.loadingTip}>
              <Spin indicator={antIcon} />
              <span className={styles.loadingText}>
                加载速度与好友数量有关，请耐心等待...
              </span>
            </div>
          </div>

          {/* 输入区域 */}
          <div className={styles.inputArea}>
            <div className={styles.inputToolbar}>
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
              <Skeleton.Button active size="small" shape="circle" />
            </div>
            <div className={styles.inputField}>
              <Skeleton.Input active size="large" block />
              <Skeleton.Button active size="large" style={{ width: "60px" }} />
            </div>
          </div>
        </Content>

        {/* 右侧个人信息面板骨架 */}
        <Sider width={300} className={styles.rightPanel}>
          <div className={styles.profileSection}>
            <div className={styles.profileHeader}>
              <Skeleton.Avatar active size={80} shape="circle" />
              <Skeleton.Input
                active
                size="small"
                style={{ width: "100px", marginTop: "12px" }}
              />
              <Skeleton.Input
                active
                size="small"
                style={{ width: "60px", marginTop: "4px" }}
              />
            </div>

            <div className={styles.profileDetails}>
              <div className={styles.detailItem}>
                <Skeleton.Input active size="small" style={{ width: "60px" }} />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: "120px" }}
                />
              </div>
              <div className={styles.detailItem}>
                <Skeleton.Input active size="small" style={{ width: "40px" }} />
                <Skeleton.Input active size="small" style={{ width: "80px" }} />
              </div>
              <div className={styles.detailItem}>
                <Skeleton.Input active size="small" style={{ width: "40px" }} />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: "100px" }}
                />
              </div>
              <div className={styles.detailItem}>
                <Skeleton.Input active size="small" style={{ width: "40px" }} />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: "140px" }}
                />
              </div>
            </div>

            <div className={styles.tagSection}>
              <Skeleton.Input
                active
                size="small"
                style={{ width: "40px", marginBottom: "12px" }}
              />
              <div className={styles.tags}>
                <Skeleton.Button
                  active
                  size="small"
                  style={{ width: "50px", marginRight: "8px" }}
                />
                <Skeleton.Button
                  active
                  size="small"
                  style={{ width: "60px", marginRight: "8px" }}
                />
                <Skeleton.Button
                  active
                  size="small"
                  style={{ width: "70px" }}
                />
              </div>
            </div>
          </div>
        </Sider>
      </Layout>
    </Layout>
  );
};

export default PageSkeleton;
