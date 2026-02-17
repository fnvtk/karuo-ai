#!/usr/bin/env python3
"""
派对纪要生成器
将JSON数据生成毛玻璃风格的HTML派对纪要

使用方法：
  python generate_meeting.py --demo                    # 生成示例
  python generate_meeting.py --input data.json        # 从JSON生成
  python generate_meeting.py --interactive            # 交互式输入
"""

import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# 脚本目录
SCRIPT_DIR = Path(__file__).parent
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"
OUTPUT_DIR = SCRIPT_DIR.parent / "output"

# 确保输出目录存在
OUTPUT_DIR.mkdir(exist_ok=True)

# 颜色映射
COLOR_EMOJIS = {
    "blue": "💙",
    "green": "💚",
    "purple": "💜",
    "orange": "🧡",
    "red": "❤️",
    "yellow": "💛",
    "pink": "💗",
}

BORDER_COLORS = {
    "blue": "#93c5fd",
    "green": "#86efac",
    "purple": "#c4b5fd",
    "orange": "#fdba74",
    "red": "#fca5a5",
    "yellow": "#fde047",
    "pink": "#f9a8d4",
}


def simple_template_render(template: str, data: dict) -> str:
    """简单的模板渲染（不依赖外部库）"""
    result = template
    
    # 替换简单变量 {{var}}
    for key, value in data.items():
        if isinstance(value, str):
            result = result.replace("{{" + key + "}}", value)
    
    return result


