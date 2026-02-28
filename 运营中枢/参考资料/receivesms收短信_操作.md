# receivesms 收短信 · 命令行用法

## 一键取号 + 取最新短信（不打开网页）

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts
python3 receivesms_get_sms.py
```

**输出示例**：
- `NUMBER: +44xxxxxxxxx`：随机到的英国临时号码
- `SMS: ...`：该号码当前最新一条短信内容（无则显示 `(无)`）
- 最后一行：`号码 | 短信` 便于复制

数据来源：https://www.receivesms.co 英国号列表与对应收件页，纯命令行抓取。
