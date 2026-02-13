# CKB NAS 上 Gitea：类 GitHub 的 HTTP 网页访问

> **目标**：在 CKB NAS 用 Docker 跑 Gitea，实现类似 GitHub 的网页访问（浏览仓库、提交、文件、克隆地址等）。  
> **维护**：金仓 | 2026-02-13

---

## 一、访问地址（部署完成后）

| 场景 | 地址 |
|:-----|:-----|
| **内网** | **http://192.168.1.201:3000** |
| **外网（需 frp 映射 3000）** | **http://open.quwanzhi.com:3000**（域名已配置为 open.quwanzhi.com） |
| **若反向代理到子路径/域名** | 按实际配置，如 https://git.open.quwanzhi.com |

打开后：登录 → 看到自己的仓库 → 点进 karuo-ai 可浏览代码、提交、分支、克隆地址等，和 GitHub 类似。

---

## 二、在 NAS 上部署 Gitea（一次性）

### 2.1 创建目录并写入 docker-compose

在**能 SSH 到 NAS 的电脑**上执行（或复制到 NAS 上执行）：

```bash
# 创建目录
ssh nas "mkdir -p /volume1/docker/gitea/data"

# 写入 docker-compose（Gitea 官方镜像，数据持久化到 /volume1/docker/gitea/data）
ssh nas "cat > /volume1/docker/gitea/docker-compose.yml << 'ENDOFFILE'
version: \"3.8\"
services:
  server:
    image: docker.gitea.com/gitea/gitea:latest
    container_name: gitea
    environment:
      - USER_UID=1026
      - USER_GID=100
      - GITEA__server__DOMAIN=open.quwanzhi.com
      - GITEA__server__ROOT_URL=http://open.quwanzhi.com:3000/
      - GITEA__server__HTTP_PORT=3000
    restart: unless-stopped
    ports:
      - \"3000:3000\"
    volumes:
      - /volume1/docker/gitea/data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
ENDOFFILE"
```

### 2.2 启动容器

```bash
ssh nas "cd /volume1/docker/gitea && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"
```

### 2.3 确认运行

```bash
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker ps | grep gitea"
```

浏览器访问 **http://192.168.1.201:3000**，应看到 Gitea 首次安装向导。

---

## 三、首次安装向导（浏览器里完成）

1. 打开 http://192.168.1.201:3000
2. **数据库**：保持默认 SQLite3 即可。
3. **可选**：把「站点 URL」改成 `http://open.quwanzhi.com:3000/`（外网用域名时）。
4. 创建**管理员账号**：建议用户名 `fnvtk`，密码自设（或与 NAS 一致 zhiqun1984）。
5. 保存安装。

---

## 四、在 Gitea 里建 karuo-ai 并改用 HTTP 推送

1. 登录 Gitea → 右上角 **+** → **新建仓库**。
2. 仓库名：**karuo-ai**，可见性选「私有」或「公开」，**不要**勾选「使用自述文件初始化」。
3. 创建后，在仓库页看到 **克隆地址**，例如：  
   `http://192.168.1.201:3000/fnvtk/karuo-ai.git` 或 `http://open.quwanzhi.com:3000/fnvtk/karuo-ai.git`。

### 本机改为用 Gitea 的 HTTP 地址推送（可选，推荐）

若希望以后用 HTTP 克隆/推送、并在网页上看代码：

```bash
cd "/Users/karuo/Documents/个人/卡若AI"

# 添加 Gitea 为远程（或把 origin 改成 Gitea）
git remote set-url origin "http://192.168.1.201:3000/fnvtk/karuo-ai.git"
# 外网用： git remote set-url origin "http://open.quwanzhi.com:3000/fnvtk/karuo-ai.git"

# 推送（首次会提示输入 Gitea 用户名/密码）
git push -u origin main
```

之后即可在浏览器打开 Gitea 地址，像 GitHub 一样看提交、文件、分支。

---

## 五、常用操作

| 操作 | 命令 |
|:-----|:-----|
| 启动 Gitea | `ssh nas "cd /volume1/docker/gitea && echo 'zhiqun1984' \| sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"` |
| 停止 | `ssh nas "cd /volume1/docker/gitea && echo 'zhiqun1984' \| sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down"` |
| 重启 | `ssh nas "echo 'zhiqun1984' \| sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker restart gitea"` |
| 查看日志 | `ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker logs -f gitea"` |

---

## 六、外网访问（frp / 反向代理）

若要用 **http://open.quwanzhi.com:3000** 从外网访问：

- 在 frp 或路由器上把 **3000** 端口映射到 NAS 的 192.168.1.201:3000。
- 或反向代理：例如 Nginx 把 `https://git.open.quwanzhi.com` 反代到 `http://192.168.1.201:3000`，则用 **https://git.open.quwanzhi.com** 访问。

---

*版本：v1.0 | 2026-02-13*
