#!/usr/bin/env python3
"""
读书笔记完整发布流程：
1. 把脑图图片复制到读书笔记目录
2. 在 MD 文章里插入/更新脑图图片引用
3. 上传图片到飞书（通过本地 feishu_api 获取 image_key）
4. 发送富文本消息（文章摘要 + 图片）到飞书群 webhook

用法：
python3 reading_note_send_webhook.py \
  --md "/path/to/读书笔记.md" \
  --img "/path/to/脑图.png" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
"""
import argparse
import json
import os
import re
import shutil
import requests
from pathlib import Path

# ─── 本地飞书 API 服务 ───────────────────────────────────────────────
LOCAL_API = "http://127.0.0.1:5050"


def get_tenant_token(app_id: str, app_secret: str) -> str | None:
    """获取飞书 tenant_access_token（im/v1/images 上传必须用此 token）"""
    try:
        r = requests.post(
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
            json={"app_id": app_id, "app_secret": app_secret},
            timeout=15,
        )
        data = r.json()
        if data.get("code") == 0:
            return data.get("tenant_access_token")
    except Exception as e:
        print(f"⚠️ 获取 tenant token 失败: {e}")
    return None


def upload_image(token: str, img_path: Path) -> str | None:
    """上传图片到飞书（使用 tenant_access_token），返回 image_key"""
    if not img_path.exists():
        print(f"⚠️ 图片不存在: {img_path}")
        return None
    url = "https://open.feishu.cn/open-apis/im/v1/images"
    headers = {"Authorization": f"Bearer {token}"}
    with open(img_path, "rb") as f:
        resp = requests.post(
            url, headers=headers,
            data={"image_type": "message"},
            files={"image": (img_path.name, f, "image/png")},
            timeout=60,
        )
    data = resp.json()
    if data.get("code") == 0:
        key = data["data"]["image_key"]
        print(f"✅ 图片已上传，image_key: {key}")
        return key
    print(f"⚠️ 图片上传失败: {data.get('msg')} code={data.get('code')}")
    return None


def read_md_summary(md_path: Path, max_chars=800) -> str:
    """读取 MD 文件，提取一句话总结 + 金句（前 max_chars 字符）"""
    text = md_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    summary_lines = []
    capture = False
    for line in lines:
        if "一句话" in line or "金句" in line or "关键词" in line:
            capture = True
        if capture:
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                summary_lines.append(stripped)
        if len("\n".join(summary_lines)) > max_chars:
            break
    return "\n".join(summary_lines[:30]) if summary_lines else text[:max_chars]


def build_post_message(title: str, summary: str, image_key: str | None) -> dict:
    """构建飞书富文本 post 消息"""
    content_rows = []
    # 添加文字摘要
    for line in summary.split("\n"):
        line = line.strip()
        if not line:
            continue
        content_rows.append([{"tag": "text", "text": line}])
    # 加分隔
    content_rows.append([{"tag": "text", "text": "──────────────"}])
    # 图片行
    if image_key:
        content_rows.append([{"tag": "img", "image_key": image_key}])
    # 尾部标注
    content_rows.append([{"tag": "text", "text": "📖 卡若读书笔记 · 五行拆书法"}])
    return {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": f"📚 {title}",
                    "content": content_rows,
                }
            }
        },
    }


def send_webhook(webhook: str, payload: dict) -> bool:
    """发送消息到飞书群 webhook"""
    resp = requests.post(webhook, json=payload, timeout=15)
    data = resp.json()
    if data.get("code") == 0 or data.get("StatusCode") == 0:
        print(f"✅ 飞书群消息发送成功")
        return True
    print(f"⚠️ 发送失败: {data}")
    return False


def update_md_with_image(md_path: Path, img_filename: str) -> None:
    """在 MD 文件顶部的「思维导图」区域更新图片引用（若已存在则跳过）"""
    text = md_path.read_text(encoding="utf-8")
    img_ref = f"![脑图]({img_filename})"
    if img_ref in text:
        print(f"✅ MD 中已有图片引用 {img_filename}，无需更新")
        return
    # 在一句话总结前插入图片区块
    insert_block = f"\n## 脑图\n\n{img_ref}\n\n"
    if "## 一、一句话" in text:
        text = text.replace("## 一、一句话", insert_block + "## 一、一句话", 1)
    elif "## 思维导图" not in text:
        # 找到第一个 ## 标题前插入
        text = re.sub(r"(^---\n\n## )", insert_block + r"\1", text, count=1, flags=re.MULTILINE)
    md_path.write_text(text, encoding="utf-8")
    print(f"✅ MD 已更新图片引用: {img_filename}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", required=True, help="读书笔记 MD 路径")
    ap.add_argument("--img", required=True, help="脑图图片路径")
    ap.add_argument("--webhook", required=True, help="飞书群 webhook URL")
    ap.add_argument("--title", default="", help="书名（默认从 MD 文件名提取）")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    img_path = Path(args.img).expanduser().resolve()
    webhook = args.webhook

    if not md_path.exists():
        print(f"❌ MD 不存在: {md_path}")
        return
    if not img_path.exists():
        print(f"❌ 图片不存在: {img_path}")
        return

    # 1. 复制图片到 MD 同目录
    dest_img = md_path.parent / img_path.name
    if dest_img != img_path:
        shutil.copy(img_path, dest_img)
        print(f"✅ 图片已复制到: {dest_img}")

    # 2. 更新 MD 图片引用
    update_md_with_image(md_path, img_path.name)

    # 3. 获取 tenant token 并上传图片
    title = args.title or md_path.stem.replace("_读书笔记", "").replace("_", " ")
    summary = read_md_summary(md_path)

    APP_ID = "cli_a48818290ef8100d"
    APP_SECRET = "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"
    token = get_tenant_token(APP_ID, APP_SECRET)
    image_key = None
    if token:
        image_key = upload_image(token, img_path)
    else:
        print("⚠️ 获取 tenant token 失败，将只发文字消息")

    # 4. 发送 webhook
    payload = build_post_message(title, summary, image_key)
    send_webhook(webhook, payload)

    print(f"\n✅ 全部完成！")
    print(f"   MD: {md_path}")
    print(f"   图片: {dest_img}")
    print(f"   飞书群: {webhook}")


if __name__ == "__main__":
    main()
