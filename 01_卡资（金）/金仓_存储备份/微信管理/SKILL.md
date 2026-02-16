---
name: 微信管理
description: macOS 微信数据分析与自动化管理。触发词：微信分析、聊天记录、好友分析、社群分析、朋友圈、微信报告、RFM分析、微信自动化。提供聊天记录导出、好友RFM价值评估、社群内容分析、朋友圈互动等功能。
version: 1.0
updated: 2026-01-22
---

# 微信管理 v1.0

> macOS 微信数据分析与智能管理，挖掘社交资产价值。

---

## 功能概览

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          微信管理系统架构                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │  数据采集    │ → │  内容管理    │ → │  AI 分析    │ → │  行为操作    │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │
│        │                 │                 │                 │          │
│        ▼                 ▼                 ▼                 ▼          │
│  • 数据库解密       • 聊天记录导出     • RFM价值评估     • 朋友圈点赞    │
│  • 好友列表         • 群聊内容提取     • 社群画像分析     • 自动评论      │
│  • 群组信息         • 朋友圈保存       • 每日聊天摘要     • 消息提醒      │
│  • 朋友圈数据       • 内容归档         • 个人关系分析     • 定时任务      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 模块一：数据采集

### 1.1 微信数据位置（macOS）

```bash
# 微信数据根目录
~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/

# 数据库文件（SQLCipher 加密）
# 微信 3.x: SQLCipher v3 (Page Size = 1024)
# 微信 4.x: SQLCipher v4 (Page Size = 4096)

# 主要数据库
├── Message/                    # 聊天记录
│   └── *.db                   # 按联系人分表
├── Contact/                    # 联系人信息
├── Group/                      # 群组信息
└── Moments/                    # 朋友圈数据
```

### 1.2 解密方案

| 方法 | 工具 | 难度 | 适用场景 |
|:-----|:-----|:-----|:---------|
| **LLDB 断点** | 系统自带 | 中 | 一次性获取密钥 |
| **DTrace 脚本** | wechat-decipher-macos | 中 | 自动化抓取 |
| **开源工具** | PyWxDump / chatlog | 低 | 推荐使用 |

> ⚠️ 注意：macOS 需要关闭 SIP 或授予调试权限才能获取密钥

### 1.3 快速检查微信状态

```bash
# 检查微信进程
ps aux | grep -i wechat | grep -v grep

# 检查微信数据目录大小
du -sh ~/Library/Containers/com.tencent.xinWeChat 2>/dev/null

# 查看数据库文件数量
find ~/Library/Containers/com.tencent.xinWeChat -name "*.db" 2>/dev/null | wc -l

# 检查微信版本
defaults read /Applications/WeChat.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null
```

---

## 模块二：内容管理

### 2.1 导出功能清单

| 内容类型 | 导出格式 | 用途 |
|:---------|:---------|:-----|
| 聊天记录 | CSV / JSON / HTML | 备份、分析 |
| 好友列表 | CSV | 客户管理 |
| 群成员 | CSV | 社群运营 |
| 朋友圈 | JSON + 图片 | 内容归档 |
| 收藏夹 | Markdown | 知识管理 |

### 2.2 聊天记录结构

```python
# 聊天记录字段
{
    "msg_id": "消息唯一ID",
    "create_time": "发送时间戳",
    "talker": "发送者wxid",
    "content": "消息内容",
    "type": "消息类型(1=文本,3=图片,34=语音,47=表情...)",
    "is_send": "0=收到,1=发出",
    "room_name": "群聊ID(如有)"
}
```

### 2.3 导出配置

```yaml
# wechat_export_config.yaml
export:
  # 导出范围
  contacts: true        # 导出联系人
  groups: true          # 导出群聊
  moments: true         # 导出朋友圈
  
  # 时间范围
  start_date: "2024-01-01"
  end_date: null        # null = 至今
  
  # 过滤条件
  include_groups:       # 指定导出的群
    - "创业者交流群"
    - "私域运营群"
  
  include_contacts:     # 指定导出的联系人
    - "夏茜"
    - "李冰"
  
  # 输出设置
  output_dir: "~/Documents/微信备份"
  format: "json"        # json / csv / html
  include_media: false  # 是否包含图片视频
```

---

## 模块三：AI 分析

### 3.1 RFM 价值评估模型

