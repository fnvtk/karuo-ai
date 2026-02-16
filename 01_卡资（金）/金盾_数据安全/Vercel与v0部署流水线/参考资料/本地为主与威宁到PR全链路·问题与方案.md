# 本地为主 · 威宁→v0→PR 全链路：问题与方案

> **原则**：一切以**本地**为唯一主源；Vercel（威宁）、v0、GitHub 均为同步与发布出口。做前端界面时**直接用本 Skill**；卡若AI 里「我写的」也是前端开发，**都用这套对接流程**。

---

## 一、本地为主约定

| 约定 | 说明 |
|------|------|
| **主源** | 本地仓库（上帝之眼 项目根）→ fnvtk/godeye **main** |
| **前端目录（固定）** | **项目根/frontend**，勿改、勿建到别处 |
| **v0 角色** | 用 v0 做**全部前端界面**的生成与优化；v0 连 GitHub 同一仓，以 main 或 PR 合入为准 |
| **威宁（Vercel）** | 部署出口，从 GitHub main 自动构建；生产地址唯一 |
| **PR** | v0 改完用「Open Pull Request」从 v0 分支→main；可用命令行脚本自动打开并检测 |

**对接流程统一**：上帝之眼前端开发、卡若AI「我写的」里做的前端，都走：**本地 → main → v0 对话优化 → Open PR → 合 main → Vercel**。

---

## 二、全链路已打开/修复的功能（全部以本地为主）

| 序号 | 功能 | 脚本/方式 | 状态 | 说明 |
|------|------|-----------|------|------|
| 1 | 凭证加载 | .env + 账号与API索引 | ✅ | VERCEL_TOKEN、V0_API_KEY、GITHUB_TOKEN；脚本可读索引路径 |
| 2 | Vercel 部署 | deploy-vercel.js | ✅ | 创建/关联项目、生产公开、校验线上可访问 |
| 3 | v0 项目创建/关联 | sync-to-v0.js | ✅ | 绑定 vercelProjectId，避免重复创建 |
| 4 | 打开/创建「前端优化计划」对话 | create-v0-optimization-chat.js | ✅ | 先检查再创建、中文名、可 --open |
| 5 | 整理 v0 对话（留 1 条） | consolidate-v0-chats.js | ✅ | 保留最完善 1 条、改中文名、删其余 |
| 6 | v0 改完同步到 GitHub+Vercel+本地 | sync-after-v0.js | ✅ | commit+push main → Vercel 自动部署 → 写同步与反馈记录 |
| 7 | 本地推 main + 尝试 v0 从 main 初始化 | sync-local-to-v0-api.js | ✅ | 私仓时 init 可能 500/422，脚本至少完成 push main |
| 8 | 仅推 main（不改 v0） | push-local-frontend-to-main.js | ✅ | 纯本地→main |
| 9 | **Open Pull Request（v0 分支→main）** | open-pr-from-branch.js | ✅ | 可不传分支名自动取最新 v0/fnvtk-*；创建后检测 PR 存在；GITHUB_TOKEN 支持 .env 与索引 |

以上功能**全部以本地为主**：代码先在本地/frontend，再 push main 或通过 v0 产生 PR 合入 main。

---

## 三、问题与最佳解决方案（汇总）

| 现象 | 原因 | 最佳方案 |
|------|------|----------|
| 未设置 GITHUB_TOKEN，PR 打不开 | .env 无或脚本未读索引 | 上帝之眼/.env 增加 `GITHUB_TOKEN=ghp_xxx`（.gitignore 不提交）；或 账号与API索引 维护 GitHub Token，脚本已支持从索引解析 ghp_ |
| v0 里 PR「没打开」/ 检测不到 | 未用 API 创建 PR | 用 `node scripts/open-pr-from-branch.js`（不传参自动取最新 v0 分支）；创建后脚本内请求 GitHub 校验开放 PR 列表 |
| sync-local-to-v0-api 的 init 500/422 | 私仓时 v0 无法拉取 repo | 脚本只保证 push main；在 v0 网页 Git 点「Pull from main」或用 Open PR 流程把 v0 分支合 main |
| v0 401 | V0_API_KEY 无效或非 Platform | 使用 v0 设置中的 API Key（Platform），或账号与API索引 § v0.dev Secret |
| Vercel 未连 GitHub | 首次未授权 | Vercel 后台用 GitHub 登录并连接 fnvtk/godeye（一次性） |
| 预览/生产跳转登录 | 部署保护 | 脚本已 PATCH 为仅预览需登录；生产公开 |
| 对话被重复创建 / 英文名 | 未先检查、未传 name | create-v0-optimization-chat.js 已：先 GET chats，有「前端优化计划」或最近一条则复用；创建时传 `name: '前端优化计划'` |
| 前端代码放错目录 | 未固定 frontend | **硬性约定**：项目根/frontend；所有文档与脚本已统一 |
| **v0 上版本不是本地版本** | 远程 main 被 v0/PR 更新过，或 v0 未从 main 拉取 | **纯命令行**：`node scripts/v0-sync-from-local.js` 用本地 frontend 覆盖 v0 对话（强制含 LayoutWrapper 等，与自运行界面一致）。**与 GitHub 一致**：同步后在 v0 点「Create Branch」→ 连接 fnvtk/godeye，分支选 **main**。 |
| **private 仓库要让威宁能操作** | 威宁/v0 拉取或部署私仓需凭证 | 把本地 GitHub Token 给威宁：`node scripts/vercel-set-github-token.js`（从 .env 读 GITHUB_TOKEN、VERCEL_TOKEN，写入 Vercel 项目 godeye 的环境变量，target=production+preview）。执行一次即可，后续换 Token 可再执行。 |

