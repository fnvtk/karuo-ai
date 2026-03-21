#!/usr/bin/env python3
"""向抖音协议公示邮箱 feedback@douyin.com 发送账号/视频违规类申诉（SMTP 同卡若 gateway .env）。

用法:
  python3 send_douyin_appeal_mail.py Lkdie001

说明：侵权举报类邮箱（如 qinquan@bytedance.com）不用于此类申诉，见 Douyin账号申诉解封 SKILL。
"""
from __future__ import annotations

import os
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

DEFAULT_ENV = Path(__file__).resolve().parent / "karuo_ai_gateway" / ".env"
# 《抖音用户服务协议》1.5：feedback@douyin.com
TO_LIST = ["feedback@douyin.com"]


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


def build_message(douyin_id: str) -> tuple[str, str]:
    subject = f"【账号申诉】抖音号 {douyin_id} 请求人工复核视频违规/功能限制"
    body = f"""抖音客服您好，

我是抖音创作者，抖音号（ID）：{douyin_id}，昵称与主页展示一致。

【账号情况】
该账号长期发布知识类、创业与私域运营相关口播内容，属正常创作与分享，无恶意营销、色情低俗、造谣传谣等主观故意。目前主页可见作品约百余条，粉丝与互动为长期积累，非短期异常账号。

【遇到的问题】
近期在发布/管理视频时，系统提示涉及「视频违规」或相关处罚，但提示信息较笼统，我未能明确对应到哪一条具体规则或哪一条视频、哪一个画面/话术触线，因此难以精准自查与整改。

【申诉请求】
1. 恳请对抖音号 {douyin_id} 的处罚依据进行人工复核，并告知违规类型、对应规则要点；若涉及具体视频，请尽量给出可定位的信息（例如视频标题、处罚时间），便于我对照整改。
2. 如属于可纠正情形，请视情况恢复相应功能或解除不当处罚；如需我删除/修改指定作品、补充说明或身份核验材料，我将按平台指引配合办理。
3. 后续我将更严格对照《抖音社区自律公约》及平台公示规则进行创作与发布。

【联系方式】
请回复本邮件发件地址。感谢审阅与处理。

账号持有人
"""
    return subject, body


def main() -> int:
    douyin_id = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not douyin_id:
        print("用法: python3 send_douyin_appeal_mail.py <抖音号>", file=sys.stderr)
        print("示例: python3 send_douyin_appeal_mail.py Lkdie001", file=sys.stderr)
        return 1

    env_path = Path(os.environ.get("KARUO_SMTP_ENV", str(DEFAULT_ENV)))
    load_env_file(env_path)

    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    host = os.environ.get("SMTP_HOST", "smtp.qq.com").strip()
    port = int(os.environ.get("SMTP_PORT", "465") or "465")

    if not user or not password:
        print("错误：未读取到 SMTP_USER / SMTP_PASS", env_path, file=sys.stderr)
        return 1

    subject, body = build_message(douyin_id)

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

    print("已发送至", ", ".join(TO_LIST), "发件人", user)
    print("主题:", subject)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
