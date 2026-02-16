"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BasicSettingsProps {
  formData: {
    taskName: string
    analysisTypes: string[]
  }
  updateFormData: (
    data: Partial<{
      taskName: string
      analysisTypes: string[]
    }>,
  ) => void
  onNext: () => void
}

const analysisTypeOptions = [
  { id: "comprehensive", label: "综合分析" },
  { id: "friends", label: "好友信息分析" },
  { id: "behavior", label: "用户行为分析" },
  { id: "moments", label: "朋友圈内容分析" },
  { id: "interaction", label: "互动频率分析" },
]

export function BasicSettings({ formData, updateFormData, onNext }: BasicSettingsProps) {
  const [errors, setErrors] = useState<{ taskName?: string; analysisTypes?: string }>({})

  const validateForm = () => {
    const newErrors: { taskName?: string; analysisTypes?: string } = {}

    if (!formData.taskName?.trim()) {
      newErrors.taskName = "请输入任务名称"
    }

    if (formData.analysisTypes.length === 0) {
      newErrors.analysisTypes = "请至少选择一种分析类型"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const handleTypeChange = (typeId: string, checked: boolean) => {
    const newTypes = checked
      ? [...formData.analysisTypes, typeId]
      : formData.analysisTypes.filter((id) => id !== typeId)

    updateFormData({ analysisTypes: newTypes })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">基础设置</h2>
        <p className="text-gray-500 mb-6">设置分析计划的基本信息和分析类型</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="task-name" className="text-base">
            任务名称
          </Label>
          <Input
            id="task-name"
            placeholder="请输入任务名称"
            value={formData.taskName || ""}
            onChange={(e) => updateFormData({ taskName: e.target.value })}
            className="mt-1"
          />
          {errors.taskName && <p className="text-red-500 text-sm mt-1">{errors.taskName}</p>}
        </div>

        <div className="space-y-3">
          <Label className="text-base">分析类型</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisTypeOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                <Checkbox
                  id={option.id}
                  checked={formData.analysisTypes.includes(option.id)}
                  onCheckedChange={(checked) => handleTypeChange(option.id, checked === true)}
                />
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {errors.analysisTypes && <p className="text-red-500 text-sm">{errors.analysisTypes}</p>}
        </div>

        {formData.analysisTypes.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              已选择 {formData.analysisTypes.length} 种分析类型，分析结果将更加全面
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} className="w-32">
          下一步
        </Button>
      </div>
    </div>
  )
}
