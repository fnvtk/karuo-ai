---
name: 前端生成
description: 现代UI代码生成。触发词：生成UI、前端代码、设计页面、生成组件、现代风格、UI设计、页面布局、占位图、图标生成。生成符合现代审美的UI代码，支持占位图和图标生成。
---

# 前端生成

前端三剑客：UI设计 + 图片生成 + 快速预览

## 核心能力

1. **Design** - 生成现代审美UI代码
2. **Imagen** - 生成占位图和图标
3. **Preview** - 快速部署预览

## UI 设计原则

### 现代审美标准

```
┌─────────────────────────────────────────────────────────┐
│  现代 UI 设计要素                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📐 布局                                                │
│  • 大量留白（呼吸感）                                   │
│  • 对齐和网格系统                                       │
│  • 响应式设计                                           │
│                                                         │
│  🎨 色彩                                                │
│  • 主色 + 辅助色 + 中性色                               │
│  • 对比度符合无障碍标准                                 │
│  • 渐变和阴影增加层次                                   │
│                                                         │
│  📝 字体                                                │
│  • 字重层级分明（400/500/600/700）                      │
│  • 行高 1.5-1.8                                         │
│  • 中文用系统字体栈                                     │
│                                                         │
│  ✨ 交互                                                │
│  • 微动效（过渡、悬停）                                 │
│  • 加载状态（骨架屏）                                   │
│  • 反馈明确                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 技术栈推荐

| 场景 | 推荐方案 |
|------|----------|
| React | Tailwind CSS + shadcn/ui |
| Vue | Tailwind CSS + Vant UI |
| 原生 | Tailwind CSS |

## 组件生成模板

### 卡片组件

```tsx
// 现代卡片组件
<div className="
  bg-white rounded-2xl shadow-sm
  border border-gray-100
  p-6 hover:shadow-md
  transition-shadow duration-200
">
  <h3 className="text-lg font-semibold text-gray-900">标题</h3>
  <p className="mt-2 text-gray-600 leading-relaxed">描述内容</p>
</div>
```

### 按钮组件

```tsx
// 主按钮
<button className="
  px-6 py-3 rounded-xl
  bg-blue-600 hover:bg-blue-700
  text-white font-medium
  transition-colors duration-200
  shadow-sm hover:shadow
">
  主要操作
</button>

// 次按钮
<button className="
  px-6 py-3 rounded-xl
  bg-gray-100 hover:bg-gray-200
  text-gray-700 font-medium
  transition-colors duration-200
">
  次要操作
</button>
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

### 常用配色

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
