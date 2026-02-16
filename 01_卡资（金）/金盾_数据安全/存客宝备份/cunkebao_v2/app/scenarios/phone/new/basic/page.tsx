"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Phone, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

// 电话通话标签
const phoneCallTags = [
  { id: "tag-1", name: "咨询", color: "bg-blue-100 text-blue-800" },
  { id: "tag-2", name: "投诉", color: "bg-red-100 text-red-800" },
  { id: "tag-3", name: "合作", color: "bg-green-100 text-green-800" },
  { id: "tag-4", name: "价格", color: "bg-orange-100 text-orange-800" },
  { id: "tag-5", name: "售后", color: "bg-purple-100 text-purple-800" },
  { id: "tag-6", name: "订单", color: "bg-yellow-100 text-yellow-800" },
  { id: "tag-7", name: "物流", color: "bg-teal-100 text-teal-800" },
  { id: "tag-8", name: "退款", color: "bg-pink-100 text-pink-800" },
  { id: "tag-9", name: "技术支持", color: "bg-indigo-100 text-indigo-800" },
  { id: "tag-10", name: "其他", color: "bg-gray-100 text-gray-800" },
]

export default function PhoneAcquisitionBasicPage() {
  const router = useRouter()
  const [planName, setPlanName] = useState(`电话获客${new Date().toLocaleDateString("zh-CN").replace(/\//g, "")}`)
  const [enabled, setEnabled] = useState(true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [phoneCallType, setPhoneCallType] = useState("both")
  const [isPhoneSettingsOpen, setIsPhoneSettingsOpen] = useState(false)

  // 电话获客设置
  const [phoneSettings, setPhoneSettings] = useState({
    autoAdd: true,
    speechToText: true,
    questionExtraction: true,
  })

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  // 处理通话类型选择
  const handleCallTypeToggle = (type: string) => {
    if (phoneCallType === "both") {
      setPhoneCallType(type === "outbound" ? "inbound" : "outbound")
    } else if (phoneCallType === type) {
      setPhoneCallType("both")
    } else {
      setPhoneCallType("both")
    }
  }

  // 处理电话获客设置更新
  const handlePhoneSettingsUpdate = () => {
    setIsPhoneSettingsOpen(false)
    toast({
      title: "设置已更新",
      description: "电话获客设置已保存",
    })
  }

  // 处理下一步
  const handleNext = () => {
    if (!planName.trim()) {
      toast({
        title: "请输入计划名称",
        variant: "destructive",
      })
      return
    }

    if (selectedTags.length === 0) {
      toast({
        title: "请至少选择一个通话标签",
        variant: "destructive",
      })
      return
    }

    // 保存数据并跳转到下一步
    const formData = {
      scenario: "phone",
      planName,
      enabled,
      phoneSettings,
      phoneCallType,
      phoneTags: selectedTags,
    }

    // 这里应该保存到状态管理或通过路由传递
    router.push("/plans/new?step=2&scenario=phone")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[390px] mx-auto bg-white min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="ml-2 text-lg font-medium">电话获客设置</h1>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">电话场景</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 pb-20">
          <Card className="p-6">
            <div className="space-y-6">
              {/* 计划名称 */}
              <div>
                <Label htmlFor="planName">计划名称</Label>
                <Input
                  id="planName"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="请输入计划名称"
                  className="mt-2"
                />
              </div>

              {/* 电话获客设置卡片 */}
              <Card className="p-4 border-blue-100 bg-blue-50/50">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium text-blue-700">电话获客设置</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPhoneSettingsOpen(true)}
                    className="flex items-center gap-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    修改设置
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.autoAdd ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span>自动添加客户</span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.autoAdd ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {phoneSettings.autoAdd ? "已开启" : "已关闭"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.speechToText ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span>语音转文字</span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.speechToText ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {phoneSettings.speechToText ? "已开启" : "已关闭"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.questionExtraction ? "bg-green-500" : "bg-gray-300"}`}
                      ></div>
                      <span>问题提取</span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.questionExtraction ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {phoneSettings.questionExtraction ? "已开启" : "已关闭"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  提示：电话获客功能将自动记录来电信息，并根据设置执行相应操作
                </p>
              </Card>

              {/* 通话类型选择 */}
              <div>
                <Label className="text-base mb-2 block">通话类型</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div
                    className={`p-3 border rounded-lg text-center cursor-pointer ${
                      phoneCallType === "outbound" || phoneCallType === "both"
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => handleCallTypeToggle("outbound")}
                  >
                    <div className="font-medium">发起外呼</div>
                    <div className="text-sm text-gray-500">主动向客户发起电话</div>
                  </div>
                  <div
                    className={`p-3 border rounded-lg text-center cursor-pointer ${
                      phoneCallType === "inbound" || phoneCallType === "both"
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => handleCallTypeToggle("inbound")}
                  >
                    <div className="font-medium">接收来电</div>
                    <div className="text-sm text-gray-500">接听客户的来电</div>
                  </div>
                </div>
              </div>

              {/* 通话标签 */}
              <div>
                <Label className="text-base mb-2 block">通话标签（可多选）</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {phoneCallTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${
                        selectedTags.includes(tag.id) ? tag.color : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.name}
                    </div>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">已选择 {selectedTags.length} 个标签</p>
                )}
              </div>

              {/* 是否启用 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">是否启用</Label>
                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
              </div>

              {/* 下一步按钮 */}
              <Button className="w-full h-12 text-base" onClick={handleNext}>
                下一步
              </Button>
            </div>
          </Card>
        </div>

        {/* 电话获客设置对话框 */}
        <Dialog open={isPhoneSettingsOpen} onOpenChange={setIsPhoneSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>电话获客设置</DialogTitle>
              <DialogDescription>配置电话获客的自动化功能，提高获客效率</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="space-y-1">
                  <Label htmlFor="auto-add" className="font-medium">
                    自动添加客户
                  </Label>
                  <p className="text-sm text-gray-500">来电后自动将客户添加为微信好友</p>
                  <p className="text-xs text-blue-600">推荐：开启此功能可提高转化率约30%</p>
                </div>
                <Switch
                  id="auto-add"
                  checked={phoneSettings.autoAdd}
                  onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, autoAdd: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="space-y-1">
                  <Label htmlFor="speech-to-text" className="font-medium">
                    语音转文字
                  </Label>
                  <p className="text-sm text-gray-500">自动将通话内容转换为文字记录</p>
                  <p className="text-xs text-blue-600">支持普通话、粤语等多种方言识别</p>
                </div>
                <Switch
                  id="speech-to-text"
                  checked={phoneSettings.speechToText}
                  onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, speechToText: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="space-y-1">
                  <Label htmlFor="question-extraction" className="font-medium">
                    问题提取
                  </Label>
                  <p className="text-sm text-gray-500">自动从通话中提取客户的首句问题</p>
                  <p className="text-xs text-blue-600">AI智能识别客户意图，提高回复精准度</p>
                </div>
                <Switch
                  id="question-extraction"
                  checked={phoneSettings.questionExtraction}
                  onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, questionExtraction: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
            <DialogFooter className="flex space-x-2 pt-2">
              <Button variant="outline" onClick={() => setIsPhoneSettingsOpen(false)} className="flex-1">
                取消
              </Button>
              <Button onClick={handlePhoneSettingsUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700">
                保存设置
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
