#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基因胶囊 · 打包/解包/列表
卡若AI 基因胶囊管理脚本，归属土砖。
"""
import argparse
import hashlib
import json
import os
import platform
import sys
from datetime import datetime
from pathlib import Path

# 卡若AI 工作台根目录
KARUO_AI_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
EXPORT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/导出/基因胶囊")
CAPSULE_INDEX = Path(__file__).resolve().parent.parent / "capsule_index.json"


def _collect_env():
    """收集环境指纹（可选）"""
    return {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
        "platform": platform.system().lower(),
    }


def _calc_capsule_id(skill_path: str, content: str) -> str:
    """计算资产 ID：SHA256(skill_path + content 前 8192 字符)"""
    data = (skill_path + content[:8192]).encode("utf-8")
    h = hashlib.sha256(data).hexdigest()
    return f"sha256:{h}"


def _find_skill_path(name_or_path: str) -> Path:
    """根据技能名或路径找到 SKILL.md"""
    if name_or_path.endswith("SKILL.md"):
        p = KARUO_AI_ROOT / name_or_path
    elif os.path.sep in name_or_path or name_or_path.startswith("0"):
        # 形如 05_卡土/土砖_技能复制/技能工厂
        p = KARUO_AI_ROOT / name_or_path
        if p.is_dir():
            p = p / "SKILL.md"
    else:
        # 按名称在 SKILL_REGISTRY 中查找（简化：扫描常见路径）
        registry = KARUO_AI_ROOT / "SKILL_REGISTRY.md"
        if registry.exists():
            text = registry.read_text(encoding="utf-8")
            # 简单匹配：找包含 name_or_path 的 SKILL 路径
            for line in text.splitlines():
                if "SKILL.md" in line and name_or_path in line:
                    # 提取路径，如 `05_卡土（土）/土砖_技能复制/技能工厂/SKILL.md`
                    start = line.find("`") + 1
                    end = line.rfind("`")
                    if start > 0 and end > start:
                        rel = line[start:end].strip()
                        p = KARUO_AI_ROOT / rel
                        if p.exists():
                            return p
        raise FileNotFoundError(f"未找到技能: {name_or_path}")
    if not p.exists():
        raise FileNotFoundError(f"SKILL 不存在: {p}")
    return p


def _parse_frontmatter(content: str) -> tuple:
    """解析 YAML frontmatter，返回 (frontmatter_dict, body)。无 PyYAML 时用简单解析。"""
    if not content.strip().startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm = {}
    try:
        import yaml
        fm = yaml.safe_load(parts[1]) or {}
    except Exception:
        for line in parts[1].strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                k, v = k.strip(), v.strip().strip("'\"").strip()
                if k == "triggers":
                    fm[k] = [x.strip() for x in v.replace("、", ",").split(",") if x.strip()]
                else:
                    fm[k] = v
    return fm, parts[2].strip()


EXPORT_README = "README_基因胶囊导出说明.md"


def _render_skill_dir_flowchart() -> str:
    """返回单技能目录内的流程图文档内容"""
    return """# 基因胶囊 · 功能流程图

> 本流程图说明基因胶囊在卡若AI 中的完整工作流程。

""" + _render_flowchart_mermaid() + """

---

## 流程说明

