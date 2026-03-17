#!/bin/bash

# MacBook屏幕镜像到局域网设备脚本
# 作者：卡若
# 功能：提供多种MacBook屏幕镜像方案

echo "=== MacBook屏幕镜像解决方案 ==="
echo "选择屏幕镜像方案："
echo "1. 使用macOS内置屏幕共享（推荐）"
echo "2. 使用BetterDisplay虚拟显示器"
echo "3. 使用AirPlay镜像"
echo "4. 下载安装第三方镜像工具"
echo "5. 使用浏览器投屏"

read -p "请选择方案 (1-5): " choice

case $choice in
    1)
        echo "=== 启用macOS内置屏幕共享 ==="
        echo "正在打开系统偏好设置..."
        open /System/Library/PreferencePanes/SharingPref.prefPane
        echo ""
        echo "请在系统偏好设置中："
        echo "1. 勾选'屏幕共享'选项"
        echo "2. 设置访问权限（所有用户或指定用户）"
        echo "3. 记录显示的IP地址"
        echo "4. 其他设备可通过 vnc://你的IP地址 连接"
        echo ""
        echo "当前MacBook IP地址："
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
        ;;
    2)
        echo "=== 使用BetterDisplay虚拟显示器 ==="
        if pgrep -f "BetterDisplay" > /dev/null; then
            echo "BetterDisplay已运行"
            echo "请在BetterDisplay中："
            echo "1. 创建虚拟显示器"
            echo "2. 设置为镜像模式"
            echo "3. 启用网络共享功能"
        else
            echo "正在启动BetterDisplay..."
            open -a "BetterDisplay"
            sleep 2
            echo "请配置BetterDisplay的虚拟显示器和网络共享功能"
        fi
        ;;
    3)
        echo "=== 使用AirPlay镜像 ==="
        echo "检查AirPlay状态..."
        if system_profiler SPDisplaysDataType | grep -q "AirPlay"; then
            echo "支持AirPlay镜像"
            echo "请在菜单栏点击控制中心 > 屏幕镜像"
            echo "选择要镜像到的设备"
        else
            echo "当前系统不支持AirPlay镜像或未检测到兼容设备"
            echo "请确保："
            echo "1. 目标设备支持AirPlay接收"
            echo "2. 设备在同一WiFi网络"
            echo "3. 设备已开启AirPlay功能"
        fi
        ;;
    4)
        echo "=== 下载第三方镜像工具 ==="
        echo "推荐工具："
        echo "1. LetsView (免费)"
        echo "2. ApowerMirror (功能丰富)"
        echo "3. Reflector (专业)"
        echo "4. AnyDesk (已安装)"
        echo ""
        read -p "选择要下载的工具 (1-4): " tool_choice
        
        case $tool_choice in
            1)
                echo "正在下载LetsView..."
                curl -L -o "/tmp/LetsView.dmg" "https://cdn.letsview.com/downloads/letsview_mac.dmg"
                if [ $? -eq 0 ]; then
                    echo "下载完成，正在安装..."
                    hdiutil attach "/tmp/LetsView.dmg"
                    echo "请手动拖拽安装LetsView"
                else
                    echo "下载失败，请手动访问 https://letsview.com 下载"
                fi
                ;;
            2)
                echo "正在下载ApowerMirror..."
                curl -L -o "/tmp/ApowerMirror.dmg" "https://download.apowersoft.com/mac/apowermirror-mac.dmg"
                if [ $? -eq 0 ]; then
                    echo "下载完成，正在安装..."
                    hdiutil attach "/tmp/ApowerMirror.dmg"
                    echo "请手动拖拽安装ApowerMirror"
                else
                    echo "下载失败，请手动访问 https://www.apowersoft.com 下载"
                fi
                ;;
            3)
                echo "Reflector需要从Mac App Store购买"
                open "macappstore://apps.apple.com/app/reflector-4/id1505637878"
                ;;
            4)
                echo "正在启动AnyDesk..."
                if [ -f "/Applications/AnyDesk.app/Contents/MacOS/AnyDesk" ]; then
                    open -a "AnyDesk"
                    echo "AnyDesk已启动，可用于屏幕共享"
                else
                    echo "AnyDesk未安装，正在下载..."
                    curl -L -o "/tmp/AnyDesk.dmg" "https://download.anydesk.com/anydesk.dmg"
                    if [ $? -eq 0 ]; then
                        hdiutil attach "/tmp/AnyDesk.dmg"
                        echo "请手动安装AnyDesk"
                    fi
                fi
                ;;
        esac
        ;;
    5)
        echo "=== 使用浏览器投屏 ==="
        echo "方案1：使用Chrome浏览器投屏"
        echo "1. 打开Chrome浏览器"
        echo "2. 点击右上角三点菜单"
        echo "3. 选择'投射...'"
        echo "4. 选择要投射的设备"
        echo ""
        echo "方案2：使用Safari AirPlay"
        echo "1. 在Safari中播放视频"
        echo "2. 点击AirPlay图标"
        echo "3. 选择目标设备"
        echo ""
        echo "方案3：使用在线投屏服务"
        echo "正在打开在线投屏页面..."
        open "https://www.letsview.com/cast"
        ;;
    *)
        echo "无效选择，请重新运行脚本"
        exit 1
        ;;
esac

echo ""
echo "=== 网络信息 ==="
echo "当前MacBook网络信息："
echo "WiFi IP: $(ifconfig en0 | grep 'inet ' | awk '{print $2}')"
echo "有线IP: $(ifconfig en1 | grep 'inet ' | awk '{print $2}' 2>/dev/null || echo '未连接')"
echo "局域网设备扫描："
nmap -sn $(route -n get default | grep 'interface' | awk '{print $2}' | xargs ifconfig | grep 'inet ' | awk '{print $2}' | head -1 | sed 's/\.[0-9]*$/.0\/24/') 2>/dev/null | grep 'Nmap scan report' | awk '{print $5}' || echo "请安装nmap: brew install nmap"

echo ""
echo "=== 使用说明 ==="
echo "1. 确保MacBook和目标设备在同一局域网"
echo "2. 根据选择的方案进行配置"
echo "3. 如遇问题，请检查防火墙设置"
echo "4. 某些方案可能需要目标设备安装对应客户端"
echo ""
echo "脚本执行完成！"