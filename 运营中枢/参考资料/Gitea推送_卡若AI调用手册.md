# Gitea 推送 — 卡若AI 调用手册

> 凭证与接口记录，下次调用直接读**Gitea管理 Skill** + 本文件。  
> **Skill 路径**：`01_卡资（金）/_团队成员/金仓/Gitea管理/SKILL.md`  
> **本文件路径**：`_共享模块/references/Gitea推送_卡若AI调用手册.md`

---

## ⚠️ 强制规则（必须遵守）

1. **新建仓库**：必须通过 Gitea API 或 Web 创建，**禁止** SSH 手动 `mkdir+git init --bare`，否则不会显示在 Gitea 界面
2. **推送方式**：统一用 **HTTPS**（账号密码），不用 SSH
3. **HTTPS 访问**：`http://open.quwanzhi.com:3000/fnvtk/{仓库名}` 可直接打开

---

## 一、凭证（来自 00_账号与API索引）

| 项 | 值 |
|----|-----|
| 地址 | http://open.quwanzhi.com:3000 |
| 账号 | fnvtk |
| 密码 | Zhiqun1984 |
| HTTPS 克隆/推送 | `http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{仓库名}.git` |

---

## 二、推送方式（HTTPS 优先）

### 2.1 日常推送（已有仓库）

```bash
git remote add gitea "http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{仓库名}.git"
git push gitea main
```

### 2.2 新建仓库（必须用 API，才能显示在 Gitea 界面）

```bash
# 用 Basic Auth 创建仓库（fnvtk:Zhiqun1984）
curl -u "fnvtk:Zhiqun1984" -X POST "http://open.quwanzhi.com:3000/api/v1/user/repos" \
  -H "Content-Type: application/json" \
  -d '{"name":"仓库名","description":"描述","private":false}'

# 然后添加 remote 并推送
git remote add gitea "http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/仓库名.git"
git push -u gitea main
```

> 禁止用 SSH 手动创建 bare 仓库，否则 Gitea 数据库无记录，界面不显示。

---

## 三、已配置仓库

| 仓库 | 路径 | Gitea URL | 远程名 |
|------|------|-----------|--------|
| 卡若AI | /Users/karuo/Documents/个人/卡若AI | http://open.quwanzhi.com:3000/fnvtk/karuo-ai | gitea |
| 分布式算力矩阵 | /Users/karuo/Documents/1、金：项目/3、自营项目/分布式算力矩阵 | http://open.quwanzhi.com:3000/fnvtk/suanli-juzhen | gitea |

---

## 四、卡若AI 调用流程

1. **读 Gitea管理 Skill**：`01_卡资（金）/_团队成员/金仓/Gitea管理/SKILL.md`
2. 读本文件 + `00_账号与API索引` § Gitea
3. 取凭证：fnvtk / Zhiqun1984
4. **新建仓库**：用 API `curl -u fnvtk:Zhiqun1984` 创建
5. **推送**：`git push gitea main`（remote 用 HTTPS URL）

---

## 五、卡若AI 有更新就上传（实时同步 Gitea）

| 项 | 说明 |
|:---|:---|
| **脚本** | `_共享模块/auto_sync_gitea.sh` |
| **目标** | http://open.quwanzhi.com:3000/fnvtk/karuo-ai |
| **规则** | 单文件 >20MB 不提交、不推送（与 Skill 目录规则一致） |
| **每次上传会** | 1) 推送代码  2) 同步百科（Wiki）  3) 写入推送记录与代码管理 |

**建立记录**（每次推送成功后自动写入）：
- `_共享模块/工作台/gitea_push_log.md` — 推送记录
- `_共享模块/工作台/代码管理.md` — 代码管理（含代码推送结果、百科同步结果、链接到仓库/百科）

**卡若AI 行为**：对话或任务对工作台产生文件变更后，在对话结束前执行一次 `bash _共享模块/auto_sync_gitea.sh`，使 Gitea 代码与百科保持最新，并写入代码管理。
