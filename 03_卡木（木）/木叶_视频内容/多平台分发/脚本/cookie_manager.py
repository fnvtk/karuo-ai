#!/usr/bin/env python3
"""
多平台 Cookie 统一管理器
- 中央存储：多平台分发/cookies/{platform}_cookies.json
- Playwright storage_state 格式：{"cookies": [...], "origins": [...]}
- 支持视频号 auth API 校验，其它平台预留 stub
- 视频号保存时同步至 channels_storage_state.json 以兼容旧脚本
"""
import json
import time
from pathlib import Path
from datetime import datetime
from typing import Any

import httpx


# 常量
COOKIE_STORE_DIR = Path(__file__).parent.parent / "cookies"
CHANNELS_LEGACY_PATH = Path(__file__).parent.parent.parent / "视频号发布" / "脚本" / "channels_storage_state.json"

_BASE = Path(__file__).parent.parent.parent
PLATFORM_LEGACY_PATHS = {
    "视频号": _BASE / "视频号发布" / "脚本" / "channels_storage_state.json",
    "B站": _BASE / "B站发布" / "脚本" / "bilibili_storage_state.json",
    "快手": _BASE / "快手发布" / "脚本" / "kuaishou_storage_state.json",
    "小红书": _BASE / "小红书发布" / "脚本" / "xiaohongshu_storage_state.json",
    "抖音": _BASE / "抖音发布" / "脚本" / "douyin_storage_state.json",
}

SUPPORTED_PLATFORMS = ["视频号", "抖音", "快手", "B站", "小红书"]

# 各平台默认 cookie 域名
PLATFORM_DOMAINS = {
    "视频号": "channels.weixin.qq.com",
    "抖音": ".douyin.com",
    "快手": ".kuaishou.com",
    "B站": ".bilibili.com",
    "小红书": ".xiaohongshu.com",
}

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


def _ensure_cookie_dir() -> None:
    """确保 cookie 存储目录存在"""
    COOKIE_STORE_DIR.mkdir(parents=True, exist_ok=True)


def get_cookie_path(platform: str) -> Path:
    """返回平台对应的 cookie 文件路径"""
    _ensure_cookie_dir()
    return COOKIE_STORE_DIR / f"{platform}_cookies.json"


def _dict_to_storage_cookies(cookies: dict, domain: str) -> list[dict]:
    """将 {name: value} 转为 storage_state 的 cookies 数组"""
    now = time.time()
    result = []
    for name, value in cookies.items():
        result.append({
            "name": name,
            "value": str(value),
            "domain": domain,
            "path": "/",
            "expires": now + 86400 * 30,  # 默认 30 天
            "httpOnly": False,
            "secure": True,
            "sameSite": "None",
        })
    return result


def load_cookies(platform: str) -> dict[str, str] | None:
    """
    从文件加载 cookies，返回 {name: value}，文件不存在或解析失败返回 None。
    视频号：若中央存储不存在但旧路径 channels_storage_state.json 存在，自动迁移并加载。
    """
    path = get_cookie_path(platform)
    if not path.exists():
        legacy = PLATFORM_LEGACY_PATHS.get(platform)
        if legacy and legacy.exists():
            try:
                with open(legacy, "r", encoding="utf-8") as f:
                    data = json.load(f)
                _ensure_cookie_dir()
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except (json.JSONDecodeError, OSError):
                pass
        if not path.exists():
            return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        cookies = data.get("cookies", [])
        return {c["name"]: c["value"] for c in cookies if isinstance(c.get("name"), str)}
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        # 静默失败，返回 None
        return None


