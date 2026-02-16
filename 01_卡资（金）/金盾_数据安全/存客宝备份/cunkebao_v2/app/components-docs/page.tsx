"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

/**
 * 组件文档页面
 * 提供详细的组件使用文档和API说明
 */
export default function ComponentsDocs() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">组件文档</h1>
        <p className="text-gray-600">详细的组件使用指南、API文档和最佳实践</p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="getting-started">快速开始</TabsTrigger>
          <TabsTrigger value="basic-components">基础组件</TabsTrigger>
          <TabsTrigger value="custom-components">自定义组件</TabsTrigger>
          <TabsTrigger value="best-practices">最佳实践</TabsTrigger>
          <TabsTrigger value="changelog">更新日志</TabsTrigger>
        </TabsList>

        {/* 快速开始 */}
        <TabsContent value="getting-started" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>快速开始</CardTitle>
              <CardDescription>了解如何在项目中使用组件库</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">安装和导入</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                  <pre>{`// 导入基础UI组件
import { Button, Card, Input } from "@/components/ui"

// 导入自定义组件
import { PageHeader, StatCard } from "@/app/components/common"

// 使用组件
function MyComponent() {
  return (
    <Card>
      <PageHeader title="标题" description="描述" />
      <Button>点击我</Button>
    </Card>
  )
}`}</pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">项目结构</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre>{`app/
├── components/
│   ├── ui/              # 基础UI组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── common/          # 自定义业务组件
│       ├── PageHeader.tsx
│       ├── StatCard.tsx
│       └── ...
├── lib/
│   └── utils.ts         # 工具函数
└── types/               # 类型定义`}</pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">主题配置</h3>
                <p className="text-gray-600 mb-3">组件库使用 Tailwind CSS 进行样式管理，支持自定义主题配置。</p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                  <pre>{`// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  }
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 基础组件文档 */}
        <TabsContent value="basic-components" className="space-y-6">
          <ComponentDoc
            name="Button"
            description="按钮组件，支持多种样式和状态"
            props={[
              {
                name: "variant",
                type: "'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'",
                default: "'default'",
                description: "按钮样式变体",
              },
              { name: "size", type: "'sm' | 'default' | 'lg'", default: "'default'", description: "按钮大小" },
              { name: "disabled", type: "boolean", default: "false", description: "是否禁用" },
              { name: "onClick", type: "() => void", default: "-", description: "点击事件处理函数" },
            ]}
            example={`<Button variant="primary" size="lg" onClick={() => alert('clicked')}>
  点击我
</Button>`}
          />

          <ComponentDoc
            name="Card"
            description="卡片容器组件，用于包装内容"
            props={[
              { name: "className", type: "string", default: "-", description: "自定义CSS类名" },
              { name: "children", type: "ReactNode", default: "-", description: "卡片内容" },
            ]}
            example={`<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    内容区域
  </CardContent>
</Card>`}
          />

          <ComponentDoc
            name="Input"
            description="输入框组件，支持多种类型"
            props={[
              {
                name: "type",
                type: "'text' | 'email' | 'password' | 'number'",
                default: "'text'",
                description: "输入类型",
              },
              { name: "placeholder", type: "string", default: "-", description: "占位符文本" },
              { name: "disabled", type: "boolean", default: "false", description: "是否禁用" },
              { name: "value", type: "string", default: "-", description: "输入值" },
              { name: "onChange", type: "(e: ChangeEvent) => void", default: "-", description: "值变化回调" },
            ]}
            example={`<Input
  type="email"
  placeholder="请输入邮箱"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>`}
          />
        </TabsContent>

        {/* 自定义组件文档 */}
        <TabsContent value="custom-components" className="space-y-6">
          <ComponentDoc
            name="PageHeader"
            description="页面头部组件，提供统一的页面标题和描述布局"
            props={[
              { name: "title", type: "string", default: "-", description: "页面标题" },
              { name: "description", type: "string", default: "-", description: "页面描述" },
              { name: "actions", type: "ReactNode", default: "-", description: "操作按钮区域" },
              { name: "breadcrumb", type: "ReactNode", default: "-", description: "面包屑导航" },
            ]}
            example={`<PageHeader
  title="设备管理"
  description="管理所有连接的设备"
  actions={<Button>添加设备</Button>}
/>`}
          />

          <ComponentDoc
            name="StatCard"
            description="统计卡片组件，用于展示关键指标"
            props={[
              { name: "title", type: "string", default: "-", description: "统计标题" },
              { name: "value", type: "string | number", default: "-", description: "统计值" },
              { name: "icon", type: "ReactNode", default: "-", description: "图标" },
              { name: "trend", type: "{ value: number; isPositive: boolean }", default: "-", description: "趋势信息" },
              { name: "description", type: "string", default: "-", description: "描述信息" },
            ]}
            example={`<StatCard
  title="总设备数"
  value="1,234"
  icon={<Smartphone className="h-6 w-6" />}
  trend={{ value: 12, isPositive: true }}
/>`}
          />
        </TabsContent>

        {/* 最佳实践 */}
        <TabsContent value="best-practices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>最佳实践</CardTitle>
              <CardDescription>使用组件库的推荐做法</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">组件使用原则</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 优先使用现有组件，避免重复造轮子</li>
                  <li>• 保持组件的单一职责原则</li>
                  <li>• 使用TypeScript确保类型安全</li>
                  <li>• 遵循统一的命名规范</li>
                  <li>• 添加适当的注释和文档</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">性能优化</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 使用React.memo优化组件渲染</li>
                  <li>• 合理使用useCallback和useMemo</li>
                  <li>• 避免在render中创建新对象</li>
                  <li>• 使用懒加载减少初始包大小</li>
                  <li>• 实现虚拟滚动处理大数据</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">可访问性</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 为所有交互元素添加适当的ARIA标签</li>
                  <li>• 确保键盘导航的可用性</li>
                  <li>• 提供足够的颜色对比度</li>
                  <li>• 为图片添加alt属性</li>
                  <li>• 使用语义化的HTML标签</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 更新日志 */}
        <TabsContent value="changelog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>更新日志</CardTitle>
              <CardDescription>组件库的版本更新记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>v1.2.0</Badge>
                    <span className="text-sm text-gray-500">2024-01-15</span>
                  </div>
                  <h4 className="font-medium mb-2">新增功能</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 新增 FileUploader 组件</li>
                    <li>• 新增 Wizard 向导组件</li>
                    <li>• 新增 NotificationSystem 通知系统</li>
                    <li>• 新增图表组件库</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">v1.1.0</Badge>
                    <span className="text-sm text-gray-500">2024-01-10</span>
                  </div>
                  <h4 className="font-medium mb-2">改进优化</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 优化 DeviceSelector 组件性能</li>
                    <li>• 改进 DataTable 组件的响应式设计</li>
                    <li>• 统一组件的样式规范</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.0.0</Badge>
                    <span className="text-sm text-gray-500">2024-01-01</span>
                  </div>
                  <h4 className="font-medium mb-2">初始版本</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 基础UI组件库</li>
                    <li>• 核心业务组件</li>
                    <li>• 组件文档系统</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 组件文档展示组件
function ComponentDoc({
  name,
  description,
  props,
  example,
}: {
  name: string
  description: string
  props: Array<{
    name: string
    type: string
    default: string
    description: string
  }>
  example: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {name}
          <Badge variant="outline">组件</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">属性 (Props)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>属性名</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>默认值</TableHead>
                <TableHead>描述</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.map((prop) => (
                <TableRow key={prop.name}>
                  <TableCell className="font-mono text-sm">{prop.name}</TableCell>
                  <TableCell className="font-mono text-sm text-blue-600">{prop.type}</TableCell>
                  <TableCell className="font-mono text-sm">{prop.default}</TableCell>
                  <TableCell>{prop.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <h4 className="font-medium mb-3">使用示例</h4>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{example}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
