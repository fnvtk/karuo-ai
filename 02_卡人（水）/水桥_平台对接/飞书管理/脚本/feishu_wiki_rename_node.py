#!/usr/bin/env python3
"""飞书 Wiki 节点重命名：根据 node_token 更新标题。用法: python3 feishu_wiki_rename_node.py <node_token> <新标题>"""
import sys
import requests
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import feishu_wiki_create_doc as fwd

def get_space_id(node_token: str, headers: dict) -> str | None:
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
        headers=headers, timeout=30)
    try:
        j = r.json()
    except Exception:
        print("get_node 响应非 JSON:", r.text[:300])
        return None
    if j.get("code") != 0:
        print("get_node 失败:", j.get("msg"), j)
        return None
    node = (j.get("data") or {}).get("node") or {}
    space_id = (node.get("space_id") or node.get("origin_space_id") or
                (node.get("space") or {}).get("space_id"))
    return space_id

def rename_node(space_id: str, node_token: str, new_title: str, headers: dict) -> bool:
    # 飞书文档: 更新节点标题 PATCH .../nodes/{node_token}/title（若 404 则需应用权限或手动改）
    url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}/title"
    r = requests.patch(url, headers=headers, json={"title": new_title}, timeout=30)
    if r.status_code != 200:
        return False
    try:
        return r.json().get("code") == 0
    except Exception:
        return False

def main():
    if len(sys.argv) < 3:
        print("用法: python3 feishu_wiki_rename_node.py <node_token> <新标题>")
        sys.exit(1)
    node_token = sys.argv[1]
    new_title = " ".join(sys.argv[2:])
    token = fwd.get_token(node_token)
    if not token:
        print("❌ Token 无效")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    space_id = get_space_id(node_token, headers)
    if not space_id:
        print("❌ 无法获取 space_id")
        sys.exit(1)
    if rename_node(space_id, node_token, new_title, headers):
        print(f"✅ 标题已更新为: {new_title}")
    else:
        print("❌ 更新标题失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
