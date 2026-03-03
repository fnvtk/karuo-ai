---
name: 视频切片
description: Soul派对视频切片 + 切片动效包装（片头/片尾/程序化）+ 剪映思路借鉴（智能剪口播/镜头分割）。触发词含视频剪辑、切片发布、切片动效包装、程序化包装、片头片尾。
group: 木
triggers: 视频剪辑、切片发布、字幕烧录、**切片动效包装、程序化包装、片头片尾、批量封面、视频包装**、镜头切分、场景检测
owner: 木叶
version: "1.3"
updated: "2026-03-03"
---

# 视频切片

> **语言**：所有文档、字幕、封面文案统一使用**简体中文**。soul_enhance 自动繁转简。

> **Soul 视频输出**：Soul 剪辑的成片统一导出到 `/Users/karuo/Movies/soul视频/最终版/`，原视频在 `原视频/`，中间产物在 `其他/`。

> **联动规则**：每次执行视频切片时，自动检查是否需要「切片动效包装」。若用户提到片头/片尾/程序化包装/批量封面，则联动调用 `切片动效包装/10秒视频` 模板渲染，再与切片合成。

## ⭐ Soul派对切片流程（默认）

```
原始视频 → MLX转录 → 字幕转简体 → 高光识别(当前模型/AI) → 批量切片 → soul_enhance → 输出成片
                     ↑                        ↓
            提取后立即繁转简+修正错误    封面+字幕(已简体)+加速10%+去语气词
```

**切片时长**：每段为**完整的一个片段**，时长 **30 秒～300 秒**，由该完整片段起止时间决定。**标题**用一句**刺激性观点**（见 `Soul竖屏切片_SKILL.md`）。

**提问→回答 结构**：若片段内有人提问，前3秒优先展示**提问问题**，再播回答；高光识别填 `question` 且 `hook_3sec` 与之一致，成片整条去语助词。详见 `参考资料/视频结构_提问回答与高光.md`、`参考资料/高光识别提示词.md`。

**Soul 竖屏专用**：抖音/首页用竖屏成片、完整参数与流程见 → **`Soul竖屏切片_SKILL.md`**（竖屏 498×1080、crop 参数、批量命令）。

### 一键命令（Soul派对专用）

#### 一体化流水线（推荐）

```bash
cd 03_卡木（木）/木叶_视频内容/视频切片/脚本
conda activate mlx-whisper
python3 soul_slice_pipeline.py --video "/path/to/soul派对会议第57场.mp4" --clips 6

# 仅重新烧录（字幕转简体后重跑增强）
python3 soul_slice_pipeline.py -v "视频.mp4" -n 6 --skip-transcribe --skip-highlights --skip-clips
```

流程：**转录 → 字幕转简体 → 高光识别 → 批量切片 → 增强**

#### 分步命令

```bash
# 1. 转录（MLX Whisper，约3分钟/2.5小时视频）
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper
mlx_whisper audio.wav --model mlx-community/whisper-small-mlx --language zh --output-format all

# 2. 高光识别（Ollama → 规则；流水线会在读取 transcript 前自动转简体）
python3 identify_highlights.py -t transcript.srt -o highlights.json -n 6

# 3. 切片
python3 batch_clip.py -i 视频.mp4 -l highlights.json -o clips/ -p soul

# 4. 增强处理（封面+字幕+加速，soul_enhance）
python3 soul_enhance.py -c clips/ -l highlights.json -t transcript.srt -o clips_enhanced/
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

### Soul 竖屏成片（横版源 → 竖屏中段去白边）

**约定**：以后剪辑 Soul 视频，成片统一做「竖屏中段」裁剪：横版 1920×1080 只保留中间竖条并去掉左右白边，输出 498×1080 竖屏。

| 步骤 | 说明 |
|------|------|
| 源 | 横版 1920×1080（soul_enhance 输出） |
| 1 | 取竖条 608×1080，起点 **x=483**（相对画面左） |
| 2 | 裁掉左侧白边 60px、右侧白边 50px → 内容区宽 498 |
| 输出 | **498×1080** 竖屏，仅内容窗口 |

**FFmpeg 一条命令（固定参数）：**

```bash
# 单文件。输入为 1920×1080 的 enhanced 成片
ffmpeg -y -i "输入_enhanced.mp4" -vf "crop=608:1080:483:0,crop=498:1080:60:0" -c:a copy "输出_竖屏中段.mp4"
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
| **scene_detect_to_highlights.py** | 镜头/场景检测 → highlights.json（PySceneDetect，可接 batch_clip） | ⭐⭐ |
| chapter_themes_to_highlights.py | 按章节 .md 主题提取片段（本地模型→highlights.json） | ⭐⭐⭐ |
| identify_highlights.py | 高光识别（Ollama→规则） | ⭐⭐ |
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

### 依赖检查

```bash
# FFmpeg
ffmpeg -version

# MLX环境
eval "$(~/miniforge3/bin/conda shell.zsh hook)"
conda activate mlx-whisper
python -c "import mlx_whisper; print('OK')"

# Python库
pip3 list | grep -E "moviepy|Pillow|opencc"
```

### 安装依赖

```bash
pip3 install --break-system-packages moviepy Pillow opencc-python-reimplemented

# 镜头切分（可选）：PySceneDetect
pip3 install 'scenedetect[opencv]'
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
