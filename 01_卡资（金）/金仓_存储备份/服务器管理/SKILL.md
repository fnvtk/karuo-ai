---
name: 服务器管理
description: 宝塔服务器统一管理与自动化部署
triggers: 服务器、宝塔、部署、SSL、HTTPS、Nginx、宝塔Node、内网穿透、域名、kr-ai、ngrok
owner: 金仓
group: 金
version: "1.1"
updated: "2026-03-02"
---

# 服务器管理

让 AI 写完代码后，无需人工介入，自动把项目「变成一个在线网站」。

---

## 快速入口（复制即用）

### 服务器资产

| 服务器 | IP | 配置 | 用途 | 宝塔面板 |
|--------|-----|------|------|----------|
| **本机 Docker 宝塔** | 127.0.0.1 | Docker 容器 | 本地建站、与腾讯云一致 | http://127.0.0.1:8888/btpanel |
| **存客宝** | 42.194.245.239 | 2核16G 50M | 私域银行业务 | https://42.194.245.239:9988 |
| **kr宝塔** | 43.139.27.93 | 2核4G 5M | Node 项目主力、辅助 | https://43.139.27.93:9988 |

### 凭证速查

**⚠️ 强制规则**：SSH 用 **root**、密码 **Zhiqun1984**（Z 大写），端口 22022 或 22。ckb 仅为面板账号。

```bash
# 本机 Docker 宝塔（本地）
地址: http://127.0.0.1:8888/btpanel
账号: ckb
密码: zhiqun1984

# SSH（root + Zhiqun1984 或密钥）
sshpass -p 'Zhiqun1984' ssh -p 22022 -o PubkeyAuthentication=no root@<IP>
# 或密钥: ssh -p 22022 -i "服务器管理/Steam/id_ed25519" root@43.139.27.93
# 多方式封装: bash scripts/kr宝塔_SSH登录.sh "命令"
# 存客宝: 42.194.245.239 | kr宝塔: 43.139.27.93

# 宝塔面板登录（三台统一）
账号: ckb
密码: zhiqun1984

# 宝塔API密钥
存客宝: TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi
kr宝塔: qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT
```

### 强制规则（每次执行必守）

1. **宝塔优先确认**：操作腾讯云服务器时，**先确认是否为宝塔服务器**。若是，**彻底去除 PM2，一律使用宝塔原生 Node 管理器**。所有 Node 项目启停、重启、状态查询仅通过宝塔面板（网站 → Node 项目）及 API。脚本：`kr宝塔_彻底去除PM2_仅用宝塔Node_宝塔终端执行.sh`。
2. **SSH 统一配置**：账号 **root**、密码 **Zhiqun1984**（Z 大写），端口 22022 或 22；或使用 id_ed25519 密钥。详见 `references/SSH登录方式与故障排查.md`。SSH 不通时用 TAT（腾讯云自动化助手）。
3. **宝塔 443 优先**：宝塔服务器 443 不监听时，**优先**检查是否运行系统 Nginx 而非宝塔 Nginx；若是，先 `killall nginx` 后启动宝塔 Nginx。
4. **经验沉淀**：每次涉及服务器/宝塔/部署的操作结束后，必须把经验写入 `02_卡人（水）/水溪_整理归档/经验库/待沉淀/`，防止同类问题重复出现。
5. **Skill 迭代**：每次有新的配置、教训、流程变更时，必须同步更新本 SKILL.md 或 references，保证下次调用时信息一致。
6. **卡若AI 复盘**：每次任务结束必须用卡若AI 复盘格式收尾（目标·结果·达成率、过程、反思、总结、下一步）。
7. **站点/Nginx/SSL 类操作 · 默认宝塔 API，被拒则降级**：凡涉及「添加站点、Nginx 反代、重载、申请 SSL、开启 HTTPS」等，**默认一律先用宝塔 API**（本机执行对应脚本，需执行机公网 IP 已加入该面板「设置 → API 接口」白名单）。若调用被拒绝（如 **IP 校验失败**、连接超时等），则**降级一：用 SSH 直接操作**（在服务器上写 Nginx 配置、重载、或在服务器内用 127.0.0.1 调宝塔 API 免白名单）。若 **SSH 操作不了**（连接被关、风控、无密钥等），则**降级二：用腾讯云 API**（TAT 下发命令、或 CVM/轻量 API 等）在服务器内完成同样操作。以后碰到此类问题，直接按「宝塔 API → SSH → 腾讯云 API」顺序执行，不反复询问用户。
8. **执行形式强制顺序**：宝塔服务器上任何操作，**一律按「宝塔 API → SSH → TAT」顺序尝试**。能通过宝塔 API 完成的先用 API；API 不可用（超时、IP 校验失败等）再用 SSH 在机内执行；SSH 不可用再用腾讯云 TAT。不得跳过顺序。
9. **前置检查（强制）**：每次对服务器做**修改类操作**（改配置、改站点、改 Node 项目、重启服务等）之前，**必须先检查目标项目及周边项目/应用**（如通过宝塔 API `get_project_list` 看 Node 项目状态、或 SSH 看进程与端口），确认修改不会导致其他应用不可用后再执行；执行后再次确认目标与周边状态正常。
10. **PHP 5.6 / Discuz 防护（强制）**：发现 PHP 5.6 **必须升级**（至少 7.4）；Discuz 站点必须加固目录权限、Nginx 路径封堵、PHP disable_functions；www 用户 shell 设为 `/sbin/nologin` 并锁定密码。详见 Q6 及「分布式算力管控 SKILL §11.3」。
11. **Docker API 安全（强制 · 最高优先级）**：Docker daemon **禁止** TCP 监听（`-H tcp://0.0.0.0:2375`），仅用 unix socket。iptables 必须 DROP 2375 端口。发现 `busybox:latest` 镜像立即删除并排查入侵。2026-03 KR 宝塔被入侵的真正根因就是 Docker API 暴露。详见「分布式算力管控 SKILL §11.1 类型五」。

