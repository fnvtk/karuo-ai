# 内网穿透与域名配置 — 卡若AI 标准方案

> **约定**：以后凡需「配置内网穿透」或「给服务配一个外网域名」时，**不再向用户询问「配置什么域名」**，由 AI 按本方案直接生成子域名（如 `kr-ai.quwanzhi.com`）并完成阿里云 + 服务器配置。  
> 版本：1.0 | 更新：2026-02-17

---

## 一、固定域名与服务器

| 项目 | 值 |
|:---|:---|
| **卡若AI 网关域名** | **kr-ai.quwanzhi.com**（若主域为 quwnzhi.com 则用 kr-ai.quwnzhi.com，步骤相同） |
| **替代** | 替代 ngrok，固定域名、电脑关机也可访问 |
| **部署服务器** | **kr宝塔 43.139.27.93**（网关进程）；**存客宝 42.194.245.239**（站点/Nginx 用宝塔 API 配置，反代到 kr宝塔:8000） |
| **实现方式** | 网关直接部署在宝塔服务器上（非穿透本机），故本机关机后仍可访问 |

---

## 二、阿里云 DNS 配置

1. 登录 [阿里云 云解析 DNS](https://dns.console.aliyun.com/)。
2. 找到主域名 **quwanzhi.com**（若为 quwnzhi.com 则选对应域名）。
3. 添加解析：
   - **记录类型**：A  
   - **主机记录**：`kr-ai`  
   - **记录值**：`43.139.27.93`（kr宝塔公网 IP）  
   - **TTL**：600 或 10 分钟  
4. 保存后等待生效（通常 1–10 分钟）。

---

## 三、服务器侧配置（kr宝塔 43.139.27.93）

### 3.1 部署卡若AI 网关（首次或更新）

在**本机**执行（将网关与仓库同步到服务器并启动）：

```bash
# 一键部署命令（在本机执行，会 SSH 到 kr宝塔 完成部署）
bash /Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/部署卡若AI网关到kr宝塔.sh
```

或**在服务器上**手动执行（SSH 登录后）。**SSH 端口**以 `服务器管理/参考资料/端口配置表.md` 为准，kr宝塔为 **22022**：

```bash
ssh -p 22022 root@43.139.27.93
# 密码: Zhiqun1984

# 1. 克隆/更新卡若AI 仓库（网关依赖 BOOTSTRAP + SKILL_REGISTRY）
cd /www/wwwroot
if [ -d karuo-ai ]; then
  cd karuo-ai && git pull
else
  git clone http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/karuo-ai.git && cd karuo-ai
fi

# 2. 安装依赖并后台运行网关（端口 8000）
cd 运营中枢/scripts/karuo_ai_gateway
pip3 install -r requirements.txt -q
nohup uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir /www/wwwroot/karuo-ai/运营中枢/scripts/karuo_ai_gateway --chdir /www/wwwroot/karuo-ai > /tmp/karuo_ai_gateway.log 2>&1 &
# 或使用 systemd（见下节 3.3）
```

### 3.2 宝塔 Nginx 与 SSL

1. 登录宝塔：https://43.139.27.93:9988 ，账号见 `01_卡资（金）/金仓_存储备份/服务器管理/SKILL.md`。
2. **网站** → **添加站点**：
   - 域名：`kr-ai.quwanzhi.com`
   - 根目录：随意（如 `/www/wwwroot/kr-ai`），仅用于 Nginx 占位。
   - PHP：纯静态即可。
3. **设置** → **反向代理** → **添加反向代理**：
   - 代理名称：`kr-ai-gateway`
   - 目标 URL：`http://127.0.0.1:8000`
   - 发送域名：`$host`
4. **SSL**：申请 Let’s Encrypt（域名已解析到本机后可用），强制 HTTPS。

### 3.3 开机自启（systemd，可选）

在服务器上创建并启用服务，电脑/服务器重启后网关仍运行：

```bash
# 在 43.139.27.93 上执行
sudo tee /etc/systemd/system/karuo-ai-gateway.service << 'EOF'
[Unit]
Description=卡若AI Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/karuo-ai/运营中枢/scripts/karuo_ai_gateway
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable karuo-ai-gateway
sudo systemctl start karuo-ai-gateway
sudo systemctl status karuo-ai-gateway
```

---

## 四、一条可直接执行的命令（长期有效）

部署完成且阿里云解析生效后，在**任意终端**或**其他 AI** 中调用卡若AI：

```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```

无 `jq` 时：

```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}'
```

---

## 五、以后「需要内网穿透/新域名」时的标准流程

1. **不询问用户域名**：按业务生成子域名，规则为 `{服务名}.quwanzhi.com`（如 `kr-ai`、`next-app` 等）。
2. **阿里云**：在主域名 quwanzhi.com 下添加 A 记录，主机记录为子服务名，记录值为目标服务器公网 IP（见 `服务器管理/SKILL.md` 资产表）。
3. **服务器**：在对应宝塔上添加站点 + 反向代理 + SSL；若为新服务，再部署对应应用（如 Node/Python）并配置自启。
4. **文档**：在本文件或对应 SKILL 的 references 下补充「子域名 → 用途 → 服务器」一行说明。

---

## 六、文档与脚本位置（长期稳定）

| 内容 | 路径 |
|:---|:---|
| 本方案 | `01_卡资（金）/金仓_存储备份/服务器管理/references/内网穿透与域名配置_卡若AI标准方案.md` |
| FRP + 阿里云 DNS 统一 kr 宝塔 | `01_卡资（金）/金仓_存储备份/服务器管理/references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md` |
| 一键部署脚本 | `01_卡资（金）/金仓_存储备份/服务器管理/scripts/部署卡若AI网关到kr宝塔.sh` |
| 外网化总方案 | `运营中枢/参考资料/卡若AI外网化与外部调用方案.md` |
| 网关代码 | `运营中枢/scripts/karuo_ai_gateway/` |

---

## 七、FRP 与阿里云 DNS（统一真源：kr 宝塔）

- **约定**：**frps** 与「经 frp 暴露的公网入口」在架构上统一落在 **kr 宝塔 `43.139.27.93`**；各 **frpc** 的 `server_addr` 指向该 IP；**阿里云**上凡业务用 **A/AAAA 记录值曾为存客宝 `42.194.245.239`** 的，迁移后改为 **`43.139.27.93`**（MX/邮箱/CDN 类 CNAME 勿盲改）。  
- **完整顺序、安全组端口、验收矩阵、回滚**：见 **`references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md`**。  
- **说明**：云主机在腾讯云；阿里云负责解析，**改解析后必须在 kr 实例安全组与宝塔防火墙放行 frp 及全部历史 remote_port**，否则「解析对了仍不通」。

---

触发词：**内网穿透、配置域名、替代 ngrok、kr-ai** → 读本文件 + 服务器管理 SKILL，按本节执行。**frp 迁机、全站解析改 kr** → 叠加读 **§七** 与 `FRP与阿里云DNS统一至kr宝塔_迁移与验收.md`。
</think>
修正 systemd 的 WorkingDirectory，并写入部署脚本。
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace