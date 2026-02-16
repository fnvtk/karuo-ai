"use client"

import { useState, useEffect } from "react"
import { Smartphone, Wifi, WifiOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Device {
  id: string
  name: string
  imei: string
  status: "online" | "offline"
  wechatAccount?: string
}

interface DeviceConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDevices: string[]
  onSelect: (devices: string[]) => void
}

export function DeviceConfigDialog({ open, onOpenChange, selectedDevices, onSelect }: DeviceConfigDialogProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selected, setSelected] = useState<string[]>(selectedDevices)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      loadDevices()
    }
  }, [open])

  const loadDevices = async () => {
    setLoading(true)
    try {
      // 模拟加载设备列表
      await new Promise((resolve) => setTimeout(resolve, 500))
      setDevices([
        {
          id: "1",
          name: "设备1",
          imei: "sd123123",
          status: "online",
          wechatAccount: "wxid_abc123",
        },
        {
          id: "2",
          name: "设备2",
          imei: "sd123124",
          status: "online",
          wechatAccount: "wxid_xyz789",
        },
        {
          id: "3",
          name: "设备3",
          imei: "sd123125",
          status: "offline",
          wechatAccount: "wxid_def456",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (deviceId: string) => {
    setSelected((prev) => (prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]))
  }

  const handleConfirm = () => {
    onSelect(selected)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>选择执行设备</DialogTitle>
          <DialogDescription>选择用于执行电话获客任务的设备</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">加载设备列表中...</div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={`p-3 border rounded-lg ${device.status === "offline" ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selected.includes(device.id)}
                        onCheckedChange={() => handleToggle(device.id)}
                        disabled={device.status === "offline"}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            <span className="font-medium">{device.name}</span>
                          </div>
                          {device.status === "online" ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">IMEI: {device.imei}</p>
                        {device.wechatAccount && <p className="text-xs text-gray-500">微信: {device.wechatAccount}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-gray-500">已选择 {selected.length} 个设备</p>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button onClick={handleConfirm}>确认</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
