#!/usr/bin/env python3
"""
项目AI生成器 · 核心脚本
根据项目需求一键生成完整的项目AI体系（五行架构 + 全套技能 + GitHub同步 + CLAUDE.md + Cursor规则）

用法：
  python3 generate_project_ai.py --name "玩值电竞AI" --desc "电竞赛事运营平台" --industry "电竞" \
    --github "https://github.com/fnvtk/wanzhi-ai" --output "/path/to/output/"

  python3 generate_project_ai.py --interactive  # 交互式生成
"""
import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

KARUO_AI_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
TODAY = datetime.now().strftime("%Y-%m-%d")
NOW = datetime.now().strftime("%Y-%m-%d %H:%M")

INDUSTRY_PRESETS = {
    "电商": {"slogans": ["部署稳了。", "流程清了。", "产品出了！", "代码好了。", "质量控了。"], "extra": "支付系统、订单管理、库存管理"},
    "SaaS": {"slogans": ["部署稳了。", "流程清了。", "产品出了！", "代码好了。", "质量控了。"], "extra": "多租户、订阅管理"},
    "电竞": {"slogans": ["服务稳了。", "赛事排了。", "体验棒了！", "功能上了。", "测试过了。"], "extra": "赛事系统、实时对战、数据分析"},
    "游戏": {"slogans": ["服务稳了。", "赛事排了。", "体验棒了！", "功能上了。", "测试过了。"], "extra": "游戏引擎、实时通信"},
    "教育": {"slogans": ["服务稳了。", "课程排了。", "内容好了！", "功能上了。", "质量过了。"], "extra": "课程系统、考试引擎、学习路径"},
    "金融": {"slogans": ["系统稳了。", "合规过了。", "产品出了！", "代码好了。", "风控过了。"], "extra": "风控系统、交易引擎"},
    "内容": {"slogans": ["服务稳了。", "内容排了。", "创意好了！", "功能上了。", "质量过了。"], "extra": "内容分发、推荐算法"},
    "通用": {"slogans": ["部署稳了。", "流程清了。", "产品出了！", "代码好了。", "质量控了。"], "extra": ""},
}

FIVE_ELEMENTS = [
    {"element": "金", "domain": "基础架构与运维", "suffix": "资", "role_desc": "运维/安全/部署"},
    {"element": "水", "domain": "项目管理与协调", "suffix": "流", "role_desc": "管理/协调/对接"},
    {"element": "木", "domain": "产品设计与规划", "suffix": "产", "role_desc": "产品/设计/研究"},
    {"element": "火", "domain": "技术研发与开发", "suffix": "码", "role_desc": "开发/修复/审查/架构"},
    {"element": "土", "domain": "质量保障与复用", "suffix": "质", "role_desc": "测试/复用/发布/规范"},
]

