#!/usr/bin/env python3
"""
闽南口音 ASR 纠错工作台 · 唯一入口。
子命令：
  scan-files  — 多根目录文本扫描，按纠错库 key 统计命中
  scan-mongo  — karuo_site 消息内容 + 对话记录统计命中
不写回 JSON / 不改 Mongo 正文。
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

_KARUO_ROOT = Path(__file__).resolve().parents[4]
_DEFAULT_JSON = _KARUO_ROOT / "运营中枢" / "参考资料" / "卡若闽南口音_ASR纠错库.json"
_WORKBENCH = _KARUO_ROOT / "运营中枢" / "工作台" / "闽南口音纠错工作台"
_APPLY_SCRIPT_PARENT = _KARUO_ROOT / "运营中枢" / "工作台" / "脚本"
if str(_APPLY_SCRIPT_PARENT) not in sys.path:
    sys.path.insert(0, str(_APPLY_SCRIPT_PARENT))

from apply_karuo_voice_corrections import load_corrections  # noqa: E402

SKIP_DIR_NAMES = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    "target",
    ".turbo",
    "coverage",
}

DEFAULT_MONGO_URI = os.environ.get(
    "KARUO_MONGO_URI",
    "mongodb://admin:admin123@localhost:27017/?authSource=admin",
)
DEFAULT_DB = os.environ.get("KARUO_MONGO_DB", "karuo_site")


def _count_hits(text: str, keys: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for k in keys:
        if not k:
            continue
        c = text.count(k)
        if c:
            out[k] = c
    return out


def _load_roots(path: Path | None, extra: list[str]) -> list[Path]:
    roots: list[Path] = []
    if path and path.exists():
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            roots.append(Path(s).expanduser().resolve())
    for r in extra:
        roots.append(Path(r).expanduser().resolve())
    seen: set[str] = set()
    out: list[Path] = []
    for p in roots:
        key = str(p)
        if key in seen:
            continue
        seen.add(key)
        if p.is_dir():
            out.append(p)
    return out


def _iter_text_files(root: Path, exts: set[str], max_bytes: int) -> list[Path]:
    files: list[Path] = []
    try:
        for p in root.rglob("*"):
            if p.is_dir():
                if p.name in SKIP_DIR_NAMES:
                    continue
            if not p.is_file():
                continue
            if p.suffix.lower().lstrip(".") not in exts:
                continue
            try:
                if p.stat().st_size > max_bytes:
                    continue
            except OSError:
                continue
            files.append(p)
    except OSError:
        pass
    return files


def cmd_scan_files(args: argparse.Namespace) -> int:
    corr = load_corrections(args.json or _DEFAULT_JSON)
    if not corr:
        print("未加载到 corrections，检查 JSON 路径", file=sys.stderr)
        return 1

    keys_sorted = sorted(corr.keys(), key=len, reverse=True)
    exts = {e.strip().lower().lstrip(".") for e in args.exts.split(",") if e.strip()}
    max_bytes = int(args.max_mb * 1024 * 1024)

    roots = _load_roots(args.roots_file if args.roots_file.exists() else None, args.root)
    if not roots:
        roots = [_KARUO_ROOT]
        print(f"未配置根目录，默认仅扫描卡若AI 仓库: {roots[0]}", file=sys.stderr)

    total_by_key: dict[str, int] = defaultdict(int)
    file_hits: list[tuple[Path, dict[str, int]]] = []

    for root in roots:
        for fp in _iter_text_files(root, exts, max_bytes):
            try:
                raw = fp.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            hits = _count_hits(raw, keys_sorted)
            if not hits:
                continue
            file_hits.append((fp, hits))
            for k, n in hits.items():
                total_by_key[k] += n

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = args.out or (_WORKBENCH / "reports" / f"scan_workspace_{ts}.md")

    lines = [
        "# ASR 纠错 key · 工作区扫描报告",
        "",
        f"- 生成 UTC: {ts}",
        f"- JSON: `{args.json or _DEFAULT_JSON}`",
        f"- 根目录数: {len(roots)}",
        "",
        "## 按 key 汇总（降序）",
        "",
        "| 误听 key | 正写 | 总命中次数 |",
        "|:---|:---|---:|",
    ]
    for k in sorted(total_by_key.keys(), key=lambda x: (-total_by_key[x], -len(x))):
        lines.append(f"| {k} | {corr[k]} | {total_by_key[k]} |")

    lines.extend(["", "## 有命中的文件（前 200 条）", ""])
    file_hits.sort(key=lambda x: (-sum(x[1].values()), str(x[0])))
    for fp, hits in file_hits[:200]:
        sub = ", ".join(f"{k}×{hits[k]}" for k in sorted(hits.keys(), key=len, reverse=True))
        lines.append(f"- `{fp}` — {sub}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"报告已写入: {out_path}")
    print(f"不同 key 数: {len(total_by_key)}，涉及文件: {len(file_hits)}")
    return 0


def cmd_scan_mongo(args: argparse.Namespace) -> int:
    try:
        from pymongo import MongoClient
    except ImportError:
        print("需要 pymongo: pip install pymongo", file=sys.stderr)
        return 1

    corr = load_corrections(args.json or _DEFAULT_JSON)
    if not corr:
        print("未加载 corrections", file=sys.stderr)
        return 1
    keys_sorted = sorted(corr.keys(), key=len, reverse=True)

    total_by_key: dict[str, int] = defaultdict(int)
    title_hits: dict[str, int] = defaultdict(int)
    firstmsg_hits: dict[str, int] = defaultdict(int)
    sample_titles: dict[str, list[str]] = defaultdict(list)

    try:
        client = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client[args.db]
    except Exception as e:
        print(f"Mongo 不可用（跳过统计）: {e}", file=sys.stderr)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        out_path = args.out or (_WORKBENCH / "reports" / f"mongo_asr_{ts}.md")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            f"# Mongo ASR 统计 · 未连接\n\n- URI 已省略\n- 错误: `{e}`\n\n请先启动本机 Mongo 或设置 KARUO_MONGO_URI。\n",
            encoding="utf-8",
        )
        print(f"已写入说明: {out_path}")
        return 0

    filt = {"角色": "用户"} if args.user_only else {}
    cur = db["消息内容"].find(filt, {"内容": 1, "角色": 1}).limit(args.msg_limit)
    n_msg = 0
    for doc in cur:
        n_msg += 1
        body = doc.get("内容") or ""
        if not isinstance(body, str):
            body = str(body)
        for k, c in _count_hits(body, keys_sorted).items():
            total_by_key[k] += c

    for doc in db["对话记录"].find({}, {"名称": 1, "首条消息": 1}):
        name = doc.get("名称") or ""
        first = doc.get("首条消息") or ""
        if not isinstance(name, str):
            name = str(name)
        if not isinstance(first, str):
            first = str(first)
        for k, c in _count_hits(name, keys_sorted).items():
            title_hits[k] += c
            if c and len(sample_titles[k]) < 5:
                sample_titles[k].append(name[:200])
        for k, c in _count_hits(first, keys_sorted).items():
            firstmsg_hits[k] += c

    for k in title_hits:
        total_by_key[k] += title_hits[k]
    for k in firstmsg_hits:
        total_by_key[k] += firstmsg_hits[k]

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = args.out or (_WORKBENCH / "reports" / f"mongo_asr_{ts}.md")

    lines = [
        "# ASR 纠错 key · Mongo 聊天库统计",
        "",
        f"- 生成 UTC: {ts}",
        f"- 库: `{args.db}`",
        f"- 扫描消息条数上限: {args.msg_limit}（实际遍历 {n_msg} 条）",
        f"- 用户消息仅: {args.user_only}",
        "",
        "## 消息正文 + 对话名称 + 首条消息 · 合并汇总",
        "",
        "| 误听 key | 正写 | 命中次数 |",
        "|:---|:---|---:|",
    ]
    for k in sorted(total_by_key.keys(), key=lambda x: (-total_by_key[x], -len(x))):
        lines.append(f"| {k} | {corr[k]} | {total_by_key[k]} |")

    lines.extend(["", "## 仅出现在「对话名称」的命中（Agent 标题线索）", ""])
    if not title_hits:
        lines.append("_无_")
    else:
        lines.append("| key | 次数 | 名称样例 |")
        lines.append("|:---|---:|:---|")
        for k in sorted(title_hits.keys(), key=lambda x: (-title_hits[x], -len(x))):
            samp = "；".join(sample_titles.get(k, []))
            lines.append(f"| {k} | {title_hits[k]} | {samp} |")

    lines.extend(
        [
            "",
            "## 说明",
            "",
            "- 命中高仅表示「库中仍大量出现误写」，适合**追加/强化** JSON；若正写已普及则可能为历史数据。",
            "- **禁止**根据本报告自动改库内原文；纠错在 Agent **理解前**滤真即可。",
            "",
        ]
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"报告已写入: {out_path}")
    client.close()
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="闽南口音 ASR 纠错工作台（扫盘 + 扫 Mongo）",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    sub = p.add_subparsers(dest="command", required=True)

    pf = sub.add_parser("scan-files", help="扫描本地工作区文本，统计纠错库 key 命中")
    pf.add_argument(
        "--roots-file",
        type=Path,
        default=_WORKBENCH / "workspace_roots.txt",
        help="每行一个根目录；文件不存在时仅用 --root",
    )
    pf.add_argument("--root", action="append", default=[], help="额外根目录，可重复")
    pf.add_argument("--json", type=Path, default=None, help="纠错 JSON 路径")
    pf.add_argument(
        "--exts",
        default="md,mdc,json,txt,tsx,ts,js,jsx,py,yml,yaml,css,scss,html,mdx",
        help="逗号分隔扩展名（不含点）",
    )
    pf.add_argument("--max-mb", type=float, default=8.0, help="跳过大于此大小的文件")
    pf.add_argument("--out", type=Path, default=None, help="报告路径，默认 reports/")
    pf.set_defaults(func=cmd_scan_files)

    pm = sub.add_parser("scan-mongo", help="扫描 Mongo 聊天库，统计 key 命中")
    pm.add_argument("--mongo-uri", default=DEFAULT_MONGO_URI, help="或环境变量 KARUO_MONGO_URI")
    pm.add_argument("--db", default=DEFAULT_DB, help="或 KARUO_MONGO_DB")
    pm.add_argument("--json", type=Path, default=None, help="纠错 JSON 路径")
    pm.add_argument("--msg-limit", type=int, default=80000, help="最多扫描消息条数")
    pm.add_argument("--user-only", action="store_true", help="仅统计角色=用户")
    pm.add_argument("--out", type=Path, default=None, help="报告路径")
    pm.set_defaults(func=cmd_scan_mongo)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
