"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Plus, Search, Filter, RefreshCw, Grid3x3, List } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 设备类型定义
interface Device {
  id: string
  name: string
  imei: string
  wechatId: string
  friendCount: number
  todayAdded: number
  status: "online" | "offline"
  type: "android" | "ios"
  lastActive: string
  createTime: string
}

// 统计数据类型
interface DeviceStats {
  total: number
  online: number
  offline: number
}

// 模拟设备数据
const MOCK_DEVICES: Device[] = [
  {
    id: "1",
    name: "设备 1",
    imei: "sd123123",
    wechatId: "wxid_qc924n67",
    friendCount: 649,
    todayAdded: 43,
    status: "online",
    type: "android",
    lastActive: "2025-01-29 14:30:00",
    createTime: "2025-01-01 10:00:00",
  },
  {
    id: "2",
    name: "设备 2",
    imei: "sd123124",
    wechatId: "wxid_kwjazkzd",
    friendCount: 124,
    todayAdded: 34,
    status: "online",
    type: "android",
    lastActive: "2025-01-29 14:25:00",
    createTime: "2025-01-02 11:00:00",
  },
  {
    id: "3",
    name: "设备 3",
    imei: "sd123125",
    wechatId: "wxid_6t25lkdf",
    friendCount: 295,
    todayAdded: 5,
    status: "online",
    type: "ios",
    lastActive: "2025-01-29 14:20:00",
    createTime: "2025-01-03 09:30:00",
  },
  {
    id: "4",
    name: "设备 4",
    imei: "sd123126",
    wechatId: "wxid_tvbojpy2",
    friendCount: 864,
    todayAdded: 36,
    status: "online",
    type: "android",
    lastActive: "2025-01-29 14:15:00",
    createTime: "2025-01-04 08:00:00",
  },
  {
    id: "5",
    name: "设备 5",
    imei: "sd123127",
    wechatId: "wxid_8qi6bqqi",
    friendCount: 426,
    todayAdded: 12,
    status: "online",
    type: "android",
    lastActive: "2025-01-29 14:10:00",
    createTime: "2025-01-05 10:30:00",
  },
  {
    id: "6",
    name: "设备 6",
    imei: "sd123128",
    wechatId: "wxid_icuybkc0",
    friendCount: 882,
    todayAdded: 15,
    status: "offline",
    type: "ios",
    lastActive: "2025-01-29 12:00:00",
    createTime: "2025-01-06 14:00:00",
  },
]

export default function DeviceManagementPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES)
  const [stats, setStats] = useState<DeviceStats>({
    total: 50,
    online: 40,
    offline: 10,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "android" as "android" | "ios",
    ip: "",
    remark: "",
  })

  // 加载设备数据
  const loadDevices = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setDevices(MOCK_DEVICES)
    setIsLoading(false)
  }

  // 添加设备
  const handleAddDevice = async () => {
    if (!newDevice.name.trim()) {
      toast({
        title: "参数错误",
        description: "请填写设备名称",
        variant: "destructive",
      })
      return
    }

    if (!newDevice.ip.trim()) {
      toast({
        title: "参数错误",
        description: "请填写设备IP地址",
        variant: "destructive",
      })
      return
    }

    const newDeviceData: Device = {
      id: String(devices.length + 1),
      name: newDevice.name,
      imei: `sd${Date.now()}`,
      wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
      friendCount: 0,
      todayAdded: 0,
      status: "online",
      type: newDevice.type,
      lastActive: new Date().toISOString(),
      createTime: new Date().toISOString(),
    }

    setDevices([newDeviceData, ...devices])
    setStats({
      ...stats,
      total: stats.total + 1,
      online: stats.online + 1,
    })

    toast({
      title: "添加成功",
      description: "设备已成功添加",
    })

    setIsAddDialogOpen(false)
    setNewDevice({ name: "", type: "android", ip: "", remark: "" })
  }

  // 过滤设备
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.wechatId.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || device.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevices(filteredDevices.map((d) => d.id))
    } else {
      setSelectedDevices([])
    }
  }

  // 单个设备选择
  const handleSelectDevice = (deviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices((prev) => [...prev, deviceId])
    } else {
      setSelectedDevices((prev) => prev.filter((id) => id !== deviceId))
    }
  }

  const isAllSelected = filteredDevices.length > 0 && selectedDevices.length === filteredDevices.length

  useEffect(() => {
    loadDevices()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">设备管理</h1>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2">
                <Plus className="w-5 h-5 mr-1" />
                添加设备
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加新设备</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="device-name">设备名称 *</Label>
                  <Input
                    id="device-name"
                    placeholder="请输入设备名称"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="device-type">设备类型</Label>
                  <Select
                    value={newDevice.type}
                    onValueChange={(value: "android" | "ios") => setNewDevice({ ...newDevice, type: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="device-ip">IP地址 *</Label>
                  <Input
                    id="device-ip"
                    placeholder="请输入设备IP地址"
                    value={newDevice.ip}
                    onChange={(e) => setNewDevice({ ...newDevice, ip: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="device-remark">备注</Label>
                  <Input
                    id="device-remark"
                    placeholder="请输入备注信息（可选）"
                    value={newDevice.remark}
                    onChange={(e) => setNewDevice({ ...newDevice, remark: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddDevice} className="bg-blue-500 hover:bg-blue-600">
                    添加
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-500 mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600">总设备数</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">{stats.online}</div>
              <div className="text-sm text-gray-600">在线设备</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500 mb-1">{stats.offline}</div>
              <div className="text-sm text-gray-600">离线设备</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和操作栏 */}
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="搜索设备IMEI/微信"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>
              <Button variant="outline" size="icon" className="border-gray-200 bg-transparent">
                <Filter className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={loadDevices} className="border-gray-200 bg-transparent">
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 筛选和视图切换 */}
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-32 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="online">在线</SelectItem>
                    <SelectItem value="offline">离线</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                  <span className="text-sm text-gray-600">全选</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  已选择 {selectedDevices.length}/{filteredDevices.length}
                </span>
                {selectedDevices.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDevices([])}
                    className="text-blue-500 border-blue-200"
                  >
                    取消全选
                  </Button>
                )}
              </div>
            </div>

            {/* 视图切换按钮 */}
            <div className="flex items-center space-x-2 mt-3">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                <List className="w-4 h-4 mr-1" />
                列表
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                <Grid3x3 className="w-4 h-4 mr-1" />
                网格
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 设备列表 */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse border-0">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDevices.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {filteredDevices.map((device) => (
              <Card
                key={device.id}
                className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-0"
                onClick={() => router.push(`/devices/${device.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={(checked) => handleSelectDevice(device.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{device.name}</h3>
                        <Badge
                          className={
                            device.status === "online"
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-gray-100 text-gray-600 border-0"
                          }
                        >
                          {device.status === "online" ? "在线" : "离线"}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div>IMEI: {device.imei}</div>
                        <div>微信号: {device.wechatId}</div>
                        <div className="flex items-center justify-between pt-1">
                          <span>好友数: {device.friendCount}</span>
                          <span className="text-green-600 font-medium">今日新增: +{device.todayAdded}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">暂无设备数据</div>
              <Button variant="outline" onClick={loadDevices} className="border-gray-300 bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                重新加载
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
