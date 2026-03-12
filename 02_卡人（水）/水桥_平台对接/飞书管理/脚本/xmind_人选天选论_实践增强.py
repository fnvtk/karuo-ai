#!/usr/bin/env python3
"""
用卡若三篇实践文章（如何提升运气/第118场/把运气做成系统）增强 人选天选论 sheet 内容。
只更新 sheet2（人选天选论）的 总结/描述/金句/问题/人物 及 金水木火土 detached 节点。
"""
import json, zipfile, uuid, os, shutil
from pathlib import Path

XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"
BACKUP_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind.bak3"

def gid(): return uuid.uuid4().hex[:22]
def tp(title, children=None, notes=None, position=None, markers=None, branch=None):
    t = {"id": gid(), "class": "topic", "title": title}
    if children: t["children"] = {"attached": children}
    if notes: t["notes"] = {"plain": {"content": notes}}
    if position: t["position"] = position
    if markers: t["markers"] = markers
    if branch: t["branch"] = branch
    return t

def main():
    with zipfile.ZipFile(XMIND_PATH, "r") as z:
        content = json.loads(z.read("content.json"))

    sheet = next((s for s in content if s.get("rootTopic", {}).get("title") == "人选天选论"), None)
    if not sheet:
        print("❌ 未找到 人选天选论 sheet"); return

    rt = sheet["rootTopic"]
    rt["notes"] = {"plain": {"content": "运气不是等来的，是设计出来的——把人选做成系统，好运变成必然结果的一部分。\n来源：人选天选论 + 卡若如何提升运气 + 第118场 + 把运气做成系统"}}
    rt["labels"] = ["卡若读书笔记"]

    old_pos = {a["title"]: a.get("position") for a in rt.get("children", {}).get("attached", [])}
    def pos(n): return old_pos.get(n)

    # ── 总结 ──────────────────────────────────────────────────────────
    p_总结 = tp("总结", position=pos("总结"), children=[
        tp("💎 一句话", children=[
            tp("运气 = 你的选择×别人的选择×环境；把人选做成系统，好运变必然"),
        ]),
        tp("🗂️ 四层", children=[
            tp("① 定义层：贪惧×拿放→福/祸；三重叠加"),
            tp("② 因果层：人选→天选→运气"),
            tp("③ 案例层：面试/外卖链/电竞冠军/客户崩了"),
            tp("④ 应用层：12动作+五块系统+转心三步"),
        ]),
        tp("🎯 对卡若", children=[
            tp("私域 = 降低用户贪惧成本 = 让对方更容易选你"),
            tp("云阿米巴让利 = 选祸得福的系统化实践"),
            tp("人生靠构建可以承接运气的平台"),
        ]),
    ])

    # ── 描述 ──────────────────────────────────────────────────────────
    p_描述 = tp("描述", position=pos("描述"), children=[
        tp("📌 理论：贪惧×拿放四象限", children=[
            tp("贪中拿起/放下 = 选福"),
            tp("惧中放下 = 选福"),
            tp("惧中拿起 = 选祸"),
        ]),
        tp("🔄 运作：三重叠加=运气", children=[
            tp("你的选择（可控）× 别人的选择 × 外在环境"),
            tp("改磁场靠行动，不靠想"),
        ]),
        tp("⚙️ 卡若系统五块", children=[
            tp("根基：底盘稳才敢出手"),
            tp("流程：路径沉淀→走得快"),
            tp("产出：可验证证据链→被选概率↑"),
            tp("认知：机制替代情绪"),
            tp("商业：先算账再开工"),
        ]),
    ])

    # ── 人物 ──────────────────────────────────────────────────────────
    roles = [
        tp("讲述者（作者）", branch="folded", children=[
            tp("MBTI: INTP/ENTP"), tp("DISC: 力量+完美"), tp("PDP: 老虎+猫头鹰"),
            tp("逻辑建模，把运气变可训练体系"),
        ]),
        tp("卡若（实践者）", branch="folded", children=[
            tp("MBTI: INTP（56.3%内向）"), tp("DISC: 力量+活跃"), tp("PDP: 老虎+孔雀"),
            tp("系统化落地，选祸得福典型，机制替代情绪"),
        ]),
        tp("面试官", branch="folded", children=[
            tp("DISC: 力量+活跃"), tp("PDP: 老虎+孔雀"), tp("利益与关系双驱动"),
        ]),
        tp("外卖小哥", branch="folded", children=[
            tp("DISC: 和平"), tp("PDP: 无尾熊"), tp("随境而动，错过改命节点"),
        ]),
        tp("法拉利车主", branch="folded", children=[
            tp("MBTI: ESTP"), tp("DISC: 力量+活跃"), tp("PDP: 老虎+孔雀"),
            tp("即时满足，后果后置，恐惧驱动决策"),
        ]),
    ]
    p_人物 = tp("人物", position=pos("人物"), children=[tp("人名", branch="folded", children=roles)])

    # ── 问题 ──────────────────────────────────────────────────────────
    p_问题 = tp("问题", position=pos("问题"), children=[
        tp("🎯 私域运气=用户人选；如何降低用户贪惧成本让对方天选福？"),
        tp("💰 云阿米巴让利=选祸得福；如何把这个路径系统化复利？"),
        tp("🏆 承担代价→差异化信任；如何做成可验证的证据链？"),
    ])

    # ── 金句 ──────────────────────────────────────────────────────────
    p_金句 = tp("金句", position=pos("金句"), children=[
        tp("1. 运气=人选×他选×环境；人选做成系统，好运变必然"),
        tp("2. 关照内心贪惧=看清福祸利险"),
        tp("3. 你的运气=别人的选择；别人的运气=你的选择"),
        tp("4. 愿意承担一切代价的人，让世界恐惧你"),
        tp("5. 转运先转心——每次心的转向都带来运的显化"),
        tp("6. 贵人=你做事的方式成了别人的底气（卡若）"),
        tp("7. 人生靠构建可以承接运气的平台（卡若）"),
        tp("🔑 关键字", markers=[{"markerId": "c_symbol_pen"}], children=[
            tp("人选·天选·运气设计·贪惧·选福选祸·系统复利·可被选择"),
        ]),
    ])

    rt["children"]["attached"] = [p_总结, p_描述, p_人物, p_问题, p_金句]

    # ── 五行 detached：增强版 ────────────────────────────────────────
    wuxing_new = {
        "金": [
            tp("📌 定位·模型"),
            tp("⚡ 选福：贪/惧中放下 或 贪中拿"),
            tp("⚠️ 选祸：惧中拿起（反得天选福）"),
            tp("🔑 三重叠加=运气：自选×他选×环境"),
            tp("🎲 运气=选择的延迟性回报（卡若实证）"),
            tp("📋 提升三主径：影响力+识别力+圈子"),
        ],
        "水": [
            tp("📌 过程·事件链"),
            tp("🔁 捡钱包→天选祸 / 退让→天选福"),
            tp("🔁 面试官三选一→你的天选"),
            tp("🔁 外卖→面店→车祸→复仇（多选叠加）"),
            tp("🔁 电竞31冠：凌晨三点训练→被叫「天赋」"),
            tp("🔁 客户后台崩了→熬夜修→「以后只找你」"),
        ],
        "木": [
            tp("📌 落地·12个动作"),
            tp("✅ 觉察贪惧→选祸得福→承担代价"),
            tp("✅ 找高密度机会场（AI是当前最大的）"),
            tp("✅ 高频出手，样本多才有运"),
            tp("✅ 做标准件，让别人选你"),
            tp("✅ 降风险·建信任·做杠杆表达"),
            tp("✅ 把好运变复利（流程化+案例化）"),
        ],
        "火": [
            tp("📌 认知·模型"),
            tp("💡 微观=混沌=天；我=贪惧之选"),
            tp("💡 转运先转心：控制→系统→机制"),
            tp("💡 恐惧决策→出手少→被选概率降"),
            tp("💡 用机制替代情绪（系统不讲情绪）"),
            tp("💡 证据链∝被选概率"),
        ],
        "土": [
            tp("📌 系统·五块"),
            tp("🌐 根基：底盘稳才敢出手"),
            tp("🌐 流程：路径沉淀→运气跟得上"),
            tp("🌐 产出：可验证证据→被选↑"),
            tp("🌐 认知：机制>情绪"),
            tp("🌐 商业：先算账再开工"),
            tp("🌐 五块到位=运气成必然"),
        ],
    }
    for d in rt.get("children", {}).get("detached", []):
        name = d.get("title")
        if name in wuxing_new:
            d["children"] = {"attached": wuxing_new[name]}
            d.pop("notes", None)

    # 写回
    shutil.copy(XMIND_PATH, BACKUP_PATH)
    with zipfile.ZipFile(XMIND_PATH, "r") as zi:
        with zipfile.ZipFile(XMIND_PATH + ".tmp", "w", zipfile.ZIP_STORED) as zo:
            for name in zi.namelist():
                zo.writestr(name, json.dumps(content, ensure_ascii=False, indent=0) if name == "content.json" else zi.read(name))
    os.replace(XMIND_PATH + ".tmp", XMIND_PATH)
    print("✅ 人选天选论 XMind 已更新（实践增强版）备份:", BACKUP_PATH)

if __name__ == "__main__":
    main()
