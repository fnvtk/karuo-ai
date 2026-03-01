---
name: 飞书管理
description: 飞书日志/文档自动写入与知识库管理
triggers: 飞书日志、写入飞书、飞书知识库、飞书运营报表、派对效果数据、104场写入、运营报表填写、派对截图填表发群、Excel写飞书、批量写飞书表格、表格日报、卡若的飞书日志、卡若飞书日志、上传json飞书、json上传飞书文档、按原格式上传飞书
owner: 水桥
group: 水
version: "1.3"
updated: "2026-03-02"
---

# 飞书日志写入 Skill

> 搞定了，清清爽爽。 —— 卡人

---

## 核心能力

**一键将工作日志写入飞书知识库，全程静默自动，无需任何手动操作**

---

## 一键使用（推荐）

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/auto_log.py
```

**自动完成**：
1. ✅ **静默Token刷新** → 优先使用refresh_token自动刷新（无需授权）
2. ✅ **检查服务** → 自动启动后端服务
3. ✅ **月份路由** → 根据 `X月X日` 自动写入对应月份文档（避免串月）
4. ✅ **写入日志** → 倒序插入（新日期在上）
5. ✅ **打开结果** → 写入后自动打开对应月份文档（浏览器/飞书客户端）

---

## 月份路由与防错（强制）

> 2026-02-25 实战修复：曾出现 `2月25日` 被写入 `1月文档` 的错误。此后写飞书日志必须按本节执行。

### 1) 写入前：先判定目标月份文档（强制）

- 输入日期必须是 `X月X日`（示例：`2月25日`）。
- 根据日期提取月份，路由到对应 `wiki_token`。
- 调 `wiki/v2/spaces/get_node` 校验文档标题包含对应月份（如 `2月`），不匹配立即中止写入。

### 2) 写入中：只允许命中当月 token（强制）

- 禁止固定一个 `WIKI_TOKEN` 写全年日志。
- **每月只保持一个文档**：每个自然月对应一个飞书文档（如「2026年3月 （突破执行）」）。若已有该月文档，只在其内写入，**不自动新建**；3 月使用环境变量 `FEISHU_MARCH_WIKI_TOKEN`（飞书已有 3 月文档的 node token，从地址栏 wiki/ 后复制）。
- **3月1日专用**：`脚本/write_0301_feishu_log.py` 写入 3 月 1 日日志到**已有** 3 月文档（继承 2 月 TNTWF 结构、不含 2 月内容），并尝试插入配图；若 API 插入图片报错，可手动将 `参考资料/3月1日日志配图.png` 拖入飞书文档。

### 2.1) 目标与百分比（强制）

- **以总目标为核心**：每月、每日的目标百分比均相对「2026 年整体目标」总目标（100%），保持相关性与上下文一致。
- **写日志/计划前必读**：每次更新每日计划或飞书日志前，先阅读 `运营中枢/工作台/2026年整体目标.md`，再写 T(目标)/N(过程)/F(反馈) 与百分比。

### 3) 写入后：双文档校验（强制）

- 目标月份文档：`X月X日` 必须存在。
- 邻近月份文档：同日期必须不存在（防误写）。

### 4) 若误写：回滚 SOP（强制）

1. 定位误写块范围：从该日期 `heading4` 到下一日期 `heading4`。
2. 使用根节点索引删除：  
   `DELETE /docx/v1/documents/{doc}/blocks/{doc}/children/batch_delete`  
   参数必须用 `start_index` + `end_index`。
3. 重新写入正确月份文档并复检。

---

## 飞书 Docx JSON 格式与上传图片/文件

**实际文档即标准**：上传、写入日志或文章时，以飞书导出的 JSON 结构为准，与 API 一致即可稳定写入。

| 参考文档 | 说明 |
|:---|:---|
| **参考资料/飞书日志JSON格式与API对照.md** | 基于「2026年2月 突破执行」实际导出整理：block_type 对照（text/heading4/todo/callout/image/file）、写入 API 要点、与脚本对应关系 |
| **参考资料/飞书docx插入图片_API说明.md** | 图片/文件上传：`drive/v1/medias/upload_all` → 获取 `file_token` → 插入 `block_type=12` file 块或 18 gallery |

- **写日志**：`auto_log.build_blocks()` 产出块与上述 JSON 格式一致；插入用 `docx/v1/documents/{id}/blocks/{id}/children`。
- **上传图片到日志/文章**：先 `upload_all`（parent_type=docx_image，parent_node=文档 obj_token），再在目标位置插入 `block_type: 12`（file）或 `18`（gallery）。脚本见 `feishu_publish_blocks_with_images.py`、`write_today_log_with_image.py`。
- **格式迭代**：新增或修改写入逻辑时，以「飞书日志JSON格式与API对照」中的块结构为准，便于与导出/回写一致。

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
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_video_clip.py \
  --url "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" \
  --clips 5

# 处理本地视频
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_video_clip.py \
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

## 运营报表（子技能）

专门处理 Soul 派对运营报表：**截图 → 填写表格 → 发飞书群** 全流程，以及会议纪要图片上传、月度统计。  
**独立说明**：见同目录 [运营报表_SKILL.md](./运营报表_SKILL.md)。

---

### 一、全流程：截图 → 填表 → 发群

| 步骤 | 动作 | 脚本/说明 |
|:---|:---|:---|
| 1 | **截图/数据** | 派对关闭页截图 + 小助手弹窗截图 + 可选 TXT 逐字稿（提炼主题） |
| 2 | **填写表格** | 在 `soul_party_to_feishu_sheet.py` 的 `ROWS` 中配置该场 10 项数据；按**当天日期列**或「x场」列写入 |
| 3 | **发飞书群** | 写入成功后自动推送到配置的 webhook；**发群内容为竖状格式**（见下） |

**发群格式（竖状，不用一串）**：每行一项，与表格指标一致，便于阅读。

```
【Soul 派对运营报表】
链接：https://cunkebao.feishu.cn/wiki/...

