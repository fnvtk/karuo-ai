# Cursor Override OpenAI Base URL：须公网可达

## 背景

在 Cursor Settings → Models 中开启 **OpenAI API Key** 与 **Override OpenAI Base URL**，填写本机 `http://localhost:3102/api/v1` 后仍报「无法连接」或 *Problem reaching OpenAI*。

## 原因

Cursor 论坛与官方回复：请求会先经 **Cursor 云端**再转发到所填 Base URL；云端**不能访问**用户本机的 `localhost`，也**不能**使用仅在本机 `/etc/hosts` 中指向 `127.0.0.1` 的域名（公网 DNS 解析不到本机）。

## 做法

1. 用 **ngrok** / **Cloudflare Tunnel（cloudflared）** 等把本机 `3102` 暴露为 **https 公网 URL**。
2. Cursor 中 Base URL 填：`https://<隧道域名>/api/v1`（勿写 localhost）。
3. 卡若站点侧：自定义模型名可用 **`karuo-ai`**（`/api/v1/models` 已列出；路由层映射为网关默认模型，避免非法 model id 打上游）。

## 相关路径

- 控制台说明与黄条提示：`卡若ai网站/site/src/app/(console)/console/gateway/page.tsx`
- 路由别名：`卡若ai网站/site/src/lib/gateway-router.ts`
- 文档：`卡若ai网站/开发文档/10、项目管理/功能测试与访问说明.md` §7.6
