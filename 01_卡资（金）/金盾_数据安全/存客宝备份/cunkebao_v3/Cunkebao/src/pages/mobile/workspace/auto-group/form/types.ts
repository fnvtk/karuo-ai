import { PoolSelectionItem } from "@/components/PoolSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { FriendSelectionItem } from "@/components/FriendSelection/data";

// 自动建群表单数据类型定义
export interface AutoGroupFormData {
  id?: string; // 任务ID
  type: number; // 任务类型
  name: string; // 任务名称
  devices: string[]; // 群主ID列表（设备ID）
  devicesOptions: DeviceSelectionItem[]; // 群主选项（设备）
  admins: string[]; // 管理员ID列表（好友ID）
  adminsOptions: FriendSelectionItem[]; // 管理员选项（好友）
  poolGroups: string[]; // 流量池
  poolGroupsOptions: PoolSelectionItem[]; // 流量池选项
  startTime: string; // 开始时间 (YYYY-MM-DD HH:mm:ss)
  endTime: string; // 结束时间 (YYYY-MM-DD HH:mm:ss)
  groupSizeMin: number; // 群组最小人数
  groupSizeMax: number; // 群组最大人数
  maxGroupsPerDay: number; // 每日最大建群数
  groupNameTemplate: string; // 群名称模板
  groupDescription: string; // 群描述
  status: number; // 是否启用 (1: 启用, 0: 禁用)
  [key: string]: any;
}

// 步骤定义
export interface StepItem {
  id: number;
  title: string;
  subtitle: string;
}

// 表单验证规则
export const formValidationRules = {
  name: [
    { required: true, message: "请输入任务名称" },
    { min: 2, max: 50, message: "任务名称长度应在2-50个字符之间" },
  ],
  devices: [
    { required: true, message: "请选择群主" },
    { type: "array", min: 1, max: 1, message: "群主只能选择一个设备" },
  ],
  admins: [
    { required: true, message: "请选择管理员" },
    { type: "array", min: 1, message: "至少选择一个管理员" },
  ],
  poolGroups: [
    { required: true, message: "请选择内容库" },
    { type: "array", min: 1, message: "至少选择一个内容库" },
  ],
  startTime: [{ required: true, message: "请选择开始时间" }],
  endTime: [{ required: true, message: "请选择结束时间" }],
  groupSizeMin: [
    { required: true, message: "请输入群组最小人数" },
    { type: "number", min: 1, max: 500, message: "群组最小人数应在1-500之间" },
  ],
  groupSizeMax: [
    { required: true, message: "请输入群组最大人数" },
    { type: "number", min: 1, max: 500, message: "群组最大人数应在1-500之间" },
  ],
  maxGroupsPerDay: [
    { required: true, message: "请输入每日最大建群数" },
    {
      type: "number",
      min: 1,
      max: 100,
      message: "每日最大建群数应在1-100之间",
    },
  ],
  groupNameTemplate: [
    { required: true, message: "请输入群名称模板" },
    { min: 2, max: 100, message: "群名称模板长度应在2-100个字符之间" },
  ],
  groupDescription: [{ max: 200, message: "群描述不能超过200个字符" }],
};
