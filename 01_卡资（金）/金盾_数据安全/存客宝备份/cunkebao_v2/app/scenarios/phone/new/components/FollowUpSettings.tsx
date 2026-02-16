"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

interface FollowUpSettingsProps {
  settings: {
    autoWelcome: boolean
    welcomeMessage: string
    autoTag: boolean
    tags: string[]
  }
  onChange: (settings: any) => void
}

export function FollowUpSettings({ settings, onChange }: FollowUpSettingsProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({
      ...settings,
      [key]: value,
    })
  }

  const handleMessageChange = (value: string) => {
    onChange({
      ...settings,
      welcomeMessage: value,
    })
  }

  const addTag = () => {
    const tag = prompt("请输入标签名称")
    if (tag && !settings.tags.includes(tag)) {
      onChange({
        ...settings,
        tags: [...settings.tags, tag],
      })
    }
  }

  const removeTag = (tag: string) => {
    onChange({
      ...settings,
      tags: settings.tags.filter((t) => t !== tag),
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-welcome">自动发送欢迎语</Label>
            <p className="text-xs text-gray-500">加好友成功后自动发送</p>
          </div>
          <Switch
            id="auto-welcome"
            checked={settings.autoWelcome}
            onCheckedChange={(checked) => handleToggle("autoWelcome", checked)}
          />
        </div>

        {settings.autoWelcome && (
          <div>
            <Label htmlFor="welcome-message" className="text-sm">
              欢迎语内容
            </Label>
            <Textarea
              id="welcome-message"
              value={settings.welcomeMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="请输入欢迎语内容"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-tag">自动打标签</Label>
            <p className="text-xs text-gray-500">为新好友自动添加标签</p>
          </div>
          <Switch
            id="auto-tag"
            checked={settings.autoTag}
            onCheckedChange={(checked) => handleToggle("autoTag", checked)}
          />
        </div>

        {settings.autoTag && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">标签列表</Label>
              <Button size="sm" variant="outline" onClick={addTag}>
                <Plus className="h-3 w-3 mr-1" />
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-sm"
                >
                  <span>{tag}</span>
                  <button onClick={() => removeTag(tag)} className="hover:text-blue-800">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
