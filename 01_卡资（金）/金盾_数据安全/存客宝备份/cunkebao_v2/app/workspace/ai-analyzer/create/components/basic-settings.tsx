"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { BarChart3, Users, Activity, Brain, Search } from "lucide-react"

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

interface AnalysisType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

export function BasicSettings({ formData, updateFormData, onNext }: BasicSettingsProps) {
  const [errors, setErrors] = useState<{ taskName?: string; analysisTypes?: string }>({})

  const analysisTypes: AnalysisType[] = [
    {
      id: "comprehensive",
      name: "综合分析",
      description: "全面分析用户画像、行为习惯和互动模式",
      icon: <Brain className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "friend-info",
      name: "好友信息分析",
      description: "分析好友基本信息、地域分布和标签特征",
      icon: <Users className="h-5 w-5 text-green-500" />,
    },
    {
      id: "user-behavior",
      name: "用户行为分析",
      description: "分析用户互动频率、活跃时间和内容偏好",
      icon: <Activity className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "content-preference",
      name: "内容偏好分析",
      description: "分析用户对不同类型内容的反应和互动情况",
      icon: <BarChart3 className="h-5 w-5 text-orange-500" />,
    },
    {
      id: "keyword-analysis",
      name: "关键词分析",
      description: "分析用户聊天和互动中的高频关键词和话题",
      icon: <Search className="h-5 w-5 text-red-500" />,
    },
  ]

  const handleAnalysisTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      updateFormData({
        analysisTypes: [...formData.analysisTypes, typeId],
      })
    } else {
      updateFormData({
        analysisTypes: formData.analysisTypes.filter((id) => id !== typeId),
      })
    }
  }

  const validateForm = () => {
    const newErrors: { taskName?: string; analysisTypes?: string } = {}

    if (!formData.taskName.trim()) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">创建分析计划</h2>
        <p className="text-gray-500 mb-6">设置分析任务名称并选择需要的分析类型</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="taskName" className="text-base">
            任务名称
          </Label>
          <Input
            id="taskName"
            placeholder="例如：11月用户行为分析"
            value={formData.taskName}
            onChange={(e) => updateFormData({ taskName: e.target.value })}
            className="mt-1"
          />
          {errors.taskName && <p className="text-red-500 text-sm mt-1">{errors.taskName}</p>}
        </div>

        <div className="space-y-3">
          <Label className="text-base">分析类型（可多选）</Label>

          {errors.analysisTypes && <p className="text-red-500 text-sm">{errors.analysisTypes}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysisTypes.map((type) => (
              <Card
                key={type.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  formData.analysisTypes.includes(type.id) ? "border-2 border-blue-500" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={formData.analysisTypes.includes(type.id)}
                    onCheckedChange={(checked) => handleAnalysisTypeChange(type.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`type-${type.id}`} className="flex items-center cursor-pointer">
                      <div className="mr-2">{type.icon}</div>
                      <span className="font-medium">{type.name}</span>
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext}>下一步</Button>
      </div>
    </div>
  )
}
