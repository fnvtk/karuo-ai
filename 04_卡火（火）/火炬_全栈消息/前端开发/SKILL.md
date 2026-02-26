---
name: 前端开发
description: 卡若AI 前端开发（火炬）— 苹果毛玻璃风格与卡若标准（神射手/毛狐狸）。官网/全站/数据中台类前端开发时按本 Skill 执行；布局、颜色、组件、globals.css 毛玻璃类均以《前端标准_神射手与毛狐狸》为准。
triggers: 前端开发、毛玻璃、神射手风格、毛狐狸风格、前端标准、前端规格、苹果毛玻璃、Glassmorphism
owner: 火炬
group: 火
version: "1.0"
updated: "2026-02-26"
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
