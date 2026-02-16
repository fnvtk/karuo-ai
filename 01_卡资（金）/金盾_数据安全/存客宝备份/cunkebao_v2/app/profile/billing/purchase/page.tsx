"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Zap, Shield, CheckCircle, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { PaymentQRDialog } from "@/components/PaymentQRDialog"

// 算力套餐数据类型
interface ComputePackage {
  id: string
  name: string
  price: number
  computePower: number
  originalPrice?: number
  isRecommended?: boolean
  isTrialOnly?: boolean
  features: string[]
  badge?: string
  badgeColor?: string
}

// 预设算力套餐
const computePackages: ComputePackage[] = [
  {
    id: "trial",
    name: "试用套餐",
    price: 98,
    computePower: 2800,
    originalPrice: 140,
    isTrialOnly: true,
    badge: "限购一次",
    badgeColor: "bg-orange-100 text-orange-600",
    features: ["适合新用户体验", "包含基础AI功能", "永久有效", "客服支持"],
  },
  {
    id: "standard",
    name: "标准套餐",
    price: 1000,
    computePower: 28700,
    originalPrice: 1400,
    isRecommended: true,
    badge: "推荐",
    badgeColor: "bg-blue-100 text-blue-600",
    features: ["性价比最高", "适合中小企业", "永久有效", "优先客服支持"],
  },
  {
    id: "premium",
    name: "高级套餐",
    price: 3980,
    computePower: 114200,
    originalPrice: 5600,
    badge: "热门",
    badgeColor: "bg-green-100 text-green-600",
    features: ["大量算力储备", "适合大型项目", "永久有效", "专属客服支持"],
  },
  {
    id: "enterprise",
    name: "企业套餐",
    price: 5000,
    computePower: 143400,
    originalPrice: 7000,
    badge: "VIP",
    badgeColor: "bg-purple-100 text-purple-600",
    features: ["企业级服务", "无限制使用", "永久有效", "7x24小时支持"],
  },
]

export default function PurchasePage() {
  const router = useRouter()
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 处理套餐选择
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId)
    setCustomAmount("")
  }

  // 处理自定义金额变化
  const handleCustomAmountChange = (value: string) => {
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue) || numValue < 1 || numValue > 50000) {
      return
    }
    setCustomAmount(value)
    setSelectedPackage("custom")
  }

  // 计算自定义算力点数
  const getCustomComputePower = () => {
    const amount = Number.parseFloat(customAmount)
    return isNaN(amount) ? 0 : Math.floor(amount * 28)
  }

  // 计算单价
  const getUnitPrice = (price: number, computePower: number) => {
    return (price / computePower).toFixed(4)
  }

  // 处理购买
  const handlePurchase = () => {
    let purchaseData

    if (selectedPackage === "custom") {
      const amount = Number.parseFloat(customAmount)
      if (isNaN(amount) || amount < 1) {
        alert("请输入有效的自定义金额")
        return
      }
      purchaseData = {
        type: "custom",
        name: "自定义算力包",
        price: amount,
        computePower: getCustomComputePower(),
        orderId: `ORDER_${Date.now()}`,
      }
    } else {
      const pkg = computePackages.find((p) => p.id === selectedPackage)
      if (!pkg) {
        alert("请选择一个套餐")
        return
      }
      purchaseData = {
        type: "package",
        name: pkg.name,
        price: pkg.price,
        computePower: pkg.computePower,
        orderId: `ORDER_${Date.now()}`,
      }
    }

    setPaymentData(purchaseData)
    setShowPayment(true)
  }

  // 处理支付成功
  const handlePaymentSuccess = () => {
    setShowPayment(false)
    // 这里可以添加支付成功后的逻辑
    alert("购买成功！算力已充值到您的账户")
    router.back()
  }

  // 处理支付关闭
  const handlePaymentClose = () => {
    setShowPayment(false)
    setPaymentData(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 头部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-blue-500" />
              <h1 className="text-lg font-medium">购买算力包</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 套餐选择 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">选择套餐</h2>
          <div className="grid grid-cols-1 gap-4">
            {computePackages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedPackage === pkg.id ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
                } ${
                  pkg.isRecommended
                    ? "bg-gradient-to-br from-blue-50 via-white to-purple-50 border-blue-200"
                    : pkg.isTrialOnly
                      ? "bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-orange-200"
                      : "bg-white"
                }`}
                onClick={() => handlePackageSelect(pkg.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg text-gray-900">{pkg.name}</h3>
                      {pkg.badge && <Badge className={`${pkg.badgeColor} text-xs px-2 py-1`}>{pkg.badge}</Badge>}
                      {pkg.isRecommended && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-blue-600">¥{pkg.price}</span>
                        {pkg.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">¥{pkg.originalPrice}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{pkg.computePower.toLocaleString()} 算力点</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">单价</p>
                      <p className="font-semibold text-green-600">¥{getUnitPrice(pkg.price, pkg.computePower)}/点</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">优惠幅度</p>
                      <p className="font-semibold text-orange-600">
                        {pkg.originalPrice
                          ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {pkg.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 自定义购买 */}
        <Card className={`${selectedPackage === "custom" ? "ring-2 ring-blue-500 shadow-lg" : ""}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <span>自定义购买</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-amount" className="text-sm font-medium">
                  自定义金额 (1-50000元)
                </Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="请输入金额"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min="1"
                  max="50000"
                  className="mt-1"
                />
              </div>

              {customAmount && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600">可获得算力</p>
                      <p className="text-lg font-bold text-purple-600">{getCustomComputePower().toLocaleString()} 点</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">单价</p>
                      <p className="text-lg font-bold text-green-600">¥{(1 / 28).toFixed(4)}/点</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">换算比例: 1元 = 28算力点</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 安全保障 */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">安全保障</h3>
                <p className="text-sm text-green-700">
                  • 所有算力永久有效，无使用期限
                  <br />• 支持微信支付、支付宝安全支付
                  <br />• 购买后立即到账，7x24小时客服支持
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 购买按钮 */}
        <div className="sticky bottom-4">
          <Button
            onClick={handlePurchase}
            disabled={!selectedPackage}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg disabled:opacity-50"
          >
            {selectedPackage === "custom" && customAmount
              ? `立即购买 ¥${customAmount} (${getCustomComputePower().toLocaleString()} 算力点)`
              : selectedPackage && selectedPackage !== "custom"
                ? `立即购买 ${computePackages.find((p) => p.id === selectedPackage)?.name}`
                : "请选择套餐"}
          </Button>
        </div>
      </div>

      {/* 支付弹窗 */}
      {showPayment && paymentData && (
        <PaymentQRDialog
          isOpen={showPayment}
          onClose={handlePaymentClose}
          amount={paymentData.price}
          orderId={paymentData.orderId}
          description={`购买${paymentData.name} - ${paymentData.computePower.toLocaleString()}算力点`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
