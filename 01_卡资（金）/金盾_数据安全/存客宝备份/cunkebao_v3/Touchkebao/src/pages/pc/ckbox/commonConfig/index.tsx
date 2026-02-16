import React, { useState } from "react";
import Layout from "@/components/Layout/LayoutFiexd";
import PowerNavigation from "@/components/PowerNavtion";
import { Button, Space } from "antd";
import ReceptionSettings from "./components/ReceptionSettings";
import styles from "./index.module.scss";

const CommonConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("reception");

  const tabs = [
    { key: "reception", label: "接待设置" },
    // { key: "notification", label: "通知设置" },
    // { key: "system", label: "系统设置" },
    // { key: "security", label: "安全设置" },
    // { key: "advanced", label: "高级设置" },
  ];

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "reception":
        return <ReceptionSettings />;
      case "notification":
        return <div className={styles.placeholder}>通知设置功能开发中...</div>;
      case "system":
        return <div className={styles.placeholder}>系统设置功能开发中...</div>;
      case "security":
        return <div className={styles.placeholder}>安全设置功能开发中...</div>;
      case "advanced":
        return <div className={styles.placeholder}>高级设置功能开发中...</div>;
      default:
        return <ReceptionSettings />;
    }
  };
  return (
    <Layout
      header={
        <>
          <PowerNavigation
            title="全局配置"
            subtitle="系统全局设置和配置管理"
            showBackButton={true}
            backButtonText="返回功能中心"
          />
          <div className={styles.tabsBar}>
            {tabs.map(tab => (
              <div
                key={tab.key}
                className={`${styles.tab} ${
                  activeTab === tab.key ? styles.tabActive : ""
                }`}
                onClick={() => handleTabClick(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </>
      }
    >
      <div className={styles.content}>{renderTabContent()}</div>
    </Layout>
  );
};

export default CommonConfig;
