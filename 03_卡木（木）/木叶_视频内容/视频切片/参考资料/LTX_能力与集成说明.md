# LTX 能力与视频切片 Skill 集成说明

> 将 GitHub 上 **LTX-Video / LTX-2 / LTX Desktop** 的能力吸收进卡若AI 视频切片 Skill，支持 **AI 生成视频内容** 与 **在已有视频上轻松重剪（Retake）**，并与现有「转录→高光→切片→成片」流程衔接。
> 更新：2026-02-27

---

## 一、LTX 生态概览


| 项目              | 仓库                                                                              | 能力摘要                                                                               |
| --------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **LTX-Video**   | [Lightricks/LTX-Video](https://github.com/Lightricks/LTX-Video)                 | DiT 视频生成：图/文/视频→视频、关键帧动画、视频前后扩展、Video-to-Video；ComfyUI/Diffusers；Prompt 增强         |
| **LTX-2**       | [Lightricks/LTX-2](https://github.com/Lightricks/LTX-2)                         | **音视频同步生成**、4K、多关键帧、**RetakePipeline**（重生成某段时间）、A2V、LoRA/IC-LoRA                   |
| **LTX Desktop** | [audiohacking/LTX-Desktop-MPS](https://github.com/audiohacking/LTX-Desktop-MPS) | 桌面应用，**Text/Image/Audio to video**、**Video edit (Retake)**、编辑器界面；支持 Apple MPS 本地推理 |


**文档**：[https://docs.ltx.video](https://docs.ltx.video)  
**在线试玩**：[https://app.ltx.studio（图生视频、工作流）](https://app.ltx.studio（图生视频、工作流）)

---

## 二、可吸收到视频切片的 LTX 核心能力

### 2.1 与「剪辑/成片」直接相关


| 能力                  | 说明                                          | 在切片 Skill 中的用途                   |
| ------------------- | ------------------------------------------- | -------------------------------- |
| **Retake（重剪）**      | 对已有视频的**某一时间段**重新生成内容（LTX-2 RetakePipeline） | 在已有录播上「改一段」：替换口误、补拍、改台词段落，无需整片重录 |
| **Video extension** | 在视频**前/后**扩展帧（LTX-Video inference）          | 片头/片尾自然延长、衔接下一段切片                |
| **Video-to-video**  | 以原视频为条件做风格/内容变换（ICLoraPipeline 等）           | 统一画风、去水印、风格化成片                   |
| **多关键帧**            | 多图/多段视频作为条件，控制生成内容                          | 按「章节关键帧」生成过渡片段，再与现有切片拼接          |


### 2.2 AI 生成新内容（与切片流程衔接）


| 能力                 | 说明                                          | 在切片 Skill 中的用途            |
| ------------------ | ------------------------------------------- | ------------------------- |
| **Text-to-video**  | 文案/脚本 → 视频                                  | 用 AI 生成口播替代片段、片头片尾、插播小段   |
| **Image-to-video** | 首帧图 → 动起来                                   | 封面图/金句图 → 3～10 秒动效，再与切片合成 |
| **Audio-to-video** | 音频 → 口型/画面同步（LTX-2 A2V）                     | 用配音/旁白生成对应画面，补全缺失画面       |
| **Keyframe 插值**    | 多张关键帧 → 中间过渡（KeyframeInterpolationPipeline） | 章节之间插过渡动画，成片更顺滑           |


### 2.3 提升成片质量的通用能力


| 能力               | 说明                                                                          | 在切片 Skill 中的用途                        |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| **自动 Prompt 增强** | 模型侧 `enhance_prompt=True` 或 LTX-Studio 自动增强                                 | 高光/标题文案 → 更易被生成模型理解的描述，便于做 I2V/Retake |
| **控制 LoRA**      | 深度/姿态/Canny 等控制图                                                            | 保持人物姿态、景深一致，成片更稳                      |
| **ComfyUI 工作流**  | 官方 [ComfyUI-LTXVideo](https://github.com/Lightricks/ComfyUI-LTXVideo) 节点与示例 | 可视化编排：转录/高光 → 生成片段 → 与 FFmpeg 切片/成片串联 |


---

## 三、与当前「视频切片」流程的衔接方式

### 3.1 现有流程（不变）

```
原视频(录播) → MLX 转录 → 高光识别 → batch_clip 切片 → soul_enhance 成片(封面+字幕+竖屏)
```

适用于：**已有完整录播**，只需「识别高光 → 切段 → 加封面字幕」。

### 3.2 引入 LTX 后的两条扩展路径

**路径 A：已有视频 + 局部重剪（Retake）**

1. 用现有流程得到 `highlights.json` 与 `切片/`、`成片/`。
2. 对某一段（如 01:20–01:35）不满意时，用 **LTX-2 RetakePipeline** 或 LTX Desktop「Video edit (Retake)」仅重生成该区间，替换原片段。
3. 再走一次 soul_enhance（或只对该段做封面/字幕）后替换成片中的对应文件。

**路径 B：AI 生成新内容再当「素材」切片**

1. 用 **LTX Text/Image/Audio to video** 生成若干片段（口播替代、片头、插播）。
2. 将生成片段视为「原视频」：可先拼成一条长片，再 **MLX 转录 → 高光识别 → batch_clip → soul_enhance**；或直接作为单段放进 `切片/`，只做 soul_enhance（封面+字幕+竖屏）。

这样 **AI 生成的内容** 和 **实拍/录播** 共用同一套成片规范（竖屏、封面、字幕、去语助词）。

---

## 四、集成方式（按资源与需求选择）

### 4.1 云端 API（零显存、快速接入）


| 服务             | 能力                 | 说明                                                                             |
| -------------- | ------------------ | ------------------------------------------------------------------------------ |
| **LTX-Studio** | 图生视频、工作流           | [https://app.ltx.studio，在线用，可导出视频后本地切片](https://app.ltx.studio，在线用，可导出视频后本地切片) |
| **Fal.ai**     | LTX-Video 13B 图生视频 | 见 [LTX-Video README](https://github.com/Lightricks/LTX-Video) Quick Start      |
| **Replicate**  | LTX-Video          | 同上，按需调用                                                                        |


**与切片联动**：脚本内调用 API 得到 mp4 → 保存到指定目录 → 用现有 `batch_clip` / `soul_enhance` 或直接进 `成片/` 做封面字幕。

### 4.2 本地推理（LTX-Video / LTX-2）

- **LTX-Video**：`git clone` + `pip install -e .[inference]`，按 README 的 `inference.py` 或 Diffusers 调用；支持 MPS（macOS）。
- **LTX-2**：`uv sync`，需下载 HuggingFace 权重；提供 **RetakePipeline**、A2V、Keyframe 插值等，见 [LTX-2 README](https://github.com/Lightricks/LTX-2)。

**与切片联动**：本地跑 Retake / I2V / T2V → 输出 mp4 → 同上，进现有成片流程或替换某段。

### 4.3 桌面应用（LTX Desktop MPS）

- **LTX-Desktop-MPS**：Apple Silicon 上本地跑 LTX，带 **Video edit (Retake)** 与编辑器界面。
- 适合：不想写脚本时，在桌面里做「重剪一段」或生成短片段，再把导出文件放到 `切片/` 或 `成片/` 目录，用 soul_enhance 统一加封面/字幕/竖屏。

---

## 五、Prompt 与高光/标题的复用（LTX 文档要点）

LTX 官方建议的 **Prompt 写法**（可直接用于「高光标题 → 生成/重剪」时的描述）：

- 按**时间顺序**写清动作与场景，一段话内完成。
- 包含：具体动作、外观、机位/运镜、环境、光线与色彩、突变事件。
- 控制在约 200 词内，像「镜头表」一样精确、直白。

**在切片 Skill 中的用法**：  
`highlights.json` 里的 `title` / `hook_3sec` / `question` 可视为「短文案」；若接入 LTX 做 I2V 或 Retake，可先用这些字段拼成一段符合上述结构的 prompt，再调用 LTX（或开启 `enhance_prompt`）。

---

## 六、推荐在 Skill 内落地的「最小闭环」

1. **文档与入口**（已完成）：本说明 + Soul竖屏切片_SKILL / 主 SKILL 中的「AI 生成与 LTX 可选集成」章节。
2. **可选脚本**：若后续需要，可增加「LTX 生成/Retake 小工具」：输入一段 time range 或 prompt+首图，调 Fal/Replicate 或本地 LTX-2，输出 mp4 到指定目录，并可选自动触发 soul_enhance。
3. **流程约定**：凡 LTX 生成的片段，统一走 **成片规范**（竖屏 498×1080、封面、字幕若需则用现有 soul_enhance 管线），与录播切片成片一致。

这样既保留现有「录播→转录→高光→切片→成片」主流程，又能在需要时用 LTX **生成新内容** 或 **对已有视频做 Retake 重剪**，并在成片层面与现有视频切片能力统一。

---

## 七、参考链接


| 资源                   | 链接                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| LTX-Video 官方仓库       | [https://github.com/Lightricks/LTX-Video](https://github.com/Lightricks/LTX-Video)                 |
| LTX-2 官方仓库（含 Retake） | [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2)                         |
| LTX Desktop (MPS)    | [https://github.com/audiohacking/LTX-Desktop-MPS](https://github.com/audiohacking/LTX-Desktop-MPS) |
| LTX 文档               | [https://docs.ltx.video](https://docs.ltx.video)                                                   |
| ComfyUI-LTXVideo     | [https://github.com/Lightricks/ComfyUI-LTXVideo](https://github.com/Lightricks/ComfyUI-LTXVideo)   |
| LTX-Studio 在线       | [https://app.ltx.studio](https://app.ltx.studio)                                                   |


