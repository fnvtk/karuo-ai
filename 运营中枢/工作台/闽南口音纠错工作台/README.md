# 闽南口音 · ASR 纠错工作台

> **定位**：在**唯一词库** `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json` 之外，提供「扫仓库 + 扫聊天库 + 出报告」的**运维面**，方便迭代纠错表；**不复制**词典正文到本目录。  
> **机制**：`运营中枢/参考资料/闽南话语音_ASR纠错机制.md` · **回廊洗字 W03b**：`02_卡人（水）/水溪_整理归档/语音转写纠错/SKILL.md`

---

## 一、与工作区 Agent 的关系

- Cursor 右侧 **Pinned / Agents** 标题（如 `运营-视频切片`、`网站-部署`）多为**首条用户消息**或手工命名，语音误听会直接体现在**对话标题**里。
- **运行时纠错**：仍靠 Agent **每轮**按 JSON **长度降序**滤真（见 `karuo-ai.mdc`）。
- **本工作台**：用脚本在 **Git 仓库 / 工作台目录 / MongoDB** 里统计「误听词」出现次数，**辅助你决定**是否把某词加入 JSON（**脚本默认不写回 JSON**，避免误伤）。

---

## 二、目录内文件

| 文件 | 作用 |
|:---|:---|
| `README.md` | 本说明 |
| `workspace_roots.example.txt` | 多根工作区路径示例（复制为 `workspace_roots.txt` 后按需改） |
| `脚本/minnan_asr_workbench.py` | **唯一入口**：子命令 `scan-files`（扫盘）、`scan-mongo`（扫库） |
| `reports/` | 运行脚本后生成的报告（可 `.gitignore` 或按需提交） |

### 调用示例

```bash
WB="/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/闽南口音纠错工作台/脚本/minnan_asr_workbench.py"

python3 "$WB" scan-files --help
python3 "$WB" scan-files
python3 "$WB" scan-files --root "/path/to/另一仓库"

python3 "$WB" scan-mongo --help
python3 "$WB" scan-mongo
python3 "$WB" scan-mongo --user-only --msg-limit 80000
```

---

## 三、推荐节奏（完善纠错库）

1. **改前**：`python3 .../realtime_chat_sync.py`（保证 Mongo 与 Cursor 尽量新）。  
2. **扫盘**：`python3 .../minnan_asr_workbench.py scan-files`。  
3. **扫库**：`python3 .../minnan_asr_workbench.py scan-mongo` → 打开 `reports/` 下最新 md。  
4. **人工**：把**高频且语义稳定**的误听，按**长 key 优先**写入 JSON；改 `updated`。  
5. **回归**：再跑 `apply_karuo_voice_corrections.py` 抽几句验收。

---

## 四、Mongo 连接

与 `聊天记录管理/脚本/realtime_chat_sync.py` 一致：默认 `mongodb://admin:admin123@localhost:27017/?authSource=admin`，库名 `karuo_site`。若本机未起 Mongo，脚本会提示并跳过或生成空报告说明。

---

## 五、版本

| 日期 | 说明 |
|:---|:---|
| 2026-03-27 | 初版：工作台 + 扫盘/扫库脚本 |
| 2026-03-27 | 合并为单一入口 `minnan_asr_workbench.py`（scan-files / scan-mongo） |
