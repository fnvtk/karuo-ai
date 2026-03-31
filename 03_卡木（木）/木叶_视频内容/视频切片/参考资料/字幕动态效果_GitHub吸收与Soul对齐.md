# 字幕动态效果 · GitHub 生态吸收与 Soul 成片对齐

> **用途**：归纳 GitHub 上常见「字幕动起来」的技术路线，供木叶视频切片 / `soul_enhance` 迭代时对照；**不替代**脚本 `--help` 与 `Soul竖屏切片_SKILL.md` 真源。  
> **检索日**：2026-03-31（GitHub 仓库搜索 + 摘要）。

---

## 一、效果类型速查（按实现层）

| 类型 | 观众感知 | 常见实现 | 代表仓库 / 关键词 |
|------|----------|----------|-------------------|
| **逐字/逐词显现** | 跟读口播、打字机感 | 时间轴切分 + 每字/每词 `\fad` 或自绘 PNG 序列 | Soul：`soul_enhance --typewriter-subs`；Whisper 词级 JSON → 字权分配 |
| **卡拉 OK / 唱词高亮** | 当前字变色、未唱字半透明 | ASS `\k`、KFX、Pyon 脚本 | [CoffeeStraw/PyonFX](https://github.com/CoffeeStraw/PyonFX)、Aegisub 社区模板 |
| **词级对齐（时间轴燃料）** | 为上面两类提供毫秒级锚点 | Whisper + 强制对齐 / 音素 | [m-bain/whisperX](https://github.com/m-bain/whisperX)（词级时间戳+可选说话人分离） |
| **ASS 全量动效** | 弹跳、滚动、粒子、多行花式 | Lua/Py 生成 Dialogue 行 + libass 渲染 | [Seekladoom/Seekladoom-ASS-Effect](https://github.com/Seekladoom/Seekladoom-ASS-Effect)、[Seekladoom/TCAX-Karaoke-Effect-287-Templates](https://github.com/Seekladoom/TCAX-Karaoke-Effect-287-Templates) |
| **程序化 ASS 渲染** | 把 ASS 当「矢量+时间轴 API」 | libass 绑 Python | [bubblesub/ass_renderer](https://github.com/bubblesub/ass_renderer) |
| **短视频粗描边大字** | TikTok/Reels 风逐词弹出 | Whisper + Pillow/MoviePy/ffmpeg drawtext 循环 | [glenwrhodes/KillerSubtitles](https://github.com/glenwrhodes/KillerSubtitles)（描述为 TikTok-style word-by-word） |
| **平台字幕 → ASS** | VTT 滚动、自动卡拉 OK 样式 | 转换器 | [Sofronio/YouTubeVTT2ASS](https://github.com/Sofronio/YouTubeVTT2ASS) |
| **声明式字幕语言** | 人类可读配置再编译 ASS | DSL → ASS | [OpenAnime/ESL](https://github.com/OpenAnime/ESL)（Expressive Subtitle Language） |
| **视频合成栈内嵌字幕 UI** | 可编程动画组件 | React + Remotion | [neutral-Stage/remotion-captioneer](https://github.com/neutral-Stage/remotion-captioneer)（词级同步 captions） |
| **音频→社交短视频高亮** | 歌词式高亮成片 | 多轨对齐+模板 | [zoharbabin/karaokify](https://github.com/zoharbabin/karaokify)（karaoke-style highlight videos） |

---

## 二、可吸收的设计原则（映射到 Soul）

1. **时间轴粒度**：动效顺滑度取决于**词级/字级**锚点；当前链路以 **MLX Whisper + SRT** 为主，有词级轴时 `soul_enhance` 在词内再拆字（见 Skill）。需要更强对齐时可对照 **WhisperX** 产出 JSON 再转换（**不强制**，与现有 MLX 流程二选一或后处理）。
2. **ASS `\k` 与自绘烧录**：ASS 卡拉 OK 适合**规则统一、批量模板**；Soul 竖屏当前为 **PIL 烧录 + 得意黑 + 金黄关键词**，优势是版式与竖条安全区可控；若未来引入 ASS，可用 **ass_renderer + ffmpeg** 或 **subtitles=filename.ass** 做 A/B。
3. **花哨动效与可读性**：Seekladoom / TCAX 类模板偏**演出/番剧**；派对口播成片以**可读、过审、不挡脸**为先，**仅借鉴**「渐入渐出、当前词加权、标点停顿」等低侵略性手法。
4. **短视频风**：KillerSubtitles 类「逐词粗描边」可与 Soul「白描边+金黄关键词」做**风格对照**；若实验新风格，须保留 **简体、违禁词人工审、竖条安全区** 三条红线。
5. **Rolling / Karaoke from VTT**：YouTubeVTT2ASS 思路可用于**外平台字幕回灌**再统一进 ASS 流水线（运营向二次分发场景）。

---

## 三、与 `soul_enhance.py` 的当前对齐点

| GitHub 概念 | Soul 落地 |
|-------------|-----------|
| 逐词高亮 / typewriter | `--typewriter-subs`；词级 SRT 时字权；`KEYWORDS` 金黄加权 |
| 卡拉 OK 色随时间变 | 未用 ASS `\k`；用**同一轨内字色/权重**近似「当前字更钉」 |
| WhisperX 词轴 | 可选增强数据源；需自建 SRT/JSON 与切片时间偏移对齐 |
| libass 渲染 | 当前非主路径；评估时再读 `ass_renderer` 与 ffmpeg `ass` 滤镜 |

---

## 四、后续迭代可记 issue 的方向

- [ ] 可选输出 **ASS**（含 `\k` 或简化 K 标签）供剪映/PR 导入微调。  
- [ ] 实验 **WhisperX** 词轴与现有 `transcript.srt` 的**场次级**对齐策略（偏移、切片 in/out）。  
- [ ] `--subtitle-style preset=`：`soul`（现行） / `bold-pop`（对照 KillerSubtitles）仅作内部 A/B。  

---

## 五、链接清单（便于 Agent 打开）

- https://github.com/CoffeeStraw/PyonFX  
- https://github.com/m-bain/whisperX  
- https://github.com/bubblesub/ass_renderer  
- https://github.com/zoharbabin/karaokify  
- https://github.com/glenwrhodes/KillerSubtitles  
- https://github.com/Sofronio/YouTubeVTT2ASS  
- https://github.com/OpenAnime/ESL  
- https://github.com/neutral-Stage/remotion-captioneer  
- https://github.com/Seekladoom/Seekladoom-ASS-Effect  
- https://github.com/Seekladoom/TCAX-Karaoke-Effect-287-Templates  

---

*文档版本：2026-03-31*
