"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* 任务名称 */}
            <div className="space-y-2">
              <Label htmlFor="taskName" className="flex items-center text-sm font-medium">
                <span className="text-red-500 mr-1">*</span>任务名称:
              </Label>
              <Input
                id="taskName"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="请输入任务名称"
              />
            </div>

            {/* 允许推送的时间段 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">允许推送的时间段:</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="time"
                  value={values.pushTimeStart}
                  onChange={(e) => handleChange("pushTimeStart", e.target.value)}
                  className="w-full"
                />
                <span className="text-gray-500">至</span>
                <Input
                  type="time"
                  value={values.pushTimeEnd}
                  onChange={(e) => handleChange("pushTimeEnd", e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* 每日推送 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">每日推送:</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => handleCountChange(false)}
                  className="h-9 w-9"
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
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-gray-500">条内容</span>
              </div>
            </div>

            {/* 推送顺序 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">推送顺序:</Label>
              <div className="flex">
                <Button
                  type="button"
                  variant={values.pushOrder === "earliest" ? "default" : "outline"}
                  className={`rounded-r-none flex-1 ${values.pushOrder === "earliest" ? "" : "text-gray-500"}`}
                  onClick={() => handleChange("pushOrder", "earliest")}
                >
                  按最早
                </Button>
                <Button
                  type="button"
                  variant={values.pushOrder === "latest" ? "default" : "outline"}
                  className={`rounded-l-none flex-1 ${values.pushOrder === "latest" ? "" : "text-gray-500"}`}
                  onClick={() => handleChange("pushOrder", "latest")}
                >
                  按最新
                </Button>
              </div>
            </div>

            {/* 是否循环推送 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isLoopPush" className="flex items-center text-sm font-medium">
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

            {/* 是否立即推送 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isImmediatePush" className="flex items-center text-sm font-medium">
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
            </div>
            {values.isImmediatePush && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
                如果启用，系统会把内容库里所有的内容按顺序推送到指定的社群
              </div>
            )}

            {/* 是否启用 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isEnabled" className="flex items-center text-sm font-medium">
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
        </CardContent>
      </Card>

      <div className="flex space-x-2 justify-center sm:justify-end">
        <Button type="button" onClick={() => onNext(values)} className="flex-1 sm:flex-none">
          下一步
        </Button>
        <Button type="button" variant="outline" onClick={() => onSave(values)} className="flex-1 sm:flex-none">
          保存
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
          取消
        </Button>
      </div>
    </div>
  )
}
