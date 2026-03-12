# 飞书 JSON 格式全手册

> 基于项目 `/Users/karuo/Documents/1、金：项目` 下 52 个 `.feishu.json` 实际文件，  
> 结合卡若AI 飞书管理脚本与 API 文档系统整理。  
> 版本：1.0 | 更新：2026-03-12

---

## 一、JSON 文件顶层结构

每个 `.feishu.json` 文件的最外层结构如下：

```json
{
  "title": "文档标题.md",
  "source": "相对来源路径/文档标题.md",
  "children": [
    块1,
    块2,
    ...
  ]
}
```

| 字段 | 说明 |
|:---|:---|
| `title` | 上传到飞书后显示的文档标题 |
| `source` | 本地 Markdown 来源路径（可选，追踪用） |
| `children` | 块数组，每项为一个 Block，顺序即文档顺序 |

**写入 API 时**：只传 `children` 数组，不传 `title`（title 在创建 wiki 节点时单独指定）；块内不带 `block_id`（由服务端生成）。

---

## 二、block_type 完整对照表

| block_type | 类型 | 导出字段名 | 说明 |
|:---|:---|:---|:---|
| 1 | 页面根节点 | `page` | 根节点，不通过 children 创建 |
| 2 | 正文 | `text` | 最常用，支持富文本（加粗/颜色/链接） |
| 3 | 一级标题 | `heading1` | `#` |
| 4 | 二级标题 | `heading2` | `##` |
| 5 | 三级标题 | `heading3` | `###` |
| 6 | 四级标题 | `heading4` | `####`，日志日期专用 |
| 12 | 文件/图片（写入） | `file` | 先上传拿 `file_token`，再插入此块 |
| 14 | 代码块 | `code` | 支持语言高亮 |
| 17 | 待办 | `todo` | 可勾选的任务清单 |
| 18 | 画廊 | `gallery` | 图片画廊，单图也可用 |
| 19 | 高亮块/标注 | `callout` | 带颜色背景的高亮区块 |
| 22 | 分割线 | `divider` | 水平分隔线 |
| 27 | 图片（导出） | `image` | 导出时使用；**写入用 block_type 12** |
| 30 | 文档内电子表格 | `spreadsheet` | 飞书统一文章上传脚本自动生成 |
| 31 | 表格 | `table` | 带 cells 时接口常报错 9499，慎用 |
| 43 | 多维表格 | `board`/`bitable` | 独立应用类型，须用 bitable API 创建 |

---

## 三、各 Block 类型详细 JSON 格式

### 3.1 正文块（block_type: 2）

**最简版**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {"text_run": {"content": "这是一段正文。"}}
    ]
  }
}
```

**带样式版（加粗 + 颜色）**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {
        "text_run": {
          "content": "[重要紧急]",
          "text_element_style": {
            "bold": true,
            "text_color": 5
          }
        }
      },
      {
        "text_run": {
          "content": " 今日必须完成的核心任务"
        }
      }
    ],
    "style": {"align": 1}
  }
}
```

**多段混排（加粗 + 普通 + 链接）**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {"text_run": {"content": "项目链接：", "text_element_style": {"bold": true}}},
      {
        "text_run": {
          "content": "点击查看",
          "text_element_style": {
            "link": {"url": "https://cunkebao.feishu.cn/wiki/xxx"}
          }
        }
      }
    ]
  }
}
```

**表格回退版（制表符分隔的正文块，实际项目常用）**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {
        "text_run": {
          "content": "产品\t价格\t分润\n:---\t:---\t:---\n书籍小程序\t9.9元起\t90%\n会员群\t365元起\t平台收入"
        }
      }
    ]
  }
}
```

---

### 3.2 标题块（block_type: 3/4/5/6）

**规律**：字段名 = `heading1` / `heading2` / `heading3` / `heading4`，结构相同

```json
// 二级标题 (block_type: 4) —— ## 对应
{
  "block_type": 4,
  "heading2": {
    "elements": [
      {"text_run": {"content": "📋 商业模式总览"}}
    ]
  }
}

// 三级标题 (block_type: 5) —— ### 对应
{
  "block_type": 5,
  "heading3": {
    "elements": [
      {"text_run": {"content": "一、市场痛点"}}
    ]
  }
}

// 四级标题 (block_type: 6) —— #### 对应，日志日期专用
{
  "block_type": 6,
  "heading4": {
    "elements": [
      {"text_run": {"content": "3月12日  "}}
    ],
    "style": {"align": 1}
  }
}
```

---

### 3.3 代码块（block_type: 14）

