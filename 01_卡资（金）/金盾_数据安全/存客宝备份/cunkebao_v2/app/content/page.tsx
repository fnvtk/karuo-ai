"use client"

import { useState } from "react"
import { ChevronLeft, Filter, Search, RefreshCw, Plus, Edit, Trash2, Eye, MoreVertical } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

interface ContentLibrary {
  id: string
  name: string
  source: "friends" | "groups"
  targetAudience: {
    id: string
    nickname: string
    avatar: string
  }[]
  itemCount: number
  lastUpdated: string
  enabled: boolean
}

export default function ContentLibraryPage() {
  const router = useRouter()
  const [libraries, setLibraries] = useState<ContentLibrary[]>([
    {
      id: "129",
      name: "微信好友广告",
      source: "friends",
      targetAudience: [
        { id: "1", nickname: "张三", avatar: "/placeholder.svg?height=40&width=40" },
        { id: "2", nickname: "李四", avatar: "/placeholder.svg?height=40&width=40" },
        { id: "3", nickname: "王五", avatar: "/placeholder.svg?height=40&width=40" },
      ],
      itemCount: 0,
      lastUpdated: "2024-02-09 12:30",
      enabled: false,
    },
    {
      id: "127",
      name: "开发群",
      source: "groups",
      targetAudience: [{ id: "4", nickname: "开发群1", avatar: "/placeholder.svg?height=40&width=40" }],
      itemCount: 0,
      lastUpdated: "2024-02-09 12:30",
      enabled: true,
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [viewLibraryId, setViewLibraryId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [libraryToDelete, setLibraryToDelete] = useState<string | null>(null)

  const handleCreateNew = () => {
    router.push(`/content/new`)
  }

  const handleEdit = (id: string) => {
    router.push(`/content/${id}`)
  }

  const handleDelete = (id: string) => {
    setLibraryToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (libraryToDelete) {
      setLibraries(libraries.filter((lib) => lib.id !== libraryToDelete))
      toast({
        title: "删除成功",
        description: "内容库已成功删除",
      })
    }
    setDeleteDialogOpen(false)
    setLibraryToDelete(null)
  }

  const handleViewMaterials = (id: string) => {
    router.push(`/content/${id}/materials`)
  }

  const handleViewLibrary = (id: string) => {
    setViewLibraryId(id)
  }

  const filteredLibraries = libraries.filter(
    (library) =>
      (activeTab === "all" || library.source === activeTab) &&
      (library.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        library.targetAudience.some((target) => target.nickname.toLowerCase().includes(searchQuery.toLowerCase()))),
  )

  // 查找当前查看的内容库
  const viewingLibrary = viewLibraryId ? libraries.find((lib) => lib.id === viewLibraryId) : null

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">内容库</h1>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            新建
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索内容库..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="friends">微信好友</TabsTrigger>
                <TabsTrigger value="groups">聊天群</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              {filteredLibraries.map((library) => (
                <Card key={library.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{library.name}</h3>
                        <Badge variant={library.enabled ? "success" : "secondary"}>
                          {library.enabled ? "已启用" : "已停用"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <span>来源：</span>
                          <div className="flex -space-x-2 overflow-hidden">
                            {library.targetAudience.slice(0, 3).map((target) => (
                              <Image
                                key={target.id}
                                src={target.avatar || "/placeholder.svg"}
                                alt={target.nickname}
                                width={24}
                                height={24}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                              />
                            ))}
                            {library.targetAudience.length > 3 && (
                              <span className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-gray-400 rounded-full ring-2 ring-white">
                                +{library.targetAudience.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>内容数量：{library.itemCount}</div>
                        <div>更新时间：{library.lastUpdated}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewLibrary(library.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(library.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(library.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewMaterials(library.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看素材
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredLibraries.length === 0 && (
                <div className="text-center py-8 text-gray-500">未找到匹配的内容库</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 查看内容库详情对话框 */}
      <Dialog open={!!viewLibraryId} onOpenChange={(open) => !open && setViewLibraryId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>内容库详情</DialogTitle>
          </DialogHeader>
          {viewingLibrary && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-medium text-lg">{viewingLibrary.name}</h3>
                <Badge variant={viewingLibrary.enabled ? "success" : "secondary"} className="mt-2">
                  {viewingLibrary.enabled ? "已启用" : "已停用"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-700 font-medium">来源</div>
                <div className="flex flex-wrap gap-2">
                  {viewingLibrary.targetAudience.map((target) => (
                    <div key={target.id} className="flex items-center space-x-2 bg-gray-100 p-2 rounded-md">
                      <Image
                        src={target.avatar || "/placeholder.svg"}
                        alt={target.nickname}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span>{target.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-700 font-medium">内容数量</div>
                  <div>{viewingLibrary.itemCount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-700 font-medium">更新时间</div>
                  <div>{viewingLibrary.lastUpdated}</div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setViewLibraryId(null)}>
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    setViewLibraryId(null)
                    handleEdit(viewingLibrary.id)
                  }}
                >
                  编辑
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>您确定要删除此内容库吗？此操作无法撤销，所有相关内容将被永久删除。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
