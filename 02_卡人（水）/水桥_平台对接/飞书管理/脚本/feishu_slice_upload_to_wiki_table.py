#!/usr/bin/env python3
"""
Soul 派对成片切片 → 飞书知识库多维表格（内容看板）上传。

- 目标链接格式：https://cunkebao.feishu.cn/wiki/{wiki_node_token}?table={table_id}&view=...
- 通过 get_node 取得 obj_token 作为 bitable app_token，再向该 table 追加记录。
- 记录格式：标题 = 「119场 3月8日 第N场 标题」；时间 = 真实日期；分组 = 2026年3月；附件 = 成片 mp4（需先上传 drive）。

用法:
  # 仅检查表格字段结构（不写入）
  python3 feishu_slice_upload_to_wiki_table.py --check-only --wiki-node MKhNwmYwpi1hXIkJvfCcu31vnDh --table tblGjpeCk1ADQMEX

  # 指定成片目录并上传
  python3 feishu_slice_upload_to_wiki_table.py \
    --wiki-node MKhNwmYwpi1hXIkJvfCcu31vnDh \
    --table tblGjpeCk1ADQMEX \
    --clips-dir "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片" \
    --session 119 --date 2026-03-08
"""
import os
import sys
import json
import re
import argparse
import requests
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# 复用飞书 Wiki 的 Token 逻辑（用户身份，bitable 需 user token）
from feishu_wiki_create_doc import get_token, load_tokens, CONFIG

# 默认目标（内容看板）
DEFAULT_WIKI_NODE = "MKhNwmYwpi1hXIkJvfCcu31vnDh"
DEFAULT_TABLE_ID = "tblGjpeCk1ADQMEX"
# 成片目录默认
DEFAULT_CLIPS_DIR = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片"


def get_node_and_app_token(user_token: str, wiki_node_token: str):
    """通过 get_node 获取知识库节点信息；若为 bitable 则返回 app_token。"""
    r = requests.get(
        "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node",
        params={"token": wiki_node_token},
        headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
        timeout=15,
    )
    data = r.json()
    if data.get("code") != 0:
        return None, data.get("msg", "get_node 失败")
    node = data.get("data", {}).get("node", {})
    obj_type = node.get("obj_type")
    obj_token = node.get("obj_token")
    if obj_type != "bitable" or not obj_token:
        return None, f"该节点不是多维表格或缺少 obj_token（obj_type={obj_type}）"
    return obj_token, None


def list_table_fields(user_token: str, app_token: str, table_id: str):
    """获取多维表格的字段列表，用于核对「标题」「时间」「附件」「进展状态」等。"""
    r = requests.get(
        f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields",
        headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
        timeout=15,
    )
    data = r.json()
    if data.get("code") != 0:
        return None, data.get("msg", "list fields 失败")
    items = data.get("data", {}).get("items", [])
    return items, None


def parse_index_md(clips_dir: Path):
    """从 目录索引.md 解析 序号 -> (标题, Hook, CTA)。"""
    index_file = clips_dir / "目录索引.md"
    if not index_file.exists():
        return {}
    text = index_file.read_text(encoding="utf-8")
    rows = []
    in_table = False
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("|") and "标题" in line and "Hook" in line:
            in_table = True
            continue
        if in_table and line.startswith("|"):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 2 and parts[0].isdigit():
                rows.append((int(parts[0]), parts[1], parts[2] if len(parts) > 2 else "", parts[3] if len(parts) > 3 else ""))
        if in_table and not line.startswith("|") and line:
            break
    return {r[0]: {"title": r[1], "hook": r[2], "cta": r[3]} for r in rows}


def build_multi_platform_desc(meta: dict, title: str, cta: str = "关注我，每天学一招私域干货") -> str:
    """生成多平台发布描述（抖音、小红书、视频号）。"""
    hook = meta.get("hook", "") or title
    cta = meta.get("cta") or cta
    # 通用话题
    tags = "#Soul派对 #创业日记 #晨间直播 #私域干货 #卡若创业派对"
    # 抖音：标题≤30字 + 描述 + 话题
    dy_title = (title[:28] + "。" if len(title) > 28 else title) + f" {tags}"
    dy_desc = f"{hook}。{cta}"
    # 小红书：标题+正文
    xhs_title = title[:20] if len(title) > 20 else title
    xhs_body = f"{hook}。{cta} {tags}"
    # 视频号：类似抖音
    sp_desc = f"{hook}。{cta} {tags}"
    return (
        f"【抖音】\n标题：{dy_title}\n描述：{dy_desc}\n"
        f"【小红书】\n标题：{xhs_title}\n正文：{xhs_body}\n"
        f"【视频号】\n描述：{sp_desc}"
    )


