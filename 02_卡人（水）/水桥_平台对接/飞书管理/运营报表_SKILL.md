---
name: Soul派对运营报表
description: Soul 派对运营数据全自动写入飞书表格（按月份选 2月/3月 标签）→ 会议纪要图片入表 → 发飞书群（数据+纪要图）；与智能纪要联动，一站式可执行。含 Token 自动刷新、写入校验、小程序数据。
triggers: 运营报表、派对填表、派对截图填表发群、会议纪要上传、本月运营数据、全部月份统计、派对纪要、智能纪要、106场、107场、113场、114场、115场
parent: 飞书管理
owner: 水桥
group: 水
version: "2.3"
updated: "2026-03-04"
---

# Soul 派对运营报表 · 基因胶囊

> **一句话**：派对截图 + TXT → 飞书运营报表（按月份选表）→ 填数据 + 填纪要图 + 发群（文字 + 图片），与**会议纪要**联动，一站式可执行。

---

## 一站式完整流程（填数据 → 填图片 → 发群）

**目标**：同一场派对做完「填运营报表数据 → 把会议纪要图片填进报表 → 把纪要图发到飞书群」，顺序执行、流程清晰。

| 步骤 | 动作 | 命令 / 说明 |
|:---|:---|:---|
| **1** | **填数据 + 发群（文字）** | `cd 飞书管理/脚本`<br/>`python3 soul_party_to_feishu_sheet.py 115`<br/>→ 效果数据写入当月表对应日期列，并**自动推送竖状文字到飞书群**（含报表链接） |
| **2** | **生成会议纪要图** | 按 **智能纪要 Skill**（`02_卡人（水）/水桥_平台对接/智能纪要/SKILL.md`）：txt → JSON → HTML → 截图 PNG，输出到 `卡若Ai的文件夹/报告/` |
| **3** | **填图片到报表** | `cd 飞书管理/脚本`<br/>`python3 feishu_write_minutes_to_sheet.py --party-image "<报告路径>/soul_115场_智能纪要_20260304.png" --sheet-id bJR5sA --date-col 4`<br/>→ 纪要图写入运营报表「今日总结」对应列（3 月 115 场 = 第 4 列） |
| **4** | **把纪要图发到飞书群** | `cd 智能纪要/脚本`<br/>`python3 send_to_feishu.py --image "<报告路径>/soul_115场_智能纪要_20260304.png"`<br/>→ 默认 Webhook 为**运营报表同一飞书群**，群内会收到纪要长图 |

**执行顺序**：1 → 2 → 3 → 4，即可完成「数据入表 + 纪要图入表 + 群内先收文字再收纪要图」。

- **2 月场次**：步骤 3 不传 `--sheet-id`/`--date-col` 时，默认写 2 月表 19/20 列；步骤 4 不变。
- **同群**：运营报表发群与纪要图发群使用同一 Webhook（见 1.3），群内先看到场次数据，再看到纪要图。

---

## 快速开始（30 秒上手）

```bash
# ❶ 安装依赖（一次性）
pip3 install requests

# ❷ 刷新飞书 Token（每天首次或 Token 过期时）
cd 飞书管理/脚本 && python3 auto_log.py

# ❸ 写入派对效果数据（自动选 2月/3月 工作表 + 发群）
python3 soul_party_to_feishu_sheet.py 115

# ❹ 生成派对智能纪要文本并写入「今日总结」（可选，与纪要图二选一或都做）
python3 write_party_minutes_from_txt.py "/path/to/soul 派对 115场 20260304.txt" 4

# ❺ 批量写入小程序数据（可选）
python3 write_miniprogram_batch.py
```

所有脚本路径：飞书管理相关在 `飞书管理/脚本/`，纪要生成与发图在 `智能纪要/脚本/`。**3 月场次**会自动写入 3 月工作表标签，不会误写到 2 月。

---

## 一、完整配置清单

### 1.1 飞书应用

