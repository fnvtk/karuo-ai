"use client"

import { useEffect, useState } from "react"

interface VoiceRecognitionProps {
  onResult: (text: string) => void
  onStop: () => void
}

export function VoiceRecognition({ onResult, onStop }: VoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(true)

  useEffect(() => {
    // 模拟语音识别
    const timer = setTimeout(() => {
      const mockResults = [
        "你好，我想了解一下私域运营的基本策略",
        "请帮我分析一下最近的销售数据",
        "我需要一份客户画像分析报告",
        "如何提高朋友圈内容的互动率？",
        "帮我生成一个营销方案",
      ]

      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)]
      onResult(randomResult)
      setIsListening(false)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [onResult])

  useEffect(() => {
    if (!isListening) {
      onStop()
    }
  }, [isListening, onStop])

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative bg-blue-500 rounded-full w-20 h-20 flex items-center justify-center">
              <div className="w-4 h-16 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">正在聆听...</h3>
          <p className="text-gray-500 text-center">请说出您的问题或指令，语音识别将自动结束</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onStop}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
