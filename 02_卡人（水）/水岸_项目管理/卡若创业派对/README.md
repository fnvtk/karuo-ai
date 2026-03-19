---
project: 卡若创业派对
parent: 水岸_项目管理
status: 🟢 运营中
updated: "2026-03-18"
---

# P01 · 卡若创业派对

> **管理人**：水岸（项目管理专家）  
> **定位**：Soul 创业派对全链路——从派对结束到内容变现，跨组调度水桥+木叶。  
> **管辖范围**：运营数据 → 飞书报表 → 视频下载 → 视频切片 → 多平台分发 → 文章写作 → 小程序上传

---

## 二、团队编制与技能地图

### 2.1 水岸直管技能（按流程顺序）

```
派对结束 ──┬── ① 运营报表（水桥）── 截图→飞书表格→发群
           ├── ② 飞书妙记下载（水桥）── 文字+视频→本地
           ├── ③ 智能纪要（水桥）── TXT→纪要图→报表+发群
           ├── ④ 视频切片（木叶）── 原视频→转录→高光→成片
           ├── ⑤ 多平台分发（木叶）── 成片→抖音/B站/视频号/小红书/快手
           ├── ⑥ 素材库（水桥）── 成片→飞书内容看板
           ├── ⑦ 文章写作（水桥）── 派对TXT→第9章文章
           └── ⑧ 文章上传（水桥）── 文章→小程序+飞书群推送
```

### 2.2 技能详细映射

| # | 技能名 | 执行人 | 触发词 | SKILL 路径 |
|:--|:---|:---|:---|:---|
| ① | Soul派对运营报表 | 水桥 | 运营报表、派对填表、派对截图 | `水桥_平台对接/飞书管理/运营报表_SKILL.md` |
| ② | 飞书妙记下载（文字+视频） | 水桥 | 妙记下载、飞书视频、飞书妙记 | `水桥_平台对接/智能纪要/SKILL.md` |
| ③ | 智能纪要生成 | 水桥 | 派对纪要、会议纪要 | `水桥_平台对接/智能纪要/SKILL.md` |
| ④ | 视频切片 | 木叶 | 视频剪辑、切片发布 | `木叶_视频内容/视频切片/SKILL.md` |
| ⑤ | 多平台分发 | 木叶 | 一键分发、全平台发布 | `木叶_视频内容/多平台分发/SKILL.md` |
| ⑤a | 抖音发布 | 木叶 | 抖音发布 | `木叶_视频内容/抖音发布/SKILL.md` |
| ⑤b | B站发布 | 木叶 | B站发布 | `木叶_视频内容/B站发布/SKILL.md` |
| ⑤c | 视频号发布 | 木叶 | 视频号发布 | `木叶_视频内容/视频号发布/SKILL.md` |
| ⑤d | 小红书发布 | 木叶 | 小红书发布 | `木叶_视频内容/小红书发布/SKILL.md` |
| ⑤e | 快手发布 | 木叶 | 快手发布 | `木叶_视频内容/快手发布/SKILL.md` |
| ⑥ | Soul发到素材库 | 水桥 | 成片发飞书、发到素材库 | `水桥_平台对接/飞书管理/Soul发到素材库_SKILL.md` |
| ⑦⑧ | Soul创业实验（写作+上传） | 水桥 | 写Soul文章、Soul上传 | `水桥_平台对接/Soul创业实验/SKILL.md` |

> **路径前缀**：`02_卡人（水）/` 或 `03_卡木（木）/`，按所属元素补全。

---

## 三、派对结束后全流程（水岸调度清单）

每场派对结束后，水岸按以下顺序调度各技能执行：

### Phase 1：数据入库（派对结束后立即）

| 步骤 | 动作 | 执行技能 | 输入 | 输出 |
|:---|:---|:---|:---|:---|
| 1.1 | 提取效果数据 | 运营报表 ① | 关闭页截图 + 小助手截图 | 10项数据 |
| 1.2 | 注册场次+填表+发群 | 运营报表 ① | 场次号 | 飞书表格写入 + 群消息 |
| 1.3 | 导出妙记文字 | 飞书妙记 ② | 妙记链接 | TXT → `/Users/karuo/Documents/聊天记录/soul/` |
| 1.4 | 下载妙记视频 | 飞书妙记 ② | 妙记链接 | MP4 → `/Users/karuo/Movies/soul视频/原视频/` |

**一键命令**：

