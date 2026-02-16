"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Users, MessageSquare } from "lucide-react"

export default function AdminSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    账号管理: true,
  })

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="w-64 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">存客宝管理系统</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {/* 账号管理 */}
          <li>
            <button
              className="flex items-center justify-between w-full p-3 rounded-md hover:bg-gray-100"
              onClick={() => toggleExpand("账号管理")}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3" />
                <span>账号管理</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expandedItems["账号管理"] ? "transform rotate-180" : ""}`}
              />
            </button>
            {expandedItems["账号管理"] && (
              <ul className="pl-10 space-y-1 mt-1">
                <li>
                  <Link
                    href="/admin/accounts/operators"
                    className={`block p-2 rounded-md ${
                      isActive("/admin/accounts/operators") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                    }`}
                  >
                    操盘手账号管理
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/accounts/mobile"
                    className={`block p-2 rounded-md ${
                      isActive("/admin/accounts/mobile") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                    }`}
                  >
                    手机端账号管理
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* 聚合聊天 */}
          <li>
            <Link
              href="/admin/chat"
              className={`flex items-center p-3 rounded-md ${
                isActive("/admin/chat") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              <span>聚合聊天</span>
            </Link>
          </li>

          {/* 其他菜单项可以在这里添加 */}
        </ul>
      </nav>
    </div>
  )
}
