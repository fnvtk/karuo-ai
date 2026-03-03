---
name: Soul派对运营报表
description: Soul 派对运营数据全自动写入飞书表格 → 生成智能纪要 → 发飞书群；含Token自动刷新与写入校验。跨平台（macOS/Windows）。
triggers: 运营报表、派对填表、派对截图填表发群、会议纪要上传、本月运营数据、全部月份统计、派对纪要、智能纪要、106场、107场
parent: 飞书管理
owner: 水桥
group: 水
version: "2.0"
updated: "2026-02-22"
---

# Soul 派对运营报表 · 基因胶囊

> **一句话**：派对截图 + TXT → 飞书运营报表 → 智能纪要 → 飞书群推送，全链路自动、写入必校验。

---

## 快速开始（30 秒上手）

```bash
# ❶ 安装依赖（一次性）
pip3 install requests

# ❷ 刷新飞书 Token（每天首次或 Token 过期时）
python3 auto_log.py

# ❸ 写入派对效果数据（替换场次号）
python3 soul_party_to_feishu_sheet.py 106

# ❹ 生成派对智能纪要并写入「今日总结」
python3 write_party_minutes_from_txt.py "/path/to/soul 派对 106场 20260221.txt" 21
```

所有脚本均在同一目录，无需切换路径。

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
| 表格链接 | https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9 |
| spreadsheet_token | `wikcnIgAGSNHo0t36idHJ668Gfd` |
| sheet_id | `7A3Cy9` |
| 表格结构 | A 列=指标名，第 1 行=日期（1、2…21…），第 3~12 行=效果数据，第 15 行=小程序访问，第 28 行=今日总结 |

### 1.3 飞书群 Webhook

| 项目 | 值 |
|:---|:---|
| Webhook URL | `https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-5b9b-4abb-a05a-96c8fb9599f1` |
| 用途 | 数据写入后自动推送竖状格式消息到飞书群 |

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
| `soul_party_to_feishu_sheet.py` | 写入派对效果数据到日期列 + 飞书群推送 | `python3 soul_party_to_feishu_sheet.py 106` |
| `write_party_minutes_from_txt.py` | 从 TXT 生成智能纪要写入「今日总结」行 | `python3 write_party_minutes_from_txt.py "<txt路径>" 21` |
| `auto_log.py` | Token 刷新 + 飞书日志写入 | `python3 auto_log.py` |

### 2.2 辅助脚本

| 脚本 | 功能 | 命令 |
|:---|:---|:---|
| `feishu_write_minutes_to_sheet.py` | 会议纪要/派对总结**图片**上传到对应单元格 | `python3 feishu_write_minutes_to_sheet.py [内部图] [派对图]` |
| `feishu_sheet_monthly_stats.py` | 月度运营数据统计 | `python3 feishu_sheet_monthly_stats.py 2` 或 `all` |
| `write_miniprogram_to_sheet.py` | **单独**写入小程序三核心数据（访问次数、访客、交易金额） | `python3 write_miniprogram_to_sheet.py 23 55 55 0` |

### 2.3 小程序运营数据（自动写入）

每日填表时，若在 `soul_party_to_feishu_sheet.py` 中配置了 `MINIPROGRAM_EXTRA`，会**自动**把当日小程序三核心数据写入对应日期列：

| 指标 | 数据来源 | 行（A 列关键词） |
|:---|:---|:---|
| 访问次数 | 微信公众平台 → 小程序 → 统计 → 实时访问 | 小程序访问 |
| 访客 | 同上 | 访客 |
| 交易金额 | 同上 | 交易金额 |

**配置方式**（在 `soul_party_to_feishu_sheet.py` 中）：

```python
MINIPROGRAM_EXTRA = {
    '23': {'访问次数': 55, '访客': 55, '交易金额': 0},  # 2月23日
}
```

- 数据来源：微信公众平台 → 小程序 → 统计，每日手动查看后填入
- 仅填表当天：运行 `python3 soul_party_to_feishu_sheet.py 107` 时，若 107 场对应 2月23日，且 `MINIPROGRAM_EXTRA` 有 `'23'`，则自动写入
- 单独写入：`python3 write_miniprogram_to_sheet.py 23 55 55 0`（日期列号 访问次数 访客 交易金额）

---

## 三、完整操作流程

### 3.1 每日派对结束后操作

