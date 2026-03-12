# 附录 B · 常用命令与脚本

> 返回 [总目录](../README.md)

---

## Gitea 同步

```bash
bash 01_卡资（金）/金仓_存储备份/Gitea管理/脚本/自动同步.sh
```

每次对话有文件变更时自动执行，单文件 >20MB 不提交。

## 飞书今日日志

```bash
python 02_卡人（水）/水桥_平台对接/飞书管理/脚本/write_today_three_focus.py
```

直接执行不询问，写入三件事 + 未完成事项。

## 基因胶囊

```bash
python 05_卡土（土）/土砖_技能复制/基因胶囊/gene_capsule.py pack <skill_path>
python 05_卡土（土）/土砖_技能复制/基因胶囊/gene_capsule.py unpack <capsule>
python 05_卡土（土）/土砖_技能复制/基因胶囊/gene_capsule.py list
python 05_卡土（土）/土砖_技能复制/基因胶囊/gene_capsule.py pack-all
```

## 每日对话收集

```bash
python 02_卡人（水）/水溪_整理归档/记忆系统/collect_chat_daily.py
```

每天首次对话时执行一次。

## 记忆冲突检测

```bash
python 02_卡人（水）/水溪_整理归档/记忆系统/memory_conflict_check.py "要写入的内容"
```

写入长期记忆前执行。

## 日历去重

```bash
osascript 02_卡人（水）/水桥_平台对接/飞书管理/脚本/calendar_remove_dupes_today_and_future.applescript
```

## 卡若AI 网关

```bash
cd 运营中枢/scripts/karuo_ai_gateway
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Docker 项目部署

```bash
docker compose up -d --build
```

部署后须用 `--build` 保证使用本地最新代码。

## Cursor 缓存清理

```bash
bash 运营中枢/参考资料/scripts/clear_cursor_cache.sh
```

Cursor 闪退或卡顿时执行。

## 外网调用卡若AI

```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```
