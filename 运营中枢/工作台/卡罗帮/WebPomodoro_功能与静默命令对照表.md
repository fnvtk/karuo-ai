# WebPomodoro 功能与静默命令对照表

> 不打开 WebPomodoro 界面，用卡罗帮静默脚本实现专注/番茄钟。卡若AI 执行「开始专注」「静默番茄钟」时用本表命令。

---

## 静默命令（一律不打开 APP）

| 需求           | 静默命令 / 方式 |
|----------------|------------------|
| 开始专注 25 分钟（默认） | `python3 运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py --minutes 25 --notify` |
| 专注 N 分钟    | `python3 .../pomodoro_silent.py -m N --notify` |
| 静默专注且不弹通知 | `python3 .../pomodoro_silent.py -m 25 --no-notify` |
| 短休息 5 分钟   | `python3 .../pomodoro_silent.py --rest-short` |
| 长休息 15 分钟  | `python3 .../pomodoro_silent.py --rest-long` |
| 后台运行（不占前台） | `nohup python3 .../pomodoro_silent.py -m 25 --notify &` 或 `python3 .../pomodoro_silent.py -m 25 &` |

**脚本路径（卡若AI 工作区根为项目根）**：  
`运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py`

**禁止**：为实现「开始专注」而执行 `open -a WebPomodoro` 或 `open /Applications/WebPomodoro.app`（会打开图形界面，非静默）。
