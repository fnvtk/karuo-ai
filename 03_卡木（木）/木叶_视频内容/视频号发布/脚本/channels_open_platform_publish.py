#!/usr/bin/env python3
"""
视频号「开放平台 access_token」能否上传发表短视频？——不能（截至官方文档现状）。

官方「视频号助手 API」列表：
  https://developers.weixin.qq.com/doc/channels/api/channels/index.html
仅含：直播记录/预约、橱窗、留资、大屏、罗盘等，**无**短视频上传/发表接口。

因此：
- 无法用 AppID/AppSecret 换得的 access_token 替代 channels_storage_state.json（助手 Cookie + localStorage）
- 自动化发片仍须走 channels_api_publish.py（助手 Web 协议）

若微信未来在文档中新增「内容上传」类接口，请在此模块实现并与 distribute_all 对接。

缓解重复扫码：见 channels_login.py 持久化 Chromium（CHANNELS_PERSISTENT_LOGIN 默认开启）。
"""
from __future__ import annotations


class OpenPlatformShortVideoNotSupported(RuntimeError):
    """微信未开放助手 API + access_token 的短视频发表能力。"""

    DOC = "https://developers.weixin.qq.com/doc/channels/api/channels/index.html"
    LOCAL = "视频号发布/REFERENCE_开放能力_数据与集成.md"


def assert_can_publish_without_assistant_session() -> None:
    """占位：若误调用「无 Cookie 发片」入口，立即给出明确错误。"""
    raise OpenPlatformShortVideoNotSupported(
        "微信未提供「仅用 access_token、无需助手 Cookie」的短视频上传/发表官方接口；"
        f"见 {OpenPlatformShortVideoNotSupported.DOC} 与仓库内 {OpenPlatformShortVideoNotSupported.LOCAL}。"
    )


if __name__ == "__main__":
    try:
        assert_can_publish_without_assistant_session()
    except OpenPlatformShortVideoNotSupported as e:
        print(e, flush=True)
        raise SystemExit(2) from e
