---
name: 视频切片
description: Soul派对视频切片 + 快速混剪 + 切片动效包装（片头/片尾/程序化）+ 剪映思路借鉴（智能剪口播/镜头分割）。触发词含视频剪辑、切片发布、快速混剪、切片动效包装、程序化包装、片头片尾。
group: 木
triggers: 视频剪辑、切片发布、字幕烧录、全画面标定、竖屏裁剪、飞书录屏白边、**快速混剪、混剪预告、快剪串联、切片动效包装、程序化包装、片头片尾、批量封面、视频包装**、镜头切分、场景检测、**运营短切片、15秒切片、30秒切片、京剧梗、热点密度切片**
owner: 木叶
version: "1.5"
updated: "2026-03-20"
---

# 视频切片

> **语言**：所有文档、字幕、封面文案统一使用**简体中文**。soul_enhance 自动繁转简。

> **ASR 纠错**：字幕/封面用词除脚本内 `_CORRECTIONS_BASE` 外，会**自动合并** `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json`（与卡若语音输入共用词表，JSON 覆盖同名 key）。迭代误听只改该 JSON 即可。

> **Soul 视频输出**：Soul 剪辑的成片统一导出到 `/Users/karuo/Movies/soul视频/最终版/`，原视频在 `原视频/`，中间产物在 `其他/`。

> **联动规则**：每次执行视频切片时，自动检查是否需要「切片动效包装」或「快速混剪」。若用户提到片头/片尾/程序化包装/批量封面，则联动调用 `切片动效包装/10秒视频` 模板渲染，再与切片合成。若用户提到快速混剪/混剪预告/快剪串联，则在切片或成片生成后再调用 `脚本/quick_montage.py` 输出一条节奏版预告。

## ⭐ Soul派对切片流程（默认）

```
原始视频 → MLX转录 → 字幕转简体 → 高光识别(API 优先/最佳模型，失败则 Ollama→规则) → 批量切片 → soul_enhance → 输出成片
                     ↑                        ↓
            提取后立即繁转简+修正错误    封面+字幕(已简体)+加速10%+去语气词
```

**切片时长（两种模式）**：

| 模式 | 单段时长 | 条数/场（建议） | 选题侧重 |
|------|-----------|-----------------|----------|
| **深度切片（默认）** | **30 秒～300 秒**，完整语义单元 | 6～10 | 提问→回答、整场观点 |
| **运营短切片** | **15～30 秒**（可 `--min-duration` / `--max-duration` 微调） | **20～30**（默认脚本 **24**） | **京剧/戏曲比喻梗**、**当场热点词**、强反差金句，适合抖音高密度测试 |

运营短切片流程与深度切片相同（转录 → `identify_highlights` → `batch_clip` → `soul_enhance`），区别在 **高光 preset** 与 **prompt**：`identify_highlights.py --preset ops-short` 会在提示词中要求模型**整场均匀取点**，并优先京剧相关比喻/唱腔梗与热点表达；过滤逻辑会**丢弃**短于 15 秒或长于 30 秒的区间（深度模式只卡最短 60 秒、不卡上限）。

**开场 ASR 噪声**：派对录播常在开场出现同一短句循环（如「我看你不太好」），会把模型注意力锁死在前几分钟。**ops-short 默认**将送模型的文字稿与成片时间轴**从约 7:30（450 秒）之后**才开始（`--prompt-min-sec`，可改）。若你的场次正片明显更早开始，可改小该值或临时改 `long` 再人工筛 `highlights.json`。

**批量节奏（人工剪辑对齐）**：一场录播可先按 **15～30 条**为一轮做高光与切片，再进成片；多轮叠加时注意 `highlights.json` 备份，避免覆盖。

**标题**：深度模式用一句**刺激性观点**；短切片标题 **4～10 个汉字** 为宜（见 `Soul竖屏切片_SKILL.md`）。

**提问→回答 结构**：若片段内有人提问，前3秒优先展示**提问问题**，再播回答；高光识别填 `question` 且 `hook_3sec` 与之一致，成片整条去语助词。详见 `参考资料/视频结构_提问回答与高光.md`、`参考资料/高光识别提示词.md`。

**Soul 竖屏专用**：抖音/首页用竖屏成片、完整参数与流程见 → **`Soul竖屏切片_SKILL.md`**（竖屏 498×1080、crop 参数、批量命令）。

