"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { StepIndicator } from "../components/step-indicator"
import { GroupSettings } from "../components/group-settings"
import { DeviceSelection } from "../components/device-selection"
import { TrafficPoolSelection } from "../components/tag-selection"
import { useMobile } from "@/hooks/use-mobile"

export default function NewAutoGroupPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "新建群计划",
    fixedWechatIds: [] as string[],
    groupingOption: "all" as "all" | "fixed",
    fixedGroupCount: 5,
    devices: [] as string[],
    trafficPools: [] as string[],
    welcomeMessage: "欢迎进群",
  })

  const steps = [
    { number: 1, title: "群设置" },
    { number: 2, title: "设备选择" },
    { number: 3, title: "流量池选择" },
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    // 这里应该是提交表单数据到API的逻辑
    console.log("提交表单数据:", formData)

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 提交成功后返回列表页
    router.push("/workspace/auto-group")
  }

  const updateGroupSettings = (values: {
    name: string
    fixedWechatIds: string[]
    groupingOption: "all" | "fixed"
    fixedGroupCount: number
  }) => {
    setFormData((prev) => ({
      ...prev,
      ...values,
    }))
  }

  const updateDevices = useCallback((deviceIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      devices: deviceIds,
    }))
  }, [])

  const updateTrafficPools = useCallback((poolIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      trafficPools: poolIds,
    }))
  }, [])

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium ml-3">新建自动建群</h1>
        </div>
      </header>

      <div className={`p-4 ${isMobile ? "max-w-full" : "max-w-4xl mx-auto"}`}>
        <StepIndicator currentStep={currentStep} steps={steps} />

        <div className="mt-6">
          {currentStep === 1 && (
            <GroupSettings
              onNextStep={handleNext}
              initialValues={{
                name: formData.name,
                fixedWechatIds: formData.fixedWechatIds,
                groupingOption: formData.groupingOption,
                fixedGroupCount: formData.fixedGroupCount,
              }}
              onValuesChange={updateGroupSettings}
            />
          )}

          {currentStep === 2 && (
            <DeviceSelection
              onNext={handleNext}
              onPrevious={handlePrevious}
              initialSelectedDevices={formData.devices}
              onDevicesChange={updateDevices}
            />
          )}

          {currentStep === 3 && (
            <TrafficPoolSelection
              onSubmit={handleSubmit}
              onPrevious={handlePrevious}
              initialSelectedPools={formData.trafficPools}
              onPoolsChange={updateTrafficPools}
              selectedDevices={formData.devices}
            />
          )}
        </div>
      </div>
    </div>
  )
}
