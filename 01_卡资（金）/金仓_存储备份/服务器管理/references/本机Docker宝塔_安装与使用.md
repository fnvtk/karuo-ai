# 本机 Docker 宝塔面板（与腾讯云一致）

本机通过 Docker 运行宝塔官方镜像，与腾讯云服务器上的宝塔面板一致，后续网站与相关服务可在此 Docker 宝塔中运行。

## 镜像与数据

- **镜像**：`btpanel/baota:lnmp`（推荐，带 LNMP）或 `btpanel/baota:latest`（仅面板，需在面板内安装 Nginx/MySQL 等）
- **数据目录**：`~/baota_docker_data/`
  - `website_data` → 网站根目录
  - `mysql_data` → MySQL 数据
  - `vhost` → Nginx 站点配置

## 安装步骤

1. **拉取镜像**（首次或更新时执行，耗时会较长）：
   ```bash
   docker pull btpanel/baota:lnmp
   ```
   若只需先跑起面板，可用：`docker pull btpanel/baota:latest`

2. **启动容器**：
   ```bash
   bash /Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/本机Docker宝塔_启动.sh
   ```

3. **访问面板**：浏览器打开 http://127.0.0.1:8888/btpanel

4. **首次登录**：
   - 默认用户名：`btpanel`
   - 默认密码：`btpaneldocker`
   - 登录后请在【面板设置】中修改为：**ckb** / **Zhiqun1984**

## 常用命令

```bash
# 查看容器状态
docker ps -a --filter name=baota

# 停止
docker stop baota

# 再次启动
docker start baota
# 或直接执行
bash .../本机Docker宝塔_启动.sh
```

## 端口说明

| 端口 | 用途 |
|------|------|
| 8888 | 宝塔面板 |
| 80   | HTTP 网站 |
| 443  | HTTPS 网站 |
| 888  | 宝塔 PHP 等 |

若本机 80/443 已被占用，可修改启动脚本中的 `-p` 映射（如 `-p 8080:80 -p 8443:443`），并在面板内站点配置中对应修改。
