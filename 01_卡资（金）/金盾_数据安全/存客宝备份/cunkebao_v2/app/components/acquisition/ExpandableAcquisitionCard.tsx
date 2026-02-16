"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Pause,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  UserPlus,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

interface Task {
  id: string
  name: string
  status: "running" | "paused" | "completed"
  stats: {
    devices: number
    acquired: number
    added: number
  }
  lastUpdated: string
  executionTime: string
  nextExecutionTime: string
  trend: { date: string; customers: number }[]
  dailyData: { date: string; acquired: number; added: number }[]
}

interface ExpandableAcquisitionCardProps {
  task: Task
  channel: string
  onCopy: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function ExpandableAcquisitionCard({ task, channel, onCopy, onDelete }: ExpandableAcquisitionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRunning, setIsRunning] = useState(task.status === "running")

  const handleToggleStatus = () => {
    setIsRunning(!isRunning)
    toast({
      title: isRunning ? "任务已暂停" : "任务已启动",
      description: `"${task.name}" ${isRunning ? "已暂停执行" : "已开始执行"}`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500"
      case "paused":
        return "bg-yellow-500"
      case "completed":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "running":
        return "运行中"
      case "paused":
        return "已暂停"
      case "completed":
        return "已完成"
      default:
        return "未知"
    }
  }

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg">{task.name}</h3>
              <Badge variant="secondary" className={`${getStatusColor(task.status)} text-white`}>
                {getStatusText(task.status)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleToggleStatus}>
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  启动
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 基础统计信息 */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-sm text-gray-600">设备数</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{task.stats.devices}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-gray-600">已获客</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{task.stats.acquired}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserPlus className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-sm text-gray-600">已添加</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{task.stats.added}</div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* 执行时间信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600">最后执行</div>
                    <div className="font-medium">{task.executionTime}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600">下次执行</div>
                    <div className="font-medium">{task.nextExecutionTime}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 每日数据趋势 */}
            <div>
              <h4 className="font-medium mb-3">近7天数据趋势</h4>
              <div className="space-y-2">
                {task.dailyData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{data.date}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">获客 {data.acquired}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">添加 {data.added}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 转化率进度条 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">转化率</span>
                <span className="text-sm text-gray-600">
                  {Math.round((task.stats.added / task.stats.acquired) * 100)}%
                </span>
              </div>
              <Progress value={(task.stats.added / task.stats.acquired) * 100} className="h-2" />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex space-x-2">
                <Link href={`/scenarios/${channel}/${task.id}`}>
                  <Button variant="outline" size="sm">
                    查看详情
                  </Button>
                </Link>
                <Link href={`/scenarios/${channel}/edit/${task.id}`}>
                  <Button variant="outline" size="sm">
                    编辑
                  </Button>
                </Link>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onCopy(task.id)}>
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
