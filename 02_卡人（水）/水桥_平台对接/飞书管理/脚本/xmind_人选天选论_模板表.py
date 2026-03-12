#!/usr/bin/env python3
"""
1. 从「读书笔记」表（sheet0）的「一、个人提升」下移除「人选天选论」节点。
2. 在「读书笔记模板」表（sheet1《书名》）同格式下，新增独立 sheet「人选天选论」：
   - 与模板一致：中心书名 + 总结/描述/人物/问题/金句（与书名连接），金水木火土为独立节点（detached）、位置与模板一致。
3. 下方标签（各 sheet）对应主题、格式一致。
"""
import json
import zipfile
import uuid
import os
import shutil
import copy

XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"
BACKUP_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind.bak"

def gen_id():
    return uuid.uuid4().hex[:22]

def deep_copy_with_new_ids(obj, id_map=None):
    if id_map is None:
        id_map = {}
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "id" and isinstance(v, str):
                out[k] = id_map.get(v, gen_id())
            else:
                out[k] = deep_copy_with_new_ids(v, id_map)
        return out
    if isinstance(obj, list):
        return [deep_copy_with_new_ids(x, id_map) for x in obj]
    return obj

def main():
    with zipfile.ZipFile(XMIND_PATH, "r") as z:
        content = json.loads(z.read("content.json"))

    # 1) 从 sheet0「一、个人提升」下移除「人选天选论」
    sheet0 = content[0]
    for node in sheet0.get("rootTopic", {}).get("children", {}).get("attached", []):
        if node.get("title") != "一、个人提升":
            continue
        attached = node.get("children", {}).get("attached", [])
        node["children"]["attached"] = [x for x in attached if x.get("title") != "人选天选论"]
        break

    # 2) 取 sheet1 模板（《书名》= 读书笔记模板），收集所有 id 并生成新 id
    template = copy.deepcopy(content[1])
    id_map = {}
    def collect_ids(obj):
        if isinstance(obj, dict):
            if "id" in obj and isinstance(obj["id"], str):
                id_map.setdefault(obj["id"], gen_id())
            for v in obj.values():
                collect_ids(v)
        elif isinstance(obj, list):
            for x in obj:
                collect_ids(x)
    collect_ids(template)

    def replace_ids(obj):
        if isinstance(obj, dict):
            if "id" in obj and isinstance(obj["id"], str):
                obj["id"] = id_map.get(obj["id"], gen_id())
            for v in obj.values():
                replace_ids(v)
        elif isinstance(obj, list):
            for x in obj:
                replace_ids(x)
    replace_ids(template)
    new_sheet = template
    rt = new_sheet["rootTopic"]

    # 改为「人选天选论」并填内容
    rt["title"] = "人选天选论"
    rt["notes"] = {"plain": {"content": "卡若读书笔记\n运气来源于选择与人选；人选与混沌因果交替成别人的天选；福祸只在内心贪惧。"}}
    rt["labels"] = ["卡若读书笔记"]
    if "href" in rt:
        del rt["href"]

    # 填 总结/描述/人物/问题/金句 下的内容（保持与模板一致结构，只改标题/备注或子节点）
    attached = rt.get("children", {}).get("attached", [])
    for node in attached:
        title = node.get("title")
        if title == "总结":
            node.setdefault("children", {}).setdefault("attached", [])
            node["children"]["attached"] = [
                {"id": gen_id(), "class": "topic", "title": "运气来源于选择与人选；人选与混沌因果交替成别人的天选；福祸只在内心贪惧。"},
                {"id": gen_id(), "class": "topic", "title": "定义层/因果层/案例层/应用层；人选可优化、天选交概率。"},
            ]
        elif title == "描述":
            node["children"] = {"attached": [
                {"id": gen_id(), "class": "topic", "title": "选福选祸定义（贪惧×拿起/放下）；人选=我之选，天选=其余；运气=别人选择。"},
                {"id": gen_id(), "class": "topic", "title": "捡钱包得福天选祸；退钱给讹钱者=人选祸天选福；面试官三选一；外卖-车祸-复仇链。"},
            ]}
        elif title == "人物":
            # 与模板一致：人名→MBTI/PDP/DISC/九型人格/评价 + 人选天选论角色
            inner = node.get("children", {}).get("attached", [])
            if inner and inner[0].get("title") == "人名":
                inner[0]["children"] = {"attached": [
                    {"id": gen_id(), "class": "topic", "title": "讲述者：NT 力量+完美 老虎+猫头鹰"},
                    {"id": gen_id(), "class": "topic", "title": "面试官：力量+活跃 老虎+孔雀"},
                    {"id": gen_id(), "class": "topic", "title": "外卖小哥/面店老板/法拉利车主/外卖小哥亲人"},
                    {"id": gen_id(), "class": "topic", "title": "MBTI"},
                    {"id": gen_id(), "class": "topic", "title": "PDP"},
                    {"id": gen_id(), "class": "topic", "title": "DISC"},
                    {"id": gen_id(), "class": "topic", "title": "九型人格"},
                    {"id": gen_id(), "class": "topic", "title": "评价"},
                ]}
        elif title == "问题":
            node["children"] = {"attached": [
                {"id": gen_id(), "class": "topic", "title": "私域里的运气如何用人选天选拆解？"},
                {"id": gen_id(), "class": "topic", "title": "云阿米巴分钱与合伙如何对应选福/选祸？"},
                {"id": gen_id(), "class": "topic", "title": "一人公司如何用承担代价做差异化？"},
            ]}
        elif title == "金句":
            node["children"] = {"attached": [
                {"id": gen_id(), "class": "topic", "title": "1.运气来源于选择，人选与混沌因果交替变成别人的天选"},
                {"id": gen_id(), "class": "topic", "title": "2.关照内心恐惧和贪婪，就能看清福祸利险"},
                {"id": gen_id(), "class": "topic", "title": "3.你的运气就是别人的选择，别人的运气就是你的选择"},
                {"id": gen_id(), "class": "topic", "title": "4.愿意为选择与结果承担一切代价，让世界恐惧你"},
                {"id": gen_id(), "class": "topic", "title": "5.福祸只在心中贪惧产生，不因他人评判改变"},
                {"id": gen_id(), "class": "topic", "title": "关键字", "markers": [{"markerId": "c_symbol_pen"}],
                 "children": {"attached": [{"id": gen_id(), "class": "topic", "title": "人选 · 天选 · 运气 · 贪婪与恐惧 · 选福选祸"}]}},
            ]}

    # 五行 detached：与模板位置完全一致
    wuxing_notes = {
        "金": "选福选祸定义；人选=我/天选=其余；运气=别人选择；福祸不挂钩道德",
        "水": "捡钱包与退钱；面试官三选一；外卖-面店-车祸-复仇链",
        "木": "关照贪惧；选祸得福；承担一切代价",
        "火": "微观归因混沌；世界只剩我与天",
        "土": "选择主体不唯人；我之外即天",
    }
    detached = rt.get("children", {}).get("detached", [])
    # 模板位置：金(-4,-207), 水(240,-50), 木(141,198), 土(-241,-27), 火(-141,197)
    for d in detached:
        t = d.get("title")
        if t in wuxing_notes:
            d["notes"] = {"plain": {"content": wuxing_notes[t]}}

    # 插入新 sheet 到 sheet1 之后（与模板紧邻，下方标签对应）
    content.insert(2, new_sheet)

    shutil.copy(XMIND_PATH, BACKUP_PATH)
    with zipfile.ZipFile(XMIND_PATH, "r") as z_in:
        with zipfile.ZipFile(XMIND_PATH + ".tmp", "w", zipfile.ZIP_STORED) as z_out:
            for name in z_in.namelist():
                if name == "content.json":
                    z_out.writestr(name, json.dumps(content, ensure_ascii=False, indent=0))
                else:
                    z_out.writestr(name, z_in.read(name))
    os.replace(XMIND_PATH + ".tmp", XMIND_PATH)
    print("已处理：1) 从「一、个人提升」移除人选天选论；2) 新增独立表「人选天选论」（与读书笔记模板格式、五行位置一致）。备份:", BACKUP_PATH)

if __name__ == "__main__":
    main()
