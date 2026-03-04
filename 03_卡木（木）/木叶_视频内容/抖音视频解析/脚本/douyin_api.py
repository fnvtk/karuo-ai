#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音解析 HTTP API：供 n8n 等调用，一键解析抖音链接并返回文案（可选下载视频）。
POST /parse  Body: {"url": "https://v.douyin.com/xxx", "download": true|false}
"""
from pathlib import Path

from flask import Flask, request, jsonify

# 同目录下的 douyin_parse
from douyin_parse import fetch_and_parse, download_video, DEFAULT_OUTPUT

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False

# 输出目录：容器内用 /data/douyin_output（需挂载），本机用 DEFAULT_OUTPUT
import os as _os
OUTPUT = Path(_os.environ.get("DOUYIN_OUTPUT_DIR", str(DEFAULT_OUTPUT)))
OUTPUT.mkdir(parents=True, exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/parse", methods=["POST", "GET"])
def parse():
    """
    POST: JSON body {"url": "https://v.douyin.com/xxx", "download": false}
    GET:  ?url=https://v.douyin.com/xxx&download=false
    """
    if request.method == "GET":
        url = request.args.get("url", "").strip()
        download = request.args.get("download", "false").lower() in ("1", "true", "yes")
    else:
        data = request.get_json(silent=True) or {}
        url = (data.get("url") or "").strip()
        download = data.get("download", False) in (True, "true", "1", "yes")

    if not url:
        return jsonify({"error": "缺少 url 参数", "usage": "POST /parse  body: {\"url\": \"抖音链接\", \"download\": false}"}), 400

    info, video_url = fetch_and_parse(url)
    aweme_id = info.get("aweme_id")

    if info.get("error"):
        return jsonify({"error": info["error"], "info": info}), 500
    if not aweme_id or aweme_id == "unknown":
        return jsonify({"error": "无法解析视频，请检查链接", "info": info}), 400

    # 保存文案 JSON 与 TXT
    OUTPUT.mkdir(parents=True, exist_ok=True)
    import json as _json
    import re as _re
    caption_json = OUTPUT / f"{aweme_id}_文案.json"
    caption_txt = OUTPUT / f"{aweme_id}_文案.txt"
    with open(caption_json, "w", encoding="utf-8") as f:
        _json.dump(info, f, ensure_ascii=False, indent=2)
    txt_lines = [
        (info.get("title") or "").strip(),
        "",
        (info.get("desc") or "").strip(),
        "",
        "话题: " + " ".join(f"#{t}" for t in (info.get("hashtags") or [])),
        "",
        f"aweme_id: {aweme_id}",
        f"链接: https://www.douyin.com/video/{aweme_id}",
    ]
    with open(caption_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_lines))

    result = {
        "aweme_id": aweme_id,
        "title": info.get("title") or "",
        "desc": info.get("desc") or "",
        "hashtags": info.get("hashtags") or [],
        "author": info.get("author") or "",
        "caption_txt_path": str(caption_txt),
        "caption_json_path": str(caption_json),
        "video_url": video_url,
        "video_downloaded": False,
        "video_path": None,
    }

    if download and video_url:
        safe_title = _re.sub(r"[^\w\s\u4e00-\u9fff]+", "_", (info.get("title") or aweme_id))[:50].strip("_")
        out_file = OUTPUT / f"{aweme_id}_{safe_title or 'video'}.mp4"
        ok, err = download_video(video_url, out_file)
        result["video_downloaded"] = ok
        result["video_path"] = str(out_file) if ok else None
        if not ok:
            result["video_error"] = err

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3099, debug=False)
