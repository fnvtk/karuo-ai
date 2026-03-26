---
name: Soul剪辑取向分析
description: 在按高光剪 Soul/飞书录屏**之前**，自动分析画面主内容区宽度占比与左右留白，**判断更适合竖屏塑形还是横屏全幅**，并输出**标注截图 + Markdown 报告**；与 `analyze_feishu_ui_crop` 同源几何算法。
triggers: 剪辑取向、竖屏还是横屏、先分析再剪、取向分析、横竖判断、录屏适合哪种比例、suggest_clip_orientation
owner: 木叶
group: 木
version: "1.0"
updated: "2026-03-26"
---

# Soul 剪辑取向分析 · Skill

## 一、何时执行

在 **`batch_clip` 之后、`soul_enhance` 之前**（或拿到代表 mp4 后立刻执行）。同一场次只需跑一次（可用首条切片或原片）。

## 二、命令

脚本：`03_卡木（木）/木叶_视频内容/视频切片/脚本/suggest_clip_orientation.py`

```bash
cd 脚本
python3 suggest_clip_orientation.py "/path/to/代表.mp4" \
  --at 0.12 --at 0.22 --at 0.35 --at 0.5 \
  --save-dir "/path/to/场次_output/裁剪检查"
```

- 多 `--at`：沿时间轴多点取样，减少「刚好卡在转场」误判。
- `--save-dir`：生成 `*_取向标注_t*.png`（绿框=算法认定的主内容包络）与 `*_剪辑取向分析.md`。

## 三、判定逻辑（摘要）

- 计算深色主内容包络宽度 `W_band` 与整幅宽 `W` 的比 `r = W_band/W`，及左右留白比例。
- **r 较小**且两侧留白大 → **竖屏优先**（裁条发抖音等）。
- **r 较大**且左右边窄 → **横屏全幅优先**（`--horizontal-full`，无黑边）。
- 中间带 → **灰区**，以标注图人工拍板。

具体阈值见脚本内 `_recommend_one`。

## 四、读后动作

打开报告中的 Markdown，按「综合建议」：

| 建议 | 下一步 Skill / 参数 |
|------|---------------------|
| 竖屏优先 | `Soul竖屏切片_SKILL.md` + `analyze_feishu_ui_crop` + `soul_enhance --vertical --crop-vf …` |
| 横屏全幅优先 | `Soul横屏全幅高光_SKILL.md` + `soul_enhance --horizontal-full --title-only` |

## 五、相关文件

- `analyze_feishu_ui_crop.py`：输出精确 `CROP_VF`（竖屏必跑）。
- `soul_enhance.py`：`--horizontal-full` / `--horizontal-center-pad` / `--vertical`。
