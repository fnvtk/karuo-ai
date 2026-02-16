"use client"

import { useState } from "react"
import { ChevronLeft, Edit2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface MomentContent {
  id: string
  type: string
  content: string
  images: string[]
  publishTime: string
  pushTime: string
  status: "已发送" | "待发送" | "已终止"
}

const mockData: MomentContent[] = [
  {
    id: "399401",
    type: "图文",
    content: "一定要把安全意识这件事情，刻在DNA里......",
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Z8LxL98X5Bwm5Jr5ke3755Qd97PSYC.png",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Z8LxL98X5Bwm5Jr5ke3755Qd97PSYC.png",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Z8LxL98X5Bwm5Jr5ke3755Qd97PSYC.png",
    ],
    publishTime: "2025-02-15 23:37:49",
    pushTime: "2025-02-16 08:50:36",
    status: "已发送",
  },
]

export default function MomentsSyncViewPage() {
  const [syncName] = useState("同步卡若主号")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-medium">{syncName}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">基本信息</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <span className="text-gray-500 w-32">朋友圈同步名称：</span>
              <span>{syncName}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">推送日志</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>内容类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>图片</TableHead>
                  <TableHead>推送时间</TableHead>
                  <TableHead>内容发布时间</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{item.content}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {item.images.map((img, index) => (
                          <img
                            key={index}
                            src={img || "/placeholder.svg"}
                            alt={`Content ${index + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{item.pushTime}</TableCell>
                    <TableCell>{item.publishTime}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.status === "已发送"
                            ? "bg-green-100 text-green-800"
                            : item.status === "待发送"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
