---
name: Gitea管理
description: CKB NAS 自建 Gitea 的仓库创建、推送、API、挂载管理。触发词：Gitea、推送到Gitea、创建仓库、Git推送、CKB Git、界面不显示。统一用 HTTPS+API 创建，确保仓库在 Gitea 界面可见。
triggers: Gitea、Gitea管理、推送到Gitea、创建Gitea仓库、Git推送CKB、CKB_NAS_Git、仓库界面不显示
owner: 金仓
group: 金
version: "1.2"
updated: "2026-04-02"
---

# Gitea 管理

CKB NAS 自建 Gitea 的**创建、推送、API、挂载**统一管理。Git 相关内容、API、凭证均通过本 Skill 执行。

### 局域网优先（卡若AI 实时同步）

- **`自动同步.sh` / `gitea_push_smart.sh`**：在 `脚本/gitea_push.conf` 配置 **`GITEA_LAN_IP`** 与 **`GITEA_LAN_PORT`**（当前默认 **192.168.1.201:3000**，与 NAS 上 Gitea 监听一致；与 git `remote` 里 FRP 端口不同时由 `GITEA_LAN_PORT` 覆盖）
- **推送记录与 `运营中枢/工作台/代码管理.md` 链接**：以内网 **http://192.168.1.201:3000/fnvtk/karuo-ai** 为准
- **`sync_wiki_to_gitea.sh`**：HTTPS 克隆/推送默认同上内网地址；外网可走 SSH 或自建域名
- **外网备用**：`open.quwanzhi.com`（端口以 FRP 为准，如 13000）

---

## 一、强制规则（每次必守）

1. **新建仓库**：必须用 **Gitea API 或 Web** 创建，**禁止** SSH 手动 `mkdir+git init --bare`
2. **推送方式**：统一用 **HTTPS**（账号密码），不用 SSH
3. **HTTPS 访问**：内网 **http://192.168.1.201:3000/fnvtk/{仓库名}**；外网可用 **http://open.quwanzhi.com:3000** 或 FRP 映射端口（以实际为准）

> 违反上述规则会导致仓库不显示在 Gitea 界面。

---

## 二、凭证与 API（来自 00_账号与API索引）

| 项 | 值 |
|----|-----|
| 地址 | http://open.quwanzhi.com:3000 |
| 账号 | fnvtk |
| 密码 | Zhiqun1984 |
| HTTPS 推送 URL | `http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{仓库名}.git`（密码小写 zhiqun1984 更稳；大仓用 Token 见 `references/命令行建仓与推送流程.md`） |
| 存储路径（NAS） | `/volume1/git/github/fnvtk/{仓库名}.git` |

---

## 三、创建仓库（API）

```bash
curl -u "fnvtk:Zhiqun1984" -X POST "http://open.quwanzhi.com:3000/api/v1/user/repos" \
  -H "Content-Type: application/json" \
  -d '{"name":"仓库名","description":"描述","private":false}'
```

---

## 四、推送（HTTPS）

```bash
git remote add gitea "http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/仓库名.git"
git push -u gitea main
```

---

## 四（续）、添加仓库协作者（拉取+推送权限）

为仓库添加协作者、赋予**写权限**（pull + push）。协作者必须**已在 Gitea 注册**，按**用户名**添加。

```bash
# permission: read=只读拉取, write=拉取+推送, admin=完全权限
curl -u "fnvtk:zhiqun1984" -X PUT "http://open.quwanzhi.com:3000/api/v1/repos/fnvtk/仓库名/collaborators/用户名" \
  -H "Content-Type: application/json" -d '{"permission":"write"}'
```

示例（karuo-ai）：
```bash
curl -u "fnvtk:zhiqun1984" -X PUT "http://open.quwanzhi.com:3000/api/v1/repos/fnvtk/karuo-ai/collaborators/用户名" \
  -H "Content-Type: application/json" -d '{"permission":"write"}'
```

> API 认证建议使用小写密码 `zhiqun1984`（与推送 HTTPS 一致）。

---

## 五、已纳入管理的仓库（界面可见）

