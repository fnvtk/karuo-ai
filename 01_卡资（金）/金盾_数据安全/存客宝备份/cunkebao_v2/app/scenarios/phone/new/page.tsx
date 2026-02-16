"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, Phone, Users, Filter, TrendingUp, Gift, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { PhoneImportDialog } from "./components/PhoneImportDialog"
import { DeviceConfigDialog } from "./components/DeviceConfigDialog"
import { AIFilterSettings } from "./components/AIFilterSettings"
import { DistributionSettings } from "./components/DistributionSettings"
import { RedPacketSettings } from "./components/RedPacketSettings"
import { FollowUpSettings } from "./components/FollowUpSettings"

export default function NewPhoneAcquisitionPlan() {
  const router = useRouter()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeviceDialog, setShowDeviceDialog] = useState(false)
  const [planData, setPlanData] = useState({
    name: "",
    description: "",
    phoneNumbers: [] as string[],
    devices: [] as string[],
    autoAddWechat: true,
    aiFilter: {
      enabled: true,
      removeBlacklist: true,
      validateFormat: true,
      removeDuplicates: true,
    },
    distribution: {
      enabled: false,
      rules: [],
    },
    redPacket: {
      enabled: false,
      amount: 0,
      pool: 0,
    },
    followUp: {
      autoWelcome: true,
      welcomeMessage: "您好，很高兴认识您！",
      autoTag: true,
      tags: ["电话获客"],
    },
  })

  const handleSave = async () => {
    try {
      // 验证必填项
      if (!planData.name) {
        toast({
          title: "请输入计划名称",
          variant: "destructive",
        })
        return
      }

      if (planData.phoneNumbers.length === 0) {
        toast({
          title: "请导入电话号码",
          variant: "destructive",
        })
        return
      }

      if (planData.devices.length === 0) {
        toast({
          title: "请选择执行设备",
          variant: "destructive",
        })
        return
      }

      // 调用API保存计划
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "创建成功",
        description: "电话获客计划已创建",
      })
      router.push("/scenarios/phone")
    } catch (error) {
      toast({
        title: "创建失败",
        description: "创建计划失败，请重试",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[390px] mx-auto bg-white min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => router.push("/scenarios/phone")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="ml-2 text-lg font-medium">新建电话获客计划</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            {/* 基础信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">基础信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">计划名称</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="请输入计划名称"
                    value={planData.name}
                    onChange={(e) => setPlanData({ ...planData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">计划描述</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="请输入计划描述（选填）"
                    value={planData.description}
                    onChange={(e) => setPlanData({ ...planData, description: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 电话导入 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    电话线索导入
                  </span>
                  <Button size="sm" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4 mr-1" />
                    导入
                  </Button>
                </CardTitle>
                <CardDescription>已导入 {planData.phoneNumbers.length} 个电话号码</CardDescription>
              </CardHeader>
            </Card>

            {/* 设备配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    执行设备
                  </span>
                  <Button size="sm" onClick={() => setShowDeviceDialog(true)}>
                    选择设备
                  </Button>
                </CardTitle>
                <CardDescription>已选择 {planData.devices.length} 个设备</CardDescription>
              </CardHeader>
            </Card>

            {/* 功能配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">功能配置</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="filter" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="filter">
                      <Filter className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="distribution">
                      <TrendingUp className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="redpacket">
                      <Gift className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="followup">
                      <MessageSquare className="h-3 w-3" />
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="filter" className="mt-4">
                    <AIFilterSettings
                      settings={planData.aiFilter}
                      onChange={(settings) => setPlanData({ ...planData, aiFilter: settings })}
                    />
                  </TabsContent>
                  <TabsContent value="distribution" className="mt-4">
                    <DistributionSettings
                      settings={planData.distribution}
                      onChange={(settings) => setPlanData({ ...planData, distribution: settings })}
                    />
                  </TabsContent>
                  <TabsContent value="redpacket" className="mt-4">
                    <RedPacketSettings
                      settings={planData.redPacket}
                      onChange={(settings) => setPlanData({ ...planData, redPacket: settings })}
                    />
                  </TabsContent>
                  <TabsContent value="followup" className="mt-4">
                    <FollowUpSettings
                      settings={planData.followUp}
                      onChange={(settings) => setPlanData({ ...planData, followUp: settings })}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-[390px] mx-auto">
            <Button className="w-full" onClick={handleSave}>
              创建计划
            </Button>
          </div>
        </div>

        {/* 导入对话框 */}
        <PhoneImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={(numbers) => {
            setPlanData({ ...planData, phoneNumbers: [...planData.phoneNumbers, ...numbers] })
            setShowImportDialog(false)
          }}
        />

        {/* 设备选择对话框 */}
        <DeviceConfigDialog
          open={showDeviceDialog}
          onOpenChange={setShowDeviceDialog}
          selectedDevices={planData.devices}
          onSelect={(devices) => {
            setPlanData({ ...planData, devices })
            setShowDeviceDialog(false)
          }}
        />
      </div>
    </div>
  )
}