### 最新切片风格（当前默认）

以后默认按这套风格出切片与成片：

| 项 | 当前默认风格 |
|------|------|
| **封面** | **Soul 绿 + 半透明质感 + 深色渐变** |
| **前3秒** | **优先提问→回答**，有提问时 Hook = `question` |
| **标题** | **一句刺激性观点**，文件名 = 封面标题 = `highlights.title` |
| **字幕** | 居中、白字黑描边、关键词亮金黄高亮 |
| **节奏** | 去语助词 + 整体加速 10% |
| **成片尺寸** | 竖屏 **498×1080** |

这套风格与 `参考资料/高光识别提示词.md`、`参考资料/热点切片_标准流程.md`、`Soul竖屏切片_SKILL.md` 保持一致。

### 一键命令（Soul派对专用）

#### 一体化流水线（推荐）

```bash
cd 03_卡木（木）/木叶_视频内容/视频切片/脚本
conda activate mlx-whisper
python3 soul_slice_pipeline.py --video "/path/to/soul派对会议第57场.mp4" --clips 6

# 运营短切片（15～30 秒 × 约 24 条，京剧梗+热点优先，两目录+竖屏成片）
python3 soul_slice_pipeline.py -v "视频.mp4" -o "/path/to/场次_output" --two-folders --ops-short --prefix soul127

# 已转录场次仅重跑高光+切片+成片（省 MLX）
python3 soul_slice_pipeline.py -v "视频.mp4" -o "/path/to/场次_output" --two-folders --ops-short --skip-transcribe --prefix soul127

# 自定义条数与时长区间
python3 soul_slice_pipeline.py -v "视频.mp4" -o "/path/to/out" --two-folders --highlight-preset ops-short -n 28 --min-clip-sec 10 --max-clip-sec 30

# 仅重新烧录（字幕转简体后重跑增强）
python3 soul_slice_pipeline.py -v "视频.mp4" -n 6 --skip-transcribe --skip-highlights --skip-clips

# 切片+成片后，额外生成一条快速混剪
python3 soul_slice_pipeline.py -v "视频.mp4" -n 8 --two-folders --quick-montage
```

**分步：仅高光（运营短切片）**

```bash
python3 identify_highlights.py -t transcript.srt -o highlights.json --preset ops-short -n 24
# 或显式时长 + 长视频也强调京剧/热点：
python3 identify_highlights.py -t transcript.srt -o highlights.json --preset ops-short -n 26 --min-duration 15 --max-duration 30 --ops-jingju-hotspot
```

流程：**转录 → 字幕转简体 → 高光识别 → 批量切片 → 增强**

#### 分步命令

```bash
# 1. 转录（MLX Whisper，约3分钟/2.5小时视频）
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper
mlx_whisper audio.wav --model mlx-community/whisper-small-mlx --language zh --output-format all

# 2. 高光识别（API 优先，未配置则 Ollama → 规则；流水线会在读取 transcript 前自动转简体）
python3 identify_highlights.py -t transcript.srt -o highlights.json -n 6
# 需配置 OPENAI_API_KEY 或 OPENAI_API_BASES/KEYS/MODELS，默认模型 gpt-4o

# 3. 切片
python3 batch_clip.py -i 视频.mp4 -l highlights.json -o clips/ -p soul

# 4. 增强处理（封面+字幕+加速，soul_enhance）
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o clips_enhanced/
```

### 快速混剪（新增）

适用场景：已经有 `切片/` 或 `成片/`，需要快速出一条 20～40 秒节奏版预告、招商预热视频、短视频串联版。

**默认策略**：

| 项 | 规则 |
|------|------|
| **顺序** | 优先按 `virality_score` / `rank` 排序；无分数时按序号 |
| **取样** | 每条默认截取 **4 秒**高密度片段 |
| **成片目录输入** | 自动跳过前 **2.6 秒**封面，避免混剪里全是封面 |
| **输出** | 统一分辨率、统一节奏后拼成一条 `快速混剪.mp4` |

