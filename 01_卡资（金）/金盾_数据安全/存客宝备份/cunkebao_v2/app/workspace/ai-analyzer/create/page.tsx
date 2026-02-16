"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BasicSettings } from "./components/basic-settings"
import { TargetSelection } from "./components/target-selection"
import { Card, CardContent } from "@/components/ui/card"
import { Steps, Step } from "@/components/ui/steps"
import { useToast } from "@/components/ui/use-toast"

export default function CreateAnalyzerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)

  const [formData, setFormData] = useState({
    taskName: "",
    analysisTypes: [] as string[],
    targetType: "device",
    selectedDevices: [] as string[],
    selectedTrafficPool: "",
    tags: [] as string[],
    regions: [] as string[],
    keywords: [] as string[],
  })

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleNext = () => {
    setCurrentStep(1)
  }

  const handleBack = () => {
    setCurrentStep(0)
  }

  const handleSubmit = async () => {
    // 模拟提交
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
        variant: "success",
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

  const steps = [
    { id: "basic", title: "基础设置" },
    { id: "target", title: "选择分析对象" },
  ]

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-8">
        <Steps currentStep={currentStep} className="mb-8">
          {steps.map((step, index) => (
            <Step key={step.id} title={step.title} />
          ))}
        </Steps>
      </div>

      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && (
            <BasicSettings formData={formData} updateFormData={updateFormData} onNext={handleNext} />
          )}

          {currentStep === 1 && (
            <TargetSelection
              formData={formData}
              updateFormData={updateFormData}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
