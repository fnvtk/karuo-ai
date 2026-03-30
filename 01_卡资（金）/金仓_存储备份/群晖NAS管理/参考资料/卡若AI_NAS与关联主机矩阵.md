# 卡若AI · NAS 与关联主机矩阵（检索入口）

> **用途**：用 **卡若AI 仓库检索** 即可定位「有哪些 NAS / 哪台电脑经 frp 暴露、怎么登、下一步脚本在哪」。语音里「卡路伊」等见 `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json`。  
> 维护：金仓 · 群晖 NAS 管理 · 2026-03-30

---

## 一、NAS 一览（Agent 可代劳边界）

| 名称 | 内网 IP | 外网域名 | SSH / 入口 | frpc 真源 | 本机可执行脚本 / 说明 |
|:-----|:--------|:---------|:-----------|:----------|:---------------------|
| **公司 CKB** | `192.168.1.201` | `open.quwanzhi.com` | `fnvtk@open.quwanzhi.com -p 22201` | **kr** `43.139.27.93:7000`；**唯一**主进程：**`fnvtk` + `~/frp-standalone/frpc` + `/volume1/docker/frpc/frpc.toml`** | **`/volume1/docker/frpc-karuo-ai/start_frpc.sh`** 已改为 **仅 `pkill`、不再拉起** 独立 frpc（避免与主配置双连接；原 DSM root 计划任务仍可保留）。FRP 总述见 `服务器管理/references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md` §10.6 |
| **家里 Station** | `192.168.110.29` | `opennas2.quwanzhi.com` | 外网：`admin@opennas2.quwanzhi.com -p 22202`；内网：`ssh diskstation-home`（`~/.ssh/config`） | 须 **`server_addr = 43.139.27.93`** | **`群晖NAS管理/scripts/家里Station_frpc切kr_内网执行.sh`**（仅内网或配公钥/密码后） |
| **Host `nas`（文档矩阵机）** | `192.168.2.200` | — | `ssh nas` → `admin@192.168.2.200` | 以现场为准 | 不在家庭/公司常见网段时 **ping 失败属正常**；技能里另有 **CKBNAS `192.168.110.101`**（存客宝 AI 同步用） |

**说明**：Agent **无法**在无密码/无私钥时登录「家里 Station」；也 **无法**登录未在文档中出现的「你的 Mac/PC」本体，只能经 **frp 端口**访问（见第二节）。

---

## 二、经公司 CKB frpc 暴露的关联电脑 / 服务（端口在 kr 上）

以下在 **`open.quwanzhi.com:<端口>`** 访问（与 `frpc.toml` 中 `remotePort` 一致，以 NAS 上实际配置为准）：

| 类型 | 典型代理名 | 外网端口（文档惯例） | 操作方式 |
|:-----|:-----------|:---------------------|:---------|
| Windows RDP | `windows-rdp` | `3389` | 远程桌面客户端连域名+端口 |
| Windows VNC | `windows-vnc` | `8006` | VNC 客户端 |
| macOS VNC | `macos-vnc` / `macos-vnc-native` | `8007` / `5901` | 屏幕共享 / VNC |
| RustDesk | `rustdesk-id` / `rustdesk-relay` | `21116` / `21117` | RustDesk 客户端按自建 ID 规则 |

**这些不是「SSH 进电脑」**：卡若AI Agent 默认只操作 **本机 Shell + 已文档化的 SSH（NAS/云主机）**；要控电脑请在本机用 RDP/VNC/RustDesk。

---

## 三、与本机（卡若的 Mac）相关的操作

| 场景 | 做法 |
|:-----|:-----|
| 家里 NAS 改 `server_addr` | 在家庭局域网执行 **`家里Station_frpc切kr_内网执行.sh`**，或 `STATION_ADMIN_PASS=…` + `sshpass` |
| 仓库同步 Gitea | `01_卡资（金）/金仓_存储备份/Gitea管理/脚本/自动同步.sh` |
| 区分两台 NAS | **`双NAS区分_公司CKB与家里Station.md`** |

---

## 四、快速健康检查（本机终端）

```bash
# 公司 CKB 经 frp
curl -sS -m 8 http://open.quwanzhi.com:11401/api/tags | head -c 80; echo
curl -sS -m 8 -o /dev/null -w "13000 %{http_code}\n" http://open.quwanzhi.com:13000/

# 家里（frpc 已指 kr 后才有响应）
curl -sS -m 8 -o /dev/null -w "opennas2:5002 %{http_code}\n" http://opennas2.quwanzhi.com:5002/
```

---

## 五、阿里云 DNS 与 FRP（2026-03-30）

- **分流脚本**：`服务器管理/scripts/阿里云DNS_A记录_kr迁回存客宝_保留FRP与kr业务.py` —— 将 **非** FRP、**非** kr 端口表站点的 A 记录从 **`43.139.27.93` 迁回 `42.194.245.239`**；**保留** `open`、`opennas2`、`kr-ai` 及 SKILL 端口表子域。  
- **硬条件**：**`open.quwanzhi.com` 的 A 必须为 `43.139.27.93`**（公司 frp 入口）。若公共 DNS 仍短暂显示旧 IP，属 TTL，以阿里云控制台为准。  
- **执行环境**：`服务器管理/scripts/.venv_aliyun_dns`（`pip install aliyun-python-sdk-core aliyun-python-sdk-alidns`）。

## 六、家里 MacBook（局域网）

- 文档快照曾记 **192.168.110.14**；以 **系统设置 → 通用 → 共享 → 远程登录** 开启后，本机可 `ssh <用户名>@<当前 IP>`。  
- 当前网段可用 **`arp -a`** 看活跃 IP；**Connection refused** 表示未开 22 端口，需在 Mac 上开启远程登录，Agent 无法代开。

## 七、触发词

**NAS 矩阵、两台 NAS、opennas2、22202、diskstation-home、frpc 切 kr、关联电脑端口、DNS 迁回存客宝** → 先读本文件，再打开 §一表格与 `双NAS区分_公司CKB与家里Station.md`。
