# Cursor 索引 vs 本地索引 · 方案说明

> 版本：1.0 | 更新：2026-02-22
> 问题：Cursor 的 Codebase Indexing 会把 embeddings 上传到云端，能否完全在本地操作？

---

## 一、Cursor 官方现状

### 1.1 当前行为（根据 Cursor Settings → Indexing & Docs）

| 数据类型       | 存储位置     | 说明                 |
|:--------------|:-------------|:---------------------|
| 代码文件本身  | 本地         | 代码始终留在本机     |
| Embeddings    | **云端**     | 用于语义理解的向量   |
| Metadata      | **云端**     | 文件路径、行号等     |

**结论**：Cursor 目前**不支持**纯本地索引。没有「禁用云上传」选项，只能关闭索引或接受云端存储。

### 1.2 社区诉求

- Cursor Forum 有 Feature Request：[It's possible to embedding codes entirely at local?](https://forum.cursor.com/t/its-possible-to-embedding-codes-entirely-at-local/15911)
- 用户期望：像 chat 可以自托管 Ollama 一样，embedding 也能用本地 API
- **截至 2025**：官方尚未实现该能力

---

## 二、可选方案对比

| 方案                      | 数据位置       | 与 Cursor 集成 | 实现难度 |
|:--------------------------|:---------------|:---------------|:---------|
| 关闭 Cursor 索引          | 无             | 原生           | 极低     |
| 卡若AI 本地代码库索引     | **完全本地**   | 通过 Skill 调用 | 中       |

---

## 三、卡若AI 本地索引方案（推荐）

### 3.1 能力基础

卡若AI 已有：
- **nomic-embed-text**：Ollama 本地 embedding 模型（274MB）
- **local_llm_sdk**：`embed()`、`semantic_search()`、`batch_embed()`
- **运营中枢/local_llm**：统一调用入口

### 3.2 方案架构

```
本地磁盘
├── 代码/文档（.md、.py、.js 等）
├── Ollama nomic-embed-text（本地 embedding）
├── 向量数据库 / JSON 存储（本地）
└── 检索脚本（index + search）
```

**流程**：
1. **建索引**：扫描卡若AI 目录 → 分块 → 本地 embed → 存本地
2. **检索**：用户提问 → 本地 embed 查询 → 相似度检索 → 返回结果
3. **Cursor 使用**：在对话中通过「本地索引搜索」Skill 或 `@本地索引` 触发

### 3.3 与 Cursor 的配合方式

| 步骤 | 操作 |
|:-----|:-----|
| ① | 在 Cursor Settings → Indexing & Docs 中 **Pause Indexing** 或 **Delete Index** |
| ② | 运行卡若AI 本地索引 Skill 的 `index` 命令，对本项目做本地索引 |
| ③ | 对话时：说「用本地索引查 XXX」「@本地索引 搜索 YYY」 |
| ④ | AI 调用 `scripts/local_codebase_index.py search "XXX"`，获取本地检索结果后回答 |

**注意**：Cursor 的 AI 仍会用其内置的 codebase 理解能力（基于 @ 文件、打开文件等），但**不会**再把 embeddings 传云端。本地索引作为**补充**，用于你希望「完全本地」的语义搜索场景。

---

## 四、何时使用

- ✅ 敏感项目、不希望任何 embedding 上传
- ✅ 离线环境、无法连接 Cursor 云端
- ✅ 需要语义搜索但接受「先建索引、再检索」的流程
- ❌ 不适用于：必须和 Cursor 原生索引深度绑定的功能（如实时 @ 整个 repo 的智能补全）

---

## 五、参考

- Cursor Forum: [It's possible to embedding codes entirely at local?](https://forum.cursor.com/t/its-possible-to-embedding-codes-entirely-at-local/15911)
- 本地模型 SKILL：`04_卡火（火）/火种_知识模型/本地模型/SKILL.md`
- 本地代码库索引 SKILL：`04_卡火（火）/火种_知识模型/本地代码库索引/SKILL.md`
