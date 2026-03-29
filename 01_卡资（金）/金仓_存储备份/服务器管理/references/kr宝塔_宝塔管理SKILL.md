# kr宝塔 · 宝塔管理 Skill

> 43.139.27.93 · 2核4G 5M · Node 项目主力。本文件为 kr宝塔 专用入口，统一凭证与操作，所有错误与处理见主 Skill。

---

## 凭证

| 类型 | 值 |
|------|-----|
| IP | 43.139.27.93 |
| SSH 端口 | 22022 |
| SSH 账号 | ckb |
| SSH 密码 | zhiqun1984 |
| 宝塔面板 | https://43.139.27.93:9988 |
| 面板账号 | ckb |
| 面板密码 | zhiqun1984 |
| API 密钥 | qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT |

---

## 快速操作

### Node 项目批量启动/修复

脚本 `scripts/kr宝塔_node项目批量修复.py` 须在**服务器内**执行（调用 127.0.0.1:9988）。

- **SSH**：`sshpass -p 'zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no ckb@43.139.27.93 'python3 -' < scripts/kr宝塔_node项目批量修复.py`
- **宝塔面板终端**：上传脚本后 `python3 /路径/kr宝塔_node项目批量修复.py`

### 502 修复（soul 等）

```bash
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_宝塔API_修复502.py"
```

需本机 IP 已加入 kr宝塔 API 白名单。

### 带宽/卡顿排查

- 文档：`references/kr宝塔_网络与服务器卡顿_检查与处理.md`
- 带宽脚本：`scripts/kr宝塔_腾讯云带宽与CPU近24h.py`（用 `.venv_tx/bin/python`）

### FRP 服务端（frps）与本机入口

- **真源**：**frps** 统一部署在 **本机（kr 宝塔 43.139.27.93）**；NAS/其它设备的 **frpc** `server_addr` 指向本机公网 IP。  
- **腾讯云安全组 + 宝塔防火墙**：须放行 **7000**（及 Dashboard 端口若启用），以及 **全部** `remote_port`（与迁出前存客宝规则一致）。  
- **阿里云 DNS**：凡经 frp 或 443 进本机的业务子域，**A 记录应为 `43.139.27.93`**（从 `42.194.245.239` 迁出时逐项改）。  
- **操作清单与验收表**：`references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md`。

---

## 主 Skill 与错误处理

- **主 Skill**：`references/宝塔Node项目管理_SKILL.md`（凭证、Node API、常见错误、脚本）
- **网络/卡顿**：`references/kr宝塔_网络与服务器卡顿_检查与处理.md`
- **端口表**：见主 SKILL.md 端口配置表
