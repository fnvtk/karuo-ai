#!/usr/bin/env python3
"""
纯飞书 API + token 收集妙记链接（全命令行，不打开浏览器）。

使用方式：
  1) 仅 tenant token（APP_ID/APP_SECRET）：
     可拉取「已知 minute_token 列表」对应的 TXT；无法从开放平台拿到妙记列表。
  2) 若提供 user_access_token（FEISHU_USER_ACCESS_TOKEN）：
     尝试从日历日程中拉取带视频会议的日程，并请求会议录制接口拿妙记链接。

环境变量：
  FEISHU_APP_ID / FEISHU_APP_SECRET  — 应用凭证（必选，用于 tenant_access_token）
  FEISHU_USER_ACCESS_TOKEN           — 用户访问令牌（可选，用于日历等需用户身份的接口）
  FEISHU_MINUTES_URLS_FILE           — 输出链接文件路径，默认 urls_soul_party.txt
"""
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
URLS_FILE = Path(os.environ.get("FEISHU_MINUTES_URLS_FILE", str(SCRIPT_DIR / "urls_soul_party.txt")))
KEYWORDS = ("派对", "受", "soul")
BASE = "https://open.feishu.cn/open-apis"

# 默认应用凭证（可被环境变量覆盖）
FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "cli_a48818290ef8100d")
FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4")


def get_tenant_access_token():
    url = f"{BASE}/auth/v3/tenant_access_token/internal"
    r = requests.post(url, json={"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET}, timeout=10)
    data = r.json()
    if data.get("code") == 0:
        return data.get("tenant_access_token")
    return None


def get_calendar_list(user_token: str):
    """获取当前用户的日历列表（需 user_access_token）"""
    url = f"{BASE}/calendar/v4/calendars"
    r = requests.get(url, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    data = r.json()
    if data.get("code") != 0:
        return []
    return data.get("data", {}).get("calendars", [])


def get_calendar_events(user_token: str, calendar_id: str, start_ts: int, end_ts: int):
    """获取日历下的日程列表"""
    url = f"{BASE}/calendar/v4/calendars/{calendar_id}/events"
    params = {"start_time": str(start_ts), "end_time": str(end_ts), "page_size": "500"}
    r = requests.get(url, params=params, headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
    data = r.json()
    if data.get("code") != 0:
        return []
    return data.get("data", {}).get("items", [])


def get_meeting_recording(tenant_token: str, meeting_id: str):
    """获取会议录制信息（若含妙记链接则返回）"""
    url = f"{BASE}/vc/v1/meetings/{meeting_id}/recording"
    r = requests.get(url, headers={"Authorization": f"Bearer {tenant_token}"}, timeout=10)
    data = r.json()
    if data.get("code") != 0:
        return None
    d = data.get("data", {})
    # 可能字段：recording_url, meeting_minutes_url, minute_token 等
    for key in ("meeting_minutes_url", "minute_url", "recording_url", "url"):
        if d.get(key) and "minutes" in str(d.get(key, "")):
            return d.get(key)
    return d.get("recording_url") or d.get("meeting_minutes_url")


def extract_minute_url_from_event(event: dict) -> str | None:
    """从日程中解析出妙记/会议链接"""
    vchat = event.get("vchat") or {}
    mt = (vchat.get("meeting_url") or "").strip()
    if mt and "minutes" in mt:
        return mt
    if mt and "meeting" in mt:
        # 可能是会议链接，可后续用 meeting_id 调录制接口
        return None
    # 部分日程可能有 schemas 里的 app_link 含 minutes
    for s in event.get("schemas") or []:
        link = (s.get("app_link") or "")
        if "minutes" in link:
            return link
    return None


def main():
    if not requests:
        print("需要安装 requests: pip install requests")
        return 1

    tenant_token = get_tenant_access_token()
    if not tenant_token:
        print("❌ 获取 tenant_access_token 失败，请检查 FEISHU_APP_ID / FEISHU_APP_SECRET")
        return 1
    print("✅ tenant_access_token 已获取")

    collected = []
    user_token = os.environ.get("FEISHU_USER_ACCESS_TOKEN", "").strip()
    if user_token:
        print("使用 FEISHU_USER_ACCESS_TOKEN 拉取日历日程…")
        try:
            calendars = get_calendar_list(user_token)
            if not calendars:
                print("  未获取到日历列表（可能 token 无权限或已过期）")
            else:
                # 取 primary 或第一个
                cal = next((c for c in calendars if c.get("type") == "primary"), calendars[0])
                cal_id = cal.get("calendar_id")
                if cal_id:
                    end_ts = int(time.time())
                    start_ts = end_ts - 365 * 24 * 3600  # 近一年
                    events = get_calendar_events(user_token, cal_id, start_ts, end_ts)
                    for ev in events:
                        summary = (ev.get("summary") or "")
                        if not any(k in summary for k in KEYWORDS):
                            continue
                        url = extract_minute_url_from_event(ev)
                        if url:
                            collected.append(url)
                        # 尝试从 event 取 meeting_id 调录制接口
                        eid = ev.get("event_id") or ""
                        if eid and "meeting" in eid.lower():
                            rec = get_meeting_recording(tenant_token, eid)
                            if rec and "minutes" in str(rec):
                                collected.append(rec)
                    print(f"  从日历匹配到 {len(collected)} 条含「派对/受/soul」且带妙记的日程")
        except Exception as e:
            print("  日历拉取异常:", e)
    else:
        print("未设置 FEISHU_USER_ACCESS_TOKEN，跳过日历拉取（开放平台无妙记列表接口）")

    # 去重并写入
    seen = set()
    unique = []
    for u in collected:
        u = (u or "").strip()
        if u and u not in seen and "/minutes/" in u:
            seen.add(u)
            unique.append(u)

    if unique:
        URLS_FILE.write_text("\n".join(unique), encoding="utf-8")
        print(f"✅ 已写入 {len(unique)} 条妙记链接到 {URLS_FILE}")
    else:
        print("未通过 API 收集到妙记链接。请将妙记 URL 每行一个写入", URLS_FILE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
