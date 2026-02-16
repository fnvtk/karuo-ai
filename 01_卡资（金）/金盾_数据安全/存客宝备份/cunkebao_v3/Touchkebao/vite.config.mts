import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "@storeModule": path.resolve("src/store/module/"),
      "@weChatStore": path.resolve("src/store/module/weChat"),
      "@apiModule": path.resolve("src/api/module/"),
      "@utils": path.resolve("src/utils/"),
    },
  },
  server: {
    open: true,
    port: 8888,
    host: "0.0.0.0",
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 减少文件数量，合并更多依赖
        manualChunks: {
          // 核心框架
          vendor: ["react", "react-dom", "react-router-dom"],
          // UI组件库
          ui: ["antd", "@ant-design/icons", "antd-mobile"],
          // 工具库
          utils: ["axios", "dayjs", "zustand"],
          // 图表库
          charts: ["echarts", "echarts-for-react"],
        },
        // 文件名格式
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // 启用压缩
    minify: "esbuild",
    // 启用源码映射（可选，生产环境可以关闭）
    sourcemap: false,
    // 生成manifest文件
    manifest: true,
  },
  define: {
    // 注入版本信息
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.npm_package_version,
    ),
  },
});
