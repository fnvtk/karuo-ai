# 宝塔 Node 项目管理 Skill（独立）

> **统一管理所有宝塔服务器的 Node 项目**。仅使用宝塔 Node 接口，**禁用 PM2**。本 Skill 集中存放凭证、常见错误与处理、脚本路径。

---

## 一、凭证速查（三台宝塔）

### 1.1 SSH

| 服务器 | IP | SSH 端口 | 账号 | 密码 | 备注 |
|--------|-----|----------|------|------|------|
| kr宝塔 | 43.139.27.93 | 22022 | ckb | zhiqun1984 | 统一用 ckb 账号密码直连 |
| 存客宝 | 42.194.245.239 | 22022 | ckb | zhiqun1984 | - |
| 本机 Docker 宝塔 | 127.0.0.1 | 22 | - | - | 本地 Docker 容器 |

**SSH 连接示例**（统一用 ckb 账号密码，无需密钥）：

```bash
sshpass -p 'zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no ckb@43.139.27.93

# 存客宝
sshpass -p 'zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no ckb@42.194.245.239
```

### 1.2 宝塔面板登录

- **账号**：ckb  
- **密码**：zhiqun1984  

### 1.3 宝塔 API 密钥

| 服务器 | 面板地址 | API 密钥 |
|--------|----------|----------|
| kr宝塔 | https://43.139.27.93:9988 | qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT |
| 存客宝 | https://42.194.245.239:9988 | TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi |
| 本机 Docker | http://127.0.0.1:8888/btpanel | 面板内查看 |

**API 白名单**：若本机调用 API 报「IP校验失败」，须到对应面板 **设置 → API 接口** 将本机公网 IP 加入白名单。

---

## 二、宝塔 Node API（仅用此，禁用 PM2）

### 2.1 接口列表

| 接口 | 说明 | 参数 |
|------|------|------|
| `/project/nodejs/get_project_list` | 获取 Node 项目列表 | 无 |
| `/project/nodejs/start_project` | 启动项目 | `project_name` |
| `/project/nodejs/stop_project` | 停止项目 | `project_name` |
| `/project/nodejs/restart_project` | 重启项目 | `project_name` |

### 2.2 签名算法（Python）

```python
import time, hashlib
def sign(api_key):
    t = int(time.time())
    s = str(t) + hashlib.md5(api_key.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}
```

每次 POST 须携带 `request_time`、`request_token`，并与业务参数一并提交。

### 2.3 本机调用 API 示例（kr宝塔）

```bash
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_宝塔API_修复502.py"
```

需本机 IP 已加入 kr宝塔 API 白名单。

---

## 三、脚本与执行方式

### 3.1 批量启动/修复 Node 项目（kr宝塔）

**脚本**：`scripts/kr宝塔_node项目批量修复.py`  

**说明**：在服务器上调用 `127.0.0.1:9988` 宝塔 API，对本机 Node 项目逐项 stop → 清端口/清 pid → start。  

**执行**：必须在 **kr宝塔 服务器内** 执行（本地无法直连 127.0.0.1:9988）。

```bash
# 方式一：SSH 管道执行（账号 ckb，密码 zhiqun1984，端口 22022）
sshpass -p 'zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no ckb@43.139.27.93 'python3 -' < "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_node项目批量修复.py"

# 方式二：宝塔面板终端（SSH 不可用时）
# 详见 references/宝塔面板终端_Node批量启动指南.md
# 在 宝塔面板 → 终端 复制粘贴文档中的 cat > /tmp/... 整段命令执行即可
```

**SSH 风控**：若出现 `Connection closed by remote host` 或 `Permission denied`，优先用 **宝塔面板 → 终端** 执行，减少 SSH 连接次数。

### 3.2 502 修复（kr宝塔）

**脚本**：`scripts/kr宝塔_宝塔API_修复502.py`  

**执行**：在本机执行，通过 HTTPS 调用 kr宝塔 面板 API，重启 Nginx 和 soul 相关 Node 项目。