---

## 一键操作

### 0. 卡若AI 网关 / 内网穿透（固定域名 kr-ai.quwanzhi.com）

- **标准方案**（阿里云 DNS + 宝塔 Nginx + 网关部署）：读 `references/内网穿透与域名配置_卡若AI标准方案.md`。
- **kr宝塔**（网关所在）：一键部署 `bash 01_卡资（金）/金仓_存储备份/服务器管理/scripts/部署卡若AI网关到kr宝塔.sh`
- **存客宝**（站点用宝塔 API）：部署到存客宝的站点/域名**一律用宝塔 API** 处理。卡若AI 站点：`python3 scripts/存客宝_宝塔API_卡若AI网关站点.py`（需将执行机 IP 加入存客宝面板 API 白名单）。
- **调用命令**：`curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" -H "Content-Type: application/json" -d '{"prompt":"你的问题"}' | jq -r '.reply'`
- 以后需配置内网穿透/新域名时，不询问用户，直接按该方案生成子域名并配置；存客宝上改站点/Nginx 用 API，见 `references/宝塔api接口文档.md`。

**站点/Nginx/SSL 被拒时的降级**：宝塔 API 报「IP 校验失败」或无法连接时 → ① 用 **SSH** 在服务器上直接写 Nginx、重载，或在服务器内用 `127.0.0.1:9988` 调宝塔 API（免白名单）；② 若 SSH 不可用 → 用 **腾讯云 TAT/API** 下发命令在机内执行。见本 SKILL 强制规则第 7 条。

### 1. 检查服务器状态

```bash
# 运行快速检查脚本（需各服务器 API 白名单含本机 IP）
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/脚本/快速检查服务器.py"
```

### 1.0a 腾讯云 API 重启宝塔 + IP 封禁处理

```bash
# 重启存客宝、kr宝塔（会解除 fail2ban 内存封禁）
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_宝塔服务器重启.py"
```

IP 解封：见 `references/SSH登录方式与故障排查.md` § 六。优化单行：`IP="公网IP"; for j in sshd ssh-iptables; do fail2ban-client set "$j" unbanip "$IP" 2>/dev/null; done`

### 1.1 磁盘臃肿 · 全方位检查与清理（SSH/API 不可用时）

当 SSH 或宝塔 API 无法远程连接时，在**宝塔面板 → 终端**执行：

- **脚本**：`运营中枢/工作台/宝塔_全方位检查与磁盘清理_一键脚本.sh`
- **操作指南**：`运营中枢/工作台/宝塔_服务器检查与清理_操作指南.md`

脚本会：检查负载/内存/磁盘、分析大目录与日志占用、执行 8 步清理（journalctl、apt、/tmp、网站日志、宝塔日志等）、输出清理前后 df 对比。完成后到面板【文件】→【回收站】清空。

### 2. 部署 Node 项目（标准流程）

