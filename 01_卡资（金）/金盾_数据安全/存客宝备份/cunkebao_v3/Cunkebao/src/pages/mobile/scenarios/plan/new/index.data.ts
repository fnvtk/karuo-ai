// 步骤定义 - 三个步骤
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
export const steps = [
  { id: 1, title: "步骤一", subtitle: "基础设置" },
  { id: 2, title: "步骤二", subtitle: "好友申请设置" },
  { id: 3, title: "步骤三", subtitle: "消息设置" },
];

// 类型定义
export interface FormData {
  name: string;
  scenario: number;
  status: number;
  sceneId: string | number;
  remarkType: string;
  greeting: string;
  addInterval: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  remarkFormat: string;
  addFriendInterval: number;
  posters: any[]; // 后续可替换为具体Poster类型
  device: string[];
  customTags: string[];
  customTagsOptions: string[];
  deviceGroups: string[];
  deviceGroupsOptions: DeviceSelectionItem[];
  wechatGroups: string[];
  wechatGroupsOptions: GroupSelectionItem[];
  messagePlans: any[];
  // 拉群设置
  groupInviteEnabled?: boolean;
  groupName?: string;
  fixedGroupMembers?: any[]; // 固定群成员，使用好友选择组件结构
  // 分销相关
  distributionEnabled?: boolean;
  // 选中的分销渠道ID列表（前端使用，提交时转为 distributionChannels）
  distributionChannelIds?: Array<string | number>;
  // 选中的分销渠道选项（用于回显名称）
  distributionChannelsOptions?: Array<{
    id: string | number;
    name: string;
    code?: string;
  }>;
  // 获客奖励金额（元，前端使用，提交时转为 customerRewardAmount）
  distributionCustomerReward?: number;
  // 添加奖励金额（元，前端使用，提交时转为 addFriendRewardAmount）
  distributionAddReward?: number;
  // 计划类型：0-全局计划，1-独立计划（仅管理员可创建）
  planType?: number;
  [key: string]: any;
}
export const defFormData: FormData = {
  name: "",
  scenario: 1,
  status: 0,
  sceneId: "",
  remarkType: "phone",
  greeting: "你好，请通过",
  addInterval: 1,
  startTime: "09:00",
  endTime: "18:00",
  enabled: true,
  remarkFormat: "",
  addFriendInterval: 1,
  tips: "请注意消息，稍后加你微信",
  posters: [],
  device: [],
  customTags: [],
  customTagsOptions: [],
  messagePlans: [],
  deviceGroups: [],
  deviceGroupsOptions: [],
  wechatGroups: [],
  wechatGroupsOptions: [],
  contentGroups: [],
  contentGroupsOptions: [],
  groupInviteEnabled: false,
  groupName: "",
  fixedGroupMembers: [],
  distributionEnabled: false,
  distributionChannelIds: [],
  distributionChannelsOptions: [],
  distributionCustomerReward: undefined,
  distributionAddReward: undefined,
  planType: 1, // 默认独立计划
};