```bash
FEISHU_SCRIPT="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本"
JIYAO_SCRIPT="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"

cd "$FEISHU_SCRIPT" && python3 auto_log.py
python3 soul_party_to_feishu_sheet.py <场次号>
python3 "$JIYAO_SCRIPT/feishu_minutes_export_github.py" "<妙记链接>" -o "/Users/karuo/Documents/聊天记录/soul"
python3 "$JIYAO_SCRIPT/feishu_minutes_download_video.py" "<妙记链接>" -o "/Users/karuo/Movies/soul视频/原视频"
```

### Phase 2：智能纪要（数据入库后）

| 步骤 | 动作 | 执行技能 | 输入 | 输出 |
|:---|:---|:---|:---|:---|
| 2.1 | 提炼纪要 JSON | 智能纪要 ③ | 派对 TXT | meeting.json |
| 2.2 | 生成纪要 HTML→PNG | 智能纪要 ③ | JSON | 苹果薄玻璃纪要图 |
| 2.3 | 纪要图入报表 | 运营报表 ① | PNG + sheet-id + date-col | 飞书表格「今日总结」|
| 2.4 | 纪要图发群 | 智能纪要 ③ | PNG | 飞书群收到纪要长图 |

### Phase 3：视频生产（有妙记视频后）

| 步骤 | 动作 | 执行技能 | 输入 | 输出 |
|:---|:---|:---|:---|:---|
| 3.1 | 转录+高光+切片+成片 | 视频切片 ④ | 原视频 MP4 | 成片目录（竖屏 498×1080）|
| 3.2 | 上传素材库 | 素材库 ⑥ | 成片目录 | 飞书内容看板记录 |
| 3.3 | 多平台分发 | 分发 ⑤ | 成片目录 | 5平台发布（定时排期）|

**一键命令**：

```bash
VIDEO_SCRIPT="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本"
DIST_SCRIPT="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本"

eval "$(~/miniforge3/bin/conda shell.zsh hook)" && conda activate mlx-whisper
python3 "$VIDEO_SCRIPT/soul_slice_pipeline.py" --video "<原视频.mp4>" --clips 8 --two-folders
python3 "$DIST_SCRIPT/distribute_all.py" --video-dir "<成片目录>"
```

### Phase 4：文章内容（TXT可用后）

| 步骤 | 动作 | 执行技能 | 输入 | 输出 |
|:---|:---|:---|:---|:---|
| 4.1 | 写第9章文章 | 写作 ⑦ | 派对 TXT | 第X场.md |
| 4.2 | 上传小程序 | 上传 ⑧ | MD 文件 | 小程序文章 |
| 4.3 | 推送飞书群 | 上传 ⑧ | MD 文件 | 群消息（前6%+海报）|

---

## 四、凭证与账号统一索引

> 所有凭证统一从 `运营中枢/工作台/00_账号与API索引.md` 读取，此处仅列出**本项目直接使用**的部分。

### 4.1 飞书（运营报表 + 智能纪要 + 素材库）

| 项 | 值 | 用途 |
|:---|:---|:---|
| APP_ID | `cli_a48818290ef8100d` | tenant_access_token |
| APP_SECRET | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` | 同上 |
| 运营报表 spreadsheet_token | `wikcnIgAGSNHo0t36idHJ668Gfd` | 飞书表格 |
| 2月 sheet_id | `7A3Cy9` | 2月运营数据 |
| 3月 sheet_id | `bJR5sA` | 3月运营数据 |
| 运营报表群 Webhook | `34b762fc-5b9b-4abb-a05a-96c8fb9599f1` | 数据+纪要发群 |
| 素材库 wiki-node | `MKhNwmYwpi1hXIkJvfCcu31vnDh` | 内容看板 |
| 素材库 table | `tblGjpeCk1ADQMEX` | 多维表格 |
| Token 文件 | `飞书管理/脚本/.feishu_tokens.json` | auto_log.py 管理 |
| 妙记 Cookie | `智能纪要/脚本/cookie_minutes.txt` | 妙记文字+视频 |

### 4.2 小程序（文章上传）

| 项 | 值 | 用途 |
|:---|:---|:---|
| AppID | `wxb8bbb2b10dec74aa` | Soul 派对小程序 |
| API 域名 | `https://soul.quwanzhi.com` | 后端接口 |
| 项目路径 | `开发/3、自营项目/一场soul的创业实验-永平/` | 永平分支 |
| GitHub | `https://github.com/fnvtk/Mycontent/tree/yongpxu-soul` | 代码主仓 |

### 4.3 视频平台（多平台分发）