基于聊天记录自动计算好友价值等级：

| 维度 | 指标 | 计算方式 | 权重 |
|:-----|:-----|:---------|:-----|
| **R** (Recency) | 最近联系 | 距今天数 | 30% |
| **F** (Frequency) | 联系频率 | 月均消息数 | 40% |
| **M** (Monetary) | 价值潜力 | 关键词打分 | 30% |

**价值等级定义：**

| 等级 | RFM分数 | 特征 | 建议动作 |
|:-----|:--------|:-----|:---------|
| ⭐⭐⭐⭐⭐ | 5-5-5 | 高频高价值 | 重点维护，优先响应 |
| ⭐⭐⭐⭐ | 4-4-4+ | 活跃用户 | 定期互动，转化潜力 |
| ⭐⭐⭐ | 3-3-3+ | 普通好友 | 节日问候，保持联系 |
| ⭐⭐ | 2-2-2+ | 沉默好友 | 激活计划 |
| ⭐ | 1-1-1+ | 僵尸好友 | 考虑清理 |

**关键词价值打分：**

```python
VALUE_KEYWORDS = {
    # 高价值关键词 (+3分)
    "合作": 3, "投资": 3, "采购": 3, "签约": 3, "付款": 3,
    
    # 中价值关键词 (+2分)
    "咨询": 2, "了解": 2, "推荐": 2, "介绍": 2, "需求": 2,
    
    # 低价值关键词 (+1分)
    "谢谢": 1, "感谢": 1, "帮忙": 1, "请教": 1,
    
    # 负面关键词 (-1分)
    "广告": -1, "推销": -1, "砍价": -1
}
```

### 3.2 社群画像分析

```markdown
## 社群分析报告模板

### 基本信息
- 群名称：
- 成员数：
- 建群时间：
- 群主/管理员：

### 活跃度分析
| 指标 | 数值 | 评级 |
|:-----|:-----|:-----|
| 日均消息数 | | |
| 活跃成员占比 | | |
| 高峰活跃时段 | | |

### 成员画像
| 类型 | 占比 | 代表人物 |
|:-----|:-----|:---------|
| 核心活跃者 | | |
| 普通成员 | | |
| 沉默成员 | | |

### 内容分析
| 主题 | 占比 | 热门关键词 |
|:-----|:-----|:-----------|
| 业务讨论 | | |
| 资源分享 | | |
| 闲聊 | | |

### 运营建议
1. 
2. 
3. 
```

### 3.3 每日聊天摘要

每天自动生成聊天摘要报告：

```markdown
## 📊 每日微信摘要 - 2026-01-22

### 今日概览
- 总消息数：156 条
- 活跃联系人：23 人
- 活跃群聊：8 个

### 重要对话
| 联系人 | 消息数 | 关键词 | 需要跟进 |
|:-------|:-------|:-------|:---------|
| 夏茜 | 15 | 合作、方案 | ✅ |
| 李冰 | 8 | 项目、进度 | ✅ |

### 群聊动态
| 群名 | 消息数 | 今日热点 |
|:-----|:-------|:---------|
| 创业交流群 | 45 | 讨论融资话题 |
| 私域运营群 | 32 | 分享工具资源 |

### 待办事项
- [ ] 回复夏茜的合作方案
- [ ] 群内分享昨天的案例

### AI 洞察
> 本周与"夏茜"互动频繁，建议主动推进合作事宜。
```

### 3.4 个人关系分析

```markdown
## 🔍 联系人分析报告 - 夏茜

### 基本信息
- 微信号：xiaqian_xxx
- 备注名：夏茜-XX公司
- 首次联系：2024-03-15
- 最近联系：2026-01-22

### 互动统计
| 维度 | 数据 |
|:-----|:-----|
| 累计消息 | 1,234 条 |
| 我发送 | 567 条 (46%) |
| 对方发送 | 667 条 (54%) |
| 月均互动 | 52 条 |

### RFM 评分
| R (最近) | F (频率) | M (价值) | 综合等级 |
|:---------|:---------|:---------|:---------|
| 5 | 4 | 5 | ⭐⭐⭐⭐⭐ |

### 话题分布
| 话题 | 占比 | 示例关键词 |
|:-----|:-----|:-----------|
| 业务合作 | 45% | 方案、报价、合同 |
| 日常问候 | 30% | 早安、周末、节日 |
| 资源分享 | 25% | 推荐、工具、资料 |

### 互动趋势
- 🟢 互动频率稳定增长
- 🟢 对方响应及时
- 🟡 建议增加面对面沟通

### 关系建议
1. 高价值联系人，建议保持每周至少1次深度沟通
2. 可考虑推进合作项目
3. 节日/生日主动问候
```

