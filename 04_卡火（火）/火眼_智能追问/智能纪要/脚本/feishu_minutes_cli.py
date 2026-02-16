#!/usr/bin/env python3
"""
飞书妙记命令行工具
直接从飞书妙记链接生成会议纪要，无需浏览器

使用方法：
  python feishu_minutes_cli.py "https://cunkebao.feishu.cn/minutes/xxx"
  python feishu_minutes_cli.py "https://cunkebao.feishu.cn/minutes/xxx" --send  # 发送到飞书群
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# 飞书配置
FEISHU_APP_ID = "cli_a48818290ef8100d"
FEISHU_APP_SECRET = "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"

# 路径配置
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output"


class FeishuMinutesClient:
    """飞书妙记客户端"""
    
    def __init__(self):
        self.token = None
        self._get_token()
    
    def _get_token(self):
        """获取访问令牌"""
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        resp = requests.post(url, json={
            "app_id": FEISHU_APP_ID,
            "app_secret": FEISHU_APP_SECRET
        }, timeout=10)
        data = resp.json()
        if data.get("code") == 0:
            self.token = data.get("tenant_access_token")
        else:
            raise Exception(f"获取token失败: {data.get('msg')}")
    
    def _headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def get_minute_info(self, minute_token: str) -> dict:
        """获取妙记基本信息"""
        url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}"
        resp = requests.get(url, headers=self._headers(), timeout=30)
        data = resp.json()
        
        if data.get("code") == 0:
            return data.get("data", {}).get("minute", {})
        else:
            print(f"❌ 获取妙记信息失败: {data.get('msg')}")
            return None
    
    def get_transcripts(self, minute_token: str) -> list:
        """获取文字记录"""
        url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/transcripts"
        all_transcripts = []
        page_token = None
        
        while True:
            params = {"page_size": 100}
            if page_token:
                params["page_token"] = page_token
            
            try:
                resp = requests.get(url, headers=self._headers(), params=params, timeout=30)
                
                # 检查是否是404（无权限）
                if resp.status_code == 404:
                    print("⚠️ 无法获取文字记录（需要管理员添加 minutes:minute:transcripts:readonly 权限）")
                    return None
                
                data = resp.json()
                
                if data.get("code") == 0:
                    transcripts = data.get("data", {}).get("transcripts", [])
                    all_transcripts.extend(transcripts)
                    
                    page_token = data.get("data", {}).get("page_token")
                    if not page_token or not data.get("data", {}).get("has_more"):
                        break
                else:
                    print(f"❌ 获取文字记录失败: {data.get('msg')}")
                    break
            except Exception as e:
                print(f"❌ 请求异常: {e}")
                break
        
        return all_transcripts if all_transcripts else None
    
    def get_speakers(self, minute_token: str) -> list:
        """获取发言人"""
        url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/speakers"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=30)
            if resp.status_code == 404:
                return []
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data", {}).get("speakers", [])
        except:
            pass
        return []
    
    def get_statistics(self, minute_token: str) -> dict:
        """获取统计信息"""
        url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/statistics"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=30)
            data = resp.json()
            if data.get("code") == 0:
                return data.get("data", {}).get("statistics", {})
        except:
            pass
        return {}


def extract_minute_token(url_or_token: str) -> str:
    """从URL提取minute_token"""
    if "feishu.cn/minutes/" in url_or_token:
        match = re.search(r'/minutes/([a-zA-Z0-9]+)', url_or_token)
        if match:
            return match.group(1)
    return url_or_token


def format_duration(ms: int) -> str:
    """毫秒转时长"""
    seconds = ms // 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours}小时{minutes}分{secs}秒"
    elif minutes > 0:
        return f"{minutes}分{secs}秒"
    else:
        return f"{secs}秒"


def create_meeting_json(info: dict, transcripts: list = None, speakers: list = None) -> dict:
    """创建会议纪要JSON数据"""
    title = info.get("title", "飞书妙记")
    duration_ms = int(info.get("duration", 0))
    create_time = info.get("create_time", "")
    
    # 解析日期
    if create_time:
        try:
            dt = datetime.fromtimestamp(int(create_time) / 1000)
            date_str = dt.strftime("%Y-%m-%d")
            time_str = dt.strftime("%H:%M")
        except:
            date_str = datetime.now().strftime("%Y-%m-%d")
            time_str = ""
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")
        time_str = ""
    
    # 构建基本数据
    meeting_data = {
        "title": title,
        "subtitle": f"飞书妙记 | {title}",
        "date": date_str,
        "time": time_str,
        "duration": format_duration(duration_ms),
        "participants_count": "团队会议",
        "location": "飞书妙记",
        "speakers": [],
        "modules": [],
        "highlights": [],
        "takeaways": [],
        "actions": []
    }
    
    # 添加发言人
    if speakers:
        for s in speakers:
            meeting_data["speakers"].append({
                "name": s.get("speaker_name", "未知"),
                "role": "会议参与者",
                "topics": "产研讨论"
            })
    else:
        # 从标题提取发言人
        name_match = re.search(r'(\w+)$', title)
        if name_match:
            meeting_data["speakers"].append({
                "name": name_match.group(1),
                "role": "主讲人",
                "topics": title
            })
    
    # 如果有文字记录，解析内容
    if transcripts:
        # 提取关键内容
        all_text = " ".join([t.get("text", "") for t in transcripts])
        
        # 简单分析
        meeting_data["modules"].append({
            "title": "会议内容",
            "color": "blue",
            "items": [{
                "title": "主要议题",
                "points": [
                    f"会议时长: {format_duration(duration_ms)}",
                    f"参与人数: {len(speakers) if speakers else '未知'}",
                    f"文字记录: {len(transcripts)} 段"
                ]
            }]
        })
    else:
        # 无文字记录时的默认内容
        meeting_data["modules"].append({
            "title": "会议概要",
            "color": "blue",
            "items": [{
                "title": title,
                "points": [
                    f"会议时长: {format_duration(duration_ms)}",
                    f"会议日期: {date_str}",
                    "（文字记录需要管理员授权后获取）"
                ]
            }]
        })
    
    # 添加干货提炼
    meeting_data["takeaways"].append({
        "title": "会议信息",
        "color": "yellow",
        "points": [
            f"<strong>标题:</strong> {title}",
            f"<strong>时长:</strong> {format_duration(duration_ms)}",
            f"<strong>日期:</strong> {date_str} {time_str}"
        ]
    })
    
    # 添加行动项
    meeting_data["actions"].append({
        "content": "查看完整会议录像和文字记录",
        "note": info.get("url", ""),
        "color": "green"
    })
    
    return meeting_data


def main():
    parser = argparse.ArgumentParser(description="飞书妙记命令行工具")
    parser.add_argument("url", type=str, help="飞书妙记URL或minute_token")
    parser.add_argument("--send", "-s", action="store_true", help="发送到飞书群")
    parser.add_argument("--output", "-o", type=str, help="输出目录")
    
    args = parser.parse_args()
    
    if not REQUESTS_AVAILABLE:
        print("❌ 需要安装 requests: pip install requests")
        sys.exit(1)
    
    # 提取token
    minute_token = extract_minute_token(args.url)
    print(f"📝 妙记Token: {minute_token}")
    
    # 创建输出目录
    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 初始化客户端
    print("🔑 获取飞书访问令牌...")
    try:
        client = FeishuMinutesClient()
    except Exception as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # 获取妙记信息
    print("📋 获取妙记信息...")
    info = client.get_minute_info(minute_token)
    if not info:
        sys.exit(1)
    
    title = info.get("title", "未命名")
    duration = format_duration(int(info.get("duration", 0)))
    print(f"   ✅ 标题: {title}")
    print(f"   ✅ 时长: {duration}")
    
    # 获取发言人
    print("👥 获取发言人...")
    speakers = client.get_speakers(minute_token)
    if speakers:
        print(f"   ✅ 发言人: {len(speakers)} 人")
        for s in speakers:
            print(f"      - {s.get('speaker_name', '未知')}")
    
    # 尝试获取文字记录
    print("📄 获取文字记录...")
    transcripts = client.get_transcripts(minute_token)
    if transcripts:
        print(f"   ✅ 文字段落: {len(transcripts)} 段")
    else:
        print("   ⚠️ 文字记录不可用（权限限制）")
    
    # 创建会议数据
    print("\n🎨 生成会议纪要...")
    meeting_data = create_meeting_json(info, transcripts, speakers)
    
    # 保存JSON
    safe_title = re.sub(r'[\\/*?:"<>|]', '_', title)
    json_path = output_dir / f"{safe_title}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(meeting_data, f, ensure_ascii=False, indent=2)
    print(f"   ✅ JSON: {json_path}")
    
    # 生成HTML
    print("🎨 生成HTML...")
    result = subprocess.run(
        ["python3", str(SCRIPT_DIR / "generate_meeting.py"), "--input", str(json_path)],
        capture_output=True,
        text=True,
        input="n\n"
    )
    
    html_path = output_dir / f"{safe_title}.html"
    if html_path.exists():
        print(f"   ✅ HTML: {html_path}")
    else:
        # 查找生成的HTML
        for f in output_dir.glob("*.html"):
            if safe_title in f.stem:
                html_path = f
                print(f"   ✅ HTML: {html_path}")
                break
    
    # 截图
    print("📷 生成截图...")
    result = subprocess.run(
        ["python3", str(SCRIPT_DIR / "screenshot.py"), str(html_path)],
        capture_output=True,
        text=True
    )
    
    png_path = html_path.with_suffix(".png")
    if png_path.exists():
        print(f"   ✅ PNG: {png_path}")
    else:
        print(f"   ⚠️ 截图失败")
        png_path = None
    
    # 发送到飞书群
    if args.send and png_path:
        print("\n📤 发送到飞书群...")
        result = subprocess.run(
            ["python3", str(SCRIPT_DIR / "send_to_feishu.py"), "--json", str(json_path)],
            capture_output=True,
            text=True
        )
        print("   ✅ 已发送到飞书群")
    
    # 完成
    print("\n" + "="*50)
    print("✅ 完成!")
    print("="*50)
    print(f"\n📊 输出文件:")
    print(f"   JSON: {json_path}")
    print(f"   HTML: {html_path}")
    if png_path:
        print(f"   PNG:  {png_path}")
    
    # 打开HTML查看
    if html_path.exists():
        import webbrowser
        webbrowser.open(f"file://{html_path}")
    
    return str(png_path) if png_path else str(html_path)


if __name__ == "__main__":
    main()
