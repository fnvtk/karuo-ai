"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Edit, Trash2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

// 模拟定价数据
const mockPricingData = [
  {
    id: "1",
    name: "普通流量包",
    price: 0.5,
    tags: ["新用户", "低活跃度"],
    region: "全国",
    deviceAddQuantity: 10,
  },
  {
    id: "2",
    name: "高质量流量",
    price: 2.5,
    tags: ["高消费", "高活跃度"],
    region: "一线城市",
    deviceAddQuantity: 25,
  },
  {
    id: "3",
    name: "精准营销流量",
    price: 3.8,
    tags: ["潜在客户", "有购买意向"],
    region: "华东地区",
    deviceAddQuantity: 50,
  },
  {
    id: "4",
    name: "节日促销流量",
    price: 1.5,
    tags: ["节日消费", "促销敏感"],
    region: "全国",
    deviceAddQuantity: 15,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [pricingItems, setPricingItems] = useState(mockPricingData)

  const handleDelete = (id: string) => {
    setPricingItems(pricingItems.filter((item) => item.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workspace")} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-medium">流量分发</h1>

          <Button className="flex items-center gap-1" onClick={() => router.push("/workspace/pricing/new")}>
            <Plus className="h-4 w-4" />
            <span>新建分发</span>
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-4">
          {pricingItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无分发规则，请点击右上角新建分发</p>
            </div>
          ) : (
            pricingItems.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">{item.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-emerald-600">¥{item.price.toFixed(2)}</span>
                      <span className="text-gray-500 text-sm">/ 流量包</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">总添加人数: {item.deviceAddQuantity} 人</div>
                    <div className="flex flex-wrap gap-2 items-center mt-2">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          {tag}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="bg-amber-50">
                        {item.region}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/workspace/pricing/edit/${item.id}`)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
