#!/usr/bin/env python3
"""
手动设置视频号 Cookie — 不开浏览器

用法:
  python3 channels_set_cookie.py <sessionid> <wxuin>

获取方式:
  1. 在任意浏览器打开 https://channels.weixin.qq.com 并登录
  2. F12 → Application → Cookies → channels.weixin.qq.com
  3. 复制 sessionid 和 wxuin 的值
"""
import json
import sys
from pathlib import Path

import httpx

COOKIE_FILE = Path(__file__).parent / "channels_storage_state.json"
BASE = "https://channels.weixin.qq.com"


def main():
    if len(sys.argv) < 3:
        print("用法: python3 channels_set_cookie.py <sessionid> <wxuin>")
        print("\n获取方式:")
        print("  1. 浏览器打开 https://channels.weixin.qq.com 并登录")
        print("  2. F12 → Application → Cookies")
        print("  3. 复制 sessionid 和 wxuin 值")
        return 1

    sessionid = sys.argv[1]
    wxuin = sys.argv[2]

    # 验证
    cookies = {"sessionid": sessionid, "wxuin": wxuin}
    print("验证 Cookie...", flush=True)
    r = httpx.post(
        f"{BASE}/cgi-bin/mmfinderassistant-bin/auth/auth_data",
        cookies=cookies,
        headers={"User-Agent": "Mozilla/5.0"},
        json={},
        timeout=10,
    )
    d = r.json()
    if d.get("errCode") != 0:
        print(f"[✗] Cookie 无效: errCode={d.get('errCode')} msg={d.get('errMsg')}")
        return 1

    user = d.get("data", {}).get("finderUser", {})
    print(f"[✓] 验证通过: {user.get('nickname', '?')} (作品: {user.get('feedsCount', '?')})")

    # 保存
    state = {
        "cookies": [
            {"name": "sessionid", "value": sessionid, "domain": "channels.weixin.qq.com",
             "path": "/", "expires": -1, "httpOnly": False, "secure": True, "sameSite": "None"},
            {"name": "wxuin", "value": wxuin, "domain": "channels.weixin.qq.com",
             "path": "/", "expires": -1, "httpOnly": False, "secure": True, "sameSite": "None"},
        ],
        "origins": [],
    }
    COOKIE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))
    print(f"[✓] Cookie 已保存: {COOKIE_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
