#!/usr/bin/env python3
"""
写入 3月1日 飞书日志到 3月 文档（继承 2 月结构，不含 2 月内容），并插入指定图片。
- 使用 3 月文档 token：CONFIG['MONTH_WIKI_TOKENS'][3] 或环境变量 FEISHU_MARCH_WIKI_TOKEN
- 仅使用已配置的 3 月文档 token，不自动新建（每月只保持一个文档）；未配置时提示在飞书使用已有 3 月文档并设置 FEISHU_MARCH_WIKI_TOKEN
- 图片插入在 3月1日 标题+高亮块之后

用法：
  export FEISHU_MARCH_WIKI_TOKEN=你的3月文档node_token   # 在飞书复制 2 月文档为 3 月后，从地址栏复制
  python3 write_0301_feishu_log.py [--image /path/to/image.png]
"""
import os
import sys
import requests
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import (
    get_token_silent,
    write_log,
    build_blocks,
    open_result,
    resolve_wiki_token_for_date,
    CONFIG,
)

# 默认图片：对话中提供的图片（可被 --image 覆盖）；备选为飞书管理目录下
DEFAULT_IMAGE = Path("/Users/karuo/.cursor/projects/Users-karuo-Documents-AI/assets/_____2025-08-28_224559_607-b4d3b3c1-6663-4ed6-9ee7-a1fa4426031e.png")
FALLBACK_IMAGE = SCRIPT_DIR.parent / "今日日志配图.png"

DATE_0301 = "3月1日"


