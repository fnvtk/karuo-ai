export const posterTemplates = [
  {
    id: "poster-1",
    name: "点击领取",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E9%A2%86%E5%8F%961-tipd1HI7da6qooY5NkhxQnXBnT5LGU.gif",
  },
  {
    id: "poster-2",
    name: "点击合作",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%90%88%E4%BD%9C-LPlMdgxtvhqCSr4IM1bZFEFDBF3ztI.gif",
  },
  {
    id: "poster-3",
    name: "点击咨询",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%92%A8%E8%AF%A2-FTiyAMAPop2g9LvjLOLDz0VwPg3KVu.gif",
  },
  {
    id: "poster-4",
    name: "点击签到",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E7%AD%BE%E5%88%B0-94TZIkjLldb4P2jTVlI6MkSDg0NbXi.gif",
  },
  {
    id: "poster-5",
    name: "点击了解",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E4%BA%86%E8%A7%A3-6GCl7mQVdO4WIiykJyweSubLsTwj71.gif",
  },
  {
    id: "poster-6",
    name: "点击报名",
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E6%8A%A5%E5%90%8D-Mj0nnva0BiASeDAIhNNaRRAbjPgjEj.gif",
  },
];
// ========================================
import {
  MessageOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileOutlined,
  AppstoreOutlined,
  LinkOutlined,
  TeamOutlined,
} from "@ant-design/icons";

export interface MessageContentItem {
  id: string;
  type: "text" | "image" | "video" | "file" | "miniprogram" | "link" | "group";
  content: string;
  sendInterval?: number;
  intervalUnit?: "seconds" | "minutes";
  scheduledTime?: {
    hour: number;
    minute: number;
    second: number;
  };
  title?: string;
  description?: string;
  address?: string;
  groupIds?: string[]; // 改为数组以支持GroupSelection组件
  groupOptions?: any[]; // 添加群选项数组
  linkUrl?: string;
  coverImage?: string;
  [key: string]: any;
}

export interface MessageContentGroup {
  day: number;
  messages: MessageContentItem[];
}

export interface MessageSettingsProps {
  formData: any;
  onChange: (data: any) => void;
}

// 消息类型配置
export const messageTypes = [
  { id: "text", icon: MessageOutlined, label: "文本" },
  { id: "image", icon: PictureOutlined, label: "图片" },
  { id: "video", icon: VideoCameraOutlined, label: "视频" },
  { id: "file", icon: FileOutlined, label: "文件" },
  { id: "miniprogram", icon: AppstoreOutlined, label: "小程序" },
  { id: "link", icon: LinkOutlined, label: "链接" },
  { id: "group", icon: TeamOutlined, label: "邀请入群" },
];
