#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音发布：使用抖音开放平台 API 上传视频并发布。
依赖：用户已完成 OAuth 授权，access_token、open_id 存于环境变量或 tokens.json。
与「抖音发布」Skill 配套；存客宝/腕推若提供抖音发布接口可替换本脚本内的 API 调用。
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("请安装 requests: pip install requests", file=sys.stderr)
    sys.exit(1)

# 抖音开放平台 API 基址
BASE = "https://open.douyin.com"
UPLOAD_URL = f"{BASE}/api/douyin/v1/video/upload_video/"
CREATE_URL = f"{BASE}/api/douyin/v1/video/create_video/"


def load_tokens(token_file: Path | None) -> tuple[str, str]:
    """从环境变量或 token 文件读取 access_token、open_id。"""
    token = os.environ.get("DOUYIN_ACCESS_TOKEN") or os.environ.get("ACCESS_TOKEN")
    open_id = os.environ.get("DOUYIN_OPEN_ID") or os.environ.get("OPEN_ID")
    if token_file and token_file.exists():
        with open(token_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            token = token or data.get("access_token")
            open_id = open_id or data.get("open_id")
    if not token or not open_id:
        print(
            "未配置 access_token / open_id。请先完成抖音 OAuth 登录，将 access_token、open_id 写入 tokens.json 或设置环境变量 DOUYIN_ACCESS_TOKEN、DOUYIN_OPEN_ID。",
            file=sys.stderr,
        )
        print("参见：参考资料/抖音开放平台_登录与发布流程.md", file=sys.stderr)
        sys.exit(1)
    return token.strip(), open_id.strip()


def upload_video(access_token: str, open_id: str, video_path: str) -> str:
    """上传视频，返回加密 video_id。"""
    path = Path(video_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")
    url = f"{UPLOAD_URL}?open_id={open_id}"
    headers = {"access-token": access_token}
    with open(path, "rb") as f:
        files = {"video": (path.name, f, "video/mp4")}
        r = requests.post(url, headers=headers, files=files, timeout=120)
    r.raise_for_status()
    data = r.json()
    if data.get("extra", {}).get("error_code") != 0:
        raise RuntimeError(data.get("extra", {}).get("description", "上传失败"))
    video_id = data.get("data", {}).get("video", {}).get("video_id")
    if not video_id:
        raise RuntimeError("响应中无 video_id")
    return video_id


def create_video(access_token: str, open_id: str, video_id: str, text: str) -> dict:
    """创建视频（发布）。"""
    url = f"{CREATE_URL}?open_id={open_id}"
    headers = {"access-token": access_token, "Content-Type": "application/json"}
    body = {"video_id": video_id, "text": text[:1000]}
    r = requests.post(url, headers=headers, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    if data.get("extra", {}).get("error_code") != 0:
        raise RuntimeError(data.get("extra", {}).get("description", "发布失败"))
    return data.get("data", {})


def main():
    parser = argparse.ArgumentParser(description="抖音发布：上传视频并发布到抖音（开放平台 API）")
    parser.add_argument("--video", "-v", required=True, help="本地视频路径（竖屏成片）")
    parser.add_argument("--title", "-t", required=True, help="发布标题，可带 #话题")
    parser.add_argument("--token-file", "-f", type=Path, default=Path(__file__).parent / "tokens.json", help="存 access_token、open_id 的 JSON 文件")
    args = parser.parse_args()

    access_token, open_id = load_tokens(args.token_file)
    print("上传视频...")
    video_id = upload_video(access_token, open_id, args.video)
    print("发布中...")
    result = create_video(access_token, open_id, video_id, args.title)
    print("发布成功:", result.get("item_id", "OK"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
