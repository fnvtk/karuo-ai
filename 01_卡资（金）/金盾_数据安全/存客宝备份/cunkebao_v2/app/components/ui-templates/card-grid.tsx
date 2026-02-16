"use client"

import type React from "react"
import { cn } from "@/app/lib/utils"

interface CardGridProps {
  children: React.ReactNode
  className?: string
  columns?: {
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: "none" | "sm" | "md" | "lg"
}

/**
 * 自适应卡片网格组件
 * 根据屏幕尺寸自动调整卡片布局
 */
export function CardGrid({ children, className, columns = { sm: 1, md: 2, lg: 3, xl: 4 }, gap = "md" }: CardGridProps) {
  // 根据gap参数设置间距
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  }

  // 根据columns参数设置网格列数
  const getGridCols = () => {
    const cols = []
    if (columns.sm) cols.push(`grid-cols-${columns.sm}`)
    if (columns.md) cols.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) cols.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) cols.push(`xl:grid-cols-${columns.xl}`)
    return cols.join(" ")
  }

  return <div className={cn("grid w-full", getGridCols(), gapClasses[gap], className)}>{children}</div>
}
