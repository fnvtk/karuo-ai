---
name: 前端开发
description: 卡若AI 前端开发（火炬）— 苹果毛玻璃风格与卡若标准（神射手/毛狐狸）。官网/全站/数据中台类前端开发时按本 Skill 执行；布局、颜色、组件、globals.css 毛玻璃类均以《前端标准_神射手与毛狐狸》为准。
triggers: 前端开发、毛玻璃、神射手风格、毛狐狸风格、前端标准、前端规格、苹果毛玻璃、Glassmorphism、埋点、点击统计、用户行为、点击锚点、trackClick
owner: 火炬
group: 火
version: "1.1"
updated: "2026-03-22"
---

# 前端开发（火炬）

> 主责：**苹果毛玻璃风格**与卡若标准前端（神射手/毛狐狸）。全栈开发做官网/全站时，前端部分统一走本 Skill。

---

## 一、必读文档（本目录）

| 文档 | 用途 |
|:---|:---|
| **`前端开发/前端标准_神射手与毛狐狸.md`** | **布局、颜色、背景、卡片、按钮、气泡、底部导航、globals.css 毛玻璃类、移动端触达、核心组件形态；所有新前端开发以此为准** |

---

## 二、毛玻璃风格要点

- **页面背景**：`bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20` 或 `from-blue-50 via-white to-purple-50`
- **主按钮**：`bg-gradient-to-r from-blue-500 to-purple-500`，hover `from-blue-600 to-purple-600`
- **卡片**：`bg-white/70`～`bg-white/90 backdrop-blur`、`rounded-xl`、`shadow-sm`/`shadow-lg`
- **全局类**：`.glass`、`.glass-light`、`.glass-heavy`、`.glass-card`、`.glass-nav`、`.glass-button`、`.glass-input`（见《前端标准_神射手与毛狐狸》第四节）
- **移动端**：底部导航 `bg-white/95 backdrop-blur`；可点击元素 ≥44px；内容区 `pb-20` 留底栏
- **图标**：统一 `lucide-react`；骨架屏优先，禁止仅用 Spinner

---

## 三、执行时

1. **先读**：`前端开发/前端标准_神射手与毛狐狸.md`
2. **参考实现**：神射手项目 `开发文档/4、前端/`、`app/globals.css`、`app/page.tsx`、`app/ClientLayout.tsx`、`app/components/Sidebar.tsx`、`BottomNav.tsx`
3. **生成/套用**：新页面与组件按标准中的类名与组件形态编写；v0 出稿后替换为 glass 类与标准色板。

---

## 四、协同

- **全栈开发**：做官网/全站/开发文档 1～10 时，前端部分引用本 Skill，不再在全栈开发 Skill 内展开前端标准全文。
- **前端生成（木果）**：生成 UI 时默认采用本目录《前端标准_神射手与毛狐狸》；可引用本 Skill 或直接读同目录规范文档。

---

## 五、用户行为与点击锚点（与数据统计同轨）

> **完整规范、三层架构、表结构、10 目录登记表、Soul 参考仓库路径** → 必读 **火炬「全栈开发」Skill §1.10**（`火炬_全栈消息/全栈开发/SKILL.md`）。本节只列**前端侧必做项**，避免只做 UI 不做锚点。

### 5.1 前端必须记住的三元组

每处**可点击、可切换 Tab、可分享**的交互，应能映射为：

- **`module`**：页面或业务模块（全站统一枚举，新增先登记）
- **`action`**：`btn_click` / `tab_click` / `nav_click` / `share` / `page_view` 等
- **`target`**：**可区分、可聚合**的锚点文案或 ID（忌「按钮1」这类无法对业务的命名）

### 5.2 落地检查（与后台图表对齐）

- [ ] 同一屏上**每个需要单独看数据的标签/按钮**各有独立 `target`（或 `target` + `extra` 组合可区分）
- [ ] 封装统一 `trackClick`（或等价函数），**静默失败**不打断主流程
- [ ] 需求若含「未登录也要统计」，须与后端约定匿名字段，**不得**前端随意丢弃事件却不写进文档

### 5.3 参考代码（Soul 创业实验）

- `miniprogram/utils/trackClick.js` + 各页面对 `trackClick(...)` 的调用，可作为**任意站点**小程序/Web 埋点命名的样例；路径见全栈开发 §1.10。
