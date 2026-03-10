---
name: Soul发到素材库
description: Soul 派对成片切片→飞书内容看板。标题/时间/进展状态 + 附件（mp4 上传 drive）+ 多平台描述（抖音/小红书/视频号）。支持新建与更新已有记录。可打包为基因胶囊。
triggers: Soul发到素材库、成片发飞书、切片发飞书、视频分发飞书、发到素材库
parent: 飞书管理
owner: 水桥
group: 水
version: "1.0"
updated: "2026-03-10"
---

# Soul 发到素材库 · 基因胶囊

> **一句话**：Soul 派对成片目录（含 目录索引.md 与 mp4）→ 飞书知识库多维表格（内容看板），含**附件上传**、**多平台描述**（抖音/小红书/视频号），支持新建与更新已有记录。

---

## 一、功能概览

| 功能 | 说明 |
|:---|:---|
| **标题** | 格式：119场 3月8日 第N场 标题 |
| **时间** | 真实直播日期 YYYY-MM-DD |
| **进展状态** | 看板分组，如 2026年3月 |
| **附件** | mp4 自动上传到飞书 drive 并写入附件字段 |
| **你的解决方案** | 多平台描述：抖音、小红书、视频号（标题+描述+话题） |

---

## 二、脚本路径与前置

| 项 | 值 |
|:---|:---|
| 脚本 | `02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_slice_upload_to_wiki_table.py` |
| 飞书 Token | 同目录 `.feishu_tokens.json`（与 write_today_three_focus 共用） |
| 成片目录 | 含 `目录索引.md`（序号|标题|Hook|CTA）与 mp4 文件 |
| 目标链接 | `https://cunkebao.feishu.cn/wiki/MKhNwmYwpi1hXIkJvfCcu31vnDh?table=tblGjpeCk1ADQMEX` |

---

## 三、一键命令

### 3.1 仅检查表格（不写入）

```bash
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本
python3 feishu_slice_upload_to_wiki_table.py --check-only \
  --wiki-node MKhNwmYwpi1hXIkJvfCcu31vnDh --table tblGjpeCk1ADQMEX
```

### 3.2 新建上传（新建记录 + 附件 + 多平台描述）

```bash
python3 feishu_slice_upload_to_wiki_table.py \
  --wiki-node MKhNwmYwpi1hXIkJvfCcu31vnDh --table tblGjpeCk1ADQMEX \
  --clips-dir "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片" \
  --session 119 --date 2026-03-08 --group "2026年3月"
```

### 3.3 更新已有记录（补写附件 + 多平台描述）

```bash
python3 feishu_slice_upload_to_wiki_table.py --update-existing \
  --wiki-node MKhNwmYwpi1hXIkJvfCcu31vnDh --table tblGjpeCk1ADQMEX \
  --clips-dir "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片" \
  --session 119 --date 2026-03-08
```

### 3.4 仅写标题/时间/描述，不上传附件

```bash
python3 feishu_slice_upload_to_wiki_table.py \
  --clips-dir "..." --session 119 --date 2026-03-08 --no-upload-attachment
```

---

## 四、多平台描述格式

脚本自动从 `目录索引.md` 的 Hook/CTA 生成并写入「你的解决方案」：

```
【抖音】
标题：xxx（≤28字）。#Soul派对 #创业日记 #晨间直播 #私域干货 #卡若创业派对
描述：Hook。关注我，每天学一招私域干货

【小红书】
标题：xxx（≤20字）
正文：Hook。关注我... #Soul派对 ...

【视频号】
描述：Hook。关注我... #Soul派对 ...
```

---

## 五、基因胶囊

本 Skill 可打包为基因胶囊，供其他 Agent/项目继承：

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" pack \
  "02_卡人（水）/水桥_平台对接/飞书管理/Soul发到素材库_SKILL.md"
```

解包继承：

```bash
python3 .../gene_capsule.py unpack Soul发到素材库_*.json -o <目标目录>
```
