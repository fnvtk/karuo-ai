---
name: Soul成片字幕
description: Soul 派对成片「字幕」专类：转录洁净、SRT 与 highlights 对齐、烧录/逐字跟读；对照剪映「字幕/文本/识别字幕」。
triggers: 成片字幕、烧录字幕、逐字字幕、字幕跟读、SRT、转录洁净、识别字幕、口播字幕、typewriter、force-burn-subs、字幕同步
owner: 木叶
group: 木
version: "1.1"
updated: "2026-03-31"
---

# Soul 成片 · 字幕 Skill

## 追问（读本 Skill 前先答）

- 本场 `transcript.srt` 路径是否明确？是否与**本场** `切片/` 时间偏移一致？  
- 本轮 `soul_enhance` 是否包含 **`--force-burn-subs`**？是否需要 **`--typewriter-subs`**？  
- 更全阶段题：`参考资料/成片流程_追问与自检.md` §一、§三-III1。

## 能做什么（Capabilities）

- 覆盖**剪映侧「字幕」能力**在程序化链路中的等价物：从 `transcript.srt` 到 `soul_enhance` 烧录层。
- 规定**阶段Ⅰ**语言层与**阶段Ⅲ**参数，避免只切条不烧录或轴错位。
- 指向 GitHub/ASS 动态效果参考（扩展阅读，不替代默认烧录）。

## 怎么用（Usage）

**触发词**：成片字幕、烧录字幕、逐字字幕、SRT 纠错、字幕同步。

**剪映对照**：左栏 **字幕 / 文本**、自动识别字幕 → 本链路 = **MLX 转录 → 繁简与规则清洗 → 可选词级轴 → `soul_enhance` 烧录**。

## 执行步骤（Steps）

1. **产物存在**：`场次_output/transcript.srt`；阶段Ⅰ-4 通读纠错（时间轴不乱改，见主工作流 §4.2.1）。
2. **与切片对齐**：每条 `highlights.json` 的 `start_time`/`end_time` 与 SRT 同场偏移一致（妙记偏移见场次稿说明）。
3. **烧录命令必含**：`--force-burn-subs`；推荐 `--typewriter-subs`（逐字跟读）。
4. **样式真源**：`Soul竖屏切片_SKILL.md`「字幕样式 v2.10」：得意黑、白字深描边、金黄关键词、无脏底。
5. **扩展**：动效类型库 → `参考资料/字幕动态效果_GitHub吸收与Soul对齐.md`。

## 相关文件（Files）

- 脚本：`脚本/soul_enhance.py`、`脚本/soul_slice_pipeline.py`
- 流程：`Soul派对成片工作流_从零到片尾.md`（阶段Ⅰ、§6.1、§6.3 第 6 步）
- 提示词：`参考资料/高光识别提示词.md`、`参考资料/视频结构_提问回答与高光.md`

## 依赖（Dependencies）

- **前置**：`highlights.json` 已定稿、`切片/` 已生成（阶段Ⅱ）。
- **并行 Skill**：封面/特效在同一轮 `soul_enhance` 中叠加；验收时本 Skill 只盯字幕轨。

## 编排入口

不确定全场顺序时先读：`Soul成片三件套_剪映对照_总览_SKILL.md`。
