"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Plus, Trash2 } from "lucide-react"
import type { ContentLibrary } from "@/types/group-sync"

// 模拟数据
const mockContentLibraries: ContentLibrary[] = [
  {
    id: "1",
    name: "测试11",
    targets: [{ id: "t1", avatar: "/placeholder.svg?height=40&width=40" }],
  },
  {
    id: "2",
    name: "测试166666",
    targets: [
      { id: "t2", avatar: "/placeholder.svg?height=40&width=40" },
      { id: "t3", avatar: "/placeholder.svg?height=40&width=40" },
      { id: "t4", avatar: "/placeholder.svg?height=40&width=40" },
    ],
  },
  {
    id: "3",
    name: "产品介绍",
    targets: [
      { id: "t5", avatar: "/placeholder.svg?height=40&width=40" },
      { id: "t6", avatar: "/placeholder.svg?height=40&width=40" },
    ],
  },
]

interface ContentSelectorProps {
  selectedLibraries: ContentLibrary[]
  onLibrariesChange: (libraries: ContentLibrary[]) => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  onCancel: () => void
}

export function ContentSelector({
  selectedLibraries = [],
  onLibrariesChange,
  onPrevious,
  onNext,
  onSave,
  onCancel,
}: ContentSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const handleAddLibrary = (library: ContentLibrary) => {
    if (!selectedLibraries.some((l) => l.id === library.id)) {
      onLibrariesChange([...selectedLibraries, library])
    }
    setIsDialogOpen(false)
  }

  const handleRemoveLibrary = (libraryId: string) => {
    onLibrariesChange(selectedLibraries.filter((library) => library.id !== libraryId))
  }

  const filteredLibraries = mockContentLibraries.filter((library) =>
    library.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-500 mr-1">*</span>
            <span className="font-medium">选择内容库:</span>
          </div>
          <Button variant="default" size="sm" onClick={() => setIsDialogOpen(true)} className="flex items-center">
            <Plus className="h-4 w-4 mr-1" />
            选择内容库
          </Button>
        </div>

        {selectedLibraries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">序号</TableHead>
                <TableHead>内容库名称</TableHead>
                <TableHead>采集对象</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedLibraries.map((library, index) => (
                <TableRow key={library.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{library.name}</TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {library.targets.map((target) => (
                        <div key={target.id} className="w-10 h-10 rounded-md overflow-hidden border-2 border-white">
                          <img
                            src={target.avatar || "/placeholder.svg?height=40&width=40"}
                            alt="Target"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLibrary(library.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="border rounded-md p-8 text-center text-gray-500">请点击"选择内容库"按钮添加内容库</div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button type="button" variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button type="button" onClick={onNext}>
          下一步
        </Button>
        <Button type="button" variant="outline" onClick={onSave}>
          保存
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>选择内容库</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索内容库名称"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">序号</TableHead>
                  <TableHead>内容库名称</TableHead>
                  <TableHead>采集对象</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLibraries.map((library, index) => (
                  <TableRow key={library.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{library.name}</TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {library.targets.map((target) => (
                          <div key={target.id} className="w-10 h-10 rounded-md overflow-hidden border-2 border-white">
                            <img
                              src={target.avatar || "/placeholder.svg?height=40&width=40"}
                              alt="Target"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddLibrary(library)}
                        disabled={selectedLibraries.some((l) => l.id === library.id)}
                      >
                        {selectedLibraries.some((l) => l.id === library.id) ? "已选择" : "选择"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
