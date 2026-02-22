#!/usr/bin/env python3
"""
卡若AI 本地代码库索引

对卡若AI 目录做本地 embedding 索引，支持语义检索。不上传任何数据到云端。
依赖：Ollama + nomic-embed-text，与 local_llm_sdk 相同。

用法：
  python local_codebase_index.py index          # 建索引
  python local_codebase_index.py search "问题"   # 语义搜索
  python local_codebase_index.py status         # 查看索引状态
"""

import os
import sys
import json
import math
import argparse
from pathlib import Path
from typing import List, Dict, Any

# 项目根目录
_REPO_ROOT = Path(__file__).resolve().parents[4]
_SCRIPT_DIR = Path(__file__).resolve().parent
_INDEX_DIR = _SCRIPT_DIR.parent / "index"
_INDEX_FILE = _INDEX_DIR / "local_index.json"

# 索引配置
INDEX_ROOT = os.environ.get("KARUO_INDEX_ROOT", str(_REPO_ROOT))
EXCLUDE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".cursor", ".github", ".gitea",
    "chroma_db", "大文件外置"
}
EXCLUDE_SUFFIXES = {".pyc", ".pyo", ".map", ".min.js", ".lock", ".log"}
CHUNK_SIZE = 800   # 每块约 800 字符，便于 embedding
CHUNK_OVERLAP = 80

# 纳入索引的后缀
INCLUDE_SUFFIXES = {".md", ".py", ".js", ".ts", ".tsx", ".json", ".mdc", ".txt", ".sh"}


def _add_local_llm():
    """确保能导入 local_llm_sdk"""
    sdk_dir = _REPO_ROOT / "04_卡火（火）" / "火种_知识模型" / "本地模型" / "脚本"
    if str(sdk_dir) not in sys.path:
        sys.path.insert(0, str(sdk_dir))


def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """将长文本切成 overlapping 块"""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += size - overlap
    return chunks


def _collect_files(root: str) -> List[Dict[str, str]]:
    """收集要索引的文件，返回 [{path, content}]"""
    items = []
    root_path = Path(root)
    for fp in root_path.rglob("*"):
        if not fp.is_file():
            continue
        rel = fp.relative_to(root_path)
        parts = rel.parts
        if any(d in parts for d in EXCLUDE_DIRS):
            continue
        if fp.suffix.lower() in EXCLUDE_SUFFIXES:
            continue
        if fp.suffix.lower() not in INCLUDE_SUFFIXES:
            continue
        try:
            content = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if len(content.strip()) < 20:
            continue
        items.append({"path": str(rel), "content": content})
    return items


def _embed_via_ollama(text: str) -> List[float]:
    """通过 Ollama 获取文本 embedding"""
    _add_local_llm()
    from local_llm_sdk import get_llm
    llm = get_llm()
    result = llm.embed(text[:8000], show_notice=False)
    if result.get("success") and result.get("embedding"):
        return result["embedding"]
    raise RuntimeError(f"Embed 失败: {result}")


def cmd_index():
    """建索引"""
    import time
    print(f"📁 索引根目录: {INDEX_ROOT}")
    print("📂 收集文件中...")
    files = _collect_files(INDEX_ROOT)
    print(f"   共 {len(files)} 个文件")
    if not files:
        print("   无文件可索引")
        return
    _add_local_llm()
    from local_llm_sdk import get_llm
    llm = get_llm()
    records = []
    total = 0
    for i, f in enumerate(files):
        path, content = f["path"], f["content"]
        chunks = _chunk_text(content)
        for j, chunk in enumerate(chunks):
            if len(chunk) < 20:
                continue
            try:
                emb = llm.embed(chunk[:8000], show_notice=False)
                if emb.get("success") and emb.get("embedding"):
                    records.append({
                        "path": path,
                        "chunk": chunk,
                        "embedding": emb["embedding"]
                    })
                    total += 1
            except Exception as e:
                print(f"   ⚠️ {path} 块 {j}: {e}")
        if (i + 1) % 20 == 0:
            print(f"   已处理 {i+1}/{len(files)} 文件, {total} 块")
        time.sleep(0.3)
    _INDEX_DIR.mkdir(parents=True, exist_ok=True)
    with open(_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump({"records": records, "root": INDEX_ROOT}, f, ensure_ascii=False, indent=0)
    print(f"✅ 索引完成: {len(records)} 块 → {_INDEX_FILE}")


def cmd_search(query: str, top_k: int = 5):
    """语义搜索"""
    if not _INDEX_FILE.exists():
        print("❌ 索引不存在，请先运行: python local_codebase_index.py index")
        return
    with open(_INDEX_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    records = data.get("records", [])
    if not records:
        print("❌ 索引为空")
        return
    query_emb = _embed_via_ollama(query)
    scores = []
    for r in records:
        v = r["embedding"]
        dot = sum(a * b for a, b in zip(query_emb, v))
        n1 = math.sqrt(sum(a * a for a in query_emb))
        n2 = math.sqrt(sum(b * b for b in v))
        score = dot / (n1 * n2) if n1 and n2 else 0
        scores.append((score, r))
    scores.sort(key=lambda x: -x[0])
    print(f"\n🔍 查询: {query}\n")
    for i, (score, r) in enumerate(scores[:top_k], 1):
        print(f"--- [{i}] {r['path']} (score={score:.3f}) ---")
        txt = r["chunk"][:400].replace("\n", " ")
        print(f"{txt}{'...' if len(r['chunk']) > 400 else ''}\n")


def cmd_status():
    """查看索引状态"""
    if not _INDEX_FILE.exists():
        print("❌ 索引未创建。运行: python local_codebase_index.py index")
        return
    with open(_INDEX_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    n = len(data.get("records", []))
    root = data.get("root", "?")
    print(f"📁 索引根: {root}")
    print(f"📊 索引块数: {n}")
    print(f"📄 索引文件: {_INDEX_FILE}")


def main():
    parser = argparse.ArgumentParser(description="卡若AI 本地代码库索引")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("index")
    sp = sub.add_parser("search")
    sp.add_argument("query", help="搜索问题")
    sp.add_argument("--top", "-n", type=int, default=5, help="返回前 N 个结果")
    sub.add_parser("status")
    args = parser.parse_args()
    if args.cmd == "index":
        cmd_index()
    elif args.cmd == "search":
        cmd_search(args.query, top_k=args.top)
    elif args.cmd == "status":
        cmd_status()


if __name__ == "__main__":
    main()
