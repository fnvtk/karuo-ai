---
name: 全栈开发
description: 卡若AI 全栈开发（火炬）— 知己及类似项目的核心代码结构、分销机制、管理机制、AI 向量化经验沉淀。开发类似项目时自动激活。
triggers: 全栈开发/知己项目/分销/存客宝/RAG/向量化/Next.js/知识库
owner: 火炬
group: 火
version: "1.0"
updated: "2026-02-16"
---

# 全栈开发（火炬）

> 主责吸收知己项目经验；协同：水泉（项目管理）、金盾（存客宝）、土基（分销）。

---

## 一、项目经验库（必读）

**参考路径**：`_共享模块/references/项目经验库_知己与类似项目.md`

开发以下类型项目时，**优先读取**该 reference：

| 类型 | 涉及内容 |
|:---|:---|
| 分销型 | 一级 20% / 二级 10%、30 天绑定、空中分账 |
| RAG / 知识库 | OpenAI Embeddings 1536 维、MongoDB 向量、占位向量 |
| 存客宝整合 | 指定 Key、线索上报、添加好友 → 金盾 Skill |
| 多 Agent 拆分 | 板块划分、职责分离 → 水泉 Skill |

---

## 二、知己核心代码结构（速查）

```
app/           # Next.js App Router
├── api/booking, cunkebao, chat, distribution, admin
├── admin/knowledge  # 知识库管理
components/    # home-page, chat-page, distribution-page, bottom-nav
lib/
├── mongodb.ts, rag.ts, cunkebao.ts
├── distribution/   # 分销服务（绑定、佣金、提现）
├── profit-sharing/ # 空中分账
└── payment/
scripts/
├── screenshot-ui.mjs        # UI 全量截图
└── vectorize-knowledge.mjs  # 知识库向量化
```

---

## 三、分销机制（知己实现）

- **规则**：一级 20%、二级 10%；30 天绑定；7 天后结算；最低提现 10 元。
- **核心**：`lib/distribution/service.ts`、`lib/profit-sharing/service.ts`。
- **类似项目**：复制 distribution + profit-sharing，改比例与集合名。

---

## 四、AI 向量化 / RAG

- **RAG**：`lib/rag.ts`，OpenAI text-embedding-3-small 1536 维。
- **向量化脚本**：`scripts/vectorize-knowledge.mjs`。
- **未配置 Key**：使用占位向量，开发可跑通。

---

## 五、已吸收 reference 一览

| 文档 | 用途 |
|:---|:---|
| 项目经验库_知己与类似项目 | 核心代码、分销、AI 向量化、经验分配 |
| 项目开发能力_来自知己 | 10 目录、端口、附件、截图、经验、复盘 |
| 项目开发中整合存客宝获客功能 | 获客型项目 + 存客宝 |
| 多Agent与板块拆分（水泉） | 业务流程 vs 开发流程、十目录界定 |

---

*开发类似项目时：先读 项目经验库_知己与类似项目 → 按需调用协同 Skill。*
