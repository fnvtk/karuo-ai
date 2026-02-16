"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// 算力版本套餐
const mockVersionPackages = [
  {
    id: "free",
    name: "免费版本",
    description: "基础算力服务，适合个人体验",
    price: 0,
    features: ["每日免费10算力", "基础AI功能", "标准客服支持"],
    current: false,
    icon: "🆓",
  },
  {
    id: "standard",
    name: "标准版本",
    description: "适合中小企业，算力使用更灵活",
    price: 98,
    unit: "月",
    features: ["每月赠送500算力", "高级AI功能", "优先客服支持", "详细使用报告"],
    current: true,
    icon: "⭐",
  },
  {
    id: "enterprise",
    name: "企业版本",
    description: "大型企业专用，无限算力支持",
    price: 1980,
    unit: "月",
    features: ["每月赠送10000算力", "企业级AI服务", "专属客户经理", "定制化开发"],
    current: false,
    icon: "👑",
  },
]

export function PackagesTab() {
  const handleUpgrade = (packageId: string) => {
    console.log("升级版本:", packageId)
  }

  return (
    <div className="space-y-5">
      <div className="text-center mb-5">
        <h3 className="font-medium mb-2 text-base">存客宝算力版本套餐</h3>
        <p className="text-sm text-gray-600">选择适合的版本，享受不同级别的算力服务</p>
      </div>

      <div className="space-y-4">
        {mockVersionPackages.map((pkg) => (
          <Card key={pkg.id} className={`border ${pkg.current ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xl">{pkg.icon}</div>
                    <h4 className="font-medium text-base">{pkg.name}</h4>
                    {pkg.current && <Badge className="bg-blue-500 text-white text-xs">当前使用中</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>

                  <div className="text-sm text-gray-500">
                    {pkg.features.map((feature, index) => (
                      <span key={index}>
                        {feature}
                        {index < pkg.features.length - 1 && " • "}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right ml-6">
                  {pkg.price === 0 ? (
                    <div className="text-xl font-bold text-green-600">免费</div>
                  ) : (
                    <div>
                      <div className="text-xl font-bold text-purple-600">¥{pkg.price}</div>
                      <div className="text-sm text-gray-500">/{pkg.unit}</div>
                    </div>
                  )}

                  <Button
                    className={`mt-3 ${pkg.current ? "bg-gray-400" : "bg-purple-500 hover:bg-purple-600"} text-white px-6`}
                    disabled={pkg.current}
                    onClick={() => handleUpgrade(pkg.id)}
                  >
                    {pkg.current ? "使用中" : "立即升级"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
