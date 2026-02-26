---
name: 前端生成
description: 现代UI代码生成，默认遵循卡若标准（神射手/毛狐狸）：苹果毛玻璃、渐变背景、统一色板与组件。触发词：生成UI、前端代码、设计页面、生成组件、神射手、毛狐狸、毛玻璃、卡若标准。
group: 木
triggers: 前端生成、UI生成、页面生成、神射手风格、毛狐狸风格、毛玻璃
owner: 木果
version: "2.0"
updated: "2026-02-26"
---

# 前端生成

前端三剑客：UI设计 + 图片生成 + 快速预览。**官网/全站/数据中台类项目优先采用「卡若标准（神射手/毛狐狸）」**。

## 核心能力

1. **Design** - 生成现代审美UI代码（默认卡若标准：毛玻璃+渐变）
2. **Imagen** - 生成占位图和图标
3. **Preview** - 快速部署预览

---

## 卡若标准（神射手/毛狐狸）— 优先采用

> 布局、颜色、毛玻璃、组件与特效以神射手/毛狐狸为准，详见：**火炬「前端开发」Skill** 同目录下的 `前端开发/前端标准_神射手与毛狐狸.md`。

### 风格要点

- **背景**：`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-6`
- **主按钮**：`bg-gradient-to-r from-blue-500 to-purple-500`，hover `from-blue-600 to-purple-600`
- **卡片**：`bg-white/70`～`bg-white/90 backdrop-blur`、`rounded-xl`、`shadow-sm`/`shadow-lg`、`border-0`
- **图标**：统一 `lucide-react`；模块入口用渐变块 `w-10 h-10 rounded-xl bg-gradient-to-r from-xxx to-xxx`
- **移动端**：底部导航 `bg-white/95 backdrop-blur`；可点击元素 ≥44px；`pb-20` 留底栏

### 卡若标准 - 页面容器

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-6">
  {children}
</div>
```

### 卡若标准 - 统计/轻量卡片

```tsx
<Card className="border-0 shadow-sm bg-white/70">
  <CardContent className="p-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-500" />
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs text-gray-500">标签</div>
      </div>
    </div>
  </CardContent>
</Card>
```

### 卡若标准 - 功能模块入口卡片

```tsx
<Card className="border-0 shadow-sm bg-white/70 cursor-pointer hover:shadow-md transition-all group">
  <CardContent className="p-3">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <h3 className="font-medium text-sm text-gray-900">{title}</h3>
    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
  </CardContent>
</Card>
```

### 卡若标准 - 主按钮

```tsx
<Button className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-500">
  主要操作
</Button>
```

### 卡若标准 - 毛玻璃 CSS（globals.css）

```css
.glass-card { @apply backdrop-blur-md rounded-2xl p-6; background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
.glass-nav  { @apply backdrop-blur-sm rounded-2xl; background-color: rgba(255,255,255,0.2); }
.glass-button { @apply backdrop-blur-sm rounded-xl px-4 py-2; min-height: 44px; } /* 移动端触达 */
```

---

## UI 设计原则（通用）

### 现代审美要素

- 📐 布局：留白、网格、响应式（md 断点、pb-20 底栏）
- 🎨 色彩：主色+辅助色+中性色；卡若项目用蓝紫渐变与 white/70～90 毛玻璃
- 📝 字体：字重 400/500/600/700；正文 text-sm，副标题 text-xs text-gray-500
- ✨ 交互：骨架屏优先、过渡/悬停、触达 ≥44px

### 技术栈推荐

| 场景 | 推荐方案 |
|------|----------|
| 卡若官网/全站/中台 | Next.js 14 + Tailwind + shadcn/ui + lucide-react（按神射手标准） |
| React 通用 | Tailwind CSS + shadcn/ui |
| Vue | Tailwind CSS + Vant UI |
| 原生 | Tailwind CSS |

## 组件生成模板（通用）

### 卡片组件（非毛玻璃时可选用）

```tsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
  <h3 className="text-lg font-semibold text-gray-900">标题</h3>
  <p className="mt-2 text-gray-600 leading-relaxed">描述内容</p>
</div>
```

### 按钮（次选，卡若优先用渐变主按钮）

```tsx
// 主按钮 - 卡若标准见上
<Button className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-500">主要操作</Button>

// 次按钮
<Button variant="outline" className="rounded-xl">次要操作</Button>
```

## 占位图生成

### 本地占位图服务

```bash
# 使用 placeholder.com
https://via.placeholder.com/400x300

# 使用 picsum（真实图片）
https://picsum.photos/400/300

# 使用 dummyimage
https://dummyimage.com/400x300/eee/333
```

### 图标资源

```html
<!-- Lucide Icons（推荐） -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Heroicons -->
<script src="https://unpkg.com/heroicons@latest"></script>

<!-- 阿里 iconfont -->
<link rel="stylesheet" href="//at.alicdn.com/t/xxx.css">
```

## 骨架屏模板

```tsx
// 骨架屏组件
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
  <div className="h-32 bg-gray-200 rounded mb-4"></div>
  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
</div>
```

## 配色方案

### 卡若标准（神射手/毛狐狸）

| 用途 | Tailwind 类名 |
|------|----------------|
| 页面背景 | `from-slate-50 via-blue-50/30 to-purple-50/20` |
| 主按钮/主操作 | `from-blue-500 to-purple-500`，hover `from-blue-600 to-purple-600` |
| 卡片表面 | `bg-white/70`、`bg-white/80`、`bg-white/90 backdrop-blur` |
| 成功/在线 | `green-500`、`bg-green-100 text-green-700` |
| 警告 | `yellow-500`、`bg-yellow-100 text-yellow-700` |
| 错误 | `red-500`、`bg-red-100 text-red-700` |
| 高亮/等级 | `purple-500`、`bg-purple-100 text-purple-700` |
| 标题 | `text-gray-900`、`font-bold` / `font-medium` |
| 副标题/说明 | `text-xs text-gray-500` |

### 通用配色（非卡若项目可选）

| 用途 | 色值 | Tailwind |
|------|------|----------|
| 主色 | #3B82F6 | blue-500 |
| 成功 | #22C55E | green-500 |
| 警告 | #F59E0B | amber-500 |
| 错误 | #EF4444 | red-500 |
| 文字主 | #111827 | gray-900 |
| 文字次 | #6B7280 | gray-500 |
| 背景 | #F9FAFB | gray-50 |
| 边框 | #E5E7EB | gray-200 |

---

## 联动

- **前端开发（火炬）**：官网/全站/数据中台类项目前端与毛玻璃标准见火炬「前端开发」Skill，规范文档为同目录 `前端开发/前端标准_神射手与毛狐狸.md`，生成页面时可直接引用该文档中的类名与组件片段。
