"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2 } from "lucide-react"

interface PreviewStepProps {
  formData: {
    selectedUsers: string[]
  }
  onPrev: () => void
  onCreate: () => void
}

interface User {
  id: string
  name: string
  userId: string
  avatar: string
  tags: string[]
  rfm: string
  activity: string
  consumption: string
}

// 模拟用户数据
const mockUsers: User[] = Array.from({ length: 225 }, (_, i) => ({
  id: `U${String(i + 1).padStart(8, "0")}`,
  name: `用户${i + 1}`,
  userId: `U${String(i + 1).padStart(8, "0")}`,
  avatar: `/placeholder.svg?height=48&width=48&query=user${i + 1}`,
  tags: i % 3 === 0 ? ["高价值用户", "活跃用户"] : i % 3 === 1 ? ["高价值用户"] : ["活跃用户"],
  rfm: i % 3 === 0 ? "潜在客户" : i % 3 === 1 ? "中等价值" : "高价值",
  activity: "7天内",
  consumption: `¥${Math.floor(Math.random() * 2000) + 100}`,
}))

export function PreviewStep({ formData, onPrev, onCreate }: PreviewStepProps) {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    setSelectAll(selectedUsers.length === users.length && users.length > 0)
  }, [selectedUsers, users])

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((u) => u.id))
    }
  }

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId))
    setSelectedUsers(selectedUsers.filter((id) => id !== userId))
  }

  return (
    <div className="p-4 pb-24">
      <Card>
        <CardContent className="p-6">
          {/* 标题和用户数 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">用户列表预览</h2>
            <span className="text-blue-600 font-medium">共 {users.length} 个用户</span>
          </div>

          {/* 全选 */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
            <label htmlFor="select-all" className="text-base font-medium cursor-pointer">
              全选
            </label>
          </div>

          {/* 用户列表 */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {users.map((user) => (
              <Card key={user.id} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 复选框 */}
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                      className="mt-1"
                    />

                    {/* 用户头像 */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>

                    {/* 用户信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium">{user.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">ID: {user.userId}</p>

                      {/* 标签 */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {user.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`px-2 py-0.5 rounded text-xs ${
                              tag === "高价值用户" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* RFM和活跃信息 */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>RFM: {user.rfm}</div>
                        <div className="flex items-center gap-4">
                          <span>活跃: {user.activity}</span>
                          <span>消费: {user.consumption}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            className="flex-1 h-12 text-base font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            上一步
          </Button>
          <Button
            onClick={onCreate}
            className="flex-1 h-12 bg-blue-400 hover:bg-blue-500 text-white text-base font-medium rounded-lg"
          >
            创建流量包
          </Button>
        </div>
      </div>
    </div>
  )
}
