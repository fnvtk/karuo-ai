"use client"

import { useState, useEffect } from "react"
import { Copy, Link, HelpCircle, Shield, ChevronLeft, Plus, Code, ExternalLink, Zap, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { ScenarioAcquisitionCard } from "@/app/components/acquisition/ScenarioAcquisitionCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { scenarioApi, type ScenarioBase } from "@/lib/api/scenarios"

// 获取渠道中文名称
const getChannelName = (channel: string) => {
  const channelMap: Record<string, string> = {
    douyin: "抖音直播获客",
    kuaishou: "快手直播获客",
    xiaohongshu: "小红书种草获客",
    weibo: "微博话题获客",
    haibao: "海报扫码获客",
    phone: "电话号码获客",
    gongzhonghao: "公众号引流获客",
    weixinqun: "微信群裂变获客",
    payment: "付款码获客",
    api: "API接口获客",
  }
  return channelMap[channel] || `${channel}获客`
}

interface Task {
  id: string
  name: string
  status: "running" | "paused" | "completed"
  stats: {
    devices: number
    acquired: number
    added: number
  }
  lastUpdated: string
  executionTime: string
  nextExecutionTime: string
  trend: { date: string; customers: number }[]
}

// API文档提示组件
function ApiDocumentationTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            计划接口允许您通过API将外部系统的客户数据直接导入到存客宝。支持多种编程语言和第三方平台集成。
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function ChannelPage({ params }: { params: { channel: string } }) {
  const router = useRouter()
  const channel = params.channel
  const channelName = getChannelName(params.channel)

  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载场景数据
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true)
      try {
        // 调用真实API获取场景列表
        const response = await scenarioApi.query({
          type: channel as any,
          page: 1,
          pageSize: 20,
        })

        if (response.code === 0 && response.data) {
          // 将API数据转换为Task格式
          const adaptedTasks: Task[] = response.data.items.map((item: ScenarioBase) => ({
            id: item.id,
            name: item.name,
            status: item.status as "running" | "paused" | "completed",
            stats: {
              devices: Math.floor(Math.random() * 10) + 3, // 模拟数据，实际应从统计接口获取
              acquired: Math.floor(Math.random() * 500) + 100,
              added: Math.floor(Math.random() * 300) + 50,
            },
            lastUpdated: new Date(item.updatedAt).toLocaleString("zh-CN"),
            executionTime: new Date(item.updatedAt).toLocaleString("zh-CN"),
            nextExecutionTime: item.status === "running" ? "2024-02-09 17:25:36" : "暂停中",
            trend: Array.from({ length: 7 }, (_, i) => ({
              date: `2024-02-${String(i + 1).padStart(2, "0")}`,
              customers: Math.floor(Math.random() * 100) + 50,
            })),
          }))

          setTasks(adaptedTasks)
        } else {
          throw new Error(response.message || "获取场景列表失败")
        }
      } catch (error) {
        console.error("加载场景数据失败:", error)
        toast({
          title: "加载失败",
          description: error instanceof Error ? error.message : "获取场景列表失败",
          variant: "destructive",
        })

        // 使用模拟数据作为降级方案
        const mockTasks: Task[] = [
          {
            id: "1",
            name: `${channelName}计划A`,
            status: "running",
            stats: {
              devices: Math.floor(Math.random() * 10) + 3,
              acquired: Math.floor(Math.random() * 500) + 100,
              added: Math.floor(Math.random() * 300) + 50,
            },
            lastUpdated: "2024-02-09 15:30",
            executionTime: "2024-02-09 17:24:10",
            nextExecutionTime: "2024-02-09 17:25:36",
            trend: Array.from({ length: 7 }, (_, i) => ({
              date: `2024-02-${String(i + 1).padStart(2, "0")}`,
              customers: Math.floor(Math.random() * 100) + 50,
            })),
          },
        ]
        setTasks(mockTasks)
      } finally {
        setIsLoading(false)
      }
    }

    loadTasks()
  }, [channel, channelName])

  const [showApiDialog, setShowApiDialog] = useState(false)
  const [currentApiSettings, setCurrentApiSettings] = useState({
    apiKey: "",
    webhookUrl: "",
    taskId: "",
  })

  const handleEditPlan = (taskId: string) => {
    router.push(`/scenarios/${channel}/edit/${taskId}`)
  }

  const handleCopyPlan = async (taskId: string) => {
    const taskToCopy = tasks.find((task) => task.id === taskId)
    if (taskToCopy) {
      try {
        const response = await scenarioApi.copy(taskId, `${taskToCopy.name} (副本)`)
        if (response.code === 0) {
          // 重新加载数据
          const refreshResponse = await scenarioApi.query({
            type: channel as any,
            page: 1,
            pageSize: 20,
          })

          if (refreshResponse.code === 0 && refreshResponse.data) {
            const adaptedTasks: Task[] = refreshResponse.data.items.map((item: ScenarioBase) => ({
              id: item.id,
              name: item.name,
              status: item.status as "running" | "paused" | "completed",
              stats: {
                devices: Math.floor(Math.random() * 10) + 3,
                acquired: Math.floor(Math.random() * 500) + 100,
                added: Math.floor(Math.random() * 300) + 50,
              },
              lastUpdated: new Date(item.updatedAt).toLocaleString("zh-CN"),
              executionTime: new Date(item.updatedAt).toLocaleString("zh-CN"),
              nextExecutionTime: item.status === "running" ? "2024-02-09 17:25:36" : "暂停中",
              trend: Array.from({ length: 7 }, (_, i) => ({
                date: `2024-02-${String(i + 1).padStart(2, "0")}`,
                customers: Math.floor(Math.random() * 100) + 50,
              })),
            }))
            setTasks(adaptedTasks)
          }

          toast({
            title: "计划已复制",
            description: `已成功复制"${taskToCopy.name}"`,
          })
        } else {
          throw new Error(response.message || "复制失败")
        }
      } catch (error) {
        console.error("复制计划失败:", error)
        toast({
          title: "复制失败",
          description: error instanceof Error ? error.message : "复制计划失败",
          variant: "destructive",
        })
      }
    }
  }

  const handleDeletePlan = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId)
    if (taskToDelete) {
      try {
        const response = await scenarioApi.delete(taskId)
        if (response.code === 0) {
          setTasks(tasks.filter((t) => t.id !== taskId))
          toast({
            title: "计划已删除",
            description: `已成功删除"${taskToDelete.name}"`,
          })
        } else {
          throw new Error(response.message || "删除失败")
        }
      } catch (error) {
        console.error("删除计划失败:", error)
        toast({
          title: "删除失败",
          description: error instanceof Error ? error.message : "删除计划失败",
          variant: "destructive",
        })
      }
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: "running" | "paused") => {
    try {
      const response = newStatus === "running" ? await scenarioApi.start(taskId) : await scenarioApi.pause(taskId)

      if (response.code === 0) {
        setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))
        toast({
          title: newStatus === "running" ? "计划已启动" : "计划已暂停",
          description: `已${newStatus === "running" ? "启动" : "暂停"}获客计划`,
        })
      } else {
        throw new Error(response.message || "操作失败")
      }
    } catch (error) {
      console.error("状态变更失败:", error)
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "状态变更失败",
        variant: "destructive",
      })
    }
  }

  const handleOpenApiSettings = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      try {
        const response = await scenarioApi.getApiConfig(taskId)
        if (response.code === 0) {
          setCurrentApiSettings({
            apiKey: response.data.apiKey,
            webhookUrl: response.data.webhookUrl,
            taskId,
          })
        } else {
          // 使用默认配置
          setCurrentApiSettings({
            apiKey: `api_${taskId}_${Math.random().toString(36).substring(2, 10)}`,
            webhookUrl: `${window.location.origin}/api/scenarios/${channel}/${taskId}/webhook`,
            taskId,
          })
        }
        setShowApiDialog(true)
      } catch (error) {
        console.error("获取API配置失败:", error)
        // 使用默认配置
        setCurrentApiSettings({
          apiKey: `api_${taskId}_${Math.random().toString(36).substring(2, 10)}`,
          webhookUrl: `${window.location.origin}/api/scenarios/${channel}/${taskId}/webhook`,
          taskId,
        })
        setShowApiDialog(true)
      }
    }
  }

  const handleCopyApiUrl = (url: string, withParams = false) => {
    let copyUrl = url
    if (withParams) {
      copyUrl = `${url}?name=张三&phone=13800138000&source=外部系统&remark=测试数据`
    }
    navigator.clipboard.writeText(copyUrl)
    toast({
      title: "已复制到剪贴板",
      description: withParams ? "接口地址（含示例参数）" : "接口地址",
    })
  }

  const handleCreateNewPlan = () => {
    router.push(`/scenarios/new?type=${channel}`)
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/scenarios")} className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">{channelName}</h1>
          </div>
          <Button onClick={handleCreateNewPlan} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1" />
            新建计划
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">正在加载计划...</p>
            </div>
          ) : tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id}>
                <ScenarioAcquisitionCard
                  task={task}
                  channel={channel}
                  onEdit={() => handleEditPlan(task.id)}
                  onCopy={handleCopyPlan}
                  onDelete={handleDeletePlan}
                  onStatusChange={handleStatusChange}
                  onOpenSettings={handleOpenApiSettings}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="text-gray-400 mb-6 text-lg">暂无获客计划</div>
              <Button onClick={handleCreateNewPlan} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                <Plus className="h-5 w-5 mr-2" />
                新建{channelName}计划
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* API接口设置对话框 */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Code className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">计划接口配置</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  通过API接口直接导入客资到该获客计划，支持多种编程语言和第三方平台集成
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                接口配置
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                快速测试
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                开发文档
              </TabsTrigger>
              <TabsTrigger value="examples" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                代码示例
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6 mt-6">
              {/* API密钥配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    API密钥
                    <Badge variant="outline" className="ml-auto">
                      安全认证
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <Input
                        value={currentApiSettings.apiKey}
                        readOnly
                        className="font-mono text-sm bg-gray-50 border-2"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(currentApiSettings.apiKey)
                        toast({
                          title: "已复制",
                          description: "API密钥已复制到剪贴板",
                        })
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">安全提示</p>
                        <p>请妥善保管API密钥，不要在客户端代码中暴露。建议在服务器端使用该密钥。</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 接口地址配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-blue-600" />
                    接口地址
                    <Badge variant="outline" className="ml-auto">
                      POST请求
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <Input
                        value={currentApiSettings.webhookUrl}
                        readOnly
                        className="font-mono text-sm bg-gray-50 border-2"
                      />
                    </div>
                    <Button variant="outline" onClick={() => handleCopyApiUrl(currentApiSettings.webhookUrl)}>
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">必要参数</h4>
                      <div className="space-y-1 text-sm text-green-700">
                        <div>
                          <code className="bg-green-100 px-1 rounded">name</code> - 客户姓名
                        </div>
                        <div>
                          <code className="bg-green-100 px-1 rounded">phone</code> - 手机号码
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">可选参数</h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div>
                          <code className="bg-blue-100 px-1 rounded">source</code> - 来源标识
                        </div>
                        <div>
                          <code className="bg-blue-100 px-1 rounded">remark</code> - 备注信息
                        </div>
                        <div>
                          <code className="bg-blue-100 px-1 rounded">tags</code> - 客户标签
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    接口测试
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-3">快速测试URL</h4>
                    <div className="bg-white border rounded-lg p-3 font-mono text-sm overflow-x-auto">
                      {`${currentApiSettings.webhookUrl}?name=测试客户&phone=13800138000&source=API测试`}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyApiUrl(currentApiSettings.webhookUrl, true)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        复制测试URL
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.open(
                            `${currentApiSettings.webhookUrl}?name=测试客户&phone=13800138000&source=API测试`,
                            "_blank",
                          )
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        在浏览器中测试
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    开发文档
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent"
                      onClick={() => {
                        window.open(`/api/docs/scenarios/${channel}/${currentApiSettings.taskId}`, "_blank")
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">完整API文档</span>
                      </div>
                      <span className="text-sm text-gray-600">详细的接口说明和参数文档</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent"
                      onClick={() => {
                        window.open(`/api/docs/scenarios/${channel}/${currentApiSettings.taskId}#integration`, "_blank")
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Link className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">集成指南</span>
                      </div>
                      <span className="text-sm text-gray-600">第三方平台集成教程</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-green-600" />
                    代码示例
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["JavaScript", "Python", "PHP", "Java"].map((lang) => (
                      <Button
                        key={lang}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(
                            `/api/docs/scenarios/${channel}/${currentApiSettings.taskId}#${lang.toLowerCase()}`,
                            "_blank",
                          )
                        }}
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">JavaScript 示例预览：</p>
                    <pre className="text-xs bg-white border rounded p-3 overflow-x-auto">
                      {`fetch('${currentApiSettings.webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${currentApiSettings.apiKey}'
  },
  body: JSON.stringify({
    name: '张三',
    phone: '13800138000',
    source: '官网表单'
  })
})`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              所有数据传输均采用HTTPS加密
            </div>
            <Button onClick={() => setShowApiDialog(false)} size="lg">
              完成配置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
