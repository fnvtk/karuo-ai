"use client"

import { useState } from "react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react"

interface TaskSetupProps {
  onNext?: () => void
  onPrev?: () => void
  step: number
}

export function TaskSetup({ onNext, onPrev, step }: TaskSetupProps) {
  const [syncCount, setSyncCount] = useState(5)
  const [startTime, setStartTime] = useState("06:00")
  const [endTime, setEndTime] = useState("23:59")
  const [isEnabled, setIsEnabled] = useState(true)
  const [accountType, setAccountType] = useState("business") // business or personal

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold">朋友圈同步任务</h2>
        <div className="flex items-center space-x-2">
          <Label htmlFor="task-enabled">是否启用</Label>
          <Switch id="task-enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4">
          <Label>任务名称</Label>
          <Input placeholder="请输入任务名称" />
        </div>

        <div className="grid gap-4">
          <Label>允许发布的时间段</Label>
          <div className="flex items-center space-x-2">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-32" />
            <span>至</span>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-32" />
          </div>
        </div>

        <div className="grid gap-4">
          <Label>每日同步数量</Label>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => setSyncCount(Math.max(1, syncCount - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center">{syncCount}</span>
            <Button variant="outline" size="icon" onClick={() => setSyncCount(syncCount + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-gray-500">条朋友圈</span>
          </div>
        </div>

        <div className="grid gap-4">
          <Label>账号类型</Label>
          <div className="flex space-x-4">
            <Button
              variant={accountType === "business" ? "default" : "outline"}
              onClick={() => setAccountType("business")}
              className="w-24"
            >
              业务号
            </Button>
            <Button
              variant={accountType === "personal" ? "default" : "outline"}
              onClick={() => setAccountType("personal")}
              className="w-24"
            >
              人设号
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={onNext}>
          下一步
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
