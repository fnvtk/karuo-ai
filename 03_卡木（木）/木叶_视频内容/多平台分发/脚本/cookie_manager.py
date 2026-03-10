#!/usr/bin/env python3
"""
多平台 Cookie 统一管理器
- 加载 Playwright storage_state.json
- 检查 Cookie 有效期
- 提供 cookie_str / headers
- 防止重复获取 Cookie
"""
import json
import time
from pathlib import Path
from datetime import datetime


class CookieManager:
    """统一管理各平台的 storage_state.json"""

    def __init__(self, state_path: Path, domain_filter: str = ""):
        self.state_path = Path(state_path)
        self.domain_filter = domain_filter
        self._state = {}
        self._cookies = {}
        self._load()

    def _load(self):
        if not self.state_path.exists():
            raise FileNotFoundError(f"Cookie 文件不存在: {self.state_path}")
        with open(self.state_path, "r", encoding="utf-8") as f:
            self._state = json.load(f)
        self._cookies = self._extract_cookies()

    def _extract_cookies(self) -> dict:
        result = {}
        for c in self._state.get("cookies", []):
            domain = c.get("domain", "")
            if self.domain_filter and self.domain_filter not in domain:
                continue
            result[c["name"]] = {
                "value": c["value"],
                "domain": domain,
                "expires": c.get("expires", -1),
                "path": c.get("path", "/"),
            }
        return result

    @property
    def cookie_str(self) -> str:
        return "; ".join(f"{k}={v['value']}" for k, v in self._cookies.items())

    @property
    def cookie_dict(self) -> dict:
        return {k: v["value"] for k, v in self._cookies.items()}

    def get(self, name: str, default: str = "") -> str:
        info = self._cookies.get(name)
        return info["value"] if info else default

    def get_local_storage(self, origin_filter: str, key: str) -> str:
        for origin in self._state.get("origins", []):
            if origin_filter not in origin.get("origin", ""):
                continue
            for item in origin.get("localStorage", []):
                if item["name"] == key:
                    return item["value"]
        return ""

    # 各平台核心 session cookie（只检查这些的有效期，忽略短期追踪 cookie）
    SESSION_COOKIES = {
        "bilibili.com": ["SESSDATA", "bili_jct", "DedeUserID"],
        "douyin.com": ["sessionid", "passport_csrf_token", "sid_guard"],
        "weixin.qq.com": ["wedrive_session_id", "sess_key"],
        "xiaohongshu.com": ["web_session", "a1", "webId"],
        "kuaishou.com": ["kuaishou.server.web_st", "kuaishou.server.web_ph", "userId"],
    }

    def check_expiry(self) -> dict:
        """检查 Cookie 有效期（只看核心 session cookie，忽略短期追踪 cookie）"""
        now = time.time()

        session_names = set()
        for domain_key, names in self.SESSION_COOKIES.items():
            if self.domain_filter and domain_key in self.domain_filter:
                session_names.update(names)
            elif not self.domain_filter:
                session_names.update(names)

        max_session_expires = 0
        has_session_cookie = False
        long_lived_expires = float("inf")

        for name, info in self._cookies.items():
            exp = info.get("expires", -1)
            if name in session_names:
                has_session_cookie = True
                if exp > 0 and exp > max_session_expires:
                    max_session_expires = exp
            elif exp > 0 and (exp - now) > 3600:
                if exp < long_lived_expires:
                    long_lived_expires = exp

        if has_session_cookie and max_session_expires > 0:
            best_exp = max_session_expires
        elif has_session_cookie:
            return {
                "status": "ok",
                "message": "Session cookie 存在（无明确过期时间）",
                "remaining_hours": -1,
            }
        elif long_lived_expires < float("inf"):
            best_exp = long_lived_expires
        else:
            all_expires = [
                info["expires"] for info in self._cookies.values()
                if info.get("expires", -1) > now
            ]
            if all_expires:
                best_exp = max(all_expires)
            elif any(info.get("expires", -1) <= 0 for info in self._cookies.values()):
                return {
                    "status": "ok",
                    "message": "Cookie 存在（session 类型，无明确过期时间）",
                    "remaining_hours": -1,
                }
            else:
                return {
                    "status": "expired",
                    "message": "Cookie 全部已过期",
                }

        remaining = (best_exp - now) / 3600
        expires_at = datetime.fromtimestamp(best_exp).strftime("%Y-%m-%d %H:%M")
        if remaining < 0:
            status = "expired"
        elif remaining < 1:
            status = "expiring_soon"
        elif remaining < 24:
            status = "warning"
        else:
            status = "ok"

        return {
            "status": status,
            "expires_at": expires_at,
            "remaining_hours": round(remaining, 1),
            "message": f"Cookie 有效至 {expires_at}（剩余 {remaining:.1f}h）",
        }

    def is_valid(self) -> bool:
        info = self.check_expiry()
        return info["status"] != "expired"

    @property
    def file_age_hours(self) -> float:
        if not self.state_path.exists():
            return float("inf")
        mtime = self.state_path.stat().st_mtime
        return (time.time() - mtime) / 3600

    def summary(self) -> str:
        expiry = self.check_expiry()
        age = self.file_age_hours
        lines = [
            f"Cookie 文件: {self.state_path.name}",
            f"Cookie 数量: {len(self._cookies)}",
            f"文件年龄: {age:.1f}h",
            f"状态: {expiry['message']}",
        ]
        return "\n".join(lines)


def check_all_cookies(base_dir: Path) -> dict:
    """检查所有平台的 Cookie 状态"""
    platforms = {
        "抖音": ("抖音发布/脚本/douyin_storage_state.json", "douyin.com"),
        "B站": ("B站发布/脚本/bilibili_storage_state.json", "bilibili.com"),
        "视频号": ("视频号发布/脚本/channels_storage_state.json", "weixin.qq.com"),
        "小红书": ("小红书发布/脚本/xiaohongshu_storage_state.json", "xiaohongshu.com"),
        "快手": ("快手发布/脚本/kuaishou_storage_state.json", "kuaishou.com"),
    }
    results = {}
    for name, (rel_path, domain) in platforms.items():
        path = base_dir / rel_path
        if not path.exists():
            results[name] = {"status": "missing", "message": "未登录"}
            continue
        try:
            mgr = CookieManager(path, domain)
            results[name] = mgr.check_expiry()
        except Exception as e:
            results[name] = {"status": "error", "message": str(e)}
    return results


if __name__ == "__main__":
    base = Path(__file__).parent.parent.parent
    print("=" * 50)
    print("  多平台 Cookie 状态检查")
    print("=" * 50)
    results = check_all_cookies(base)
    for platform, info in results.items():
        icon = {"ok": "✓", "warning": "⚠", "expiring_soon": "⚠", "expired": "✗", "missing": "○", "error": "✗"}
        print(f"  [{icon.get(info['status'], '?')}] {platform}: {info['message']}")
