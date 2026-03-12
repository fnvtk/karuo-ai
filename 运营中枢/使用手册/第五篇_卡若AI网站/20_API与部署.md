# 第20章 · API 与部署

> 返回 [总目录](../README.md) | 上一章 [第19章](19_官网与控制台.md)

---

## 20.1 主要 API 分类

### 技能中心

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET/POST | `/api/skills` | 获取/新增技能 |
| GET/PUT/DELETE | `/api/skills/:id` | 单条 CRUD |
| POST | `/api/skills/sync` | 从主仓库同步 |
| POST | `/api/skills/ai-tidy` | AI 整理技能信息 |
| POST | `/api/skills/ai-add` | AI 生成新技能 |

### 流程与任务

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET/POST | `/api/workflows` | 流程 CRUD |
| POST | `/api/workflows/:id/run` | 执行流程 |
| GET/POST | `/api/tasks` | 任务队列 |

### 网关与对话

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| POST | `/api/chat` | 首页对话接口 |
| POST | `/api/gateway/chat` | 统一 LLM 出口（兼容 OpenAI） |
| GET | `/api/gateway/models` | 可用模型列表 |
| POST | `/api/gateway/switch` | 切换主用网关 |

### 认证与平台

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户 |
| GET/PUT | `/api/users` | 用户管理 |
| GET/POST/PUT | `/api/platform/*` | 接口配置、限流、基因胶囊 |

## 20.2 部署方式

### Docker 容器化部署

```bash
docker build --platform linux/amd64 -t karuo-site:latest .
docker save karuo-site:latest | gzip > karuo-site.tar.gz
# 传输到 NAS
scp karuo-site.tar.gz nas:/volume1/docker/
# NAS 上加载运行
docker load < karuo-site.tar.gz
docker run -d --name karuo-site -p 3102:3000 \
  -v karuo-site-data:/app/.runtime karuo-site:latest
```

### 端口与网络

| 项目 | 部署端口 | 说明 |
|:---|:--:|:---|
| 卡若AI网站 | 3102 | Docker 容器 → NAS |
| frp 外网 | 3102 | 外网 → NAS 3102 |
| API 网关 | 8000 | 宝塔服务器 |

### 数据持久化

- Docker volume `karuo-site-data` → `/app/.runtime`
- 数据库文件：`.runtime/karuo-app.db`（SQLite）
- 扩展可迁移到 MongoDB `karuo_site` 库

---

> 下一篇：[第六篇 · 进阶与扩展](../第六篇_进阶与扩展/21_外网调用与API网关.md)
