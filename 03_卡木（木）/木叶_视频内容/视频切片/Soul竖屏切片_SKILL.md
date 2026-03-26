---
name: Soul竖屏切片
description: Soul 派对视频→竖屏成片；高光**单主题完整**（1～5min/条，每场约 8～12 条）、去穿插话题；**前3秒两种风格**（优先：嘉宾第一人称处境+反差；备选：房主刺激性观点）；**收尾丝滑**（片尾约 2.85s 不剪静音 + cta_ending 信息钩子引流下一条）；**全链路强制简体中文+标点**（繁体自动转简）。封面底**约 10% 轻模糊**（非全糊）。字幕用**得意黑描边白字**（无底色）、纠错+关键词金黄高亮、逐字渐显；**表情贴片默认开启**；流程：裁剪检查→soul_enhance。
triggers: Soul竖屏切片、视频切片、热点切片、竖屏成片、派对切片、裁剪检查、重新截图、全画面标定、竖屏裁剪、全画面成片、letterbox、画面显示全、白边、飞书录屏、LTX、AI生成视频、Retake重剪、字幕优化、字幕同步、逐字字幕、上麦项目、月营收、融资、前三秒钩子
owner: 木叶
group: 木
version: "2.12"
updated: "2026-03-24"
---

# Soul 竖屏切片 · 专用 Skill

> 专门切 Soul 派对视频为**竖屏成片**，用于抖音/首页。**主链路两文件夹**：横版切片 → 成片；另设 **`裁剪检查/`** 仅放 analyze 标定图与 txt（不占「成片」逻辑）。

**横屏全幅（整幅 16:9、无左右黑边）**：先跑 **`Soul剪辑取向分析_SKILL.md`**，再按报告选 **`Soul横屏全幅高光_SKILL.md`**（`--horizontal-full`）。若必须中间一条+黑边：`soul_enhance --horizontal-center-pad`。

---

## 一、文件夹结构（主：切片 → 成片）

