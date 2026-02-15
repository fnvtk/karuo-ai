---
name: Gitea管理
description: CKB NAS 自建 Gitea 的仓库创建、推送、API、挂载管理。触发词：Gitea、推送到Gitea、创建仓库、Git推送、CKB Git、界面不显示。统一用 HTTPS+API 创建，确保仓库在 Gitea 界面可见。
triggers: Gitea、Gitea管理、推送到Gitea、创建Gitea仓库、Git推送CKB、CKB_NAS_Git、仓库界面不显示
owner: 金仓
version: "1.0"
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

## 七、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| Gitea 推送手册 | `_共享模块/references/Gitea推送_卡若AI调用手册.md` | 卡若AI 调用流程 |
| 账号与 API | `_共享模块/工作台/00_账号与API索引.md` § Gitea | 凭证 |
| CKB NAS Gitea 访问 | `群晖NAS管理/references/CKB_NAS_Gitea_类GitHub访问.md` | 部署与访问 |

---

## 八、卡若AI 调用流程

1. 读本 SKILL + `Gitea推送_卡若AI调用手册.md`
2. 新建仓库 → 用 API 创建
3. 推送 → `git push gitea main`（remote 用 HTTPS URL）
4. 检查界面 → http://open.quwanzhi.com:3000/fnvtk/