def _match_mp4_to_title(mp4_list: list, title: str) -> Path | None:
    """按标题匹配 mp4：文件名（stem）与目录索引标题一致或包含，忽略冒号/空格差异。"""
    t = title.replace(" ", "").replace("：", ":").strip()
    for fp in mp4_list:
        stem = fp.stem.replace(" ", "").replace("：", ":").strip()
        if stem == t or t in stem or stem in t:
            return fp
    return None


def collect_clips(clips_dir: Path, session: int, date_str: str):
    """
    收集成片目录下的切片信息。按 目录索引.md 的序号顺序，每条记录对应同序号的视频文件，避免错位。
    标题格式：119场 3月8日 标题（不含「第N场」）。
    """
    clips_dir = Path(clips_dir)
    index_map = parse_index_md(clips_dir)
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        date_cn = f"{dt.month}月{dt.day}日"
    except Exception:
        date_cn = date_str

    mp4_list = list(clips_dir.glob("*.mp4"))
    records = []
    # 按目录索引序号 1,2,3... 顺序建记录，并用标题匹配对应 mp4，保证视频与标题一致
    for i in sorted(index_map.keys()):
        meta = index_map[i]
        title_from_index = meta.get("title", "")
        fp = _match_mp4_to_title(mp4_list, title_from_index)
        if not fp and mp4_list:
            # 兜底：按序号取第 i 个（仅当数量一致时）
            idx = i - 1
            if idx < len(mp4_list):
                fp = mp4_list[idx]
        if not fp:
            continue
        # 标题不含「第N场」：119场 3月8日 标题
        field_title = f"{session}场 {date_cn} {title_from_index}"
        desc = meta.get("hook", "") or title_from_index
        if meta.get("cta"):
            desc = f"{desc}；{meta['cta']}" if desc else meta["cta"]
        multi_platform = build_multi_platform_desc(meta, title_from_index)
        records.append({
            "index": i,
            "field_title": field_title,
            "time_text": date_str,
            "file_path": fp,
            "description": desc or title_from_index,
            "multi_platform_desc": multi_platform,
        })
    return records


def upload_media_to_feishu(user_token: str, app_token: str, file_path: Path) -> str | None:
    """上传视频/文件到飞书 drive，用于 bitable 附件。返回 file_token。"""
    if not file_path.exists():
        return None
    size = file_path.stat().st_size
    if size > 100 * 1024 * 1024:
        print(f"    ⚠️ 文件过大跳过: {file_path.name} ({size // 1024 // 1024}MB)")
        return None
    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    headers = {"Authorization": f"Bearer {user_token}"}
    mime = "video/mp4" if file_path.suffix.lower() == ".mp4" else "application/octet-stream"
    try:
        with open(file_path, "rb") as f:
            files = {
                "file_name": (None, file_path.name),
                "parent_type": (None, "bitable_file"),
                "parent_node": (None, app_token),
                "size": (None, str(size)),
                "file": (file_path.name, f, mime),
            }
            r = requests.post(url, headers=headers, files=files, timeout=180)
    except Exception as e:
        print(f"    ⚠️ 上传异常 {file_path.name}: {e}")
        return None
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("file_token")
    # bitable_file 不支持时尝试 explorer
    if "parent" in (data.get("msg") or "").lower() or data.get("code") in (1254999, 1254003, 1254002):
        try:
            with open(file_path, "rb") as f:
                files = {
                    "file_name": (None, file_path.name),
                    "parent_type": (None, "explorer"),
                    "parent_node": (None, app_token),
                    "size": (None, str(size)),
                    "file": (file_path.name, f, mime),
                }
                r2 = requests.post(url, headers=headers, files=files, timeout=180)
            d2 = r2.json()
            if d2.get("code") == 0:
                return d2.get("data", {}).get("file_token")
        except Exception:
            pass
    print(f"    ⚠️ 上传失败 {file_path.name}: {data.get('msg')}")
    return None


