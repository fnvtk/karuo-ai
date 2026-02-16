"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Play, Pause, Settings, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface AcquisitionPlan {
  id: string
  name: string
  scenario: string
  status: "running" | "paused" | "stopped"
  progress: number
  totalTarget: number
  currentAcquired: number
  todayAcquired: number
  successRate: number
  createdAt: string
  lastActiveTime: string
  devices: Array<{
    id: string
    name: string
    status: "online" | "offline"
  }>
  settings: {
    dailyLimit: number
    intervalTime: number
    autoReply: boolean
  }
}

interface ExpandableAcquisitionCardProps {
  plan: AcquisitionPlan
  onStart?: (planId: string) => void
  onPause?: (planId: string) => void
  onEdit?: (planId: string) => void
  onDelete?: (planId: string) => void
  onViewDetails?: (planId: string) => void
}

export function ExpandableAcquisitionCard({
  plan,
  onStart,
  onPause,
  onEdit,
  onDelete,
  onViewDetails,
}: ExpandableAcquisitionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "stopped":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return "运行中"
      case "paused":
        return "已暂停"
      case "stopped":
        return "已停止"
      default:
        return "未知"
    }
  }

  const handleToggleStatus = () => {
    if (plan.status === "running") {
      onPause?.(plan.id)
    } else {
      onStart?.(plan.id)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {plan.scenario}
                </Badge>
                <Badge className={`text-xs ${getStatusColor(plan.status)}`}>{getStatusText(plan.status)}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className="flex items-center space-x-1 bg-transparent"
            >
              {plan.status === "running" ? (
                <>
                  <Pause className="h-3 w-3" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span>启动</span>
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(plan.id)}>查看详情</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(plan.id)}>
                  <Settings className="h-4 w-4 mr-2" />
                  编辑设置
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete?.(plan.id)} className="text-red-600">
                  删除计划
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 基础统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{plan.currentAcquired}</div>
            <div className="text-xs text-gray-500">总获客</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{plan.todayAcquired}</div>
            <div className="text-xs text-gray-500">今日获客</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{plan.successRate}%</div>
            <div className="text-xs text-gray-500">成功率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{plan.devices.length}</div>
            <div className="text-xs text-gray-500">设备数</div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>完成进度</span>
            <span>
              {plan.currentAcquired} / {plan.totalTarget}
            </span>
          </div>
          <Progress value={plan.progress} className="h-2" />
        </div>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* 设备状态 */}
            <div>
              <h4 className="font-medium mb-2">设备状态</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {plan.devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{device.name}</span>
                    <div
                      className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-400" : "bg-gray-400"}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 配置信息 */}
            <div>
              <h4 className="font-medium mb-2">配置信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">每日限额:</span>
                  <span>{plan.settings.dailyLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">间隔时间:</span>
                  <span>{plan.settings.intervalTime}秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">自动回复:</span>
                  <span>{plan.settings.autoReply ? "开启" : "关闭"}</span>
                </div>
              </div>
            </div>

            {/* 时间信息 */}
            <div className="text-xs text-gray-500 flex justify-between">
              <span>创建时间: {new Date(plan.createdAt).toLocaleString()}</span>
              <span>最后活动: {new Date(plan.lastActiveTime).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
