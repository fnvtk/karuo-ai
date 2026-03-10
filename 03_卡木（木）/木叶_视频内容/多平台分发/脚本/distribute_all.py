#!/usr/bin/env python3
"""
多平台一键分发 v2 — 全链路自动化
- 并行分发：5 平台同时上传（asyncio.gather）
- 去重机制：已成功发布的视频自动跳过
- 失败重试：--retry 自动重跑历史失败任务
- Cookie 预警：过期/即将过期自动通知
- 智能标题：优先手动字典，否则文件名自动生成
- 结果持久化：JSON Lines 日志 + 控制台汇总

用法:
  python3 distribute_all.py                        # 并行分发到所有平台
  python3 distribute_all.py --platforms B站 快手     # 只发指定平台
  python3 distribute_all.py --check                # 检查 Cookie
  python3 distribute_all.py --retry                # 重试失败任务
  python3 distribute_all.py --video /path/to.mp4   # 发单条视频
  python3 distribute_all.py --no-dedup             # 跳过去重检查
  python3 distribute_all.py --serial               # 串行模式（调试用）
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
DEFAULT_VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR))
from cookie_manager import CookieManager, check_all_cookies
from publish_result import (PublishResult, print_summary, save_results,
                            load_published_set, load_failed_tasks)
from title_generator import generate_title

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

_module_cache = {}


def check_cookies_with_alert() -> tuple[list[str], list[str]]:
    """检查 Cookie 并返回 (可用平台, 告警消息)"""
    print("=" * 60)
    print("  多平台 Cookie 状态")
    print("=" * 60)
    results = check_all_cookies(BASE_DIR)
    available = []
    alerts = []
    for platform, info in results.items():
        icons = {"ok": "✓", "warning": "⚠", "expiring_soon": "⚠",
                 "expired": "✗", "missing": "○", "error": "✗"}
        icon = icons.get(info["status"], "?")
        print(f"  [{icon}] {platform}: {info['message']}")
        if info["status"] in ("ok", "warning"):
            available.append(platform)
        if info["status"] == "expiring_soon":
            alerts.append(f"⚠ {platform} Cookie 即将过期: {info['message']}")
        elif info["status"] == "expired":
            alerts.append(f"✗ {platform} Cookie 已过期，需重新登录")
        elif info["status"] == "warning":
            hrs = info.get("remaining_hours", -1)
            if 0 < hrs < 12:
                alerts.append(f"⚠ {platform} Cookie 剩余 {hrs}h，建议刷新")
    print(f"\n  可用平台: {', '.join(available) if available else '无'}")
    if alerts:
        print(f"\n  ⚠ Cookie 预警:")
        for a in alerts:
            print(f"    {a}")
    return available, alerts


def send_feishu_alert(alerts: list[str]):
    """通过飞书 Webhook 发送 Cookie 过期预警"""
    import os
    webhook = os.environ.get("FEISHU_WEBHOOK_URL", "")
    if not webhook or not alerts:
        return
    try:
        import requests
        body = {
            "msg_type": "text",
            "content": {
                "text": "【多平台分发 Cookie 预警】\n" + "\n".join(alerts)
            }
        }
        requests.post(webhook, json=body, timeout=10)
        print("  [i] 飞书预警已发送")
    except Exception as e:
        print(f"  [⚠] 飞书通知失败: {e}")


def load_platform_module(name: str, config: dict):
    if name in _module_cache:
        return _module_cache[name]
    script_path = config["script"]
    if not script_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(config["module"], str(script_path))
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(script_path.parent))
    spec.loader.exec_module(module)
    _module_cache[name] = module
    return module


async def distribute_to_platform(
    platform: str, config: dict, videos: list[Path],
    published_set: set, skip_dedup: bool = False,
) -> list[PublishResult]:
    """分发到单个平台（含去重）"""
    print(f"\n{'#'*60}")
    print(f"  [{platform}] 开始分发")
    print(f"{'#'*60}")

    cookie_path = config["cookie"]
    if not cookie_path.exists():
        print(f"  [{platform}] ✗ 未登录，跳过")
        return [PublishResult(platform=platform, video_path=str(v), title="",
                             success=False, status="error",
                             message="未登录", error_code="NOT_LOGGED_IN") for v in videos]

    try:
        cm = CookieManager(cookie_path, config["domain"])
        if not cm.is_valid():
            print(f"  [{platform}] ✗ Cookie 已过期，跳过")
            return [PublishResult(platform=platform, video_path=str(v), title="",
                                 success=False, status="error",
                                 message="Cookie过期", error_code="COOKIE_EXPIRED") for v in videos]
    except Exception as e:
        return [PublishResult(platform=platform, video_path=str(v), title="",
                             success=False, status="error", message=str(e)) for v in videos]

    module = load_platform_module(platform, config)
    if not module:
        return [PublishResult(platform=platform, video_path=str(v), title="",
                             success=False, status="error", message="脚本不存在") for v in videos]

    titles_dict = getattr(module, "TITLES", {})
    to_publish = []
    skipped = []

    for vp in videos:
        key = (platform, vp.name)
        if not skip_dedup and key in published_set:
            skipped.append(vp)
        else:
            to_publish.append(vp)

    if skipped:
        print(f"  [{platform}] 跳过 {len(skipped)} 条已发布视频（去重）")

    results = []
    for s in skipped:
        results.append(PublishResult(
            platform=platform, video_path=str(s),
            title=generate_title(s.name, titles_dict),
            success=True, status="skipped", message="去重跳过（已发布）",
        ))

    total = len(to_publish)
    for i, vp in enumerate(to_publish):
        title = generate_title(vp.name, titles_dict)
        try:
            r = await module.publish_one(str(vp), title, i + 1, total)
            if isinstance(r, PublishResult):
                results.append(r)
            else:
                results.append(PublishResult(
                    platform=platform, video_path=str(vp), title=title,
                    success=bool(r), status="reviewing" if r else "failed",
                    message="旧接口兼容",
                ))
        except Exception as e:
            results.append(PublishResult(
                platform=platform, video_path=str(vp), title=title,
                success=False, status="error", message=str(e)[:80],
            ))
        if i < total - 1:
            await asyncio.sleep(3)

    return results


async def run_parallel(targets: list[str], videos: list[Path],
                       published_set: set, skip_dedup: bool) -> list[PublishResult]:
    """多平台并行分发"""
    tasks = []
    for platform in targets:
        config = PLATFORM_CONFIG[platform]
        task = distribute_to_platform(platform, config, videos, published_set, skip_dedup)
        tasks.append(task)

    platform_results = await asyncio.gather(*tasks, return_exceptions=True)

    all_results = []
    for i, res in enumerate(platform_results):
        if isinstance(res, Exception):
            for v in videos:
                all_results.append(PublishResult(
                    platform=targets[i], video_path=str(v), title="",
                    success=False, status="error", message=str(res)[:80],
                ))
        else:
            all_results.extend(res)
    return all_results


async def run_serial(targets: list[str], videos: list[Path],
                     published_set: set, skip_dedup: bool) -> list[PublishResult]:
    """多平台串行分发（调试用）"""
    all_results = []
    for platform in targets:
        config = PLATFORM_CONFIG[platform]
        results = await distribute_to_platform(platform, config, videos, published_set, skip_dedup)
        all_results.extend(results)
    return all_results


async def retry_failed() -> list[PublishResult]:
    """重试历史失败任务"""
    failed = load_failed_tasks()
    if not failed:
        print("[i] 无失败任务需要重试")
        return []

    print(f"\n{'='*60}")
    print(f"  失败任务重试")
    print(f"{'='*60}")
    print(f"  待重试: {len(failed)} 条")

    results = []
    for task in failed:
        platform = task.get("platform", "")
        video_path = task.get("video_path", "")
        title = task.get("title", "")

        if platform not in PLATFORM_CONFIG:
            continue
        if not Path(video_path).exists():
            print(f"  [✗] 视频不存在: {video_path}")
            continue

        config = PLATFORM_CONFIG[platform]
        module = load_platform_module(platform, config)
        if not module:
            continue

        print(f"\n  [{platform}] 重试: {Path(video_path).name}")
        try:
            r = await module.publish_one(video_path, title, 1, 1)
            if isinstance(r, PublishResult):
                results.append(r)
            else:
                results.append(PublishResult(
                    platform=platform, video_path=video_path, title=title,
                    success=bool(r), status="reviewing" if r else "failed",
                ))
        except Exception as e:
            results.append(PublishResult(
                platform=platform, video_path=video_path, title=title,
                success=False, status="error", message=str(e)[:80],
            ))
        await asyncio.sleep(3)

    return results


async def main():
    parser = argparse.ArgumentParser(description="多平台一键视频分发 v2")
    parser.add_argument("--platforms", nargs="+", help="指定平台")
    parser.add_argument("--check", action="store_true", help="只检查 Cookie")
    parser.add_argument("--retry", action="store_true", help="重试失败任务")
    parser.add_argument("--video", help="分发单条视频")
    parser.add_argument("--video-dir", help="自定义视频目录")
    parser.add_argument("--no-dedup", action="store_true", help="跳过去重")
    parser.add_argument("--serial", action="store_true", help="串行模式")
    args = parser.parse_args()

    available, alerts = check_cookies_with_alert()
    if alerts:
        send_feishu_alert(alerts)

    if args.check:
        return 0

    if args.retry:
        results = await retry_failed()
        if results:
            print_summary(results)
            save_results(results)
        return 0

    if not available:
        print("\n[✗] 没有可用平台，请先登录:")
        for p, c in PLATFORM_CONFIG.items():
            login = str(c["script"]).replace("publish", "login").replace("pure_api", "login")
            print(f"    {p}: python3 {login}")
        return 1

    targets = args.platforms if args.platforms else available
    targets = [t for t in targets if t in available]
    if not targets:
        print("\n[✗] 指定的平台均不可用")
        return 1

    video_dir = Path(args.video_dir) if args.video_dir else DEFAULT_VIDEO_DIR
    if args.video:
        videos = [Path(args.video)]
    else:
        videos = sorted(video_dir.glob("*.mp4"))
    if not videos:
        print(f"\n[✗] 未找到视频: {video_dir}")
        return 1

    published_set = set() if args.no_dedup else load_published_set()

    mode = "串行" if args.serial else "并行"
    total_new = 0
    for p in targets:
        for v in videos:
            if (p, v.name) not in published_set:
                total_new += 1

    print(f"\n{'='*60}")
    print(f"  分发计划 ({mode})")
    print(f"{'='*60}")
    print(f"  视频数: {len(videos)}")
    print(f"  目标平台: {', '.join(targets)}")
    print(f"  新任务: {total_new} 条")
    if not args.no_dedup:
        skipped = len(videos) * len(targets) - total_new
        if skipped > 0:
            print(f"  去重跳过: {skipped} 条")
    print()

    if total_new == 0:
        print("[i] 所有视频已发布到所有平台，无新任务")
        return 0

    t0 = time.time()
    if args.serial:
        all_results = await run_serial(targets, videos, published_set, args.no_dedup)
    else:
        all_results = await run_parallel(targets, videos, published_set, args.no_dedup)

    actual_results = [r for r in all_results if r.status != "skipped"]
    print_summary(actual_results)
    save_results(actual_results)

    ok = sum(1 for r in actual_results if r.success)
    total = len(actual_results)
    elapsed = time.time() - t0
    print(f"  总耗时: {elapsed:.1f}s  |  日志: {SCRIPT_DIR / 'publish_log.json'}")

    failed_count = total - ok
    if failed_count > 0:
        print(f"\n  有 {failed_count} 条失败，可执行: python3 distribute_all.py --retry")

    return 0 if ok == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