def _get_march_wiki_token():
    """获取 3 月文档 wiki token。仅使用已配置的 token，不新建文档（每月只保持一个文档）。"""
    raw = (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(3) or os.environ.get("FEISHU_MARCH_WIKI_TOKEN") or ""
    return (raw or "").strip() or None


def build_tasks_0301():
    """3月1日任务：继承 2 月 TNTWF 结构，内容为 3 月首日；目标%以 运营中枢/工作台/2026年整体目标.md 为基准。"""
    return [
        {
            "person": "卡若",
            "events": ["昨日完成度", "本月未完成并入3月", "今日核心"],
            "quadrant": "重要紧急",
            "t_targets": [
                "昨日2月28日：一人公司5%、玩值电竞25%、飞书日志100%",
                "本月未完成并入3月：一人公司、玩值电竞、卡若AI 4项优化、20条Soul+8点朋友圈",
                "本月目标约 12%，距最终目标差 88%",
                "今日核心：每天20条Soul视频 + 20:00发1条朋友圈",
            ],
            "n_process": [
                "【昨日】2月28日完成度已更新；2月未完成项并入3月首日",
                "【复盘】从聊天记录与文档统一整理；3月文档独立于2月",
                "【3月突破执行】未完成项自3月1日起持续迭代至100%",
            ],
            "t_thoughts": [
                "3月日志写在3月文档，不写2月；昨日与本月完成度、未完成项均写入当日",
            ],
            "w_work": ["一人公司", "玩值电竞", "卡若AI优化", "20条Soul视频", "20:00发1条朋友圈", "飞书日志"],
            "f_feedback": [
                "昨日完成度已写入 ✅",
                "本月未完成已并入3月1日 🔄",
                "本月/最终 12% / 100%，差 88%",
                "今日核心→20条Soul+8点朋友圈 🔄",
            ],
        }
    ]


def upload_image_to_feishu(token: str, doc_token: str, image_path: Path) -> str | None:
    """上传图片到 docx，返回 file_token。"""
    if not image_path.exists():
        print(f"⚠️ 图片不存在: {image_path}")
        return None
    size = image_path.stat().st_size
    if size > 20 * 1024 * 1024:
        print("⚠️ 图片超过 20MB")
        return None
    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    headers = {"Authorization": f"Bearer {token}"}
    with open(image_path, "rb") as f:
        files = {
            "file_name": (None, image_path.name),
            "parent_type": (None, "docx_image"),
            "parent_node": (None, doc_token),
            "size": (None, str(size)),
            "file": (image_path.name, f, "image/png"),
        }
        r = requests.post(url, headers=headers, files=files, timeout=60)
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("file_token")
    print(f"⚠️ 上传失败: {data.get('msg')}")
    return None


def insert_image_block(token: str, doc_token: str, file_token: str, filename: str, after_index: int) -> bool:
    """在文档指定位置插入图片块。先试 gallery(18)，再试 file(12) 两种字段风格。"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1) 先试 gallery 块（单图）
    for payload in [
        {"block_type": 18, "gallery": {"image_list": [{"file_token": file_token}], "gallery_style": {"align": "center"}}},
        {"block_type": 18, "gallery": {"imageList": [{"fileToken": file_token}], "galleryStyle": {"align": "center"}}},
    ]:
        r = requests.post(url, headers=headers, json={"children": [payload], "index": after_index}, timeout=30)
        if r.json().get("code") == 0:
            return True

    # 2) 再试 file 块
    for block in [
        {"block_type": 12, "file": {"file_token": file_token, "view_type": "inline", "file_name": filename}},
        {"block_type": 12, "file": {"fileToken": file_token, "viewType": "inline", "fileName": filename}},
    ]:
        r = requests.post(url, headers=headers, json={"children": [block], "index": after_index}, timeout=30)
        if r.json().get("code") == 0:
            return True
    print(f"⚠️ 插入图片块失败: {r.json().get('msg')}")
    return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="写入3月1日飞书日志并插入图片")
    parser.add_argument("--image", type=Path, default=DEFAULT_IMAGE, help="要插入的图片路径")
    parser.add_argument("--overwrite", action="store_true", help="覆盖已有3月1日日志")
    parser.add_argument("--image-only", action="store_true", help="仅插入图片到3月1日段落，不写入/覆盖日志")
    args = parser.parse_args()

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    march_token = _get_march_wiki_token()
    if not march_token:
        print("❌ 未配置 3 月文档。请使用飞书里已有的 3 月文档（每月只保持一个），在地址栏复制 wiki/ 后的 node token，执行：")
        print("   export FEISHU_MARCH_WIKI_TOKEN=复制的token")
        print("   （不自动新建文档，避免多份 3 月文档）")
        sys.exit(1)

    if not args.image_only:
        print("=" * 50)
        print(f"📝 写入 {DATE_0301} 飞书日志（3月文档）" + (" [覆盖]" if args.overwrite else ""))
        print("=" * 50)
        tasks = build_tasks_0301()
        ok = write_log(token, DATE_0301, tasks, march_token, overwrite=args.overwrite)
        if not ok:
            print("❌ 写入失败")
            sys.exit(1)
    else:
        print("=" * 50)
        print(f"📎 仅插入图片到 {DATE_0301} 段落（3月文档）")
        print("=" * 50)

    # 获取 doc_id（obj_token）用于上传图片与插入
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={march_token}",
        headers=headers, timeout=30,
    )
    if r.json().get("code") != 0:
        print("⚠️ 获取文档信息失败，跳过图片插入")
        open_result(march_token)
        sys.exit(0)
    doc_token = r.json()["data"]["node"]["obj_token"]

    # 在「3月1日」标题+高亮块之后插入图片（与 write_today_log_with_image 一致：insert_index+2）
    bl = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks",
        headers=headers, params={"page_size": 500}, timeout=30,
    ).json()
    items = bl.get("data", {}).get("items", [])
    root = [b for b in items if b.get("parent_id") == doc_token]

    def text_of(b):
        for k in ("heading4", "text", "todo"):
            if k in b:
                return "".join(
                    e.get("text_run", {}).get("content", "") for e in b.get(k, {}).get("elements", [])
                ).strip()
        return ""

    idx = None
    for i, b in enumerate(root):
        t = text_of(b)
        if DATE_0301 in t or "3月1号" in t:
            idx = i
            break
    # 未找到 3月1日 标题时，插在文档开头（index=1，通常为标题后第一段），用户可再拖到 3月1日 处
    if idx is None:
        image_index = 1 if len(root) > 1 else 0
    else:
        image_index = idx + 2  # 标题 + 高亮块之后
    img_path = args.image if args.image.exists() else FALLBACK_IMAGE
    if img_path.exists():
        file_token = upload_image_to_feishu(token, doc_token, img_path)
        if file_token and insert_image_block(token, doc_token, file_token, img_path.name, image_index):
            print("✅ 图片已插入到 3月 文档" + ("（3月1日 段落后）" if idx is not None else "（文档前部，可拖至 3月1日 处）"))
        else:
            print("⚠️ 图片未插入，可手动拖入飞书文档")
    else:
        print(f"⚠️ 未找到图片（已试 {args.image} 与 {FALLBACK_IMAGE}），跳过插入")

    open_result(march_token)
    print(f"✅ {DATE_0301} 飞书日志已写入（3月文档）")


if __name__ == "__main__":
    main()
