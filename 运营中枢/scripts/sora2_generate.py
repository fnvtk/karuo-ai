#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sora 2 视频生成 API 脚本
- 创建任务、轮询状态、下载 MP4，一键生成
- 需环境变量 OPENAI_API_KEY；输出目录：卡若Ai的文件夹/导出/
"""
from __future__ import annotations

import os
import sys
import time
import argparse
from pathlib import Path

try:
    import requests
except ImportError:
    print("请先安装: pip install requests")
    sys.exit(1)

# 默认输出目录（卡若AI 输出规范）
OUTPUT_BASE = Path("/Users/karuo/Documents/卡若Ai的文件夹/导出")
BASE_URL = "https://api.openai.com/v1/videos"
POLL_INTERVAL = 15
MAX_POLL_MINUTES = 20


def get_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise SystemExit("请设置环境变量 OPENAI_API_KEY")
    return key


def create_video(
    api_key: str,
    prompt: str,
    model: str = "sora-2",
    size: str = "1280x720",
    seconds: str = "8",
    input_reference_path: str | None = None,
) -> dict:
    """创建视频生成任务，返回 job 对象（含 id、status）。"""
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {
        "prompt": prompt,
        "model": model,
        "size": size,
        "seconds": seconds,
    }
    files = None
    if input_reference_path and os.path.isfile(input_reference_path):
        mime = "image/jpeg"
        if input_reference_path.lower().endswith(".png"):
            mime = "image/png"
        elif input_reference_path.lower().endswith(".webp"):
            mime = "image/webp"
        files = {"input_reference": (os.path.basename(input_reference_path), open(input_reference_path, "rb"), mime)}

    if files:
        resp = requests.post(BASE_URL, headers=headers, data=data, files=files, timeout=60)
        for f in files.values():
            f[1].close()
    else:
        resp = requests.post(BASE_URL, headers=headers, data=data, timeout=60)

    resp.raise_for_status()
    return resp.json()


def get_video_status(api_key: str, video_id: str) -> dict:
    """查询视频任务状态。"""
    url = f"{BASE_URL}/{video_id}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def download_video(api_key: str, video_id: str, save_path: Path, variant: str = "video") -> Path:
    """下载视频/缩略图/雪碧图到 save_path。variant: video | thumbnail | spritesheet"""
    url = f"{BASE_URL}/{video_id}/content"
    if variant != "video":
        url += f"?variant={variant}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, stream=True, timeout=120)
    resp.raise_for_status()
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path


def create_and_download(
    prompt: str,
    model: str = "sora-2",
    size: str = "1280x720",
    seconds: str = "8",
    input_reference: str | None = None,
    output_dir: Path | None = None,
    poll_interval: int = POLL_INTERVAL,
    max_wait_minutes: int = MAX_POLL_MINUTES,
) -> Path:
    """
    创建 Sora 2 视频任务，轮询直到完成，下载 MP4 到 output_dir。
    返回最终 MP4 的 Path。
    """
    api_key = get_api_key()
    out = output_dir or OUTPUT_BASE
    out.mkdir(parents=True, exist_ok=True)

    job = create_video(api_key, prompt, model=model, size=size, seconds=seconds, input_reference_path=input_reference)
    video_id = job.get("id")
    if not video_id:
        raise RuntimeError(f"创建任务失败，无 id: {job}")

    print(f"任务已创建: {video_id}，轮询中...")
    deadline = time.time() + max_wait_minutes * 60
    while time.time() < deadline:
        status_obj = get_video_status(api_key, video_id)
        status = status_obj.get("status", "")
        progress = status_obj.get("progress", 0)
        if status == "completed":
            break
        if status == "failed":
            err = status_obj.get("error", {}) or {}
            raise RuntimeError(f"生成失败: {err.get('message', status_obj)}")
        print(f"  状态: {status}, 进度: {progress}%")
        time.sleep(poll_interval)

    if status != "completed":
        raise RuntimeError("超时未完成，请稍后用 video_id 自行下载")

    # 下载 MP4，文件名含 video_id 前 12 位避免重复
    short_id = video_id.replace("video_", "")[:12]
    save_path = out / f"sora2_{short_id}.mp4"
    download_video(api_key, video_id, save_path, variant="video")
    print(f"已保存: {save_path}")
    return save_path


def main():
    parser = argparse.ArgumentParser(description="Sora 2 视频生成：创建任务并下载 MP4")
    parser.add_argument("prompt", nargs="?", help="视频描述文案（也可用 -p）")
    parser.add_argument("-p", "--prompt", dest="prompt_opt", help="视频描述文案")
    parser.add_argument("-m", "--model", default="sora-2", choices=["sora-2", "sora-2-pro"], help="模型")
    parser.add_argument("-s", "--size", default="1280x720",
                        choices=["720x1280", "1280x720", "1024x1792", "1792x1024"], help="分辨率")
    parser.add_argument("--seconds", default="8", choices=["4", "8", "12"], help="时长(秒)")
    parser.add_argument("-i", "--input-reference", help="首帧参考图路径（可选）")
    parser.add_argument("-o", "--output-dir", type=Path, default=OUTPUT_BASE, help="MP4 输出目录")
    parser.add_argument("--poll-interval", type=int, default=POLL_INTERVAL, help="轮询间隔(秒)")
    parser.add_argument("--max-wait", type=int, default=MAX_POLL_MINUTES, help="最长等待(分钟)")
    args = parser.parse_args()

    prompt = args.prompt_opt or args.prompt
    if not prompt:
        parser.error("请提供 prompt（位置参数或 -p/--prompt）")

    create_and_download(
        prompt=prompt,
        model=args.model,
        size=args.size,
        seconds=args.seconds,
        input_reference=args.input_reference,
        output_dir=args.output_dir,
        poll_interval=args.poll_interval,
        max_wait_minutes=args.max_wait,
    )


if __name__ == "__main__":
    main()
