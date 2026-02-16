"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, Users, LayoutGrid, User } from "lucide-react"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const hiddenPaths = [
    "/profile/devices",
    "/profile/wechat",
    "/profile/stores",
    "/profile/traffic-pool",
    "/profile/content",
  ]

  // 检查当前路径是否需要隐藏导航栏
  const shouldHideNav = hiddenPaths.some((path) => pathname.startsWith(path))

  // 如果需要隐藏,返回 null
  if (shouldHideNav) {
    return null
  }
  // </CHANGE>

  const navItems = [
    {
      name: "首页",
      href: "/",
      icon: Home,
      active: pathname === "/",
    },
    {
      name: "场景获客",
      href: "/scenarios",
      icon: Users,
      active: pathname.startsWith("/scenarios"),
    },
    {
      name: "工作台",
      href: "/workspace",
      icon: LayoutGrid,
      active: pathname.startsWith("/workspace"),
    },
    {
      name: "我的",
      href: "/profile",
      icon: User,
      active: pathname.startsWith("/profile"),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              item.active ? "text-blue-500" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs mt-1">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
