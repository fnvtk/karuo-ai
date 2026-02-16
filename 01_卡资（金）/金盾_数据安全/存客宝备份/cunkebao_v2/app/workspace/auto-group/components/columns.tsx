"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Eye, Edit, Trash } from "lucide-react"

export type Plan = {
  id: string
  name: string
  groupCount: number
  groupSize: number
  totalFriends: number
  tags: string[]
  deviceId: string
  operator: string
  timeRange: string
  contacts: string[]
  status: "running" | "paused" | "completed"
}

export const columns: ColumnDef<Plan>[] = [
  {
    accessorKey: "id",
    header: "序号",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "name",
    header: "计划名称",
  },
  {
    accessorKey: "groupCount",
    header: "已建群数量",
  },
  {
    accessorKey: "groupSize",
    header: "建群人数标准",
    cell: ({ row }) => `${row.original.groupSize}/群`,
  },
  {
    accessorKey: "totalFriends",
    header: "微信客户数量",
  },
  {
    accessorKey: "tags",
    header: "群标签",
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "deviceId",
    header: "执行设备ID",
  },
  {
    accessorKey: "operator",
    header: "执行客服号",
  },
  {
    accessorKey: "timeRange",
    header: "执行时间",
  },
  {
    accessorKey: "contacts",
    header: "关联微信",
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.contacts.map((contact) => (
          <Badge key={contact} variant="outline">
            {contact}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const status = row.original.status
      const statusMap = {
        running: { label: "执行中", color: "bg-green-500" },
        paused: { label: "已暂停", color: "bg-yellow-500" },
        completed: { label: "已完成", color: "bg-gray-500" },
      }
      return (
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${statusMap[status].color}`} />
          {statusMap[status].label}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const plan = row.original
      return (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
            <Trash className="h-4 w-4" />
          </Button>
          <Switch
            checked={plan.status === "running"}
            onCheckedChange={() => {
              // TODO: 更新计划状态
            }}
          />
        </div>
      )
    },
  },
]
