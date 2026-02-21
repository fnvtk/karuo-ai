# 存客宝 · 宝塔管理 Skill

> 42.194.245.239 · 2核16G 50M · 私域银行业务。本文件为存客宝专用入口，统一凭证与操作，所有错误与处理见主 Skill。

---

## 凭证

| 类型 | 值 |
|------|-----|
| IP | 42.194.245.239 |
| SSH 端口 | 22022 |
| SSH 账号 | root |
| SSH 密码 | zhiqun1984 |
| 宝塔面板 | https://42.194.245.239:9988 |
| 面板账号 | ckb |
| 面板密码 | zhiqun1984 |
| API 密钥 | TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi |

---

## 快速操作

- **Node 项目**：若有 Node 项目，可参考 `references/宝塔Node项目管理_SKILL.md` 编写存客宝版批量修复脚本（PANEL、API_KEY 改为存客宝）
- **站点/域名**：一律用宝塔 API 处理，见主 SKILL 一键操作
- **卡若AI 网关站点**：`python3 scripts/存客宝_宝塔API_卡若AI网关站点.py`

---

## 主 Skill 与错误处理

- **主 Skill**：`references/宝塔Node项目管理_SKILL.md`（凭证、Node API、常见错误、脚本）
- 遇新错误：在主 Skill 第四节补充后，本文件可追加存客宝特有说明
