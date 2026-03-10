# -*- coding: utf-8 -*-
"""
多平台视频发布 - 违禁词/敏感词过滤模块

用于抖音、视频号、快手、B站、小红书等平台的内容合规过滤。
支持分类违禁词库、安全替换、平台差异化策略。
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Callable

# =============================================================================
# 违禁词分类枚举
# =============================================================================


class Category(str, Enum):
    """违禁词分类"""

    POLITICAL = "政治敏感词"
    FINANCIAL = "金融违禁词"
    MEDICAL = "医疗违禁词"
    EXAGGERATION = "夸大宣传词"
    TRAFFIC = "引流违禁词"
    VULGAR = "低俗敏感词"
    PLATFORM = "平台规避词"


# =============================================================================
# 违禁词库（分类存储）
# =============================================================================

BANNED_WORDS: dict[Category, list[str]] = {
    Category.POLITICAL: [
        "六四", "天安门", "法轮功", "台独", "藏独", "疆独", "反华", "反共",
        "颠覆", "暴动", "分裂", "邪教", "敏感人物", "敏感事件",
    ],
    Category.FINANCIAL: [
        "赚钱", "暴利", "暴富", "躺赚", "轻松月入", "稳赚", "零风险", "保本",
        "年化收益", "高回报", "日入过万", "月入过万", "一夜暴富", "财富自由",
        "割韭菜", "套利", "内幕", "炒股", "荐股", "代客理财", "保底收益",
        "无风险", "稳赚不赔", "必涨", "稳赚", "躺赢", "薅羊毛", "返利",
        "月入X万", "日入X万", "躺着赚钱", "睡后收入", "财务自由捷径",
    ],
    Category.MEDICAL: [
        "根治", "特效", "祖传秘方", "包治", "药到病除", "偏方", "神药",
        "抗癌", "防癌", "治愈", "疗效显著", "立竿见影", "一吃就灵",
        "纯天然无副作用", "绝对安全", "百试百灵", "国家级秘方",
    ],
    Category.EXAGGERATION: [
        "全网最", "史上最", "世界第一", "中国第一", "行业第一", "第一",
        "最好", "最强", "最大", "最高", "绝对", "100%", "百分百",
        "顶级", "极致", "无敌", "碾压", "吊打", "秒杀", "最强没有之一",
        "全网独家", "独家秘方", "绝无仅有", "唯一", "必备", "必买",
    ],
    Category.TRAFFIC: [
        "加微信", "加我微信", "私聊", "私信", "点击链接", "扫码", "关注领取",
        "加QQ", "加群", "进群", "添加客服", "添加助理", "V我", "私我",
        "评论区扣1", "主页有", "主页领取", "链接在简介", "评论区置顶",
        "扫码进群", "微信同号", "联系方式", "留联系方式", "导流",
    ],
    Category.VULGAR: [
        "约炮", "约P", "约pao", "色情", "裸", "性", "激情", "一夜情",
        "大胸", "爆乳", "嫩模", "外围", "包养", "卖淫", "嫖娼",
    ],
    Category.PLATFORM: [
        "ICU", "赌", "彩票", "博彩", "棋牌", "赌博", "六合彩", "时时彩",
        "老虎机", "百家乐", "德州扑克", "红包群", "赌博群", "外挂",
    ],
}

# =============================================================================
# 替换映射表（违禁词 -> 安全替代词）
# 注意：长词条优先匹配，顺序会影响替换结果
# =============================================================================

REPLACEMENT_MAP: dict[str, str] = {
    # 金融类
    "躺着赚钱": "被动获得收益",
    "躺赢": "稳健收益",
    "躺赚": "被动收入",
    "一夜暴富": "快速积累",
    "暴富": "财务自由",
    "暴利": "高毛利",
    "割韭菜": "收割用户",
    "赚钱": "获得收益",
    "稳赚不赔": "稳健回报",
    "稳赚": "稳定收益",
    "零风险": "低风险",
    "无风险": "可控风险",
    "保本": "本金保障型",
    "年化收益": "年化回报",
    "高回报": "良好回报",
    "日入过万": "日营收过万",
    "月入过万": "月营收过万",
    "轻松月入": "月度营收",
    "日入X万": "日营收可观",
    "月入X万": "月营收可观",
    "睡后收入": "被动收入",
    "财富自由捷径": "财务规划路径",
    "套利": "价差策略",
    "退税": "税务优化",
    "薅羊毛": "权益获取",
    "返利": "返佣",
    "代客理财": "资产管理服务",
    "荐股": "投资建议",
    "炒股": "证券投资",
    "内幕": "深度信息",
    "保底收益": "预期收益",
    "必涨": "看涨预期",
    # 医疗类
    "根治": "显著改善",
    "特效": "显著效果",
    "祖传秘方": "传统配方",
    "包治": "针对改善",
    "药到病除": "效果明显",
    "偏方": "民间方法",
    "神药": "高效产品",
    "抗癌": "辅助调理",
    "防癌": "健康维护",
    "治愈": "改善",
    "疗效显著": "效果较好",
    "立竿见影": "见效较快",
    "一吃就灵": "使用有效",
    "纯天然无副作用": "天然成分",
    "国家级秘方": "专业配方",
    "百试百灵": "口碑较好",
    "绝对安全": "相对安全",
    # 夸大类
    "全网最": "非常",
    "史上最": "极为",
    "世界第一": "行业领先",
    "中国第一": "国内领先",
    "行业第一": "业内领先",
    "最好": "很好",
    "最强": "很强",
    "最大": "很大",
    "最高": "很高",
    "绝对": "非常",
    "100%": "高比例",
    "百分百": "高比例",
    "顶级": "高端",
    "极致": "出色",
    "无敌": "出众",
    "碾压": "优于",
    "吊打": "远超",
    "秒杀": "超值",
    "最强没有之一": "非常强",
    "全网独家": "特色",
    "独家秘方": "独特配方",
    "绝无仅有": "少有",
    "唯一": "优选",
    "必备": "推荐",
    "必买": "值得入手",
    # 引流类
    "加微信": "通过平台联系",
    "加我微信": "平台内沟通",
    "私聊": "私信沟通",
    "私信": "消息沟通",
    "点击链接": "查看详情",
    "扫码": "扫码查看",
    "关注领取": "关注后获取",
    "加QQ": "平台联系",
    "加群": "加入社群",
    "进群": "加入社群",
    "添加客服": "联系客服",
    "添加助理": "联系助理",
    "V我": "联系我",
    "私我": "私信我",
    "评论区扣1": "评论区互动",
    "主页有": "主页可见",
    "主页领取": "主页获取",
    "链接在简介": "详见简介",
    "评论区置顶": "置顶说明",
    "扫码进群": "扫码加入",
    "微信同号": "平台联系",
    "联系方式": "联系通道",
    "留联系方式": "留联系方式",
    "导流": "引导关注",
    # 平台规避
    "ICU": "重症监护",
    "赌": "博弈",
    "彩票": "彩券",
    "博彩": "竞猜",
    "棋牌": "棋类游戏",
    "赌博": "竞猜类",
    "六合彩": "彩券",
    "时时彩": "彩券",
    "老虎机": "游戏机",
    "百家乐": "纸牌游戏",
    "德州扑克": "扑克游戏",
    "红包群": "福利群",
    "赌博群": "兴趣群",
    # 工具/业务类
    "外挂": "辅助工具",
}

# 仅在 strict 模式下替换的词（变现、私域等常用词在宽松模式下保留）
STRICT_ONLY_REPLACEMENTS: dict[str, str] = {
    "变现": "商业转化",
    "私域": "用户池",
}

# =============================================================================
# 平台严格度配置
# =============================================================================

PlatformStrictness = {
    "抖音": "strict",
    "douyin": "strict",
    "视频号": "medium",
    "channels": "medium",
    "快手": "medium",
    "kuaishou": "medium",
    "B站": "relaxed",
    "bilibili": "relaxed",
    "哔哩哔哩": "relaxed",
    "小红书": "strict",
    "xiaohongshu": "strict",
}

# =============================================================================
# 数据结构
# =============================================================================


# =============================================================================
# 核心函数
# =============================================================================


def _build_patterns(strict: bool = False) -> list[tuple[str, str, str]]:
    """
    构建 (原词, 替换词, 分类) 的匹配元组列表。
    按词长度降序，保证长词优先匹配。
    strict=True 时额外纳入 STRICT_ONLY_REPLACEMENTS（如 变现、私域）。
    """
    items: list[tuple[str, str, str]] = []
    for cat, words in BANNED_WORDS.items():
        for w in words:
            rep = REPLACEMENT_MAP.get(w)
            if not rep and strict:
                rep = STRICT_ONLY_REPLACEMENTS.get(w)
            if rep:
                items.append((w, rep, cat.value))

    if strict:
        for w, rep in STRICT_ONLY_REPLACEMENTS.items():
            if w not in {x[0] for x in items}:
                items.append((w, rep, "金融违禁词"))

    # 去重并按长度降序
    seen: set[str] = set()
    unique: list[tuple[str, str, str]] = []
    for w, rep, cat in items:
        if w not in seen:
            seen.add(w)
            unique.append((w, rep, cat))

    unique.sort(key=lambda x: -len(x[0]))
    return unique


def _escape_regex(s: str) -> str:
    """转义正则特殊字符"""
    return re.escape(s)


def filter_text(text: str, strict: bool = False) -> tuple[str, list[str]]:
    """
    过滤文本中的违禁词，替换为安全词。

    Args:
        text: 待过滤文本
        strict: 若为 True，启用更严格的过滤（包括 变现、私域 等）

    Returns:
        (过滤后文本, 替换记录列表)
    """
    if not text or not isinstance(text, str):
        return text or "", []

    replacements_made: list[str] = []
    result = text
    patterns = _build_patterns(strict)

    for word, replacement, _ in patterns:
        pattern = re.compile(_escape_regex(word), re.IGNORECASE)
        for m in pattern.finditer(result):
            old_slice = result[m.start() : m.end()]
            # 仅当实际替换发生且与原文不同时记录
            if old_slice != replacement:
                replacements_made.append(f"{old_slice} → {replacement}")
        result = pattern.sub(replacement, result)

    return result, replacements_made


def check_text(text: str) -> list[dict]:
    """
    检测文本中的违禁词，返回详情列表（不替换）。

    Returns:
        [{"word": str, "start": int, "end": int, "category": str, "replacement": str}, ...]
    """
    if not text or not isinstance(text, str):
        return []

    findings: list[dict] = []
    patterns = _build_patterns(strict=True)  # 用完整映射做检测

    for word, replacement, category in patterns:
        pattern = re.compile(_escape_regex(word), re.IGNORECASE)
        for m in pattern.finditer(text):
            findings.append(
                {
                    "word": m.group(),
                    "start": m.start(),
                    "end": m.end(),
                    "category": category,
                    "replacement": replacement,
                }
            )

    # 按 start 排序
    findings.sort(key=lambda x: x["start"])
    return findings


def get_platform_filter(platform: str) -> Callable[[str], tuple[str, list[str]]]:
    """
    根据平台返回对应的过滤函数。

    Args:
        platform: 平台名，如 抖音、视频号、快手、B站、小红书

    Returns:
        接受 (text: str) 的过滤函数，返回 (filtered_text, replacements)
    """
    level = PlatformStrictness.get(platform, PlatformStrictness.get(platform.lower(), "medium"))
    strict = level == "strict"

    def _filter(t: str) -> tuple[str, list[str]]:
        return filter_text(t, strict=strict)

    return _filter


def filter_for_platform(text: str, platform: str) -> str:
    """
    按平台规则过滤文本（仅返回过滤后的文本）。

    Args:
        text: 待过滤文本
        platform: 平台名

    Returns:
        过滤后的文本
    """
    try:
        filt = get_platform_filter(platform)
        filtered, _ = filt(text)
        return filtered
    except Exception:
        return text


# =============================================================================
# 主程序：演示与测试
# =============================================================================

if __name__ == "__main__":
    DEMO_TEXTS = [
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维",
        "ICU出来一年多，活着就要在互联网上留下东西",
        "后端花170万搭体系，前端几十块就能参与",
        "懒人也能赚钱？动作简单、有利可图、正反馈",
    ]

    print("=" * 60)
    print("内容过滤模块 - 测试")
    print("=" * 60)

    for i, raw in enumerate(DEMO_TEXTS, 1):
        print(f"\n【原文 {i}】")
        print(f"  {raw}")

        # check_text
        issues = check_text(raw)
        if issues:
            print(f"  检测到 {len(issues)} 处违禁/敏感词：")
            for it in issues:
                print(f"    - [{it['category']}] 「{it['word']}」 → {it['replacement']} (位置 {it['start']}-{it['end']})")
        else:
            print("  未检测到违禁词")

        # filter_text (非严格)
        filtered, reps = filter_text(raw, strict=False)
        print(f"\n【过滤后（非严格）】")
        print(f"  {filtered}")
        if reps:
            print(f"  替换记录: {reps}")

        # filter_text (严格)
        filtered_strict, reps_strict = filter_text(raw, strict=True)
        if filtered_strict != filtered or reps_strict != reps:
            print(f"\n【过滤后（严格）】")
            print(f"  {filtered_strict}")
            if reps_strict:
                print(f"  替换记录: {reps_strict}")

    # 平台级过滤演示
    print("\n" + "=" * 60)
    print("平台级过滤演示（以「懒人也能赚钱？」为例）")
    print("=" * 60)
    sample = "懒人也能赚钱？动作简单、有利可图、正反馈"
    for platform in ["抖音", "视频号", "B站"]:
        out = filter_for_platform(sample, platform)
        print(f"  {platform}: {out}")
