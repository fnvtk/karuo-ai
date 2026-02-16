"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Upload } from "lucide-react"
import { DeviceType, DeviceCategory } from "@/types/device"
import { toast } from "@/components/ui/use-toast"

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeviceAdded?: (device: any) => void
}

export function AddDeviceDialog({ open, onOpenChange, onDeviceAdded }: AddDeviceDialogProps) {
  const [activeTab, setActiveTab] = useState("qr")
  const [formData, setFormData] = useState({
    name: "",
    imei: "",
    type: DeviceType.ANDROID,
    category: DeviceCategory.ACQUISITION,
    model: "",
    remark: "",
    tags: [] as string[],
    location: "",
    operator: "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!formData.name || !formData.imei) {
      toast({
        title: "请填写必填信息",
        description: "设备名称和IMEI是必填项",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newDevice = {
        id: `device-${Date.now()}`,
        ...formData,
        status: "offline",
        battery: 100,
        friendCount: 0,
        todayAdded: 0,
        lastActive: new Date().toLocaleString(),
        addFriendStatus: "normal",
        totalTasks: 0,
        completedTasks: 0,
        activePlans: [],
        planNames: [],
      }

      onDeviceAdded?.(newDevice)
      toast({
        title: "设备添加成功",
        description: `设备 ${formData.name} 已成功添加`,
      })

      // 重置表单
      setFormData({
        name: "",
        imei: "",
        type: DeviceType.ANDROID,
        category: DeviceCategory.ACQUISITION,
        model: "",
        remark: "",
        tags: [],
        location: "",
        operator: "",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "添加失败",
        description: "设备添加失败，请重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加设备</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr">扫码添加</TabsTrigger>
            <TabsTrigger value="manual">手动添加</TabsTrigger>
            <TabsTrigger value="batch">批量导入</TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 text-center">请使用设备扫描二维码进行添加</p>
              <Input placeholder="或输入设备ID" className="max-w-[200px]" />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">设备名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入设备名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI *</Label>
                <Input
                  id="imei"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                  placeholder="输入IMEI"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as DeviceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeviceType.ANDROID}>Android</SelectItem>
                    <SelectItem value={DeviceType.IOS}>iOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>设备分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as DeviceCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeviceCategory.ACQUISITION}>获客设备</SelectItem>
                    <SelectItem value={DeviceCategory.MAINTENANCE}>维护设备</SelectItem>
                    <SelectItem value={DeviceCategory.TESTING}>测试设备</SelectItem>
                    <SelectItem value={DeviceCategory.BACKUP}>备用设备</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">设备型号</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="输入设备型号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">设备位置</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="输入设备位置"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="输入备注信息"
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                拖拽Excel文件到此处或点击上传
                <br />
                <a href="#" className="text-blue-500 hover:underline">
                  下载模板文件
                </a>
              </p>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                选择文件
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || activeTab !== "manual"}>
            {loading ? "添加中..." : "确认添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