```bash
# 从成片目录生成快速混剪（推荐）
python3 脚本/quick_montage.py \
  -i "/path/to/成片" \
  -o "/path/to/快速混剪.mp4" \
  -l "/path/to/highlights.json" \
  --source-kind final \
  -n 8 \
  -s 4

# 一体化流水线里直接附带生成
python3 脚本/soul_slice_pipeline.py \
  -v "/path/to/原视频.mp4" \
  --two-folders \
  --quick-montage \
  --montage-source finals \
  --montage-max-clips 8 \
  --montage-seconds 4
```

#### 按章节主题提取（推荐：第9章单场成片）

以**章节 .md 正文**为来源提取核心主题，再在转录稿中匹配时间，不限于 5 分钟、片段数与章节结构一致。详见 `参考资料/主题片段提取规则.md`。

```bash
# 从章节生成 highlights，再走 batch_clip + soul_enhance
python3 chapter_themes_to_highlights.py -c "第112场.md" -t transcript.srt -o highlights_from_chapter.json
python3 batch_clip.py -i 视频.mp4 -l highlights_from_chapter.json -o clips/ -p soul112
python3 soul_enhance.py -c clips/ -l highlights_from_chapter.json -t transcript.srt -o clips_enhanced/
```

- **主题来源**：章节 .md 按 `---` 分块，每块一个主题；文件名由 batch_clip 按 `前缀_序号_标题` 生成（标题仅保留中文与安全字符）。

### Soul 竖屏成片（横版源 → 全画面标定竖条）

**约定**：成片统一 **498×1080**。裁剪参数必须以 **1920×1080 全画面** 为准标定，避免右侧吃进飞书/桌面**白底**，并保证**整段深色小程序界面**完整入画。

#### 全画面参数（当前默认，与 `soul_enhance.py` / `soul_vertical_crop.py` 一致）

| 步骤 | 说明 |
|------|------|
| 源 | 横版 1920×1080（封面字幕叠在横版上，最后再裁竖屏） |
| 0（标定） | 对原片 **20%** 抽帧，`analyze_feishu_ui_crop.py`：**深色核心**→**扩边到桌面白**→默认 **scale 到 498** |
| 1 | `crop=W:1080:L:0`：扩边后的内容包络（127 场典型 W=598,L=493） |
| 2 | `scale=498:1080:flags=lanczos`：整包络横向压到 498（不切左右边；略压扁） |
| 叠加 | 横版上封面/字幕 **x=L**（scale 模式与包络左缘对齐；两段裁模式仍为 X+Y） |
| 输出 | **498×1080** 竖屏 |

**每场若窗口位置变了**，不要用猜的 x；先截全画面再跑：

```bash
cd 03_卡木（木）/木叶_视频内容/视频切片/脚本
# 全画面截图 或 原片自动抽帧
python3 analyze_feishu_ui_crop.py "/path/to/全画面.jpg"
# 或
python3 analyze_feishu_ui_crop.py "/path/to/原片.mp4" --at 0.2
```

将输出的 `CROP_VF` 传给：`python3 soul_enhance.py ... --vertical --crop-vf '...'`（`OVERLAY_X` 脚本会一并打印；也可用 `--overlay-x` 覆盖）。

**全画面入画（不裁竖条）**：加 `--vertical-fit-full`，整幅 16:9 缩放入 498×1080 + 上下黑边，左右内容都可见。详见 `Soul竖屏切片_SKILL.md` 第六节 B。

详见：`参考资料/竖屏中段裁剪参数说明.md`、`脚本/analyze_feishu_ui_crop.py`。

**FFmpeg 一条命令（固定参数）：**

```bash
# 单文件。输入为 1920×1080 的 enhanced 成片
ffmpeg -y -i "输入_enhanced.mp4" -vf "crop=598:1080:493:0,scale=498:1080:flags=lanczos" -c:a copy "输出_竖屏中段.mp4"
```

**批量对某目录下所有 \*_enhanced.mp4 做竖屏中段：**

```bash
# 脚本目录下执行，或直接调用
python3 脚本/soul_vertical_crop.py --dir "/path/to/clips_enhanced" --suffix "_竖屏中段"
```

参数说明见：`参考资料/竖屏中段裁剪参数说明.md`。

### 增强功能说明

| 功能 | 说明 |
|------|------|
| **封面贴片** | 前2.5秒 Hook，苹方/思源黑体 |
| **字幕烧录** | 关键词加粗加大亮金黄突出，去语助词+去空格 |
| **加速10%** | 节奏更紧凑，适合短视频 |