| 文件夹 | 含义 | 内容 |
|--------|------|------|
| **clips/** 或 **切片/** | 剪辑 | batch_clip 输出的横版切片（如 `soul127_01_标题.mp4`） |
| **成片/** | 成片 | 竖条（高 1080、宽随塑形）+ 封面 + 字幕 + 去语助词，文件名为**纯标题**（无序号、无 _enhanced） |
| **裁剪检查/**（推荐） | 塑形标定 | `analyze_feishu_ui_crop.py --save-dir` 输出：全画面 PNG、竖条预览、参数 txt；每场成片前先写这里 |

不再单独生成 `clips_enhanced`、`clips_竖屏`；成片由 `soul_enhance` 一步直出到 `成片/`。

**卡若 Cursor 执行约定**：用户说「下一步 / 接着跑 / 重新剪辑 / 直到完成」或刚更新本 Skill 后要出片时，Agent 按 `卡若AI/.cursor/rules/karuo-ai.mdc` **流水线续跑**条**直接执行**（从转录、切片到成片），**不先询问是否执行**。

---

## 二、视频结构：前3秒钩子 + 提问→回答 + 丝滑收尾 + 去语助词

### 2.1 前3秒钩子两种风格（v2.12 规则，必须二选一）

`hook_3sec` 是封面文字 + 视频最开头约3秒要展示的内容，**必须先吸住眼球**。两种风格按优先级选：

**风格一（优先）：以「参与者（非房主）的问题或处境描述」开头**

- 适用场景：片段里有嘉宾/参与者讲自己的项目、遭遇、问题、处境
- 写法：**第一人称「我」**，用嘉宾口吻写出处境+反差/数字/出乎意料的结果
- 例：「我入职第五天就被老板炒掉了，但后来我把客户全带走了。」
- 例：「我00后，逃婚之后去卖核桃，就这个名字让人一听就记住了。」
- 核心：让观众代入嘉宾，产生「这人经历了什么？」的好奇心

**风格二（备选）：以「房主（卡若）的刺激性观点/金句」开头**

- 适用场景：片段以卡若主导分析、复盘、观点输出为主，嘉宾没有强烈反差处境
- 写法：**直接抛出反常识/颠覆认知/带数字的判断句**，不说「我认为」
- 例：「电销这条路已经死了，砸再多人进去也没用。」
- 例：「AI时代用对工具的人和不用的人，差距已经不是十倍了，是一万倍。」
- 核心：让观众觉得「这话说得够猛，想听下去」

**判断规则**：片段里嘉宾/上麦者有自述处境 → 用风格一；以卡若观点为主驱动 → 用风格二。有可量化钱/项目数据时，风格一里必须带上（「四个月赚了五十万」「月入X万」等）。

### 2.2 收尾规则（v2.12 强制）

- **最后几秒必须有人声**：`soul_enhance` 已设 `SILENCE_TAIL_PRESERVE_SEC=2.85`，片尾静音区不裁除。
- **`cta_ending` 要丝滑引流下一条**：不能写成纯广告，要有**信息钩子**（下一条讲什么）或**认知收口**（一句总结）+ **轻引导**（关注/下一条/接着看）。
- 好的收尾范例：「七年复购靠的就是两个字，下一条讲更狠的销售打法。」
- 好的收尾范例：「圈子越小，靠谱两个字越值钱。关注我，下一场更精彩。」
- **禁止**：硬广式「扫码加微信领资料」风格的结尾放在正片字幕里（可放 CTA 底条）。

### 2.3 其他结构规则

- **成片链路**：前3秒展示 hook → 正片展开提问+回答 → **整片去语助词** → 丝滑收尾。
- **节奏与高光**：话题边界以 highlights 起止为准，剪辑阶段就要裁干净。
- **单主题、完整、有趣**：一条成片只服务一个主题；临时插进的跑题段剪掉或拆成另一条高光。
- **每段时长**：30秒～5分钟（≤300秒）；`hook_3sec` 与 `question` 气质一致。
- **全文简体**：`hook_3sec`、`question`、`cta_ending`、`title` 全部用简体中文写，有标点符号，不出现繁体。

详见：`参考资料/视频结构_提问回答与高光.md`、`参考资料/高光识别提示词.md`。

### GitHub 样式吸收（v2.5）

参考并吸收了 GitHub 上的逐字/卡拉 OK 字幕思路（ASS/Karaoke 风格）：
- `zoharbabin/karaokify`（逐词高亮、时间轴驱动）
- `bubblesub/ass_renderer`（字幕渲染层次）

落地规则：
1. 逐字字幕必须有**轻重缓急**：句号/问号停顿更明显，逗号次之，普通字稳定推进。
2. 字幕文本先做**严格清洗**：去字间空白、去空字幕帧、修复标点前空格。
3. 风格：**纯描边白字**，无底色背景条（v2.10 起）。

### 字幕样式 v2.10（当前标准）

| 项 | 值 |
|----|-----|
| **字体** | 得意黑 SmileySans-Oblique（`fonts/SmileySans-Oblique.ttf`） |
| **字号** | 46px（竖条自适应缩小到 38px） |
| **字色** | 纯白 `(255,255,255)` |
| **描边** | 4px 深黑 `(10,10,10)`，无底色 / 无背景条 / 无边框 |
| **关键词** | 金黄 `(255,230,80)` 高亮，同字号同基线 |
| **背景** | `bg_color=None`，不绘制半透明底条 |

### 全程简体中文 + 片尾有声（v2.11 强制）

- **语言**：从 `transcript.srt` 解析、逐词路径、标点补强、封面 `hook_3sec` / `question` / 主标题引用、片尾 `cta_ending` 等，**一律经 `_to_simplified`（OpenCC t2s + 兜底映射）**，成片与收录进烧录层的文案**不出现繁体残留**（`highlights.json` 里仍可手写繁体，渲染时转简）。
- **片尾完整性**：`soul_enhance.py` 在去静音前对 `silencedetect` 结果做 **`filter_silences_keep_tail_audio`**：最后 **`SILENCE_TAIL_PRESERVE_SEC`（默认约 2.85s）** 内的静音**不参与切除**，避免「最后几秒被剪成完全无声」。若原片结尾本身无对白，仍可能偏静，需在剪辑/高光时段上保证收尾句落在片尾窗内。

### 贴片库与表情库（v2.6→v2.10 默认开启）

成片**默认开启**表情贴片（`--stickers` 默认 True），关闭时加 `--no-stickers`。
- 贴片库目录：`视频切片/贴片库/emoji_png_72/`
- 默认策略：按高光主题自动匹配表情，优先贴在画面上方两侧。
- 数量策略：片段 ≥2 分钟至少 2 个，≥3 分钟可 3 个，单贴片 1.1~1.8 秒。

推荐素材来源：
- [twemoji](https://github.com/twitter/twemoji)
- [openmoji](https://github.com/hfg-gmuend/openmoji)

执行约定：
1. 贴片不得遮挡字幕与关键人脸区域。
2. 贴片可关闭（库缺失自动跳过；`--no-stickers` 显式关闭）。
3. 贴片只在节奏点出现，不连续轰炸。

---

## 三、流程总览

**标准五步**（每步完成再走下一步）：① 分析视频→识别话题→导出话题时间 ② 按高光时刻结构整理（前 3 秒/提问） ③ 按时间节点切片→**切片/** ④ 去语助词（合并到⑤） ⑤ 封面+字幕→**成片/**。详见 `参考资料/热点切片_标准流程.md`。

```
原视频 → 转录(MLX) → 高光识别 → batch_clip → **analyze（裁剪检查）** → **核对预览** → soul_enhance(成片竖屏直出到 成片/)
```

- **batch_clip**：输出到 `clips/`
- **soul_enhance -o 成片/ --title-only**（**推荐仍写 `--vertical`**）：自 v2.3 起，只要带了 **`--title-only` 和/或 `--crop-vf` / `--vertical-fit-full`**，脚本会**默认启用竖屏直出**，避免漏写 `--vertical` 误出 1920×1080 横版。**文件名 = 封面标题 = highlights 的 title**（去杠：`：｜、—、/` 等替换为空格）；字幕烧录；去语助词；竖条裁剪直出到 `成片/`

### 3.1 全画面参数（必做约定）

竖屏 **裁剪链必须以全画面 1920×1080 为基准**，不能用「凭感觉收窄竖条」替代。

1. **为什么要全画面标定**：飞书录屏右侧常为**桌面白底**；固定左缘+窄宽会裁错。正确做法是：在全画面上找深色主体包络，**扩到桌面白**，再 **`crop=W:1080:L:0`**，**默认不再 `scale=498`**，避免界面横向拉伸。
2. **当前默认**（`soul_enhance.py` 内建）：与 analyze **默认**一致，仅单段 crop（典型 127 场：`crop=598:1080:493:0`，`OVERLAY_X=493`，成片 **598×1080**）。需要旧版 498 宽时：analyze 加 `--squeeze-498`，或 `--crop-vf` 手动加 `,scale=498:1080:flags=lanczos`；**居中再裁 498** 用 `--center-in-band`。
3. **自动宽度纠偏（默认开启）**：先跑 analyze 默认参数；若 `OUTPUT_SIZE` 宽度 **>510**（看起来偏胖），自动切到 `--center-in-band`，输出 **498×1080** 的瘦塑形，再用新的 `CROP_VF/OVERLAY_X` 成片。
4. **新场次 / 布局变了**：截一帧全画面（或 `--at 0.2` 从 mp4 抽帧），执行：

```bash
cd 脚本
python3 analyze_feishu_ui_crop.py "/path/to/全画面.jpg"
# 或：原片 20% 时长截帧 + 深色带分析 + 写出对照图（推荐每场先做）
python3 analyze_feishu_ui_crop.py "/path/to/原片.mp4" --at 0.2 --save-dir "/path/to/场次_output/裁剪检查"
```

`--save-dir` 会生成：**全画面取样 PNG**、**竖条预览 PNG**（默认文件名含真实宽如 `…_598x1080.png`；仅 squeeze/center 时为 498 宽）、**塑形裁剪参数 txt**，确认后再成片。

把打印的 `CROP_VF` 传给成片命令：`--crop-vf 'crop=...'`（可选 `--overlay-x` 与脚本输出一致）。

5. **逐字渐显字幕**（可选）：`--typewriter-subs`，同一条字幕时间内前缀逐字加长，更跟读。

### 3.2 每场固定流程：裁剪检查 → 成片

**顺序不要跳**：先塑形标定（截图），肉眼 OK 再跑成片；换场次或飞书/窗口布局变了必须重做 ①。

| 步骤 | 动作 | 说明 |
|------|------|------|
| ① 塑形标定 | `analyze_feishu_ui_crop.py` 对**本场原片** `--at 0.2`，`--save-dir` 指向 `场次_output/裁剪检查/` | 生成全画面 PNG、竖条预览（文件名含真实宽如 `…598x1080`）、`塑形裁剪参数.txt`；可随时再跑覆盖 = 「重新截图」 |
| ② 核对 | 打开 `裁剪检查/` | 竖条包住小程序主体、无意外裁切、无异常大白边 |
| ③ 成片 | `soul_enhance.py`（见下模板） | 输出 **W×1080** 竖条 + 封面 + 字幕 + 加速；`--title-only` 文件名 = 标题 |
| ④ 字幕抽检 | 日志里多条「解析后无有效字幕」 | 常见为 `transcript.srt` 后半 ASR 坏段（重复/噪声）；需对原片重跑 MLX Whisper 后再执行 ③ |

**推荐目录结构**（可与下表「clips」并列，名称按你习惯；`-c` 指向实际横版切片目录即可）：

```
xxx_output/
  highlights.json
  transcript.srt
  切片/              # batch_clip 横版（或 clips/）
  裁剪检查/          # ① 输出，专放标定 PNG + txt
  成片/              # ③ 输出 + 目录索引.md
```

**命令模板**（在 `视频切片/脚本/` 下执行，路径换成本场）：

```bash
# ① 重新截图 / 塑形标定
python3 analyze_feishu_ui_crop.py "/path/本场原片.mp4" --at 0.2 --save-dir "/path/xxx_output/裁剪检查"

# ③ 竖屏成片（参数以 ① 终端打印为准；与 soul_enhance 内置默认一致时可省略 --crop-vf / --overlay-x）
python3 soul_enhance.py \
  -c "/path/xxx_output/切片" \
  -l "/path/xxx_output/highlights.json" \
  -t "/path/xxx_output/transcript.srt" \
  -o "/path/xxx_output/成片" \
  --vertical --title-only --force-burn-subs --typewriter-subs \
  --crop-vf "crop=598:1080:493:0" --overlay-x 493
```

- 表中 **`crop=598:1080:493:0` / 598×1080** 为 127 场在 `0.2` 取样下的典型值；**每场以 ① 的 `CROP_VF`、`OUTPUT_SIZE`、`OVERLAY_X` 为准**。
- 本机实测路径示例：`~/Movies/soul视频/第127场_20260318_output/`（子目录 `裁剪检查/`、`切片/`、`成片/`）。

---

## 四、高光与切片（1～5 分钟 · 单主题 · 约 10 条/场）

| 项 | 规则 |
|----|------|
| **单段时长** | **60～300 秒（1～5 分钟）**；不足 60s 合并进同主题相邻段或放弃；超过 5min 必须拆主题或砍无关穿插 |
| **单主题（硬规则）** | **一个 mp4 = 一个主题**，整段**完整**；中间任何**无关主题**的闲聊、插话、跑题段落一律**不收录**（在粗剪/高光表里收窄 `start_time`/`end_time` 或改切两条） |
| **完整性 + 有趣** | 每段**有头有尾**（观众能听懂结论/态度）；同时标题与 hook 要**有张力**（数字、对比、反常识、痛点），避免「正确的废话」 |
| **条数/场** | 目标约 **10 条/场**；宁少勿滥，保证每条都达标：单主题 + 时长窗口 + 有趣 |
| **时间戳** | `start_time`/`end_time` 必须以**整场 transcript.srt** 核对，避免「标题与画面」错位 |
| **标题** | **一句刺激性观点**，**4～6 个汉字**为宜（单行封面好读）；忌长句当文件名 |
| **语助词** | 识别与剪辑须符合 `参考资料/高光识别提示词.md`，成片由 soul_enhance 统一去语助词 |

---

## 五、成片：封面 + 字幕 + 竖屏

- **封面**：竖条画布内**不超出界面**；**冷色半透明渐变**（`VERTICAL_COVER_ALPHA` 约 148）+ **底部电影感渐隐**（`STYLE['cover']` 的 `vignette_*`）+ **顶栏单条 Soul 绿 + 可选 1px 淡金线** + **细白内框**；主标题为**柔阴影暖白字**（非粗描边），字体优先思源黑体 Bold；左上角双圈 Soul 标。**封面文案**优先 `hook_3sec`（见 `pick_cover_hook_text`）。成片文件名仍与 `highlights.title` 规则一致。
- **封面底层模糊（重要）**：**不要全屏强糊**。`soul_enhance.py` 默认 **`STYLE['cover']['bg_blur_mix']=0.1`**：清晰视频帧与一层高斯模糊按 **约 10% 混合**（`bg_blur_radius` 生成模糊层），界面仍大致可辨，仅轻微虚化衬托文字。若需更强/更弱，改脚本内两常量，勿回到「整帧 radius=50+ 全糊」。
- **竖条封面取景 = 成片取景（重要）**：竖条模式（非 `--vertical-fit-full`）下，封面底图必须用与最终成片 **相同的 `--crop-vf`** 从横版切片抽帧，**禁止**用整幅 1920×1080 再压成竖条——否则分发/素材库里「封面」与「成片第一帧」不是同一条竖条，观感错位。脚本内由 `create_cover_image(..., cover_extract_vf=vf_use)` 保证与成片一致。
- **字幕**：**封面一结束即叠字幕**（无额外「空几秒再等字」）；SRT 安全起点为封面结束 + **约 0.05s** epsilon，避免与最后一帧封面打架。字幕**居中**在竖条内。先尝试**单次 FFmpeg 通道**（一次 pass 完成所有字幕叠加，最快）；若失败自动回退到分批模式（batch_size=40）；语助词在解析阶段已由 `clean_filler_words` 去除。重新加字幕时加 `--force-burn-subs`。⚠️ 注意：当前 FFmpeg 不支持 drawtext/subtitles 滤镜，只能用 PIL 图像 overlay 方案。（脚本常量：`SUBS_START_AFTER_COVER_SEC`，**默认 0.0**）
- **字幕字形**：Whisper 词级轴常在**中日文之间插空格**，逐字/逐词显字时会像「字与字被撑开」；脚本在 `improve_subtitle_punctuation` 路径对 **CJK 相邻空白**做折叠（`_collapse_cjk_interchar_spaces`），保证整句显示正常、无异常中空。
- **封面标题**：高光 `title` 建议 **4～6 个汉字**；成片内封面主标题最多显示 **6 个汉字**（超长由 `soul_enhance` 自动截断，与文件名 `--title-only` 一致）。
- **竖屏竖条**：**高固定 1080，宽 = analyze 的 OUTPUT_SIZE**，默认不压 498；细节见 `参考资料/竖屏中段裁剪参数说明.md`

### 字幕样式与同步（soul_enhance 内置）

| 项 | 约定 |
|----|------|
| **与封面对比** | 封面为**冷灰青渐变 + 底渐隐 + 顶栏绿**；字幕为**纯描边白字 + 得意黑字体**，简洁不遮挡画面 |
| **纠错** | `transcript.srt` 解析时走 `_improve_subtitle_text`（繁转简、CORRECTIONS 错词、违禁替换、去语助词）；**渲染每一帧前**再走 `improve_subtitle_punctuation`，与口播稿对齐 |
| **重点词** | `KEYWORDS` 列表命中则**亮金色高亮**（同字号同基线，仅颜色区分，避免大字号造成"两排字"），长词优先匹配 |
| **逐字渐显** | 推荐成片加 **`--typewriter-subs`**：同一条字幕时间内前缀逐步加长，更贴人声节奏；配合 CJK 去空格避免字间假空白 |
| **音画对齐** | ① 切片起点与高光表一致（见上表 batch_clip）。② 默认 `SUBTITLE_DELAY_SEC=0`；若 ffprobe 首包音/视频 PTS 差 > 阈值则加小延迟。③ 仍偏差时用 `soul_enhance.py --subtitle-extra-delay 0.15`（秒，正数推迟字幕）整场微调。④ 成片 **先叠字幕再 10% 加速**，字幕与对白同倍率，不因加速错位。 |

### ⚠️ 字幕烧录常见坑（已修复）

| 坑 | 原因 | 修复 |
|---|---|---|
| 字幕全跳过（转录稿异常误判） | `_parse_clip_index` 取到场次号（如 119）而非切片序号（01），导致 highlight_info 为空，start_sec=0 落入噪声区 | 改为取 `_数字_` 模式中**最小值**，119→01=1 ✓ |
| 标题/文件名有下划线 | `sanitize_filename` 保留了 `_` | 现在 `_` 也替换为空格 |
| 字幕烧录极慢（N/5 次 encode） | 原 batch_size=5，180 条字幕需 36 次 FFmpeg 重编码 | 改为单次通道（1 次 pass）；失败时 batch_size=40 兜底 |
| **字幕与声音不对齐** | ① **主因**：`batch_clip -f`（stream copy）且 `-ss` 在 `-i` 前，输出从**关键帧**起剪，实际起点常比 `highlights.start_time` **早 0～3s**，整场 `transcript.srt` 仍按绝对时间裁 → 字与声错位。② 成片 **先烧字幕再整体 setpts/atempo 加速**，字幕与音轨同倍率，加速本身不引入相对漂移。 | **批量切片请用默认精确模式（勿加 `-f`）**：`batch_clip.py` 已改为「`-ss` 粗定位 + `-i` 后再 `-ss` 细裁 + 重编码」，起点与高光表一致；`SUBTITLE_DELAY_SEC=0`，仅当 ffprobe 音/视频首包 PTS 差 > 阈值时小幅 delay。 |
| **封面期间出现字幕** | 字幕时间计算使字幕落在封面段（前 2.5s）内 | `write_clip_srt` 强制过滤 `end <= cover_duration` 的条目，并 `start = max(start, cover_duration)` |
| **字幕含 ASR 噪声行（单字母 L / Agent）** | MLX Whisper 对静音/噪声段产生幻觉字符 | `_is_noise_line()` 提前过滤单字母、重复字符、噪声 token |
| **繁体字幕未转简体** | Soul 派对录音有港台口音，ASR 输出繁体 | `_to_simplified()` 兜底 + CORRECTIONS 扩充 50+ 繁体常用字映射 |
| **字幕「两排字」** | 关键词用更大字号（`keyword_size_add=6`）+ `base_y-1` 偏移，与正文交错形成两行错觉 | `keyword_size_add=0`、关键词 `base_y` 与正文一致、仅颜色区分（v1.9） |
| **字幕整体前移 + 封面叠字幕** | concat demuxer 输出从 t=0 累加，未在开头插入 `[0, subtitle_overlay_start)` 透明段，导致字幕轨比主视频短约 5.5s | 在 `sub_concat.txt` 开头插入 `blank` + `duration=subtitle_overlay_start`（v1.9） |
| **封面后长时间无字幕** | 旧版 `SUBS_START_AFTER_COVER_SEC=3` + SRT `safe_start` 再 +0.3s | 默认改为 **0** + **0.05s** epsilon（v2.0） |
| **逐字字幕字间像被撑开** | Whisper `word_times` 在汉字间带空格 | `_collapse_cjk_interchar_spaces` 写入标点/安全替换链路（v2.0） |
| **封面底图全糊、界面看不清** | 旧版整帧 `GaussianBlur(radius≈52)` + 叠层 | 改为 **清晰帧与模糊层 `Image.blend` 约 10%**（`bg_blur_mix` / `bg_blur_radius`，v2.1） |
| **highlights 时间戳不准** | 某些高光段实际对应静音区，Whisper 产生幻觉 | 在转录稿中搜索话题关键词确认真实时间戳，修正后重新切片 |

---

## 六、竖屏输出两种模式（成片内嵌）

### A. 竖条模式（默认，保持界面真实比例）

用 `analyze_feishu_ui_crop.py`：**深色核心** → **扩边到桌面白** → **默认仅 `crop=W:1080:L:0`**（成片 W×1080，不横向拉伸）。需要固定 498 宽：加 **`--squeeze-498`** 或在 `CROP_VF` 末尾手动加 `scale=498:1080`；需要带内居中再裁 498：**`--center-in-band`**。

| 步骤 | 滤镜（127 场典型） |
|------|------|
| 1 | `crop=598:1080:493:0`（扩边后的内容包络，输出 598×1080） |
| 2 | （可选）`,scale=498:1080:flags=lanczos` 或第二段 `crop=498:1080:…:0` |

### B. 全画面模式（`--vertical-fit-full`）

**不裁中间竖条**：整幅 16:9 **完整入画**，等比缩放到宽度 498，**上下加黑边** 到 1080 高。左侧小程序 + 右侧人像/桌面都会在画面里，适合「画面要显示全」的成片。

- 封面、字幕先在 **完整横版分辨率** 上叠加（`overlay=0:0`），再整体走：  
  `scale=w=498:h=1080:force_original_aspect_ratio=decrease,pad=498:1080:(ow-iw)/2:(oh-ih)/2:color=black`
- 命令：在原有 `soul_enhance.py ... --vertical --title-only` 上增加 **`--vertical-fit-full`**

**输出**：竖条模式为 **W×1080**（W 由当场 analyze）；全画面模式仍为 **498×1080**（letterbox 画布）。

---

## 七、完整命令示例（通用 + 127 场路径）

**0. 塑形（每场先做，见 3.2）**
```bash
cd /path/to/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本
python3 analyze_feishu_ui_crop.py "/path/本场原片.mp4" --at 0.2 --save-dir "/path/xxx_output/裁剪检查"
```

**1. 高光**（模型生成 highlights.json；语助词与节奏见 `参考资料/高光识别提示词.md`）

**2. 剪辑**
```bash
python3 batch_clip.py -i "原视频.mp4" -l highlights.json -o clips/ -p soul112
# 或输出到 切片/，则成片时 -c 指向 切片/
```
⚠️ **不要加 `-f` / `--fast`** 做最终成片：copy 模式关键帧对齐会导致切片起点早于高光表，字幕与声音必歪。草稿试剪可 fast，定稿对齐请用默认（重编码）模式。

**3. 成片**（竖屏条 + 封面 + 字幕 + 去语助词；vf 以 analyze 为准）
```bash
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o 成片/ --vertical --title-only --force-burn-subs
# 推荐（逐字 + 与当场 vf 一致）：--typewriter-subs
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o 成片/ --vertical --title-only --force-burn-subs --typewriter-subs --crop-vf "crop=598:1080:493:0" --overlay-x 493
```

**127 场本机示例**（`~/Movies/soul视频/第127场_20260318_output/`）：
```bash
cd ~/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本
python3 analyze_feishu_ui_crop.py "$HOME/Movies/soul视频/原视频/soul 派对 127场 20260318.mp4" --at 0.2 --save-dir "$HOME/Movies/soul视频/第127场_20260318_output/裁剪检查"
python3 soul_enhance.py \
  -c "$HOME/Movies/soul视频/第127场_20260318_output/切片" \
  -l "$HOME/Movies/soul视频/第127场_20260318_output/highlights.json" \
  -t "$HOME/Movies/soul视频/第127场_20260318_output/transcript.srt" \
  -o "$HOME/Movies/soul视频/第127场_20260318_output/成片" \
  --vertical --title-only --force-burn-subs --typewriter-subs \
  --crop-vf "crop=598:1080:493:0" --overlay-x 493
```

**前缀命名注意**：`-p soul119` 会产生 `soul119_01_xxx.mp4`，`soul_enhance` 取 `_数字_` 中**最小值**为切片序号（如 119→01）。

输出目录结构示例：
```
xxx_output/
  highlights.json
  transcript.srt
  切片/ 或 clips/   # 横版
  裁剪检查/         # analyze 输出（PNG + txt）
  成片/             # 竖屏成片，文件名为标题.mp4
  成片/目录索引.md
```

---

## 八、参数速查

| 项 | 值 |
|----|-----|
| 文件夹 | **切片（或 clips）** + **成片**；另 **`裁剪检查/`** 放标定素材 |
| 成片尺寸 | 竖条 **W×1080**（默认 W 由 analyze）；`--vertical-fit-full` 时为 498×1080 letterbox |
| 成片文件名 | 纯标题（无 01、无 _enhanced） |
| 单段时长 | 60～300 秒（1～5 分钟），每段**仅一个主题**且**完整** |
| 条数/场 | 目标约 **10 条/场**，兼顾**有趣**与**信息完整** |
| 封面底模糊 | 约 **10%** 混入（`bg_blur_mix`），非全糊 |
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
**流程约定**：凡 LTX 生成的片段，统一按成片规范（竖条或 letterbox、封面、字幕）经 soul_enhance 输出，与录播切片一致。

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
