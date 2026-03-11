## 万推部署到 KR 宝塔

- 日期：2026-03-11
- 项目：`万推`
- 服务器：`KR 宝塔` `43.139.27.93`
- 域名：`https://wantui.quwanzhi.com`

### 本次结论

- `KR 宝塔` 上原先没有 `wantui / 万推` 项目。
- `KR` 服务器宿主机 `8000` 不能直接给万推用，因为 `kr-ai.quwanzhi.com` 历史上占用了 `127.0.0.1:8000` 反代。
- 最终采用：`wantui` 容器监听容器内 `8000`，宿主机映射为 `127.0.0.1:3810`，再由 Nginx 反代到域名。

### 关键经验

- `docker-compose.yml` 最好把宿主机端口参数化：`WANTUI_HOST_PORT`，避免和服务器已有业务端口冲突。
- Dockerfile 里 Debian 源若走 `http://deb.debian.org`，在当前网络环境下容易被代理到 `198.18.*` 导致中途下载失败；改成 `https://deb.debian.org` 更稳。
- `python -m playwright install --with-deps chromium firefox` 会额外尝试下载 headless shell，当前网络下容易失败；改成 `python -m playwright install --with-deps --no-shell chromium firefox` 更稳。
- 若服务器本机 `docker build` 拉 Docker Hub 超时，可以改走：本机 `buildx --platform linux/amd64` 构建 → `docker save | gzip` → `scp` → 服务器 `docker load`。
- 宝塔 Nginx 配置通过 SSH 写入时，`$host`、`$scheme` 等变量要防止被本地 shell 提前展开，否则会出现 `proxy_set_header` 参数错误。
- `acme.sh` 走 `dns_ali` 可直接给 `wantui.quwanzhi.com` 签证书；长时间签发任务建议后台跑并看日志，避免 SSH 长连接被掐断。

### 最终状态

- 本机测试：`http://127.0.0.1:8010/api/health` 正常。
- 线上服务：`https://wantui.quwanzhi.com/api/health` 正常。
- KR 容器：`wantui`，状态 `healthy`，端口映射 `127.0.0.1:3810->8000`。
