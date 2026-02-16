"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import type { OrderFormData } from "@/types/acquisition"

export default function OrderSubmitPage({ params }: { params: { planId: string } }) {
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    phone: "",
    wechatId: "",
    source: "",
    amount: undefined,
    orderDate: new Date().toISOString().split("T")[0],
    remark: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`/api/acquisition/${params.planId}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "提交成功",
          description: "订单信息已成功提交",
        })
        // 重置表单
        setFormData({
          customerName: "",
          phone: "",
          wechatId: "",
          source: "",
          amount: undefined,
          orderDate: new Date().toISOString().split("T")[0],
          remark: "",
        })
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast({
        title: "提交失败",
        description: "订单提交失败，请稍后重试",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-6">订单信息录入</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customerName">客户姓名</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">手机号码</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="wechatId">微信号</Label>
              <Input
                id="wechatId"
                value={formData.wechatId}
                onChange={(e) => setFormData((prev) => ({ ...prev, wechatId: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="source">来源</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">订单金额</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="orderDate">下单日期</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full">
              提交订单
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
