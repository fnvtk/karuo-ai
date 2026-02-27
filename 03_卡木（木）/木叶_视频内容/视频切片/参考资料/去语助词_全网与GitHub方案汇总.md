# 去语助词（嗯、啊等）— 全网与 GitHub 方案汇总

> 调研时间：2026-02-27  
> 用途：视频/音频中自动检测并删除「嗯」「啊」「呃」等语助词（filler words / disfluency）

---

## 一、结论速览

| 类型 | 中文「嗯」支持 | 说明 |
|------|----------------|------|
| **商用 API** | ❌ Deepgram 仅英文 | filler_words 仅英文 |
| **开源·转录系** | ⚠️ Whisper 普遍不输出 嗯 | 需词级时间戳 + 能输出 嗯 的 ASR |
| **开源·纯音频检测** | ⚠️ 多为英文数据训练 | 可尝试迁移/微调 |
| **中文 ASR + 后处理** | ✅ 理论可行 | FunASR 等词级时间戳，再过滤 嗯 时间段 |

---

## 二、商用/在线方案

### 1. Deepgram（API）

- **能力**：`filler_words=true` 可检测 uh, um, mhmm 等，并返回时间戳。
- **限制**：**仅支持英文**，中文（Mandarin）不支持 filler words。
- 文档：<https://developers.deepgram.com/docs/filler-words>

### 2. Descript / Cleanvoice.ai / Resound / Auphonic

- **能力**：一键去除 um、uh、you know 等，部分支持多语言（如 Cleanvoice 德/法/澳等）。
- **限制**：多为英文场景，**未查到明确中文「嗯」「啊」支持**；多为付费或按量计费。

---

## 三、GitHub 开源方案

### 1. daily-demos/filler-word-removal ⭐ 14

- **仓库**：<https://github.com/daily-demos/filler-word-removal>
- **流程**：视频 → 提音频 → **Whisper 或 Deepgram 带词级时间戳转录** → 识别 filler 时间段 → ffmpeg 切片去掉这些段 → 再拼接成新视频。
- **特点**：与当前卡若AI 思路一致；支持 Deepgram 时用其 filler 检测（仅英文）。
- **中文**：若用 Whisper，中文下通常**不输出「嗯」**，需换用能输出 嗯 的 ASR（见下文 FunASR）。

### 2. sagniklp/Disfluency-Removal-API ⭐ 16（ICASSP '19）

- **仓库**：<https://github.com/sagniklp/Disfluency-Removal-API>
- **能力**：CRNN + 静音/语音分类，从**音频**检测 disfluency 并移除。
- **依赖**：TensorFlow 1.x、web.py、librosa、pydub、pyAudioAnalysis、hmmlearn 等。
- **中文**：论文与实现偏英文；**理论上可迁移**，需自备中文语助词数据微调/重训。

### 3. amritkromana/disfluency_detection_from_audio ⭐ 32

- **仓库**：<https://github.com/amritkromana/disfluency_detection_from_audio>
- **能力**：**不依赖转录**的 disfluency 检测，三种模态：
  - **language**：Whisper 逐字转录 + BERT 做 disfluency 分类（英文 verbatim）；
  - **acoustic**：WavLM 纯声学 disfluency 检测；
  - **multimodal**：语言 + 声学融合。
- **输出**：帧级（约 20ms）disfluency 预测，可转为时间段做裁剪。
- **中文**：模型基于英文（Switchboard 等）；**中文需自采集数据微调或仅作参考**。

### 4. adammoss/uhm ⭐ 1

- **仓库**：<https://github.com/adammoss/uhm>
- **能力**：`pip install uhm`，用 **Watson API** 检测并移除 uhm 等。
- **限制**：依赖 IBM Watson，**面向英文**。

### 5. umdone（notebook）

- **思路**：按静音切词 → RMS 等特征 → 与「语助词模板」比对，识别 um 等并删除。
- **限制**：需自建语助词模板；中文「嗯」需自己采数据。

---

## 四、中文向可行路线

### 方案 A：FunASR Paraformer 词级时间戳 + 过滤 嗯

