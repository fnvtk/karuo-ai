#!/usr/bin/env python3
"""
视频号开放平台（助手 API）一键拉数：账号信息、直播记录、直播预约、罗盘日 GMV（含短视频成交字段）。
凭证：../credentials/.env.open_platform（勿提交）

说明：官方「视频号助手 API」不提供单条短视频播放量/列表；短视频维度仅有罗盘里的带货成交等经营指标（若有）。
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CRED_PATH = SCRIPT_DIR.parent / "credentials" / ".env.open_platform"
TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token"
API = "https://api.weixin.qq.com"


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        print(f"[!] 缺少 {path}", file=sys.stderr)
        sys.exit(1)
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def http_json(url: str, method: str = "GET", body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode())


def get_access_token(appid: str, secret: str) -> str:
    q = urllib.parse.urlencode(
        {"grant_type": "client_credential", "appid": appid, "secret": secret}
    )
    j = http_json(f"{TOKEN_URL}?{q}")
    if "access_token" not in j:
        raise RuntimeError(json.dumps(j, ensure_ascii=False))
    return j["access_token"]


def post_channels(at: str, path: str, body: dict | None = None) -> dict:
    url = f"{API}{path}?access_token={at}"
    return http_json(url, "POST", body or {})


def main() -> None:
    env = load_env(CRED_PATH)
    appid = env.get("WECHAT_OPEN_APPID")
    secret = env.get("WECHAT_OPEN_APPSECRET")
    if not appid or not secret:
        print("[!] .env.open_platform 需含 WECHAT_OPEN_APPID / WECHAT_OPEN_APPSECRET", file=sys.stderr)
        sys.exit(1)

    at = get_access_token(appid, secret)
    tz8 = timezone(timedelta(hours=8))
    today = datetime.now(tz8).strftime("%Y%m%d")
    yesterday = (datetime.now(tz8) - timedelta(days=1)).strftime("%Y%m%d")

    out: dict = {
        "fetched_at": datetime.now(tz8).isoformat(),
        "finder_attr": post_channels(at, "/channels/finderlive/get_finder_attr_by_appid", {}),
        "live_records": post_channels(at, "/channels/ec/finderlive/getfinderliverecordlist", {}),
        "live_notices": post_channels(at, "/channels/ec/finderlive/getfinderlivenoticerecordlist", {}),
        "compass_overall_yesterday": post_channels(
            at, "/channels/ec/compass/finder/overall/get", {"ds": yesterday}
        ),
        "compass_overall_today": post_channels(
            at, "/channels/ec/compass/finder/overall/get", {"ds": today}
        ),
        "livedashboard_list": post_channels(at, "/channels/livedashboard/getlivelist", {}),
    }

    #  stdout：给管道 / 飞书脚本用
    print(json.dumps(out, ensure_ascii=False, indent=2))

    out_path = os.environ.get("CHANNELS_OPEN_FETCH_OUT")
    if out_path:
        Path(out_path).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n# 已写入 {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
