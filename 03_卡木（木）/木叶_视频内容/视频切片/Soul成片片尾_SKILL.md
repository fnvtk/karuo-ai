---
name: Soul成片片尾
description: Soul 派对成片「收口」专类：人声与节奏窗、有声 CTA 字幕（cta_ending）、无声 SEO 双页静帧、流水线默认拼接与防双尾帧状态；隐性曝光与轻行动引导。
triggers: 成片片尾、片尾结构、SEO尾帧、cta_ending、append_seo、双尾帧、丝滑收尾、行动引导、裂变、.soul_seo_tail_state、no-seo-tail
owner: 木叶
group: 木
version: "1.0"
updated: "2026-03-29"
---

# Soul 成片 · 片尾 Skill（M01o）

## 追问（读本 Skill 前先答）

- 本条成片是 **只跑了 `soul_enhance`** 还是 **跑过 `soul_slice_pipeline --two-folders` 全链路**？（仅前者时 **不会**自动拼 SEO，须手跑 `append_seo_keyword_tail.py` 或重跑流水线成片段。）
- `highlights.json` 里 **`cta_ending`** 是否已写清「信息钩子 + 轻引导」（平台安全词已洗）？
- 若补跑 SEO：**母片是否无尾帧**？是否要 **`--ignore-state`**？（母片仍含旧尾帧时 **禁止** `--ignore-state`，否则会 **叠双尾**。）

## 片尾四层结构（时间轴从后到前设计，执行顺序为正片 → 尾帧）

| 层 | 载体 | 观众感知 | 技术落点 |
|----|------|----------|----------|
| **① 人声收口** | 正片音轨 | 最后一刀别落在「长时间纯静音」；保留约 **2.85s** 片尾窗不被静音策略剪死 | `soul_enhance` 与 `silencedetect` 策略（见主工作流 §6 第 7 步） |
| **② 有声 CTA 字幕** | 烧录字幕条 | **普通人可读**：钩子、下一条预告、轻引导（点赞/关注/进房类话术按平台规则收敛） | `highlights.json` → **`cta_ending`** → `append_cta_ending_subtitle`；时长窗 **CTA_END_MIN～MAX**，结束可略延后 **CTA_HOLD_AFTER_VOICE_SEC** 再断，过渡到无声段 |
| **③ SEO 静帧 ×2** | 拼接在成片末尾 | **近乎隐形**（高透明藏词），供搜索侧长尾；第二页底可有一条 **略亮于正文** 的轻引导 | `append_seo_keyword_tail.py`；默认 **`--pages 2`** = **两张** SEO 图各展示 **`--duration / 2`** 秒 |
| **④ 防重复** | 状态文件 | 同成片再跑 SEO 时 **跳过**，避免 concat **双尾** | `成片/.soul_seo_tail_state.json`；仅当已换回 **无 SEO 母片** 时用 **`--ignore-state`** |

**说明**：**②** 与 **③** 是两套代码——**`soul_enhance` 不做 SEO 拼图**；**③** 只由 **`append_seo_keyword_tail.py`**（或流水线内自动调用）完成。

## 流水线默认行为（`soul_slice_pipeline.py`）

当同时满足：**`--two-folders`**、**非** `--slices-only`、**非** `--no-seo-tail`、成片增强产出 **`enhanced_count > 0`**、且存在 **`本Skill根/参考资料/视频尾帧_SEO关键词200.txt`** 时，在 **`soul_enhance` 之后**自动执行：

`append_seo_keyword_tail.py --dir <成片目录> --keywords <上述文件>`

- **`--no-seo-tail`**：关闭自动 SEO。  
- **`--seo-tail-force`**：传给 append 的 **`--ignore-state`**（须已换回无尾帧母片）。

**仅跑 `soul_enhance`** 或 **`--slices-only`** 时：**不会**自动拼 SEO，须按下一节手跑。

## 手工补 SEO（定稿后、备份母片后）

```bash
SCRIPT="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本"
python3 "$SCRIPT/append_seo_keyword_tail.py" \
  --dir "$OUT/成片" \
  --keywords "$SCRIPT/../参考资料/视频尾帧_SEO关键词200.txt" \
  --duration 2.8 \
  --pages 2 \
  --per-page 8
```

- **第二页底部轻引导**（隐性行动）：默认 **`点头像进房 · 每晚派对直播`**；改文案用 **`--action-line "…"`**，完全不要底栏用 **`--no-action-line`**。  
- 透明度与字色：`append_seo_keyword_tail.py` 顶部 `_WASH_ALPHA` / `_TITLE_ALPHA` / `_BODY_ALPHA` 等。

## 验收

1. **肉眼**：片尾先看到 **CTA 字幕**，人声结束后极短留白（若有），再进入 **两页** 几乎看不见的藏词画面（第二页底或有轻引导字）。  
2. **`ffprobe` 时长**：相对无 SEO 母片，总时长应增加约 **`--duration`（默认整段 SEO 时长）**。  
3. **勿双尾**：同目录二次运行应 **跳过**（状态一致时）；若误叠，用无尾帧备份覆盖后再跑。

## 相关文件

- `脚本/soul_enhance.py`（`append_cta_ending_subtitle`、`CTA_HOLD_AFTER_VOICE_SEC`）  
- `脚本/append_seo_keyword_tail.py`、`脚本/soul_slice_pipeline.py`  
- `参考资料/视频尾帧_SEO关键词200.txt`  
- 主流程：`Soul派对成片工作流_从零到片尾.md` **§七**  
- 剪映侧「变速/气口」与片尾窗：`Soul成片特效_SKILL.md`（M01n）

## 编排入口

`Soul成片三件套_剪映对照_总览_SKILL.md`（M01k）· 注册 **M01o**。
