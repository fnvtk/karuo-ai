#!/usr/bin/env python3
"""
智能任务路由模块 - 根据任务难度自动选择本地模型或高级模型

用法：
    # 本模块为任务路由实现，其他模块可通过 运营中枢.task_router 导入
    
    # 评估任务难度
    score, reason = evaluate_task("帮我总结这段文字")
    
    # 判断是否使用本地模型
    use_local, model_suggestion = should_use_local_model("帮我写一个复杂的系统架构")
"""

import re
from typing import Tuple, Optional

# 本地模型适用的关键词
LOCAL_MODEL_KEYWORDS = [
    # 摘要类
    "总结", "摘要", "概括", "提取", "归纳",
    # 分类类
    "分类", "归类", "判断是什么", "属于哪",
    # 问题生成
    "追问", "提问", "问题列表", "疑问",
    # 任务拆解
    "拆解", "分解", "步骤", "清单",
    # 快速问答
    "解释", "什么是", "为什么", "怎么理解",
    # 数据分析决策
    "选择哪个", "推荐", "对比", "分析选", "帮我选",
    # 文本处理
    "改写", "润色", "翻译", "纠错",
    # 信息提取
    "提取", "找出", "识别", "列出",
]

# 高级模型必需的关键词
ADVANCED_MODEL_KEYWORDS = [
    # 复杂代码
    "写代码", "实现", "开发", "编写程序", "系统架构", "重构",
    # 深度分析
    "深度分析", "详细分析", "全面评估", "战略",
    # 创意写作
    "写文章", "写报告", "写方案", "商业计划", "创作",
    # 复杂调试
    "调试", "排查", "为什么报错", "解决bug",
    # 多步骤任务
    "完整项目", "从零开始", "端到端",
]

# 难度评估维度
COMPLEXITY_INDICATORS = {
    # 步骤数指标
    "steps": {
        "high": ["整个", "完整", "从头到尾", "端到端", "全流程"],
        "medium": ["几个步骤", "多步", "然后", "接着"],
        "low": ["一个", "简单", "快速", "直接"]
    },
    # 创造性指标
    "creativity": {
        "high": ["创意", "创新", "独特", "原创", "设计"],
        "medium": ["优化", "改进", "调整"],
        "low": ["按照", "根据", "参考", "模板"]
    },
    # 代码复杂度
    "code": {
        "high": ["系统", "架构", "微服务", "分布式", "框架"],
        "medium": ["函数", "类", "模块", "API"],
        "low": ["解释代码", "看懂", "理解"]
    },
    # 推理深度
    "reasoning": {
        "high": ["为什么会", "深层原因", "根本原因", "本质"],
        "medium": ["分析", "评估", "判断"],
        "low": ["是什么", "有哪些", "列出"]
    }
}


def evaluate_task(task: str) -> Tuple[int, str]:
    """
    评估任务难度（1-5分）
    
    Args:
        task: 用户的任务描述
        
    Returns:
        (score, reason): 难度分数和判断理由
    """
    score = 1
    reasons = []
    
    # 检查是否包含高级模型必需的关键词
    for keyword in ADVANCED_MODEL_KEYWORDS:
        if keyword in task:
            score = max(score, 4)
            reasons.append(f"包含复杂关键词「{keyword}」")
            break
    
    # 检查各维度复杂度
    for dimension, indicators in COMPLEXITY_INDICATORS.items():
        for level, keywords in indicators.items():
            for keyword in keywords:
                if keyword in task:
                    if level == "high":
                        score = max(score, 4)
                        reasons.append(f"{dimension}维度高复杂度")
                    elif level == "medium":
                        score = max(score, 2)
                    break
    
    # 检查任务长度（长任务通常更复杂）
    if len(task) > 200:
        score = max(score, 3)
        reasons.append("任务描述较长")
    
    # 如果包含本地模型关键词，降低分数
    for keyword in LOCAL_MODEL_KEYWORDS:
        if keyword in task:
            score = min(score, 3)
            reasons.append(f"适合本地模型「{keyword}」")
            break
    
    # 生成理由
    if not reasons:
        reasons.append("通用任务")
    
    return score, "；".join(reasons)


def should_use_local_model(task: str) -> Tuple[bool, str]:
    """
    判断是否应该使用本地模型
    
    Args:
        task: 用户的任务描述
        
    Returns:
        (use_local, model_suggestion): 是否使用本地模型，以及推荐的模型
    """
    score, reason = evaluate_task(task)
    
    if score <= 3:
        # 根据任务选择具体的本地模型
        if any(k in task for k in ["代码", "编程", "函数"]):
            model = "qwen2.5:1.5b"  # 代码任务用稍大的模型
        else:
            model = "qwen2.5:0.5b"  # 其他用轻量模型
        return True, model
    else:
        return False, "Claude/Opus（高级模型）"


def get_task_prompt_for_local(task: str, model: str = "qwen2.5:1.5b") -> str:
    """
    获取本地模型调用命令
    
    Args:
        task: 用户的任务描述
        model: 使用的模型名称
        
    Returns:
        可直接执行的命令
    """
    # 转义特殊字符
    escaped_task = task.replace("'", "'\\''")
    return f"echo '{escaped_task}' | ollama run {model}"


def format_local_model_notice(task: str, score: int, model: str) -> str:
    """
    格式化本地模型使用提醒
    
    Args:
        task: 任务描述（用于显示）
        score: 难度分数
        model: 使用的模型
        
    Returns:
        格式化的提醒文本
    """
    difficulty = "简单" if score <= 2 else "中等"
    return f"""🔥 [本地模型] 正在使用本地AI处理...
├─ 模型：{model}
├─ 任务难度：{score}分（{difficulty}）
├─ 状态：离线可用 | CPU使用控制在30%
└─ 响应预计：3-10秒"""


# 快捷函数
def auto_route(task: str) -> dict:
    """
    一键自动路由
    
    Args:
        task: 用户的任务描述
        
    Returns:
        路由结果字典
    """
    score, reason = evaluate_task(task)
    use_local, model = should_use_local_model(task)
    
    return {
        "score": score,
        "reason": reason,
        "use_local": use_local,
        "model": model,
        "notice": format_local_model_notice(task, score, model) if use_local else None,
        "command": get_task_prompt_for_local(task, model) if use_local else None
    }


if __name__ == "__main__":
    # 测试用例
    test_tasks = [
        "帮我总结这段文字",
        "帮我选择一个60元以下的Cursor账号",
        "帮我写一个完整的私域运营系统架构",
        "解释一下Python装饰器",
        "帮我深度分析这个商业模式的可行性",
        "把这些商品分类一下",
    ]
    
    print("=" * 60)
    print("智能任务路由测试")
    print("=" * 60)
    
    for task in test_tasks:
        result = auto_route(task)
        print(f"\n任务：{task}")
        print(f"难度：{result['score']}分 | 理由：{result['reason']}")
        print(f"模型：{result['model']}")
        if result['use_local']:
            print(f"命令：{result['command'][:50]}...")
        print("-" * 40)
