---
name: Gitea管理
description: CKB NAS 自建 Gitea 的仓库创建、推送、API、挂载管理。触发词：Gitea、推送到Gitea、创建仓库、Git推送、CKB Git、界面不显示。统一用 HTTPS+API 创建，确保仓库在 Gitea 界面可见。
triggers: Gitea、Gitea管理、推送到Gitea、创建Gitea仓库、Git推送CKB、CKB_NAS_Git、仓库界面不显示
owner: 金仓
group: 金
version: "1.1"
updated: "2026-02-15"
---

# Gitea 管理

CKB NAS 自建 Gitea 的**创建、推送、API、挂载**统一管理。Git 相关内容、API、凭证均通过本 Skill 执行。

---

## 一、强制规则（每次必守）

1. **新建仓库**：必须用 **Gitea API 或 Web** 创建，**禁止** SSH 手动 `mkdir+git init --bare`
2. **推送方式**：统一用 **HTTPS**（账号密码），不用 SSH
3. **HTTPS 访问**：http://open.quwanzhi.com:3000/fnvtk/{仓库名} 可直接在浏览器打开

> 违反上述规则会导致仓库不显示在 Gitea 界面。

---

## 二、凭证与 API（来自 00_账号与API索引）

| 项 | 值 |
|----|-----|
| 地址 | http://open.quwanzhi.com:3000 |
| 账号 | fnvtk |
| 密码 | Zhiqun1984 |
| HTTPS 推送 URL | `http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{仓库名}.git` |
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
