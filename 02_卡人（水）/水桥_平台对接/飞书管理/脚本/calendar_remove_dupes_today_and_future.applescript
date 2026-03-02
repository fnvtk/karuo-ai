-- 删除「今天 + 未来一段时间」内每天重复的日历项，每天只保留每类第一条
-- 执行：osascript "本文件路径"
-- 修改 futureDays 可调范围：60=约1分钟，90=默认，365=全年（约3–5分钟）

set futureDays to 90

set baseDay to (current date)
set hours of baseDay to 0
set minutes of baseDay to 0
set seconds of baseDay to 0

set totalDeleted to 0

tell application "Calendar"
	set allCals to (every calendar whose writable is true)
	if (count of allCals) is 0 then set allCals to calendars

	repeat with dayOffset from 0 to futureDays
		set targetDay to baseDay + (dayOffset * 86400)
		set dayEnd to targetDay + 86400

		repeat with cal in allCals
			try
				set dayEvents to (every event of cal where start date ≥ targetDay and start date < dayEnd)
				set seen to {}
				set toDelete to {}
				repeat with ev in dayEvents
					try
						set k to (summary of ev) & "|" & ((start date of ev) as text)
						if seen contains k then
							set end of toDelete to ev
						else
							set end of seen to k
						end if
					end try
				end repeat
				repeat with ev in toDelete
					try
						delete ev
						set totalDeleted to totalDeleted + 1
					end try
				end repeat
			end try
		end repeat
	end repeat
end tell

return "今日及未来" & (futureDays as text) & "天重复项已清理，共删除 " & (totalDeleted as text) & " 条"