MEMBERS = {
    "金": [
        {"name": "金仓", "role": "服务器运维", "skills": [
            ("Docker管理", "Docker、容器、镜像、docker-compose", "容器编排、镜像管理、Compose 部署"),
            ("CICD管理", "CI/CD、流水线、GitHub Actions、自动部署", "持续集成与持续部署流水线配置"),
            ("服务器管理", "宝塔、服务器、SSL、域名、Nginx", "服务器配置、反向代理、证书管理"),
            ("系统监控", "系统状态、监控、告警、CPU、内存", "系统资源实时监控与告警"),
            ("数据库运维", "数据库维护、MongoDB运维、MySQL运维", "数据库备份、优化、迁移"),
            ("NAS管理", "NAS、群晖、存储", "群晖NAS 部署与维护"),
            ("Gitea管理", "Gitea、Git仓库、代码仓库", "代码仓库管理与同步"),
            ("环境部署", "环境配置、开发环境、测试环境、生产环境", "多环境一键配置与切换"),
        ]},
        {"name": "金盾", "role": "安全防护", "skills": [
            ("安全审计", "安全审计、漏洞扫描、依赖检查", "代码安全审计与依赖漏洞扫描"),
            ("备份恢复", "备份、灾备、数据恢复", "数据备份策略与灾难恢复"),
        ]},
    ],
    "水": [
        {"name": "水溪", "role": "文档归档", "skills": [
            ("文档归档", "文档整理、归档、技术文档", "技术文档分类与归档"),
            ("记忆管理", "记忆、存入记忆、项目知识", "项目知识沉淀与检索"),
            ("经验沉淀", "经验、复盘沉淀、最佳实践", "研发经验库管理"),
        ]},
        {"name": "水泉", "role": "需求分析", "skills": [
            ("需求拆解", "需求拆解、任务分析、PRD分析", "大需求拆成可执行开发任务"),
            ("任务规划", "任务规划、排期、里程碑、Sprint", "制定开发排期与里程碑"),
            ("进度跟踪", "进度报告、开发进度、迭代回顾", "项目进度报告与迭代回顾"),
        ]},
        {"name": "水桥", "role": "平台对接", "skills": [
            ("飞书管理", "飞书日志、飞书文档、飞书对接", "飞书日志/文档/表格自动化"),
            ("智能纪要", "会议纪要、产研纪要、飞书妙记", "会议录音转结构化纪要"),
            ("GitHub对接", "GitHub、PR、Issue、代码合并", "GitHub PR/Issue 管理与自动化"),
        ]},
    ],
    "木": [
        {"name": "木叶", "role": "产品设计", "skills": [
            ("PRD编写", "PRD、产品需求文档、功能设计", "产品需求文档自动生成"),
            ("交互设计", "交互、UI、UX、界面设计", "交互原型与 UI/UX 设计"),
            ("数据分析", "产品数据、埋点、漏斗分析", "产品数据分析与洞察"),
        ]},
        {"name": "木根", "role": "用户研究", "skills": [
            ("竞品分析", "竞品、竞品分析、行业分析", "竞品功能/策略对比报告"),
            ("用户调研", "用户研究、用户反馈、调研", "用户调研设计与反馈分析"),
        ]},
        {"name": "木果", "role": "原型模板", "skills": [
            ("项目模板", "项目模板、脚手架、初始化项目", "前后端项目脚手架生成"),
            ("原型生成", "原型、线框图、Mockup", "快速原型与线框图生成"),
        ]},
    ],
    "火": [
        {"name": "火炬", "role": "全栈开发", "skills": [
            ("全栈开发", "全栈开发、全栈、开发", "全栈项目开发（前端+后端+数据库）"),
            ("前端开发", "前端、React、Vue、Next.js、CSS", "React/Vue/Next.js 前端开发"),
            ("后端开发", "后端、Node.js、Python、API、Express", "Node.js/Python 后端与 API 开发"),
            ("API设计", "API设计、RESTful、GraphQL、接口", "RESTful/GraphQL API 架构设计"),
            ("数据库设计", "数据库设计、Schema、建表、索引", "MongoDB/MySQL Schema 设计与优化"),
        ]},
        {"name": "火锤", "role": "代码修复", "skills": [
            ("代码修复", "Bug、修复、报错、异常", "Bug 定位与修复"),
            ("性能优化", "性能优化、慢查询、加速", "前后端性能瓶颈定位与优化"),
        ]},
        {"name": "火眼", "role": "代码审查", "skills": [
            ("CodeReview", "Code Review、代码审查、代码评审", "代码质量审查与优化建议"),
            ("架构审查", "架构审查、架构评审、技术评审", "系统架构合理性审查"),
        ]},
        {"name": "火种", "role": "技术架构", "skills": [
            ("技术选型", "技术选型、框架对比、选框架", "技术栈/框架/工具选型决策"),
            ("架构设计", "架构设计、系统设计、微服务", "系统架构与微服务设计"),
            ("开发文档", "开发文档、API文档、技术方案", "API 文档、技术方案文档生成"),
        ]},
    ],
    "土": [
        {"name": "土基", "role": "测试工程", "skills": [
            ("单元测试", "单元测试、unit test、组件测试", "单元/组件测试编写与执行"),
            ("集成测试", "集成测试、E2E、API测试、端到端", "API/E2E 集成测试"),
            ("性能测试", "性能测试、压测、负载测试", "压力测试与性能基准测试"),
        ]},
        {"name": "土砖", "role": "技能复制", "skills": [
            ("技能工厂", "创建技能、生成Skill", "批量创建/复制 SKILL"),
            ("基因胶囊", "基因胶囊、打包技能、解包胶囊、继承能力", "Skill 打包为可遗传胶囊"),
        ]},
        {"name": "土渠", "role": "发布管理", "skills": [
            ("发布管理", "发布、版本管理、灰度、上线", "版本发布与灰度部署"),
            ("变更日志", "CHANGELOG、版本记录、发布记录", "自动生成 CHANGELOG"),
        ]},
        {"name": "土簿", "role": "技术债务", "skills": [
            ("代码规范", "代码规范、ESLint、Prettier、lint", "代码规范配置与检查"),
            ("技术债务", "技术债务、重构、todo清理", "技术债务跟踪与重构规划"),
        ]},
    ],
}

# Skill 编号前缀映射
SKILL_NUM_PREFIX = {"金": "G", "水": "W", "木": "M", "火": "F", "土": "E"}


def get_preset(industry: str) -> dict:
    for key in INDUSTRY_PRESETS:
        if key in industry:
            return INDUSTRY_PRESETS[key]
    return INDUSTRY_PRESETS["通用"]


def build_group_name(prefix: str, elem_info: dict) -> str:
    return f"{prefix}{elem_info['suffix']}（{elem_info['element']}）"


def make_dirs(base: Path, prefix: str):
    """创建完整目录结构"""
    dirs = [
        ".cursor/rules",
        "scripts",
        "运营中枢/参考资料",
        "运营中枢/使用手册",
        "运营中枢/工作台",
        "导出/基因胶囊",
    ]
    for elem in FIVE_ELEMENTS:
        group = build_group_name(prefix, elem)
        group_num = FIVE_ELEMENTS.index(elem) + 1
        group_dir = f"{group_num:02d}_{group}"
        for member_list in MEMBERS[elem["element"]]:
            member_dir = f"{group_dir}/{member_list['name']}_{member_list['role']}"
            for skill_name, _, _ in member_list["skills"]:
                dirs.append(f"{member_dir}/{skill_name}")
    for d in dirs:
        (base / d).mkdir(parents=True, exist_ok=True)