| 区块 | 说明 |
|:---|:---|
| **卡若AI 内部流程** | 用户任务 → 查技能 → 执行 → 复盘 → 经验沉淀 → 可选打包为胶囊 |
| **基因胶囊 核心流程** | pack/unpack/list，导出时自动生成说明文档（含本流程图） |
| **技能工厂联动** | 创建前先查胶囊继承，创建后可打包为胶囊 |
| **未来对外流通** | 与 EvoMap Market 对接，实现跨 Agent 能力遗传 |
"""


def _render_flowchart_mermaid() -> str:
    """返回基因胶囊功能流程图 Mermaid 源码"""
    return """```mermaid
flowchart TB
    subgraph internal["卡若AI 内部流程"]
        A1[用户需求/任务] --> A2{查 SKILL_REGISTRY}
        A2 --> A3[读 SKILL.md 执行]
        A3 --> A4[执行完成 + 复盘]
        A4 --> A5{经验有价值?}
        A5 -->|是| A6[写入经验库/待沉淀]
        A5 -->|否| A7[结束]
        A6 --> A8{要打包为胶囊?}
    end

    subgraph capsule["基因胶囊 核心流程"]
        B1[pack: Skill 转 胶囊JSON] --> B2[导出目录 + 说明文档]
        B2 --> B3[list: 查看本地胶囊]
        B3 --> B4{需要继承?}
        B4 -->|是| B5[unpack: 胶囊 转 Skill]
        B4 -->|否| B6[保留备用]
        B5 --> B7[写入对应成员目录]
        B7 --> B8[更新 SKILL_REGISTRY]
    end

    subgraph factory["技能工厂联动"]
        C1[创建 Skill 前] --> C2[list 查本地胶囊]
        C2 --> C3{有匹配?}
        C3 -->|是| C4[unpack 继承]
        C3 -->|否| C5[新建 Skill]
        C5 --> C6[创建 Skill 后]
        C6 --> C7[pack 打包为胶囊]
        C4 --> B7
    end

    subgraph external["未来对外流通"]
        D1[EvoMap Market] --> D2[上传胶囊]
        D2 --> D3[全球 Agent 继承]
        D3 --> B5
        B2 -.->|可选| D2
    end

    A8 -->|是| B1
    A8 -->|否| A7
```"""


def _render_skill_dir_readme(manifest: dict, capsule_id: str, json_filename: str, created_at: str, skill_dir_name: str) -> str:
    """生成单技能目录内的说明文档"""
    name = manifest.get("name", "")
    desc = manifest.get("description", "")
    triggers = manifest.get("triggers", [])
    skill_path = manifest.get("skill_path", "")
    triggers_str = "、".join(triggers) if isinstance(triggers, list) else str(triggers)
    full_path = f"/Users/karuo/Documents/卡若Ai的文件夹/导出/基因胶囊/{skill_dir_name}/{json_filename}"
    return f"""# {name} · 基因胶囊说明文档

> **创建时间**：{created_at}  
> **capsule_id**：{capsule_id[:19]}

---

## 一、技能概览

| 字段 | 值 |
|:---|:---|
| 名称 | {name} |
| 描述 | {desc} |
| 触发词 | {triggers_str} |
| 源路径 | {skill_path} |

---

## 二、本目录文件

| 文件 | 说明 |
|:---|:---|
| `{json_filename}` | 基因胶囊 JSON（含完整 SKILL 内容） |
| `基因胶囊功能流程图.md` | 基因胶囊功能流程图 |
| `说明文档.md` | 本说明文档 |

---

