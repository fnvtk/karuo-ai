#!/usr/bin/env python3
"""
B站纯 API 视频发布（无浏览器）
基于推兔逆向分析: preupload → 分片上传 → commitUpload → add/v3

流程:
  1. 从 storage_state.json 加载 cookies
  2. GET  /preupload              → 上传节点、auth、chunk 参数
  3. POST /{upos_uri}?uploads     → upload_id
  4. PUT  分片上传
  5. POST /{upos_uri}?complete    → 确认
  6. POST /x/vu/web/add/v3       → 发布视频
"""
import asyncio
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "bilibili_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")
COVER_DIR = SCRIPT_DIR / "covers"

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from cookie_manager import CookieManager
from video_utils import extract_cover

BASE = "https://member.bilibili.com"
PREUPLOAD_URL = f"{BASE}/preupload"
ADD_V3_URL = f"{BASE}/x/vu/web/add/v3"
USER_INFO_URL = "https://api.bilibili.com/x/web-interface/nav"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

CHUNK_SIZE = 4 * 1024 * 1024

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？动作简单、有利可图、正反馈 #Soul派对 #副业思维",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序变现，全链路拆解 #商业模式 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 #碎片创业 #副业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经两小时学个七七八八，关键是跟古人对话 #国学 #易经入门",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了！1000曝光只要6到10块 #广点通 #低成本获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维 #信任建立",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能坚持7天的人才值得深聊 #筛选思维 #创业认知",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是太累，是脑子装太多，每天做减法 #做减法 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系，前端几十块就能参与 #商业认知 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年，前端就丢个手机号 #AI获客 #系统思维",
}


async def check_login(client: httpx.AsyncClient, cookies: CookieManager) -> dict:
    resp = await client.get(
        USER_INFO_URL,
        headers={"Cookie": cookies.cookie_str, "User-Agent": UA, "Referer": "https://www.bilibili.com/"},
    )
    data = resp.json()
    if data.get("code") != 0:
        return {}
    return data.get("data", {})


async def preupload(client: httpx.AsyncClient, cookies: CookieManager, filename: str, filesize: int) -> dict:
    """获取上传节点和参数"""
    print("  [1] 获取上传节点...")
    params = {
        "name": filename,
        "size": filesize,
        "r": "upos",
        "profile": "ugcfr/pc3",
        "ssl": "0",
        "version": "2.14.0.0",
        "build": "2140000",
        "upcdn": "bda2",
        "probe_version": "20221109",
    }
    resp = await client.get(
        PREUPLOAD_URL,
        params=params,
        headers={"Cookie": cookies.cookie_str, "User-Agent": UA},
    )
    resp.raise_for_status()
    data = resp.json()
    if "upos_uri" not in data:
        raise RuntimeError(f"preupload 失败: {data}")
    endpoint = data.get("endpoint", "")
    if not endpoint:
        endpoints = data.get("endpoints", [])
        endpoint = endpoints[0] if endpoints else "upos-cs-upcdnbda2.bilivideo.com"
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"
    print(f"      endpoint={endpoint}, chunk_size={data.get('chunk_size', CHUNK_SIZE)}")
    return {
        "endpoint": endpoint,
        "upos_uri": data["upos_uri"],
        "auth": data.get("auth", ""),
        "biz_id": data.get("biz_id", 0),
        "chunk_size": data.get("chunk_size", CHUNK_SIZE),
    }