### 时间预估

| 步骤 | 2.5小时视频 |
|------|------------|
| MLX转录 | 3分钟 |
| 切片10个 | 2分钟 |
| 增强处理 | 8分钟 |
| **总计** | **约13分钟** |

---

## AI 生成与 LTX 可选集成

在「已有录播 → 转录→高光→切片→成片」主流程外，可选用 **LTX**（GitHub: Lightricks/LTX-Video、LTX-2、LTX-Desktop-MPS）实现：

| 能力 | 用途 |
|------|------|
| **Retake**（LTX-2 / LTX Desktop） | 对已有视频**某段时间**重生成，替换口误/补拍，再走成片流程 |
| **Text/Image/Audio to video** | AI 生成口播替代、片头片尾、插播片段，生成 mp4 后进 `切片/` 或成片流程 |
| **Video extension** | 片段前后自然延长，衔接切片 |
| **自动 Prompt 增强** | 高光/标题文案 → 更易被生成模型理解，便于 I2V/Retake |

**详细能力表与 API/本地/Desktop 接入**：见 `参考资料/LTX_能力与集成说明.md`。  
**Soul 竖屏场景**：见 `Soul竖屏切片_SKILL.md` 第九节「AI 生成与 LTX 可选集成」。  
**约定**：LTX 生成的片段统一经 soul_enhance（封面+字幕+竖屏）输出，与录播成片一致。

---

## 📹 通用视频处理

一键处理视频：转录 → 字幕清洗 → 视频增强 → 烧录字幕 → **输出单个成片**

---

## ⚡ 一键命令

```bash
# 最简用法 - 输出: 视频名_带字幕.mp4
python3 /Users/karuo/Documents/个人/卡若AI/04_效率工具/视频切片/scripts/one_video.py -i "视频.mp4"

# 指定输出路径
python3 scripts/one_video.py -i "视频.mp4" -o "成片.mp4"
```

### 处理流程

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ 提取音频 │──▶│MLX转录  │──▶│字幕清洗 │──▶│视频增强 │──▶│烧录字幕 │
│  (5秒)  │   │(1-3分钟)│   │繁转简   │   │降噪美颜 │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                                              │
                                                              ▼
                                                     ┌────────────────┐
                                                     │ 单个带字幕成片 │
                                                     │   可直接发布   │
                                                     └────────────────┘
```

### 时间预估

| 视频时长 | 处理时间 |
|---------|---------|
| 5分钟 | 1-2分钟 |
| 30分钟 | 5-8分钟 |
| 1小时 | 10-15分钟 |

---

## 🎯 自动优化项

脚本自动完成以下优化，无需手动操作：

| 优化项 | 说明 |
|--------|------|
| 繁转简 | 自动将繁体字幕转为简体 |
| 去语气词 | 删除"嗯"、"啊"、"那个"等 |
| 修正错误 | 自动修正常见转录错误 |
| 音频降噪 | FFT降噪+高低频过滤 |
| 画面美颜 | 亮度+饱和度微调 |
| 音量标准化 | 统一音量级别 |

---

## 📝 手动分步操作

如需更精细控制，可分步执行：

### 1. 转录

```bash
# 激活环境
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper

# 提取音频
ffmpeg -y -i "视频.mp4" -vn -ar 16000 -ac 1 audio.wav

# MLX Whisper转录
mlx_whisper audio.wav --model mlx-community/whisper-small-mlx --language zh --output-format srt
```

### 2. 字幕清洗

```bash
# 繁转简+修正错误
python3 scripts/fix_subtitles.py --input transcript.srt --output clean.srt
```

### 3. 视频增强

```bash
# 降噪+美颜
ffmpeg -y -i "视频.mp4" \
  -vf "eq=brightness=0.05:saturation=1.1" \
  -af "afftdn=nf=-25:nr=10:nt=w,highpass=f=80,lowpass=f=8000,volume=1.2" \
  -c:v h264_videotoolbox -b:v 5M \
  -c:a aac -b:a 128k \
  enhanced.mp4
