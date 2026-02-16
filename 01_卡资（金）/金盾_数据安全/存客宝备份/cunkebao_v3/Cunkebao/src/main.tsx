// main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import App from "./App";
import "./styles/global.scss";

// 设置dayjs为中文
dayjs.locale("zh-cn");

// 渲染应用
const root = createRoot(document.getElementById("root")!);
root.render(
  <ConfigProvider locale={zhCN}>
    <App />
  </ConfigProvider>,
);
