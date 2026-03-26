---
name: 回廊洗字
legacy_name: 语音转写纠错
description: 卡若记忆宫殿命名体系 · 间名「回廊洗字」：口述与 ASR 杂声洗净后再入记忆/流水线；闽南口音纠错库、终端网页 CLI 备忘。触发词：卡若记忆宫殿命名体系、回廊洗字、记忆宫殿、语音转写纠错、闽南话、ASR、browsh。
group: 水
memory_palace_path: 卡若记忆宫殿/水殿/水溪厢/回廊洗字
memory_palace_slot: 口述与 ASR 杂声在此洗净，再入记忆与字幕流水线
triggers: **回廊洗字、卡若记忆宫殿命名体系、记忆宫殿、记忆空间、语音转写纠错、语音输入、闽南话、闽南口音、听写、ASR、转写纠错、纠错库、误听、卡罗拉、卡罗伊**、口述、嘴瓢、**网页CLI、终端浏览器、命令行看网页、browsh**
owner: 水溪
version: "1.5"
updated: "2026-03-27"
---

# 回廊洗字（W03b · 卡若记忆宫殿命名体系）

> **宫殿定位**：`卡若记忆宫殿 / 水殿 / 水溪厢 / 回廊洗字` —— 属 **卡若记忆宫殿命名体系**；对应成员 **水溪**（整理归档、清清爽爽）；职能是 **口述与听写噪声入库前的滤真**，与 W04「自动记忆管理」相邻：先洗字，再入深记。  
> **登记用原名**：语音转写纠错（目录名与旧文档仍用此名，避免路径大面积迁移）。  
> **机制总文档**：`运营中枢/参考资料/闽南话语音_ASR纠错机制.md`（闽南话口述 · **每轮对话滤真**、词库维护、与 JSON 关系；口述「科室」≈ Skill 见该文 **§八**）。  
> **别名**：语音里 **「卡罗拉」「卡罗伊」等 = 卡若 / 卡若AI**（ASR 误听，保留在触发词；完整映射见 JSON）。

## 目标

- 卡若常用**语音输入**，带**闽南口音普通话**时，输入法/听写易产生固定误听。
- 使用**唯一纠错库**统一迭代，保证：Cursor 理解用户意图、字幕脚本（`soul_enhance` 等）用词一致、长期话术越来越准。

## 唯一数据源

| 文件 | 作用 |
|------|------|
| `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json` | **主纠错表**：`corrections` 对象，`误听 → 正写` |
| `运营中枢/工作台/闽南口音纠错工作台/README.md` | **运维工作台**：多根扫盘 + Mongo 统计；入口脚本 `…/脚本/minnan_asr_workbench.py`（`scan-files` / `scan-mongo`） |

## Agent 每轮对话（强制）

1. **在推理与执行前**，将用户本轮自然语言视为可能含 ASR 噪声；在心中或用下述脚本对**整段或关键片段**做一次纠正后再定意图（不必改用户原文展示，**内部理解**以纠正后为准）。  
2. **统一过滤**：不仅「卡路 / 卡罗 / 卡洛」类，**Cursor / Claude / Soul / 私域 / 存客宝** 等表中近音一并处理；以 `卡若闽南口音_ASR纠错库.json` 为**唯一**词条源。  
3. 替换顺序：**按 key 长度降序**全文替换，避免短词截断长词（与 `soul_enhance.py`、`apply_karuo_voice_corrections.py` 一致）。  
4. **上下文**：若替换后与句义冲突（食物热量、受伤、西游记原著等），以语义为准，见 JSON `notes` 与下文「终端网页 CLI」段。  
5. 专有名词：Cursor、Claude、Soul、卡若AI 等按表中写法对齐。

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

## 终端网页 CLI（工具备忘 · 口述场景）

> 卡若口述「在 GitHub 上找**最新的网页 CLI**、要**星数**/**分数**最高的」时，ASR 常把 **「星数」误成「西游记」**；Agent **内部定意图**时按「GitHub stars 最高、终端里能渲现代网页」理解，**不必**把用户消息里的「西游记」强行改成「星数」展示回去。

### 首选：Browsh（GitHub 星数居前的「真浏览器 → 终端」方案）

| 项 | 内容 |
|:---|:---|
| 仓库 | [browsh-org/browsh](https://github.com/browsh-org/browsh)（终端实时交互、headless **Firefox** 后端，支持现代 HTML5/JS；星数在同类里长期领先） |
| 依赖 | 本机需已安装 **Firefox** |
| 安装 | [Releases](https://github.com/browsh-org/browsh/releases) 下载二进制（约 11MB）；或 `docker run --rm -it browsh/browsh`（镜像约 230MB） |
| 文档 | [brow.sh 文档](https://www.brow.sh/docs/introduction/) |

### 对比备忘（口语里「网页 CLI」可能指这些）

- **传统 TTY 浏览器**（lynx、w3m、elinks）：轻量，但**不**等价现代 Chrome/Firefox 的 JS 与复杂布局。
- **Browsh**：要的是「远程 SSH 里还能凑合用现代站」时优先想它。

### 与纠错库的关系

- **勿**在 `卡若闽南口音_ASR纠错库.json` 里做全局 `"西游记" → "星数"`（会污染真实「西游记」内容）。
- 若未来出现**固定整句**误听且可安全替换，再考虑**长 key** 短语级纠错；当前以本段说明为准。

## 参考

- **机制总述**：`运营中枢/参考资料/闽南话语音_ASR纠错机制.md`
- 内置纠错写法参考：`木叶_视频内容/视频切片/脚本/soul_enhance.py` 中 `_CORRECTIONS_BASE` 与 `apply_platform_safety` 流程。
- Cursor 总规则：`.cursor/rules/karuo-ai.mdc`（语音理解条目）。
