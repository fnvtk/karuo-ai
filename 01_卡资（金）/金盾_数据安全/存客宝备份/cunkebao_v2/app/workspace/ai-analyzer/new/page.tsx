"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "../components/step-indicator"
import { BasicSettings } from "./components/basic-settings"
import { TargetSelection } from "./components/target-selection"
import { useToast } from "@/components/ui/use-toast"

export default function CreateAnalysisPlanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    taskName: "",
    analysisTypes: [] as string[],
    targetType: "device", // "device" or "trafficPool"
    selectedDevices: [] as string[],
    selectedTrafficPool: "",
    tags: [] as string[],
    regions: [] as string[],
    keywords: [] as string[],
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
    try {
      // 显示加载状态
      toast({
        title: "正在创建分析计划...",
        description: "请稍候",
      })

      // 模拟API请求延迟
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 成功提示
      toast({
        title: "分析计划创建成功",
        description: "您可以在列表中查看分析进度",
      })

      // 跳转回列表页
      router.push("/workspace/ai-analyzer")
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    }
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
        <h1 className="text-xl font-semibold">新建分析计划</h1>
      </div>

      {/* 步骤指示器 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto py-4 px-4">
          <StepIndicator
            currentStep={currentStep}
            steps={[
              { number: 1, title: "基础设置" },
              { number: 2, title: "选择分析对象" },
            ]}
          />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            {currentStep === 1 && (
              <BasicSettings formData={formData} updateFormData={updateFormData} onNext={handleNext} />
            )}

            {currentStep === 2 && (
              <TargetSelection
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
