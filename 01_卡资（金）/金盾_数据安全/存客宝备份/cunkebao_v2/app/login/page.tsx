"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, RefreshCw, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authApi, type LoginRequest, type CaptchaResponse } from "@/lib/api/auth"
import { toast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null)
  const [error, setError] = useState("")

  // 表单数据
  const [formData, setFormData] = useState<LoginRequest>({
    username: "",
    password: "",
    captcha: "",
    captchaId: "",
  })

  // 检查是否已登录
  useEffect(() => {
    if (authApi.isLoggedIn() && !authApi.isTokenExpired()) {
      router.replace("/")
    }
  }, [router])

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const response = await authApi.getCaptcha()
      if (response.code === 0 && response.data) {
        setCaptcha(response.data)
        setFormData((prev) => ({ ...prev, captchaId: response.data!.captchaId, captcha: "" }))
      }
    } catch (error) {
      console.error("加载验证码失败:", error)
    }
  }

  // 初始化加载验证码
  useEffect(() => {
    loadCaptcha()
  }, [])

  // 处理表单输入
  const handleInputChange = (field: keyof LoginRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      setError("请输入用户名")
      return
    }

    if (!formData.password.trim()) {
      setError("请输入密码")
      return
    }

    if (captcha && !formData.captcha.trim()) {
      setError("请输入验证码")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await authApi.login({
        username: formData.username.trim(),
        password: formData.password,
        captcha: formData.captcha.trim(),
        captchaId: formData.captchaId,
      })

      if (response.code === 0) {
        toast({
          title: "登录成功",
          description: "欢迎使用存客宝！",
        })

        // 跳转到首页
        router.replace("/")
      } else {
        setError(response.message || "登录失败")
        // 如果是验证码错误，重新加载验证码
        if (response.message?.includes("验证码")) {
          loadCaptcha()
        }
      }
    } catch (error) {
      console.error("登录失败:", error)
      setError(error instanceof Error ? error.message : "登录失败，请稍后重试")
      loadCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">存客宝</CardTitle>
          <CardDescription className="text-gray-600">智能化客户获取管理平台</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 用户名 */}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isLoading}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-10"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 验证码 */}
            {captcha && (
              <div className="space-y-2">
                <Label htmlFor="captcha">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="captcha"
                    type="text"
                    placeholder="请输入验证码"
                    value={formData.captcha}
                    onChange={(e) => handleInputChange("captcha", e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                    maxLength={4}
                  />
                  <div className="flex items-center gap-2">
                    <img
                      src={`data:image/png;base64,${captcha.captchaImage}`}
                      alt="验证码"
                      className="h-11 w-20 border rounded cursor-pointer"
                      onClick={loadCaptcha}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 bg-transparent"
                      onClick={loadCaptcha}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">点击图片或刷新按钮更换验证码</p>
              </div>
            )}

            {/* 登录按钮 */}
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  登录
                </>
              )}
            </Button>
          </form>

          {/* 底部信息 */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2024 存客宝 - 智能化客户获取管理平台</p>
            <p className="mt-1">技术支持：趣玩智</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
