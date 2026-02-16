"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface ContentLibrarySelectionProps {
  selectedLibraries: string[]
  onChange: (libraries: string[]) => void
  onComplete: () => void
  onPrev: () => void
}

export function ContentLibrarySelection({
  selectedLibraries,
  onChange,
  onComplete,
  onPrev,
}: ContentLibrarySelectionProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input placeholder="选择内容库" className="pl-9" />
      </div>

      <div className="min-h-[300px] flex items-center justify-center text-gray-400">选择内容库组件将在这里实现</div>

      <div className="flex space-x-3 mt-8">
        <Button variant="outline" onClick={onPrev} className="flex-1">
          上一步
        </Button>
        <Button onClick={onComplete} className="flex-1">
          完成
        </Button>
      </div>
    </div>
  )
}
