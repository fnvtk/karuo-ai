"use client"

import { useState } from "react"
import { ChevronLeft, Copy, FileText, Play, Info, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 获取渠道中文名称
const getChannelName = (channel: string) => {
  const channelMap: Record<string, string> = {
    douyin: "抖音",
    kuaishou: "快手",
    xiaohongshu: "小红书",
    weibo: "微博",
    haibao: "海报",
    phone: "电话",
  }
  return channelMap[channel] || channel
}

export default function ApiManagementPage({ params }: { params: { channel: string } }) {
  const router = useRouter()
  const channel = params.channel
  const channelName = getChannelName(channel)

  // 示例数据
  const apiKey = `api_1_b9805j8q`
  const apiUrl = `https://kzmoqjnwgjc9q2xbj4np.lite.vusercontent.net/api/scenarios/${channel}/1/webhook`
  const testUrl = `${apiUrl}?name=测试客户&phone=13800138000`

  // 对话框状态
  const [showDocDialog, setShowDocDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)

  return (
    <div className="flex-1 bg-white min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium ml-2">{channelName}获客接口</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-5">
        {/* 接口位置提示 */}
        <div className="bg-blue-50 rounded-lg p-3 flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="ml-2">
            <p className="text-sm text-blue-700">
              <span className="font-medium">接口位置：</span>场景获客 → {channelName}获客 → 选择计划 → 右上角菜单 →
              计划接口
            </p>
          </div>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="api">接口信息</TabsTrigger>
            <TabsTrigger value="params">参数说明</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            {/* API密钥部分 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <h2 className="text-base font-medium">API密钥</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                          <Info className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">用于接口身份验证</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowDocDialog(true)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>查看接口文档</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowTestDialog(true)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>快速测试</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-3">
                  <div className="relative w-full">
                    <Input value={apiKey} readOnly className="font-mono text-sm pr-10 border-gray-200" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey)
                        toast({
                          title: "已复制",
                          description: "API密钥已复制到剪贴板",
                        })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 接口地址部分 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <h2 className="text-base font-medium">接口地址</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                          <Link className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">发送POST请求到此地址</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    navigator.clipboard.writeText(apiUrl)
                    toast({
                      title: "已复制",
                      description: "接口地址已复制到剪贴板",
                    })
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>

              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-3">
                  <div className="w-full">
                    <div className="font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 break-all">
                      {apiUrl}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="params" className="space-y-4">
            {/* 必要参数部分 */}
            <div className="space-y-2">
              <h2 className="text-base font-medium flex items-center">
                必要参数
                <span className="text-xs text-red-500 ml-1">*</span>
              </h2>
              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-600">name</span>
                        <span className="text-sm text-gray-500 ml-2">(姓名)</span>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">字符串</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-600">phone</span>
                        <span className="text-sm text-gray-500 ml-2">(电话)</span>
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">字符串</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 可选参数部分 */}
            <div className="space-y-2">
              <h2 className="text-base font-medium">可选参数</h2>
              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-600">source</span>
                        <span className="text-sm text-gray-500 ml-2">(来源)</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">字符串</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-600">remark</span>
                        <span className="text-sm text-gray-500 ml-2">(备注)</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">字符串</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-600">tags</span>
                        <span className="text-sm text-gray-500 ml-2">(标签)</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">数组</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 示例代码部分 */}
            <div className="space-y-2">
              <h2 className="text-base font-medium">请求示例</h2>
              <Card className="overflow-hidden border-gray-200">
                <CardContent className="p-3">
                  <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
                    {`POST ${apiUrl}
Content-Type: application/json
Authorization: Bearer ${apiKey}

{
  "name": "张三",
  "phone": "13800138000",
  "source": "官网",
  "remark": "有意向",
  "tags": ["高意向", "新客户"]
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 接口文档对话框 */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>接口文档</DialogTitle>
            <DialogDescription>查看详细的接口文档与集成指南</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">接口说明</h3>
              <p className="text-sm text-gray-600">
                本接口用于向{channelName}获客计划添加新的客户信息。通过HTTP POST请求发送客户数据。
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">请求格式</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                POST {apiUrl}
                <br />
                Content-Type: application/json
                <br />
                Authorization: Bearer {apiKey}
                <br />
                <br />
                {`{
  "name": "客户姓名",
  "phone": "13800138000",
  "source": "广告投放",
  "remark": "有意向购买",
  "tags": ["高意向", "新客户"]
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">响应格式</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {`{
  "success": true,
  "message": "客户添加成功",
  "data": {
    "id": "cust_123456",
    "name": "客户姓名",
    "phone": "13800138000",
    "created_at": "2024-03-21T09:15:22Z"
  }
}`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDocDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 快速测试对话框 */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>快速测试</DialogTitle>
            <DialogDescription>使用以下URL快速测试接口是否正常工作</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">测试URL</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto whitespace-pre-wrap break-all">
                {testUrl}
              </pre>
              <p className="text-xs text-gray-500 mt-2">将上面的URL复制到浏览器中打开，测试接口是否返回成功响应。</p>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(testUrl)
                toast({
                  title: "已复制",
                  description: "测试URL已复制到剪贴板",
                })
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              复制测试链接
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
