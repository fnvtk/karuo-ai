import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

// 欢迎消息类型
export interface WelcomeMessage {
  id: string;
  type: "text" | "image" | "video" | "file";
  content: string;
  order: number; // 消息顺序
  sendInterval?: number; // 发送间隔
  intervalUnit?: "seconds" | "minutes"; // 间隔单位
}

export interface FormData {
  name: string;
  status: number; // 0: 否, 1: 是（开关）
  interval: number; // 时间间隔（分钟）
  pushType?: number; // 0: 定时推送, 1: 立即推送
  startTime?: string; // 允许推送的开始时间
  endTime?: string; // 允许推送的结束时间
  groups: string[]; // 群组ID列表
  groupsOptions: GroupSelectionItem[]; // 群组选项列表
  robots: string[]; // 机器人（设备）ID列表
  robotsOptions: DeviceSelectionItem[]; // 机器人选项列表
  messages: WelcomeMessage[]; // 欢迎消息列表
  [key: string]: any;
}
