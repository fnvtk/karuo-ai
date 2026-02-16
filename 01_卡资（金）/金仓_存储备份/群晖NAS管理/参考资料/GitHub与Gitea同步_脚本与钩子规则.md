# GitHub 与 Gitea 同步：脚本与钩子规则

> **目的**：说清定时脚本与 Web 钩子的关系、是否冲突、最佳用法与固定规则。  
> **维护**：金仓

---

## 一、脚本 vs 钩子

| 方式 | 触发 | 方向 | 说明 |
|:-----|:-----|:-----|:-----|
| **定时脚本**（cron） | 每 30 分钟 | GitHub → Gitea | NAS 上执行 `sync_github_to_gitea.sh`，拉取 GitHub 全仓/指定仓并推送到存客宝 Gitea。 |
| **GitHub Web 钩子** | GitHub 有 push 时 | GitHub → Gitea | GitHub 向 NAS 上的接收端发 POST，接收端执行同步脚本（实时）。 |
| **Gitea Web 钩子** | Gitea 有 push 时 | Gitea → 外部 | Gitea 向指定 URL 发 POST（通知用）；若要做 Gitea→GitHub 反向同步，需接收端再推送到 GitHub。 |

---

## 二、是否冲突？结论：不冲突，用锁兜底

- **脚本与 GitHub 钩子**：做的是同一件事（GitHub → Gitea），只是触发不同（定时 vs 事件）。可能同时发生（例如刚 push 完又赶上 cron），**不会逻辑冲突**，但并发跑同一仓库可能造成重复拉取/推送。
- **处理方式**：同步脚本已加**全局锁**（同一时间只允许一个同步进程）。钩子或 cron 触发时，若脚本已在跑，后到的会等待锁或超时跳过，**不会两个进程同时写同一仓库**。
- **Gitea 钩子**：若只做「GitHub → Gitea」单向，**不需要在 Gitea 配置钩子**。若要做「Gitea → GitHub」反向，Gitea 钩子只负责「通知接收端」，由接收端去 push 到 GitHub，与脚本（GitHub→Gitea）方向相反，**不冲突**。

---

## 三、最佳方案（推荐）

1. **主向：GitHub → Gitea（实时 + 兜底）**
   - **实时**：在 **GitHub** 仓库或组织里配置 Web 钩子，Payload URL 指向 NAS 上的 webhook 接收端（需 NAS 有可从外网访问的地址，如 frp）；触发时只同步该仓库（或按约定同步全仓）。
   - **兜底**：保留 **cron 每 30 分钟** 全量同步，防止钩子漏触发或网络问题。
   - **规则**：脚本带锁，钩子与 cron 都只调同一脚本，不会并发冲突。

2. **Gitea 钩子（按需）**
   - 若只需「GitHub 为源、Gitea 为镜像」，**不必在 Gitea 配置钩子**。
   - 若需「在 Gitea 的修改也推到 GitHub」：
     - 在 Gitea **用户设置 → Web 钩子** 添加「添加 Web 钩子」；
     - URL 填接收端地址，触发事件选「推送」等；
     - 接收端收到后，根据 payload 找到对应仓库并执行 `git push` 到 GitHub（需在接收端配置 GitHub 权限）。

3. **约定规则（固定）**
   - **源真相**：默认以 **GitHub 为准**，Gitea 为镜像；反向（Gitea→GitHub）仅对明确需要的仓库开启。
   - **只用一个同步脚本**：所有同步（cron 或钩子触发）都调用 `sync_github_to_gitea.sh`（可带 `--repo xxx`），脚本内用同一把锁。
   - **不在 Gitea 侧做「镜像仓库」与脚本重复**：若用 Gitea 的「从 URL 迁移/镜像」功能，就不要再对同一仓库用本脚本，二选一，避免双写。

---

## 四、Gitea 上钩子设置（界面说明）

- 打开 **open.quwanzhi.com:3000** → 右上角头像 → **设置** → 左侧 **Web 钩子**。
- 「添加 Web 钩子」：选类型（如 Gitea 或 HTTP），URL 填你的接收端地址（例如 `http://你的NAS或frp地址:端口/webhook`）。
- 触发事件：至少勾选「推送」；若需合并请求等再勾选对应项。
- 说明：此处钩子为**由 Gitea 发出**的通知，用于「Gitea → 外部」（如 Gitea→GitHub 反向同步）；**GitHub → Gitea** 的实时同步是在 **GitHub 侧** 配置钩子指向 NAS 接收端，而不是在 Gitea 配置。

---

## 五、脚本锁规则（实现层面）

- 同步脚本使用**全局锁目录** `$WORK_DIR.lock`（如 `/tmp/github_gitea_sync.lock`），通过 `mkdir` 原子性获取锁。
- 获取不到锁时，每 5 秒重试，超过 `SYNC_LOCK_WAIT` 秒（默认 300）则退出，不执行本次同步。
- 脚本正常或异常退出时用 `trap EXIT` 释放锁。
- **结论**：cron 与 webhook 可同时配置，两者都触发同一脚本，由锁保证同一时刻只跑一个同步，无冲突。

---

## 六、Web 钩子接收端（实时触发同步）

- **位置**：`scripts/webhook_receiver.py`（Python 3，仅标准库）。
- **在 NAS 上运行**：  
  `cd /volume1/docker/gitea && nohup python3 webhook_receiver.py >> webhook.log 2>&1 &`  
  默认监听 **9999** 端口，环境变量 `WEBHOOK_PORT` 可改。
- **行为**：对任意路径的 **POST**（如 `http://NAS或frp地址:9999/sync`）执行同步；若 body 为 JSON 且含 `repository.name`（GitHub/Gitea 格式），则只同步该仓库，否则全量同步。**GET** `/`、`/sync`、`/health` 返回 200 用于探活。
- **GitHub 配置**：仓库或组织 → Settings → Webhooks → Add webhook → Payload URL 填 `http://你的NAS公网或frp地址:9999/sync`，Content type 选 `application/json`，事件选 “Just the push event” 即可。
- **Gitea 配置**（仅当需要 Gitea→GitHub 反向时）：用户设置 → Web 钩子 → 添加 Web 钩子 → URL 填上述地址，触发选「推送」。

---

## 七、相关文件

| 文件 | 说明 |
|:-----|:-----|
| `scripts/sync_github_to_gitea.sh` | 带锁的同步脚本，GitHub → Gitea |
| `scripts/webhook_receiver.py` | NAS 上 Web 钩子接收端（被 GitHub/Gitea 调用） |
| `references/GitHub全仓同步到CKB_NAS_Gitea_方案与双向说明.md` | 全量同步与部署说明 |

---

*版本：v1.0*
