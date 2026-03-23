#!/usr/bin/env python3
"""从卡若 gateway .env 读 SMTP，向 Soul 官方各邮箱发申诉邮件。

收件人：soul@、hr@、ad@、commercial-b@、pc@（官网公示的 5 个邮箱）。

用法:
  python3 send_soul_appeal_mail.py 15210897710              # 单封（大白话 A/B）
  python3 send_soul_appeal_mail.py 13779954946 --suite      # 针对「条款引用」连发 4 封不同主题
  python3 send_soul_appeal_mail.py --all-phones --suite     # 152+137 各发 4 封（共 8 封）

不在终端打印密码。
"""
from __future__ import annotations

import os
import smtplib
import sys
import time
from email.message import EmailMessage
from pathlib import Path

DEFAULT_ENV = Path(__file__).resolve().parent / "karuo_ai_gateway" / ".env"
TO_LIST = [
    "soul@soulapp.cn",
    "hr@soulapp.cn",
    "ad@soulapp.cn",
    "commercial-b@soulapp.cn",
    "pc@soulapp.cn",
]
DEFAULT_PHONES = ("15210897710", "13779954946")


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


def suite_appeals(phone: str) -> list[tuple[str, str]]:
    """针对平台短信引用 2.2.3、2.2.4、2.2.5、3.2.11(1-8)、3.2.12 的补充申诉（分封主题，避免一封过长）。"""
    cite = "2.2.3、2.2.4、2.2.5、3.2.11（1）-（8）、3.2.12"
    return [
        (
            f"【二次申诉】绑定手机{phone}｜已收贵司条款引用，恳请书面告知具体违规事实",
            f"""Soul 客服团队您好，

我的绑定手机号为 {phone}。此前收到贵司通知，称申诉未通过，并引用《用户协议》{cite} 等条款。

本人已重新阅读 App 内《用户协议》相关章节，愿意遵守平台规则。但目前仍不清楚：**具体是哪一类行为、哪一条动态/私信/场景**触发了上述条款的适用，导致封号。没有可操作的违规事实说明，我无法完成针对性整改，也难以判断是否存在误判。

故恳请贵司在合规前提下，通过邮件或站内途径告知：**违规内容类型、大致时间、对应功能场景**（无需泄露他人隐私即可）。本人承诺在知悉后立刻整改，并申请**二次人工复核**。

回复请发至本邮件发件邮箱，亦可致电我登记号码 {phone}（如可外呼）。

感谢。

账号持有人（{phone}）
""",
        ),
        (
            f"【分项说明】绑定手机{phone}｜关于第2.2.3、2.2.4、2.2.5条之理解与承诺",
            f"""Soul 客服您好，

绑定手机 {phone}。现就贵司援引的协议第 2.2.3、2.2.4、2.2.5 条说明如下：

据公开渠道中用户对 2.2.5 条的转述，该款大意包含：**不得利用账号从事违法活动、捣乱、骚扰、欺骗其他用户及违反协议的行为**。2.2.3、2.2.4 与同节条款通常指向**守法使用账号、维护平台秩序**等义务（**具体以本人 App 内当前版本《用户协议》原文为准**）。

本人确认：**无故意从事违法、欺诈、恶意骚扰或破坏社区秩序的主观意图**；若曾有言行被系统判定越界，愿在贵司指出具体事实后**立即纠正**，并加强自我约束。

恳请结合上述说明，对账号是否具备**从轻、整改后恢复**的空间予以复核。

账号持有人 {phone}
""",
        ),
        (
            f"【分项说明】绑定手机{phone}｜关于第3.2.11条第（1）-（8）项之合规承诺",
            f"""Soul 客服您好，

绑定手机 {phone}。贵司通知中援引 3.2.11 条第（1）至（8）项。该类条款在实务中一般对应**禁止发布的多类违规信息**（如违法有害、低俗、人身攻击、虚假误导、侵权、违规营销导流等，**具体子项以 App 内协议原文为准**）。

本人承诺：
• 不在平台发布违反法律法规及《Soul 用户行为规范》的信息；
• 不从事恶意营销、刷屏骚扰、诱导站外交易或欺诈等行为；
• 对他人与平台保持尊重，不故意散布不实信息。

若贵司认定本人曾违反上述任一项，请**指明对应项号与事实概要**，本人愿删除相关内容、书面说明情况并申请复核。

账号持有人 {phone}
""",
        ),
        (
            f"【分项说明】绑定手机{phone}｜关于第3.2.12条及持续合规使用承诺",
            f"""Soul 客服您好，

绑定手机 {phone}。就贵司一并援引的第 3.2.12 条，本人理解其通常与 3.2.11 等条款共同构成**内容与安全规范**体系（**以 App 内最新协议为准**）。

本人承诺后续将：
• 发帖、聊天、匹配互动前对照《用户行为规范》自查；
• 不参与灰产引流、不当交友诱导、违规广告等行为；
• 配合贵司合理的内容管理与身份核验要求。

鉴于此前申诉未通过，本人仍恳请贵司在本人**已表态整改、愿配合说明**的前提下，考虑是否给予**观察期、限制解除或账号恢复**的机会。

联系：本邮件发件地址；手机 {phone}。

账号持有人
""",
        ),
    ]


def send_one(
    host: str,
    port: int,
    user: str,
    password: str,
    subject: str,
    body: str,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = ", ".join(TO_LIST)
    msg.set_content(body)
    with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
        smtp.login(user, password)
        smtp.send_message(msg)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    suite = "--suite" in flags
    all_phones = "--all-phones" in flags

    if all_phones:
        phones = list(DEFAULT_PHONES)
    else:
        phone = (args[0] if args else "").strip()
        if not phone:
            print(
                "用法:\n"
                "  python3 send_soul_appeal_mail.py <11位手机号>\n"
                "  python3 send_soul_appeal_mail.py <手机号> --suite\n"
                "  python3 send_soul_appeal_mail.py --all-phones --suite",
                file=sys.stderr,
            )
            return 1
        if not phone.isdigit() or len(phone) != 11:
            print("手机号须为 11 位数字", file=sys.stderr)
            return 1
        phones = [phone]

    env_path = Path(os.environ.get("KARUO_SMTP_ENV", str(DEFAULT_ENV)))
    load_env_file(env_path)

    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    host = os.environ.get("SMTP_HOST", "smtp.qq.com").strip()
    port = int(os.environ.get("SMTP_PORT", "465") or "465")

    if not user or not password:
        print("错误：未读取到 SMTP_USER / SMTP_PASS", env_path, file=sys.stderr)
        return 1

    try:
        n_sent = 0
        for phone in phones:
            if suite:
                pairs = suite_appeals(phone)
            else:
                pairs = [pick_variant(phone)]

            for subject, body in pairs:
                send_one(host, port, user, password, subject, body)
                n_sent += 1
                print("OK", n_sent, subject[:56] + ("…" if len(subject) > 56 else ""))
                if suite and len(pairs) > 1:
                    time.sleep(3)

        print("共发送", n_sent, "封 →", ", ".join(TO_LIST))
    except Exception as e:
        print("发送失败:", type(e).__name__, str(e), file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
