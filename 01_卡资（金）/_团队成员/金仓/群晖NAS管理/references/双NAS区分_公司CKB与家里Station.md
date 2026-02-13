# 双 NAS 区分：公司 CKB vs 家里 Station（防选错）

> **用途**：明确区分公司 NAS（存客宝/CKB）与家里 NAS（Station），记录各自的 IP、域名、访问环境，以及针对不同 NAS 的命令用法，防止选错目标。  
> **维护**：金仓 | 2026-02-06

---

## 一、两套 NAS 总览

| 项目 | 公司 NAS（CKB / 存客宝） | 家里 NAS（Station） |
|:-----|:-------------------------|:--------------------|
| **场景** | 公司局域网、外网访问 | 家庭局域网，**家里优先访问** |
| **用途** | 存客宝、卡若AI 网关、MongoDB、Qdrant、宝塔中控等 | 家庭存储、DiskStation |
| **内网 IP** | 192.168.1.201 | **192.168.110.29** |
| **外网域名** | **open.quwanzhi.com** | （未配置外网域名时需内网） |
| **DSM 端口** | 5000 | 5000 |
| **DSM 内网访问** | http://192.168.1.201:5000 | **http://192.168.110.29:5000** |
| **卡若AI Executor** | 8081（公司/外网） | （家里 NAS 未部署卡若AI 时无） |
| **Git 仓库（卡若AI）** | 见下方「CKB NAS Git」 | 家里 Station 无 |

### 1.1 CKB NAS Git（卡若AI，用外网域名管理，只传 NAS）

| 项目 | 说明 |
|:-----|:-----|
| **Git 地址（open.quwanzhi.com）** | **ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.git** |
| **类 GitHub 网页访问（Gitea）** | **http://192.168.1.201:3000** 或 **http://open.quwanzhi.com:3000**（见 CKB_NAS_Gitea_类GitHub访问.md） |
| **同步** | 在卡若AI 根目录执行 `git push` 或 `scripts/push-to-ckb-nas.sh` |
| **详细说明** | `references/卡若AI同步到CKB_NAS_Git.md` |

---

## 二、家里 NAS（Station）信息记录

| 项 | 值 | 备注 |
|:---|:---|:-----|
| **内网 IP** | 192.168.110.29 | 家庭局域网 |
| **DSM 访问** | http://192.168.110.29:5000 | 登录页截图可见 |
| **品牌/型号** | Synology DiskStation | 登录界面显示 |
| **默认账号** | admin | 登录表单预填 |
| **外网域名** | （待配置） | 若需外网访问可配置 DDNS 或 QuickConnect |

> **防选错**：家里在 192.168.**110**.29，公司 CKB 在 192.168.**1**.201；网段不同，留意 110 vs 1。

### 2.1 当前资源告警（需处理）

| 资源 | 当前状态 | 告警 |
|:-----|:---------|:-----|
| **CPU** | 99% | ⚠️ 极高，需尽快降负载 |
| **RAM** | 61% | 正常，可观察 |
| **磁盘** | 即将不足 | ⚠️ 存储空间 1 告警，需清理或扩容 |

**处理建议**：见 `references/家里Station_NAS资源优化与降负载指南.md`。

---

## 三、访问选择规则

| 你的位置 | 优先访问 | 说明 |
|:---------|:---------|:-----|
| **公司 / 公司局域网** | 公司 CKB NAS（192.168.1.201 / open.quwanzhi.com） | 存客宝、卡若AI 网关、飞书/企微回调、发消息等 |
| **家里 / 家庭局域网** | 家里 Station NAS（192.168.110.29） | 家庭存储、DSM 管理 |
| **外网** | 公司 CKB NAS（open.quwanzhi.com） | 公司 NAS 经 frp/隧道对外；家里 NAS 通常不外网暴露 |

---

## 四、针对不同 NAS 的命令

### 4.1 发消息给 NAS AI（仅公司 CKB 有）

发消息给「卡若AI」执行任务，**仅公司 CKB NAS** 部署了 Gateway + Executor，**家里 Station 没有**。

| 目标 | 命令 / 入口 |
|:-----|:------------|
| **公司 CKB** | `./send_message_to_nas.sh "你的指令"`（默认 open.quwanzhi.com）；或 `NAS_TARGET=ckb ./send_message_to_nas.sh "..."` |
| **家里 Station** | 暂无 AI 网关，无法发消息；仅 DSM 管理（http://192.168.110.29:5000） |

### 4.2 DSM 管理

| 目标 | 操作 |
|:-----|:-----|
| **公司 CKB** | 浏览器打开 http://192.168.1.201:5000 |
| **家里 Station** | 浏览器打开 **http://192.168.110.29:5000** |

### 4.3 SSH（若已配置）

| 目标 | 示例 |
|:-----|:-----|
| **公司 CKB** | `ssh fnvtk@192.168.1.201` 或 `ssh fnvtk@open.quwanzhi.com`（若 22201 等已映射） |
| **家里 Station** | `ssh admin@192.168.110.29`（用户与端口按你实际配置） |

---

## 五、相关文档

- **类 GitHub 网页访问（Gitea）**：`references/CKB_NAS_Gitea_类GitHub访问.md` — 用 HTTP 像 GitHub 一样浏览仓库
- **NAS AI 应用与执行路线**：`references/NAS_AI应用与发送到NAS的执行路线.md` — 针对公司 CKB NAS 的发消息、执行流程
- **外网发消息与截图**：`references/外网向NAS发消息与界面截图说明.md` — 外网用 open.quwanzhi.com 发消息（公司 CKB）

---

*版本：v1.0 | 2026-02-06*
