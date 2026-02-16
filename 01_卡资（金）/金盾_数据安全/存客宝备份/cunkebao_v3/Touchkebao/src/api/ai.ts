import axios from "axios";
import { useUserStore } from "@/store/module/user";
import { request } from "@/api/request";

export function asyncMessageStatus(params: {
  messageId: number;
  wechatFriendId?: number;
  wechatChatroomId?: number;
  wechatAccountId: number;
}) {
  return request("/v1/kefu/message/getMessageStatus", params, "GET");
}

//ai对话接口
export interface AiChatParams {
  friendId: number;
  wechatAccountId: number;
  [property: string]: any;
}

export function aiChat(params: AiChatParams) {
  return request("/v1/kefu/ai/chat", params, "POST");
}

//soket消息传入数据中心
export interface DataProcessingParams {
  /**
   * 群消息
   */
  chatroomMessage?: any[];
  /**
   * 个人信息
   */
  friendMessage?: any[];
  /**
   * 类型固定值
   */
  type?: string;
  /**
   * 公共
   */
  wechatAccountId?: number;
  [property: string]: any;
}

export function dataProcessing(params: DataProcessingParams) {
  return request("/v1/kefu/dataProcessing", params, "POST");
}

/**
 * AI文本生成接口
 * @param {string} content - 提示词内容
 * @returns {Promise<string>} - AI生成的文本内容
 */
export async function generateAiText(
  content: string,
  params?: { wechatAccountId: number | string; groupId: number | string },
): Promise<string> {
  try {
    // 获取用户token
    const { token } = useUserStore.getState();

    // 获取AI接口基础URL
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
    const fullUrl = `${apiBaseUrl}/v1/kefu/wechatChatroom/aiAnnouncement`;

    // 发送POST请求
    const response = await axios.post(
      fullUrl,
      {
        wechatAccountId: params?.wechatAccountId,
        groupId: params?.groupId,
        content,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        timeout: 30000, // AI生成可能需要更长时间
      },
    );

    // 新接口返回：{ code: 200, msg: 'success', data: '...公告内容...' }
    if (response?.data?.code === 200) {
      return response?.data?.data || "";
    }
    return "";
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || error.message || "AI生成失败";
    throw new Error(errorMessage);
  }
}
