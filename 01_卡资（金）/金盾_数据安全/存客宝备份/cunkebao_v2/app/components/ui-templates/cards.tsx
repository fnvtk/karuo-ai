"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Users } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  trend?: number
  trendLabel?: string
  className?: string
  valueClassName?: string
}

/**
 * 统计数据卡片
 * 用于展示关键指标数据
 */
export function StatsCard({
  title,
  value,
  description,
  trend,
  trendLabel,
  className = "",
  valueClassName = "text-xl font-bold text-blue-600",
}: StatsCardProps) {
  return (
    <Card className={`p-3 ${className}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className={valueClassName}>{value}</div>
      {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
      {trend !== undefined && (
        <div className={`flex items-center text-xs mt-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% {trendLabel || ""}
        </div>
      )}
    </Card>
  )
}

interface DistributionPlanCardProps {
  id: string
  name: string
  status: "active" | "paused" | "completed"
  source: string
  sourceIcon: string
  targetGroups: string[]
  totalUsers: number
  dailyAverage: number
  lastUpdated: string
  createTime: string
  creator: string
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (id: string, status: "active" | "paused") => void
}

/**
 * 流量分发计划卡片
 * 用于展示流量分发计划信息
 */
export function DistributionPlanCard({
  id,
  name,
  status,
  source,
  sourceIcon,
  targetGroups,
  totalUsers,
  dailyAverage,
  lastUpdated,
  createTime,
  creator,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: DistributionPlanCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl mr-1">{sourceIcon}</span>
          <h3 className="font-medium">{name}</h3>
          <Badge variant={status === "active" ? "success" : status === "completed" ? "outline" : "secondary"}>
            {status === "active" ? "进行中" : status === "completed" ? "已完成" : "已暂停"}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {onToggleStatus && status !== "completed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(id, status === "active" ? "paused" : "active")}
            >
              {status === "active" ? "暂停" : "启动"}
            </Button>
          )}
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(id)}>
              <Users className="h-4 w-4 mr-1" />
              查看
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(id)}>
              <TrendingUp className="h-4 w-4 mr-1" />
              编辑
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-sm text-gray-500">
          <div>目标人群：{targetGroups.join(", ")}</div>
          <div>总流量：{totalUsers} 人</div>
        </div>
        <div className="text-sm text-gray-500">
          <div>日均获取：{dailyAverage} 人</div>
          <div>创建人：{creator}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-4">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          上次更新：{lastUpdated}
        </div>
        <div>创建时间：{createTime}</div>
      </div>
    </Card>
  )
}
