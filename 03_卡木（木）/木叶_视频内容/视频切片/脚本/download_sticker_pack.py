#!/usr/bin/env python3
"""下载基础 emoji 贴片库（Twemoji 72x72 PNG）。"""

from pathlib import Path
from urllib.request import urlopen

OUT_DIR = Path(__file__).resolve().parents[1] / "贴片库" / "emoji_png_72"
BASE = "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72"
CODES = [
    "1f4b0", "1f4b8", "1f911", "1f525", "2728",
    "1f4a1", "1f9e0", "1f680", "1f4c8", "1f3af",
    "26a0", "1f6a8", "1f973", "1f44f", "1f60e",
    "1f389", "1f44d", "1f4af", "1f31f", "1f381",
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for code in CODES:
        url = f"{BASE}/{code}.png"
        out = OUT_DIR / f"{code}.png"
        try:
            with urlopen(url, timeout=20) as r:
                data = r.read()
            out.write_bytes(data)
            ok += 1
            print(f"✓ {code}")
        except Exception as e:
            print(f"✗ {code} {e}")
    print(f"done: {ok}/{len(CODES)} -> {OUT_DIR}")


if __name__ == "__main__":
    main()

