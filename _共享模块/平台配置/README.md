# 平台配置目录 · 说明与索引

> 本目录是 **平台配置的说明与索引**，不替代实际配置位置。
> 卡若AI 的 `.gitea`、`.github`、`.cursor` 等平台约定目录 **必须保持在仓库根目录**，平台才能正确识别。

---

## 一、为何不能移动？

| 目录 | 平台 | 约定 | 移动后果 |
|:---|:---|:---|:---|
| `.gitea/` | Gitea | 工单模板、合并请求模板 | 工单/PR 模板失效 |
| `.github/` | GitHub | Actions 工作流 | 流水线不执行 |
| `.cursor/` | Cursor IDE | 规则、配置 | 规则不加载 |

这些是**平台级约定**，路径固定，无法通过配置更改。

---

## 二、各目录实际位置与内容

### 2.1 .gitea（Gitea 约定，根目录）

| 文件/目录 | 用途 |
|:---|:---|
| `.gitea/ISSUE_TEMPLATE/` | 工单模板（默认、功能建议、Bug反馈、任务报备） |
| `.gitea/pull_request_template.md` | 合并请求模板 |

维护说明：金仓/Gitea管理 Skill，`01_卡资（金）/_团队成员/金仓/Gitea管理/SKILL.md`

### 2.2 .github（GitHub 约定，根目录）

| 文件/目录 | 用途 |
|:---|:---|
| `.github/workflows/sync_github_to_gitea.yml` | GitHub → Gitea 同步流水线（定时/手动） |

维护说明：群晖NAS管理 scripts，`01_卡资（金）/_团队成员/金仓/群晖NAS管理/scripts/sync_github_to_gitea.sh`

### 2.3 .cursor（Cursor 约定，工作区根）

| 文件/目录 | 用途 |
|:---|:---|
| `.cursor/rules/karuo-ai.mdc` | 卡若AI 唯一必需的 Cursor 规则 |

维护说明：本规则为每次对话强制加载，修改后需重启 Cursor 或重载窗口生效。

---

## 三、统一管理方式

虽然这些目录不能移动，但可以通过本目录实现**统一理解与管理**：

1. **本 README**：说明各目录位置、用途、维护归属
2. **目录结构变更SOP**：`_共享模块/references/目录结构变更SOP.md` — 做目录重组时必读
3. **Skill 主索引**：`_共享模块/skill_router/SKILL.md` — 技能路径变更后需同步更新

---

## 四、新增平台配置时

若需新增（如 `.pre-commit-config.yaml`、`.editorconfig` 等）：

1. 确认该平台是否要求根目录（多数工具要求根目录）
2. 在本 README 的「二、各目录实际位置与内容」下追加说明
3. 执行 `_共享模块/references/目录结构变更SOP.md` 中的检查清单
