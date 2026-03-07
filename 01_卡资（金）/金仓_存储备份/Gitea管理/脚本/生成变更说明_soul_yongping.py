#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 根据 soul-yongping 项目 git diff --cached --name-only 输出，生成「变更内容」和「修改原因」
# 用法：git diff --cached --name-only | python3 生成变更说明_soul_yongping.py

import sys

def label(p):
    if not p or p.isspace():
        return None
    p = p.strip()
    if p.startswith('soul-admin/'):
        if '/src/' in p and '/components/' in p:
            return 'soul-admin 组件'
        if '/src/' in p and '/pages/' in p:
            return 'soul-admin 页面'
        if 'tsconfig' in p or 'vite.config' in p or '.json' in p:
            return 'soul-admin 配置'
        return 'soul-admin 前端'
    if p.startswith('soul-api/'):
        if '/internal/handler/' in p:
            return 'soul-api 接口逻辑'
        if '/internal/router/' in p:
            return 'soul-api 路由'
        if 'go.mod' in p or 'go.sum' in p:
            return 'soul-api 依赖'
        return 'soul-api 后端'
    if p.startswith('miniprogram/'):
        if '.wxml' in p or '.wxss' in p:
            return 'miniprogram 页面样式'
        if '.js' in p:
            return 'miniprogram 页面逻辑'
        return 'miniprogram 小程序'
    if p.startswith('scripts/') or p.startswith('.gitignore') or p.endswith('.sh'):
        return '脚本与配置'
    if 'Gitea' in p or 'gitea' in p:
        return 'Gitea 同步配置'
    return None

def reason(labels):
    """根据变更模块推导修改原因"""
    if not labels:
        return '本地开发更新'
    m = {
        'soul-admin 组件': '前端组件修改',
        'soul-admin 页面': '前端页面修改',
        'soul-admin 配置': '前端构建配置修改',
        'soul-admin 前端': '前端代码修改',
        'soul-api 接口逻辑': '后端接口逻辑修改',
        'soul-api 路由': '后端路由修改',
        'soul-api 依赖': '后端依赖更新',
        'soul-api 后端': '后端代码修改',
        'miniprogram 页面样式': '小程序页面样式修改',
        'miniprogram 页面逻辑': '小程序页面逻辑修改',
        'miniprogram 小程序': '小程序代码修改',
        '脚本与配置': '脚本或配置文件修改',
        'Gitea 同步配置': 'Gitea 同步配置修改',
    }
    reasons = [m.get(l, l) for l in labels]
    if len(reasons) == 1:
        return reasons[0]
    if len(reasons) <= 3:
        return '、'.join(reasons)
    return '多模块开发更新'

def main():
    raw = sys.stdin.buffer.read().decode('utf-8', errors='ignore').strip()
    lines = [s.strip() for s in raw.splitlines() if s.strip()]
    seen = []
    for p in lines:
        l = label(p)
        if l and l not in seen:
            seen.append(l)
    content = '、'.join(seen[:8])
    if len(seen) > 8:
        content += '等'
    if not content:
        content = '多文件'
    cause = reason(seen)
    print(f"{content} | 原因: {cause}")

if __name__ == '__main__':
    main()
