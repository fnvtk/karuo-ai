# 卡若AI 同步到 CKB NAS Git（外网域名 open.quwanzhi.com）

> **目标**：用外网域名 **open.quwanzhi.com** 管理 CKB NAS 上的 Git，卡若AI 只推 NAS 不推 GitHub，并可通过 HTTP 访问 NAS 内容。  
> **维护**：金仓 | 2026-02-13

---

## 一、用外网域名管理 Git（本机 push/pull）

当前 **origin** 已改为 **open.quwanzhi.com**，内网/外网都用下面地址：

| 用途 | 地址 |
|:-----|:-----|
| **Git 克隆 / 推送 / 拉取** | **`ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.git`** |

本机在卡若AI 目录执行 `git push` 即推到 NAS（不推 GitHub）。  
若你处 SSH 映射端口不是 22201，把上面地址里的 `:22201` 改成实际端口即可。

---

## 二、HTTP 地址：类 GitHub 网页访问（推荐用 Gitea）

在 CKB NAS 上部署 **Gitea** 后，可用浏览器像 GitHub 一样访问仓库（看代码、提交、分支、克隆地址等）：

| 场景 | 地址 |
|:-----|:-----|
| **内网** | **http://192.168.1.201:3000** |
| **外网（frp；kr 上 3000 与 Node 冲突）** | **`http://open.quwanzhi.com:13000`**（NAS `frpc` 中 Gitea `remotePort=13000`；旧 `:3000` 已弃用） |
| **工单管理** | http://192.168.1.201:3000/issues · http://open.quwanzhi.com:3000/issues |
| **合并请求** | http://192.168.1.201:3000/pulls · http://open.quwanzhi.com:3000/pulls |
| **卡若AI 仓库** | http://192.168.1.201:3000/fnvtk/karuo-ai · http://open.quwanzhi.com:3000/fnvtk/karuo-ai |

**部署 Gitea（一次性）**：执行 `scripts/deploy-gitea-on-nas.sh`，或按 `references/CKB_NAS_Gitea_类GitHub访问.md` 在 NAS 上创建目录、写入 docker-compose、执行 `docker compose up -d`。首次打开 3000 端口按向导创建管理员、新建仓库 **karuo-ai**，再把本机 `origin` 改为 Gitea 的 HTTP 地址即可。

仅用 DSM 看文件时：
- **DSM**：**http://open.quwanzhi.com:5000** 或 http://192.168.1.201:5000，登录后 File Station → git。

---

## 三、日常同步（把本地卡若AI 传到 NAS）

在卡若AI 根目录执行：

```bash
cd "/Users/karuo/Documents/个人/卡若AI"

git add -A && git status
git commit -m "说明"   # 有变更再 commit

git push origin main
```

或一键脚本：

```bash
bash "01_卡资（金）/_团队成员/金仓/群晖NAS管理/scripts/push-to-ckb-nas.sh"
```

---

## 四、地址汇总（确保可访问）

| 项目 | 地址 |
|:-----|:-----|
| **Git（SSH，用域名）** | **ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.git** |
| **类 GitHub 网页（Gitea）** | **http://192.168.1.201:3000** / **http://open.quwanzhi.com:3000**（部署 Gitea 后） |
| **DSM 管理** | http://open.quwanzhi.com:5000 或 http://192.168.1.201:5000 |
| **QuickConnect** | https://udbfnvtk.quickconnect.cn |

SSH 端口若不是 22201，把 Git 地址里的 `:22201` 改为实际端口；DSM 外网端口若不是 5000，把 HTTP 地址里的 `:5000` 改为实际端口即可。

---

*版本：v1.2 | 外网域名 open.quwanzhi.com + HTTP 访问说明*
