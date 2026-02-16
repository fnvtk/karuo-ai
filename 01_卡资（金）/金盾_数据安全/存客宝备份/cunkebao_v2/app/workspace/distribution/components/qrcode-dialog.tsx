"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Download, X, Copy } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "h5" | "miniapp"
}

// 二维码展示弹窗组件
export function QRCodeDialog({ open, onOpenChange, type }: QRCodeDialogProps) {
  // 复制链接
  const handleCopyLink = () => {
    const link = type === "h5" ? "https://ckbapi.quwanzhi.com/channel/login" : "pages/channel/login"

    navigator.clipboard.writeText(link)
    toast({
      title: "复制成功",
      description: "链接已复制到剪贴板",
    })
  }

  // 下载二维码
  const handleDownload = () => {
    toast({
      title: "下载中",
      description: "二维码正在下载...",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0 bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
        {/* 标题区域 */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">渠道登录二维码</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">{type === "h5" ? "H5网页版" : "微信小程序"}登录入口</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* 二维码展示区 */}
          <div className="flex flex-col items-center">
            <div className="w-52 h-52 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-100">
              <QrCode className="h-40 w-40 text-gray-800" />
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              渠道方扫描此二维码
              <br />
              登录后可查看分销数据和提现
            </p>
          </div>

          {/* 链接展示 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-2">登录链接</div>
            <div className="text-sm font-mono text-gray-700 break-all">
              {type === "h5" ? "https://ckbapi.quwanzhi.com/channel/login" : "pages/channel/login"}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-xl border-gray-200 bg-transparent"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4 mr-2" />
              复制链接
            </Button>
            <Button className="h-12 rounded-xl bg-blue-500 hover:bg-blue-600" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              下载二维码
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