## 三、解包（继承能力）

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" unpack "{full_path}"
# 或进入本目录后
python3 .../gene_capsule.py unpack "{skill_dir_name}/{json_filename}"
```

---

## 四、引用

- 规范：`运营中枢/参考资料/基因胶囊规范.md`
- 技能：`05_卡土（土）/土砖_技能复制/基因胶囊/SKILL.md`
"""


def _write_export_readme() -> str:
    """生成/更新导出说明文档（含流程图），返回说明文档路径"""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    readme_path = EXPORT_DIR / EXPORT_README

    # 收集已导出胶囊列表（仅技能子目录内，按创建时间倒序）
    caps = []
    if EXPORT_DIR.exists():
        for f in sorted(EXPORT_DIR.rglob("*.json")):
            if f.parent == EXPORT_DIR:
                continue
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                m = data.get("manifest", {})
                rel = f.relative_to(EXPORT_DIR)
                caps.append({
                    "file": str(rel),
                    "name": m.get("name", ""),
                    "capsule_id": data.get("capsule_id", "")[:19],
                    "created_at": data.get("created_at", ""),
                    "dir": str(rel.parent),
                })
            except Exception:
                pass
        caps.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    lines = [
        "# 基因胶囊 · 导出说明",
        "",
        "> **生成时间**：{now}  ",
        "> **导出目录**：`卡若Ai的文件夹/导出/基因胶囊/`  ",
        "> **规范文档**：`运营中枢/参考资料/基因胶囊规范.md`",
        "",
        "---",
        "",
        "## 一、基因胶囊功能总览",
        "",
        "**基因胶囊**将验证过的 Skill + 环境指纹 + 审计记录打包为可遗传能力单元，支持：",
        "",
        "- **pack**：Skill → 胶囊 JSON（导出）",
        "- **unpack**：胶囊 JSON → Skill（继承）",
        "- **list**：查看本地所有胶囊",
        "",
        "---",
        "",
        "## 二、基因胶囊完整流程图",
        "",
        "以下流程图展示卡若AI 中基因胶囊的完整工作流程、与技能工厂的联动，以及未来与 EvoMap 的流通路径。",
        "",
        _render_flowchart_mermaid(),
        "",
        "---",
        "",
        "## 三、已导出胶囊清单",
        "",
        "每个技能独立目录，含：胶囊 JSON + 基因胶囊功能流程图.md + 说明文档.md",
        "",
        "| 技能名 | 技能目录 | capsule_id | 创建时间 |",
        "|:---|:---|:---|:---|",
    ]
    for c in caps:
        lines.append(f"| {c.get('name', '')} | `{c.get('dir', '')}` | {c.get('capsule_id', '')} | {c.get('created_at', '')} |")
    if not caps:
        lines.append("| （暂无） | — | — | — |")
    lines.extend([
        "",
        "---",
        "",
        "## 四、使用方法",
        "",
        "### 解包（继承能力）",
        "",
        "```bash",
        "cd /Users/karuo/Documents/个人/卡若AI",
        'python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" unpack 技能名_xxxx.json',
        'python3 .../gene_capsule.py unpack 技能名_xxxx.json -o 目标目录/  # 指定输出目录',
        "```",
        "",
        "### 列表",
        "",
        "```bash",
        'python3 .../gene_capsule.py list',
        "```",
        "",
        "---",
        "",
        "## 五、引用",
        "",
        "- 规范：`运营中枢/参考资料/基因胶囊规范.md`",
        "- 技能：`05_卡土（土）/土砖_技能复制/基因胶囊/SKILL.md`",
        "- 流程图亦可于规范文档中查看",
        "",
    ])
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    content = "\n".join(lines).replace("{now}", now)
    readme_path.write_text(content, encoding="utf-8")
    return str(readme_path)


