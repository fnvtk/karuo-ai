#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 根据 git diff --cached --name-only 的输出，生成「具体更新内容」摘要（用于提交说明与推送记录）
# 用法：git diff --cached --name-only | python3 生成同步说明.py

import sys

def label(p):
    if not p or p.isspace():
        return None
    p = p.strip()
    # 金仓 Gitea / 金盾 / 金仓其他
    if '01_卡资' in p or '金仓' in p or '金盾' in p:
        if 'Gitea' in p or 'Gitea管理' in p:
            return '金仓Gitea脚本与配置'
        if '金盾' in p:
            return '金盾'
        return '金仓'
    # 卡人：水溪、水泉、水桥
    if '02_卡人' in p or '水溪' in p or '水泉' in p or '水桥' in p:
        if '水溪' in p:
            return '水溪整理归档'
        if '水泉' in p:
            return '水泉规划拆解'
        if '水桥' in p:
            return '水桥平台对接'
        return '卡人'
    if '03_卡木' in p:
        return '卡木'
    # 卡火：火炬、火眼、火种、火锤
    if '04_卡火' in p or '火炬' in p or '火眼' in p or '火种' in p or '火锤' in p:
        if '火炬' in p:
            return '火炬'
        if '火眼' in p:
            return '火眼智能纪要'
        if '火种' in p:
            return '火种知识模型'
        if '火锤' in p:
            return '火锤'
        return '卡火'
    if '05_卡土' in p:
        return '卡土'
    # 运营中枢
    if p.startswith('运营中枢'):
        if '工作台' in p:
            return '运营中枢工作台'
        if '参考资料' in p:
            return '运营中枢参考资料'
        if '技能路由' in p:
            return '运营中枢技能路由'
        if '平台配置' in p:
            return '运营中枢平台配置'
        if 'local_llm' in p or 'memory' in p or 'task_router' in p:
            return '运营中枢兼容层'
        return '运营中枢'
    if p.startswith('.cursor'):
        return 'Cursor规则'
    if p.startswith('.github'):
        return 'GitHub Actions'
    if p.startswith('.gitea'):
        return 'Gitea配置'
    if p in ('总索引.md', 'README.md', 'BOOTSTRAP.md', 'SKILL_REGISTRY.md', '.gitignore'):
        return '总索引与入口'
    if p.endswith('.md') and '/' not in p:
        return '根目录文档'
    return None

def main():
    raw = sys.stdin.buffer.read().decode('utf-8', errors='ignore').strip()
    lines = [s.strip() for s in raw.splitlines() if s.strip()]
    seen = []
    for p in lines:
        l = label(p)
        if l and l not in seen:
            seen.append(l)
    out = '、'.join(seen[:10])
    if len(seen) > 10:
        out += '等'
    if not out:
        out = '多目录更新'
    print(out)

if __name__ == '__main__':
    main()