| 项目 | 值 |
|:---|:---|
| App ID | `cli_a48818290ef8100d` |
| App Secret | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` |
| 授权回调 | `http://localhost:5050/api/auth/callback` |
| 权限 | `wiki:wiki` `docx:document` `drive:drive` |

### 1.2 运营报表（飞书电子表格）

| 项目 | 值 |
|:---|:---|
| 表格链接（2月） | https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9 |
| 表格链接（3月） | https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=bJR5sA |
| spreadsheet_token | `wikcnIgAGSNHo0t36idHJ668Gfd` |
| 2 月 sheet_id | `7A3Cy9` |
| 3 月 sheet_id | `bJR5sA` |
| 表格结构 | A 列=指标名，第 1 行=日期（1、2…），第 2 行可含「113场」「114场」等，第 3~12 行=效果数据，第 15 行=小程序访问，第 28 行=今日总结，第 29 行=派对录屏（飞书妙记链接） |
| 月份选择 | 脚本按 `SESSION_MONTH` 自动选 2 月或 3 月工作表，避免串月 |

### 1.3 飞书群 Webhook（报表数据 + 纪要图同群）

| 项目 | 值 |
|:---|:---|
| Webhook URL | `https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-5b9b-4abb-a05a-96c8fb9599f1` |
| 用途 | ① 填表后自动推送竖状格式消息（场次数据+报表链接）；② 会议纪要图片发群（智能纪要 `send_to_feishu.py --image` 默认即此 Webhook） |

### 1.4 Token 管理

| 项目 | 说明 |
|:---|:---|
| Token 文件 | 脚本同目录 `.feishu_tokens.json` |
| 含字段 | `access_token`、`refresh_token`、`auth_time` |
| 自动刷新 | 所有脚本遇 401 自动用 refresh_token 刷新，无需手动 |
| 手动刷新 | `python3 auto_log.py` （静默刷新，不需浏览器） |

---

## 二、脚本清单与用途

### 2.1 核心脚本（日常使用）

| 脚本 | 功能 | 命令 |
|:---|:---|:---|
| `soul_party_to_feishu_sheet.py` | 按场次写入效果数据到**当月工作表**对应日期列 + 飞书群推送（2 月/3 月自动选标签） | `python3 soul_party_to_feishu_sheet.py 115` |
| `write_party_minutes_from_txt.py` | 从 TXT 生成智能纪要**文本**写入「今日总结」行（需指定日期列号） | `python3 write_party_minutes_from_txt.py "<txt路径>" 4` |
| `auto_log.py` | Token 刷新 + 飞书日志写入 | `python3 auto_log.py` |

### 2.2 辅助脚本

| 脚本 | 功能 | 命令 |
|:---|:---|:---|
| `feishu_write_minutes_to_sheet.py` | 会议纪要/派对总结**图片**上传到「今日总结」对应日期列（默认 2 月 19/20 日列）；3 月某场需指定 sheet 与日期列；**发群**需另执行智能纪要 `send_to_feishu.py --image` | `python3 feishu_write_minutes_to_sheet.py [内部图] [派对图]`<br/>3 月 115 场：`--party-image <png路径> --sheet-id bJR5sA --date-col 4` |
| `feishu_sheet_monthly_stats.py` | 月度运营数据统计 | `python3 feishu_sheet_monthly_stats.py 2` 或 `all` |
| `write_miniprogram_to_sheet.py` | **单日**写入小程序三核心数据（访问次数、访客、交易金额） | `python3 write_miniprogram_to_sheet.py 23 55 55 0` |
| `write_miniprogram_batch.py` | **批量**将 `MINIPROGRAM_EXTRA` 中所有日期的小程序数据写入报表 | `python3 write_miniprogram_batch.py` |

### 2.3 派对录屏链接（自动写入）

填表时若在 `soul_party_to_feishu_sheet.py` 中配置了 `PARTY_VIDEO_LINKS[场次]`（飞书妙记完整 URL），会**自动**写入「派对录屏」行对应列（如 115 场 → E29）。新场次需在脚本中补全链接后重新执行该场次填表。

