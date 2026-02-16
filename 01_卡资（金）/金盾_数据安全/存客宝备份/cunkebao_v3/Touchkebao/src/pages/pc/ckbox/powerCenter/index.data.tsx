import {
  TeamOutlined,
  CommentOutlined,
  BookOutlined,
  SendOutlined,
} from "@ant-design/icons";

// 数据类型定义
export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tag: string;
  features: string[];
  path?: string;
}

export interface KPIData {
  id: string;
  value: string;
  label: string;
  trend?: {
    icon: string;
    text: string;
  };
}

// 功能数据 - 匹配图片中的布局
// 第一行：客户好友管理、AI接待设置、AI内容库配置
// 第二行：消息推送助手（单独一行，左边对齐）
export const featureCategories: FeatureCard[] = [
  {
    id: "customer-management",
    title: "客户好友管理",
    description: "管理客户关系,维护好友信息,查看沟通记录,提升客户满意度",
    icon: <TeamOutlined style={{ fontSize: "32px", color: "#1890ff" }} />,
    color: "#1890ff",
    tag: "核心功能",
    features: [
      "RFM价值评分系统",
      "多维度精准筛选",
      "完整聊天记录查看",
      "客户详情页面",
    ],
    path: "/pc/powerCenter/customer-management",
  },
  {
    id: "ai-reception",
    title: "AI接待设置",
    description: "配置AI自动回复,智能推送策略,提升接待效率和客户体验",
    icon: <CommentOutlined style={{ fontSize: "32px", color: "#722ed1" }} />,
    color: "#722ed1",
    tag: "AI智能",
    features: [
      "自动欢迎语设置",
      "AI智能推送策略",
      "标签化精准推送",
      "接待模式切换",
    ],
    path: "/pc/commonConfig",
  },
  // {
  //   id: "content-library",
  //   title: "AI内容库配置",
  //   description: "管理AI内容库,配置调用权限,优化AI推送效果和内容质量",
  //   icon: <BookOutlined style={{ fontSize: "32px", color: "#52c41a" }} />,
  //   color: "#52c41a",
  //   tag: "内容管理",
  //   features: [
  //     "多库管理与分类",
  //     "AI调用权限配置",
  //     "内容检索规则设置",
  //     "手动内容上传",
  //   ],
  //   path: "/pc/powerCenter/content-library",
  // },
  {
    id: "message-push-assistant",
    title: "消息推送助手",
    description: "批量推送消息,AI智能话术改写,支持好友、群聊、公告推送",
    icon: <SendOutlined style={{ fontSize: "32px", color: "#ff7a00" }} />,
    color: "#ff7a00",
    tag: "消息推送",
    features: [
      "微信好友消息推送",
      "微信群消息推送",
      "群公告消息推送",
      "AI智能话术改写",
    ],
    path: "/pc/powerCenter/message-push-assistant",
  },
];

// KPI统计数据
export const kpiData: KPIData[] = [
  {
    id: "total-customers",
    value: "1,234",
    label: "总客户数",
    trend: {
      icon: "↑",
      text: "12% 本月",
    },
  },
  {
    id: "active-customers",
    value: "856",
    label: "活跃客户",
    trend: {
      icon: "↑",
      text: "8% 本月",
    },
  },
  {
    id: "assigned-users",
    value: "342",
    label: "当前客服分配用户数",
    trend: {
      icon: "",
      text: "当前登录客服",
    },
  },
];
