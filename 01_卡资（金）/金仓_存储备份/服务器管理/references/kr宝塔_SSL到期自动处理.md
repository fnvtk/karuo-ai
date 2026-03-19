# kr宝塔 SSL 到期自动处理

> 43.139.27.93 · 适用 Node 项目 / 网站 的 Let's Encrypt 证书。以后碰到「SSL 已过期」按本文自动处理。

---

## 1. 现状说明

- **通配符证书**：`*.quwanzhi.com`（含 `quwanzhi.com`）由宝塔申请，存放在 `/www/server/panel/vhost/letsencrypt/quwanzhi.com/`，有效期约 90 天。
- **各站点 cert 目录**：每个站点在 `/www/server/panel/vhost/cert/<站点名>/` 下有独立副本；过期时需用「有效通配符证书」覆盖并重载 nginx。
- **计划任务**：宝塔已有「续签Let's Encrypt证书」（ID 21），每日执行 `/www/server/panel/pyenv/bin/python3 -u /www/server/panel/class/acme_v2.py --renew=1`。若续签失败会进入约 2 天冷却（`letsencrypt_v2.json` 内 `next_retry_time`）。

---

## 2. 自动处理流程（以后碰到 SSL 到期时执行）

### 2.1 方案 A：SSH 一键修复（推荐）

在**本机**执行（需 `sshpass`，密码见 00_账号与API索引）：

```bash
# 1）重置续期冷却，避免“上次续签失败需等待 N 小时”
sshpass -p 'Zhiqun1984' ssh -o StrictHostKeyChecking=no -p 22022 root@43.139.27.93 '
python3 -c "
import json
path = \"/www/server/panel/config/letsencrypt_v2.json\"
with open(path) as f: c = json.load(f)
for o in c.get(\"orders\", {}).values():
    o[\"next_retry_time\"] = 0
    o[\"retry_count\"] = 0
with open(path, \"w\") as f: json.dump(c, f, indent=2)
print(\"冷却已重置\")
"
'

# 2）用有效通配符证书覆盖所有 *.quwanzhi.com 站点并重载 nginx
sshpass -p 'Zhiqun1984' ssh -o StrictHostKeyChecking=no -p 22022 root@43.139.27.93 '
SOURCE="/www/server/panel/vhost/letsencrypt/quwanzhi.com"
CERT_DIR="/www/server/panel/vhost/cert"
NGX="/www/server/panel/vhost/nginx"
for dir in "$CERT_DIR"/*/; do
  name=$(basename "$dir")
  conf=""
  for f in "$NGX"/"$name".conf "$NGX"/node_"$name".conf "$NGX"/go_"$name".conf; do
    [ -f "$f" ] && conf="$f" && break
  done
  [ -z "$conf" ] && continue
  domain=$(grep -m1 "server_name" "$conf" 2>/dev/null | sed "s/.*server_name[^a-zA-Z0-9*.-]*//;s/;.*//" | awk "{print \$1}")
  if echo "$domain" | grep -q "quwanzhi.com"; then
    cp -f "$SOURCE/fullchain.pem" "$dir/fullchain.pem"
    cp -f "$SOURCE/privkey.pem" "$dir/privkey.pem"
    echo "{\"notAfter\":\"2026-05-06\",\"issuer\":\"R12\",\"issuer_O\":\"Let'\''s Encrypt\",\"subject\":\"*.quwanzhi.com\",\"dns\":[\"quwanzhi.com\",\"*.quwanzhi.com\"],\"endtime\":89}" > "$dir/info.json"
  fi
done
nginx -s reload
echo "通配符证书已同步到各站点并重载 nginx"
'
```

- 若通配符证书本身已续期，`notAfter` 会变；脚本里写死 `2026-05-06` 仅为 info 展示，不影响 nginx 使用的 pem。可改为从 `$SOURCE/fullchain.pem` 用 `openssl x509 -noout -enddate` 解析后写入 info.json。

### 2.2 方案 B：服务器上每周同步脚本（推荐长期）

