# ClawX 使用 Docker 内 OpenClaw 网关

> 让 ClawX 连接 **Docker 内的 OpenClaw 网关**，而不是本机自启的网关。

---

## 一、Docker OpenClaw 网关信息

| 项 | 值 |
|:---|:---|
| **编排位置** | `开发/2、私域银行/神射手` |
| **容器名** | `website-openclaw-gateway` |
| **端口** | 18789 |
| **网关地址** | http://127.0.0.1:18789 |
| **配置挂载** | 使用本机 `~/.openclaw`，与 ClawX 共用同一套配置 |

---

## 二、ClawX 配置步骤（必须按此操作）

### 1. 关闭 ClawX 的「自动启动网关」

- 打开 **ClawX → 设置 → 网关**
- 将 **「自动启动网关」** 或 **「ClawX 启动时自动启动网关」** 设为 **关闭**
- 这样 ClawX 不再在本机启动 OpenClaw 进程，只作为客户端连接已有网关

### 2. 配置网关地址

- 在网关设置中，将 **网关地址** 设为：`http://127.0.0.1:18789`
- 若 ClawX 有「远程网关 URL」输入框，填上述地址
- Token 保持与 `~/.openclaw/openclaw.json` 内 `gateway.auth.token` 一致（当前为 `clawx-c79e7d198b3c7c17057f7ff2caa52bdc`）

### 3. 启动 Docker 网关

在终端执行（神射手目录）：

```bash
cd "/Users/karuo/Documents/开发/2、私域银行/神射手"
docker compose up -d
```

确认 `website-openclaw-gateway` 已启动：

```bash
docker compose ps
```

### 4. 验证连通

- 浏览器访问 http://127.0.0.1:18789 ，应能打开 OpenClaw 控制台
- 打开 ClawX，发起新对话，若可正常收发消息，则说明已成功连接 Docker 网关

---

## 三、注意事项

- **端口冲突**：Docker 网关占用 18789。若 ClawX 的「自动启动网关」仍开启，会与本机进程抢端口，导致连接失败。务必关闭自动启动。
- **配置共享**：Docker 容器挂载了 `~/.openclaw`，模型、飞书、技能等配置与 ClawX 共用，修改 `openclaw.json` 后重启 Docker 网关即可生效。
- **重启网关**：修改配置后执行  
  `docker compose restart website-openclaw-gateway`（在神射手目录）

---

*更新时间：2026-03-10*
