# 统一任务调度器使用说明

## 概述

统一任务调度器（TaskSchedulerCommand）是一个集中管理所有定时任务的调度系统，支持：
- ✅ 单条 crontab 配置管理所有任务
- ✅ 多进程并发执行任务
- ✅ 自动根据 cron 表达式判断任务执行时间
- ✅ 任务锁机制，防止重复执行
- ✅ 完善的日志记录

## 安装配置

### 1. 配置文件

任务配置位于 `config/task_scheduler.php`，格式如下：

```php
'任务标识' => [
    'command' => '命令名称',           // 必填：执行的命令
    'schedule' => 'cron表达式',        // 必填：cron表达式
    'options' => ['--option=value'],   // 可选：命令参数
    'enabled' => true,                 // 可选：是否启用
    'max_concurrent' => 1,            // 可选：最大并发数
    'timeout' => 3600,                // 可选：超时时间（秒）
    'log_file' => 'custom.log',       // 可选：自定义日志文件
]
```

### 2. Cron 表达式格式

标准 cron 格式：`分钟 小时 日 月 星期`

示例：
- `*/1 * * * *` - 每分钟执行
- `*/5 * * * *` - 每5分钟执行
- `*/30 * * * *` - 每30分钟执行
- `0 2 * * *` - 每天凌晨2点执行
- `0 3 */3 * *` - 每3天的3点执行

### 3. Crontab 配置

**只需要在 crontab 中添加一条任务：**

```bash
# 每分钟执行一次调度器（调度器内部会根据 cron 表达式判断哪些任务需要执行）
* * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think scheduler:run >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/scheduler.log 2>&1
```

### 4. 系统要求

- PHP >= 5.6.0
- 推荐启用 `pcntl` 扩展以支持多进程并发（非必需，未启用时使用单进程顺序执行）

检查 pcntl 扩展：
```bash
php -m | grep pcntl
```

## 使用方法

### 手动执行调度器

```bash
# 执行调度器（会自动判断当前时间需要执行的任务）
php think scheduler:run
```

### 查看任务配置

```bash
# 查看所有已注册的命令
php think list
```

### 启用/禁用任务

编辑 `config/task_scheduler.php`，设置 `'enabled' => false` 即可禁用任务。

## 功能特性

### 1. 多进程并发执行

- 默认最大并发数：10 个进程
- 自动管理进程池
- 自动清理僵尸进程

### 2. 任务锁机制

- 每个任务在执行时会设置锁（5分钟内不重复执行）
- 防止任务重复执行
- 锁存储在缓存中，自动过期

### 3. 日志记录

- 调度器日志：`runtime/log/scheduler.log`
- 每个任务的日志：`runtime/log/{log_file}`
- 任务执行开始和结束都有标记

### 4. 超时控制

- 默认超时时间：3600 秒（1小时）
- 可在配置中为每个任务单独设置超时时间
- 超时后自动终止任务

## 配置示例

### 高频任务（每分钟）

```php
'wechat_friends_active' => [
    'command' => 'wechatFriends:list',
    'schedule' => '*/1 * * * *',
    'options' => ['--isDel=0'],
    'enabled' => true,
],
```

### 中频任务（每5分钟）

```php
'device_active' => [
    'command' => 'device:list',
    'schedule' => '*/5 * * * *',
    'options' => ['--isDel=0'],
    'enabled' => true,
],
```

### 每日任务

```php
'wechat_calculate_score' => [
    'command' => 'wechat:calculate-score',
    'schedule' => '0 2 * * *',  // 每天凌晨2点
    'options' => [],
    'enabled' => true,
],
```

### 定期任务（每3天）

```php
'sync_all_friends' => [
    'command' => 'sync:allFriends',
    'schedule' => '0 3 */3 * *',  // 每3天的3点
    'options' => [],
    'enabled' => true,
],
```

## 从旧配置迁移

### 旧配置（多条 crontab）

```bash
*/5 * * * * cd /path && php think device:list --isDel=0 >> log1.log 2>&1
*/1 * * * * cd /path && php think wechatFriends:list >> log2.log 2>&1
```

### 新配置（单条 crontab + 配置文件）

**Crontab：**
```bash
* * * * * cd /path && php think scheduler:run >> scheduler.log 2>&1
```

**config/task_scheduler.php：**
```php
'device_active' => [
    'command' => 'device:list',
    'schedule' => '*/5 * * * *',
    'options' => ['--isDel=0'],
    'log_file' => 'log1.log',
],
'wechat_friends' => [
    'command' => 'wechatFriends:list',
    'schedule' => '*/1 * * * *',
    'log_file' => 'log2.log',
],
```

## 监控和调试

### 查看调度器日志

```bash
tail -f runtime/log/scheduler.log
```

### 查看任务执行日志

```bash
tail -f runtime/log/crontab_device_active.log
```

### 检查任务是否在执行

```bash
# 查看进程
ps aux | grep "php think"
```

### 手动测试任务

```bash
# 直接执行某个任务
php think device:list --isDel=0
```

## 注意事项

1. **时间同步**：确保服务器时间准确，调度器依赖系统时间判断任务执行时间
2. **资源限制**：根据服务器性能调整 `maxConcurrent` 参数
3. **日志清理**：定期清理日志文件，避免占用过多磁盘空间
4. **任务冲突**：如果任务执行时间较长，建议调整执行频率或增加并发数
5. **缓存依赖**：任务锁使用缓存，确保缓存服务正常运行

## 故障排查

### 任务未执行

1. 检查任务是否启用：`'enabled' => true`
2. 检查 cron 表达式是否正确
3. 检查调度器是否正常运行：查看 `scheduler.log`
4. 检查任务锁：任务可能在5分钟内重复执行被跳过

### 任务执行失败

1. 查看任务日志：`runtime/log/{log_file}`
2. 检查命令是否正确：手动执行命令测试
3. 检查权限：确保有执行权限和日志写入权限

### 多进程不工作

1. 检查 pcntl 扩展：`php -m | grep pcntl`
2. 检查系统限制：`ulimit -u` 查看最大进程数
3. 查看调度器日志中的错误信息

## 性能优化建议

1. **合理设置并发数**：根据服务器 CPU 核心数和内存大小调整
2. **错开高频任务**：避免所有任务在同一分钟执行
3. **优化任务执行时间**：减少任务执行时长
4. **使用队列**：对于耗时任务，建议使用队列异步处理

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本
- 支持多进程并发执行
- 支持 cron 表达式调度
- 支持任务锁机制

