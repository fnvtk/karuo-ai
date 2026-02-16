"use client"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface CustomerServiceRepProps {
  id: string
  name: string
  deviceId: string
  status: "online" | "offline"
  avatar?: string
  selected: boolean
  disabled?: boolean
  onSelect: (id: string, checked: boolean) => void
}

/**
 * 客服代表选择卡片
 * 用于选择客服代表
 */
export function CustomerServiceRepCard({
  id,
  name,
  deviceId,
  status,
  avatar,
  selected,
  disabled = false,
  onSelect,
}: CustomerServiceRepProps) {
  return (
    <Card
      className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
        selected ? "border-primary bg-blue-50" : ""
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => !disabled && onSelect(id, !selected)}
    >
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => !disabled && onSelect(id, !selected)}
          disabled={disabled}
          id={`rep-${id}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={`rep-${id}`} className="font-medium truncate cursor-pointer">
              {name}
            </label>
            <div
              className={`px-2 py-1 rounded-full text-xs ${
                status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {status === "online" ? "在线" : "离线"}
            </div>
          </div>
          <div className="text-sm text-gray-500">设备ID: {deviceId}</div>
          <div className="text-sm text-gray-500">客服ID: {id}</div>
        </div>
      </div>
    </Card>
  )
}

interface DeviceSelectProps {
  allDevices: boolean
  newDevices: boolean
  targetDevices: string[]
  onAllDevicesChange: (checked: boolean) => void
  onNewDevicesChange: (checked: boolean) => void
  onShowDeviceSelector: () => void
}

/**
 * 设备选择组件
 * 用于选择设备
 */
export function DeviceSelectSection({
  allDevices,
  newDevices,
  targetDevices,
  onAllDevicesChange,
  onNewDevicesChange,
  onShowDeviceSelector,
}: DeviceSelectProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allDevices"
          checked={allDevices}
          onCheckedChange={(checked) => onAllDevicesChange(checked === true)}
        />
        <Label htmlFor="allDevices" className="font-medium">
          所有设备
        </Label>
        <span className="text-xs text-gray-500">(系统自动分配流量到所有在线设备)</span>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="newDevices"
          checked={newDevices}
          onCheckedChange={(checked) => onNewDevicesChange(checked === true)}
          disabled={allDevices}
        />
        <Label htmlFor="newDevices" className="font-medium">
          新添加设备
        </Label>
        <span className="text-xs text-gray-500">(仅针对新添加设备进行流量分发)</span>
      </div>

      <div className="space-y-2 pt-4">
        <Label className="font-medium">指定设备</Label>
        <p className="text-xs text-gray-500 mb-2">选择特定的设备进行流量分发</p>

        <button
          className="w-full flex items-center justify-center space-x-2 border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50 transition-colors"
          disabled={allDevices}
          onClick={onShowDeviceSelector}
        >
          <span>选择设备</span>
          {targetDevices?.length > 0 && <Badge variant="secondary">已选 {targetDevices.length} 台</Badge>}
        </button>
      </div>
    </div>
  )
}
