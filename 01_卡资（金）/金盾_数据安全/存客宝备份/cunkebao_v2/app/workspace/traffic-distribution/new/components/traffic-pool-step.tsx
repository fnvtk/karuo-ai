"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Database } from "lucide-react"

interface TrafficPool {
  id: string
  name: string
  count: number
  description: string
}

interface TrafficPoolStepProps {
  onSubmit: (data: any) => void
  onBack: () => void
  initialData?: any
}

export default function TrafficPoolStep({ onSubmit, onBack, initialData = {} }: TrafficPoolStepProps) {
  const [selectedPools, setSelectedPools] = useState<string[]>(initialData.selectedPools || [])
  const [searchTerm, setSearchTerm] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 模拟流量池数据
  const trafficPools: TrafficPool[] = [
    { id: "1", name: "新客流量池", count: 1250, description: "新获取的客户流量" },
    { id: "2", name: "高意向流量池", count: 850, description: "有购买意向的客户" },
    { id: "3", name: "复购流量池", count: 620, description: "已购买过产品的客户" },
    { id: "4", name: "活跃流量池", count: 1580, description: "近期活跃的客户" },
    { id: "5", name: "沉睡流量池", count: 2300, description: "长期未活跃的客户" },
  ]

  const filteredPools = trafficPools.filter(
    (pool) =>
      pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const togglePool = (id: string) => {
    setSelectedPools((prev) => (prev.includes(id) ? prev.filter((poolId) => poolId !== id) : [...prev, id]))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // 这里可以添加实际的提交逻辑
      await new Promise((resolve) => setTimeout(resolve, 1000)) // 模拟API请求

      onSubmit({
        selectedPools,
        // 可以添加其他需要提交的数据
      })
    } catch (error) {
      console.error("提交失败:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-6">流量池选择</h2>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="搜索流量池"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {filteredPools.map((pool) => (
          <Card
            key={pool.id}
            className={`cursor-pointer border ${selectedPools.includes(pool.id) ? "border-blue-500" : "border-gray-200"}`}
            onClick={() => togglePool(pool.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{pool.name}</p>
                  <p className="text-sm text-gray-500">{pool.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{pool.count} 人</span>
                <Checkbox
                  checked={selectedPools.includes(pool.id)}
                  onCheckedChange={() => togglePool(pool.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← 上一步
        </Button>
        <Button onClick={handleSubmit} disabled={selectedPools.length === 0 || isSubmitting}>
          {isSubmitting ? "提交中..." : "完成"}
        </Button>
      </div>
    </div>
  )
}
