---
name: Soul竖屏切片
description: Soul 派对视频→竖屏成片（498×1080），剪辑→成片两文件夹；竖屏裁剪以全画面 1920×1080 标定（analyze_feishu_ui_crop.py），默认深色带 crop=568@508+居中498、无右侧白边。MLX 转录→高光→batch_clip→soul_enhance（封面+字幕同步+逐字可选+去语助词+纠错+违禁词）→visual_enhance v8 可选。LTX/基因胶囊可选。
triggers: Soul竖屏切片、视频切片、热点切片、竖屏成片、派对切片、全画面标定、竖屏裁剪、全画面成片、letterbox、画面显示全、白边、飞书录屏、LTX、AI生成视频、Retake重剪、字幕优化、字幕同步、逐字字幕
owner: 木叶
group: 木
version: "1.4"
updated: "2026-03-20"
---

# Soul 竖屏切片 · 专用 Skill

> 专门切 Soul 派对视频为**竖屏成片**，用于抖音/首页。**只保留两个文件夹**：剪辑 → 成片。

---

## 一、两文件夹结构（无 clips_enhanced / clips_竖屏）

| 文件夹 | 含义 | 内容 |
|--------|------|------|
| **clips/** | 剪辑 | batch_clip 输出的横版切片（soul112_01_标题.mp4） |
| **成片/** | 成片 | 竖屏 498×1080 + 封面 + 字幕 + 去语助词，文件名为**纯标题**（无序号、无 _enhanced） |

不再单独生成 `clips_enhanced`、`clips_竖屏`；成片由 `soul_enhance` 一步直出到 `成片/`。

---

## 二、视频结构：提问→回答 + 前3秒高光 + 去语助词

- **每个话题前均优先提问→回答**：先看片段有没有人提问；**有提问**则把**提问的问题**放到前3秒（封面/前贴），先展示问题再播回答；无提问则用金句/悬念作 hook。
- **成片链路**：前3秒展示问题（或金句）→ 正片回答 → **整片去除语助词**（提问与回答部分均由 soul_enhance 清理）。
- **高光**：按「3秒高光亮点」剪，每段 30～300 秒完整语义单元；高光识别若有提问须填 `question`，且 `hook_3sec` 与之一致。

详见：`参考资料/视频结构_提问回答与高光.md`、`参考资料/高光识别提示词.md`。

---

## 三、流程总览

**标准五步**（每步完成再走下一步）：① 分析视频→识别话题→导出话题时间 ② 按高光时刻结构整理（前 3 秒/提问） ③ 按时间节点切片→**切片/** ④ 去语助词（合并到⑤） ⑤ 封面+字幕→**成片/**。详见 `参考资料/热点切片_标准流程.md`。

```
原视频 → 转录(MLX) → 高光识别(含 question/hook_3sec，见高光识别提示词) → batch_clip → soul_enhance(成片竖屏直出到 成片/)
```

- **batch_clip**：输出到 `clips/`
- **soul_enhance -o 成片/ --vertical --title-only**：**文件名 = 封面标题 = highlights 的 title**（去杠：`：｜、—、/` 等替换为空格），名字与标题一致、无序号无杠；字幕烧录（随语音走动）；完整去语助词；竖屏裁剪直出到 `成片/`

### 3.1 全画面参数（必做约定）

竖屏 **裁剪链必须以全画面 1920×1080 为基准**，不能用「凭感觉收窄竖条」替代。

1. **为什么要全画面标定**：飞书录屏右侧常为**桌面白底**；旧式固定 `483+608` 会裁到白边。正确做法是：在全画面上找**小程序深色主体的左右边界**，先取**整段宽 W**，再在 W 内**居中**裁 498。
2. **当前默认**（`soul_enhance.py` 内建）：`crop=568:1080:508:0,crop=498:1080:35:0`，`OVERLAY_X=543`。与 `analyze_feishu_ui_crop.py` 对 **127 场全画面 20% 帧** 测算一致。
3. **新场次 / 布局变了**：截一帧全画面（或 `--at 0.2` 从 mp4 抽帧），执行：

```bash
cd 脚本
python3 analyze_feishu_ui_crop.py "/path/to/全画面.jpg"
# 或 python3 analyze_feishu_ui_crop.py "/path/to/原片.mp4" --at 0.2
```

把打印的 `CROP_VF` 传给成片命令：`--crop-vf 'crop=...'`（可选 `--overlay-x` 与脚本输出一致）。

4. **逐字渐显字幕**（可选）：`--typewriter-subs`，同一条字幕时间内前缀逐字加长，更跟读。

---

## 四、高光与切片（30 秒～300 秒）

| 项 | 规则 |
|----|------|
| **单段时长** | **30～300 秒**，由完整片段起止决定 |
| **完整性** | 每段是一个完整话题/情节，有头有尾 |
| **标题** | **一句刺激性观点**，**4～6 个汉字**为宜（单行封面好读、主题一眼懂）；忌长句当文件名 |
| **数量** | 建议 ≤10 段/场 |
| **语助词** | 识别与剪辑须符合 `参考资料/高光识别提示词.md`，成片由 soul_enhance 统一去语助词 |

---

## 五、成片：封面 + 字幕 + 竖屏

- **封面**：竖屏 498×1080 内**不超出界面**；**半透明质感**（背景 alpha=165）；深色渐变、左上角 Soul logo；**封面显示标题 = 成片文件名 = highlights.title**（去杠、去下划线后一致，无 `：｜—/_`、无序号）；标题文字严格居中、多行自动换行。透明度由 `VERTICAL_COVER_ALPHA` 调节。
- **字幕**：封面结束后先留**约 3 秒纯画面**（无字幕），再开始叠字幕；字幕**居中**在竖屏内。先尝试**单次 FFmpeg 通道**（一次 pass 完成所有字幕叠加，最快）；若失败自动回退到分批模式（batch_size=40）；语助词在解析阶段已由 `clean_filler_words` 去除。重新加字幕时加 `--force-burn-subs`。⚠️ 注意：当前 FFmpeg 不支持 drawtext/subtitles 滤镜，只能用 PIL 图像 overlay 方案。（脚本常量：`SUBS_START_AFTER_COVER_SEC`，默认 3.0）
- **封面标题**：高光 `title` 建议 **4～6 个汉字**；成片内封面主标题最多显示 **6 个汉字**（超长由 `soul_enhance` 自动截断，与文件名 `--title-only` 一致）。
- **竖屏**：498×1080，crop 参数与 `参考资料/竖屏中段裁剪参数说明.md` 一致

### ⚠️ 字幕烧录常见坑（已修复）

| 坑 | 原因 | 修复 |
|---|---|---|
| 字幕全跳过（转录稿异常误判） | `_parse_clip_index` 取到场次号（如 119）而非切片序号（01），导致 highlight_info 为空，start_sec=0 落入噪声区 | 改为取 `_数字_` 模式中**最小值**，119→01=1 ✓ |
| 标题/文件名有下划线 | `sanitize_filename` 保留了 `_` | 现在 `_` 也替换为空格 |
| 字幕烧录极慢（N/5 次 encode） | 原 batch_size=5，180 条字幕需 36 次 FFmpeg 重编码 | 改为单次通道（1 次 pass）；失败时 batch_size=40 兜底 |
| **字幕超前于说话（字幕比声音早）** | `batch_clip -ss` 输入端 seeking 导致切片从关键帧开始（早于请求时间 1-4s），字幕按请求时间算相对位置，导致超前 | **动态 PTS 检测**：`enhance_clip` 对每条切片用 FFprobe 检测首帧 PTS，动态计算精确 delay（不再用固定值）；`SUBTITLE_DELAY_SEC=2.0` 作为兜底 |
| **封面期间出现字幕** | 字幕时间计算使字幕落在封面段（前 2.5s）内 | `write_clip_srt` 强制过滤 `end <= cover_duration` 的条目，并 `start = max(start, cover_duration)` |
| **字幕含 ASR 噪声行（单字母 L / Agent）** | MLX Whisper 对静音/噪声段产生幻觉字符 | `_is_noise_line()` 提前过滤单字母、重复字符、噪声 token |
| **繁体字幕未转简体** | Soul 派对录音有港台口音，ASR 输出繁体 | `_to_simplified()` 兜底 + CORRECTIONS 扩充 50+ 繁体常用字映射 |

---

## 六、竖屏输出两种模式（成片内嵌）

### A. 竖条模式（默认，小程序无白边）

只取横向**中间深色带**，再裁成 498 宽，适合抖音全屏铺满、不要桌面白边。

| 步骤 | 滤镜 |
|------|------|
| 1 | crop=568:1080:508:0（整段深色小程序主体，不含右侧桌面白边） |
| 2 | crop=498:1080:35:0（568 内水平居中取 498） |

### B. 全画面模式（`--vertical-fit-full`）

**不裁中间竖条**：整幅 16:9 **完整入画**，等比缩放到宽度 498，**上下加黑边** 到 1080 高。左侧小程序 + 右侧人像/桌面都会在画面里，适合「画面要显示全」的成片。

- 封面、字幕先在 **完整横版分辨率** 上叠加（`overlay=0:0`），再整体走：  
  `scale=w=498:h=1080:force_original_aspect_ratio=decrease,pad=498:1080:(ow-iw)/2:(oh-ih)/2:color=black`
- 命令：在原有 `soul_enhance.py ... --vertical --title-only` 上增加 **`--vertical-fit-full`**

**输出**：两种模式均为 **498×1080** 竖屏文件。

---

## 七、完整命令示例（112 场）

**1. 高光**（当前模型生成 highlights.json，标题用刺激性观点，30～300 秒完整段；语助词与节奏感见 `参考资料/高光识别提示词.md`）

**2. 剪辑（clips）**
```bash
python3 batch_clip.py -i "原视频.mp4" -l highlights.json -o clips/ -p soul112
```

**3. 成片（竖屏+封面+字幕+去语助词，直出到 成片/）**
```bash
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o 成片/ --vertical --title-only --force-burn-subs
# 可选：逐字字幕 + 本场全画面重算的裁剪（见 3.1）
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o 成片/ --vertical --title-only --force-burn-subs --typewriter-subs --crop-vf "crop=568:1080:508:0,crop=498:1080:35:0"
```

**前缀命名注意**：`-p soul119` 这类带场次号的前缀会产生 `soul119_01_xxx.mp4`，`soul_enhance` 会正确识别 `01` 为切片序号（取所有 `_数字_` 中最小值）。

输出目录结构示例：
```
xxx_output/
  clips/           # 横版切片
  成片/            # 竖屏成片，文件名为标题.mp4
  成片/目录索引.md
  highlights.json
  transcript.srt
```

---

## 八、参数速查

| 项 | 值 |
|----|-----|
| 文件夹 | 仅 **clips/**、**成片/** |
| 成片尺寸 | 498×1080 竖屏 |
| 成片文件名 | 纯标题（无 01、无 _enhanced） |
| 单段时长 | 30～300 秒 |
| 高光/语助词 | 见 `参考资料/高光识别提示词.md` |

详细 crop 说明见：`参考资料/竖屏中段裁剪参数说明.md`。

**发布到抖音**：成片生成后，可用「抖音发布」Skill（开放平台 OAuth 登录 + 上传/创建视频）或腕推等工具发布；见 `03_卡木（木）/木叶_视频内容/抖音发布/SKILL.md`。

---

## 九、底部浮层：苹果毛玻璃样式（visual_enhance v8）

在 `soul_enhance` 的封面+字幕+竖屏成片上，叠加苹果毛玻璃底部浮层作为**最终成片**（不再多一个"增强版"目录）。

### 设计规范（来自卡若AI前端 神射手/毛狐狸标准 v8 终版）

| 元素 | 规格 |
|------|------|
| 背景 | `rgba(12,15,26,0.88)` 深黑半透 + 8px 柔和高光条 |
| 圆角 | 26px |
| 边框 | `rgba(255,255,255,0.10)` 白边 + 内缩 `rgba(255,255,255,0.05)` |
| 阴影 | GaussianBlur(22)，悬浮感 |
| 字体 | 标题 Medium，正文 Regular（两档） |
| 主色 | Soul绿系：`(0,200,140)` → `(52,211,238)` 青绿渐变 |
| **无图标** | 去掉了所有 badge、问号圆圈、Unicode 图标前缀 |
| **Logo 左上角** | 加载 `karuo_logo.png` 缩放到 24px 高 + "第 N 场" 文字 |
| 芯片 | 渐变描边胶囊，不满色填充 |
| **无视频小窗** | 已永久去掉 |
| **段落切换** | 前 18% title_card → 中 64% summary_card（要点） → 后 18% summary_card（CTA） |

### 使用命令

```bash
python3 visual_enhance.py -i "soul_enhanced.mp4" -o "成片/标题.mp4" --scenes scenes.json
```

`--scenes` JSON 格式：每段需 `type`、`episode`（场次号）、`sub_label`、`params`（含 `question`/`subtitle`/`chips`/`headline`/`points`/`cta`）。

### 切片时长规范

每段时长严格在 **30 秒 ~ 5 分钟**，必须是完整的一个话题，有头有尾，不在句子中间截断。

---

## 十、AI 生成与 LTX 可选集成

在「已有录播 → 转录→高光→切片→成片」之外，可选用 **LTX** 系能力，实现 **AI 生成视频内容** 与 **在已有视频上轻松重剪**，成片仍走本 Skill 的封面+字幕+竖屏规范。

| 场景 | 推荐能力 | 说明 |
|------|----------|------|
| **已有视频某段要重剪/替换** | LTX-2 **RetakePipeline**、LTX Desktop「Video edit (Retake)」 | 只重生成指定时间段，替换原片段后再走 soul_enhance |
| **用文案/脚本生成新片段** | LTX **Text-to-video**、LTX-Studio / Fal / Replicate API | 生成 mp4 后放入 `切片/` 或直接进成片流程 |
| **封面/金句图动起来** | LTX **Image-to-video** | 3～10 秒动效，再与切片合成 |
| **音视频同步生成** | LTX-2 **A2V**、音视频同步生成 | 配音/旁白 → 对应画面，补全缺失画面 |

**能力与集成细节**：见 `参考资料/LTX_能力与集成说明.md`（含 Retake、Video extension、多关键帧、Prompt 增强、API/本地/Desktop 接入方式）。  
**流程约定**：凡 LTX 生成的片段，统一按成片规范（竖屏 498×1080、封面、字幕）经 soul_enhance 输出，与录播切片一致。

---

## 十、基因胶囊

本 Skill 可打包为基因胶囊，供其他 Agent/项目继承：

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" pack "03_卡木（木）/木叶_视频内容/视频切片/Soul竖屏切片_SKILL.md"
```

解包：
```bash
python3 .../gene_capsule.py unpack Soul竖屏切片_*.json -o <目标目录>
```
