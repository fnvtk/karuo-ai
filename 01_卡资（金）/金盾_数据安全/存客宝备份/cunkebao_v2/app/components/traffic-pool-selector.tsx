"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search } from "lucide-react"

// 模拟流量池数据
const mockTrafficPools = [
  { id: "1", name: "抖音流量池", source: "抖音", count: 1200 },
  { id: "2", name: "微信流量池", source: "微信", count: 850 },
  { id: "3", name: "小红书流量池", source: "小红书", count: 650 },
  { id: "4", name: "知乎流量池", source: "知乎", count: 320 },
  { id: "5", name: "百度流量池", source: "百度", count: 480 },
]

interface TrafficPoolSelectorProps {
  onSelect: (poolId: string, poolName: string) => void
  selectedPoolId: string | null
  selectedPoolName: string
}

export function TrafficPoolSelector({ onSelect, selectedPoolId, selectedPoolName }: TrafficPoolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPools, setFilteredPools] = useState(mockTrafficPools)

  // 搜索过滤
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPools(mockTrafficPools)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = mockTrafficPools.filter(
        (pool) => pool.name.toLowerCase().includes(query) || pool.source.toLowerCase().includes(query),
      )
      setFilteredPools(filtered)
    }
  }, [searchQuery])

  // 处理选择
  const handleSelect = (poolId: string) => {
    const pool = mockTrafficPools.find((p) => p.id === poolId)
    if (pool) {
      onSelect(pool.id, pool.name)
      setIsOpen(false)
    }
  }

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            {selectedPoolId ? selectedPoolName : "选择流量池"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择流量池</DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索流量池..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <RadioGroup value={selectedPoolId || ""} onValueChange={handleSelect}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPools.map((pool) => (
                <Card
                  key={pool.id}
                  className={`cursor-pointer transition-all ${selectedPoolId === pool.id ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-4">
                    <RadioGroupItem value={pool.id} id={`pool-${pool.id}`} className="absolute right-4 top-4" />
                    <div className="space-y-2" onClick={() => handleSelect(pool.id)}>
                      <div className="font-medium">{pool.name}</div>
                      <div className="text-sm text-gray-500">来源: {pool.source}</div>
                      <div className="text-sm">流量数量: {pool.count.toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>
        </DialogContent>
      </Dialog>
    </div>
  )
}