def pack(skill_ref: str, include_audit: bool = True, write_readme: bool = True) -> str:
    """打包：将 SKILL 转为基因胶囊 JSON，并生成导出说明文档（含流程图）。pack_all 时 write_readme=False。"""
    skill_path = _find_skill_path(skill_ref)
    content = skill_path.read_text(encoding="utf-8")
    rel_path = str(skill_path.relative_to(KARUO_AI_ROOT))

    fm, body = _parse_frontmatter(content)

    manifest = {
        "name": fm.get("name", skill_path.stem),
        "description": fm.get("description", ""),
        "triggers": fm.get("triggers", [])
        if isinstance(fm.get("triggers"), list)
        else (fm.get("triggers", "") or "").split("、"),
        "owner": fm.get("owner", ""),
        "group": fm.get("group", ""),
        "skill_path": rel_path,
    }
    capsule_id = _calc_capsule_id(rel_path, content)
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")

    capsule = {
        "version": "1.0",
        "capsule_id": capsule_id,
        "manifest": manifest,
        "skill_content": content,
        "created_at": now,
        "updated_at": now,
        "environment": _collect_env(),
        "source": "karuo-ai",
    }

    if include_audit:
        capsule["audit"] = {"last_retro": "", "source": "pack"}

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = manifest["name"].replace(" ", "_").replace("/", "_")[:30]
    hash_prefix = capsule_id[7:15]
    # 每个技能独立目录：{技能名}_{hash}/
    skill_dir = EXPORT_DIR / f"{safe_name}_{hash_prefix}"
    skill_dir.mkdir(parents=True, exist_ok=True)

    out_file = skill_dir / f"{safe_name}_{hash_prefix}.json"
    out_file.write_text(json.dumps(capsule, ensure_ascii=False, indent=2), encoding="utf-8")

    # 1. 流程图：复制到技能目录
    flowchart_content = _render_skill_dir_flowchart()
    (skill_dir / "基因胶囊功能流程图.md").write_text(flowchart_content, encoding="utf-8")

    # 2. 说明文档：写入技能目录
    skill_readme = _render_skill_dir_readme(manifest, capsule_id, out_file.name, now, f"{safe_name}_{hash_prefix}")
    (skill_dir / "说明文档.md").write_text(skill_readme, encoding="utf-8")

    # 3. 主 README（含全量清单）；pack_all 时由调用方统一写入
    if write_readme:
        readme_path = _write_export_readme()
        return str(out_file) + "\n📁 技能目录: " + str(skill_dir) + "\n📄 说明文档: " + str(skill_dir / "说明文档.md") + "\n📄 主清单: " + readme_path
    return str(out_file)


def unpack(capsule_path: str, target_dir: str | None = None) -> str:
    """解包：将胶囊 JSON 解压为 SKILL.md。支持相对路径（技能目录/xxx.json）或绝对路径。"""
    p = Path(capsule_path)
    if not p.is_absolute():
        p = EXPORT_DIR / capsule_path
    if not p.exists():
        found = list(EXPORT_DIR.rglob(Path(capsule_path).name))
        if found:
            p = found[0]
    if not p.exists():
        raise FileNotFoundError(f"胶囊不存在: {capsule_path}")

    data = json.loads(p.read_text(encoding="utf-8"))
    manifest = data.get("manifest", {})
    skill_content = data.get("skill_content", "")

    if target_dir:
        dest = Path(target_dir)
    else:
        # 按 manifest.skill_path 写回
        rel = manifest.get("skill_path", "")
        dest = KARUO_AI_ROOT / Path(rel).parent
    dest.mkdir(parents=True, exist_ok=True)
    skill_file = dest / "SKILL.md"
    skill_file.write_text(skill_content, encoding="utf-8")

    # 更新 capsule_index
    idx = {}
    if CAPSULE_INDEX.exists():
        idx = json.loads(CAPSULE_INDEX.read_text(encoding="utf-8"))
    cid = data.get("capsule_id", "")[:19]
    idx[cid] = {
        "name": manifest.get("name", ""),
        "source": data.get("source", "local"),
        "unpacked_at": dest,
        "created_at": data.get("created_at", ""),
    }
    CAPSULE_INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(skill_file)


def list_capsules() -> list[dict]:
    """列表：扫描导出目录与索引。仅统计技能子目录内的胶囊（技能名_hash/*.json）。"""
    result = []
    if EXPORT_DIR.exists():
        for f in sorted(EXPORT_DIR.rglob("*.json")):
            if f.parent == EXPORT_DIR:
                continue
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                m = data.get("manifest", {})
                rel = f.relative_to(EXPORT_DIR)
                dir_name = str(rel.parent)
                result.append({
                    "file": str(rel),
                    "name": m.get("name", ""),
                    "capsule_id": data.get("capsule_id", "")[:19],
                    "created_at": data.get("created_at", ""),
                    "dir": dir_name,
                })
            except Exception:
                pass
    return result


