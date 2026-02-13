#!/usr/bin/env python3
"""
飞书消息发送工具
将派对纪要图片/文本发送到飞书群

功能：
  1. 发送文本/富文本消息到飞书群
  2. 上传图片并发送（需要飞书应用凭证）
  3. 发送消息卡片

使用方法：
  python send_to_feishu.py --text "派对纪要已生成"
  python send_to_feishu.py --image output/meeting.png
  python send_to_feishu.py --card "派对纪要" --title "第85场"
"""

import argparse
import base64
import json
import os
import sys
from pathlib import Path
from datetime import datetime

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# 默认飞书Webhook地址
DEFAULT_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-5b9b-4abb-a05a-96c8fb9599f1"

# 飞书开放平台配置（用于图片上传）
# 直接配置，无需环境变量
FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "cli_a48818290ef8100d")
FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4")


def get_tenant_access_token():
    """获取飞书tenant_access_token（用于上传图片）"""
    if not FEISHU_APP_ID or not FEISHU_APP_SECRET:
        return None
    
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET
    }
    
    try:
        resp = requests.post(url, json=payload)
        data = resp.json()
        if data.get("code") == 0:
            return data.get("tenant_access_token")
    except Exception as e:
        print(f"❌ 获取token失败: {e}")
    
    return None


def upload_image_to_feishu(image_path: str) -> str:
    """上传图片到飞书，返回image_key"""
    token = get_tenant_access_token()
    if not token:
        print("⚠️ 未配置飞书应用凭证，无法上传图片")
        print("   请设置环境变量: FEISHU_APP_ID 和 FEISHU_APP_SECRET")
        return None
    
    url = "https://open.feishu.cn/open-apis/im/v1/images"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with open(image_path, "rb") as f:
        files = {
            "image": f,
            "image_type": (None, "message")
        }
        
        try:
            resp = requests.post(url, headers=headers, files=files)
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data", {}).get("image_key")
            else:
                print(f"❌ 上传图片失败: {data.get('msg')}")
        except Exception as e:
            print(f"❌ 上传图片异常: {e}")
    
    return None


def send_text(webhook: str, text: str) -> bool:
    """发送文本消息"""
    payload = {
        "msg_type": "text",
        "content": {
            "text": text
        }
    }
    
    try:
        resp = requests.post(webhook, json=payload)
        data = resp.json()
        if data.get("code") == 0:
            return True
        else:
            print(f"❌ 发送失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 发送异常: {e}")
    
    return False


def send_rich_text(webhook: str, title: str, content_lines: list) -> bool:
    """发送富文本消息"""
    # 构建富文本内容
    content = []
    for line in content_lines:
        if isinstance(line, str):
            content.append([{"tag": "text", "text": line}])
        elif isinstance(line, dict):
            content.append([line])
    
    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": content
                }
            }
        }
    }
    
    try:
        resp = requests.post(webhook, json=payload)
        data = resp.json()
        if data.get("code") == 0:
            return True
        else:
            print(f"❌ 发送失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 发送异常: {e}")
    
    return False


def send_image(webhook: str, image_key: str) -> bool:
    """发送图片消息（需要先上传获取image_key）"""
    payload = {
        "msg_type": "image",
        "content": {
            "image_key": image_key
        }
    }
    
    try:
        resp = requests.post(webhook, json=payload)
        data = resp.json()
        if data.get("code") == 0:
            return True
        else:
            print(f"❌ 发送失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 发送异常: {e}")
    
    return False


def send_interactive_card(webhook: str, title: str, content: str, 
                          image_url: str = None, buttons: list = None) -> bool:
    """发送消息卡片"""
    elements = []
    
    # 添加内容
    elements.append({
        "tag": "div",
        "text": {
            "tag": "lark_md",
            "content": content
        }
    })
    
    # 添加图片（如果有URL）
    if image_url:
        elements.append({
            "tag": "img",
            "img_key": image_url,  # 或者使用外部图片URL
            "alt": {
                "tag": "plain_text",
                "content": "派对纪要"
            }
        })
    
    # 添加按钮
    if buttons:
        button_elements = []
        for btn in buttons:
            button_elements.append({
                "tag": "button",
                "text": {
                    "tag": "plain_text",
                    "content": btn.get("text", "按钮")
                },
                "type": btn.get("type", "default"),
                "url": btn.get("url", "")
            })
        
        elements.append({
            "tag": "action",
            "actions": button_elements
        })
    
    payload = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": title
                },
                "template": "blue"
            },
            "elements": elements
        }
    }
    
    try:
        resp = requests.post(webhook, json=payload)
        data = resp.json()
        if data.get("code") == 0:
            return True
        else:
            print(f"❌ 发送失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 发送异常: {e}")
    
    return False


