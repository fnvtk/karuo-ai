"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageSquare,
  ImageIcon,
  Video,
  FileText,
  Link2,
  Users,
  AppWindowIcon as Window,
  Plus,
  X,
  Upload,
  Clock,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

interface MessageContent {
  id: string
  type: "text" | "image" | "video" | "file" | "miniprogram" | "link" | "group"
  content: string
  sendInterval?: number
  intervalUnit?: "seconds" | "minutes"
  scheduledTime?: {
    hour: number
    minute: number
    second: number
  }
  title?: string
  description?: string
  address?: string
  coverImage?: string
  groupId?: string
  linkUrl?: string
}

interface DayPlan {
  day: number
  messages: MessageContent[]
}

interface MessageSettingsProps {
  formData: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

// 消息类型配置
const messageTypes = [
  { id: "text", icon: MessageSquare, label: "文本" },
  { id: "image", icon: ImageIcon, label: "图片" },
  { id: "video", icon: Video, label: "视频" },
  { id: "file", icon: FileText, label: "文件" },
  { id: "miniprogram", icon: Window, label: "小程序" },
  { id: "link", icon: Link2, label: "链接" },
  { id: "group", icon: Users, label: "邀请入群" },
]

// 模拟群组数据
const mockGroups = [
  { id: "1", name: "产品交流群1", memberCount: 156 },
  { id: "2", name: "产品交流群2", memberCount: 234 },
  { id: "3", name: "产品交流群3", memberCount: 89 },
]

export function MessageSettings({ formData, onChange, onNext, onPrev }: MessageSettingsProps) {
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([
    {
      day: 0,
      messages: [
        {
          id: "1",
          type: "text",
          content: "",
          sendInterval: 5,
          intervalUnit: "seconds", // 默认改为秒
        },
      ],
    },
  ])
  const [isAddDayPlanOpen, setIsAddDayPlanOpen] = useState(false)
  const [isGroupSelectOpen, setIsGroupSelectOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState("")

  // 添加新消息
  const handleAddMessage = (dayIndex: number, type = "text") => {
    const updatedPlans = [...dayPlans]
    const newMessage: MessageContent = {
      id: Date.now().toString(),
      type: type as MessageContent["type"],
      content: "",
    }

    if (dayPlans[dayIndex].day === 0) {
      // 即时消息使用间隔设置
      newMessage.sendInterval = 5
      newMessage.intervalUnit = "seconds" // 默认改为秒
    } else {
      // 非即时消息使用具体时间设置
      newMessage.scheduledTime = {
        hour: 9,
        minute: 0,
        second: 0,
      }
    }

    updatedPlans[dayIndex].messages.push(newMessage)
    setDayPlans(updatedPlans)
    onChange({ ...formData, messagePlans: updatedPlans })
  }

  // 更新消息内容
  const handleUpdateMessage = (dayIndex: number, messageIndex: number, updates: Partial<MessageContent>) => {
    const updatedPlans = [...dayPlans]
    updatedPlans[dayIndex].messages[messageIndex] = {
      ...updatedPlans[dayIndex].messages[messageIndex],
      ...updates,
    }
    setDayPlans(updatedPlans)
    onChange({ ...formData, messagePlans: updatedPlans })
  }

  // 删除消息
  const handleRemoveMessage = (dayIndex: number, messageIndex: number) => {
    const updatedPlans = [...dayPlans]
    updatedPlans[dayIndex].messages.splice(messageIndex, 1)
    setDayPlans(updatedPlans)
    onChange({ ...formData, messagePlans: updatedPlans })
  }

  // 切换时间单位
  const toggleIntervalUnit = (dayIndex: number, messageIndex: number) => {
    const message = dayPlans[dayIndex].messages[messageIndex]
    const newUnit = message.intervalUnit === "minutes" ? "seconds" : "minutes"
    handleUpdateMessage(dayIndex, messageIndex, { intervalUnit: newUnit })
  }

  // 添加新的天数计划
  const handleAddDayPlan = () => {
    const newDay = dayPlans.length
    setDayPlans([
      ...dayPlans,
      {
        day: newDay,
        messages: [
          {
            id: Date.now().toString(),
            type: "text",
            content: "",
            scheduledTime: {
              hour: 9,
              minute: 0,
              second: 0,
            },
          },
        ],
      },
    ])
    setIsAddDayPlanOpen(false)
    toast({
      title: "添加成功",
      description: `已添加第${newDay}天的消息计划`,
    })
  }

  // 选择群组
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId)
    setIsGroupSelectOpen(false)
    toast({
      title: "选择成功",
      description: `已选择群组：${mockGroups.find((g) => g.id === groupId)?.name}`,
    })
  }

