"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BasicSettingsProps {
  data: {
    planName: string
    scenario: string
    actionType: string
    enabled: boolean
  }
  onUpdate: (data: any) => void
}

function BasicSettings({ data, onUpdate }: BasicSettingsProps) {
  const [formData, setFormData] = useState(data)

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onUpdate(newData)
  }

  const scenarios = [
    { value: "poster", label: "海报" },
    { value: "order", label: "订单" },
    { value: "douyin", label: "抖音" },
    { value: "weixinqun", label: "微信群" },
    { value: "payment", label: "付款码" },
  ]

  const actionTypes = [
    { value: "click_receive", label: "点击领取" },
    { value: "click_cooperate", label: "点击合作" },
    { value: "click_consult", label: "点击咨询" },
    { value: "click_signin", label: "点击签到" },
    { value: "click_understand", label: "点击了解" },
    { value: "click_register", label: "点击报名" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基础设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planName">计划名称</Label>
            <Input
              id="planName"
              placeholder="请输入计划名称"
              value={formData.planName}
              onChange={(e) => handleChange("planName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario">获客场景</Label>
            <Select value={formData.scenario} onValueChange={(value) => handleChange("scenario", value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择获客场景" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.value} value={scenario.value}>
                    {scenario.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionType">动作类型</Label>
            <Select value={formData.actionType} onValueChange={(value) => handleChange("actionType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择动作类型" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">是否启用</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => handleChange("enabled", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { BasicSettings }
export default BasicSettings
