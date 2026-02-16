"use client"

import React from "react"
import { cn } from "@/app/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"

interface Column<T> {
  key: string
  title: React.ReactNode
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: number | string
  className?: string
  responsive?: boolean // 是否在小屏幕上显示
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[]
  dataSource: T[]
  rowKey?: string | ((record: T) => string)
  className?: string
  loading?: boolean
  emptyText?: React.ReactNode
}

/**
 * 响应式表格组件
 * 在小屏幕上自动隐藏不重要的列
 */
export function ResponsiveTable<T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = "id",
  className,
  loading = false,
  emptyText = "暂无数据",
}: ResponsiveTableProps<T>) {
  // 根据屏幕尺寸过滤列
  const [visibleColumns, setVisibleColumns] = React.useState(columns)

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // 在小屏幕上只显示responsive不为false的列
        setVisibleColumns(columns.filter((col) => col.responsive !== false))
      } else {
        setVisibleColumns(columns)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [columns])

  // 获取行的唯一键
  const getRowKey = (record: T, index: number) => {
    if (typeof rowKey === "function") {
      return rowKey(record)
    }
    return record[rowKey] || index
  }

  return (
    <div className="responsive-table-container">
      <Table className={cn("w-full", className)}>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableHead key={column.key} className={column.className} style={{ width: column.width }}>
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center h-24">
                加载中...
              </TableCell>
            </TableRow>
          ) : dataSource.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center h-24">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            dataSource.map((record, index) => (
              <TableRow key={getRowKey(record, index)}>
                {visibleColumns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render ? column.render(record[column.key], record, index) : record[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
