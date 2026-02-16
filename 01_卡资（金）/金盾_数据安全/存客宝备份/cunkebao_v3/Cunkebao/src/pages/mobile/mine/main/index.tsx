import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, List, Button } from "antd-mobile";
import {
  PhoneOutlined,
  MessageOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import MeauMobile from "@/components/MeauMobile/MeauMoible";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import { useUserStore } from "@/store/module/user";
import { getDashboard, getUserInfoStats } from "./api";
import NavCommon from "@/components/NavCommon";
const Mine: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [stats, setStats] = useState({
    devices: 12,
    wechat: 25,
    traffic: 8,
    content: 156,
    balance: 0,
  });
  const [userInfoStats, setUserInfoStats] = useState({
    contentLibraryNum: 0,
    deviceNum: 0,
    userNum: 0,
    wechatNum: 0,
  });

  // 用户信息
  const currentUserInfo = {
    name: user?.username || "-",
    email: user?.account || "-",
    role: user?.isAdmin === 1 ? "管理员" : "普通用户",
    lastLogin: user?.lastLoginTime
      ? new Date(user.lastLoginTime * 1000).toLocaleString()
      : "-",
    avatar: user?.avatar || "",
  };

  // 功能模块数据
  const functionModules = [
    {
      id: "devices",
      title: "设备管理",
      description: "管理您的设备和微信账号",
      icon: <PhoneOutlined />,
      count: userInfoStats.deviceNum,
      path: "/mine/devices",
      bgColor: "#e6f7ff",
      iconColor: "#1890ff",
    },
    {
      id: "wechat",
      title: "微信号管理",
      description: "管理微信账号和好友",
      icon: <MessageOutlined />,
      count: userInfoStats.wechatNum,
      path: "/wechat-accounts",
      bgColor: "#f6ffed",
      iconColor: "#52c41a",
    },
    {
      id: "traffic",
      title: "流量池",
      description: "管理用户流量池和分组",
      icon: <DatabaseOutlined />,
      count: userInfoStats.userNum,
      path: "/mine/traffic-pool",
      bgColor: "#f9f0ff",
      iconColor: "#722ed1",
    },
    {
      id: "content",
      title: "内容库",
      description: "管理营销内容和素材",
      icon: <FolderOpenOutlined />,
      count: userInfoStats.contentLibraryNum,
      path: "/mine/content",
      bgColor: "#fff7e6",
      iconColor: "#fa8c16",
    },
  ];

  // 加载统计数据
  const loadStats = async () => {
    try {
      const res = await getDashboard();
      setStats({
        devices: res.deviceNum,
        wechat: res.wechatNum,
        traffic: 999,
        content: 999,
        balance: res.balance || 0,
      });
      const res2 = await getUserInfoStats();
      setUserInfoStats(res2);
    } catch (error) {
      console.error("加载统计数据失败:", error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFunctionClick = (path: string) => {
    navigate(path);
  };

  // 渲染功能模块图标
  const renderModuleIcon = (module: any) => (
    <div
      style={{
        width: "40px",
        height: "40px",
        backgroundColor: module.bgColor,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: module.iconColor,
        fontSize: "20px",
      }}
    >
      {module.icon}
    </div>
  );

  return (
    <Layout
      header={<NavCommon title="我的" />}
      footer={<MeauMobile activeKey="mine" />}
    >
      <div className={style["mine-page"]}>
        {/* 用户信息卡片（严格按图片风格） */}
        <Card className={style["user-card"]}>
          <div className={style["user-info-row"]}>
            {/* 头像 */}
            <div className={style["user-avatar"]}>
              {currentUserInfo.avatar ? (
                <img src={currentUserInfo.avatar} />
              ) : (
                <div className={style["avatar-placeholder"]}>卡</div>
              )}
            </div>
            {/* 右侧内容 */}
            <div className={style["user-main-info"]}>
              <div className={style["user-main-row"]}>
                <span className={style["user-name"]}>
                  {currentUserInfo.name}
                </span>
                <span className={style["role-badge"]}>
                  {currentUserInfo.role}
                </span>

                <span className={style["icon-btn"]}>
                  <i className="iconfont icon-bell" />
                </span>
              </div>
              <div>
                <span className={style["balance-label"]}>余额：</span>
                <span className={style["balance-value"]}>
                  ￥{Number(stats.balance || 0).toFixed(2)}
                </span>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate("/recharge")}
                >
                  充值
                </Button>
              </div>
              <div className={style["last-login"]}>
                最近登录：{currentUserInfo.lastLogin}
              </div>
              <SettingOutlined
                className={style["icon-setting"]}
                onClick={() => navigate("/settings")}
              />
            </div>
          </div>
        </Card>

        {/* 我的功能 */}
        <Card className={style["menu-card"]}>
          <List>
            {functionModules.map(module => (
              <List.Item
                key={module.id}
                prefix={renderModuleIcon(module)}
                title={module.title}
                description={module.description}
                extra={
                  <span
                    style={{
                      padding: "2px 8px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {module.count}
                  </span>
                }
                arrow
                onClick={() => handleFunctionClick(module.path)}
              />
            ))}
          </List>
        </Card>
      </div>
    </Layout>
  );
};

export default Mine;
