#!/usr/bin/env python3
"""
视频处理工具（封面提取、元数据读取）
依赖: ffmpeg、ffprobe（系统已安装）
"""
import json
import subprocess
import tempfile
from pathlib import Path


def get_video_info(video_path: str) -> dict:
    """获取视频元数据（时长、分辨率、编码）"""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        data = json.loads(result.stdout)
        vs = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), {})
        fmt = data.get("format", {})
        return {
            "duration": float(fmt.get("duration", 0)),
            "width": int(vs.get("width", 0)),
            "height": int(vs.get("height", 0)),
            "codec": vs.get("codec_name", "unknown"),
            "size": int(fmt.get("size", 0)),
            "bitrate": int(fmt.get("bit_rate", 0)),
        }
    except Exception as e:
        return {"error": str(e)}


def extract_cover(video_path: str, output_path: str = "", timestamp: str = "00:00:00.500") -> str:
    """提取视频第一帧作为封面（JPEG），默认存 /tmp"""
    if not output_path:
        stem = Path(video_path).stem[:40]
        output_path = f"/tmp/{stem}_cover.jpg"

    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-ss", timestamp, "-frames:v", "1",
        "-q:v", "2", output_path,
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=30, check=True)
        if Path(output_path).exists():
            return output_path
    except Exception as e:
        print(f"  封面提取失败: {e}")
    return ""


def extract_cover_bytes(video_path: str, timestamp: str = "00:00:00.500") -> bytes:
    """提取第一帧并返回 JPEG 字节（不写磁盘）"""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-ss", timestamp, "-frames:v", "1",
        "-f", "image2", "-c:v", "mjpeg", "-q:v", "2", "pipe:1",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=30, check=True)
        return result.stdout
    except Exception:
        return b""


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python video_utils.py <video_path>")
        sys.exit(1)
    vp = sys.argv[1]
    info = get_video_info(vp)
    print(f"视频信息: {json.dumps(info, ensure_ascii=False, indent=2)}")
    cover = extract_cover(vp)
    if cover:
        print(f"封面已保存: {cover}")
