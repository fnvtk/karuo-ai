#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT → kr 宝塔机内写入「面板 API 接口」IP 白名单（追加一行，不删旧 IP）。

原理：宝塔将白名单存在 /www/server/panel/config/api.json 的 limit_addr 列表
（与 aaPanel class/config set_token t_type=3 一致）。在**本机**用外网 API 无法在未加白
时调用面板改白名单，故通过 **TAT 在 CVM 上改文件**，无需先加白。

前置：
  - 腾讯云凭证：`运营中枢/工作台/00_账号与API索引.md` 或
    TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY
  - pip: tencentcloud-sdk-python-tat
  - kr 实例已安装 TAT agent（与同目录其他 TAT_kr宝塔_* 脚本一致）

用法：
  python3 腾讯云_TAT_kr宝塔_API白名单_追加出口IP.py              # 自动探测本机公网 IPv4
  python3 腾讯云_TAT_kr宝塔_API白名单_追加出口IP.py --ip 1.2.3.4
  python3 腾讯云_TAT_kr宝塔_API白名单_追加出口IP.py --dry-run

注意：Cursor / 代理 / 多线路下「探测到的出口 IP」可能与「实际访问 43.139.27.93:9988 的 IP」不一致。
若宝塔仍报 IP 校验失败，请用**报错括号里的 IP** 再执行：`--ip 该地址`。
www.lkdie.com 的 `kr宝塔_API_清理并推送lkdie_track.py --ensure-api-whitelist` 会自动用报错 IP 调本脚本。
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"
API_JSON = "/www/server/panel/config/api.json"


def _find_karuo_root() -> str | None:
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(8):
        if os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）")):
            return d
        d = os.path.dirname(d)
    return None


def _read_tencent_creds() -> tuple[str | None, str | None]:
    root = _find_karuo_root()
    if not root:
        return os.environ.get("TENCENTCLOUD_SECRET_ID"), os.environ.get("TENCENTCLOUD_SECRET_KEY")
    p = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(p):
        return os.environ.get("TENCENTCLOUD_SECRET_ID"), os.environ.get("TENCENTCLOUD_SECRET_KEY")
    sid = skey = None
    in_t = False
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            if "### 腾讯云" in line:
                in_t = True
                continue
            if in_t and line.strip().startswith("###"):
                break
            if not in_t:
                continue
            m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
            if m and m.group(1).strip().startswith("AKID"):
                sid = m.group(1).strip()
            m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
            if m:
                skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")


def fetch_public_ipv4() -> str | None:
    for url in (
        "https://api.ipify.org",
        "https://icanhazip.com",
        "https://ifconfig.me/ip",
    ):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "karuo-bt-whitelist/1.0"})
            with urllib.request.urlopen(req, timeout=12) as r:
                raw = r.read().decode("utf-8", errors="replace").strip()
            m = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})", raw)
            if m:
                return m.group(1)
        except Exception:
            continue
    return None


def build_remote_shell(new_ip: str) -> str:
    # 仅允许 IPv4，防注入
    if not re.fullmatch(r"(?:\d{1,3}\.){3}\d{1,3}", new_ip):
        raise ValueError("invalid ipv4")
    return r"""set -e
NEW_IP="%s"
API_JSON="%s"
export NEW_IP API_JSON
echo "=== kr宝塔 追加 API 白名单 IP: $NEW_IP ==="
if [[ ! -f "$API_JSON" ]]; then
  echo "❌ 未找到 $API_JSON"
  exit 1
fi
BT_PY="/www/server/panel/pyenv/bin/python3"
[[ -x "$BT_PY" ]] || BT_PY="python3"
"$BT_PY" << 'PY'
import json, os, sys
new_ip = os.environ["NEW_IP"]
path = os.environ["API_JSON"]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
la = data.get("limit_addr") or []
if isinstance(la, str):
    la = [x.strip() for x in la.replace(",", "\n").split("\n") if x.strip()]
if not isinstance(la, list):
    la = []
if new_ip in la:
    print("已存在，跳过:", new_ip)
    sys.exit(0)
la.append(new_ip)
data["limit_addr"] = la
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
os.chmod(path, 0o600)
print("已追加 limit_addr:", new_ip)
print("当前列表:", la)
PY
if command -v bt >/dev/null 2>&1; then
  bt reload 2>/dev/null || true
fi
/etc/init.d/bt reload 2>/dev/null || true
echo "=== DONE ==="
""" % (
        new_ip,
        API_JSON,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="TAT 在 kr 宝塔内追加面板 API IP 白名单")
    ap.add_argument("--ip", help="要追加的公网 IPv4（默认自动探测本机出口）")
    ap.add_argument("--dry-run", action="store_true", help="只打印将下发的 IP 与脚本摘要")
    args = ap.parse_args()

    ip = (args.ip or "").strip() or fetch_public_ipv4()
    if not ip:
        print("❌ 无法取得公网 IP，请手动指定: --ip x.x.x.x", file=sys.stderr)
        return 1
    if not re.fullmatch(r"(?:\d{1,3}\.){3}\d{1,3}", ip):
        print("❌ 非法 IPv4:", ip, file=sys.stderr)
        return 1

    if args.dry_run:
        print("[dry-run] 将追加 IP:", ip)
        print("[dry-run] 实例:", KR_INSTANCE_ID, REGION)
        return 0

    sid, skey = _read_tencent_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云 SecretId/SecretKey", file=sys.stderr)
        return 1

    cmd = build_remote_shell(ip)
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import models, tat_client
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-tat", file=sys.stderr)
        return 1

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(cmd.encode("utf-8")).decode("ascii")
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "KR_BT_API_WHITELIST_APPEND"

    print("下发 TAT →", KR_INSTANCE_ID, "| 追加 IP:", ip)
    resp = client.RunCommand(req)
    inv = resp.InvocationId
    time.sleep(18)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        flt = models.Filter()
        flt.Name = "invocation-id"
        flt.Values = [inv]
        req2.Filters = [flt]
        r2 = client.DescribeInvocationTasks(req2)
        for t in r2.InvocationTaskSet or []:
            tr = getattr(t, "TaskResult", None)
            if not tr:
                continue
            try:
                jj = json.loads(tr) if isinstance(tr, str) else tr
                out = jj.get("Output", "")
                if out:
                    try:
                        out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except Exception:
                        pass
                    print(out[:4000])
            except Exception:
                print(str(tr)[:800])
    except Exception as e:
        print("查询任务输出:", e)

    print("\n✅ 已下发。请在本机执行宝塔 API 脚本验证（如 kr宝塔_API_清理并推送lkdie_track.py --ping）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
