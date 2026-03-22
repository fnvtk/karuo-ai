---
name: 语音转写纠错
description: 卡若闽南口音普通话语音输入 ASR 误听纠正库与执行规范。触发词含语音输入、闽南话、听写纠错、ASR纠错、纠错库迭代。
group: 水
triggers: **语音输入、闽南话、闽南口音、听写、ASR、转写纠错、纠错库、误听、卡罗拉、卡罗伊**、口述、嘴瓢
owner: 水溪
version: "1.0"
updated: "2026-03-22"
---

# 语音转写纠错（卡若 · 闽南口音 ASR）

> **别名**：语音里出现的 **「卡罗拉」「卡罗伊」= 卡若AI**（同一指称，ASR 误听写入触发词便于命中纠错）。

## 目标

- 卡若常用**语音输入**，带**闽南口音普通话**时，输入法/听写易产生固定误听。
- 使用**唯一纠错库**统一迭代，保证：Cursor 理解用户意图、字幕脚本（`soul_enhance` 等）用词一致、长期话术越来越准。

## 唯一数据源

| 文件 | 作用 |
|------|------|
| `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json` | **主纠错表**：`corrections` 对象，`误听 → 正写` |

## Agent 每轮对话（强制）

1. **在推理与执行前**，将用户本轮自然语言视为可能含 ASR 噪声；在心中或用下述脚本对**关键片段**做一次纠正后再定意图（不必改用户原文展示，**内部理解**以纠正后为准）。
2. 替换顺序：**按 key 长度降序**全文替换，避免短词截断长词（与 `soul_enhance.py` 一致）。
3. 专有名词：Cursor、Claude、Soul、卡若AI 等按表中写法对齐。

## 命令行 / 脚本复用

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/脚本/apply_karuo_voice_corrections.py" "卡罗拉帮我改 skill"
echo "卡罗拉更新 skill" | python3 ".../apply_karuo_voice_corrections.py"
```

## 迭代规则（发现新误听时）

1. **直接编辑** `卡若闽南口音_ASR纠错库.json` 的 `corrections`，新增一行 `"误听汉字": "正确写法"`。
2. 同步更新本文件顶部 `updated` 与 JSON 内 `updated` 字段（日期）。
3. **禁止**在多处复制粘贴同一词典；视频字幕侧已通过 `soul_enhance.py` **启动时合并**本 JSON（覆盖同名 key）。

## 与视频切片的关系

- `03_卡木（木）/木叶_视频内容/视频切片/脚本/soul_enhance.py` 内置 `_CORRECTIONS_BASE`，运行时会再合并本 JSON，**JSON 优先覆盖**同名条目。
- 视频场景专有纠错仍可保留在脚本内置表；**通用口语、人名、品牌**优先只维护 JSON。

## 参考

- 内置纠错写法参考：`木叶_视频内容/视频切片/脚本/soul_enhance.py` 中 `_CORRECTIONS_BASE` 与 `apply_platform_safety` 流程。
- Cursor 总规则：`.cursor/rules/karuo-ai.mdc`（语音理解条目）。
