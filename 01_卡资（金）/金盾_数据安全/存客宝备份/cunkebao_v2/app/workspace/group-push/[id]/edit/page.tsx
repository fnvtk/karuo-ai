"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StepIndicator } from "../../components/step-indicator"
import { MessageEditor } from "../../components/message-editor"
import { FriendSelector } from "../../components/friend-selector"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const steps = ["推送信息", "选择好友"]

// 模拟数据
const mockPushTasks = {
  "1": {
    id: "1",
    name: "618活动推广消息",
    content: {
      text: "618年中大促，全场商品5折起！限时抢购，先到先得！",
      images: ["/placeholder.svg?height=200&width=200"],
      video: null,
      link: "https://example.com/618",
    },
    selectedFriends: ["1", "3", "5"],
    pushTime: "2025-06-18 10:00:00",
    progress: 100,
    status: "已完成",
  },
  "2": {
    id: "2",
    name: "新品上市通知",
    content: {
      text: "我们的新产品已经上市，快来体验吧！",
      images: [],
      video: "/placeholder.svg?height=400&width=400",
      link: null,
    },
    selectedFriends: ["2", "4", "6", "8"],
    pushTime: "2025-03-25 09:30:00",
    progress: 75,
    status: "进行中",
  },
}

export default function EditPushPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [taskName, setTaskName] = useState("")
  const [messageContent, setMessageContent] = useState({
    text: "",
    images: [],
    video: null,
    link: null,
  })
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      const task = mockPushTasks[params.id as keyof typeof mockPushTasks]
      if (task) {
        setTaskName(task.name)
        setMessageContent(task.content)
        setSelectedFriends(task.selectedFriends)
      }
      setLoading(false)
    }, 500)
  }, [params.id])

  const handleNext = () => {
    if (currentStep === 0) {
      // 验证第一步
      if (!taskName.trim()) {
        toast({
          title: "请输入任务名称",
          variant: "destructive",
        })
        return
      }

      if (!messageContent.text && messageContent.images.length === 0 && !messageContent.video && !messageContent.link) {
        toast({
          title: "请添加至少一种消息内容",
          variant: "destructive",
        })
        return
      }
    }

    setCurrentStep((prev) => prev + 1)
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1)
  }

  const handleSubmit = () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "请选择至少一个好友",
        variant: "destructive",
      })
      return
    }

    // 模拟提交
    toast({
      title: "推送任务更新成功",
      description: `已更新推送任务 "${taskName}"`,
    })

    // 跳转回列表页
    router.push("/workspace/group-push")
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-6 relative">
        <Button variant="ghost" size="icon" onClick={() => router.push("/workspace/group-push")} className="mr-auto">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">编辑推送</h1>
        <div className="w-10"></div> {/* 占位元素，保持标题居中 */}
      </div>

      <StepIndicator currentStep={currentStep} steps={steps} />

      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 ? (
            <div className="space-y-6">
              <div>
                <Label htmlFor="task-name">任务名称</Label>
                <Input
                  id="task-name"
                  placeholder="请输入任务名称"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>

              <div>
                <Label>消息内容</Label>
                <MessageEditor onMessageChange={setMessageContent} defaultValues={messageContent} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  下一步
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <FriendSelector onSelectionChange={setSelectedFriends} defaultSelectedFriendIds={selectedFriends} />

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  上一步
                </Button>
                <Button onClick={handleSubmit}>
                  <Check className="mr-2 h-4 w-4" />
                  确认
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