### 2.4 小程序运营数据（自动写入）

每日填表时，若在 `soul_party_to_feishu_sheet.py` 中配置了 **2 月** `MINIPROGRAM_EXTRA` 或 **3 月** `MINIPROGRAM_EXTRA_3`，会**自动**把当日小程序三核心数据写入对应日期列。数据需从 **Soul 小程序 / 微信公众平台 → 小程序 → 统计 → 实时访问、概况** 获取后填入配置：

| 指标 | 数据来源 | 行（A 列关键词） |
|:---|:---|:---|
| 访问次数 | 微信公众平台 → 小程序 → 统计 → 实时访问 | 小程序访问 |
| 访客 | 同上 | 访客 |
| 交易金额 | 同上 | 交易金额 |

**配置方式**（在 `soul_party_to_feishu_sheet.py` 中）：

```python
# 派对录屏（飞书妙记链接），写入「派对录屏」行
PARTY_VIDEO_LINKS = {
    '115': 'https://cunkebao.feishu.cn/minutes/obcnxxxx...',  # 从飞书妙记复制
}

# 2 月小程序数据
MINIPROGRAM_EXTRA = {
    '23': {'访问次数': 55, '访客': 55, '交易金额': 0},  # 2月23日
}
# 3 月小程序数据（113/114/115 场填表时自动写 3 月表）
MINIPROGRAM_EXTRA_3 = {
    '4': {'访问次数': 60, '访客': 60, '交易金额': 0},   # 3月4日 115场，从 Soul 小程序后台获取后填入
}
```

- 数据来源：Soul 小程序 / 微信公众平台 → 小程序 → 统计，每日手动查看后填入
- 填派对表时自动带出：运行 `soul_party_to_feishu_sheet.py` 某场时，2 月用 `MINIPROGRAM_EXTRA`、3 月用 `MINIPROGRAM_EXTRA_3` 同列写入小程序三项，并若有 `PARTY_VIDEO_LINKS` 则写入派对录屏行
- 单日写入（仅 2 月表）：`python3 write_miniprogram_to_sheet.py 23 55 55 0`（日期列号 访问次数 访客 交易金额）
- 历史补全：在 `MINIPROGRAM_EXTRA` 中配齐多日数据后执行 `python3 write_miniprogram_batch.py`

---

## 三、完整操作流程

**整体顺序**：先执行 **[ 一站式完整流程 ]**（本文件开头）中的 ① 填数据发群 → ② 生成纪要图 → ③ 填图片到报表 → ④ 纪要图发群，再按需做小程序或纪要文本。

### 3.1 每日派对结束后操作（当前流程）

```
输入：派对关闭页截图 + 小助手弹窗截图 + TXT 聊天记录（+ 可选：小程序当日数据）
输出：飞书运营报表（当月标签）写入 + 飞书群推送（文字） + 纪要图入表 + 纪要图发群（与会议纪要联动）
```

**月份与工作表**：脚本根据 `SESSION_MONTH` 自动选择 2 月或 3 月工作表，3 月场次（如 113、114、115）写入 3 月标签，不会写入 2 月。

#### Step 1：提取数据（从截图）

从派对关闭页和小助手弹窗提取 10 项数据：

| 序号 | 指标 | 来源 |
|:---|:---|:---|
| 1 | 主题 | TXT 提炼 ≤12 字 |
| 2 | 时长（分钟） | 关闭页「派对时长」 |
| 3 | Soul推流人数 | 关闭页「本场获得额外曝光」 |
| 4 | 进房人数 | 关闭页「派对成员」或小助手「进房人数」 |
| 5 | 人均时长 | 小助手「人均时长」 |
| 6 | 互动数量 | 小助手「互动数量」 |
| 7 | 礼物 | 关闭页「本场收到礼物」 |
| 8 | 灵魂力 | 关闭页「收获灵魂力」 |
| 9 | 增加关注 | 关闭页「新增粉丝」或小助手「增加关注」 |
| 10 | 最高在线 | 关闭页「最高在线」 |

