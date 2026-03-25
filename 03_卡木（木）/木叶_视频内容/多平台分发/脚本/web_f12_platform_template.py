#!/usr/bin/env python3
"""
新网站自动化脚本模板（CLI + F12 SDK 结合版）

流程建议：
1) 先定义 endpoint 规则（相当于 F12 里你要盯的接口）
2) 再定义 inject 规则（如定时字段、发布方式字段）
3) CLI 负责“检查/发布/重试”，SDK 负责“抓包/注入/回放证据”
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright

from web_f12_sdk import EndpointRule, InjectPatchRule, F12ApiCapture, WebF12Sdk


@dataclass
class PlatformProfile:
    endpoint_rules: list[EndpointRule]
    inject_rules: list[InjectPatchRule]


def build_profile(scheduled_time=None) -> PlatformProfile:
    schedule_ts = int(scheduled_time.timestamp()) if isinstance(scheduled_time, datetime) else 0

    endpoint_rules = [
        EndpointRule(name="auth_check", contains_any=["/auth/check"]),
        EndpointRule(name="content_list", contains_any=["/content/list"]),
        EndpointRule(name="content_create", contains_any=["/content/create"], methods=["POST"]),
    ]

    inject_rules: list[InjectPatchRule] = []
    if schedule_ts > 0:
        def _patch(payload: dict) -> dict:
            payload["scheduleTime"] = schedule_ts
            payload["publishType"] = "timed"
            return payload

        inject_rules.append(
            InjectPatchRule(
                endpoint=EndpointRule(
                    name="content_create",
                    contains_any=["/content/create"],
                    methods=["POST"],
                ),
                patch=_patch,
            )
        )
    return PlatformProfile(endpoint_rules=endpoint_rules, inject_rules=inject_rules)


async def demo_run(video_path: str, scheduled_time=None) -> None:
    profile = build_profile(scheduled_time)
    capture = F12ApiCapture(output_file=str(Path("/tmp/web_f12_template.jsonl")))
    sdk = WebF12Sdk(
        endpoint_rules=profile.endpoint_rules,
        inject_rules=profile.inject_rules,
        capture=capture,
    )

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context()
        page = await ctx.new_page()

        await sdk.attach_capture(page)
        await sdk.attach_injector(page)

        # TODO: 在此处填写你的网站发布流程（登录、上传、点击发布）
        await asyncio.sleep(1)
        await browser.close()

    print("F12摘要:", capture.summary(), "patch_hits:", sdk.patch_hits, "video:", video_path)


if __name__ == "__main__":
    asyncio.run(demo_run("/tmp/demo.mp4"))
