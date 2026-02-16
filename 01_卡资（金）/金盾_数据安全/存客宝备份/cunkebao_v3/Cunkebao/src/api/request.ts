import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  Method,
  AxiosResponse,
} from "axios";
import { Toast } from "antd-mobile";
import { useUserStore } from "@/store/module/user";
const { token } = useUserStore.getState();
const DEFAULT_DEBOUNCE_GAP = 1000;
const debounceMap = new Map<string, number>();

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
    const { code, success, msg } = res.data || {};
    if (code === 200 || success) {
      return res.data.data ?? res.data;
    }
    Toast.show({ content: msg || "接口错误", position: "top" });
    if (code === 401) {
      localStorage.removeItem("token");
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath === "/login") {
        window.location.href = "/login";
      } else {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(msg || "接口错误");
  },
  err => {
    Toast.show({ content: err.message || "网络异常", position: "top" });
    return Promise.reject(err);
  },
);

export function request(
  url: string,
  data?: any,
  method: Method = "GET",
  config?: AxiosRequestConfig,
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

  const axiosConfig: AxiosRequestConfig = {
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