def send_meeting_summary(webhook: str, meeting_data: dict, image_path: str = None) -> bool:
    """发送派对纪要摘要到飞书群"""
    
    title = meeting_data.get("title", "派对纪要")
    subtitle = meeting_data.get("subtitle", "")
    date = meeting_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    duration = meeting_data.get("duration", "")
    speakers = meeting_data.get("speakers", [])
    takeaways = meeting_data.get("takeaways", [])
    
    # 构建富文本内容
    lines = [
        f"📅 {date} | ⏱️ {duration}",
        "",
        "👥 派对分享人："
    ]
    
    for speaker in speakers[:5]:  # 最多显示5个
        name = speaker.get("name", "")
        role = speaker.get("role", "")
        topics = speaker.get("topics", "")
        lines.append(f"• {name}（{role}）- {topics[:30]}...")
    
    if takeaways:
        lines.append("")
        lines.append("⚡ 干货提炼：")
        for tw in takeaways[:3]:  # 最多显示3个
            tw_title = tw.get("title", "")
            lines.append(f"• {tw_title}")
    
    # 先发送富文本摘要
    success = send_rich_text(webhook, f"🎤 {subtitle} | {title}", lines)
    
    # 如果有图片且配置了应用凭证，尝试上传并发送图片
    if success and image_path and Path(image_path).exists():
        image_key = upload_image_to_feishu(image_path)
        if image_key:
            send_image(webhook, image_key)
            print(f"✅ 图片已发送到飞书群")
        else:
            print(f"⚠️ 图片发送跳过（未配置飞书应用凭证）")
    
    return success


def main():
    parser = argparse.ArgumentParser(description="飞书消息发送工具")
    parser.add_argument("--webhook", "-w", type=str, default=DEFAULT_WEBHOOK,
                        help="飞书Webhook地址")
    parser.add_argument("--text", "-t", type=str, help="发送文本消息")
    parser.add_argument("--image", "-i", type=str, help="发送图片（需要飞书应用凭证）")
    parser.add_argument("--json", "-j", type=str, help="从JSON文件读取会议数据并发送摘要")
    parser.add_argument("--title", type=str, default="派对纪要", help="消息标题")
    
    args = parser.parse_args()
    
    if not REQUESTS_AVAILABLE:
        print("❌ 需要安装 requests: pip install requests")
        sys.exit(1)
    
    # 发送文本消息
    if args.text:
        if send_text(args.webhook, args.text):
            print(f"✅ 文本消息已发送")
        sys.exit(0)
    
    # 发送图片
    if args.image:
        image_path = Path(args.image)
        if not image_path.exists():
            print(f"❌ 图片不存在: {image_path}")
            sys.exit(1)
        
        image_key = upload_image_to_feishu(str(image_path))
        if image_key:
            if send_image(args.webhook, image_key):
                print(f"✅ 图片已发送")
        else:
            print("❌ 图片上传失败，请检查飞书应用凭证配置")
        sys.exit(0)
    
    # 从JSON发送会议摘要
    if args.json:
        json_path = Path(args.json)
        if not json_path.exists():
            print(f"❌ JSON文件不存在: {json_path}")
            sys.exit(1)
        
        with open(json_path, "r", encoding="utf-8") as f:
            meeting_data = json.load(f)
        
        # 检查是否有对应的图片
        image_path = json_path.with_suffix(".png")
        if not image_path.exists():
            # 尝试在output目录找
            html_name = json_path.stem.replace("_meeting", "")
            image_path = Path(__file__).parent.parent / "output" / f"{html_name}_meeting.png"
        
        if send_meeting_summary(args.webhook, meeting_data, 
                               str(image_path) if image_path.exists() else None):
            print(f"✅ 派对纪要已发送到飞书群")
        sys.exit(0)
    
    # 显示帮助
    parser.print_help()


if __name__ == "__main__":
    main()