def gen_bootstrap(base: Path, cfg: dict):
    preset = get_preset(cfg["industry"])
    slogans = preset["slogans"]
    prefix = cfg["prefix"]

    team_tree = f"""{cfg['name']}（研发总管）
├── {prefix}资（金）"{slogans[0]}"      → 金仓（服务器运维）、金盾（安全防护）
├── {prefix}流（水）"{slogans[1]}"      → 水溪（文档归档）、水泉（需求分析）、水桥（平台对接）
├── {prefix}产（木）"{slogans[2]}"      → 木叶（产品设计）、木根（用户研究）、木果（原型模板）
├── {prefix}码（火）"{slogans[3]}"      → 火炬（全栈开发）、火锤（代码修复）、火眼（代码审查）、火种（技术架构）
└── {prefix}质（土）"{slogans[4]}"      → 土基（测试工程）、土砖（技能复制）、土渠（发布管理）、土簿（技术债务）"""

    content = f"""# {cfg['name']} 启动指令（平台无关）

> **本文件是{cfg['name']} 的唯一启动入口**。无论在 Cursor、ChatGPT、Claude、Windsurf、终端、API 还是任何其他 AI 平台，读完这一个文件就能接活、干活、交付。
> 版本：1.0 | 更新：{TODAY}
> 继承自：卡若AI v5.0 架构体系

---

## 一、你是谁

- **名字**：{cfg['name']}
- **身份**：{cfg['desc']}的 AI 研发总管
- **定位**：面向全栈开发、前端、后端、产品经理、DevOps 的智能研发助手
- **工作台**：`{cfg['output']}`（本地路径，远程场景用相对路径即可）
- **血统**：继承自卡若AI 五行架构体系，专注{cfg['industry']}场景深度适配

---

## 二、团队（5 负责人 → 14 成员 → {cfg['skill_count']} 技能）

```
{team_tree}
```

### 五行 · 研发映射

| 五行 | 负责人 | 研发域 | 口头禅 | 核心职责 |
|:---|:---|:---|:---|:---|
| 金 | {prefix}资 | 基础架构与运维 | "{slogans[0]}" | 服务器、Docker、CI/CD、监控、备份 |
| 水 | {prefix}流 | 项目管理与协调 | "{slogans[1]}" | 需求管理、排期、文档、飞书对接 |
| 木 | {prefix}产 | 产品设计与规划 | "{slogans[2]}" | PRD、原型、竞品分析、用户研究 |
| 火 | {prefix}码 | 技术研发与开发 | "{slogans[3]}" | 全栈、前端、后端、API、架构设计 |
| 土 | {prefix}质 | 质量保障与复用 | "{slogans[4]}" | 测试、发布、代码规范、基因胶囊 |

**分配规则**：用户说需求 → 研发总管按关键词/领域匹配负责人 → 负责人分配给成员 → 成员读 SKILL.md 执行。多技能按 金→水→木→火→土 优先级。用户可 `@角色名` 或 `@成员名` 指定。

---

## 三、启动顺序与运转流程（Boot Sequence）

每次新对话开始，按以下顺序加载上下文（**只读必要的，不要全读**）：

| 步骤 | 读什么 | 为什么 |
|:---|:---|:---|
| 1 | **本文件** `BOOTSTRAP.md` | 知道自己是谁、团队怎么分、怎么工作 |
| 2 | **技能注册表** `SKILL_REGISTRY.md` | 查找用户需求对应的技能和路径 |
| 3 | **对应技能的 SKILL.md** | 拿到具体执行指令（只读匹配到的那个） |
| 4 | **（强制）在对话中展示思考与拆解（文字版）** | 接到用户任务并完成理解后，必须先在本轮对话中以详细文字输出思考结果、任务拆解、执行计划 |

**运转流程强制一环**：了解完用户需求后 → **深度思考与拆解** → **在对话里用详细文字展示**（思考结果 + 任务拆解 + 计划）→ 再继续往下执行。

**启动瘦身（按需加载）**：步骤 2 不需要全表扫描。优先只加载 `SKILL_REGISTRY.md` 中 🔴 热技能（≤8 个）的触发词+路径；未命中时再懒加载其余部分。

**任务看板**：跨组协作或接续任务时，先读 `运营中枢/工作台/当前任务看板.md` 确认在进行的任务上下文。

**基因胶囊（内部查阅）**：需要快速查阅本地胶囊清单或继承能力时，读 `导出/基因胶囊/README_基因胶囊导出说明.md`。

---

## 四、MAX Mode（默认 · {cfg['name']} 本体）

**{cfg['name']} 每次被调用时，均以 MAX Mode 运行。**

- **思考**：更深度（多角度、边界情况、风险与回退）；结合 SKILL_REGISTRY 热技能与相关子技能做扩展。
- **任务拆解**：粒度更细，子步骤、依赖与顺序写清；执行计划尽量带**精确路径、命令、预期**。
- **技能联动**：执行前检查是否有**联动子技能**需一并考虑。
- **验证**：至少两轮验证（结果与目标匹配、无遗漏）；不通过则回溯再执行。
- **复盘**：五块齐全且更完整，可带简要数据、引用或下一步可执行动作。

---

## 四.1、并行处理（多线程 · 一次对话内 1～6 线程）

**当任务可拆为多个相对独立的子任务时**，{cfg['name']} 应启用**多线程/多子任务并行处理**。

- **数量**：可开 **1～6 个**并行线程。按任务复杂度与独立性决定。
- **边界与域**：{cfg['name']} 负责规范各线程的边界与归属域，避免重叠与冲突。
- **汇总**：所有并行线程完成后，汇总结果、去重、合并结论，再进入验证与复盘。

---

## 五、执行流程（强制 · 含 MAX Mode）

### 第一步：先思考，并在对话中以详细文字展示拆解与计划（强制）

### 第二步：执行

按思考结论：**先搜索**本仓库及网上是否有类似/现成命令或流程，**有则直接按现成方式执行**；否则查 `SKILL_REGISTRY.md` → 读对应 SKILL.md → 按步骤执行。

### 第三步：反复验证结果（强制 · 至少两轮）

### 第四步：回复形式 = 强制复盘（五块齐全：🎯📌💡📝▶）

---

## 六、标准命令

| 命令 | 触发方式 | 做什么 |
|:---|:---|:---|
| **技能查找** | 用户说任何需求 | 查 SKILL_REGISTRY.md → 找到技能路径 → 读 SKILL.md 执行 |
| **常规操作** | 任何可自动化操作 | 优先命令行 |
| **复盘** | **所有对话强制** | AI 回复一律用完整复盘形式（🎯📌💡📝▶） |
| **沉淀** | 发现有价值的经验 | 写入经验库 |
| **基因胶囊** | 打包技能、解包胶囊 | 读基因胶囊 SKILL.md |
| **Git 同步** | 有文件变更时 | 自动推送到 GitHub |

---

## 七、全局规则

0. **红线**：① 不改变{cfg['name']} 整体结构 ② 不导致服务宕机 ③ 不删除生产数据。
1. **禁止独立功能目录**：不得新建与五行、运营中枢并列的功能目录。
2. **大文件**：Skill 目录禁止 >20MB 文件
3. **风格**：中文优先，技术术语保留英文。
4. **终端命令**：直接执行不询问
5. **常规操作优先命令行 + 复用现成流程**

---

## 八、平台适配

| 平台 | 适配文件 | 说明 |
|:---|:---|:---|
| **Cursor** | `.cursor/rules/{cfg['slug']}.mdc` | Cursor 自动加载 |
| **GitHub** | `.github/` | GitHub 仓库配置 |
| **其他 AI** | 对话开头粘贴本文件 | 或告诉 AI：「读 BOOTSTRAP.md」 |

---

## 九、与卡若AI 的关系

{cfg['name']} 是卡若AI 五行架构的**{cfg['industry']}场景分支**：
- **继承**：五行管理体系、BOOTSTRAP 启动流程、SKILL_REGISTRY 注册表、基因胶囊系统、复盘格式
- **适配**：五行角色重映射为研发五域（运维/管理/产品/开发/质量）
- **独立**：{cfg['name']} 作为独立仓库运行，有自己的技能树和记忆

---

## 十、快速开始

**场景 1：你是 AI，第一次接触{cfg['name']}**
1. 读完本文件，你就知道团队结构和工作方式了
2. 用户说需求 → 查 `SKILL_REGISTRY.md` → 找到技能 → 读那个 SKILL.md → 干活

**场景 2：在 Cursor 里用**
1. `.cursor/rules/{cfg['slug']}.mdc` 会自动加载
2. 正常对话即可
"""
    (base / "BOOTSTRAP.md").write_text(content, encoding="utf-8")


