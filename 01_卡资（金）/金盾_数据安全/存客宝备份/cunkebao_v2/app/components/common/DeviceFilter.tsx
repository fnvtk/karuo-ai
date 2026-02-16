"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Filter, X, Search } from "lucide-react"
import { DeviceStatus, DeviceType, DeviceCategory, type DeviceFilterParams } from "@/types/device"

interface DeviceFilterProps {
  filters: DeviceFilterParams
  onFiltersChange: (filters: DeviceFilterParams) => void
  availableModels?: string[]
  availableTags?: string[]
  compact?: boolean
}

export function DeviceFilter({
  filters,
  onFiltersChange,
  availableModels = [],
  availableTags = [],
  compact = false,
}: DeviceFilterProps) {
  const [isOpen, setIsOpen] = useState(!compact)

  const updateFilter = (key: keyof DeviceFilterParams, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.keyword) count++
    if (filters.status?.length) count++
    if (filters.type?.length) count++
    if (filters.category?.length) count++
    if (filters.tags?.length) count++
    if (filters.models?.length) count++
    if (filters.hasActivePlans !== undefined) count++
    return count
  }

  const FilterContent = () => (
    <div className="space-y-4">
      {/* 关键词搜索 */}
      <div className="space-y-2">
        <Label>关键词搜索</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索设备名称、IMEI、微信号..."
            value={filters.keyword || ""}
            onChange={(e) => updateFilter("keyword", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 设备状态 */}
      <div className="space-y-2">
        <Label>设备状态</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(DeviceStatus).map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={filters.status?.includes(status) || false}
                onCheckedChange={(checked) => {
                  const currentStatus = filters.status || []
                  if (checked) {
                    updateFilter("status", [...currentStatus, status])
                  } else {
                    updateFilter(
                      "status",
                      currentStatus.filter((s) => s !== status),
                    )
                  }
                }}
              />
              <Label htmlFor={`status-${status}`} className="text-sm">
                {status === DeviceStatus.ONLINE
                  ? "在线"
                  : status === DeviceStatus.OFFLINE
                    ? "离线"
                    : status === DeviceStatus.BUSY
                      ? "忙碌"
                      : "错误"}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* 设备类型 */}
      <div className="space-y-2">
        <Label>设备类型</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(DeviceType).map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.type?.includes(type) || false}
                onCheckedChange={(checked) => {
                  const currentType = filters.type || []
                  if (checked) {
                    updateFilter("type", [...currentType, type])
                  } else {
                    updateFilter(
                      "type",
                      currentType.filter((t) => t !== type),
                    )
                  }
                }}
              />
              <Label htmlFor={`type-${type}`} className="text-sm">
                {type === DeviceType.ANDROID ? "Android" : "iOS"}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* 设备分类 */}
      <div className="space-y-2">
        <Label>设备分类</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(DeviceCategory).map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.category?.includes(category) || false}
                onCheckedChange={(checked) => {
                  const currentCategory = filters.category || []
                  if (checked) {
                    updateFilter("category", [...currentCategory, category])
                  } else {
                    updateFilter(
                      "category",
                      currentCategory.filter((c) => c !== category),
                    )
                  }
                }}
              />
              <Label htmlFor={`category-${category}`} className="text-sm">
                {category === DeviceCategory.ACQUISITION
                  ? "获客设备"
                  : category === DeviceCategory.MAINTENANCE
                    ? "维护设备"
                    : category === DeviceCategory.TESTING
                      ? "测试设备"
                      : "备用设备"}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* 设备型号 */}
      {availableModels.length > 0 && (
        <div className="space-y-2">
          <Label>设备型号</Label>
          <Select
            value={filters.models?.[0] || ""}
            onValueChange={(value) => updateFilter("models", value ? [value] : [])}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择设备型号" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部型号</SelectItem>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 电量范围 */}
      <div className="space-y-2">
        <Label>
          电量范围: {filters.batteryRange?.[0] || 0}% - {filters.batteryRange?.[1] || 100}%
        </Label>
        <Slider
          value={filters.batteryRange || [0, 100]}
          onValueChange={(value) => updateFilter("batteryRange", value as [number, number])}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
      </div>

      {/* 好友数量范围 */}
      <div className="space-y-2">
        <Label>
          好友数量范围: {filters.friendCountRange?.[0] || 0} - {filters.friendCountRange?.[1] || 5000}
        </Label>
        <Slider
          value={filters.friendCountRange || [0, 5000]}
          onValueChange={(value) => updateFilter("friendCountRange", value as [number, number])}
          max={5000}
          min={0}
          step={50}
          className="w-full"
        />
      </div>

      {/* 设备标签 */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label>设备标签</Label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={`tag-${tag}`}
                  checked={filters.tags?.includes(tag) || false}
                  onCheckedChange={(checked) => {
                    const currentTags = filters.tags || []
                    if (checked) {
                      updateFilter("tags", [...currentTags, tag])
                    } else {
                      updateFilter(
                        "tags",
                        currentTags.filter((t) => t !== tag),
                      )
                    }
                  }}
                />
                <Label htmlFor={`tag-${tag}`} className="text-sm">
                  {tag}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 是否有活跃计划 */}
      <div className="space-y-2">
        <Label>计划状态</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasActivePlans"
            checked={filters.hasActivePlans || false}
            onCheckedChange={(checked) => updateFilter("hasActivePlans", checked || undefined)}
          />
          <Label htmlFor="hasActivePlans" className="text-sm">
            仅显示有活跃计划的设备
          </Label>
        </div>
      </div>

      {/* 清除过滤器 */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          清除过滤器
        </Button>
        <div className="text-sm text-gray-500">{getActiveFilterCount()} 个活跃过滤器</div>
      </div>
    </div>
  )

  if (compact) {
    return (
      <Card className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                过滤器
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <FilterContent />
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          <h3 className="font-medium">过滤器</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()}
            </Badge>
          )}
        </div>
      </div>
      <FilterContent />
    </Card>
  )
}
