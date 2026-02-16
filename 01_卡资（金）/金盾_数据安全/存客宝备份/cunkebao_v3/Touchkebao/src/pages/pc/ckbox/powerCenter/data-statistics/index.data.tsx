// KPI数据类型定义
export interface KPIData {
  id: string;
  value: string;
  label: string;
  subtitle?: string;
  trend?: {
    direction: "up" | "down";
    text: string;
  };
}

// 话术组数据类型定义
export interface DialogueGroupData {
  status: string;
  reachRate: number;
  replyRate: number;
  clickRate: number;
  conversionRate: number;
  avgReplyTime: string;
  pushCount: number;
}

// KPI统计数据
export const kpiData: KPIData[] = [
  {
    id: "reach-rate",
    value: "96.5%",
    label: "触达率",
    subtitle: "成功发送/计划发送",
    trend: {
      direction: "up",
      text: "+2.3% 本月",
    },
  },
  {
    id: "reply-rate",
    value: "42.8%",
    label: "回复率",
    subtitle: "收到回复/成功发送",
    trend: {
      direction: "up",
      text: "+5.1% 本月",
    },
  },
  {
    id: "avg-reply-time",
    value: "18分钟",
    label: "平均回复时间",
    subtitle: "从发送到回复的平均时长",
    trend: {
      direction: "down",
      text: "-3分钟",
    },
  },
  {
    id: "link-click-rate",
    value: "28.3%",
    label: "链接点击率",
    subtitle: "点击链接/成功发送",
    trend: {
      direction: "up",
      text: "+1.8% 本月",
    },
  },
];

// 话术组对比数据
export const dialogueGroupData: DialogueGroupData[] = [
  {
    status: "优秀",
    reachRate: 98.1,
    replyRate: 48.7,
    clickRate: 32.5,
    conversionRate: 12.8,
    avgReplyTime: "15分钟",
    pushCount: 156,
  },
  {
    status: "良好",
    reachRate: 95.8,
    replyRate: 38.2,
    clickRate: 25.4,
    conversionRate: 9.2,
    avgReplyTime: "22分钟",
    pushCount: 142,
  },
  {
    status: "一般",
    reachRate: 92.3,
    replyRate: 28.5,
    clickRate: 18.7,
    conversionRate: 6.5,
    avgReplyTime: "28分钟",
    pushCount: 98,
  },
];

// 时间范围选项
export const timeRangeOptions = [
  { label: "最近7天", value: "7days" },
  { label: "最近30天", value: "30days" },
  { label: "最近90天", value: "90days" },
  { label: "自定义", value: "custom" },
];








