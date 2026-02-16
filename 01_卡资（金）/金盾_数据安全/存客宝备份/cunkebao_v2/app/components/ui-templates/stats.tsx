/**
 * 统计组件模板
 *
 * 包含项目中常用的各种统计和数据展示组件
 */

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsSummaryProps {
  stats: Array<{
    title: string
    value: string | number
    color?: string
  }>
}

/**
 * 统计摘要组件
 * 用于展示多个统计数据
 */
export function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <Card key={index} className="p-3">
          <div className="text-sm text-gray-500">{stat.title}</div>
          <div className={`text-xl font-bold ${stat.color || "text-blue-600"}`}>{stat.value}</div>
        </Card>
      ))}
    </div>
  )
}

interface DataCardProps {
  title: string
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

/**
 * 数据卡片组件
 * 用于包装数据展示内容
 */
export function DataCard({ title, children, className = "", headerAction }: DataCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