105场（2月20日）已登记：
主题：创业社群AI培训6980 电竞私域
时长（分钟）：138
Soul推流人数：0
进房人数：403
人均时长（分钟）：10
互动数量：170
礼物：2
灵魂力：24
增加关注：31
最高在线：54
数据来源：soul 派对 105场 20260220.txt
```

---

### 二、填写规则（表格内）

| 规则 | 说明 |
|:---|:---|
| **按数字填写** | 时长、推流、进房、互动、礼物、灵魂力、增加关注、最高在线 均按**数字类型**写入，便于公式与图表 |
| **不填比率三项** | 推流进房率、1分钟进多少人、加微率 由表内公式自动算，不写入 |
| **只填前 10 项** | 主题、时长、Soul推流人数、进房人数、人均时长、互动数量、礼物、灵魂力、增加关注、最高在线 |
| **主题** | 从聊天/TXT 提炼，**≤12 字**，含干货与数值 |
| **按日期列** | 表头第 1 行为日期 1、2…19、20…；该场对应日期（如 2月20日）则填在「20」列下 |
| **竖列写入** | A 列为指标名，数据写入该日期/场次列的第 3～12 行 |

---

### 三、脚本一览

| 脚本 | 用途 |
|:---|:---|
| `soul_party_to_feishu_sheet.py [场次]` | 将指定场次效果数据写入运营报表；部分场次（如 105）写入后自动发群（竖状格式） |
| `feishu_write_minutes_to_sheet.py [内部图] [派对图]` | 将**内部会议纪要**、**派对今日总结**的**图片**上传到对应单元格（内部→2月20日列，派对→2月19日列），不发群 |
| `feishu_sheet_monthly_stats.py [1\|2\|all]` | 统计指定月或全部月份运营数据（合计/有数据场次） |

**路径**：`02_卡人（水）/水桥_平台对接/飞书管理/脚本/`

---

### 四、表格与配置

| 项目 | 值 |
|:---|:---|
| 运营报表链接 | https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9 |
| 工作表 | 2026年2月 soul 书卡若创业派对（sheetId=7A3Cy9） |
| Token | 同目录 `.feishu_tokens.json` |
| 发群 webhook | 脚本内 `FEISHU_GROUP_WEBHOOK` 或环境变量 |

新增场次：在 `ROWS` 与（按日期列时）`SESSION_DATE_COLUMN` 中增加；需发群则在 `_maybe_send_group` 中增加对应场次逻辑。

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

## Wiki 子文档创建（日记分享 / 新研究）

在指定飞书 Wiki 节点下创建子文档，用于日记分享、新研究等内容沉淀。

**父节点**：`https://cunkebao.feishu.cn/wiki/KNf7wA8Rki1NSdkkSIqcdFtTnWb`

