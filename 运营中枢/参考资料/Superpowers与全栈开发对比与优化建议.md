# Superpowers 与全栈开发对比与优化建议

> 来源：GitHub obra/superpowers；对比对象：卡若AI 火炬「全栈开发」+ 水泉「需求拆解与计划制定」+ 火眼「智能追问」。  
> 更新：2026-02-16

---

## 一、Superpowers 概览

| 项目 | 说明 |
|:---|:---|
| **仓库** | https://github.com/obra/superpowers |
| **定位** | 面向 Coding Agent 的完整软件开发工作流，基于可组合 Skill + 初始指令，强制在写代码前先澄清、计划、再执行 |
| **核心流程** | 不直接写代码 → 先问清目标 → 分块展示设计供确认 → 写「无上下文工程师也能跟」的实施计划 → 子 Agent 按任务执行 + 两阶段评审（规格符合 → 代码质量）→ 收尾分支 |

### 1.1 主要 Skill 与职责

| Skill | 作用 | 卡若AI 近似能力 |
|:---|:---|:---|
| **brainstorming** | 写代码前激活；苏格拉底式澄清、分块展示设计、保存设计文档 | 火眼「智能追问」+ 水泉「需求拆解」 |
| **using-git-worktrees** | 设计确认后建独立 worktree、新分支、验证干净测试基线 | 无独立 Skill，依赖手工/Gitea |
| **writing-plans** | 把工作拆成 2～5 分钟/步的 bite-sized 任务；每步含**精确路径、完整代码、验证命令与预期结果**；TDD/YAGNI/DRY；计划存 `docs/plans/YYYY-MM-DD-.md` | 水泉「需求拆解与计划制定」偏表格/列表，缺「每步含完整代码与命令」 |
| **subagent-driven-development** | 按任务派发**新子 Agent**，每任务后：规格符合评审 → 代码质量评审；同会话内不切上下文 | 无；当前为单 Agent 连续执行 |
| **executing-plans** | 另一执行模式：批量执行 + 人工检查点（可并行会话） | 无 |
| **test-driven-development** | 强制 RED-GREEN-REFACTOR：先写失败测试 → 看失败 → 最小实现 → 看通过 → 提交；先于测试写的代码删掉 | 全栈开发未强制 TDD 流程 |
| **requesting-code-review** | 任务间按计划做 Code Review，按严重程度报问题，严重问题阻塞 | 无独立评审 Skill |
| **finishing-a-development-branch** | 任务完成后：跑测试、提供合并/PR/保留/丢弃选项、清理 worktree | 无统一收尾流程 |

### 1.2 Writing-Plans 的「bite-sized」标准（可借鉴）

- 每步 = **一个动作（2～5 分钟）**  
  例：「写失败测试」一步、「运行并确认失败」一步、「写最小通过实现」一步、「运行并确认通过」一步、「提交」一步。
- 计划文档必须包含：
  - **精确路径**：Create/Modify/Test 的完整路径与行号区间。
  - **完整代码**：不是「加校验」而是给出具体代码块。
  - **精确命令与预期**：如 `pytest path::test_name -v`，Expected: FAIL with "function not defined"。
- 计划头强制：Goal、Architecture、Tech Stack；并注明「必须用 executing-plans / subagent-driven-development 执行」。

### 1.3 Subagent-Driven 的两阶段评审（可借鉴）

1. **Spec compliance**：代码是否完全符合计划/规格，有无多做、少做。
2. **Code quality**：可读性、重复、魔法数等；通过后再进入下一任务。  
禁止：在 spec 未通过前做 code quality 评审；跳过任一轮审或未修完就进入下一任务。

---

## 二、全栈开发当前能力摘要

- **入口**：开发文档 1～10（需求|架构|原型|前端|接口|后端|数据库|部署|手册|项目管理）；官网/全站以卡若ai网站开发文档为标准。
- **流程**：调研（读 README + 1、需求）→ 按 1～10 生成/更新 → 验收与复盘（项目落地执行表 + 迭代复盘模板）。
- **协同**：水泉「需求拆解与计划制定」、火眼「智能追问」、金盾存客宝、木果开发模板；前端走「前端开发」Skill + 毛玻璃规范。
- **弱项**（相对 Superpowers）：
  - 计划多为「任务列表/表格」，缺少**每步的精确路径、完整代码、可执行命令与预期**。
  - 无强制 TDD（先失败测试再实现）。
  - 无「每任务后规格符合 + 代码质量」的双阶段评审。
  - 无独立 worktree/分支工作流与收尾分支的标准化。
  - 无子 Agent 按任务派发、避免上下文污染的机制。

