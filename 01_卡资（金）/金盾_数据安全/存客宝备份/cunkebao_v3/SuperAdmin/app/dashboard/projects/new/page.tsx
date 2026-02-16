"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { apiRequest } from "@/lib/api-utils"

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    account: "",
    password: "",
    confirmPassword: "",
    phone: "",
    nickname: "",
    description: "",
    status: "1" // 默认启用
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }
    
    setIsSubmitting(true)

    try {
      const result = await apiRequest('/company/add', 'POST', {
        name: formData.name,
        account: formData.account,
        password: formData.password,
        memo: formData.description,
        phone: formData.phone,
        username: formData.nickname,
        status: parseInt(formData.status),
      })

      if (result.code === 200) {
        toast.success("项目创建成功")
        router.push("/dashboard/projects")
      } else {
        toast.error(result.msg || "创建失败")
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">新建项目</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>项目基本信息</CardTitle>
            <CardDescription>创建新项目需要填写项目名称并设置账号信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">项目名称</Label>
              <Input 
                id="name" 
                placeholder="请输入项目名称" 
                required 
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account">登录账号</Label>
                <Input 
                  id="account" 
                  placeholder="请输入登录的账号"
                  required 
                  value={formData.account}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input 
                  id="nickname" 
                  placeholder="用于账号登录后显示的用户名，可以填真实姓名"
                  required 
                  value={formData.nickname}
                  onChange={handleChange}
                />
              </div>
         
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input 
                  id="phone" 
                  type="number"
                  placeholder="手机号可用于登录"
                  required 
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select value={formData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">初始密码</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="请设置初始密码" 
                  required 
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="请再次输入密码" 
                  required 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">项目介绍</Label>
              <Textarea 
                id="description" 
                placeholder="请输入项目介绍（选填）" 
                rows={4}
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/projects">取消</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "创建中..." : "创建项目"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

