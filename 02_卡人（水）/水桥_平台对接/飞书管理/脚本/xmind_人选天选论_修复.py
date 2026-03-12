#!/usr/bin/env python3
"""
修复 人选天选论 sheet（index 2）:
1. 将 sheet.title 改为「人选天选论」（使 tab 显示书名而非「读书笔记模板」）
2. 五行 detached 节点添加可见子主题（符号+精简内容）
3. 人物节点结构：人名→各角色→MBTI/DISC/PDP 正确分层
4. 总结/描述/金句/问题 精简符号化
"""
import json, zipfile, uuid, os, shutil

XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"
BACKUP_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind.bak2"

def gid(): return uuid.uuid4().hex[:22]

def tp(title, children=None, notes=None, position=None, markers=None, labels=None, branch=None):
    t = {"id": gid(), "class": "topic", "title": title}
    if children: t["children"] = {"attached": children}
    if notes: t["notes"] = {"plain": {"content": notes}}
    if position: t["position"] = position
    if markers: t["markers"] = markers
    if labels: t["labels"] = labels
    if branch: t["branch"] = branch
    return t

def main():
    with zipfile.ZipFile(XMIND_PATH, "r") as z:
        raw = z.read("content.json")
    content = json.loads(raw)

    # ---- 找到 人选天选论 sheet ----
    sheet = None
    for s in content:
        if s.get("rootTopic", {}).get("title") == "人选天选论":
            sheet = s
            break
    if not sheet:
        print("❌ 未找到 人选天选论 sheet")
        return

    # 1. 修正 tab 标题
    sheet["title"] = "人选天选论"

    rt = sheet["rootTopic"]
    # 中心标签
    rt["labels"] = ["卡若读书笔记"]

    # ---- 2. 五行 detached 节点：添加可见子主题 ----
    wuxing_children = {
        "金": [
            tp("📌 定位·目标"),
            tp("⚡ 选福：贪中拿/放 或 惧中放"),
            tp("⚠️ 选祸：惧中拿起"),
            tp("🔑 人选 = 我的贪惧之选"),
            tp("🌐 天选 = 我之外一切之选"),
            tp("🎲 运气 = 别人的人选"),
        ],
        "水": [
            tp("📌 过程·事件"),
            tp("🔁 捡钱包选福 → 天选祸"),
            tp("🔁 退让讹钱选祸 → 天选福"),
            tp("🔁 面试官三选一 → 你成别人天选"),
            tp("🔁 外卖 → 面店 → 车祸 → 复仇"),
            tp("🔁 鹅吃草=福，鸭吃草=祸（本性不同）"),
        ],
        "木": [
            tp("📌 落地·心法"),
            tp("✅ 觉察内心贪惧 → 看清福祸"),
            tp("✅ 选祸 = 放贪 / 直面惧 → 天选福"),
            tp("✅ 承担一切代价 → 持久敬畏"),
        ],
        "火": [
            tp("📌 模型·升级"),
            tp("💡 微观不可测 → 归因「混沌」"),
            tp("💡 我 = 贪惧之选 / 天 = 其余一切"),
            tp("💡 薛定谔：观测即改变"),
        ],
        "土": [
            tp("📌 系统·放大"),
            tp("🌐 选择主体不唯人，万物皆有倾向"),
            tp("🌐 我之外即天"),
            tp("🌐 人选 × 天选叠加 = 运气机制"),
        ],
    }
    detached = rt.get("children", {}).get("detached", [])
    for d in detached:
        name = d.get("title")
        if name in wuxing_children:
            d["children"] = {"attached": wuxing_children[name]}
            if "notes" in d:
                del d["notes"]

    # ---- 3. 重建 attached（总结/描述/人物/问题/金句）保持位置 ----
    old_positions = {}
    for a in rt.get("children", {}).get("attached", []):
        old_positions[a.get("title")] = a.get("position")

    def pos(name): return old_positions.get(name)

    # 总结
    p_总结 = tp("总结", position=pos("总结"), children=[
        tp("💎 一句话", children=[
            tp("运气 = 选择叠加；你的人选与混沌交替，成别人天选"),
        ]),
        tp("🗂️ 四层结构", children=[
            tp("① 定义层：贪惧 × 拿放 → 选福/选祸"),
            tp("② 因果层：人选→天选→运气"),
            tp("③ 案例层：面试/外卖/鹅鸭"),
            tp("④ 应用层：觉察贪惧·承担代价"),
        ]),
        tp("🎯 对卡若的价值", children=[
            tp("把运气变成可设计的人选工程"),
            tp("选祸得福 = 云阿米巴让利逻辑"),
        ]),
    ])

    # 描述
    p_描述 = tp("描述", position=pos("描述"), children=[
        tp("🔑 核心定义", children=[
            tp("贪中拿起 = 选福"),
            tp("惧中放下 = 选福"),
            tp("惧中拿起 = 选祸"),
        ]),
        tp("🔄 运作机制", children=[
            tp("人选 → 交混沌 → 成别人天选 → 形成运气"),
        ]),
        tp("⚖️ 无对错，只在各自内心贪惧"),
    ])

    # 人物（与模板一致：人名 → 各角色 → MBTI/DISC/PDP）
    roles = [
        tp("讲述者（作者）", branch="folded", children=[
            tp("MBTI: INTP/ENTP"),
            tp("DISC: 力量+完美"),
            tp("PDP: 老虎+猫头鹰"),
            tp("逻辑建模，定义严谨"),
        ]),
        tp("面试官", branch="folded", children=[
            tp("MBTI: ESTJ"),
            tp("DISC: 力量+活跃"),
            tp("PDP: 老虎+孔雀"),
            tp("利益驱动，关系与面子"),
        ]),
        tp("外卖小哥", branch="folded", children=[
            tp("DISC: 和平"),
            tp("PDP: 无尾熊"),
            tp("随境而动，未主动改路径"),
        ]),
        tp("法拉利车主", branch="folded", children=[
            tp("MBTI: ESTP"),
            tp("DISC: 力量+活跃"),
            tp("PDP: 老虎+孔雀"),
            tp("即时满足，后果后置"),
        ]),
        tp("外卖小哥亲人", branch="folded", children=[
            tp("DISC: 力量"),
            tp("PDP: 老虎"),
            tp("为情感承担一切代价"),
        ]),
    ]
    p_人物 = tp("人物", position=pos("人物"), children=[
        tp("人名", branch="folded", children=roles),
    ])

    # 问题
    p_问题 = tp("问题", position=pos("问题"), children=[
        tp("🎯 私域运气 = 用户人选；如何设计我的人选让对方「天选福」？"),
        tp("💰 云阿米巴让利 = 选祸→天选福；如何持续验证路径？"),
        tp("🏆 承担代价 → 差异化信任；如何在私域可感知？"),
    ])

    # 金句
    p_金句 = tp("金句", position=pos("金句"), children=[
        tp("1. 运气 = 人选与混沌交替变成别人的天选"),
        tp("2. 关照内心贪惧 = 看清福祸利险"),
        tp("3. 你的运气 = 别人的选择；别人的运气 = 你的选择"),
        tp("4. 愿意承担一切代价的人，让世界恐惧你"),
        tp("5. 福祸只在贪惧产生，不因他人评判改变"),
        tp("🔑 关键字", markers=[{"markerId": "c_symbol_pen"}], children=[
            tp("人选 · 天选 · 运气 · 贪惧 · 选福选祸"),
        ]),
    ])

    rt["children"]["attached"] = [p_总结, p_描述, p_人物, p_问题, p_金句]

    # ---- 写回 ----
    shutil.copy(XMIND_PATH, BACKUP_PATH)
    with zipfile.ZipFile(XMIND_PATH, "r") as z_in:
        with zipfile.ZipFile(XMIND_PATH + ".tmp", "w", zipfile.ZIP_STORED) as z_out:
            for name in z_in.namelist():
                if name == "content.json":
                    z_out.writestr(name, json.dumps(content, ensure_ascii=False, indent=0))
                else:
                    z_out.writestr(name, z_in.read(name))
    os.replace(XMIND_PATH + ".tmp", XMIND_PATH)
    print("✅ 完成：tab 名已改为「人选天选论」；五行/总结/描述/人物/问题/金句 已填充；备份:", BACKUP_PATH)

if __name__ == "__main__":
    main()
