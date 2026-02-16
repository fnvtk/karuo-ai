"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { format } from "date-fns"

interface BasicInfoStepProps {
  onNext: (data: any) => void
  initialData?: any
}

export default function BasicInfoStep({ onNext, initialData = {} }: BasicInfoStepProps) {
  const [formData, setFormData] = useState({
    name: initialData.name || `流量分发 ${format(new Date(), "yyyyMMdd HHmm")}`,
    distributionMethod: initialData.distributionMethod || "equal",
    dailyLimit: initialData.dailyLimit || 50,
    timeRestriction: initialData.timeRestriction || "custom",
    startTime: initialData.startTime || "09:00",
    endTime: initialData.endTime || "18:00",
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onNext(formData)
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-6">基本信息</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center">
            计划名称 <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="请输入计划名称"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>分配方式</Label>
          <RadioGroup
            value={formData.distributionMethod}
            onValueChange={(value) => handleChange("distributionMethod", value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="equal" id="equal" />
              <Label htmlFor="equal" className="cursor-pointer">
                均分配 <span className="text-gray-500 text-sm">(流量将均分配给所有客服)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="priority" id="priority" />
              <Label htmlFor="priority" className="cursor-pointer">
                优先级分配 <span className="text-gray-500 text-sm">(按客服优先级顺序分配)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ratio" id="ratio" />
              <Label htmlFor="ratio" className="cursor-pointer">
                比例分配 <span className="text-gray-500 text-sm">(按设定比例分配流量)</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label>分配限制</Label>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>每日最大分配量</span>
              <span className="font-medium">{formData.dailyLimit} 人/天</span>
            </div>
            <Slider
              value={[formData.dailyLimit]}
              min={1}
              max={200}
              step={1}
              onValueChange={(value) => handleChange("dailyLimit", value[0])}
              className="py-4"
            />
            <p className="text-sm text-gray-500">限制每天最多分配的流量数量</p>
          </div>

          <div className="space-y-4 pt-4">
            <Label>时间限制</Label>
            <RadioGroup
              value={formData.timeRestriction}
              onValueChange={(value) => handleChange("timeRestriction", value)}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="allDay" id="allDay" />
                <Label htmlFor="allDay" className="cursor-pointer">
                  全天分配
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">
                  自定义时间段
                </Label>
              </div>
            </RadioGroup>

            {formData.timeRestriction === "custom" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label htmlFor="startTime" className="mb-2 block">
                    开始时间
                  </Label>
                  <div className="relative">
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleChange("startTime", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="endTime" className="mb-2 block">
                    结束时间
                  </Label>
                  <div className="relative">
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleChange("endTime", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSubmit} className="px-8">
          下一步 →
        </Button>
      </div>
    </div>
  )
}