def gen_skill_registry(base: Path, cfg: dict):
    prefix = cfg["prefix"]
    lines = [
        f"# {cfg['name']} 技能注册表（Skill Registry）\n",
        f"> **一张表查所有技能**。任何 AI 拿到这张表，就能按关键词找到对应技能的 SKILL.md 路径并执行。",
        f"> {cfg['skill_count']} 技能 | 14 成员 | 5 负责人",
        f"> 版本：1.0 | 更新：{TODAY}",
        f"> 继承自：卡若AI 技能注册表 v5.4\n",
        "---\n",
        "## 使用方法\n",
        "1. 用户说需求 → 在「触发词」列搜索匹配",
        "2. 找到行 → 读「SKILL 路径」列的文件",
        "3. 按 SKILL.md 里的步骤执行\n",
        "多技能匹配时按 **金→水→木→火→土** 优先级。用户可用 `@成员名` 指定。\n",
        "---\n",
        "## 技能热度分级（按需加载）\n",
        "| 热度 | 定义 | 加载策略 |",
        "|:---|:---|:---|",
        "| 🔴 热 | 近 30 天使用 ≥3 次 | 启动时预加载触发词+路径 |",
        "| 🟡 温 | 近 30 天使用 1～2 次 | 仅保留触发词索引，命中后读 SKILL.md |",
        "| ⚪ 冷 | 30 天未使用 | 不加载，需要时按路径全量读取 |\n",
        "### 当前热技能\n",
        "| # | 技能 | 热度 |",
        "|:--|:---|:---|",
        "| F01 | 全栈开发 | 🔴 热 |",
        "| F01a | 前端开发 | 🔴 热 |",
        "| F01b | 后端开发 | 🔴 热 |",
        "| F02 | 代码修复 | 🔴 热 |",
        "| F03 | Code Review | 🔴 热 |",
        "| W01 | 需求拆解 | 🔴 热 |",
        "| G01 | Docker管理 | 🔴 热 |",
        "| E02 | 集成测试 | 🔴 热 |\n",
        "---\n",
    ]

    group_names_cn = {"金": "基础架构与运维", "水": "项目管理与协调", "木": "产品设计与规划", "火": "技术研发与开发", "土": "质量保障与复用"}
    group_labels = {"金": "存资", "水": "存流", "木": "存产", "火": "存码", "土": "存质"}

    skill_counter = 0
    stats = {}

    for idx, elem_info in enumerate(FIVE_ELEMENTS):
        elem = elem_info["element"]
        group_num = idx + 1
        group = build_group_name(prefix, elem_info)
        group_dir_name = f"{group_num:02d}_{group}"
        label = f"{prefix}{elem_info['suffix']}"

        lines.append(f"## {elem}组 · {label}（{group_names_cn[elem]}）\n")
        lines.append("| # | 技能 | 成员 | 触发词 | SKILL 路径 | 一句话 |")
        lines.append("|:--|:---|:---|:---|:---|:---|")

        num_prefix = SKILL_NUM_PREFIX[elem]
        skill_idx = 0
        group_count = 0
        for member in MEMBERS[elem]:
            for skill_name, triggers, desc in member["skills"]:
                skill_idx += 1
                suffix = "" if skill_idx == 1 else chr(96 + skill_idx - 1) if skill_idx <= 5 else str(skill_idx)
                num = f"{num_prefix}{skill_idx:02d}" if skill_idx <= 9 else f"{num_prefix}{skill_idx}"
                path = f"`{group_dir_name}/{member['name']}_{member['role']}/{skill_name}/SKILL.md`"
                lines.append(f"| {num} | {skill_name} | {member['name']} | {triggers} | {path} | {desc} |")
                skill_counter += 1
                group_count += 1

        lines.append("")
        stats[elem] = {"label": label, "members": len(MEMBERS[elem]), "skills": group_count}

    lines.append("---\n")
    lines.append("## 统计\n")
    lines.append("| 组 | 负责人 | 成员数 | 技能数 |")
    lines.append("|:--|:---|:--|:--|")
    total_members = 0
    for elem_info in FIVE_ELEMENTS:
        e = elem_info["element"]
        s = stats[e]
        lines.append(f"| {e} | {s['label']} | {s['members']} | {s['skills']} |")
        total_members += s["members"]
    lines.append(f"| **合计** | **5** | **{total_members}** | **{skill_counter}** |")

    cfg["skill_count"] = skill_counter
    (base / "SKILL_REGISTRY.md").write_text("\n".join(lines), encoding="utf-8")
    return skill_counter


