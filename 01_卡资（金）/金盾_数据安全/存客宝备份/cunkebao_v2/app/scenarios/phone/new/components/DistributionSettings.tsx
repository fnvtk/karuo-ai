"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

interface DistributionSettingsProps {
  settings: {
    enabled: boolean
    rules: Array<{
      level: number
      percentage: number
    }>
  }
  onChange: (settings: any) => void
}

export function DistributionSettings({ settings, onChange }: DistributionSettingsProps) {
  const handleToggle = (value: boolean) => {
    onChange({
      ...settings,
      enabled: value,
    })
  }

  const addRule = () => {
    onChange({
      ...settings,
      rules: [...settings.rules, { level: settings.rules.length + 1, percentage: 10 }],
    })
  }

  const removeRule = (index: number) => {
    onChange({
      ...settings,
      rules: settings.rules.filter((_, i) => i !== index),
    })
  }

  const updateRule = (index: number, percentage: number) => {
    const newRules = [...settings.rules]
    newRules[index].percentage = percentage
    onChange({
      ...settings,
      rules: newRules,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="distribution">启用分销返利</Label>
          <p className="text-xs text-gray-500">自动计算并发放返利</p>
        </div>
        <Switch id="distribution" checked={settings.enabled} onCheckedChange={handleToggle} />
      </div>

      {settings.enabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">分销层级设置</Label>
            <Button size="sm" variant="outline" onClick={addRule}>
              <Plus className="h-3 w-3 mr-1" />
              添加层级
            </Button>
          </div>

          {settings.rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm w-16">{rule.level}级</span>
              <Input
                type="number"
                value={rule.percentage}
                onChange={(e) => updateRule(index, Number(e.target.value))}
                className="flex-1"
                min="0"
                max="100"
              />
              <span className="text-sm">%</span>
              <Button size="icon" variant="ghost" onClick={() => removeRule(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
