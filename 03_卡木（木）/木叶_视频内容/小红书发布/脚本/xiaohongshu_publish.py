#!/usr/bin/env python3
"""
小红书纯 API 视频发布（无浏览器）
逆向小红书创作者中心内部 API，Cookie 认证后全程 HTTP 操作。

流程:
  1. 从 storage_state.json 加载 cookies
  2. GET  获取上传 token
  3. POST 上传视频到 CDN
  4. POST 创建视频笔记
"""
import asyncio
import hashlib
import json
import os
import sys
import time
import uuid
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "xiaohongshu_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from cookie_manager import CookieManager
from video_utils import extract_cover, extract_cover_bytes

CREATOR_HOST = "https://creator.xiaohongshu.com"
EDITH_HOST = "https://edith.xiaohongshu.com"
CUSTOMER_HOST = "https://customer.xiaohongshu.com"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律 是因为老婆还在睡 创业人最真实的起床理由",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱 关键就三个词 动作简单有利可图正反馈",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期别急着找钱 先找两个IS型人格 ENFJ链接人ENTJ指挥",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多 活着就要在互联网上留下东西",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI 40岁以后该学五行八卦了",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客AI切片小程序变现 全链路拆给你看",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑有多快 半小时出10到30条 内容工厂效率密码",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 碎片时间才是生产力",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经其实不难 两小时学个七七八八 跟古人对话",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通终于能投Soul了 1000曝光只要6到10块",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的 发三个月邮件拿下德国总代理",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字筛选 能坚持7天的人才值得深聊",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是因为太累 是脑子里装太多 每天做减法",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系 前端几十块就能参与",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年 前端就丢个手机号",
}


def _build_headers(cookies: CookieManager) -> dict:
    return {
        "Cookie": cookies.cookie_str,
        "User-Agent": UA,
        "Referer": "https://creator.xiaohongshu.com/",
        "Origin": "https://creator.xiaohongshu.com",
        "Content-Type": "application/json",
    }


async def check_login(client: httpx.AsyncClient, cookies: CookieManager) -> dict:
    """检查登录状态"""
    url = f"{CREATOR_HOST}/api/galaxy/creator/home/personal_info"
    resp = await client.get(url, headers=_build_headers(cookies))
    try:
        data = resp.json()
        if data.get("code") == 0 or data.get("success"):
            return data.get("data", data)
    except Exception:
        pass
    return {}


async def get_upload_token(client: httpx.AsyncClient, cookies: CookieManager, count: int = 1) -> dict:
    """获取上传凭证"""
    print("  [1] 获取上传凭证...")
    url = f"{CREATOR_HOST}/api/media/v1/upload/web/token"
    body = {"biz_name": "spectrum", "scene": "creator_center", "file_count": count, "version": 1}
    resp = await client.post(url, json=body, headers=_build_headers(cookies), timeout=15.0)
    data = resp.json()
    if data.get("code") != 0 and not data.get("success"):
        url2 = f"{CREATOR_HOST}/api/galaxy/creator/data/upload/token"
        resp2 = await client.post(url2, json=body, headers=_build_headers(cookies), timeout=15.0)
        data = resp2.json()
    print(f"      凭证: {json.dumps(data, ensure_ascii=False)[:200]}")
    return data


async def upload_video(
    client: httpx.AsyncClient, cookies: CookieManager,
    upload_info: dict, file_path: str
) -> str:
    """上传视频文件到小红书 CDN"""
    print("  [2] 上传视频...")
    token_data = upload_info.get("data", upload_info)
    upload_url = token_data.get("uploadUrl", token_data.get("upload_url", ""))
    upload_token = token_data.get("uploadToken", token_data.get("upload_token", ""))
    file_id = token_data.get("fileIds", token_data.get("file_ids", [""]))[0] if \
        token_data.get("fileIds", token_data.get("file_ids")) else str(uuid.uuid4())

    if not upload_url:
        upload_url = f"{CREATOR_HOST}/api/media/v1/upload/web/video"

    raw = Path(file_path).read_bytes()
    fname = Path(file_path).name
    content_type = "video/mp4"

    if upload_token:
        resp = await client.post(
            upload_url,
            files={"file": (fname, raw, content_type)},
            data={"token": upload_token, "file_id": file_id},
            headers={
                "Cookie": cookies.cookie_str,
                "User-Agent": UA,
                "Referer": "https://creator.xiaohongshu.com/",
            },
            timeout=300.0,
        )
    else:
        resp = await client.post(
            upload_url,
            files={"file": (fname, raw, content_type)},
            headers={
                "Cookie": cookies.cookie_str,
                "User-Agent": UA,
                "Referer": "https://creator.xiaohongshu.com/",
            },
            timeout=300.0,
        )

    try:
        data = resp.json()
        vid = data.get("data", {}).get("fileId", data.get("data", {}).get("file_id", file_id))
        print(f"      视频 ID: {vid}")
        return vid
    except Exception:
        print(f"      上传响应: {resp.status_code} {resp.text[:200]}")
        return file_id