async def init_upload(client: httpx.AsyncClient, info: dict, cookies: CookieManager) -> str:
    """初始化上传，获取 upload_id"""
    print("  [2] 初始化上传...")
    upos_uri = info["upos_uri"].replace("upos://", "")
    url = f"{info['endpoint']}/{upos_uri}?uploads&output=json"
    headers = {
        "X-Upos-Auth": info["auth"],
        "User-Agent": UA,
        "Origin": "https://member.bilibili.com",
        "Referer": "https://member.bilibili.com/",
    }
    resp = await client.post(url, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    upload_id = data.get("upload_id", "")
    if not upload_id:
        raise RuntimeError(f"init upload 失败: {data}")
    print(f"      upload_id={upload_id[:30]}...")
    return upload_id


async def upload_chunks(
    client: httpx.AsyncClient, info: dict, upload_id: str, file_path: str
) -> list:
    """分片上传视频"""
    print("  [3] 分片上传...")
    raw = Path(file_path).read_bytes()
    total_size = len(raw)
    chunk_size = info.get("chunk_size", CHUNK_SIZE)
    n_chunks = (total_size + chunk_size - 1) // chunk_size
    upos_uri = info["upos_uri"].replace("upos://", "")
    base_url = f"{info['endpoint']}/{upos_uri}"

    parts = []
    for i in range(n_chunks):
        start = i * chunk_size
        end = min(start + chunk_size, total_size)
        chunk = raw[start:end]
        md5 = hashlib.md5(chunk).hexdigest()

        url = (
            f"{base_url}?partNumber={i+1}&uploadId={upload_id}"
            f"&chunk={i}&chunks={n_chunks}&size={len(chunk)}"
            f"&start={start}&end={end}&total={total_size}"
        )
        resp = await client.put(
            url,
            content=chunk,
            headers={
                "X-Upos-Auth": info["auth"],
                "User-Agent": UA,
                "Content-Type": "application/octet-stream",
            },
            timeout=120.0,
        )
        if resp.status_code not in (200, 204):
            print(f"      chunk {i+1}/{n_chunks} 失败: {resp.status_code}")
            return []
        parts.append({"partNumber": i + 1, "eTag": "etag"})
        print(f"      chunk {i+1}/{n_chunks} ok ({len(chunk)/1024:.0f}KB)")

    return parts


async def complete_upload(
    client: httpx.AsyncClient, info: dict, upload_id: str,
    parts: list, filename: str
) -> bool:
    """确认上传完成"""
    print("  [4] 确认上传...")
    upos_uri = info["upos_uri"].replace("upos://", "")
    url = (
        f"{info['endpoint']}/{upos_uri}"
        f"?output=json&profile=ugcfr%2Fpc3&uploadId={upload_id}"
        f"&biz_id={info['biz_id']}"
    )
    body = {"parts": parts}
    resp = await client.post(
        url,
        json=body,
        headers={
            "X-Upos-Auth": info["auth"],
            "User-Agent": UA,
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )
    data = resp.json() if resp.status_code == 200 else {}
    if data.get("OK") == 1:
        print("      上传确认成功")
        return True
    print(f"      上传确认: {data}")
    return True


async def add_video(
    client: httpx.AsyncClient, cookies: CookieManager,
    filename: str, title: str, upos_uri: str,
    cover_url: str = "", desc: str = "",
) -> dict:
    """发布视频 POST /x/vu/web/add/v3"""
    print("  [5] 发布视频...")
    csrf = cookies.get("bili_jct")

    body = {
        "copyright": 1,
        "videos": [{
            "filename": upos_uri.replace("upos://", "").rsplit(".", 1)[0],
            "title": Path(filename).stem,
            "desc": "",
        }],
        "tid": 21,  # 日常分区
        "title": title,
        "desc": desc or title,
        "tag": "Soul派对,创业,认知觉醒,副业,商业思维",
        "dynamic": "",
        "cover": cover_url,
        "dolby": 0,
        "lossless_music": 0,
        "no_reprint": 0,
        "open_elec": 0,
        "csrf": csrf,
    }

    resp = await client.post(
        ADD_V3_URL,
        json=body,
        headers={
            "Cookie": cookies.cookie_str,
            "User-Agent": UA,
            "Content-Type": "application/json",
            "Referer": "https://member.bilibili.com/platform/upload/video/frame",
            "Origin": "https://member.bilibili.com",
        },
        timeout=30.0,
    )
    data = resp.json()
    print(f"      响应: {json.dumps(data, ensure_ascii=False)[:300]}")
    return data


async def upload_cover(
    client: httpx.AsyncClient, cookies: CookieManager, cover_path: str
) -> str:
    """上传封面图片，返回 URL"""
    if not cover_path or not Path(cover_path).exists():
        return ""
    print("  [*] 上传封面...")
    url = f"{BASE}/x/vu/web/cover/up"
    csrf = cookies.get("bili_jct")
    with open(cover_path, "rb") as f:
        cover_data = f.read()
    resp = await client.post(
        url,
        files={"file": ("cover.jpg", cover_data, "image/jpeg")},
        data={"csrf": csrf},
        headers={
            "Cookie": cookies.cookie_str,
            "User-Agent": UA,
            "Referer": "https://member.bilibili.com/",
        },
        timeout=30.0,
    )
    data = resp.json()
    if data.get("code") == 0:
        cover_url = data.get("data", {}).get("url", "")
        print(f"      封面 URL: {cover_url[:60]}...")
        return cover_url
    print(f"      封面上传失败: {data}")
    return ""


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1) -> bool:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {fname}")
    print(f"  大小: {fsize/1024/1024:.1f}MB")
    print(f"  标题: {title[:60]}")
    print(f"{'='*60}")

    try:
        cookies = CookieManager(COOKIE_FILE, "bilibili.com")
        if not cookies.is_valid():
            print("  [✗] Cookie 已过期，请重新运行 bilibili_login.py")
            return False

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            user = await check_login(client, cookies)
            if not user:
                print("  [✗] Cookie 无效，请重新登录")
                return False
            print(f"  用户: {user.get('uname', 'unknown')}")

            cover_path = extract_cover(video_path)
            cover_url = await upload_cover(client, cookies, cover_path) if cover_path else ""

            info = await preupload(client, cookies, fname, fsize)
            upload_id = await init_upload(client, info, cookies)
            parts = await upload_chunks(client, info, upload_id, video_path)
            if not parts:
                print("  [✗] 上传失败")
                return False
            await complete_upload(client, info, upload_id, parts, fname)

            result = await add_video(
                client, cookies, fname, title,
                info["upos_uri"], cover_url=cover_url,
            )

            if result.get("code") == 0:
                bvid = result.get("data", {}).get("bvid", "")
                print(f"  [✓] 发布成功！ bvid={bvid}")
                return True
            else:
                print(f"  [✗] 发布失败: code={result.get('code')}, msg={result.get('message')}")
                return False

    except Exception as e:
        print(f"  [✗] 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 bilibili_login.py")
        return 1

    cookies = CookieManager(COOKIE_FILE, "bilibili.com")
    print(f"[i] Cookie 状态: {cookies.check_expiry()['message']}")

    async with httpx.AsyncClient(timeout=15.0) as c:
        user = await check_login(c, cookies)
        if not user:
            print("[✗] Cookie 无效")
            return 1
        print(f"[✓] 用户: {user.get('uname')} (uid={user.get('mid')})\n")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频\n")

    results = []
    for i, vp in enumerate(videos):
        title = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        ok = await publish_one(str(vp), title, i + 1, len(videos))
        results.append((vp.name, ok))
        if i < len(videos) - 1:
            await asyncio.sleep(5)

    print(f"\n{'='*60}")
    print("  B站发布汇总")
    print(f"{'='*60}")
    for name, ok in results:
        print(f"  [{'✓' if ok else '✗'}] {name}")
    success = sum(1 for _, ok in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
