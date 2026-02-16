"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface RedPacketSettingsProps {
  settings: {
    enabled: boolean
    amount: number
    pool: number
  }
  onChange: (settings: any) => void
}

export function RedPacketSettings({ settings, onChange }: RedPacketSettingsProps) {
  const handleToggle = (value: boolean) => {
    onChange({
      ...settings,
      enabled: value,
    })
  }

  const handleAmountChange = (value: number) => {
    onChange({
      ...settings,
      amount: value,
    })
  }

  const handlePoolChange = (value: number) => {
    onChange({
      ...settings,
      pool: value,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="redpacket">启用红包奖励</Label>
          <p className="text-xs text-gray-500">加好友成功后自动发红包</p>
        </div>
        <Switch id="redpacket" checked={settings.enabled} onCheckedChange={handleToggle} />
      </div>

      {settings.enabled && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="amount" className="text-sm">
              单个红包金额（元）
            </Label>
            <Input
              id="amount"
              type="number"
              value={settings.amount}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              min="0.01"
              step="0.01"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pool" className="text-sm">
              红包池总额（元）
            </Label>
            <Input
              id="pool"
              type="number"
              value={settings.pool}
              onChange={(e) => handlePoolChange(Number(e.target.value))}
              min="0"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">剩余可发：{Math.floor(settings.pool / settings.amount)} 个红包</p>
          </div>
        </div>
      )}
    </div>
  )
}
