"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { BasicInfoStep } from "./components/basic-info-step"
import { AudienceFilterStep } from "./components/audience-filter-step"
import { PreviewStep } from "./components/preview-step"
import { useToast } from "@/components/ui/use-toast"

// 步骤指示器组件
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: "基本信息" },
    { number: 2, title: "人群筛选" },
    { number: 3, title: "预览" },
  ]

  return (
    <div className="flex items-center justify-center py-6">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* 步骤圆圈 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-colors ${
                currentStep >= step.number ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {step.number}
            </div>
            <div
              className={`mt-2 text-sm font-medium ${currentStep >= step.number ? "text-blue-600" : "text-gray-400"}`}
            >
              {step.title}
            </div>
          </div>

          {/* 连接线 */}
          {index < steps.length - 1 && (
            <div
              className={`w-24 h-0.5 mx-2 mb-6 transition-colors ${
                currentStep > step.number ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function NewTrafficPoolPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    notes: "",
    scheme: "",
    industry: "",
    tags: [] as string[],
    customConditions: [] as any[],
    selectedUsers: [] as string[],
  })

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = () => {
    // 创建流量包逻辑
    const newGroup = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      userCount: formData.selectedUsers.length,
      iconType: "users",
      color: "from-purple-500 to-indigo-500",
      isDefault: false,
      createdAt: new Date().toISOString(),
      avgRfmScore: {
        recency: 0,
        frequency: 0,
        monetary: 0,
        total: 0,
      },
    }

    // 保存到localStorage
    const savedCustomGroups = localStorage.getItem("customTrafficPoolGroups")
    const customGroups = savedCustomGroups ? JSON.parse(savedCustomGroups) : []
    const updatedCustomGroups = [newGroup, ...customGroups]
    localStorage.setItem("customTrafficPoolGroups", JSON.stringify(updatedCustomGroups))

    toast({
      title: "创建成功",
      description: `已创建新流量包"${newGroup.name}"`,
    })

    router.push("/profile/traffic-pool")
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium text-blue-600">新建流量包</h1>
          </div>
        </div>
      </header>

      {/* 步骤指示器 */}
      <StepIndicator currentStep={currentStep} />

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {currentStep === 1 && <BasicInfoStep formData={formData} setFormData={setFormData} onNext={handleNext} />}
        {currentStep === 2 && (
          <AudienceFilterStep formData={formData} setFormData={setFormData} onNext={handleNext} onPrev={handlePrev} />
        )}
        {currentStep === 3 && <PreviewStep formData={formData} onPrev={handlePrev} onCreate={handleCreate} />}
      </div>
    </div>
  )
}