#### Step 2：在脚本中注册新场次

打开 `soul_party_to_feishu_sheet.py`，在 `ROWS` 字典中添加：

```python
# 格式：'场次号': [主题, 时长, 推流, 进房, 人均, 互动, 礼物, 灵魂力, 关注, 最高在线]
'107': ['主题关键词 ≤12字', 140, 35000, 400, 8, 90, 3, 25, 10, 45],
```

在 `SESSION_DATE_COLUMN` 和 `SESSION_MONTH` 中添加映射（**按月份选工作表标签**，3 月填 3 月表）：

```python
SESSION_DATE_COLUMN = {'105': '20', '106': '21', '107': '23', '113': '2', '114': '3', '115': '4'}
SESSION_MONTH = {'105': 2, '106': 2, '107': 2, '113': 3, '114': 3, '115': 3}
```

并在 `_maybe_send_group` 的 `date_label`、`src_date` 中为该场次加上对应「X月X日」和 TXT 日期（如 `'115': '3月4日'`、`'115': '20260304'`）。

#### Step 3：执行写入 + 校验

```bash
# 写入效果数据（自动选 2月/3月 表 + 校验 + 发群）
python3 soul_party_to_feishu_sheet.py 115

# 生成智能纪要文本并写入「今日总结」（日期列号 = 当月几号，如 3月4日 填 4）
python3 write_party_minutes_from_txt.py "/path/to/soul 派对 115场 20260304.txt" 4
```

成功输出示例（3 月场次）：
```
✅ 已选 3月 工作表（sheet_id=bJR5sA）
✅ 已写入飞书表格：115场 效果数据（竖列 E3:E12，共10格），校验通过
✅ 已同步推送到飞书群（竖状格式）
✅ 已写入派对智能纪要到「今日总结」→ 2月4日列，校验通过
```

若需将**智能纪要图片**放入「今日总结」并**发到飞书群**：见下节「智能纪要图片上传到报表 + 发群」。

---

## 3.2 智能纪要图片上传到报表 + 发群（十步清单）

与 **智能纪要 Skill**（`02_卡人（水）/水桥_平台对接/智能纪要/SKILL.md`）联动：纪要图写入运营报表「今日总结」对应列，并**发到运营报表同一飞书群**。

| 序号 | 步骤 | 说明 |
|:---|:---|:---|
| 1 | 准备派对 txt | 如 `soul 派对 115场 20260304.txt`（聊天记录/soul） |
| 2 | 智能提炼 JSON | 按智能纪要规范从 txt 提炼分享人、重点片段、干货、行动项，生成 `xxx_meeting.json` |
| 3 | 生成 HTML | `智能纪要/脚本/generate_meeting.py --input xxx_meeting.json --output "卡若Ai的文件夹/报告/soul_115场_智能纪要_20260304.html"` |
| 4 | 导出目录 | HTML/PNG 一律导出到 `卡若Ai的文件夹/报告/`，不落在 Skill 内 |
| 5 | 截图 PNG | `智能纪要/脚本/screenshot.py "<报告路径>.html" --output "<报告路径>.png"` |
| 6 | 确认场次与月份 | 115 场 → 3 月表、日期列 4；2 月场次用默认 19/20 列 |
| 7 | 上传到报表 | `飞书管理/脚本/feishu_write_minutes_to_sheet.py --party-image "<报告路径>.png" --sheet-id bJR5sA --date-col 4`（3 月） |
| 8 | **纪要图发群** | `智能纪要/脚本/send_to_feishu.py --image "<报告路径>.png"`（默认 Webhook = 运营报表群，群内收到纪要长图） |
| 9 | 2 月表 | 不指定时默认 `SHEET_ID=7A3Cy9`，派对图→19 列、内部会议→20 列；发群命令同上 |
| 10 | 协作 | 纪要内容与样式以智能纪要 Skill 为准；本 Skill 负责写入报表、Token 及与发群流程衔接 |

