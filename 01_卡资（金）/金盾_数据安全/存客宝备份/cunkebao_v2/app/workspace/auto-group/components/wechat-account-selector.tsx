"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check } from "lucide-react"

// 微信账号类型定义
interface WechatAccount {
  id: string
  name: string
  avatar: string
  status: "online" | "offline" | "busy"
  isDefault?: boolean
}

interface WechatAccountSelectorProps {
  onAccountsSelected: (accounts: WechatAccount[]) => void
}

export function WechatAccountSelector({ onAccountsSelected }: WechatAccountSelectorProps) {
  const [accounts, setAccounts] = useState<WechatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingMissingAccounts, setAddingMissingAccounts] = useState(false)

  // 从"我的"页面获取微信账号列表
  useEffect(() => {
    const fetchWechatAccounts = async () => {
      try {
        setLoading(true)
        // 这里应该是实际的API调用，现在使用模拟数据
        // const response = await fetch('/api/my/wechat-accounts');
        // const data = await response.json();

        // 模拟数据
        const mockAccounts: WechatAccount[] = [
          { id: "1", name: "微信号1", avatar: "/diverse-avatars.png", status: "online", isDefault: true },
          { id: "2", name: "微信号2", avatar: "/diverse-avatars.png", status: "online", isDefault: true },
          { id: "3", name: "微信号3", avatar: "/diverse-avatars.png", status: "offline", isDefault: true },
          { id: "4", name: "微信号4", avatar: "/diverse-avatars.png", status: "online" },
          { id: "5", name: "微信号5", avatar: "/diverse-avatars.png", status: "busy" },
        ]

        // 延迟模拟网络请求
        setTimeout(() => {
          setAccounts(mockAccounts)
          setLoading(false)

          // 自动选择前三个账号
          const defaultAccounts = mockAccounts.filter((acc) => acc.isDefault).slice(0, 3)
          onAccountsSelected(defaultAccounts)

          // 检查是否需要添加缺失的默认账号
          checkForMissingDefaultAccounts(mockAccounts)
        }, 1000)
      } catch (err) {
        setError("获取微信账号失败，请重试")
        setLoading(false)
      }
    }

    fetchWechatAccounts()
  }, [onAccountsSelected])

  // 检查是否缺少默认微信号，如果缺少则自动触发添加任务
  const checkForMissingDefaultAccounts = (accounts: WechatAccount[]) => {
    const defaultAccounts = accounts.filter((acc) => acc.isDefault)
    if (defaultAccounts.length < 3) {
      setAddingMissingAccounts(true)

      // 模拟添加任务的过程
      setTimeout(() => {
        setAddingMissingAccounts(false)
        // 这里应该有实际的添加任务逻辑
      }, 2000)
    }
  }

  // 渲染状态标签
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-500">在线</Badge>
      case "offline":
        return (
          <Badge variant="outline" className="text-gray-500">
            离线
          </Badge>
        )
      case "busy":
        return <Badge className="bg-yellow-500">忙碌</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-medium mb-4">自动选择微信号</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-3 w-[60px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const defaultAccounts = accounts.filter((acc) => acc.isDefault).slice(0, 3)

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-4">自动选择微信号</h3>

        {addingMissingAccounts && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>正在自动添加缺失的默认微信号...</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {defaultAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar>
                  <img src={account.avatar || "/placeholder.svg"} alt={account.name} />
                </Avatar>
                <div>
                  <p className="font-medium">{account.name}</p>
                  {renderStatusBadge(account.status)}
                </div>
              </div>
              <Badge className="bg-blue-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> 已选择
              </Badge>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-4">系统已自动选择前三个默认微信号用于自动建群操作</p>
      </CardContent>
    </Card>
  )
}
