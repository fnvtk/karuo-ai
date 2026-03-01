# Time Machine 快照至少保留 7 天 · 说明与配置

> 本机约定：时间机器快照最少保持 7 天。本文说明系统限制与已做配置。

---

## 一、系统限制（Apple 官方）

- **本地快照**（本机 APFS 快照）：约每小时一个，**默认仅保留约 24 小时**；在需要空间或过旧时会被自动删除。**系统设置中无法将本地快照保留期改为 7 天。**
- **备份目的地**（外置盘/网络盘）：Time Machine 会按“每小时 / 每日 / 每周”策略保留备份，**直到备份盘满**后再按从旧到新删除。没有“最少保留 N 天”的官方选项；实际能保留多久取决于备份盘容量（建议 ≥ 本机容量 2 倍）。

因此，“至少保留 7 天”只能通过**备份盘空间充足**和**定期检查**来尽量满足。

---

## 二、本机已做配置

1. **每日检查脚本**  
   - 路径：`运营中枢/脚本/TimeMachine_保留7天检查.sh`  
   - 行为：当备份目的地可用时，检查当前最早备份是否距今 ≥ 7 天；结果写入工作台日志。  
   - 若备份盘未挂载或 `tmutil listbackups` 超时（15 秒），则只记一条“跳过检查”，不报错。

2. **launchd 每日任务**  
   - plist：`~/Library/LaunchAgents/com.karuo.timemachine.retention7d.plist`  
   - 每天 **10:00** 执行上述脚本。  
   - 加载：`launchctl load ~/Library/LaunchAgents/com.karuo.timemachine.retention7d.plist`  
   - 卸载：`launchctl unload ~/Library/LaunchAgents/com.karuo.timemachine.retention7d.plist`

3. **日志位置**  
   - 脚本结果：`运营中枢/工作台/TimeMachine_保留检查.log`  
   - launchd 标准输出/错误：`运营中枢/工作台/TimeMachine_保留检查_launchd.log`

---

## 三、建议

- 保证**备份盘空间充足**，这样 Time Machine 在按空间回收时，通常仍会保留远超 7 天的历史。  
- 定期看下 `TimeMachine_保留检查.log`：若出现“不足 7 天”的提醒，可清理备份盘或换更大容量盘，以维持至少 7 天快照。

---

*文档归属：卡若AI 运营中枢 · 与本机 Time Machine 约定一致*
