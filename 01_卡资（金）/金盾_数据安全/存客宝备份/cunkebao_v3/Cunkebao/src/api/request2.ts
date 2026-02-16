import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  Method,
  AxiosResponse,
} from "axios";
import { Toast } from "antd-mobile";
import { useUserStore } from "@/store/module/user";
const DEFAULT_DEBOUNCE_GAP = 1000;
const debounceMap = new Map<string, number>();

interface RequestConfig extends AxiosRequestConfig {
  headers: {
    Client?: string;
    "Content-Type"?: string;
  };
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
    // 处理401错误，跳转到登录页面
    if (err.response && err.response.status === 401) {
      Toast.show({ content: "登录已过期，请重新登录", position: "top" });
      // 获取当前路径，用于登录后跳回
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
      return Promise.reject(err);
    }

    Toast.show({ content: err.message || "网络异常", position: "top" });
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
  const key = `${method}_${url}_${JSON.stringify(data)}`;
  const now = Date.now();
  const last = debounceMap.get(key) || 0;
  if (gap > 0 && now - last < gap) {
    // Toast.show({ content: '请求过于频繁，请稍后再试', position: 'top' });
    return Promise.reject("请求过于频繁，请稍后再试");
  }
  debounceMap.set(key, now);

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
