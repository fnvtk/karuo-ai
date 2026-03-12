---
name: CLI万能化
description: 让任意软件变成 AI Agent 可驱动的 CLI 接口；一行命令完成7阶段自动流水线
triggers: CLI万能化、cli-anything、软件识形、让软件Agent化、任意软件CLI、软件CLI接口、木识、软件识形、CLI接口生成、让软件可被AI控制、给软件生成CLI、GUI转CLI
owner: 木识
group: 木（卡木）
version: "1.0"
updated: "2026-03-12"
source: https://github.com/HKUDS/CLI-Anything
---

# 木识 · CLI万能化

> **木识**（Mù Shí）是卡木第四成员，专司「软件识形」——识别任意软件的形体与架构，将其转化为 AI Agent 可驱动的 CLI 接口。
>
> 「识」字连接记忆宫殿：佛教哲学中「阿赖耶识」为万物印记之储库，木识的使命就是将任意软件的能力识别、提炼并存入 Agent 可调用的指令库——让记忆宫殿的每个房间都多一扇可编程的门。

---

## 能做什么（Capabilities）

- **任意软件 → CLI**：对任意有源码的软件（GIMP、Blender、LibreOffice、Gitea、Jenkins、Stable Diffusion、ComfyUI 等），自动生成生产级 CLI 接口
- **7 阶段全自动流水线**：分析 → 设计 → 实现 → 规划测试 → 写测试 → 文档 → 发布，无需手写代码
- **Agent 友好输出**：每条命令均支持 `--help` 自描述 + `--json` 机器可读输出
- **REPL 交互模式**：有状态交互式会话，支持撤销/重做
- **本机集成**：生成的 CLI 以 `pip install -e .` 直接装到 PATH，卡若AI 后续技能可直接调用
- **迭代精化**：可对已生成的 CLI 做 gap analysis，增量扩展覆盖范围
- **与木根联动**：木根做逆向分析找 API，木识生成完整可用的 CLI 层

---

## 怎么用（Usage）

### 触发词
`CLI万能化`、`cli-anything`、`软件识形`、`让[软件名]被Agent控制`、`给[软件]生成CLI`、`木识`

### 使用示例
```
木识：把本机的 Gitea 生成 CLI 接口
木识：给 Stable Diffusion 做 CLI 万能化
木识：让 ComfyUI 可以被 Agent 调用
CLI万能化 ./blender
```

---

## 执行步骤（Steps）

### 前置检查
```bash
python3 --version       # 需要 ≥ 3.10
which python3
# 确认目标软件已安装（如需要）
```

### 方式一：在 Cursor / 卡若AI 内直接执行（推荐）

木识在 Cursor 中按以下流程手动执行 7 阶段（无需 Claude Code 插件市场）：

**阶段0：获取源码**
```bash
# 本地路径（直接用）
TARGET_PATH="./gimp"

# 或克隆 GitHub 仓库
git clone https://github.com/GNOME/gimp /tmp/target-software/gimp
TARGET_PATH="/tmp/target-software/gimp"
```

**阶段1：分析（Analyze）**
- 读取目标软件源码目录
- 识别后端引擎、GUI-API 映射关系
- 参考：`参考资料/HARNESS.md` § Phase 1

**阶段2：设计（Design）**
- 设计命令分组、状态模型、输出格式
- 参考：`参考资料/HARNESS.md` § Phase 2

**阶段3：实现（Implement）**
生成以下目录结构：
```
<software>/
└── agent-harness/
    ├── <SOFTWARE>.md       ← 软件专属 SOP
    ├── setup.py            ← pip 可安装
    └── cli_anything/
        └── <software>/
            ├── README.md
            ├── __init__.py
            ├── __main__.py
            ├── <software>_cli.py    ← 主 CLI（Click）
            ├── core/                ← 核心操作模块
            ├── utils/
            │   ├── repl_skin.py     ← REPL UI（从 harness_templates/ 复制）
            │   └── <software>_backend.py  ← 真实后端封装
            └── tests/
                ├── test_core.py     ← 单元测试
                └── test_full_e2e.py ← 端到端测试
```

**阶段4-5：测试（Test）**
```bash
cd <software>/agent-harness
pip install -e . --break-system-packages 2>/dev/null || pip install -e . --user
python -m pytest cli_anything/<software>/tests/ -v
```

