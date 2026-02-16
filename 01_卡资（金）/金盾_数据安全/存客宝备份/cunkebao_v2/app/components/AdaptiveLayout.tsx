"use client"

import type React from "react"
import BottomNav from "./BottomNav"

function AdaptiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* 主内容区域 */}
      <main className="max-w-[390px] mx-auto">
        <div className="bg-white min-h-screen pb-16">{children}</div>
      </main>

      {/* 始终显示底部导航 */}
      <BottomNav />
    </div>
  )
}

// 提供默认导出和命名导出
export default AdaptiveLayout
export { AdaptiveLayout }