---

## 三、优化迭代建议（按优先级）

### P0：计划粒度与可执行性（对齐 writing-plans）

- **在「需求拆解与计划制定」或全栈开发 SKILL 中**增加「实施计划」标准：
  - 每个子任务包含：**Files（Create/Modify/Test 精确路径）**、**Steps**：写失败测试 → 运行看失败 → 写最小实现 → 运行看通过 → 提交。
  - 计划中写清**具体命令与预期输出**（如 pytest 命令与 Expected: FAIL/PASS），而不是「跑测试」。
- **计划保存路径**可约定：如 `开发文档/10、项目管理/plans/YYYY-MM-DD-< feature>.md`，与 1～10 一致。
- **全栈开发 SKILL** 在「执行流程」中增加一条：实施阶段优先按「带精确路径与命令的实施计划」执行，无计划时先生成再执行。

### P1：TDD 与评审纪律

- **全栈开发**或「需求拆解与计划制定」中增加可选/推荐：**先写失败测试 → 再写最小实现 → 再通过测试 → 再提交**；注明「新功能尽量 TDD，遗留代码可逐步补测」。
- **任务间评审**：在 10、项目管理 或 复盘模板 中增加「单任务/迭代结束：规格符合检查 + 代码质量检查」两步，与 Superpowers 的 spec/code 两阶段对应；可写进迭代复盘模板的检查清单。

### P2：Worktree / 分支与收尾

- 大功能/实验性开发：推荐在**独立分支或 worktree** 进行，在开发文档或项目管理中写清「分支策略」与「完成后的合并/PR/丢弃」选项。
- 不强制引入 Superpowers 的 using-git-worktrees/finishing-a-development-branch 全文，但可把「建分支 → 开发 → 验证 → 合并/丢弃」收尾流程写进 `10、项目管理` 的 SOP。

### P3：子 Agent 与两阶段评审（长期）

- **子 Agent 按任务派发**依赖平台（Cursor/Codex 等）是否支持 mcp_task 或等效「每任务新会话」；若支持，可在「需求拆解与计划制定」或全栈开发中增加「执行模式」选项：当前会话连续执行 vs 按任务派发子 Agent + 每任务后 spec 审 + code 审。
- 若暂不支持，仍可先落实「两阶段评审」为人工或同 Agent 的固定步骤（先核对计划再看代码质量），与 Superpowers 理念对齐。

---

## 四、对照小结

| 维度 | Superpowers | 全栈开发（现状） | 建议 |
|:---|:---|:---|:---|
| 设计澄清 | brainstorming，分块确认 | 智能追问 + 需求拆解 | 保持；可强化「分块展示设计」 |
| 计划粒度 | 2～5 分钟/步，精确路径+完整代码+命令 | 任务列表，缺路径/代码/命令 | P0：增加实施计划标准与示例 |
| 执行方式 | 子 Agent/任务 + 两阶段评审 | 单 Agent 连续执行 | P3：平台支持时引入；先做两阶段评审 |
| TDD | 强制 RED-GREEN-REFACTOR | 未强制 | P1：推荐 TDD，写进流程与复盘 |
| 分支/收尾 | worktree + finishing-a-development-branch | 无统一规范 | P2：在 10、项目管理 中写清分支与收尾 |
| 计划存档 | docs/plans/YYYY-MM-DD-.md | 无统一路径 | 约定存 10、项目管理/plans/ |

---

## 五、参考链接

- Superpowers 仓库：https://github.com/obra/superpowers  
- writing-plans：https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md  
- subagent-driven-development：https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md  
- 全栈开发 Skill：`04_卡火（火）/火炬_全栈消息/全栈开发/SKILL.md`  
- 需求拆解与计划制定：`02_卡人（水）/水泉_规划拆解/需求拆解与计划制定/SKILL.md`  
