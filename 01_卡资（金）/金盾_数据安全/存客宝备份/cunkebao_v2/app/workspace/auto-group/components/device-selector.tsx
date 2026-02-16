"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
import { Table } from "@/components/ui/table"

interface DeviceSelectorProps {
  selectedDevices: string[]
  onChange: (devices: string[]) => void
}

export function DeviceSelector({ selectedDevices, onChange }: DeviceSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-1.5">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="h-9">
        <Plus className="h-4 w-4 mr-2" />
        选择设备
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>选择设备</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="搜索设备" className="pl-9" />
          </div>

          <Table>
            <thead>
              <tr>
                <th>序号</th>
                <th>设备id</th>
                <th>当前客服</th>
                <th>在线状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  暂无数据
                </td>
              </tr>
            </tbody>
          </Table>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              确定
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
