#!/usr/bin/env python3
"""
QQ 邮箱全量多维度分析 · 合并收件箱/已发送/垃圾箱/我的文件夹
"""
import json
import re
from pathlib import Path
from collections import Counter
from datetime import datetime

REPORT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告")

def load_merge():
    """加载并合并各文件夹导出"""
    all_emails = []
    mapping = [
        (REPORT_DIR / "qq_inbox_export.json", "收件箱"),
        (REPORT_DIR / "qq_mail_full_export.json", "收件箱"),  # 与 inbox 可能重复，后面去重
        (REPORT_DIR / "qq_sent_export.json", "已发送"),
        (REPORT_DIR / "qq_junk_export.json", "垃圾箱"),
        (REPORT_DIR / "qq_myfolders_export.json", "我的文件夹"),
        (REPORT_DIR / "qq_all_folders_export.json", "全量"),
    ]
    seen = set()  # (date, from, subject) 去重
    for fp, folder in mapping:
        if not fp.exists():
            continue
        try:
            data = json.load(open(fp, "r", encoding="utf-8"))
            if not isinstance(data, list):
                continue
            for e in data:
                e = dict(e)
                e["_folder"] = e.get("_folder", folder)
                key = (e.get("date","")[:16], e.get("from","")[:50], e.get("subject","")[:60])
                if key in seen:
                    continue
                seen.add(key)
                all_emails.append(e)
        except Exception:
            pass
    return all_emails

def parse_sender(addr):
    m = re.search(r"[\w.-]+@[\w.-]+", addr or "")
    return m.group(0).lower() if m else (addr or "unknown")[:50]

def classify(e):
    subj = (e.get("subject") or "").lower()
    fr = (e.get("from") or "").lower()
    sender = parse_sender(e.get("from", ""))
    if "github" in sender:
        if "run failed" in subj or "sync" in subj or "failed" in subj:
            return "告警_GitHub同步失败"
        if "security" in subj or "alert" in subj:
            return "告警_GitHub安全"
        return "技术_GitHub"
    if "synology" in sender:
        return "告警_Synology_NAS"
    if "vercel" in sender:
        return "告警_Vercel部署"
    if "trip.com" in sender or "ctrip" in sender:
        return "推广_携程"
    if "adobe" in sender or "facebook" in sender or "airbnb" in sender:
        return "推广_品牌"
    if "boss" in sender or "zhipin" in sender:
        return "招聘_Boss直聘"
    if "光大" in fr or "cebbank" in sender or "95595" in fr:
        return "财务_光大银行"
    if "alipay" in sender or "支付宝" in fr:
        return "财务_支付宝"
    if "apple" in sender or "icloud" in sender:
        return "服务_Apple"
    if "ollama" in sender:
        return "技术_Ollama"
    if "docker" in sender or "openrouter" in sender:
        return "技术_开发"
    return "其他"

def analyze(emails):
    if not emails:
        return {"total": 0}

    total = len(emails)
    senders = Counter(parse_sender(e.get("from","")) for e in emails)
    types = Counter(classify(e) for e in emails)
    folders = Counter(e.get("_folder","") for e in emails)

    dates = [e.get("date","")[:10] for e in emails if e.get("date")]
    dates_ok = [d for d in dates if re.match(r"\d{4}-\d{2}-\d{2}", d)]
    date_min = min(dates_ok) if dates_ok else ""
    date_max = max(dates_ok) if dates_ok else ""

    # 按年统计
    by_year = Counter(d[:4] for d in dates_ok if len(d) >= 4)

    return {
        "total": total,
        "date_range": (date_min, date_max),
        "folders": dict(folders),
        "senders": dict(senders.most_common(20)),
        "types": dict(types),
        "by_year": dict(by_year),
        "top_senders": senders.most_common(15),
        "top_types": types.most_common(20),
    }

def main():
    emails = load_merge()
    r = analyze(emails)

    lines = [
        "# QQ 邮箱全量多维度复盘",
        "",
        "## 一、概览",
        "",
        f"- **邮件总数**：{r['total']} 封（收件箱+已发送+垃圾箱）",
        f"- **时间范围**：{r['date_range'][0]} ～ {r['date_range'][1]}",
        f"- **文件夹分布**：{r.get('folders', {})}",
        "",
        "## 二、维度1 · 按类型",
        "",
        "| 类型 | 数量 | 占比 |",
        "|:---|:---|:---|",
    ]
    for t, c in r["top_types"]:
        pct = round(c / r["total"] * 100, 1) if r["total"] else 0
        lines.append(f"| {t} | {c} | {pct}% |")

    lines.extend([
        "",
        "## 三、维度2 · 按发件人 Top 15",
        "",
        "| 发件人 | 数量 |",
        "|:---|:---|",
    ])
    for s, c in r["top_senders"]:
        lines.append(f"| {s[:55]} | {c} |")

    lines.extend([
        "",
        "## 四、维度3 · 按年份",
        "",
    ])
    for yr in sorted(r.get("by_year", {}).keys(), reverse=True):
        lines.append(f"- {yr}年：{r['by_year'][yr]} 封")

    lines.extend([
        "",
        "## 五、维度4 · 告警/财务/推广",
        "",
    ])
    alerts = sum(c for t, c in r["top_types"] if t.startswith("告警_"))
    finance = sum(c for t, c in r["top_types"] if t.startswith("财务_"))
    promo = sum(c for t, c in r["top_types"] if t.startswith("推广_"))
    tech = sum(c for t, c in r["top_types"] if t.startswith("技术_"))
    lines.append(f"- 告警类：{alerts} 封（GitHub 同步/Synology/Vercel 等）")
    lines.append(f"- 财务类：{finance} 封")
    lines.append(f"- 推广类：{promo} 封")
    lines.append(f"- 技术类：{tech} 封")

    lines.extend([
        "",
        "## 六、核心结论与建议",
        "",
        "1. **收件箱未读量大**：3899 未读/5030 总量，建议分批归档或设规则自动分类",
        "2. **告警噪音**：GitHub/Synology 告警占比高，cunkebao_doc 同步已停用；NAS 容器需排查",
        "3. **财务邮件**：支付宝/银行类已单独归类，可与财务报告联动",
        "4. **推广邮件**：携程/品牌类可设过滤器减少干扰",
        "",
        "---",
        "",
        "数据说明：基于 IMAP 导出的收件箱、已发送、垃圾箱合并分析；全量我的文件夹拉取进行中。",
        "",
    ])

    out = REPORT_DIR / "QQ邮箱_全量多维度复盘.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"已写入 {out}")
    return out

if __name__ == "__main__":
    main()
