"""
卡若AI 任务路由共享模块（兼容层）

实际实现位于 02_卡人（水）/水泉_规划拆解/任务路由/
"""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SHUICQUAN = _REPO_ROOT / "02_卡人（水）" / "水泉_规划拆解"
if str(_SHUICQUAN) not in sys.path:
    sys.path.insert(0, str(_SHUICQUAN))

# 从 任务路由 模块导入
from 任务路由 import (
    evaluate_task,
    should_use_local_model,
    get_task_prompt_for_local,
    format_local_model_notice,
    auto_route,
)

__all__ = [
    "evaluate_task",
    "should_use_local_model",
    "get_task_prompt_for_local",
    "format_local_model_notice",
    "auto_route",
]
