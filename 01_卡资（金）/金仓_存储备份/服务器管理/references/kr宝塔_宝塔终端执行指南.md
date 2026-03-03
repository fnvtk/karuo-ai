# kr 宝塔 · 宝塔终端执行指南

> 当 TAT 超时或 Node 批量启动失败时，在**宝塔面板终端**执行修复脚本，无时间限制。

**执行顺序（强制）**：宝塔 API 优先 → SSH → TAT。每次修改前**必须先检查目标项目及周边项目/应用**，确认不影响其他应用后再执行。详见 SKILL.md 强制规则 8、9。

---

## 一、执行步骤

### 1. 打开宝塔终端

1. 浏览器访问：https://43.139.27.93:9988  
2. 登录宝塔  
3. 左侧菜单 → **终端**  
4. 点击「**连接**」或创建新终端

### 2. 上传脚本（二选一）

**方式 A：文件管理上传**

1. 宝塔 → **文件** → 进入 `/root`
2. 上传本地文件：`scripts/kr宝塔_运行堵塞与Node深度修复_宝塔终端执行.sh`
3. 终端执行：`bash /root/kr宝塔_运行堵塞与Node深度修复_宝塔终端执行.sh`

**方式 B：直接粘贴执行**

1. 用本地编辑器打开 `scripts/kr宝塔_运行堵塞与Node深度修复_宝塔终端执行.sh`
2. 全选复制
3. 在宝塔终端中粘贴，回车执行

### 3. 脚本会完成

- 结束异常 Node 进程（含 PID 异常的项目）
- 停止全部 Node 项目
- 修复 site.db 启动命令为 `cd /path && (pnpm start || npm run start)`
- 查看 Node 日志
- 批量启动（3 轮，每轮间隔 10s）
- 输出最终运行状态

---

## 二、常见问题

| 问题 | 处理 |
|------|------|
| 部分项目仍 FAIL | 在宝塔「网站 → Node 项目」中，对该项目点「设置」，检查启动命令是否为 `cd /路径 && (pnpm start \|\| npm run start)`；查看日志排查依赖/端口 |
| 中文目录路径 | 如 `/www/wwwroot/self/wanzhi/玩值大屏` 可保留，脚本已支持；若需改英文需另做目录迁移 |
| 执行超时 | 宝塔终端无超时限制，可耐心等待（约 2～3 分钟） |

---

## 三、脚本路径

- 本地：`01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_运行堵塞与Node深度修复_宝塔终端执行.sh`
- 宝塔 API 密钥：`qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT`（脚本内已配置）

---

## 四、wzdj.quwanzhi.com 单独修复（启动失败：Cannot find module '/www/wwwroot/self/wzdj'）

**原因**：宝塔 Node 项目把目录路径当模块执行（`node /www/wwwroot/self/wzdj`），应改为在项目目录下执行 `PORT=3055 pnpm start`（Nginx 反代 3055）。若出现 **EADDRINUSE: 3055**，先在服务器执行 `fuser -k 3055/tcp` 释放端口再启动。

**执行顺序（强制）**：宝塔 API → SSH → TAT。每次修改前先检查本项目及周边 Node 项目状态，防止影响其他应用。

**方式一（推荐）**：本机执行完整流程脚本（前置检查 + API 停/启 + SSH 修复，失败则 TAT）
```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_wzdj修复_完整流程.py"
```

**方式二**：本机执行 TAT 脚本（需腾讯云 API 凭证，当 SSH 不可用时）

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_TAT_kr宝塔_修复wzdj启动.py"
```

**方式二**：SSH 或宝塔终端执行

1. SSH：`sshpass -p 'Zhiqun1984' ssh -p 22022 -o PubkeyAuthentication=no root@43.139.27.93`
2. 上传或在服务器上创建脚本后执行：
   `bash /root/kr宝塔_仅修复wzdj_宝塔终端执行.sh`
3. 或打开本地 `scripts/kr宝塔_仅修复wzdj_宝塔终端执行.sh`，全选复制，在宝塔终端粘贴执行。

脚本会：停止 wzdj → 修复 site.db 与 wzdj.sh 启动命令 → 再启动 wzdj。

**若仍启动失败（推荐·一步到位）**：在宝塔面板里**手动改启动命令**：
1. 宝塔 → **网站** → **Node 项目** → 找到 **wzdj** → 点 **设置**（或「编辑」）。
2. 找到「**启动命令**」或「**运行命令**」输入框，**整段替换**为（复制下面一行）：
   ```bash
   cd /www/wwwroot/self/wzdj && (PORT=3055 pnpm start 2>/dev/null || PORT=3055 npm run start)
   ```
3. **保存** → 回到 Node 项目列表 → 对 wzdj 点 **启动**。  
这样不依赖脚本是否在机内执行成功，直接改面板配置即可让文字电竞站点跑起来。
