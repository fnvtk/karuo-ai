# Task Show

基于 Vue3 + Element Plus + Pinia + TypeScript + Axios 的前端基础工程

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - JavaScript 的超集
- **Vite** - 下一代前端构建工具
- **Element Plus** - 基于 Vue 3 的组件库
- **Pinia** - Vue 的状态管理库
- **Vue Router** - Vue 官方路由管理器
- **Axios** - 基于 Promise 的 HTTP 客户端

## 项目结构

```
TaskShow/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # 公共组件
│   ├── router/          # 路由配置
│   │   └── index.ts
│   ├── store/           # Pinia 状态管理
│   │   └── index.ts
│   ├── types/           # TypeScript 类型定义
│   │   └── api.ts
│   ├── utils/           # 工具函数
│   │   └── request.ts   # Axios 请求封装
│   ├── views/           # 页面组件
│   │   └── Home.vue
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── index.html           # HTML 模板
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
├── vite.config.ts       # Vite 配置
└── README.md           # 项目说明
```

## 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

## 开发

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

## 构建

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

## 预览构建结果

```bash
npm run preview
# 或
yarn preview
# 或
pnpm preview
```

## 请求封装说明

### 使用方式

```typescript
import { request } from '@/utils/request'

// GET 请求
const response = await request.get('/api/users', { id: 1 })

// POST 请求
const response = await request.post('/api/users', { name: 'John' })

// PUT 请求
const response = await request.put('/api/users/1', { name: 'Jane' })

// DELETE 请求
const response = await request.delete('/api/users/1')

// 自定义配置
const response = await request.get('/api/users', {}, {
  showLoading: false,  // 不显示 loading
  showError: false,    // 不显示错误提示
  timeout: 5000        // 自定义超时时间
})
```

### 特性

1. **自动添加 Token**：请求时自动从 store 中获取 token 并添加到请求头
2. **统一错误处理**：自动处理 HTTP 错误和业务错误
3. **Loading 提示**：请求时自动显示 loading（可配置）
4. **错误提示**：请求失败时自动显示错误消息（可配置）
5. **类型支持**：完整的 TypeScript 类型定义

### 环境变量

在 `.env`、`.env.development` 或 `.env.production` 文件中配置 API 基础地址：

```
VITE_API_BASE_URL=/api
```

## License

MIT

