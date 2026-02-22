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
ARTICLE_DIR = Path("/Users/karuo/Documents/个人/2、我写的日记/火：开发分享")
IMG_DIR = ARTICLE_DIR / "assets"
PARENT_TOKEN = "KNf7wA8Rki1NSdkkSIqcdFtTnWb"
TITLE = "卡若：基因胶囊——AI技能可遗传化的实现与落地"
JSON_PATH = ARTICLE_DIR / "卡若_基因胶囊_AI技能可遗传化_feishu_blocks.json"

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


def _make_image_block(file_token: str) -> dict:
    """生成飞书图片块，尝试 gallery 与 file 两种格式"""
    return {
        "block_type": 18,
        "gallery": {
            "imageList": [{"fileToken": file_token}],
            "galleryStyle": {"align": "center"},
        },
    }


def _title_matches(node_title: str, target: str) -> bool:
    """判断节点标题是否与目标相似（含关键词即视为匹配）"""
    if not node_title or not target:
        return False
    kw = ["基因胶囊", "AI技能可遗传"]
    return any(k in node_title for k in kw) or target in node_title


def _find_existing_doc(space_id: str, headers: dict) -> tuple[str | None, str | None]:
    """查找父节点下是否已有同名/类似文档，返回 (doc_token, node_token)"""
    page_token = None
    while True:
        params = {"parent_node_token": PARENT_TOKEN, "page_size": 50}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers, params=params, timeout=30)
        if r.json().get("code") != 0:
            return None, None
        data = r.json().get("data", {})
        nodes = data.get("nodes", []) or data.get("items", []) or []
        for n in nodes:
            title = n.get("title", "") or n.get("node", {}).get("title", "")
            if _title_matches(title, TITLE):
                obj = n.get("obj_token")
                node = n.get("node_token")
                return obj or node, node
        page_token = data.get("page_token")
        if not page_token:
            break
    return None, None


def _clear_doc_blocks(doc_token: str, headers: dict) -> bool:
    """清空文档内容（删除根节点下直接子块）"""
    all_items = []
    page_token = None
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks",
            headers=headers, params=params, timeout=30)
        if r.json().get("code") != 0:
            return False
        data = r.json().get("data", {})
        items = data.get("items", [])
        all_items.extend(items)
        page_token = data.get("page_token")
        if not page_token:
            break
    child_ids = [b["block_id"] for b in all_items if b.get("parent_id") == doc_token]
    if not child_ids:
        return True
    # 分批删除（每次最多 50）
    for i in range(0, len(child_ids), 50):
        batch = child_ids[i : i + 50]
        rd = requests.delete(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children/batch_delete",
            headers=headers, json={"block_id_list": batch}, timeout=30)
        if rd.json().get("code") != 0:
            return False
        import time
        time.sleep(0.3)
    return True


def create_doc_with_images():
    """创建或更新文档、上传图片、写入图文 blocks"""
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

    # 2. 查找是否已有同名/类似文档
    doc_token, node_token = _find_existing_doc(space_id, headers)
    if doc_token and node_token:
        print(f"📋 发现已有类似文档，将更新内容")
        if not _clear_doc_blocks(doc_token, headers):
            print("⚠️ 清空原内容失败，将追加写入")
        else:
            print("✅ 已清空原内容")
    else:
        # 3. 创建新文档
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

    # 4. 上传图片（优先从 JSON 的 image_paths 读取，否则用默认）
    img_paths = []
    if JSON_PATH.exists():
        try:
            j = json.load(open(JSON_PATH, "r", encoding="utf-8"))
            for p in j.get("image_paths", []):
                full = (ARTICLE_DIR / p) if not Path(p).is_absolute() else Path(p)
                img_paths.append(full)
        except Exception:
            pass
    if not img_paths:
        img_paths = [IMG_DIR / "基因胶囊_概念与流程.png", IMG_DIR / "基因胶囊_完整工作流程图.png"]
    file_tokens = []
    for p in img_paths:
        ft = upload_image_to_doc(token, doc_token, p) if p.exists() else None
        file_tokens.append(ft)
        if ft:
            print(f"✅ 图片上传: {p.name}")
    file_token1 = file_tokens[0] if len(file_tokens) > 0 else None
    file_token2 = file_tokens[1] if len(file_tokens) > 1 else None

    # 5. 构建 blocks：从 JSON 加载，配图占位处注入图片 block
    if JSON_PATH.exists():
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        raw_blocks = data.get("children", [])
        blocks = []
        tokens = [file_token1, file_token2]
        for b in raw_blocks:
            c = (b.get("text") or {}).get("elements") or []
            content = (c[0].get("text_run") or {}).get("content", "") if c else ""
            if "【配图 1" in content and tokens[0]:
                blocks.append(_make_image_block(tokens[0]))
            elif "【配图 2" in content and len(tokens) > 1 and tokens[1]:
                blocks.append(_make_image_block(tokens[1]))
            elif "【配图 1" in content or "【配图 2" in content:
                blocks.append(b)
            else:
                blocks.append(b)
    else:
        blocks = get_article_blocks(file_token1, file_token2)

    # 6. 分批写入所有 blocks（含图片），保持顺序
    valid_blocks = [b for b in blocks if b is not None]
    for i in range(0, len(valid_blocks), 50):
        batch = valid_blocks[i : i + 50]
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={"children": batch, "index": i},
            timeout=30)
        res = wr.json()
        if res.get("code") != 0:
            # 若含图片的批次失败，则跳过图片仅写文本
            if any(b.get("block_type") in (13, 18) for b in batch):
                safe = [b for b in batch if b.get("block_type") not in (13, 18)]
                if safe:
                    wr2 = requests.post(
                        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
                        headers=headers,
                        json={"children": safe, "index": i},
                        timeout=30)
                    if wr2.json().get("code") == 0:
                        print(f"⚠️ 图片块跳过，已写文本")
            elif i == 0:
                return False, res.get("msg", "写入失败")
        else:
            gallery_count = sum(1 for b in batch if b.get("block_type") == 18)
            if gallery_count:
                print(f"✅ 写入 {gallery_count} 个图片块")
        if len(valid_blocks) > 50:
            import time
            time.sleep(0.3)

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
    print(f"📤 基因胶囊全功能介绍（创建或更新 + 图片上传）")
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
