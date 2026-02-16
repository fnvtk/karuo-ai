import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, Switch, Button, Dialog, Toast, Card } from "antd-mobile";
import {
  UserOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  SettingOutlined,
  LockOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import { useUserStore } from "@/store/module/user";
import { useSettingsStore } from "@/store/module/settings";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";
import { sendMessageToParent, TYPE_EMUE } from "@/utils/postApp";
import { clearApplicationCache } from "@/utils/cacheCleaner";

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  type: "navigate" | "switch" | "button";
  value?: boolean;
  path?: string;
  onClick?: () => void;
  badge?: string;
  color?: string;
}

const Setting: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const { settings } = useSettingsStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // 处理头像加载错误
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/login");
    Toast.show({
      content: "退出成功",
      position: "top",
    });
  };

  // 清除缓存
  const handleClearCache = () => {
    Dialog.confirm({
      content: "确定要清除缓存吗？这将清除所有本地数据。",
      onConfirm: async () => {
        const handler = Toast.show({
          icon: "loading",
          content: "正在清理缓存...",
          duration: 0,
        });
        try {
          await clearApplicationCache();
          sendMessageToParent(
            {
              action: "clearCache",
            },
            TYPE_EMUE.FUNCTION,
          );
          handler.close();
          Toast.show({
            icon: "success",
            content: "缓存清理完成",
            position: "top",
          });
        } catch (error) {
          console.error("clear cache failed", error);
          handler.close();
          Toast.show({
            icon: "fail",
            content: "缓存清理失败，请稍后再试",
            position: "top",
          });
        }
      },
    });
  };

  // 设置项配置
  const settingGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: "账户设置",
      items: [
        {
          id: "profile",
          title: "个人信息",
          description: "修改头像、昵称等基本信息",
          icon: <UserOutlined />,
          type: "navigate",
          path: "/userSet",
          color: "var(--primary-color)",
        },
        {
          id: "security",
          title: "安全设置",
          description: "密码修改、登录设备管理",
          icon: <SafetyOutlined />,
          type: "navigate",
          path: "/security",
          color: "var(--primary-color)",
        },
      ],
    },
    {
      title: "应用设置",
      items: [
        {
          id: "privacy",
          title: "隐私保护",
          description: "数据隐私、权限管理",
          icon: <LockOutlined />,
          type: "navigate",
          path: "/privacy",
          color: "var(--primary-color)",
        },
        {
          id: "clearCache",
          title: "清除缓存",
          description: "清除本地缓存数据",
          icon: <SettingOutlined />,
          type: "button",
          onClick: handleClearCache,
          color: "var(--primary-color)",
          badge: "2.3MB",
        },
      ],
    },
    {
      title: "其他",
      items: [
        {
          id: "about",
          title: "关于我们",
          description: "版本信息、联系方式",
          icon: <InfoCircleOutlined />,
          type: "navigate",
          path: "/about",
          color: "var(--primary-color)",
        },
        {
          id: "logout",
          title: "退出登录",
          description: "安全退出当前账号",
          icon: <LogoutOutlined />,
          type: "button",
          onClick: () => setShowLogoutDialog(true),
          color: "#ff4d4f",
        },
      ],
    },
  ];

  // 渲染设置项
  const renderSettingItem = (item: SettingItem) => {
    const handleClick = () => {
      if (item.type === "navigate" && item.path) {
        navigate(item.path);
      } else if (item.type === "switch" && item.onClick) {
        item.onClick();
      } else if (item.type === "button" && item.onClick) {
        item.onClick();
      }
    };

    return (
      <List.Item
        key={item.id}
        prefix={
          <div
            className={style["setting-icon"]}
            style={{
              color: item.color || "var(--primary-color)",
              background: `${item.color || "var(--primary-color)"}15`,
            }}
          >
            {item.icon}
          </div>
        }
        title={
          <div className={style["setting-title"]}>
            {item.title}
            {item.badge && (
              <span className={style["setting-badge"]}>{item.badge}</span>
            )}
          </div>
        }
        description={item.description}
        extra={
          item.type === "switch" ? (
            <Switch
              checked={item.value}
              onChange={() => item.onClick?.()}
              style={
                {
                  "--checked-color": item.color || "var(--primary-color)",
                } as React.CSSProperties
              }
            />
          ) : null
        }
        onClick={handleClick}
        arrow={item.type === "navigate"}
        className={style["setting-item"]}
      />
    );
  };

  return (
    <Layout header={<NavCommon title="设置" />}>
      <div className={style["setting-page"]}>
        {/* 用户信息卡片 */}
        <Card className={style["user-card"]}>
          <div className={style["user-info"]}>
            <div className={style["avatar"]}>
              {user?.avatar && !avatarError ? (
                <img src={user.avatar} alt="头像" onError={handleAvatarError} />
              ) : (
                <div className={style["avatar-placeholder"]}>
                  {user?.username?.charAt(0) || "用"}
                </div>
              )}
            </div>
            <div className={style["user-details"]}>
              <div className={style["username"]}>
                {user?.username || "未设置昵称"}
              </div>
              <div className={style["account"]}>
                {user?.account || "未知账号"}
              </div>
              <div className={style["role"]}>
                {user?.isAdmin === 1 ? "管理员" : "普通用户"}
              </div>
            </div>
            <div className={style["user-actions"]}>
              <Button
                size="small"
                fill="outline"
                onClick={() => navigate("/userSet")}
                style={{
                  color: "#fff",
                  borderColor: "#fff",
                  fontSize: "12px",
                  padding: "4px 8px",
                  height: "auto",
                }}
              >
                编辑
              </Button>
            </div>
          </div>
        </Card>

        {/* 设置列表 */}
        {settingGroups.map((group, groupIndex) => (
          <Card key={groupIndex} className={style["setting-group"]}>
            <div className={style["group-title"]}>
              <span className={style["group-icon"]}>⚙️</span>
              {group.title}
            </div>
            <List className={style["setting-list"]}>
              {group.items.map(renderSettingItem)}
            </List>
          </Card>
        ))}

        {/* 版本信息 */}
        <div className={style["version-info"]}>
          <div className={style["version-card"]}>
            <div className={style["app-logo"]}>
              <img src="/logo.png" alt="" />
            </div>
            <div className={style["version-details"]}>
              <div className={style["app-name"]}>存客宝</div>
              <div className={style["version-text"]}>
                版本 {settings.appVersion}
              </div>
              <div className={style["build-info"]}>Build 2025-08-04</div>
            </div>
          </div>
          <div className={style["copyright"]}>
            <span>© 2024 存客宝管理系统</span>
            <span>让客户管理更简单</span>
          </div>
        </div>
      </div>

      {/* 退出登录确认对话框 */}
      <Dialog
        content="您确定要退出登录吗？退出后需要重新登录才能使用完整功能。"
        visible={showLogoutDialog}
        closeOnAction
        actions={[
          [
            {
              key: "cancel",
              text: "取消",
            },
            {
              key: "confirm",
              text: "确认退出",
              bold: true,
              danger: true,
              onClick: handleLogout,
            },
          ],
        ]}
        onClose={() => setShowLogoutDialog(false)}
      />
    </Layout>
  );
};

export default Setting;
