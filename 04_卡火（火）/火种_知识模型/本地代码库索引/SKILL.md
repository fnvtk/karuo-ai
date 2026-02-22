---
name: 本地代码库索引
description: 使用 Ollama 本地 embedding 对卡若AI 代码库做索引与语义检索，不上传云端
triggers: 本地索引、本地搜索、不上传云端、本地代码库、索引卡若AI
owner: 火种
group: 火
version: "1.0"
updated: "2026-02-22"
---

# 本地代码库索引

> **管理员**：卡火（火）  
> **口头禅**："让我想想..."  
> **职责**：在本地对卡若AI 代码库做 embedding 索引与语义检索，**不上传任何数据到云端**

---

## 一、能做什么

- **建索引**：扫描卡若AI 目录，用 `nomic-embed-text` 本地向量化，存入本地文件
- **语义搜索**：根据自然语言问题，在本地检索最相关的代码/文档片段
- **完全本地**：embedding 与索引全部在本机，无云端上传

---

## 二、执行步骤

### 2.1 前置条件

1. **Ollama 已安装并运行**：`ollama serve` 在后台
2. **nomic-embed-text 已拉取**：`ollama pull nomic-embed-text`
3. **检查**：`curl http://localhost:11434/api/tags` 能看到 `nomic-embed-text`

### 2.2 建索引（首次或更新）

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 04_卡火（火）/火种_知识模型/本地代码库索引/脚本/local_codebase_index.py index
```

- 默认索引目录：`/Users/karuo/Documents/个人/卡若AI`（可配置）
- 默认排除：`node_modules`、`.git`、`__pycache__`、`.venv` 等
- 索引结果存入：`04_卡火（火）/火种_知识模型/本地代码库索引/index/local_index.json`

### 2.3 语义搜索

```bash
python3 04_卡火（火）/火种_知识模型/本地代码库索引/脚本/local_codebase_index.py search "如何做语义搜索"
```

或

```bash
python3 04_卡火（火）/火种_知识模型/本地代码库索引/脚本/local_codebase_index.py search "本地模型embed怎么用" --top 5
```

- 返回：文件路径、片段内容、相似度分数

### 2.4 在 Cursor 对话中使用

1. **关闭 Cursor 云索引**：Settings → Indexing & Docs → Pause Indexing
2. **建好本地索引**（见 2.2）
3. 对话时说：「用本地索引查 XXX」或「@本地索引 搜索 YYY」
4. AI 会执行 `python3 .../local_codebase_index.py search "XXX"` 并基于结果回答

---

## 三、与 Cursor 的配合

| Cursor 操作           | 建议                         |
|:----------------------|:-----------------------------|
| Codebase Indexing     | **Pause** 或 **Delete**      |
| 本地索引              | 定期运行 `index` 更新        |
| 对话检索              | 说「本地索引搜索 XXX」       |

详见：`运营中枢/参考资料/Cursor索引与本地索引方案.md`

---

## 四、相关文件

| 文件 | 说明 |
|:-----|:-----|
| `脚本/local_codebase_index.py` | 索引与检索主脚本 |
| `index/local_index.json` | 本地索引数据（建索引后生成） |
| `运营中枢/参考资料/Cursor索引与本地索引方案.md` | 方案说明 |

---

## 五、依赖

- 前置：`04_卡火（火）/火种_知识模型/本地模型`（Ollama + nomic-embed-text）
- 外部：`ollama`、`requests`（与 local_llm_sdk 相同）
