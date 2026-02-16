"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Minus, X } from "lucide-react"
import { DeviceSelector } from "./device-selector"
import { WechatAccountSelector } from "./wechat-account-selector"

interface StepByStepPlanFormProps {
  onClose: () => void
}

export function StepByStepPlanForm({ onClose }: StepByStepPlanFormProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    customerType: "",
    startDate: "",
    endDate: "",
    groupSize: 38,
    welcomeMessage: "欢迎进群",
    devices: [] as string[],
    wechatAccounts: [] as string[],
  })

  const handleNext = () => {
    setStep(step + 1)
  }

  const handlePrevious = () => {
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 提交表单数据
    onClose()
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>新建计划 - 步骤 {step}/4</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <>
            <div>
              <Label htmlFor="name" className="text-base">
                计划名称<span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入任务名称"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="customerType" className="text-base">
                建群客户类型
              </Label>
              <Input
                id="customerType"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                placeholder="选择客户标签"
                className="mt-1.5"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label className="text-base">执行期限</Label>
              <div className="flex items-center space-x-4 mt-1.5">
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <span>至</span>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-base">建群人数设置</Label>
              <div className="flex items-center space-x-4 mt-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, groupSize: Math.max(1, formData.groupSize - 1) })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{formData.groupSize}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, groupSize: formData.groupSize + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span>人</span>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <Label htmlFor="welcomeMessage" className="text-base">
                招呼语
              </Label>
              <Input
                id="welcomeMessage"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="欢迎进群"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-base">建群设备</Label>
              <DeviceSelector
                selectedDevices={formData.devices}
                onChange={(devices) => setFormData({ ...formData, devices })}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <div>
            <Label className="text-base">关联微信</Label>
            <WechatAccountSelector
              selectedAccounts={formData.wechatAccounts}
              onChange={(accounts) => setFormData({ ...formData, wechatAccounts: accounts })}
            />
          </div>
        )}

        <div className="flex justify-between space-x-4 pt-4">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={handlePrevious}>
              上一步
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              下一步
            </Button>
          ) : (
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              完成
            </Button>
          )}
        </div>
      </form>
    </DialogContent>
  )
}
