#!/usr/bin/env python3
"""
QQ 邮箱导出数据分析 · 生成整体总结报告
"""
import json
import re
from pathlib import Path
from collections import Counter
from datetime import datetime

def analyze(json_path: str) -> dict:
    with open(json_path, "r", encoding="utf-8") as f:
        emails = json.load(f)

    if not emails:
        return {"total": 0, "error": "无邮件数据"}

    # 基础统计
    total = len(emails)
    dates = []
    senders = []
    subject_keywords = []

    for e in emails:
        d = e.get("date", "")[:10]
        if d and len(d) >= 10:
            dates.append(d)
        from_addr = e.get("from", "")
        if "<" in from_addr:
            m = re.search(r"[\w.-]+@[\w.-]+", from_addr)
            sender = m.group(0) if m else from_addr[:50]
        else:
            sender = from_addr[:50] if from_addr else "unknown"
        senders.append(sender)

        subj = e.get("subject", "")
        # 提取发件域名/服务
        if "github" in sender.lower():
            if "Run failed" in subj or "Sync" in subj:
                subject_keywords.append("GitHub_同步失败")
            elif "security" in subj.lower():
                subject_keywords.append("GitHub_安全告警")
            else:
                subject_keywords.append("GitHub_其他")
        elif "synology" in sender.lower():
            subject_keywords.append("Synology_NAS")
        elif "vercel" in sender.lower():
            subject_keywords.append("Vercel_部署")
        elif "ollama" in sender.lower():
            subject_keywords.append("Ollama_验证")
        elif "apple" in sender.lower() or "icloud" in sender.lower():
            subject_keywords.append("Apple_iCloud")
        elif "trip.com" in sender.lower():
            subject_keywords.append("Trip_推广")
        elif "facebook" in sender.lower():
            subject_keywords.append("Facebook_通知")
        elif "adobe" in sender.lower():
            subject_keywords.append("Adobe_推广")
        elif "docker" in sender.lower():
            subject_keywords.append("Docker_推广")
        elif "airbnb" in sender.lower():
            subject_keywords.append("Airbnb_通知")
        elif "cebbank" in sender.lower() or "95595" in sender:
            subject_keywords.append("光大银行")
        elif "bosszhipin" in sender.lower():
            subject_keywords.append("Boss直聘")
        elif "openrouter" in sender.lower():
            subject_keywords.append("OpenRouter_AI")
        else:
            subject_keywords.append("其他")

    # 按发件人统计
    sender_counts = Counter(senders)
    top_senders = sender_counts.most_common(15)

    # 按类型统计
    type_counts = Counter(subject_keywords)
    top_types = type_counts.most_common(15)

    # 日期范围
    dates_ok = [d for d in dates if re.match(r"\d{4}-\d{2}-\d{2}", d)]
    date_min = min(dates_ok) if dates_ok else ""
    date_max = max(dates_ok) if dates_ok else ""

    return {
        "total": total,
        "date_range": {"min": date_min, "max": date_max},
        "top_senders": top_senders,
        "top_types": top_types,
        "by_type": dict(type_counts),
    }


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("json", nargs="?", default="/Users/karuo/Documents/卡若Ai的文件夹/报告/qq_mail_full_export.json")
    ap.add_argument("-o", "--output", help="输出报告路径")
    args = ap.parse_args()

    r = analyze(args.json)

    lines = [
        "# QQ 邮箱整体分析报告",
        "",
        "## 一、概览",
        "",
        f"- 邮件总数：**{r['total']}** 封",
        f"- 时间范围：{r['date_range']['min']} ～ {r['date_range']['max']}",
        "",
        "## 二、按发件人统计（Top 15）",
        "",
        "| 发件人 | 数量 |",
        "|:---|:---|",
    ]
    for s, c in r["top_senders"]:
        lines.append(f"| {s[:60]} | {c} |")

    lines.extend([
        "",
        "## 三、按内容类型统计",
        "",
        "| 类型 | 数量 | 占比 |",
        "|:---|:---|:---|",
    ])
    for t, c in r["top_types"]:
        pct = round(c / r["total"] * 100, 1) if r["total"] else 0
        lines.append(f"| {t} | {c} | {pct}% |")

    # 四、核心发现
    lines.extend([
        "",
        "## 四、核心发现",
        "",
    ])
    gh_fail = r["by_type"].get("GitHub_同步失败", 0)
    syno = r["by_type"].get("Synology_NAS", 0)
    vercel = r["by_type"].get("Vercel_部署", 0)
    boss = r["by_type"].get("Boss直聘", 0)
    if gh_fail:
        lines.append(f"- **GitHub 同步告警占 {round(gh_fail/r['total']*100,1)}%**：cunkebao_doc 的 Coding 同步长期失败，建议修复或停用工作流")
    if syno:
        lines.append(f"- **Synology NAS 通知 {syno} 封**：容器异常、连接断连频繁，需排查 nas-frpc、mongodb 等")
    if vercel:
        lines.append(f"- **Vercel 部署失败 {vercel} 封**：部署权限或集成问题待查")
    if boss:
        lines.append(f"- **Boss直聘 {boss} 封**：招聘/求职相关")
    lines.extend([
        "",
        "## 五、建议行动",
        "",
        "1. 优先处理 cunkebao_doc 同步失败，减少告警噪音",
        "2. 排查 Synology 容器稳定性与 lkdie 连接",
        "3. 检查 Vercel 与 GitHub 集成",
        "4. 按需归档或过滤推广类邮件（Trip、Facebook、Adobe 等）",
        "",
        "## 六、数据说明",
        "",
        "- 数据来源：IMAP 收件箱（INBOX）全量拉取",
        "- 网页版「我的文件夹」等需在 QQ 邮箱设置中勾选「收取我的文件夹」后，方能在 IMAP 中访问",
        "- 导出文件：`qq_mail_full_export.json`",
        "",
    ])

    text = "\n".join(lines)

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"已写入 {args.output}")
    else:
        print(text)


if __name__ == "__main__":
    main()
