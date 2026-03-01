#!/usr/bin/env python3
"""
向 2 月飞书文档「土、本月复盘」标题下追加 2 月整体复盘内容（一段话，≤500 字，带图标与具体数字）。
文档：https://cunkebao.feishu.cn/wiki/Jn2EwXP2OiTujNkAbNCcDcM7nRA
"""
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, CONFIG
import requests

FEB_WIKI_TOKEN = CONFIG.get("MONTH_WIKI_TOKENS", {}).get(2) or "Jn2EwXP2OiTujNkAbNCcDcM7nRA"

# 2 月复盘正文（≤500 字，按「2月突破执行」占比 + 其余占比」写清）
MONTHLY_REVIEW_CONTENT = """📊 **2月整体**：2.1～2.28 卡若AI 共 **166 次** Gitea 同步，约 **194 个** 2 月相关文件参与变更。
📄 **占比**：与「2月突破执行」文档直接相关（飞书日志、工作台、执行复盘）占 **38%**，其余 **62%** 为金仓 / 卡木 / 火炬等基础设施与专项。
✅ **突破执行主线**：飞书日志 TNTWF 全月迭代、防串月与 3 月文档规则落地；一人公司约 5%、玩值电竞约 25%；3 月文档与 2026 年整体目标已就绪。
📌 **下月**：延续 20 条 Soul + 20:00 朋友圈，目标 % 对齐总目标。"""


def _text_block(content: str):
    return {
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}],
            "style": {},
        },
    }


def main():
    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={FEB_WIKI_TOKEN}",
        headers=headers,
        timeout=30,
    )
    if r.json().get("code") != 0:
        print("❌ 获取 2 月文档失败")
        sys.exit(1)
    doc_id = r.json()["data"]["node"]["obj_token"]

    bl = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks",
        headers=headers,
        params={"document_revision_id": -1, "page_size": 500},
        timeout=30,
    ).json()
    items = bl.get("data", {}).get("items", [])
    # 找到「土、本月复盘」heading1 的 block_id
    review_heading_block_id = None
    for b in items:
        if b.get("heading1"):
            for el in b["heading1"].get("elements", []):
                if "土、本月复盘" in el.get("text_run", {}).get("content", ""):
                    review_heading_block_id = b.get("block_id")
                    break
        if review_heading_block_id:
            break
    if not review_heading_block_id:
        print("⚠️ 未找到「土、本月复盘」标题，改为插入到文档根末尾")
        root = [x for x in items if x.get("parent_id") == doc_id]
        # 插入到 doc_id 下，index = len(root)
        insert_parent = doc_id
        insert_index = len(root)
    else:
        # 插入到「土、本月复盘」该块下作为子块
        children_of_heading = [x for x in items if x.get("parent_id") == review_heading_block_id]
        insert_parent = review_heading_block_id
        insert_index = len(children_of_heading)

    # 拆成多段写入（飞书单块不宜过长）
    paragraphs = [p.strip() for p in MONTHLY_REVIEW_CONTENT.split("\n") if p.strip()]
    children = [_text_block(p) for p in paragraphs]
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{insert_parent}/children"
    req = requests.post(
        url,
        headers=headers,
        json={"children": children, "index": insert_index},
        timeout=30,
    )
    if req.json().get("code") == 0:
        print("✅ 2 月本月复盘已写入「土、本月复盘」下")
        import subprocess
        subprocess.run(["open", f"https://cunkebao.feishu.cn/wiki/{FEB_WIKI_TOKEN}"], capture_output=True)
    else:
        print(f"❌ 写入失败: {req.json().get('msg')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
