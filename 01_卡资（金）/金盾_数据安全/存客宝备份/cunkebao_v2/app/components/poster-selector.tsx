"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Plus } from "lucide-react"

interface PosterTemplate {
  id: string
  title: string
  type: "领取" | "了解"
  imageUrl: string
}

interface PosterSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (template: PosterTemplate) => void
}

const templates: PosterTemplate[] = [
  {
    id: "1",
    title: "点击领取",
    type: "领取",
    imageUrl: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "2",
    title: "点击了解",
    type: "了解",
    imageUrl: "/placeholder.svg?height=400&width=300",
  },
  // ... 其他模板
]

export function PosterSelector({ open, onOpenChange, onSelect }: PosterSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>选择海报</DialogTitle>
        </DialogHeader>

        <div>
          <h3 className="text-sm text-gray-500 mb-4">点击下方海报使用该模板</h3>
          <div className="grid grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group relative cursor-pointer"
                onClick={() => {
                  onSelect(template)
                  onOpenChange(false)
                }}
              >
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={template.imageUrl || "/placeholder.svg"}
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 bg-black/50 group-hover:opacity-100 transition-opacity">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium">{template.title}</div>
                  <div className="text-sm text-gray-500">{template.type}类型</div>
                </div>
              </div>
            ))}
            {/* 添加自定义海报按钮 */}
            <div className="group relative cursor-pointer">
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Plus className="w-12 h-12" />
                  <p className="mt-2 text-sm">上传自定义海报</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button>新建海报</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
