"use client"

import { useEffect, useState } from "react"
import { LogOut, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import styles from './header.module.css';

interface AdminInfo {
  id: number;
  name: string;
  account: string;
}

export function Header() {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)

  useEffect(() => {
    // 从本地存储获取管理员信息
    const info = localStorage.getItem("admin_info")
    if (info) {
      try {
        setAdminInfo(JSON.parse(info))
      } catch (e) {
        console.error("解析管理员信息失败", e)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_info")
    window.location.href = "/login"
  }

  return (
    <header className={`${styles.contentHeader} border-b px-6 flex items-center justify-between bg-background`}>
      <div className="flex-1"></div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0 relative">
              <span className="sr-only">用户菜单</span>
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-sm font-medium">
              {adminInfo?.name || "管理员"}
            </div>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {adminInfo?.account || ""}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                设置
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
} 