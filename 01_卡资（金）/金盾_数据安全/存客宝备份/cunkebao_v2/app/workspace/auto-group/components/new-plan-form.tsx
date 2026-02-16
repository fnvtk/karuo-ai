"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NewPlanFormProps {
  onClose: () => void
}

export function NewPlanForm({ onClose }: NewPlanFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    customerType: "",
    startDate: "",
    endDate: "",
    groupSize: 38,
    welcomeMessage: "欢迎进群",
    specificWechatIds: [] as string[],
    keywords: [] as string[],
    tags: [] as string[],
    deviceId: "",
    operatorId: "",
  })

  const [tempInput, setTempInput] = useState({
    wechatId: "",
    keyword: "",
    tag: "",
  })

  const handleAddWechatId = () => {
    if (tempInput.wechatId && !formData.specificWechatIds.includes(tempInput.wechatId)) {
      setFormData({
        ...formData,
        specificWechatIds: [...formData.specificWechatIds, tempInput.wechatId],
      })
      setTempInput({ ...tempInput, wechatId: "" })
    }
  }

  const handleAddKeyword = () => {
    if (tempInput.keyword && !formData.keywords.includes(tempInput.keyword)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, tempInput.keyword],
      })
      setTempInput({ ...tempInput, keyword: "" })
    }
  }

  const handleAddTag = () => {
    if (tempInput.tag && !formData.tags.includes(tempInput.tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tempInput.tag],
      })
      setTempInput({ ...tempInput, tag: "" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: 实现提交逻辑
      await new Promise((resolve) => setTimeout(resolve, 1000))
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>新建自动拉群计划</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                计划名称<span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入计划名称"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerType" className="text-base">
                建群客户类型
              </Label>
              <Select
                value={formData.customerType}
                onValueChange={(value) => setFormData({ ...formData, customerType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_value">高价值客户</SelectItem>
                  <SelectItem value="regular">普通客户</SelectItem>
                  <SelectItem value="potential">潜在客户</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-base">
                  开始日期
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-base">
                  结束日期
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">群人数设置</Label>
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, groupSize: Math.max(1, formData.groupSize - 1) })}
                >
                  -
                </Button>
                <span className="w-12 text-center">{formData.groupSize}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setFormData({ ...formData, groupSize: formData.groupSize + 1 })}
                >
                  +
                </Button>
                <span>人/群</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage" className="text-base">
                入群欢迎语
              </Label>
              <Textarea
                id="welcomeMessage"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="请输入欢迎语"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">指定微信号</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={tempInput.wechatId}
                  onChange={(e) => setTempInput({ ...tempInput, wechatId: e.target.value })}
                  placeholder="输入微信号"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddWechatId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specificWechatIds.map((id) => (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {id}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          specificWechatIds: formData.specificWechatIds.filter((i) => i !== id),
                        })
                      }
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">关键词筛选</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={tempInput.keyword}
                  onChange={(e) => setTempInput({ ...tempInput, keyword: e.target.value })}
                  placeholder="输入关键词"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          keywords: formData.keywords.filter((k) => k !== keyword),
                        })
                      }
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            {step < 2 ? (
              <Button type="button" onClick={() => setStep(step + 1)} className="bg-blue-500 hover:bg-blue-600">
                下一步
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className={cn("bg-blue-500 hover:bg-blue-600", loading && "opacity-50 cursor-not-allowed")}
              >
                {loading ? "创建中..." : "确定"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </DialogContent>
  )
}
