import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  Method,
  AxiosResponse,
} from "axios";
import { Toast } from "antd-mobile";
import { useUserStore } from "@/store/module/user";
const DEFAULT_DEBOUNCE_GAP = 0; // 设置为 0 禁用防抖
const debounceMap = new Map<string, number>();

// 需要高频轮询、不走截流的接口白名单（按实际接口路径调整）
// 已禁用防抖，此白名单不再需要
const NO_DEBOUNCE_URLS = [
  "/wechat/friend/list",
  "/wechat/group/list",
  "/wechat/message/list",
  "/v1/kefu/message/details", // 聊天消息详情（点击聊天记录时需要频繁请求）
];

// 接口错误白名单：这些接口失败时不显示错误提示
const ERROR_SILENT_URLS = [
  "/v1/kefu/wechatFriend/list", // 微信好友列表
];

interface RequestConfig extends AxiosRequestConfig {
  headers?: {
    Client?: string;
    "Content-Type"?: string;
  };
  // 是否开启截流，默认开启
  debounce?: boolean;
}

const instance: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL2 || "/api",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Client: "kefu-client",
  },
});

instance.interceptors.request.use((config: any) => {
  // 在每次请求时动态获取最新的 token2
  const { token2 } = useUserStore.getState();
  if (token2) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `bearer ${token2}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res: AxiosResponse) => {
    return res.data;
  },
  err => {
    // 检查是否在错误白名单中
    const url = err.config?.url || "";
    const isInErrorSilentList = ERROR_SILENT_URLS.some(pattern =>
      url.includes(pattern),
    );

    // 处理401错误，跳转到登录页面
    if (err.response && err.response.status === 401) {
      Toast.show({ content: "登录已过期，请重新登录", position: "top" });
      // 获取当前路径，用于登录后跳回
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
      return Promise.reject(err);
    }

    // 如果不在白名单中，显示错误提示
    if (!isInErrorSilentList) {
      Toast.show({ content: err.message || "网络异常", position: "top" });
    }
    return Promise.reject(err);
  },
);

export function request(
  url: string,
  data?: any,
  method: Method = "GET",
  config?: RequestConfig,
  debounceGap?: number,
): Promise<any> {
  const gap =
    typeof debounceGap === "number" ? debounceGap : DEFAULT_DEBOUNCE_GAP;

  // 防抖功能已完全禁用（DEFAULT_DEBOUNCE_GAP = 0）
  // 不再进行防抖检查，所有请求直接通过
  const shouldDebounce = false;

  const axiosConfig: RequestConfig = {
    url,
    method,
    ...config,
  };

  if (method.toUpperCase() === "GET") {
    axiosConfig.params = data;
  } else {
    axiosConfig.data = data;
  }
  return instance(axiosConfig);
}

export default request;
