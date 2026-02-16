"use client"

import { useState, useEffect } from "react"
import { X, Copy, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentPackage {
  id: string
  name: string
  points: number
  price: number
  originalPrice?: number
  description?: string
}

interface PaymentQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageInfo: PaymentPackage
}

type PaymentStatus = "pending" | "success" | "failed" | "expired"
type PaymentMethod = "wechat" | "alipay"

export function PaymentQRDialog({ open, onOpenChange, packageInfo }: PaymentQRDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wechat")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending")
  const [timeLeft, setTimeLeft] = useState(300) // 5分钟倒计时
  const [orderId, setOrderId] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  // 生成订单号
  useEffect(() => {
    if (open) {
      const newOrderId = `CKB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      setOrderId(newOrderId)
      setPaymentStatus("pending")
      setTimeLeft(300)
    }
  }, [open])

  // 生成二维码URL
  useEffect(() => {
    if (orderId) {
      const baseUrl =
        paymentMethod === "wechat"
          ? "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=weixin://wxpay/bizpayurl?pr="
          : "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=alipays://platformapi/startapp?saId=10000007&qrcode="

      setQrCodeUrl(`${baseUrl}${orderId}`)
    }
  }, [orderId, paymentMethod])

  // 倒计时
  useEffect(() => {
    if (paymentStatus === "pending" && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && paymentStatus === "pending") {
      setPaymentStatus("expired")
    }
  }, [timeLeft, paymentStatus])

  // 模拟支付状态检查
  useEffect(() => {
    if (paymentStatus === "pending" && orderId) {
      // 模拟30秒后支付成功（仅用于演示）
      const timer = setTimeout(() => {
        if (Math.random() > 0.3) {
          // 70%概率成功
          setPaymentStatus("success")
        } else {
          setPaymentStatus("failed")
        }
      }, 30000)

      return () => clearTimeout(timer)
    }
  }, [paymentStatus, orderId])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // 复制订单号
  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      // 这里可以添加toast提示
    } catch (error) {
      console.error("复制失败:", error)
    }
  }

  // 刷新二维码
  const refreshQRCode = () => {
    const newOrderId = `CKB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    setOrderId(newOrderId)
    setTimeLeft(300)
    setPaymentStatus("pending")
  }

  // 重置状态
  const handleClose = () => {
    setPaymentStatus("pending")
    setTimeLeft(300)
    setOrderId("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>支付订单</span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 商品信息 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{packageInfo.name}</h3>
                  <p className="text-sm text-gray-500">{packageInfo.points} 算力点</p>
                  {packageInfo.description && <p className="text-xs text-gray-400 mt-1">{packageInfo.description}</p>}
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-red-600">¥{packageInfo.price}</span>
                    {packageInfo.originalPrice && packageInfo.originalPrice > packageInfo.price && (
                      <span className="text-sm text-gray-400 line-through">¥{packageInfo.originalPrice}</span>
                    )}
                  </div>
                  {packageInfo.originalPrice && packageInfo.originalPrice > packageInfo.price && (
                    <Badge variant="destructive" className="text-xs">
                      省¥{packageInfo.originalPrice - packageInfo.price}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 支付状态显示 */}
          {paymentStatus === "success" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-800">支付成功！</h3>
                <p className="text-sm text-green-600 mt-1">{packageInfo.points} 算力点已到账</p>
                <Button className="mt-3" onClick={handleClose}>
                  完成
                </Button>
              </CardContent>
            </Card>
          )}

          {paymentStatus === "failed" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <XCircle className="h-12 w-12 text-red-600 mx-auto mb-2" />
                <h3 className="font-medium text-red-800">支付失败</h3>
                <p className="text-sm text-red-600 mt-1">请重试或联系客服</p>
                <Button className="mt-3" onClick={refreshQRCode}>
                  重新支付
                </Button>
              </CardContent>
            </Card>
          )}

          {paymentStatus === "expired" && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 text-center">
                <Clock className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                <h3 className="font-medium text-orange-800">二维码已过期</h3>
                <p className="text-sm text-orange-600 mt-1">请刷新二维码重新支付</p>
                <Button className="mt-3" onClick={refreshQRCode}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新二维码
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 支付二维码 */}
          {paymentStatus === "pending" && (
            <div className="space-y-4">
              <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="wechat" className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>微信支付</span>
                  </TabsTrigger>
                  <TabsTrigger value="alipay" className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>支付宝</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="wechat" className="mt-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        <img
                          src={qrCodeUrl || "/placeholder.svg"}
                          alt="微信支付二维码"
                          className="w-48 h-48 mx-auto border rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">请使用微信扫描二维码完成支付</p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span>剩余时间: {formatTime(timeLeft)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="alipay" className="mt-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        <img
                          src={qrCodeUrl || "/placeholder.svg"}
                          alt="支付宝支付二维码"
                          className="w-48 h-48 mx-auto border rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">请使用支付宝扫描二维码完成支付</p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span>剩余时间: {formatTime(timeLeft)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* 订单信息 */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">订单号:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">{orderId}</span>
                      <Button variant="ghost" size="sm" onClick={copyOrderId}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 支付说明 */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 支付完成后算力点将自动到账</p>
                <p>• 如遇问题请联系客服: 400-123-4567</p>
                <p>• 支付时限为5分钟，过期请重新生成</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
