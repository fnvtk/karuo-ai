import React, { useState } from "react";
import { Layout, Avatar, Space, Button, Dropdown, message } from "antd";
import {
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SendOutlined,
  ClearOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { useUserStore } from "@/store/module/user";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./index.module.scss";
import Notice from "./Notice";

const { Header } = Layout;

interface NavCommonProps {
  title?: string;
  onMenuClick?: () => void;
}

const NavCommon: React.FC<NavCommonProps> = ({ title = "触客宝" }) => {
  const [clearingCache, setClearingCache] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUserStore();

  // 处理菜单图标点击：在两个路由之间切换
  const handleMenuClick = () => {
    if (!location.pathname.startsWith("/pc/powerCenter")) {
      navigate("/pc/powerCenter");
    } else {
      navigate("/pc/weChat");
    }
  };
  // 处理退出登录
  const handleLogout = () => {
    logout(); // 清除localStorage中的token和用户状态
    navigate("/login"); // 跳转到登录页面
  };

  // 清除所有 IndexedDB 数据库
  const clearAllIndexedDB = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve();
        return;
      }

      // 获取所有数据库名称
      const databases: string[] = [];
      const request = indexedDB.databases();

      request
        .then(dbs => {
          dbs.forEach(db => {
            if (db.name) {
              databases.push(db.name);
            }
          });

          // 删除所有数据库
          const deletePromises = databases.map(dbName => {
            return new Promise<void>((resolveDelete, rejectDelete) => {
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              deleteRequest.onsuccess = () => {
                resolveDelete();
              };
              deleteRequest.onerror = () => {
                rejectDelete(new Error(`删除数据库 ${dbName} 失败`));
              };
              deleteRequest.onblocked = () => {
                // 如果数据库被阻塞，等待一下再重试
                setTimeout(() => {
                  const retryRequest = indexedDB.deleteDatabase(dbName);
                  retryRequest.onsuccess = () => resolveDelete();
                  retryRequest.onerror = () =>
                    rejectDelete(new Error(`删除数据库 ${dbName} 失败`));
                }, 100);
              };
            });
          });

          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(reject);
        })
        .catch(reject);
    });
  };

  // 处理清除缓存
  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      const hideLoading = message.loading("正在清除缓存...", 0);

      // 1. 清除所有 localStorage
      try {
        localStorage.clear();
      } catch (error) {
        console.warn("清除 localStorage 失败:", error);
      }

      // 2. 清除所有 sessionStorage
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn("清除 sessionStorage 失败:", error);
      }

      // 3. 清除所有 IndexedDB 数据库
      try {
        await clearAllIndexedDB();
      } catch (error) {
        console.warn("清除 IndexedDB 失败:", error);
      }

      hideLoading();
      message.success("缓存清除成功");

      // 清除成功后跳转到登录页面
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 500);
    } catch (error) {
      console.error("清除缓存失败:", error);
      message.error("清除缓存失败，请稍后重试");
    } finally {
      setClearingCache(false);
    }
  };

  // 用户菜单项
  const userMenuItems = [
    {
      key: "userInfo",
      label: (
        <div style={{ fontWeight: "bold", color: "#188eee" }}>
          {user.account}
        </div>
      ),
    },
    // {
    //   key: "settings",
    //   icon: <SettingOutlined style={{ fontSize: 16 }} />,
    //   label: "全局配置",
    //   onClick: () => {
    //     navigate("/pc/commonConfig");
    //   },
    // },
    {
      key: "clearCache",
      icon: <ClearOutlined style={{ fontSize: 16 }} />,
      label: clearingCache ? "清除缓存中..." : "清除缓存",
      onClick: handleClearCache,
      disabled: clearingCache,
    },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ fontSize: 14 }} />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];
  const handleContentManagementClick = () => {
    navigate("/pc/powerCenter/content-management");
  };
  const handleAiClick = () => {
    navigate("/pc/commonConfig");
  };
  return (
    <>
      <Header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            icon={<BarChartOutlined style={{ fontSize: 18 }} />}
            type="primary"
            onClick={handleMenuClick}
          ></Button>
          <Button icon={<RobotOutlined />} onClick={handleAiClick}></Button>
          <Button
            icon={<SendOutlined />}
            onClick={handleContentManagementClick}
          >
            发朋友圈
          </Button>
          <span className={styles.title}>{title}</span>
        </div>

        <div className={styles.headerRight}>
          <Space className={styles.userInfo}>
            <span className={styles.suanli}>
              <span className={styles.suanliIcon}>
                <ThunderboltOutlined size={20} />
              </span>
              {user?.tokens}
            </span>
            <Notice />

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div className={styles.userSection}>
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  src={user?.avatar}
                  className={styles.avatar}
                />

                <div className={styles.userInfo2}>
                  <div className={styles.userNickname}>{user.username}</div>
                  <div className={styles.userAccount}>高级客服专员</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </div>
      </Header>
    </>
  );
};

export default NavCommon;
