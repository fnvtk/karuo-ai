"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Smartphone, User, MessageCircle, Mail } from "lucide-react"

interface ConfirmAnalysisProps {
  formData: any
  updateFormData: (data: any) => void
  onSubmit: () => void
  onBack: () => void
}

export function ConfirmAnalysis({ formData, updateFormData, onSubmit, onBack }: ConfirmAnalysisProps) {
  const [planName, setPlanName] = useState(formData.name || "")
  const [emailReport, setEmailReport] = useState(formData.emailReport || false)
  const [email, setEmail] = useState(formData.email || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case "friends":
        return "好友信息分析"
      case "moments":
        return "朋友圈内容分析"
      case "both":
        return "综合分析"
      default:
        return "未知类型"
    }
  }

  const handleSubmit = async () => {
    updateFormData({
      name: planName,
      emailReport,
      email: emailReport ? email : "",
    })

    setIsSubmitting(true)
    await onSubmit()
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">确认分析计划</h2>
        <p className="text-gray-500 text-sm">确认分析计划信息并提交</p>
      </div>

      <div>
        <Label htmlFor="planName" className="text-base font-medium">
          计划名称
        </Label>
        <Input
          id="planName"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="输入分析计划名称"
          className="mt-1"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="font-medium">分析计划信息</h3>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">设备信息</p>
            <p className="text-sm text-gray-600">{formData.deviceName}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="font-medium">微信账号</p>
            <p className="text-sm text-gray-600">
              {formData.wechatName} ({formData.wechatId})
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="font-medium">分析类型</p>
            <p className="text-sm text-gray-600">{getAnalysisTypeLabel(formData.analysisType)}</p>

            {(formData.analysisType === "friends" || formData.analysisType === "both") &&
              formData.keywords.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">用户关键词：</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {(formData.analysisType === "moments" || formData.analysisType === "both") &&
              formData.promptWords.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">分析提示词：</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.promptWords.map((promptWord: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {promptWord}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="emailReport"
            checked={emailReport}
            onCheckedChange={(checked) => {
              setEmailReport(checked as boolean)
              if (!checked) {
                setEmail("")
              }
            }}
          />
          <Label htmlFor="emailReport" className="font-medium cursor-pointer">
            分析完成后发送报告到邮箱
          </Label>
        </div>

        {emailReport && (
          <div className="pl-6">
            <Label htmlFor="email" className="text-sm">
              邮箱地址
            </Label>
            <div className="flex items-center mt-1">
              <Mail className="h-4 w-4 text-gray-400 mr-2" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="输入接收报告的邮箱地址"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button onClick={handleSubmit} disabled={!planName.trim() || (emailReport && !email.trim()) || isSubmitting}>
          {isSubmitting ? "提交中..." : "开始分析"}
        </Button>
      </div>
    </div>
  )
}
