# 卡若AI · GitHub 同步说明

- **本地路径**：`/Users/karuo/Documents/个人/卡若AI`
- **GitHub 仓库**：https://github.com/fnvtk/karuo-ai

## 手动同步
```bash
cd "/Users/karuo/Documents/个人/卡若AI"
./scripts/push-to-github.sh
```

## 定时任务
已安装：每 4 小时自动执行一次同步（有变更才提交并推送）。
- 卸载：`launchctl unload ~/Library/LaunchAgents/com.karuo.ai.push-github.plist`

## Token
上传使用的 GitHub Token 由卡路亚提供；若更换账号或 Token，请更新 remote：
```bash
git remote set-url origin https://<新TOKEN>@github.com/fnvtk/karuo-ai.git
```
