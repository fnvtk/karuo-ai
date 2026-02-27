-- 仅添加每天 20:00 玩值电竞朋友圈（重复），今天与未来均会显示
tell application "Calendar"
	set calList to (every calendar whose writable is true)
	if (count of calList) is 0 then set calList to calendars
	set targetCal to item 1 of calList
	set today to current date
	set hours of today to 20
	set minutes of today to 0
	set seconds of today to 0
	set startDate to today
	set endDate to startDate + (30 * minutes)
	make new event at end of events of targetCal with properties {summary:"玩值电竞 · 每日朋友圈", description:"写一篇玩值电竞朋友圈", start date:startDate, end date:endDate, recurrence:"FREQ=DAILY"}
end tell
return "已添加"
