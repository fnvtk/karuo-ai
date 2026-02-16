import React from "react";
import { TabBar } from "antd-mobile";
import { PieOutline, UserOutline } from "antd-mobile-icons";
import { HomeOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const tabs = [
  {
    key: "home",
    title: "首页",
    icon: <HomeOutlined />,
    path: "/",
  },
  {
    key: "scenarios",
    title: "场景获客",
    icon: <TeamOutlined />,
    path: "/scenarios",
  },
  {
    key: "workspace",
    title: "工作台",
    icon: <PieOutline />,
    path: "/workspace",
  },
  {
    key: "mine",
    title: "我的",
    icon: <UserOutline />,
    path: "/mine",
  },
];

interface MeauMobileProps {
  activeKey: string;
}

const MeauMobile: React.FC<MeauMobileProps> = ({ activeKey }) => {
  const navigate = useNavigate();

  return (
    <TabBar
      style={{ background: "#fff" }}
      activeKey={activeKey}
      onChange={key => {
        const tab = tabs.find(t => t.key === key);
        if (tab && tab.path) navigate(tab.path);
      }}
    >
      {tabs.map(item => (
        <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
      ))}
    </TabBar>
  );
};

export default MeauMobile;
