"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function EditProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "卡若",
    phone: "13800138000",
    email: "karuo@example.com",
    avatar: "/placeholder.svg?height=80&width=80",
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      // 模拟保存
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "保存成功",
        description: "个人资料已更新",
      })
      router.back()
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">编辑资料</h1>
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-500 hover:bg-blue-600">
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 头像 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">头像</Label>
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{formData.name[0]}</AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-blue-500 rounded-full text-white shadow-lg hover:bg-blue-600">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">昵称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入昵称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
