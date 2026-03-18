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
# 导出到外部：卡若Ai的文件夹/报告/（不在 Skill 内）
OUTPUT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告")

# 确保输出目录存在
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 颜色映射
COLOR_EMOJIS = {
    "blue": "💙",
    "green": "💚",
    "purple": "💜",
    "orange": "🧡",
    "red": "❤️",
    "yellow": "💛",
    "pink": "💗",
    "teal": "🩵",
    "indigo": "💜",
}

BORDER_COLORS = {
    "blue": "#93c5fd",
    "green": "#86efac",
    "purple": "#c4b5fd",
    "orange": "#fdba74",
    "red": "#fca5a5",
    "yellow": "#fde047",
    "pink": "#f9a8d4",
    "teal": "#5eead4",
    "indigo": "#a5b4fc",
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
    """生成HTML内容"""
    # 读取模板
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
    
    # 添加生成日期
    data["generate_date"] = datetime.now().strftime("%Y年%m月%d日 %H:%M")
    
    # 生成分享人HTML
    speakers_html = ""
    for speaker in data.get("speakers", []):
        speakers_html += f'''
        <div class="speaker-card glass-card glass-gray">
          <p><span class="name">{speaker["name"]}</span> <span class="role">/ {speaker["role"]}</span></p>
          <p class="topics">{speaker["topics"]}</p>
        </div>
        '''
    
    # 生成核心模块HTML
    modules_html = ""
    for i, module in enumerate(data.get("modules", []), 1):
        color = module.get("color", "blue")
        border_color = BORDER_COLORS.get(color, "#e2e8f0")
        
        items_html = ""
        for item in module.get("items", []):
            points_html = ""
            for point in item.get("points", []):
                if isinstance(point, dict):
                    cls = point.get("class", "")
                    text = point.get("text", "")
                else:
                    cls = ""
                    text = point
                points_html += f'<li class="{cls}">{text}</li>'
            
            items_html += f'''
            <div class="module-card glass-card glass-{color}">
              <h4>{item.get("title", "")}</h4>
              <ul>{points_html}</ul>
            </div>
            '''
        
        modules_html += f'''
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid {border_color};">
            {i}️⃣ {module.get("title", "")}
          </h3>
          <div class="grid grid-2">
            {items_html}
          </div>
        </div>
        '''
    
    # 生成重点片段HTML
    highlights_html = ""
    for highlight in data.get("highlights", []):
        color = highlight.get("color", "blue")
        emoji = COLOR_EMOJIS.get(color, "💡")
        highlights_html += f'''
        <div class="highlight-card glass-card glass-{color}">
          <div class="header-row">
            <h4>{emoji} {highlight.get("title", "")}</h4>
            <span class="time">{highlight.get("time", "")}</span>
          </div>
          <p class="content">{highlight.get("content", "")}</p>
          <p class="insight">💡 {highlight.get("insight", "")}</p>
        </div>
        '''
    
    # 生成干货分享HTML
    takeaways_html = ""
    for takeaway in data.get("takeaways", []):
        color = takeaway.get("color", "yellow")
        emoji = COLOR_EMOJIS.get(color, "💡")
        points_html = "".join([f"<li>{p}</li>" for p in takeaway.get("points", [])])
        takeaways_html += f'''
        <div class="takeaway-card glass-card glass-{color}">
          <h4>{emoji} {takeaway.get("title", "")}</h4>
          <ul>{points_html}</ul>
        </div>
        '''
    
    # 生成行动项HTML
    actions_html = ""
    for i, action in enumerate(data.get("actions", [])):
        colors = ["blue", "purple", "green", "orange"]
        color = colors[i % len(colors)]
        note_html = f'<p class="note">💬 {action.get("note", "")}</p>' if action.get("note") else ""
        actions_html += f'''
        <div class="action-card glass-card glass-{color}">
          <p class="content">{action.get("content", "")}</p>
          {note_html}
        </div>
        '''
    
    # 替换模板中的占位符
    html = template
    
    # 替换列表部分
    # 移除模板语法，插入生成的HTML
    import re
    
    # 替换 speakers
    html = re.sub(r'\{\{#speakers\}\}.*?\{\{/speakers\}\}', speakers_html, html, flags=re.DOTALL)
    
    # 替换 modules
    html = re.sub(r'\{\{#modules\}\}.*?\{\{/modules\}\}', modules_html, html, flags=re.DOTALL)
    
    # 替换 highlights
    html = re.sub(r'\{\{#highlights\}\}.*?\{\{/highlights\}\}', highlights_html, html, flags=re.DOTALL)
    
    # 替换 takeaways
    html = re.sub(r'\{\{#takeaways\}\}.*?\{\{/takeaways\}\}', takeaways_html, html, flags=re.DOTALL)
    
    # 替换 actions
    html = re.sub(r'\{\{#actions\}\}.*?\{\{/actions\}\}', actions_html, html, flags=re.DOTALL)
    
    # 替换简单变量
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
    parser.add_argument("--interactive", action="store_true", help="交互式输入")
    parser.add_argument("--no-open", action="store_true", help="生成后不询问是否打开（用于脚本调用）")
    
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
    template_path = TEMPLATE_DIR / "meeting.html"
    html = generate_html(data, template_path)
    
    # 写入文件
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    
    print(f"\n✅ 生成成功: {output_path}")
    print(f"📂 用浏览器打开查看效果")
    
    # macOS自动打开（--no-open 时跳过，便于脚本调用）
    if sys.platform == "darwin" and not getattr(args, "no_open", False):
        open_it = input("\n是否立即打开？(y/n): ")
        if open_it.lower() == "y":
            os.system(f'open "{output_path}"')


if __name__ == "__main__":
    main()