def generate_html(data: dict, template_path: Path) -> str:
    """生成HTML内容（101场风格：分享人/精益/流程图/热点研讨含深度思考/下次分享/项目推进）"""
    import re
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
    
    data["generate_date"] = datetime.now().strftime("%Y年%m月%d日 %H:%M")
    
    # 一、分享人介绍：4色卡+白底图标+性格/项目标签（与101场一致）
    head_colors = ["blue", "orange", "green", "purple"]
    flow_icons = ["🎙️", "👥", "💡", "🤝", "📋"]
    speakers_html = ""
    for i, speaker in enumerate(data.get("speakers", [])[:4]):
        hc = head_colors[i % len(head_colors)]
        name = speaker.get("name", "")
        role = speaker.get("role", "")
        topics = speaker.get("topics", "")
        tags = speaker.get("tags", speaker.get("pills", []))
        if isinstance(tags, str):
            tags = [tags] if tags else []
        pills_html = ""
        pill_colors = ["blue", "orange", "green", "purple", "red"]
        for pi, tag in enumerate(tags[:5]):
            pc = pill_colors[pi % len(pill_colors)]
            pills_html += f'<span class="pill {pc}">{tag}</span>'
        if pills_html:
            pills_html = f'<div class="pills">{pills_html}</div>'
        speakers_html += f'''
        <div class="speaker-card">
          <div class="head {hc}"><span class="head-icon">👤</span>{name or "分享人"}</div>
          <div class="body"><p class="role">{role}</p><p class="topics">{topics}</p>{pills_html}</div>
        </div>
        '''
    
    # 二、精益介绍：3卡+图标（与101场：项目/产品/运营/商业标签可放在 points 前）
    lean_colors = ["orange", "blue", "green"]
    lean_icons = ["📌", "✓", "⚙️"]
    modules_html = ""
    for i, module in enumerate(data.get("modules", [])[:3]):
        lc = lean_colors[i % len(lean_colors)]
        icon = lean_icons[i % len(lean_icons)]
        title = module.get("title", "")
        body_parts = []
        for item in module.get("items", [])[:2]:
            pts = []
            for point in item.get("points", []):
                if isinstance(point, dict):
                    text = point.get("text", "")
                    pts.append(f'<li>{text}</li>')
                else:
                    pts.append(f'<li>{point}</li>')
            body_parts.append(f'<h4>{item.get("title", "")}</h4><ul>{"".join(pts)}</ul>')
        body_inner = "".join(body_parts)
        modules_html += f'<div class="lean-card {lc}"><div class="head {lc}"><span class="lean-icon">{icon}</span>{title}</div><div class="body">{body_inner}</div></div>\n'
    
    # 三、会议流程图：彩色圆+白图标+步骤号（与101场一致）
    time_slots = data.get("flow_times") or ["06:00-06:10", "06:10-07:30", "07:30-08:00", "08:00-08:40", "08:40-09:00"]
    if isinstance(time_slots, str):
        time_slots = ["06:00", "06:30", "07:30", "08:00", "08:50"]
    labels = ["开场介绍", "嘉宾分享", "干货提炼", "项目对接", "总结收尾"]
    circle_colors = ["blue", "purple", "orange", "red", "green"]
    flow_steps_html = ""
    for j, label in enumerate(labels):
        t = time_slots[j] if j < len(time_slots) else ""
        cc = circle_colors[j % len(circle_colors)]
        icon = flow_icons[j] if j < len(flow_icons) else "•"
        flow_steps_html += f'<div class="flow-node"><div class="circle {cc}">{icon}</div><span class="label">{label}</span><span class="time">{t}</span></div>\n'
        if j < len(labels) - 1:
            flow_steps_html += '<span class="flow-arrow">→</span>\n'
    
    # 四、热点研讨：信号标签（AI思考/用户观点/专家洞察/AI提问）+ Q: + 重点黄框（与101场一致）
    signal_map = {"ai": "AI思考", "user": "用户观点", "expert": "专家洞察", "question": "AI提问"}
    signal_class = {"ai": "ai", "user": "user", "expert": "expert", "question": "question"}
    highlights_html = ""
    for highlight in data.get("highlights", []):
        sig = highlight.get("signal", "user")
        sig_text = signal_map.get(sig, "用户观点")
        sig_cls = signal_class.get(sig, "user")
        title = highlight.get("title", "")
        time_val = highlight.get("time", "")
        content = highlight.get("content", "")
        insight = highlight.get("insight", "")
        highlights_html += f'''
        <div class="hot-item">
          <div class="top-row">
            <div><span class="signal-tag {sig_cls}">{sig_text}</span><div class="signal-time">{time_val}</div></div>
            <div class="topic-wrap"><span class="q-icon">Q:</span><span class="topic-title">{title}</span></div>
          </div>
          <div class="content">{content}</div>
          <div class="key-point"><span class="label">重点</span><br/>{insight}</div>
        </div>
        '''
    
    # 五、下次分享：4卡 橙/蓝/紫/红 + 图标（与101场一致）
    actions_list = data.get("actions", [])
    takeaways_list = data.get("takeaways", [])
    next_sources = list(actions_list[2:6]) if len(actions_list) > 2 else []
    takeaways_copy = list(takeaways_list)
    while len(next_sources) < 4 and takeaways_copy:
        tw = takeaways_copy.pop(0)
        pt = (tw.get("points", []) or [""])[0]
        desc = pt[:80] if isinstance(pt, str) else str(pt)[:80]
        next_sources.append({"content": tw.get("title", ""), "note": desc})
    while len(next_sources) < 4:
        next_sources.append({"content": "待定", "note": "下期公布"})
    next_colors = ["orange", "blue", "purple", "red"]
    next_icons = ["📌", "🎯", "📋", "💡"]
    next_share_html = ""
    for i, item in enumerate(next_sources[:4]):
        title = item.get("content", item.get("title", "待定"))[:22]
        desc = (item.get("note", "") or "")[:85]
        nc = next_colors[i % len(next_colors)]
        ni = next_icons[i % len(next_icons)]
        next_share_html += f'<div class="next-card {nc}"><div class="next-icon">{ni}</div><div class="title">{title}</div><div class="desc">{desc}</div></div>\n'
    
    # 六、项目推进：绿/蓝两卡 + 图标（与101场一致）
    progress_icons = ["🚀", "📊"]
    actions_html = ""
    for i, action in enumerate((data.get("actions", []))[:2]):
        content = action.get("content", "")
        note = action.get("note", "")
        card_class = "blue" if i == 1 else ""
        icon = progress_icons[i] if i < len(progress_icons) else "🚀"
        actions_html += f'<div class="progress-card {card_class}"><div class="progress-icon">{icon}</div><div class="title">项目推进</div><div class="desc">{content}<br/><small style="color:#6b7280;">{note}</small></div></div>\n'
    
    html = template
    # 支持两种模板：有 {{/xxx}} 的块替换，或仅 {{#xxx}} 的单占位符替换
    def replace_block(html, name, content):
        block_pattern = r'\{\{#' + name + r'\}\}.*?\{\{/' + name + r'\}\}'
        if re.search(block_pattern, html, flags=re.DOTALL):
            return re.sub(block_pattern, content.strip(), html, flags=re.DOTALL)
        return html.replace('{{#' + name + '}}', content.strip())
    html = replace_block(html, 'speakers', speakers_html)
    html = replace_block(html, 'modules', modules_html)
    html = replace_block(html, 'flow_steps', flow_steps_html)
    html = replace_block(html, 'highlights', highlights_html)
    html = replace_block(html, 'next_share', next_share_html)
    html = replace_block(html, 'actions', actions_html)
    html = simple_template_render(html, data)
    return html