---

## 模块四：行为操作

### 4.1 朋友圈自动化

| 功能 | 描述 | 风险等级 |
|:-----|:-----|:---------|
| 浏览朋友圈 | 自动滚动加载 | 🟢 低 |
| 自动点赞 | 对指定好友点赞 | 🟡 中 |
| 自动评论 | 预设评论模板 | 🟠 高 |
| 内容采集 | 保存朋友圈图文 | 🟢 低 |

**点赞评论配置：**

```yaml
# moments_config.yaml
auto_like:
  enabled: true
  targets:
    - "夏茜"           # 指定好友
    - "创业交流群"     # 群友全部点赞
  frequency: 
    max_per_day: 50   # 每日最多点赞数
    interval: 60-180  # 随机间隔秒数

auto_comment:
  enabled: false      # 默认关闭，风险较高
  templates:
    - "👍"
    - "学习了"
    - "太棒了！"
    - "感谢分享"
  targets:
    - "夏茜"          # 仅对指定好友评论
```

### 4.2 自动化任务

```python
# 每日自动化任务配置
DAILY_TASKS = {
    "07:00": "生成昨日聊天摘要",
    "08:00": "检查未读消息提醒",
    "12:00": "同步朋友圈内容",
    "18:00": "执行朋友圈点赞任务",
    "23:00": "更新RFM评分数据"
}
```

### 4.3 消息提醒

```yaml
# 重要消息提醒配置
alerts:
  # 关键词提醒
  keywords:
    - "付款"
    - "签约"
    - "紧急"
    - "@我"
  
  # VIP联系人提醒
  vip_contacts:
    - "夏茜"
    - "李冰"
    - "王诚鹏"
  
  # 提醒方式
  notify:
    system: true      # 系统通知
    sound: true       # 声音提醒
    email: false      # 邮件提醒
```

---

## 快速使用

### 命令清单

```bash
# 1. 检查微信状态
python scripts/wechat_manager.py status

# 2. 导出聊天记录
python scripts/wechat_manager.py export --contact "夏茜" --format json

# 3. 导出群聊
python scripts/wechat_manager.py export --group "创业交流群" --format csv

# 4. 生成RFM报告
python scripts/wechat_manager.py rfm --all

# 5. 分析指定联系人
python scripts/wechat_manager.py analyze --contact "夏茜"

# 6. 分析社群
python scripts/wechat_manager.py analyze --group "创业交流群"

# 7. 生成每日摘要
python scripts/wechat_manager.py summary --date today

# 8. 朋友圈点赞
python scripts/wechat_manager.py like --target "夏茜" --count 5

# 9. 同步朋友圈
python scripts/wechat_manager.py moments --sync

# 10. 生成管理报告
python scripts/wechat_manager.py report
```

### 使用流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            使用流程                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. 环境准备        2. 数据解密        3. 功能使用        4. 定期维护    │
│       │                  │                  │                  │         │
│       ▼                  ▼                  ▼                  ▼         │
│   安装依赖           获取密钥            选择功能            每日摘要      │
│   配置参数           解密数据库          导出/分析            RFM更新      │
│   检查权限           验证数据            执行自动化           数据备份      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 安装配置

### 依赖安装

```bash
# 安装 SQLCipher
brew install sqlcipher

# 安装 Python 依赖
pip install pysqlcipher3 pandas jieba wordcloud matplotlib schedule

# 可选：安装 chatlog 工具（推荐）
# https://github.com/sjzar/chatlog
```

### 配置文件

