"use client"

/**
 * 表格组件模板
 *
 * 包含项目中常用的各种表格组件
 */

import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface Column<T> {
  header: string
  accessorKey: keyof T | ((row: T) => React.ReactNode)
  cell?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  selectable?: boolean
  selectedRows?: (string | number)[]
  onSelectRow?: (id: string | number, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

/**
 * 通用数据表格
 * 用于展示表格数据
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  onRowClick,
  emptyMessage = "没有数据",
}: DataTableProps<T>) {
  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row)
    }
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && onSelectRow && onSelectAll && (
              <TableHead className="w-12">
                <Checkbox
                  checked={data.length > 0 && selectedRows.length === data.length}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                />
              </TableHead>
            )}
            {columns.map((column, index) => (
              <TableHead key={index}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-6 text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={String(row[keyField])}
                className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                onClick={() => handleRowClick(row)}
              >
                {selectable && onSelectRow && (
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.includes(row[keyField])}
                      onCheckedChange={(checked) => onSelectRow(row[keyField], checked === true)}
                    />
                  </TableCell>
                )}
                {columns.map((column, index) => (
                  <TableCell key={index}>
                    {column.cell
                      ? column.cell(row)
                      : typeof column.accessorKey === "function"
                        ? column.accessorKey(row)
                        : row[column.accessorKey]}
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

interface DeviceTableProps {
  devices: Array<{
    id: string
    name: string
    imei: string
    status: "online" | "offline"
    battery?: number
    wechatId?: string
    lastActive?: string
  }>
  selectedDevices: string[]
  onSelectDevice: (deviceId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onDeviceClick: (deviceId: string) => void
}

/**
 * 设备表格
 * 用于展示设备列表
 */
export function DeviceTableTemplate({
  devices,
  selectedDevices,
  onSelectDevice,
  onSelectAll,
  onDeviceClick,
}: DeviceTableProps) {
  const columns: Column<(typeof devices)[0]>[] = [
    {
      header: "设备名称",
      accessorKey: "name",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-gray-500">IMEI: {row.imei}</div>
        </div>
      ),
    },
    {
      header: "状态",
      accessorKey: "status",
      cell: (row) => (
        <Badge variant={row.status === "online" ? "success" : "secondary"}>
          {row.status === "online" ? "在线" : "离线"}
        </Badge>
      ),
    },
    {
      header: "微信号",
      accessorKey: "wechatId",
      cell: (row) => row.wechatId || "-",
    },
    {
      header: "电量",
      accessorKey: "battery",
      cell: (row) => (
        <div className="flex items-center">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
            <div
              className={`h-full ${(row.battery || 0) > 20 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${row.battery || 0}%` }}
            ></div>
          </div>
          <span>{row.battery || 0}%</span>
        </div>
      ),
    },
    {
      header: "最后活跃",
      accessorKey: "lastActive",
      cell: (row) => row.lastActive || "-",
    },
  ]

  return (
    <DataTable
      data={devices}
      columns={columns}
      keyField="id"
      selectable={true}
      selectedRows={selectedDevices}
      onSelectRow={onSelectDevice}
      onSelectAll={onSelectAll}
      onRowClick={(row) => onDeviceClick(row.id)}
      emptyMessage="没有找到设备"
    />
  )
}
