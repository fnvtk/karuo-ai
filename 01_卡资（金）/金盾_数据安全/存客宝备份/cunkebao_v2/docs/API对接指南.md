# 存客宝API对接指南

## 🎯 普通人最佳对接方式

### 第一步：环境准备（5分钟）

1. **检查环境变量**
   \`\`\`bash
   # 在项目根目录创建 .env.local 文件
   echo "NEXT_PUBLIC_API_BASE_URL=https://ckbapi.quwanzhi.com" > .env.local
   \`\`\`

2. **安装依赖**
   \`\`\`bash
   npm install
   \`\`\`

3. **启动项目**
   \`\`\`bash
   npm run dev
   \`\`\`

### 第二步：API测试（10分钟）

1. **打开浏览器访问**: http://localhost:3000
2. **查看控制台日志**: 按F12打开开发者工具
3. **测试API连接**: 点击任意功能按钮，查看网络请求

### 第三步：接口对接（按模块进行）

#### 🔧 设备管理接口
- **接口地址**: `/api/devices`
- **请求方式**: GET
- **返回格式**: 
  \`\`\`json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": "1",
        "name": "设备1",
        "status": "online",
        "battery": 94
      }
    ]
  }
  \`\`\`

#### 🔧 微信管理接口
- **接口地址**: `/api/wechat/accounts`
- **请求方式**: GET
- **返回格式**: 标准JSON数组

#### 🔧 流量池接口
- **接口地址**: `/api/traffic/pools`
- **请求方式**: GET
- **返回格式**: 标准JSON数组

### 第四步：错误处理（重要）

#### 常见错误及解决方案

1. **"filter is not a function"错误**
   - **原因**: API返回的不是数组格式
   - **解决**: 已在代码中添加数据格式检查
   - **位置**: `lib/api/client.ts` 的 `validateResponseData` 方法

2. **网络请求失败**
   - **原因**: API地址不正确或网络问题
   - **解决**: 检查 `.env.local` 文件中的API地址
   - **测试**: 在浏览器直接访问API地址

3. **认证失败**
   - **原因**: 缺少认证token
   - **解决**: 在API请求头中添加认证信息
   - **位置**: `lib/api/client.ts` 的 `getAuthHeaders` 方法

### 第五步：数据格式统一（关键）

#### API响应格式标准化
\`\`\`typescript
// 统一的API响应格式
interface ApiResponse<T> {
  code: number        // 状态码：200=成功
  message: string     // 响应消息
  data: T            // 实际数据
  success?: boolean   // 是否成功
}
\`\`\`

#### 数据安全检查
\`\`\`typescript
// 确保数组数据的安全性
const devices = Array.isArray(response.data) ? response.data : []

// 确保对象数据的安全性  
const stats = response.data && typeof response.data === 'object' ? response.data : {}
\`\`\`

### 第六步：实际对接步骤

#### 1. 替换模拟数据（推荐方式）
\`\`\`typescript
// 在 lib/api/devices.ts 中
export async function getDevices(): Promise<Device[]> {
  try {
    // 真实API调用
    const response = await apiClient.get<Device[]>("/api/devices")
    return Array.isArray(response.data) ? response.data : []
  } catch (error) {
    // 降级到模拟数据
    return mockDevices
  }
}
\`\`\`

#### 2. 逐步替换接口
- **第1天**: 设备管理接口
- **第2天**: 微信管理接口  
- **第3天**: 流量池接口
- **第4天**: 场景获客接口
- **第5天**: 工作台接口

#### 3. 测试验证
每替换一个接口后：
1. 刷新页面测试功能
2. 查看控制台是否有错误
3. 验证数据显示是否正常

### 第七步：部署上线

#### 生产环境配置
\`\`\`bash
# 设置生产环境API地址
NEXT_PUBLIC_API_BASE_URL=https://your-production-api.com
\`\`\`

#### 构建项目
\`\`\`bash
npm run build
npm start
\`\`\`

## 🚨 重要提醒

### 数据安全
- ✅ 所有API调用都有错误处理
- ✅ 数据格式自动验证
- ✅ 降级到模拟数据
- ✅ 用户友好的错误提示

### 性能优化
- ✅ 自动重试机制
- ✅ 请求超时控制
- ✅ 数据缓存策略
- ✅ 加载状态显示

### 开发体验
- ✅ TypeScript类型检查
- ✅ 详细的调试日志
- ✅ 热重载支持
- ✅ 错误边界保护

## 📞 技术支持

如果遇到问题：
1. 查看浏览器控制台错误信息
2. 检查网络请求是否正常
3. 验证API返回数据格式
4. 参考本文档的错误解决方案

## 🎉 成功标志

当您看到以下情况时，说明对接成功：
- ✅ 页面正常显示设备列表
- ✅ 数据能够正常刷新
- ✅ 没有控制台错误
- ✅ 功能操作正常响应
\`\`\`
