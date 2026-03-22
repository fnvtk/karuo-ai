#!/usr/bin/env python3
"""
加载「卡若闽南口音_ASR纠错库.json」，对文本做全文替换（key 长度降序）。
供命令行管道、其它脚本 import 使用。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
DEFAULT_JSON = _REPO / "运营中枢" / "参考资料" / "卡若闽南口音_ASR纠错库.json"


def load_corrections(path: Path | None = None) -> dict[str, str]:
    p = path or DEFAULT_JSON
    if not p.exists():
        return {}
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    raw = data.get("corrections") if isinstance(data, dict) else None
    if not isinstance(raw, dict):
        return {}
    out: dict[str, str] = {}
    for k, v in raw.items():
        if k is None or v is None:
            continue
        ks, vs = str(k).strip(), str(v).strip()
        if ks:
            out[ks] = vs
    return out


def apply_corrections(text: str, corrections: dict[str, str] | None = None) -> str:
    if text is None:
        return ""
    corr = corrections if corrections is not None else load_corrections()
    if not corr:
        return str(text)
    result = str(text)
    for wrong, right in sorted(corr.items(), key=lambda x: len(x[0]), reverse=True):
        if wrong:
            result = result.replace(wrong, right)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="应用卡若闽南口音 ASR 纠错库")
    parser.add_argument(
        "-f",
        "--file",
        type=Path,
        default=None,
        help="纠错 JSON 路径（默认仓库内 运营中枢/参考资料/卡若闽南口音_ASR纠错库.json）",
    )
    parser.add_argument("text", nargs="?", default=None, help="直接传入字符串；省略则从 stdin 读入")
    args = parser.parse_args()
    corr = load_corrections(args.file)
    if args.text is not None:
        sys.stdout.write(apply_corrections(args.text, corr))
        if not args.text.endswith("\n"):
            sys.stdout.write("\n")
        return 0
    stdin = sys.stdin.read()
    sys.stdout.write(apply_corrections(stdin, corr))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
