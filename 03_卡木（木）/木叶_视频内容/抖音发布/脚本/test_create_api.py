#!/usr/bin/env python3
"""测试抖音发布接口 - 详细调试"""
import asyncio, json, datetime, random, string, sys, hashlib, hmac, zlib, uuid
from pathlib import Path
import httpx

sys.path.insert(0, str(Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend")))

COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"
BASE = "https://creator.douyin.com"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
VIDEO = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/睡眠不好？每天放下一件事，做减法.mp4"

def load_cookie(path):
    with open(path) as f:
        state = json.load(f)
    return "; ".join(f"{c['name']}={c['value']}" for c in state.get("cookies", []) if "douyin.com" in c.get("domain", ""))

def random_s(n=11):
    return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))

def _hmac(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

def aws4_sign(ak_id, sk, token, region, service, qs):
    now = datetime.datetime.now(datetime.timezone.utc)
    amz = now.strftime("%Y%m%dT%H%M%SZ")
    ds = now.strftime("%Y%m%d")
    ch = f"x-amz-date:{amz}\nx-amz-security-token:{token}\n"
    cr = f"GET\n/\n{qs}\n{ch}\nx-amz-date;x-amz-security-token\n{hashlib.sha256(b'').hexdigest()}"
    scope = f"{ds}/{region}/{service}/aws4_request"
    sts = f"AWS4-HMAC-SHA256\n{amz}\n{scope}\n{hashlib.sha256(cr.encode()).hexdigest()}"
    k = _hmac(_hmac(_hmac(_hmac(("AWS4"+sk).encode(), ds), region), service), "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    auth = f"AWS4-HMAC-SHA256 Credential={ak_id}/{ds}/{region}/{service}/aws4_request, SignedHeaders=x-amz-date;x-amz-security-token, Signature={sig}"
    return auth, amz, token

CHUNK = 3*1024*1024

async def main():
    cookie = load_cookie(COOKIE_FILE)
    print(f"Cookie: {len(cookie)} chars")

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as c:
        # 验证
        r = await c.get(f"{BASE}/web/api/media/user/info/", headers={"Cookie": cookie, "User-Agent": UA})
        d = r.json()
        print(f"用户: {d.get('user_info',{}).get('nickname','?')} (status={d.get('status_code')})")
        if d.get("status_code") != 0:
            print("Cookie无效！"); return

        # Step 1: auth
        r = await c.get(f"{BASE}/web/api/media/upload/auth/v5/", headers={"Cookie": cookie, "User-Agent": UA})
        auth_data = r.json()
        print(f"Auth: status={auth_data.get('status_code')}")
        ak = auth_data["ak"]
        cred = json.loads(auth_data["auth"])

        # Step 2: apply upload
        fs = Path(VIDEO).stat().st_size
        params = {"Action":"ApplyUploadInner","FileSize":str(fs),"FileType":"video","IsInner":"1","SpaceName":"aweme","Version":"2020-11-19","app_id":"2906","s":random_s(),"user_id":""}
        qs = "&".join(f"{k}={v}" for k,v in sorted(params.items()))
        authorization, amz_date, st = aws4_sign(cred["AccessKeyID"], cred["SecretAccessKey"], cred["SessionToken"], "cn-north-1", "vod", qs)
        r = await c.get("https://imagex.bytedanceapi.com/", params=params, headers={"authorization":authorization,"x-amz-date":amz_date,"x-amz-security-token":st,"User-Agent":UA})
        apply = r.json()
        result = apply.get("Result", {})
        
        # 解析上传地址
        inner = result.get("InnerUploadAddress", result)
        nodes = inner.get("UploadNodes", [{}])
        host = nodes[0].get("UploadHost", "") if nodes else ""
        stores = nodes[0].get("StoreInfos", [{}]) if nodes else [{}]
        uri = stores[0].get("StoreUri", "")
        store_auth = stores[0].get("Auth", "")
        session_key = inner.get("SessionKey", "")

        if not host:
            addr = result.get("UploadAddress", {})
            host = addr.get("UploadHosts", [""])[0]
            stores = addr.get("StoreInfos", [{}])
            uri = stores[0].get("StoreUri", "")
            store_auth = stores[0].get("Auth", "")
            session_key = addr.get("SessionKey", "")
        
        print(f"Upload: host={host}, uri={uri[:40]}...")

        # Step 3: upload chunks
        data = Path(VIDEO).read_bytes()
        total = (len(data) + CHUNK - 1) // CHUNK
        uid = str(uuid.uuid4())
        base_url = f"https://{host}/upload/v1/{uri}"
        
        for i in range(total):
            s, e = i*CHUNK, min((i+1)*CHUNK, len(data))
            chunk = data[s:e]
            crc = hex(zlib.crc32(chunk) & 0xFFFFFFFF)[2:]
            r = await c.post(base_url, params={"uploadid":uid,"part_number":str(i+1),"part_offset":str(s),"phase":"transfer"}, content=chunk, headers={"Authorization":store_auth,"Content-CRC32":crc,"Content-Type":"application/octet-stream","User-Agent":UA})
            rd = r.json()
            print(f"  chunk {i+1}/{total}: code={rd.get('code')}")

        # Step 4: 测试多种 create 请求格式
        csrf = ""
        for part in cookie.split(";"):
            kv = part.strip().split("=", 1)
            if len(kv)==2 and kv[0].strip()=="passport_csrf_token":
                csrf = kv[1].strip()

        title = "睡眠不好？每天放下一件事，做减法。#睡眠 #减法 #Soul派对 #生活方式"
        creation_id = f"{random_s(8)}{int(datetime.datetime.now().timestamp()*1000)}"

        # 尝试方式 A: text/plain + form body
        body_a = f"text={title}&text_extra=[]&activity=[]&challenges=[]&hashtag_source=&mentions=[]&ifLongTitle=true&hot_sentence=&visibility_type=0&download=1&poster={uri}&timing=-1&video={{\"uri\":\"{uri}\"}}&creation_id={creation_id}"
        
        headers_base = {
            "Cookie": cookie,
            "User-Agent": UA,
            "Referer": "https://creator.douyin.com/creator-micro/content/publish",
            "Origin": "https://creator.douyin.com",
            "Accept": "application/json, text/plain, */*",
        }
        if csrf:
            headers_base["X-CSRFToken"] = csrf

        print("\n=== 方式A: text/plain ===")
        h = {**headers_base, "Content-Type": "text/plain"}
        r = await c.post(f"{BASE}/web/api/media/aweme/create/", headers=h, content=body_a)
        print(f"  Status: {r.status_code}")
        print(f"  Headers: {dict(r.headers)}")
        print(f"  Body len: {len(r.content)}")
        print(f"  Body: {r.text[:500]}")

        # 尝试方式 B: application/x-www-form-urlencoded
        print("\n=== 方式B: form-urlencoded ===")
        form_data = {
            "text": title,
            "text_extra": "[]",
            "activity": "[]",
            "challenges": "[]",
            "hashtag_source": "",
            "mentions": "[]",
            "ifLongTitle": "true",
            "hot_sentence": "",
            "visibility_type": "0",
            "download": "1",
            "poster": uri,
            "timing": "-1",
            "video": json.dumps({"uri": uri}),
            "creation_id": creation_id,
        }
        h = {**headers_base, "Content-Type": "application/x-www-form-urlencoded"}
        r = await c.post(f"{BASE}/web/api/media/aweme/create/", headers=h, data=form_data)
        print(f"  Status: {r.status_code}")
        print(f"  Headers: {dict(r.headers)}")
        print(f"  Body len: {len(r.content)}")
        print(f"  Body: {r.text[:500]}")

        # 尝试方式 C: application/json
        print("\n=== 方式C: application/json ===")
        h = {**headers_base, "Content-Type": "application/json"}
        r = await c.post(f"{BASE}/web/api/media/aweme/create/", headers=h, json=form_data)
        print(f"  Status: {r.status_code}")
        print(f"  Headers: {dict(r.headers)}")
        print(f"  Body len: {len(r.content)}")
        print(f"  Body: {r.text[:500]}")

        # 尝试方式 D: 不同的 URL (post instead of create)
        print("\n=== 方式D: /aweme/v1/web/aweme/post/ ===")
        r = await c.post(f"{BASE}/aweme/v1/web/aweme/post/", headers={**headers_base, "Content-Type": "application/json"}, json=form_data)
        print(f"  Status: {r.status_code}")
        print(f"  Body len: {len(r.content)}")
        print(f"  Body: {r.text[:500]}")

asyncio.run(main())
