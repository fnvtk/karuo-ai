"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronLeft, Plus, Search, RefreshCw, Edit, Trash2, Power, PowerOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { StoreAccount, CreateStoreAccountRequest } from "@/lib/api/stores"

// 设备类型（用于选择设备）
interface Device {
  id: string
  name: string
  imei: string
  status: "online" | "offline"
}

// 模拟设备数据
const MOCK_DEVICES: Device[] = [
  { id: "1", name: "设备 1", imei: "sd123123", status: "online" },
  { id: "2", name: "设备 2", imei: "sd123124", status: "online" },
  { id: "3", name: "设备 3", imei: "sd123125", status: "online" },
  { id: "4", name: "设备 4", imei: "sd123126", status: "online" },
  { id: "5", name: "设备 5", imei: "sd123127", status: "online" },
]

// 模拟门店账号数据
const MOCK_STORES: StoreAccount[] = [
  {
    id: "1",
    account: "store001",
    storeName: "旗舰店",
    phone: "13800138001",
    deviceId: "1",
    deviceName: "设备 1",
    status: "active",
    createTime: "2025-01-15 10:00:00",
    lastLogin: "2025-01-29 14:30:00",
  },
  {
    id: "2",
    account: "store002",
    storeName: "体验店",
    phone: "13800138002",
    deviceId: "2",
    deviceName: "设备 2",
    status: "active",
    createTime: "2025-01-16 11:00:00",
    lastLogin: "2025-01-29 13:20:00",
  },
  {
    id: "3",
    account: "store003",
    storeName: "社区店",
    phone: "13800138003",
    deviceId: "3",
    deviceName: "设备 3",
    status: "disabled",
    createTime: "2025-01-17 09:30:00",
    lastLogin: "2025-01-28 16:45:00",
  },
]