- **依据**：FunASR Paraformer 支持**词级时间戳**（每词 start/end），且中文 ASR 是否过滤「嗯」取决于训练数据与后处理，部分工业模型会保留语气词。
- **做法**：用 Paraformer 转写 → 在词列表中筛「嗯」「啊」「呃」等 → 得到时间段 → 用现有 `remove_filler_segments.py` 的 ffmpeg 裁剪逻辑拼接。
- **文档**：<https://github.com/modelscope/FunASR>，时间戳示例见社区博客（Paraformer timestamp_model=True）。

### 方案 B：纯声学 disfluency 检测（迁移/微调）

- **依据**：amritkromana 的 **acoustic** 分支为纯声学，不依赖 ASR 文本，理论上有机会迁移到中文。
- **做法**：用其 WavLM 等预训练 + 自采「中文 嗯/啊」片段做帧级标注，微调后输出时间段 → 再裁剪。
- **成本**：需标注数据与 GPU 训练。

### 方案 C：保持「转录 + 手动/半自动」兜底

- **现状**：Whisper / whisper-timestamped 在中文下**极少输出单独「嗯」**，自动检测率低。
- **兜底**：听一遍视频，把「嗯」出现的时间点记到 `remove_list` 文本，用现有 `remove_filler_segments.py --remove-list` 做裁剪（已实现）。

---

## 五、推荐落地顺序

1. **短期**：用 **FunASR Paraformer**（或其它支持中文词级时间戳的 ASR）做一次转录，看是否出现「嗯」「啊」等词；若有，直接接入现有「识别 filler 时间段 → ffmpeg 裁剪」流程。
2. **中期**：若 Paraformer 也过滤掉 嗯，再评估 **disfluency_detection_from_audio** 的 acoustic 模型，用少量中文语助词数据做微调或二分类（语助词 vs 非语助词）。
3. **长期**：关注 Deepgram/其他厂商是否推出**中文 filler words** API；或采用商业产品（如 Cleanvoice 等）若其支持中文。

---

## 六、与本项目已有脚本的对应关系

| 本仓库脚本 | 作用 | 与上述方案关系 |
|------------|------|----------------|
| `remove_filler_segments.py` | 按 SRT 或 `--remove-list` 时间段裁剪视频 | 通用「裁剪」层，可接任何能输出「时间段」的方案 |
| `remove_ng_auto.py` | whisper-timestamped 词级 + 语助词匹配 | 当前中文下 嗯 几乎不被识别，可替换为 FunASR 等 |
| 视频切片 SKILL | 转录 → 高光 → 切片 → 增强 | 若后续接入「去语助词」步骤，可放在增强前或增强后 |

---

## 七、本仓库已实现脚本

| 脚本 | 说明 |
|------|------|
| `remove_ng_funasr.py` | **推荐**：优先 FunASR 词级时间戳（中文易出 嗯），未安装则回退 whisper-timestamped；输出同目录 `*_去嗯.mp4` |
| `remove_filler_segments.py` | 通用：SRT 纯语助词段落 或 `--remove-list` 手动时间点 → ffmpeg 裁剪 |
| `remove_ng_auto.py` | 仅 whisper-timestamped，中文下多不识别 嗯 |

**执行示例**（在视频切片/脚本目录）：
```bash
conda activate mlx-whisper
python3 remove_ng_funasr.py "/path/to/视频.mp4" -o "/path/to/输出_去嗯.mp4"
```
若需最佳效果，请在网络畅通时安装 FunASR：`pip install funasr`，再运行本脚本。

---

## 八、参考链接

- Deepgram filler words（英文）：<https://developers.deepgram.com/docs/filler-words>
- daily-demos/filler-word-removal：<https://github.com/daily-demos/filler-word-removal>
- Disfluency-Removal-API（ICASSP '19）：<https://github.com/sagniklp/Disfluency-Removal-API>
- disfluency_detection_from_audio（audio-only）：<https://github.com/amritkromana/disfluency_detection_from_audio>
- FunASR：<https://github.com/modelscope/FunASR>
- 论文：Automatic Disfluency Detection from Untranscribed Speech（IEEE TASLP 投稿）
