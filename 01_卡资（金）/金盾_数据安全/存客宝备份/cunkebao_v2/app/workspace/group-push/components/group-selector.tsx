"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Trash2 } from "lucide-react"
import type { WechatGroup } from "@/types/group-push"

// 模拟数据
const mockGroups: WechatGroup[] = [
  {
    id: "1",
    name: "快捷语",
    avatar: "/placeholder.svg?height=40&width=40",
    serviceAccount: {
      id: "sa1",
      name: "贝蒂喜品牌wxid_rtlwsjytjk1991",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  },
  {
    id: "2",
    name: "产品交流群",
    avatar: "/placeholder.svg?height=40&width=40",
    serviceAccount: {
      id: "sa1",
      name: "贝蒂喜品牌wxid_rtlwsjytjk1991",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  },
  {
    id: "3",
    name: "客户服务群",
    avatar: "/placeholder.svg?height=40&width=40",
    serviceAccount: {
      id: "sa2",
      name: "客服小助手wxid_abc123",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  },
]

interface GroupSelectorProps {
  selectedGroups: WechatGroup[]
  onGroupsChange: (groups: WechatGroup[]) => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  onCancel: () => void
}

export function GroupSelector({
  selectedGroups = [],
  onGroupsChange,
  onPrevious,
  onNext,
  onSave,
  onCancel,
}: GroupSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")

  const handleAddGroup = (group: WechatGroup) => {
    if (!selectedGroups.some((g) => g.id === group.id)) {
      onGroupsChange([...selectedGroups, group])
    }
    setIsDialogOpen(false)
  }

  const handleRemoveGroup = (groupId: string) => {
    onGroupsChange(selectedGroups.filter((group) => group.id !== groupId))
  }

  const filteredGroups = mockGroups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesService = !serviceFilter || group.serviceAccount.name.includes(serviceFilter)
    return matchesSearch && matchesService
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-500 mr-1">*</span>
                <span className="font-medium text-sm">推送社群:</span>
              </div>
              <Button variant="default" size="sm" onClick={() => setIsDialogOpen(true)} className="flex items-center">
                <Plus className="h-4 w-4 mr-1" />
                选择微信聊天群
              </Button>
            </div>

            <div className="overflow-x-auto">
              {selectedGroups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">序号</TableHead>
                      <TableHead>群信息</TableHead>
                      <TableHead>推送客服</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGroups.map((group, index) => (
                      <TableRow key={group.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={group.avatar || "/placeholder.svg?height=32&width=32"}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-sm truncate">{group.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-2 flex-shrink-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                                <img
                                  src={group.serviceAccount.avatar || "/placeholder.svg?height=32&width=32"}
                                  alt={group.serviceAccount.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <span className="text-xs truncate">{group.serviceAccount.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveGroup(group.id)}
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
                <div className="border rounded-md p-8 text-center text-gray-500">
                  请点击"选择微信聊天群"按钮添加群组
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-2 justify-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onPrevious} className="flex-1 sm:flex-none">
          上一步
        </Button>
        <Button type="button" onClick={onNext} className="flex-1 sm:flex-none">
          下一步
        </Button>
        <Button type="button" variant="outline" onClick={onSave} className="flex-1 sm:flex-none">
          保存
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
          取消
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择微信聊天群</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="搜索群聊名称"
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="sm:w-64">
                <Input
                  placeholder="按归属客服筛选"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">序号</TableHead>
                    <TableHead>群信息</TableHead>
                    <TableHead>归属客服</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group, index) => (
                    <TableRow key={group.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={group.avatar || "/placeholder.svg?height=32&width=32"}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm truncate">{group.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="truncate">{group.serviceAccount.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddGroup(group)}
                          disabled={selectedGroups.some((g) => g.id === group.id)}
                          className="whitespace-nowrap"
                        >
                          {selectedGroups.some((g) => g.id === group.id) ? "已选择" : "选择"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
