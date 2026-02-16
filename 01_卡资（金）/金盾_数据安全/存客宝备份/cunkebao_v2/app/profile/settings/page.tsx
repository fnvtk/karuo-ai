"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Lock, Bell, Shield, HelpCircle, LogOut, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [notifications, setNotifications] = useState({
    taskReminder: true,
    systemMessage: true,
    customerMessage: false,
  })

  const handleLogout = () => {
    toast({
      title: "已退出登录",
      description: "您已成功退出账号",
    })
    setShowLogoutDialog(false)
    router.push("/login")
  }

  const settingsGroups = [
    {
      title: "账号设置",
      items: [
        {
          icon: <User className="h-5 w-5" />,
          label: "个人资料",
          description: "修改昵称、头像等信息",
          onClick: () => router.push("/profile/edit"),
        },
        {
          icon: <Lock className="h-5 w-5" />,
          label: "账号安全",
          description: "修改密码、绑定手机",
          onClick: () => router.push("/profile/security"),
        },
      ],
    },
    {
      title: "通知设置",
      items: [
        {
          icon: <Bell className="h-5 w-5" />,
          label: "任务提醒",
          description: "接收任务相关通知",
          switch: true,
          checked: notifications.taskReminder,
          onChange: (checked: boolean) => setNotifications((prev) => ({ ...prev, taskReminder: checked })),
        },
        {
          icon: <Bell className="h-5 w-5" />,
          label: "系统消息",
          description: "接收系统通知",
          switch: true,
          checked: notifications.systemMessage,
          onChange: (checked: boolean) => setNotifications((prev) => ({ ...prev, systemMessage: checked })),
        },
        {
          icon: <Bell className="h-5 w-5" />,
          label: "客户消息",
          description: "接收客户消息通知",
          switch: true,
          checked: notifications.customerMessage,
          onChange: (checked: boolean) => setNotifications((prev) => ({ ...prev, customerMessage: checked })),
        },
      ],
    },
    {
      title: "其他",
      items: [
        {
          icon: <Shield className="h-5 w-5" />,
          label: "隐私政策",
          onClick: () => router.push("/privacy"),
        },
        {
          icon: <HelpCircle className="h-5 w-5" />,
          label: "帮助与反馈",
          onClick: () => router.push("/help"),
        },
        {
          icon: <HelpCircle className="h-5 w-5" />,
          label: "关于我们",
          onClick: () => router.push("/about"),
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">设置</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {settingsGroups.map((group, groupIndex) => (
          <Card key={groupIndex}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {item.switch ? (
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-600">{item.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">{item.label}</div>
                            {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                          </div>
                        </div>
                        <Switch checked={item.checked} onCheckedChange={item.onChange} />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors"
                        onClick={item.onClick}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-600">{item.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">{item.label}</div>
                            {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    {itemIndex < group.items.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 退出登录按钮 */}
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-transparent"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </div>

      {/* 退出登录确认对话框 */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>确认退出</DialogTitle>
            <DialogDescription>确定要退出当前账号吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
