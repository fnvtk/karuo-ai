"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Users, Calendar, Tag } from "lucide-react"

interface TrafficPool {
  id: string
  name: string
  description: string
  userCount: number
  tags: string[]
  createdAt: string
  status: "active" | "inactive"
  priority: "high" | "medium" | "low"
}

interface PoolManagementProps {
  pools: TrafficPool[]
  onPoolCreate: (pool: Omit<TrafficPool, "id" | "createdAt" | "userCount">) => void
  onPoolUpdate: (id: string, pool: Partial<TrafficPool>) => void
  onPoolDelete: (id: string) => void
}

export function PoolManagement({ pools, onPoolCreate, onPoolUpdate, onPoolDelete }: PoolManagementProps) {
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPool, setEditingPool] = useState<TrafficPool | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
    status: "active" as "active" | "inactive",
    priority: "medium" as "high" | "medium" | "low",
  })

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      tags: "",
      status: "active",
      priority: "medium",
    })
  }

  // 处理创建流量池
  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: "请输入流量池名称",
        variant: "destructive",
      })
      return
    }

    const newPool = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      status: formData.status,
      priority: formData.priority,
    }

    onPoolCreate(newPool)
    setShowCreateDialog(false)
    resetForm()

    toast({
      title: "创建成功",
      description: `流量池 "${newPool.name}" 已创建`,
    })
  }

  // 处理编辑流量池
  const handleEdit = (pool: TrafficPool) => {
    setEditingPool(pool)
    setFormData({
      name: pool.name,
      description: pool.description,
      tags: pool.tags.join(", "),
      status: pool.status,
      priority: pool.priority,
    })
    setShowEditDialog(true)
  }

  // 处理更新流量池
  const handleUpdate = () => {
    if (!editingPool || !formData.name.trim()) {
      toast({
        title: "请输入流量池名称",
        variant: "destructive",
      })
      return
    }

    const updatedPool = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      status: formData.status,
      priority: formData.priority,
    }

    onPoolUpdate(editingPool.id, updatedPool)
    setShowEditDialog(false)
    setEditingPool(null)
    resetForm()

    toast({
      title: "更新成功",
      description: `流量池 "${updatedPool.name}" 已更新`,
    })
  }

  // 处理删除流量池
  const handleDelete = (pool: TrafficPool) => {
    if (pool.userCount > 0) {
      toast({
        title: "无法删除",
        description: "该流量池中还有用户，请先清空用户后再删除",
        variant: "destructive",
      })
      return
    }

    if (confirm(`确定要删除流量池 "${pool.name}" 吗？此操作不可恢复。`)) {
      onPoolDelete(pool.id)
      toast({
        title: "删除成功",
        description: `流量池 "${pool.name}" 已删除`,
      })
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-blue-100 text-blue-800"
      case "low":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date)
  }

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">流量池管理</h3>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新建流量池
        </Button>
      </div>

      {/* 流量池列表 */}
      <div className="grid gap-4">
        {pools.map((pool) => (
          <Card key={pool.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-lg">{pool.name}</h4>
                  <Badge className={getStatusColor(pool.status)}>{pool.status === "active" ? "活跃" : "停用"}</Badge>
                  <Badge className={getPriorityColor(pool.priority)}>
                    {pool.priority === "high" ? "高优先级" : pool.priority === "medium" ? "中优先级" : "低优先级"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{pool.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {pool.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(pool)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(pool)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{pool.userCount} 个用户</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>创建于 {formatDate(pool.createdAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {pools.length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-4">暂无流量池</div>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              创建第一个流量池
            </Button>
          </Card>
        )}
      </div>

      {/* 创建流量池对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建流量池</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">流量池名称 *</label>
              <Input
                placeholder="请输入流量池名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="请输入流量池描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="请输入标签，用逗号分隔"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <div className="text-xs text-gray-500">例如：高价值,重要客户,优先添加</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "high" | "medium" | "low") => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高优先级</SelectItem>
                    <SelectItem value="medium">中优先级</SelectItem>
                    <SelectItem value="low">低优先级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑流量池对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑流量池</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">流量池名称 *</label>
              <Input
                placeholder="请输入流量池名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="请输入流量池描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="请输入标签，用逗号分隔"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <div className="text-xs text-gray-500">例如：高价值,重要客户,优先添加</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "high" | "medium" | "low") => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高优先级</SelectItem>
                    <SelectItem value="medium">中优先级</SelectItem>
                    <SelectItem value="low">低优先级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
