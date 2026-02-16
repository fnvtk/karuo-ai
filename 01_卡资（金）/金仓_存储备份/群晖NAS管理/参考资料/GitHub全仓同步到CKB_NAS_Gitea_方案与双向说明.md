# GitHub 全仓同步到 CKB NAS Gitea 方案与双向说明

> **目标**：GitHub 与存客宝 NAS Gitea **直接接通**——GitHub 有更新即拉取并推送到 NAS Gitea，**无需指定** Gitea（固定为存客宝）。  
> **维护**：金仓

---

## 一、直接接通（推荐）

- **Gitea 固定为存客宝 NAS**：`http://open.quwanzhi.com:3000`，用户 `fnvtk`，不在脚本里指定或改配置。
- **流程**：GitHub 有新提交 → 定时在 NAS 上拉取 → 推送到存客宝 NAS Gitea。
- **一键部署**（本机执行一次）：从账号索引自动读 Token，把同步脚本和定时任务部署到 NAS，之后两边自动同步。**所有 fnvtk 的 GitHub 仓库都会同步到 Gitea，显示在 open.quwanzhi.com:3000 界面，目录结构与 GitHub 一致。**

```bash
# 在 卡若AI 根目录执行（需本机能 SSH 到存客宝 NAS 192.168.1.201）
bash "01_卡资（金）/_团队成员/金仓/群晖NAS管理/scripts/deploy_github_to_gitea_on_nas.sh"
```

部署后：每 **30 分钟** NAS 自动执行一次「拉取 GitHub → 推送到存客宝 Gitea」，界面与 GitHub 结构保持同步；无需再配或再问。

---

## 二、架构与流向

| 方向 | 说明 | 实现方式 |
|:-----|:-----|:---------|
| **GitHub → Gitea** | 主向同步，保持 Gitea 与 GitHub 一致 | NAS 上 `sync_github_to_gitea.sh` + 定时（cron） |
| **Gitea → GitHub** | 可选，仅在「以 Gitea 为主」的少数仓库使用 | Gitea Webhook 或本地 push 后手动/脚本推送到 GitHub |

**建议**：默认以 **GitHub 为源真相**，Gitea 为镜像；双向仅对个别在 NAS 上也会改动的仓库配置。

---

## 三、前置条件

- **CKB NAS 上 Gitea 已部署**：见 `references/CKB_NAS_Gitea_类GitHub访问.md`，地址固定 `http://open.quwanzhi.com:3000`。
- **Token**：使用一键部署时，从 `运营中枢/工作台/00_账号与API索引.md` 自动读取 GitHub Token 与 Gitea 密码，无需单独配置。

---

## 四、同步脚本用法（NAS 上）

脚本在 NAS 上位于 `/volume1/docker/gitea/sync_github_to_gitea.sh`，Token 从同目录 `sync_tokens.env` 读取（部署时已写入）。

### 4.1 全量同步（fnvtk 下所有仓库）

```bash
ssh fnvtk@192.168.1.201 "/bin/bash /volume1/docker/gitea/sync_github_to_gitea.sh"
```

### 4.2 只同步指定仓库

```bash
ssh fnvtk@192.168.1.201 "/bin/bash /volume1/docker/gitea/sync_github_to_gitea.sh --repo karuo-ai"
```

### 4.3 环境变量说明（可选覆盖）

| 变量 | 说明 |
|:-----|:-----|
| sync_tokens.env | 部署时生成，含 GITHUB_TOKEN、GITEA_TOKEN（可为 Gitea 登录密码） |
| Gitea | 固定存客宝 NAS，不可覆盖 |
| SYNC_WORK_DIR | 临时目录，默认 `/tmp/github_gitea_sync` |

---

## 五、自动触发（推荐：NAS 定时）

**直接接通**：一键部署已在 NAS 上添加 cron，每 **30 分钟** 执行一次「拉取 GitHub → 推送到存客宝 Gitea」，所有项目显示在 Gitea 界面，文件结构与 GitHub 一致。

- 定时：`*/30 * * * *` 执行 `/volume1/docker/gitea/sync_github_to_gitea.sh`
- 日志：`/volume1/docker/gitea/sync.log`
- 查看：`ssh fnvtk@192.168.1.201 tail -f /volume1/docker/gitea/sync.log`
- **组织**：仓库均在用户 `fnvtk` 下；若需按组织分类，可在 Gitea「探索」→「创建组织」后，在仓库设置中转移至对应组织。

---

## 六、双向同步说明

- **主向**：**GitHub → Gitea** 已由上述脚本 + 定时/Actions 覆盖，保证 GitHub 一有更新就推到 Gitea。
- **反向**：**Gitea → GitHub** 仅在部分仓库需要时再开：
  - **方式一**：在 Gitea 仓库设置 → Web 钩子 → 添加 “Gitea” 或 “HTTP” 钩子，指向自建服务：该服务在收到 push 后执行 `git push` 到对应 GitHub 仓库。需自行处理冲突与权限。
  - **方式二**：在 NAS 或本机对「在 Gitea 上也会改」的仓库，配置双 remote（origin=Gitea、github=GitHub），提交后先 push Gitea 再 `git push github main`，或写小脚本在 push Gitea 后自动 push GitHub。

建议：大部分仓库仅做 **GitHub → Gitea** 单向镜像；需要双向的仓库单独配置并约定「以谁为主、冲突如何解决」。

---

## 七、相关文档与脚本

| 文档/脚本 | 说明 |
|:----------|:-----|
| `references/CKB_NAS_Gitea_类GitHub访问.md` | Gitea 部署与访问 |
| `scripts/sync_github_to_gitea.sh` | 全仓/单仓同步（固定推送到存客宝 NAS Gitea） |
| `scripts/deploy_github_to_gitea_on_nas.sh` | 一键部署到 NAS，从账号索引读 Token，接通 GitHub ↔ Gitea |
| `references/GitHub与Gitea同步_脚本与钩子规则.md` | 脚本与钩子是否冲突、最佳方案、Gitea 钩子设置与规则 |

---

*版本：v1.0 | 2026-02*
