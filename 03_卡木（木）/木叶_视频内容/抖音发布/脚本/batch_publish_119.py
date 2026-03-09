#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
119 场成片批量发布到抖音。
- 读取成片目录与发布清单，逐条调用 douyin_publish.py。
- 若未配置 tokens.json，只打印发布清单并提示先 OAuth 登录。
与「抖音发布」Skill 配套；成片目录见 119场_抖音发布清单.md。
"""

import json
import subprocess
import sys
from pathlib import Path

# 119 场成片目录（可按需改为环境变量或参数）
DEFAULT_Chengpian = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

# 视频文件名 -> 发布标题（与 119场_抖音发布清单.md 一致）
TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4": "早起不是为了开派对，是不吵老婆睡觉。初衷就这一个。#Soul派对 #创业日记 #晨间直播 #私域干货",
    "懒人的活法 动作简单有利可图正反馈.mp4": "懒有懒的活法：动作简单、有利可图、正反馈，就能坐得住。#Soul派对 #副业 #私域 #切片变现",
}


def main():
    script_dir = Path(__file__).resolve().parent
    token_file = script_dir / "tokens.json"
    if not token_file.exists():
        print("未配置 tokens.json，无法调用抖音开放平台 API。")
        print("请先完成抖音 OAuth 登录，将 access_token、open_id 写入：")
        print(f"  {token_file}")
        print("参见：参考资料/抖音开放平台_登录与发布流程.md")
        print("\n本批次发布清单（可复制到抖音或卡罗维亚等工具）：")
        for fname, title in TITLES.items():
            p = DEFAULT_Chengpian / fname
            print(f"  - {fname}")
            print(f"    标题: {title[:60]}...")
        return 1

    chengpian = DEFAULT_Chengpian
    if not chengpian.exists():
        print(f"成片目录不存在: {chengpian}", file=sys.stderr)
        return 1

    publish_py = script_dir / "douyin_publish.py"
    if not publish_py.exists():
        print(f"未找到 douyin_publish.py: {publish_py}", file=sys.stderr)
        return 1

    ok, fail = 0, 0
    for fname, title in TITLES.items():
        video_path = chengpian / fname
        if not video_path.exists():
            print(f"跳过（文件不存在）: {fname}")
            fail += 1
            continue
        cmd = [
            sys.executable,
            str(publish_py),
            "--video", str(video_path),
            "--title", title,
            "--token-file", str(token_file),
        ]
        ret = subprocess.run(cmd)
        if ret.returncode == 0:
            ok += 1
        else:
            fail += 1

    print(f"\n发布完成: 成功 {ok}，失败 {fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
