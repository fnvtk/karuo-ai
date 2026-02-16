import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  Method,
  AxiosResponse,
} from "axios";
import { Toast } from "antd-mobile";
import { useUserStore } from "@/store/module/user";
const { token } = useUserStore.getState();
const DEFAULT_DEBOUNCE_GAP = 0; // 设置为 0 禁用防抖
const debounceMap = new Map<string, number>();

// 需要高频轮询、不走截流的接口白名单（按实际接口路径调整）
// 已禁用防抖，此白名单不再需要
const NO_DEBOUNCE_URLS = [
  "/wechat/friend/list", // 好友列表
  "/wechat/group/list", // 群组列表
  "/wechat/message/list", // 消息列表
  "/v1/kefu/message/details", // 聊天消息详情（点击聊天记录时需要频繁请求）
  "v1/kefu/message/details", // 兼容不带斜杠的情况
  "kefu/message/details", // 兼容部分路径匹配
];

// 接口错误白名单：这些接口失败时不显示错误提示
const ERROR_SILENT_URLS = [
  "/v1/kefu/wechatFriend/list", // 微信好友列表
];

const instance: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || "/api",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use((config: any) => {
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res: AxiosResponse) => {
    const payload = res.data || {};
    const { code, success, msg } = payload;
    const hasBizCode = typeof code === "number";
    const hasBizSuccess = typeof success === "boolean";
    const bizSuccess = hasBizCode
      ? code === 200
      : hasBizSuccess
        ? success
        : undefined;

    if (bizSuccess === true || (!hasBizCode && !hasBizSuccess)) {
      return payload.data ?? payload;
    }

    // 检查是否在错误白名单中
    const url = res.config?.url || "";
    const isInErrorSilentList = ERROR_SILENT_URLS.some(pattern =>
      url.includes(pattern),
    );

    // 401 错误始终需要处理
    if (code === 401) {
      localStorage.removeItem("token");
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath === "/login") {
        window.location.href = "/login";
      } else {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
      return Promise.reject(msg || "接口错误");
    }

    // 如果不在白名单中，显示错误提示
    if (!isInErrorSilentList) {
      Toast.show({ content: msg || "接口错误", position: "top" });
    }
    return Promise.reject(msg || "接口错误");
  },
  err => {
    // 检查是否在错误白名单中
    const url = err.config?.url || "";
    const isInErrorSilentList = ERROR_SILENT_URLS.some(pattern =>
      url.includes(pattern),
    );

    // 401 错误始终需要处理
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("token");
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath === "/login") {
        window.location.href = "/login";
      } else {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
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
  // 允许通过 config.debounce 控制是否开启截流，默认开启
  config?: AxiosRequestConfig & { debounce?: boolean },
  debounceGap?: number,
): Promise<any> {
  const gap =
    typeof debounceGap === "number" ? debounceGap : DEFAULT_DEBOUNCE_GAP;

  // 防抖功能已完全禁用（DEFAULT_DEBOUNCE_GAP = 0）
  // 不再进行防抖检查，所有请求直接通过
  const shouldDebounce = false;

  const axiosConfig: AxiosRequestConfig & { debounce?: boolean } = {
    url,
    method,
    ...config,
  };

  // 如果是FormData，不设置Content-Type，让浏览器自动设置
  if (data instanceof FormData) {
    delete axiosConfig.headers?.["Content-Type"];
  }

  if (method.toUpperCase() === "GET") {
    axiosConfig.params = data;
  } else {
    axiosConfig.data = data;
  }
  return instance(axiosConfig);
}

export default request;
