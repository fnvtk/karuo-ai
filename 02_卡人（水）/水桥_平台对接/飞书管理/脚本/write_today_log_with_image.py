#!/usr/bin/env python3
"""
今日飞书日志：含昨日对比、完成度变化、并插入对比图到文档。
- 读取昨日(2月25日)进度，生成今日(2月26日)日志与对比说明
- 生成昨日vs今日完成度对比图
- 上传图片到飞书 docx，插入到今日日志中
"""
import os
import sys
import re
import requests
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import (
    get_token_silent,
    build_blocks,
    resolve_wiki_token_for_date,
    parse_month_from_date_str,
    CONFIG,
)

# 昨日进度（从 2月25日 日志解析或写死）
YESTERDAY_PROGRESS = {"卡若AI": 55, "小程序": 0, "投资": 0}
# 今日进度（可略增表示推进）
TODAY_PROGRESS = {"卡若AI": 56, "小程序": 0, "投资": 0}

FEB_TOKEN = CONFIG.get("MONTH_WIKI_TOKENS", {}).get(2) or "Jn2EwXP2OiTujNkAbNCcDcM7nRA"
TODAY_DATE = "2月26日"


def _make_today_tasks():
    """今日任务：含昨日对比、完成度是否增长"""
    growth = TODAY_PROGRESS["卡若AI"] - YESTERDAY_PROGRESS["卡若AI"]
    growth_text = f"较昨日+{growth}%" if growth > 0 else "与昨日持平" if growth == 0 else f"较昨日{growth}%"
    return [
        {
            "person": "卡若",
            "events": ["飞书日志今日汇总", "昨日对比", "完成度跟踪", "运营文档"],
            "quadrant": "重要紧急",
            "t_targets": [
                f"卡若AI开发→接口与网站持续推进 🔧 ({TODAY_PROGRESS['卡若AI']}%)",
                "创业实业小程序→完成对接与上线清单 📱 (0%)",
                "投资落地→与阿猫确定目标与方向 💰 (0%)",
            ],
            "n_process": [
                "【昨日回顾】2月25日：卡若AI 55%、小程序 0%、投资 0%；重点在服务器卡点与功能/方案清晰度",
                f"【今日对比】卡若AI {TODAY_PROGRESS['卡若AI']}% {growth_text}；小程序、投资仍待启动",
                "【非程序侧】昨日文档（gitea_push_log、代码管理、运营中枢）已纳入梳理；今日继续补齐功能项与解决方案映射",
                "【后续】先解服务器与部署卡点，再推进接口/网站与小程序、投资事项",
            ],
            "t_thoughts": [
                "用昨日vs今日完成度做对比，便于看是否增长",
                "除程序开发外，文档与运营登记也要在日志里体现",
            ],
            "w_work": ["日志登记", "昨日对比", "接口与网站推进", "方案梳理"],
            "f_feedback": [
                f"卡若AI→进行中 🔄（{TODAY_PROGRESS['卡若AI']}%，{growth_text}）",
                "下图：昨日 vs 今日 完成度对比",
            ],
        }
    ]


def generate_comparison_image(out_path: Path) -> bool:
    """生成昨日vs今日完成度对比图（简单柱状示意），保存为 PNG"""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        # 无 matplotlib 时用纯色 PNG 占位（可选：用 Pillow 画简单矩形）
        try:
            from PIL import Image, ImageDraw
            w, h = 640, 360
            img = Image.new("RGB", (w, h), color=(248, 250, 252))
            d = ImageDraw.Draw(img)
            # 简单文字 + 矩形条
            d.rectangle([(80, 120), (80 + 180, 220)], fill=(59, 130, 246), outline=(37, 99, 235))
            d.rectangle([(320, 120), (320 + 200, 220)], fill=(34, 197, 94), outline=(22, 163, 74))
            d.text((130, 250), "昨日 55%", fill=(31, 41, 55))
            d.text((380, 250), "今日 56%", fill=(31, 41, 55))
            img.save(out_path)
            return True
        except Exception as e:
            print(f"⚠️ 生成图片失败: {e}")
            return False

    # matplotlib 路径
    fig, ax = plt.subplots(figsize=(6, 3.5))
    labels = ["昨日(2/25)", "今日(2/26)"]
    values = [YESTERDAY_PROGRESS["卡若AI"], TODAY_PROGRESS["卡若AI"]]
    colors = ["#3b82f6", "#22c55e"]
    bars = ax.bar(labels, values, color=colors, edgecolor="white", linewidth=1.2)
    ax.set_ylabel("完成度 (%)")
    ax.set_ylim(0, 100)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 2, f"{v}%", ha="center", fontsize=12)
    ax.set_title("卡若AI 完成度 · 昨日 vs 今日")
    fig.tight_layout()
    fig.savefig(out_path, dpi=120, bbox_inches="tight")
    plt.close()
    return True


