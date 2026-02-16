"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Minus, Clock, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useViewMode } from "@/app/components/LayoutWrapper"

interface BasicSettingsProps {
  formData: {
    taskName: string
    startTime: string
    endTime: string
    syncCount: number
    accountType: "business" | "personal"
    enabled: boolean
  }
  onChange: (data: Partial<BasicSettingsProps["formData"]>) => void
  onNext: () => void
}

export function BasicSettings({ formData, onChange, onNext }: BasicSettingsProps) {
  const { viewMode } = useViewMode()

  return (
    <div className={`space-y-6 ${viewMode === "desktop" ? "p-6" : "p-4"}`}>
      <div className={`grid ${viewMode === "desktop" ? "grid-cols-2 gap-8" : "grid-cols-1 gap-4"}`}>
        <div>
          <div className="text-base font-medium mb-2">任务名称</div>
          <Input
            value={formData.taskName}
            onChange={(e) => onChange({ taskName: e.target.value })}
            placeholder="请输入任务名称"
            className="h-12 border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-blue-600 px-0 text-base"
          />
        </div>

        <div>
          <div className="text-base font-medium mb-2">允许发布时间段</div>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                className="h-12 pl-10 rounded-xl border-gray-200 text-base"
              />
              <Clock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
            </div>
            <span className="text-gray-500">至</span>
            <div className="relative flex-1">
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="h-12 pl-10 rounded-xl border-gray-200 text-base"
              />
              <Clock className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-2">每日同步数量</div>
          <div className="flex items-center space-x-5">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onChange({ syncCount: Math.max(1, formData.syncCount - 1) })}
              className="h-12 w-12 rounded-xl bg-white border-gray-200"
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="w-8 text-center text-lg font-medium">{formData.syncCount}</span>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onChange({ syncCount: formData.syncCount + 1 })}
              className="h-12 w-12 rounded-xl bg-white border-gray-200"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <span className="text-gray-500">条朋友圈</span>
          </div>
        </div>

        <div>
          <div className="text-base font-medium mb-2">账号类型</div>
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => onChange({ accountType: "business" })}
                      className={`w-full h-12 justify-between rounded-lg ${
                        formData.accountType === "business"
                          ? "bg-blue-600 hover:bg-blue-600 text-white"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      业务号
                      <HelpCircle
                        className={`h-4 w-4 ${formData.accountType === "business" ? "text-white/70" : "text-gray-400"}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p>
                      业务号能够循环推送内容库中的内容。当内容库所有内容循环推送完毕后，若有新内容则优先推送新内容，若无新内容则继续循环推送。
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex-1 relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => onChange({ accountType: "personal" })}
                      className={`w-full h-12 justify-between rounded-lg ${
                        formData.accountType === "personal"
                          ? "bg-blue-600 hover:bg-blue-600 text-white"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      人设号
                      <HelpCircle
                        className={`h-4 w-4 ${formData.accountType === "personal" ? "text-white/70" : "text-gray-400"}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>用于实时更新同步，有新动态时进行同步，无动态则不同步。</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-base font-medium">是否启用</span>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => onChange({ enabled: checked })}
            className="data-[state=checked]:bg-blue-600 h-7 w-12"
          />
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl text-base font-medium shadow-sm"
      >
        下一步
      </Button>
    </div>
  )
}
