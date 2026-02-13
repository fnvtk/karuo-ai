# 银掌柜金融 同步到 CKB NAS Git

> **目标**：将银掌柜金融项目推送到 CKB NAS，与卡若AI 同类流程。  
> **维护**：金仓 | 2026-02-13

---

## 一、Git 地址（SSH）

| 项目 | 地址 |
|:-----|:-----|
| **银掌柜金融** | **ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/yinzhanggu-finance.git** |

---

## 二、日常同步

在银掌柜金融根目录执行：

```bash
cd "/Users/karuo/Documents/1、金：项目/4、合作项目/银掌柜金融"

git add -A && git status
git commit -m "说明"   # 有变更再 commit

git push origin main
```

或一键脚本：

```bash
bash "scripts/push-to-ckb-nas.sh"
```

---

## 三、首次配置（已完成）

- NAS bare 仓库：`/volume1/git/github/fnvtk/yinzhanggu-finance.git`
- 本地已配置 origin，首次 push 已完成
- Gitea 网页若需展示：登录 http://192.168.1.201:3000 → 新建仓库 → 迁移/导入 选择该路径（若 Gitea 未自动识别）

---

*版本：v1.0 | 2026-02-13*
