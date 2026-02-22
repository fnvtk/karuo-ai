#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝 lytiao 快速部署 - 使用精简 Dockerfile（不编译扩展，2 分钟内完成）
"""
import base64, json, os, re, sys, time
CKB_ID, REGION = "ins-ciyv2mxa", "ap-guangzhou"

def _cred():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        r = os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")
        if os.path.isfile(r):
            t = open(r, encoding="utf-8").read()
            sid = skey = None
            in_t = False
            for L in t.splitlines():
                if "### 腾讯云" in L: in_t = True
                elif in_t and L.strip().startswith("###"): break
                elif in_t:
                    m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", L, re.I)
                    if m and m.group(1).strip().startswith("AKID"): sid = m.group(1).strip()
                    m = re.search(r"SecretKey[^|]*\|\s*`([^`]+)`", L, re.I)
                    if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None

# 配置 Docker 镜像加速后拉取
CMD = """set -e
# 配置 DaoCloud 镜像加速（避免 Docker Hub 国内拉取失败）
mkdir -p /etc/docker
if ! grep -q registry-mirrors /etc/docker/daemon.json 2>/dev/null; then
  echo '{"registry-mirrors":["https://docker.m.daocloud.io"]}' > /etc/docker/daemon.json
  systemctl restart docker 2>/dev/null || systemctl restart containerd 2>/dev/null || true
  sleep 5
fi
DIR="/opt/lytiao_docker"
SRC="/www/wwwroot/www.lytiao.com"
mkdir -p "$DIR"
cat > "$DIR/Dockerfile" << 'EOF'
FROM php:7.4-apache
RUN a2enmod rewrite
WORKDIR /var/www/html
EXPOSE 80
EOF
cat > "$DIR/docker-compose.yml" << 'EOF'
services:
  lytiao-web:
    build: .
    container_name: lytiao-www
    ports:
      - "8090:80"
    volumes:
      - ./www:/var/www/html
    restart: unless-stopped
EOF
rm -rf "$DIR/www"
cp -a "$SRC" "$DIR/www"
cd "$DIR"
docker compose down 2>/dev/null || true
docker compose up -d --build 2>&1
sleep 3
docker ps -a --filter name=lytiao
curl -sI -o /dev/null -w 'HTTP: %{http_code}' http://127.0.0.1:8090/ 2>/dev/null || echo "fail"
"""

def main():
    sid, skey = _cred()
    if not sid or not skey: print("❌ 无凭证"); return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_ID]
    req.CommandType, req.Timeout = "SHELL", 180
    req.CommandName = "CKB_lytiao_Quick"
    r = client.RunCommand(req)
    print("已下发（精简构建，约 2 分钟）InvocationId:", r.InvocationId)
    print("等待 240s 获取结果...")
    time.sleep(240)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter(); f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = client.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        err_info = getattr(t, "ErrorInfo", None)
        if err_info:
            print("ErrorInfo:", err_info)
        tr = getattr(t, "TaskResult", None)
        print("TaskResult type:", type(tr))
        if tr:
            try:
                j = json.loads(tr) if isinstance(tr, str) else (tr if hasattr(tr, "get") else {})
                o = j.get("Output", "") if isinstance(j, dict) else ""
                e = j.get("Error", "") if isinstance(j, dict) else ""
                if o:
                    try: o = base64.b64decode(o).decode("utf-8", errors="replace")
                    except: pass
                    print("\n--- 输出 ---\n", o)
                if e:
                    try: e = base64.b64decode(e).decode("utf-8", errors="replace")
                    except: pass
                    print("\n--- 错误 ---\n", e)
            except Exception as ex:
                print("解析异常:", ex)
            print("TaskResult repr:", repr(tr)[:1200])
    print("\n访问: http://42.194.245.239:8090")
    return 0

if __name__ == "__main__":
    sys.exit(main())
