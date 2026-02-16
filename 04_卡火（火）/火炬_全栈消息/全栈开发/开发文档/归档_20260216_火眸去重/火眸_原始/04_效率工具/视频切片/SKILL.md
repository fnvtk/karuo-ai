---
name: 视频切片
description: 视频自动转录+字幕烧录，输出单个成片。触发词：视频切片、处理视频、字幕烧录、转录视频。
---

# 视频切片

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
| **one_video.py** | 一键处理，输出单个成片 | ⭐⭐⭐ 最常用 |
| burn_subtitles_clean.py | 字幕烧录（无阴影） | ⭐⭐ |
| burn_subtitles_pro.py | 字幕烧录（有阴影） | ⭐ |
| fix_subtitles.py | 字幕清洗（繁转简） | ⭐⭐ |
| batch_clip.py | 批量切片 | ⭐ |
| soul_clip.py | Soul派对专用 | ⭐ |

---

## 🛠 环境配置

### 已安装

- **MLX Whisper**: `~/miniforge3/envs/mlx-whisper`
- **字体**: `04_效率工具/视频切片/fonts/`

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
