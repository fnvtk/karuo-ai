"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { md5, saveAdminInfo } from "@/lib/utils"
import { login } from "@/lib/admin-api"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function LoginPage() {
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 对密码进行MD5加密
      const encryptedPassword = md5(password)
      
      // 调用登录接口
      const result = await login(account, encryptedPassword)

      if (result.code === 200 && result.data) {
        // 保存管理员信息
        saveAdminInfo(result.data)
        
        // 显示成功提示
        toast({
          title: "登录成功",
          description: `欢迎回来，${result.data.name}`,
          variant: "success",
        })
        
        // 跳转到仪表盘
        router.push("/dashboard")
      } else {
        // 显示错误弹窗
        setErrorMessage(result.msg || "账号或密码错误")
        setErrorDialogOpen(true)
      }
    } catch (err: any) {
      console.error("登录失败:", err)
      
      // 显示错误弹窗
      setErrorMessage(err.msg || "网络错误，请稍后再试")
      setErrorDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">超级管理员后台</CardTitle>
          <CardDescription className="text-center">请输入您的账号和密码登录系统</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">账号</Label>
              <Input
                id="account"
                placeholder="请输入账号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 错误提示弹窗 */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>登录失败</AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

