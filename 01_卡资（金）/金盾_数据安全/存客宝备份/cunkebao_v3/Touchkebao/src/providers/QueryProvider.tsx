import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 10 分钟缓存（v5 使用 gcTime 替代 cacheTime）
      retry: 1, // 失败重试 1 次
      refetchOnWindowFocus: true, // 窗口聚焦时自动刷新
      refetchOnReconnect: true, // 网络重连时自动刷新
    },
    mutations: {
      retry: 1, // 失败重试 1 次
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
