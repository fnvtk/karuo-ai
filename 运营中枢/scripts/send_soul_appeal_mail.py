#!/usr/bin/env python3
"""从卡若 gateway .env 读 SMTP，向 Soul 官方各邮箱发申诉邮件。

收件人：soul@、hr@、ad@、commercial-b@、pc@（官网公示的 5 个邮箱）。
用法:
  python3 send_soul_appeal_mail.py 15210897710   # 大白话 A 版
  python3 send_soul_appeal_mail.py 13779954946   # 大白话 B 版

不在终端打印密码。
"""
from __future__ import annotations

import os
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

DEFAULT_ENV = Path(__file__).resolve().parent / "karuo_ai_gateway" / ".env"
# Soul 官网公示的官方邮箱，用户要求账号申诉一并抄送
TO_LIST = [
    "soul@soulapp.cn",
    "hr@soulapp.cn",
    "ad@soulapp.cn",
    "commercial-b@soulapp.cn",
    "pc@soulapp.cn",
]


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            os.environ[key] = val


def appeal_variant_a(phone: str) -> tuple[str, str]:
    """152 绑定号：分条 + 大白话。"""
    subject = f"求助｜Soul账号被限制，求人工复核（手机{phone}）"
    body = f"""Soul 客服您好，

我是咱们平台的用户，注册绑定的手机号是 {phone}，这个号我一直自己在用。账号也做过实名认证，身份证信息是我本人，能对上。

现在我的号登录不了 / 被限制了，客户端也没跟我说明白到底是哪一条原因，我这边有点搞不清楚状况。我自己回想了一下，就是正常聊天、看广场，没有故意发乱七八糟的东西，也没有用外挂、脚本刷量那种操作。

所以想麻烦你们帮我做个人工复核：
• 如果是误判或者可以解的那种，希望能恢复我正常使用；
• 如果确实有问题，也请告诉我具体是啥、对应哪条规则，我以后好注意；需要我补材料（比如身份核验）也可以说，我按你们流程配合。

回信请发到我这封信的发件邮箱。需要电话联系的话，可以用 {phone}。

谢谢，辛苦了。

账号本人
"""
    return subject, body


def appeal_variant_b(phone: str) -> tuple[str, str]:
    """137 绑定号：另一套大白话（叙述流，同目的）。"""
    subject = f"想申请恢复账号｜绑定手机{phone}"
    body = f"""您好，

写邮件是想说说我的 Soul 账号。我绑定的手机号是 {phone}，实名认证也是我自己，这个没问题。

最近这个号突然用不了了（提示限制或者封禁之类），但具体因为什么，App 里没写清楚，我没办法对症下药自查。我平时就是普通玩一玩、跟人正常聊天，不搞广告骚扰，也不搞作弊刷数据。

所以想请你们帮忙看看这个号还能不能恢复。需要我补充什么材料，你们回信说一声，我尽量配合。回复发到发件邮箱就行；电话也可以打 {phone}。

麻烦了，感谢。

用户敬上
"""
    return subject, body


def pick_variant(phone: str) -> tuple[str, str]:
    if phone == "15210897710":
        return appeal_variant_a(phone)
    if phone == "13779954946":
        return appeal_variant_b(phone)
    return appeal_variant_b(phone)


def main() -> int:
    phone = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not phone:
        print("用法: python3 send_soul_appeal_mail.py <11位手机号>", file=sys.stderr)
        print("示例: … 15210897710  或  … 13779954946", file=sys.stderr)
        return 1
    if not phone.isdigit() or len(phone) != 11:
        print("手机号须为 11 位数字", file=sys.stderr)
        return 1

    env_path = Path(os.environ.get("KARUO_SMTP_ENV", str(DEFAULT_ENV)))
    load_env_file(env_path)

    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    host = os.environ.get("SMTP_HOST", "smtp.qq.com").strip()
    port = int(os.environ.get("SMTP_PORT", "465") or "465")

    if not user or not password:
        print("错误：未从环境或", env_path, "读取到 SMTP_USER / SMTP_PASS", file=sys.stderr)
        return 1

    subject, body = pick_variant(phone)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = ", ".join(TO_LIST)
    msg.set_content(body)

    try:
        with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
    except Exception as e:
        print("发送失败:", type(e).__name__, str(e), file=sys.stderr)
        return 2

    print("已发送至", len(TO_LIST), "个邮箱:", ", ".join(TO_LIST))
    print("主题:", subject)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