```

### 4. 烧录字幕

```bash
# Clean版（推荐）
python3 scripts/burn_subtitles_clean.py -i enhanced.mp4 -s clean.srt -o 成片.mp4
```

---

## 🎨 字幕样式

### 默认样式（Clean版）

| 元素 | 字号 | 颜色 | 效果 |
|------|------|------|------|
| 内容字幕 | 42px（竖屏）/ 36px（横屏） | 白色 | 黑色描边，无阴影 |
| 关键词 | 同上 | 金黄色 | 自动高亮 |

### 关键词高亮列表

自动高亮的关键词（金黄色）：
- 数字：100万、30万、10万、5万、1万
- 概念：私域、AI、自动化、矩阵、IP、获客、变现、转化
- 平台：抖音、公众号、微信、存客宝

---

## 🔊 音频处理参数

| 滤镜 | 作用 | 参数 |
|------|------|------|
| highpass | 去低频杂音 | f=80Hz |
| lowpass | 去高频噪音 | f=8000Hz |
| afftdn | FFT降噪 | nf=-25, nr=10 |
| volume | 音量调整 | 1.2倍 |

---

## 📁 脚本列表

| 脚本 | 功能 | 使用频率 |
|------|------|---------|
| **soul_slice_pipeline.py** | Soul 切片一体化流水线 | ⭐⭐⭐ 最常用 |
| **soul_enhance.py** | 封面+字幕(简体)+加速+去语气词 | ⭐⭐⭐ |
| **soul_vertical_crop.py** | Soul 竖屏中段批量裁剪（横版→498×1080 去白边） | ⭐⭐⭐ |
| **kill_ffmpeg_when_clip_done.py** | 剪辑结束后自动关掉 ffmpeg（监视剪映/PID 或立即杀） | ⭐ 按需 |
| **scene_detect_to_highlights.py** | 镜头/场景检测 → highlights.json（PySceneDetect，可接 batch_clip） | ⭐⭐ |
| chapter_themes_to_highlights.py | 按章节 .md 主题提取片段（本地模型→highlights.json） | ⭐⭐⭐ |
| identify_highlights.py | 高光识别（API→Ollama→规则；`--preset ops-short` 为 15～30 秒运营密度） | ⭐⭐ |
| batch_clip.py | 批量切片 | ⭐⭐ |
| one_video.py | 单视频一键成片 | ⭐⭐ |
| burn_subtitles_clean.py | 字幕烧录（无阴影） | ⭐ |
| fix_subtitles.py | 字幕清洗（繁转简） | ⭐ |

---

## 🛠 环境配置

### 已安装（默认使用MLX Whisper）

- **MLX Whisper**: `~/miniforge3/envs/mlx-whisper` ⭐ **默认转录引擎**
  - Apple Silicon优化，比CPU Whisper快10倍+
  - 2.5小时视频转录仅需3分钟
- **字体**: `03_卡木（木）/木叶_视频内容/视频切片/fonts/`（优先）
- **字幕**: 统一简体中文（soul_enhance 自动繁转简）

### 转录命令（默认）

```bash
# 激活MLX环境
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper

# MLX Whisper转录（推荐）
mlx_whisper audio.wav --model mlx-community/whisper-small-mlx --language zh --output-format all
```

### 高光识别模型（API 优先）

高光识别默认使用**当前可用最佳模型**：优先走 **OpenAI 兼容 API**（见下），未配置或失败时再用本地 Ollama，最后规则兜底。

- **单接口**：`OPENAI_API_BASE`、`OPENAI_API_KEY`、`OPENAI_MODEL`（默认 `gpt-4o`）。
- **多接口故障切换**：`OPENAI_API_BASES`、`OPENAI_API_KEYS`、`OPENAI_MODELS`（逗号分隔，按顺序尝试）。
- 不写死密钥，从环境变量读取；详见 `运营中枢/参考资料/卡若AI异常处理与红线.md` 与 API 稳定性规则。

### 依赖检查

```bash
# FFmpeg
ffmpeg -version

# MLX环境
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper
python -c "import mlx_whisper; print('OK')"

# Python库
pip3 list | grep -E "moviepy|Pillow|opencc|openai"
```

### 安装依赖

```bash
pip3 install --break-system-packages moviepy Pillow opencc-python-reimplemented

