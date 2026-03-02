# 卡若AI · MAX Mode 说明

> **规则在卡若AI 本体，不在 Cursor。** 卡若AI 每次被调用时均为 MAX Mode，定义在 `BOOTSTRAP.md`，对所有平台生效。  
> 更新：2026-02-16

---

## 一、规则放在哪里

- **卡若AI 本体**：`BOOTSTRAP.md` **第四节（MAX Mode）** + **第五节（执行流程）**。任何平台（Cursor、Claude、API 等）只要读 BOOTSTRAP，即按 MAX Mode 执行。
- **Cursor**：`.cursor/rules/karuo-ai.mdc` 仅引用 BOOTSTRAP，不重复定义 MAX Mode；Cursor 内补充记忆路径、每日收集、Gitea、复盘格式等本地特有项。

---

## 二、默认行为（BOOTSTRAP 第四节）

- 思考更深度（多角度、边界与风险）
- 任务拆解更细（子步骤、依赖与顺序；执行计划带精确路径/命令/预期）
- 执行前检查联动子技能
- 至少两轮验证
- 复盘五块更完整

无需在任何平台单独开启或提问，**每次调用卡若AI 都是 MAX Mode**。
