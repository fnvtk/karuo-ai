import React from "react";
import { useNavigate } from "react-router-dom";
import { NavBar, Card } from "antd-mobile";
import {
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";
const About: React.FC = () => {
  const navigate = useNavigate();

  // 应用信息
  const appInfo = {
    name: "存客宝管理系统",
    version: "1.0.0",
    buildNumber: "20241201",
    description: "专业的存客宝管理平台，提供设备管理、自动营销、数据分析等功能",
  };

  // 功能特性
  const features = [
    {
      title: "设备管理",
      description: "统一管理微信设备和账号，实时监控设备状态",
    },
    {
      title: "自动营销",
      description: "智能点赞、群发推送、朋友圈同步等自动化营销功能",
    },
    {
      title: "流量池管理",
      description: "高效管理用户流量池，精准分组和标签管理",
    },
    {
      title: "内容库",
      description: "丰富的营销内容库，支持多种媒体格式",
    },
    {
      title: "数据分析",
      description: "详细的数据统计和分析，助力营销决策",
    },
  ];

  // 联系信息
  const contractInfo = [
    {
      id: "email",
      title: "邮箱支持",
      value: "support@example.com",
      icon: <MailOutlined />,
      action: () => {
        // 复制邮箱到剪贴板
        navigator.clipboard.writeText("support@example.com");
      },
    },
    {
      id: "phone",
      title: "客服热线",
      value: "400-123-4567",
      icon: <PhoneOutlined />,
      action: () => {
        // 拨打电话
        window.location.href = "tel:400-123-4567";
      },
    },
    {
      id: "website",
      title: "官方网站",
      value: "www.example.com",
      icon: <GlobalOutlined />,
      action: () => {
        // 打开网站
        window.open("https://www.example.com", "_blank");
      },
    },
  ];

  return (
    <Layout header={<NavCommon title="关于我们" />}>
      <div className={style["setting-page"]}>
        {/* 应用信息卡片 */}
        <Card className={style["app-info-card"]}>
          <div className={style["app-info"]}>
            <div className={style["app-logo"]}>
              <div className={style["logo-placeholder"]}>
                <img src="/logo.png" alt="logo" />
              </div>
            </div>
            <div className={style["app-details"]}>
              <div className={style["app-name"]}>{appInfo.name}</div>
              <div className={style["app-version"]}>版本 {appInfo.version}</div>
              <div className={style["app-build"]}>
                Build {appInfo.buildNumber}
              </div>
            </div>
          </div>
          <div className={style["app-description"]}>{appInfo.description}</div>
        </Card>

        {/* 功能特性 */}
        <Card className={style["setting-group"]}>
          <div className={style["group-title"]}>功能特性</div>
          <div className={style["features-grid"]}>
            {features.map((feature, index) => (
              <div key={index} className={style["feature-card"]}>
                <div className={style["feature-icon"]}>
                  <div className={style["icon-placeholder"]}>{index + 1}</div>
                </div>
                <div className={style["feature-content"]}>
                  <div className={style["feature-title"]}>{feature.title}</div>
                  <div className={style["feature-description"]}>
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 联系信息 */}
        {/* <Card className={style["setting-group"]}>
          <div className={style["group-title"]}>联系我们</div>
          <List>
            {contractInfo.map(item => (
              <List.Item
                key={item.id}
                prefix={item.icon}
                title={item.title}
                description={item.value}
                extra={<RightOutlined style={{ color: "#ccc" }} />}
                onClick={item.action}
                arrow
              />
            ))}
          </List>
        </Card> */}

        {/* 版权信息 */}
        <div className={style["copyright-info"]}>
          <div className={style["copyright-text"]}>© 2024 存客宝管理系统</div>
          <div className={style["copyright-subtext"]}>保留所有权利</div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
