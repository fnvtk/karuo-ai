"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { CalendarIcon, Code, Copy, Check, Smartphone, Users, TrendingUp, Activity } from "lucide-react"

/**
 * 组件库展示页面
 * 展示所有可用的UI组件和自定义组件
 */
export default function ComponentsDemo() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">存客宝组件库</h1>
        <p className="text-gray-600">展示项目中所有可用的UI组件和自定义组件，包含使用示例和代码演示</p>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">基础组件</TabsTrigger>
          <TabsTrigger value="forms">表单组件</TabsTrigger>
          <TabsTrigger value="data">数据展示</TabsTrigger>
          <TabsTrigger value="feedback">反馈组件</TabsTrigger>
          <TabsTrigger value="navigation">导航组件</TabsTrigger>
          <TabsTrigger value="custom">自定义组件</TabsTrigger>
        </TabsList>

        {/* 基础组件 */}
        <TabsContent value="basic" className="space-y-6">
          <ComponentSection title="按钮组件" description="各种样式和状态的按钮">
            <div className="flex flex-wrap gap-4">
              <Button>默认按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="outline">边框按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="destructive">危险按钮</Button>
              <Button disabled>禁用按钮</Button>
              <Button size="sm">小按钮</Button>
              <Button size="lg">大按钮</Button>
            </div>
          </ComponentSection>

          <ComponentSection title="徽章组件" description="用于标记和分类的徽章">
            <div className="flex flex-wrap gap-4">
              <Badge>默认</Badge>
              <Badge variant="secondary">次要</Badge>
              <Badge variant="outline">边框</Badge>
              <Badge variant="destructive">危险</Badge>
              <Badge className="bg-green-500">成功</Badge>
              <Badge className="bg-yellow-500">警告</Badge>
            </div>
          </ComponentSection>

          <ComponentSection title="头像组件" description="用户头像展示">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="用户头像" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar className="h-12 w-12">
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <Avatar className="h-16 w-16">
                <AvatarFallback>XY</AvatarFallback>
              </Avatar>
            </div>
          </ComponentSection>

          <ComponentSection title="分隔符" description="内容分隔线">
            <div className="space-y-4">
              <div>水平分隔符</div>
              <Separator />
              <div>垂直分隔符</div>
              <div className="flex items-center space-x-4">
                <span>左侧内容</span>
                <Separator orientation="vertical" className="h-4" />
                <span>右侧内容</span>
              </div>
            </div>
          </ComponentSection>
        </TabsContent>

        {/* 表单组件 */}
        <TabsContent value="forms" className="space-y-6">
          <ComponentSection title="输入框" description="各种类型的输入框">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="text">文本输入</Label>
                <Input id="text" placeholder="请输入文本" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱输入</Label>
                <Input id="email" type="email" placeholder="请输入邮箱" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码输入</Label>
                <Input id="password" type="password" placeholder="请输入密码" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled">禁用输入</Label>
                <Input id="disabled" placeholder="禁用状态" disabled />
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="文本域" description="多行文本输入">
            <div className="space-y-2">
              <Label htmlFor="textarea">描述</Label>
              <Textarea id="textarea" placeholder="请输入详细描述..." rows={4} />
            </div>
          </ComponentSection>

          <ComponentSection title="选择器" description="下拉选择组件">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择设备类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="windows">Windows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">在线</SelectItem>
                    <SelectItem value="offline">离线</SelectItem>
                    <SelectItem value="busy">忙碌</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="开关和复选框" description="布尔值输入组件">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="notifications" />
                <Label htmlFor="notifications">启用通知</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">同意服务条款</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="marketing" />
                  <Label htmlFor="marketing">接收营销邮件</Label>
                </div>
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="单选按钮" description="单选组件">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1">选项 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2">选项 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3">选项 3</Label>
              </div>
            </RadioGroup>
          </ComponentSection>

          <ComponentSection title="滑块" description="数值范围选择">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>音量: 50%</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
              <div className="space-y-2">
                <Label>价格范围: ¥100 - ¥500</Label>
                <Slider defaultValue={[100, 500]} max={1000} step={10} />
              </div>
            </div>
          </ComponentSection>
        </TabsContent>

        {/* 数据展示 */}
        <TabsContent value="data" className="space-y-6">
          <ComponentSection title="统计卡片" description="数据统计展示">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardDemo
                title="总设备数"
                value="1,234"
                icon={<Smartphone className="h-6 w-6" />}
                trend={{ value: 12, isPositive: true }}
              />
              <StatCardDemo
                title="在线用户"
                value="856"
                icon={<Users className="h-6 w-6" />}
                trend={{ value: 8, isPositive: true }}
              />
              <StatCardDemo
                title="今日获客"
                value="342"
                icon={<TrendingUp className="h-6 w-6" />}
                trend={{ value: 5, isPositive: false }}
              />
              <StatCardDemo
                title="活跃度"
                value="89%"
                icon={<Activity className="h-6 w-6" />}
                trend={{ value: 3, isPositive: true }}
              />
            </div>
          </ComponentSection>

          <ComponentSection title="进度条" description="进度展示组件">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>任务进度</Label>
                  <span className="text-sm text-gray-500">75%</span>
                </div>
                <Progress value={75} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>存储使用</Label>
                  <span className="text-sm text-gray-500">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
            </div>
          </ComponentSection>

          <ComponentSection title="表格" description="数据表格展示">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">好友数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">设备001</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500">在线</Badge>
                  </TableCell>
                  <TableCell>Android</TableCell>
                  <TableCell className="text-right">1,234</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">设备002</TableCell>
                  <TableCell>
                    <Badge variant="secondary">离线</Badge>
                  </TableCell>
                  <TableCell>iOS</TableCell>
                  <TableCell className="text-right">856</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">设备003</TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-500">忙碌</Badge>
                  </TableCell>
                  <TableCell>Android</TableCell>
                  <TableCell className="text-right">567</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ComponentSection>
        </TabsContent>

        {/* 反馈组件 */}
        <TabsContent value="feedback" className="space-y-6">
          <ComponentSection title="对话框" description="模态对话框组件">
            <Dialog>
              <DialogTrigger asChild>
                <Button>打开对话框</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认操作</DialogTitle>
                  <DialogDescription>此操作将永久删除选中的数据，是否继续？</DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">取消</Button>
                  <Button variant="destructive">确认删除</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ComponentSection>

          <ComponentSection title="弹出框" description="悬浮弹出内容">
            <div className="flex gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    选择日期
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停提示</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>这是一个工具提示</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </ComponentSection>
        </TabsContent>

        {/* 导航组件 */}
        <TabsContent value="navigation" className="space-y-6">
          <ComponentSection title="手风琴" description="可折叠内容面板">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>设备管理</AccordionTrigger>
                <AccordionContent>管理所有连接的设备，包括添加、删除、配置等操作。</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>获客计划</AccordionTrigger>
                <AccordionContent>创建和管理各种获客计划，设置目标和策略。</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>数据分析</AccordionTrigger>
                <AccordionContent>查看详细的数据报告和分析结果。</AccordionContent>
              </AccordionItem>
            </Accordion>
          </ComponentSection>

          <ComponentSection title="滚动区域" description="自定义滚动条的内容区域">
            <ScrollArea className="h-72 w-full rounded-md border p-4">
              <div className="space-y-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded">
                    <h4 className="font-medium">项目 {i + 1}</h4>
                    <p className="text-sm text-gray-600">这是项目 {i + 1} 的描述内容。</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </ComponentSection>
        </TabsContent>

        {/* 自定义组件 */}
        <TabsContent value="custom" className="space-y-6">
          <ComponentSection title="文件上传器" description="支持拖拽的文件上传组件">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">拖拽文件到此处或点击上传</p>
              <Button className="mt-4">选择文件</Button>
            </div>
          </ComponentSection>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 组件展示区域
function ComponentSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCode(!showCode)}>
              <Code className="h-4 w-4 mr-2" />
              {showCode ? "隐藏代码" : "查看代码"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-6 border rounded-lg bg-gray-50">{children}</div>
          {showCode && (
            <div className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
              <pre>{`// 示例代码将在这里显示\n// 具体实现请参考组件源码`}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 统计卡片演示组件
function StatCardDemo({
  title,
  value,
  icon,
  trend,
}: {
  title: string
  value: string
  icon: React.ReactNode
  trend: { value: number; isPositive: boolean }
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? "+" : "-"}
            {trend.value}%
          </span>
          <span className="text-sm text-gray-500 ml-2">较上月</span>
        </div>
      </CardContent>
    </Card>
  )
}
