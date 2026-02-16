"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Play } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// 场景类型配置
const SCENARIO_TYPES = [
  { id: "haibao", name: "海报获客", description: "通过海报二维码获取客户" },
  { id: "order", name: "订单获客", description: "从订单数据中获取客户信息" },
  { id: "douyin", name: "抖音获客", description: "从抖音平台获取潜在客户" },
  { id: "xiaohongshu", name: "小红书获客", description: "从小红书平台获取客户" },
  { id: "phone", name: "电话获客", description: "通过电话号码批量获客" },
  { id: "gongzhonghao", name: "公众号获客", description: "从公众号粉丝中获客" },
  { id: "weixinqun", name: "微信群获客", description: "从微信群成员中获客" },
  { id: "payment", name: "付款码获客", description: "通过付款码扫码获客" },
  { id: "api", name: "API获客", description: "通过API接口对接获客" },
]

interface ScenarioFormData {
  name: string
  type: string
  description: string
  targetCount: number
  dailyLimit: number
  enabled: boolean
  settings: Record<string, any>
}

export default function NewScenarioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetType = searchParams.get("type")

  const [formData, setFormData] = useState<ScenarioFormData>({
    name: "",
    type: presetType || "",
    description: "",
    targetCount: 100,
    dailyLimit: 50,
    enabled: true,
    settings: {},
  })

  const [loading, setLoading] = useState(false)

  // 处理表单提交
  const handleSubmit = async (action: "save" | "start") => {
    if (!formData.name.trim()) {
      toast({
        title: "错误",
        description: "请输入计划名称",
        variant: "destructive",
      })
      return
    }

    if (!formData.type) {
      toast({
        title: "错误",
        description: "请选择获客场景类型",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const scenarioData = {
        ...formData,
        status: action === "start" ? "running" : "draft",
        createdAt: new Date().toISOString(),
      }

      console.log("创建场景:", scenarioData)

      toast({
        title: "成功",
        description: action === "start" ? "场景已创建并启动" : "场景已保存为草稿",
      })

      // 跳转到场景详情页
      router.push(`/scenarios/${formData.type}`)
    } catch (error) {
      toast({
        title: "错误",
        description: "创建场景失败，请重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 处理表单字段变化
  const handleFieldChange = (field: keyof ScenarioFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 获取选中的场景类型信息
  const selectedScenarioType = SCENARIO_TYPES.find((type) => type.id === formData.type)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">新建获客计划</h1>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 计划名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">计划名称</Label>
              <Input
                id="name"
                placeholder="请输入计划名称"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />
            </div>

            {/* 场景类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">获客场景</Label>
              <Select value={formData.type} onValueChange={(value) => handleFieldChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择获客场景类型" />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScenarioType && <p className="text-sm text-gray-600">{selectedScenarioType.description}</p>}
            </div>

            {/* 计划描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">计划描述</Label>
              <Textarea
                id="description"
                placeholder="请输入计划描述（可选）"
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>获客设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 目标客户数 */}
            <div className="space-y-2">
              <Label htmlFor="targetCount">目标客户数</Label>
              <Input
                id="targetCount"
                type="number"
                placeholder="100"
                value={formData.targetCount}
                onChange={(e) => handleFieldChange("targetCount", Number.parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-gray-500">设置本次获客计划的目标客户数量</p>
            </div>

            {/* 每日限制 */}
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">每日获客限制</Label>
              <Input
                id="dailyLimit"
                type="number"
                placeholder="50"
                value={formData.dailyLimit}
                onChange={(e) => handleFieldChange("dailyLimit", Number.parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-gray-500">设置每日最大获客数量，避免过度获客</p>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>立即启用</Label>
                <p className="text-sm text-gray-500">创建后立即开始执行获客计划</p>
              </div>
              <Switch checked={formData.enabled} onCheckedChange={(checked) => handleFieldChange("enabled", checked)} />
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => handleSubmit("save")}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            保存草稿
          </Button>
          <Button
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            onClick={() => handleSubmit("start")}
            disabled={loading}
          >
            <Play className="h-4 w-4 mr-2" />
            创建并启动
          </Button>
        </div>
      </div>

      {/* 底部占位 */}
      <div className="h-20"></div>
    </div>
  )
}
