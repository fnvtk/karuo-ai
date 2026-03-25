#!/usr/bin/env python3
"""
Web 平台 F12 接口抽象层（SDK 风格）

目标：
1) 统一请求/响应抓包（等价浏览器 F12 Network）
2) 统一接口匹配规则（哪些是关键接口）
3) 统一请求体注入能力（如定时字段、签名字段）
4) 统一结果输出（便于多平台复用）
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional


PatchFunc = Callable[[dict], dict]


@dataclass
class EndpointRule:
    """关键接口规则：url 包含任一关键词即命中。"""

    name: str
    contains_any: list[str]
    methods: list[str] = field(default_factory=lambda: ["GET", "POST"])

    def match(self, method: str, url: str) -> bool:
        m = (method or "").upper()
        if self.methods and m not in [x.upper() for x in self.methods]:
            return False
        u = (url or "").lower()
        return any((k or "").lower() in u for k in self.contains_any)


@dataclass
class InjectPatchRule:
    """请求体注入规则：命中 endpoint 后对 json body 执行 patch。"""

    endpoint: EndpointRule
    patch: PatchFunc


@dataclass
class CaptureEvent:
    ts: str
    event: str  # request | response | route_patch
    method: str
    url: str
    status: int = 0
    endpoint: str = ""
    headers: dict = field(default_factory=dict)
    post_data: str = ""
    body: dict | str | None = None


@dataclass
class F12ApiCapture:
    """统一抓包器：可落盘 jsonl，可按 endpoint 聚合。"""

    output_file: str = ""
    max_clip: int = 200000
    events: list[CaptureEvent] = field(default_factory=list)
    endpoint_hits: dict[str, int] = field(default_factory=dict)

    @staticmethod
    def _sanitize_headers(headers: dict) -> dict:
        out = {}
        for k, v in (headers or {}).items():
            lk = (k or "").lower()
            if lk == "cookie":
                out[k] = "<masked-cookie>"
            elif lk == "authorization":
                out[k] = "<masked-auth>"
            else:
                out[k] = v
        return out

    def _clip(self, s: str) -> str:
        s = "" if s is None else str(s)
        if len(s) <= self.max_clip:
            return s
        return s[: self.max_clip] + "...<truncated>"

    def _append(self, evt: CaptureEvent) -> None:
        self.events.append(evt)
        if evt.endpoint:
            self.endpoint_hits[evt.endpoint] = self.endpoint_hits.get(evt.endpoint, 0) + 1
        if not self.output_file:
            return
        try:
            Path(self.output_file).parent.mkdir(parents=True, exist_ok=True)
            with open(self.output_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(evt.__dict__, ensure_ascii=False) + "\n")
        except Exception:
            pass

    def mark(self, *, event: str, method: str, url: str, endpoint: str = "", status: int = 0, headers: dict | None = None, post_data: str = "", body=None) -> None:
        self._append(
            CaptureEvent(
                ts=datetime.now().isoformat(),
                event=event,
                method=method,
                url=url,
                status=status,
                endpoint=endpoint,
                headers=self._sanitize_headers(headers or {}),
                post_data=self._clip(post_data),
                body=body,
            )
        )

    def summary(self) -> dict:
        return {
            "events": len(self.events),
            "endpoint_hits": dict(sorted(self.endpoint_hits.items(), key=lambda x: x[0])),
        }


class WebF12Sdk:
    """
    平台级 F12 SDK：
    - attach_capture(page): 接管 request/response
    - attach_injector(page): 接管 route patch
    """

    def __init__(
        self,
        *,
        endpoint_rules: list[EndpointRule],
        capture: F12ApiCapture,
        inject_rules: Optional[list[InjectPatchRule]] = None,
    ) -> None:
        self.endpoint_rules = endpoint_rules
        self.capture = capture
        self.inject_rules = inject_rules or []
        self.patch_hits: dict[str, int] = {}

    def _match_endpoint(self, method: str, url: str) -> str:
        for r in self.endpoint_rules:
            if r.match(method, url):
                return r.name
        return ""

    async def attach_capture(self, page) -> None:
        async def _on_request(request):
            ep = self._match_endpoint(request.method, request.url)
            if not ep:
                return
            self.capture.mark(
                event="request",
                method=request.method,
                url=request.url,
                endpoint=ep,
                headers=request.headers or {},
                post_data=request.post_data or "",
            )

        async def _on_response(response):
            req = response.request
            ep = self._match_endpoint(req.method if req else "", response.url)
            if not ep:
                return
            body = None
            try:
                body = await response.json()
            except Exception:
                try:
                    body = self.capture._clip(await response.text())
                except Exception:
                    body = ""
            self.capture.mark(
                event="response",
                method=req.method if req else "",
                url=response.url,
                status=response.status,
                endpoint=ep,
                headers=req.headers if req else {},
                post_data=req.post_data if req else "",
                body=body,
            )

        page.on("request", _on_request)
        page.on("response", _on_response)

    async def attach_injector(self, page) -> None:
        """
        只对 inject_rules 命中的请求执行 route patch。
        为了稳妥，按 rule 单独 route，避免对全量请求做复杂判断。
        """
        for r in self.inject_rules:
            pattern = r.endpoint.contains_any[0] if r.endpoint.contains_any else ""
            if not pattern:
                continue
            route_pattern = f"**/*{pattern}*"

            async def _handler(route, request, _rule=r):
                try:
                    raw = request.post_data or ""
                    data = json.loads(raw) if raw else None
                    if not isinstance(data, dict):
                        await route.continue_()
                        return
                    patched = _rule.patch(data)
                    ep = _rule.endpoint.name
                    self.patch_hits[ep] = self.patch_hits.get(ep, 0) + 1
                    body_txt = json.dumps(patched, ensure_ascii=False)
                    self.capture.mark(
                        event="route_patch",
                        method=request.method,
                        url=request.url,
                        endpoint=ep,
                        headers=request.headers or {},
                        post_data=body_txt,
                    )
                    await route.continue_(post_data=body_txt)
                except Exception:
                    await route.continue_()

            await page.route(route_pattern, _handler)
