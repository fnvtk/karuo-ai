#!/usr/bin/env python3
"""
智能纪要生成器 - 复盘总结
将JSON数据生成毛玻璃风格的HTML复盘总结文档

使用方法：
  python generate_review.py --demo                    # 生成示例
  python generate_review.py --input data.json        # 从JSON生成
"""

import json
import os
import sys
import argparse
import re
from datetime import datetime
from pathlib import Path

# 脚本目录
SCRIPT_DIR = Path(__file__).parent
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"
OUTPUT_DIR = SCRIPT_DIR.parent / "output"

# 确保输出目录存在
OUTPUT_DIR.mkdir(exist_ok=True)


def simple_template_render(template: str, data: dict) -> str:
    """简单的模板渲染"""
    result = template
    for key, value in data.items():
        if isinstance(value, str):
            result = result.replace("{{" + key + "}}", value)
    return result


def generate_html(data: dict, template_path: Path) -> str:
    """生成HTML内容"""
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
    
    # 添加生成日期
    data["generate_date"] = datetime.now().strftime("%Y年%m月%d日 %H:%M")
    
    # 生成目标区域HTML
    goal = data.get("goal", {})
    goal_html = f'''
    <div class="goal-grid">
      <div class="goal-item">
        <p class="label">目标</p>
        <p class="value target">{goal.get("target", "")}</p>
      </div>
      <div class="goal-item">
        <p class="label">实际完成</p>
        <p class="value result">{goal.get("result", "")}</p>
      </div>
      <div class="goal-item">
        <p class="label">达成率</p>
        <p class="value achievement">{goal.get("achievement", "")}</p>
      </div>
    </div>
    '''
    
    # 生成过程时间线HTML
    process_html = ""
    for item in data.get("process", []):
        process_html += f'''
        <div class="timeline-item">
          <p class="month">{item.get("month", "")}</p>
          <p class="content">{item.get("content", "")}</p>
        </div>
        '''
    
    # 生成反思列表HTML
    reflection_html = ""
    for item in data.get("reflection", []):
        reflection_html += f'<li>{item}</li>'
    
    # 生成下一步HTML
    next_html = ""
    for item in data.get("next_steps", []):
        next_html += f'''
        <div class="next-item">
          <p class="month">{item.get("month", "")}</p>
          <p class="action">{item.get("action", "")}</p>
        </div>
        '''
    
    # 替换模板
    html = template
    
    # 替换目标区域
    html = re.sub(
        r'<div class="goal-grid">.*?</div>\s*</section>',
        goal_html + '</section>',
        html,
        flags=re.DOTALL
    )
    
    # 替换过程
    html = re.sub(r'\{\{#process\}\}.*?\{\{/process\}\}', process_html, html, flags=re.DOTALL)
    
    # 替换反思
    html = re.sub(r'\{\{#reflection\}\}.*?\{\{/reflection\}\}', reflection_html, html, flags=re.DOTALL)
    
    # 替换下一步
    html = re.sub(r'\{\{#next_steps\}\}.*?\{\{/next_steps\}\}', next_html, html, flags=re.DOTALL)
    
    # 替换简单变量
    html = simple_template_render(html, data)
    html = html.replace("{{goal.target}}", goal.get("target", ""))
    html = html.replace("{{goal.result}}", goal.get("result", ""))
    html = html.replace("{{goal.achievement}}", goal.get("achievement", ""))
    
    return html


def get_demo_data() -> dict:
    """获取示例数据"""
    return {
        "title": "私域云阿米巴模式落地复盘",
        "period": "2025年Q2（4月-6月）",
        "date": "2025-06-30",
        
        "goal": {
            "target": "3个月绑定15家合作方",
            "result": "实际完成18家",
            "achievement": "120%"
        },
        
        "process": [
            {
                "month": "5月",
                "content": "启动流量测试。日播放量从0.8万提升至1.2万，合作方咨询量周增30%。完成首批5家合作方签约。"
            },
            {
                "month": "6月",
                "content": "上线私域系统。30名兼职完成10家企业培训。系统稳定性达到99.5%，客户满意度4.8/5。"
            },
            {
                "month": "7月",
                "content": "现金分润验证。单家月均分润1.2万，合作方留存率90%。完成剩余8家签约，超额完成目标。"
            }
        ],
        
        "reflection": [
            "初期未明确「不属于对方的钱」的定义，导致2家合作方对分润规则产生误解，需补充分润规则文档",
            "系统培训周期偏长（平均3周），可优化为视频+1对1答疑模式，缩短至1.5周",
            "部分合作方执行力不足，需增加「执行力评估」环节，筛选高匹配度合作方"
        ],
        
        "summary": "流量+系统+现金分润是绑定合作方的核心三角。下阶段需强化规则透明化，同时优化培训效率和合作方筛选机制。",
        
        "next_steps": [
            {"month": "8月", "action": "更新《云阿米巴分润手册》2.0版本，明确分润边界和计算公式"},
            {"month": "9月", "action": "开展合作方培训升级，推出视频课程+1v1答疑模式"},
            {"month": "10月", "action": "启动Q3复盘，目标新增25家合作方"}
        ]
    }


def main():
    parser = argparse.ArgumentParser(description="智能纪要生成器 - 复盘总结")
    parser.add_argument("--demo", action="store_true", help="生成示例文件")
    parser.add_argument("--input", "-i", type=str, help="输入JSON文件路径")
    parser.add_argument("--output", "-o", type=str, help="输出HTML文件路径")
    
    args = parser.parse_args()
    
    # 获取数据
    if args.demo:
        data = get_demo_data()
        output_name = "demo_review.html"
    elif args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        output_name = Path(args.input).stem + ".html"
    else:
        print("未指定输入，生成示例文件...")
        data = get_demo_data()
        output_name = "demo_review.html"
    
    # 确定输出路径
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = OUTPUT_DIR / output_name
    
    # 生成HTML
    template_path = TEMPLATE_DIR / "review.html"
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