export default function StoreManagementPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [stores, setStores] = useState<StoreAccount[]>(MOCK_STORES)
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreAccount | null>(null)

  const [formData, setFormData] = useState<CreateStoreAccountRequest>({
    account: "",
    storeName: "",
    password: "",
    phone: "",
    deviceId: "",
  })

  // 加载门店账号数据
  const loadStores = async () => {
    setIsLoading(true)
    try {
      // 实际项目中调用API
      // const response = await storeApi.getStoreAccounts()
      // setStores(response.data.items)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setStores(MOCK_STORES)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "获取门店账号列表失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 添加门店账号
  const handleAddStore = async () => {
    if (!formData.account.trim()) {
      toast({
        title: "参数错误",
        description: "请填写账号",
        variant: "destructive",
      })
      return
    }

    if (!formData.storeName.trim()) {
      toast({
        title: "参数错误",
        description: "请填写门店名称",
        variant: "destructive",
      })
      return
    }

    if (!formData.password.trim()) {
      toast({
        title: "参数错误",
        description: "请填写密码",
        variant: "destructive",
      })
      return
    }

    if (!formData.phone.trim()) {
      toast({
        title: "参数错误",
        description: "请填写手机号",
        variant: "destructive",
      })
      return
    }

    if (!formData.deviceId) {
      toast({
        title: "参数错误",
        description: "请选择设备",
        variant: "destructive",
      })
      return
    }

    try {
      // 实际项目中调用API
      // await storeApi.createStoreAccount(formData)

      const selectedDevice = devices.find((d) => d.id === formData.deviceId)
      const newStore: StoreAccount = {
        id: String(stores.length + 1),
        account: formData.account,
        storeName: formData.storeName,
        phone: formData.phone,
        deviceId: formData.deviceId,
        deviceName: selectedDevice?.name || "",
        status: "active",
        createTime: new Date().toLocaleString("zh-CN"),
      }

      setStores([newStore, ...stores])

      toast({
        title: "添加成功",
        description: "门店账号已成功添加",
      })

      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: "添加失败",
        description: "创建门店账号失败",
        variant: "destructive",
      })
    }
  }

  // 编辑门店账号
  const handleEditStore = async () => {
    if (!selectedStore) return

    if (!formData.account.trim()) {
      toast({
        title: "参数错误",
        description: "请填写账号",
        variant: "destructive",
      })
      return
    }

    if (!formData.storeName.trim()) {
      toast({
        title: "参数错误",
        description: "请填写门店名称",
        variant: "destructive",
      })
      return
    }

    if (!formData.phone.trim()) {
      toast({
        title: "参数错误",
        description: "请填写手机号",
        variant: "destructive",
      })
      return
    }

    if (!formData.deviceId) {
      toast({
        title: "参数错误",
        description: "请选择设备",
        variant: "destructive",
      })
      return
    }

    try {
      // 实际项目中调用API
      // await storeApi.updateStoreAccount({ id: selectedStore.id, ...formData })

      const selectedDevice = devices.find((d) => d.id === formData.deviceId)
      setStores(
        stores.map((store) =>
          store.id === selectedStore.id
            ? {
                ...store,
                account: formData.account,
                storeName: formData.storeName,
                phone: formData.phone,
                deviceId: formData.deviceId,
                deviceName: selectedDevice?.name || store.deviceName,
              }
            : store,
        ),
      )

      toast({
        title: "更新成功",
        description: "门店账号已成功更新",
      })

      setIsEditDialogOpen(false)
      setSelectedStore(null)
      resetForm()
    } catch (error) {
      toast({
        title: "更新失败",
        description: "更新门店账号失败",
        variant: "destructive",
      })
    }
  }

  // 删除门店账号
  const handleDeleteStore = async () => {
    if (!selectedStore) return

    try {
      // 实际项目中调用API
      // await storeApi.deleteStoreAccount(selectedStore.id)

      setStores(stores.filter((store) => store.id !== selectedStore.id))

      toast({
        title: "删除成功",
        description: "门店账号已成功删除",
      })

      setIsDeleteDialogOpen(false)
      setSelectedStore(null)
    } catch (error) {
      toast({
        title: "删除失败",
        description: "删除门店账号失败",
        variant: "destructive",
      })
    }
  }

  // 切换门店账号状态
  const handleToggleStatus = async (store: StoreAccount) => {
    try {
      if (store.status === "active") {
        // 实际项目中调用API
        // await storeApi.disableStoreAccount(store.id)
        setStores(stores.map((s) => (s.id === store.id ? { ...s, status: "disabled" as const } : s)))
        toast({
          title: "禁用成功",
          description: `门店账号 ${store.storeName} 已禁用`,
        })
      } else {
        // 实际项目中调用API
        // await storeApi.enableStoreAccount(store.id)
        setStores(stores.map((s) => (s.id === store.id ? { ...s, status: "active" as const } : s)))
        toast({
          title: "启用成功",
          description: `门店账号 ${store.storeName} 已启用`,
        })
      }
    } catch (error) {
      toast({
        title: "操作失败",
        description: "切换门店账号状态失败",
        variant: "destructive",
      })
    }
  }

  // 打开编辑对话框
  const openEditDialog = (store: StoreAccount) => {
    setSelectedStore(store)
    setFormData({
      account: store.account,
      storeName: store.storeName,
      password: "",
      phone: store.phone,
      deviceId: store.deviceId,
    })
    setIsEditDialogOpen(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (store: StoreAccount) => {
    setSelectedStore(store)
    setIsDeleteDialogOpen(true)
  }

  // 重置表单
  const resetForm = () => {
    setFormData({
      account: "",
      storeName: "",
      password: "",
      phone: "",
      deviceId: "",
    })
  }

  // 过滤门店账号
  const filteredStores = stores.filter(
    (store) =>
      store.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.phone.includes(searchTerm),
  )

  useEffect(() => {
    loadStores()
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
            <h1 className="text-xl font-bold">门店账号管理</h1>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2">
                <Plus className="w-5 h-5 mr-1" />
                添加账号
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加门店账号</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account">账号 *</Label>
                  <Input
                    id="account"
                    placeholder="请输入账号"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="storeName">门店名称 *</Label>
                  <Input
                    id="storeName"
                    placeholder="请输入门店名称"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">手机号 *</Label>
                  <Input
                    id="phone"
                    placeholder="请输入手机号"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="device">选择设备 *</Label>
                  <Select
                    value={formData.deviceId}
                    onValueChange={(value) => setFormData({ ...formData, deviceId: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="请选择设备" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.imei})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddStore} className="bg-blue-500 hover:bg-blue-600">
                    添加
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* 搜索栏 */}
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="搜索账号/门店名称/手机号"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadStores} className="border-gray-200 bg-transparent">
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 门店账号列表 */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse border-0">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="space-y-3">
            {filteredStores.map((store) => (
              <Card key={store.id} className="bg-white shadow-sm hover:shadow-md transition-shadow border-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{store.storeName}</h3>
                        <Badge
                          className={
                            store.status === "active"
                              ? "bg-green-100 text-green-700 border-0"
                              : "bg-gray-100 text-gray-600 border-0"
                          }
                        >
                          {store.status === "active" ? "启用" : "禁用"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>账号: {store.account}</div>
                        <div>手机号: {store.phone}</div>
                        <div>绑定设备: {store.deviceName}</div>
                        <div className="text-xs text-gray-400">创建时间: {store.createTime}</div>
                        {store.lastLogin && <div className="text-xs text-gray-400">最近登录: {store.lastLogin}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(store)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(store)}
                      className={`flex-1 ${
                        store.status === "active"
                          ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {store.status === "active" ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          启用
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(store)}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">暂无门店账号数据</div>
              <Button variant="outline" onClick={loadStores} className="border-gray-300 bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                重新加载
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑门店账号</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-account">账号 *</Label>
              <Input
                id="edit-account"
                placeholder="请输入账号"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-storeName">门店名称 *</Label>
              <Input
                id="edit-storeName"
                placeholder="请输入门店名称"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">密码（留空则不修改）</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="请输入新密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">手机号 *</Label>
              <Input
                id="edit-phone"
                placeholder="请输入手机号"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-device">选择设备 *</Label>
              <Select
                value={formData.deviceId}
                onValueChange={(value) => setFormData({ ...formData, deviceId: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="请选择设备" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} ({device.imei})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditStore} className="bg-blue-500 hover:bg-blue-600">
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除门店账号 "{selectedStore?.storeName}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStore} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
