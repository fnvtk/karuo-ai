#!/usr/bin/env bash
# 微信朋友圈命令行发布脚本（macOS）
# 依赖：已安装 cliclick (brew install cliclick)，微信已登录且窗口可见
# 用法：./post_moments.sh "要发的文案"  或  ./post_moments.sh -c  进入校准模式

set -e
WECHAT_APP="WeChat"

# ========== 坐标配置（首次使用请先运行 -c 校准，把下面 4 组坐标改成你本机的值）==========
# 1. 左侧栏「朋友圈」图标点击位置
: "${WECHAT_MOMENTS_X:=80}"
: "${WECHAT_MOMENTS_Y:=620}"
# 2. 朋友圈页面里的「发朋友圈」相机/按钮位置
: "${WECHAT_POST_BTN_X:=320}"
: "${WECHAT_POST_BTN_Y:=80}"
# 3. 发朋友圈窗口中的「文字输入框」位置
: "${WECHAT_INPUT_X:=400}"
: "${WECHAT_INPUT_Y:=280}"
# 4. 「发表」按钮位置
: "${WECHAT_SUBMIT_X:=500}"
: "${WECHAT_SUBMIT_Y:=420}"

usage() {
  echo "用法："
  echo "  发布朋友圈：  $0 \"你要发的文案\""
  echo "  校准坐标：    $0 -c"
  echo "说明：首次使用请先运行 -c，按提示把鼠标移到对应位置，记下坐标并设置环境变量或修改本脚本顶部坐标。"
  exit 0
}

# 校准模式：按提示把鼠标移到对应位置后按回车，脚本会输出坐标
calibrate() {
  osascript -e "tell application \"$WECHAT_APP\" to activate"
  sleep 1
  echo "【校准】请把鼠标移到对应位置后按回车，脚本会打印坐标。"
  echo ""
  read -r -p "1. 鼠标移到左侧「朋友圈」图标上，按回车 → " && echo "   WECHAT_MOMENTS_X,Y=$(cliclick p:stdout 2>/dev/null)"
  read -r -p "2. 点进朋友圈，鼠标移到「发朋友圈」按钮上，按回车 → " && echo "   WECHAT_POST_BTN_X,Y=$(cliclick p:stdout 2>/dev/null)"
  read -r -p "3. 点开发朋友圈，鼠标移到文字输入框中心，按回车 → " && echo "   WECHAT_INPUT_X,Y=$(cliclick p:stdout 2>/dev/null)"
  read -r -p "4. 鼠标移到「发表」按钮上，按回车 → " && echo "   WECHAT_SUBMIT_X,Y=$(cliclick p:stdout 2>/dev/null)"
  echo ""
  echo "请把上面 4 行坐标填到本脚本顶部坐标配置，或运行时 export 环境变量。"
}

if [[ "$1" == "-c" ]] || [[ "$1" == "--calibrate" ]]; then
  calibrate
  exit 0
fi

if [[ -z "$1" ]]; then
  usage
fi

TEXT="$1"

# 检查 cliclick
if ! command -v cliclick &>/dev/null; then
  echo "错误：未找到 cliclick。请先执行: brew install cliclick"
  exit 1
fi

echo "正在激活微信并发送朋友圈..."
osascript -e "tell application \"$WECHAT_APP\" to activate"
sleep 1.2

# 1. 点左侧「朋友圈」
cliclick c:"$WECHAT_MOMENTS_X","$WECHAT_MOMENTS_Y"
sleep 1.5

# 2. 点「发朋友圈」按钮
cliclick c:"$WECHAT_POST_BTN_X","$WECHAT_POST_BTN_Y"
sleep 1.2

# 3. 把文案放进剪贴板，点输入框后粘贴（避免中文输入法问题）
echo -n "$TEXT" | pbcopy
cliclick c:"$WECHAT_INPUT_X","$WECHAT_INPUT_Y"
sleep 0.5
cliclick kd:cmd t:v ku:cmd
sleep 0.5

# 4. 点「发表」
cliclick c:"$WECHAT_SUBMIT_X","$WECHAT_SUBMIT_Y"

echo "已执行点击流程。请在本机微信窗口确认是否已进入发朋友圈界面并粘贴好文案；若坐标不对请运行 $0 -c 重新校准。"
