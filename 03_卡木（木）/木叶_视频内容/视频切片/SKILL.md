---
name: 视频切片
description: Soul派对视频切片处理。触发词：视频切片、Soul切片、派对切片、处理视频。所有文档与字幕输出统一简体中文。
group: 木
triggers: 视频剪辑、切片发布、字幕烧录
owner: 木叶
version: "1.1"
updated: "2026-02-22"
---

# 视频切片

> **语言**：所有文档、字幕、封面文案统一使用**简体中文**。soul_enhance 自动繁转简。

## ⭐ Soul派对切片流程（默认）

```
原始视频 → MLX转录 → 字幕转简体 → 高光识别(Ollama→规则) → 批量切片 → soul_enhance → 输出成片
                     ↑                        ↓
            提取后立即繁转简+修正错误    封面+字幕(已简体)+加速10%+去语气词
```

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
/Users/karuo/Documents/个人/卡若AI/04_效率工具/视频切片/
├── scripts/
│   ├── one_video.py          # ⭐ 一键处理
│   ├── burn_subtitles_clean.py
│   └── ...
├── fonts/
│   ├── SourceHanSansSC-Heavy.otf
│   └── ...
└── SKILL.md
```
