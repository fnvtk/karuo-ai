"use client"

import React from "react"

import type { ReactNode } from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Pagination } from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, RefreshCw, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// 列定义接口
export interface Column<T> {
  id: string
  header: string | ReactNode
  accessorKey?: keyof T
  cell?: (item: T) => ReactNode
  sortable?: boolean
  className?: string
}

// DataTable 属性接口
export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  loading?: boolean
  title?: string
  description?: string
  emptyMessage?: string
  withCard?: boolean
  showSearch?: boolean
  showRefresh?: boolean
  showSelection?: boolean
  onRowClick?: (item: T) => void
  onSelectionChange?: (selectedItems: T[]) => void
  onRefresh?: () => void
  onSearch?: (query: string) => void
  onSort?: (columnId: string, direction: "asc" | "desc") => void
  rowActions?: {
    label: string
    icon?: ReactNode
    onClick: (item: T) => void
    className?: string
  }[]
  batchActions?: {
    label: string
    icon?: ReactNode
    onClick: (selectedItems: T[]) => void
    className?: string
  }[]
  className?: string
}

/**
 * 经过性能优化的数据表格组件
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useMemo 缓存计算结果
 * - 使用 useCallback 稳定化事件处理器
 */
function DataTableComponent<T extends { id: string | number }>({
  data,
  columns,
  pageSize = 10,
  loading = false,
  title,
  description,
  emptyMessage = "暂无数据",
  withCard = true,
  showSearch = true,
  showRefresh = true,
  showSelection = false,
  onRowClick,
  onSelectionChange,
  onRefresh,
  onSearch,
  onSort,
  rowActions,
  batchActions,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState<T[]>([])
  const [sortConfig, setSortConfig] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(null)

  // 当外部数据变化时，重置分页和选择
  useEffect(() => {
    setCurrentPage(1)
    setSelectedItems([])
  }, [data])

  // 使用 useMemo 缓存过滤和排序后的数据
  const filteredData = useMemo(() => {
    let filtered = [...data]
    if (searchQuery && !onSearch) {
      filtered = data.filter((item) =>
        columns.some((col) => {
          if (!col.accessorKey) return false
          const value = item[col.accessorKey]
          return String(value).toLowerCase().includes(searchQuery.toLowerCase())
        }),
      )
    }

    if (sortConfig && !onSort) {
      const { columnId, direction } = sortConfig
      const column = columns.find((c) => c.id === columnId)
      if (column?.accessorKey) {
        filtered.sort((a, b) => {
          const valA = a[column.accessorKey!]
          const valB = b[column.accessorKey!]
          if (valA < valB) return direction === "asc" ? -1 : 1
          if (valA > valB) return direction === "asc" ? 1 : -1
          return 0
        })
      }
    }
    return filtered
  }, [data, searchQuery, sortConfig, columns, onSearch, onSort])

  // 使用 useMemo 缓存当前页的数据
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const isAllCurrentPageSelected =
    currentPageItems.length > 0 && currentPageItems.every((item) => selectedItems.some((s) => s.id === item.id))

  // 搜索处理
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      setCurrentPage(1)
      if (onSearch) {
        onSearch(query)
      }
    },
    [onSearch],
  )

  // 排序处理
  const handleSort = useCallback(
    (columnId: string) => {
      const newDirection = sortConfig?.columnId === columnId && sortConfig.direction === "asc" ? "desc" : "asc"
      setSortConfig({ columnId, direction: newDirection })
      if (onSort) {
        onSort(columnId, newDirection)
      }
    },
    [sortConfig, onSort],
  )

  // 刷新处理
  const handleRefresh = useCallback(() => {
    setSearchQuery("")
    setCurrentPage(1)
    setSortConfig(null)
    setSelectedItems([])
    onRefresh?.()
  }, [onRefresh])

  // 全选/取消全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const newSelectedItems = checked ? currentPageItems : []
      setSelectedItems(newSelectedItems)
      onSelectionChange?.(newSelectedItems)
    },
    [currentPageItems, onSelectionChange],
  )

  // 单行选择
  const handleSelectItem = useCallback(
    (item: T, checked: boolean) => {
      const newSelectedItems = checked
        ? [...selectedItems, item]
        : selectedItems.filter((selected) => selected.id !== item.id)
      setSelectedItems(newSelectedItems)
      onSelectionChange?.(newSelectedItems)
    },
    [selectedItems, onSelectionChange],
  )

  const TableContent = (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex flex-1 gap-2">
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}
          {showRefresh && (
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
        </div>
        {batchActions && selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">已选 {selectedItems.length} 项</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  批量操作 <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {batchActions.map((action, i) => (
                  <DropdownMenuItem key={i} onClick={() => action.onClick(selectedItems)} className={action.className}>
                    {action.icon} {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead className="w-[40px]">
                  <Checkbox checked={isAllCurrentPageSelected} onCheckedChange={handleSelectAll} />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(column.sortable && "cursor-pointer select-none", column.className)}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable &&
                      sortConfig?.columnId === column.id &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-[80px] text-right">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length + (showSelection ? 1 : 0) + (rowActions ? 1 : 0)}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : currentPageItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showSelection ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              currentPageItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(item)}
                >
                  {showSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.some((s) => s.id === item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell
                        ? column.cell(item)
                        : column.accessorKey
                          ? String(item[column.accessorKey] ?? "")
                          : null}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action, i) => (
                            <DropdownMenuItem key={i} onClick={() => action.onClick(item)} className={action.className}>
                              {action.icon} {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">共 {filteredData.length} 条记录</div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  )

  if (withCard) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <TableContent />
        </CardContent>
      </Card>
    )
  }

  return <div className={className}>{TableContent}</div>
}

export const DataTable = React.memo(DataTableComponent) as typeof DataTableComponent