| 仓库 | Gitea 地址 |
|------|------------|
| karuo-ai | http://open.quwanzhi.com:3000/fnvtk/karuo-ai |
| suanli-juzhen | http://open.quwanzhi.com:3000/fnvtk/suanli-juzhen |
| yinzhanggu-finance | http://open.quwanzhi.com:3000/fnvtk/yinzhanggu-finance |
| skills | http://open.quwanzhi.com:3000/fnvtk/skills |
| cunkebao, cunkebao_v3, cunkebao_v4 | http://open.quwanzhi.com:3000/fnvtk/ |
| kr, kr-phone, karuo-deploy | 同上 |
| wanzhi, zhiji, godeye, my, mybooks | 同上 |
| Mycontent（一场soul的创业实验） | http://open.quwanzhi.com:3000/fnvtk/Mycontent |
| soul-yongping（一场soul的创业实验-永平 网站） | http://open.quwanzhi.com:3000/fnvtk/soul-yongping |

---

## 六、修复「NAS 有但界面不显示」的仓库

NAS 文件系统上可能有通过 SSH 手动创建的 `.git` 目录，Gitea 数据库无记录，故界面不显示。

**处理步骤**：用 API 创建同名仓库 → 若本地有内容则 `git push` 补齐。

```bash
# 1. API 创建（使界面显示）
curl -u "fnvtk:Zhiqun1984" -X POST "http://open.quwanzhi.com:3000/api/v1/user/repos" \
  -H "Content-Type: application/json" \
  -d '{"name":"仓库名","description":"","private":false}'

# 2. 本地添加 remote 并推送
cd /path/to/local/repo
git remote add gitea "http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/仓库名.git"
git push -u gitea main
```

---

## 六（续）、Windows `git clone` 报 **502**（能开网页但 Git 失败）

**现象**：`fatal: unable to access 'http://192.168.1.201:3000/fnvtk/xxx.git/': The requested URL returned error: 502`。

**结论（已验证）**：在**与 NAS 同网段、直连 `192.168.1.201:3000`** 的机器上，`git clone` 的 **GET `/info/refs` + POST `/git-upload-pack`** 均可 **200**，说明 **Gitea 与账号密码本身通常正常**；502 多表示请求**未直连到 Gitea**，或**中间反代/代理**对 Git 的 POST 处理异常。

### 1. Windows 本机（优先做）

1. **确认能直连 NAS**：浏览器打开 `http://192.168.1.201:3000/fnvtk/users`（或对应仓库页），须与公司内网同一网段；若打不开，先修网络/VPN/路由，不要先怪 Git。  
2. **清掉 Git 走系统代理**（很常见导致 502/奇怪中断）：
   ```bat
   git config --global --unset http.proxy
   git config --global --unset https.proxy
   ```
   若公司策略必须用代理，对局域网例外（示例，按实际代理地址改）：
   ```bat
   git config --global http.http://192.168.1.201:3000.proxy ""
   ```
3. **密码里有特殊字符（如末尾 `.`）**：不要依赖「写在 URL 里」一种写法，改用**无密码 URL + 凭据**更稳：
   ```bat
   git clone http://192.168.1.201:3000/fnvtk/users.git
   ```
   提示用户名填 Gitea 账号，密码填 Gitea 密码；或先把密码 **URL 编码**再放进 URL（末尾点 → `%2E`）。  
4. **换 Git 版本**：过旧的 Git for Windows 对 HTTP/鉴权偶发问题，升级到较新版本再试。

### 2. NAS 前若有 Nginx/宝塔反代到 Gitea

在 **location** 里保证 Git 大 POST 不被掐断（示例，按实际 `proxy_pass` 改）：

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_buffering off;
proxy_request_buffering off;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
client_max_body_size 0;
```

改后 `nginx -t` 并重载。若反代只监听外网、内网直连 3000 正常，则**内网同事请直接用 `http://IP:3000`，不要走域名反代**，可立刻规避 502。

### 3. 外网拉取

内网不可达时，用 Skill 第二节中的 **FRP/域名**（如 `open.quwanzhi.com` 与对应端口），remote 改为该地址；仍 502 时同样检查**该链路上的 Nginx 配置**与 **frpc → 本机 3000** 是否存活。

---

## 七、关联文档（见第十一节）

