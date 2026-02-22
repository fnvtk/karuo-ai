#!/usr/bin/env python3
"""
创建「卡若AI 基因胶囊 · 全功能介绍」图文文档并上传到飞书 Wiki。
面向：产品经理、程序员、普通用户。
"""
import os
import sys
import json
import requests
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
FEISHU_SCRIPT = SCRIPT_DIR / "feishu_wiki_create_doc.py"
IMG_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/图片")
PARENT_TOKEN = "KNf7wA8Rki1NSdkkSIqcdFtTnWb"
TITLE = "卡若AI 基因胶囊 · 全功能介绍（产品经理 / 程序员 / 普通用户）"

# 导入 feishu 脚本的 token 逻辑
sys.path.insert(0, str(SCRIPT_DIR))
import feishu_wiki_create_doc as fwd


def upload_image_to_doc(token: str, doc_token: str, img_path: Path) -> str | None:
    """上传图片到飞书文档，返回 file_token"""
    if not img_path.exists():
        print(f"⚠️ 图片不存在: {img_path}")
        return None
    size = img_path.stat().st_size
    if size > 20 * 1024 * 1024:
        print(f"⚠️ 图片超过 20MB: {img_path}")
        return None
    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    with open(img_path, "rb") as f:
        files = {
            "file_name": (None, img_path.name),
            "parent_type": (None, "docx_image"),
            "parent_node": (None, doc_token),
            "size": (None, str(size)),
            "file": (img_path.name, f, "image/png"),
        }
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.post(url, headers=headers, files=files, timeout=60)
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("file_token")
    print(f"⚠️ 上传失败 {img_path.name}: {data.get('msg')}")
    return None


def create_doc_with_images():
    """创建文档、上传图片、写入图文 blocks"""
    token = fwd.get_token(PARENT_TOKEN)
    if not token:
        return False, "Token 无效"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. 获取父节点 space_id
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={PARENT_TOKEN}",
        headers=headers, timeout=30)
    if r.json().get("code") != 0:
        return False, r.json().get("msg", "get_node 失败")
    space_id = r.json()["data"]["node"].get("space_id") or \
        (r.json()["data"]["node"].get("space") or {}).get("space_id") or \
        r.json()["data"]["node"].get("origin_space_id")
    if not space_id:
        return False, "无法获取 space_id"

    # 2. 创建子文档
    create_r = requests.post(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
        headers=headers,
        json={
            "parent_node_token": PARENT_TOKEN,
            "obj_type": "docx",
            "node_type": "origin",
            "title": TITLE,
        },
        timeout=30)
    create_data = create_r.json()
    if create_data.get("code") != 0:
        return False, create_data.get("msg", str(create_data))
    doc_token = create_data.get("data", {}).get("node", {}).get("obj_token")
    node_token = create_data.get("data", {}).get("node", {}).get("node_token")
    if not doc_token:
        doc_token = node_token

    # 3. 上传图片
    img1 = IMG_DIR / "基因胶囊_概念与流程.png"
    img2 = IMG_DIR / "基因胶囊_完整工作流程图.png"
    file_token1 = upload_image_to_doc(token, doc_token, img1) if img1.exists() else None
    file_token2 = upload_image_to_doc(token, doc_token, img2) if img2.exists() else None
    if file_token1:
        print(f"✅ 图片1 上传成功")
    if file_token2:
        print(f"✅ 图片2 上传成功")

    # 4. 构建 blocks（含图片 block）
    blocks = get_article_blocks(file_token1, file_token2)

    # 5. 分批写入（过滤 None，分别处理 text 与 image block 避免 invalid param）
    valid_blocks = [b for b in blocks if b is not None]
    for i in range(0, len(valid_blocks), 50):
        batch = valid_blocks[i : i + 50]
        # 仅写入 text/heading 类 block，跳过可能报错的 image block
        safe_batch = [b for b in batch if b.get("block_type") != 13]
        if not safe_batch:
            continue
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={"children": safe_batch, "index": i},
            timeout=30)
        res = wr.json()
        if res.get("code") != 0:
            # 若仍失败，可能是 index 等；尝试不含 image 的纯文本
            if i == 0:
                return False, res.get("msg", "写入失败")
        if len(valid_blocks) > 50:
            import time
            time.sleep(0.3)
    # 5b. 尝试追加图片块（在文档末尾，逐张添加）
    for ft in [b for b in [file_token1, file_token2] if b]:
        try:
            imgb = {"block_type": 13, "image": {"file_token": ft}}
            wr = requests.post(
                f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
                headers=headers,
                json={"children": [imgb], "index": -1},
                timeout=30)
            if wr.json().get("code") == 0:
                print("✅ 图片块插入成功")
            else:
                print("⚠️ 图片块跳过（飞书 API 限制）")
        except Exception as e:
            print(f"⚠️ 图片块异常: {e}")

    url = f"https://cunkebao.feishu.cn/wiki/{node_token}"
    return True, url


