"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Users, Database, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import StepIndicator from "./components/step-indicator"
import BasicInfoStep from "./components/basic-info-step"
import TargetSettingsStep from "./components/target-settings-step"
import TrafficPoolStep from "./components/traffic-pool-step"

export default function NewTrafficDistribution() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    basicInfo: {},
    targetSettings: {},
    trafficPool: {},
  })

  const steps = [
    { id: 1, title: "基本信息", icon: <Plus className="h-6 w-6" /> },
    { id: 2, title: "目标设置", icon: <Users className="h-6 w-6" /> },
    { id: 3, title: "流量池选择", icon: <Database className="h-6 w-6" /> },
  ]

  const handleBasicInfoNext = (data: any) => {
    setFormData((prev) => ({ ...prev, basicInfo: data }))
    setCurrentStep(1)
  }

  const handleTargetSettingsNext = (data: any) => {
    setFormData((prev) => ({ ...prev, targetSettings: data }))
    setCurrentStep(2)
  }

  const handleTargetSettingsBack = () => {
    setCurrentStep(0)
  }

  const handleTrafficPoolBack = () => {
    setCurrentStep(1)
  }

  const handleSubmit = async (data: any) => {
    const finalData = {
      ...formData,
      trafficPool: data,
    }

    try {
      // 这里可以添加实际的API调用
      console.log("提交的数据:", finalData)

      toast({
        title: "创建成功",
        description: "流量分发规则已成功创建",
      })

      // 跳转到列表页
      router.push("/workspace/traffic-distribution")
    } catch (error) {
      console.error("提交失败:", error)
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container max-w-md mx-auto pb-20">
      <div className="sticky top-0 bg-white z-10 pb-2">
        <div className="flex items-center py-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">新建流量分发</h1>
          <Button variant="ghost" size="icon" className="ml-auto">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <StepIndicator currentStep={currentStep} steps={steps} />
      </div>

      <div className="mt-4">
        {currentStep === 0 && <BasicInfoStep onNext={handleBasicInfoNext} initialData={formData.basicInfo} />}

        {currentStep === 1 && (
          <TargetSettingsStep
            onNext={handleTargetSettingsNext}
            onBack={handleTargetSettingsBack}
            initialData={formData.targetSettings}
          />
        )}

        {currentStep === 2 && (
          <TrafficPoolStep onSubmit={handleSubmit} onBack={handleTrafficPoolBack} initialData={formData.trafficPool} />
        )}
      </div>
    </div>
  )
}