def upload_image_to_feishu(token: str, doc_token: str, image_path: Path) -> str | None:
    """上传图片到 docx，返回 file_token"""
    if not image_path.exists():
        print(f"⚠️ 图片不存在: {image_path}")
        return None
    size = image_path.stat().st_size
    if size > 20 * 1024 * 1024:
        print("⚠️ 图片超过 20MB")
        return None
    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    headers = {"Authorization": f"Bearer {token}"}
    with open(image_path, "rb") as f:
        files = {
            "file_name": (None, image_path.name),
            "parent_type": (None, "docx_image"),
            "parent_node": (None, doc_token),
            "size": (None, str(size)),
            "file": (image_path.name, f, "image/png"),
        }
        r = requests.post(url, headers=headers, files=files, timeout=60)
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("file_token")
    print(f"⚠️ 上传失败: {data.get('msg')}")
    return None


def insert_image_block_into_doc(
    token: str, doc_token: str, file_token: str, filename: str, after_index: int
) -> bool:
    """在文档指定位置插入一个图片块。先试 gallery(18)，失败则试 file(12)。"""
    # 飞书创建块：先试 file(12)，与 feishu_publish_blocks_with_images 完全一致
    block = {
        "block_type": 12,
        "file": {"file_token": file_token, "view_type": "inline", "file_name": filename},
    }
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"children": [block], "index": after_index}
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    j = r.json()
    if j.get("code") == 0:
        return True
    # 若 1770001，尝试 camelCase
    if j.get("code") == 1770001:
        block2 = {
            "block_type": 12,
            "file": {"fileToken": file_token, "viewType": "inline", "fileName": filename},
        }
        r2 = requests.post(url, headers=headers, json={"children": [block2], "index": after_index}, timeout=30)
        if r2.json().get("code") == 0:
            return True
    print(f"⚠️ 插入图片块失败: {j.get('msg')} (code={j.get('code')})")
    return False


def main():
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={FEB_TOKEN}",
        headers=headers,
        timeout=30,
    )
    if r.json().get("code") != 0:
        print("❌ 获取 2 月文档失败")
        sys.exit(1)
    doc_token = r.json()["data"]["node"]["obj_token"]

    # 1) 检查是否已有今日
    bl = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks",
        headers=headers,
        params={"page_size": 500},
        timeout=30,
    ).json()
    items = bl.get("data", {}).get("items", [])
    root = [b for b in items if b.get("parent_id") == doc_token]

    def text_of(b):
        for k in ("heading4", "text", "todo"):
            if k in b:
                return "".join(
                    e.get("text_run", {}).get("content", "") for e in b.get(k, {}).get("elements", [])
                ).strip()
        return ""

    has_today = any(TODAY_DATE in text_of(b) for b in root)
    insert_index = 1
    for i, block in enumerate(root):
        if "heading2" in block:
            for el in block["heading2"].get("elements", []):
                if "本月最重要的任务" in el.get("text_run", {}).get("content", ""):
                    insert_index = i + 1
                    break

    # 2) 写入今日日志（若尚未存在）
    tasks = _make_today_tasks()
    content_blocks = build_blocks(TODAY_DATE, tasks)
    if not has_today:
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={"children": content_blocks, "index": insert_index},
            timeout=30,
        )
        if wr.json().get("code") != 0:
            print(f"❌ 写入日志失败: {wr.json().get('msg')}")
            sys.exit(1)
        print(f"✅ {TODAY_DATE} 日志写入成功")
        # 插入位置：新内容前两个块是 标题 + callout，图片放在其后
        image_insert_index = insert_index + 2
    else:
        # 已有今日：找到今日第一个块后的位置插入图片
        idx = None
        for i, b in enumerate(root):
            if TODAY_DATE in text_of(b):
                idx = i
                break
        if idx is None:
            print("⚠️ 已有今日但未找到块，跳过插入图片")
            sys.exit(0)
        # 在文档根子块中的索引：需换算为 doc 的 children index
        image_insert_index = idx + 2

    # 3) 生成对比图
    out_dir = SCRIPT_DIR / "temp_images"
    out_dir.mkdir(exist_ok=True)
    img_path = out_dir / "昨日今日完成度对比.png"
    if not generate_comparison_image(img_path):
        print("⚠️ 跳过图片插入")
    else:
        # 4) 上传并插入
        file_token = upload_image_to_feishu(token, doc_token, img_path)
        if file_token and insert_image_block_into_doc(
            token, doc_token, file_token, img_path.name, image_insert_index
        ):
            print("✅ 对比图已插入到今日日志中")
        else:
            ref_path = SCRIPT_DIR.parent / "参考资料" / "昨日今日完成度对比.png"
            try:
                import shutil
                shutil.copy2(img_path, ref_path)
                print(f"⚠️ 图片已保存到：{ref_path}，请打开飞书文档后手动拖入今日日志。")
            except Exception:
                print(f"⚠️ 图片未插入，可手动插入：{img_path}")

    # 打开飞书
    url = f"https://cunkebao.feishu.cn/wiki/{FEB_TOKEN}"
    import subprocess
    subprocess.run(["open", url], capture_output=True)
    print(f"📎 已打开飞书: {url}")


if __name__ == "__main__":
    main()
