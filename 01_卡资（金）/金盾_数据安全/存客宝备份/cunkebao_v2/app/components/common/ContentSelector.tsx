"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Plus, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface ContentTarget {
  id: string
  avatar: string
  name?: string
}

export interface ContentLibrary {
  id: string
  name: string
  type?: string
  count?: number
  targets?: ContentTarget[]
}

export interface ContentSelectorProps {
  /** 已选择的内容库 */
  selectedLibraries: ContentLibrary[]
  /** 内容库变更回调 */
  onLibrariesChange: (libraries: ContentLibrary[]) => void
  /** 上一步回调 */
  onPrevious?: () => void
  /** 下一步回调 */
  onNext?: () => void
  /** 保存回调 */
  onSave?: () => void
  /** 取消回调 */
  onCancel?: () => void
  /** 自定义内容库列表，不传则使用模拟数据 */
  contentLibraries?: ContentLibrary[]
  /** 自定义类名 */
  className?: string
  /** 是否使用卡片包装 */
  withCard?: boolean
}

/**
 * 统一的内容选择器组件
 */
export function ContentSelector({
  selectedLibraries = [],
  onLibrariesChange,
  onPrevious,
  onNext,
  onSave,
  onCancel,
  contentLibraries: propContentLibraries,
  className,
  withCard = true,
}: ContentSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // 模拟内容库数据
  const defaultContentLibraries: ContentLibrary[] = [
    {
      id: "1",
      name: "卡若朋友圈",
      type: "朋友圈",
      count: 307,
      targets: [{ id: "t1", avatar: "/placeholder.svg?height=40&width=40&query=avatar1" }],
    },
    {
      id: "2",
      name: "业务推广内容",
      type: "朋友圈",
      count: 156,
      targets: [
        { id: "t2", avatar: "/placeholder.svg?height=40&width=40&query=avatar2" },
        { id: "t3", avatar: "/placeholder.svg?height=40&width=40&query=avatar3" },
      ],
    },
    {
      id: "3",
      name: "产品介绍",
      type: "群发",
      count: 42,
      targets: [
        { id: "t4", avatar: "/placeholder.svg?height=40&width=40&query=avatar4" },
        { id: "t5", avatar: "/placeholder.svg?height=40&width=40&query=avatar5" },
      ],
    },
  ]

  const contentLibraries = propContentLibraries || defaultContentLibraries

  const handleAddLibrary = (library: ContentLibrary) => {
    if (!selectedLibraries.some((l) => l.id === library.id)) {
      onLibrariesChange([...selectedLibraries, library])
    }
    setIsDialogOpen(false)
  }

  const handleRemoveLibrary = (libraryId: string) => {
    onLibrariesChange(selectedLibraries.filter((library) => library.id !== libraryId))
  }

  const filteredLibraries = contentLibraries.filter((library) =>
    library.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const ContentSelectorContent = () => (
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

      <div className="overflow-x-auto">
        {selectedLibraries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">序号</TableHead>
                <TableHead>内容库名称</TableHead>
                {contentLibraries[0]?.type && <TableHead>类型</TableHead>}
                {contentLibraries[0]?.count && <TableHead>内容数量</TableHead>}
                <TableHead>采集对象</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedLibraries.map((library, index) => (
                <TableRow key={library.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{library.name}</TableCell>
                  {contentLibraries[0]?.type && <TableCell>{library.type}</TableCell>}
                  {contentLibraries[0]?.count && <TableCell>{library.count}</TableCell>}
                  <TableCell>
                    <div className="flex -space-x-2 flex-wrap">
                      {library.targets?.map((target) => (
                        <div key={target.id} className="w-10 h-10 rounded-md overflow-hidden border-2 border-white">
                          <img
                            src={target.avatar || "/placeholder.svg"}
                            alt={target.name || "Target"}
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

      {(onPrevious || onNext || onSave || onCancel) && (
        <div className="flex space-x-2 justify-end mt-4">
          {onPrevious && (
            <Button type="button" variant="outline" onClick={onPrevious}>
              上一步
            </Button>
          )}
          {onNext && (
            <Button type="button" onClick={onNext} disabled={selectedLibraries.length === 0}>
              下一步
            </Button>
          )}
          {onSave && (
            <Button type="button" variant="outline" onClick={onSave}>
              保存
            </Button>
          )}
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {withCard ? (
        <Card className={className}>
          <CardContent className="p-4 sm:p-6">
            <ContentSelectorContent />
          </CardContent>
        </Card>
      ) : (
        <div className={className}>
          <ContentSelectorContent />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">序号</TableHead>
                    <TableHead>内容库名称</TableHead>
                    {contentLibraries[0]?.type && <TableHead>类型</TableHead>}
                    {contentLibraries[0]?.count && <TableHead>内容数量</TableHead>}
                    <TableHead>采集对象</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLibraries.map((library, index) => (
                    <TableRow key={library.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{library.name}</TableCell>
                      {contentLibraries[0]?.type && <TableCell>{library.type}</TableCell>}
                      {contentLibraries[0]?.count && <TableCell>{library.count}</TableCell>}
                      <TableCell>
                        <div className="flex -space-x-2 flex-wrap">
                          {library.targets?.map((target) => (
                            <div key={target.id} className="w-10 h-10 rounded-md overflow-hidden border-2 border-white">
                              <img
                                src={target.avatar || "/placeholder.svg"}
                                alt={target.name || "Target"}
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
                          className="whitespace-nowrap"
                        >
                          {selectedLibraries.some((l) => l.id === library.id) ? "已选择" : "选择"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