```json
{
  "block_type": 14,
  "code": {
    "elements": [
      {
        "text_run": {
          "content": "SOUL派对（流量入口）\n  ↓\n触客宝自动接待\n  ↓\n存客宝AI分层\n  ↓\nABCD用户匹配"
        }
      }
    ],
    "style": {
      "language": 1
    }
  }
}
```

**language 枚举值**（常用）：

| 值 | 语言 |
|:---|:---|
| 1 | PlainText（纯文本，流程图/ASCII艺术用此） |
| 2 | Python |
| 3 | JavaScript |
| 4 | Java |
| 5 | Go |
| 6 | Shell/Bash |
| 7 | TypeScript |
| 8 | SQL |

---

### 3.4 待办块（block_type: 17）

```json
// 未完成
{
  "block_type": 17,
  "todo": {
    "elements": [
      {"text_run": {"content": "卡若（今日复盘、本月目标、核心任务）"}}
    ],
    "style": {
      "done": false,
      "align": 1
    }
  }
}

// 已完成
{
  "block_type": 17,
  "todo": {
    "elements": [
      {"text_run": {"content": "Soul 107 场运营报表已写入飞书"}}
    ],
    "style": {
      "done": true,
      "align": 1
    }
  }
}
```

---

### 3.5 高亮块/标注（block_type: 19）

```json
// 蓝色背景 [执行] 标注
{
  "block_type": 19,
  "callout": {
    "emoji_id": "sunrise",
    "background_color": 2,
    "border_color": 2,
    "elements": [
      {
        "text_run": {
          "content": "[执行]",
          "text_element_style": {"bold": true, "text_color": 7}
        }
      },
      {
        "text_run": {
          "content": " 本月核心任务：Soul 派对日活突破 500"
        }
      }
    ]
  }
}

// 橙色背景 [警告] 标注
{
  "block_type": 19,
  "callout": {
    "emoji_id": "warning",
    "background_color": 4,
    "border_color": 4,
    "elements": [
      {"text_run": {"content": "注意：Token 过期时间不超过 2 小时"}}
    ]
  }
}

// 绿色背景 [完成] 标注
{
  "block_type": 19,
  "callout": {
    "emoji_id": "white_check_mark",
    "background_color": 3,
    "border_color": 3,
    "elements": [
      {"text_run": {"content": "已完成：飞书运营报表已写入"}}
    ]
  }
}
```

**background_color / border_color 枚举**：

| 值 | 颜色 |
|:---|:---|
| 1 | 无背景/白色 |
| 2 | 蓝色 |
| 3 | 绿色 |
| 4 | 橙色 |
| 5 | 黄色 |
| 6 | 红色 |
| 7 | 紫色 |

**常用 emoji_id**：`sunrise`（🌅）、`warning`（⚠️）、`white_check_mark`（✅）、`bulb`（💡）、`fire`（🔥）、`star`（⭐）、`quote`（引用）

---

### 3.6 分割线（block_type: 22）

```json
{
  "block_type": 22,
  "divider": {}
}
```

---

### 3.7 图片/文件块（block_type: 12，写入专用）

```json
// 文件/图片块（file）
{
  "block_type": 12,
  "file": {
    "file_token": "上传后返回的 file_token",
    "view_type": "inline",
    "file_name": "进度图表.png"
  }
}
```

> 注意：先调用 `drive/v1/medias/upload_all` 上传，拿到 `file_token`，再插入此块。

---

### 3.8 画廊块（block_type: 18）

```json
{
  "block_type": 18,
  "gallery": {
    "image_list": [
      {"file_token": "xxx_file_token_1"},
      {"file_token": "xxx_file_token_2"}
    ],
    "gallery_style": {"align": "center"}
  }
}
```

---

### 3.9 多维表格（block_type: 43）

```json
// 导出时的格式
{
  "block_type": 43,
  "board": {
    "token": "bascnXXXXXXXX"
  }
}

// 写入时（嵌入文档内）
{
  "block_type": 43,
  "bitable": {
    "token": "bascnXXXXXXXX"
  }
}
```

> ⚠️ 多维表格需要**用户身份权限** `bitable:app`，且须重新授权。  
> 独立多维表格用 Bitable 创建接口（不是 docx 接口），结果链接为 `https://cunkebao.feishu.cn/base/{app_token}`。

---

### 3.10 表格块（block_type: 31，慎用）

```json
{
  "block_type": 31,
  "table": {
    "property": {
      "row_size": 3,
      "column_size": 4
    },
    "cells": []
  }
}
```

> ⚠️ **带 cells 时接口返回 9499 报错**（Invalid parameter type in json: cells），飞书官方暂未公开带内容表格块的创建规范。  
> **推荐回退方案**：用正文块（block_type: 2）+ 制表符分隔的 TSV 格式替代表格。

