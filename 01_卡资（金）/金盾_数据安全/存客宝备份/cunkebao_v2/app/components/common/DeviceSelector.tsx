"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Smartphone, CheckCircle2, Loader2, Plus, Battery, Users, MapPin, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { DeviceFilter } from "./DeviceFilter"
import { AddDeviceDialog } from "./AddDeviceDialog"
import type { Device, DeviceFilterParams } from "@/types/device"

export interface DeviceSelectorProps {
  /** 是否使用对话框模式 */
  dialogMode?: boolean
  /** 对话框是否打开 */
  open?: boolean
  /** 对话框打开状态变更回调 */
  onOpenChange?: (open: boolean) => void
  /** 是否支持多选 */
  multiple?: boolean
  /** 已选择的设备ID */
  selectedDevices?: string[]
  /** 设备选择变更回调 */
  onDevicesChange: (deviceIds: string[]) => void
  /** 是���排除已用于其他计划的设备 */
  devices?: Device[]
  /** 是否显示下一步按钮 */
  showNextButton?: boolean
  /** 下一步按钮点击回调 */
  onNext?: () => void
  /** 上一步按钮点击回调 */
  onPrevious?: () => void
  /** 自定义类名 */
  className?: string
  /** 页面标题 */
  title?: string
  /** 最大选择数量 */
  maxSelection?: number
}

/**
 * 统一的设备选择器组件
 * 支持对话框模式和内嵌模式，支持单选和多选，样式与设备管理页面一致
 */