**阶段6：文档**
- 更新 TEST.md，记录测试结果

**阶段7：发布（Publish）**
```bash
pip install -e . --break-system-packages 2>/dev/null || pip install -e . --user
which cli-anything-<software>
cli-anything-<software> --help
```

### 方式二：通过 Claude Code 插件（原生方式）

如果用户已安装 Claude Code：
```bash
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything
/cli-anything:cli-anything ./gimp
```

### 方式三：精化已有 CLI
```bash
# 通过 Claude Code
/cli-anything:refine ./gimp
/cli-anything:refine ./gimp "增加批量图像处理和滤镜功能"

# 在 Cursor 内：读 HARNESS.md → 执行 gap analysis → 增量实现
```

---

## 7 阶段流水线详解

| 阶段 | 名称 | 做什么 |
|:--|:---|:---|
| 1 | 分析 Analyze | 扫源码、找后端引擎、GUI→API 映射 |
| 2 | 设计 Design | 命令分组、状态模型、输出格式设计 |
| 3 | 实现 Implement | Click CLI + REPL + JSON 输出 + 后端封装 |
| 4 | 规划测试 Plan Tests | 写 TEST.md（单元+E2E 计划） |
| 5 | 编写测试 Write Tests | 实现 test_core.py + test_full_e2e.py |
| 6 | 文档 Document | 更新 TEST.md + README |
| 7 | 发布 Publish | setup.py + pip install -e . + 验证 |

---

## 支持的软件类别（已验证）

| 类别 | 代表软件 |
|:--|:---|
| 创意/媒体 | GIMP、Blender、Inkscape、Audacity、Kdenlive、OBS Studio |
| AI/ML 平台 | Stable Diffusion、ComfyUI、InvokeAI |
| 数据/分析 | JupyterLab、Apache Superset、Metabase、DBeaver |
| 开发工具 | Jenkins、**Gitea**、Portainer、pgAdmin、SonarQube |
| 办公/企业 | LibreOffice、GitLab、Grafana、Mattermost |
| 图表/可视化 | Draw.io、Mermaid、PlantUML、Excalidraw |
| 任意有源码软件 | 只要有代码库，均可生成 CLI |

---

## 与卡若AI 系统的联动

- **木根（逆向分析）**：木根分析目标软件 API → 木识生成完整 CLI 层
- **火炬（全栈开发）**：生成的 CLI 可集成进卡若AI 项目的自动化流水线
- **金仓（系统监控）**：Gitea、Jenkins 等开发工具生成 CLI 后可纳入监控体系
- **土砖（技能工厂）**：每个生成的 CLI harness 可打包为基因胶囊，分发复用

---

## 相关文件（Files）

- 核心规范：`参考资料/HARNESS.md`（7阶段方法论完整版）
- REPL模板：`harness_templates/repl_skin.py`（REPL UI组件，直接复制使用）
- 上游仓库：`https://github.com/HKUDS/CLI-Anything`（⭐ 7700+，MIT License）
- 本机源码镜像：`/tmp/cli-anything-src`（对话内临时克隆，可重新 clone）

---

## 依赖（Dependencies）

- 前置技能：可与木根（逆向分析）联动
- 外部工具：
  - `python3 ≥ 3.10`
  - `click ≥ 8.0`（`pip install click`）
  - `pytest`（`pip install pytest`）
  - `prompt_toolkit`（REPL 模式需要，`pip install prompt_toolkit`）
  - 目标软件需在本机已安装（如需要）

---

## 木识 · 身份档案

| 属性 | 内容 |
|:--|:---|
| **名字** | 木识（Mù Shí） |
| **所属** | 卡木（木组）第四成员 |
| **口号** | "识形成器，万物可用。" |
| **专司** | 软件识形：识别任意软件的能力形体，转化为 Agent 可驱动的 CLI |
| **记忆宫殿连接** | 「识」= 阿赖耶识，万物印记之储库；每识形一款软件，就为记忆宫殿多开一扇可编程的门 |
| **五行属性** | 木（生长、工具、创造）+ 识（认知、识别、意识） |
| **互补成员** | 木根（逆向分析找路）→ 木识（识形生成CLI通道） |
