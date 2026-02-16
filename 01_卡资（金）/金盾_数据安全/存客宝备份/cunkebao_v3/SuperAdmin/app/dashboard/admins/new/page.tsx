"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { addAdministrator } from "@/lib/admin-api"
import { useToast } from "@/components/ui/use-toast"
import { getTopLevelMenus } from "@/lib/menu-api"
import { getAdminInfo } from "@/lib/utils"

interface MenuPermission {
  id: number;
  title: string;
}

export default function NewAdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [account, setAccount] = useState("")
  const [username, setUserName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [canManagePermissions, setCanManagePermissions] = useState(false)

  // 加载权限数据
  useEffect(() => {
    const loadPermissions = async () => {
      setIsLoading(true)
      try {
        // 获取当前登录的管理员
        const currentAdmin = getAdminInfo()
        
        // 只有超级管理员(ID为1)可以管理权限
        if (currentAdmin && currentAdmin.id === 1) {
          setCanManagePermissions(true)
          
          // 获取菜单权限
          const response = await getTopLevelMenus()
          if (response.code === 200 && response.data) {
            setMenuPermissions(response.data)
          }
        }
      } catch (error) {
        console.error("获取权限数据失败:", error)
        toast({
          title: "获取权限数据失败",
          description: "请检查网络连接后重试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPermissions()
  }, [])

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证密码
    if (!password) {
      toast({
        title: "密码不能为空",
        description: "添加管理员时必须设置密码",
        variant: "destructive",
      })
      return
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "两次输入的密码不一致",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 准备提交数据
      const data: any = {
        account,
        username,
        password,
      }
      
      // 如果可以管理权限，则添加权限设置
      if (canManagePermissions && selectedPermissions.length > 0) {
        data.permissionIds = selectedPermissions
      }
      
      // 调用添加API
      const response = await addAdministrator(data)
      
      if (response.code === 200) {
        toast({
          title: "添加成功",
          description: "管理员账号已成功添加",
          variant: "success",
        })
        
        // 返回管理员列表页
        router.push("/dashboard/admins")
      } else {
        toast({
          title: "添加失败",
          description: response.msg || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("添加管理员出错:", error)
      toast({
        title: "添加失败",
        description: "请检查网络连接后重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/admins">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">新增管理员</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>管理员信息</CardTitle>
            <CardDescription>创建新的管理员账号</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account">账号</Label>
                <Input
                  id="account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="只能用数字或者字母或者数字字母组合"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  required
                />
              </div>
            </div>

            {canManagePermissions && (
              <div className="space-y-3">
                <Label>权限设置</Label>
                <div className="grid gap-2">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">加载权限数据中...</span>
                    </div>
                  ) : (
                    menuPermissions.map((menu) => (
                      <div key={menu.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`menu-${menu.id}`}
                          checked={selectedPermissions.includes(menu.id)}
                          onCheckedChange={() => togglePermission(menu.id)}
                        />
                        <Label htmlFor={`menu-${menu.id}`} className="cursor-pointer">
                          {menu.title}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/admins">取消</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建管理员"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

