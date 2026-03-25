#!/usr/bin/env python3
"""
知乎发布 F12 抽象配置（CLI + F12 SDK）
"""

from __future__ import annotations

from datetime import datetime

from web_f12_sdk import EndpointRule, InjectPatchRule


def to_schedule_ts(scheduled_time) -> int:
    if not scheduled_time:
        return 0
    if isinstance(scheduled_time, datetime):
        return int(scheduled_time.timestamp())
    return int(scheduled_time)


def build_zhihu_profile(scheduled_time=None):
    schedule_ts = to_schedule_ts(scheduled_time)
    endpoint_rules = [
        EndpointRule(name="me", contains_any=["/api/v4/me"]),
        # 分片/直传 URL 各版本不一，尽量放宽便于判定「上传已完成」
        EndpointRule(
            name="upload",
            contains_any=[
                "/upload",
                "/api/creator/content/video/upload",
                "zhihu.com/zvideo",
                "zhihu.com/video",
                "multimedia.zhihu.com",
                "creator.zhihu.com",
            ],
        ),
        EndpointRule(
            name="video_publish",
            contains_any=[
                "/api/creator/content/video",
                "/api/creator/content/publish",
                "/api/v4/creator/content",
            ],
            methods=["POST"],
        ),
        EndpointRule(name="content_list", contains_any=["/api/creator/content", "/api/v4/creator/content"]),
    ]

    inject_rules: list[InjectPatchRule] = []
    if schedule_ts > 0:
        def _patch(payload: dict) -> dict:
            # 兼容不同站点命名
            candidates = [
                "publish_time",
                "publishTime",
                "scheduled_time",
                "scheduledTime",
                "publish_at",
                "publishAt",
                "timing_ts",
            ]
            for k in candidates:
                if k in payload:
                    payload[k] = int(schedule_ts)
            # 若无现成字段，也补常见字段供后端兼容
            payload.setdefault("publish_time", int(schedule_ts))
            payload.setdefault("publish_at", int(schedule_ts))
            payload.setdefault("is_timed_publish", True)
            payload.setdefault("publish_type", "timed")
            return payload

        inject_rules.append(
            InjectPatchRule(
                endpoint=EndpointRule(
                    name="video_publish",
                    contains_any=[
                        "/api/creator/content/video",
                        "/api/creator/content/publish",
                        "/api/v4/creator/content",
                    ],
                    methods=["POST"],
                ),
                patch=_patch,
            )
        )

    return endpoint_rules, inject_rules