**3 月场次参数速查**：`--sheet-id bJR5sA`，`--date-col` = 当月日期（如 4 日填 `4`）。纪要生成与截图命令详见智能纪要 Skill「智能纪要图片上传到运营报表」小节。

---

## 四、写入校验机制

所有写入操作均含**写后读回校验**：

| 场景 | 校验方式 |
|:---|:---|
| 效果数据写入 | 写入后读回首格（主题），比对一致才算成功 |
| 智能纪要写入 | 写入后读回单元格内容，检查字数 > 0 |
| Token 过期 | 自动刷新后重试，不降级为追加行（避免写入错误位置） |
| 日期列未找到 | 直接报错退出，不降级为追加行 |

校验未通过时脚本会打印具体差异信息，方便排查。

---

## 五、飞书群推送格式

**两类推送（同一飞书群）**：① 填表后自动推送竖状文字（场次数据+报表链接）；② 纪要图发群需执行智能纪要 `send_to_feishu.py --image <png路径>`，默认即本群 Webhook。一站式顺序见文首「一站式完整流程」。

写入成功后自动发送到飞书群（竖状格式，每行一项）。链接按当月工作表变化（3 月场次会带 `sheet=bJR5sA`）：

```
【Soul 派对运营报表】
链接：https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=bJR5sA

115场（3月4日）已登记：
主题：破产两次 家庭先于事业
时长（分钟）：156
Soul推流人数：36974
进房人数：484
人均时长（分钟）：8
互动数量：82
礼物：1
灵魂力：3
增加关注：15
最高在线：56
数据来源：soul 派对 115场 20260304.txt
```

---

## 六、智能纪要生成规则

**文本纪要**：`write_party_minutes_from_txt.py` 从派对 TXT 自动提炼结构化纪要：

| 板块 | 内容 |
|:---|:---|
| 关键词 | 从 TXT 头部 `关键词:` 行提取 |
| 一、核心内容 | 按关键词匹配提取：退伍军人、AI切入、私域、编导对赌、项目切割等 |
| 二、金句 | 从对话中提炼可操作的建议 |
| 三、下一步 | 行动建议（联系管理、搜索培训等） |

纪要**文本**写入运营报表「今日总结」行、对应日期列（需传入日期列号，如 3 月 4 日传 `4`）。**纪要图片**上传到同一格并**发群**：见 **§3.2 智能纪要图片上传到报表 + 发群**；3 月用 `--party-image --sheet-id bJR5sA --date-col <日>`，发群用 `智能纪要/脚本/send_to_feishu.py --image <png>`。

---

## 七、跨平台兼容

### macOS（推荐）

```bash
# 安装依赖
pip3 install requests

# 所有命令直接用 python3
python3 soul_party_to_feishu_sheet.py 106
```

### Windows

```cmd
# 安装依赖
pip install requests

# Windows 用 python（不是 python3）
python soul_party_to_feishu_sheet.py 106
python write_party_minutes_from_txt.py "C:\Downloads\soul 派对 106场 20260221.txt" 21
python auto_log.py
```

### 路径差异

