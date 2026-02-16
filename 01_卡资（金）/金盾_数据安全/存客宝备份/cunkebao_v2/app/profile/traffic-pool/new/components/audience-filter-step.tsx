"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface AudienceFilterStepProps {
  formData: {
    scheme: string
    industry: string
    tags: string[]
  }
  setFormData: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

const tagOptions = [
  { id: "high-value", label: "高价值用户", color: "bg-blue-500" },
  { id: "new-user", label: "新用户", color: "bg-green-500" },
  { id: "active", label: "活跃用户", color: "bg-orange-500" },
  { id: "churn-risk", label: "流失风险", color: "bg-pink-500" },
  { id: "high-repurchase", label: "复购率高", color: "bg-purple-500" },
  { id: "high-potential", label: "高潜力", color: "bg-pink-600" },
  { id: "dormant", label: "已沉睡", color: "bg-gray-400" },
  { id: "price-sensitive", label: "价格敏感", color: "bg-cyan-500" },
]

export function AudienceFilterStep({ formData, setFormData, onNext, onPrev }: AudienceFilterStepProps) {
  const toggleTag = (tagId: string) => {
    const newTags = formData.tags.includes(tagId) ? formData.tags.filter((t) => t !== tagId) : [...formData.tags, tagId]
    setFormData({ ...formData, tags: newTags })
  }

  return (
    <div className="p-4 pb-24">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-6">人群筛选</h2>

          <div className="space-y-6">
            {/* 方案推荐 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">方案推荐</Label>
              <div className="flex gap-2">
                <Select value={formData.scheme} onValueChange={(value) => setFormData({ ...formData, scheme: value })}>
                  <SelectTrigger className="flex-1 h-12">
                    <SelectValue placeholder="选择预设方案" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high-value">高价值客户方案</SelectItem>
                    <SelectItem value="new-user">新用户培育方案</SelectItem>
                    <SelectItem value="churn">流失预警方案</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-12 px-4 bg-transparent">
                  <Plus className="h-4 w-4 mr-1" />
                  添加方案
                </Button>
              </div>
            </div>

            {/* 行业 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">行业</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData({ ...formData, industry: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="选择行业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">电商零售</SelectItem>
                  <SelectItem value="education">教育培训</SelectItem>
                  <SelectItem value="finance">金融服务</SelectItem>
                  <SelectItem value="healthcare">医疗健康</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 标签筛选 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">标签筛选</Label>
              <div className="grid grid-cols-2 gap-3">
                {tagOptions.map((tag) => (
                  <Button
                    key={tag.id}
                    variant={formData.tags.includes(tag.id) ? "default" : "outline"}
                    className={`h-12 text-base ${
                      formData.tags.includes(tag.id) ? `${tag.color} text-white hover:opacity-90` : ""
                    }`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 添加自定义条件 */}
            <Button variant="outline" className="w-full h-12 border-dashed bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              添加自定义条件
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrev}
            className="flex-1 h-12 text-base font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            上一步
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-lg"
          >
            下一步
          </Button>
        </div>
      </div>
    </div>
  )
}
