# 飞书知识库API写入经验

> **来源**: 2026-01-26 五行AI团队PK实战
> **整理者**: 卡人

---

## 🎯 核心发现

### 1. 飞书文档块类型对照表

| block_type | 名称 | 用途 |
|:---|:---|:---|
| 2 | text | 普通文本 |
| 3 | heading1 | 一级标题（月份） |
| 4 | heading2 | 二级标题 |
| 6 | heading4 | 四级标题（日期） |
| 17 | todo | 可打勾任务 ✅ |
| 19 | callout | 高亮提示框 |
| 24 | grid | 分栏容器 |
| 25 | grid_column | 分栏列 |
| 31 | table | 表格 |
| 32 | table_cell | 表格单元格 |

### 2. Token自动刷新机制

```
Token文件位置:
- /Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json
- /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/.feishu_tokens.json

刷新流程:
1. 读取refresh_token
2. 调用 /authen/v1/oidc/refresh_access_token
3. 保存新的access_token和refresh_token
```

### 3. API调用要点

| 操作 | 接口 | 注意事项 |
|:---|:---|:---|
| 获取块列表 | GET /docx/v1/documents/{id}/blocks | 分页，page_size=100 |
| 创建子块 | POST /blocks/{parent_id}/children | index参数控制位置 |
| 删除块 | DELETE /blocks/{block_id} | 无响应体 |

### 4. 常见错误码

| code | 含义 | 解决方案 |
|:---|:---|:---|
| 99991677 | Token过期 | 自动刷新token |
| 1770001 | 参数无效 | 检查block格式 |
| 1770028 | 块不支持创建子块 | grid需要特殊处理 |

---

## ✅ 最佳实践

### 写入运营日志的正确格式

```python
# 日期标题 - 使用heading4 (type=6)
{
    "block_type": 6,
    "heading4": {
        "elements": [{"text_run": {"content": "1月26日", "text_element_style": {}}}],
        "style": {"align": 1}
    }
}

# 可打勾任务 - 使用todo (type=17)
{
    "block_type": 17,
    "todo": {
        "elements": [{"text_run": {"content": "任务内容", "text_element_style": {}}}],
        "style": {"done": False, "align": 1}
    }
}

# 高亮框 - 使用callout (type=19)
{
    "block_type": 19,
    "callout": {
        "emoji_id": "sunrise",
        "background_color": 2,
        "border_color": 2,
        "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True}}}]
    }
}
```

### 插入位置控制

```python
# 在指定位置插入（index从0开始）
result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
    "children": blocks,
    "index": insert_index  # 新日期放在最前面
})
```

---

## ⚠️ 踩坑记录

1. **grid块限制**: grid (type=24) 不能用children API创建子块，必须在创建时指定
2. **空text_element_style**: 必须提供，即使是空对象 `{}`
3. **style.align**: 1=左对齐，不能省略
4. **删除API无响应体**: 状态码200表示成功，不要尝试解析json

---

## 📂 相关脚本

| 脚本 | 功能 |
|:---|:---|
| `write_task_v3.py` | 最新版本，格式正确 |
| `auto_write_wiki.py` | 自动刷新token版本 |
| `smart_write_wiki.py` | 带分栏尝试（grid有问题） |

---

**文档版本**: v1.0  
**更新日期**: 2026-01-26