def _extract_skill_paths_from_registry() -> list[str]:
    """从 SKILL_REGISTRY.md 提取所有 SKILL 路径"""
    import re
    registry = KARUO_AI_ROOT / "SKILL_REGISTRY.md"
    if not registry.exists():
        return []
    text = registry.read_text(encoding="utf-8")
    # 匹配 `01_xxx/xxx/SKILL.md` 格式
    pattern = r"`([^`]+SKILL\.md)`"
    matches = re.findall(pattern, text)
    seen = set()
    out = []
    for m in matches:
        m = m.strip()
        if m and m not in seen and (KARUO_AI_ROOT / m).exists():
            seen.add(m)
            out.append(m)
    return out


def pack_all(include_audit: bool = True) -> tuple[int, int, list[str]]:
    """全量打包：将 SKILL_REGISTRY 中所有技能导出为基因胶囊。返回 (成功数, 失败数, 失败列表)"""
    paths = _extract_skill_paths_from_registry()
    ok, fail = 0, 0
    failed = []
    for i, rel_path in enumerate(paths, 1):
        try:
            pack(rel_path, include_audit=include_audit, write_readme=False)
            ok += 1
            print(f"  [{i}/{len(paths)}] ✅ {Path(rel_path).parent.name}")
        except Exception as e:
            fail += 1
            failed.append(f"{rel_path}: {e}")
            print(f"  [{i}/{len(paths)}] ❌ {Path(rel_path).parent.name}: {e}")
    # 最后统一更新说明文档（避免每次 pack 都覆盖，这里只调用一次）
    _write_export_readme()
    return ok, fail, failed


def main():
    parser = argparse.ArgumentParser(description="基因胶囊 · pack/unpack/list")
    sub = parser.add_subparsers(dest="cmd", required=True)
    # pack
    p_pack = sub.add_parser("pack", help="将 SKILL 打包为基因胶囊")
    p_pack.add_argument("skill", help="技能路径或名称，如 技能工厂 或 05_卡土（土）/土砖_技能复制/技能工厂/SKILL.md")
    p_pack.add_argument("--no-audit", action="store_true", help="不包含审计信息")
    # unpack
    p_unpack = sub.add_parser("unpack", help="将胶囊解包为 SKILL")
    p_unpack.add_argument("capsule", help="胶囊文件路径或文件名")
    p_unpack.add_argument("-o", "--output", help="输出目录，默认按 manifest.skill_path")
    # list
    p_list = sub.add_parser("list", help="列出本地胶囊")
    # pack-all
    p_pack_all = sub.add_parser("pack-all", help="全量导出：将 SKILL_REGISTRY 中所有技能打包为基因胶囊")
    p_pack_all.add_argument("--no-audit", action="store_true", help="不包含审计信息")
    args = parser.parse_args()

    if args.cmd == "pack-all":
        paths = _extract_skill_paths_from_registry()
        print(f"📦 全量导出 {len(paths)} 个技能...")
        ok, fail, failed = pack_all(include_audit=not getattr(args, "no_audit", False))
        print(f"\n✅ 成功: {ok} | ❌ 失败: {fail}")
        print(f"📄 说明文档: {EXPORT_DIR / EXPORT_README}")
        if failed:
            print("\n失败项:")
            for f in failed[:10]:
                print(f"  - {f}")
            if len(failed) > 10:
                print(f"  ... 等 {len(failed)} 项")
    elif args.cmd == "pack":
        out = pack(args.skill, include_audit=not args.no_audit)
        for line in out.split("\n"):
            if line.strip():
                print(line)
    elif args.cmd == "unpack":
        out = unpack(args.capsule, target_dir=args.output)
        print(f"✅ 已解包: {out}")
    elif args.cmd == "list":
        items = list_capsules()
        for i in items:
            print(f"  {i['name']}  {i['capsule_id']}  {i['created_at']}")
        print(f"共 {len(items)} 个胶囊")


if __name__ == "__main__":
    main()
