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


def pack(skill_ref: str, include_audit: bool = True) -> str:
    """打包：将 SKILL 转为基因胶囊 JSON"""
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
        # 尝试从复盘目录读取最近一条（若有）
        capsule["audit"] = {"last_retro": "", "source": "pack"}

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = manifest["name"].replace(" ", "_").replace("/", "_")[:30]
    out_file = EXPORT_DIR / f"{safe_name}_{capsule_id[7:15]}.json"
    out_file.write_text(json.dumps(capsule, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(out_file)


def unpack(capsule_path: str, target_dir: str | None = None) -> str:
    """解包：将胶囊 JSON 解压为 SKILL.md"""
    p = Path(capsule_path)
    if not p.exists():
        p = EXPORT_DIR / capsule_path
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
    """列表：扫描导出目录与索引"""
    result = []
    if EXPORT_DIR.exists():
        for f in sorted(EXPORT_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                m = data.get("manifest", {})
                result.append({
                    "file": f.name,
                    "name": m.get("name", ""),
                    "capsule_id": data.get("capsule_id", "")[:19],
                    "created_at": data.get("created_at", ""),
                })
            except Exception:
                pass
    return result


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
    args = parser.parse_args()

    if args.cmd == "pack":
        out = pack(args.skill, include_audit=not args.no_audit)
        print(f"✅ 已打包: {out}")
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