```bash
# 1. 压缩项目（排除无用目录）
cd /项目路径
tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -czf /tmp/项目名_update.tar.gz .

# 2. 上传到服务器（kr宝塔，端口 22022，密码 zhiqun1984）
sshpass -p 'zhiqun1984' scp -P 22022 /tmp/项目名_update.tar.gz root@43.139.27.93:/tmp/

# 3. SSH部署
sshpass -p 'zhiqun1984' ssh -p 22022 root@43.139.27.93
cd /www/wwwroot/项目名
rm -rf app components lib public styles *.json *.js *.ts *.mjs *.md .next
tar -xzf /tmp/项目名_update.tar.gz
pnpm install
pnpm run build
rm /tmp/项目名_update.tar.gz

# 4. 宝塔 Node 重启（只用宝塔 API，不用 PM2）
# 批量启动：在服务器内执行 scripts/kr宝塔_node项目批量修复.py
# 详见 references/宝塔Node项目管理_SKILL.md
```

### 3. SSL证书检查/修复

```bash
# 检查所有服务器SSL证书状态
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/脚本/ssl证书检查.py"

# 自动修复过期证书
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/脚本/ssl证书检查.py" --fix
```

### 4. Node 项目批量启动（kr宝塔，只用宝塔 API，不用 PM2）

脚本 `scripts/kr宝塔_node项目批量修复.py` 须在**服务器内**执行：

```bash
# SSH 管道（账号 ckb，密码 zhiqun1984）
sshpass -p 'zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no ckb@43.139.27.93 'python3 -' < "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_node项目批量修复.py"
```

SSH 风控时，在 **kr宝塔 宝塔面板 → 终端** 上传脚本后执行。详见 `references/宝塔Node项目管理_SKILL.md`。

**kr宝塔 中文目录改英文迁移**（删映射、重命名为英文、更新 site.db/Nginx、只用宝塔 Nginx、启动 Node）：
```bash
# 宝塔终端执行（推荐）：上传 scripts/kr宝塔_中文目录改英文_宝塔终端执行.sh 后 bash 执行
# 或 TAT：./scripts/.venv_tx/bin/python scripts/腾讯云_TAT_kr宝塔_中文目录改英文迁移.py
```
迁移后路径：`/www/wwwroot/self/`、`/www/wwwroot/client/`、`/www/wwwroot/ext/`（不再使用 自营/客户/扩展）。

### 4a. www.lytiao.com Docker 化（存客宝 · 可多服务器复用）

**⚠️ 8080 被 frps 占用，已改用 8090。** Docker 拉取受国内网络影响，TAT 可能失败，**推荐宝塔终端手动执行**。

```bash
# 方式 1：宝塔终端（推荐）
# 打开 https://42.194.245.239:9988 → 终端 → 复制 存客宝_lytiao_Docker部署_宝塔终端执行_完整版.sh 整段内容粘贴

# 方式 2：腾讯云 TAT（网络良好时）
./scripts/.venv_tx/bin/python scripts/腾讯云_TAT_存客宝_lytiao_快速部署.py

# 方式 3：SSH 部署（SSH 可用时）
bash scripts/存客宝_lytiao_Docker部署.sh
```

部署后访问 `http://42.194.245.239:8090`。详见 `references/lytiao_Docker部署说明.md`。

### 5. kr宝塔 运行堵塞 + Node 深度修复

- **负载诊断**：`./scripts/.venv_tx/bin/python scripts/腾讯云_TAT_kr宝塔_负载诊断.py`（只读，输出负载/CPU/Node 进程）
- **负载分析文档**：`references/kr宝塔_负载100_原因分析与处理.md`
- **运行堵塞修复**：结束异常 node、停 Node、修复 site.db、批量启动。
- **TAT**：`./scripts/.venv_tx/bin/python scripts/腾讯云_TAT_kr宝塔_运行堵塞与Node深度修复.py`
- **宝塔终端**（推荐）：上传 `scripts/kr宝塔_运行堵塞与Node深度修复_宝塔终端执行.sh` 后 `bash` 执行。

### 5b. kr宝塔 网络卡/服务器卡 · 检查与处理

