import { NextResponse } from "next/server"
import type { OrderFormData } from "@/types/acquisition"

export async function POST(request: Request, { params }: { params: { planId: string } }) {
  try {
    const data: OrderFormData = await request.json()

    // 这里应该添加实际的数据库存储逻辑
    console.log("Received order:", data, "for plan:", params.planId)

    // 模拟成功响应
    return NextResponse.json({
      success: true,
      message: "订单已成功提交",
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: "订单提交失败" }, { status: 500 })
  }
}
