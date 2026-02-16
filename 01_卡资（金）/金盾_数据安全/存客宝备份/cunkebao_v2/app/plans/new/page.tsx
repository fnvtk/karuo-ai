"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { StepIndicator } from "@/app/components/ui-templates/step-indicator"
import { BasicSettings } from "./steps/BasicSettings"
import { FriendRequestSettings } from "./steps/FriendRequestSettings"
import { MessageSettings } from "./steps/MessageSettings"

// 步骤定义 - 只保留三个步骤
const steps = [
  { id: 1, title: "步骤一", subtitle: "基础设置" },
  { id: 2, title: "步骤二", subtitle: "好友申请设置" },
  { id: 3, title: "步骤三", subtitle: "消息设置" },
]

export default function NewPlan() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    planName: "",
    scenario: "haibao",
    posters: [],
    device: "",
    remarkType: "phone",
    greeting: "你好，请通过",
    addInterval: 1,
    startTime: "09:00",
    endTime: "18:00",
    enabled: true,
    // 移除tags字段
  })

  // 更新表单数据
  const onChange = (data: any) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  // 处理保存
  const handleSave = async () => {
    try {
      // 这里应该是实际的API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "创建成功",
        description: "获客计划已创建",
      })
      router.push("/plans")
    } catch (error) {
      toast({
        title: "创建失败",
        description: "创建计划失败，请重试",
        variant: "destructive",
      })
    }
  }

  // 下一步
  const handleNext = () => {
    if (currentStep === steps.length) {
      handleSave()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  // 上一步
  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicSettings formData={formData} onChange={onChange} onNext={handleNext} />
      case 2:
        return <FriendRequestSettings formData={formData} onChange={onChange} onNext={handleNext} onPrev={handlePrev} />
      case 3:
        return <MessageSettings formData={formData} onChange={onChange} onNext={handleSave} onPrev={handlePrev} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[390px] mx-auto bg-white min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => router.push("/plans")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="ml-2 text-lg font-medium">新建获客计划</h1>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          <div className="px-4 py-6">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>

          <div className="flex-1 px-4 pb-20">{renderStepContent()}</div>
        </div>
      </div>
    </div>
  )
}
