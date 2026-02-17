# quwanzhi VNC/noVNC 验证说明

## 验证时间
2026-02-17

## 规则依据
BOOTSTRAP.md 第四节「执行流程」第 6 步：**验证** — 检查结果是否达标，不达标回溯，必须拿到结果。对话结束前应执行本验证。

## 验证结果（实测）

| 目标 | 地址 | 结果 | 说明 |
|-----|------|------|------|
| VNC 直连 | open.quwanzhi.com:5900 | **不可连** | `Connection refused`，服务器未开放 5900 |
| noVNC 网页 | open.quwanzhi.com:8007 | **可连** | 端口通，HTTP 200，可访问 |

## 当前可用方式
- **推荐**：双击桌面「**打开 quwanzhi noVNC（浏览器）.command**」→ 浏览器打开 http://open.quwanzhi.com:8007/ → 输入账号密码。
- **待 5900 开放后**：双击「**连接 quwanzhi VNC.command**」用 VNC Viewer 直连。

## 后续若要用 VNC 直连
需运维在服务器上开放 VNC 端口（通常 5900）并告知，届时桌面 VNC 脚本即可直接使用。
