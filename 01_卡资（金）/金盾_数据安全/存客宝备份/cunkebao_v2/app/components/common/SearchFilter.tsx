"use client"

import { useState } from "react"
import { Input } from "@/app/components/ui/input"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Calendar } from "@/app/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover"
import { Badge } from "@/app/components/ui/badge"
import { Search, Filter, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

interface FilterField {
  id: string
  label: string
  type: "text" | "select" | "dateRange" | "multiSelect"
  options?: Array<{ label: string; value: string }>
  placeholder?: string
}

interface SearchFilterProps {
  fields: FilterField[]
  onFilterChange: (filters: Record<string, any>) => void
  placeholder?: string
}

export function SearchFilter({ fields, onFilterChange, placeholder = "搜索..." }: SearchFilterProps) {
  const [searchValue, setSearchValue] = useState("")
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleFilterChange = (fieldId: string, value: any) => {
    const newFilters = { ...filters, [fieldId]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilter = (fieldId: string) => {
    const newFilters = { ...filters }
    delete newFilters[fieldId]
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearAllFilters = () => {
    setSearchValue("")
    setFilters({})
    onFilterChange({})
  }

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== "search" && filters[key] !== undefined && filters[key] !== "",
  ).length

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          筛选
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-medium">{field.label}</label>
                {field.type === "select" && (
                  <Select
                    value={filters[field.id] || ""}
                    onValueChange={(value) => handleFilterChange(field.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || `选择${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "text" && (
                  <Input
                    placeholder={field.placeholder || `输入${field.label}`}
                    value={filters[field.id] || ""}
                    onChange={(e) => handleFilterChange(field.id, e.target.value)}
                  />
                )}

                {field.type === "dateRange" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters[field.id]
                          ? `${format(filters[field.id].from, "yyyy-MM-dd", { locale: zhCN })} - ${format(filters[field.id].to, "yyyy-MM-dd", { locale: zhCN })}`
                          : field.placeholder || "选择日期范围"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={filters[field.id]}
                        onSelect={(range) => handleFilterChange(field.id, range)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ))}
          </div>

          {/* 活跃筛选器显示 */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">活跃筛选器:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (key === "search" || !value) return null
                const field = fields.find((f) => f.id === key)
                if (!field) return null

                return (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    {field.label}: {typeof value === "object" ? "已选择" : value}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter(key)} />
                  </Badge>
                )
              })}
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                清除所有
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
