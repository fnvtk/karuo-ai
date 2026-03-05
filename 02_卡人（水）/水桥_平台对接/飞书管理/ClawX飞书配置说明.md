# ClawX / OpenClaw 飞书通道配置说明

> 本机飞书 App Key / App Secret 已写入 OpenClaw 网关配置，飞书通道已启用。

## 一、本机飞书凭证（已填入 OpenClaw）

| 项 | 值 | 来源 |
|:---|:---|:---|
| **App ID（App Key）** | `cli_a48818290ef8100d` | 卡若AI 飞书管理脚本（水桥） |
| **App Secret** | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` | 同上 |

上述凭证与 `02_卡人（水）/水桥_平台对接/飞书管理/脚本/` 下各脚本（如 `soul_party_to_feishu_sheet.py`、`auto_log.py`、`feishu_api.py`）使用的为同一套，用于飞书开放平台同一应用。

## 二、已写入的配置位置

- **文件**：`~/.openclaw/openclaw.json`
- **节点**：`channels.feishu`
  - `enabled: true`
  - `dmPolicy: "pairing"`
  - `accounts.main.appId` / `appSecret` / `botName: "卡若AI"`

ClawX 连接本机或 Docker 中的 OpenClaw 网关时，会使用该配置；**无需在 ClawX 界面里再填一遍 App Key/Secret**，网关已带飞书通道。

## 三、使配置生效

1. **重启 OpenClaw 网关**
   - 若网关在 **Docker（website 编排）**：神射手目录执行 `docker compose restart website-openclaw-gateway` 或 `docker compose up -d`。
   - 若网关在 **本机**：在 ClawX 设置中重启网关，或结束网关进程后重新启动。
2. **飞书开放平台**
   - 应用需开启 **Bot** 能力，事件订阅建议使用 **长连接（WebSocket）**，并订阅 `im.message.receive_v1`。
   - 权限需包含：`im:message`、`im:message:send_as_bot` 等（见 [OpenClaw 飞书文档](https://docs.openclaw.ai/channels/feishu)）。

## 四、在 ClawX 里确认

- 打开 **ClawX → 设置 → 通道 / Channels**，应能看到 **飞书（Feishu）** 已启用。
- 若 ClawX 有单独的「飞书」配置页且显示从网关同步，则无需再填 App Key/Secret；若仍有输入框且为空，可填上表一中的 App ID 与 App Secret 以保持一致。

---
*配置写入时间：2026-03-06；凭证来源：卡若AI 水桥飞书管理脚本。*
