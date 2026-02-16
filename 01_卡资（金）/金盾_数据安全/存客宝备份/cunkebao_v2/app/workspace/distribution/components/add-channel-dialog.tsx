"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { User, QrCode, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AddChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 新增渠道弹窗组件 - 苹果毛玻璃风格
export function AddChannelDialog({ open, onOpenChange }: AddChannelDialogProps) {
  const [createType, setCreateType] = useState<"manual" | "scan">("manual")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    wechat: "",
    remark: "",
  })

  // 表单验证
  const isFormValid = formData.name.trim() !== ""

  // 提交表单
  const handleSubmit = () => {
    if (!isFormValid) {
      toast({
        title: "请填写渠道名称",
        variant: "destructive",
      })
      return
    }

    // 模拟创建渠道
    toast({
      title: "创建成功",
      description: `渠道 "${formData.name}" 已创建`,
    })

    // 重置表单
    setFormData({ name: "", phone: "", wechat: "", remark: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-0 gap-0 bg-white/95 backdrop-blur-2xl border-0 shadow-2xl overflow-hidden">
        {/* 标题区域 */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">新增渠道</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">选择创建方式: 手动填写或扫码获取微信信息</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* 创建方式选择 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={createType === "manual" ? "default" : "outline"}
              className={`h-12 rounded-2xl transition-all ${
                createType === "manual"
                  ? "bg-white text-gray-900 border-2 border-blue-500 hover:bg-white shadow-lg"
                  : "bg-gray-100 text-gray-600 border-0 hover:bg-gray-200"
              }`}
              onClick={() => setCreateType("manual")}
            >
              <User className="h-4 w-4 mr-2" />
              手动创建
            </Button>
            <Button
              variant={createType === "scan" ? "default" : "outline"}
              className={`h-12 rounded-2xl transition-all ${
                createType === "scan"
                  ? "bg-white text-gray-900 border-2 border-blue-500 hover:bg-white shadow-lg"
                  : "bg-gray-100 text-gray-600 border-0 hover:bg-gray-200"
              }`}
              onClick={() => setCreateType("scan")}
            >
              <QrCode className="h-4 w-4 mr-2" />
              扫码创建
            </Button>
          </div>

          {/* 表单内容 */}
          {createType === "manual" ? (
            <div className="space-y-4">
              {/* 渠道名称 - 必填 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  渠道名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入渠道名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-2xl border-2 border-blue-500 focus-visible:ring-0 focus-visible:border-blue-600"
                />
              </div>

              {/* 联系电话 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">联系电话</Label>
                <Input
                  placeholder="请输入11位手机号"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 rounded-2xl border-gray-200"
                  maxLength={11}
                />
              </div>

              {/* 微信号 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">微信号</Label>
                <Input
                  placeholder="请输入微信号"
                  value={formData.wechat}
                  onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                  className="h-12 rounded-2xl border-gray-200"
                />
              </div>

              {/* 备注 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">备注</Label>
                <Textarea
                  placeholder="请输入备注信息"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="min-h-[80px] rounded-2xl border-gray-200 resize-none"
                  maxLength={200}
                />
                <div className="text-xs text-gray-400 text-right">{formData.remark.length}/200</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-48 h-48 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto">
                <QrCode className="h-20 w-20 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mt-4">请使用微信扫描二维码获取微信信息</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-gray-200 bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              className="h-12 rounded-2xl bg-blue-500 hover:bg-blue-600"
              onClick={handleSubmit}
              disabled={!isFormValid}
            >
              创建
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
