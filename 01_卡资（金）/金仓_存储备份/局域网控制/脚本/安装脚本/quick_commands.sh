alias start_wechat='adb shell am start -n com.tencent.mm/.ui.LauncherUI'

# 投屏相关命令
alias enable_cast='adb shell settings put global wifi_display_on 1'
alias disable_cast='adb shell settings put global wifi_display_on 0'
alias show_cast_settings='adb shell am start -a android.settings.CAST_SETTINGS'