---

## 八、卡若AI 调用流程

1. 读本 SKILL + `Gitea推送_卡若AI调用手册.md`
2. 新建仓库 → 用 API 创建
3. 推送 → `git push gitea main`（remote 用 HTTPS URL）
4. 检查界面 → http://open.quwanzhi.com:3000/fnvtk/

---

## 九、界面功能（工单 / 合并请求 / 百科 / 版本发布 / 项目）

确保仓库在 Gitea 上以下功能可用、有说明可查：

| 功能 | 说明 |
|:---|:---|
| **工单** | 模板在 `.gitea/ISSUE_TEMPLATE/`，新建工单可选：功能建议、Bug 反馈、任务报备 |
| **合并请求** | 模板 `.gitea/pull_request_template.md`，合并时带出说明与自检项 |
| **百科** | 源在 `01_卡资（金）/金仓_存储备份/Gitea管理/百科源文件/`，含 Home、快速开始、五行角色、技能索引、Gitea使用、**代码管理与脚本**；同步脚本 `sync_wiki_to_gitea.sh` |
| **版本发布** | 脚本 `01_卡资（金）/金仓_存储备份/Gitea管理/脚本/create_gitea_release.sh` 可打 tag 并建 Release |
| **项目** | 在 Gitea 页「项目」新建看板，工单拖入待办/进行中/已完成 |
| **代码管理** | 每次上传写入 `运营中枢/工作台/代码管理.md`（代码推送+百科同步结果+链接） |

---

## 十、本地有更新 → 同步到 Gitea（实时协同）

| 项目 | 脚本 | 说明 |
|------|------|------|
| 卡若AI | `bash 01_卡资（金）/金仓_存储备份/Gitea管理/脚本/自动同步.sh` | 代码+百科+代码管理 |
| 分布式算力矩阵 | `bash 01_卡资（金）/金仓_存储备份/Gitea管理/脚本/auto_sync_suanli_juzhen.sh` | 代码 |
| soul-yongping（永平网站） | `push_soul_yongping.sh` 首次推送；`sync_soul_yongping.sh` 有变更时同步；`watch_and_sync_soul_yongping.sh` 监控本地变更并自动同步 | 提交说明写清变更内容与修改原因 |

**Webhook 说明**：Webhook 是 Gitea→外部（push 后通知飞书/触发部署），**不能**实现本地→Gitea。本地→Gitea 用上述脚本，可定时执行或对话结束时执行。详见 `references/Webhook与本地协同方案.md`。

---

## 十（续）、卡若AI 上传时同步的板块

执行 `bash 01_卡资（金）/金仓_存储备份/Gitea管理/脚本/自动同步.sh` 时会：

1. **代码**：排除 >20MB → 提交 → 推送到 Gitea 主仓
2. **百科**：自动执行 `sync_wiki_to_gitea.sh`，将 wiki_source 推送到仓库「百科」页
3. **代码管理**：写入 `gitea_push_log.md` 与 `代码管理.md`（时间、代码/百科结果、提交说明、仓库/百科链接）

若百科尚未初始化（首次为空）：可先到 Gitea 仓库「百科」→「创建第一个页面」标题填 **Home** 保存一次，再执行上传；或运行 `bash 01_卡资（金）/金仓_存储备份/Gitea管理/脚本/init_wiki_gitea.sh` 尝试 API 初始化。

---

## 十一、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| Webhook与本地协同 | `Gitea管理/references/Webhook与本地协同方案.md` | 本地→Gitea、Webhook 用途、定时 sync |
| Gitea 推送手册 | `运营中枢/references/Gitea推送_卡若AI调用手册.md` | 卡若AI 调用、有更新就上传 |
| 工单/合并请求/Wiki/发布 | `运营中枢/references/Gitea_工单与合并请求使用说明.md` | 各功能使用说明 |
| 代码管理 | `运营中枢/工作台/代码管理.md` | 每次上传记录 |
| 账号与 API | `运营中枢/工作台/00_账号与API索引.md` § Gitea | 凭证 |
| 命令行建仓与推送 | `Gitea管理/references/命令行建仓与推送流程.md` | 全命令行建仓+Token 推送+大仓防超时 |
