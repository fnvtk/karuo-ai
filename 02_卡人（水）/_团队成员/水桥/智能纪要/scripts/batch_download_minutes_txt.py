#!/usr/bin/env python3
"""
飞书妙记批量下载 TXT 文字记录（纯接口+命令行，不打开浏览器）

从「URL 列表文件」批量拉取飞书妙记，将每场的文字记录保存为 TXT。
凭证：环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET（不设则用脚本内置默认 appid）。

用法：
  # 从 urls.txt 批量下载（每行一个妙记链接或 minute_token）
  python3 batch_download_minutes_txt.py --list urls.txt

  # 指定输出目录
  python3 batch_download_minutes_txt.py --list urls.txt --output ./soul_party_txt

  # 跳过已存在的 TXT（按标题+日期判断）
  python3 batch_download_minutes_txt.py --list urls.txt --skip-existing

  # 仅试跑前 3 条
  python3 batch_download_minutes_txt.py --list urls.txt --limit 3

  # 使用自定义 appid（环境变量）
  FEISHU_APP_ID=xxx FEISHU_APP_SECRET=yyy python3 batch_download_minutes_txt.py --list urls.txt

urls.txt 需自行整理：每行一个妙记 URL（如 https://xxx.feishu.cn/minutes/xxx）或 minute_token。
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = ROOT / "output"

# 导入单条拉取逻辑
sys.path.insert(0, str(SCRIPT_DIR))
from fetch_feishu_minutes import (
    extract_minute_token,
    fetch_and_save,
    get_tenant_access_token,
    get_minutes_info,
    get_minutes_transcript,
    get_minutes_speakers,
    transcripts_to_text,
    save_transcript,
    format_timestamp,
    OUTPUT_DIR as DEFAULT_OUTPUT_DIR,
)


def load_url_list(path: Path) -> list[str]:
    """从文件读取 URL 列表，每行一个，去掉空行和重复"""
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
    urls = []
    seen = set()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # 兼容只写 minute_token 的情况
        if line not in seen:
            seen.add(line)
            urls.append(line)
    return urls


def main():
    parser = argparse.ArgumentParser(
        description="飞书妙记批量下载 TXT：从 URL 列表文件批量拉取文字记录"
    )
    parser.add_argument(
        "--list", "-l",
        type=str,
        required=True,
        help="URL 列表文件路径，每行一个妙记链接或 minute_token",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help=f"TXT 输出目录（默认: {OUTPUT_DIR}）",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="若输出目录已存在同名 TXT 则跳过该条",
    )
    parser.add_argument(
        "--limit", "-n",
        type=int,
        default=0,
        help="仅处理前 N 条（0 表示全部）",
    )
    args = parser.parse_args()

    list_path = Path(args.list)
    if not list_path.is_absolute():
        list_path = (Path.cwd() / args.list).resolve()
    if not list_path.exists():
        print(f"❌ 列表文件不存在: {list_path}")
        sys.exit(1)

    output_dir = Path(args.output).resolve() if args.output else OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"📂 输出目录: {output_dir}")

    urls = load_url_list(list_path)
    if not urls:
        print("❌ 列表文件中没有有效 URL")
        sys.exit(1)

    if args.limit:
        urls = urls[: args.limit]
        print(f"⚠️ 仅处理前 {len(urls)} 条（--limit {args.limit}）")
    print(f"📋 共 {len(urls)} 条妙记待下载\n")

    ok_count = 0
    skip_count = 0
    fail_count = 0
    token = get_tenant_access_token()
    if not token:
        print("❌ 无法获取飞书访问令牌")
        sys.exit(1)

    for i, url_or_token in enumerate(urls, 1):
        minute_token = extract_minute_token(url_or_token)
        print(f"[{i}/{len(urls)}] 妙记 token: {minute_token[:20]}...")

        if args.skip_existing:
            # 用 API 先取标题再判断文件是否已存在（避免重复请求）
            info = get_minutes_info(token, minute_token)
            if info:
                title = info.get("title", "妙记")
                safe_title = re.sub(r'[\\/*?:"<>|]', "_", title)
                create_time = info.get("create_time", "")
                if create_time:
                    try:
                        # 飞书 API 可能返回秒或毫秒时间戳，>1e10 视为毫秒
                        ts = int(create_time)
                        if ts > 1e10:
                            ts = ts // 1000
                        date_str = datetime.fromtimestamp(ts).strftime("%Y%m%d")
                    except Exception:
                        date_str = datetime.now().strftime("%Y%m%d")
                else:
                    date_str = datetime.now().strftime("%Y%m%d")
                existing = output_dir / f"{safe_title}_{date_str}.txt"
                if existing.exists():
                    print(f"   ⏭️ 已存在，跳过: {existing.name}")
                    skip_count += 1
                    continue

        out = fetch_and_save(url_or_token, output_dir)
        if out and out.exists():
            ok_count += 1
        else:
            fail_count += 1
        print("")

    print("=" * 50)
    print(f"✅ 成功: {ok_count} | ⏭️ 跳过: {skip_count} | ❌ 失败: {fail_count}")
    print(f"📂 所有 TXT 保存在: {output_dir}")


if __name__ == "__main__":
    main()
