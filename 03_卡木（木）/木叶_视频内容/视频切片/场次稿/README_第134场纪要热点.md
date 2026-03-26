# 第134场 · 飞书智能纪要热点 → highlights

- **源表**：飞书「智能会议纪要」热点 11 段（时间轴从**本场原片 00:00** 起算）。
- **成片规则**：每条 **60～300 秒**（1～5 分钟）。纪要里略超 5 分钟的段已在 JSON 内**截断到 5:00**，避免超长条；**不足 1 分钟的不做一条**（本表 11 段均 ≥约 4 分钟）。
- **文件**：`第134场_智能纪要热点_highlights.json`  
  复制到本场输出目录并覆盖 `highlights.json`（或与 `batch_clip -l` 指向该路径）。

## 本机执行（路径按你机器改）

```bash
OUT="$HOME/Movies/soul视频/第134场_20260326_output"
SRC_JSON="$HOME/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/场次稿/第134场_智能纪要热点_highlights.json"
MP4="$HOME/Movies/soul视频/原视频/obcnng8965zat58s9v6p9mrt.mp4"   # 以你本场原片为准

cp "$SRC_JSON" "$OUT/highlights.json"
python3 …/batch_clip.py -i "$MP4" -l "$OUT/highlights.json" -o "$OUT/切片"
python3 …/soul_enhance.py -c "$OUT/切片" -l "$OUT/highlights.json" -t "$OUT/transcript.srt" \
  -o "$OUT/成片" --vertical --title-only --force-burn-subs --typewriter-subs \
  --crop-vf "crop=752:1080:416:0" --overlay-x 416 --silence-gentle
```

## 时间轴对不齐时

若纪要对应的是**妙记截断版**（仅前约 52 分钟），而原片是整场派对，需在整条时间轴上加**统一偏移**（例如纪要 00:00 = 原片 00:04:24），请改 JSON 内各 `start_time`/`end_time` 后重跑 `batch_clip` + `soul_enhance`。