async def upload_cover_image(
    client: httpx.AsyncClient, cookies: CookieManager, cover_path: str
) -> str:
    """上传封面图片"""
    if not cover_path or not Path(cover_path).exists():
        return ""
    print("  [*] 上传封面...")
    url = f"{CREATOR_HOST}/api/media/v1/upload/web/image"
    with open(cover_path, "rb") as f:
        img_data = f.read()
    resp = await client.post(
        url,
        files={"file": ("cover.jpg", img_data, "image/jpeg")},
        headers={
            "Cookie": cookies.cookie_str,
            "User-Agent": UA,
            "Referer": "https://creator.xiaohongshu.com/",
        },
        timeout=30.0,
    )
    try:
        data = resp.json()
        cover_id = data.get("data", {}).get("fileId", "")
        if cover_id:
            print(f"      封面 ID: {cover_id}")
        return cover_id
    except Exception:
        return ""


async def create_note(
    client: httpx.AsyncClient, cookies: CookieManager,
    title: str, video_id: str, cover_id: str = "",
    tags: list = None,
) -> dict:
    """创建视频笔记"""
    print("  [3] 创建视频笔记...")
    url = f"{CREATOR_HOST}/api/galaxy/creator/note/publish"

    if tags is None:
        tags = ["Soul派对", "创业", "认知觉醒", "副业思维"]

    body = {
        "title": title[:20],
        "desc": title,
        "note_type": "video",
        "video_id": video_id,
        "post_time": "",
        "ats": [],
        "topics": [{"name": t} for t in tags[:5]],
        "is_private": False,
    }
    if cover_id:
        body["cover"] = {"file_id": cover_id}

    resp = await client.post(url, json=body, headers=_build_headers(cookies), timeout=30.0)
    data = resp.json() if resp.status_code == 200 else {}
    print(f"      响应: {json.dumps(data, ensure_ascii=False)[:300]}")
    return data


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1) -> bool:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {fname}")
    print(f"  大小: {fsize/1024/1024:.1f}MB")
    print(f"  标题: {title[:60]}")
    print(f"{'='*60}")

    try:
        cookies = CookieManager(COOKIE_FILE, "xiaohongshu.com")
        if not cookies.is_valid():
            print("  [✗] Cookie 已过期，请重新运行 xiaohongshu_login.py")
            return False

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            user = await check_login(client, cookies)
            if not user:
                print("  [✗] Cookie 无效，请重新登录")
                return False

            cover_path = extract_cover(video_path)

            upload_info = await get_upload_token(client, cookies)
            video_id = await upload_video(client, cookies, upload_info, video_path)
            if not video_id:
                print("  [✗] 视频上传失败")
                return False

            cover_id = await upload_cover_image(client, cookies, cover_path) if cover_path else ""
            result = await create_note(client, cookies, title, video_id, cover_id)

            code = result.get("code", -1)
            if code == 0 or result.get("success"):
                print(f"  [✓] 发布成功！")
                return True
            else:
                print(f"  [✗] 发布失败: code={code}")
                return False

    except Exception as e:
        print(f"  [✗] 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 xiaohongshu_login.py")
        return 1

    cookies = CookieManager(COOKIE_FILE, "xiaohongshu.com")
    expiry = cookies.check_expiry()
    print(f"[i] Cookie 状态: {expiry['message']}")

    async with httpx.AsyncClient(timeout=15.0) as c:
        user = await check_login(c, cookies)
        if not user:
            print("[✗] Cookie 无效")
            return 1
        print(f"[✓] 已登录\n")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频\n")

    results = []
    for i, vp in enumerate(videos):
        title = TITLES.get(vp.name, f"{vp.stem}")
        ok = await publish_one(str(vp), title, i + 1, len(videos))
        results.append((vp.name, ok))
        if i < len(videos) - 1:
            await asyncio.sleep(8)

    print(f"\n{'='*60}")
    print("  小红书发布汇总")
    print(f"{'='*60}")
    for name, ok in results:
        print(f"  [{'✓' if ok else '✗'}] {name}")
    success = sum(1 for _, ok in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
