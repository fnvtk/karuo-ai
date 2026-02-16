# 使用说明

## 快速开始

### 1. 安装依赖

```bash
cd TaskShow
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

## 核心功能使用

### 1. 使用封装的请求方法

```typescript
import { request } from '@/utils/request'

// GET 请求
const getUserList = async () => {
  try {
    const response = await request.get('/api/users', { page: 1, pageSize: 10 })
    console.log(response.data) // 响应数据
  } catch (error) {
    console.error('请求失败:', error)
  }
}

// POST 请求
const createUser = async () => {
  try {
    const response = await request.post('/api/users', {
      name: 'John',
      email: 'john@example.com'
    })
    console.log(response.data)
  } catch (error) {
    console.error('创建失败:', error)
  }
}

// 自定义配置
const customRequest = async () => {
  const response = await request.get('/api/users', {}, {
    showLoading: false,  // 不显示 loading
    showError: false,    // 不显示错误提示
    timeout: 5000        // 5秒超时
  })
}
```

### 2. 使用 Pinia Store

```typescript
import { useUserStore } from '@/store'

// 在组件中使用
const userStore = useUserStore()

// 设置 token
userStore.setToken('your-token-here')

// 设置用户信息
userStore.setUserInfo({ id: 1, name: 'John' })

// 清除用户信息
userStore.clearUser()

// 访问状态
console.log(userStore.token)
console.log(userStore.userInfo)
```

### 3. 使用路由

```typescript
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 编程式导航
router.push('/home')
router.push({ name: 'Home', params: { id: 1 } })

// 获取路由参数
const id = route.params.id
```

### 4. 使用 Element Plus 组件

```vue
<template>
  <el-button type="primary" @click="handleClick">点击</el-button>
  <el-table :data="tableData">
    <el-table-column prop="name" label="姓名" />
    <el-table-column prop="email" label="邮箱" />
  </el-table>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const tableData = ref([
  { name: 'John', email: 'john@example.com' }
])

const handleClick = () => {
  ElMessage.success('操作成功')
}
</script>
```

## 项目结构说明

- `src/api/` - API 接口定义
- `src/components/` - 公共组件
- `src/router/` - 路由配置
- `src/store/` - Pinia 状态管理
- `src/types/` - TypeScript 类型定义
- `src/utils/` - 工具函数（包含封装的 request）
- `src/views/` - 页面组件

## 环境变量配置

在项目根目录创建 `.env.development` 和 `.env.production` 文件：

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api

# .env.production
VITE_API_BASE_URL=https://api.example.com/api
```

## 注意事项

1. 所有 API 请求会自动添加 token（如果存在）
2. 请求失败会自动显示错误提示（可通过配置关闭）
3. 请求时会自动显示 loading（可通过配置关闭）
4. 401 错误会自动清除用户信息并提示登录