| 平台 | Cookie 路径 | 有效期 | 状态 |
|:---|:---|:---|:---|
| 视频号 | `多平台分发/cookies/视频号_cookies.json` | ~24-48h | ✅ 可用 |
| B站 | `多平台分发/cookies/B站_cookies.json` | ~6个月 | ✅ 可用 |
| 小红书 | `多平台分发/cookies/小红书_cookies.json` | ~1-3天 | ✅ 可用 |
| 快手 | `多平台分发/cookies/快手_cookies.json` | ~7-30天 | ⚠️ 需检查 |
| 抖音 | API（VOD + bd-ticket-guard） | ~2-4h | ❌ 账号封禁 |

### 4.4 视频处理

| 项 | 值 |
|:---|:---|
| MLX Whisper 环境 | `~/miniforge3/envs/mlx-whisper` |
| 高光识别模型 | `OPENAI_API_KEY` 环境变量（默认 gpt-4o） |
| Soul 视频输出 | `/Users/karuo/Movies/soul视频/最终版/` |
| 报告输出 | `/Users/karuo/Documents/卡若Ai的文件夹/报告/` |

### 4.5 Gitea（书稿同步）

| 项 | 值 |
|:---|:---|
| 地址 | `http://open.quwanzhi.com:3000` |
| 账号/密码 | `fnvtk` / `Zhiqun1984` |
| 同步命令 | `bash scripts/gitea_sync.sh`（书稿目录下） |

---

## 五、关键目录速查

| 类型 | 路径 |
|:---|:---|
| **聊天记录/TXT** | `/Users/karuo/Documents/聊天记录/soul/` |
| **原视频** | `/Users/karuo/Movies/soul视频/原视频/` |
| **成片/最终版** | `/Users/karuo/Movies/soul视频/最终版/` |
| **纪要/报告** | `/Users/karuo/Documents/卡若Ai的文件夹/报告/` |
| **书稿** | `/Users/karuo/Documents/个人/2、我写的书/《一场soul的创业实验》/` |
| **永平项目** | `/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平/` |
| **运营报表脚本** | `02_卡人（水）/水桥_平台对接/飞书管理/脚本/` |
| **智能纪要脚本** | `02_卡人（水）/水桥_平台对接/智能纪要/脚本/` |
| **视频切片脚本** | `03_卡木（木）/木叶_视频内容/视频切片/脚本/` |
| **多平台分发脚本** | `03_卡木（木）/木叶_视频内容/多平台分发/脚本/` |
| **Cookie 存储** | `03_卡木（木）/木叶_视频内容/多平台分发/cookies/` |

---

## 六、水岸调度规则

### 6.1 触发与调度

| 用户说 | 水岸的调度动作 |
|:---|:---|
| 派对结束了 / 填报表 | 读运营报表 SKILL → 执行 Phase 1 |
| 下载妙记 / 飞书视频 | 读智能纪要 SKILL → 执行 1.3/1.4 |
| 出纪要 / 派对纪要 | 读智能纪要 SKILL → 执行 Phase 2 |
| 剪视频 / 出切片 | 读视频切片 SKILL → 执行 Phase 3.1 |
| 发各平台 / 一键分发 | 读多平台分发 SKILL → 执行 Phase 3.3 |
| 发素材库 | 读 Soul发到素材库 SKILL → 执行 3.2 |
| 写文章 / 写Soul文章 | 读 Soul创业实验 SKILL → 执行 Phase 4.1 |
| 上传文章 | 读 Soul创业实验 SKILL → 执行 Phase 4.2 |
| **全流程** / **派对全流程** | 按 Phase 1→2→3→4 顺序全部执行 |

### 6.2 协作原则

1. **水岸不执行，只调度**：遇到具体任务，读对应技能的 SKILL.md 后按其步骤执行
2. **跨组协调**：水桥（飞书/运营）和木叶（视频/分发）的技能由水岸统一排期
3. **凭证统一**：所有 Token/Cookie 从本文件 §四 查找，不在各技能重复配置
4. **输出标准化**：文件按 §五 目录约定存放，不散落各处

---

## 七、依赖

### 前置技能

- 运营报表（W11）、智能纪要（W08）、Soul创业实验（W10）、Soul发到素材库（W11a）
- 视频切片（M01）、多平台分发（M01h）

### 外部工具

- Python 3.10+、requests、playwright
- FFmpeg / ffprobe
- MLX Whisper（conda env: mlx-whisper）
- bilibili-api-python、httpx

---

## 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| 1.0 | 2026-03-18 | 初版：水岸作为卡若创业派对项目经理，统管 8 大技能，4 阶段全流程，凭证统一索引 |
