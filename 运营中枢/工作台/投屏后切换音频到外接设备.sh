#!/bin/bash
# 投屏后一键把「声音输出」和「麦克风输入」切到外接/投屏设备，避免默认还是 MacBook
# 依赖：brew install switchaudio-osx（首次需安装）
# 用法：投屏连接好后，在终端执行本脚本，或把脚本拖到「快捷指令」里

set -e

OUTPUT_DEVICE="${1:-Apple TV}"   # 默认切到 Apple TV，也可传参如 "HDMI" 或显示器名称
INPUT_DEVICE="${2:-}"            # 可选：麦克风设备名，如 "卡苹的麦克风"（留空则只改输出）

if ! command -v SwitchAudioSource &>/dev/null; then
  echo "未检测到 SwitchAudioSource，请先安装："
  echo "  brew install switchaudio-osx"
  echo ""
  echo "安装完成后重新运行本脚本。"
  echo "或手动切换：控制中心 → 声音 → 点扬声器旁的 ⭕ → 选「${OUTPUT_DEVICE}」"
  exit 1
fi

# 切换到指定输出设备
if SwitchAudioSource -a -t output | grep -q "$OUTPUT_DEVICE"; then
  SwitchAudioSource -s "$OUTPUT_DEVICE" -t output
  echo "✓ 声音输出已切换到：$OUTPUT_DEVICE"
else
  echo "未找到输出设备「$OUTPUT_DEVICE」，当前可用输出设备："
  SwitchAudioSource -a -t output
  exit 1
fi

# 若指定了麦克风设备名，则切换输入
if [[ -n "$INPUT_DEVICE" ]]; then
  if SwitchAudioSource -a -t input | grep -q "$INPUT_DEVICE"; then
    SwitchAudioSource -s "$INPUT_DEVICE" -t input
    echo "✓ 麦克风已切换到：$INPUT_DEVICE"
  else
    echo "未找到输入设备「$INPUT_DEVICE」，跳过麦克风切换。可用输入设备："
    SwitchAudioSource -a -t input
  fi
fi
