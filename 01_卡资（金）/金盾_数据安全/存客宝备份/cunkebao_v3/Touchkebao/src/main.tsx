// main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import App from "./App";
import "./styles/global.scss";
import { initializeDatabaseFromPersistedUser } from "./utils/db";
import { initSentry } from "./utils/sentry";
import { QueryProvider } from "./providers/QueryProvider";

// 最先初始化 Sentry（必须在其他代码之前）
initSentry();

// 设置dayjs为中文
dayjs.locale("zh-cn");

async function bootstrap() {
  try {
    await initializeDatabaseFromPersistedUser();
  } catch (error) {
    console.warn("Failed to prepare database before app bootstrap:", error);
  }

  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ConfigProvider locale={zhCN}>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ConfigProvider>,
  );
}

void bootstrap();
