"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Copy, Code, Trash2, Play, Pause } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { formatDate } from "@/app/lib/utils"

// 分发规则类型定义
export interface DistributionRule {
  id: string
  name: string
  status: "active" | "paused" | "completed"
  deviceCount: number
  dailyDistribution: number
  trafficPoolCount: number
  totalDistributed: number
  lastExecuted?: string
  createdAt: string
}

interface DistributionRuleCardProps {
  rule: DistributionRule
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: "active" | "paused") => void
}

export function DistributionRuleCard({ rule, onDelete, onStatusChange }: DistributionRuleCardProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // 状态标签颜色映射
  const statusColorMap = {
    active: "bg-green-100 text-green-800 hover:bg-green-200",
    paused: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    completed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  }

  // 状态文本映射
  const statusTextMap = {
    active: "进行中",
    paused: "已暂停",
    completed: "已完成",
  }

  // 处理编辑按钮点击
  const handleEdit = () => {
    router.push(`/workspace/traffic-distribution/${rule.id}/edit`)
  }

  // 处理复制按钮点击
  const handleCopy = () => {
    // 实现复制功能
    console.log("复制分发规则:", rule.id)
  }

  // 处理接口按钮点击
  const handleAPI = () => {
    router.push(`/workspace/traffic-distribution/${rule.id}/api`)
  }

  // 处理删除按钮点击
  const handleDelete = () => {
    onDelete(rule.id)
  }

  // 处理状态切换
  const handleStatusToggle = () => {
    const newStatus = rule.status === "active" ? "paused" : "active"
    onStatusChange(rule.id, newStatus)
  }

  return (
    <Card className="w-full hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{rule.name}</h3>
              <Badge className={statusColorMap[rule.status]}>{statusTextMap[rule.status]}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">日均分发人数</div>
                <div className="text-xl font-bold mt-1">{rule.dailyDistribution}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">分发设备</div>
                <div className="text-xl font-bold mt-1">{rule.deviceCount}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">流量池</div>
                <div className="text-xl font-bold mt-1">{rule.trafficPoolCount}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">日均分发量</div>
                <div className="text-xl font-bold mt-1">{rule.dailyDistribution}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-500">总流量池数量</div>
                <div className="text-xl font-bold mt-1">{rule.totalDistributed}</div>
              </div>
            </div>
          </div>

          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger className="focus:outline-none">
              <div className="p-2 rounded-full hover:bg-gray-100">
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                <span>编辑计划</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                <Copy className="mr-2 h-4 w-4" />
                <span>复制计划</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAPI} className="cursor-pointer">
                <Code className="mr-2 h-4 w-4" />
                <span>计划接口</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStatusToggle} className="cursor-pointer">
                {rule.status === "active" ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    <span>暂停计划</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    <span>启动计划</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>删除计划</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {rule.lastExecuted && (
          <div className="flex items-center text-sm text-gray-500 mt-4">
            <span className="flex items-center">上次执行: {formatDate(rule.lastExecuted)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
