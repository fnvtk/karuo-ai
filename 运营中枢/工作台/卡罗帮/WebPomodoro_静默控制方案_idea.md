# WebPomodoro（专注轻探）静默控制方案（卡罗帮 idea）

> **目标**：不打开 WebPomodoro 图形界面，用命令行/脚本完成「开始专注 / 番茄钟计时 / 到时提醒」，供卡若AI 与自动化流程静默调用。  
> 维护：金仓；归属：卡罗帮（运营中枢/工作台/卡罗帮）。

---

## 一、WebPomodoro 官方 CLI 能力分析

### 1.1 应用信息（macOS）

- **路径**：`/Applications/WebPomodoro.app`
- **Bundle ID**：`com.macpomodoro`
- **类型**：原生 Cocoa 应用（NSMainStoryboardFile、NSPrincipalClass=NSApplication），非 Electron。
- **Info.plist**：未发现 `CFBundleURLTypes`，即**未注册 URL Scheme**（无 `webpomodoro://` 等）。

### 1.2 官方是否提供「不打开界面」的 CLI

- 应用为纯 GUI 形态，**未提供**独立命令行工具或「无头」模式。
- **结论**：官方没有「不启动 GUI、纯命令行」的静默接口；若用 `open -a WebPomodoro` 或 AppleScript 控制，都会带出窗口，**无法做到完全静默、不打开界面**。

### 1.3 若必须用 WebPomodoro 本身

- **AppleScript / JXA**：可控制已运行的 WebPomodoro（菜单、按钮），但需先启动 APP，会带出界面，**不是静默操作**。
- **URL Scheme**：当前 plist 无 `CFBundleURLTypes`，无法通过 `open "webpomodoro://..."` 静默驱动。

---

## 二、静默控制思路（不打开 APP）

核心思路：**用本方案提供的静默脚本实现「番茄钟 / 专注计时」**，不启动 WebPomodoro.app；需要「计时 + 到时提醒」时，直接调用脚本即可。

| WebPomodoro 功能 | 静默实现方式 |
|------------------|--------------|
| 开始专注（如 25 分钟） | 调用 `scripts/pomodoro_silent.py --minutes 25`（或 `--focus 25`） |
| 自定义时长 | `pomodoro_silent.py --minutes N` |
| 到时提醒 | 脚本内部用 macOS 通知（`osascript`）或仅写日志，不弹 APP 窗口 |
| 短休息 / 长休息 | `pomodoro_silent.py --rest-short` / `--rest-long`（可选，由脚本参数约定） |

**与 Navicat 方案一致**：不打开原 APP，用「等价能力」的脚本/CLI 完成目标，实现**真正的静默操作**。

---

## 三、卡罗帮实现要点

### 3.1 静默脚本与对照表（已提供）

- **脚本**：`运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py`
- **静默命令速查**：同目录 `WebPomodoro_功能与静默命令对照表.md`
- **行为**：
  - 不启动 WebPomodoro.app，不打开任何图形界面。
  - 支持 `--minutes N`（专注时长，默认 25）、`--notify`（结束时发 macOS 通知）、`--no-notify`（仅日志）。
  - 可后台运行（如 `nohup ... &` 或由卡若AI/自动化调用），全程静默。

### 3.2 使用方式（卡若AI）

- 用户说「开始专注」「静默专注 25 分钟」「不打开界面开一个番茄钟」等：  
  直接执行：`python3 运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py --minutes 25 --notify`（或等价路径），**不**执行 `open -a WebPomodoro`。
- 用户说「打开 WebPomodoro」「打开专注轻探」：  
  若确需图形界面，再使用 `open -a WebPomodoro`；否则优先用静默脚本。

### 3.3 与 Skill / CLA 的衔接

- 若已有「专注轻探」或「WebPomodoro」的 Skill/CLA：在 Skill 中明确写「静默操作用 `pomodoro_silent.py`，禁止为执行计时而打开 WebPomodoro 界面」。
- 触发词示例：**专注、番茄钟、静默专注、开始专注、不打开界面计时** → 调用静默脚本，不打开 APP。

---

## 四、无法静默替代的部分

- **WebPomodoro 独有功能**：如应用内的统计、主题、多设备同步等，无官方 API/CLI 时无法在不打开 APP 的前提下实现；本方案仅覆盖「计时 + 到时提醒」的静默等价。

---

## 五、版本记录

| 日期       | 变更 |
|------------|------|
| 2026-03-19 | 初版：WebPomodoro CLI 分析、静默思路、静默脚本说明与卡若AI 使用方式。 |
