"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"

export default function NewPaymentCodePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    description: "",
    paymentMethod: "wechat",
    amountType: "fixed",
    enableDistribution: false,
    distributionType: "percentage",
    distributionValue: "",
    enableRedPacket: false,
    redPacketAmount: "",
    enableAutoWelcome: false,
    welcomeMessage: "",
    tags: [],
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    // 表单验证
    if (!formData.name) {
      toast({
        title: "请输入付款码名称",
        variant: "destructive",
      })
      return
    }

    if (formData.amountType === "fixed" && !formData.amount) {
      toast({
        title: "请输入付款金额",
        variant: "destructive",
      })
      return
    }

    // 模拟API调用
    setTimeout(() => {
      toast({
        title: "付款码创建成功",
        description: "您可以在付款码列表中查看和管理",
      })
      router.push("/scenarios/payment")
    }, 1000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-medium">新建付款码</h1>
          </div>
        </div>
      </header>

      {/* 表单内容 */}
      <div className="flex-1 p-4 pb-20">
        <Card className="mb-4">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-medium">基本信息</h2>

            <div className="space-y-2">
              <Label htmlFor="name">付款码名称</Label>
              <Input
                id="name"
                placeholder="请输入付款码名称"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">支付方式</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleChange("paymentMethod", value)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="选择支付方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wechat">微信支付</SelectItem>
                  <SelectItem value="alipay">支付宝</SelectItem>
                  <SelectItem value="both">微信和支付宝</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>金额设置</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">
                        固定金额：生成固定金额的付款码
                        <br />
                        自由金额：用户可自行输入支付金额
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <RadioGroup
                value={formData.amountType}
                onValueChange={(value) => handleChange("amountType", value)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">固定金额</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free">自由金额</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.amountType === "fixed" && (
              <div className="space-y-2">
                <Label htmlFor="amount">付款金额 (元)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="请输入付款金额"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">付款描述</Label>
              <Textarea
                id="description"
                placeholder="请输入付款描述，用户支付时可见"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-medium">高级设置</h2>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableDistribution">启用分销返利</Label>
                <p className="text-xs text-gray-500">开启后，用户付款可触发分销返利</p>
              </div>
              <Switch
                id="enableDistribution"
                checked={formData.enableDistribution}
                onCheckedChange={(checked) => handleChange("enableDistribution", checked)}
              />
            </div>

            {formData.enableDistribution && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                <div className="space-y-2">
                  <Label htmlFor="distributionType">返利类型</Label>
                  <Select
                    value={formData.distributionType}
                    onValueChange={(value) => handleChange("distributionType", value)}
                  >
                    <SelectTrigger id="distributionType">
                      <SelectValue placeholder="选择返利类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">比例返利</SelectItem>
                      <SelectItem value="fixed">固定金额</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distributionValue">
                    {formData.distributionType === "percentage" ? "返利比例 (%)" : "返利金额 (元)"}
                  </Label>
                  <Input
                    id="distributionValue"
                    type="number"
                    step={formData.distributionType === "percentage" ? "1" : "0.01"}
                    placeholder={formData.distributionType === "percentage" ? "例如：10" : "例如：5"}
                    value={formData.distributionValue}
                    onChange={(e) => handleChange("distributionValue", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableRedPacket">启用红包奖励</Label>
                <p className="text-xs text-gray-500">开启后，用户付款可获得红包奖励</p>
              </div>
              <Switch
                id="enableRedPacket"
                checked={formData.enableRedPacket}
                onCheckedChange={(checked) => handleChange("enableRedPacket", checked)}
              />
            </div>

            {formData.enableRedPacket && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-100">
                <Label htmlFor="redPacketAmount">红包金额 (元)</Label>
                <Input
                  id="redPacketAmount"
                  type="number"
                  step="0.01"
                  placeholder="例如：5"
                  value={formData.redPacketAmount}
                  onChange={(e) => handleChange("redPacketAmount", e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableAutoWelcome">自动欢迎语</Label>
                <p className="text-xs text-gray-500">开启后，用户付款成功后自动发送欢迎语</p>
              </div>
              <Switch
                id="enableAutoWelcome"
                checked={formData.enableAutoWelcome}
                onCheckedChange={(checked) => handleChange("enableAutoWelcome", checked)}
              />
            </div>

            {formData.enableAutoWelcome && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-100">
                <Label htmlFor="welcomeMessage">欢迎语内容</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="请输入欢迎语内容"
                  value={formData.welcomeMessage}
                  onChange={(e) => handleChange("welcomeMessage", e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="font-medium">客户标签设置</h2>
            <p className="text-sm text-gray-500">设置通过此付款码添加的客户自动打上的标签</p>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-full">
                付款客户
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                高价值
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                已成交
              </Button>
              <Button variant="outline" size="sm" className="rounded-full text-blue-500">
                + 添加标签
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button onClick={handleSubmit}>创建付款码</Button>
      </div>
    </div>
  )
}
