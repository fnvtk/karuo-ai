#!/usr/bin/env python3
"""
虚拟信用卡邮件通知脚本
用途：开卡成功 / 充值成功 / 异常告警时自动发邮件到 zhiqun@qq.com
使用 QQ 邮箱 SMTP + 授权码（同 IMAP 授权码）
"""
import argparse
import smtplib
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KARUO_AI_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
QQ_ENV_PATH = os.path.join(KARUO_AI_ROOT, "02_卡人（水）", "水桥_平台对接", "QQ邮箱拉取", ".qq_mail_env")

SMTP_HOST = "smtp.qq.com"
SMTP_PORT = 465
TO_EMAIL = "zhiqun@qq.com"


def load_env():
    env = {}
    if os.path.exists(QQ_ENV_PATH):
        with open(QQ_ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env


def send_email(subject: str, body_html: str):
    env = load_env()
    from_email = env.get("QQ_MAIL", TO_EMAIL)
    auth_code = env.get("QQ_MAIL_AUTH_CODE", "")
    if not auth_code:
        print("错误：未找到 QQ_MAIL_AUTH_CODE，请检查 .qq_mail_env")
        sys.exit(1)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = TO_EMAIL
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.login(from_email, auth_code)
        smtp.send_message(msg)
    print(f"邮件已发送: {subject}")


def card_created(args):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = f"""
    <div style="font-family: 'PingFang SC', Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">🎉 虚拟信用卡开卡成功</h2>
        <p style="color: #666;">通知时间：{now}</p>
        <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
            <tr style="background:#f5f5f5"><td style="padding:12px; font-weight:bold;">平台</td><td style="padding:12px;">HutaoCards</td></tr>
            <tr><td style="padding:12px; font-weight:bold;">卡号</td><td style="padding:12px; font-size:18px; letter-spacing:2px;"><b>{args.card_number}</b></td></tr>
            <tr style="background:#f5f5f5"><td style="padding:12px; font-weight:bold;">有效期</td><td style="padding:12px;">{args.expiry}</td></tr>
            <tr><td style="padding:12px; font-weight:bold;">CVV</td><td style="padding:12px;">{args.cvv}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:12px; font-weight:bold;">BIN</td><td style="padding:12px;">{args.bin or '428852'}</td></tr>
            <tr><td style="padding:12px; font-weight:bold;">类型</td><td style="padding:12px;">US Visa · 合作卡 · 非实名</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:12px; font-weight:bold;">余额</td><td style="padding:12px;">{args.balance or '$10'}</td></tr>
            <tr><td style="padding:12px; font-weight:bold;">适用</td><td style="padding:12px;">Cursor / ChatGPT / Claude / GitHub Copilot</td></tr>
        </table>
        <div style="background:#fff3cd; padding:15px; border-radius:8px; margin:15px 0;">
            <b>⚠️ 注意事项</b><br>
            • 每笔交易固定收 $0.5 手续费（成功/失败都收）<br>
            • 余额不足以扣手续费时会被自动销卡<br>
            • 每月拒付超 5 笔会被销卡<br>
            • 充值最低 $10（支付宝充值最低 $25）
        </div>
        <p style="color:#999; font-size:12px;">此邮件由卡若AI自动发送 · 虚拟信用卡全链路 Skill</p>
    </div>
    """
    send_email(f"【卡若AI】虚拟信用卡开卡成功 - {args.card_number[-4:]}", html)


def recharge_success(args):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = f"""
    <div style="font-family: 'PingFang SC', Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">💰 充值成功通知</h2>
        <p>充值金额：<b>{args.amount}</b></p>
        <p>充值方式：{args.method or '支付宝'}</p>
        <p>当前余额：{args.balance or '未知'}</p>
        <p>时间：{now}</p>
        <p style="color:#999; font-size:12px;">此邮件由卡若AI自动发送</p>
    </div>
    """
    send_email(f"【卡若AI】VCC充值成功 +{args.amount}", html)


def alert_unresolved(args):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = f"""
    <div style="font-family: 'PingFang SC', Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">🚨 卡若AI 无法解决的问题</h2>
        <p>时间：{now}</p>
        <p>模块：虚拟信用卡全链路</p>
        <div style="background:#f8d7da; padding:15px; border-radius:8px;">
            <b>问题描述：</b><br>{args.message}
        </div>
        <p style="margin-top:15px;">请尽快处理或联系相关人员。</p>
        <p style="color:#999; font-size:12px;">此邮件由卡若AI自动发送</p>
    </div>
    """
    send_email("【卡若AI·紧急】VCC 未解决问题告警", html)


def main():
    parser = argparse.ArgumentParser(description="VCC 邮件通知")
    sub = parser.add_subparsers(dest="type")

    p1 = sub.add_parser("card_created")
    p1.add_argument("--card_number", required=True)
    p1.add_argument("--expiry", required=True)
    p1.add_argument("--cvv", required=True)
    p1.add_argument("--bin", default="428852")
    p1.add_argument("--balance", default="$10")

    p2 = sub.add_parser("recharge")
    p2.add_argument("--amount", required=True)
    p2.add_argument("--method", default="支付宝")
    p2.add_argument("--balance", default="")

    p3 = sub.add_parser("alert")
    p3.add_argument("--message", required=True)

    args = parser.parse_args()
    if args.type == "card_created":
        card_created(args)
    elif args.type == "recharge":
        recharge_success(args)
    elif args.type == "alert":
        alert_unresolved(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
