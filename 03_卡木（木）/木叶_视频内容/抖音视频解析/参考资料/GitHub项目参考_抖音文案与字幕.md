# 抖音文案/字幕提取 · GitHub 项目参考

> 用于「粘贴链接→提取文案」或「视频语音转文字」时可参考的开源方案。本技能已实现：**仅解析页面文案**（不下载视频）；**语音转字**需下载后用 Whisper 等。

---

## 本技能现有能力

| 需求 | 命令/脚本 | 说明 |
|------|-----------|------|
| 仅要页面文案（标题+描述） | `douyin_caption_only.sh "链接"` 或 `douyin_parse.py "链接" --no-download` | 不下载视频，直接解析页面 |
| 要视频内语音转文字 | `douyin_video_to_text.sh "链接"`（金盾/存客宝副本管理） | 需 yt-dlp 下载 + MLX-Whisper/Whisper 转写 |

---

## GitHub 可参考项目（检索于 2026-03）

1. **douyin-AI-wenan** (fangyuan99)  
   基于 Vue3 + Coze：从抖音视频提取文本 → 修正同音字、标点 → 可推 Memos。偏文案后处理。

2. **douyin-text-extractor** (wjllance)  
   Node/TS：解析分享链接拿无水印视频 → 提音频 → 转文本。类似「下载+ASR」链路。

3. **Short-Video-Link Parsing and Caption Extraction** (zhangyanhua0913)  
   多平台（20+）链接解析 + 文案提取，支持批量、API，部分用 LLM 处理。

4. **VideoCaptioner / 卡卡字幕助手** (WEIFENG2333)  
   Python，1.3w+ stars：语音识别、断句、优化、翻译，词级时间戳、VAD，LLM 字幕重组。适合做「视频→字幕」全流程。

5. **VideoTextPro**  
   基于 VideoCaptioner，针对抖音直播录制/回放优化，适合长视频转文字。

---

## 小结

- **只要页面文案、不下载**：用本技能 `douyin_parse.py --no-download` 或 `douyin_caption_only.sh` 即可。
- **要视频里人声转文字**：需下载视频（或流）后做 ASR，可参考上述 2/4/5 或本仓库 `douyin_video_to_text.sh`（Whisper/MLX-Whisper）。
