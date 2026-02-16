"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface AIFilterSettingsProps {
  settings: {
    enabled: boolean
    removeBlacklist: boolean
    validateFormat: boolean
    removeDuplicates: boolean
  }
  onChange: (settings: any) => void
}

export function AIFilterSettings({ settings, onChange }: AIFilterSettingsProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({
      ...settings,
      [key]: value,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="ai-filter">启用AI智能过滤</Label>
          <p className="text-xs text-gray-500">自动过滤无效号码</p>
        </div>
        <Switch
          id="ai-filter"
          checked={settings.enabled}
          onCheckedChange={(checked) => handleToggle("enabled", checked)}
        />
      </div>

      {settings.enabled && (
        <div className="space-y-3 pl-4 border-l-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="remove-blacklist" className="text-sm">
              过滤黑名单
            </Label>
            <Switch
              id="remove-blacklist"
              checked={settings.removeBlacklist}
              onCheckedChange={(checked) => handleToggle("removeBlacklist", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="validate-format" className="text-sm">
              校验号码格式
            </Label>
            <Switch
              id="validate-format"
              checked={settings.validateFormat}
              onCheckedChange={(checked) => handleToggle("validateFormat", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="remove-duplicates" className="text-sm">
              去除重复号码
            </Label>
            <Switch
              id="remove-duplicates"
              checked={settings.removeDuplicates}
              onCheckedChange={(checked) => handleToggle("removeDuplicates", checked)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
