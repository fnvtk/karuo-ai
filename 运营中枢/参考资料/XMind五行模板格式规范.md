# XMind 五行模板格式规范

> 所有项目脑图、读书笔记脑图统一采用此格式，不再使用旧版 flag-marker 平铺格式。

## 布局结构

| 要素 | 规格 |
|------|------|
| **中心节点** | 珊瑚红 `#e4705c`，20pt 粗体，`org.xmind.ui.map.clockwise` |
| **五行节点** | 橙色浮动 `#F0B67F`，棕色文字 `#775D44`，用 `detached` + `position` 定位 |
| **子节点** | 深灰 `#434B54`，白色文字，11pt |
| **边框** | 奶油底 `#FEF1E4`，橙色边线 `#F0B67F` |
| **连线** | 曲线 `org.xmind.branchConnection.curve`，1pt |

## 五行方位坐标（固定）

```
        金 (-8, -252)
         ↑
土 (-260, -83)    水 (271, -113)
         ●
火 (-175, 197)    木 (196, 191)
```

| 元素 | X | Y | 方位 | 含义 |
|------|-----|------|------|------|
| 金 | -8 | -252 | 正上 | 定位/架构/资源 |
| 水 | 271 | -113 | 右上 | 流程/路径/规划 |
| 木 | 196 | 191 | 右下 | 执行/产品/落地 |
| 火 | -175 | 197 | 左下 | 运营/数据/迭代 |
| 土 | -260 | -83 | 左上 | 增长/裂变/沉淀 |

## 主题定义（Theme JSON）

```json
{
  "centralTopic": {
    "properties": {
      "fo:font-size": "20pt",
      "fo:font-weight": "600",
      "svg:fill": "#e4705c",
      "line-color": "#434B54",
      "border-line-width": "0"
    }
  },
  "floatingTopic": {
    "properties": {
      "fo:font-weight": "600",
      "fo:color": "#775D44",
      "svg:fill": "#F0B67F",
      "line-width": "1pt",
      "line-color": "#F0B67F",
      "border-line-color": "#F0B67F",
      "border-line-width": "0",
      "line-class": "org.xmind.branchConnection.curve"
    }
  },
  "mainTopic": {
    "properties": {
      "fo:font-size": "14pt",
      "fo:color": "#FFFFFF",
      "svg:fill": "#434B54",
      "line-width": "1pt",
      "border-line-width": "0",
      "line-class": "org.xmind.branchConnection.curve"
    }
  },
  "subTopic": {
    "properties": {
      "fo:font-size": "11pt",
      "fo:color": "#434B54",
      "fo:text-align": "left"
    }
  },
  "boundary": {
    "properties": {
      "fo:font-size": "14pt",
      "fo:font-weight": "700",
      "fo:color": "#F0B67F",
      "svg:fill": "#FEF1E4",
      "line-color": "#F0B67F"
    }
  }
}
```

## 节点结构规范

### 项目脑图

```
中心: 项目名 + 一句话描述（换行）
├── [detached] 金 — 定位/架构/团队/资源
├── [detached] 水 — 流程/SOP/通道/规划
├── [detached] 木 — 产品/执行/铺货/交付
├── [detached] 火 — 运营/数据/代理/复盘
└── [detached] 土 — 分佣/裂变/营收/增长
```

### 读书笔记脑图

```
中心: 《书名》+ 作者（换行）
├── [detached] 金 — 定位与角色
├── [detached] 水 — 经历与路径
├── [detached] 木 — 方法与产出
├── [detached] 火 — 认知与判断
├── [detached] 土 — 系统与沉淀
├── [attached] 一句话总结
├── [attached] 问题与解答
├── [attached] 人物分析
├── [attached] 金句与关键词
├── [attached] 流程图示
└── [attached] 使用规则
```

## 相关脚本

- 读书笔记：`04_卡火（火）/火种_知识模型/读书笔记/脚本/write_to_xmind.py`
- 项目脑图：按本规范手动或脚本生成，参考龙虾项目 restyle 脚本

## 变更记录

| 日期 | 内容 |
|------|------|
| 2026-03-15 | v2.0 — 从 flag-marker 平铺格式升级为 detached 浮动五方位格式 |