def create_records(
    user_token: str, app_token: str, table_id: str, records: list,
    group_value: str, field_map: dict, upload_attachment: bool = True
):
    """
    批量向多维表格添加记录。
    field_map: 飞书字段名 -> 我们用的 key
    upload_attachment: 是否上传 mp4 到附件字段
    """
    created = 0
    for rec in records:
        fields = {}
        for feishu_name, our_key in field_map.items():
            if our_key == "field_title":
                fields[feishu_name] = rec["field_title"]
            elif our_key == "time_text":
                fields[feishu_name] = rec["time_text"]
            elif our_key == "group":
                fields[feishu_name] = group_value
            elif our_key == "multi_platform" and "multi_platform_desc" in rec:
                fields[feishu_name] = rec["multi_platform_desc"]
            elif our_key == "description" and "description" in rec:
                fields[feishu_name] = rec["description"]
            elif our_key == "attachment" and upload_attachment and rec.get("file_path"):
                ft = upload_media_to_feishu(user_token, app_token, rec["file_path"])
                if ft:
                    fields[feishu_name] = [{"file_token": ft}]
                time.sleep(0.3)
        body = {"fields": fields}
        r = requests.post(
            f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records",
            headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
            json=body,
            timeout=15,
        )
        data = r.json()
        if data.get("code") == 0:
            created += 1
            print(f"  ✅ 第{rec['index']}条: {rec['field_title'][:50]}...")
        else:
            print(f"  ❌ 第{rec['index']}条 失败: {data.get('msg', data)}")
        time.sleep(0.2)
    return created


def _content_from_field_title(field_title: str, prefix: str) -> str:
    """从完整标题去掉前缀，得到内容标题。支持旧格式「119场 3月8日 第N场 xxx」或新格式「119场 3月8日 xxx」。"""
    if not field_title.startswith(prefix):
        return ""
    rest = field_title[len(prefix):].strip()
    m = re.match(r"^第\d+场\s*", rest)
    if m:
        rest = rest[m.end():].strip()
    return rest


def list_records_by_title(user_token: str, app_token: str, table_id: str, title_prefix: str):
    """列出标题以 title_prefix 开头的记录，返回 [(record_id, content_title), ...]。"""
    all_records = []
    page_token = None
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records",
            headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
            params=params,
            timeout=15,
        )
        data = r.json()
        if data.get("code") != 0:
            return []
        items = data.get("data", {}).get("items", [])
        for it in items:
            raw = (it.get("fields") or {}).get("标题", "")
            if isinstance(raw, list) and raw:
                title = raw[0].get("text", "") if isinstance(raw[0], dict) else str(raw[0])
            else:
                title = str(raw) if raw else ""
            if title.startswith(title_prefix):
                content = _content_from_field_title(title, title_prefix)
                all_records.append((it.get("record_id"), content, title))
        page_token = data.get("data", {}).get("page_token") or data.get("data", {}).get("next_page_token")
        if not page_token or not items:
            break
    return all_records


def update_existing_records(
    user_token: str, app_token: str, table_id: str, records: list,
    session: int, date_str: str, field_map: dict, upload_attachment: bool = True
):
    """
    更新已有记录：按标题内容匹配（支持旧格式「第N场 标题」或新格式「标题」），
    补写 标题（去掉第N场）、附件（与内容一致）、你的解决方案。
    """
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        date_cn = f"{dt.month}月{dt.day}日"
    except Exception:
        date_cn = date_str
    title_prefix = f"{session}场 {date_cn}"
    existing = list_records_by_title(user_token, app_token, table_id, title_prefix)
    if not existing:
        print("  ⚠️ 未找到匹配的已有记录，请先执行新建上传")
        return 0
    def norm(s):
        return (s or "").replace(" ", "").replace("：", ":").strip()
    rec_by_content = {}
    for r in records:
        rest = _content_from_field_title(r["field_title"], title_prefix)
        rec_by_content[norm(rest)] = r
    updated = 0
    for record_id, content, full_title in existing:
        rec = rec_by_content.get(norm(content))
        if not rec:
            for k, v in rec_by_content.items():
                if content and (k in content or content in k):
                    rec = v
                    break
        if not rec:
            continue
        fields = {}
        # 统一把标题改为新格式（去掉第N场），并补写附件与多平台描述
        fields["标题"] = rec["field_title"]
        for feishu_name, our_key in field_map.items():
            if our_key == "multi_platform" and "multi_platform_desc" in rec:
                fields[feishu_name] = rec["multi_platform_desc"]
            elif our_key == "attachment" and upload_attachment and rec.get("file_path"):
                ft = upload_media_to_feishu(user_token, app_token, rec["file_path"])
                if ft:
                    fields[feishu_name] = [{"file_token": ft}]
                time.sleep(0.3)
        if not fields:
            continue
        r = requests.put(
            f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}",
            headers={"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"},
            json={"fields": fields},
            timeout=30,
        )
        data = r.json()
        if data.get("code") == 0:
            updated += 1
            print(f"  ✅ 已更新: {rec['field_title'][:45]}...")
        else:
            print(f"  ❌ 更新失败: {data.get('msg')} ({rec['field_title'][:30]}...)")
        time.sleep(0.2)
    return updated