- **文档**：`references/kr宝塔_网络与服务器卡顿_检查与处理.md`
- **带宽使用情况（近24h）**：运行 `scripts/kr宝塔_腾讯云带宽与CPU近24h.py`（建议用 `scripts/.venv_tx/bin/python`，依赖 tencentcloud-sdk-python-monitor）。结论：出带宽最大已顶满 5M，属带宽卡主因；处理见文档「六、直接处理」。
- **SSH**：`ssh -p 22022 -i "服务器管理项目/Steam/id_ed25519" root@43.139.27.93`（私钥须 `chmod 600`）
- 本机快速检查：`ping 43.139.27.93`、`nc -zv 43.139.27.93 22022`
- 服务器内诊断与限流：在 **宝塔面板终端** 执行文档「六」中 6.1～6.3 命令（连接数、按 IP 统计、Nginx 限速）。
- **502 修复（如 soul.quwanzhi.com/admin）**：API 方式运行 `scripts/kr宝塔_宝塔API_修复502.py`（需 API 白名单）；或到 kr宝塔 **宝塔面板 → 终端** 执行 `nginx -t && nginx -s reload` 后，在「Node 项目」中重启 soul 相关项目。详见文档 6.6。

### 6. 常用诊断命令（kr宝塔等）

```bash
# 检查端口占用
ssh -p 22022 root@43.139.27.93 "ss -tlnp | grep :3006"

# ⚠️ 禁止使用 PM2，统一用宝塔 API 管理 Node 项目
# 查看 Node 项目状态：用宝塔 API get_project_list 或 TAT 脚本

# 测试HTTP响应
ssh -p 22022 root@43.139.27.93 "curl -I http://localhost:3006"

# 检查Nginx配置
ssh -p 22022 root@43.139.27.93 "nginx -t"

# 重载Nginx
ssh -p 22022 root@43.139.27.93 "nginx -s reload"

# DNS解析检查
dig soul.quwanzhi.com +short @8.8.8.8
```

---

## 端口配置表（kr宝塔 43.139.27.93）

| 端口 | 项目名 | 类型 | 域名 | 状态 |
|------|--------|------|------|------|
| 3000 | cunkebao | Next.js | mckb.quwanzhi.com | ✅ |
| 3001 | ai_hair | NestJS | ai-hair.quwanzhi.com | ✅ |
| 3002 | kr_wb | Next.js | kr_wb.quwanzhi.com | ✅ |
| 3003 | hx | Vue | krjzk.quwanzhi.com | ⚠️ |
| 3004 | dlmdashboard | Next.js | dlm.quwanzhi.com | ✅ |
| 3005 | document | Next.js | docc.quwanzhi.com | ✅ |
| 3006 | soul | Next.js | soul.quwanzhi.com | ✅ |
| 3015 | 神射手 | Next.js | kr-users.quwanzhi.com | ⚠️ |
| 3018 | zhaoping | Next.js | zp.quwanzhi.com | ✅ |
| 3021 | is_phone | Next.js | is-phone.quwanzhi.com | ✅ |
| 3031 | word | Next.js | word.quwanzhi.com | ✅ |
| 3036 | ymao | Next.js | ymao.quwanzhi.com | ✅ |
| 3043 | tongzhi | Next.js | touzhi.lkdie.com | ✅ |
| 3045 | 玩值大屏 | Next.js | wz-screen.quwanzhi.com | ✅ |
| 3050 | zhiji | Next.js | zhiji.quwanzhi.com | ✅ |
| 3051 | zhiji1 | Next.js | zhiji1.quwanzhi.com | ✅ |
| 3055 | wzdj | Next.js | wzdj.quwanzhi.com | ✅ |
| 3305 | AITOUFA | Next.js | ai-tf.quwanzhi.com | ✅ |
| 9528 | mbti | Vue | mbtiadmin.quwanzhi.com | ✅ |

### 端口分配原则

- **3000-3099**: Next.js / React 项目
- **3100-3199**: Vue 项目
- **3200-3299**: NestJS / Express 后端
- **3300-3399**: AI相关项目
- **9000-9999**: 管理面板 / 特殊用途

---

## 核心工作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Node项目一键部署流程                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   START                                                                     │
│     │                                                                       │
│     ▼                                                                       │
│  ┌──────────────────┐                                                      │
│  │ 1. 压缩本地代码  │  排除 node_modules, .next, .git                      │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 2. 上传到服务器  │  scp 到 /tmp/                                         │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 3. 清理旧文件    │  保留 .env 等配置文件                                 │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 4. 解压新代码    │  tar -xzf                                             │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 5. 安装依赖      │  pnpm install                                         │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 6. 构建项目      │  pnpm run build                                       │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 7. 宝塔面板重启  │  Node项目 → 重启                                       │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 8. 验证访问      │  curl https://域名                                     │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│        SUCCESS                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 操作优先级矩阵