def gen_skill_md(path: Path, name: str, triggers: str, desc: str, member: str, group: str):
    content = f"""---
name: {name}
description: {desc}。触发词：{triggers}。
triggers: {triggers}
owner: {member}
group: {group}
version: "1.0"
updated: "{TODAY}"
---

# {name}

{desc}

## 能做什么（Capabilities）
- {desc}

## 怎么用（Usage）
触发词：{triggers}

## 执行步骤（Steps）
1. 接收用户需求
2. 分析并制定执行方案
3. 执行并验证结果
4. 复盘（🎯📌💡📝▶）

## 依赖（Dependencies）
- 前置技能：无
- 外部工具：按需
"""
    path.mkdir(parents=True, exist_ok=True)
    (path / "SKILL.md").write_text(content, encoding="utf-8")


def gen_group_skill_md(base: Path, prefix: str):
    for idx, elem_info in enumerate(FIVE_ELEMENTS):
        elem = elem_info["element"]
        group = build_group_name(prefix, elem_info)
        group_num = idx + 1
        group_dir = base / f"{group_num:02d}_{group}"
        group_dir.mkdir(parents=True, exist_ok=True)

        members_list = "\n".join([f"- {m['name']}_{m['role']}" for m in MEMBERS[elem]])
        skills_list = "\n".join([
            f"- {s[0]}（{m['name']}）：{s[2]}"
            for m in MEMBERS[elem] for s in m["skills"]
        ])

        content = f"""# {group} 科室总览

## 职责
{elem_info['domain']}

## 成员
{members_list}

## 技能列表
{skills_list}
"""
        (group_dir / "SKILL.md").write_text(content, encoding="utf-8")

        for member in MEMBERS[elem]:
            for skill_name, triggers, desc in member["skills"]:
                skill_path = group_dir / f"{member['name']}_{member['role']}" / skill_name
                gen_skill_md(skill_path, skill_name, triggers, desc, member["name"], elem)


def gen_claude_md(base: Path, cfg: dict):
    prefix = cfg["prefix"]
    root_claude = f"""# {cfg['name']} · Claude Code 全局上下文

## 你是谁
你是{cfg['name']}，{cfg['desc']}的 AI 研发助手。五行架构，五组科室。

## 工作台
{cfg['output']}

## 启动规则
1. 读 BOOTSTRAP.md 了解团队结构
2. 读 SKILL_REGISTRY.md 匹配技能
3. 读对应 SKILL.md 执行

## GitHub 同步
- 仓库：{cfg.get('github', '（未配置）')}
- 对话开始：bash scripts/github_sync.sh pull
- 对话结束：bash scripts/github_sync.sh push

## 强制规则
- 所有回复采用复盘格式（五块：🎯📌💡📝▶）
- 带具体日期时间（YYYY-MM-DD HH:mm）
- 终端命令直接执行，不交给用户
"""
    (base / "CLAUDE.md").write_text(root_claude, encoding="utf-8")

    for idx, elem_info in enumerate(FIVE_ELEMENTS):
        elem = elem_info["element"]
        group = build_group_name(prefix, elem_info)
        group_num = idx + 1
        group_dir = base / f"{group_num:02d}_{group}"
        group_dir.mkdir(parents=True, exist_ok=True)

        members_desc = "\n".join([
            f"- {m['name']}_{m['role']}：{'、'.join([s[0] for s in m['skills']])}"
            for m in MEMBERS[elem]
        ])
        triggers = "、".join(set(
            t.strip() for m in MEMBERS[elem] for s in m["skills"] for t in s[1].split("、")
        ))

        content = f"""# {group} 科室 · Claude Code 上下文

## 本科室职责
{elem_info['domain']}

## 子组
{members_desc}

## 触发词
{triggers}

## 技能入口
读 SKILL.md 获取完整技能列表
"""
        (group_dir / "CLAUDE.md").write_text(content, encoding="utf-8")


