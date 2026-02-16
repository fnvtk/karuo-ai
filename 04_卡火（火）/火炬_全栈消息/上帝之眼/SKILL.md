---
name: 上帝之眼
version: "2.0"
owner: 火眸
group: 火
triggers: [量化, 港股, 数据采集, 东方财富, eastmoney, emtl, BigQuant, 量化交易, 股票数据]
updated: "2026-02-13"
---

# 上帝之眼

> 一句话说明：量化交易数据采集、策略分析与自动化交易流程管理，覆盖东方财富、BigQuant 等平台。

---

## 触发条件

用户说以下关键词时自动激活：
- 量化、量化交易、港股
- 数据采集、股票数据
- 东方财富、eastmoney、emtl
- BigQuant、策略回测

---

## 执行步骤

### 1. 环境检查

```bash
# 激活 Python 虚拟环境
source .venv311/bin/activate

# 检查依赖
pip list | grep -E "emtl|pandas|requests"
```

- 确认 `.venv311` Python 虚拟环境已配置
- 确认 `emtl`（东方财富工具包）已安装
- 确认网络可访问目标数据源

### 2. 数据采集

- **东方财富**：使用 EMTL 工具采集实时/历史行情数据
- **BigQuant**：策略回测与因子分析（需账号认证）
- **港股数据**：通过 API 或网站逆向获取

```bash
# 东方财富数据采集示例
python scripts/eastmoney_query.py --market A股 --type 日线 --days 30

# 港股采集
python scripts/hk_stock_query.py --code 00700 --period daily
```

### 3. 策略分析

- 数据清洗与预处理
- 技术指标计算（MA/MACD/RSI/BOLL 等）
- 策略信号生成
- 回测验证

### 4. 报告输出

- 生成数据摘要与趋势分析
- 标注关键信号与风险点
- 导出 CSV/图表

---

## 输出格式

```
[上帝之眼] 数据采集完成
├─ 数据源：东方财富 / BigQuant
├─ 品种：xxx（代码 xxxxx）
├─ 时间范围：YYYY-MM-DD ~ YYYY-MM-DD
├─ 数据量：xxx 条
├─ 关键信号：xxx
└─ 导出：data/output_YYYYMMDD.csv
```

---

## 配套脚本

| 脚本 | 用途 |
|:---|:---|
| scripts/eastmoney_query.py | 东方财富数据采集 |
| scripts/eastmoney_direct*.py | 直接查询接口 |
| scripts/hk_stock_query.py | 港股数据采集 |

---

## 协同技能

- **网站逆向分析**（火眸）：处理登录验证、接口逆向、Cookie 管理
- **流量自动化**（火眸）：自动化数据采集调度

---

## 安全原则

- 量化分析结果仅供参考，不构成投资建议
- 遵守交易平台 API 调用频率限制
- 交易营业厅认证等敏感操作需用户确认
- 账号凭证不硬编码，使用配置文件管理

---

## 当前进度（2026-02）

- 策略与自动化流程已完成约 80%
- BigQuant 对接已完成
- 卡在交易营业厅认证（需线下处理）

---

## 版本记录

| 日期 | 版本 | 变更 |
|:---|:---|:---|
| 2026-02-13 | 2.0 | 标准化重写，补充完整执行步骤、输出格式、脚本清单 |
| 2026-01-30 | 1.1 | 推进量化交易策略，BigQuant 对接 |
| 2026-01-28 | 1.0 | 初始版本，基础框架 |
