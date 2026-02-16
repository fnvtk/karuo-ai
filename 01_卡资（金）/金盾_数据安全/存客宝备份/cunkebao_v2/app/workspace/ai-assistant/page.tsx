"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Image, Mic, Send, FileText, MicOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { VoiceRecognition } from "@/app/components/VoiceRecognition"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  attachments?: {
    type: "image" | "document"
    name: string
    url: string
  }[]
}

export default function AIAssistantPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "你好！我是你的AI助手，有什么可以帮助你的吗？",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !isRecording) return

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    setInputValue("")
    setIsLoading(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `我已收到你的消息："${newUserMessage.content}"。这是一个模拟的AI回复。`,
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  const handleVoiceInput = (text: string) => {
    setInputValue((prev) => prev + text)
    setIsRecording(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = () => {
      const newUserMessage: Message = {
        id: Date.now().toString(),
        content: type === "image" ? "我发送了一张图片" : `我上传了文档：${file.name}`,
        sender: "user",
        timestamp: new Date(),
        attachments: [
          {
            type,
            name: file.name,
            url: reader.result as string,
          },
        ],
      }

      setMessages((prev) => [...prev, newUserMessage])
      setIsLoading(true)

      // 模拟AI响应
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            type === "image"
              ? "我已收到你的图片，正在分析内容..."
              : `我已收到你上传的文档：${file.name}，正在分析内容...`,
          sender: "ai",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
        setIsLoading(false)
      }, 1500)
    }

    reader.readAsDataURL(file)
    e.target.value = "" // 重置文件输入
  }

  const triggerFileUpload = (type: "image" | "document") => {
    if (type === "image") {
      fileInputRef.current?.click()
    } else {
      documentInputRef.current?.click()
    }
  }

  const navigateToKnowledgeBase = () => {
    router.push("/workspace/ai-assistant/knowledge-base")
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">AI对话助手</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/workspace/ai-assistant/knowledge-base")}>
          添加知识库
        </Button>
      </div>

      {/* 聊天区域 */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user" ? "bg-blue-500 text-white" : "bg-white border shadow-sm"
                }`}
              >
                {message.attachments?.map((attachment, index) => (
                  <div key={index} className="mb-2">
                    {attachment.type === "image" ? (
                      <div className="rounded-md overflow-hidden">
                        <img src={attachment.url || "/placeholder.svg"} alt="Uploaded" className="max-w-full h-auto" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <span className="text-sm truncate">{attachment.name}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${message.sender === "user" ? "text-blue-200" : "text-gray-400"}`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-white border shadow-sm">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              className={isRecording ? "bg-red-100 text-red-500" : ""}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => triggerFileUpload("image")}>
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => triggerFileUpload("document")}>
              <FileText className="h-5 w-5" />
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() && !isRecording}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 隐藏的文件上传输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e, "image")}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={documentInputRef}
        onChange={(e) => handleFileUpload(e, "document")}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* 语音识别组件 */}
      {isRecording && <VoiceRecognition onResult={handleVoiceInput} onStop={() => setIsRecording(false)} />}
    </div>
  )
}
