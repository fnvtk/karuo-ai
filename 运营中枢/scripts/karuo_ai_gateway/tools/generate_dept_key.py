#!/usr/bin/env python3
"""
生成“部门/科室”的 API Key（明文只输出一次）并给出写入 gateway.yaml 的 sha256。

用法：
  export KARUO_GATEWAY_SALT="your-long-random-salt"
  python tools/generate_dept_key.py --tenant-id finance --tenant-name "财务科"
"""

from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import sys


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", required=True, help="tenant id, e.g. finance")
    parser.add_argument("--tenant-name", default="", help='tenant name, e.g. "财务科"')
    parser.add_argument(
        "--key",
        default="",
        help="可选：自定义明文 key（不建议）。为空则自动生成。",
    )
    parser.add_argument(
        "--salt-env",
        default="KARUO_GATEWAY_SALT",
        help="salt 的环境变量名，默认 KARUO_GATEWAY_SALT",
    )
    args = parser.parse_args()

    salt = os.environ.get(args.salt_env, "")
    if not salt:
        print(f"[ERROR] 未读取到 salt 环境变量：{args.salt_env}", file=sys.stderr)
        print("建议：export KARUO_GATEWAY_SALT=\"一个足够长的随机字符串\"", file=sys.stderr)
        return 2

    dept_key = args.key or secrets.token_urlsafe(32)
    key_hash = sha256_hex(dept_key + salt)

    # 明文 key 只输出一次；请在生成后立即给到部门系统的安全配置里。
    print("tenant:")
    print(f"  id: {args.tenant_id}")
    if args.tenant_name:
        print(f"  name: {args.tenant_name}")
    print("")
    print("dept_key (plaintext, show once):")
    print(dept_key)
    print("")
    print("api_key_sha256 (write into gateway.yaml):")
    print(key_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

