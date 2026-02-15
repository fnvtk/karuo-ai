# Gitea 推送 — 卡若AI 调用手册

> 凭证与接口记录，下次调用直接读本文件 + 00_账号与API索引 § Gitea  
> 路径：`_共享模块/references/Gitea推送_卡若AI调用手册.md`

---

## 一、凭证（来自 00_账号与API索引）

| 项 | 值 |
|----|-----|
| 地址 | http://open.quwanzhi.com:3000 |
| 账号 | fnvtk |
| 密码 | Zhiqun1984 |
| SSH 端口 | 22201 |

---

## 二、推送方式

### 2.1 SSH 推送（推荐，无需 token）

```bash
# 远程 URL 格式
ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/{仓库名}.git

# 推送命令（需 sshpass 或 SSH 密钥）
GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes256-cbc -p 22201" \
sshpass -p 'Zhiqun1984' git push gitea main
```

### 2.2 HTTP 推送（账号密码嵌入 URL）

```bash
git remote add gitea "http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/{仓库名}.git"
git push gitea main
```

> ⚠️ Gitea 默认禁用「推送即创建」，新建仓库需先 SSH 到 NAS 手动创建 bare 仓库。

### 2.3 新建仓库（SSH 到 NAS）

```bash
sshpass -p 'Zhiqun1984' ssh -o StrictHostKeyChecking=no -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes256-cbc -p 22201 fnvtk@open.quwanzhi.com \
  "mkdir -p /volume1/git/github/fnvtk/新仓库名.git && cd /volume1/git/github/fnvtk/新仓库名.git && git init --bare && echo 'ref: refs/heads/main' > HEAD"
```

---

## 三、已配置仓库

| 仓库 | 路径 | 远程名 |
|------|------|--------|
| 卡若AI | /Users/karuo/Documents/个人/卡若AI | gitea |
| 分布式算力矩阵 | /Users/karuo/Documents/1、金：项目/3、自营项目/分布式算力矩阵 | gitea |

---

## 四、卡若AI 调用流程

1. 读本文件 + `00_账号与API索引` § Gitea
2. 取凭证：fnvtk / Zhiqun1984
3. 推送：`sshpass -p 'Zhiqun1984' git push gitea main`（或对应 remote 名）
