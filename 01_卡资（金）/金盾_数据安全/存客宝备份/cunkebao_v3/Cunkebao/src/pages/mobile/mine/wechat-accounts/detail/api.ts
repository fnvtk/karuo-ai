import request from "@/api/request";
import axios from "axios";
import { useUserStore } from "@/store/module/user";

// 获取微信号详情
export function getWechatAccountDetail(id: string) {
  return request("/v1/wechats/getWechatInfo", { wechatId: id }, "GET");
}

// 获取微信号概览数据
export function getWechatAccountOverview(id: string) {
  return request("/v1/wechats/overview", { wechatId: id }, "GET");
}

// 获取微信号朋友圈列表
export function getWechatMoments(params: {
  wechatId: string;
  page?: number;
  limit?: number;
}) {
  return request("/v1/wechats/moments", params, "GET");
}

// 获取微信号好友列表
export function getWechatFriends(params: {
  wechatAccount: string;
  page: number;
  limit: number;
  keyword?: string;
}) {
  return request(
    `/v1/wechats/${params.wechatAccount}/friends`,
    {
      page: params.page,
      limit: params.limit,
      keyword: params.keyword,
    },
    "GET",
  );
}

// 获取微信好友详情
export function getWechatFriendDetail(id: string) {
  return request("/v1/WechatFriend/detail", { id }, "GET");
}

// 好友转移接口
export function transferWechatFriends(params: {
  wechatId: string;
  devices: number[];
  inherit: boolean;
  greeting?: string;
  firstMessage?: string;
}) {
  return request("/v1/wechats/transfer-friends", params, "POST");
}

// 获取客服账号列表
export function getKefuAccountsList() {
  return request("/v1/kefu/accounts/list", {}, "GET");
}

// 转移好友到客服账号
export function transferFriend(params: {
  friendId: string;
  toAccountId: string;
  comment?: string;
}) {
  return request("/v1/friend/transfer", params, "POST");
}

// 导出朋友圈接口（直接下载文件）
export async function exportWechatMoments(params: {
  wechatId: string;
  keyword?: string;
  type?: number;
  startTime?: string;
  endTime?: string;
}): Promise<void> {
  const { token } = useUserStore.getState();
  const baseURL =
    (import.meta as any).env?.VITE_API_BASE_URL || "/api";

  // 构建查询参数
  const queryParams = new URLSearchParams();
  queryParams.append("wechatId", params.wechatId);
  if (params.keyword) {
    queryParams.append("keyword", params.keyword);
  }
  if (params.type !== undefined) {
    queryParams.append("type", params.type.toString());
  }
  if (params.startTime) {
    queryParams.append("startTime", params.startTime);
  }
  if (params.endTime) {
    queryParams.append("endTime", params.endTime);
  }

  try {
    const response = await axios.get(
      `${baseURL}/v1/wechats/moments/export?${queryParams.toString()}`,
      {
        responseType: "blob",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }
    );

    // 检查响应类型，如果是JSON错误响应，需要解析错误信息
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      // 如果是JSON响应，说明可能是错误信息
      const text = await response.data.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || errorData.msg || "导出失败");
    }

    // 检查响应状态
    if (response.status !== 200) {
      throw new Error(`导出失败，状态码: ${response.status}`);
    }

    // 创建下载链接
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // 从响应头获取文件名，如果没有则使用默认文件名
    const contentDisposition = response.headers["content-disposition"];
    let fileName = "朋友圈导出.xlsx";
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ""));
      }
    }

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    // 如果是我们抛出的错误，直接抛出
    if (error.message && error.message !== "导出失败") {
      throw error;
    }

    // 处理axios错误响应
    if (error.response) {
      // 如果响应是blob类型，尝试读取为文本
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || errorData.msg || "导出失败");
        } catch (parseError) {
          throw new Error("导出失败，请重试");
        }
      } else {
        throw new Error(
          error.response.data?.message ||
          error.response.data?.msg ||
          error.message ||
          "导出失败"
        );
      }
    } else {
      throw new Error(error.message || "导出失败");
    }
  }
}
