import axios from "axios";
import { Toast } from "antd-mobile";
import { generateSign } from "./utils/sign";

// API配置
const API_BASE_URL = "https://ckbapi.quwanzhi.com/v1/api";
// 默认API Key（用于测试）
export const DEFAULT_API_KEY = "v3pzy-zcfkg-96jio-7xgh6-14kio";

export interface SubmitLeadParams {
  phone: string;
  name: string;
  source: string;
  remark?: string;
  wechatId?: string;
  tags?: string;
  siteTags?: string;
}

export interface SubmitLeadResponse {
  code: number;
  message: string;
  data: string | null;
}

/**
 * 提交线索到存客宝
 * @param params 线索参数
 * @param apiKey API密钥（必填）
 */
export async function submitLead(
  params: SubmitLeadParams,
  apiKey: string,
): Promise<SubmitLeadResponse> {
  if (!apiKey) {
    throw new Error("apiKey不能为空");
  }

  try {
    // 生成时间戳（秒级）
    const timestamp = Math.floor(Date.now() / 1000);

    // 构建请求参数
    const requestParams: Record<string, any> = {
      apiKey: apiKey,
      timestamp,
      phone: params.phone,
      name: params.name,
      source: params.source,
    };

    // 添加可选字段（只添加非空值）
    if (params.remark) {
      requestParams.remark = params.remark;
    }
    if (params.wechatId) {
      requestParams.wechatId = params.wechatId;
    }
    if (params.tags) {
      requestParams.tags = params.tags;
    }
    if (params.siteTags) {
      requestParams.siteTags = params.siteTags;
    }

    // 生成签名
    const sign = generateSign(requestParams, apiKey);
    requestParams.sign = sign;

    // 发送请求
    const response = await axios.post<SubmitLeadResponse>(
      `${API_BASE_URL}/scenarios`,
      requestParams,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
    );

    const result = response.data;

    // 处理响应
    if (result.code === 200) {
      return result;
    } else {
      throw new Error(result.message || "提交失败");
    }
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "网络请求失败，请稍后重试";
    throw new Error(errorMessage);
  }
}
