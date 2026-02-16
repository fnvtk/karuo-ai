"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface BasicSettingsProps {
  defaultValues?: {
    name: string
    pushTimeStart: string
    pushTimeEnd: string
    dailyPushCount: number
    pushOrder: "earliest" | "latest"
    isLoopPush: boolean
    isImmediatePush: boolean
    isEnabled: boolean
  }
  onNext: (values: any) => void
  onSave: (values: any) => void
  onCancel: () => void
}

export function BasicSettings({
  defaultValues = {
    name: "",
    pushTimeStart: "06:00",
    pushTimeEnd: "23:59",
    dailyPushCount: 20,
    pushOrder: "latest",
    isLoopPush: false,
    isImmediatePush: false,
    isEnabled: false,
  },
  onNext,
  onSave,
  onCancel,
}: BasicSettingsProps) {
  const [values, setValues] = useState(defaultValues)

  const handleChange = (field: string, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleCountChange = (increment: boolean) => {
    setValues((prev) => ({
      ...prev,
      dailyPushCount: increment ? prev.dailyPushCount + 1 : Math.max(1, prev.dailyPushCount - 1),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="taskName" className="flex items-center">
            <span className="text-red-500 mr-1">*</span>任务名称:
          </Label>
          <Input
            id="taskName"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="请输入任务名称"
            className="max-w-md"
          />
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">允许推送的时间段:</Label>
          <div className="flex items-center space-x-2 max-w-md">
            <Input
              type="time"
              value={values.pushTimeStart}
              onChange={(e) => handleChange("pushTimeStart", e.target.value)}
              className="w-32"
            />
            <span>至</span>
            <Input
              type="time"
              value={values.pushTimeEnd}
              onChange={(e) => handleChange("pushTimeEnd", e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">每日推送:</Label>
          <div className="flex items-center space-x-2 max-w-md">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => handleCountChange(false)}
              className="bg-white border-gray-200"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={values.dailyPushCount}
              onChange={(e) => handleChange("dailyPushCount", Number.parseInt(e.target.value) || 1)}
              className="w-20 text-center"
              min="1"
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => handleCountChange(true)}
              className="bg-white border-gray-200"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span>条内容</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">推送顺序:</Label>
          <div className="flex items-center space-x-2 max-w-md">
            <div className="flex">
              <Button
                type="button"
                variant={values.pushOrder === "earliest" ? "default" : "outline"}
                className={`rounded-r-none ${values.pushOrder === "earliest" ? "" : "text-gray-500"}`}
                onClick={() => handleChange("pushOrder", "earliest")}
              >
                按最早
              </Button>
              <Button
                type="button"
                variant={values.pushOrder === "latest" ? "default" : "outline"}
                className={`rounded-l-none ${values.pushOrder === "latest" ? "" : "text-gray-500"}`}
                onClick={() => handleChange("pushOrder", "latest")}
              >
                按最新
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="isLoopPush" className="flex items-center">
            <span className="text-red-500 mr-1">*</span>是否循环推送:
          </Label>
          <div className="flex items-center space-x-2">
            <span className={values.isLoopPush ? "text-gray-400" : "text-gray-900"}>否</span>
            <Switch
              id="isLoopPush"
              checked={values.isLoopPush}
              onCheckedChange={(checked) => handleChange("isLoopPush", checked)}
            />
            <span className={values.isLoopPush ? "text-gray-900" : "text-gray-400"}>是</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="isImmediatePush" className="flex items-center">
            <span className="text-red-500 mr-1">*</span>是否立即推送:
          </Label>
          <div className="flex items-center space-x-2">
            <span className={values.isImmediatePush ? "text-gray-400" : "text-gray-900"}>否</span>
            <Switch
              id="isImmediatePush"
              checked={values.isImmediatePush}
              onCheckedChange={(checked) => handleChange("isImmediatePush", checked)}
            />
            <span className={values.isImmediatePush ? "text-gray-900" : "text-gray-400"}>是</span>
          </div>
          {values.isImmediatePush && (
            <p className="text-sm text-gray-500">如果启用，系统会把内容库里所有的内容按顺序推送到指定的社群</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="isEnabled" className="flex items-center">
            <span className="text-red-500 mr-1">*</span>是否启用:
          </Label>
          <div className="flex items-center space-x-2">
            <span className={values.isEnabled ? "text-gray-400" : "text-gray-900"}>否</span>
            <Switch
              id="isEnabled"
              checked={values.isEnabled}
              onCheckedChange={(checked) => handleChange("isEnabled", checked)}
            />
            <span className={values.isEnabled ? "text-gray-900" : "text-gray-400"}>是</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button type="button" onClick={() => onNext(values)}>
          下一步
        </Button>
        <Button type="button" variant="outline" onClick={() => onSave(values)}>
          保存
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}
