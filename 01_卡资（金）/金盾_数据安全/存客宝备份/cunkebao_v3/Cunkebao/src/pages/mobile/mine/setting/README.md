# 设置功能说明

## 概述

设置功能为存客宝管理系统提供了完整的用户配置管理，包括账户设置、通知设置、应用设置等多个模块。

## 功能模块

### 1. 主设置页面 (`index.tsx`)

**功能特性：**

- 用户信息展示
- 分组设置项管理
- 设置状态持久化

**主要组件：**

- 用户信息卡片：显示头像、昵称、账号、角色
- 设置分组：账户设置、通知设置、应用设置、其他
- 版本信息：显示应用版本和版权信息

### 2. 安全设置页面 (`SecuritySetting.tsx`)

**功能特性：**

- 密码修改
- 手机号绑定
- 登录设备管理
- 安全建议

**主要功能：**

- 修改密码：支持旧密码验证和新密码确认
- 绑定手机号：提高账号安全性
- 设备管理：查看和管理已登录设备
- 安全提醒：提供账号安全建议

### 3. 关于页面 (`About.tsx`)

**功能特性：**

- 应用信息展示
- 功能特性介绍
- 联系方式
- 法律信息

**主要内容：**

- 应用版本信息
- 功能介绍：设备管理、自动营销、流量池管理等
- 联系方式：邮箱、电话、官网
- 法律文档：隐私政策、用户协议、开源许可

## 设置管理

### 设置Store (`settings.ts`)

**功能特性：**

- 全局设置状态管理
- 设置持久化存储
- 设置工具函数

**支持的设置项：**

#### 通知设置

- `pushNotification`: 推送通知开关
- `emailNotification`: 邮件通知开关
- `soundNotification`: 声音提醒开关

#### 应用设置

- `autoLogin`: 自动登录开关
- `language`: 语言设置
- `timezone`: 时区设置

#### 隐私设置

- `analyticsEnabled`: 数据分析开关
- `crashReportEnabled`: 崩溃报告开关

#### 功能设置

- `autoSave`: 自动保存开关
- `showTutorial`: 教程显示开关

### 工具函数

```typescript
// 获取设置值
const value = getSetting("pushNotification");

// 设置值
setSetting("autoLogin", true);
```

## 样式设计

### 设计原则

- 移动端优先设计
- 统一的视觉风格
- 良好的用户体验

### 样式特性

- 响应式布局
- 卡片式设计
- 圆角边框
- 阴影效果
- 渐变背景

## 路由配置

```typescript
// 设置相关路由
{
  path: "/settings",
  element: <Setting />,
  auth: true,
},
{
  path: "/security",
  element: <SecuritySetting />,
  auth: true,
},
{
  path: "/about",
  element: <About />,
  auth: true,
}
```

## 使用示例

### 基本使用

```typescript
import { useSettingsStore } from '@/store/module/settings';

const MyComponent = () => {
  const { settings, updateSetting } = useSettingsStore();

  const handleToggleNotification = () => {
    updateSetting('pushNotification', !settings.pushNotification);
  };

  return (
    <Switch
      checked={settings.pushNotification}
      onChange={handleToggleNotification}
    />
  );
};
```

## 扩展功能

### 添加新设置项

1. 在 `AppSettings` 接口中添加新字段
2. 在 `defaultSettings` 中设置默认值
3. 在设置页面中添加对应的UI组件
4. 在样式文件中添加相应的样式

### 添加新设置页面

1. 创建新的页面组件
2. 在路由配置中添加路由
3. 在主设置页面中添加导航链接
4. 添加相应的样式

## 注意事项

1. **数据持久化**：所有设置都会自动保存到本地存储
2. **权限控制**：某些设置可能需要管理员权限
3. **兼容性**：确保在不同设备和浏览器上的兼容性
4. **性能优化**：避免频繁的设置更新影响性能

## 未来规划

- [ ] 多语言支持
- [ ] 设置导入导出
- [ ] 云端同步设置
- [ ] 设置备份恢复
- [ ] 高级设置选项
