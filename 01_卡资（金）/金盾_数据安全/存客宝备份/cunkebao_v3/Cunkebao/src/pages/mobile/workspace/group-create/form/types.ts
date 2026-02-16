import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";
import { PoolSelectionItem } from "@/components/PoolSelection/data";

// 自动建群表单数据类型定义（新版）
export interface GroupCreateFormData {
  id?: string; // 任务ID
  planType: number; // 计划类型：0-全局计划，1-独立计划
  isPlanType?: number; // 是否支持计划类型配置：1-支持，其他/未定义-不支持（接口返回）
  name: string; // 计划名称
  executor?: DeviceSelectionItem; // 执行智能体（执行者）- 单个设备（保留用于兼容）
  executorId?: number; // 执行智能体ID（设备ID）（保留用于兼容）
  deviceGroupsOptions?: DeviceSelectionItem[]; // 选中的设备列表
  deviceGroups?: number[]; // 选中的设备ID列表
  wechatGroups: number[]; // 固定微信号ID列表（必须3个）
  wechatGroupsOptions: FriendSelectionItem[]; // 固定微信号选项
  groupAdminEnabled: boolean; // 群管理员开关
  groupAdminWechatId?: number; // 群管理员微信号ID
  groupAdminWechatIdOption?: FriendSelectionItem; // 群管理员微信号选项
  groupNameTemplate: string; // 群名称模板
  maxGroupsPerDay: number; // 每日最大建群数
  groupSizeMin: number; // 群组最小人数
  groupSizeMax: number; // 群组最大人数
  startTime?: string; // 执行开始时间（HH:mm），默认 09:00
  endTime?: string; // 执行结束时间（HH:mm），默认 21:00
  poolGroups?: string[]; // 流量池ID列表
  poolGroupsOptions?: PoolSelectionItem[]; // 流量池选项列表
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
    { required: true, message: "请输入计划名称" },
    { min: 2, max: 50, message: "计划名称长度应在2-50个字符之间" },
  ],
  executorId: [{ required: true, message: "请选择执行智能体" }],
  wechatGroups: [
    { required: true, message: "请选择固定微信号" },
    {
      validator: (_: any, value: number[]) => {
        if (!value || value.length !== 3) {
          return Promise.reject(new Error("固定微信号必须选择3个"));
        }
        return Promise.resolve();
      },
    },
  ],
  groupNameTemplate: [
    { required: true, message: "请输入群名称模板" },
    { min: 2, max: 100, message: "群名称模板长度应在2-100个字符之间" },
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
  groupSizeMin: [
    { required: true, message: "请输入群组最小人数" },
    { type: "number", min: 1, max: 500, message: "群组最小人数应在1-500之间" },
  ],
  groupSizeMax: [
    { required: true, message: "请输入群组最大人数" },
    { type: "number", min: 1, max: 500, message: "群组最大人数应在1-500之间" },
  ],
};
