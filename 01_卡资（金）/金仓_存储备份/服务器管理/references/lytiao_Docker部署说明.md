# www.lytiao.com Docker 部署说明

## 一、现状与问题

| 项目 | 说明 |
|------|------|
| 站点 | www.lytiao.com，根目录 `/www/wwwroot/www.lytiao.com` |
| 端口 | **8090**（历史：存客宝 **8080 曾被 frps 占用**；**frps 迁至 kr 宝塔后**，若仅在存客宝跑 Docker 可评估改回 **8080**，以 `ss -tlnp` 为准） |
| 冲突 | 与 frp **remote_port**、本机其它监听冲突时用 8090；**全站 FRP/DNS 统一 kr** 见 `references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md` |
| 拉取失败 | TAT 远程执行时 Docker 拉取 php 镜像常遇「connection reset by peer」，为国内网络访问 Docker Hub 不稳定所致 |

## 二、推荐方式：宝塔终端手动执行

**在 存客宝宝塔面板 → 终端** 执行以下脚本（复制整段粘贴）：

```bash
# 脚本路径
01_卡资（金）/金仓_存储备份/服务器管理/scripts/存客宝_lytiao_Docker部署_宝塔终端执行_完整版.sh
```

或直接复制 `存客宝_lytiao_Docker部署_宝塔终端执行_完整版.sh` 的全部内容，在宝塔终端粘贴执行。

**首次拉取失败时**：可多次重试，或更换网络环境后再执行。

## 三、TAT 远程执行（网络良好时）

```bash
./scripts/.venv_tx/bin/python scripts/腾讯云_TAT_存客宝_lytiao_快速部署.py
```

## 四、验证

- 容器：宝塔 → Docker → 总览 → 刷新容器列表，应看到 `lytiao-www`
- 访问：http://42.194.245.239:8090
- 安全组：8090 已放行

## 五、多服务器复用

将 `/opt/lytiao_docker/`（含 `www/`）打包，上传到目标服务器后执行：

```bash
cd /opt/lytiao_docker
docker compose up -d
```

## 六、相关脚本

| 脚本 | 用途 |
|------|------|
| `存客宝_lytiao_Docker部署_宝塔终端执行_完整版.sh` | 宝塔终端完整部署（推荐） |
| `腾讯云_TAT_存客宝_lytiao_快速部署.py` | TAT 远程部署 |
| `腾讯云_TAT_存客宝_lytiao_快速检查.py` | 快速检查容器状态 |
| `存客宝_lytiao_一键确保运行.py` | 一键部署 + 安全组放行 |
