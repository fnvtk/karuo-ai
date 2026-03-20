# 专注静默（WebPomodoro 静默控制）

> **静默原则**：不打开 WebPomodoro 图形界面，所有「开始专注 / 番茄钟」均通过命令行脚本完成。归属：卡罗帮。

---

## 触发

用户说 **专注、番茄钟、静默专注、开始专注、WebPomodoro、专注轻探、不打开界面计时** 等，且意图为「开始一段专注/番茄钟」时，走本 Skill。

---

## 执行（强制静默）

1. **禁止** 使用 `open -a WebPomodoro` 或 `open /Applications/WebPomodoro.app`（会打开界面，非静默）。
2. **一律** 调用静默脚本：
   - 脚本路径：`运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py`
   - 默认 25 分钟 + 结束时系统通知：  
     `python3 运营中枢/工作台/卡罗帮/scripts/pomodoro_silent.py --minutes 25 --notify`
   - 指定 N 分钟：`--minutes N` 或 `-m N`
   - 不弹通知：`--no-notify`
   - 短休息 5 分钟：`--rest-short`；长休息 15 分钟：`--rest-long`
   - 后台运行：命令末尾加 `&` 或使用 `nohup ... &`
3. 静默命令速查：`运营中枢/工作台/卡罗帮/WebPomodoro_功能与静默命令对照表.md`  
   方案说明：`运营中枢/工作台/卡罗帮/WebPomodoro_静默控制方案_idea.md`

---

## 小结

- 专注/番茄钟需求 → 只执行 `pomodoro_silent.py`，不打开任何 APP 界面，即**静默操作**。
