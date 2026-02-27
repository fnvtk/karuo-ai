#!/bin/bash
# 在本机 Mac 日历中新增：每天 20:00 写一篇玩值电竞朋友圈（重复事件）
# 执行一次即可，事件会按日重复

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_MARKER="$SCRIPT_DIR/.added_wanzhi_20h"

# 避免重复添加
if [ -f "$LOG_MARKER" ]; then
  echo "✅ 玩值电竞朋友圈 20:00 重复事件已存在（见日历），跳过"
  exit 0
fi

# 今晚 20:00 起，每天重复
osascript <<'APPLESCRIPT'
set eventTitle to "写一篇玩值电竞朋友圈"
set eventSummary to "玩值电竞 · 每日朋友圈"
-- 从今天 20:00 开始，持续 30 分钟
set today to current date
set hours of today to 20
set minutes of today to 0
set startDate to today
set endDate to startDate + (30 * minutes)

tell application "Calendar"
    -- 使用第一个可写日历（通常是「工作」或主日历）
    set calList to (every calendar whose writable is true)
    if (count of calList) is 0 then
        set calList to calendars
    end if
    if (count of calList) is 0 then
        return "未找到日历"
    end if
    set targetCal to item 1 of calList
    make new event at end of events of targetCal with properties {summary:eventSummary, description:eventTitle, start date:startDate, end date:endDate, recurrence:"FREQ=DAILY"}
    return "已添加"
end tell
APPLESCRIPT

if [ $? -eq 0 ]; then
  touch "$LOG_MARKER"
  echo "✅ 已在本机日历添加重复事件：每天 20:00 写一篇玩值电竞朋友圈"
else
  echo "⚠️ 添加失败，请在本机「日历」中手动新建：每天 20:00，重复每日，标题「玩值电竞 · 每日朋友圈」"
fi