def gen_cursor_rules(base: Path, cfg: dict):
    slug = cfg["slug"]
    github = cfg.get("github", "")
    content = f"""# {cfg['name']} · Cursor 适配层

> 本文件是 Cursor 专用的薄层适配器。{cfg['name']} 的核心逻辑全部在 **`BOOTSTRAP.md`** 和 **`SKILL_REGISTRY.md`** 里。
> 继承自：卡若AI Cursor 适配层

## 启动（每次对话开始）

1. **读 `BOOTSTRAP.md`**（根目录）— 身份、团队、执行流程、全局规则
2. **读 `SKILL_REGISTRY.md`**（根目录）— 按用户需求查找技能
3. 匹配到技能后读对应 `SKILL.md` 执行

**MAX Mode**：{cfg['name']} 每次调用均为 MAX Mode，定义在 `BOOTSTRAP.md` 第四节。

**多线程并行（1～6）**：当任务可拆为多个相对独立的子任务时，优先并行处理。

## 强制对话流程

### 执行流程
- 以 `BOOTSTRAP.md` 第五节（执行流程）为准
- 每次对话必须先在对话中以详细文字展示「思考结果 + 任务拆解 + 执行计划」
- 展示完毕后再执行；禁止不展示直接动手

### 复盘格式（强制）
- 所有对话的 AI 回复一律采用「复盘形式」
- 按 `运营中枢/参考资料/复盘格式规则.md` 执行
- 复盘块标题必须写具体日期和时间（YYYY-MM-DD HH:mm）
- 五块齐全（🎯📌💡📝▶）
- 复盘块内不用表格
- 日期时间与块标题用 Markdown 粗体

## 异常处理与红线（强制）

见 `运营中枢/参考资料/异常处理与红线.md`。

**红线**：
1. 不改变{cfg['name']} 整体结构
2. 不导致生产服务宕机
3. 不删除生产数据

## Cursor 特有行为

### 首次运行初始化（每个 Cursor 工作台实例仅一次，强制）
- **检测方式**：每次对话开始时检查 `.cursor/first_run_done` 是否存在
- **若不存在**：立即执行 `bash scripts/first_run_setup.sh`
- **仓库**：{github}

### GitHub 实时同步（强制）
- **对话开始时**：执行 `bash scripts/github_sync.sh pull`
- **对话结束前**（有文件变更时）：执行 `bash scripts/github_sync.sh push`
- 仓库：{github}

### Claude Code 各科室上下文（自动）
- 根目录和五个科室目录均有 `CLAUDE.md`
- 如需重新生成：`bash scripts/generate_claude_md.sh`

### 终端命令（强制）
- 需在终端执行的，一律由 AI 直接执行，不把命令交给用户自己跑
- 常规操作优先用命令行完成

## 全局规则

- **中文优先**，技术术语保留英文
- **产品名保留原文**：Cursor、GitHub、Docker、MongoDB、Vercel 等不翻译
- **禁止独立功能目录**：不得新建与五行、运营中枢并列的功能目录

## 与卡若AI 的关系

{cfg['name']} 是卡若AI 五行架构的{cfg['industry']}场景分支。架构体系、复盘格式、基因胶囊系统均继承自卡若AI。
"""
    rules_dir = base / ".cursor" / "rules"
    rules_dir.mkdir(parents=True, exist_ok=True)
    (rules_dir / f"{slug}.mdc").write_text(content, encoding="utf-8")


def gen_scripts(base: Path, cfg: dict):
    prefix = cfg["prefix"]
    github = cfg.get("github", "")
    scripts_dir = base / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    # first_run_setup.sh
    first_run = f"""#!/usr/bin/env bash
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_REPO="{github}"
MARKER="$REPO_ROOT/.cursor/first_run_done"

echo "=== {cfg['name']} 首次运行初始化 ==="

cd "$REPO_ROOT"
if [ -n "$GITHUB_REPO" ]; then
  if git remote get-url origin &>/dev/null; then
    CURRENT=$(git remote get-url origin)
    if [ "$CURRENT" != "$GITHUB_REPO" ]; then
      git remote set-url origin "$GITHUB_REPO"
    fi
  else
    git remote add origin "$GITHUB_REPO"
  fi
  echo "✅ GitHub remote 配置完成"
  git fetch origin main --quiet 2>/dev/null || true
  git pull origin main --rebase --quiet 2>/dev/null || true
  echo "✅ GitHub 同步完成"
fi

# Git hooks
HOOKS_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"
cat > "$HOOKS_DIR/post-commit" << 'HOOK'
#!/usr/bin/env bash
echo "📤 {cfg['name']}：自动推送到 GitHub..."
git push origin HEAD --quiet && echo "✅ GitHub 推送完成" || echo "⚠️ 推送失败"
HOOK
chmod +x "$HOOKS_DIR/post-commit"

cat > "$HOOKS_DIR/post-merge" << 'HOOK'
#!/usr/bin/env bash
CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>/dev/null | grep "SKILL.md" || true)
if [ -n "$CHANGED" ]; then
  echo "🔄 检测到 Skill 更新："
  echo "$CHANGED"
fi
HOOK
chmod +x "$HOOKS_DIR/post-merge"
echo "✅ Git hooks 安装完成"

bash "$REPO_ROOT/scripts/generate_claude_md.sh"

mkdir -p "$(dirname "$MARKER")"
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$MARKER"
echo "✅ 首次运行初始化完成"
"""
    (scripts_dir / "first_run_setup.sh").write_text(first_run, encoding="utf-8")

    # github_sync.sh
    sync = f"""#!/usr/bin/env bash
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACTION="${{1:-sync}}"
cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "❌ 当前目录不是 Git 仓库"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

do_pull() {{
  echo "📥 [{cfg['name']}] 从 GitHub 拉取..."
  git fetch origin "$BRANCH" --quiet
  git pull origin "$BRANCH" --rebase --quiet
  echo "✅ 拉取完成"
  SKILL_CHANGES=$(git diff HEAD@{{1}} HEAD --name-only 2>/dev/null | grep "SKILL.md" || true)
  if [ -n "$SKILL_CHANGES" ]; then
    echo "🔄 以下技能已更新："
    echo "$SKILL_CHANGES" | sed 's/^/   /'
  fi
}}

do_push() {{
  if git diff --quiet && git diff --staged --quiet; then
    UNPUSHED=$(git log "origin/$BRANCH..HEAD" --oneline 2>/dev/null || echo "")
    if [ -z "$UNPUSHED" ]; then
      echo "✅ 没有需要推送的变更"
      return 0
    fi
  else
    git add --all
    CHANGED_COUNT=$(git diff --staged --name-only | wc -l | tr -d ' ')
    git commit -m "自动同步：更新 $CHANGED_COUNT 个文件 [$(date '+%Y-%m-%d %H:%M')]" --quiet
  fi
  git push origin "$BRANCH" --quiet
  echo "✅ GitHub 推送完成"
}}

case "$ACTION" in
  pull)   do_pull ;;
  push)   do_push ;;
  sync)   do_pull; do_push ;;
  *)      echo "用法: $0 [pull|push|sync]"; exit 1 ;;
esac
"""
    (scripts_dir / "github_sync.sh").write_text(sync, encoding="utf-8")

    # generate_claude_md.sh
    claude_sh = f"""#!/usr/bin/env bash
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "📝 生成各科室 CLAUDE.md..."
echo "（此脚本由项目AI生成器自动创建，CLAUDE.md 已由 Python 脚本生成）"
echo "✅ 如需更新，请重新运行项目AI生成器"
"""
    (scripts_dir / "generate_claude_md.sh").write_text(claude_sh, encoding="utf-8")

    for f in scripts_dir.glob("*.sh"):
        f.chmod(0o755)


