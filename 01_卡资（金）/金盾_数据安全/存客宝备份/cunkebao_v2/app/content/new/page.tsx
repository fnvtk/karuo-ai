"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StepIndicator } from "@/app/components/ui-templates/step-indicator"
import { BasicSettings } from "./steps/basic-settings"
import { SourceSelection } from "./steps/source-selection"
import { ContentSettings } from "./steps/content-settings"
import { TagSettings } from "./steps/tag-settings"
import { PreviewAndConfirm } from "./steps/preview-confirm"
import { toast } from "@/components/ui/use-toast"

// 内容库表单数据类型
export interface ContentLibraryFormData {
  name: string
  description: string
  type: "friends" | "groups" | "moments" | "mixed"
  sources: {
    id: string
    name: string
    type: string
    avatar?: string
  }[]
  contentTypes: string[]
  autoSync: boolean
  syncInterval: number
  tags: string[]
  enabled: boolean
}

export default function NewContentLibraryPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ContentLibraryFormData>({
    name: "",
    description: "",
    type: "friends",
    sources: [],
    contentTypes: ["text", "image"],
    autoSync: true,
    syncInterval: 24,
    tags: [],
    enabled: true,
  })

  const steps = [
    { number: 1, title: "基础设置" },
    { number: 2, title: "来源选择" },
    { number: 3, title: "内容设置" },
    { number: 4, title: "标签设置" },
    { number: 5, title: "预览确认" },
  ]

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    } else {
      router.back()
    }
  }

  const handleSubmit = async () => {
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "创建成功",
        description: "内容库已成功创建",
      })

      router.push("/content")
    } catch (error) {
      console.error("创建内容库失败:", error)
      toast({
        title: "创建失败",
        description: "创建内容库时发生错误，请重试",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium ml-3">新建内容库</h1>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <StepIndicator currentStep={currentStep} steps={steps} />

        <div className="mt-6">
          {currentStep === 1 && (
            <BasicSettings formData={formData} updateFormData={updateFormData} onNext={handleNext} />
          )}

          {currentStep === 2 && (
            <SourceSelection
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}

          {currentStep === 3 && (
            <ContentSettings
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}

          {currentStep === 4 && (
            <TagSettings
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}

          {currentStep === 5 && (
            <PreviewAndConfirm formData={formData} onSubmit={handleSubmit} onPrevious={handlePrevious} />
          )}
        </div>
      </div>
    </div>
  )
}
