"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "../components/step-indicator"
import { TrafficPoolSelection } from "../components/traffic-pool-selection"
import { StrategySelection } from "../components/strategy-selection"
import { ExecutionSetup } from "../components/execution-setup"
import { ConfirmStrategy } from "../components/confirm-strategy"

export default function NewStrategyPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    deviceIds: [] as string[],
    deviceNames: [] as string[],
    trafficPoolIds: [] as string[],
    trafficPoolNames: [] as string[],
    trafficPoolSize: 0,
    strategyType: "",
    strategyName: "",
    strategyConfig: {} as Record<string, any>,
    executionConfig: {
      scheduleType: "immediate", // "immediate", "scheduled"
      scheduledTime: "",
      notifyOnComplete: true,
      importTags: true,
      sendToWechat: false,
      wechatId: "",
    },
  })

  const handleNext = () => {
    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (currentStep === 1) {
      router.back()
    } else {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    // 模拟提交
    console.log("提交策略优化:", formData)

    // 模拟加载
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 跳转到列表页
    router.push("/workspace/ai-strategy")
  }

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">新建优化策略</h1>
      </div>

      {/* 步骤指示器 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto py-4 px-4">
          <StepIndicator
            currentStep={currentStep}
            steps={[
              { number: 1, title: "选择流量池" },
              { number: 2, title: "选择优化策略" },
              { number: 3, title: "执行设置" },
              { number: 4, title: "确认策略" },
            ]}
          />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            {currentStep === 1 && (
              <TrafficPoolSelection formData={formData} updateFormData={updateFormData} onNext={handleNext} />
            )}

            {currentStep === 2 && (
              <StrategySelection
                formData={formData}
                updateFormData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <ExecutionSetup
                formData={formData}
                updateFormData={updateFormData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <ConfirmStrategy
                formData={formData}
                updateFormData={updateFormData}
                onSubmit={handleSubmit}
                onBack={handleBack}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
