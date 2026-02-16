-- 🔥 卡若AI 语音助手 AppleScript
-- 双击运行或添加到Siri快捷指令

-- 弹出输入框询问问题
set userQuestion to text returned of (display dialog "问卡若AI什么？" default answer "" buttons {"取消", "发送"} default button "发送" with title "🔥 卡若AI")

if userQuestion is not "" then
    -- 调用API
    set apiUrl to "http://localhost:5888/api/chat"
    set jsonData to "{\"message\": \"" & userQuestion & "\", \"voice\": false}"
    
    try
        set curlCommand to "curl -s -X POST '" & apiUrl & "' -H 'Content-Type: application/json' -d '" & jsonData & "' --max-time 30"
        set apiResponse to do shell script curlCommand
        
        -- 解析JSON响应
        set pythonScript to "import json; print(json.loads('''" & apiResponse & "''').get('response', '抱歉，出错了'))"
        set answer to do shell script "python3 -c \"" & pythonScript & "\""
        
        -- 显示结果
        display dialog answer buttons {"好的"} default button "好的" with title "🔥 卡若AI 回复"
        
        -- 语音播报
        say answer using "Tingting"
        
    on error errMsg
        display dialog "连接失败：" & errMsg buttons {"好的"} default button "好的" with title "错误"
    end try
end if