```bash
# 使用默认内容：运营逻辑分析及目录结构
python3 scripts/feishu_wiki_create_doc.py

# 自定义标题和 JSON 内容
python3 scripts/feishu_wiki_create_doc.py --parent KNf7wA8Rki1NSdkkSIqcdFtTnWb --title "文档标题" --json blocks.json
```

JSON 格式：与 `团队入职流程与新人登记表_feishu_blocks.json` 相同，含 `children` 数组（飞书 docx blocks）。

---

## 飞书导出 JSON 按原格式上传

将飞书导出的 JSON 文件（含 `content` + `blocks`）上传时，**先根据 JSON 类型决定创建什么**，再执行创建，避免「该是多维表格却建成文档」的错误。

**规则（强制）**：
1. **先看 JSON 类型**：根为 block_type 43（多维表格/board），或根为 page 且直接子块中唯一实质内容为一块多维表格 → 判定为**多维表格**。
2. **多维表格** → 只创建**飞书多维表格**（独立应用），不创建文档；结果链接为 `https://cunkebao.feishu.cn/base/{app_token}`。
3. **文档** → 创建 Wiki 文档并写入块；其中的 block_type 43 会新建多维表格并嵌入文档内。

```bash
# 上传单个导出 JSON（自动判断文档/多维表格）
python3 脚本/upload_json_to_feishu_doc.py /path/to/xxx.json

# 指定父节点与标题（仅创建文档时 --parent 生效）
python3 脚本/upload_json_to_feishu_doc.py /path/to/xxx.json --parent <wiki_node_token> --title "文档标题"
```

- **判定为多维表格时**：仅调用 bitable 创建接口，产出多维表格链接，不建文档。
- **判定为文档时**：block_type 2/3/4/6 等 → 对应正文/标题块；block_type 43 → 新建多维表格并嵌入该文档。
- 创建多维表格需开通**用户身份权限**（非应用身份）：**bitable:app**、**base:app:create**，发布版本后**用户重新授权**。操作说明见 `参考资料/飞书多维表格权限开通说明_给卡罗维亚.md`（可找卡罗维亚开通权限）。

### 批量按目录结构上传到指定 Wiki

将**本地目录下全部 JSON** 按**子目录/子文件**结构上传到指定 Wiki 节点下：先创建与本地一致的子目录节点，再在每个目录下按格式上传 JSON（文档→文档，多维表格→多维表格并在该目录下建一篇带链接的文档）。

```bash
# 指定本地根目录与 Wiki 父节点（链接 wiki/ 后面的 token）
python3 脚本/batch_upload_json_to_feishu_wiki.py /path/to/本地目录 --wiki-parent G6rVwQO22imFzmk7nXCckCsmnRh

# 仅列出将创建的目录和文件，不执行
python3 脚本/batch_upload_json_to_feishu_wiki.py /path/to/本地目录 --wiki-parent <token> --dry-run
```

- 目录结构会原样还原为 Wiki 子节点；多维表格仍依赖用户身份权限，失败项会列在最终汇总中。
- **内容保证**：文档写入若遇「invalid param / block not support」，会自动用「标题 + 全文」回退建文档，保证每个 JSON 都有对应文档；非多维表格类失败会再试一次回退。iframe/思维笔记等不支持块会转为正文或链接。
- **多维表格权限与重新授权**：后台开通「用户身份权限」bitable:app、base:app:create 后，**必须重新授权**才能拿到带新权限的 Token。操作：运行 `python3 脚本/feishu_force_reauth.py`（会删除旧 Token 并打开授权页）；在浏览器完成飞书扫码授权。若本机未启动回调服务，先运行 `python3 脚本/feishu_api.py` 或 `bash start.sh`，再完成授权。授权后再执行批量上传即可。
- **上传后校验**：脚本结束会打印「成功 X/总数 Y」；可打开 Wiki 链接逐层核对子目录与文档数量是否与本地一致。

---

## 统一文章上传（强制入口）

用于“本地 Markdown → 飞书 Wiki 文档”的统一发布。  
**规则**：同名/近似名优先更新；命中近似名时优先改名后更新，不再重复新建。

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_article_unified_publish.py \
  --parent MyvRwCVNSiTg5ok6e3fc6uA5nHg \
  --title "文档标题" \
  --md "/绝对路径/文章.md" \
  --json "/Users/karuo/Documents/卡若Ai的文件夹/导出/文章_feishu_blocks.json"
