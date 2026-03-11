# AI 视频切片 - GitHub 与替代方案

> 卡若AI 视频切片 Skill 的简化方案与可集成替代
> 更新：2026-02-27

**相关**：去语助词（嗯、啊等）的全网与 GitHub 方案见 → [去语助词_全网与GitHub方案汇总.md](./去语助词_全网与GitHub方案汇总.md)

## 一、当前方案（卡若AI 本地方案）

| 组件 | 实现 | 说明 |
|------|------|------|
| **转录** | MLX Whisper | 本地、快速，无 API 依赖 |
| **高光识别** | Ollama → 规则 | 级联，不依赖 Gemini/Groq |
| **切片** | FFmpeg batch_clip | 标准工具 |
| **增强** | soul_enhance（Pillow 封面+字幕）| 无需 drawtext |

**级联顺序**：Ollama（卡若AI 本地）→ 规则备用（不用 Groq/Gemini）

---

## 二、GitHub 开源方案（可借鉴）

### 0. LTX 系（AI 生成视频 + 剪辑/Retake，已吸收进 Skill）

| 项目 | 说明 | 与切片 Skill 的衔接 |
|------|------|---------------------|
| **[Lightricks/LTX-Video](https://github.com/Lightricks/LTX-Video)** | DiT 视频生成：文/图/视频→视频、关键帧、前后扩展、ComfyUI/Diffusers | 生成片段后可当「原视频」走转录→高光→切片→成片；或做 Video-to-video 风格化 |
| **[Lightricks/LTX-2](https://github.com/Lightricks/LTX-2)** | 音视频同步生成、**RetakePipeline**（重生成某段时间）、A2V、多关键帧、LoRA | **Retake** 用于已有录播「改一段」；生成内容进现有成片流程 |
| **[audiohacking/LTX-Desktop-MPS](https://github.com/audiohacking/LTX-Desktop-MPS)** | 桌面应用：Text/Image/Audio to video、**Video edit (Retake)**，Apple MPS | 桌面重剪/生成后，导出 mp4 进 `切片/` 或 `成片/`，用 soul_enhance 统一封面+字幕+竖屏 |

**详细能力与集成方式**：见 [LTX_能力与集成说明.md](./LTX_能力与集成说明.md)。  
**在线试玩**：https://app.ltx.studio

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
| 封面/字幕 | soul_enhance（Pillow）| 简体中文，自动繁转简 |

### 云端可选

| 能力 | 工具 | 说明 |
|------|------|------|
| 高光识别 | Groq | 免费层，`pip install groq`，`GROQ_API_KEY` |
| 转录 | 云端 Whisper API | 网络依赖 |
| 高光识别 | Gemini | 当前接口不可用，已移除 |

### FFmpeg drawtext 说明

- 默认 `brew install ffmpeg` 可能无 `drawtext`（缺 libfreetype）
- 可选：`brew install ffmpeg@7` 或自行编译 `--enable-libfreetype`
- 当前增强：soul_enhance 用 Pillow，封面+字幕均为简体中文

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

# 字幕简体中文（可选，推荐）
opencc-python-reimplemented  # 繁转简，soul_enhance 可用
```

---

## 五、推荐组合（最简）

1. **本地全流程**：MLX Whisper → Ollama → FFmpeg → soul_enhance（简体中文）
2. **无需 Gemini/Groq**：只用 Ollama + 规则
3. **字幕**：自动繁转简，统一简体中文