def main():
    ap = argparse.ArgumentParser(description="Soul 成片切片上传到飞书知识库多维表格")
    ap.add_argument("--wiki-node", default=DEFAULT_WIKI_NODE, help="知识库节点 token（URL 中 wiki/ 后）")
    ap.add_argument("--table", default=DEFAULT_TABLE_ID, help="多维表格 table_id（URL 中 table=）")
    ap.add_argument("--clips-dir", default=DEFAULT_CLIPS_DIR, help="成片目录（含 目录索引.md 与 mp4）")
    ap.add_argument("--session", type=int, default=119, help="场次，如 119")
    ap.add_argument("--date", default="2026-03-08", help="直播日期 YYYY-MM-DD")
    ap.add_argument("--group", default="2026年3月", help="看板分组值，如 2026年3月")
    ap.add_argument("--check-only", action="store_true", help="仅检查表格字段结构，不写入")
    ap.add_argument("--no-upload-attachment", action="store_true", help="不上传视频到附件字段（仅写标题/时间/描述）")
    ap.add_argument("--update-existing", action="store_true", help="仅更新已有记录，补写附件+多平台描述（按标题匹配）")
    args = ap.parse_args()

    user_token = get_token(args.wiki_node)
    if not user_token:
        print("❌ 无法获取飞书用户 Token，请先完成授权（如运行 write_today_three_focus 或 feishu_api 授权）")
        sys.exit(1)

    app_token, err = get_node_and_app_token(user_token, args.wiki_node)
    if err:
        print(f"❌ 获取多维表格失败: {err}")
        sys.exit(1)
    print(f"✅ 多维表格 app_token: {app_token[:20]}...")

    fields, err = list_table_fields(user_token, app_token, args.table)
    if err:
        print(f"❌ 获取字段列表失败: {err}")
        sys.exit(1)

    print("\n📋 当前表格字段（用于映射 标题/时间/进展状态/附件/描述）：")
    for f in fields:
        name = f.get("field_name", "")
        typ = f.get("type", "")
        fid = f.get("field_id", "")
        print(f"  - {name} (type={typ}, id={fid})")

    if args.check_only:
        print("\n✅ 仅检查完成，未写入。去掉 --check-only 可执行上传。")
        return

    clips_dir = Path(args.clips_dir)
    if not clips_dir.is_dir():
        print(f"❌ 成片目录不存在: {clips_dir}")
        sys.exit(1)

    records = collect_clips(clips_dir, args.session, args.date)
    if not records:
        print("❌ 未在成片目录下找到任何 mp4 或索引")
        sys.exit(1)
    print(f"\n📁 共 {len(records)} 条切片待写入，分组为「{args.group}」")

    # 根据当前表格字段映射（标题、时间、进展状态、多平台描述、附件）
    field_map = {
        "标题": "field_title",
        "时间": "time_text",
        "进展状态": "group",
    }
    name_set = {f.get("field_name") for f in fields}
    if "你的解决方案" in name_set:
        field_map["你的解决方案"] = "multi_platform"  # 抖音/小红书/视频号 多平台描述
    elif "描述" in name_set or "内容提炼" in name_set:
        field_map["描述" if "描述" in name_set else "内容提炼"] = "multi_platform"
    if "附件" in name_set and not args.no_upload_attachment:
        field_map["附件"] = "attachment"

    upload_attach = not args.no_upload_attachment

    if args.update_existing:
        print(f"\n📁 更新已有记录：补写附件 + 多平台描述（共 {len(records)} 条待匹配）")
        updated = update_existing_records(
            user_token, app_token, args.table, records,
            args.session, args.date,
            {k: v for k, v in field_map.items() if v in ("multi_platform", "attachment")},
            upload_attachment=upload_attach,
        )
        print(f"\n✅ 已更新 {updated} 条记录。")
        print(f"   链接: https://cunkebao.feishu.cn/wiki/{args.wiki_node}?table={args.table}")
        return

    created = create_records(
        user_token, app_token, args.table, records, args.group, field_map,
        upload_attachment=upload_attach
    )
    attach_note = "" if upload_attach else "；附件未上传（已用 --no-upload-attachment 跳过）"
    print(f"\n✅ 已写入 {created}/{len(records)} 条记录。多平台描述已填入「你的解决方案」，附件已上传{attach_note}。")
    print(f"   链接: https://cunkebao.feishu.cn/wiki/{args.wiki_node}?table={args.table}")


if __name__ == "__main__":
    main()