  // 处理文件上传
  const handleFileUpload = (dayIndex: number, messageIndex: number, type: "image" | "video" | "file") => {
    // 模拟文件上传
    toast({
      title: "上传成功",
      description: `${type === "image" ? "图片" : type === "video" ? "视频" : "文件"}上传成功`,
    })
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">消息设置</h2>
          <Button variant="outline" size="icon" onClick={() => setIsAddDayPlanOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="0" className="w-full">
          <TabsList className="w-full">
            {dayPlans.map((plan) => (
              <TabsTrigger key={plan.day} value={plan.day.toString()} className="flex-1">
                {plan.day === 0 ? "即时消息" : `第${plan.day}天`}
              </TabsTrigger>
            ))}
          </TabsList>

          {dayPlans.map((plan, dayIndex) => (
            <TabsContent key={plan.day} value={plan.day.toString()}>
              <div className="space-y-4">
                {plan.messages.map((message, messageIndex) => (
                  <div key={message.id} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {plan.day === 0 ? (
                          <>
                            <Label>间隔</Label>
                            <Input
                              type="number"
                              value={message.sendInterval}
                              onChange={(e) =>
                                handleUpdateMessage(dayIndex, messageIndex, { sendInterval: Number(e.target.value) })
                              }
                              className="w-20"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleIntervalUnit(dayIndex, messageIndex)}
                              className="flex items-center space-x-1"
                            >
                              <Clock className="h-3 w-3" />
                              <span>{message.intervalUnit === "minutes" ? "分钟" : "秒"}</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Label>发送时间</Label>
                            <div className="flex items-center space-x-1">
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                value={message.scheduledTime?.hour || 0}
                                onChange={(e) =>
                                  handleUpdateMessage(dayIndex, messageIndex, {
                                    scheduledTime: {
                                      ...(message.scheduledTime || { hour: 0, minute: 0, second: 0 }),
                                      hour: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16"
                              />
                              <span>:</span>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={message.scheduledTime?.minute || 0}
                                onChange={(e) =>
                                  handleUpdateMessage(dayIndex, messageIndex, {
                                    scheduledTime: {
                                      ...(message.scheduledTime || { hour: 0, minute: 0, second: 0 }),
                                      minute: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16"
                              />
                              <span>:</span>
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={message.scheduledTime?.second || 0}
                                onChange={(e) =>
                                  handleUpdateMessage(dayIndex, messageIndex, {
                                    scheduledTime: {
                                      ...(message.scheduledTime || { hour: 0, minute: 0, second: 0 }),
                                      second: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-16"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMessage(dayIndex, messageIndex)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg">
                      {messageTypes.map((type) => (
                        <Button
                          key={type.id}
                          variant={message.type === type.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleUpdateMessage(dayIndex, messageIndex, { type: type.id as any })}
                          className="flex flex-col items-center p-2 h-auto"
                        >
                          <type.icon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>

                    {message.type === "text" && (
                      <Textarea
                        value={message.content}
                        onChange={(e) => handleUpdateMessage(dayIndex, messageIndex, { content: e.target.value })}
                        placeholder="请输入消息内容"
                        className="min-h-[100px]"
                      />
                    )}

                    {message.type === "miniprogram" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>
                            标题<span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={message.title}
                            onChange={(e) => handleUpdateMessage(dayIndex, messageIndex, { title: e.target.value })}
                            placeholder="请输入小程序标题"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>描述</Label>
                          <Input
                            value={message.description}
                            onChange={(e) =>
                              handleUpdateMessage(dayIndex, messageIndex, { description: e.target.value })
                            }
                            placeholder="请输入小程序描述"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            链接<span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={message.address}
                            onChange={(e) => handleUpdateMessage(dayIndex, messageIndex, { address: e.target.value })}
                            placeholder="请输入小程序路径"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            封面<span className="text-red-500">*</span>
                          </Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {message.coverImage ? (
                              <div className="relative">
                                <img
                                  src={message.coverImage || "/placeholder.svg"}
                                  alt="封面"
                                  className="max-w-[200px] mx-auto rounded-lg"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => handleUpdateMessage(dayIndex, messageIndex, { coverImage: undefined })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full h-[120px]"
                                onClick={() => handleFileUpload(dayIndex, messageIndex, "image")}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                上传封面
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {message.type === "link" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>
                            标题<span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={message.title}
                            onChange={(e) => handleUpdateMessage(dayIndex, messageIndex, { title: e.target.value })}
                            placeholder="请输入链接标题"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>描述</Label>
                          <Input
                            value={message.description}
                            onChange={(e) =>
                              handleUpdateMessage(dayIndex, messageIndex, { description: e.target.value })
                            }
                            placeholder="请输入链接描述"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            链接<span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={message.linkUrl}
                            onChange={(e) => handleUpdateMessage(dayIndex, messageIndex, { linkUrl: e.target.value })}
                            placeholder="请输入链接地址"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            封面<span className="text-red-500">*</span>
                          </Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {message.coverImage ? (
                              <div className="relative">
                                <img
                                  src={message.coverImage || "/placeholder.svg"}
                                  alt="封面"
                                  className="max-w-[200px] mx-auto rounded-lg"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => handleUpdateMessage(dayIndex, messageIndex, { coverImage: undefined })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className="w-full h-[120px]"
                                onClick={() => handleFileUpload(dayIndex, messageIndex, "image")}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                上传封面
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {message.type === "group" && (
                      <div className="space-y-2">
                        <Label>
                          选择群聊<span className="text-red-500">*</span>
                        </Label>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setIsGroupSelectOpen(true)}
                        >
                          {selectedGroupId ? mockGroups.find((g) => g.id === selectedGroupId)?.name : "选择邀请入的群"}
                        </Button>
                      </div>
                    )}

                    {(message.type === "image" || message.type === "video" || message.type === "file") && (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center">
                        <Button
                          variant="outline"
                          className="w-full h-[120px]"
                          onClick={() => handleFileUpload(dayIndex, messageIndex, message.type as any)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          上传{message.type === "image" ? "图片" : message.type === "video" ? "视频" : "文件"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <Button variant="outline" onClick={() => handleAddMessage(dayIndex)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  添加消息
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
          <Button onClick={onNext}>下一步</Button>
        </div>
      </div>

      {/* 添加天数计划弹窗 */}
      <Dialog open={isAddDayPlanOpen} onOpenChange={setIsAddDayPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加消息计划</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">选择要添加的消息计划类型</p>
            <Button onClick={handleAddDayPlan} className="w-full">
              添加第 {dayPlans.length} 天计划
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 选择群聊弹窗 */}
      <Dialog open={isGroupSelectOpen} onOpenChange={setIsGroupSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择群聊</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {mockGroups.map((group) => (
                <div
                  key={group.id}
                  className={`p-4 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    selectedGroupId === group.id ? "bg-blue-50 border border-blue-200" : ""
                  }`}
                  onClick={() => handleSelectGroup(group.id)}
                >
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-gray-500">成员数：{group.memberCount}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupSelectOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsGroupSelectOpen(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