---

## 四、本地同步到 v0 并用 v0 做前端的标准流程

```
1. 本地改 frontend（或从 v0 改完把代码落回 frontend）
2. 推 main：node scripts/push-local-frontend-to-main.js 或 sync-local-to-v0-api.js
3. 可选：v0 从 main 拉取（或 Open PR 后合 main）
4. 在 v0 打开「前端优化计划」对话做界面优化
5. v0 改完 → 在 v0 点发布 → Open Pull Request
6. 命令行打开/检测 PR：node scripts/open-pr-from-branch.js
7. GitHub 上合并 PR 到 main → Vercel 自动部署
8. 本地 git pull origin main 拉齐
9. 任务反馈：node scripts/sync-after-v0.js "说明" 写入 开发文档/8、部署/同步与反馈记录.md
```

**确保界面与功能同步 OK 的检查清单**：

- [ ] 本地 frontend 与 main 一致（或已 push）
- [ ] v0 项目绑定的为 fnvtk/godeye，当前对话基于 main 或已合 main 的 PR
- [ ] Open PR 已创建且脚本检测通过（或已在 GitHub 合并）
- [ ] 生产 https://godeye-lime.vercel.app 可访问且为最新
- [ ] 同步与反馈记录已追加（若执行了 sync-after-v0）

---

## 四.1、v0 界面同步可行性确认（确保显示本地版本）

| 确认项 | 可行 | 操作 |
|--------|------|------|
| 本地 → GitHub main | ✅ | `git push origin main` 或 `push-local-frontend-to-main.js` / `sync-local-to-v0-api.js`；以本地为准时可 `--force` |
| GitHub main → v0 界面 | ✅ | **纯命令行**：执行 **`node scripts/v0-sync-from-local.js`**，用本地 frontend 内容通过 v0 API（init type:files）创建新对话并删旧对话，v0 = 本地，不打开浏览器。公仓也可用 `v0-init-from-main.js`（repo/zip）。 |
| v0 界面 → GitHub（PR） | ✅ | v0 点「Open PR」或命令行 `open-pr-from-branch.js`，合入 main 后 Vercel 自动部署 |
| 生产站与本地一致 | ✅ | main = 本地 且 已 push 时，生产由 Vercel 从 main 构建，即与本地一致 |

**结论**：同步可行。要让 **v0 界面 = 本地**：先保证 main = 本地（已 push），再在 v0 该对话内点 **「Pull from main」** 即可。

---

## 四.2、该要的功能全部打通清单

| 功能 | 状态 | 说明 |
|------|------|------|
| Chat / 前端优化计划 | ✅ | create-v0-optimization-chat.js 打开或创建中文名对话 |
| Design / 设计 | ✅ | v0 左侧面板，与 Chat 同会话 |
| Git / 拉取 main | ✅ | v0 网页 Git → Pull from main（= 本地）；命令行 push main 已打通 |
| Open PR | ✅ | v0 点 Open PR 或 `open-pr-from-branch.js`，可检测 |
| Connect / Vars / Template / Settings | ✅ | v0 内置面板，按需使用 |
| 威宁部署 | ✅ | deploy-vercel.js；生产 godeye-lime.vercel.app |
| private 仓威宁可操作 | ✅ | vercel-set-github-token.js 把 GITHUB_TOKEN 给威宁 |
| 本地推 main、v0 从 main 初始化尝试 | ✅ | sync-local-to-v0-api.js、v0-init-from-main.js |
| 同步与反馈记录 | ✅ | sync-after-v0.js 写入 开发文档/8、部署/同步与反馈记录.md |

以上功能均已打通；界面以本地为准时，按「四.1」执行即可确保 v0 显示本地版本。

---

## 五、与卡若AI「我写的」的对接

- **卡若AI 里「我写的」**：用于写书、日记等；当其中涉及**前端界面/前端开发**时，与上帝之眼一致，**都用本流水线**。
- **统一入口**：做前端界面时，无论从上帝之眼项目还是从卡若AI 发起，都按本 Skill 执行：本地为主 → 威宁 → v0 → PR，全部命令行，有命令直接执行，结果反馈卡若。
- **Skill 触发**：见 SKILL.md triggers（含 前端界面、前端开发、v0前端、本地同步v0、威宁 v0 等）。

---

## 六、关键路径与 ID（不变）

| 项 | 值 |
|----|-----|
| 上帝之眼项目根 | /Users/karuo/Documents/开发/3、自营项目/上帝之眼 |
| 本地前端目录 | 项目根/frontend |
| GitHub | fnvtk/godeye，main 为主 |
| Vercel 项目 | godeye，prj_7Icpm7qR1hc6X61ydY1bzxAsjLVz |
| 生产地址 | https://godeye-lime.vercel.app |
| v0 项目 id | MvSR6KzOHAn |
| v0 项目页 | https://v0.app/chat/projects/MvSR6KzOHAn |
| 同步与反馈记录 | 上帝之眼/开发文档/8、部署/同步与反馈记录.md |

---

**维护**：金盾。所有错误与方案以本地为主、记录于本文档与「完整流程与问题手册」，保证后续做前端界面时直接用本 Skill 即可打通威宁→v0→PR，界面与功能同步 OK。
