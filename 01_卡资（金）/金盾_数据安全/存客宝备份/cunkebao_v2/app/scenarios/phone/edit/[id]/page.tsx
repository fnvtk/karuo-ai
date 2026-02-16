"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Phone, MessageSquare, Settings, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EditPhoneAcquisitionPlan({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    planName: "",
    phoneNumbers: ["400-123-4567"],
    autoAddEnabled: true,
    speechToTextEnabled: true,
    questionExtractionEnabled: true,
    greetingMessage: "",
    followUpMessages: [],
    addToGroups: [],
    tags: [],
  })

  useEffect(() => {
    // 模拟从API获取计划数据
    const fetchPlanData = async () => {
      try {
        // 这里应该是实际的API调用
        const mockData = {
          planName: "招商电话获客",
          phoneNumbers: ["400-123-4567"],
          autoAddEnabled: true,
          speechToTextEnabled: true,
          questionExtractionEnabled: true,
          greetingMessage: "您好，感谢您的来电咨询，我稍后会添加您为好友，为您提供更详细的资料。",
          followUpMessages: [
            "您好，我是XX公司的客服，刚才接到您的电话，现在方便聊一下吗？",
            "关于您刚才咨询的问题，我这边整理了一些资料，希望对您有所帮助。",
          ],
          addToGroups: ["产品咨询群", "招商合作群"],
          tags: ["电话咨询", "招商意向"],
        }
        setFormData(mockData)
        setLoading(false)
      } catch (error) {
        toast({
          title: "加载失败",
          description: "获取计划数据失败，请重试",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchPlanData()
  }, [])

  const handleSave = async () => {
    try {
      // 这里应该是实际的API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "保存成功",
        description: "电话获客计划已更新",
      })
      router.push(`/scenarios/phone`)
    } catch (error) {
      toast({
        title: "保存失败",
        description: "更新计划失败，请重试",
        variant: "destructive",
      })
    }
  }

  const handleAddPhoneNumber = () => {
    setFormData({
      ...formData,
      phoneNumbers: [...formData.phoneNumbers, ""],
    })
  }

  const handlePhoneNumberChange = (index: number, value: string) => {
    const updatedPhoneNumbers = [...formData.phoneNumbers]
    updatedPhoneNumbers[index] = value
    setFormData({
      ...formData,
      phoneNumbers: updatedPhoneNumbers,
    })
  }

  const handleRemovePhoneNumber = (index: number) => {
    const updatedPhoneNumbers = [...formData.phoneNumbers]
    updatedPhoneNumbers.splice(index, 1)
    setFormData({
      ...formData,
      phoneNumbers: updatedPhoneNumbers,
    })
  }

  const handleAddFollowUpMessage = () => {
    setFormData({
      ...formData,
      followUpMessages: [...formData.followUpMessages, ""],
    })
  }

  const handleFollowUpMessageChange = (index: number, value: string) => {
    const updatedMessages = [...formData.followUpMessages]
    updatedMessages[index] = value
    setFormData({
      ...formData,
      followUpMessages: updatedMessages,
    })
  }

  const handleRemoveFollowUpMessage = (index: number) => {
    const updatedMessages = [...formData.followUpMessages]
    updatedMessages.splice(index, 1)
    setFormData({
      ...formData,
      followUpMessages: updatedMessages,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[390px] mx-auto bg-white min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-medium">编辑电话获客计划</h1>
          </div>
        </header>

        <div className="flex-1 p-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">
                <Phone className="h-4 w-4 mr-2" />
                基础设置
              </TabsTrigger>
              <TabsTrigger value="message">
                <MessageSquare className="h-4 w-4 mr-2" />
                消息设置
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <Settings className="h-4 w-4 mr-2" />
                高级设置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="planName">计划名称</Label>
                    <Input
                      id="planName"
                      value={formData.planName}
                      onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>接听电话</Label>
                    <div className="space-y-2 mt-1">
                      {formData.phoneNumbers.map((phone, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={phone}
                            onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                            placeholder="输入电话号码"
                          />
                          {formData.phoneNumbers.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePhoneNumber(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              删除
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={handleAddPhoneNumber}>
                        添加电话号码
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-add">自动添加客户</Label>
                        <p className="text-xs text-gray-500">来电后自动将客户添加为微信好友</p>
                      </div>
                      <Switch
                        id="auto-add"
                        checked={formData.autoAddEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoAddEnabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="speech-to-text">语音转文字</Label>
                        <p className="text-xs text-gray-500">自动将通话内容转换为文字记录</p>
                      </div>
                      <Switch
                        id="speech-to-text"
                        checked={formData.speechToTextEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, speechToTextEnabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="question-extraction">问题提取</Label>
                        <p className="text-xs text-gray-500">自动从通话中提取客户的首句问题</p>
                      </div>
                      <Switch
                        id="question-extraction"
                        checked={formData.questionExtractionEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, questionExtractionEnabled: checked })}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="greeting">添加好友后的问候语</Label>
                    <Textarea
                      id="greeting"
                      value={formData.greetingMessage}
                      onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                      placeholder="输入添加好友后的问候语"
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label>后续跟进消息</Label>
                    <div className="space-y-2 mt-1">
                      {formData.followUpMessages.map((message, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">消息 {index + 1}</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFollowUpMessage(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              删除
                            </Button>
                          </div>
                          <Textarea
                            value={message}
                            onChange={(e) => handleFollowUpMessageChange(index, e.target.value)}
                            placeholder="输入跟进消息内容"
                            className="min-h-[80px]"
                          />
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={handleAddFollowUpMessage}>
                        添加跟进消息
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label>添加到群组</Label>
                    <Select
                      value={formData.addToGroups.length > 0 ? "selected" : "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setFormData({ ...formData, addToGroups: [] })
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择群组" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不添加到群组</SelectItem>
                        <SelectItem value="selected">已选择 {formData.addToGroups.length} 个群组</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.addToGroups.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.addToGroups.map((group, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-blue-50 text-blue-700 rounded-full px-3 py-1"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            <span className="text-sm">{group}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-1 p-0 h-4 w-4 rounded-full"
                              onClick={() => {
                                const updatedGroups = [...formData.addToGroups]
                                updatedGroups.splice(index, 1)
                                setFormData({ ...formData, addToGroups: updatedGroups })
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>标签设置</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                          <span className="text-sm">{tag}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 p-0 h-4 w-4 rounded-full"
                            onClick={() => {
                              const updatedTags = [...formData.tags]
                              updatedTags.splice(index, 1)
                              setFormData({ ...formData, tags: updatedTags })
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Input
                        placeholder="添加标签"
                        className="w-32"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value) {
                            e.preventDefault()
                            setFormData({
                              ...formData,
                              tags: [...formData.tags, e.currentTarget.value],
                            })
                            e.currentTarget.value = ""
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-4">
          <Button className="w-full" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
