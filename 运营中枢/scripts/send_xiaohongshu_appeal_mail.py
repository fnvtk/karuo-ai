#!/usr/bin/env python3
"""向小红书官网公示的多邮箱发送账号申诉（SMTP 同卡若 gateway .env）。

默认收件人（合作邮箱页）：service / community / app_feedback / shuduizhang
用法:
  python3 send_xiaohongshu_appeal_mail.py 15880802661
  python3 send_xiaohongshu_appeal_mail.py 15880802661 --ceo   # 额外抄送 ceo@（勿滥用）

详见：02_卡人（水）/水桥_平台对接/平台账号申诉解封/SKILL.md
"""
from __future__ import annotations

import os
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

DEFAULT_ENV = Path(__file__).resolve().parent / "karuo_ai_gateway" / ".env"
# 来源：https://www.xiaohongshu.com/contact （以官网更新为准）
TO_BASE = [
    "service@xiaohongshu.com",
    "community@xiaohongshu.com",
    "app_feedback@xiaohongshu.com",
    "shuduizhang@xiaohongshu.com",
]
CEO = "ceo@xiaohongshu.com"


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


def build_message(phone: str) -> tuple[str, str]:
    subject = f"【账号申诉】小红书绑定手机{phone} 请求人工复核账号限制/封禁"
    body = f"""小红书客服与社区团队您好，

我是平台用户，账号绑定的手机号码为：{phone}（可与站内注册信息核对）。

【情况说明】
近期账号出现无法正常使用、限制或封禁等情况；站内提示有时比较笼统，我难以判断具体触犯了哪一条社区规范，也不便于针对性整改。本人使用小红书以正常浏览、发布生活与兴趣内容为主，无恶意营销、色情低俗、造谣传谣等主观故意。

【请求】
1. 请对该账号（绑定手机 {phone}）的处罚安排人工复核，并告知违规类型或对应规则要点；若涉及具体笔记，请尽量给出可定位的信息，便于我自查与修改。  
2. 如属可纠正情形，恳请解除限制或恢复账号；如需补充身份核验或其他材料，我将按指引配合。  
3. 后续我会更认真地遵守《小红书社区规范》及平台公示规则。

【联系方式】
请回复本邮件发件地址；如需电话沟通可使用上述绑定号码（如能外呼）。

感谢处理。

用户敬上
"""
    return subject, body


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--ceo"]
    with_ceo = "--ceo" in sys.argv[1:]
    phone = (args[0] if args else "").strip()
    if not phone:
        print("用法: python3 send_xiaohongshu_appeal_mail.py <11位手机> [--ceo]", file=sys.stderr)
        return 1
    if not phone.isdigit() or len(phone) != 11:
        print("手机号须为 11 位数字", file=sys.stderr)
        return 1

    to_list = list(TO_BASE)
    if with_ceo and CEO not in to_list:
        to_list.append(CEO)

    env_path = Path(os.environ.get("KARUO_SMTP_ENV", str(DEFAULT_ENV)))
    load_env_file(env_path)

    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    host = os.environ.get("SMTP_HOST", "smtp.qq.com").strip()
    port = int(os.environ.get("SMTP_PORT", "465") or "465")

    if not user or not password:
        print("错误：未读取到 SMTP_USER / SMTP_PASS", env_path, file=sys.stderr)
        return 1

    subject, body = build_message(phone)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = ", ".join(to_list)
    msg.set_content(body)

    try:
        with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
    except Exception as e:
        print("发送失败:", type(e).__name__, str(e), file=sys.stderr)
        return 2

    print("已发送至", len(to_list), "个邮箱:", ", ".join(to_list))
    print("主题:", subject)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