```

### 本地写作模板（推荐直接复用）

````markdown
# 文档标题

## 一、背景
一句话说明。

## 二、配图示例
![配图1](../../图片/你的图片1.png)
![配图2](../../图片/你的图片2.png)

## 三、代码示例
```bash
python3 script.py --arg value
```

## 四、表格示例
| 模块 | 作用 | 说明 |
| --- | --- | --- |
| manifest | 元数据 | name/owner/version |
| skill_content | 技能正文 | 规则与流程 |
````

### Markdown 到飞书 Block 映射（已固化）

| 本地写法 | 飞书块 |
|:---|:---|
| `# / ## / ###` | 标题块（3/4/5） |
| 普通段落 | 文本块（2） |
| `![...](...)` | 图片上传 + 图片/文件块（27/12，失败保底文字） |
| `````代码块````` | 文本块（前缀 `代码：`） |
| Markdown 表格 | 文档内电子表格块（30）+ 自动回填单元格 |

### 图片路径匹配规则（已固化）

1. 先按 JSON 所在目录解析相对路径  
2. 若不存在，再按 `source`（原 Markdown 文件目录）解析  
3. 两者都不存在则提示缺图，不中断正文发布

---

## 文件结构

```
飞书管理/
├── SKILL.md                      # 本文档
├── 卡若的飞书日志_SKILL.md        # 子技能：个人日志+运营登记固定入口
├── references/
│   ├── 飞书项目API_玩值电竞对接说明.md
│   └── ...
└── 脚本/
    ├── auto_log.py               # 一键日志（推荐）
    ├── write_today_custom.py     # 自定义今日内容写入
    ├── soul_party_to_feishu_sheet.py   # 运营报表：派对效果数据写入 + 发群（竖状格式）
    ├── feishu_write_minutes_to_sheet.py # 运营报表：会议纪要/今日总结图片上传到单元格
    ├── feishu_sheet_monthly_stats.py    # 运营报表：本月/全部月份数据统计
    ├── feishu_api.py             # 后端服务
    ├── feishu_video_clip.py      # 视频智能切片
    ├── feishu_video_clip_README.md
    ├── wanzhi_feishu_project_sync.py    # 玩值电竞→飞书项目同步
    ├── feishu_wiki_create_doc.py       # Wiki 子文档创建（日记/研究）
    ├── upload_json_to_feishu_doc.py    # 飞书导出 JSON 按原格式上传（文档/多维表格/问卷等）
    ├── batch_upload_json_to_feishu_wiki.py  # 目录下全部 JSON 按目录结构批量上传到指定 Wiki 节点
    ├── feishu_force_reauth.py    # 强制重新授权（删旧 Token、打开带多维表格权限的授权页）
    └── .feishu_tokens.json       # Token 存储
```

---

## 子技能：卡若的飞书日志

用于你个人固定写日志入口（日志 + 运营报表登记）：

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/karuo_feishu_log.py"
```

指定参数写法：

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/karuo_feishu_log.py" \
  --date "2月25日" \
  --progress 55 \
  --bottleneck "服务器导致接口化部署不稳定" \
  --next "优先修复部署链路，再推进接口与网站" \
  --clarity "功能层与解决方案仍需继续梳理"
```

---

## Agent使用指南

当需要写入飞书日志时，直接执行：

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/auto_log.py
```

**脚本会自动**：
- ✅ 静默刷新Token（优先）
- ✅ 检查并启动服务
- ✅ 根据 `X月X日` 路由到对应月份文档
- ✅ 写入日志（倒序）
- ✅ 写入完成后自动打开对应月份文档界面

**无需任何手动操作**，全程静默完成。

---

## 配置信息

| 项目 | 值 |
|:---|:---|
| 脚本位置 | `脚本/auto_log.py`、`脚本/write_today_custom.py`（自定义内容） |
| Token文件 | `脚本/.feishu_tokens.json` |
| 月份映射（已配置） | `1月: JZiiwxEjHiRxouk8hSPcqBn6nrd`、`2月: Jn2EwXP2OiTujNkAbNCcDcM7nRA` |
| 打开页面 | 自动按日期月份打开对应文档 |
| 服务端口 | 5050 |

---

**版本**: v3.5 | **更新**: 2026-02-25  
**特性**: 静默授权、倒序插入、TNTWF规范、四象限分类、**按月份自动路由写入（防串月）**、**写前标题校验+写后双文档校验**、**运营报表子技能（截图→填表→发群竖状格式、会议纪要图片上传、月度统计）**、**统一文章上传（同名/近似名改名更新）**、**Markdown 表格自动转飞书表格块并回填**
