#!/usr/bin/env python3
"""
批量写入小程序运营数据到飞书运营报表（小程序访问行）。
- 读取 soul_party_to_feishu_sheet 中的 MINIPROGRAM_EXTRA
- 逐个日期调用 write_miniprogram_to_sheet，填入「小程序访问」「访客」「交易金额」
用法：python3 write_miniprogram_batch.py
"""
import os
import subprocess
import sys

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, FEISHU_SCRIPT_DIR)
from soul_party_to_feishu_sheet import MINIPROGRAM_EXTRA


def main():
    if not MINIPROGRAM_EXTRA:
        print('MINIPROGRAM_EXTRA 为空，无可写入数据。')
        sys.exit(0)

    script = os.path.join(FEISHU_SCRIPT_DIR, 'write_miniprogram_to_sheet.py')
    total = 0
    for date_col, extra in MINIPROGRAM_EXTRA.items():
        access = extra.get('访问次数')
        visitor = extra.get('访客', access)
        txn = extra.get('交易金额', 0)
        if access is None:
            continue
        cmd = [sys.executable, script, date_col, str(access), str(visitor), str(txn)]
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=FEISHU_SCRIPT_DIR)
        if r.returncode == 0:
            total += 1
            print(f'✅ 2月{date_col}日：访问 {access}、访客 {visitor}、交易 {txn}')
        else:
            print(f'⚠️ 2月{date_col}日 写入失败：{r.stderr or r.stdout}')

    print(f'✅ 批量写入完成，共 {total} 天')
    sys.exit(0 if total > 0 else 1)


if __name__ == '__main__':
    main()
