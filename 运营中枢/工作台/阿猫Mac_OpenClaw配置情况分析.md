# 阿猫笔记本电脑 OpenClaw（龙虾）配置情况分析

> 分析依据：卡若AI 工作台现有文档、阿猫 Mac 健康报告（2026-03-04）、ClawX/OpenClaw 网关部署说明。  
> 分析时间：2026-03-19

---

## 一、结论摘要

| 项目 | 情况 |
|------|------|
| **阿猫 Mac 上是否有 OpenClaw 网关** | **无**。现有 OpenClaw 网关部署在卡若本机（神射手 Docker 编排），端口 18789。 |
| **阿猫 Mac 上是否有 ClawX 客户端 / ~/.openclaw** | **文档未记录**。2026-03-04 健康报告中未提及 ClawX、OpenClaw 或 `~/.openclaw`。 |
| **若阿猫要用 OpenClaw/ClawX** | 二选一：**远程连卡若的网关**，或 **本机装 ClawX 并自启网关**（需配置 `~/.openclaw` 与模型 API）。 |

---

## 二、当前 OpenClaw 架构（卡若侧）

- **网关部署位置**：卡若本机，`开发/2、私域银行/神射手` 目录下 `docker compose`，容器名 `website-openclaw-gateway`。
- **端口**：18789（及 18790）。
- **网关地址**：本机访问为 `http://127.0.0.1:18789`。
- **配置来源**：卡若本机 `~/.openclaw`（含 `openclaw.json`），Docker 挂载该目录与 ClawX 共用。
- **鉴权**：`~/.openclaw/openclaw.json` 内 `gateway.auth.token`（文档记录为 `clawx-c79e7d198b3c7c17057f7ff2caa52bdc`）。
- **ClawX 使用方式**：在**同一台机器**上关闭「自动启动网关」，网关地址填 `http://127.0.0.1:18789`，Token 与上一致。详见《ClawX使用Docker网关说明》。

阿猫的 Mac（macbook.quwanzhi.com，用户 kr）是**另一台机器**，无法直接访问卡若本机 127.0.0.1:18789，除非通过内网/隧道/端口暴露。

---

## 三、阿猫 Mac 本机情况（来自健康报告）

- **主机**：macbook.quwanzhi.com:22203，用户 **kr**。
- **用途**：远程办公、飞书、Cursor、iCloud 同步婼瑄/卡若AI 等；**未提及** Docker、OpenClaw、ClawX、`~/.openclaw`。
- **磁盘**：数据卷约 92% 占用，仅约 18 GB 可用，不适合再长期跑重型 Docker 服务。
- **结论**：当前**没有**在阿猫 Mac 上部署 OpenClaw 网关或单独为阿猫记录 ClawX/OpenClaw 配置；若要用「龙虾」OpenClaw，需按下面两种方式之一配置。

---

## 四、阿猫 Mac 使用 OpenClaw 的两种方式

### 方式 A：远程连接卡若本机 OpenClaw 网关（推荐，无需在阿猫 Mac 跑网关）

1. **卡若本机**：保持神射手 Docker 中 `website-openclaw-gateway` 运行，并将 18789 对阿猫可达（例如 Tailscale、frp、或局域网 IP 端口转发）。阿猫 Mac 健康报告中有 ham0 25.30.239.48，若与卡若同处 Tailscale 等内网，可用卡若机器的 Tailscale IP + 18789。
2. **阿猫 Mac**：  
   - 安装 **ClawX**（若未安装）。  
   - 关闭「自动启动网关」。  
   - 网关地址填：`http://<卡若机器IP或域名>:18789`（例如 `http://25.x.x.x:18789` 或 `http://某域名:18789`）。  
   - 鉴权 Token 与卡若本机 `~/.openclaw/openclaw.json` 中 `gateway.auth.token` 一致（见上文）。
3. **优点**：不占阿猫 Mac 磁盘与内存，模型、技能等沿用卡若侧配置。  
4. **前提**：网络可达 + 卡若侧防火墙/路由器放行 18789（或仅内网/VPN 访问）。

### 方式 B：阿猫 Mac 本机安装 ClawX 并自启网关

1. **阿猫 Mac**：安装 ClawX，开启「自动启动网关」，由 ClawX 在本机启动 OpenClaw 网关进程。
2. **配置**：在本机创建并维护 `~/.openclaw/openclaw.json`（以及可选 `~/.openclaw/workspace/IDENTITY.md` 等），配置模型 API（如 api123.icu Base URL + Token，见《Claude_Code_api123配置说明》）、`gateway.auth.token` 等。
3. **缺点**：阿猫 Mac 磁盘已紧张（约 18 GB 可用）、内存 8 GB，本机常驻网关会占资源；且需单独维护一套模型与技能配置。

---

## 五、建议与后续可做事项

| 建议 | 说明 |
|------|------|
| **优先方式 A** | 在卡若侧暴露 18789（仅内网/VPN），阿猫 Mac 只装 ClawX 客户端并填远程网关地址 + Token，无需在阿猫 Mac 跑网关。 |
| **确认阿猫是否已装 ClawX** | 可 SSH 到阿猫 Mac（`ssh -p 22203 kr@macbook.quwanzhi.com`）执行：`ls -la ~/.openclaw 2>/dev/null || echo "无 .openclaw"`；`ls /Applications | grep -i claw`。 |
| **若采用方式 A** | 在 00_账号与API索引 或 本工作台 补充「阿猫 Mac ClawX 远程网关」一条：网关 URL、Token、使用场景（仅内网/VPN）。 |
| **若采用方式 B** | 可在阿猫 Mac 上复用《ClawX使用Docker网关说明》中的 Token 与配置结构，但 Base URL/模型 API 建议用 api123.icu 直连（见《Claude_Code_api123配置说明》阿猫 Mac 一节）。 |

---

## 六、相关文档

- 《ClawX使用Docker网关说明》： ClawX 连本机 Docker OpenClaw 网关（卡若本机）
- 《ClawX_THINK模式与界面说明》：`~/.openclaw/openclaw.json`、IDENTITY.md、控制台 18789
- 《阿猫Mac配置与健康分析_20260304》：阿猫 Mac 硬件、磁盘、用途
- 《Claude_Code_api123配置说明》：阿猫 Mac 默认 API（api123.icu）与 Token

---

*文档生成：卡若AI 工作台。*
