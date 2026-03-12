#!/usr/bin/env python3
"""
向 读书笔记.xmind 的「一、个人提升」下添加《人选天选论》节点。
格式：中心为书名+卡若读书笔记；连接 总结/描述/人物/问题/金句；金水木火土为独立节点（detached），不连书名，位置对齐。
"""
import json
import zipfile
import uuid
import os
import shutil

XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"
BACKUP_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind.bak"

def gen_id():
    return uuid.uuid4().hex[:22]

def make_topic(title, **kw):
    t = {"id": gen_id(), "class": "topic", "title": title}
    t.update(kw)
    return t

def main():
    with zipfile.ZipFile(XMIND_PATH, "r") as z:
        content = json.loads(z.read("content.json"))
    sheet = content[0]
    root = sheet["rootTopic"]
    attached = root["children"]["attached"]

    # 找到 一、个人提升
    for node in attached:
        if node.get("title") != "一、个人提升":
            continue
        children = node.setdefault("children", {})
        book_attached = children.setdefault("attached", [])

        # 人选天选论：中心节点 + 与书名连接的 5 支
        center_id = gen_id()
        topic_summary = make_topic("总结", **{
            "children": {"attached": [
                make_topic("运气来源于选择与人选；人选与混沌因果交替成别人的天选；福祸只在内心贪惧。"),
                make_topic("定义层/因果层/案例层/应用层；人选可优化、天选交概率。"),
            ]}
        })
        topic_desc = make_topic("描述", **{
            "children": {"attached": [
                make_topic("选福选祸定义：贪惧×拿起/放下；人选=我之选，天选=其余；运气=别人选择。"),
                make_topic("捡钱包得福天选祸；退钱给讹钱者=人选祸天选福；面试官三选一；外卖-车祸-复仇链。"),
            ]}
        })
        topic_chars = make_topic("人物", **{
            "children": {"attached": [
                make_topic("讲述者：NT 力量+完美 老虎+猫头鹰"),
                make_topic("面试官：力量+活跃 老虎+孔雀"),
                make_topic("外卖小哥：和平/无尾熊"),
                make_topic("面店老板：孔雀+无尾熊"),
                make_topic("法拉利车主：力量+活跃 老虎+孔雀"),
                make_topic("外卖小哥亲人：力量 老虎"),
            ]}
        })
        topic_questions = make_topic("问题", **{
            "children": {"attached": [
                make_topic("私域里的运气如何用人选天选拆解？"),
                make_topic("云阿米巴分钱与合伙如何对应选福/选祸？"),
                make_topic("一人公司如何用承担代价做差异化？"),
            ]}
        })
        topic_quotes = make_topic("金句", **{
            "children": {"attached": [
                make_topic("1.运气来源于选择，人选与混沌因果交替变成别人的天选"),
                make_topic("2.关照内心恐惧和贪婪，就能看清福祸利险"),
                make_topic("3.你的运气就是别人的选择，别人的运气就是你的选择"),
                make_topic("4.愿意为选择与结果承担一切代价，让世界恐惧你"),
                make_topic("5.福祸只在心中贪惧产生，不因他人评判改变"),
                make_topic("关键字：人选 · 天选 · 运气 · 贪婪与恐惧 · 选福选祸"),
            ]}
        })

        # 与中心连接的 5 个主支（总结/描述/人物/问题/金句）
        book_node = {
            "id": center_id,
            "class": "topic",
            "title": "人选天选论",
            "notes": {"plain": {"content": "卡若读书笔记\n运气来源于选择与人选；福祸只在内心贪惧。"}},
            "branch": "folded",
            "children": {
                "attached": [topic_summary, topic_desc, topic_chars, topic_questions, topic_quotes],
                # 金水木火土：独立节点，不连书名，按模板位置对齐（金上中、水右上、土左中、火左下、木右下）
                "detached": [
                    make_topic("金", position={"x": 0, "y": -240}),
                    make_topic("水", position={"x": 260, "y": -200}),
                    make_topic("土", position={"x": -260, "y": 0}),
                    make_topic("火", position={"x": -260, "y": 220}),
                    make_topic("木", position={"x": 260, "y": 220}),
                ]
            }
        }
        # 为五行填写内容（放在 notes 或 子节点，detached 通常只显示标题，用 notes 存内容）
        wuxing_content = {
            "金": "选福选祸定义；人选=我/天选=其余；运气=别人选择；福祸不挂钩道德",
            "水": "捡钱包与退钱；面试官三选一；外卖-面店-车祸-复仇链",
            "木": "关照贪惧；选祸得福；承担一切代价",
            "火": "微观归因混沌；世界只剩我与天",
            "土": "选择主体不唯人；我之外即天",
        }
        for d in book_node["children"]["detached"]:
            title = d["title"]
            if title in wuxing_content:
                d["notes"] = {"plain": {"content": wuxing_content[title]}}

        book_attached.append(book_node)
        break
    else:
        print("未找到「一、个人提升」")
        return

    # 备份并写回
    shutil.copy(XMIND_PATH, BACKUP_PATH)
    with zipfile.ZipFile(XMIND_PATH, "r") as z_in:
        with zipfile.ZipFile(XMIND_PATH + ".tmp", "w", zipfile.ZIP_STORED) as z_out:
            for name in z_in.namelist():
                if name == "content.json":
                    z_out.writestr(name, json.dumps(content, ensure_ascii=False, indent=0))
                else:
                    z_out.writestr(name, z_in.read(name))
    os.replace(XMIND_PATH + ".tmp", XMIND_PATH)
    print("已添加「人选天选论」到 读书笔记.xmind（一、个人提升下）；金水木火土为独立节点。备份:", BACKUP_PATH)

if __name__ == "__main__":
    main()
