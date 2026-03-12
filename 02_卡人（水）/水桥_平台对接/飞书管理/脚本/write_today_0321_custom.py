#!/usr/bin/env python3
"""
今日飞书日志（3月定制）：200视频/日、工具研发10～30切片、售内容产出、李永平、年度目标百分比
"""
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date, CONFIG, get_today_date_str


def build_tasks_today():
    """今日：核心目标 + 当周复盘（日期以中国时间为准）"""
    date_str = get_today_date_str()

    # 粗略进度：结合 3 月 10～12 日，200 视频/日 还在「打底」阶段
    percent_text = "200 视频/日流水线完成度预估：≈30%（工具与流程打底阶段）"

    return [
        # 1）核心执行：200 视频/日
        {
            "person": "远志（玩值）",
            "events": ["200视频分发", "剪辑+分发一体化"],
            "quadrant": "重要紧急",
            "t_targets": [
                "核心目标：每天稳定剪辑并分发 200 条视频到全网（抖音、快手、视频号、B站等）",
                "把「剪辑 → 上架 → 分发」做成一条稳定的流水线，而不是零散操作",
            ],
            "n_process": [
                "对照 3 月 10～12 日的目标，梳理本周已完成的：素材池、剪辑 SOP、分发清单等基础工作",
                percent_text,
            ],
            "t_thoughts": [
                "先把 200 条/日做「稳定」，再考虑扩量；优先打通从素材到上架的关键 3～5 个动作。",
            ],
            "w_work": [
                "今天：至少完成一条完整链路的压测（从原始视频到多平台同时上线）",
                "梳理「200 条/日」需要的最小人力/工具配置，并写成简洁清单",
                "盘点目前可自动化的动作（批量裁切、模板套用、标题生成、分发脚本等）",
            ],
            "f_feedback": [
                "今天结束前给出一个「200 条/日」的可执行方案（包含步骤、工具、人天）",
                "进度评估：按「方案清晰度 + 工具可用度」两个维度持续更新百分比",
            ],
        },
        # 2）卡若 · 当周电脑工作 & 聊天复盘
        {
            "person": "卡若",
            "events": ["本周复盘", "写作+系统搭建"],
            "quadrant": "重要不紧急",
            "t_targets": [
                "看清这几天在电脑上具体做了什么：写作、系统、聊天决策，把碎片动作变成一条清晰叙事线。",
                "对齐长期目标：私域 IP + 卡若AI 操盘系统，评估当前进度与差距。",
            ],
            "n_process": [
                "写作：集中完善《卡若私域-28套商业模式》基础模式 1～6（预存创业基金、极差+平层、渠道业绩区域奖、免费礼包、推三返一、云仓代理发货等），为后续课程/产品做模型底座。",
                "系统：多次迭代飞书日志脚本（token 静默刷新、按月路由、旧版排版恢复、分批写入防报错），确保“每天 200 视频 + 日志复盘”可以真正全自动落地。",
                "聊天：围绕飞书日志、售的多平台分发（优酷、公众号等接口）、以及年度目标拆解，持续讨论结构与节奏。",
            ],
            "t_thoughts": [
                "最近的精力主要沉在「底层建设」：一边打磨商业模式文本，一边把飞书日志/自动化流程做好，短期产出不一定立刻变现，但会决定 2026 全年的天花板。",
                "距离总体目标还有明显差距：内容资产（28 套模式+日更日志）和分发系统（200 视频/日）都还在成型期，需要给自己一个 1～2 个月的「打地基窗口」。",
            ],
            "w_work": [
                "对今天以及 3 月 10～12 日所有电脑上的工作做一次简单清单：写过的章节、改过的脚本、聊过的关键决策，各列 3～5 条即可。",
                "在飞书日志里保持「每天 1 段当日复盘」，用同一个结构：今天做了什么 → 有什么进展 → 距离年度目标差多少。",
                "为《卡若私域-28套商业模式》建立一个「已完稿章节清单 + 待完稿清单」，后面每天写作可以直接勾选推进。",
            ],
            "f_feedback": [
                "今天已明确本周主要产出：商业模式 1～6 初稿 + 飞书日志系统稳定版。",
                "对年度目标的主线更清晰：用 200 视频/日 + 系统化复盘，持续放大这套商业模式和 IP。",
            ],
        },
    ]


def main():
    date_str = get_today_date_str()
    print("=" * 50)
    print(f"📝 写入今日飞书日志（200视频+工具研发+售内容+年度目标%）：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token，请执行：python3 feishu_token_cli.py get-access-token")
        sys.exit(1)

    tasks = build_tasks_today()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=True)
    # 无论成功失败，写完都打开飞书
    open_token = target_wiki_token or (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(2) or CONFIG.get("WIKI_TOKEN")
    open_result(open_token)
    if ok:
        print(f"✅ {date_str} 飞书日志已写入飞书")
        sys.exit(0)
    print("❌ 写入失败（见上方提示：token/月份不符时请先迁当月文档并 set-march-token）")
    print("📎 飞书日志固定链接：https://cunkebao.feishu.cn/wiki/ZdSBwHrsGii14HkcIbccQ0flnee")
    sys.exit(1)


if __name__ == "__main__":
    main()
