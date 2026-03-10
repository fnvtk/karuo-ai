#!/usr/bin/env python3
"""
视频号纯 API 视频发布（无浏览器）
基于推兔逆向分析: finder-assistant 腾讯云上传接口

流程:
  1. 从 storage_state.json 加载 cookies
  2. POST applyuploaddfs       → 获取上传参数（UploadID、分片信息）
  3. POST uploadpartdfs        → 分片上传
  4. POST completepartuploaddfs → 完成上传
  5. POST 发布/创建视频号动态
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
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from cookie_manager import CookieManager
from video_utils import extract_cover, extract_cover_bytes

FINDER_HOST = "https://finder-assistant.mp.video.tencent-cloud.com"
CHANNELS_HOST = "https://channels.weixin.qq.com"
CHUNK_SIZE = 3 * 1024 * 1024

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

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


def _build_headers(cookies: CookieManager) -> dict:
    return {
        "Cookie": cookies.cookie_str,
        "User-Agent": UA,
        "Referer": "https://channels.weixin.qq.com/",
        "Origin": "https://channels.weixin.qq.com",
    }


async def check_login(client: httpx.AsyncClient, cookies: CookieManager) -> dict:
    """检查登录状态"""
    url = f"{CHANNELS_HOST}/cgi-bin/mmfinderassistant-bin/helper/helper_upload_params"
    resp = await client.post(url, headers=_build_headers(cookies), json={})
    try:
        data = resp.json()
        if data.get("base_resp", {}).get("ret") == 0:
            return data
    except Exception:
        pass

    url2 = f"{CHANNELS_HOST}/cgi-bin/mmfinderassistant-bin/helper/helper_search_finder"
    resp2 = await client.post(url2, headers=_build_headers(cookies), json={"query": ""})
    try:
        data2 = resp2.json()
        return data2 if data2.get("base_resp", {}).get("ret") == 0 else {}
    except Exception:
        return {}


async def apply_upload(
    client: httpx.AsyncClient, cookies: CookieManager,
    filename: str, filesize: int, filetype: str = "video"
) -> dict:
    """申请上传 DFS"""
    print("  [1] 申请上传...")
    url = f"{FINDER_HOST}/applyuploaddfs"
    body = {
        "fileName": filename,
        "fileSize": filesize,
        "fileType": filetype,
    }
    resp = await client.post(url, json=body, headers=_build_headers(cookies), timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    if data.get("ret") != 0 and data.get("code") != 0 and "UploadID" not in str(data):
        raise RuntimeError(f"applyuploaddfs 失败: {data}")
    upload_id = data.get("UploadID", data.get("uploadId", ""))
    print(f"      UploadID={upload_id[:30] if upload_id else 'N/A'}...")
    return data


async def upload_parts(
    client: httpx.AsyncClient, cookies: CookieManager,
    upload_id: str, file_path: str
) -> bool:
    """分片上传"""
    print("  [2] 分片上传...")
    raw = Path(file_path).read_bytes()
    total = len(raw)
    n_chunks = (total + CHUNK_SIZE - 1) // CHUNK_SIZE

    for i in range(n_chunks):
        start = i * CHUNK_SIZE
        end = min(start + CHUNK_SIZE, total)
        chunk = raw[start:end]

        url = f"{FINDER_HOST}/uploadpartdfs?PartNumber={i+1}&UploadID={upload_id}"
        resp = await client.post(
            url,
            content=chunk,
            headers={
                **_build_headers(cookies),
                "Content-Type": "application/octet-stream",
            },
            timeout=120.0,
        )
        if resp.status_code not in (200, 204):
            print(f"      chunk {i+1}/{n_chunks} 失败: {resp.status_code} {resp.text[:200]}")
            return False
        print(f"      chunk {i+1}/{n_chunks} ok ({len(chunk)/1024:.0f}KB)")

    return True


async def complete_upload(
    client: httpx.AsyncClient, cookies: CookieManager, upload_id: str
) -> dict:
    """完成上传"""
    print("  [3] 完成上传...")
    url = f"{FINDER_HOST}/completepartuploaddfs?UploadID={upload_id}"
    resp = await client.post(url, headers=_build_headers(cookies), json={}, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    print(f"      完成: {json.dumps(data, ensure_ascii=False)[:200]}")
    return data


async def publish_post(
    client: httpx.AsyncClient, cookies: CookieManager,
    title: str, media_id: str = "", file_key: str = "",
    cover_url: str = "",
) -> dict:
    """发布视频号动态"""
    print("  [4] 发布动态...")
    url = f"{CHANNELS_HOST}/cgi-bin/mmfinderassistant-bin/helper/helper_video_publish"

    body = {
        "postDesc": title,
        "mediaList": [{
            "mediaType": 9,
            "mediaId": media_id,
            "fileKey": file_key,
        }],
    }
    if cover_url:
        body["coverUrl"] = cover_url

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
        cookies = CookieManager(COOKIE_FILE, "weixin.qq.com")
        if not cookies.is_valid():
            print("  [✗] Cookie 已过期，请重新运行 channels_login.py")
            return False

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            login_check = await check_login(client, cookies)
            if not login_check:
                print("  [✗] Cookie 无效，请重新登录")
                return False

            apply_data = await apply_upload(client, cookies, fname, fsize)
            upload_id = apply_data.get("UploadID", apply_data.get("uploadId", ""))
            if not upload_id:
                print("  [✗] 未获取到 UploadID")
                return False

            if not await upload_parts(client, cookies, upload_id, video_path):
                print("  [✗] 上传失败")
                return False

            complete_data = await complete_upload(client, cookies, upload_id)
            media_id = complete_data.get("mediaId", complete_data.get("media_id", ""))
            file_key = complete_data.get("fileKey", complete_data.get("file_key", upload_id))

            result = await publish_post(client, cookies, title, media_id, file_key)

            ret = result.get("base_resp", {}).get("ret", -1)
            if ret == 0:
                print(f"  [✓] 发布成功！")
                return True
            else:
                print(f"  [✗] 发布失败: ret={ret}")
                return False

    except Exception as e:
        print(f"  [✗] 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 channels_login.py")
        return 1

    cookies = CookieManager(COOKIE_FILE, "weixin.qq.com")
    expiry = cookies.check_expiry()
    print(f"[i] Cookie 状态: {expiry['message']}")

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
    print("  视频号发布汇总")
    print(f"{'='*60}")
    for name, ok in results:
        print(f"  [{'✓' if ok else '✗'}] {name}")
    success = sum(1 for _, ok in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