---

## 四、text_element_style 样式完整参数

```json
{
  "text_element_style": {
    "bold": true,              // 加粗
    "italic": true,            // 斜体
    "strikethrough": true,     // 删除线
    "underline": true,         // 下划线
    "inline_code": true,       // 行内代码
    "text_color": 5,           // 文字颜色（见下表）
    "background_color": 2,     // 背景高亮色（见下表）
    "link": {
      "url": "https://..."     // 超链接
    }
  }
}
```

**text_color 枚举**：

| 值 | 颜色 | 实际显示 |
|:---|:---|:---|
| 1 | 黑色（默认） | |
| 2 | 深灰 | |
| 3 | 深橙 | |
| 4 | 橙色 | |
| 5 | 红色 | 重要紧急标注常用 |
| 6 | 玫红 | |
| 7 | 紫色 | |
| 8 | 浅蓝 | |
| 9 | 深蓝 | |
| 10 | 绿色 | 重要不紧急标注常用 |

**background_color（行内高亮）枚举**：同 text_color，1=黄色，2=浅绿，3=橙，4=红，以此类推（实测与 callout 一致）

---

## 五、style 对齐参数

```json
"style": {
  "align": 1    // 1=左对齐，2=居中，3=右对齐
}
```

适用于：`text.style`、`heading*.style`、`todo.style`

---

## 六、实际项目中的完整文档示例

以下是一个完整的飞书 JSON 文档结构（基于项目中 `材料/01_商业模式总览.feishu.json` 的模式）：

```json
{
  "title": "商业模式总览.md",
  "source": "材料/商业模式总览.md",
  "children": [
    {
      "block_type": 4,
      "heading2": {
        "elements": [{"text_run": {"content": "一、项目背景"}}]
      }
    },
    {
      "block_type": 5,
      "heading3": {
        "elements": [{"text_run": {"content": "市场痛点"}}]
      }
    },
    {
      "block_type": 2,
      "text": {
        "elements": [
          {
            "text_run": {
              "content": "痛点\t描述\n:---\t:---\n资源分散\t80%创业者缺乏有效资源对接渠道\n匹配低效\t平均每人加入5+社群，有效链接率<5%"
            }
          }
        ]
      }
    },
    {
      "block_type": 22,
      "divider": {}
    },
    {
      "block_type": 4,
      "heading2": {
        "elements": [{"text_run": {"content": "二、商业模式"}}]
      }
    },
    {
      "block_type": 14,
      "code": {
        "elements": [
          {
            "text_run": {
              "content": "SOUL派对（流量入口）\n  ↓\n触客宝自动接待\n  ↓\n存客宝AI分层（ABCD）\n  ↓\n精准变现"
            }
          }
        ],
        "style": {"language": 1}
      }
    },
    {
      "block_type": 19,
      "callout": {
        "emoji_id": "bulb",
        "background_color": 2,
        "border_color": 2,
        "elements": [
          {"text_run": {"content": "核心模式：云阿米巴——不占股、分现钱、稳流量"}}
        ]
      }
    },
    {
      "block_type": 17,
      "todo": {
        "elements": [
          {"text_run": {"content": "完成产品矩阵报价表"}}
        ],
        "style": {"done": false, "align": 1}
      }
    }
  ]
}
```

---

## 七、飞书 API 接口速查

### 7.1 文档（DocX）相关

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 获取 Wiki 节点（拿 obj_token） | GET | `wiki/v2/spaces/get_node?token={wiki_token}` |
| 获取文档块列表 | GET | `docx/v1/documents/{document_id}/blocks` |
| 在指定块下追加子块 | POST | `docx/v1/documents/{document_id}/blocks/{block_id}/children` |
| 批量删除块 | POST | `docx/v1/documents/{document_id}/blocks/batch_delete` |
| 创建 Wiki 子文档节点 | POST | `wiki/v2/spaces/{space_id}/nodes` |

**追加子块请求体**：
```json
{
  "children": [块1, 块2, ...],
  "index": 0
}
```

> `index: 0` 表示插入到父块最前面；不传或 `-1` 表示追加到末尾。单次最多 50 个块，超出分批调用。

### 7.2 图片/文件上传

**接口**：`POST https://open.feishu.cn/open-apis/drive/v1/medias/upload_all`

**form-data 字段**：

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `file_name` | string | 文件名，如 `chart.png` |
| `parent_type` | string | 固定 `docx_image` |
| `parent_node` | string | 文档的 `obj_token` |
| `size` | string | 文件大小字节数（字符串） |
| `file` | binary | 图片二进制内容 |

**返回**：`data.file_token`，用于插入 block_type 12 或 18

