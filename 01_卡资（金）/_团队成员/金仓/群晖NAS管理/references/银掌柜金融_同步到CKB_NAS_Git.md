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

## 三、Gitea 网页访问（解决 404）

仓库已复制到 Gitea 目录，需在管理后台「收养」后才会显示：

1. 登录 Gitea：http://192.168.1.201:3000（用 fnvtk 管理员账号）
2. 右上角头像 → **网站管理**（Admin）
3. 左侧 **仓库管理** → **未收养的仓库**（Unadopted Repositories）
4. 找到 `yinzhanggu-finance` → 点击 **收养**（Adopt）
5. 收养完成后即可访问：http://192.168.1.201:3000/fnvtk/yinzhanggu-finance

---

## 四、网站部署（已完成）

**keynote-ppt 静态站**已部署到 CKB NAS Web 目录：

| 访问地址 | 说明 |
|:---------|:-----|
| **http://192.168.1.201/yinzhanggu/** | 内网访问 |
| **http://open.quwanzhi.com/yinzhanggu/** | 外网（需 frp 映射 80） |

**NAS 路径**：`/volume1/web/yinzhanggu/`

**重新部署**：本地 build 后 rsync 到 NAS
```bash
cd "/Users/karuo/Documents/1、金：项目/4、合作项目/银掌柜金融/材料/keynote-ppt"
npm run build
rsync -avz --delete -e "ssh -p 22201" dist/ fnvtk@open.quwanzhi.com:/volume1/web/yinzhanggu/
```

---

## 五、首次配置（已完成）

- NAS bare 仓库：`/volume1/git/github/fnvtk/yinzhanggu-finance.git`
- 已复制到 Gitea：`/volume1/docker/gitea/data/git/repositories/fnvtk/yinzhanggu-finance.git`
- Gitea 数据库已注册，网页可正常访问
- 本地已配置 origin，首次 push 已完成

---

*版本：v1.1 | 2026-02-13*
