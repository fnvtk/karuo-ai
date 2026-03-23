#!/usr/bin/env python3
"""
统一视频元数据生成器 v1
根据视频文件名自动生成：标题、简介、标签、分区
支持各平台差异化输出（B站/视频号/小红书/快手/抖音）

用法:
  meta = VideoMeta.from_filename("AI最大的缺点是上下文太短，这样来解决.mp4")
  print(meta.title("B站"))
  print(meta.description("B站"))
  print(meta.tags("B站"))
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from content_filter import filter_for_platform

BRAND_TAG = "#卡若创业派对"
MINI_PROGRAM = "#小程序 卡若创业派对"
# 视频号描述末尾固定话题（与微信搜一搜/话题展示一致，无空格写法）
CHANNELS_FIXED_TAGS = ("#小程序卡若创业派对", "#公众号卡若-4点起床的男人")

PLATFORM_CATEGORIES = {
    "B站": {"tid": 160, "name": "生活 > 日常"},
    "视频号": {"category": "科技数码"},
    "小红书": {"category": "科技数码"},
    "快手": {"category": "生活"},
    "抖音": {"category": "科技"},
}

COMMON_TAGS = ["Soul派对", "创业", "认知觉醒", "副业", "商业思维"]

KEYWORD_TAGS = {
    "AI": ["AI工具", "人工智能", "效率提升"],
    "副业": ["副业", "副业入门", "副业收入"],
    "创业": ["创业", "创业心态", "创业故事"],
    "Soul": ["Soul派对", "Soul创业"],
    "切片": ["切片分发", "自动化", "内容分发"],
    "股权": ["创业股权", "团队管理"],
    "疗愈": ["疗愈", "AI赋能", "疗愈商业"],
    "模型": ["AI对比", "深度思考", "AI模型"],
    "赚钱": ["创业心态", "商业思维"],
    "装AI": ["AI服务", "传统行业"],
    "坚持": ["坚持的力量", "自律"],
    "视频": ["内容创作", "视频分发"],
}

CURATED_TITLES: dict[str, dict] = {
    "AI最大的缺点是上下文太短，这样来解决.mp4": {
        "title": "AI的短板是记忆太短，上下文一长就废了，这个方法能解决",
        "tags_extra": ["AI工具", "效率提升"],
    },
    "AI每天剪1000个视频 M4电脑24T素材库全网分发.mp4": {
        "title": "M4芯片+24T素材库，AI每天剪1000条视频自动全网分发",
        "tags_extra": ["AI剪辑", "内容工厂"],
    },
    "Soul派对变现全链路 发视频就有钱，后端全解决.mp4": {
        "title": "Soul派对怎么变现？发视频就有收益，后端体系全部搞定",
        "tags_extra": ["Soul派对", "副业收入"],
    },
    "从0到切片发布 AI自动完成每天副业30条视频.mp4": {
        "title": "从零到切片发布，AI全自动完成，每天副业产出30条视频",
        "tags_extra": ["AI副业", "切片分发"],
    },
    "做副业的基本条件 苹果电脑和特殊访问工具.mp4": {
        "title": "做副业的两个基本条件：一台Mac和一个上网工具",
        "tags_extra": ["副业入门", "工具推荐"],
    },
    "切片分发全自动化 从视频到发布一键完成.mp4": {
        "title": "从录制到发布全自动化，一键切片分发五大平台",
        "tags_extra": ["自动化", "内容分发"],
    },
    "创业团队4人平分25有啥危险 先跑钱再谈股权.mp4": {
        "title": "创业团队4人平分25%股权有啥风险？先跑出收入再谈分配",
        "tags_extra": ["创业股权", "团队管理"],
    },
    "坚持到120场是什么感觉 方向越确定执行越坚决.mp4": {
        "title": "坚持到第120场派对是什么感觉？方向越清晰执行越坚决",
        "tags_extra": ["Soul派对", "坚持的力量"],
    },
    "帮人装AI一单300到1000块，传统行业也能做.mp4": {
        "title": "帮传统行业的人装AI工具，一单收300到1000块，简单好做",
        "tags_extra": ["AI服务", "传统行业"],
    },
    "深度AI模型对比 哪个才是真正的AI不是语言模型.mp4": {
        "title": "深度对比各大AI模型，哪个才是真正的智能而不只是语言模型",
        "tags_extra": ["AI对比", "深度思考"],
    },
    "疗愈师配AI助手能收多少钱 一个小团队5万到10万.mp4": {
        "title": "疗愈师+AI助手组合，一个小团队月收5万到10万",
        "tags_extra": ["AI赋能", "疗愈商业"],
    },
    "赚钱没那么复杂，自信心才是核心问题.mp4": {
        "title": "赚钱真没那么复杂，自信心才是卡住你的核心问题",
        "tags_extra": ["创业心态", "自信"],
    },
}


@dataclass
class VideoMeta:
    """单条视频的元数据"""
    filename: str
    base_title: str
    tags_extra: list[str] = field(default_factory=list)

    @classmethod
    def from_filename(cls, filename: str) -> VideoMeta:
        fname = Path(filename).name
        curated = CURATED_TITLES.get(fname)
        if curated:
            return cls(
                filename=fname,
                base_title=curated["title"],
                tags_extra=curated.get("tags_extra", []),
            )
        stem = Path(fname).stem
        stem = re.sub(r"^soul\d+_\d+_", "", stem, flags=re.I)
        stem = re.sub(r"^\d+场", "", stem)
        stem = re.sub(r'^\d+[._\-\s]*', '', stem)
        stem = stem.replace('_', ' ').replace('  ', ' ').strip()

        extra = []
        for kw, tags in KEYWORD_TAGS.items():
            if kw in stem:
                extra.extend(tags)
        extra = list(dict.fromkeys(extra))[:4]

        return cls(filename=fname, base_title=stem or fname, tags_extra=extra)

    def _smart_tags(self, platform: str) -> list[str]:
        seen = set()
        result = []
        for t in self.tags_extra + COMMON_TAGS:
            if t not in seen:
                seen.add(t)
                result.append(t)
        return result[:8]

    def title(self, platform: str, max_len: int = 80) -> str:
        t = filter_for_platform(self.base_title, platform)
        return t[:max_len]

    def title_short(self, max_len: int = 20) -> str:
        """小红书标题（≤20字）"""
        parts = re.split(r'[,，!！?？\s]+', self.base_title)
        return parts[0][:max_len] if parts else self.base_title[:max_len]

    def hashtags(self, platform: str) -> str:
        """# 标签字符串"""
        tags = self._smart_tags(platform)
        if platform == "视频号":
            # 视频号按新规则：去掉 Soul 相关 # 标签，仅保留业务/品牌相关标签。
            tags = [t for t in tags if "soul" not in t.lower()]
        parts = [f"#{t}" for t in tags]
        if platform == "视频号":
            parts.extend(CHANNELS_FIXED_TAGS)
        else:
            parts.append(MINI_PROGRAM)
        return " ".join(parts)

    def description(self, platform: str, max_len: int = 500) -> str:
        """完整描述 = 标题 + 换行 + 标签 + 品牌"""
        title = self.title(platform)
        tags = self.hashtags(platform)
        desc = f"{title}\n\n{tags}"
        return filter_for_platform(desc[:max_len], platform)

    def tags_list(self, platform: str) -> list[str]:
        return self._smart_tags(platform)

    def tags_str(self, platform: str) -> str:
        """逗号分隔（B站 API 用）"""
        return ",".join(self._smart_tags(platform))

    def category(self, platform: str) -> dict:
        return PLATFORM_CATEGORIES.get(platform, {})

    def bilibili_meta(self) -> dict:
        """B站投稿需要的完整 meta"""
        return {
            "copyright": 1,
            "source": "",
            "desc": self.description("B站"),
            "desc_format_id": 0,
            "dynamic": "",
            "interactive": 0,
            "open_elec": 0,
            "no_reprint": 1,
            "subtitles": {"lan": "", "open": 0},
            "tag": self.tags_str("B站"),
            "tid": 160,
            "title": self.title("B站", 80),
            "up_close_danmaku": False,
            "up_close_reply": False,
        }


def generate_all_meta(video_dir: str) -> list[VideoMeta]:
    """批量生成目录下所有视频的元数据"""
    videos = sorted(Path(video_dir).glob("*.mp4"))
    return [VideoMeta.from_filename(str(v)) for v in videos]


if __name__ == "__main__":
    from pathlib import Path
    VIDEO_DIR = "/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片"
    metas = generate_all_meta(VIDEO_DIR)
    for m in metas:
        print(f"\n{'='*60}")
        print(f"文件: {m.filename}")
        print(f"  B站标题: {m.title('B站')}")
        print(f"  B站简介: {m.description('B站')[:80]}...")
        print(f"  B站标签: {m.tags_str('B站')}")
        print(f"  视频号: {m.description('视频号')[:80]}...")
        print(f"  小红书标题: {m.title_short()}")
