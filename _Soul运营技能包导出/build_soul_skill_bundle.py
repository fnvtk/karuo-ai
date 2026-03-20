#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
【已迁移】请改用永平项目内脚本（会输出 zip 到「下载」）：

  python3 "/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平/scripts/pack_soul_operation_skills.py"

说明见同仓库：scripts/README_Soul运营技能包.md
---
以下为旧版备份逻辑（与 pack_soul_operation_skills.py 等价，可自行删除本文件）。
打包 Soul 运营全链路：SKILL + 脚本 + Cursor 入口，供复制到另一台电脑。
"""
from __future__ import annotations

import os
import shutil
import sys
import zipfile
from pathlib import Path

KARUO_AI = Path("/Users/karuo/Documents/个人/卡若AI")
CURSOR_SKILLS = Path("/Users/karuo/.cursor/skills")
# 用户要求：压缩包放到「下载」
DOWNLOADS = Path.home() / "Downloads"
STAMP = "20260320"
BUNDLE_NAME = f"Soul运营全链路技能包_{STAMP}"
# 工作区内临时目录（便于 Cursor 写入），最终 zip 放 Downloads
WORK_ROOT = KARUO_AI / "_Soul运营技能包导出" / BUNDLE_NAME


def ignore_common(dir_name: str, names: list[str]) -> set[str]:
    skip = {"__pycache__", ".browser_state", "chromium_data", ".DS_Store"}
    ignored = set()
    for n in names:
        if n in skip or n.endswith(".pyc"):
            ignored.add(n)
    return ignored


def copytree(src: Path, dst: Path) -> None:
    if not src.exists():
        print(f"SKIP missing: {src}", file=sys.stderr)
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst, dirs_exist_ok=True, ignore=ignore_common)


def main() -> int:
    if not KARUO_AI.is_dir():
        print(f"ERROR: 卡若AI 不存在: {KARUO_AI}", file=sys.stderr)
        return 1

    if WORK_ROOT.exists():
        shutil.rmtree(WORK_ROOT)
    WORK_ROOT.mkdir(parents=True, exist_ok=True)

    # 目录结构：与另一台机合并到 卡若AI 时路径一致
    cursor_dst = WORK_ROOT / ".cursor" / "skills"
    cursor_dst.mkdir(parents=True, exist_ok=True)
    for name in ("soul-operation-report", "soul-party-project"):
        s = CURSOR_SKILLS / name
        if s.is_dir():
            copytree(s, cursor_dst / name)

    kai = WORK_ROOT / "卡若AI"
    # 水岸
    copytree(
        KARUO_AI / "02_卡人（水）" / "水岸_项目管理",
        kai / "02_卡人（水）" / "水岸_项目管理",
    )
    # 水桥：飞书、妙记、Soul创业实验
    base_water = KARUO_AI / "02_卡人（水）" / "水桥_平台对接"
    for sub in ("飞书管理", "智能纪要", "Soul创业实验"):
        copytree(base_water / sub, kai / "02_卡人（水）" / "水桥_平台对接" / sub)

    # 木叶：切片、分发、各平台
    base_wood = KARUO_AI / "03_卡木（木）" / "木叶_视频内容"
    wood_dst = kai / "03_卡木（木）" / "木叶_视频内容"
    for sub in (
        "视频切片",
        "多平台分发",
        "抖音发布",
        "B站发布",
        "视频号发布",
        "小红书发布",
        "快手发布",
    ):
        copytree(base_wood / sub, wood_dst / sub)

    # 凭证索引（另一台机需核对敏感信息）
    idx = KARUO_AI / "运营中枢" / "工作台" / "00_账号与API索引.md"
    if idx.is_file():
        (kai / "运营中枢" / "工作台").mkdir(parents=True, exist_ok=True)
        shutil.copy2(idx, kai / "运营中枢" / "工作台" / idx.name)

    readme = WORK_ROOT / "解压后必读.md"
    readme.write_text(
        """# Soul 运营全链路技能包 — 解压后必读

## 本包包含

- `.cursor/skills/`：`soul-operation-report`、`soul-party-project`（Cursor 入口）
- `卡若AI/02_卡人（水）/水岸_项目管理/`：项目管理中枢 + 卡若创业派对 README
- `卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/`：运营报表、妙记相关脚本与 SKILL
- `卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/`
- `卡若AI/02_卡人（水）/水桥_平台对接/Soul创业实验/`：写作/上传文档与说明
- `卡若AI/03_卡木（木）/木叶_视频内容/`：视频切片、多平台分发、各平台发布 SKILL+脚本
- `卡若AI/运营中枢/工作台/00_账号与API索引.md`：凭证速查（若源机有则已打包）

## 在另一台电脑上「可直接运作」的步骤

1. **解压**到任意位置（例如桌面）。
2. **合并到本机卡若AI根目录**（与现有一致的路径）：
   - 将包内 `卡若AI/` 下所有文件夹 **合并复制** 到：  
     `你的卡若AI根目录/`（例如 `~/Documents/个人/卡若AI/`）  
     覆盖时请先备份同名目录，避免误删你本机独有文件。
3. **安装 Cursor 入口 Skill**（可选但推荐）：
   - 将 `.cursor/skills/soul-operation-report`、`soul-party-project` 复制到本机 `~/.cursor/skills/`。
4. **环境依赖**（脚本跑通需要）：
   - Python 3.10+、`pip` 依赖见各子目录 README / SKILL 内说明
   - 视频：`FFmpeg`、`conda` 环境 `mlx-whisper`（见视频切片 SKILL）
   - **永平项目**：文章上传/推送需在 `一场soul的创业实验-永平` 仓库配置 `.env`、数据库等（见 `Soul创业实验/上传/环境与TOKEN配置.md`）
5. **凭证**：飞书 AppSecret、妙记 Cookie、各平台 Cookie、小程序与 API 等，必须在目标机上按 `00_账号与API索引.md` 与各脚本说明 **重新配置或从安全渠道拷贝**；未配置时脚本会报错属正常。
6. **绝对路径**：部分文档或脚本内可能含原机路径（如 `/Users/karuo/...`），到新电脑请按 SKILL 内说明改为本机路径。

## 安全提示

- 压缩包内可能含 **Token/Cookie/密钥说明**，请勿上传到公开网盘；传输用加密渠道或 U 盘。

---
打包脚本：`卡若AI/_Soul运营技能包导出/build_soul_skill_bundle.py`
""",
        encoding="utf-8",
    )

    # 清理包内 __pycache__
    for p in WORK_ROOT.rglob("__pycache__"):
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
    for p in WORK_ROOT.rglob("*.pyc"):
        try:
            p.unlink()
        except OSError:
            pass

    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    zip_path = DOWNLOADS / f"{BUNDLE_NAME}.zip"

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in WORK_ROOT.rglob("*"):
            if f.is_file():
                arc = f.relative_to(WORK_ROOT.parent)
                zf.write(f, arc.as_posix())

    # 同时在工作区留一份未压缩目录，方便检查
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"OK zip -> {zip_path} ({size_mb:.2f} MB)")
    print(f"DIR -> {WORK_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
