"use client"

import { useState } from "react"
import { Plus, Filter, Search, RefreshCw, MoreVertical, Clock, Copy, Code } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import type { Device } from "@/components/device-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge" // Import Badge component

interface Task {
  id: string
  name: string
  status: "running" | "paused" | "completed"
  stats: {
    devices: number
    customersPerDevice: number
    totalCalls: number
    successCalls: number
    errorCalls: number
    successRate: number
  }
  lastUpdated: string
  executionTime: string
  nextExecutionTime: string
  trend: { date: string; calls: number; success: number }[]
  deviceList: Device[]
  apiInfo: {
    endpoint: string
    method: string
    token: string
  }
}

// 生成随机数据的辅助函数
function generateRandomStats() {
  const devices = Math.floor(Math.random() * 16) + 5
  const customersPerDevice = Math.floor(Math.random() * 11) + 10
  const totalCalls = Math.floor(Math.random() * 1000) + 500
  const successCalls = Math.floor(totalCalls * (Math.random() * 0.3 + 0.6))
  const errorCalls = totalCalls - successCalls

  return {
    devices,
    customersPerDevice,
    totalCalls,
    successCalls,
    errorCalls,
    successRate: Math.round((successCalls / totalCalls) * 100),
  }
}

export default function ApiPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      name: "APP加友接口",
      status: "running",
      stats: generateRandomStats(),
      lastUpdated: "2024-02-09 15:30",
      executionTime: "2024-02-09 17:24:10",
      nextExecutionTime: "2024-02-09 17:25:36",
      trend: Array.from({ length: 7 }, (_, i) => ({
        date: `2024-02-${String(i + 1).padStart(2, "0")}`,
        calls: Math.floor(Math.random() * 100) + 50,
        success: Math.floor(Math.random() * 80) + 40,
      })),
      deviceList: [],
      apiInfo: {
        endpoint: "https://api.ckb.quwanzhi.com/api/open/task/addFriend",
        method: "POST",
        token: "ckb_token_xxxxx",
      },
    },
  ])

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false)
  const router = useRouter()

  const toggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            status: task.status === "running" ? "paused" : "running",
          }
        }
        return task
      }),
    )
  }

  const copyTask = (taskId: string) => {
    const taskToCopy = tasks.find((task) => task.id === taskId)
    if (taskToCopy) {
      const newTask = {
        ...taskToCopy,
        id: `${Date.now()}`,
        name: `${taskToCopy.name} (副本)`,
        stats: generateRandomStats(),
        status: "paused" as const,
        lastUpdated: new Date().toLocaleString(),
      }
      setTasks([...tasks, newTask])
      toast({
        title: "复制成功",
        description: "已创建计划副本",
      })
    }
  }

  const handleTaskClick = (taskId: string) => {
    router.push(`/scenarios/api/${taskId}/edit`)
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId)

  return (
    <div className="flex-1 bg-gradient-to-b from-violet-50 to-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-violet-600">API获客</h1>
          <div className="flex items-center space-x-2">
            <Link href="/scenarios/new">
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                新建计划
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input className="pl-9" placeholder="搜索计划名称" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-lg">{task.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 py-1 text-xs rounded-full ${
                      task.status === "running"
                        ? "bg-green-50 text-green-600"
                        : task.status === "paused"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-gray-50 text-gray-600"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTaskStatus(task.id)
                    }}
                  >
                    {task.status === "running" ? "进行中" : task.status === "paused" ? "已暂停" : "已完成"}
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsApiDocsOpen(true)
                    }}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    查看文档
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/scenarios/api/${task.id}/edit`)}>
                        编辑计划
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyTask(task.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        复制计划
                      </DropdownMenuItem>
                      <DropdownMenuItem>查看详情</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">删除计划</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-sm text-gray-500">总调用次数</div>
                  <div className="text-lg font-semibold text-violet-600">{task.stats.totalCalls}</div>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-sm text-gray-500">成功调用</div>
                  <div className="text-lg font-semibold text-violet-600">{task.stats.successCalls}</div>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-sm text-gray-500">失败调用</div>
                  <div className="text-lg font-semibold text-violet-600">{task.stats.errorCalls}</div>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                  <div className="text-sm text-gray-500">成功率</div>
                  <div className="text-lg font-semibold text-violet-600">{task.stats.successRate}%</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={task.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="calls" name="调用次数" stroke="#8b5cf6" strokeWidth={2} />
                      <Line type="monotone" dataKey="success" name="成功次数" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-4">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>上次执行: {task.executionTime}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>下次执行: {task.nextExecutionTime}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>API 文档</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">概述</TabsTrigger>
              <TabsTrigger value="endpoints">接口列表</TabsTrigger>
              <TabsTrigger value="examples">示例代码</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">概述</h3>
                <p className="text-sm text-gray-600">本接口文档依照REST标准，请求头需要添加token作为鉴权。</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium">基础域名</p>
                  <code className="text-sm text-violet-600">https://api.ckb.quwanzhi.com</code>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="endpoints" className="p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">手机微信号加友接口</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">POST</Badge> {/* Badge component used here */}
                      <code className="text-sm">/api/open/task/addFriend</code>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">请求参数</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th>名称</th>
                            <th>类型</th>
                            <th>是否必填</th>
                            <th>说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>phone</td>
                            <td>string</td>
                            <td>是</td>
                            <td>手机或微信号</td>
                          </tr>
                          <tr>
                            <td>tags</td>
                            <td>string</td>
                            <td>否</td>
                            <td>标签</td>
                          </tr>
                          <tr>
                            <td>taskId</td>
                            <td>int</td>
                            <td>是</td>
                            <td>计划任务ID</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="examples" className="p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">请求示例</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                  <pre className="text-sm">
                    {JSON.stringify(
                      {
                        phone: "18956545898",
                        taskId: 593,
                        tags: "90后,女生,美女",
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
                <h3 className="text-lg font-medium">返回示例</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                  <pre className="text-sm">
                    {JSON.stringify(
                      {
                        code: 10000,
                        data: null,
                        message: "操作成功",
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