def save_cookies(
    platform: str,
    cookies: dict[str, str],
    extra_data: dict[str, Any] | None = None,
) -> None:
    """
    保存 cookies 为 Playwright storage_state 格式。
    cookies: {name: value}
    extra_data: 可选，如 {"origins": [...]} 以保留 localStorage 等
    """
    _ensure_cookie_dir()
    path = get_cookie_path(platform)
    domain = PLATFORM_DOMAINS.get(platform, ".example.com")
    storage_cookies = _dict_to_storage_cookies(cookies, domain)
    data: dict[str, Any] = {"cookies": storage_cookies, "origins": []}
    if extra_data:
        if "origins" in extra_data:
            data["origins"] = extra_data["origins"]
        if "cookies" in extra_data:
            # 若 extra 中有完整 cookies 对象，可覆盖
            data["cookies"] = extra_data["cookies"]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 视频号：同步到旧路径以兼容 channels_publish 等脚本
    if platform == "视频号":
        try:
            CHANNELS_LEGACY_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(CHANNELS_LEGACY_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except OSError:
            pass


def _check_video_account_valid(cookies: dict[str, str]) -> tuple[bool, str]:
    """视频号：POST auth/auth_data 校验，errCode==0 为有效"""
    url = "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data"
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    headers = {
        "User-Agent": UA,
        "Referer": "https://channels.weixin.qq.com/",
        "Cookie": cookie_str,
        "Content-Type": "application/json",
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(url, headers=headers, json={})
            r.raise_for_status()
            body = r.json()
    except httpx.HTTPError as e:
        return False, f"请求失败: {e}"
    except json.JSONDecodeError as e:
        return False, f"响应解析失败: {e}"

    err = body.get("errCode", -1)
    if err != 0:
        msg = body.get("errMsg", "未知错误")
        return False, f"接口返回 errCode={err}, {msg}"

    # 提取昵称
    data = body.get("data") or body
    nickname = ""
    if isinstance(data, dict):
        nickname = data.get("nickname") or data.get("nickName") or ""
    if nickname:
        return True, f"有效 (昵称: {nickname})"
    return True, "有效"


def _check_bilibili_valid(cookies: dict[str, str]) -> tuple[bool, str]:
    """B站：GET /x/web-interface/nav 校验"""
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get("https://api.bilibili.com/x/web-interface/nav",
                       headers={"Cookie": cookie_str, "User-Agent": UA})
            body = r.json()
        if body.get("code") == 0:
            nick = body.get("data", {}).get("uname", "?")
            return True, f"有效 (昵称: {nick})"
        return False, f"Cookie 过期: {body.get('message', '')}"
    except Exception as e:
        return False, f"预检异常: {e}"


def _check_kuaishou_valid(cookies: dict[str, str]) -> tuple[bool, str]:
    """快手：GET 创作者中心用户信息"""
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get("https://cp.kuaishou.com/rest/pc/user/myInfo",
                       headers={"Cookie": cookie_str, "User-Agent": UA,
                                "Referer": "https://cp.kuaishou.com/"})
            body = r.json()
        if body.get("result") == 1:
            nick = body.get("data", {}).get("userName", "?")
            return True, f"有效 (昵称: {nick})"
        return False, f"Cookie 过期: {body.get('error_msg', '')}"
    except Exception as e:
        return False, f"预检异常: {e}"


def _check_xiaohongshu_valid(cookies: dict[str, str]) -> tuple[bool, str]:
    """小红书：GET 创作者中心用户信息"""
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    try:
        with httpx.Client(timeout=10) as c:
            r = c.get("https://creator.xiaohongshu.com/api/galaxy/user/info",
                       headers={"Cookie": cookie_str, "User-Agent": UA,
                                "Referer": "https://creator.xiaohongshu.com/"})
            body = r.json()
        if body.get("code") == 0:
            nick = body.get("data", {}).get("nick_name", "?")
            return True, f"有效 (昵称: {nick})"
        return False, f"Cookie 过期: {body.get('msg', '')}"
    except Exception as e:
        return False, f"预检异常: {e}"


def _check_platform_stub(platform: str, cookies: dict[str, str]) -> tuple[bool, str]:
    """通用 stub：仅检查 cookie 存在"""
    if not cookies:
        return False, "无 cookie 数据"
    session_keys = {
        "抖音": ["sessionid"],
    }
    keys = session_keys.get(platform, [])
    found = any(k in cookies for k in keys)
    if found:
        return True, "存在（未做接口校验，仅供参考）"
    return True, "存在（未做接口校验）"


def check_cookie_valid(platform: str) -> tuple[bool, str]:
    """
    校验平台 cookie 是否有效，调用平台特定 auth API。
    返回 (is_valid, message)。
    """
    cookies = load_cookies(platform)
    if not cookies:
        return False, "文件不存在或为空"

    if platform == "视频号":
        return _check_video_account_valid(cookies)

    if platform == "B站":
        return _check_bilibili_valid(cookies)
    if platform == "快手":
        return _check_kuaishou_valid(cookies)
    if platform == "小红书":
        return _check_xiaohongshu_valid(cookies)
    if platform == "抖音":
        return _check_platform_stub(platform, cookies)

    return False, f"不支持的平台: {platform}"


def get_valid_cookies(platform: str) -> dict[str, str] | None:
    """加载并校验 cookies，若过期或无效返回 None"""
    is_valid, _ = check_cookie_valid(platform)
    if not is_valid:
        return None
    return load_cookies(platform)


def _format_expiry(cookies_raw: list[dict]) -> str:
    """从 storage_state 的 cookies 中提取最近过期时间"""
    now = time.time()
    expiries = [c.get("expires", 0) for c in cookies_raw if isinstance(c.get("expires"), (int, float))]
    if not expiries:
        return "未知"
    max_exp = max(e for e in expiries if e > 0) if any(e > 0 for e in expiries) else 0
    if max_exp <= 0:
        return "Session"
    remaining = (max_exp - now) / 3600
    if remaining < 0:
        return "已过期"
    if remaining < 24:
        return f"{remaining:.1f}h"
    return f"{remaining / 24:.1f}天"


def cookie_summary() -> str:
    """返回各平台 cookie 状态摘要（存在/有效/过期）"""
    lines = ["=" * 50, "  多平台 Cookie 状态", "=" * 50, f"存储目录: {COOKIE_STORE_DIR}", ""]
    for platform in SUPPORTED_PLATFORMS:
        # 用 load_cookies 触发迁移（视频号从旧路径）
        cookies_dict = load_cookies(platform)
        if not cookies_dict:
            lines.append(f"  [○] {platform}: 未登录")
            continue
        try:
            path = get_cookie_path(platform)
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            cookies_arr = data.get("cookies", [])
            expiry = _format_expiry(cookies_arr)
            is_valid, msg = check_cookie_valid(platform)
            icon = "✓" if is_valid else "✗"
            lines.append(f"  [{icon}] {platform}: {msg} | 过期: {expiry}")
        except Exception as e:
            lines.append(f"  [✗] {platform}: 解析失败 - {e}")
    return "\n".join(lines)


if __name__ == "__main__":
    _ensure_cookie_dir()
    print(cookie_summary())
