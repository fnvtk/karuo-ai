#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
银掌柜（yzg.quwanzhi.com）→ kr 宝塔：本地打包 → 腾讯云 COS 上传 → TAT 在 CVM 内下载解压 → npm build → 重启 3081/8100

全程以腾讯云 API 为主（COS PutObject + TAT RunCommand），不依赖本机 SSH/rsync。

前置：
  - 凭证：环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY，或 卡若AI「00_账号与API索引.md」§ 腾讯云
  - pip install cos-python-sdk-v5 tencentcloud-sdk-python-tat
  - COS：优先环境变量 YINZHANGUI_COS_BUCKET；未设则尝试 ListBuckets 自动选第一个桶（需子账号有 cos:GetService）
  - 地域：YINZHANGUI_COS_REGION，默认与 CVM 一致 ap-guangzhou

用法：
  python3 腾讯云_COS_TAT_银掌柜上传部署.py              # 全量
  python3 腾讯云_COS_TAT_银掌柜上传部署.py --dry-run    # 仅本地打 tar，不上传
  python3 腾讯云_COS_TAT_银掌柜上传部署.py --tat-url 'https://...'  # 已上传到 COS，只下发 TAT（URL 须公网可拉取）
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# kr 宝塔 CVM（与现有 TAT 脚本一致）
KR_INSTANCE_ID = os.environ.get("YINZHANGUI_CVM_INSTANCE_ID", "ins-aw0tnqjo")
REGION = os.environ.get("YINZHANGUI_COS_REGION", "ap-guangzhou")

# 线上解压目录
REMOTE_ROOT = "/www/wwwroot/self/yzg/yinzhangui"


def _find_karuo_ai_root() -> Path | None:
    d = Path(__file__).resolve().parent
    for _ in range(12):
        if d.name == "卡若AI" or ((d / "运营中枢").is_dir() and (d / "01_卡资（金）").is_dir()):
            return d
        d = d.parent
    return None


def _read_tencent_creds() -> tuple[str | None, str | None]:
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if sid and skey:
        return sid, skey
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    idx = root / "运营中枢" / "工作台" / "00_账号与API索引.md"
    if not idx.is_file():
        return None, None
    text = idx.read_text(encoding="utf-8")
    in_tx = False
    sid = skey = None
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tx = True
            continue
        if in_tx and line.strip().startswith("###"):
            break
        if not in_tx:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid, skey


