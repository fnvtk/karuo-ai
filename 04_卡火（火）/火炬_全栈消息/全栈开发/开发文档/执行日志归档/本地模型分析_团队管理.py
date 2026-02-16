#!/usr/bin/env python3
"""
使用本地模型（Ollama）分析卡若AI团队管理架构

执行：在卡若AI根目录下运行
  python _执行日志/本地模型分析_团队管理.py

作者：火种（学习专员）
日期：2026-01-29
"""

import sys
import os
from datetime import datetime

# 确保能导入卡若AI模块
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# 团队管理摘要（控制在约3500字内，供本地模型分析）
TEAM_MANAGEMENT_SUMMARY = """
【卡若AI 团队管理架构摘要】

一、整体结构
- 1个大总管（卡若AI）+ 5位团队长 + 17位专员 = 22人
- 五行对应：金(基础设施)、水(信息流程)、木(产品内容)、火(技术研发)、土(商业复制)
- 命名方式：记忆宫殿法，如金剑/金盾/金仓/金链、水溪/水泉/水桥、木叶/木根/木果、火炬/火锤/火眼/火种、土基/土砖/土渠

二、五位团队长及其管理风格
1. 卡资(金)-ISTJ：规范化巡检制。每日/周巡检、风险操作审批、异常立即汇报、值班表。招募偏好ISTJ/ISFJ/ESTJ/ISTP。
2. 卡人(水)-ENFJ：协调沟通制。晨会同步、信息流转规范、任务完成即时反馈。招募偏好ENFJ/ESFJ/INFJ/ISFJ。
3. 卡木(木)-ISTP：快速迭代制。MVP交付、产出即交付、少说多做。招募偏好ISTP/ESTP/ISFP/INTP。
4. 卡火(火)-INTP：深度思考制。技术评审、代码提交前评审、追根究底。招募偏好INTP/INTJ/ISTP/ENTP。
5. 卡土(土)-ENTJ：目标驱动制。ROI优先、周报必须带数据、可复制能裂变。招募偏好ENTJ/ESTJ/INTJ/ESTP。

三、专员技能归属（每人1-4项技能，无交叉）
- 金组4人：金剑(服务器/监控)、金盾(数据库/备份/微信解析)、金仓(NAS/磁盘/容灾/照片)、金链(iPhone/局域网/iCloud)
- 水组3人：水溪(文件/文档/归档/记忆)、水泉(需求拆解/任务规划)、水桥(飞书/小程序)
- 木组3人：木叶(视频切片)、木根(网站逆向)、木果(项目生成/模板/档案)
- 火组4人：火炬(全栈开发)、火锤(代码修复)、火眼(智能追问/纪要)、火种(读书/日记/本地模型)
- 土组3人：土基(商业工具/分润)、土砖(技能工厂)、土渠(流量/招商)

四、执行日志
- 每位成员有独立日志文件
- 每日有日报汇总
- 记录执行人、状态、耗时、结果
"""


def get_local_llm_response(prompt: str, model: str = "qwen2.5:1.5b") -> str:
    """调用本地 Ollama 获取分析结果（直接 HTTP，不依赖路径）"""
    try:
        import requests
        r = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt[:8000], "stream": False},
            timeout=120
        )
        if r.status_code == 200:
            return r.json().get("response", "无响应")
        return f"API错误: {r.status_code} - 请确认已运行 ollama serve"
    except requests.exceptions.ConnectionError:
        return "错误: 无法连接 Ollama。请先启动：ollama serve"
    except Exception as e:
        return f"调用失败: {e}"


def main():
    print("🔥 [本地模型] 正在使用本地AI分析团队管理...")
    print("├─ 模型：qwen2.5:1.5b")
    print("├─ 任务：团队管理架构分析")
    print("└─ 响应预计：5-15秒\n")

    prompt = f"""你是一位组织与团队管理分析专家。请根据以下「卡若AI团队管理架构」摘要，用简洁中文回答（每条1-3行）：

{TEAM_MANAGEMENT_SUMMARY}

请分析并输出：

1. 【架构优势】这种22人、五行分组的架构有哪些明显优点？（列3点）
2. 【潜在风险】可能存在的管理或执行风险是什么？（列2-3点）
3. 【MBTI匹配度】五位团队长的性格与其管理制度是否一致？有无冲突？（简要说明）
4. 【改进建议】如果要优化，你最想提的1-2条具体建议是什么？
5. 【一句话总结】用一句话概括这个AI团队管理设计的核心特点。

直接按 1、2、3、4、5 分点回答，不要多余开场白。"""

    result = get_local_llm_response(prompt)

    # 输出结果
    print("=" * 60)
    print("【本地模型 · 团队管理分析结果】")
    print("=" * 60)
    print(result)
    print("=" * 60)

    # 写入执行日志
    report_dir = os.path.join(ROOT, "_执行日志")
    report_path = os.path.join(report_dir, "本地模型分析_团队管理_结果.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 本地模型分析：卡若AI 团队管理\n\n")
        f.write(f"> 分析时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write("> 模型：qwen2.5:1.5b（本地Ollama）\n\n")
        f.write("---\n\n")
        f.write("## 分析结果\n\n")
        f.write(result)
        f.write("\n\n---\n\n## 分析输入摘要\n\n")
        f.write("<details><summary>点击展开：输入给模型的团队管理摘要</summary>\n\n")
        f.write(TEAM_MANAGEMENT_SUMMARY)
        f.write("\n\n</details>\n")
    print(f"\n✅ 分析结果已保存：{report_path}")

    # 追加到火种执行日志
    huozhong_log = os.path.join(report_dir, "火组日志", "火种.md")
    if os.path.exists(huozhong_log):
        with open(huozhong_log, "r", encoding="utf-8") as f:
            content = f.read()
        new_entry = f"""

### {datetime.now().strftime('%Y-%m-%d')}

- **[{datetime.now().strftime('%H:%M')}]** 使用本地模型分析团队管理
  - 内容：调用 qwen2.5:1.5b 对卡若AI 22人团队架构进行分析
  - 状态：✅完成
  - 结果已保存：`_执行日志/本地模型分析_团队管理_结果.md`
"""
        if "使用本地模型分析团队管理" not in content:
            with open(huozhong_log, "a", encoding="utf-8") as f:
                f.write(new_entry)
            print("✅ 已写入火种执行日志")
    return 0


if __name__ == "__main__":
    sys.exit(main())
