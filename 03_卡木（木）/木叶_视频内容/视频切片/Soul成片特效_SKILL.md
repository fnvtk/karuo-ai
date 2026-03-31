---
name: Soul成片特效
description: Soul 派对成片「特效」专类：贴片、关键词浮层、静音剃除、语速、可选 SEO 尾帧与切片动效包装；对照剪映「特效/贴纸/变速」。
triggers: 成片特效、贴片、emoji贴纸、关键词条、keyword-pins、去静音、silencedetect、加速成片、speed-factor、SEO尾帧、append_seo、动效包装、剪映特效
owner: 木叶
group: 木
version: "1.1"
updated: "2026-03-31"
---

# Soul 成片 · 特效 Skill

## 追问（读本 Skill 前先答）

- 塑形参数是否已写入本轮命令（**非旧场**）？  
- 贴片开/关、语速、`--silence-gentle` 本场选哪组？是否写进场次笔记？  
- 若跑 SEO 尾帧：**母片备份了吗？** 会重复 concat 吗？（见 `参考资料/成片流程_追问与自检.md` §四）

## 能做什么（Capabilities）

- 映射剪映 **特效、贴纸、变速、删气口** 到 `soul_enhance` 与周边脚本。
- 标明 **可选** 与 **默认开启** 项，避免与字幕/封面 Skill 重复叙述。
- 衔接 **阶段Ⅳ SEO 尾帧**（最后做、母片备份）。

## 怎么用（Usage）

**触发词**：成片特效、贴纸、去静音、加速、SEO 尾帧、关键词条、动效包装。

**剪映对照**：

| 剪映 | Soul 程序化 |
|------|-------------|
| 特效库 | 默认 **表情贴片** `--stickers`（关：`--no-stickers`）；重度包装 → `切片动效包装/` |
| 贴纸 | `贴片库/emoji_png_72/` |
| 变速 | `--speed-factor` 或 `--no-speedup` |
| 删空白/气口 | `silencedetect` + 字幕间隙；`--silence-gentle` 柔和 |
| 画中画式强调 | 弱版 `--keyword-pins`；完整「干货渐进条」见主工作流 §6.3.1（与脚本迭代状态一致） |

## 执行步骤（Steps）

1. **塑形**：`裁剪检查/*_塑形裁剪参数.txt` → `--crop-vf` / `--overlay-x`（属画面基座，特效前必完成）。
2. **节奏**：按需 `--silence-gentle`、`--speed-factor 1.04～1.10`、`--no-speedup`。
3. **贴片**：默认开；挡脸/挡字幕时改策略或关。
4. **关键词条**：`--keyword-pins` 可选；与 `takeaway_pins` 完整形态见工作流 §6.3.1。
5. **SEO 尾帧（最后）**：`脚本/append_seo_keyword_tail.py`，见工作流 §七；**勿重复跑** concat 双尾帧。
6. **Remotion/片头片尾模板**：`切片动效包装/10秒视频/`（与主 `SKILL.md` 联动）。

## 相关文件（Files）

- `脚本/soul_enhance.py`、`脚本/append_seo_keyword_tail.py`
- `参考资料/视频尾帧_SEO关键词200.txt`
- `切片动效包装/参考资料/切片动效包装速查.md`

## 依赖（Dependencies）

- **前置**：`切片/`、`highlights.json`、`transcript.srt`、裁剪参数。
- **后置分发**：`SKILL_REGISTRY` M01c～M01h。

## 编排入口

`Soul成片三件套_剪映对照_总览_SKILL.md`。
