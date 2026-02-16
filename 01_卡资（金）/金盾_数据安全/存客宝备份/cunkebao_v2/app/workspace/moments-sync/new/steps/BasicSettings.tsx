"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Minus, Plus, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BasicSettingsProps {
  formData: any
  onChange: (data: any) => void
  onNext: () => void
}

export function BasicSettings({ formData, onChange, onNext }: BasicSettingsProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="taskName" className="required">
            任务名称
          </Label>
          <Input
            id="taskName"
            value={formData.taskName}
            onChange={(e) => onChange({ ...formData, taskName: e.target.value })}
            placeholder="请输入任务名称"
            className="mt-2"
          />
        </div>

        <div>
          <Label>允许发布的时间段</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => onChange({ ...formData, startTime: e.target.value })}
              className="w-32"
            />
            <span>至</span>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => onChange({ ...formData, endTime: e.target.value })}
              className="w-32"
            />
          </div>
        </div>

        <div>
          <Label>每日同步数量</Label>
          <div className="flex items-center space-x-4 mt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onChange({ ...formData, syncCount: Math.max(1, formData.syncCount - 1) })}
              aria-label="减少同步数量"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center bg-primary text-primary-foreground rounded-md px-3 py-1 font-medium">
              {formData.syncCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onChange({ ...formData, syncCount: formData.syncCount + 1 })}
              aria-label="增加同步数量"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-gray-500">条朋友圈</span>
          </div>
        </div>

        <div>
          <Label>账号类型</Label>
          <div className="flex space-x-4 mt-2">
            <div className="flex items-center">
              <Button
                variant={formData.accountType === "business" ? "default" : "outline"}
                onClick={() => onChange({ ...formData, accountType: "business" })}
                className="w-24"
              >
                业务号
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 ml-2 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      业务号能够循环推送内容库中的内容。当内容库所有内容循环推送完毕后，若有新内容则优先推送新内容，若无新内容则继续循环推送。
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center">
              <Button
                variant={formData.accountType === "personal" ? "default" : "outline"}
                onClick={() => onChange({ ...formData, accountType: "personal" })}
                className="w-24"
              >
                人设号
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 ml-2 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>人设号用于实时更新同步，有新动态时进行同步，无新动态则不同步。</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>是否启用</Label>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => onChange({ ...formData, enabled: checked })}
          />
        </div>

        <Button className="w-full" onClick={onNext}>
          下一步
        </Button>
      </div>
    </Card>
  )
}
