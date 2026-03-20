#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拉取腾讯云云安全中心最近 3 条安全告警，立即发送到指定邮箱（默认 xmbaiqi@qq.com）。
凭证：腾讯云同 腾讯云_宝塔服务器重启.py；发件箱同 00_账号与API索引 四、邮箱。
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-csip
"""
import json
import os
import re
import smtplib
import sys
from email.mime.text import MIMEText
from email.utils import formatdate

# 收件人（可环境变量 ALERT_EMAIL_TO 覆盖）
TO_EMAIL_DEFAULT = "xmbaiqi@qq.com"


def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (
            os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))
        ):
            return d
        d = os.path.dirname(d)
    return None


def _read_tencent_creds():
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    secret_id = secret_key = None
    in_tencent = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None


def _read_smtp_creds():
    """从 00_账号 四、邮箱 解析 邮箱地址、密码（用于发件）。"""
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    email_addr = password = None
    in_mail = False
    for line in text.splitlines():
        if "## 四、邮箱" in line or "### 邮箱" in line:
            in_mail = True
            continue
        if in_mail and line.strip().startswith("##"):
            break
        if not in_mail:
            continue
        if "邮箱地址" in line:
            m = re.findall(r"`([^`]+@[^`]+)`", line)
            if m:
                email_addr = m[0].strip()
        m = re.search(r"\|\s*密码\s*\|\s*`([^`]+)`", line)
        if m:
            password = m.group(1).strip()
    return email_addr or None, password or None


def _get_recent_alerts(secret_id, secret_key, limit=3):
    try:
        from tencentcloud.common import credential
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.common.profile.http_profile import HttpProfile
        from tencentcloud.csip.v20221121 import csip_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-csip")
        return None

    cred = credential.Credential(secret_id, secret_key)
    hp = HttpProfile()
    hp.endpoint = "csip.tencentcloudapi.com"
    cp = ClientProfile(httpProfile=hp)
    client = csip_client.CsipClient(cred, "", cp)

    req = models.DescribeAlertListRequest()
    req.Filter = models.Filter()
    req.Filter.Limit = limit
    req.Filter.Offset = 0
    # 不设时间则取全量中前 Limit 条（一般为最新）
    resp = client.DescribeAlertList(req)
    if getattr(resp, "ReturnCode", 1) != 0:
        print("API 返回异常: ReturnCode=%s" % getattr(resp, "ReturnCode", ""))
        return None
    alerts = getattr(resp, "AlertList", None) or []
    return list(alerts)


def _alert_to_text(alert):
    """单条告警转可读文本。"""
    lines = []
    lines.append("【%s】" % (getattr(alert, "Name", "") or "未命名"))
    lines.append("  时间: %s" % getattr(alert, "CreateTime", ""))
    lines.append("  类型: %s | 子类型: %s" % (getattr(alert, "Type", ""), getattr(alert, "SubType", "")))
    lines.append("  等级: %s | 状态: %s" % (getattr(alert, "Level", ""), getattr(alert, "Status", "")))
    lines.append("  来源: %s" % getattr(alert, "Source", ""))
    if getattr(alert, "RemediationSuggestion", ""):
        lines.append("  处置建议: %s" % alert.RemediationSuggestion)
    victim = getattr(alert, "Victim", None)
    if victim and getattr(victim, "IP", ""):
        lines.append("  受害IP: %s" % victim.IP)
    attacker = getattr(alert, "Attacker", None)
    if attacker and getattr(attacker, "IP", ""):
        lines.append("  攻击IP: %s" % attacker.IP)
    return "\n".join(lines)


def _send_mail(smtp_user, smtp_pass, to_email, subject, body_text):
    msg = MIMEText(body_text, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    with smtplib.SMTP_SSL("smtp.qq.com", 465) as s:
        s.login(smtp_user, smtp_pass)
        s.sendmail(smtp_user, [to_email], msg.as_string())
    return True


def main():
    to_email = os.environ.get("ALERT_EMAIL_TO") or TO_EMAIL_DEFAULT

    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_tencent_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1

    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    if not smtp_user or not smtp_pass:
        u, p = _read_smtp_creds()
        smtp_user = smtp_user or u
        smtp_pass = smtp_pass or p
    if not smtp_user or not smtp_pass:
        print("❌ 未配置发件邮箱 SMTP_USER/SMTP_PASS 或 00_账号 四、邮箱")
        return 1

    print("正在拉取云安全中心最近 3 条告警…")
    alerts = _get_recent_alerts(secret_id, secret_key, limit=3)
    if alerts is None:
        return 1
    if not alerts:
        body = "当前无安全告警记录。"
        print("当前无告警，仍将发送一封说明邮件到 %s" % to_email)
    else:
        parts = ["腾讯云云安全中心 · 最近 %d 条安全消息\n" % len(alerts), "=" * 50]
        for i, a in enumerate(alerts, 1):
            parts.append("\n--- 第 %d 条 ---" % i)
            parts.append(_alert_to_text(a))
        body = "\n".join(parts)
        print("已获取 %d 条告警，正在发送到 %s …" % (len(alerts), to_email))

    subject = "腾讯云安全消息 · 最近%d条" % len(alerts) if alerts else "腾讯云安全消息 · 当前无告警"
    try:
        _send_mail(smtp_user, smtp_pass, to_email, subject, body)
        print("✅ 已发送到 %s" % to_email)
        return 0
    except Exception as e:
        print("❌ 发送邮件失败: %s" % e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
