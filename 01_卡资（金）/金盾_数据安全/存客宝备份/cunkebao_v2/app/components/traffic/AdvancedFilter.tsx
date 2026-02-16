"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, ChevronDown, Save, Search, Filter, RotateCcw } from "lucide-react"
import type { FilterCondition, FilterScheme } from "@/types/filter"

interface AdvancedFilterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyFilter: (conditions: FilterCondition) => void
  currentConditions: FilterCondition
  availableTags: string[]
  availableRegions: string[]
}

export default function AdvancedFilter({
  open,
  onOpenChange,
  onApplyFilter,
  currentConditions,
  availableTags,
  availableRegions,
}: AdvancedFilterProps) {
  const [conditions, setConditions] = useState<FilterCondition>(currentConditions)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [schemeName, setSchemeName] = useState("")
  const [schemeDescription, setSchemeDescription] = useState("")
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    rfm: false,
    region: false,
    time: false,
  })

  // 同步外部条件
  useEffect(() => {
    setConditions(currentConditions)
  }, [currentConditions])

  // 更新条件
  const updateCondition = (key: keyof FilterCondition, value: any) => {
    setConditions((prev) => ({ ...prev, [key]: value }))
  }

  // 切换标签选择
  const toggleTag = (tag: string) => {
    const currentTags = conditions.tags || []
    if (currentTags.includes(tag)) {
      updateCondition(
        "tags",
        currentTags.filter((t) => t !== tag),
      )
    } else {
      updateCondition("tags", [...currentTags, tag])
    }
  }

  // 切换地区选择
  const toggleRegion = (region: string) => {
    const currentRegions = conditions.regions || []
    if (currentRegions.includes(region)) {
      updateCondition(
        "regions",
        currentRegions.filter((r) => r !== region),
      )
    } else {
      updateCondition("regions", [...currentRegions, region])
    }
  }

  // 重置所有条件
  const resetConditions = () => {
    setConditions({})
  }

  // 应用筛选
  const handleApply = () => {
    onApplyFilter(conditions)
    onOpenChange(false)
  }

  // 保存为方案
  const handleSaveScheme = () => {
    if (!schemeName.trim()) return

    const scheme: FilterScheme = {
      id: `scheme_${Date.now()}`,
      name: schemeName.trim(),
      description: schemeDescription.trim(),
      conditions: conditions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    }

    // 保存到 localStorage
    const savedSchemes = localStorage.getItem("filterSchemes")
    const schemes: FilterScheme[] = savedSchemes ? JSON.parse(savedSchemes) : []
    schemes.push(scheme)
    localStorage.setItem("filterSchemes", JSON.stringify(schemes))

    // 重置对话框
    setSchemeName("")
    setSchemeDescription("")
    setShowSaveDialog(false)

    // 提示成功
    alert(`筛选方案"${scheme.name}"已保存`)
  }

  // 切换区块展开状态
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // 计算已激活的筛选条件数量
  const activeFiltersCount = Object.keys(conditions).filter((key) => {
    const value = conditions[key as keyof FilterCondition]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== "" && value !== null
  }).length

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95%] max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <DialogTitle>高级筛选</DialogTitle>
                {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}个条件</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={resetConditions}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重置
              </Button>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-4 space-y-4">
            {/* 基础信息筛选 */}
            <Collapsible open={expandedSections.basic} onOpenChange={() => toggleSection("basic")}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">基础信息</h3>
                        {(conditions.phone ||
                          conditions.wechatId ||
                          conditions.nickname ||
                          (conditions.tags && conditions.tags.length > 0)) && (
                          <Badge variant="secondary" className="text-xs">
                            已设置
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.basic ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    {/* 用户名称 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">用户名称</Label>
                      <Input
                        placeholder="输入用户名称"
                        value={conditions.nickname || ""}
                        onChange={(e) => updateCondition("nickname", e.target.value)}
                      />
                    </div>

                    {/* 微信号 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">微信号</Label>
                      <Input
                        placeholder="输入微信号"
                        value={conditions.wechatId || ""}
                        onChange={(e) => updateCondition("wechatId", e.target.value)}
                      />
                    </div>

                    {/* 手机号 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">手机号</Label>
                      <Input
                        placeholder="输入手机号"
                        value={conditions.phone || ""}
                        onChange={(e) => updateCondition("phone", e.target.value)}
                      />
                    </div>

                    {/* 微信标签 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">微信标签</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={conditions.tags?.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                            {conditions.tags?.includes(tag) && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* 客户类别 */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">客户类别</Label>
                      <Select
                        value={conditions.category || "all"}
                        onValueChange={(value) => updateCondition("category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="全部类别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部类别</SelectItem>
                          <SelectItem value="customer">正式客户</SelectItem>
                          <SelectItem value="potential">潜在客户</SelectItem>
                          <SelectItem value="lost">流失客户</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* RFM评分筛选 */}
            <Collapsible open={expandedSections.rfm} onOpenChange={() => toggleSection("rfm")}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">RFM评分</h3>
                        {(conditions.rfmMin !== undefined || conditions.rfmMax !== undefined) && (
                          <Badge variant="secondary" className="text-xs">
                            已设置
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.rfm ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>评分范围：</span>
                        <span className="font-medium text-blue-600">
                          {conditions.rfmMin || 0} - {conditions.rfmMax || 15}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">最低分数</Label>
                        <Slider
                          value={[conditions.rfmMin || 0]}
                          onValueChange={([value]) => updateCondition("rfmMin", value)}
                          max={15}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">最高分数</Label>
                        <Slider
                          value={[conditions.rfmMax || 15]}
                          onValueChange={([value]) => updateCondition("rfmMax", value)}
                          max={15}
                          step={0.5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* 地区筛选 */}
            <Collapsible open={expandedSections.region} onOpenChange={() => toggleSection("region")}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">客户地区</h3>
                        {conditions.regions && conditions.regions.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {conditions.regions.length}个地区
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.region ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {availableRegions.map((region) => (
                        <Badge
                          key={region}
                          variant={conditions.regions?.includes(region) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleRegion(region)}
                        >
                          {region}
                          {conditions.regions?.includes(region) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* 时间筛选 */}
            <Collapsible open={expandedSections.time} onOpenChange={() => toggleSection("time")}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">添加时间</h3>
                        {(conditions.addTimeStart || conditions.addTimeEnd) && (
                          <Badge variant="secondary" className="text-xs">
                            已设置
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedSections.time ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">开始时间</Label>
                      <Input
                        type="date"
                        value={conditions.addTimeStart || ""}
                        onChange={(e) => updateCondition("addTimeStart", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">结束时间</Label>
                      <Input
                        type="date"
                        value={conditions.addTimeEnd || ""}
                        onChange={(e) => updateCondition("addTimeEnd", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          <DialogFooter className="p-4 border-t flex justify-between items-center">
            <Button variant="outline" onClick={() => setShowSaveDialog(true)} disabled={activeFiltersCount === 0}>
              <Save className="h-4 w-4 mr-1" />
              保存方案
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleApply}>
                <Search className="h-4 w-4 mr-1" />
                应用筛选
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 保存方案对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>保存筛选方案</DialogTitle>
            <DialogDescription>为当前筛选条件组合命名，方便日后快速调用</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>方案名称 *</Label>
              <Input
                placeholder="例如：北京高价值客户"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>方案描述（可选）</Label>
              <Input
                placeholder="简单描述该方案的用途"
                value={schemeDescription}
                onChange={(e) => setSchemeDescription(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              当前方案包含 <span className="font-medium text-gray-900">{activeFiltersCount}</span> 个筛选条件
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveScheme} disabled={!schemeName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
