---
name: 服务器管理
description: 宝塔服务器统一管理与自动化部署
triggers: 服务器、宝塔、部署、SSL、HTTPS、Nginx、PM2
owner: 金仓
group: 金
version: "1.0"
updated: "2026-02-16"
---

# 服务器管理

让 AI 写完代码后，无需人工介入，自动把项目「变成一个在线网站」。

---

## 快速入口（复制即用）

### 服务器资产

| 服务器 | IP | 配置 | 用途 | 宝塔面板 |
|--------|-----|------|------|----------|
| **小型宝塔** | 42.194.232.22 | 2核4G 5M | 主力部署（Node项目） | https://42.194.232.22:9988/ckbpanel |
| **存客宝** | 42.194.245.239 | 2核16G 50M | 私域银行业务 | https://42.194.245.239:9988 |
| **kr宝塔** | 43.139.27.93 | 2核4G 5M | 辅助服务器 | https://43.139.27.93:9988 |

### 凭证速查

```bash
# SSH连接（小型宝塔为例）
ssh root@42.194.232.22
密码: Zhiqun1984

# 宝塔面板登录（小型宝塔）
地址: https://42.194.232.22:9988/ckbpanel
账号: ckb
密码: zhiqun1984

# 宝塔API密钥
小型宝塔: hsAWqFSi0GOCrunhmYdkxy92tBXfqYjd
存客宝:   TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi
kr宝塔:   qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT
```

---

## 一键操作

### 1. 检查服务器状态

```bash
# 运行快速检查脚本
python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/服务器管理/scripts/快速检查服务器.py
```

### 2. 部署 Node 项目（标准流程）

```bash
# 1. 压缩项目（排除无用目录）
cd /项目路径
tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -czf /tmp/项目名_update.tar.gz .

# 2. 上传到服务器
sshpass -p 'Zhiqun1984' scp /tmp/项目名_update.tar.gz root@42.194.232.22:/tmp/

# 3. SSH部署
ssh root@42.194.232.22
cd /www/wwwroot/项目名
rm -rf app components lib public styles *.json *.js *.ts *.mjs *.md .next
tar -xzf /tmp/项目名_update.tar.gz
pnpm install
pnpm run build
rm /tmp/项目名_update.tar.gz

# 4. 宝塔面板重启项目
# 【网站】→【Node项目】→ 找到项目 → 点击【重启】
```

### 3. SSL证书检查/修复

```bash
# 检查所有服务器SSL证书状态
python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/服务器管理/scripts/ssl证书检查.py

# 自动修复过期证书
python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/服务器管理/scripts/ssl证书检查.py --fix
```

### 4. 常用诊断命令

```bash
# 检查端口占用
ssh root@42.194.232.22 "ss -tlnp | grep :3006"

# 检查PM2进程
ssh root@42.194.232.22 "/www/server/nodejs/v22.14.0/bin/pm2 list"

# 测试HTTP响应
ssh root@42.194.232.22 "curl -I http://localhost:3006"

# 检查Nginx配置
ssh root@42.194.232.22 "nginx -t"

# 重载Nginx
ssh root@42.194.232.22 "nginx -s reload"

# DNS解析检查
dig soul.quwanzhi.com +short @8.8.8.8
```

---

## 端口配置表（小型宝塔 42.194.232.22）

| 端口 | 项目名 | 类型 | 域名 | 状态 |
|------|--------|------|------|------|
| 3000 | cunkebao | Next.js | mckb.quwanzhi.com | ✅ |
| 3001 | ai_hair | NestJS | ai-hair.quwanzhi.com | ✅ |
| 3002 | kr_wb | Next.js | kr_wb.quwanzhi.com | ✅ |
| 3003 | hx | Vue | krjzk.quwanzhi.com | ⚠️ |
| 3004 | dlmdashboard | Next.js | dlm.quwanzhi.com | ✅ |
| 3005 | document | Next.js | docc.quwanzhi.com | ✅ |
| 3006 | soul | Next.js | soul.quwanzhi.com | ✅ |
| 3015 | 神射手 | Next.js | kr-users.quwanzhi.com | ⚠️ |
| 3018 | zhaoping | Next.js | zp.quwanzhi.com | ✅ |
| 3021 | is_phone | Next.js | is-phone.quwanzhi.com | ✅ |
| 3031 | word | Next.js | word.quwanzhi.com | ✅ |
| 3036 | ymao | Next.js | ymao.quwanzhi.com | ✅ |
| 3043 | tongzhi | Next.js | touzhi.lkdie.com | ✅ |
| 3045 | 玩值大屏 | Next.js | wz-screen.quwanzhi.com | ✅ |
| 3050 | zhiji | Next.js | zhiji.quwanzhi.com | ✅ |
| 3051 | zhiji1 | Next.js | zhiji1.quwanzhi.com | ✅ |
| 3055 | wzdj | Next.js | wzdj.quwanzhi.com | ✅ |
| 3305 | AITOUFA | Next.js | ai-tf.quwanzhi.com | ✅ |
| 9528 | mbti | Vue | mbtiadmin.quwanzhi.com | ✅ |