```
输入：派对关闭页截图 + 小助手弹窗截图 + TXT 聊天记录
输出：飞书运营报表写入 + 飞书群推送 + 智能纪要
```

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
SESSION_DATE_COLUMN = {'105': '20', '106': '21', '107': '23', '113': '2'}
SESSION_MONTH = {'105': 2, '106': 2, '107': 2, '113': 3}  # 113场=3月→选「3月」标签
```

#### Step 3：执行写入 + 校验

```bash
# 写入效果数据（自动校验 + 自动发群）
python3 soul_party_to_feishu_sheet.py 107

# 生成智能纪要并写入「今日总结」
python3 write_party_minutes_from_txt.py "/Users/karuo/Downloads/soul 派对 107场 20260222.txt" 22
```

成功输出示例：
```
✅ 已写入飞书表格：107场 效果数据（竖列 W3:W12，共10格），校验通过
✅ 已写入小程序运营数据（2月23日列）：访问次数 55、访客 55、交易金额 0
✅ 已同步推送到飞书群（竖状格式）
✅ 已写入派对智能纪要到「今日总结」→ 2月22日列，校验通过
```

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

写入成功后自动发送到飞书群（竖状格式，每行一项）：

```
【Soul 派对运营报表】
链接：https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9

106场（2月21日）已登记：
主题：退伍军人低空经济 贴息8800
时长（分钟）：135
Soul推流人数：33312
进房人数：395
人均时长（分钟）：7
互动数量：88
礼物：3
灵魂力：24
增加关注：9
最高在线：42
数据来源：soul 派对 106场 20260221.txt
```

---

## 六、智能纪要生成规则

`write_party_minutes_from_txt.py` 从派对 TXT 自动提炼结构化纪要：

| 板块 | 内容 |
|:---|:---|
| 关键词 | 从 TXT 头部 `关键词:` 行提取 |
| 一、核心内容 | 按关键词匹配提取：退伍军人、AI切入、AI炒股、私域、古币、程序员等 |
| 二、金句 | 从对话中提炼可操作的建议 |
| 三、下一步 | 行动建议（联系管理、搜索培训等） |

纪要写入运营报表「今日总结」行对应日期列。

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

```
表头第1行：  [空] | 2月 | 1  | 2  | ... | 20 | 21 | 22 | ...
第2行：      [指标说明行]
第3行：      主题      |    |    |    |     | xx | xx |    |
第4行：      时长      |    |    |    |     | xx | xx |    |
第5行：      Soul推流  |    |    |    |     | xx | xx |    |
第6行：      进房人数  |    |    |    |     | xx | xx |    |
第7行：      人均时长  |    |    |    |     | xx | xx |    |
第8行：      互动数量  |    |    |    |     | xx | xx |    |
第9行：      礼物      |    |    |    |     | xx | xx |    |
第10行：     灵魂力    |    |    |    |     | xx | xx |    |
第11行：     增加关注  |    |    |    |     | xx | xx |    |
第12行：     最高在线  |    |    |    |     | xx | xx |    |
...
第15行：     小程序访问|    |    |    |     | xx | xx |    |  ← 访问次数、访客、交易金额写对应行
...
第28行：     今日总结  |    |    |    |     | xx | xx |    |  ← 智能纪要写这里
```

---

## 十、新增场次模板

每次新增场次，只需改 `soul_party_to_feishu_sheet.py` 两到三处：

```python
# 1. ROWS 字典加一行
'NEW': ['主题≤12字', 时长, 推流, 进房, 人均, 互动, 礼物, 灵魂力, 关注, 最高在线],

# 2. SESSION_DATE_COLUMN 加日期映射
SESSION_DATE_COLUMN = {..., 'NEW': '日期号'}

# 3. SESSION_MONTH 加月份（跨月时必填：3 月场次填 3，写入「3月」标签而非 2 月）
SESSION_MONTH = {..., 'NEW': 3}

# 4. _maybe_send_group 内 date_label 和 src_date 可选加映射（可选，不加则不发群）

# 5. 若当日有小程序数据，在 MINIPROGRAM_EXTRA 中加：
#    MINIPROGRAM_EXTRA = {..., '23': {'访问次数': 55, '访客': 55, '交易金额': 0}}
```

---

## 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0 | 2026-02-20 | 初版：截图填表发群 |
| 2.0 | 2026-02-22 | 基因胶囊：增加 Token 自动刷新、写入校验、智能纪要、跨平台、完整配置清单 |
