"use client"

import type React from "react"
import { cn } from "@/app/lib/utils"
import { Button } from "@/app/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  backButton?: boolean
  backUrl?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * 页面标题组件
 * 支持返回按钮和操作按钮
 */
export function PageHeader({ title, subtitle, backButton = false, backUrl, actions, className }: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-2">
        {backButton && (
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
