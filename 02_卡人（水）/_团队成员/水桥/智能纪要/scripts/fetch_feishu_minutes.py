#!/usr/bin/env python3
"""
飞书妙记文字记录获取工具
从飞书妙记链接获取文字记录，或从导出文件读取，生成会议纪要。纯 API/命令行，无需扫码。

一键命令（导出并发到飞书会议纪要群）：
  # 从妙记链接导出并发送（需应用有妙记权限）
  python fetch_feishu_minutes.py "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" --send-webhook

  # 从本地已导出的 txt 发送到会议纪要群（无需扫码）
  python fetch_feishu_minutes.py --file "产研团队 第20场 20260128 许永平.txt" --send-webhook

  # 指定其他飞书群 Webhook
  python fetch_feishu_minutes.py --file "xxx.txt" --send-webhook --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

其他用法：
  # 从飞书导出的 txt 生成会议纪要并发送
  python fetch_feishu_minutes.py --file "导出的文字记录.txt" --generate
  # 从妙记 URL 获取（需要 API 权限）
  python fetch_feishu_minutes.py "https://cunkebao.feishu.cn/minutes/xxx"
  python fetch_feishu_minutes.py --token obcnjnsx2mz7vj5q843172p8

飞书妙记导出步骤（当 API 无权限时）：
  1. 打开飞书妙记页面 → 右上角 "..." → "导出文字记录"
  2. 下载 txt 后执行：python fetch_feishu_minutes.py --file "下载的.txt" --send-webhook
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# 飞书开放平台配置（优先读环境变量，便于命令行传入 appid）
FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "cli_a48818290ef8100d")
FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4")

# 输出目录
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output"


def get_tenant_access_token() -> str:
    """获取飞书tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=10)
        data = resp.json()
        if data.get("code") == 0:
            return data.get("tenant_access_token")
        else:
            print(f"❌ 获取token失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    return None


def extract_minute_token(url_or_token: str) -> str:
    """从URL或直接token中提取minute_token"""
    # 如果是URL，提取token
    if "feishu.cn/minutes/" in url_or_token:
        match = re.search(r'/minutes/([a-zA-Z0-9]+)', url_or_token)
        if match:
            return match.group(1)
    
    # 直接返回token
    return url_or_token


def get_minutes_info(token: str, minute_token: str) -> dict:
    """获取妙记基本信息"""
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        data = resp.json()
        
        if data.get("code") == 0:
            return data.get("data", {}).get("minute", {})
        else:
            print(f"❌ 获取妙记信息失败: {data.get('msg')}")
            print(f"   错误码: {data.get('code')}")
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    return None


def get_minutes_transcript(token: str, minute_token: str) -> list:
    """获取妙记文字记录（逐字稿）"""
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/transcripts"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    all_transcripts = []
    page_token = None
    
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
        
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            try:
                data = resp.json()
            except ValueError:
                # 飞书部分接口可能返回非标准 JSON（如空或 HTML）
                data = {}
                if resp.text and len(resp.text) < 500:
                    print(f"   ⚠️ 接口返回非 JSON: {resp.text[:200]}")
            
            if data.get("code") == 0:
                transcripts = data.get("data", {}).get("transcripts", [])
                all_transcripts.extend(transcripts)
                
                # 检查是否有更多页
                page_token = data.get("data", {}).get("page_token")
                if not page_token or not data.get("data", {}).get("has_more"):
                    break
            else:
                print(f"❌ 获取文字记录失败: {data.get('msg')}")
                print(f"   错误码: {data.get('code')}")
                break
        except Exception as e:
            print(f"❌ 请求异常: {e}")
            break
    
    return all_transcripts


def get_minutes_speakers(token: str, minute_token: str) -> list:
    """获取妙记发言人列表"""
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/speakers"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        try:
            data = resp.json()
        except ValueError:
            data = {}
        if data.get("code") == 0:
            return data.get("data", {}).get("speakers", [])
        else:
            print(f"⚠️ 获取发言人失败: {data.get('msg')}")
    except Exception as e:
        print(f"⚠️ 请求异常: {e}")
    
    return []


def format_timestamp(ms: int) -> str:
    """将毫秒转换为时间戳格式 HH:MM:SS"""
    seconds = ms // 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"


def transcripts_to_text(transcripts: list, speakers: list) -> str:
    """将文字记录转换为文本格式"""
    # 构建speaker_id到名称的映射
    speaker_map = {}
    for speaker in speakers:
        speaker_id = speaker.get("speaker_id", "")
        speaker_name = speaker.get("speaker_name", "未知")
        speaker_map[speaker_id] = speaker_name
    
    lines = []
    current_speaker = None
    current_text = []
    current_time = None
    
    for item in transcripts:
        speaker_id = item.get("speaker_id", "")
        speaker_name = speaker_map.get(speaker_id, "未知")
        start_time = item.get("start_time", 0)
        text = item.get("text", "").strip()
        
        if not text:
            continue
        
        # 如果是同一个发言人，合并文本
        if speaker_name == current_speaker:
            current_text.append(text)
        else:
            # 保存之前的发言
            if current_speaker and current_text:
                time_str = format_timestamp(current_time)
                full_text = "".join(current_text)
                lines.append(f"{current_speaker} {time_str}")
                lines.append(full_text)
                lines.append("")
            
            # 开始新的发言
            current_speaker = speaker_name
            current_text = [text]
            current_time = start_time
    
    # 保存最后一个发言
    if current_speaker and current_text:
        time_str = format_timestamp(current_time)
        full_text = "".join(current_text)
        lines.append(f"{current_speaker} {time_str}")
        lines.append(full_text)
    
    return "\n".join(lines)


def save_transcript(text: str, info: dict, output_dir: Path) -> Path:
    """保存文字记录到文件"""
    # 生成文件名
    title = info.get("title", "妙记")
    # 清理文件名中的非法字符
    safe_title = re.sub(r'[\\/*?:"<>|]', '_', title)
    
    create_time = info.get("create_time", "")
    if create_time:
        try:
            dt = datetime.fromtimestamp(int(create_time))
            date_str = dt.strftime("%Y%m%d")
        except:
            date_str = datetime.now().strftime("%Y%m%d")
    else:
        date_str = datetime.now().strftime("%Y%m%d")
    
    filename = f"{safe_title}_{date_str}.txt"
    output_path = output_dir / filename
    
    # 添加头部信息
    header = f"""日期: {date_str}
标题: {title}
时长: {format_timestamp(int(info.get('duration', 0)))}

关键词:
会议纪要、产研团队、技术分享

文字记录:
"""
    
    full_text = header + text
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    
    return output_path


def fetch_and_save(url_or_token: str, output_dir: Path = None) -> Path:
    """获取飞书妙记并保存文字记录"""
    if output_dir is None:
        output_dir = OUTPUT_DIR
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 提取minute_token
    minute_token = extract_minute_token(url_or_token)
    print(f"📝 妙记Token: {minute_token}")
    
    # 获取token
    print("🔑 获取飞书访问令牌...")
    token = get_tenant_access_token()
    if not token:
        print("❌ 无法获取访问令牌")
        return None
    
    # 获取妙记信息
    print("📋 获取妙记基本信息...")
    info = get_minutes_info(token, minute_token)
    if not info:
        print("❌ 无法获取妙记信息")
        return None
    
    title = info.get("title", "未命名")
    duration = format_timestamp(int(info.get("duration", 0)))
    print(f"   标题: {title}")
    print(f"   时长: {duration}")
    
    # 获取发言人
    print("👥 获取发言人列表...")
    speakers = get_minutes_speakers(token, minute_token)
    print(f"   发言人数: {len(speakers)}")
    for speaker in speakers:
        print(f"   - {speaker.get('speaker_name', '未知')}")
    
    # 获取文字记录
    print("📄 获取文字记录...")
    transcripts = get_minutes_transcript(token, minute_token)
    print(f"   文字段落数: {len(transcripts)}")
    
    if not transcripts:
        print("   ⚠️ API 未返回文字记录（需应用具备「妙记文字记录」权限或从妙记页导出）")
        # 仍保存摘要并返回，便于发飞书或后续用 --file 发本地导出
        text = f"标题: {title}\n时长: {duration}\n\n（文字记录需在飞书妙记页面「…」→ 导出文字记录，或为应用开通权限后重试本命令）"
    else:
        # 转换为文本
        text = transcripts_to_text(transcripts, speakers)
    
    # 保存文件
    output_path = save_transcript(text, info, output_dir)
    print(f"✅ 文字记录已保存: {output_path}")
    
    return output_path


def process_exported_file(file_path: str, title: str = None) -> Path:
    """处理飞书导出的文字记录文件，转换为标准格式"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"❌ 文件不存在: {file_path}")
        return None
    
    print(f"📄 读取导出文件: {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 从文件名提取信息
    filename = file_path.stem
    
    # 尝试提取日期
    date_match = re.search(r'(\d{8})', filename)
    if date_match:
        date_str = date_match.group(1)
    else:
        date_str = datetime.now().strftime("%Y%m%d")
    
    # 使用提供的标题或从文件名提取
    if not title:
        title = filename
    
    # 计算时长（从内容中尝试提取最后一个时间戳）
    time_matches = re.findall(r'(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})', content)
    if time_matches:
        last_time = time_matches[-1]
        duration = last_time
    else:
        duration = "未知"
    
    # 构建标准格式的头部
    header = f"""日期: {date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}
标题: {title}
时长: {duration}

关键词:
会议纪要、产研团队、技术分享、项目复盘

文字记录:
"""
    
    # 检查内容是否已有标准格式
    if not content.startswith("日期:"):
        content = header + content
    
    # 保存处理后的文件
    output_dir = OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    safe_title = re.sub(r'[\\/*?:"<>|]', '_', title)
    output_path = output_dir / f"{safe_title}_{date_str}.txt"
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ 处理完成: {output_path}")
    return output_path


# 会议纪要飞书群 Webhook（默认）
MEETING_MINUTES_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566"

# 飞书单条消息文本上限约 20KB，预留安全长度
FEISHU_TEXT_MAX = 3500


def send_text_to_webhook(webhook: str, text: str) -> bool:
    """通过 Webhook 发送文本到飞书群（无需扫码，仅需机器人 Webhook）"""
    payload = {
        "msg_type": "text",
        "content": {"text": text[:FEISHU_TEXT_MAX] if len(text) > FEISHU_TEXT_MAX else text}
    }
    try:
        resp = requests.post(webhook, json=payload, timeout=15)
        data = resp.json()
        if data.get("code") == 0:
            return True
        print(f"❌ 飞书发送失败: {data.get('msg')}")
    except Exception as e:
        print(f"❌ 飞书发送异常: {e}")
    return False


def main():
    parser = argparse.ArgumentParser(description="飞书妙记文字记录获取工具")
    parser.add_argument("url", nargs="?", type=str, help="飞书妙记URL或minute_token")
    parser.add_argument("--token", "-t", type=str, help="直接指定minute_token")
    parser.add_argument("--file", "-f", type=str, help="从飞书导出的文字记录文件路径")
    parser.add_argument("--title", type=str, help="指定标题（用于导出文件）")
    parser.add_argument("--output", "-o", type=str, help="输出目录")
    parser.add_argument("--generate", "-g", action="store_true", 
                        help="获取后自动生成会议纪要并发送飞书")
    parser.add_argument("--send-webhook", "-S", action="store_true",
                        help="导出后发送文字记录到飞书会议纪要群")
    parser.add_argument("--webhook", "-w", type=str, default=MEETING_MINUTES_WEBHOOK,
                        help=f"飞书机器人 Webhook 地址（默认: 会议纪要群）")
    
    args = parser.parse_args()
    
    if not REQUESTS_AVAILABLE:
        print("❌ 需要安装 requests: pip install requests")
        sys.exit(1)
    
    output_path = None
    
    # 方法1: 从导出文件处理（推荐）
    if args.file:
        output_path = process_exported_file(args.file, args.title)
    
    # 方法2: 从URL或token获取
    elif args.url or args.token:
        url_or_token = args.url or args.token
        output_dir = Path(args.output) if args.output else OUTPUT_DIR
        output_path = fetch_and_save(url_or_token, output_dir)
    
    else:
        print("❌ 请提供文件路径(--file)或飞书妙记URL")
        print("\n📖 推荐使用方法:")
        print("   1. 在飞书妙记页面点击 '...' → '导出文字记录'")
        print("   2. 下载txt文件")
        print("   3. 运行: python fetch_feishu_minutes.py --file '导出文件.txt' --generate")
        parser.print_help()
        sys.exit(1)
    
    if output_path and args.generate:
        print("\n" + "="*50)
        print("🎨 开始生成会议纪要...")
        print("="*50)
        
        # 调用完整流程
        import subprocess
        result = subprocess.run(
            ["python3", str(SCRIPT_DIR / "full_pipeline.py"), str(output_path)],
            capture_output=False
        )
        
        if result.returncode == 0:
            print("✅ 会议纪要生成完成并已发送飞书!")
    
    # 导出后发送到飞书会议纪要群（纯 API，无需扫码）
    if output_path and args.send_webhook:
        print("\n📤 发送文字记录到飞书会议纪要群...")
        try:
            full_text = output_path.read_text(encoding="utf-8")
            if len(full_text) > FEISHU_TEXT_MAX:
                msg = full_text[: FEISHU_TEXT_MAX - 80] + "\n\n（内容过长，已截断。完整版已导出至本地：{}）".format(str(output_path))
            else:
                msg = full_text
            if send_text_to_webhook(args.webhook, msg):
                print("   ✅ 已发送到飞书群")
            else:
                print("   ⚠️ 发送失败，请检查 Webhook 或网络")
        except Exception as e:
            print(f"   ❌ 发送异常: {e}")
    
    return output_path


if __name__ == "__main__":
    main()
