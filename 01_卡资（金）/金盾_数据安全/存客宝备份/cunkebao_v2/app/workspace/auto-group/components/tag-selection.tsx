"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Loader2, ExternalLink, Filter, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"

interface TrafficPool {
  id: string
  name: string
  userCount: number
  description: string
  tags: string[]
  lastUpdated: string
}

// 模拟流量池数据
const mockTrafficPools: TrafficPool[] = [
  {
    id: "pool-1",
    name: "高意向客户池",
    userCount: 230,
    description: "包含所有高意向潜在客户",
    tags: ["高意向", "已沟通", "潜在客户"],
    lastUpdated: "2023-05-15 14:30",
  },
  {
    id: "pool-2",
    name: "活动获客池",
    userCount: 156,
    description: "市场活动获取的客户",
    tags: ["活动", "新客户"],
    lastUpdated: "2023-05-14 09:15",
  },
  {
    id: "pool-3",
    name: "老客户池",
    userCount: 89,
    description: "已成交的老客户",
    tags: ["已成交", "老客户", "高价值"],
    lastUpdated: "2023-05-13 11:45",
  },
  {
    id: "pool-4",
    name: "待跟进客户池",
    userCount: 120,
    description: "需要跟进的客户",
    tags: ["待跟进", "中意向"],
    lastUpdated: "2023-05-12 13:20",
  },
  {
    id: "pool-5",
    name: "VIP客户池",
    userCount: 45,
    description: "高价值VIP客户",
    tags: ["VIP", "高价值", "已成交"],
    lastUpdated: "2023-05-11 10:05",
  },
]

interface TrafficPoolSelectionProps {
  onSubmit: () => void
  onPrevious: () => void
  initialSelectedPools?: string[]
  onPoolsChange: (poolIds: string[]) => void
  selectedDevices?: string[] // 已选设备ID列表
}

export function TrafficPoolSelection({
  onSubmit,
  onPrevious,
  initialSelectedPools = [],
  onPoolsChange,
  selectedDevices = [],
}: TrafficPoolSelectionProps) {
  const isMobile = useMobile()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPools, setSelectedPools] = useState<string[]>(initialSelectedPools)
  const [trafficPools, setTrafficPools] = useState<TrafficPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userCountFilter, setUserCountFilter] = useState<"all" | "high" | "medium" | "low">("all")

  // 获取流量池数据
  useEffect(() => {
    const fetchTrafficPools = async () => {
      setLoading(true)
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000))
        // 如果有选择设备，可以根据设备ID筛选流量池
        if (selectedDevices.length > 0) {
          console.log("根据已选设备筛选流量池:", selectedDevices)
          // 这里应该是实际的API调用，根据设备ID获取相关流量池
        }
        setTrafficPools(mockTrafficPools)
      } catch (error) {
        console.error("获取流量池失败:", error)
        setError("获取流量池列表失败，请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    fetchTrafficPools()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedDevices)])

  // 通知父组件选择变化
  useEffect(() => {
    // 只在流量池选择实际变化时通知父组件
    const currentSelection = JSON.stringify(selectedPools)
    const initialSelection = JSON.stringify(initialSelectedPools)
    
    if (currentSelection !== initialSelection) {
      onPoolsChange(selectedPools)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPools, JSON.stringify(initialSelectedPools)])

  const handlePoolToggle = (poolId: string) => {
    setSelectedPools((prev) => 
      prev.includes(poolId) ? prev.filter((id) => id !== poolId) : [...prev, poolId]
    )
  }

  // 根据用户数量过滤
  const getUserCountFilterValue = (pool: TrafficPool) => {
    if (pool.userCount > 150) return "high"
    if (pool.userCount > 50) return "medium"
    return "low"
  }

  const filteredPools = trafficPools.filter((pool) => {
    const matchesSearch = pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pool.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesUserCount = userCountFilter === "all" || getUserCountFilterValue(pool) === userCountFilter
    return matchesSearch && matchesUserCount
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">选择流量池</Label>
              <Link href="/traffic-pool" className="text-blue-500 hover:text-blue-600 text-sm flex items-center">
                前往流量池管理
                <ExternalLink className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-700">
                选择流量池后，系统将自动筛选出该流量池中的用户，以确定自动建群所针对的目标群体。
              </AlertDescription>
            </Alert>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索流量池名称、描述或标签"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={userCountFilter}
                  onChange={(e) => setUserCountFilter(e.target.value as any)}
                >
                  <option value="all">全部用户量</option>
                  <option value="high">大流量池 ({'>'}150人)</option>
                  <option value="medium">中流量池 (50-150人)</option>
                  <option value="low">小流量池 ({'<'}50人)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                <span>正在加载流量池列表...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredPools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">未找到匹配的流量池</div>
            ) : (
              <div className="space-y-3 mt-4">
                {filteredPools.map((pool) => (
                  <div
                    key={pool.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPools.includes(pool.id) 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                    onClick={() => handlePoolToggle(pool.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {selectedPools.includes(pool.id) ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{pool.name}</div>
                          <div className="text-sm text-gray-500 mt-1">{pool.description}</div>
                          <div className="flex items-center mt-2">
                            <Users className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="text-sm text-blue-600 font-medium">{pool.userCount} 人</span>
                            <span className="text-xs text-gray-500 ml-3">更新于: {pool.lastUpdated}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pool.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500">
                已选择 {selectedPools.length} / {filteredPools.length} 个流量池
              </div>
              {selectedPools.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedPools([])}>
                  清空选择
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={onSubmit} className="bg-blue-500 hover:bg-blue-600" disabled={selectedPools.length === 0}>
          完成
        </Button>
      </div>
    </div>
  )
}
