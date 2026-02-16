"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrafficTeamSettings } from "@/app/components/TrafficTeamSettings"

interface NewAcquisitionPlanFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function NewAcquisitionPlanForm({ onSubmit, onCancel }: NewAcquisitionPlanFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trafficTeams: [], // Initialize trafficTeams as an empty array
  })

  const [currentStep, setCurrentStep] = useState(1)

  const handleChange = (data: any) => {
    setFormData(data)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="steps-container">
        {/* 步骤指示器 */}
        <div className="step-indicators flex justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex flex-col items-center ${currentStep >= step ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                  currentStep >= step ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {step}
              </div>
              <div className="text-sm font-medium">
                {step === 1 && "基础设置"}
                {step === 2 && "好友设置"}
                {step === 3 && "消息设置"}
                {step === 4 && "流量标签"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="space-y-2">
            <Label>计划名称</Label>
            <Input
              placeholder="输入计划名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>计划描述</Label>
            <Input
              placeholder="输入计划描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <TrafficTeamSettings formData={formData} onChange={handleChange} />

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">创建计划</Button>
      </div>
    </form>
  )
}
