"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import AdaptiveLayout from "./AdaptiveLayout"

// 创建视图模式上下文
const ViewModeContext = createContext<{
  viewMode: "mobile" | "desktop"
  setViewMode: (mode: "mobile" | "desktop") => void
}>({
  viewMode: "mobile",
  setViewMode: () => {},
})

// 导出 useViewMode hook
export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (!context) {
    throw new Error("useViewMode must be used within ViewModeProvider")
  }
  return context
}

interface LayoutWrapperProps {
  children: React.ReactNode
}

function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("mobile")

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      <AdaptiveLayout>{children}</AdaptiveLayout>
    </ViewModeContext.Provider>
  )
}

export default LayoutWrapper
export { LayoutWrapper }
