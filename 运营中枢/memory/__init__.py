"""
卡若AI 记忆管理共享模块（兼容层）

合并自 _共享模块，实际实现位于 02_卡人（水）/水溪_整理归档/自动记忆管理/脚本/
"""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_MEMORY_SCRIPT = _REPO_ROOT / "02_卡人（水）" / "水溪_整理归档" / "自动记忆管理" / "脚本"
if str(_MEMORY_SCRIPT) not in sys.path:
    sys.path.insert(0, str(_MEMORY_SCRIPT))

from memory_manager import MemoryManager

__all__ = ["MemoryManager"]