def get_demo_data() -> dict:
    """获取示例数据"""
    return {
        "title": "1月27日｜程序员AI工具链×电动车民宿×金融视角",
        "subtitle": "Soul派对第84场",
        "date": "2026-01-27",
        "time": "06:54",
        "duration": "2小时26分47秒",
        "participants_count": "600+",
        "location": "Soul派对早场",
        
        "speakers": [
            {
                "name": "卡若",
                "role": "派对主持人·融资运营",
                "topics": "电动车×民宿撮合·不良资产收购·金融杠杆论"
            },
            {
                "name": "程序员（6号）",
                "role": "全栈开发·Cursor用户",
                "topics": "20年编码经历·AI超级个体探索·量化交易脚本"
            },
            {
                "name": "何包",
                "role": "电动车创始人",
                "topics": "泉州1000+车队·民宿酒店渠道·低成本扩张"
            }
        ],
        
        "modules": [
            {
                "title": "程序员AI转型：从代码到产品",
                "color": "blue",
                "items": [
                    {
                        "title": "Cursor新功能详解",
                        "points": [
                            "桌面控制能力升级（昨晚新增）",
                            "IDE+可视化界面友好",
                            "公司全员配置使用（含文员）"
                        ]
                    },
                    {
                        "title": "程序员创业陷阱",
                        "points": [
                            {"text": "99%创业失败=思维闭环", "class": "negative"},
                            {"text": "技术≠产品≠商业化", "class": "negative"},
                            "从业比创业稳定百倍"
                        ]
                    }
                ]
            },
            {
                "title": "电动车民宿合作：2万投入年赚百万",
                "color": "orange",
                "items": [
                    {
                        "title": "何包模式拆解",
                        "points": [
                            "与民宿合作摆放电动车",
                            "民宿不出钱，只需展位",
                            "泉州1000+车·月流水400万+"
                        ]
                    },
                    {
                        "title": "厦门落地挑战",
                        "points": [
                            "需要岛内民宿代运营者牵头",
                            "投入：20万覆盖10-20家民宿",
                            {"text": "需要执行人·资金only≠项目", "class": "negative"}
                        ]
                    }
                ]
            }
        ],
        
        "highlights": [
            {
                "title": "Cursor电脑控制能力",
                "time": "04:40-05:34",
                "content": "昨晚刚升级新版本，增加自动操控电脑界面能力。相比Claude Code的区别在于可视化界面更友好、配置更简单。",
                "insight": "信号：工具门槛再次降低，普通大学生培训2周就能达到3-5年经验水平",
                "color": "red"
            },
            {
                "title": "电动车民宿模式复制性",
                "time": "18:59-21:59",
                "content": "何包的模式：民宿方零投入，只需门口摆5-10辆电动车。所有成本由何包团队承担。",
                "insight": "亮点：投入20万可覆盖10-20家民宿。相对酒店投资低10倍",
                "color": "blue"
            },
            {
                "title": "全球债务与AI的必然性",
                "time": "30:05-40:59",
                "content": "346万亿债务无法真实还清。央行必然选大通胀+印钱路线。AI就是印钱的理由。",
                "insight": "结论：2026年唯一的印钞通行证就是AI",
                "color": "purple"
            }
        ],
        
        "takeaways": [
            {
                "title": "AI工具链现状",
                "color": "yellow",
                "points": [
                    "<strong>Cursor > Claude Code</strong>：可视化+配置友好+电脑控制",
                    "<strong>普通人使用：</strong>GPT、Cursor、N8N即可应对90%需求",
                    "<strong>机会窗口：</strong>懂工具的人还很少，现在进场是蓝海"
                ]
            },
            {
                "title": "电动车民宿扩张路径",
                "color": "blue",
                "points": [
                    "<strong>何包模式：</strong>零成本渠道（民宿不出钱）",
                    "<strong>投入：</strong>20万→10-20家民宿→100-200辆车",
                    "<strong>泉州成功：</strong>1000+车队月流400万→可复制到厦门"
                ]
            }
        ],
        
        "actions": [
            {
                "content": "如果你有民宿代运营背景或厦门岛内民宿资源，可以尝试对接何包的电动车项目。投入相对低（20万左右），ROI清晰。",
                "note": "群友何包已准备详细商业计划书，可在派对直接对接"
            },
            {
                "content": "现在Cursor等AI工具已成标配。如果还没掌握，可以像文员一样快速上手。懂工具的人现在还是少数。",
                "note": "机会：AI工具链会持续迭代，早学早用早变现"
            }
        ]
    }


