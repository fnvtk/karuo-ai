#!/usr/bin/env python3
"""
今日飞书日志：搜索全库+聊天/纪要后的最近进度总结汇总 + 每天切片20个视频 + 成交1980及全链路 + 目标百分比写清楚。
无 3 月 token 时会自动通过 API 获取；写入成功后生成一张今日进度图并上传到飞书文档。
"""
import sys
import requests
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date, CONFIG

REF_DIR = SCRIPT_DIR.parent / "参考资料"


def _generate_progress_image(date_str: str) -> Path | None:
    """生成今日进度图（本月 12% 距目标 88%），返回图片路径；无 Pillow 则返回 None。"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None
    out = REF_DIR / f"今日进度_{date_str.replace('月', '').replace('日', '')}.png"
    REF_DIR.mkdir(parents=True, exist_ok=True)
    w, h = 480, 160
    img = Image.new("RGB", (w, h), color=(255, 252, 240))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 28)
        font_small = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 20)
    except Exception:
        font = ImageFont.load_default()
        font_small = font
    draw.text((20, 30), f"今日进度 · {date_str}", fill=(60, 60, 60), font=font)
    draw.text((20, 75), "本月 12%  /  距目标 88%", fill=(180, 80, 60), font=font)
    draw.text((20, 115), "20 切片 · 1980 全链路", fill=(80, 80, 80), font=font_small)
    img.save(out)
    return out


def _get_doc_id(token: str, wiki_token: str) -> str | None:
    """根据 wiki node token 获取文档 obj_token。"""
    r = requests.get(
        "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node",
        params={"token": wiki_token},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if r.json().get("code") != 0:
        return None
    return r.json().get("data", {}).get("node", {}).get("obj_token")


def _upload_and_insert_image(token: str, doc_id: str, image_path: Path, date_str: str) -> bool:
    """上传图片到文档并插入到当日标题后。"""
    from write_0301_feishu_log import upload_image_to_feishu, insert_image_block
    file_token = upload_image_to_feishu(token, doc_id, image_path)
    if not file_token:
        return False
    # 获取文档 blocks，找到 date_str 所在位置，在其后插入
    r = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks",
        params={"document_revision_id": -1, "page_size": 500},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    if r.json().get("code") != 0:
        return False
    items = r.json().get("data", {}).get("items", [])
    root = [b for b in items if b.get("parent_id") == doc_id]
    idx = None
    for i, b in enumerate(root):
        for key in ("heading4", "text"):
            if key in b:
                for el in b[key].get("elements", []):
                    if date_str in el.get("text_run", {}).get("content", ""):
                        idx = i
                        break
        if idx is not None:
            break
    insert_at = (idx + 2) if idx is not None else 1
    return insert_image_block(token, doc_id, file_token, image_path.name, insert_at)


def build_tasks_today_with_summary():
    """今日：最近进度汇总 + 每天20切片 + 1980成交及全链路 + 目标百分比"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    # 最近进度汇总（来自全库+智能纪要 output）
    summary = [
        "【进度汇总】飞书 Token 全命令行（get/set-march-token）、今日日志三件事+未完成已固化",
        "【进度汇总】Soul 114/115 场纪要：后端转化优于前端、发视频+切片以量取胜、私域握在自己手上",
        "【进度汇总】卡若AI 完善与接口、一场创业实验 网站/小程序、玩值电竞布局为主线；木叶视频切片 SKILL 与四屏切片 20 条/日",
    ]
    return [
        {
            "person": "卡若",
            "events": ["最近进度汇总", "接下来目标", "目标百分比"],
            "quadrant": "重要紧急",
            "t_targets": [
                "本月目标约 12%，距最终目标差 88%（相对 2026 年总目标 100%）",
                "接下来目标：每天切片 20 个视频（Soul 竖屏/四屏）；成交 1980 及全链路（引流→私域→转化）",
                "一人公司约 5%、玩值电竞约 25%；今日核心与目标达成百分比见反馈",
            ],
            "n_process": summary,
            "t_thoughts": [
                "进度汇总来自全库+纪要；每天 20 切片与 1980 全链路为达成总目标的关键动作，百分比写清楚便于追踪",
            ],
            "w_work": [
                "每天 20 条视频切片（Soul/四屏）",
                "成交 1980 及全链路（产品/客单→引流→私域→转化）",
                "卡若AI 完善 / 一场创业实验 / 玩值电竞",
                "20:00 发 1 条朋友圈",
                "飞书日志",
            ],
            "f_feedback": [
                "本月/最终目标 12% / 100%，差 88%",
                "每日 20 切片目标 → 当日完成度 X%（X= 完成数/20×100）🔄",
                "成交 1980 及全链路 → 进行中 🔄",
                "一人公司 5% 🔄 | 玩值电竞 25% 🔄",
            ],
        },
    ]


def main():
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    print("=" * 50)
    print(f"📝 写入今日飞书日志（进度汇总+20切片+1980全链路+百分比）：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_today_with_summary()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=True)
    if ok:
        target_wiki_token = resolve_wiki_token_for_date(date_str)
        doc_id = _get_doc_id(token, target_wiki_token) if target_wiki_token else None
        if doc_id:
            img_path = _generate_progress_image(date_str)
            if img_path and img_path.exists():
                if _upload_and_insert_image(token, doc_id, img_path, date_str):
                    print("✅ 今日进度图已上传并插入飞书文档")
                else:
                    print(f"⚠️ 图片已生成：{img_path}，可手动拖入飞书文档")
            else:
                print("💡 未安装 Pillow 或生成失败，可手动添加配图")
        open_result(target_wiki_token)
        print(f"✅ {date_str} 飞书日志已更新（含进度汇总与目标百分比）")
        sys.exit(0)
    open_token = target_wiki_token or (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(2) or CONFIG.get("WIKI_TOKEN")
    open_result(open_token)
    print("❌ 写入失败（文档月份不符时请先迁当月文档并 set-march-token）")
    print("📎 飞书日志固定链接：https://cunkebao.feishu.cn/wiki/ZdSBwHrsGii14HkcIbccQ0flnee")
    sys.exit(1)


if __name__ == "__main__":
    main()
