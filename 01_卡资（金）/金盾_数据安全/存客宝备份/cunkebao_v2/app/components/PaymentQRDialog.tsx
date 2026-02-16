"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Smartphone, Clock, CheckCircle, XCircle, RefreshCw, Copy, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Zap } from "lucide-react" // Import Zap here

interface PaymentQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageInfo: {
    id: string
    name: string
    amount: number
    price: number
    validity: number
    discount?: number
  }
  onPaymentSuccess?: () => void
}

type PaymentStatus = "pending" | "success" | "failed" | "expired" | "checking"
type PaymentMethod = "wechat" | "alipay"

export function PaymentQRDialog({ open, onOpenChange, packageInfo, onPaymentSuccess }: PaymentQRDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending")
  const [countdown, setCountdown] = useState(300) // 5分钟倒计时
  const [orderId, setOrderId] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [checkingPayment, setCheckingPayment] = useState(false)

  // 生成订单ID和二维码
  useEffect(() => {
    if (open) {
      const newOrderId = `CKB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      setOrderId(newOrderId)

      // 生成二维码URL - 实际应该调用后端API获取预支付链接
      const paymentUrl = `${paymentMethod}://pay?orderId=${newOrderId}&amount=${packageInfo.price}&product=${encodeURIComponent(packageInfo.name)}`
      const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentUrl)}`
      setQrCodeUrl(mockQRCode)

      // 重置状态
      setPaymentStatus("pending")
      setCountdown(300)
      setCheckingPayment(false)
    }
  }, [open, paymentMethod, packageInfo])

  // 倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (open && paymentStatus === "pending" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setPaymentStatus("expired")
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [open, paymentStatus, countdown])

  // 自动检查支付状态
  useEffect(() => {
    let statusTimer: NodeJS.Timeout
    if (open && paymentStatus === "pending") {
      statusTimer = setInterval(async () => {
        // 实际应该调用后端API检查支付状态
        // const result = await checkPaymentStatus(orderId)
        // if (result.status === 'success') {
        //   setPaymentStatus('success')
        //   onPaymentSuccess?.()
        // }

        // 模拟支付状态检查(10%概率成功)
        if (Math.random() > 0.9) {
          setPaymentStatus("success")
          onPaymentSuccess?.()
          toast({
            title: "支付成功",
            description: `${packageInfo.amount}算力已添加到您的账户`,
          })
        }
      }, 3000) // 每3秒检查一次
    }
    return () => clearInterval(statusTimer)
  }, [open, paymentStatus, orderId, packageInfo, onPaymentSuccess])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatExpireTime = () => {
    const now = new Date()
    const expireTime = new Date(now.getTime() + countdown * 1000)
    return expireTime.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    toast({
      title: "复制成功",
      description: "订单号已复制到剪贴板",
    })
  }

  const handleRefreshQR = () => {
    setCountdown(300)
    setPaymentStatus("pending")
    const newOrderId = `CKB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    setOrderId(newOrderId)

    const paymentUrl = `${paymentMethod}://pay?orderId=${newOrderId}&amount=${packageInfo.price}&product=${encodeURIComponent(packageInfo.name)}`
    const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentUrl)}`
    setQrCodeUrl(mockQRCode)

    toast({
      title: "二维码已刷新",
      description: "请使用新的二维码进行支付",
    })
  }

  const handleManualCheck = async () => {
    setCheckingPayment(true)

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 实际应该调用后端API检查
    // const result = await checkPaymentStatus(orderId)
    // if (result.status === 'success') {
    //   setPaymentStatus('success')
    //   onPaymentSuccess?.()
    // }

    // 模拟随机结果
    if (Math.random() > 0.7) {
      setPaymentStatus("success")
      onPaymentSuccess?.()
      toast({
        title: "支付成功",
        description: `${packageInfo.amount}算力已添加到您的账户`,
      })
    } else {
      toast({
        title: "未检测到支付",
        description: "请确认已完成支付后重试",
        variant: "destructive",
      })
    }

    setCheckingPayment(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    // 延迟重置状态，避免关闭动画时看到状态变化
    setTimeout(() => {
      setPaymentStatus("pending")
      setCountdown(300)
      setCheckingPayment(false)
    }, 300)
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "success":
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case "failed":
        return <XCircle className="h-16 w-16 text-red-500" />
      case "expired":
        return <AlertTriangle className="h-16 w-16 text-yellow-500" />
      case "checking":
        return <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-16 w-16 text-blue-500" />
    }
  }

  const getStatusText = () => {
    switch (paymentStatus) {
      case "success":
        return "支付成功"
      case "failed":
        return "支付失败"
      case "expired":
        return "二维码已过期"
      case "checking":
        return "正在确认支付..."
      default:
        return "等待支付"
    }
  }

  const getStatusDescription = () => {
    switch (paymentStatus) {
      case "success":
        return "算力包已成功添加到您的账户，即可使用"
      case "failed":
        return "支付过程中出现问题，请重新尝试或联系客服"
      case "expired":
        return "支付二维码已过期，请刷新后重新扫码支付"
      case "checking":
        return "正在向支付平台确认您的支付状态，请稍候..."
      default:
        return `请在 ${formatTime(countdown)} 内完成支付`
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[95vw] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">购买算力包</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 商品信息卡片 */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-gray-900">{packageInfo.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-600">算力点数:</span>
                    <span className="text-lg font-bold text-blue-600">{packageInfo.amount.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">有效期: 永久</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">¥{packageInfo.price}</div>
                  {packageInfo.discount && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      省{packageInfo.discount}%
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {paymentStatus === "pending" && (
            <>
              {/* 支付方式选择 */}
              <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wechat" className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">微</span>
                    </div>
                    <span>微信支付</span>
                  </TabsTrigger>
                  <TabsTrigger value="alipay" className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">支</span>
                    </div>
                    <span>支付宝</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="wechat" className="mt-4">
                  <div className="text-center space-y-4">
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="微信支付二维码"
                        className="w-56 h-56 mx-auto"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=224&width=224&text=微信支付二维码"
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <Smartphone className="h-5 w-5" />
                      <span className="text-sm font-medium">请使用微信扫码支付</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="alipay" className="mt-4">
                  <div className="text-center space-y-4">
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="支付宝支付二维码"
                        className="w-56 h-56 mx-auto"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=224&width=224&text=支付宝二维码"
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Smartphone className="h-5 w-5" />
                      <span className="text-sm font-medium">请使用支付宝扫码支付</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* 倒计时和订单信息 */}
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">支付剩余时间</span>
                    </div>
                    <div className="font-mono text-xl font-bold text-blue-600">{formatTime(countdown)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                    <span className="text-blue-700">二维码有效期至</span>
                    <span className="font-medium text-blue-900">{formatExpireTime()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                    <span className="text-blue-700">订单号</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-900 text-xs">{orderId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyOrderId}
                        className="h-6 w-6 text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 手动确认支付按钮 */}
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleManualCheck}
                disabled={checkingPayment}
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    正在确认...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    我已完成支付
                  </>
                )}
              </Button>
            </>
          )}

          {/* 支付状态显示 */}
          {paymentStatus !== "pending" && (
            <div className="text-center space-y-6 py-8">
              {getStatusIcon()}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{getStatusText()}</h3>
                <p className="text-sm text-gray-600 px-4">{getStatusDescription()}</p>
              </div>

              {paymentStatus === "expired" && (
                <div className="space-y-3">
                  <Button onClick={handleRefreshQR} className="w-full" size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新二维码
                  </Button>
                  <Button onClick={handleClose} variant="outline" className="w-full bg-transparent">
                    取消支付
                  </Button>
                </div>
              )}

              {paymentStatus === "success" && (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm text-green-800">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">订单号</span>
                          <span className="font-mono font-medium">{orderId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">算力包</span>
                          <span className="font-medium">{packageInfo.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">算力点数</span>
                          <span className="font-bold text-green-600">+{packageInfo.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">支付金额</span>
                          <span className="font-bold">¥{packageInfo.price}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">支付方式</span>
                          <span className="font-medium">{paymentMethod === "wechat" ? "微信支付" : "支付宝"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button onClick={handleClose} className="w-full" size="lg">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    完成
                  </Button>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="space-y-3">
                  <Button onClick={handleRefreshQR} variant="default" className="w-full" size="lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新支付
                  </Button>
                  <Button onClick={handleClose} variant="outline" className="w-full bg-transparent">
                    取消
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 支付说明 */}
          {paymentStatus === "pending" && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-500" />
                  支付说明
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>请在5分钟内完成支付，超时后需重新生成二维码</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>支付成功后算力将立即到账，可在账户中查看</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>支持自动检测支付状态，无需手动刷新</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>如遇问题请联系客服：400-123-4567</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>支持7天无理由退款（未使用部分按比例退款）</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