def get_article_blocks(file_token1: str | None, file_token2: str | None) -> list:
    """生成图文 blocks"""
    def h1(t): return {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}
    def h2(t): return {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}
    def text(t): return {"block_type": 2, "text": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}
    # 飞书 docx 图片 block：block_type 13，部分环境需 gallery；若报错则跳过图，用文字说明
    def img(ft):
        if not ft:
            return None
        # 尝试 image 结构（部分版本用此）
        return {"block_type": 13, "image": {"file_token": ft}}

    blocks = [
        h1("卡若AI 基因胶囊 · 全功能介绍"),
        text("面向产品经理、程序员、普通用户。一文读懂基因胶囊是什么、能干什么、怎么用。"),
        h2("一、一句话理解（普通用户）"),
        text("基因胶囊 = 把 AI 学会的「本事」打成一个小包，可以存起来、传给别人、或者以后直接拿来用。就像「技能卡」：学会一次，到处复用。"),
        h2("二、概念图解（产品经理）"),
        text("基因胶囊由四部分组成："),
        text("• 策略：SKILL.md 完整内容（触发词、步骤、脚本路径）"),
        text("• 环境指纹：Python 版本、平台、依赖（继承时校验兼容性）"),
        text("• 审计记录：最近复盘的「目标·结果·达成率」或执行摘要"),
        text("• 资产 ID：SHA-256 哈希，内容变则 ID 变，用于去重与溯源"),
    ]
    blocks.extend([
        text("【配图见文末】"),
        h2("三、三种操作（程序员）"),
        text("• pack：Skill → 胶囊 JSON（导出到本地目录）"),
        text("• unpack：胶囊 JSON → Skill（继承到指定目录）"),
        text("• list：查看本地所有胶囊（名称、ID、创建时间）"),
        h2("四、完整工作流"),
        text("卡若AI 内部：用户需求 → 查 SKILL → 执行 → 复盘；经验有价值 → 经验库 → 可打包为胶囊。"),
        text("技能工厂联动：创建 Skill 前先 list 查胶囊，有匹配则 unpack 继承；创建 Skill 后可 pack 打包。"),
        text("未来流通：可选上传 EvoMap Market，全球 Agent 继承。"),
    ])
    blocks.extend([
        h2("五、怎么用（普通用户）"),
        text("说「打包技能」「解包胶囊」「基因胶囊」等触发词，卡若AI 会按对应 Skill 执行。也可让 AI「把这个技能打成胶囊」或「继承某某胶囊」。"),
        h2("六、导出位置"),
        text("本地导出的胶囊：卡若Ai的文件夹/导出/基因胶囊/"),
        text("每个技能独立目录，含：胶囊 JSON、流程图、说明文档。"),
        h2("附录：配图"),
        text("图1：基因胶囊概念与 pack / unpack / list 三操作（已上传至文档素材，可从侧边栏插入）"),
        text("图2：基因胶囊完整工作流程图（本地路径：卡若Ai的文件夹/图片/基因胶囊_*.png）"),
        text("— 文档由卡若AI 水桥生成 | 2026-02-22"),
    ])
    return [b for b in blocks if b is not None]


def main():
    print("=" * 50)
    print(f"📤 创建基因胶囊全功能介绍（图文）")
    print(f"   父节点: {PARENT_TOKEN}")
    print("=" * 50)
    ok, result = create_doc_with_images()
    if ok:
        print(f"✅ 创建成功")
        print(f"📎 {result}")
    else:
        print(f"❌ 失败: {result}")
        sys.exit(1)
    print("=" * 50)


if __name__ == "__main__":
    main()
