"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Minus } from "lucide-react"

interface BasicSettingsProps {
  formData: {
    taskName: string
    startTime: string
    endTime: string
    syncCount: number
    accountType: string
    enabled: boolean
  }
  onChange: (data: Partial<BasicSettingsProps["formData"]>) => void
  onNext: () => void
}

export function BasicSettings({ formData, onChange, onNext }: BasicSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm mb-2">任务名称</div>
        <Input
          value={formData.taskName}
          onChange={(e) => onChange({ taskName: e.target.value })}
          placeholder="请输入任务名称"
        />
      </div>

      <div>
        <div className="text-sm mb-2">允许发布时间段</div>
        <div className="flex items-center space-x-3">
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="w-32"
          />
          <span className="text-gray-500">至</span>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className="w-32"
          />
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">每日同步数量</div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange({ syncCount: Math.max(1, formData.syncCount - 1) })}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{formData.syncCount}</span>
          <Button variant="outline" size="icon" onClick={() => onChange({ syncCount: formData.syncCount + 1 })}>
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-gray-500">条朋友圈</span>
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">账号类型</div>
        <div className="flex space-x-4">
          <Button
            variant={formData.accountType === "business" ? "default" : "outline"}
            onClick={() => onChange({ accountType: "business" })}
            className="flex-1"
          >
            业务号
          </Button>
          <Button
            variant={formData.accountType === "personal" ? "default" : "outline"}
            onClick={() => onChange({ accountType: "personal" })}
            className="flex-1"
          >
            人设号
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">是否启用</span>
        <Switch checked={formData.enabled} onCheckedChange={(checked) => onChange({ enabled: checked })} />
      </div>

      <Button onClick={onNext} className="w-full mt-8">
        下一步
      </Button>
    </div>
  )
}
