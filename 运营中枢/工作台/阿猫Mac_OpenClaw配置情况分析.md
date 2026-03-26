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

## 七、2026-03-23 更新：阿猫本机网关与模型（仅 api123.icu）

以下经 SSH 到 `macbook.quwanzhi.com:22203`（用户 `kr`）核实并已执行。

| 项目 | 说明 |
|------|------|
| **本机网关** | 已存在 `openclaw-gateway`（npm-global `openclaw`），工作目录 `~/.openclaw/workspace`；配置变更后已重启网关进程。 |
| **模型提供方** | `~/.openclaw/openclaw.json` 中 `models.providers` **仅保留** `api123-icu`；已移除原先的 `cerebras`、`cohere`。 |
| **对接方式** | `baseUrl`: `https://api123.icu`，`api`: `anthropic-messages`（与 [api123 说明页](https://api123.icu/about) 所指的 Anthropic 兼容用法一致；网关会走 `/v1/messages`）。 |
| **默认模型** | `agents.defaults.model.primary` 与 `agents.list[].model` 均为 `api123-icu/claude-sonnet-4-5-20250929`；`fallbacks` 已清空。 |
| **密钥** | 仅存于阿猫本机 `openclaw.json`，**勿写入仓库文档**。修改前已备份为 `~/.openclaw/openclaw.json.bak.api123_YYYYMMDD_HHMMSS`。 |
| **连通性** | 从该 Mac 对 `https://api123.icu/v1/messages` 做过最小请求，HTTP 200，模型可返回内容。 |

> **与上文「阿猫无网关」的冲突**：第五节及以前依据 2026-03-04 健康报告撰写；本节以 2026-03-23 现场状态为准——阿猫本机**已**在跑 OpenClaw 网关，且模型仅走 api123.icu。

---

## 八、2026-03-23 补充：ClashX Pro 与桌面手册

| 项目 | 说明 |
|------|------|
| **应用** | **ClashX Pro**（\`com.west2online.ClashXPro\`），非开源 ClashX。 |
| **配置目录** | \`~/.config/clash/\`；仅保留业务用 \`api.v6v.eu.yaml\` + 基础 \`config.yaml\`。 |
| **已移除/归档** | \`222.yaml\`、\`深蓝云.yaml\` 已移至 \`~/.config/clash/_archive_removed_20260324/\`（与 v6v 配置同体积的重复项）。 |
| **当前选用** | \`defaults write com.west2online.ClashXPro selectConfigName api.v6v.eu\` 并已重启应用。 |
| **策略组** | 订阅内主组名为 **深蓝云**；已通过 REST API（\`127.0.0.1:9090\`）切到 **🇸🇬 新加坡(Tiktok) 01**。 |
| **连通性说明** | 远程检测经 \`127.0.0.1:7890\` 访问外网曾出现 **502**，且 **npm** 访问 \`github.com:443\` 超时——需在阿猫本机确认 **已开启「设置为系统代理」**、节点可用与服务商流量；**勿**用 curl 直接把订阅 URL 写入 yaml（返回为 **Base64**，需由 Clash 解码或先解码再保存）。 |
| **桌面手册** | \`~/Desktop/OpenClaw与ClashX-简明手册.md\`（OpenClaw + Clash + 演示命令，**不含**订阅 token）。 |

---

## 九、2026-03-23 晚：Clash Verge Rev（从卡若本机同步）

| 项目 | 说明 |
|------|------|
| **安装** | 阿猫已安装 **Clash Verge**（从 GitHub Release DMG 安装至 \`/Applications/Clash Verge.app\`）。 |
| **配置同步** | 已将卡若本机 \`~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev/\` 打包（排除 \`logs\`），\`rsync\` 至阿猫同路径；\`profiles.yaml\` 中 **深蓝云 / GLOBAL** 已预置为 **🇸🇬 新加坡(Tiktok) 01**。 |
| **与 ClashX Pro** | 部署前已 \`killall "ClashX Pro"\`，避免与 Verge 抢系统代理；日常建议只开其一。 |
| **端口** | 混合端口 **7897**（与卡若本机 \`verge.yaml\` 一致）；Mihomo 控制面在本机为 **Unix socket** \`/tmp/verge/verge-mihomo.sock\`（非 TCP 9097）。 |
| **新加坡验证** | 经 \`127.0.0.1:7897\` 访问 \`ip-api.com\`，返回国家为 **Singapore**。 |
| **OpenClaw** | 使用 \`HTTPS_PROXY=http://127.0.0.1:7897\` 执行 \`npm install -g openclaw@latest\` 成功，版本 **2026.3.13**；已重启 \`openclaw gateway\`。 |
| **说明** | 同步的配置中仍含卡若侧 **第二条远程订阅**（若仅需 v6v，可在 Verge 内删除多余配置项，**勿**将订阅链接写入仓库）。 |

---

## 十、卡若 AI 网站（官网）对接阿猫 OpenClaw 网关

| 项目 | 说明 |
|------|------|
| **环境变量** | \`开发/3、自营项目/卡若ai网站/site/.env.local\` 已配置 \`OPENCLAW_GATEWAY_URL\`（默认 \`http://macbook.quwanzhi.com:18789\`）、\`OPENCLAW_GATEWAY_TOKEN\`（与阿猫 \`~/.openclaw/openclaw.json\` 中 \`gateway.auth.token\` 一致）、\`OPENCLAW_GATEWAY_MODEL\` 等。 |
| **Mongo** | \`storage-mongo\` 在初始化网关后会 **upsert** \`gw-openclaw-amiao\`（展示名：OpenClaw·阿猫笔记本（龙虾））。 |
| **路由** | 官网 \`gateway-router\` 对 \`claude*\` 模型在有该网关 Key 时 **优先** 走阿猫 OpenClaw。 |
| **Docker** | \`卡若ai网站/docker-compose.yml\` 已传入上述变量；生产环境须保证 **容器能访问** 阿猫网关地址（非把阿猫的 127.0.0.1 当本机）。 |
| **控制台** | 管理员 POST \`/api/gateway/sync-keys\` 时也会从环境变量合并 \`gw-openclaw-amiao\`。 |

---

## 十一、2026-03-24 更新：飞书「龙猫」应用新建与阿猫龙虾落地

| 项目 | 说明 |
|------|------|
| **新建应用** | 已在飞书开放平台新建企业自建应用 **龙猫**，App ID：`cli_a948fbf8b1b81ceb`。 |
| **当前阻塞** | 该新应用的 **App Secret** 仍为掩码态，未拿到明文前不能切换到该 App ID（否则龙虾飞书通道会认证失败）。 |
| **阿猫龙虾现状** | `~/.openclaw/openclaw.json` 已收敛为 `feishu.accounts.longmao` 单账号，默认账号为 `longmao`，`botName=龙猫`，私聊/群聊策略均为 `open`。 |
| **已验证** | `openclaw channels status --probe --json` 显示 `feishu.running=true`、`probe.ok=true`，当前在用可用应用 `cli_a48818290ef8100d`。 |
| **兼容策略** | 为保证业务不中断，先维持可用 App 运行；拿到新应用 Secret 后再原子切换到 `cli_a948fbf8b1b81ceb`。 |

---

## 十二、2026-03-25 更新：飞书「能发不收 / 龙虾不回」根因与修复

| 项目 | 说明 |
|------|------|
| **现象** | 飞书侧可对龙猫发消息，但龙虾长时间无自动回复；网关日志曾大量出现 `[ws] timeout`、偶发 `getaddrinfo ENOTFOUND open.feishu.cn`；模型侧曾出现 `403 Your request was blocked`（Cloudflare **error code: 1010**）。 |
| **根因 ①（模型）** | `api123.icu` 对 **Node/OpenClaw 默认 HTTP 指纹** 拦截；对 **curl** 放行。复现：本机 `urllib` 默认 UA → 403；改为 `User-Agent: curl/8.7.1` → 200。 |
| **修复 ①** | 在 `~/.openclaw/openclaw.json` 的 `models.providers.api123-icu` 增加 `headers.User-Agent`（值为 `curl/8.7.1` 或等价 curl UA），并重启网关。 |
| **根因 ②（上下文）** | 飞书群会话 `1186cd2b-…` 单轮上报 **~10.7 万 input tokens**，随后多轮 `assistant.content` 为空（output 0），用户侧表现为「完全不回」。 |
| **修复 ②** | 已备份并删除该群的 `sessions.json` 条目与对应 `*.jsonl`（备份后缀 `20260325_131134`），并设置 `agents.defaults.contextTokens: 120000` 作为窗口上限，迫使后续请求处于可控上下文。 |
| **根因 ③（链路）** | 飞书 **长连接 WebSocket** 曾长时间无法 `ws client ready`（与网络/DNS/代理切换相关）；修复模型与上下文后需保证网关日志出现 `ws client ready`。 |
| **验收** | 阿猫在目标群再发一句短消息（如「测回复」）；网关日志应出现 `received message` → `dispatch complete`；飞书侧应收到龙虾回复。 |

---

---

## 十三、阿猫笔记本「龙虾」（OpenClaw）复盘格式

与 **卡若AI 复盘 v6.0** 同一套真源：`运营中枢/参考资料/卡若复盘格式_固定规则.md`。在飞书侧写运维记录时，标题可写 **[龙虾复盘]（YYYY-MM-DD HH:mm）** 或 **[卡若复盘]（…）**，**五块与顺序不变**：🎯（三行：目标/结果/达成率）→ 📌 → 💡（含 **Human 3.0 四象限快扫** 一行）→ 📝 → ▶。

**Human 3.0 四象限**（用于 💡 末行，各半句）：**心智**（认知/觉察）、**身体**（时间精力资源）、**精神**（价值与关系）、**职业**（目标与成功标准）。全文见 `04_卡火（火）/火眼_智能追问/智能追问/参考资料/Human3.0提问法.md` §二。

---

## 十四、2026-03-26：飞书「龙猫」绑定与运行态（远程抽检）

| 项目 | 说明 |
|------|------|
| **飞书应用** | `~/.openclaw/openclaw.json` 中 **`defaultAccount` / `accountId` = `longmao`**，**`appId` = `cli_a948fbf8b1b81ceb`**，对应飞书自建应用 **龙猫**（`botName`：龙猫）。 |
| **配置结论** | 龙虾通道**已绑定龙猫应用**；群内收发仍须满足：机器人**已在该群**（避免飞书 230002 等）、模型 API 与网络正常（参见第十二节）。 |
| **运行态（本次 SSH）** | 抽检时本机 **TCP 18789 无监听**、未见常驻 **`openclaw gateway`** 进程——**不代表配置错误**；要对外提供网关，需在阿猫本机启动网关（或恢复 LaunchAgent）。 |
| **CLI 探针** | 若直接执行 `openclaw` 提示 **Node ≥ 22.16.0**（因默认落到 `~/.local/node22` 的 v22.14），请用 **Homebrew Node**：`/usr/local/opt/node/bin/node …/openclaw/dist/index.js channels status --probe --json`；或已放置 **`~/.openclaw/start-gateway-node24.sh`** 同逻辑启动网关（`nohup …/start-gateway-node24.sh >> ~/.openclaw/gateway_nohup.log 2>&1 &`）。 |

> 第十一节中「先维持 cli_a488…」为 2026-03-24 记录；**以本节与第十二节现场配置为准**——当前文件内 `longmao` 已指向 **cli_a948fbf8b1b81ceb**。

---

*文档生成：卡若AI 工作台。*
