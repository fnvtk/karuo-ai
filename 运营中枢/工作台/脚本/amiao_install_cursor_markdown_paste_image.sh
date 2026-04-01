#!/usr/bin/env bash
# 阿猫 Mac：为 Cursor 或 VS Code 安装 Markdown 剪贴板粘贴图片扩展（Paste Image）
# 用法：在阿猫本机终端执行：bash amiao_install_cursor_markdown_paste_image.sh
# 或通过 scp 拷贝到阿猫后执行。

set -euo pipefail
EXT="mushan.vscode-paste-image"
CURSOR_BIN="/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"

if [[ -x "$CURSOR_BIN" ]]; then
  echo ">>> 使用 Cursor CLI 安装 $EXT"
  "$CURSOR_BIN" --install-extension "$EXT" --force
  echo ">>> 完成。在 Cursor 中打开 .md，按扩展说明使用粘贴快捷键（可在 键盘快捷方式 搜 Paste Image）。"
elif [[ -x "$CODE_BIN" ]]; then
  echo ">>> 使用 VS Code CLI 安装 $EXT"
  "$CODE_BIN" --install-extension "$EXT" --force
  echo ">>> 完成。"
else
  echo "未找到 Cursor 或 VS Code 命令行。请确认已安装应用，或在 Cursor 里："
  echo "  Command Palette → Shell Command: Install 'cursor' command in PATH"
  echo "然后执行: cursor --install-extension $EXT --force"
  exit 1
fi
