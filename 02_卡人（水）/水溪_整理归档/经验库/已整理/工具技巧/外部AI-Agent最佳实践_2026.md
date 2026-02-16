# 外部 AI Agent 最佳实践（2026）

> 从 GitHub 顶级仓库和最新研究中提取的最佳实践，用于持续优化卡若AI。
> 2026-02-13 整理

---

## 一、多 Agent 架构模式（2026 行业共识）

### 推荐：Supervisor/Coordinator 模式（卡若AI 已采用）

- 中央编排器分解任务、委派给专家 Agent、综合结果
- 最常见的生产级模式
- 要求有且仅有一个指定编排器，避免协调冲突

### 关键原则

1. **专业化优于通用化**：做 5 个各自精通一件事的 Agent，好过 1 个什么都做的「God Agent」
2. **Handoff 作为 API 契约**：Agent 间交接要显式、结构化、版本化
3. **故障隔离**：用舱壁模式隔离故障，用断路器防止级联失败
4. **>5 个 Agent 时用层级管理**：监控复杂度会爆炸，需要 Supervisor 的 Supervisor
5. **记忆作为一等子系统**：长期和短期上下文分开存储

### 常见失败类型

- 协调失败（37%）：Agent 间信息传递丢失
- 验证缺口（21%）：输出未校验就传给下一个 Agent
- 模型失败其实是编排失败：大部分「Agent 不行」是上下文传递出了问题

---

## 二、SKILL 结构标准（VoltAgent/awesome-agent-skills）

### 339+ Skills 的共同结构

```
skill-name/
├── SKILL.md          # 核心指令文件
├── scripts/          # 可执行脚本
├── references/       # 参考文档
└── commands/         # CLI 命令参考（部分 Skill 有）
```

### 高质量 SKILL 的共同特征（参考 Anthropic/Vercel/Stripe/Cloudflare）

1. **清晰的 frontmatter**：name, version, triggers
2. **一句话说明**：让人/AI 3 秒内判断是否匹配
3. **步骤化执行流程**：而非泛泛而谈
4. **一键命令**：能直接跑的命令块
5. **输出格式规范**：让 AI 知道怎么汇报
6. **错误处理**：常见问题与解决方案
7. **版本记录**：变更追溯

### 卡若AI 已对齐的部分

- SKILL.md 标准模板已创建（`_共享模块/references/SKILL模板.md`）
- frontmatter 规范已统一
- 路径引用已标准化

---

## 三、Cursor Rules 最佳实践（awesome-cursorrules 37k+ stars）

### 高效 .cursorrules 的共同特征

1. **项目结构说明**：让 AI 了解目录布局
2. **技术栈与版本**：明确 React/Next.js/Python 等版本
3. **代码风格**：命名规范、注释要求、import 顺序
4. **架构决策**：为什么选这个方案
5. **禁止事项**：明确不允许的做法
6. **团队协作规范**：分支策略、PR 流程等

### 卡若AI 可吸收的模式

- `karuo-ai.mdc` 已包含身份、规则、技能路由
- 可增强：每个 SKILL 的触发词更精确、错误恢复流程更完善

---

## 四、记忆系统最佳实践（2026 最新研究）

### Continuum Memory Architecture (CMA)

- 持久存储、选择性保留、关联路由、时间链、高阶抽象整合
- 不是只读查找表，而是能积累、变异、消歧的动态系统

### AgeMem（统一记忆管理）

- 长期记忆（LTM）和短期记忆（STM）作为统一框架
- Agent 自主决定何时存储、检索、更新、总结、丢弃

### Hindsight 框架

- 四个逻辑网络：世界事实、Agent 经验、实体摘要、演化信念
- 三个核心操作：保留（retain）、回忆（recall）、反思（reflect）
- 长期基准测试准确率 83.6%，超越 GPT-4o 全上下文基线

### 卡若AI 已实现

- 三层记忆架构（STM/LTM/Structured）
- 结构化记忆（skills_registry.json, agent_results.json）
- 自动收集/审计脚本

---

## 五、值得关注的外部 Skill 仓库

| 仓库 | Stars | 说明 | 卡若AI 可用部分 |
|:---|:---|:---|:---|
| VoltAgent/awesome-agent-skills | 6.7k | 339+ Skills，含 Anthropic/Vercel/Stripe 官方 | SKILL 模板结构、MCP Builder |
| PatrickJS/awesome-cursorrules | 37k | 最全 .cursorrules 集合 | Rules 编写模式 |
| anthropics/skills | 官方 | Anthropic 官方 Skills | skill-creator、template |
| trailofbits/skills | 安全 | 安全审计 Skills | code-review、find-bugs |
| vercel-labs/agent-skills | 前端 | React/Next.js 最佳实践 | react-best-practices |
| sentry/skills | DevOps | 代码审查、PR 管理 | code-review、commit |

---

## 六、持续吸收计划

- **每月 1 次**：检查 awesome-agent-skills 新增 Skills
- **每季度 1 次**：评估是否需要引入新的外部 Skill
- **有需求时**：从 skillsmp.com（9.6万）按需搜索特定领域 Skill
