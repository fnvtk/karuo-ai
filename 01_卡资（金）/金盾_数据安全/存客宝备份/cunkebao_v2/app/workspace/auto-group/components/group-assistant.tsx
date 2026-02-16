"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"

interface Friend {
  id: string
  name: string
  wxid: string
  avatar: string
  selected?: boolean
}

interface GroupAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateGroup: (friends: Friend[]) => void
}

export function GroupAssistant({ open, onOpenChange, onCreateGroup }: GroupAssistantProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    // TODO: 刷新好友列表
    setLoading(false)
  }

  const handleCreateGroup = () => {
    const selectedFriends = friends.filter((f) => f.selected)
    onCreateGroup(selectedFriends)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>建群助手</DialogTitle>
        </DialogHeader>

        <div className="flex space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="请输入好友信息筛选"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="好友分组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部好友</SelectItem>
              <SelectItem value="new">新好友</SelectItem>
              <SelectItem value="business">商务合作</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Users className="h-12 w-12 mb-2" />
              <p>暂无好友数据</p>
              <Button variant="link" onClick={handleRefresh} disabled={loading}>
                点击刷新
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50">
                  <Checkbox
                    checked={friend.selected}
                    onCheckedChange={(checked) => {
                      setFriends(friends.map((f) => (f.id === friend.id ? { ...f, selected: !!checked } : f)))
                    }}
                  />
                  <Avatar className="h-10 w-10">
                    <img src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{friend.name}</div>
                    <div className="text-sm text-gray-500">{friend.wxid}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">已选择 {friends.filter((f) => f.selected).length} 个好友</div>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={friends.filter((f) => f.selected).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              创建群聊
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