# 镜头切分（可选）：PySceneDetect
pip3 install 'scenedetect[opencv]'
```

---

## 🔧 剪辑结束后自动关 ffmpeg

脚本 **soul_enhance**、**batch_clip**、**soul_slice_pipeline** 在退出时（含 Ctrl+C）会自动结束本进程启动的 ffmpeg 子进程，避免剪辑结束后仍占用 CPU。

若使用 **剪映/VideoFusion** 等 GUI 剪辑，可先运行监视脚本，剪辑应用退出后自动杀 ffmpeg：

```bash
# 先启动监视，再打开剪映；关掉剪映后会自动结束 ffmpeg
python3 脚本/kill_ffmpeg_when_clip_done.py --app VideoFusion

# 或监视指定 PID
python3 脚本/kill_ffmpeg_when_clip_done.py --pid 12345

# 仅立即杀掉当前所有 ffmpeg
python3 脚本/kill_ffmpeg_when_clip_done.py --kill-now
```

---

## ❓ 常见问题

### Q: 转录不准确？
A: 使用medium模型：将脚本中的`whisper-small-mlx`改为`whisper-medium-mlx`

### Q: 字幕太小/太大？
A: 修改`one_video.py`第142行的`font_size`值

### Q: 处理太慢？
A: 
1. 视频已自动使用VideoToolbox GPU加速
2. 字幕默认限制80条以内

### Q: 输出文件太大？
A: 降低码率：将`-b:v 5M`改为`-b:v 3M`

---

## 🎬 切片动效包装（联动能力）

用 React 程序化生成片头/片尾/封面，与切片产出一键合成。**每次执行视频切片时，若用户提到片头/片尾/包装/批量封面，则联动本能力**。

### 联动规则（必守）

| 场景 | 是否联动 | 操作 |
|:---|:---|:---|
| 用户说片头/片尾/程序化包装/批量封面 | ✓ | 先执行切片 → 渲染动效模板 → 合成 |
| 默认 Soul 切片、单视频成片 | 可选 | 执行后提示可选用切片动效包装 |

### 10秒视频模板（卡若AI 品牌）

路径：`视频切片/切片动效包装/10秒视频/`

| Composition | 说明 |
|:---|:---|
| Video10s | 简洁版：渐变 + 标题 + 副标题 |
| Video10sRich | 内容丰富版：粒子 + 极限环 + 流动线条 |

规格：竖屏 1080×1920，10 秒，30fps。

### 一键命令（动效包装）

```bash
cd 03_卡木（木）/木叶_视频内容/视频切片/切片动效包装/10秒视频

# 预览
npm run dev

# 渲染片头（简洁版）
npx remotion render src/index.ts Video10s /Users/karuo/Documents/卡若Ai的文件夹/导出/程序化视频/片头.mp4

# 渲染片头（丰富版）
npx remotion render src/index.ts Video10sRich /Users/karuo/Documents/卡若Ai的文件夹/导出/程序化视频/片头_丰富.mp4
```

### 与切片合成流程

```
切片产出(clips_enhanced/) 
    ↓
【联动】渲染片头/片尾
    ↓
ffmpeg 合成：片头 + 切片 + 片尾
```

### 参考资料

- 速查：`视频切片/切片动效包装/参考资料/切片动效包装速查.md`
- 官方：https://www.remotion.dev/docs

---

## 🎞 剪映思路借鉴与自实现（可选能力）

> 参考 **剪映专业版**（`/Applications/VideoFusion-macOS.app`）内可读配置与流程，用开源方案自实现「智能剪口播」与「智能镜头分割」，不依赖剪映二进制。详见：`参考资料/剪映_智能剪口播与智能片段分割_逆向分析.md`。

### 智能剪口播（口播稿 → 按文案/时间轴切片段）

| 剪映逻辑 | 本技能对应实现 |
|----------|----------------|
| 语音→文字 + 时间戳 | **MLX Whisper** 转录 → `transcript.srt` |
| 按文案智能剪、口播稿↔时间轴对齐 | **高光识别**（`identify_highlights` / `chapter_themes_to_highlights`）→ `highlights.json` → `batch_clip` |
| 前端配置键 | `script_ai_cut_config`、`transcript_options`（仅作对照，不读写剪映） |

**结论**：现有流程「转录 → 字幕转简 → 高光识别 → 批量切片 → soul_enhance」已覆盖「智能剪口播」能力；按句/按段细切可与 `transcript.srt` 时间戳结合，在 `highlights.json` 中按句生成条目即可。

### 智能镜头分割（按镜头/场景切分）

剪映 **SceneEditDetection** 思路（仅借鉴思路与参数，算法用开源实现）：

- **输入**：帧序列；剪映内部为 96×96 小图 + 数组缓冲。
- **算法思路**：图像特征 + 滑动窗口 + 后处理阈值 → 输出镜头边界。
- **剪映可读参数**（`SceneEditDetection/config.json`）：  
  `sliding_window_size: 7`、`img_feat_dims: 128`、`post_process_threshold: 0.35`、backbone/predhead 模型名（内部用，不引用）。

**自实现方案**：使用 **PySceneDetect**（ContentDetector/AdaptiveDetector），按阈值与最小场景长度得到切点，再转为与 `batch_clip` 兼容的 `highlights.json`。

**一键：镜头检测 → highlights → 批量切片 → 增强**

```bash
cd 03_卡木（木）/木叶_视频内容/视频切片/脚本
pip install 'scenedetect[opencv]'   # 仅首次

