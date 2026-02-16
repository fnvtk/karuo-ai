"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Eye, EyeOff, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

// 渠道登录页面
export default function ChannelLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // 登录处理
  const handleLogin = async () => {
    if (!phone) {
      toast({
        title: "请输入手机号",
        variant: "destructive",
      })
      return
    }

    if (!password) {
      toast({
        title: "请输入密码",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    // 模拟登录
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 登录成功跳转到统计页面
    router.push("/workspace/distribution/channel/stats")

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-white/20">
        <div className="flex items-center p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/50">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold ml-2">渠道登录</h1>
        </div>
      </header>

      <div className="p-6 pt-8">
        {/* 标题区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">渠道登录</h1>
          <p className="text-gray-500 mt-2">登录后进入数据面板</p>
        </div>

        {/* 登录表单卡片 */}
        <Card className="p-6 backdrop-blur-xl bg-white/90 border-0 shadow-xl rounded-3xl">
          <h2 className="text-xl font-bold mb-6">账号密码登录</h2>

          <div className="space-y-5">
            {/* 手机号输入 */}
            <div className="relative">
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 rounded-xl bg-blue-50/50 border-0 text-lg pl-4 pr-10"
                maxLength={11}
              />
              {phone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
                  onClick={() => setPhone("")}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </Button>
              )}
            </div>

            {/* 密码输入 */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-xl bg-blue-50/50 border-0 text-lg pl-4 pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>

            {/* 密码提示 */}
            <p className="text-sm text-gray-500">
              默认初始密码为<span className="text-red-500 font-medium">123456</span>，登录后请及时修改。
            </p>

            {/* 登录按钮 */}
            <Button
              className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-lg font-medium shadow-lg shadow-blue-500/30"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