**常见错误**：
- `1770001`：请求体字段名/格式不符
- `1770013`：file_token 与文档关联错误，需先上传再使用

### 7.3 多维表格

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 创建多维表格 | POST | `bitable/v1/apps` |
| 列出数据表 | GET | `bitable/v1/apps/{app_token}/tables` |
| 新建数据表 | POST | `bitable/v1/apps/{app_token}/tables` |

> 须开通 **bitable:app** 用户身份权限，并重新授权。

---

## 八、Markdown → 飞书 Block 转换规则

| Markdown 写法 | 对应飞书 Block |
|:---|:---|
| `# 标题` | heading1（block_type: 3） |
| `## 标题` | heading2（block_type: 4） |
| `### 标题` | heading3（block_type: 5） |
| `#### 标题` | heading4（block_type: 6） |
| 普通段落 | text（block_type: 2） |
| `> 引用` | callout（block_type: 19） |
| `---` | divider（block_type: 22） |
| ` ```代码``` ` | code（block_type: 14） |
| `**加粗**` | text_element_style.bold = true |
| `![图](路径)` | 先上传图片 → file（block_type: 12）或 gallery（18） |
| Markdown 表格 | 优先 spreadsheet（30），失败回退为 TSV 正文块（2） |
| `- [ ]` / `- [x]` | todo（block_type: 17），done=false/true |

---

## 九、日志 TNTWF 格式对应 Block 结构

```json
[
  // 日期标题
  {"block_type": 6, "heading4": {"elements": [{"text_run": {"content": "3月12日  "}}], "style": {"align": 1}}},

  // 高亮块：[执行] 标注
  {"block_type": 19, "callout": {"emoji_id": "sunrise", "background_color": 2, "border_color": 2,
    "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": true, "text_color": 7}}}]}},

  // 象限分类：[重要紧急] 红色
  {"block_type": 2, "text": {
    "elements": [{"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}}],
    "style": {"align": 1}}},

  // 待办任务
  {"block_type": 17, "todo": {
    "elements": [{"text_run": {"content": "Soul 派对→本月突破500在线 🎬 (0%)"}}],
    "style": {"done": false, "align": 1}}},

  // 象限分类：[重要不紧急] 绿色
  {"block_type": 2, "text": {
    "elements": [{"text_run": {"content": "[重要不紧急]", "text_element_style": {"bold": true, "text_color": 10}}}],
    "style": {"align": 1}}},

  // 分割线
  {"block_type": 22, "divider": {}}
]
```

---

## 十、批量上传脚本速查

| 脚本 | 用途 | 命令 |
|:---|:---|:---|
| `upload_json_to_feishu_doc.py` | 单个 JSON 按格式上传（自动判断文档/多维表格） | `python3 脚本/upload_json_to_feishu_doc.py /path/xxx.json` |
| `batch_upload_json_to_feishu_wiki.py` | 目录下全部 JSON 按目录结构批量上传 | `python3 脚本/batch_upload_json_to_feishu_wiki.py /本地目录 --wiki-parent <token>` |
| `feishu_wiki_create_doc.py` | 在指定 Wiki 下创建子文档 | `python3 脚本/feishu_wiki_create_doc.py --parent <token> --title "标题" --json blocks.json` |
| `feishu_article_unified_publish.py` | Markdown → 飞书 Wiki 文档（统一发布） | `python3 脚本/feishu_article_unified_publish.py --parent <token> --title "标题" --md /绝对路径/文章.md` |

---

## 十一、常见问题排查

| 问题 | 原因 | 解决 |
|:---|:---|:---|
| 9499 `Invalid parameter type in json: cells` | 带 cells 的 block_type 31 暂不支持 | 改用正文块 TSV 回退 |
| 1770001 `invalid param` | 字段名/格式错误（snake_case vs camelCase） | 以实际 API 文档为准；图片先上传再插入 |
| 1770013 | file_token 与文档关联错误 | 确认 upload_all 时 parent_node 是正确的 obj_token |
| token 无效/过期 | access_token 有效期 2 小时 | `python3 脚本/feishu_token_cli.py get-access-token` |
| 多维表格权限不足 | 未开通 bitable:app 用户身份权限 | 后台开通后 `python3 脚本/feishu_force_reauth.py` 重新授权 |
| 写入串月 | wiki_token 未按月路由 | 写前用 `wiki/v2/spaces/get_node` 校验文档标题含目标月份 |

---

**版本**：1.0 | **整理**：卡若AI 水桥 | **更新**：2026-03-12  
**数据来源**：项目 `/1、金：项目` 下 52 个 `.feishu.json` 文件 + 飞书管理脚本参考资料