export function DeviceSelector({
  dialogMode = false,
  open = false,
  onOpenChange,
  multiple = true,
  selectedDevices = [],
  onDevicesChange,
  devices: propDevices,
  showNextButton = false,
  onNext,
  onPrevious,
  className,
  title = "选择设备",
  maxSelection = 10,
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(selectedDevices)
  const [filters, setFilters] = useState<DeviceFilterParams>({})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const devicesPerPage = 10

  // 如果外部selectedDevices变化，同步更新内部状态
  useEffect(() => {
    setSelected(selectedDevices)
  }, [selectedDevices])

  // 加载设备数据
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true)
      try {
        if (propDevices) {
          setDevices(propDevices)
        } else {
          // 模拟设备数据
          await new Promise((resolve) => setTimeout(resolve, 800))
          const mockDevices: Device[] = Array.from({ length: 25 }, (_, i) => ({
            id: `device-${i + 1}`,
            name: `设备 ${i + 1}`,
            imei: `IMEI-${Math.random().toString(36).substr(2, 8)}`,
            type: i % 2 === 0 ? "android" : "ios",
            status: i < 20 ? "online" : i < 23 ? "offline" : "busy",
            wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
            friendCount: Math.floor(Math.random() * 1000) + 100,
            battery: Math.floor(Math.random() * 100) + 1,
            lastActive: i < 5 ? "刚刚" : i < 10 ? "5分钟前" : i < 15 ? "1小时前" : "2小时前",
            addFriendStatus: Math.random() > 0.2 ? "normal" : "abnormal",
            remark: `${title}设备 ${i + 1}`,
            model: i % 3 === 0 ? "iPhone 14" : i % 3 === 1 ? "Samsung S23" : "Xiaomi 13",
            category: i % 4 === 0 ? "acquisition" : i % 4 === 1 ? "maintenance" : i % 4 === 2 ? "testing" : "backup",
            todayAdded: Math.floor(Math.random() * 50),
            totalTasks: Math.floor(Math.random() * 100) + 10,
            completedTasks: Math.floor(Math.random() * 80) + 5,
            activePlans: i < 15 ? [`plan-${i + 1}`, `plan-${i + 2}`] : [],
            planNames: i < 15 ? [`计划 ${i + 1}`, `计划 ${i + 2}`] : [],
            tags: i % 2 === 0 ? ["高效", "稳定"] : ["测试", "备用"],
            location: i % 3 === 0 ? "北京" : i % 3 === 1 ? "上海" : "深圳",
            operator: `操作员${(i % 5) + 1}`,
          }))
          setDevices(mockDevices)
        }
      } catch (error) {
        console.error("获取设备失败:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!dialogMode || open) {
      fetchDevices()
    }
  }, [dialogMode, open, propDevices, title])

  // 处理设备选择
  const handleDeviceToggle = (deviceId: string) => {
    let newSelected: string[]

    if (multiple) {
      if (selected.includes(deviceId)) {
        newSelected = selected.filter((id) => id !== deviceId)
      } else {
        if (selected.length >= maxSelection) {
          return // 达到最大选择数量
        }
        newSelected = [...selected, deviceId]
      }
    } else {
      newSelected = [deviceId]
    }

    setSelected(newSelected)
    onDevicesChange(newSelected)
  }

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selected.length === Math.min(filteredDevices.length, maxSelection)) {
      setSelected([])
      onDevicesChange([])
    } else {
      const newSelected = filteredDevices.slice(0, maxSelection).map((device) => device.id)
      setSelected(newSelected)
      onDevicesChange(newSelected)
    }
  }

  // 处理对话框确认
  const handleConfirm = () => {
    onDevicesChange(selected)
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  // 处理设备添加
  const handleDeviceAdded = (newDevice: Device) => {
    setDevices([newDevice, ...devices])
  }

  // 过滤设备
  const filteredDevices = devices.filter((device) => {
    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      const matchesKeyword =
        device.name.toLowerCase().includes(keyword) ||
        device.imei.toLowerCase().includes(keyword) ||
        device.wechatId.toLowerCase().includes(keyword) ||
        (device.remark && device.remark.toLowerCase().includes(keyword)) ||
        (device.model && device.model.toLowerCase().includes(keyword))

      if (!matchesKeyword) return false
    }

    // 状态过滤
    if (filters.status?.length && !filters.status.includes(device.status)) {
      return false
    }

    // 类型过滤
    if (filters.type?.length && !filters.type.includes(device.type)) {
      return false
    }

    // 分类过滤
    if (filters.category?.length && device.category && !filters.category.includes(device.category)) {
      return false
    }

    // 型号过滤
    if (filters.models?.length && device.model && !filters.models.includes(device.model)) {
      return false
    }

    // 电量范围过滤
    if (filters.batteryRange) {
      const [min, max] = filters.batteryRange
      if (device.battery < min || device.battery > max) {
        return false
      }
    }

    // 好友数量范围过滤
    if (filters.friendCountRange) {
      const [min, max] = filters.friendCountRange
      if (device.friendCount < min || device.friendCount > max) {
        return false
      }
    }

    // 标签过滤
    if (filters.tags?.length && device.tags) {
      const hasMatchingTag = filters.tags.some((tag) => device.tags?.includes(tag))
      if (!hasMatchingTag) return false
    }

    // 活跃计划过滤
    if (filters.hasActivePlans !== undefined) {
      const hasActivePlans = device.activePlans && device.activePlans.length > 0
      if (filters.hasActivePlans !== hasActivePlans) {
        return false
      }
    }

    return true
  })

  // 分页数据
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * devicesPerPage, currentPage * devicesPerPage)

  // 获取可用的型号和标签
  const availableModels = [...new Set(devices.map((d) => d.model).filter(Boolean))]
  const availableTags = [...new Set(devices.flatMap((d) => d.tags || []))]

  // 设备卡片组件
  const DeviceCard = ({ device }: { device: Device }) => {
    const isSelected = selected.includes(device.id)
    const canSelect = !isSelected && (selected.length < maxSelection || !multiple)

    return (
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50",
          !canSelect && !isSelected && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => (canSelect || isSelected ? handleDeviceToggle(device.id) : undefined)}
      >
        <div className="flex items-start space-x-3">
          <div className="mt-1">
            {multiple ? (
              <Checkbox
                checked={isSelected}
                className="data-[state=checked]:bg-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            ) : isSelected ? (
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium truncate">{device.name}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    device.status === "online"
                      ? "bg-green-500/10 text-green-600 border-green-200"
                      : device.status === "busy"
                        ? "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                        : "bg-gray-500/10 text-gray-600 border-gray-200",
                  )}
                >
                  {device.status === "online" ? "在线" : device.status === "busy" ? "忙碌" : "离线"}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <Smartphone className={cn("h-4 w-4", device.type === "android" ? "text-green-500" : "text-gray-500")} />
                <span className="text-xs text-gray-500">{device.type === "android" ? "Android" : "iOS"}</span>
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div>IMEI: {device.imei}</div>
              <div>微信号: {device.wechatId}</div>
              {device.model && <div>型号: {device.model}</div>}
              {device.remark && <div>备注: {device.remark}</div>}
            </div>

            <div className="flex items-center justify-between mt-3 text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Battery
                    className={cn(
                      "h-4 w-4",
                      device.battery > 50 ? "text-green-500" : device.battery > 20 ? "text-yellow-500" : "text-red-500",
                    )}
                  />
                  <span>{device.battery}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>{device.friendCount}</span>
                </div>
                {device.todayAdded !== undefined && <div className="text-green-600">+{device.todayAdded}</div>}
              </div>
              <div className="text-xs text-gray-500">{device.lastActive}</div>
            </div>

            {/* 计划和任务信息 */}
            {device.activePlans && device.activePlans.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-1 text-xs text-blue-600">
                  <Activity className="h-3 w-3" />
                  <span>活跃计划: {device.activePlans.length}</span>
                </div>
                {device.planNames && (
                  <div className="text-xs text-gray-500 truncate">{device.planNames.join(", ")}</div>
                )}
              </div>
            )}

            {/* 任务完成情况 */}
            {device.totalTasks !== undefined && device.completedTasks !== undefined && (
              <div className="mt-2 text-xs text-gray-500">
                任务完成: {device.completedTasks}/{device.totalTasks}(
                {Math.round((device.completedTasks / device.totalTasks) * 100)}%)
              </div>
            )}

            {/* 标签 */}
            {device.tags && device.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {device.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 位置和操作员 */}
            {(device.location || device.operator) && (
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                {device.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{device.location}</span>
                  </div>
                )}
                {device.operator && <span>操作员: {device.operator}</span>}
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // 设备列表内容
  const DeviceListContent = () => (
    <div className="space-y-4">
      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">列表视图</TabsTrigger>
            <TabsTrigger value="filter">过滤器</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>添加设备</span>
          </Button>
        </div>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              已选择 {selected.length} / {Math.min(filteredDevices.length, maxSelection)} 个设备
              {multiple && maxSelection < filteredDevices.length && (
                <span className="text-orange-500 ml-2">(最多可选 {maxSelection} 个)</span>
              )}
            </div>
            {multiple && (
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filteredDevices.length === 0}>
                {selected.length === Math.min(filteredDevices.length, maxSelection) && filteredDevices.length > 0
                  ? "取消全选"
                  : "全选"}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span>正在加载设备列表...</span>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>未找到匹配的设备</p>
              <Button variant="outline" className="mt-4" onClick={() => setFilters({})}>
                清除过滤器
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {paginatedDevices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>

              {/* 分页 */}
              {filteredDevices.length > devicesPerPage && (
                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-500">
                    第 {currentPage} / {Math.ceil(filteredDevices.length / devicesPerPage)} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(Math.ceil(filteredDevices.length / devicesPerPage), prev + 1))
                    }
                    disabled={currentPage >= Math.ceil(filteredDevices.length / devicesPerPage)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="filter">
          <DeviceFilter
            filters={filters}
            onFiltersChange={setFilters}
            availableModels={availableModels}
            availableTags={availableTags}
          />
        </TabsContent>
      </Tabs>
    </div>
  )

  // 对话框模式
  if (dialogMode) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto py-4">
              <DeviceListContent />
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleConfirm} disabled={selected.length === 0}>
                确认选择 ({selected.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AddDeviceDialog open={showAddDialog} onOpenChange={setShowAddDialog} onDeviceAdded={handleDeviceAdded} />
      </>
    )
  }

  // 内嵌模式
  return (
    <>
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="text-sm text-gray-500">{filteredDevices.length} 个设备可用</div>
          </div>

          <DeviceListContent />

          {showNextButton && (
            <div className="flex justify-between mt-6 pt-6 border-t">
              {onPrevious && (
                <Button variant="outline" onClick={onPrevious}>
                  上一步
                </Button>
              )}
              <div className="flex-1" />
              {onNext && (
                <Button onClick={onNext} disabled={selected.length === 0} className="bg-blue-500 hover:bg-blue-600">
                  下一步 ({selected.length})
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <AddDeviceDialog open={showAddDialog} onOpenChange={setShowAddDialog} onDeviceAdded={handleDeviceAdded} />
    </>
  )
}
