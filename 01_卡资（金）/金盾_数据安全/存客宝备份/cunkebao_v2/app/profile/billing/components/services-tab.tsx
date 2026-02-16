"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, CheckCircle } from "lucide-react"

// AI服务算力消耗标准
const mockAIServices = [
  {
    id: "chat",
    name: "智能对话",
    description: "AI聊天、客服回复、内容问答",
    powerCost: "1-5算力/次",
    icon: "💬",
    examples: ["客服自动回复", "智能问答", "对话生成"],
    avgCost: 2.5,
  },
  {
    id: "content",
    name: "内容生成",
    description: "朋友圈文案、营销内容、图文创作",
    powerCost: "3-10算力/次",
    icon: "✍️",
    examples: ["朋友圈文案", "营销内容", "文章创作"],
    avgCost: 6.5,
  },
  {
    id: "analysis",
    name: "数据分析",
    description: "用户画像、行为分析、趋势预测",
    powerCost: "5-15算力/次",
    icon: "📊",
    examples: ["用户画像", "行为分析", "数据报告"],
    avgCost: 10.0,
  },
  {
    id: "automation",
    name: "自动化服务",
    description: "自动回复、智能分发、批量处理",
    powerCost: "2-8算力/次",
    icon: "🤖",
    examples: ["自动回复", "批量处理", "智能分发"],
    avgCost: 5.0,
  },
]

export function ServicesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Info className="h-5 w-5 text-blue-600" />
            <span>AI服务算力消耗标准</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockAIServices.map((service) => (
              <Card key={service.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{service.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{service.name}</h4>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {service.powerCost}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">应用场景：</div>
                        <div className="flex flex-wrap gap-1">
                          {service.examples.map((example, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">平均消耗：</div>
                        <div className="font-medium text-blue-600">{service.avgCost} 算力/次</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 算力说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="text-blue-500 mt-0.5">💡</div>
            <div>
              <h4 className="font-bold text-blue-800 mb-4">算力计费说明</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>按需计费：根据实际AI服务使用量消耗算力</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>透明计费：每次AI调用都有详细的算力消耗记录</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>永不过期：算力永久有效，随时使用无时间限制</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>实时监控：提供详细的使用统计和消费分析</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 计费规则详情 */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6">
          <h4 className="font-bold text-gray-800 mb-4">详细计费规则</h4>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-gray-900 mb-2">基础计费</div>
                <div>每次AI调用根据处理复杂度和Token数量计算算力消耗</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-gray-900 mb-2">批量优惠</div>
                <div>大批量调用享受算力消耗优惠，最高可节省20%</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-gray-900 mb-2">失败退还</div>
                <div>AI调用失败时，消耗的算力将自动退还到账户</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