- **脚本路径**：`/root/sync_quwanzhi_ssl.sh`（已在服务器创建，见下节「服务器侧脚本」）。
- **计划任务**：登录宝塔面板 → **计划任务** → 添加任务，类型「Shell 脚本」，周期「每周」（如周日 4:00），执行内容：`/root/sync_quwanzhi_ssl.sh`。
- 效果：每周将 `vhost/letsencrypt/quwanzhi.com/` 的最新证书同步到所有使用 `*.quwanzhi.com` 的站点并重载 nginx，面板续期后也会自动铺开。

### 2.3 方案 C：仅依赖宝塔内置续期

- 确保计划任务「续签Let's Encrypt证书」**启用**且每日执行。
- 若仍大面积过期：先执行 2.1 的「重置冷却」+「通配符覆盖」恢复访问，再检查面板「网站」→ 各站点「SSL」是否都勾选为使用 Let's Encrypt，以及 `letsencrypt_v2.json` 中是否包含对应订单。

---

## 3. 服务器侧脚本（可选，用于每周自动同步）

在 kr宝塔 上创建 `/root/sync_quwanzhi_ssl.sh`：

```bash
#!/bin/bash
# 将 quwanzhi.com 通配符证书同步到所有 *.quwanzhi.com 站点
SOURCE="/www/server/panel/vhost/letsencrypt/quwanzhi.com"
CERT_DIR="/www/server/panel/vhost/cert"
NGX="/www/server/panel/vhost/nginx"
for dir in "$CERT_DIR"/*/; do
  [ ! -d "$dir" ] && continue
  name=$(basename "$dir")
  conf=""
  for f in "$NGX"/"$name".conf "$NGX"/node_"$name".conf "$NGX"/go_"$name".conf; do
    [ -f "$f" ] && conf="$f" && break
  done
  [ -z "$conf" ] && continue
  domain=$(grep -m1 "server_name" "$conf" 2>/dev/null | sed 's/.*server_name[^a-zA-Z0-9*.-]*//;s/;.*//' | awk '{print $1}')
  if echo "$domain" | grep -q "quwanzhi.com"; then
    cp -f "$SOURCE/fullchain.pem" "$dir/fullchain.pem"
    cp -f "$SOURCE/privkey.pem" "$dir/privkey.pem"
    notAfter=$(openssl x509 -in "$SOURCE/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "{\"notAfter\":\"$notAfter\",\"issuer\":\"R12\",\"issuer_O\":\"Let's Encrypt\",\"subject\":\"*.quwanzhi.com\",\"dns\":[\"quwanzhi.com\",\"*.quwanzhi.com\"],\"endtime\":89}" > "$dir/info.json"
  fi
done
nginx -s reload
echo "[$(date)] sync_quwanzhi_ssl done" >> /var/log/sync_quwanzhi_ssl.log
```

- 服务器上已创建并 `chmod +x`。在宝塔「计划任务」中新增：Shell 脚本，每周执行，内容：`/root/sync_quwanzhi_ssl.sh`。

---

## 4. 非 quwanzhi.com 域名（lkdie.com / lytiao.com）

- 若站点使用 `*.lkdie.com`、`*.lytiao.com` 等，需在宝塔「网站」→ 对应站点「SSL」中单独申请/续签或使用自有证书。
- 当前自动流程仅覆盖「解析到本机且 server_name 为 *.quwanzhi.com」的站点。

---

## 5. 相关文件与索引

| 项目 | 路径 |
|------|------|
| 本参考 | `references/kr宝塔_SSL到期自动处理.md` |
| kr宝塔 入口 | `references/kr宝塔_宝塔管理SKILL.md` |
| 主 Skill | `SKILL.md`（SSL 检查脚本、API 降级） |
| 账号/API | `运营中枢/工作台/00_账号与API索引.md` |

---

**总结**：以后碰到 kr宝塔 SSL 到期，优先执行 **2.1 方案 A** 两条命令（重置冷却 + 通配符覆盖）；长期可加 **2.2 方案 B** 每周同步 + 确保宝塔「续签Let's Encrypt证书」每日运行。
