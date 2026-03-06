#!/usr/bin/env python3
"""
全自动：先获取 TOKEN，再上传今日飞书日志（含配图）。
按卡若AI 飞书 Skill 流程：get-access-token → write_today_with_summary。
使用：python3 feishu_today_full_auto.py
"""
import sys
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def main():
    # 1. 全自动获取 access_token
    r1 = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "feishu_token_cli.py"), "get-access-token"],
        cwd=str(SCRIPT_DIR),
        capture_output=True,
        text=True,
        timeout=20,
    )
    if r1.returncode != 0:
        print("❌ 获取 access_token 失败")
        print(r1.stderr or r1.stdout)
        return 1
    print("✅ access_token 已获取并写入")

    # 2. 上传今日日志（内部会尝试自动获取 3 月 wiki token，并写入+配图）
    r2 = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "write_today_with_summary.py")],
        cwd=str(SCRIPT_DIR),
        timeout=40,
    )
    if r2.returncode != 0:
        print("⚠️ 今日日志上传未成功（若为 3 月，请用 feishu_token_cli.py set-march-token <token> 写入 3 月文档 token 后重试）")
        return 1
    print("✅ 今日飞书日志已写入（含进度汇总与配图）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