| 操作类型 | 优先方式 | 备选方式 | 说明 |
|---------|---------|---------|------|
| 查询信息 | ✅ 宝塔API | SSH | API稳定 |
| 文件操作 | ✅ 宝塔API | SSH | API支持 |
| 配置Nginx | ✅ 宝塔API | SSH | API可读写 |
| 重载服务 | ⚠️ SSH | - | API无接口 |
| 上传代码 | ⚠️ SSH/scp | - | 大文件 |
| 添加项目 | ❌ 宝塔界面 | - | API不稳定 |

---

## 常见问题速查

### Q0: 宝塔 443 不监听（Connection refused）【优先检查】

**现象**：80 可达、443 不可达，安全组/证书/nginx -t 均正常。

**根因**：运行的是**系统 Nginx**（`/usr/sbin/nginx`），非**宝塔 Nginx**。系统 Nginx 配置不含宝塔 vhost 的 listen 443。

**解决**（任选）：
```bash
# 宝塔终端
killall nginx; sleep 2; /www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf
```
或 TAT：`python3 scripts/腾讯云_TAT_存客宝_Nginx443强制修复.py`

**防重复**：宝塔服务器 443 不监听时，**先** `ps aux | grep nginx` 确认是否系统 Nginx，再查安全组/证书。详见 `_经验库/已整理/运维经验/宝塔443不监听_系统nginx与宝塔nginx优先排查.md`。

### Q1: 外网无法访问（ERR_EMPTY_RESPONSE）

**原因**: 腾讯云安全组只开放443端口

**解决**: 
1. 必须配置SSL证书
2. Nginx配置添加443监听

### Q2: Node项目启动失败（Could not find production build）

**原因**: 使用 `npm run start` 但未执行 `npm run build`

**解决**: 先 `pnpm run build` 再重启

### Q3: 端口冲突（EADDRINUSE）

**解决**:
```bash
# 检查端口占用
ss -tlnp | grep :端口号

# 修改package.json中的端口
"start": "next start -p 新端口"
```

### Q4: DNS被代理劫持

**现象**: 本地DNS解析到198.18.x.x

**解决**: 
- 关闭代理软件
- 或用手机4G网络测试

### Q5: 禁止 PM2（强制）

**规则**：**所有腾讯云宝塔服务器，Node 项目统一用宝塔 Node API 管理（启停/重启/状态），严禁使用 PM2**。操作前先确认是否为宝塔服务器。

**解决**: 
- 如发现 PM2 残留: `pm2 kill`（清理后不再使用）
- 在宝塔面板【网站】→【Node 项目】管理启动/停止
- 批量操作见 `references/宝塔Node项目管理_SKILL.md`

### Q6: PHP 5.6 / Discuz 漏洞防护（⚠️ 2026-02 入侵根因）

**背景**：2026-02 KR 宝塔服务器遭 Mirai 僵尸网络 + 挖矿木马入侵，根因是 **www.lkdie.com / db.lkdie.com 的 Discuz 论坛运行在已 EOL 的 PHP 5.6**，攻击者通过 Discuz 已知漏洞获取 www 用户权限后投放恶意程序。

**强制规则（Rule 10）**：
1. **PHP 5.6 必须升级**到至少 7.4，推荐 8.0+
2. **Discuz 目录权限**收紧：`uc_server/data/`、`data/cache/` 禁执行 PHP
3. **Nginx 层封堵**：`/uc_server/`、`/misc.php`、`.sql/.bak` 等路径 deny all
4. **PHP disable_functions**：禁用 `exec,system,passthru,shell_exec,proc_open,popen`
5. **www 用户**：shell 设为 `/sbin/nologin`，密码随机化并锁定
6. **定期扫描**：每周运行 `threat_scanner_v2.sh`，详见「分布式算力管控 SKILL §11」

**修复步骤**：
```bash
# 1. 宝塔面板 → 软件商店 → 安装 PHP 7.4
# 2. 安装 Discuz 必要扩展：mysql,gd,curl,mbstring,xml,openssl
# 3. 备份数据库和站点文件
mysqldump -u root -p 数据库名 > /tmp/discuz_backup.sql
tar -czf /tmp/discuz_files_backup.tar.gz /www/wwwroot/论坛路径/
# 4. 宝塔面板 → 站点设置 → 切换 PHP 版本到 7.4
# 5. 测试站点功能
# 6. 确认无问题后卸载 PHP 5.6
```

**完整攻防体系**见：`01_卡资（金）/金仓_存储备份/分布式算力管控/SKILL.md` 第十一节。

---

## 安全约束

### 绝对禁止

