#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用「万推」的腕推方案 + 浏览器 Cookie，在命令行发布本地视频到抖音创作者中心。

设计目标：
- 不再依赖抖音开放平台 OAuth，而是复用万推中已经验证过的 Cookie 发布逻辑。
- 作为「抖音发布」Skill 的第二条路径：优先用 OAuth，失败或不用时，可切到 Cookie 模式。

前置要求：
1. 已在万推项目中完成环境准备：
   - 路径：/Users/karuo/Documents/开发/3、自营项目/万推
   - 后端依赖：`cd backend && pip install -r requirements.txt`
   - 通过万推的 Cookie 工具拿到一份可用的抖音 Cookie 字符串（或 JSON），
     存到本目录下 `douyin_cookie.txt`，或者导出为浏览器的 `Cookie Editor` JSON 也可以。
2. 当前脚本所在目录为抖音发布 Skill 的脚本目录：
   /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音发布/脚本

使用方式（例）：

  python3 publish_via_wantui_cookie.py \\
    --video "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/早起不是为了开派对，是不吵老婆睡觉.mp4" \\
    --title "早起不是为了开派对，是不吵老婆睡觉。初衷就这一个。#Soul派对 #创业日记 #晨间直播 #私域干货" \\
    --tags "Soul派对,创业日记,晨间直播,私域干货"

Cookie 读取优先级：
1) 环境变量 DOUYIN_BROWSER_COOKIE
2) 当前目录 douyin_cookie.txt
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List


ROOT_WANTUI_BACKEND = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend")


def ensure_import_path() -> None:
    """将万推 backend 加入 sys.path，方便直接复用 social_publisher 逻辑。"""
    backend_path = str(ROOT_WANTUI_BACKEND)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)


def load_cookie_text() -> str:
    """从环境变量或本地文件加载抖音 Cookie 字符串。"""
    env_cookie = os.environ.get("DOUYIN_BROWSER_COOKIE")
    if env_cookie:
        return env_cookie.strip()

    cookie_file = Path(__file__).parent / "douyin_cookie.txt"
    if cookie_file.exists():
        return cookie_file.read_text(encoding="utf-8").strip()

    raise SystemExit(
        "未找到抖音浏览器 Cookie。\n"
        "请先：\n"
        "1) 将浏览器中的抖音 Cookie 复制为一整行 `key=value; key2=value2; ...`，写入本目录 douyin_cookie.txt；\n"
        "   或者：\n"
        "2) 导出为 JSON（Cookie Editor 导出的数组），同样写入 douyin_cookie.txt；\n"
        "   或设置环境变量 DOUYIN_BROWSER_COOKIE。\n"
    )


def parse_tags(s: str | None) -> List[str]:
    if not s:
        return []
    # 支持逗号或空格分隔
    raw = [p.strip() for p in s.replace("，", ",").split(",") if p.strip()]
    tags: List[str] = []
    for item in raw:
        if item.startswith("#"):
            item = item.lstrip("#").strip()
        if item:
            tags.append(item)
    return tags


async def publish_once(
    video_path: str,
    title: str,
    desc: str,
    tags_str: str | None,
) -> int:
    """调用万推的 publish_video_with_cookie，在抖音创作者中心发布一条视频。"""
    ensure_import_path()

    try:
        from social_publisher import publish_video_with_cookie
    except Exception as e:  # pragma: no cover - 导入错误直接终止
        raise SystemExit(
            f"无法导入万推 backend.social_publisher：{e}\n"
            f"请确认路径是否存在：{ROOT_WANTUI_BACKEND}"
        )

    cookie_text = load_cookie_text()
    tags = parse_tags(tags_str)

    result = await publish_video_with_cookie(
        platform="douyin",
        video_path=video_path,
        title=title,
        cookies=cookie_text,
        tags=tags,
        description=desc or "",
    )

    if not result.get("success"):
        err = result.get("error") or "unknown_error"
        print(f"发布失败：{err}", file=sys.stderr)
        return 1

    print("发布成功：", result.get("message", "抖音创作者中心已创建任务"))
    if result.get("platform_url"):
        print("作品链接：", result["platform_url"])
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="使用万推腕推方案 + 浏览器 Cookie，将本地视频发布到抖音创作者中心"
    )
    parser.add_argument("--video", required=True, help="本地视频文件路径（.mp4）")
    parser.add_argument("--title", required=True, help="视频标题")
    parser.add_argument(
        "--desc",
        default="",
        help="视频描述/正文（可选）",
    )
    parser.add_argument(
        "--tags",
        default="",
        help="话题标签列表，用英文逗号分隔，例如：'Soul派对,创业日记,晨间直播'",
    )

    args = parser.parse_args()

    video_path = os.path.expanduser(args.video)
    if not os.path.isfile(video_path):
        print(f"视频文件不存在：{video_path}", file=sys.stderr)
        return 1

    import asyncio

    return asyncio.run(
        publish_once(
            video_path=video_path,
            title=args.title,
            desc=args.desc,
            tags_str=args.tags,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())