```yaml
# ~/.config/wechat_manager/config.yaml

# 微信数据路径（自动检测）
wechat_data_path: auto

# 输出目录
output_dir: ~/Documents/微信管理

# 数据库密钥（从解密工具获取）
db_key: ""  # 首次使用需要获取

# RFM 配置
rfm:
  recency_days: [7, 30, 90, 180, 365]  # R值分段
  frequency_count: [50, 20, 10, 5, 1]   # F值分段
  value_weight: 
    keywords: 0.3
    frequency: 0.4
    recency: 0.3

# 自动化配置
automation:
  daily_summary: true
  rfm_update: true
  moments_sync: false
  auto_like: false

# 安全配置
security:
  backup_before_change: true
  max_auto_actions: 100  # 每日自动操作上限
  dry_run: true          # 试运行模式（不实际执行）
```

---

## 技术架构

### 技术栈

| 组件 | 技术 | 说明 |
|:-----|:-----|:-----|
| 数据解密 | SQLCipher + pysqlcipher3 | 解密微信数据库 |
| 数据处理 | Pandas | 数据分析和导出 |
| 文本分析 | jieba + wordcloud | 中文分词和词云 |
| AI 分析 | OpenAI / Gemini API | 智能摘要和洞察 |
| 自动化 | schedule + threading | 定时任务 |
| 可视化 | matplotlib | 图表生成 |

### 文件结构

```
微信管理/
├── SKILL.md                    # 技能说明文档
├── scripts/
│   ├── wechat_manager.py       # 主程序入口
│   ├── db_decryptor.py         # 数据库解密模块
│   ├── data_exporter.py        # 数据导出模块
│   ├── rfm_analyzer.py         # RFM 分析模块
│   ├── group_analyzer.py       # 社群分析模块
│   ├── contact_analyzer.py     # 联系人分析模块
│   ├── moments_handler.py      # 朋友圈处理模块
│   ├── daily_summary.py        # 每日摘要模块
│   └── automation.py           # 自动化任务模块
├── references/
│   ├── 数据库结构.md           # 微信数据库表结构
│   ├── RFM模型说明.md          # RFM价值评估详解
│   └── 开源工具对比.md         # 相关工具对比
└── templates/
    ├── rfm_report.html         # RFM报告模板
    ├── group_report.html       # 社群报告模板
    └── daily_summary.html      # 每日摘要模板
```

---

## 安全与合规

### ⚠️ 重要提示

1. **仅限个人数据**：只能分析自己的微信账号数据
2. **隐私保护**：导出的数据需妥善保管，避免泄露
3. **合规使用**：遵守微信服务协议，避免滥用
4. **风险操作**：自动化功能（点赞/评论）可能触发风控

### 安全原则

| 类型 | 处理方式 |
|:-----|:---------|
| ⛔ 他人数据 | 绝不访问 |
| ⛔ 批量操作 | 需要确认，有频率限制 |
| ⚠️ 自动化 | 默认关闭，需手动启用 |
| ⚠️ 数据备份 | 操作前自动备份 |
| ✅ 只读分析 | 安全，推荐使用 |
| ✅ 本地处理 | 数据不上传云端 |

---

## 常见问题

### Q1: 如何获取数据库密钥？

```bash
# 方法1：使用 chatlog 工具（推荐）
# 下载：https://github.com/sjzar/chatlog
chatlog decrypt

# 方法2：使用 LLDB（需关闭 SIP）
lldb -p $(pgrep -x WeChat)
(lldb) br s -n sqlite3_key
(lldb) c
# 登录微信后读取寄存器
(lldb) register read rsi
```

### Q2: 数据库解密失败？

- 检查微信版本（3.x vs 4.x 加密方式不同）
- 确认密钥是否正确
- 尝试使用 `PRAGMA cipher_compatibility = 3;` 兼容旧版

### Q3: 如何安全使用自动化功能？

1. 先开启 `dry_run: true` 试运行
2. 设置合理的频率限制
3. 避免批量操作，分散执行
4. 关注微信官方的风控提示

---

## 版本记录

| 版本 | 日期 | 变更内容 |
|:-----|:-----|:---------|
| **1.0** | **2026-01-22** | 初版，包含数据采集、内容管理、AI分析、行为操作四大模块 |

---

## 下一步计划

- [ ] v1.1: 完善数据库解密自动化流程
- [ ] v1.2: 增加 Web UI 可视化界面
- [ ] v1.3: 支持多账号管理
- [ ] v1.4: 集成 AI 智能回复建议
- [ ] v2.0: 支持 Windows 版微信数据

---

> "社交即资产，数据即洞察。" —— 卡若AI
