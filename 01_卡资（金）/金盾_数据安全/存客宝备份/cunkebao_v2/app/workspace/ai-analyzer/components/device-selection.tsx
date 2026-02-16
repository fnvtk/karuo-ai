"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search, Smartphone } from "lucide-react"

interface Device {
  id: string
  name: string
  status: "online" | "offline"
  wechatAccounts: {
    id: string
    nickname: string
    wechatId: string
  }[]
}

interface DeviceSelectionProps {
  formData: any
  updateFormData: (data: any) => void
  onNext: () => void
}

export function DeviceSelection({ formData, updateFormData, onNext }: DeviceSelectionProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDevice, setSelectedDevice] = useState<string>(formData.deviceId || "")
  const [selectedWechatAccount, setSelectedWechatAccount] = useState<string>(formData.wechatId || "")

  useEffect(() => {
    // 模拟加载设备数据
    const fetchDevices = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockDevices: Device[] = [
        {
          id: "device-1",
          name: "iPhone 13",
          status: "online",
          wechatAccounts: [
            { id: "wx-1", nickname: "张小明", wechatId: "wxid_zhang123" },
            { id: "wx-2", nickname: "李业务", wechatId: "wxid_libiz456" },
          ],
        },
        {
          id: "device-2",
          name: "华为 P40",
          status: "online",
          wechatAccounts: [{ id: "wx-3", nickname: "王经理", wechatId: "wxid_wang789" }],
        },
        {
          id: "device-3",
          name: "小米 12",
          status: "offline",
          wechatAccounts: [
            { id: "wx-4", nickname: "赵销售", wechatId: "wxid_zhao321" },
            { id: "wx-5", nickname: "陈顾问", wechatId: "wxid_chen654" },
          ],
        },
      ]

      setDevices(mockDevices)
      setIsLoading(false)
    }

    fetchDevices()
  }, [])

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.wechatAccounts.some(
        (account) =>
          account.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          account.wechatId.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  )

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId)
    setSelectedWechatAccount("") // 重置微信账号选择

    const selectedDeviceData = devices.find((d) => d.id === deviceId)
    if (selectedDeviceData) {
      updateFormData({
        deviceId,
        deviceName: selectedDeviceData.name,
        wechatId: "",
        wechatName: "",
      })
    }
  }

  const handleWechatSelect = (wechatId: string) => {
    setSelectedWechatAccount(wechatId)

    const selectedDeviceData = devices.find((d) => d.id === selectedDevice)
    if (selectedDeviceData) {
      const selectedWechatData = selectedDeviceData.wechatAccounts.find((w) => w.id === wechatId)
      if (selectedWechatData) {
        updateFormData({
          wechatId: wechatId,
          wechatName: selectedWechatData.nickname,
        })
      }
    }
  }

  const handleContinue = () => {
    if (selectedDevice && selectedWechatAccount) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">选择设备与微信号</h2>
        <p className="text-gray-500 text-sm">选择要进行AI数据分析的设备和微信账号</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索设备或微信号"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">1. 选择设备</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {filteredDevices.map((device) => (
                <Card
                  key={device.id}
                  className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedDevice === device.id ? "ring-2 ring-blue-500" : ""
                  } ${device.status === "offline" ? "opacity-60" : ""}`}
                  onClick={() => device.status === "online" && handleDeviceSelect(device.id)}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.wechatAccounts.length} 个微信账号</div>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs ${
                        device.status === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {device.status === "online" ? "在线" : "离线"}
                    </div>
                  </div>
                </Card>
              ))}

              {filteredDevices.length === 0 && (
                <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg border">
                  <p className="text-gray-500">未找到匹配的设备</p>
                </div>
              )}
            </div>
          </div>

          {selectedDevice && (
            <div>
              <Label className="text-base font-medium">2. 选择微信账号</Label>
              <RadioGroup value={selectedWechatAccount} onValueChange={handleWechatSelect} className="mt-2 space-y-2">
                {devices
                  .find((d) => d.id === selectedDevice)
                  ?.wechatAccounts.map((account) => (
                    <div key={account.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={account.id} id={account.id} />
                      <Label htmlFor={account.id} className="flex items-center cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                          <span className="text-sm font-medium">{account.nickname[0]}</span>
                        </div>
                        <div>
                          <div className="font-medium">{account.nickname}</div>
                          <div className="text-xs text-gray-500">{account.wechatId}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleContinue} disabled={!selectedDevice || !selectedWechatAccount}>
          继续
        </Button>
      </div>
    </div>
  )
}
