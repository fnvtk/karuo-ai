"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { StepIndicator } from "../components/step-indicator"
import { BasicSettings } from "../components/basic-settings"
import { DeviceSelectionDialog } from "../components/device-selection-dialog"
import { TagSelector } from "../components/tag-selector"

export default function NewAutoLikePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    taskName: "",
    likeInterval: 5, // 默认5秒
    maxLikesPerDay: 200, // 默认200次
    timeRange: { start: "08:00", end: "22:00" },
    contentTypes: ["text", "image", "video"],
    enabled: true,
    selectedDevices: [] as string[],
    selectedTags: [] as string[],
    tagOperator: "and" as "and" | "or",
  })

  const handleUpdateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3))
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleComplete = async () => {
    console.log("Form submitted:", formData)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({
      title: "创建成功",
      description: "自动点赞任务已创建并开始执行",
    })
    router.push("/workspace/auto-like")
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <header className="sticky top-0 z-10 bg-white">
        <div className="flex items-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-gray-50">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="ml-2 text-lg font-medium">新建自动点赞</h1>
        </div>
      </header>

      <div className="mt-8">
        <StepIndicator currentStep={currentStep} />

        <div className="mt-8">
          {currentStep === 1 && (
            <BasicSettings formData={formData} onChange={handleUpdateFormData} onNext={handleNext} />
          )}

          {currentStep === 2 && (
            <div className="space-y-6 px-6">
              <div className="relative">
                <Search className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="选择设备"
                  className="h-12 pl-11 rounded-xl border-gray-200 text-base"
                  onClick={() => setDeviceDialogOpen(true)}
                  readOnly
                  value={formData.selectedDevices.length > 0 ? `已选择 ${formData.selectedDevices.length} 个设备` : ""}
                />
              </div>

              {formData.selectedDevices.length > 0 && (
                <div className="text-base text-gray-500">已选设备：{formData.selectedDevices.length} 个</div>
              )}

              <div className="flex space-x-4 pt-4">
                <Button variant="outline" onClick={handlePrev} className="flex-1 h-12 rounded-xl text-base">
                  上一步
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl text-base shadow-sm"
                  disabled={formData.selectedDevices.length === 0}
                >
                  下一步
                </Button>
              </div>

              <DeviceSelectionDialog
                open={deviceDialogOpen}
                onOpenChange={setDeviceDialogOpen}
                selectedDevices={formData.selectedDevices}
                onSelect={(devices) => {
                  handleUpdateFormData({ selectedDevices: devices })
                  setDeviceDialogOpen(false)
                }}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="px-6">
              <TagSelector
                selectedTags={formData.selectedTags}
                tagOperator={formData.tagOperator}
                onTagsChange={(tags) => handleUpdateFormData({ selectedTags: tags })}
                onOperatorChange={(operator) => handleUpdateFormData({ tagOperator: operator })}
                onBack={handlePrev}
                onComplete={handleComplete}
              />
            </div>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-6">
        <button className="flex flex-col items-center text-blue-600">
          <span className="text-sm mt-1">首页</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-sm mt-1">场景获客</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-sm mt-1">工作台</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-sm mt-1">我的</span>
        </button>
      </nav>
    </div>
  )
}
