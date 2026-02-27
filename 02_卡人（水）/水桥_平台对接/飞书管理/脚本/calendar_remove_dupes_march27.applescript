-- 仅删除 2026年3月27日 当天的重复日历项（保留每类第一个，删其余）
set targetDay to (current date)
set year of targetDay to 2026
set month of targetDay to 3
set day of targetDay to 27
set hours of targetDay to 0
set minutes of targetDay to 0
set seconds of targetDay to 0
set dayEnd to targetDay + 86400

tell application "Calendar"
	set allCals to (every calendar whose writable is true)
	if (count of allCals) is 0 then set allCals to calendars
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
				end try
			end repeat
		end try
	end repeat
end tell
return "3月27日重复项已删"
