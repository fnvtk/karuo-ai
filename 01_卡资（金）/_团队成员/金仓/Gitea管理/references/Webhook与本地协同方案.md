# Gitea Webhook 与本地协同方案

> 目标：Gitea 上项目与存客宝 NAS Gitea 实时同步，本地有更新即推送到 Gitea，Webhook 负责下游通知。

---

## 一、角色分工

| 方向 | 实现方式 | Webhook 能否实现？ |
|:-----|:---------|:-------------------|
| **本地 → Gitea** | 定时/对话结束执行 sync 脚本 | ❌ 不能（Webhook 是 Gitea→外部） |
| **Gitea → 下游** | Webhook 通知外部 URL | ✅ 能 |
| **GitHub → Gitea** | NAS 上 sync_github_to_gitea.sh 每 30 分钟 | 已实现 |

---

## 二、本地有更新 → 同步到 Gitea

### 2.1 已纳入的项目与脚本

| 项目 | 脚本 | 说明 |
|------|------|------|
| 卡若AI | `_共享模块/auto_sync_gitea.sh` | 代码+百科+代码管理 |
| 分布式算力矩阵 | `Gitea管理/scripts/auto_sync_suanli_juzhen.sh` | 代码 |

### 2.2 定时执行（可选）

```bash
# 每 5 分钟同步 卡若AI
*/5 * * * * /bin/bash /Users/karuo/Documents/个人/卡若AI/_共享模块/auto_sync_gitea.sh

# 每 10 分钟同步 分布式算力矩阵
*/10 * * * * /bin/bash "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/_团队成员/金仓/Gitea管理/scripts/auto_sync_suanli_juzhen.sh"
```

`crontab -e` 添加上述行，或使用 macOS launchd。

### 2.3 卡若AI 行为

对话或任务对 卡若AI / 分布式算力矩阵 产生变更后，在对话结束前执行对应 sync 脚本。

---

## 三、Webhook 用途（Gitea → 外部）

Webhook 在 **Gitea 有 push/PR 等事件时** 向外部 URL 发 HTTP POST，可用于：

| 用途 | 目标 URL 示例 | 说明 |
|------|---------------|------|
| 飞书/钉钉通知 | 飞书机器人 Webhook | push 后通知团队 |
| 触发部署 | 自建服务 /deploy?repo=xxx | 收到 push 后拉取并部署 |
| 触发 NAS 拉取 | NAS 上的 HTTP 服务 | Gitea 有更新时拉取到指定目录 |

### 3.1 配置 Webhook

1. Gitea → 用户设置 → Web 钩子 → 添加 Web 钩子
2. 选「Gitea」或「HTTP」，填目标 URL
3. 勾选触发事件：push、pull request 等
4. 用户级钩子会对**所有拥有的仓库**生效

### 3.2 局限性

- **不能**实现：本地文件变化 → 自动 push 到 Gitea
- **能**实现：Gitea 有 push → 通知/触发下游

---

## 四、整体流程

```
本地编辑 ──(定时/对话结束)──▶ sync 脚本 ──▶ push ──▶ Gitea
                                                    │
                                                    ▼
                                            Webhook 通知外部
                                            (飞书/部署/NAS拉取)
```
