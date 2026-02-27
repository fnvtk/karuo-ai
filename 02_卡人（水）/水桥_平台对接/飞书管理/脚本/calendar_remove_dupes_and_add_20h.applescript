-- 1) 删除指定日重复项（3月27日 及 今日）；2) 确保每天20:00 玩值电竞朋友圈（重复）
-- 直接执行：osascript 本文件

set dayToClean to (current date)
set hours of dayToClean to 0
set minutes of dayToClean to 0
set seconds of dayToClean to 0
-- 也清理 2026-03-27（用户截图日）
set march27 to (current date)
set year of march27 to 2026
set month of march27 to 3
set day of march27 to 27
set hours of march27 to 0
set minutes of march27 to 0
set seconds of march27 to 0
set daysToClean to {dayToClean, march27}
	-- 仅清理今日与 3月27 日两天的重复项

tell application "Calendar"
	set allCals to (every calendar whose writable is true)
	if (count of allCals) is 0 then set allCals to calendars
	
	repeat with targetDay in daysToClean
		set dayEnd to targetDay + 86400
		repeat with cal in allCals
			try
				set dayEvents to (every event of cal where start date ≥ targetDay and start date < dayEnd)
				set seen to {}
				set toDelete to {}
				repeat with ev in dayEvents
					try
						set evSummary to summary of ev
						set evStart to start date of ev
						set key to (evSummary & "|" & (evStart as text))
						if seen contains key then
							set end of toDelete to ev
						else
							set end of seen to key
						end if
					end try
				end repeat
				repeat with ev in toDelete
					try
						delete ev
					end try
				end repeat
			end try
		end repeat
	end repeat
	
	-- 添加每天 20:00 玩值电竞朋友圈（重复），若已存在则跳过
	set calList to (every calendar whose writable is true)
	if (count of calList) is 0 then set calList to calendars
	set targetCal to item 1 of calList
	
	set today to current date
	set hours of today to 20
	set minutes of today to 0
	set seconds of today to 0
	set startDate to today
	set endDate to startDate + (30 * minutes)
	
	set eventSummary to "玩值电竞 · 每日朋友圈"
	set eventDesc to "写一篇玩值电竞朋友圈"
	
	-- 检查今天 20:00 是否已有该事件
	set todayStart to (current date)
	set hours of todayStart to 20
	set minutes of todayStart to 0
	set todayEnd to todayStart + (1 * hours)
	set existingList to (every event of targetCal where summary is eventSummary and start date ≥ todayStart and start date < todayEnd)
	if (count of existingList) is 0 then
		make new event at end of events of targetCal with properties {summary:eventSummary, description:eventDesc, start date:startDate, end date:endDate, recurrence:"FREQ=DAILY"}
	end if
end tell

return "已清理重复项并确保20:00朋友圈重复事件"
