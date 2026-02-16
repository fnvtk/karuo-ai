"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface BasicInfoStepProps {
  formData: {
    name: string
    description: string
    notes: string
  }
  setFormData: (data: any) => void
  onNext: () => void
}

export function BasicInfoStep({ formData, setFormData, onNext }: BasicInfoStepProps) {
  const handleNext = () => {
    if (!formData.name.trim()) {
      alert("请输入流量包名称")
      return
    }
    onNext()
  }

  return (
    <div className="p-4 pb-24">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-6">基本信息</h2>

          <div className="space-y-6">
            {/* 流量包名称 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                流量包名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入流量包名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">
                描述
              </Label>
              <Textarea
                id="description"
                placeholder="输入流量包描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">
                备注
              </Label>
              <Textarea
                id="notes"
                placeholder="输入备注信息（选填）"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <Button
          onClick={handleNext}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-lg"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