```bash
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_宝塔API_修复502.py"
```

---

## 四、常见错误与处理

### 4.1 EADDRINUSE（端口被占用）

**现象**：`start_project` 返回失败，日志提示端口已被占用。

**处理**：

1. 在服务器上查端口：`ss -tlnp | grep :端口号`
2. 杀掉占用进程：`kill -9 <PID>`
3. 清理 pid 文件：`/www/server/nodejs/vhost/pids/<项目名>.pid` 置空或删
4. 再次调用 `start_project`

`kr宝塔_node项目批量修复.py` 已内置上述逻辑，可自动处理。

### 4.2 Node 版本不匹配（如 kr_wb 需 Node ≥ 20.9.0）

**现象**：项目启动失败，提示 Node 版本过低。

**处理**：在宝塔 **网站 → Node 项目 → 编辑** 中，将「Node 版本」或「启动脚本路径」改为 v22.14.0 等更高版本，保存后重启项目。

### 4.3 502 Bad Gateway

**现象**：访问域名返回 502，Nginx 正常但上游无响应。

**处理**：

1. **API 方式**：`python3 scripts/kr宝塔_宝塔API_修复502.py`（需 API 白名单）
2. **面板终端**：`nginx -t && nginx -s reload`，再在 Node 项目中重启对应站点
3. 检查项目是否在运行：`get_project_list` 中 `run` 为 `true` 且 `listen_ok` 为 `true`

### 4.4 API 调用「IP 校验失败」

**原因**：本机 IP 未加入该宝塔的 API 白名单。

**处理**：到对应面板 **设置 → API 接口**，将当前公网 IP 加入白名单。

### 4.5 SSH 风控（Connection closed / Permission denied）

**原因**：频繁 SSH 或异常登录触发风控。

**处理**：优先用宝塔面板终端；或用 **ckb/zhiqun1984** 直连，端口 22022。

### 4.6 MODULE_NOT_FOUND（如 AITOUFA）

**现象**：`Error: Cannot find module '/www/wwwroot/扩展/小工具/AITOUFA'`，Node 把项目根目录当入口执行。

**原因**：启动命令配置错误，例如写成 `node /项目根目录` 而非 `node server.js` 或 `npm start`。

**处理**：宝塔 **Node 项目 → 编辑该项目**，将启动命令改为：
- Next.js：`cd /www/wwwroot/扩展/小工具/AITOUFA && npm run start` 或 `pnpm start`
- 或正确的入口：`node server.js` / `node index.js`（在项目根目录执行）

### 4.7 宝塔与 PM2 冲突

**规则**：**一律用宝塔 Node 项目管理，禁用独立 PM2**。

若存在残留 PM2 进程导致端口冲突：

```bash
# 在服务器上执行
pm2 kill
# 或停用 PM2 托管项目，释放端口后再用宝塔 start_project
```

---

## 五、各服务器 Skill 引用

- **kr宝塔**：见 `references/kr宝塔_宝塔管理SKILL.md`
- **存客宝**：见 `references/存客宝_宝塔管理SKILL.md`

---

## 六、脚本路径速查

| 脚本 | 功能 | 执行位置 |
|------|------|----------|
| `scripts/kr宝塔_node项目批量修复.py` | 批量 stop→清端口→start Node 项目 | 服务器内 |
| `scripts/kr宝塔_宝塔API_修复502.py` | 重启 Nginx + soul 相关 Node 项目 | 本机（API） |
| `脚本/快速检查服务器.py` | 检查多台服务器状态 | 本机（API） |
| `scripts/kr宝塔_腾讯云带宽与CPU近24h.py` | 腾讯云监控数据 | 本机 |

---

## 七、强制规则

1. **Node 管理**：只用宝塔 Node API，不用 PM2
2. **凭证**：本 Skill 为唯一权威来源，主 SKILL 仅引用
3. **错误处理**：遇新错误时，在本 Skill 第四节补充，并同步相关服务器 Skill
4. **SSH 频率**：能用手动/面板终端完成则减少 SSH 调用
