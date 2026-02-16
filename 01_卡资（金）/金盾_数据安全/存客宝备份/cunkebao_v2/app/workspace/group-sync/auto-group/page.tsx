"use client"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AutoGroupCreator } from "../components/auto-group-creator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AutoGroupPage() {
  const router = useRouter()

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium ml-3">自动建群</h1>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <Tabs defaultValue="create">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="create">创建群聊</TabsTrigger>
            <TabsTrigger value="history">历史记录</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="grid md:grid-cols-2 gap-6">
              <AutoGroupCreator />

              <Card>
                <CardHeader>
                  <CardTitle>建群说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p>自动建群功能可以帮助您快速创建微信群聊，并自动邀请符合条件的好友加入。</p>
                    <p>使用步骤：</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>设置群聊名称和欢迎语</li>
                      <li>设置群人数上限和群类型</li>
                      <li>添加群标签，用于筛选邀请的好友</li>
                      <li>点击创建群聊按钮完成创建</li>
                    </ol>
                    <p className="mt-4 text-amber-600">
                      注意：建群需要至少一个在线的微信设备，请确保您的设备已连接并正常运行。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12 text-gray-500">��无建群记录</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