- ❌ 输出完整密码/密钥到聊天
- ❌ 执行危险命令（rm -rf /, reboot等）
- ❌ 跳过验证步骤
- ❌ 使用独立PM2（避免与宝塔冲突）

### 必须遵守

- ✅ 操作前检查服务器状态
- ✅ 操作后验证结果
- ✅ 生成操作报告

---

## 相关脚本

| 脚本 | 功能 | 位置 |
|------|------|------|
| `腾讯云_TAT_kr宝塔_中文目录改英文迁移.py` | kr宝塔 中文目录改英文、删映射、更新 site.db/Nginx（TAT） | `./scripts/.venv_tx` |
| `kr宝塔_中文目录改英文_宝塔终端执行.sh` | 同上，宝塔终端手动执行 | `./scripts/` |
| `腾讯云_TAT_word_ai_hair_is_phone_诊断修复.py` | word/ai_hair/is_phone 日志诊断、MODULE_NOT_FOUND 修复、重启（宝塔 API） | `./scripts/` |
| `kr宝塔_node项目批量修复.py` | 批量启动 kr宝塔 Node 项目（服务器内执行，宝塔 API） | `./scripts/` |
| `kr宝塔_宝塔API_修复502.py` | 修复 502（重启 Nginx + soul 相关 Node） | `./scripts/` |
| `快速检查服务器.py` | 一键检查所有服务器状态 | `./脚本/` |
| `一键部署.py` | 根据配置文件部署项目 | `./脚本/` |
| `ssl证书检查.py` | 检查/修复SSL证书 | `./脚本/` |
| `腾讯云_TAT_存客宝_Nginx443强制修复.py` | **宝塔 443 不监听**：切回宝塔 Nginx | `./scripts/` |
| `tencent_image_snapshot_backup_to_nas.py` | 腾讯云镜像/快照备份到 CKB NAS | `./scripts/腾讯云镜像快照备份到CKB_NAS/` |

---

## 复盘与输出规范

- **卡若复盘**：每次对话结束必须按 **`运营中枢/参考资料/卡若复盘格式_固定规则.md`** 输出复盘块；**反思** 1～3 点，每点一句，简洁可执行，不超过 3 条。

## 宝塔 Node 项目管理（独立 Skill）

- **主 Skill**：`references/宝塔Node项目管理_SKILL.md` — 凭证、Node API、常见错误、脚本，**禁用 PM2**
- **强制**：所有 Node 项目统一用 **宝塔 Node 管理**，不用 PM2；确保项目在宝塔上运行
- **kr宝塔**：`references/kr宝塔_宝塔管理SKILL.md`
- **存客宝**：`references/存客宝_宝塔管理SKILL.md`

Node 项目批量启动、502 修复、EADDRINUSE 等均按主 Skill 操作。SSH 风控时优先用**宝塔面板终端**。

---

## 相关文档

| 文档 | 内容 | 位置 |
|------|------|------|
| `宝塔Node项目管理_SKILL.md` | 宝塔 Node 管理独立 Skill（凭证/错误/脚本） | `./references/` |
| `kr宝塔_宝塔管理SKILL.md` | kr宝塔专用管理 | `./references/` |
| `存客宝_宝塔管理SKILL.md` | 存客宝专用管理 | `./references/` |
| `卡若复盘格式_固定规则.md` | 复盘格式（目标·结果·达成率、过程、反思 1～3 点、总结、下一步） | `运营中枢/参考资料/` |
| `宝塔api接口文档.md` | 宝塔API完整接口说明 | `./references/` |
| `端口配置表.md` | 完整端口分配表 | `./references/` |
| `常见问题手册.md` | 问题解决方案大全 | `./references/` |
| `部署配置模板.md` | JSON配置文件模板 | `./references/` |
| `系统架构说明.md` | 完整架构图和流程图 | `./references/` |

---

## 历史对话整理

### kr_wb白板项目部署（2026-01-23）

- 项目类型: Next.js
- 部署位置: /www/wwwroot/kr_wb
- 域名: kr_wb.quwanzhi.com
- 端口: 3002
- 遇到问题: AI功能401错误（API密钥未配置）
- 解决方案: 修改 lib/ai-client.ts，改用 SiliconFlow 作为默认服务

### soul项目部署（2026-01-23）

- 项目类型: Next.js
- 部署位置: /www/wwwroot/soul
- 域名: soul.quwanzhi.com
- 端口: 3006
- 部署流程: 压缩→上传→解压→安装依赖→构建→宝塔Node项目添加→配置Nginx→配置SSL（禁止 PM2）
