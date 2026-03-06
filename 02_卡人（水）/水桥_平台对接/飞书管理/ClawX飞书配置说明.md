# ClawX / OpenClaw 飞书通道配置说明

> 本机飞书 App ID / App Secret 已写入 OpenClaw 配置，飞书通道已启用；**已做连通验证，可按下文在飞书内发消息测试**。

---

## 一、本机飞书凭证（已填入 OpenClaw）

| 项 | 值 | 来源 |
|:---|:---|:---|
| **App ID** | `cli_a48818290ef8100d` | 卡若AI 飞书管理（水桥） |
| **App Secret** | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` | 同上 |

与 `02_卡人（水）/水桥_平台对接/飞书管理/脚本/` 下各脚本使用的为同一套应用。

---

## 二、已写入的配置位置与结构

- **文件**：`~/.openclaw/openclaw.json`
- **节点**：`channels.feishu`
  - `enabled: true`
  - `defaultAccount: "main"`
  - `dmPolicy: "open"`、`allowFrom: ["*"]`（允许所有人私聊）
  - `accounts.main.appId` / `appSecret` / `botName: "卡若AI"`

ClawX 连接本机或 Docker 中的 OpenClaw 网关时使用该配置，无需在 ClawX 界面再填 App ID/Secret。

---

## 三、确定可以连通、可以用飞书发消息

### 3.1 已完成的验证

- **飞书凭证**：已用当前 App ID/Secret 成功获取 `tenant_access_token`，说明可连通飞书开放平台。
- **openclaw 配置**：飞书 channel 已启用，`accounts.main` 与凭证一致。
- **网关**：ClawX 网关运行后，OpenClaw 会使用上述配置建立飞书长连接（WebSocket），用于**收消息**与**发消息**。

### 3.2 你需要在飞书开放平台确认的 3 步（发消息前提）

1. **事件订阅**  
   在 [飞书开放平台](https://open.feishu.cn/app) 对应应用下：  
   - 选择 **「使用长连接接收事件」**（WebSocket，无需公网 URL）  
   - 添加事件：**`im.message.receive_v1`**

2. **应用能力与权限**  
   - **机器人**：应用能力中开启「机器人」并配置名称（如 卡若AI）  
   - **权限**：至少包含 `im:message`、`im:message:send_as_bot` 等（见 [OpenClaw 飞书文档](https://docs.openclaw.ai/zh-CN/channels/feishu) 权限 JSON）

3. **发布应用**  
   - 在「版本管理与发布」中创建版本并发布，非草稿状态后机器人才可正常收发消息。

### 3.3 在飞书内测试发消息

- 飞书中搜索你配置的机器人名称（如 **卡若AI**），发起私聊或拉入群聊后 @ 机器人，发送一条消息。
- 若网关已启动且开放平台上述 3 步已做完，机器人应能**收到消息并回复**，即表示**可以连通且可以用飞书发消息**。

---

## 四、连通性自检命令

在卡若AI 目录下执行：

```bash
bash 运营中枢/工作台/scripts/verify_feishu_clawx.sh
```

脚本会检查：openclaw 内飞书配置、飞书凭证是否可获取 token、网关是否在运行，并输出发消息能力说明。

---

## 五、使配置生效

- **重启网关**：若刚改过 `~/.openclaw/openclaw.json`，在 ClawX **设置 → 网关** 点 **重启**，或退出 ClawX 再打开。
- **飞书端**：事件订阅与长连接需在**网关已启动**时保存，否则长连接可能保存失败。

---

*配置与验证更新时间：2026-03-06。*
