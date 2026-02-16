# Webhook 部署提示词

## 输出规范

### 1. 核心理念
- **一次配置，自动同步**：强调宝塔面板 + GitHub Webhook 的组合。
- **自动化**：代码提交即部署，减少人工干预。

### 2. 文档结构要求
- **I. 概述**：一句话解释“这是什么”和“有什么好处”。
- **II. 前提条件**：
  - GitHub 账号与仓库。
  - 宝塔面板（安装 Nginx/Node.js/PM2/Git）。
  - 域名解析完成。
- **III. 流程图**：必须包含 Mermaid 流程图，展示 `Git Push -> Webhook -> 宝塔面板 -> Pull & Build` 的全过程。
- **IV. 详细步骤**：
  - **Step 1**：宝塔面板安装 Webhook 插件。
  - **Step 2**：配置脚本（提供标准脚本模板，含 `git pull`, `npm install`, `npm run build`, `pm2 reload`）。
  - **Step 3**：GitHub 仓库设置 Payload URL。
- **V. 故障排查**：列出常见错误（如权限问题、端口冲突）。

### 3. 脚本模板（Next.js 示例）
```bash
#!/bin/bash
echo "Start deployment..."
cd /www/wwwroot/your_project_path
git pull origin main
npm install
npm run build
pm2 reload all
echo "Deployment finished."
```

### 4. 流程图示例
```mermaid
graph TD
    A[提交代码到GitHub] --> B{GitHub Webhook}
    B --> C[发送Payload到宝塔面板]
    C --> D[宝塔面板接收通知]
    D --> E[触发部署脚本]
    E --> F[执行 git pull]
    F --> G[执行 composer install (可选)]
    G --> H[清理网站缓存 (可选)]
    H --> I[网站内容自动更新]
```
