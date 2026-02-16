"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Bookmark, MoreVertical, Edit, Trash2, Play, Clock, Filter, AlertCircle } from "lucide-react"
import type { FilterScheme, FilterCondition } from "@/types/filter"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FilterSchemeManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyScheme: (conditions: FilterCondition) => void
}

export default function FilterSchemeManager({ open, onOpenChange, onApplyScheme }: FilterSchemeManagerProps) {
  const { toast } = useToast()
  const [schemes, setSchemes] = useState<FilterScheme[]>([])
  const [editingScheme, setEditingScheme] = useState<FilterScheme | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingSchemeId, setDeletingSchemeId] = useState("")

  // 加载方案列表
  useEffect(() => {
    if (open) {
      loadSchemes()
    }
  }, [open])

  const loadSchemes = () => {
    const savedSchemes = localStorage.getItem("filterSchemes")
    if (savedSchemes) {
      const parsedSchemes: FilterScheme[] = JSON.parse(savedSchemes)
      // 按更新时间倒序
      parsedSchemes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setSchemes(parsedSchemes)
    } else {
      setSchemes([])
    }
  }

  // 应用方案
  const handleApplyScheme = (scheme: FilterScheme) => {
    // 更新使用次数
    const updatedScheme = {
      ...scheme,
      usageCount: scheme.usageCount + 1,
      updatedAt: new Date().toISOString(),
    }

    const updatedSchemes = schemes.map((s) => (s.id === scheme.id ? updatedScheme : s))
    localStorage.setItem("filterSchemes", JSON.stringify(updatedSchemes))

    onApplyScheme(scheme.conditions)
    onOpenChange(false)

    toast({
      title: "方案已应用",
      description: `已应用筛选方案"${scheme.name}"`,
    })
  }

  // 编辑方案
  const handleEditScheme = (scheme: FilterScheme) => {
    setEditingScheme(scheme)
    setEditName(scheme.name)
    setEditDescription(scheme.description || "")
    setShowEditDialog(true)
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editingScheme || !editName.trim()) return

    const updatedScheme = {
      ...editingScheme,
      name: editName.trim(),
      description: editDescription.trim(),
      updatedAt: new Date().toISOString(),
    }

    const updatedSchemes = schemes.map((s) => (s.id === editingScheme.id ? updatedScheme : s))
    localStorage.setItem("filterSchemes", JSON.stringify(updatedSchemes))

    setSchemes(updatedSchemes)
    setShowEditDialog(false)
    setEditingScheme(null)

    toast({
      title: "保存成功",
      description: "方案信息已更新",
    })
  }

  // 删除方案
  const handleDeleteScheme = (schemeId: string) => {
    setDeletingSchemeId(schemeId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    const updatedSchemes = schemes.filter((s) => s.id !== deletingSchemeId)
    localStorage.setItem("filterSchemes", JSON.stringify(updatedSchemes))

    setSchemes(updatedSchemes)
    setShowDeleteConfirm(false)

    toast({
      title: "删除成功",
      description: "筛选方案已删除",
    })
  }

  // 格式化条件数量
  const getConditionsCount = (conditions: FilterCondition) => {
    return Object.keys(conditions).filter((key) => {
      const value = conditions[key as keyof FilterCondition]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== "" && value !== null
    }).length
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "今天"
    if (days === 1) return "昨天"
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    return date.toLocaleDateString("zh-CN")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-600" />
              <DialogTitle>筛选方案</DialogTitle>
              <Badge variant="secondary">{schemes.length}个方案</Badge>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
            {schemes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bookmark className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">暂无保存的筛选方案</p>
                <p className="text-sm text-gray-400">在高级筛选中设置条件后，点击"保存方案"即可创建</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schemes.map((scheme) => (
                  <Card key={scheme.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* 方案名称和徽章 */}
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium truncate">{scheme.name}</h3>
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Filter className="h-3 w-3 mr-1" />
                              {getConditionsCount(scheme.conditions)}个条件
                            </Badge>
                          </div>

                          {/* 方案描述 */}
                          {scheme.description && (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{scheme.description}</p>
                          )}

                          {/* 使用统计 */}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              使用 {scheme.usageCount} 次
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(scheme.updatedAt)}
                            </span>
                          </div>

                          {/* 条件预览 */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {scheme.conditions.nickname && (
                              <Badge variant="outline" className="text-xs">
                                名称: {scheme.conditions.nickname}
                              </Badge>
                            )}
                            {scheme.conditions.tags && scheme.conditions.tags.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                标签: {scheme.conditions.tags.length}个
                              </Badge>
                            )}
                            {scheme.conditions.rfmMin !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                RFM: {scheme.conditions.rfmMin}-{scheme.conditions.rfmMax || 15}
                              </Badge>
                            )}
                            {scheme.conditions.regions && scheme.conditions.regions.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                地区: {scheme.conditions.regions.length}个
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleApplyScheme(scheme)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            应用
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditScheme(scheme)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑方案
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteScheme(scheme.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除方案
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑方案对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>编辑筛选方案</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>方案名称 *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="输入方案名称" />
            </div>
            <div className="space-y-2">
              <Label>方案描述（可选）</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="输入方案描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={saveEdit} disabled={!editName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>删除筛选方案</DialogTitle>
            <DialogDescription>确认要删除这个筛选方案吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">删除后，该方案的所有筛选条件将永久丢失</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