def gen_ops_center(base: Path, cfg: dict):
    ref_dir = base / "运营中枢" / "参考资料"
    ref_dir.mkdir(parents=True, exist_ok=True)

    (ref_dir / "复盘格式规则.md").write_text(f"""# {cfg['name']} 复盘格式规则

## 格式（所有对话强制）

**YYYY-MM-DD HH:mm**

🎯 **目标·结果·达成率** XXX · 达成 XX%

📌 **完成内容**
- 完成项 1
- 完成项 2

💡 **关键洞察**
关键发现或经验

📝 **验证**
验证方式与结果

▶ **下一步**
后续行动计划

## 规则
- 每一轮回复必须有复盘块
- 五块齐全（🎯📌💡📝▶）
- 复盘块内不用表格
- 目标·结果·达成率整行 ≤30 字
- 标题必须带日期+时间
""", encoding="utf-8")

    (ref_dir / "异常处理与红线.md").write_text(f"""# {cfg['name']} 异常处理与红线

## 异常处理
1. **未匹配技能**：推荐 2～3 个最相关的技能
2. **API 失败**：搜索并重试直到成功
3. **多技能匹配**：按金→水→木→火→土优先级合并执行
4. **复盘遗漏**：强制补发

## 红线（绝对不可触碰）
1. **不改变{cfg['name']} 整体结构**
2. **不导致服务宕机**
3. **不删除生产数据**
""", encoding="utf-8")

    manual_dir = base / "运营中枢" / "使用手册"
    manual_dir.mkdir(parents=True, exist_ok=True)
    (manual_dir / "使用手册.md").write_text(f"""# {cfg['name']} 使用手册

> {cfg['desc']}的 AI 助手使用指南。
> 版本：1.0 | 更新：{TODAY}

---

## 快速开始

1. 在 Cursor 中打开{cfg['name']}工作台
2. 直接说需求，AI 会自动匹配技能执行
3. 可用 `@成员名` 指定执行者

## 五组功能概览

### 金组 · {cfg['prefix']}资（运维）
- Docker 管理、CI/CD、服务器、监控、数据库运维

### 水组 · {cfg['prefix']}流（项目管理）
- 需求拆解、任务规划、飞书对接、文档归档

### 木组 · {cfg['prefix']}产（产品）
- PRD 编写、原型设计、竞品分析、用户调研

### 火组 · {cfg['prefix']}码（开发）
- 全栈开发、前后端、API 设计、Bug 修复、Code Review

### 土组 · {cfg['prefix']}质（质量）
- 单元测试、集成测试、发布管理、代码规范

## 高级功能

### 基因胶囊
将技能打包为可遗传的能力单元，支持跨项目复用。

### 多线程并行
复杂任务自动拆分为 1～6 个并行子任务处理。
""", encoding="utf-8")

    workbench = base / "运营中枢" / "工作台"
    workbench.mkdir(parents=True, exist_ok=True)
    (workbench / "当前任务看板.md").write_text(f"""# {cfg['name']} 当前任务看板

> 上次更新：{NOW}

## 进行中

（暂无）

## 待办

（暂无）

## 已完成

- [x] 项目AI体系初始化（{TODAY}）
""", encoding="utf-8")


def gen_readme(base: Path, cfg: dict):
    (base / "README.md").write_text(f"""# {cfg['name']}

> {cfg['desc']}的 AI 研发助手

## 架构

基于卡若AI 五行架构体系，专注{cfg['industry']}场景。

- **金组**（{cfg['prefix']}资）：基础架构与运维
- **水组**（{cfg['prefix']}流）：项目管理与协调
- **木组**（{cfg['prefix']}产）：产品设计与规划
- **火组**（{cfg['prefix']}码）：技术研发与开发
- **土组**（{cfg['prefix']}质）：质量保障与复用

## 快速开始

1. 在 Cursor 中打开本项目
2. 首次对话自动完成初始化（GitHub 同步 + CLAUDE.md 生成）
3. 直接说需求即可

## 技能总数

{cfg['skill_count']} 个技能，覆盖全研发生命周期。

## 继承

继承自 [卡若AI](https://github.com/fnvtk/karuo-ai) 五行架构体系。

---

*Generated by 卡若AI 项目AI生成器 · {TODAY}*
""", encoding="utf-8")


