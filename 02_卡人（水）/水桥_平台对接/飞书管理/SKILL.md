---
name: 飞书管理
description: 飞书日志/文档自动写入与知识库管理
triggers: 飞书日志、写入飞书、飞书知识库、飞书运营报表、派对效果数据、104场写入
owner: 水桥
group: 水
version: "1.0"
updated: "2026-02-16"
---

# 飞书日志写入 Skill

> 搞定了，清清爽爽。 —— 卡人

---

## 核心能力

**一键将工作日志写入飞书知识库，全程静默自动，无需任何手动操作**

---

## 一键使用（推荐）

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/auto_log.py
```

**自动完成**：
1. ✅ **静默Token刷新** → 优先使用refresh_token自动刷新（无需授权）
2. ✅ **检查服务** → 自动启动后端服务
3. ✅ **写入日志** → 倒序插入（新日期在上）
4. ✅ **打开结果** → **写入完成后自动打开飞书日志页面**（浏览器/飞书客户端）

---

## 静默授权机制

| 优先级 | 方式 | 说明 |
|:---|:---|:---|
| **1** | refresh_token刷新 | 静默自动，无需任何操作 |
| **2** | 后台授权 | refresh失效时，后台打开飞书客户端（不显示窗口） |

**Token有效期**：
- `access_token`: 2小时
- `refresh_token`: 30天

**自动处理**：脚本会自动判断并选择最合适的方式，用户无需关心。

---

## 日志格式规范

### 1. 插入顺序：倒序

**新日期插入在最上面**（"本月最重要的任务"标题后）

```
本月最重要的任务
├── 1月29日  ← 最新（今天）
├── 1月28日
└── 1月27日
```

### 2. TNTWF格式标注

每个任务必须包含以下5个部分，**标注清楚**：

| 字段 | 标注格式 | 说明 | 示例 |
|:---|:---|:---|:---|
| **T** | `T (目标)` | 今日目标，**必须带完成百分比** | `AI视频切片→研制跟进 🎬 (0%)` |
| **N** | `N (过程)` | 详细业务拆解，用【】标注模块 | `【AI视频切片】技术方案评审→算法优化→切片效果测试` |
| **T** | `T (思考)` | 思考与策略 | `技术+商业双线推进` |
| **W** | `W (工作)` | 工作类型 | `技术研发、商业规划` |
| **F** | `F (反馈)` | 状态反馈 | `待执行 ⏰` / `进行中 🔄` / `已完成 ✅` |

### 3. 四象限分类

任务必须按四象限分类：

| 象限 | 颜色 | 适用场景 |
|:---|:---|:---|
| **重要紧急** | 红色 | 今日必须完成 |
| **重要不紧急** | 绿色 | 重要但可延后 |
| **不重要紧急** | 橙色 | 紧急但不重要 |
| **不重要不紧急** | 灰色 | 可做可不做 |

### 4. 目标百分比格式

**必须格式**：`任务名称→目标描述 📱 (完成%)`

示例：
- `AI视频切片→研制跟进 🎬 (0%)` - 未开始
- `小程序→开发进度跟进 📱 (50%)` - 进行中
- `商业方案→可落地 💰 (100%)` - 已完成

### 5. 过程详细拆解

**必须格式**：`【模块名】步骤1→步骤2→步骤3→步骤4`

示例：
```
【AI视频切片】技术方案评审→算法优化→切片效果测试→性能调优
【丸子电竞】市场调研→商业模式设计→财务模型→计划书撰写→投资方案
【小程序】开发进度检查→bug修复→功能测试→上线准备
```

---

## 自定义日志内容

修改 `auto_log.py` 中的 `get_today_tasks()` 函数：

```python
def get_today_tasks():
    tasks = [
        {
            "person": "卡若",                    # 负责人
            "events": ["任务1", "任务2"],        # 关键词
            "quadrant": "重要紧急",              # 四象限
            "t_targets": [
                "任务1→目标描述 📱 (0%)",       # T-目标（必须带百分比）
                "任务2→目标描述 🧠 (50%)"
            ],
            "n_process": [
                "【模块1】步骤1→步骤2→步骤3",   # N-过程（详细拆解）
                "【模块2】步骤A→步骤B"
            ],
            "t_thoughts": ["思考内容"],         # T-思考
            "w_work": ["工作类型"],             # W-工作
            "f_feedback": ["待执行 ⏰"]         # F-反馈
        }
    ]
    return date_str, tasks
```

---

## 视频智能切片（新增）

### 功能

**从飞书妙记链接下载视频，AI智能识别高光片段，批量切片并发送到飞书群**

### 一键使用

```bash
# 从飞书链接处理
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_video_clip.py \
  --url "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" \
  --clips 5

# 处理本地视频
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_video_clip.py \
  --video "/path/to/video.mp4" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" \
  --clips 5
