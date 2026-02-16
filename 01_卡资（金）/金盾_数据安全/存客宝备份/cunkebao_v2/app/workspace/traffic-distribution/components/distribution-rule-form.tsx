"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import TrafficPoolSelector from "../components/traffic-pool-selector"
import { useRouter } from "next/navigation"

// 定义分发规则表单的属性接口
interface DistributionRuleFormProps {
  initialData?: {
    id?: string
    name?: string
    description?: string
    trafficPoolId?: string
    trafficPoolName?: string
    keywords?: string[]
    isActive?: boolean
    distributionRatio?: number
    targetAudience?: string
  }
  onSubmit?: (data: any) => void
  isEdit?: boolean
}

// 导出分发规则表单组件
export default function DistributionRuleForm({
  initialData = {},
  onSubmit,
  isEdit = false,
}: DistributionRuleFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  // 表单状态
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    description: initialData.description || "",
    trafficPoolId: initialData.trafficPoolId || "",
    trafficPoolName: initialData.trafficPoolName || "",
    keywords: initialData.keywords || [],
    isActive: initialData.isActive !== undefined ? initialData.isActive : true,
    distributionRatio: initialData.distributionRatio || 50,
    targetAudience: initialData.targetAudience || "",
  })

  const [keywordInput, setKeywordInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 处理表单输入变化
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 处理关键词添加
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }))
      setKeywordInput("")
    }
  }

  // 处理关键词删除
  const handleRemoveKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }))
  }

  // 处理流量池选择
  const handlePoolSelect = (poolId: string, poolName: string) => {
    setFormData((prev) => ({
      ...prev,
      trafficPoolId: poolId,
      trafficPoolName: poolName,
    }))
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 表单验证
      if (!formData.name) {
        toast({
          title: "错误",
          description: "请输入分发规则名称",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.trafficPoolId) {
        toast({
          title: "错误",
          description: "请选择流量池",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // 如果有onSubmit回调，则调用
      if (onSubmit) {
        await onSubmit(formData)
      } else {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000))

        toast({
          title: isEdit ? "更新成功" : "创建成功",
          description: isEdit ? "流量分发规则已成功更新" : "新的流量分发规则已创建",
        })

        // 返回列表页
        router.push("/workspace/traffic-distribution")
      }
    } catch (error) {
      console.error("提交表单时出错:", error)
      toast({
        title: "提交失败",
        description: "保存分发规则时发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{isEdit ? "编辑流量分发规则" : "创建新的流量分发规则"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">规则名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="输入规则名称"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">规则描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="描述该规则的用途和目标"
                className="mt-1"
              />
            </div>
          </div>

          {/* 流量池选择 */}
          <div className="space-y-2">
            <Label>选择流量池</Label>
            <TrafficPoolSelector selectedPoolId={formData.trafficPoolId} onSelect={handlePoolSelect} />
            {formData.trafficPoolName && (
              <div className="text-sm text-muted-foreground mt-1">已选择: {formData.trafficPoolName}</div>
            )}
          </div>

          {/* 关键词设置 */}
          <div className="space-y-2">
            <Label>关键词设置</Label>
            <div className="flex space-x-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="添加关键词"
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddKeyword()
                  }
                }}
              />
              <Button type="button" onClick={handleAddKeyword}>
                添加
              </Button>
            </div>

            {formData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 目标受众 */}
          <div>
            <Label htmlFor="targetAudience">目标受众</Label>
            <Select value={formData.targetAudience} onValueChange={(value) => handleChange("targetAudience", value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择目标受众" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有用户</SelectItem>
                <SelectItem value="new">新用户</SelectItem>
                <SelectItem value="returning">回访用户</SelectItem>
                <SelectItem value="highValue">高价值用户</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 分发比例 */}
          <div className="space-y-2">
            <Label htmlFor="distributionRatio">分发比例 ({formData.distributionRatio}%)</Label>
            <Input
              id="distributionRatio"
              type="range"
              min="1"
              max="100"
              value={formData.distributionRatio}
              onChange={(e) => handleChange("distributionRatio", Number.parseInt(e.target.value))}
              className="mt-1"
            />
          </div>

          {/* 启用状态 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleChange("isActive", checked)}
            />
            <Label htmlFor="isActive">启用该规则</Label>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/workspace/traffic-distribution")}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : isEdit ? "更新规则" : "创建规则"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
