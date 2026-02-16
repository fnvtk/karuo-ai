"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Shield, CheckCircle } from "lucide-react"

export function BillingFooter() {
  return (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-bold text-green-800 mb-4">安全保障承诺</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>算力永不过期，随时使用无时间限制</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>透明计费，每次AI调用都有详细记录</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>7x24小时专业技术支持服务</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>企业级数据安全和隐私保障</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
