"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, UserCog } from "lucide-react"
import { toast } from "sonner"
import useAuthCheck from "@/hooks/useAuthCheck"
import { getAdminInfo, getGreeting } from "@/lib/utils"
import ClientOnly from "@/components/ClientOnly"
import { apiRequest } from '@/lib/api-utils'

interface DashboardStats {
  companyCount: number
  adminCount: number
  customerCount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    companyCount: 0,
    adminCount: 0,
    customerCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState("")
  const [userName, setUserName] = useState("")

  // 验证用户是否已登录
  useAuthCheck()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        const result = await apiRequest('/dashboard/base')
        if (result.code === 200 && result.data) {
          setStats(result.data)
        } else {
          toast.error(result.msg || "获取仪表盘数据失败")
        }
        
        // 获取用户信息
        const adminInfo = getAdminInfo()
        if (adminInfo) {
          setUserName(adminInfo.name || "管理员")
        } else {
          setUserName("管理员")
        }

      } catch (error) {
        console.error("获取仪表盘数据失败:", error)
        toast.error("网络错误，请稍后再试")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // 单独处理问候语，避免依赖问题
  useEffect(() => {
    const updateGreeting = () => {
      if (userName) {
        setGreeting(getGreeting(userName))
      }
    }

    updateGreeting()
    
    // 每分钟更新一次问候语，以防用户长时间停留在页面
    const interval = setInterval(updateGreeting, 60000)
    
    return () => clearInterval(interval)
  }, [userName])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">欢迎使用超级管理员后台</h1>
      <p className="text-muted-foreground">
        <ClientOnly fallback={`你好，${userName}！`}>
          {greeting || getGreeting(userName)}
        </ClientOnly>
        ！通过此平台，您可以管理项目、客户和管理员权限。
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.companyCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.customerCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">管理员数量</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats.adminCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

