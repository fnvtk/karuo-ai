# QQ 邮箱 IMAP 拉取

> 水桥 · 平台对接 | 命令行接收 QQ 邮件

## 配置说明

- **授权码**：已保存在 `.qq_mail_env`（本地，不提交 git）
- **账号**：zhengzhiqun@qq.com
- **用途**：脚本启动时自动读取 `.qq_mail_env`，无需再手动设置环境变量

## 命令行用法

```bash
# 拉取最近 30 天（默认）
python qq_mail_fetch.py

# 拉取最近 7 天
python qq_mail_fetch.py --days 7

# 最多拉取 50 封
python qq_mail_fetch.py --limit 50

# 组合：最近 7 天、最多 20 封
python qq_mail_fetch.py --days 7 --limit 20
```

## Boss 直聘简历附件批量下载

将邮箱中「Boss直聘」相关邮件的所有附件（简历等）下载到本机「下载」目录下的 `Boss直聘简历` 文件夹：

```bash
python3 download_boss_zhipin_resumes.py           # 全部
python3 download_boss_zhipin_resumes.py --days 365  # 仅最近一年（更快）
```

会扫描收件箱 + 垃圾箱，筛选主题/发件人含「Boss」「直聘」「zhipin」「博聘」的邮件，输出到 `~/Downloads/Boss直聘简历/`。

## 登录失败排查

若出现 `Login fail`，请检查：
1. QQ 邮箱 → 设置 → 账户 → POP3/IMAP/SMTP → **已开启 IMAP**
2. 授权码为刚生成的可再试一次（有时需等待数分钟生效）
3. 更换 QQ 密码会使授权码失效，需重新生成