def interactive_input() -> dict:
    """交互式输入数据"""
    print("\n=== 智能纪要生成器 - 交互模式 ===\n")
    
    data = {}
    
    # 基本信息
    data["title"] = input("会议标题: ") or "会议纪要"
    data["subtitle"] = input("副标题（如：Soul派对第X场）: ") or ""
    data["date"] = input("日期（YYYY-MM-DD）: ") or datetime.now().strftime("%Y-%m-%d")
    data["time"] = input("时间（HH:MM）: ") or ""
    data["duration"] = input("时长: ") or ""
    data["participants_count"] = input("参与人数: ") or ""
    data["location"] = input("地点/场景: ") or ""
    
    # 分享人
    print("\n--- 分享人清单（输入空行结束）---")
    speakers = []
    while True:
        name = input("分享人姓名（空行结束）: ")
        if not name:
            break
        role = input("  角色: ")
        topics = input("  话题: ")
        speakers.append({"name": name, "role": role, "topics": topics})
    data["speakers"] = speakers
    
    # 简化模式：直接生成
    print("\n数据收集完成！生成HTML...")
    
    # 使用默认的模块、片段等（可后续手动编辑JSON）
    data["modules"] = []
    data["highlights"] = []
    data["takeaways"] = []
    data["actions"] = []
    
    return data


def main():
    parser = argparse.ArgumentParser(description="智能纪要生成器 - 会议纪要")
    parser.add_argument("--demo", action="store_true", help="生成示例文件")
    parser.add_argument("--input", "-i", type=str, help="输入JSON文件路径")
    parser.add_argument("--output", "-o", type=str, help="输出HTML文件路径")
    parser.add_argument("--template", "-t", type=str, default="meeting.html", help="模板文件名，如 meeting.html 或 meeting_alt.html")
    parser.add_argument("--interactive", action="store_true", help="交互式输入")
    
    args = parser.parse_args()
    
    # 获取数据
    if args.demo:
        data = get_demo_data()
        output_name = "demo_meeting.html"
    elif args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        output_name = Path(args.input).stem + ".html"
    elif args.interactive:
        data = interactive_input()
        output_name = f"meeting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    else:
        # 默认生成demo
        print("未指定输入，生成示例文件...")
        data = get_demo_data()
        output_name = "demo_meeting.html"
    
    # 确定输出路径
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = OUTPUT_DIR / output_name
    
    # 生成HTML
    template_name = args.template if hasattr(args, "template") and args.template else "meeting.html"
    template_path = TEMPLATE_DIR / template_name
    if not template_path.exists():
        template_path = TEMPLATE_DIR / "meeting.html"
    html = generate_html(data, template_path)
    
    # 写入文件
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    
    print(f"\n✅ 生成成功: {output_path}")
    print(f"📂 用浏览器打开查看效果")
    
    # macOS自动打开
    if sys.platform == "darwin":
        open_it = input("\n是否立即打开？(y/n): ")
        if open_it.lower() == "y":
            os.system(f'open "{output_path}"')


if __name__ == "__main__":
    main()
