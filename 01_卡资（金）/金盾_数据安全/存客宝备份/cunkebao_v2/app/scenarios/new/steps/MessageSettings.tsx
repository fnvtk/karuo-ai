"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"

interface MessageSettingsProps {
  data: {
    welcomeMessage: string
    autoReply: boolean
    replyMessages: string[]
    replyDelay: number
    keywords: string[]
    dailyLimit: number
    intervalTime: number
  }
  onUpdate: (data: any) => void
}

export default function MessageSettings({ data, onUpdate }: MessageSettingsProps) {
  const [formData, setFormData] = useState(data)
  const [newKeyword, setNewKeyword] = useState("")
  const [newReplyMessage, setNewReplyMessage] = useState("")

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onUpdate(newData)
  }

  // 添加关键词
  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      const newKeywords = [...formData.keywords, newKeyword.trim()]
      handleChange("keywords", newKeywords)
      setNewKeyword("")
    }
  }

  // 删除关键词
  const removeKeyword = (keyword: string) => {
    const newKeywords = formData.keywords.filter((k) => k !== keyword)
    handleChange("keywords", newKeywords)
  }

  // 添加回复消息
  const addReplyMessage = () => {
    if (newReplyMessage.trim()) {
      const newMessages = [...formData.replyMessages, newReplyMessage.trim()]
      handleChange("replyMessages", newMessages)
      setNewReplyMessage("")
    }
  }

  // 删除回复消息
  const removeReplyMessage = (index: number) => {
    const newMessages = formData.replyMessages.filter((_, i) => i !== index)
    handleChange("replyMessages", newMessages)
  }

  return (
    <div className="space-y-6">
      {/* 欢迎消息设置 */}
      <Card>
        <CardHeader>
          <CardTitle>欢迎消息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">欢迎消息内容</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="请输入欢迎消息内容..."
              value={formData.welcomeMessage}
              onChange={(e) => handleChange("welcomeMessage", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              支持变量：{"{nickname}"} - 用户昵称，{"{time}"} - 当前时间
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 自动回复设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>自动回复</span>
            <Switch checked={formData.autoReply} onCheckedChange={(checked) => handleChange("autoReply", checked)} />
          </CardTitle>
        </CardHeader>
        {formData.autoReply && (
          <CardContent className="space-y-4">
            {/* 触发关键词 */}
            <div className="space-y-2">
              <Label>触发关键词</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="输入关键词"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                />
                <Button onClick={addKeyword} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{keyword}</span>
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(keyword)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* 回复消息 */}
            <div className="space-y-2">
              <Label>回复消息</Label>
              <div className="flex space-x-2">
                <Textarea
                  placeholder="输入回复消息"
                  value={newReplyMessage}
                  onChange={(e) => setNewReplyMessage(e.target.value)}
                  rows={2}
                />
                <Button onClick={addReplyMessage} size="sm" className="self-start">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {formData.replyMessages.map((message, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1 text-sm">{message}</div>
                    <X
                      className="h-4 w-4 cursor-pointer text-gray-400 hover:text-red-500"
                      onClick={() => removeReplyMessage(index)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 回复延迟 */}
            <div className="space-y-2">
              <Label htmlFor="replyDelay">回复延迟（秒）</Label>
              <Select
                value={formData.replyDelay.toString()}
                onValueChange={(value) => handleChange("replyDelay", Number.parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1秒</SelectItem>
                  <SelectItem value="3">3秒</SelectItem>
                  <SelectItem value="5">5秒</SelectItem>
                  <SelectItem value="10">10秒</SelectItem>
                  <SelectItem value="30">30秒</SelectItem>
                  <SelectItem value="60">1分钟</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 频率控制 */}
      <Card>
        <CardHeader>
          <CardTitle>频率控制</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">每日限额</Label>
              <Input
                id="dailyLimit"
                type="number"
                placeholder="每日最大获客数量"
                value={formData.dailyLimit}
                onChange={(e) => handleChange("dailyLimit", Number.parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intervalTime">间隔时间（秒）</Label>
              <Input
                id="intervalTime"
                type="number"
                placeholder="操作间隔时间"
                value={formData.intervalTime}
                onChange={(e) => handleChange("intervalTime", Number.parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