### 端口分配原则

- **3000-3099**: Next.js / React 项目
- **3100-3199**: Vue 项目
- **3200-3299**: NestJS / Express 后端
- **3300-3399**: AI相关项目
- **9000-9999**: 管理面板 / 特殊用途

---

## 核心工作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Node项目一键部署流程                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   START                                                                     │
│     │                                                                       │
│     ▼                                                                       │
│  ┌──────────────────┐                                                      │
│  │ 1. 压缩本地代码  │  排除 node_modules, .next, .git                      │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 2. 上传到服务器  │  scp 到 /tmp/                                         │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 3. 清理旧文件    │  保留 .env 等配置文件                                 │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 4. 解压新代码    │  tar -xzf                                             │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 5. 安装依赖      │  pnpm install                                         │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 6. 构建项目      │  pnpm run build                                       │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 7. 宝塔面板重启  │  Node项目 → 重启                                       │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                      │
│  │ 8. 验证访问      │  curl https://域名                                     │
│  └────────┬─────────┘                                                      │
│           │                                                                 │
│           ▼                                                                 │
│        SUCCESS                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 操作优先级矩阵

| 操作类型 | 优先方式 | 备选方式 | 说明 |
|---------|---------|---------|------|
| 查询信息 | ✅ 宝塔API | SSH | API稳定 |
| 文件操作 | ✅ 宝塔API | SSH | API支持 |
| 配置Nginx | ✅ 宝塔API | SSH | API可读写 |
| 重载服务 | ⚠️ SSH | - | API无接口 |
| 上传代码 | ⚠️ SSH/scp | - | 大文件 |
| 添加项目 | ❌ 宝塔界面 | - | API不稳定 |

---

## 常见问题速查

### Q1: 外网无法访问（ERR_EMPTY_RESPONSE）

**原因**: 腾讯云安全组只开放443端口

**解决**: 
1. 必须配置SSL证书
2. Nginx配置添加443监听

### Q2: Node项目启动失败（Could not find production build）

**原因**: 使用 `npm run start` 但未执行 `npm run build`

**解决**: 先 `pnpm run build` 再重启

### Q3: 端口冲突（EADDRINUSE）

**解决**:
```bash
# 检查端口占用
ss -tlnp | grep :端口号

# 修改package.json中的端口
"start": "next start -p 新端口"
```

### Q4: DNS被代理劫持

**现象**: 本地DNS解析到198.18.x.x

**解决**: 
- 关闭代理软件
- 或用手机4G网络测试

### Q5: 宝塔与PM2冲突

**原因**: 同时使用root用户PM2和宝塔PM2

**解决**: 
- 停止所有独立PM2: `pm2 kill`
- 只使用宝塔界面管理

---

## 安全约束

### 绝对禁止

- ❌ 输出完整密码/密钥到聊天
- ❌ 执行危险命令（rm -rf /, reboot等）
- ❌ 跳过验证步骤
- ❌ 使用独立PM2（避免与宝塔冲突）

### 必须遵守

- ✅ 操作前检查服务器状态
- ✅ 操作后验证结果
- ✅ 生成操作报告

---

## 相关脚本

| 脚本 | 功能 | 位置 |
|------|------|------|
| `快速检查服务器.py` | 一键检查所有服务器状态 | `./scripts/` |
| `一键部署.py` | 根据配置文件部署项目 | `./scripts/` |
| `ssl证书检查.py` | 检查/修复SSL证书 | `./scripts/` |

---

## 相关文档

| 文档 | 内容 | 位置 |
|------|------|------|
| `宝塔API接口文档.md` | 宝塔API完整接口说明 | `./references/` |
| `端口配置表.md` | 完整端口分配表 | `./references/` |
| `常见问题手册.md` | 问题解决方案大全 | `./references/` |
| `部署配置模板.md` | JSON配置文件模板 | `./references/` |
| `系统架构说明.md` | 完整架构图和流程图 | `./references/` |

---

## 历史对话整理

### kr_wb白板项目部署（2026-01-23）

- 项目类型: Next.js
- 部署位置: /www/wwwroot/kr_wb
- 域名: kr_wb.quwanzhi.com
- 端口: 3002
- 遇到问题: AI功能401错误（API密钥未配置）
- 解决方案: 修改 lib/ai-client.ts，改用 SiliconFlow 作为默认服务

### soul项目部署（2026-01-23）

- 项目类型: Next.js
- 部署位置: /www/wwwroot/soul
- 域名: soul.quwanzhi.com
- 端口: 3006
- 部署流程: 压缩→上传→解压→安装依赖→构建→PM2启动→配置Nginx→配置SSL