def _default_src_dir() -> Path:
    env = os.environ.get("YINZHANGUI_SRC_DIR", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    root = Path.home() / "Documents" / "开发" / "4、合作项目" / "银掌柜小程序"
    if root.is_dir():
        return root.resolve()
    # 相对卡若AI 旁的开发目录
    k = _find_karuo_ai_root()
    if k:
        cand = k.parent / "开发" / "4、合作项目" / "银掌柜小程序"
        if cand.is_dir():
            return cand.resolve()
    return root


def _make_tarball(src: Path) -> Path:
    api = src / "api"
    admin = src / "admin"
    if not api.is_dir() or not admin.is_dir():
        raise SystemExit(f"源码目录缺少 api/ 或 admin/: {src}")
    tmp = Path(tempfile.gettempdir()) / f"yinzhangui_cos_{int(time.time())}.tar.gz"
    # 在源码根目录打包 api、admin，解压到 REMOTE_ROOT 时覆盖对应目录
    cmd = [
        "tar",
        "-czf",
        str(tmp),
        "--exclude=venv",
        "--exclude=venv311",
        "--exclude=.venv",
        "--exclude=__pycache__",
        "--exclude=node_modules",
        "--exclude=.next",
        "--exclude=.git",
        "-C",
        str(src),
        "api",
        "admin",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"tar 失败: {r.stderr or r.stdout}")
    return tmp


def _pick_bucket(sid: str, skey: str) -> str:
    b = os.environ.get("YINZHANGUI_COS_BUCKET", "").strip()
    if b:
        return b
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        raise SystemExit("未设置 YINZHANGUI_COS_BUCKET 且未安装 cos-python-sdk-v5，请 pip install cos-python-sdk-v5")
    cfg = CosConfig(Region=REGION, SecretId=sid, SecretKey=skey, Scheme="https")
    svc = CosS3Client(cfg)
    resp = svc.list_buckets()
    raw = (resp or {}).get("Buckets") or {}
    buckets = raw.get("Bucket") or []
    if isinstance(buckets, dict):
        buckets = [buckets]
    if not buckets:
        raise SystemExit(
            "账号下无 COS 桶。请在控制台创建桶后设置环境变量 YINZHANGUI_COS_BUCKET=桶名-APPID"
        )
    # 优先非 serverless 临时桶
    pref = [b for b in buckets if "wordpress-serverless" not in (b.get("Name") or "")]
    if pref:
        buckets = pref
    name = buckets[0].get("Name")
    if not name:
        raise SystemExit("ListBuckets 返回异常")
    print(f"  未指定 YINZHANGUI_COS_BUCKET，自动使用首个桶: {name}")
    return name


def _upload_cos(local_path: Path, bucket: str, sid: str, skey: str) -> tuple[str, str]:
    from qcloud_cos import CosConfig, CosS3Client

    key = f"deploy/yinzhangui/{int(time.time())}_{local_path.name}"
    cfg = CosConfig(Region=REGION, SecretId=sid, SecretKey=skey, Scheme="https")
    client = CosS3Client(cfg)
    with open(local_path, "rb") as f:
        client.put_object(Bucket=bucket, Body=f, Key=key, EnableMD5=False)
    # 预签名 GET，供 CVM wget（私有桶也可）
    url = client.get_presigned_url(Method="GET", Bucket=bucket, Key=key, Expired=3600)
    return key, url


def _delete_cos_object(bucket: str, key: str, sid: str, skey: str) -> None:
    try:
        from qcloud_cos import CosConfig, CosS3Client

        cfg = CosConfig(Region=REGION, SecretId=sid, SecretKey=skey, Scheme="https")
        CosS3Client(cfg).delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass


def _tat_shell(presigned_url: str) -> str:
    # base64 不含引号，用双引号包一层传给 bash
    url_b64 = base64.b64encode(presigned_url.encode()).decode()
    rr = REMOTE_ROOT
    return f"""#!/bin/bash
set -euo pipefail
B64="{url_b64}"
URL="$(echo "$B64" | base64 -d)"
TMP=/tmp/yinzhangui_cos_deploy.tgz
echo "=== 银掌柜 COS+TAT 部署 ==="
curl -fsSL "$URL" -o "$TMP"
cd {rr}
# 保留线上 api/.env
if [ -f api/.env ]; then cp -a api/.env /tmp/yzg_api_env.bak; fi
tar xzf "$TMP"
if [ -f /tmp/yzg_api_env.bak ]; then mv /tmp/yzg_api_env.bak api/.env; fi
rm -f "$TMP"
chown -R www:www {rr}/api {rr}/admin || true

export PATH=/www/server/nodejs/v22.14.0/bin:/usr/local/bin:/usr/bin:/bin
echo "=== npm ci + build admin ==="
su -s /bin/bash www -c "cd {rr}/admin && npm ci --no-audit --no-fund && npm run build"

echo "=== 重启 3081 / 8100 ==="
fuser -k 3081/tcp 2>/dev/null || true
fuser -k 8100/tcp 2>/dev/null || true
sleep 2
su -s /bin/bash www -c "cd {rr}/admin && export PATH=/www/server/nodejs/v22.14.0/bin:\\$PATH && nohup bash start.sh >> /www/wwwlogs/yzg-admin.nohup.log 2>&1 &"
sleep 2
su -s /bin/bash www -c "cd {rr}/api && nohup ./venv/bin/python main.py >> /www/wwwlogs/yzg-api.nohup.log 2>&1 &"
sleep 3
ss -tlnp | grep -E ':3081|:8100' || true
/www/server/nginx/sbin/nginx -t 2>/dev/null && /www/server/nginx/sbin/nginx -s reload 2>/dev/null || true
echo "=== 完成 ==="
"""


def _run_tat(shell_text: str, timeout: int = 600) -> str:
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        raise SystemExit("请安装: pip install tencentcloud-sdk-python-tat")

    sid, skey = _read_tencent_creds()
    if not sid or not skey:
        raise SystemExit("未配置腾讯云 SecretId/SecretKey")

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell_text.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = timeout
    req.CommandName = "yinzhangui_cos_deploy"
    resp = client.RunCommand(req)
    inv = resp.InvocationId
    print(f"✅ TAT 已下发 InvocationId={inv}，等待执行（约 2～5 分钟）…")
    time.sleep(90)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name = "invocation-id"
    f.Values = [inv]
    req2.Filters = [f]
    out = []
    for _ in range(24):
        r2 = client.DescribeInvocationTasks(req2)
        tasks = r2.InvocationTaskSet or []
        for t in tasks:
            st = getattr(t, "TaskStatus", "")
            op = getattr(t, "Output", "") or ""
            out.append(f"状态: {st}\n{op[:8000]}")
        if tasks and all(getattr(t, "TaskStatus", "") in ("SUCCESS", "FAILED", "TIMEOUT") for t in tasks):
            break
        time.sleep(10)
    return "\n".join(out) if out else "(无任务输出，请到控制台 TAT 查看)"


def main() -> int:
    ap = argparse.ArgumentParser(description="银掌柜：COS 上传 + TAT 部署到 kr 宝塔")
    ap.add_argument("--dry-run", action="store_true", help="仅打 tar 包，不上传、不下发 TAT")
    ap.add_argument(
        "--tat-url",
        default="",
        help="已可公网下载的包 URL（含签名的 COS URL），跳过打包与上传，仅 TAT",
    )
    ap.add_argument("--src", default="", help="银掌柜小程序根目录（含 api、admin）")
    args = ap.parse_args()

    src = Path(args.src).expanduser().resolve() if args.src.strip() else _default_src_dir()
    print("=" * 60)
    print("  银掌柜 · 腾讯云 COS + TAT 上传部署")
    print("=" * 60)
    print(f"  源码: {src}")
    print(f"  CVM:  {KR_INSTANCE_ID} / {REGION}")
    print(f"  远端: {REMOTE_ROOT}")
    print("=" * 60)

    sid, skey = _read_tencent_creds()
    if not sid or not skey:
        print("❌ 未找到腾讯云凭证")
        return 1

    presigned = args.tat_url.strip()
    cos_key = None
    bucket = None

    if presigned:
        shell = _tat_shell(presigned)
    else:
        tar_path = _make_tarball(src)
        print(f"  本地包: {tar_path} ({tar_path.stat().st_size // 1024} KB)")
        if args.dry_run:
            print("  --dry-run：结束")
            return 0
        bucket = _pick_bucket(sid, skey)
        cos_key, presigned = _upload_cos(tar_path, bucket, sid, skey)
        print(f"  COS: s3://{bucket}/{cos_key}")
        print("  预签名 URL 已生成（1h 有效）")
        try:
            tar_path.unlink(missing_ok=True)
        except OSError:
            pass
        shell = _tat_shell(presigned)

    if args.dry_run and not presigned:
        return 0

    print(_run_tat(shell, timeout=900))

    if cos_key and bucket and os.environ.get("YINZHANGUI_COS_DELETE_AFTER", "").strip() in ("1", "true", "yes"):
        _delete_cos_object(bucket, cos_key, sid, skey)
        print("  已删除 COS 临时对象")

    print("\n  验证: curl -sI https://yzg.quwanzhi.com/ | head -3")
    print("        curl -s https://yzg.quwanzhi.com/api/products | head -c 200")
    return 0


if __name__ == "__main__":
    sys.exit(main())