| 项目 | macOS | Windows |
|:---|:---|:---|
| 脚本目录 | `/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/` | `C:\Users\用户名\卡若AI\02_卡人（水）\水桥_平台对接\飞书管理\脚本\` |
| Python | `python3` | `python` |
| TXT 路径 | `/Users/karuo/Downloads/xxx.txt` | `C:\Users\用户名\Downloads\xxx.txt` |
| Token 文件 | 脚本同目录 `.feishu_tokens.json`（两个平台一致） | 同左 |

### 环境变量覆盖（可选）

所有配置项均可通过环境变量覆盖，无需改脚本：

```bash
export FEISHU_SPREADSHEET_TOKEN=wikcnIgAGSNHo0t36idHJ668Gfd
export FEISHU_SHEET_ID=7A3Cy9
export FEISHU_GROUP_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-...
export FEISHU_APP_ID=cli_a48818290ef8100d
export FEISHU_APP_SECRET=dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4
```

---

## 八、常见问题

| 问题 | 解决 |
|:---|:---|
| `❌ 无法获取飞书 Token` | 运行 `python3 auto_log.py` 刷新 Token |
| `❌ 未找到日期列` | Token 过期导致读表失败，先 `python3 auto_log.py` 再重试 |
| `⚠️ 飞书群推送失败` | 检查 Webhook URL 是否有效、群机器人是否被禁用 |
| `❌ 写入失败 401` | Token 过期，脚本会自动刷新并重试；若仍失败则 `python3 auto_log.py` |
| Windows 中文路径乱码 | 确保终端编码为 UTF-8：`chcp 65001` |
| `pip3 not found` | Windows 用 `pip`；macOS 可能需 `pip3` 或 `python3 -m pip` |

---

## 九、表格结构参考

2 月表（sheet=7A3Cy9）、3 月表（sheet=bJR5sA）结构一致：

```
表头第1行：  [空] | 3月 | 1  | 2  | 3  | 4  | 5  | 6  | ...
第2行：      一、效果数据 |    | 113场 | 114场 | 115场 | 116场 | ...
第3行：      主题      |    | xx | xx | xx |    |
第4行：      时长      |    | xx | xx | xx |    |
...
第12行：     最高在线  |    | xx | xx | xx |    |
...
第15行：     小程序访问|    | xx | xx | xx |    |  ← 访问次数、访客、交易金额
...
第28行：     今日总结  |    | xx | xx | xx |    |  ← 智能纪要（文本或图片）
```

按 `SESSION_DATE_COLUMN` 与 `SESSION_MONTH` 决定写入哪一列、哪张表。

---

## 十、新增场次模板

每次新增场次，在 `soul_party_to_feishu_sheet.py` 中改以下几处：

```python
# 1. ROWS 字典加一行（主题可带冲击性，≤12 字）
'116': ['主题≤12字', 时长, 推流, 进房, 人均, 互动, 礼物, 灵魂力, 关注, 最高在线],

# 2. SESSION_DATE_COLUMN 加日期映射（当月几号）
SESSION_DATE_COLUMN = {..., '116': '5'}

# 3. SESSION_MONTH 加月份（3 月场次必填 3，否则会写入 2 月表）
SESSION_MONTH = {..., '116': 3}

# 4. _maybe_send_group 内 date_label、src_date 加映射（否则不发群）
#    date_label = {..., '116': '3月5日'}
#    src_date = {..., '116': '20260305'}

# 5. 若当日有小程序数据，在 MINIPROGRAM_EXTRA 中加：
#    MINIPROGRAM_EXTRA = {..., '5': {'访问次数': 60, '访客': 60, '交易金额': 0}}
```

---

## 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0 | 2026-02-20 | 初版：截图填表发群 |
| 2.0 | 2026-02-22 | 基因胶囊：Token 自动刷新、写入校验、智能纪要、跨平台、完整配置清单 |
| 2.1 | 2026-03-04 | 月份路由：2月/3月 工作表分离（7A3Cy9 / bJR5sA），SESSION_MONTH 防串月；支持 113～115 场；小程序批量 write_miniprogram_batch；运营报表 SKILL 与当前流程同步 |
| 2.2 | 2026-03-04 | **智能纪要上传到报表**：§3.2 十步清单（txt→JSON→HTML→PNG→feishu_write_minutes_to_sheet）；与智能纪要 Skill 联动；3 月用 --party-image --sheet-id bJR5sA --date-col |
| 2.3 | 2026-03-04 | **会议纪要 + 运营报表 + 发群一站式**：文首新增「一站式完整流程」四步（①填数据发群 ②生成纪要图 ③填图片到报表 ④纪要图发群）；飞书群统一：数据推送与纪要图发群同 Webhook，纪要图发群用智能纪要 `send_to_feishu.py --image`；§3.2 增加「发群」步骤与说明 |
