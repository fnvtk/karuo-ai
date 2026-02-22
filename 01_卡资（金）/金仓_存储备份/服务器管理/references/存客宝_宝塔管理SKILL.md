# 存客宝 · 宝塔管理 Skill

> 42.194.245.239 · 2核16G 50M · 私域银行业务。本文件为存客宝专用入口，统一凭证与操作，所有错误与处理见主 Skill。

---

## 凭证

| 类型 | 值 |
|------|-----|
| IP | 42.194.245.239 |
| SSH 端口 | 22022 |
| SSH 账号 | root（面板账号 ckb 仅用于 Web） |
| SSH 密码 | Zhiqun1984（大写 Z，与 kr宝塔一致） |
| 宝塔面板 | https://42.194.245.239:9988 |
| 面板账号 | ckb |
| 面板密码 | zhiqun1984 |
| API 密钥 | TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi |

---

## SSH 修复（Permission denied 时）

在宝塔面板 → 终端执行 `scripts/存客宝_SSH修复_宝塔终端执行.sh` 全部内容，修复后 root/Zhiqun1984 可登录。

---

## 站点无法访问（ERR_CONNECTION_CLOSED）

若 kr-kf.quwanzhi.com、lytiao.com 等无法打开：先查 **443 端口**。常见为腾讯云安全组未放行 443，或 Nginx 未监听 443。详见 `references/存客宝_站点无法访问_ERR_CONNECTION_CLOSED修复.md`。

---

## 快速操作

- **Node 项目**：若有 Node 项目，可参考 `references/宝塔Node项目管理_SKILL.md` 编写存客宝版批量修复脚本（PANEL、API_KEY 改为存客宝）
- **站点/域名**：一律用宝塔 API 处理，见主 SKILL 一键操作
- **卡若AI 网关站点**：`python3 scripts/存客宝_宝塔API_卡若AI网关站点.py`
- **www.lytiao.com Docker 化**：`python3 scripts/腾讯云_TAT_存客宝_lytiao_Docker部署.py`（TAT 免 SSH）；或宝塔终端粘贴 `scripts/存客宝_lytiao_Docker部署_宝塔终端执行.sh`。部署后访问 http://42.194.245.239:8080

---

## 主 Skill 与错误处理

- **主 Skill**：`references/宝塔Node项目管理_SKILL.md`（凭证、Node API、常见错误、脚本）
- 遇新错误：在主 Skill 第四节补充后，本文件可追加存客宝特有说明
