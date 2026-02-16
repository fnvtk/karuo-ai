"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

interface SpeechToTextProcessorProps {
  audioUrl: string
  onTranscriptReady: (transcript: string) => void
  onQuestionExtracted: (question: string) => void
  enabled: boolean
}

export function SpeechToTextProcessor({
  audioUrl,
  onTranscriptReady,
  onQuestionExtracted,
  enabled = true,
}: SpeechToTextProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !audioUrl) return

    const processAudio = async () => {
      try {
        setIsProcessing(true)
        setError(null)

        // 模拟API调用延迟
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 模拟转录结果
        const mockTranscript = `
客服: 您好，这里是XX公司客服，请问有什么可以帮到您？
客户: 请问贵公司的产品有什么特点？
客服: 我们的产品主要有以下几个特点：首先，质量非常可靠；其次，价格比较有竞争力；第三，售后服务非常完善。
客户: 那你们的价格是怎么样的？
客服: 我们有多种套餐可以选择，基础版每月只需99元，高级版每月299元，具体可以根据您的需求来选择。
客户: 好的，我了解了，谢谢。
客服: 不客气，如果您有兴趣，我可以添加您的微信，给您发送更详细的产品资料。
客户: 可以的，谢谢。
客服: 好的，稍后我会添加您为好友，再次感谢您的咨询。
`
        onTranscriptReady(mockTranscript)

        // 提取首句问题
        const questionMatch = mockTranscript.match(/客户: (.*?)\n/)
        if (questionMatch && questionMatch[1]) {
          onQuestionExtracted(questionMatch[1])
        } else {
          onQuestionExtracted("未识别到有效问题")
        }

        setIsProcessing(false)
      } catch (err) {
        setError("处理音频时出错")
        setIsProcessing(false)
        toast({
          title: "处理失败",
          description: "语音转文字处理失败，请重试",
          variant: "destructive",
        })
      }
    }

    processAudio()
  }, [audioUrl, enabled, onTranscriptReady, onQuestionExtracted])

  return null // 这是一个功能性组件，不渲染任何UI
}
