#!/usr/bin/env python3
"""
视频号平台的 F12 接口配置（基于 web_f12_sdk）

说明：
- 把“视频号特有接口”抽成配置，不把规则散落在业务脚本里。
- 后续新增网站时，复制此文件改 endpoint + patch 即可。
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


def build_channels_profile(scheduled_time=None) -> tuple[list[EndpointRule], list[InjectPatchRule]]:
    schedule_ts = to_schedule_ts(scheduled_time)

    endpoint_rules = [
        EndpointRule(name="auth_data", contains_any=["/auth/auth_data"]),
        EndpointRule(name="post_list", contains_any=["/post/post_list"]),
        EndpointRule(name="post_create", contains_any=["/post/post_create"], methods=["POST"]),
        EndpointRule(name="post_delete", contains_any=["/post/post_delete"], methods=["POST"]),
        EndpointRule(name="dfs_upload", contains_any=["/finder-assistant/"], methods=["POST"]),
    ]

    inject_rules: list[InjectPatchRule] = []
    if schedule_ts > 0:
        def _patch(payload: dict) -> dict:
            payload["effectiveTime"] = int(schedule_ts)
            payload["postTimingInfo"] = {"timing": 1, "postTime": int(schedule_ts)}
            post_info = payload.get("postInfo")
            if isinstance(post_info, dict):
                post_info["postTime"] = int(schedule_ts)
                post_info["publishType"] = 1
            return payload

        inject_rules.append(
            InjectPatchRule(
                endpoint=EndpointRule(
                    name="post_create",
                    contains_any=["/post/post_create"],
                    methods=["POST"],
                ),
                patch=_patch,
            )
        )

    return endpoint_rules, inject_rules
