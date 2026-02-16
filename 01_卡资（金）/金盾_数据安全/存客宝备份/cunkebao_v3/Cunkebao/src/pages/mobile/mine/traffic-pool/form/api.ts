import request from "@/api/request";

// 创建流量包
export interface CreateTrafficPackageParams {
  name: string;
  description?: string;
  remarks?: string;
  filterConditions: any[];
  userIds: string[];
}

export interface CreateTrafficPackageResponse {
  id: string;
  name: string;
  success: boolean;
  message: string;
}

export async function createTrafficPackage(
  params: CreateTrafficPackageParams,
): Promise<CreateTrafficPackageResponse> {
  return request("/v1/traffic/pool/create", params, "POST");
}

// 获取用户列表（根据筛选条件）
export interface GetUsersByFilterParams {
  conditions: any[];
  page?: number;
  pageSize?: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  tags: string[];
  rfmScore: number;
  lastActive: string;
  consumption: number;
}

export interface GetUsersByFilterResponse {
  list: User[];
  total: number;
}

export async function getUsersByFilter(
  params: GetUsersByFilterParams,
): Promise<GetUsersByFilterResponse> {
  return request("/v1/traffic/pool/users/filter", params, "POST");
}

// 获取预设方案列表
export interface PresetScheme {
  id: string;
  name: string;
  description: string;
  conditions: any[];
  userCount: number;
  color: string;
}

export async function getPresetSchemes(): Promise<PresetScheme[]> {
  // 模拟数据
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        {
          id: "scheme_1",
          name: "高价值客户方案",
          description: "针对高消费、高活跃度的客户群体",
          conditions: [
            { id: "rfm_high", type: "rfm", label: "RFM评分", value: "high" },
            {
              id: "consumption_high",
              type: "consumption",
              label: "消费能力",
              value: "high",
            },
          ],
          userCount: 1250,
          color: "#ff4d4f",
        },
        {
          id: "scheme_2",
          name: "新用户激活方案",
          description: "针对新注册用户的激活策略",
          conditions: [
            { id: "new_user", type: "tag", label: "新用户", value: true },
            {
              id: "low_activity",
              type: "activity",
              label: "活跃度",
              value: "low",
            },
          ],
          userCount: 890,
          color: "#52c41a",
        },
        {
          id: "scheme_3",
          name: "流失挽回方案",
          description: "针对流失风险用户的挽回策略",
          conditions: [
            { id: "churn_risk", type: "tag", label: "流失风险", value: true },
            {
              id: "last_active",
              type: "time",
              label: "最后活跃",
              value: "30天前",
            },
          ],
          userCount: 567,
          color: "#faad14",
        },
      ]);
    }, 500);
  });
  // return request("/v1/traffic/pool/schemes", {}, "GET");
}

// 获取行业选项（固定筛选项）
export interface IndustryOption {
  label: string;
  value: string | number;
}

export async function getIndustryOptions(): Promise<IndustryOption[]> {
  return request("/v1/traffic/pool/industries", {}, "GET");
}
