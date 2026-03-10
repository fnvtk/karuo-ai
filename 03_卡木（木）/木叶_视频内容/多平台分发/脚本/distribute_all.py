#!/usr/bin/env python3
"""
多平台一键分发 - 将成片目录下的视频同时发布到 5 个平台
支持: 抖音、B站、视频号、小红书、快手

用法:
  python3 distribute_all.py                        # 分发到所有已登录平台
  python3 distribute_all.py --platforms 抖音 B站    # 只分发到指定平台
  python3 distribute_all.py --check                # 只检查 Cookie 状态
  python3 distribute_all.py --video /path/to.mp4   # 分发单条视频
"""
import argparse
import asyncio
import importlib.util
import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent.parent
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR))
from cookie_manager import CookieManager, check_all_cookies

PLATFORM_CONFIG = {
    "抖音": {
        "script": BASE_DIR / "抖音发布" / "脚本" / "douyin_pure_api.py",
        "cookie": BASE_DIR / "抖音发布" / "脚本" / "douyin_storage_state.json",
        "domain": "douyin.com",
        "module": "douyin_pure_api",
    },
    "B站": {
        "script": BASE_DIR / "B站发布" / "脚本" / "bilibili_publish.py",
        "cookie": BASE_DIR / "B站发布" / "脚本" / "bilibili_storage_state.json",
        "domain": "bilibili.com",
        "module": "bilibili_publish",
    },
    "视频号": {
        "script": BASE_DIR / "视频号发布" / "脚本" / "channels_publish.py",
        "cookie": BASE_DIR / "视频号发布" / "脚本" / "channels_storage_state.json",
        "domain": "weixin.qq.com",
        "module": "channels_publish",
    },
    "小红书": {
        "script": BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_publish.py",
        "cookie": BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_storage_state.json",
        "domain": "xiaohongshu.com",
        "module": "xiaohongshu_publish",
    },
    "快手": {
        "script": BASE_DIR / "快手发布" / "脚本" / "kuaishou_publish.py",
        "cookie": BASE_DIR / "快手发布" / "脚本" / "kuaishou_storage_state.json",
        "domain": "kuaishou.com",
        "module": "kuaishou_publish",
    },
}


def check_cookies():
    """检查所有平台 Cookie 状态"""
    print("=" * 60)
    print("  多平台 Cookie 状态")
    print("=" * 60)
    results = check_all_cookies(BASE_DIR)
    available = []
    for platform, info in results.items():
        icons = {"ok": "✓", "warning": "⚠", "expiring_soon": "⚠", "expired": "✗", "missing": "○", "error": "✗"}
        icon = icons.get(info["status"], "?")
        print(f"  [{icon}] {platform}: {info['message']}")
        if info["status"] in ("ok", "warning"):
            available.append(platform)
    print(f"\n  可用平台: {', '.join(available) if available else '无'}")
    return available


def load_platform_module(name: str, config: dict):
    """动态加载平台发布模块"""
    script_path = config["script"]
    if not script_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(config["module"], str(script_path))
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(script_path.parent))
    spec.loader.exec_module(module)
    return module


async def distribute_to_platform(platform: str, config: dict, videos: list) -> dict:
    """分发到单个平台"""
    print(f"\n{'#'*60}")
    print(f"  开始分发到 [{platform}]")
    print(f"{'#'*60}")

    cookie_path = config["cookie"]
    if not cookie_path.exists():
        print(f"  [✗] {platform} 未登录，跳过")
        return {"platform": platform, "status": "skipped", "reason": "未登录"}

    try:
        cm = CookieManager(cookie_path, config["domain"])
        if not cm.is_valid():
            print(f"  [✗] {platform} Cookie 已过期，跳过")
            return {"platform": platform, "status": "skipped", "reason": "Cookie过期"}
    except Exception as e:
        print(f"  [✗] {platform} Cookie 加载失败: {e}")
        return {"platform": platform, "status": "error", "reason": str(e)}

    module = load_platform_module(platform, config)
    if not module:
        print(f"  [✗] {platform} 脚本不存在: {config['script']}")
        return {"platform": platform, "status": "error", "reason": "脚本不存在"}

    success = 0
    total = len(videos)
    for i, vp in enumerate(videos):
        title = getattr(module, "TITLES", {}).get(vp.name, f"{vp.stem} #Soul派对")
        try:
            ok = await module.publish_one(str(vp), title, i + 1, total)
            if ok:
                success += 1
        except Exception as e:
            print(f"  [✗] {vp.name} 异常: {e}")
        if i < total - 1:
            await asyncio.sleep(3)

    return {
        "platform": platform,
        "status": "done",
        "success": success,
        "total": total,
    }


async def main():
    parser = argparse.ArgumentParser(description="多平台一键视频分发")
    parser.add_argument("--platforms", nargs="+", help="指定平台（默认全部已登录平台）")
    parser.add_argument("--check", action="store_true", help="只检查 Cookie 状态")
    parser.add_argument("--video", help="分发单条视频")
    parser.add_argument("--video-dir", help="自定义视频目录")
    args = parser.parse_args()

    available = check_cookies()

    if args.check:
        return 0

    if not available:
        print("\n[✗] 没有可用的平台，请先登录各平台")
        print("    抖音: python3 ../抖音发布/脚本/douyin_login.py")
        print("    B站:  python3 ../B站发布/脚本/bilibili_login.py")
        print("    视频号: python3 ../视频号发布/脚本/channels_login.py")
        print("    小红书: python3 ../小红书发布/脚本/xiaohongshu_login.py")
        print("    快手: python3 ../快手发布/脚本/kuaishou_login.py")
        return 1

    targets = args.platforms if args.platforms else available
    targets = [t for t in targets if t in available]

    if not targets:
        print(f"\n[✗] 指定的平台均不可用")
        return 1

    video_dir = Path(args.video_dir) if args.video_dir else VIDEO_DIR
    if args.video:
        videos = [Path(args.video)]
    else:
        videos = sorted(video_dir.glob("*.mp4"))

    if not videos:
        print(f"\n[✗] 未找到视频: {video_dir}")
        return 1

    print(f"\n{'='*60}")
    print(f"  分发计划")
    print(f"{'='*60}")
    print(f"  视频数: {len(videos)}")
    print(f"  目标平台: {', '.join(targets)}")
    print(f"  总任务: {len(videos) * len(targets)} 条")
    print()

    all_results = []
    for platform in targets:
        config = PLATFORM_CONFIG[platform]
        result = await distribute_to_platform(platform, config, videos)
        all_results.append(result)

    print(f"\n\n{'='*60}")
    print(f"  多平台分发汇总")
    print(f"{'='*60}")
    for r in all_results:
        if r["status"] == "done":
            print(f"  [{r['platform']}] 成功 {r['success']}/{r['total']}")
        elif r["status"] == "skipped":
            print(f"  [{r['platform']}] 跳过 ({r['reason']})")
        else:
            print(f"  [{r['platform']}] 错误 ({r.get('reason', '未知')})")

    total_success = sum(r.get("success", 0) for r in all_results if r["status"] == "done")
    total_tasks = sum(r.get("total", 0) for r in all_results if r["status"] == "done")
    print(f"\n  总计: {total_success}/{total_tasks}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
