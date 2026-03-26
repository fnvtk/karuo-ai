---
name: Soul横屏全幅高光
description: Soul 派对飞书录屏→**横屏 1920×1080 高光成片**，**整幅画面无左右黑边**；与 `Soul竖屏切片_SKILL.md` **共用同一份 highlights / hook / 字幕规则**，差别仅在于**不裁竖条**、封面与字幕按**全幅 16:9** 绘制。可选 legacy：`--horizontal-center-pad`（中间一条+黑边）见文末。
triggers: Soul横屏全幅、横屏高光、横屏无黑边、视频号横屏、16比9全画面、横屏成片、整幅横屏
owner: 木叶
group: 木
version: "2.0"
updated: "2026-03-26"
---

# Soul 横屏全幅高光 · Skill

> **必须先做取向分析**：`脚本/suggest_clip_orientation.py`（或 `Soul剪辑取向分析_SKILL.md`），根据包络宽度占比判断本场用**竖屏**还是**本 Skill（横屏全幅）**，再成片。

---

## 一、成片定义

| 项 | 要求 |
|----|------|
| 分辨率 | 与源切片一致，常见 **1920×1080** |
| 画面 | **整幅**录屏内容，**无**为适配而加的左右黑边 |
| 高光 / 文案 | 与竖屏 Skill **同一份** `highlights.json`、简体、片尾规则 |
| 禁止混淆 | 本 Skill **不是**抖音竖条；**不是**「双路视频横拼」 |

---

## 二、与竖屏的边界

- **竖屏**：主内容仅占画面中间窄条、两侧大白 → 用 `analyze_feishu_ui_crop` + `--vertical --crop-vf …`
- **横屏全幅**（本 Skill）：主内容已占大部分宽度 → `soul_enhance --horizontal-full`，**不要** `--crop-vf`

---

## 三、成片命令

目录：`03_卡木（木）/木叶_视频内容/视频切片/脚本/`

```bash
python3 soul_enhance.py \
  --clips "/path/to/场次_output/切片" \
  --highlights "/path/to/场次_output/highlights.json" \
  --transcript "/path/to/场次_output/transcript.srt" \
  -o "/path/to/场次_output/成片_横屏全幅" \
  --horizontal-full --title-only \
  --no-trim-silence \
  --force-burn-subs \
  --typewriter-subs
```

- **`--horizontal-full`**：关闭竖条裁剪；`--title-only` **不再**偷偷打开 `--vertical`。
- **不要**同时传 `--vertical`、`--crop-vf`、`--horizontal-center-pad`。

---

## 四、可选：横屏单中屏 + 左右黑边（legacy）

若平台必须 16:9 但只想突出中间一条（会出现黑边）：

```bash
python3 soul_enhance.py ... --vertical --title-only \
  --crop-vf "crop=宽:1080:左:0" --overlay-x 左 \
  --horizontal-center-pad ...
```

详见脚本 `--help`。日常优先按取向报告选「全幅」或「竖条」。

---

## 五、验收

- [ ] 成片无 **pad 出来的左右黑边**（全幅模式）
- [ ] `ffprobe` 宽高与源切片一致
- [ ] 字幕、hook、CTA 与竖屏 Skill 一致
