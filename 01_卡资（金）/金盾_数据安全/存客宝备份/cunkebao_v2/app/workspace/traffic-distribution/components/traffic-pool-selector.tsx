"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { Skeleton } from "@/components/ui/skeleton"

// 模拟流量池数据
const mockTrafficPools = [
  { id: "1", name: "抖音流量池", source: "douyin", count: 1250 },
  { id: "2", name: "微信流量池", source: "wechat", count: 3420 },
  { id: "3", name: "电话流量池", source: "phone", count: 890 },
  { id: "4", name: "海报流量池", source: "poster", count: 1670 },
  { id: "5", name: "高意向客户池", source: "mixed", count: 520 },
  { id: "6", name: "新客户流量池", source: "mixed", count: 780 },
]

interface TrafficPoolSelectorProps {
  selectedPoolId?: string
  onSelect: (poolId: string, poolName: string) => void
}

export default function TrafficPoolSelector({ selectedPoolId, onSelect }: TrafficPoolSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pools, setPools] = useState<any[]>([])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // 加载流量池数据
  useEffect(() => {
    const fetchPools = async () => {
      setIsLoading(true)
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 800))

        // 根据搜索词过滤
        const filteredPools = mockTrafficPools.filter((pool) =>
          pool.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
        )

        setPools(filteredPools)
      } catch (error) {
        console.error("获取流量池数据失败:", error)
        setPools([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPools()
  }, [debouncedSearchTerm])

  return (
    <div className="space-y-4">
      <Input
        placeholder="搜索流量池..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="cursor-pointer">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <Card
              key={pool.id}
              className={`cursor-pointer transition-all ${
                selectedPoolId === pool.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => onSelect(pool.id, pool.name)}
            >
              <CardContent className="p-4">
                <div className="font-medium">{pool.name}</div>
                <div className="text-sm text-muted-foreground">{pool.count} 条数据</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">未找到匹配的流量池</p>
          <Button variant="link" className="mt-2" onClick={() => setSearchTerm("")}>
            清除搜索
          </Button>
        </div>
      )}
    </div>
  )
}
