"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, Search, Tag, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

// 流量池标签类型定义
interface TrafficTag {
  id: string
  name: string
  count: number
  selected?: boolean
}

interface TrafficPoolSelectorProps {
  onTagsSelected: (tags: TrafficTag[]) => void
  selectedDevices: string[] // 已选择的设备ID列表
}

export function TrafficPoolSelector({ onTagsSelected, selectedDevices }: TrafficPoolSelectorProps) {
  // 模拟流量池标签数据
  const [tags, setTags] = useState<TrafficTag[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filteredDeviceCount, setFilteredDeviceCount] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true)
      try {
        // 模拟从API获取标签数据
        await new Promise((resolve) => setTimeout(resolve, 800))

        // 模拟数据
        const mockTags = [
          { id: "1", name: "意向客户", count: 120 },
          { id: "2", name: "高净值", count: 85 },
          { id: "3", name: "潜在客户", count: 210 },
          { id: "4", name: "已成交", count: 65 },
          { id: "5", name: "待跟进", count: 178 },
          { id: "6", name: "活跃用户", count: 156 },
          { id: "7", name: "新客户", count: 92 },
          { id: "8", name: "老客户", count: 143 },
          { id: "9", name: "企业客户", count: 76 },
          { id: "10", name: "个人客户", count: 189 },
        ]

        setTags(mockTags)

        // 模拟计算每个标签在已选设备中的匹配数量
        const deviceCounts: Record<string, number> = {}
        mockTags.forEach((tag) => {
          // 随机生成一个不超过已选设备数量的数字
          const matchCount = Math.min(Math.floor(Math.random() * selectedDevices.length), selectedDevices.length)
          deviceCounts[tag.id] = matchCount
        })

        setFilteredDeviceCount(deviceCounts)
      } catch (error) {
        console.error("获取流量池标签失败:", error)
        setError("获取流量池标签失败，请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    if (selectedDevices.length > 0) {
      fetchTags()
    }
  }, [selectedDevices])

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    const updatedTags = tags.map((tag) => (tag.id === tagId ? { ...tag, selected: !tag.selected } : tag))
    setTags(updatedTags)

    // 通知父组件选中的标签
    const selectedTags = updatedTags.filter((tag) => tag.selected)
    onTagsSelected(selectedTags)
  }

  // 筛选标签
  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // 选中的标签数量
  const selectedCount = tags.filter((tag) => tag.selected).length

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">流量池标签筛选</CardTitle>
        <Link href="/traffic-pool" className="text-sm text-blue-600 flex items-center gap-1">
          <span>前往流量池</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </CardHeader>

      <CardContent>
        {selectedDevices.length === 0 ? (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>请先在上一步选择设备，再进行流量池标签筛选</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="搜索标签..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                已选择 <Badge variant="outline">{selectedCount}</Badge> 个标签
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2">加载中...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`flex items-center justify-between p-2 border rounded-md ${tag.selected ? "bg-blue-50 border-blue-200" : "bg-white"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={tag.selected}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <label htmlFor={`tag-${tag.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                          <Tag className="h-3.5 w-3.5 text-gray-500" />
                          {tag.name}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {tag.count}人
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          已选设备匹配: {filteredDeviceCount[tag.id] || 0}人
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {filteredTags.length === 0 && <p className="text-center py-4 text-gray-500">未找到匹配的标签</p>}
                </div>
              </ScrollArea>
            )}

            <div className="mt-4 pt-2 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const selectedTags = tags.filter((tag) => tag.selected)
                  onTagsSelected(selectedTags)
                }}
              >
                确认选择
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
