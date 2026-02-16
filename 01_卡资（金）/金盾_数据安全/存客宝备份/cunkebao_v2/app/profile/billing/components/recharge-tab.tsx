"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, CreditCard, Clock, Target, Shield, CheckCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// 更新后的算力充值套餐
const mockPowerPackages = [
  {
    id: "basic",
    name: "基础算力包",
    description: "适合个人用户日常使用",
    power: 1000,
    price: 98,
    originalPrice: 200,
    discount: 51,
    popular: false,
    features: ["基础AI对话", "内容生成", "7x24技术支持"],
    validDays: "永久有效",
    avgCostPerPower: 0.098,
  },
  {
    id: "standard",
    name: "标准算力包",
    description: "适合小团队批量使用",
    power: 7500,
    price: 598,
    originalPrice: 1500,
    discount: 60,
    popular: true,
    features: ["全功能AI服务", "优先技术支持", "使用统计报告", "API接入"],
    validDays: "永久有效",
    avgCostPerPower: 0.08,
  },
  {
    id: "premium",
    name: "高级算力包",
    description: "适合企业级大规模使用",
    power: 250000,
    price: 19800,
    originalPrice: 50000,
    discount: 60,
    popular: false,
    features: ["企业级AI服务", "专属客服", "定制化方案", "SLA保障", "数据安全认证"],
    validDays: "永久有效",
    avgCostPerPower: 0.079,
  },
]

export function RechargeTab() {
  const [customAmount, setCustomAmount] = useState("")

  const handlePurchasePower = (packageId: string) => {
    const pkg = mockPowerPackages.find((p) => p.id === packageId)
    if (pkg) {
      toast({
        title: "购买成功",
        description: `已成功购买 ${pkg.name}，获得 ${pkg.power.toLocaleString()} 算力`,
      })
    }
  }

  const handleCustomPurchase = () => {
    const amount = Number.parseFloat(customAmount)
    if (amount >= 50 && amount <= 50000) {
      const power = Math.floor(amount * 10) // 1元=10算力
      toast({
        title: "购买成功",
        description: `已成功购买 ${power.toLocaleString()} 算力`,
      })
      setCustomAmount("")
    } else {
      toast({
        title: "购买失败",
        description: "购买金额需在50-50000元之间",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>算力充值套餐</span>
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>安全支付保障</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockPowerPackages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`border-2 transition-all hover:shadow-lg ${
                  pkg.popular
                    ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h4 className="text-xl font-bold text-gray-900">{pkg.name}</h4>
                        {pkg.popular && (
                          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">🔥 热门推荐</Badge>
                        )}
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {pkg.discount}% OFF
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{pkg.description}</p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          <span className="font-bold text-blue-600 text-lg">{pkg.power.toLocaleString()} 算力</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{pkg.validDays}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 font-medium">套餐特权：</div>
                        <div className="flex flex-wrap gap-2">
                          {pkg.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-8">
                      <div className="mb-2">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-bold text-red-600">¥{pkg.price.toLocaleString()}</span>
                          <span className="text-lg text-gray-400 line-through">
                            ¥{pkg.originalPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          节省 ¥{(pkg.originalPrice - pkg.price).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mb-4">平均 ¥{pkg.avgCostPerPower.toFixed(3)}/算力</div>

                      <Button
                        size="lg"
                        className={`w-full ${
                          pkg.popular
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                            : "bg-blue-500 hover:bg-blue-600"
                        } text-white font-medium`}
                        onClick={() => handlePurchasePower(pkg.id)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        立即购买
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 自定义购买算力 */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h4 className="text-lg font-bold text-gray-900 mb-2">自定义算力包</h4>
            <p className="text-gray-600">根据您的实际需求，灵活购买算力</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="text-sm text-gray-600 mb-3 text-center">购买范围：50-50000元 (1元=10算力) | 永久有效</div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="请输入购买金额"
                  min="50"
                  max="50000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                />
              </div>
              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                onClick={handleCustomPurchase}
                disabled={!customAmount || Number(customAmount) < 50}
              >
                立即购买
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 支付保障说明 */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h4 className="font-bold text-green-800 mb-3">安全保障承诺</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>算力永不过期，随时使用</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>透明计费，每次调用可查</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>7x24小时技术支持</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>企业级数据安全保障</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
