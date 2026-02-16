"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

interface AIRewriteModalProps {
  isOpen: boolean
  onClose: () => void
  originalContent: string
}

export function AIRewriteModal({ isOpen, onClose, originalContent }: AIRewriteModalProps) {
  const [rewrittenContent, setRewrittenContent] = useState("")

  const handleRewrite = async () => {
    // 这里应该调用 AI 改写 API
    // 为了演示，我们只是简单地反转字符串
    setRewrittenContent(originalContent.split("").reverse().join(""))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">AI 内容改写</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">原始内容：</h3>
            <p className="text-sm text-gray-600">{originalContent}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">改写后内容：</h3>
            <p className="text-sm text-gray-600">{rewrittenContent || '点击"开始改写"按钮生成内容'}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleRewrite}>开始改写</Button>
        </div>
      </Card>
    </div>
  )
}
