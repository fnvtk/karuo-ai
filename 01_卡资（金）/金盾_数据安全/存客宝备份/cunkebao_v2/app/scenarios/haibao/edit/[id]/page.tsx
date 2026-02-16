"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import BasicSettings from "@/app/scenarios/new/steps/BasicSettings"
import DeviceSelection from "@/app/scenarios/new/steps/DeviceSelection"
import MessageSettings from "@/app/scenarios/new/steps/MessageSettings"
import BottomNav from "@/app/components/BottomNav"

export default function EditScenarioPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "haibao",
    status: "active",
    enableMessage: true,
    message: "",
    delayTime: 0,
    selectedDevices: [],
  })

  useEffect(() => {
    // 模拟从API加载数据
    setTimeout(() => {
      setFormData({
        name: "海报获客方案",
        description: "通过海报二维码引流获客",
        type: "haibao",
        status: "active",
        enableMessage: true,
        message: "您好，感谢关注我们的产品！",
        delayTime: 5,
        selectedDevices: ["dev1", "dev2"],
      })
      setIsLoading(false)
    }, 500)
  }, [params.id])

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    toast({
      title: "保存成功",
      description: "场景配置已更新",
    })
    router.push("/scenarios/haibao")
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white min-h-screen pb-16">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">编辑海报获客方案</h1>
          </div>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="basic">基础设置</TabsTrigger>
            <TabsTrigger value="device">设备选择</TabsTrigger>
            <TabsTrigger value="message">消息设置</TabsTrigger>
          </TabsList>

          <Card className="p-4">
            <TabsContent value="basic">
              <BasicSettings
                formData={formData}
                updateFormData={updateFormData}
                onNext={() => setActiveTab("device")}
                onBack={() => router.back()}
              />
            </TabsContent>

            <TabsContent value="device">
              <DeviceSelection
                formData={formData}
                updateFormData={updateFormData}
                onNext={() => setActiveTab("message")}
                onBack={() => setActiveTab("basic")}
              />
            </TabsContent>

            <TabsContent value="message">
              <MessageSettings
                formData={formData}
                updateFormData={updateFormData}
                onNext={handleSave}
                onBack={() => setActiveTab("device")}
              />
            </TabsContent>
          </Card>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  )
}
