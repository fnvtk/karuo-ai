"use client"

import type React from "react"

import { useState } from "react"
import { Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

interface PhoneImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (numbers: string[]) => void
}

export function PhoneImportDialog({ open, onOpenChange, onImport }: PhoneImportDialogProps) {
  const [manualInput, setManualInput] = useState("")
  const [importing, setImporting] = useState(false)

  const handleManualImport = () => {
    const numbers = manualInput
      .split(/[\n,，]/)
      .map((n) => n.trim())
      .filter((n) => n && /^1[3-9]\d{9}$/.test(n))

    if (numbers.length === 0) {
      toast({
        title: "没有有效的电话号码",
        description: "请输入正确格式的手机号码",
        variant: "destructive",
      })
      return
    }

    onImport(numbers)
    setManualInput("")
    toast({
      title: "导入成功",
      description: `成功导入 ${numbers.length} 个电话号码`,
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      // 这里应该解析Excel/CSV文件
      // 模拟导入过程
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 模拟导入的号码
      const mockNumbers = ["13800138000", "13900139000", "13700137000"]

      onImport(mockNumbers)
      toast({
        title: "导入成功",
        description: `成功导入 ${mockNumbers.length} 个电话号码`,
      })
    } catch (error) {
      toast({
        title: "导入失败",
        description: "文件解析失败，请检查文件格式",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>导入电话号码</DialogTitle>
          <DialogDescription>支持批量导入Excel/CSV文件或手动输入</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">手动输入</TabsTrigger>
            <TabsTrigger value="file">文件导入</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div>
              <label className="text-sm font-medium">电话号码</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md"
                rows={6}
                placeholder="每行一个号码，或用逗号分隔"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">支持格式：13800138000，每行一个或逗号分隔</p>
            </div>
            <Button className="w-full" onClick={handleManualImport}>
              确认导入
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">点击或拖拽文件到此处</p>
              <p className="text-xs text-gray-500 mb-4">支持 Excel (.xlsx, .xls) 和 CSV 文件</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={importing}
              />
              <label htmlFor="file-upload">
                <Button as="span" disabled={importing}>
                  {importing ? "导入中..." : "选择文件"}
                </Button>
              </label>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs text-gray-600 mb-2">文件格式示例：</p>
              <div className="bg-white p-2 rounded border text-xs font-mono">
                <div>姓名,电话,来源,备注</div>
                <div>张三,13800138000,网站,意向客户</div>
                <div>李四,13900139000,广告,待跟进</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
