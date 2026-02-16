-- 飞书妙记自动下载脚本
-- 使用方法：osascript feishu_download.scpt "飞书妙记链接"

on run argv
    set minuteURL to item 1 of argv
    
    -- 打开飞书并访问链接
    tell application "Lark"
        activate
    end tell
    
    delay 2
    
    -- 使用系统事件模拟操作
    tell application "System Events"
        tell process "Lark"
            -- 等待窗口加载
            delay 3
            
            -- 尝试找到下载按钮（通过快捷键或菜单）
            -- Cmd+S 通常是保存/下载
            keystroke "s" using {command down}
            
            delay 1
        end tell
    end tell
    
    return "下载命令已发送"
end run
