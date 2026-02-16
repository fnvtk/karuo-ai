"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DeviceSelector } from "@/app/components/common/DeviceSelector"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default function ScenarioDevicesPage({ params }: { params: { channel: string } }) {
  const router = useRouter()
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])

  // 获取渠道中文名称
  const getChannelName = (channel: string) => {
    const channelMap: Record<string, string> = {
      douyin: "抖音",
      kuaishou: "快手",
      xiaohongshu: "小红书",
      weibo: "微博",
      haibao: "海报",
      phone: "电话",
      order: "订单",
      weixinqun: "微信群",
      gongzhonghao: "公众号",
      payment: "付款码",
      api: "API",
    }
    return channelMap[channel] || channel
  }

  const channelName = getChannelName(params.channel)

  const handleSave = async () => {
    try {
      // 这里应该是实际的API调用来保存选中的设备
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.back()
    } catch (error) {
      console.error("保存失败:", error)
    }
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">{channelName}设备选择</h1>
          </div>
        </div>
      </header>

      <div className="p-4">
        <DeviceSelector
          title={`${channelName}设备选择`}
          selectedDevices={selectedDevices}
          onDevicesChange={setSelectedDevices}
          multiple={true}
          maxSelection={5}
          className="mb-4"
        />

        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={selectedDevices.length === 0}>
            保存 ({selectedDevices.length})
          </Button>
        </div>
      </div>
    </div>
  )
}
