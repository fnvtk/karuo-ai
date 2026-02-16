"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"

interface ExecutionSetupProps {
  formData: any
  updateFormData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export function ExecutionSetup({ formData, updateFormData, onNext, onBack }: ExecutionSetupProps) {
  const [scheduleType, setScheduleType] = useState<string>(formData.executionConfig?.scheduleType || "immediate")
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    formData.executionConfig?.scheduledTime ? new Date(formData.executionConfig.scheduledTime) : undefined,
  )
  const [scheduledTime, setScheduledTime] = useState<string>(
    formData.executionConfig?.scheduledTime
      ? format(new Date(formData.executionConfig.scheduledTime), "HH:mm")
      : "09:00",
  )
  const [notifyOnComplete, setNotifyOnComplete] = useState<boolean>(
    formData.executionConfig?.notifyOnComplete !== undefined ? formData.executionConfig.notifyOnComplete : true,
  )
  const [importTags, setImportTags] = useState<boolean>(
    formData.executionConfig?.importTags !== undefined ? formData.executionConfig.importTags : true,
  )
  const [sendToWechat, setSendToWechat] = useState<boolean>(
    formData.executionConfig?.sendToWechat !== undefined ? formData.executionConfig.sendToWechat : false,
  )
  const [wechatId, setWechatId] = useState<string>(formData.executionConfig?.wechatId || "")

  const handleContinue = () => {
    let scheduledTimeString = ""

    if (scheduleType === "scheduled" && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(":").map(Number)
      const dateObj = new Date(scheduledDate)
      dateObj.setHours(hours, minutes)
      scheduledTimeString = dateObj.toISOString()
    }

    updateFormData({
      executionConfig: {
        scheduleType,
        scheduledTime: scheduledTimeString,
        notifyOnComplete,
        importTags,
        sendToWechat,
        wechatId: sendToWechat ? wechatId : "",
      },
    })

    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">执行设置</h2>
        <p className="text-gray-500 text-sm">设置策略执行时间和结果处理方式</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">执行时间</Label>
        <RadioGroup value={scheduleType} onValueChange={setScheduleType} className="space-y-3">
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="immediate" id="immediate" />
            <div className="grid gap-1.5">
              <Label htmlFor="immediate" className="font-medium">
                立即执行
              </Label>
              <p className="text-sm text-gray-500">提交后立即开始执行策略优化</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="scheduled" id="scheduled" />
            <div className="grid gap-1.5">
              <Label htmlFor="scheduled" className="font-medium">
                定时执行
              </Label>
              <p className="text-sm text-gray-500">在指定的时间执行策略优化</p>

              {scheduleType === "scheduled" && (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <div>
                    <Label htmlFor="date" className="text-sm">
                      日期
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal mt-1" id="date">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : "选择日期"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="time" className="text-sm">
                      时间
                    </Label>
                    <div className="flex items-center mt-1">
                      <Clock className="mr-2 h-4 w-4 text-gray-400" />
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">结果处理</Label>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify"
              checked={notifyOnComplete}
              onCheckedChange={(checked) => setNotifyOnComplete(checked as boolean)}
            />
            <Label htmlFor="notify" className="cursor-pointer">
              完成后通知我
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="import"
              checked={importTags}
              onCheckedChange={(checked) => setImportTags(checked as boolean)}
            />
            <Label htmlFor="import" className="cursor-pointer">
              将结果导入为流量池标签
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="wechat"
              checked={sendToWechat}
              onCheckedChange={(checked) => setSendToWechat(checked as boolean)}
            />
            <Label htmlFor="wechat" className="cursor-pointer">
              发送报告到微信
            </Label>
          </div>

          {sendToWechat && (
            <div className="pl-6 pt-2">
              <Label htmlFor="wechatId" className="text-sm">
                微信号
              </Label>
              <Input
                id="wechatId"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                placeholder="输入接收报告的微信号"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button
          onClick={handleContinue}
          disabled={(scheduleType === "scheduled" && !scheduledDate) || (sendToWechat && !wechatId)}
        >
          继续
        </Button>
      </div>
    </div>
  )
}