# 镜头检测 → 生成 highlights.json
python3 scene_detect_to_highlights.py -i "原视频.mp4" -o "输出目录/highlights_from_scenes.json" -t 27 --min-scene-len 15

# 用生成的 highlights 做切片 + 增强（与现有流水线一致）
python3 batch_clip.py -i "原视频.mp4" -l "输出目录/highlights_from_scenes.json" -o "输出目录/clips/" -p scene
python3 soul_enhance.py -c "输出目录/clips/" -l "输出目录/highlights_from_scenes.json" -t "输出目录/transcript.srt" -o "输出目录/clips_enhanced/"
```

**参数速查**：

| 参数 | 说明 | 建议 |
|------|------|------|
| `--threshold` / `-t` | 内容变化阈值，越大切点越少 | 27（可试 20～35） |
| `--min-scene-len` | 最小场景长度（帧） | 15 |
| `--min-duration` | 过滤短于 N 秒的片段 | 按需 |
| `--max-clips` / `-n` | 最多保留片段数 | 0=不限制 |

**与「高光切片」二选一**：  
- **高光切片**：按话题/金句/提问（需转录 + 高光识别），适合口播、访谈。  
- **镜头切片**：按画面切换切分，适合多机位、快剪、无稿素材；可先跑 `scene_detect_to_highlights` 再走同一套 `batch_clip` + `soul_enhance`。

### 参考资料（剪映与流程）

- **剪映逆向分析**：`03_卡木（木）/木叶_视频内容/视频切片/参考资料/剪映_智能剪口播与智能片段分割_逆向分析.md`  
  - 智能剪口播 H5 路径、智能片段分割 config 与参数、自实现建议与合规说明。
- **热点切片标准流程**：`参考资料/热点切片_标准流程.md`（五步、两目录、命令速查）。
- **高光识别提示词**：`参考资料/高光识别提示词.md`（提问→回答、节奏感、快速混剪优先片段规则）。

---

## 📊 输出示例

```
输入: 会议录像.mp4 (500MB, 30分钟)
      ↓
输出: 会议录像_带字幕.mp4 (200MB)
      - 中文字幕已烧录
      - 音频已降噪
      - 画面已优化
      - 可直接发布抖音/视频号
```

---

## 🔗 工作目录

```
03_卡木（木）/木叶_视频内容/视频切片/
├── 脚本/
│   ├── soul_slice_pipeline.py      # ⭐ Soul 一体化
│   ├── soul_enhance.py             # ⭐ 封面+字幕+加速
│   ├── scene_detect_to_highlights.py  # 镜头检测→highlights（剪映思路自实现）
│   ├── one_video.py                # 单视频成片
│   └── ...
├── 参考资料/
│   ├── 剪映_智能剪口播与智能片段分割_逆向分析.md  # 剪映思路与参数参考
│   ├── 热点切片_标准流程.md
│   └── 竖屏中段裁剪参数说明.md
├── 切片动效包装/                  # 联动能力：片头/片尾/程序化
│   ├── 10秒视频/                  # React 程序化模板
│   └── 参考资料/切片动效包装速查.md
├── fonts/
└── SKILL.md
```