```

### 工作流程

```
1. 提取minute_token（从URL）
   ↓
2. 获取视频下载链接（或使用本地视频）
   ↓
3. 转录视频（MLX Whisper）
   ↓
4. AI识别高光片段（生成主题、Hook、CTA）
   ↓
5. 批量切片视频
   ↓
6. 发送到飞书群
```

### 输出

- 原始视频 + 转录字幕
- 高光片段JSON（包含主题、Hook、CTA）
- 切片视频文件（每个都有主题标题）

### 详细说明

参考：`scripts/feishu_video_clip_README.md`

---

## 飞书运营报表（Soul 派对效果数据）

将 Soul 派对效果数据按**场次**写入飞书「火：运营报表」表格，**竖列**填入对应日期/场次列。

### 填写规则（以后都按此逻辑）

| 规则 | 说明 |
|:---|:---|
| **按数字填写** | 时长、推流、进房、互动、礼物、灵魂力、增加关注、最高在线 等均按**数字类型**写入，不按文本，便于表格公式与图表 |
| **不填比率三项** | 推流进房率、1分钟进多少人、加微率 由表格内公式自动计算，**导入时不填** |
| **只填前 10 项** | 主题、时长、Soul推流人数、进房人数、人均时长、互动数量、礼物、灵魂力、增加关注、最高在线 |
| **主题（标题）** | 从聊天记录提炼，**≤12 字**，须含**具体内容、干货与数值**（如：号商几毛卖十几 日销两万） |
| **竖列写入** | 表格结构为 A 列指标名、各列为日期/场次，数据写入该场次列的第 3～12 行（竖列） |

### 一键写入

```bash
# 写入 104 场（默认）
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/soul_party_to_feishu_sheet.py

# 指定场次
python3 .../soul_party_to_feishu_sheet.py 103
python3 .../soul_party_to_feishu_sheet.py 104
```

### 表格与配置

| 项目 | 值 |
|:---|:---|
| 运营报表 | https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9 |
| 工作表 | 2026年2月 soul 书卡若创业派对（sheetId=7A3Cy9） |
| Token | 使用同目录 `.feishu_tokens.json`（与 auto_log 共用） |

新增场次时在脚本内 `ROWS` 中增加对应场次与 10 项数据即可。

---

## 飞书项目（玩值电竞 · 存客宝）

将玩值电竞 30 天/90 天甘特图任务同步到飞书项目需求管理。

**前置**：需在飞书项目开发者后台创建插件，获取 `X-PLUGIN-TOKEN` 和 `project_key`。

```bash
# 预览（不请求 API）
python3 scripts/wanzhi_feishu_project_sync.py --dry-run

# 实际同步（需配置 FEISHU_PROJECT_PLUGIN_TOKEN、FEISHU_PROJECT_KEY）
python3 scripts/wanzhi_feishu_project_sync.py
```

详见：`references/飞书项目API_玩值电竞对接说明.md` 与玩值电竞项目内 `玩值电竞_飞书项目接口整理与任务同步方案.md`。

---

## 文件结构

```
飞书管理/
├── SKILL.md                      # 本文档
├── references/
│   ├── 飞书项目API_玩值电竞对接说明.md  # 飞书项目接口说明
│   └── ...
└── scripts/
    ├── auto_log.py              # 一键日志脚本（推荐）
    ├── write_today_custom.py     # 自定义今日内容写入（写入后自动打开飞书）
    ├── soul_party_to_feishu_sheet.py  # 飞书运营报表：Soul 派对效果数据（按场次竖列、数字、不填比率）
    ├── wanzhi_feishu_project_sync.py  # 玩值电竞→飞书项目任务同步
    ├── feishu_api.py             # 后端服务
    ├── feishu_video_clip.py      # 视频智能切片
    ├── feishu_video_clip_README.md # 切片工具说明
    └── .feishu_tokens.json       # Token存储
```

---

## Agent使用指南

当需要写入飞书日志时，直接执行：

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/auto_log.py
```

**脚本会自动**：
- ✅ 静默刷新Token（优先）
- ✅ 检查并启动服务
- ✅ 写入日志（倒序）
- ✅ **写入完成后自动打开飞书日志界面**（上述网址）

**无需任何手动操作**，全程静默完成。

---

## 配置信息

| 项目 | 值 |
|:---|:---|
| 脚本位置 | `scripts/auto_log.py`、`scripts/write_today_custom.py`（自定义内容） |
| Token文件 | `scripts/.feishu_tokens.json` |
| **飞书日志页面** | **https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd**（写入完成后会自动打开） |
| 目标文档 | [卡若日志](https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd) |
| 服务端口 | 5050 |

---

**版本**: v3.2 | **更新**: 2026-01-30  
**特性**: 静默授权、倒序插入、TNTWF规范、四象限分类、**写入完成后自动打开飞书日志页面**
