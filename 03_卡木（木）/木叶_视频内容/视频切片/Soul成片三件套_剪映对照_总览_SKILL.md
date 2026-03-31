---
name: Soul成片三件套·剪映对照总览
description: 将剪映专业版「字幕/文本、时间线封面、特效」与 Soul 程序化成片一一映射；提供全场流程与单场防丢检查单，保证剪辑链路分类清晰、可逐项调用子 Skill。
triggers: 成片三件套、剪映对照、剪映、CapCut、字幕封面特效、成片流程、剪辑流程不丢、成片检查单、追问、自检、防跳步、Jianying、视频轨道对照、木叶成片总览
owner: 木叶
group: 木
version: "1.1"
updated: "2026-03-31"
---

# Soul 成片三件套 · 剪映对照总览

## 能做什么（Capabilities）

- 用**一张表**对齐：剪映左栏/时间线常见能力 ↔ 本目录 **子 Skill** ↔ **工作流阶段** ↔ **产物路径**。
- 提供**单场输出目录**验收清单，避免「只做切片忘了封面」或「烧了字幕没做尾帧 SEO」等丢项。
- **追问与自检**：全阶段可答题清单见 `参考资料/成片流程_追问与自检.md`（Agent 进每阶段前先扫一遍）。
- 作为 **M01 视频切片** 下的**编排入口**：先读本 Skill，再按需 `@` 或读取子 Skill 执行。

## 怎么用（Usage）

**触发词**：成片三件套、剪映对照、字幕封面特效一起、成片流程检查、剪辑不丢项。

**必读联动**：

- 命令级全流程：`Soul派对成片工作流_从零到片尾.md`
- 竖屏参数与钩子规则：`Soul竖屏切片_SKILL.md`
- 剪映智能剪口播/镜头分割（概念对照）：`参考资料/剪映_智能剪口播与智能片段分割_逆向分析.md`

## 剪映功能 ↔ Soul 程序化（分类总表）

| 剪映里你点的 | 本质 | 子 Skill（专读执行） | 工作流阶段 | 核心产物 / 脚本 |
|-------------|------|---------------------|------------|-----------------|
| **字幕 / 文本 / 识别字幕** | 口播可见、跟读、时间轴 | `Soul成片字幕_SKILL.md` | Ⅰ 转录洁净 → Ⅲ `soul_enhance` 烧录 | `transcript.srt`；`--force-burn-subs` `--typewriter-subs` |
| **文本 · 封面大字 / 标题样式** | 首屏吸睛、文件名与列表标题 | `Soul成片封面_SKILL.md` | Ⅰ-7 `highlights.json` → Ⅲ 片头卡片 | `viral_hook` / `hook_3sec` / `title` / `file_stem` |
| **时间线 · 封面（缩略图）** | 平台列表首帧 | 同上（封面 Skill） | Ⅲ 内由 `soul_enhance` 生成片头帧；分发平台可另设 | 成片 mp4 首帧；多平台见 `M01c～M01h` |
| **特效 / 贴纸** | 节奏点信息强化、情绪 | `Soul成片特效_SKILL.md` | Ⅲ 贴片、关键词条；可选动效包装 | `--stickers` / `--keyword-pins`；`切片动效包装/` |
| **变速 / 删停顿** | 节奏密度 | 同上（特效 Skill） | Ⅲ | `--speed-factor` / `silencedetect`；`--silence-gentle` |
| **智能剪口播** | 稿↔时间轴对齐粗剪 | 概念对照上述参考 md；落地 = Ⅰ+Ⅱ | Ⅰ 清单 → `batch_clip` | `identify_highlights` / 附录 A |
| **智能片段分割** | 按镜头切 | 派对录屏主用**话题高光**非镜头检测 | Ⅰ-5～Ⅱ | `highlights.json` |

## 执行步骤（Steps）

1. **定场次目录**：`~/Movies/soul视频/第N场_YYYYMMDD_output/`，保证含 `裁剪检查/`、`transcript.srt`、`highlights.json`、`切片/`（阶段Ⅱ后）。
2. **按三类逐项验收**（不可跳类合并验收）：
   - 读并执行 **字幕 Skill** → 确认 SRT + 烧录参数。
   - 读并执行 **封面 Skill** → 确认四字段与首屏。
   - 读并执行 **特效 Skill** → 确认贴片/静音/加速/可选 SEO 尾帧。
3. **跑 `soul_enhance`**（阶段Ⅲ一次命令会聚合多类，但检查单仍分三类勾）。
4. **可选阶段Ⅳ**：SEO 尾帧见特效 Skill 与主工作流 §七。

## 单场防丢检查单（复制到场次笔记）

```
场次：第___场  目录：_________________________

□ 字幕：transcript.srt 已简体+Ⅰ-4；highlights 与 SRT 时间已核对；soul_enhance 含 --force-burn-subs [--typewriter-subs]
□ 封面：viral_hook / hook_3sec / title / file_stem 符合 Soul竖屏 §三（2或4字、不撞字）
□ 特效：裁剪检查 txt 已写入 --crop-vf；贴片/静音/语速按 Skill；若已 SEO 尾帧则母片已备份
```

## Agent 追问协议（执行前 30 秒）

进 **batch_clip** 前自问：**Ⅰ-7 定稿了吗？**  
进 **soul_enhance** 前自问：**裁剪参数是本场 txt 吗？烧录参数写全了吗？**  
进 **SEO 尾帧** 前自问：**母片备份了吗？会重复 concat 吗？**  
展开题全集：`参考资料/成片流程_追问与自检.md`。

## 相关文件（Files）

| 类型 | 路径 |
|------|------|
| 子 Skill | `Soul成片字幕_SKILL.md`、`Soul成片封面_SKILL.md`、`Soul成片特效_SKILL.md` |
| 追问自检 | `参考资料/成片流程_追问与自检.md` |
| 全流程 | `Soul派对成片工作流_从零到片尾.md` |
| 目录索引 | `README.md`（本目录根） |
| 脚本目录 | `脚本/`（`soul_enhance.py`、`batch_clip.py` 等） |

## 依赖（Dependencies）

- **前置**：`Soul竖屏切片_SKILL.md` 或主 `SKILL.md` 中的流水线约定。
- **外部**：`ffmpeg`、`Python3`；转录见工作流 `mlx-whisper`。