def gen_index(base: Path, cfg: dict):
    prefix = cfg["prefix"]
    dirs = "\n".join([
        f"├── {i+1:02d}_{build_group_name(prefix, e)}/    ← {e['domain']}"
        for i, e in enumerate(FIVE_ELEMENTS)
    ])
    (base / "总索引.md").write_text(f"""# {cfg['name']} 总索引

> 架构全貌与目录结构

## 目录结构

```
{cfg['name']}/
├── BOOTSTRAP.md               ← 启动指令
├── SKILL_REGISTRY.md           ← 技能注册表
├── CLAUDE.md                   ← Claude Code 上下文
├── README.md
├── 总索引.md（本文件）
├── .cursor/rules/              ← Cursor 适配层
├── scripts/                    ← 自动化脚本
{dirs}
├── 运营中枢/                   ← 参考资料/使用手册/工作台
└── 导出/                       ← 基因胶囊
```

## 统计

- 5 负责人 · 14 成员 · {cfg['skill_count']} 技能
- 继承自卡若AI v5.0
- 生成日期：{TODAY}
""", encoding="utf-8")


def init_git(base: Path, cfg: dict):
    github = cfg.get("github", "")
    os.chdir(base)
    if not (base / ".git").exists():
        subprocess.run(["git", "init"], check=True, capture_output=True)
    if github:
        result = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True)
        if result.returncode != 0:
            subprocess.run(["git", "remote", "add", "origin", github], check=True, capture_output=True)
        elif result.stdout.strip() != github:
            subprocess.run(["git", "remote", "set-url", "origin", github], check=True, capture_output=True)
    subprocess.run(["bash", str(base / "scripts" / "first_run_setup.sh")], check=True)
    subprocess.run(["git", "add", "-A"], check=True, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", f"初始化 {cfg['name']} 五行架构体系"],
        check=True, capture_output=True
    )
    if github:
        subprocess.run(["git", "push", "-u", "origin", "main"], capture_output=True)
    print(f"✅ Git 初始化完成")


def generate(cfg: dict):
    base = Path(cfg["output"])
    base.mkdir(parents=True, exist_ok=True)

    if not cfg.get("prefix"):
        cfg["prefix"] = cfg["name"][0]
    if not cfg.get("slug"):
        cfg["slug"] = cfg["name"].lower().replace("ai", "-ai").replace(" ", "-").replace("_", "-")

    cfg["skill_count"] = 48

    print(f"\n{'='*60}")
    print(f"  项目AI生成器 · 开始生成")
    print(f"  项目：{cfg['name']}")
    print(f"  行业：{cfg['industry']}")
    print(f"  输出：{cfg['output']}")
    print(f"{'='*60}\n")

    print("1/8 创建目录结构...")
    make_dirs(base, cfg["prefix"])

    print("2/8 生成 SKILL_REGISTRY.md...")
    count = gen_skill_registry(base, cfg)
    cfg["skill_count"] = count
    print(f"     → {count} 个技能")

    print("3/8 生成 BOOTSTRAP.md...")
    gen_bootstrap(base, cfg)

    print("4/8 生成各科室 SKILL.md...")
    gen_group_skill_md(base, cfg["prefix"])

    print("5/8 生成 CLAUDE.md（根目录 + 5 科室）...")
    gen_claude_md(base, cfg)

    print("6/8 生成 Cursor 规则 + 脚本...")
    gen_cursor_rules(base, cfg)
    gen_scripts(base, cfg)

    print("7/8 生成运营中枢 + 使用手册...")
    gen_ops_center(base, cfg)
    gen_readme(base, cfg)
    gen_index(base, cfg)

    print("8/8 初始化 Git...")
    try:
        init_git(base, cfg)
    except Exception as e:
        print(f"⚠️ Git 初始化跳过：{e}")

    print(f"\n{'='*60}")
    print(f"  ✅ {cfg['name']} 生成完成！")
    print(f"  📁 路径：{cfg['output']}")
    print(f"  📊 技能数：{cfg['skill_count']}")
    print(f"  🔗 GitHub：{cfg.get('github', '未配置')}")
    print(f"{'='*60}\n")
    print("下一步：在 Cursor 中打开该目录，首次对话将自动完成初始化。")


def interactive():
    print("\n=== 项目AI生成器（交互式） ===\n")
    name = input("1. 项目AI名称（如：玩值电竞AI）：").strip()
    desc = input("2. 一句话描述（如：电竞赛事运营与数据分析平台）：").strip()
    industry = input("3. 行业/领域（电商/电竞/教育/金融/内容/通用）：").strip() or "通用"
    github = input("4. GitHub 仓库 URL（可空）：").strip()
    output = input("5. 输出目录路径：").strip()
    prefix = input(f"6. 科室名前缀（默认: {name[0]}）：").strip() or name[0]

    cfg = {
        "name": name,
        "desc": desc,
        "industry": industry,
        "github": github,
        "output": output,
        "prefix": prefix,
    }
    generate(cfg)


def main():
    parser = argparse.ArgumentParser(description="项目AI生成器")
    parser.add_argument("--name", help="项目AI名称")
    parser.add_argument("--desc", help="一句话描述")
    parser.add_argument("--industry", default="通用", help="行业/领域")
    parser.add_argument("--github", default="", help="GitHub 仓库 URL")
    parser.add_argument("--output", help="输出目录路径")
    parser.add_argument("--prefix", default="", help="科室名前缀")
    parser.add_argument("--slug", default="", help="Cursor 规则文件名（如 wanzhi-ai）")
    parser.add_argument("--interactive", action="store_true", help="交互式生成")
    args = parser.parse_args()

    if args.interactive:
        interactive()
    elif args.name and args.output:
        cfg = {
            "name": args.name,
            "desc": args.desc or args.name,
            "industry": args.industry,
            "github": args.github,
            "output": args.output,
            "prefix": args.prefix or args.name[0],
            "slug": args.slug,
        }
        generate(cfg)
    else:
        parser.print_help()
        print("\n示例：")
        print('  python3 generate_project_ai.py --name "玩值电竞AI" --desc "电竞赛事运营平台" --industry "电竞" --output "/path/to/output/"')
        print("  python3 generate_project_ai.py --interactive")


if __name__ == "__main__":
    main()
