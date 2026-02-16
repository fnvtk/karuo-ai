"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Database, Calendar, Settings, Tag, Mail } from "lucide-react"
import { format } from "date-fns"

interface ConfirmStrategyProps {
  formData: any
  updateFormData: (data: any) => void
  onSubmit: () => void
  onBack: () => void
}

export function ConfirmStrategy({ formData, updateFormData, onSubmit, onBack }: ConfirmStrategyProps) {
  const [planName, setPlanName] = useState(formData.name || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getStrategyTypeIcon = (type: string) => {
    switch (type) {
      case "jd":
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-orange-600" />
          </div>
        )
      case "yisi":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-blue-600" />
          </div>
        )
      case "database":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-green-600" />
          </div>
        )
      case "custom":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 text-purple-600" />
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 text-gray-600" />
          </div>
        )
    }
  }

  const getStrategyTypeLabel = (type: string) => {
    switch (type) {
      case "jd":
        return "京东会员"
      case "yisi":
        return "易思接口"
      case "database":
        return "数据库匹配"
      case "custom":
        return "自定义策略"
      default:
        return "未知类型"
    }
  }

  const handleSubmit = async () => {
    updateFormData({
      name: planName,
    })

    setIsSubmitting(true)
    await onSubmit()
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">确认优化策略</h2>
        <p className="text-gray-500 text-sm">确认策略信息并提交</p>
      </div>

      <div>
        <Label htmlFor="planName" className="text-base font-medium">
          策略名称
        </Label>
        <Input
          id="planName"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="输入策略名称"
          className="mt-1"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="font-medium">策略信息</h3>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">设备信息</p>
            <p className="text-sm text-gray-600">{formData.deviceNames.join(", ")}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Database className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="font-medium">流量池</p>
            <div className="space-y-1">
              {formData.trafficPoolNames.map((name: string, index: number) => (
                <p key={index} className="text-sm text-gray-600">
                  {name}
                </p>
              ))}
              <p className="text-sm font-medium">共 {formData.trafficPoolSize} 位用户</p>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          {getStrategyTypeIcon(formData.strategyType)}
          <div>
            <p className="font-medium">优化策略</p>
            <p className="text-sm text-gray-600">
              {getStrategyTypeLabel(formData.strategyType)} - {formData.strategyName}
            </p>

            {formData.strategyType === "jd" && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  会员等级:{" "}
                  {formData.strategyConfig.memberLevel === "all"
                    ? "所有会员"
                    : formData.strategyConfig.memberLevel === "plus"
                      ? "PLUS会员"
                      : formData.strategyConfig.memberLevel === "vip"
                        ? "VIP会员"
                        : "普通会员"}
                </Badge>
              </div>
            )}

            {formData.strategyType === "yisi" && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  分析深度:{" "}
                  {formData.strategyConfig.analysisDepth === "basic"
                    ? "基础分析"
                    : formData.strategyConfig.analysisDepth === "standard"
                      ? "标准分析"
                      : "深度分析"}
                </Badge>
              </div>
            )}

            {formData.strategyType === "database" && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  表名: {formData.strategyConfig.tableName}
                </Badge>
                <Badge variant="outline" className="text-xs ml-1">
                  匹配字段: {formData.strategyConfig.matchFields}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="font-medium">执行时间</p>
            <p className="text-sm text-gray-600">
              {formData.executionConfig.scheduleType === "immediate"
                ? "提交后立即执行"
                : `定时执行: ${format(new Date(formData.executionConfig.scheduledTime), "yyyy-MM-dd HH:mm")}`}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Settings className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="font-medium">结果处理</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {formData.executionConfig.notifyOnComplete && (
                <Badge variant="outline" className="text-xs">
                  完成后通知
                </Badge>
              )}
              {formData.executionConfig.importTags && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  导入标签
                </Badge>
              )}
              {formData.executionConfig.sendToWechat && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  发送到微信: {formData.executionConfig.wechatId}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button onClick={handleSubmit} disabled={!planName.trim() || isSubmitting}>
          {isSubmitting ? "提交中..." : "开始优化"}
        </Button>
      </div>
    </div>
  )
}
