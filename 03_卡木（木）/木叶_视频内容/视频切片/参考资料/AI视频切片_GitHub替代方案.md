# AI 视频切片 - GitHub 与替代方案

> 卡若AI 视频切片 Skill 的简化方案与可集成替代
> 更新：2026-02-03

## 一、当前方案（卡若AI 本地方案）

| 组件 | 实现 | 说明 |
|------|------|------|
| **转录** | MLX Whisper | 本地、快速，无 API 依赖 |
| **高光识别** | Ollama → Groq → 规则 | 级联，不依赖 Gemini |
| **切片** | FFmpeg batch_clip | 标准工具 |
| **增强** | FFmpeg drawtext / 复制 | drawtext 不可用时直接复制切片 |

**级联顺序**：Ollama（卡若AI 本地 qwen2.5:1.5b）→ Groq（免费，需 GROQ_API_KEY）→ 规则备用

---

## 二、GitHub 开源方案（可借鉴）

### 1. 简洁可集成

| 项目 | 语言 | 说明 | 集成难度 |
|------|------|------|----------|
| [video-highlight-tool](https://github.com/ALICE-YEN/video-highlight-tool) | TypeScript | AI 高光 clips + 转录 | 中 |
| [VidBit-Video-Summarizer](https://github.com/Alapan121/VidBit-Video-Summarizer) | JavaScript | 端到端：摘要+转录+高光 | 低 |
| [ABHINXXV/YTvideoShortner](https://github.com/ABHINXXV/YTvideoShortner) | JavaScript | YouTube 摘要/缩短 | 低 |

### 2. YouTube 专用（yt-dlp + AI）

| 项目 | 说明 |
|------|------|
| youtube-highlighter | Groq + yt-dlp，YouTube 高光 |
| yt-transcript-gpt | 用 Gemini 分析 YouTube 字幕 |
| ClipCatch | Python，摘要 + 评论情感 |

### 3. 商业/闭源（参考）

| 产品 | 说明 |
|------|------|
| **OpusClip** | GitHub 官方在用，长视频→Shorts，一键剪辑 |
| **Video Highlight** | 37+ 语言，时间戳摘要，可导出 Notion/Readwise |
| **Sieve Highlights** | LLM + ML，按「最有趣」「最动作」等自然语言搜高光 |
| **ClipSense** | OpenRouter，类似高光识别 |

---

## 三、卡若AI 视频能力与替代

### 本地优先（推荐）

| 能力 | 工具 | 无网络时 |
|------|------|----------|
| 转录 | MLX Whisper / Ollama Whisper | ✅ 可用 |
| 高光识别 | Ollama qwen2.5:1.5b | ✅ 可用 |
| 切片 | FFmpeg | ✅ 可用 |
| 封面/Hook | FFmpeg drawtext | 需 libfreetype |
| 无 drawtext | 复制原始切片 | 流水线自动降级 |

### 云端可选

| 能力 | 工具 | 说明 |
|------|------|------|
| 高光识别 | Groq | 免费层，`pip install groq`，`GROQ_API_KEY` |
| 转录 | 云端 Whisper API | 网络依赖 |
| 高光识别 | Gemini | 当前接口不可用，已移除 |

### FFmpeg drawtext 说明

- 默认 `brew install ffmpeg` 可能无 `drawtext`（缺 libfreetype）
- 可选：`brew install ffmpeg@7` 或自行编译 `--enable-libfreetype`
- 当前增强：enhance_clips 用 drawtext；无 drawtext 时流水线直接复制切片

---

## 四、依赖一览

```
# 核心（必须）
openai-whisper 或 mlx-whisper
yt-dlp
requests
Pillow

# 高光识别
# Ollama + qwen2.5:1.5b（本地，无需 pip）
groq  # 可选，pip install groq
```

---

## 五、推荐组合（最简）

1. **本地全流程**：MLX Whisper → Ollama → FFmpeg（无 drawtext 则复制切片）
2. **提升质量**：设置 `GROQ_API_KEY`，Ollama 失败时自动用 Groq
3. **无需 Gemini**：当前方案已完全脱离 Gemini 依赖
