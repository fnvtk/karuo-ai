#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vercel / v0 同账号：mail.tm 多轮注册循环。

策略：本轮在超时内拿不到「注册验证码邮件」→ 放弃该邮箱 → 自动再建一个新 mail.tm → 继续下一轮。
不跟单封死磕；与 config 里 fixed mail.tm 无关（脚本内不读 MAILTM_* 固定账号）。

人工配合：每轮打印注册链接后，在浏览器打开并对该邮箱走「注册页 → Continue with Email」。
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import string
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import httpx

MAILTM_API = "https://api.mail.tm"
RE_OTP = re.compile(r"(?<!\d)(\d{6})(?!\d)")


def _clear_mailtm_env() -> None:
    os.environ.pop("MAILTM_ADDRESS", None)
    os.environ.pop("MAILTM_PASSWORD", None)


def create_fresh_mailtm() -> tuple[str, str, str]:
    """返回 (email, password, bearer_token)。"""
    t = 30
    r = httpx.get(f"{MAILTM_API}/domains", timeout=t)
    r.raise_for_status()
    domains = r.json().get("hydra:member", [])
    if not domains:
        raise RuntimeError("mail.tm 无可用域名")
    domain = domains[0]["domain"]
    prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=14))
    email = f"{prefix}@{domain}"
    password = "".join(random.choices(string.ascii_letters + string.digits, k=18))
    r = httpx.post(
        f"{MAILTM_API}/accounts",
        json={"address": email, "password": password},
        timeout=t,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"mail.tm 创建失败: {r.status_code} {r.text[:120]}")
    tr = httpx.post(
        f"{MAILTM_API}/token",
        json={"address": email, "password": password},
        timeout=t,
    )
    tr.raise_for_status()
    token = tr.json().get("token") or ""
    if not token:
        raise RuntimeError("mail.tm token 为空")
    return email, password, token


def poll_signup_verification_code(
    token: str,
    timeout_sec: int,
    interval_sec: float,
) -> tuple[str | None, str]:
    """
    只认「注册验证」类邮件里的 6 位码。
    返回 (code, reason)；code 为 None 时 reason 为 TIMEOUT / NO_SIGNUP_MAIL。
    """
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + timeout_sec
    seen_subjects: set[str] = set()

    while time.time() < deadline:
        try:
            r = httpx.get(f"{MAILTM_API}/messages", headers=headers, timeout=20)
            r.raise_for_status()
            for msg in r.json().get("hydra:member", []):
                mid = msg.get("id") or ""
                sub = (msg.get("subject") or "").strip()
                if not mid or not sub:
                    continue
                key = f"{mid}:{sub}"
                if key in seen_subjects:
                    continue
                seen_subjects.add(key)

                dr = httpx.get(f"{MAILTM_API}/messages/{mid}", headers=headers, timeout=20)
                dr.raise_for_status()
                data = dr.json()
                text = data.get("text") or ""
                html = data.get("html")
                if isinstance(html, list) and html:
                    text = text + "\n" + str(html[0])
                elif isinstance(html, str):
                    text = text + "\n" + html
                blob = sub + "\n" + text
                sl = sub.lower()

                # 仅注册验证；登录试邮 / 无账号说明 不算成功取码
                if "attempted" in sl and "sign-in" in sl:
                    continue
                if "sign-up verification" in sl or "signup verification" in sl:
                    m = RE_OTP.search(blob)
                    if m and m.group(1) != "666666":
                        return m.group(1), "OK"
                # 主题即「123456 - …」且正文含 sign up / verify your email
                if "vercel" in sl and (
                    "sign up" in blob.lower() or "sign-up" in blob.lower()
                ):
                    m = RE_OTP.search(sub) or RE_OTP.search(blob)
                    if m and m.group(1) != "666666":
                        return m.group(1), "OK"
        except Exception as e:
            print(f"[poll] 异常（将重试）: {e}", file=sys.stderr)
        time.sleep(interval_sec)

    return None, "TIMEOUT"


def main() -> int:
    ap = argparse.ArgumentParser(description="Vercel 注册 mail.tm 多轮循环（取码失败换新邮箱）")
    ap.add_argument("--max-rounds", type=int, default=8, help="最多换几轮邮箱")
    ap.add_argument("--poll-timeout", type=int, default=180, help="每轮等待注册验证码秒数")
    ap.add_argument("--interval", type=float, default=3.0, help="轮询间隔秒")
    ap.add_argument(
        "--pause-enter",
        action="store_true",
        help="打印链接后等待按回车再开始收信（方便你先点 Continue with Email）",
    )
    ap.add_argument(
        "--out-jsonl",
        type=str,
        default="",
        help="每轮结果追加写入 JSONL（路径）",
    )
    ap.add_argument(
        "--ref",
        type=str,
        default="https://v0.app/ref/WQ9P9N",
        help="邀请链接（仅打印参考）",
    )
    args = ap.parse_args()

    out_path = Path(args.out_jsonl).expanduser() if args.out_jsonl else None

    print("=== Vercel / v0 · mail.tm 注册循环 ===", flush=True)
    print("规则：本轮超时无「注册验证码」→ 放弃该邮箱 → 自动下一邮箱。\n", flush=True)

    for rnd in range(1, args.max_rounds + 1):
        _clear_mailtm_env()
        print(f"--- 第 {rnd}/{args.max_rounds} 轮 ---", flush=True)
        try:
            email, password, token = create_fresh_mailtm()
        except Exception as e:
            print(f"[失败] 无法创建 mail.tm: {e}", flush=True)
            rec = {
                "round": rnd,
                "ok": False,
                "reason": "MAILTM_CREATE_FAIL",
                "error": str(e),
                "ts": datetime.now(timezone.utc).isoformat(),
            }
            if out_path:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with open(out_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            continue

        enc = urllib.parse.quote(email, safe="")
        signup = f"https://vercel.com/signup?email={enc}"
        print(f"邮箱: {email}", flush=True)
        print(f"mail.tm 密码（查信用）: {password}", flush=True)
        print(f"注册页: {signup}", flush=True)
        print(f"邀请参考: {args.ref}", flush=True)
        print(
            "请在浏览器打开「注册页」，对该邮箱点 Continue with Email 发码。\n",
            flush=True,
        )

        if args.pause_enter:
            input("准备好后按回车开始轮询收信…")

        code, reason = poll_signup_verification_code(
            token, args.poll_timeout, args.interval
        )
        rec = {
            "round": rnd,
            "email": email,
            "mailtm_password": password,
            "signup_url": signup,
            "code": code,
            "poll_reason": reason,
            "ok": code is not None,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        if out_path:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")

        if code:
            print(f"\n[成功] 注册验证码: {code}", flush=True)
            print(
                "下一步：在 Vercel 注册页逐格输入 OTP，完成团队创建；再打开 v0 邀请链接。\n",
                flush=True,
            )
            return 0

        print(
            f"\n[放弃本轮] 未收到注册验证码（{reason}），已丢弃该邮箱，进入下一轮。\n",
            flush=True,
        )

    print("[结束] 已达最大轮数仍未取到注册验证码。", flush=True)
    return 2


if __name__ == "__main__":
    sys.exit(main())
